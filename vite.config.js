import { sentryVitePlugin } from '@sentry/vite-plugin';
import { fileURLToPath, URL } from 'url';
import { defineConfig } from 'vite';
import Vue from '@vitejs/plugin-vue';
import mkcert from 'vite-plugin-mkcert';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import UnheadVite from '@unhead/addons/vite';
import * as child from 'child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const commitHash = child.execSync('git rev-parse --short HEAD').toString();

function e2eRunnerPlugin() {
  const isEnabled = process.env.VITE_E2E_RUNNER === 'TRUE';
  if (!isEnabled) return null;

  const runs = new Map();
  const DEFAULT_E2E_APP_URL = 'https://hs-levante-admin-dev.web.app';
  const BUCKET_NAME = 'levante-performance-dev';
  const OBJECT_PATH = 'test-results/levante-dashboard-e2e-results.json';
  const resultsDir = path.join(process.cwd(), '.tmp', 'e2e-runner');
  const resultsPath = path.join(resultsDir, 'results.json');
  let cachedResults = { meta: {}, byId: {} };

  function sendJson(res, status, body) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  }

  async function readJson(req) {
    return await new Promise((resolve, reject) => {
      let raw = '';
      req.on('data', (chunk) => {
        raw += chunk;
      });
      req.on('end', () => {
        if (!raw) return resolve({});
        try {
          resolve(JSON.parse(raw));
        } catch (e) {
          reject(e);
        }
      });
      req.on('error', reject);
    });
  }

  function ensureLogDir() {
    const dir = path.join(process.cwd(), '.tmp', 'e2e-runner');
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  function readTail(filePath, maxBytes = 12000) {
    try {
      if (!fs.existsSync(filePath)) return '';
      const stat = fs.statSync(filePath);
      const start = Math.max(0, stat.size - maxBytes);
      const fd = fs.openSync(filePath, 'r');
      try {
        const buf = Buffer.alloc(stat.size - start);
        fs.readSync(fd, buf, 0, buf.length, start);
        return buf.toString('utf8');
      } finally {
        fs.closeSync(fd);
      }
    } catch {
      return '';
    }
  }

  function loadLocalResults() {
    try {
      if (!fs.existsSync(resultsPath)) return { meta: {}, byId: {} };
      const raw = fs.readFileSync(resultsPath, 'utf8');
      const parsed = JSON.parse(raw);
      const byId = parsed && typeof parsed === 'object' ? parsed.byId : {};
      const meta = parsed && typeof parsed === 'object' ? parsed.meta : {};
      return { meta: meta ?? {}, byId: byId ?? {} };
    } catch {
      return { meta: {}, byId: {} };
    }
  }

  function saveLocalResults(next) {
    fs.mkdirSync(resultsDir, { recursive: true });
    fs.writeFileSync(resultsPath, JSON.stringify(next, null, 2));
  }

  function gsutilExists() {
    const r = child.spawnSync('bash', ['-lc', 'command -v gsutil >/dev/null 2>&1'], { stdio: 'ignore' });
    return r.status === 0;
  }

  function downloadFromBucket() {
    if (!gsutilExists()) return { ok: false, error: 'gsutil not installed' };
    const r = child.spawnSync('gsutil', ['cat', `gs://${BUCKET_NAME}/${OBJECT_PATH}`], { encoding: 'utf8' });
    if (r.status !== 0) return { ok: false, error: r.stderr?.toString?.() ?? 'gsutil cat failed' };
    try {
      const parsed = JSON.parse(r.stdout ?? '{}');
      return { ok: true, data: parsed };
    } catch (e) {
      return { ok: false, error: `Failed to parse bucket JSON: ${String(e?.message ?? e)}` };
    }
  }

  function uploadToBucket(jsonString) {
    if (!gsutilExists()) return { ok: false, error: 'gsutil not installed' };
    const r = child.spawnSync('gsutil', ['cp', '-', `gs://${BUCKET_NAME}/${OBJECT_PATH}`], { input: jsonString, encoding: 'utf8' });
    if (r.status !== 0) return { ok: false, error: r.stderr?.toString?.() ?? 'gsutil cp failed' };
    return { ok: true };
  }

  cachedResults = loadLocalResults();

  return {
    name: 'levante-e2e-runner',
    configureServer(server) {
      server.middlewares.use('/__e2e/ping', async (req, res, next) => {
        if (req.method !== 'GET') return next();
        return sendJson(res, 200, { ok: true });
      });

      server.middlewares.use('/__e2e/config', async (req, res, next) => {
        if (req.method !== 'GET') return next();
        return sendJson(res, 200, {
          targetBaseUrl: process.env.E2E_APP_URL ?? DEFAULT_E2E_APP_URL,
          bucket: BUCKET_NAME,
          objectPath: OBJECT_PATH,
          hasGsutil: gsutilExists(),
        });
      });

      server.middlewares.use('/__e2e/results', async (req, res, next) => {
        if (req.method !== 'GET') return next();
        const url = new URL(req.url ?? '', 'http://localhost');
        const refresh = url.searchParams.get('refresh') === '1';
        if (refresh) {
          const dl = downloadFromBucket();
          if (dl.ok) {
            cachedResults = dl.data;
            saveLocalResults(cachedResults);
            return sendJson(res, 200, { source: 'bucket', ...cachedResults });
          }
          return sendJson(res, 200, { source: 'local', ...cachedResults, meta: { ...(cachedResults.meta ?? {}), lastDownloadError: dl.error } });
        }
        return sendJson(res, 200, { source: 'local', ...cachedResults });
      });

      server.middlewares.use('/__e2e/run', async (req, res, next) => {
        if (req.method !== 'POST') return next();

        try {
          const body = await readJson(req);
          const id = body?.id;
          const command = body?.command;

          if (typeof id !== 'string' || !id) return sendJson(res, 400, { error: 'Missing id' });
          if (typeof command !== 'string' || !command) return sendJson(res, 400, { error: 'Missing command' });

          const runId = crypto.randomUUID();
          const startedAt = new Date().toISOString();
          const logDir = ensureLogDir();
          const logPath = path.join(logDir, `${runId}.log`);
          const logStream = fs.createWriteStream(logPath, { flags: 'a' });

          const proc = child.spawn('bash', ['-lc', command], {
            cwd: process.cwd(),
            env: process.env,
            stdio: ['ignore', 'pipe', 'pipe'],
          });

          runs.set(runId, {
            runId,
            id,
            command,
            startedAt,
            finishedAt: null,
            exitCode: null,
            status: 'running',
            logPath,
          });

          proc.stdout.on('data', (d) => logStream.write(d));
          proc.stderr.on('data', (d) => logStream.write(d));
          proc.on('close', (code) => {
            logStream.end();
            const existing = runs.get(runId);
            if (!existing) return;
            const finishedAt = new Date().toISOString();
            const exitCode = typeof code === 'number' ? code : 1;
            runs.set(runId, {
              ...existing,
              status: 'finished',
              exitCode,
              finishedAt,
            });

            // Update cached results and attempt to upload to bucket for persistence.
            const result = exitCode === 0 ? 'pass' : 'fail';
            cachedResults = cachedResults && typeof cachedResults === 'object' ? cachedResults : { meta: {}, byId: {} };
            cachedResults.byId = cachedResults.byId && typeof cachedResults.byId === 'object' ? cachedResults.byId : {};
            cachedResults.meta = cachedResults.meta && typeof cachedResults.meta === 'object' ? cachedResults.meta : {};
            cachedResults.byId[existing.id] = {
              result,
              lastRunAt: finishedAt,
              lastRunRunId: runId,
              lastRunCommand: existing.command,
              lastExitCode: exitCode,
              lastLogPath: existing.logPath,
              lastLogTail: readTail(existing.logPath),
            };
            cachedResults.meta.updatedAt = finishedAt;
            cachedResults.meta.bucket = BUCKET_NAME;
            cachedResults.meta.objectPath = OBJECT_PATH;

            saveLocalResults(cachedResults);
            const up = uploadToBucket(JSON.stringify(cachedResults, null, 2));
            cachedResults.meta.lastUploadAt = new Date().toISOString();
            cachedResults.meta.lastUploadOk = Boolean(up.ok);
            cachedResults.meta.lastUploadError = up.ok ? null : up.error;
            saveLocalResults(cachedResults);
          });

          return sendJson(res, 200, { runId });
        } catch (e) {
          return sendJson(res, 500, { error: String(e?.message ?? e) });
        }
      });

      server.middlewares.use('/__e2e/status', async (req, res, next) => {
        if (req.method !== 'GET') return next();
        const url = new URL(req.url ?? '', 'http://localhost');
        const runId = url.searchParams.get('runId');
        if (!runId) return sendJson(res, 400, { error: 'Missing runId' });
        const run = runs.get(runId);
        if (!run) return sendJson(res, 404, { error: 'Unknown runId' });
        return sendJson(res, 200, run);
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(commitHash),
    'import.meta.env.VITE_LEVANTE': JSON.stringify('TRUE'),
  },
  plugins: (() => {
    const e2eRunner = e2eRunnerPlugin();
    return [
    Vue({
      include: [/\.vue$/, /\.md$/],
    }),
    ...(e2eRunner ? [e2eRunner] : []),
    nodePolyfills({
      globals: {
        process: true,
      },
    }),
    UnheadVite(),
    ...(process.env.VITE_HTTPS === 'TRUE' ? [mkcert()] : []),
    ...(process.env.NODE_ENV !== 'development'
      ? [
          sentryVitePlugin({
            org: 'roar-89588e380',
            project: 'dashboard',
          }),
        ]
      : []),
    ];
  })(),

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  server: {
    fs: {
      allow: ['..'],
    },
    https: process.env.VITE_HTTPS === 'TRUE',
  },

  build: {
    cssCodeSplit: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          lodash: ['lodash'],
          tanstack: ['@tanstack/vue-query'],
          chartJs: ['chart.js'],
          sentry: ['@sentry/browser', '@sentry/integrations', '@sentry/vue'],
          phoneme: ['@bdelab/roar-pa'],
          sre: ['@bdelab/roar-sre'],
          swr: ['@bdelab/roar-swr'],
          utils: ['@bdelab/roar-utils'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['@levante-framework/firekit'],
    esbuildOptions: {
      mainFields: ['module', 'main'],
      resolveExtensions: ['.js', '.mjs', '.cjs'],
    },
  },
});

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

  function shellEscape(value) {
    // Safely wrap in single quotes for bash -lc.
    const sq = '\'';
    const s = String(value);
    const escaped = s.split(sq).join(sq + '\\' + sq + sq);
    return sq + escaped + sq;
  }

  function readAiTestsCreds() {
    try {
      const credsPath = path.join(process.cwd(), 'bug-tests', 'site.ai-tests.creds.json');
      if (!fs.existsSync(credsPath)) return { ok: false, error: `Missing creds file: ${credsPath}` };
      const raw = fs.readFileSync(credsPath, 'utf8');
      const parsed = JSON.parse(raw);
      return { ok: true, data: parsed };
    } catch (e) {
      return { ok: false, error: `Failed to read ai-tests creds: ${String(e?.message ?? e)}` };
    }
  }

  function bootstrapAiTestsForPermissions(logStream) {
    // Destructive reset + recreates ai-tests site and admin users. Intended for local dev only.
    const cmd =
      'node scripts/e2e-init/reset-site.mjs --yes --site-name ai-tests --project-id hs-levante-admin-dev --out bug-tests/site.ai-tests.json --out-creds bug-tests/site.ai-tests.creds.json';
    const r = child.spawnSync('bash', ['-lc', cmd], { cwd: process.cwd(), env: process.env, encoding: 'utf8' });
    if (r.stdout) logStream.write(r.stdout);
    if (r.stderr) logStream.write(r.stderr);
    if (r.status !== 0) return { ok: false, error: `ai-tests bootstrap failed (exit=${r.status})` };
    return { ok: true };
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

  function readTargetBaseUrl() {
    // Priority:
    // 1) explicit env E2E_APP_URL
    // 2) last deployed preview URL persisted by scripts/deploy-preview-dev.sh
    // 3) fallback default
    const fromEnv = process.env.E2E_APP_URL;
    if (fromEnv && String(fromEnv).trim()) return String(fromEnv).trim();

    try {
      const p = path.join(process.cwd(), '.tmp', 'e2e-runner', 'target-base-url.txt');
      if (fs.existsSync(p)) {
        const s = fs.readFileSync(p, 'utf8').trim();
        if (s) return s;
      }
    } catch {
      // ignore
    }

    return DEFAULT_E2E_APP_URL;
  }

  function parseSpecBasename(command) {
    try {
      const m = String(command || '').match(/--spec\s+([^\s]+)/);
      if (!m) return null;
      const specPath = m[1];
      return path.basename(specPath);
    } catch {
      return null;
    }
  }

  function findLatestVideoForSpec(specBasename) {
    try {
      if (!specBasename) return null;
      const videosDir = path.join(process.cwd(), 'cypress', 'videos');
      if (!fs.existsSync(videosDir)) return null;
      const files = fs.readdirSync(videosDir);
      const candidates = files
        .filter((f) => f.startsWith(specBasename) && f.endsWith('.mp4'))
        .map((f) => {
          const full = path.join(videosDir, f);
          const stat = fs.statSync(full);
          return { full, mtimeMs: stat.mtimeMs };
        })
        .sort((a, b) => b.mtimeMs - a.mtimeMs);
      return candidates[0]?.full ?? null;
    } catch {
      return null;
    }
  }

  function ensureCanonicalVideosDir() {
    const dir = path.join(process.cwd(), 'cypress', 'videos', '_canonical');
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  function canonicalVideoPathForId(id) {
    return path.join(ensureCanonicalVideosDir(), `${id}.mp4`);
  }

  function deleteSpecVideos(specBasename) {
    try {
      if (!specBasename) return;
      const videosDir = path.join(process.cwd(), 'cypress', 'videos');
      if (!fs.existsSync(videosDir)) return;
      for (const f of fs.readdirSync(videosDir)) {
        if (!f.startsWith(specBasename) || !f.endsWith('.mp4')) continue;
        try {
          fs.unlinkSync(path.join(videosDir, f));
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
  }

  function finalizeCanonicalVideo({ runId, id, specBasename, attempt = 0 }) {
    const maxAttempts = 10;
    const delayMs = 400;
    const src = findLatestVideoForSpec(specBasename);
    if (!src && attempt < maxAttempts) {
      setTimeout(() => finalizeCanonicalVideo({ runId, id, specBasename, attempt: attempt + 1 }), delayMs);
      return;
    }
    if (!src || !fs.existsSync(src)) return;

    const canonicalPath = canonicalVideoPathForId(id);
    try {
      fs.copyFileSync(src, canonicalPath);
      deleteSpecVideos(specBasename);
    } catch {
      return;
    }

    const existingRun = runs.get(runId);
    if (existingRun) runs.set(runId, { ...existingRun, videoPath: canonicalPath });

    cachedResults = cachedResults && typeof cachedResults === 'object' ? cachedResults : { meta: {}, byId: {} };
    cachedResults.byId = cachedResults.byId && typeof cachedResults.byId === 'object' ? cachedResults.byId : {};
    cachedResults.meta = cachedResults.meta && typeof cachedResults.meta === 'object' ? cachedResults.meta : {};
    cachedResults.byId[id] = {
      ...(cachedResults.byId[id] ?? {}),
      lastVideoPath: canonicalPath,
      lastVideoUrl: `/__e2e/video?id=${encodeURIComponent(id)}`,
    };
    saveLocalResults(cachedResults);
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
          targetBaseUrl: readTargetBaseUrl(),
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
          const logPath = path.join(logDir, `${id}.log`);
          // Delete any existing log for this test ID to keep only the most recent
          if (fs.existsSync(logPath)) {
            try {
              fs.unlinkSync(logPath);
            } catch {
              // ignore deletion errors
            }
          }
          const logStream = fs.createWriteStream(logPath, { flags: 'w' });
          const specBasename = parseSpecBasename(command);

          // For Permissions task runs, do a full ai-tests reset/bootstrap and inject the freshly-created creds.
          const targetBaseUrl = readTargetBaseUrl();
          // Always inject E2E_APP_URL so catalog commands never fall back to stale hosted defaults.
          let effectiveCommand = `E2E_APP_URL=${shellEscape(targetBaseUrl)} ${command}`;
          if (id === 'task-permissions') {
            logStream.write('[e2e-runner] bootstrapping ai-tests for permissions...\n');
            const boot = bootstrapAiTestsForPermissions(logStream);
            if (!boot.ok) {
              logStream.end();
              return sendJson(res, 500, { error: boot.error });
            }

            const creds = readAiTestsCreds();
            if (!creds.ok) {
              logStream.end();
              return sendJson(res, 500, { error: creds.error });
            }

            const users = creds.data?.users ?? {};
            const admin = users.admin ?? {};
            const siteAdmin = users.site_admin ?? {};
            const ra = users.research_assistant ?? {};

            // Provide credentials + site context to Cypress for this run.
            const envPrefix = [
              `E2E_APP_URL=${shellEscape(targetBaseUrl)}`,
              `E2E_SITE_NAME=${shellEscape('ai-tests')}`,
              `E2E_USE_SESSION=${shellEscape('TRUE')}`,
              `E2E_FIREBASE_PROJECT_ID=${shellEscape('hs-levante-admin-dev')}`,
              `E2E_AI_ADMIN_EMAIL=${shellEscape(admin.email ?? '')}`,
              `E2E_AI_ADMIN_PASSWORD=${shellEscape(admin.password ?? '')}`,
              `E2E_AI_SITE_ADMIN_EMAIL=${shellEscape(siteAdmin.email ?? '')}`,
              `E2E_AI_SITE_ADMIN_PASSWORD=${shellEscape(siteAdmin.password ?? '')}`,
              `E2E_AI_RESEARCH_ASSISTANT_EMAIL=${shellEscape(ra.email ?? '')}`,
              `E2E_AI_RESEARCH_ASSISTANT_PASSWORD=${shellEscape(ra.password ?? '')}`,
            ].join(' ');

            effectiveCommand = `${envPrefix} ${command}`;
          }

          const proc = child.spawn('bash', ['-lc', effectiveCommand], {
            cwd: process.cwd(),
            env: process.env,
            stdio: ['ignore', 'pipe', 'pipe'],
          });

          runs.set(runId, {
            runId,
            id,
            command: effectiveCommand,
            specBasename,
            startedAt,
            finishedAt: null,
            exitCode: null,
            status: 'running',
            logPath,
            videoPath: null,
          });

          proc.stdout.on('data', (d) => logStream.write(d));
          proc.stderr.on('data', (d) => logStream.write(d));
          proc.on('close', (code) => {
            logStream.end();
            const existing = runs.get(runId);
            if (!existing) return;
            const finishedAt = new Date().toISOString();
            const exitCode = typeof code === 'number' ? code : 1;
            const videoPath = null;
            runs.set(runId, {
              ...existing,
              status: 'finished',
              exitCode,
              finishedAt,
              videoPath,
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

            // Canonicalize video (overwrite one canonical mp4 per test id).
            finalizeCanonicalVideo({ runId, id: existing.id, specBasename: existing.specBasename });
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

      server.middlewares.use('/__e2e/log', async (req, res, next) => {
        if (req.method !== 'GET') return next();
        const url = new URL(req.url ?? '', 'http://localhost');
        const runId = url.searchParams.get('runId');
        if (!runId) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'text/plain');
          return res.end('Missing runId');
        }
        const run = runs.get(runId);
        const logPath = run?.logPath;
        if (!logPath || !fs.existsSync(logPath)) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/plain');
          return res.end('Log not found');
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return fs.createReadStream(logPath).pipe(res);
      });

      server.middlewares.use('/__e2e/video', async (req, res, next) => {
        if (req.method !== 'GET') return next();
        const url = new URL(req.url ?? '', 'http://localhost');
        const id = url.searchParams.get('id');
        const runId = url.searchParams.get('runId');
        if (!id && !runId) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'text/plain');
          return res.end('Missing id or runId');
        }

        let videoPath = null;
        if (id) {
          const rec = cachedResults.byId?.[id];
          videoPath = typeof rec?.lastVideoPath === 'string' ? rec.lastVideoPath : canonicalVideoPathForId(id);
        } else if (runId) {
          const run = runs.get(runId);
          videoPath = run?.videoPath ?? null;
          if (!videoPath) {
            for (const rec of Object.values(cachedResults.byId ?? {})) {
              if (rec?.lastRunRunId === runId && typeof rec?.lastVideoPath === 'string') {
                videoPath = rec.lastVideoPath;
                break;
              }
            }
          }
          if (!videoPath && run?.specBasename) {
            // Last-chance: find the newest video for this spec and canonicalize it.
            finalizeCanonicalVideo({ runId, id: run.id, specBasename: run.specBasename });
            const canonicalPath = canonicalVideoPathForId(run.id);
            if (fs.existsSync(canonicalPath)) videoPath = canonicalPath;
          }
        }

        if (!videoPath || !fs.existsSync(videoPath)) {
          // UI prefers to show "No video" rather than a broken link.
          // Returning 200 keeps the UX simple even if video recording is disabled.
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/plain');
          return res.end('No video');
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'video/mp4');
        return fs.createReadStream(videoPath).pipe(res);
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

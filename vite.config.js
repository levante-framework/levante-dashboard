import * as child from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import UnheadVite from '@unhead/addons/vite';
import Vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

const require = createRequire(import.meta.url);
const commitHash = child.execSync('git rev-parse --short HEAD').toString();
const primeiconsDir = path.dirname(require.resolve('primeicons/primeicons.css'));

// Feed the published sourcemaps of the `include`d dependencies into the bundle
// so each emitted (minified) chunk's map chains back to that dep's original
// source files rather than stopping at its published bundle.
function chainSourcemaps(include = ['@levante-framework/core-tasks']) {
  return {
    name: 'chain-sourcemaps',
    load(id) {
      if (!id.endsWith('.js') || !include.some((dep) => id.includes(dep))) return null;

      const code = fs.readFileSync(id, 'utf8');
      const match = code.match(/\/\/# sourceMappingURL=(\S+)\s*$/);
      if (!match) return null;

      // Inline maps are already consumed by Vite; only handle external .map files.
      if (match[1].startsWith('data:')) return null;

      // A map is referenced but can't be loaded: fail loudly so an upstream format
      // change surfaces in CI instead of silently degrading stack traces.
      const mapPath = path.resolve(path.dirname(id), match[1]);
      if (!fs.existsSync(mapPath)) {
        this.error(`${id} referenced a sourcemap that does not exist: ${mapPath}`);
      }

      const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
      return { code: code.replace(match[0], ''), map };
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(commitHash),
    'import.meta.env.VITE_LEVANTE': JSON.stringify('TRUE'),
  },
  plugins: [
    Vue({
      include: [/\.vue$/, /\.md$/],
    }),
    chainSourcemaps(),
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
            org: 'levante-framework-eu',
            project: 'dashboard',
            url: 'https://de.sentry.io',
          }),
        ]
      : []),
  ],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    dedupe: [
      'firebase',
      '@firebase/app',
      '@firebase/auth',
      '@firebase/firestore',
      '@firebase/functions',
      '@firebase/storage',
    ],
    preserveSymlinks: true,
  },

  server: {
    fs: {
      allow: ['..', primeiconsDir],
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
          sentry: ['@sentry/vue'],
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

import { sentryVitePlugin } from '@sentry/vite-plugin';
import { fileURLToPath, URL } from 'url';
import { defineConfig } from 'vite';
import Vue from '@vitejs/plugin-vue';
import mkcert from 'vite-plugin-mkcert';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import UnheadVite from '@unhead/addons/vite';
import * as child from 'child_process';

const commitHash = child.execSync('git rev-parse --short HEAD').toString();

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(commitHash),
    'import.meta.env.VITE_LEVANTE': JSON.stringify(process.env.VITE_LEVANTE || 'TRUE'),
    'import.meta.env.VITE_FIREBASE_PROJECT': JSON.stringify(process.env.VITE_FIREBASE_PROJECT || 'DEV'),
    'import.meta.env.VITE_EMULATOR': JSON.stringify(process.env.VITE_EMULATOR || 'FALSE'),
    'import.meta.env.VITE_QUERY_DEVTOOLS_ENABLED': JSON.stringify(process.env.VITE_QUERY_DEVTOOLS_ENABLED || 'false'),
  },
  plugins: [
    Vue({
      include: [/\.vue$/, /\.md$/],
    }),
    nodePolyfills({
      globals: {
        process: true,
      },
    }),
    UnheadVite(),
    ...(process.env.NODE_ENV === 'development' && process.env.CI !== 'true' ? [mkcert()] : []),
    ...(process.env.NODE_ENV !== 'development'
      ? [
          sentryVitePlugin({
            org: 'levante-framework',
            project: 'dashboard',
          }),
        ]
      : []),
  ],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  server: {
    fs: {
      allow: ['..'],
    },
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
    include: [
      '@levante-framework/firekit'
    ],
    esbuildOptions: {
      mainFields: ['module', 'main'],
      resolveExtensions: ['.js', '.mjs', '.cjs'],
    },
  },
});

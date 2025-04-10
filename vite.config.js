import { sentryVitePlugin } from '@sentry/vite-plugin';
import { fileURLToPath, URL } from 'url';
import { defineConfig } from 'vite';
import Vue from '@vitejs/plugin-vue';
import mkcert from 'vite-plugin-mkcert';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import UnheadVite from '@unhead/addons/vite';
import * as child from 'child_process';
import path from 'path';

const commitHash = child.execSync("git rev-parse --short HEAD").toString();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on mode
  // loadEnv(mode, process.cwd());
  return {
    define: {'import.meta.env.VITE_APP_VERSION': JSON.stringify(commitHash)},
    plugins: [
      Vue({
        include: [/\.vue$/, /\.md$/],
        template: {
          compilerOptions: {
            // Treat all tags starting with 'gmp-' as custom elements
            isCustomElement: (tag) => tag.startsWith('gmp-'),
          },
        },
      }),
      nodePolyfills({
        globals: {
          process: true,
        },
      }),
      UnheadVite(),
      ...(process.env.NODE_ENV === 'development' ? [mkcert()] : []),
      ...(process.env.NODE_ENV !== 'development'
        ? [
            sentryVitePlugin({
              org: 'levante-usa',
              project: 'levante-dashboard',
              // Auth tokens can be obtained from https://sentry.io/settings/account/api/auth-tokens/
              // and needs the `project:releases` and `org:read` scopes
              // authToken: process.env.SENTRY_AUTH_TOKEN,
              // Optionally uncomment the line below to override automatic detection
              // release: 'my-release',
            }),
          ]
        : []),
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    server: {
      fs: {
        allow: ['..'],
      },
      https: true,
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
            firekit: ['@levante-framework/firekit'],
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
        '@levante-framework/firekit',
        'vue-google-maps-community-fork',
        'fast-deep-equal', // Required due to https://github.com/nathanap/vue-google-maps-community-fork/issues/4
      ],
    },
  };
});

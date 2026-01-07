import { defineConfig } from 'cypress';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // Load local repo `.env` for E2E credentials/config. This is intentionally file-based so
      // local runs don't depend on the caller's shell environment.
      const envPath = path.join(config.projectRoot, '.env');
      if (fs.existsSync(envPath)) {
        const parsed = dotenv.parse(fs.readFileSync(envPath, 'utf8'));

        // Merge `.env` values into Cypress env, without overriding explicit CLI config/env.
        // Also support CYPRESS_* variants by mapping to the non-prefixed key when present.
        const fromFile: Record<string, string> = { ...parsed };
        for (const [k, v] of Object.entries(parsed)) {
          if (k.startsWith('CYPRESS_')) {
            const unprefixed = k.replace(/^CYPRESS_/, '');
            if (!(unprefixed in fromFile)) fromFile[unprefixed] = v;
          }
        }

        config.env = {
          ...fromFile,
          ...config.env,
        };
      }

      // Provide a default base URL for the locales specs; researcher specs typically use baseUrl from runner script.
      if (!config.env.E2E_BASE_URL) config.env.E2E_BASE_URL = 'http://localhost:5173/signin';

      return config;
    },
    supportFile: false,
    excludeSpecPattern: ['**/locales*.cy.ts'],
    env: {},
  },
});

import { defineConfig } from 'cypress';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

function loadEnvFromDotenvFile(projectRoot: string): Record<string, string> {
  const envPath = path.join(projectRoot, '.env');
  if (!fs.existsSync(envPath)) return {};

  const parsed = dotenv.parse(fs.readFileSync(envPath, 'utf8'));

  // Support CYPRESS_* variants by mapping to the non-prefixed key when present.
  const fromFile: Record<string, string> = { ...parsed };
  for (const [k, v] of Object.entries(parsed)) {
    if (k.startsWith('CYPRESS_')) {
      const unprefixed = k.replace(/^CYPRESS_/, '');
      if (!(unprefixed in fromFile)) fromFile[unprefixed] = v;
    }
  }

  return fromFile;
}

const envFromFile = loadEnvFromDotenvFile(process.cwd());

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // Merge `.env` values into Cypress env, without overriding explicit CLI config/env.
      config.env = {
        ...envFromFile,
        ...config.env,
      };

      // Provide a default base URL for the locales specs; researcher specs typically use baseUrl from runner script.
      if (!config.env.E2E_BASE_URL) config.env.E2E_BASE_URL = 'http://localhost:5173/signin';

      return config;
    },
    supportFile: false,
    excludeSpecPattern: ['**/locales*.cy.ts'],
    env: envFromFile,
  },
});

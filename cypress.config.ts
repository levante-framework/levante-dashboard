import fs from 'node:fs';
import path from 'node:path';

import dotenv from 'dotenv';
import { defineConfig } from 'cypress';

function loadDotenv() {
  const candidatePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '.env.local'),
  ];

  const loadedFrom: string[] = [];
  for (const p of candidatePaths) {
    if (!fs.existsSync(p)) continue;
    const result = dotenv.config({ path: p });
    if (!result.error) loadedFrom.push(p);
  }

  return {
    loadedFrom,
    hasE2eEmail: Boolean(process.env.E2E_TEST_EMAIL || process.env.DEV_LOGIN),
    hasE2ePassword: Boolean(process.env.E2E_TEST_PASSWORD || process.env.DEV_PASSWORD),
  };
}

function getBaseUrl() {
  const appUrl = process.env.E2E_APP_URL;
  if (appUrl) return appUrl;

  const baseUrl = process.env.E2E_BASE_URL;
  if (baseUrl) {
    try {
      return new URL(baseUrl).origin;
    } catch {
      // ignore
    }
  }

  return 'http://localhost:5173';
}

const dotenvStatus = loadDotenv();

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
      // Ensure process/.env values override cypress.env.json defaults (cypress.env.json is primarily for emulator defaults).
      const runtimeEmail = process.env.E2E_TEST_EMAIL || process.env.DEV_LOGIN;
      const runtimePassword = process.env.E2E_TEST_PASSWORD || process.env.DEV_PASSWORD;
      if (runtimeEmail) config.env.E2E_TEST_EMAIL = runtimeEmail;
      if (runtimePassword) config.env.E2E_TEST_PASSWORD = runtimePassword;

      // Print a safe startup summary so it's obvious what Cypress is doing in CI / local runs.
      // (No secrets, and we avoid printing personal emails.)
      console.log(
        `[cypress] env loaded from: ${dotenvStatus.loadedFrom.length ? dotenvStatus.loadedFrom.join(', ') : '(none)'} | hasE2E_TEST_EMAIL=${
          dotenvStatus.hasE2eEmail
        } hasE2E_TEST_PASSWORD=${dotenvStatus.hasE2ePassword}`,
      );
      return config;
    },
    baseUrl: getBaseUrl(),
    supportFile: false,
    trashAssetsBeforeRuns: false,
    excludeSpecPattern: ['**/locales*.cy.ts'],
    env: {
      E2E_BASE_URL: process.env.E2E_BASE_URL || 'http://localhost:5173/signin',
      E2E_APP_URL: process.env.E2E_APP_URL,
      E2E_TEST_EMAIL: process.env.E2E_TEST_EMAIL || process.env.DEV_LOGIN,
      E2E_TEST_PASSWORD: process.env.E2E_TEST_PASSWORD || process.env.DEV_PASSWORD,
      E2E_AI_ADMIN_EMAIL: process.env.E2E_AI_ADMIN_EMAIL,
      E2E_AI_ADMIN_PASSWORD: process.env.E2E_AI_ADMIN_PASSWORD,
      E2E_AI_SITE_ADMIN_EMAIL: process.env.E2E_AI_SITE_ADMIN_EMAIL,
      E2E_AI_SITE_ADMIN_PASSWORD: process.env.E2E_AI_SITE_ADMIN_PASSWORD,
      E2E_SITE_NAME: process.env.E2E_SITE_NAME || process.env.CYPRESS_E2E_SITE_NAME,
      E2E_SKIP_LOGIN: process.env.E2E_SKIP_LOGIN,
      E2E_LOCALES: process.env.E2E_LOCALES,
      E2E_RUN_OPEN_BUGS: process.env.E2E_RUN_OPEN_BUGS || process.env.CYPRESS_E2E_RUN_OPEN_BUGS,
    },
  },
});

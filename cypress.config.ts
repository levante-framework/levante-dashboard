import { defineConfig } from 'cypress';

export default defineConfig({
  projectId: 'a7nqeq',
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    // Use HTTPS locally, HTTP in CI
    baseUrl: process.env.CI ? 'http://localhost:5173/' : 'https://localhost:5173/',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
  },
});

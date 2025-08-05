import { defineConfig } from 'cypress';

export default defineConfig({
  projectId: 'a7nqeq',
  e2e: {
    setupNodeEvents(on, config) {      
      // Use HTTPS locally, HTTP in CI
      config.baseUrl = process.env.CI ? 'http://localhost:5173/' : 'https://localhost:5173/';
      
      return config;
    },
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
  },
});

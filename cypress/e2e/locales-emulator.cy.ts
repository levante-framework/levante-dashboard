/**
 * @fileoverview Locales Emulator: Multi-Language Login Test for Emulator
 *
 * @description
 * Similar to locales.cy.ts but specifically designed for emulator runs (HTTP, not HTTPS).
 * Tests that login works correctly across multiple locales when running against the Firebase
 * emulator. Simpler than locales.cy.ts (no skip-login option).
 *
 * @test-id locales-emulator
 * @category utility
 *
 * @setup
 * - Requires Firebase emulator to be running
 * - Uses HTTP (not HTTPS) for emulator compatibility
 *
 * @required-env-vars
 * - E2E_USE_ENV (optional - if false, uses hardcoded defaults)
 * - E2E_BASE_URL (default: http://localhost:5173/signin)
 * - E2E_TEST_EMAIL (default: student@levante.test)
 * - E2E_TEST_PASSWORD (default: student123)
 * - E2E_LOCALES (optional - comma-separated list, defaults to 10 locales)
 *
 * @test-cases
 * Tests each locale:
 * 1. Set locale in sessionStorage before page load
 * 2. Visit sign-in page
 * 3. Verify sign-in form renders (at least 2 inputs)
 * 4. Login with credentials
 * 5. Verify redirect away from /signin
 *
 * @expected-behavior
 * - Sign-in page renders correctly for all locales
 * - Login succeeds for all locales
 * - Redirects away from /signin after successful login
 *
 * @related-docs
 * - locales.cy.ts - Similar test with skip-login option
 * - README_TESTS.md - General testing documentation
 *
 * @modification-notes
 * To modify this test:
 * 1. Update defaultLocales array to add/remove locales
 * 2. Update sessionStorage keys if locale storage mechanism changes
 * 3. Test is simpler than locales.cy.ts (no skip-login option)
 * 4. Designed specifically for emulator runs (HTTP URLs)
 * 5. Default locales: en, en-US, es, es-CO, de, fr-CA, nl, en-GH, de-CH, es-AR
 */

import 'cypress-real-events';

// Flag to use env-overrides
const useEnvFlag: boolean = (() => {
  const v = Cypress.env('E2E_USE_ENV');
  return v === true || v === 'TRUE' || v === 'true' || v === 1 || v === '1';
})();

// Defaults for emulator runs (HTTP)
const defaultUrl = 'http://localhost:5173/signin';
const defaultEmail = 'student@levante.test';
const defaultPassword = 'student123';

const baseUrl: string = useEnvFlag ? (Cypress.env('E2E_BASE_URL') as string) || defaultUrl : defaultUrl;
const username: string = useEnvFlag ? (Cypress.env('E2E_TEST_EMAIL') as string) || defaultEmail : defaultEmail;
const password: string = useEnvFlag ? (Cypress.env('E2E_TEST_PASSWORD') as string) || defaultPassword : defaultPassword;

const defaultLocales = ['en', 'en-US', 'es', 'es-CO', 'de', 'fr-CA', 'nl', 'en-GH', 'de-CH', 'es-AR'];
const localesEnv = (Cypress.env('E2E_LOCALES') as string) || '';
const locales = localesEnv
  ? localesEnv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : defaultLocales;

function setLocaleBeforeLoad(locale: string) {
  return {
    onBeforeLoad(win: Window) {
      win.sessionStorage.setItem('levantePlatformLocale', locale);
      win.sessionStorage.setItem('roarPlatformLocale', locale);
    },
  };
}

function typeInto(selector: string, value: string, opts: Partial<Cypress.TypeOptions> = {}) {
  cy.get(selector)
    .should('be.visible')
    .click()
    .type('{selectall}{backspace}', { delay: 0 })
    .type(value, { delay: 0, ...opts });
}

function login() {
  typeInto('input:eq(0)', username);
  typeInto('input:eq(1)', password, { log: false });
  cy.get('button').filter('[data-pc-name=button]').first().click();
}

locales.forEach((locale) => {
  describe(`emulator login: ${locale}`, () => {
    it(`logs in successfully for ${locale}`, () => {
      cy.visit(baseUrl, setLocaleBeforeLoad(locale));
      cy.get('input').should('have.length.at.least', 2);
      login();
      cy.location('pathname', { timeout: 30000 }).should((p) => expect(p).to.not.match(/\/signin$/));
    });
  });
});

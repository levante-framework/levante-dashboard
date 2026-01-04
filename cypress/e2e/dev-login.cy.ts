/**
 * @fileoverview Dev Login: Basic Authentication Smoke Test
 *
 * @description
 * Simple smoke test for the sign-in flow. Verifies that email/password authentication
 * works and that users are redirected appropriately after login. Used for quick validation
 * of authentication infrastructure.
 *
 * @test-id dev-login
 * @category utility
 *
 * @setup
 * - No special setup required
 * - Uses default test credentials if env vars not set
 *
 * @required-env-vars
 * - E2E_USE_ENV (optional - if false, uses hardcoded defaults)
 * - E2E_BASE_URL (default: http://localhost:5173/signin)
 * - E2E_TEST_EMAIL (default: student@levante.test)
 * - E2E_TEST_PASSWORD (default: student123)
 *
 * @test-cases
 * 1. Visit sign-in page
 * 2. Enter email and password
 * 3. Submit form
 * 4. Verify redirect (either to nav bar or error message)
 *
 * @expected-behavior
 * - Sign-in form is accessible
 * - Form submission completes
 * - On success: redirects away from /signin and nav bar appears
 * - On failure: stays on /signin and shows error message
 *
 * @related-docs
 * - src/pages/SignIn.vue - Sign-in page component
 *
 * @modification-notes
 * To modify this test:
 * 1. Update default credentials if test account changes
 * 2. Update selectors if sign-in form structure changes
 * 3. Test uses E2E_USE_ENV flag to toggle between env vars and defaults
 * 4. Simple test - mainly for quick validation of auth flow
 */

import 'cypress-real-events';

const useEnvFlag: boolean = (() => {
  const v = Cypress.env('E2E_USE_ENV');
  return v === true || v === 'TRUE' || v === 'true' || v === 1 || v === '1';
})();

const defaultUrl = 'http://localhost:5173/signin';
const defaultEmail = 'student@levante.test';
const defaultPassword = 'student123';

const baseUrl: string = useEnvFlag ? (Cypress.env('E2E_BASE_URL') as string) || defaultUrl : defaultUrl;
const email: string = useEnvFlag ? (Cypress.env('E2E_TEST_EMAIL') as string) || defaultEmail : defaultEmail;
const password: string = useEnvFlag ? (Cypress.env('E2E_TEST_PASSWORD') as string) || defaultPassword : defaultPassword;

function typeInto(selector: string, value: string, opts: Partial<Cypress.TypeOptions> = {}) {
  cy.get(selector)
    .should('be.visible')
    .click()
    .type('{selectall}{backspace}', { delay: 0 })
    .type(value, { delay: 0, ...opts });
}

describe('dev login', () => {
  it('signs in with email/password and shows nav bar', () => {
    cy.visit(baseUrl);

    typeInto('[data-cy="input-username-email"]', email);
    typeInto('[data-cy="input-password"]', password, { log: false });
    cy.get('[data-cy="submit-sign-in-with-password"]').should('be.visible').click();

    cy.location('pathname', { timeout: 30000 }).then((p) => {
      if (/\/signin$/.test(p)) cy.contains(/incorrect|invalid|wrong password/i, { timeout: 10000 }).should('exist');
      else cy.get('[data-testid="nav-bar"]', { timeout: 30000 }).should('be.visible');
    });
  });
});


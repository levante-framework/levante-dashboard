/**
 * @fileoverview Administrator Login: Sign-In Flow Documentation Test
 *
 * @description
 * Tests the administrator login flow as documented in the researcher documentation.
 * Verifies that the "Are you an Admin?" prompt appears and that both Google SSO and
 * email/password login options are available.
 *
 * @test-id task-administrator-login
 * @category tasks
 *
 * @setup
 * - No special setup required
 * - Tests the sign-in page UI and login flow
 *
 * @required-env-vars
 * - E2E_AI_SITE_ADMIN_EMAIL or E2E_TEST_EMAIL (required)
 * - E2E_AI_SITE_ADMIN_PASSWORD or E2E_TEST_PASSWORD (required)
 *
 * @test-cases
 * 1. Visit /signin page
 * 2. Verify "Are you an Admin?" prompt is visible
 * 3. Click "here" link to reveal Google SSO button
 * 4. Verify "Continue with Google" button appears
 * 5. Sign in with email/password (validates password login also works)
 *
 * @expected-behavior
 * - Admin prompt is visible on sign-in page
 * - Clicking "here" reveals Google SSO option
 * - Email/password login completes successfully
 * - Test validates that password login works for admin accounts (not just Google SSO)
 *
 * @related-docs
 * - https://researcher.levante-network.org/dashboard/administrator-log-in - Documentation
 * - src/pages/SignIn.vue - Sign-in page component
 *
 * @modification-notes
 * To modify this test:
 * 1. Update prompt text if UI copy changes
 * 2. Update selector for "here" link if structure changes
 * 3. Update Google SSO button text if it changes
 * 4. Test uses shared signInWithPassword helper for consistency
 */

import { ignoreKnownHostedUncaughtExceptions, signInWithPassword } from '../_helpers';

const email: string =
  (Cypress.env('E2E_AI_SITE_ADMIN_EMAIL') as string) ||
  (Cypress.env('E2E_TEST_EMAIL') as string) ||
  'student@levante.test';
const password: string =
  (Cypress.env('E2E_AI_SITE_ADMIN_PASSWORD') as string) ||
  (Cypress.env('E2E_TEST_PASSWORD') as string) ||
  'student123';

describe('researcher docs: log in as a study administrator', () => {
  it('shows the admin prompt and allows email/password login', () => {
    ignoreKnownHostedUncaughtExceptions();

    cy.visit('/signin');

    // Docs: “Are you an Admin? Click {action} to Sign in.” and click "here" to reveal Google SSO button.
    cy.contains('Are you an Admin?', { timeout: 60000 })
      .should('be.visible')
      .parent()
      .within(() => {
        cy.contains('here').click();
      });
    cy.contains('button', /Continue with Google/i, { timeout: 60000 }).should('be.visible');

    // Docs: password sign-in also works for admin accounts.
    signInWithPassword({ email, password });
  });
});


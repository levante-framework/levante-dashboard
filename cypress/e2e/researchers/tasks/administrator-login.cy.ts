import { ignoreKnownHostedUncaughtExceptions, signInWithPassword } from '../_helpers';

const email: string = (Cypress.env('E2E_TEST_EMAIL') as string) || 'student@levante.test';
const password: string = (Cypress.env('E2E_TEST_PASSWORD') as string) || 'student123';

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


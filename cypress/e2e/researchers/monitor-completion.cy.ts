import {
  ignoreKnownHostedUncaughtExceptions,
  selectSite,
  signInWithPassword,
} from './_helpers';

const email: string = (Cypress.env('E2E_TEST_EMAIL') as string) || 'student@levante.test';
const password: string = (Cypress.env('E2E_TEST_PASSWORD') as string) || 'student123';

describe('researcher docs: monitor completion', () => {
  it('can find an assignment and open See Details (Progress Report)', () => {
    ignoreKnownHostedUncaughtExceptions();

    signInWithPassword({ email, password });
    selectSite('AAA Site');

    // Docs: Assignments → View Assignment (this is Home in our app), then “See details”.
    cy.visit('/');
    cy.contains('All Assignments', { timeout: 120000 }).should('be.visible');
    cy.get('[data-cy="h2-card-admin-title"]', { timeout: 120000 })
      .should('exist')
      .then(($titles) => {
        if ($titles.length < 1) throw new Error('No assignments found to monitor completion.');
      });

    cy.get('.card-administration', { timeout: 120000 })
      .first()
      .should('be.visible')
      .within(() => {
        cy.get('button[data-cy="button-progress"]', { timeout: 60000 }).first().click({ force: true });
      });

    cy.location('pathname', { timeout: 60000 }).should('match', /^\/administration\//);
    cy.contains(/progress report/i, { timeout: 120000 }).should('exist');
    cy.get('[data-cy="roar-data-table"]', { timeout: 120000 }).should('exist');
  });
});


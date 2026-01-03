import { ignoreKnownHostedUncaughtExceptions, selectSite, signInWithPassword } from '../_helpers';

// GH#735: For some (newly created) site admins, progress report is blank due to a 403 when fetching data.
// https://github.com/levante-framework/levante-dashboard/issues/735

const siteAdminEmail: string =
  (Cypress.env('E2E_AI_SITE_ADMIN_EMAIL') as string) || (Cypress.env('E2E_TEST_EMAIL') as string) || 'student@levante.test';
const siteAdminPassword: string =
  (Cypress.env('E2E_AI_SITE_ADMIN_PASSWORD') as string) || (Cypress.env('E2E_TEST_PASSWORD') as string) || 'student123';
const siteName: string = (Cypress.env('E2E_SITE_NAME') as string) || 'ai-tests';

function failOn403ForProgressReportRequests() {
  const forbiddenRequests: Array<{ url: string; status: number }> = [];

  // Firestore REST endpoints used by ProgressReport.vue queries.
  cy.intercept('POST', '**:runQuery', (req) => {
    req.continue((res) => {
      if (res.statusCode === 403) forbiddenRequests.push({ url: req.url, status: res.statusCode });
    });
  }).as('fsRunQuery');

  cy.intercept('POST', '**:batchGet', (req) => {
    req.continue((res) => {
      if (res.statusCode === 403) forbiddenRequests.push({ url: req.url, status: res.statusCode });
    });
  }).as('fsBatchGet');

  // Surface a single helpful failure at the end of the test.
  cy.on('test:after:run', () => {
    if (forbiddenRequests.length) {
      const unique = Array.from(new Set(forbiddenRequests.map((r) => `${r.status} ${r.url}`)));
      throw new Error(`Progress Report fetch returned 403 (forbidden):\n${unique.join('\n')}`);
    }
  });
}

describe('GH#735 [OPEN] PERMISSIONS Progress report is blank for some users', () => {
  const testRunner = Cypress.env('E2E_RUN_OPEN_BUGS') ? it : it.skip;

  testRunner('site admin can open Progress Report without 403 and sees the data table', () => {
    ignoreKnownHostedUncaughtExceptions();
    failOn403ForProgressReportRequests();

    cy.visit('/signin');
    signInWithPassword({ email: siteAdminEmail, password: siteAdminPassword });
    selectSite(siteName);

    // Navigate to any assignment and open Progress Report.
    cy.visit('/');
    cy.get('[data-cy="h2-card-admin-title"]', { timeout: 120000 })
      .should('exist')
      .then(($titles) => {
        if ($titles.length < 1) throw new Error('No assignments found to open Progress Report. Seed ai-tests first.');
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


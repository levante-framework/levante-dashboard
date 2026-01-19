/**
 * @fileoverview GH#735 [OPEN]: Progress Report Blank for Some Site Admins (403 Errors)
 *
 * @description
 * Tests GitHub issue #735 - verifies that site admins can access progress reports without
 * encountering 403 (Forbidden) errors when fetching data. This is a permissions system bug
 * where some site admins were incorrectly denied access to progress report data.
 *
 * @test-id gh-0735-open
 * @category bugs
 * @github-issue 735
 *
 * @setup
 * - Requires at least one assignment to exist
 * - Requires a site_admin user account
 * - Test intercepts Firestore requests to detect 403 errors
 * - Only runs if E2E_RUN_OPEN_BUGS=true (skipped by default)
 *
 * @required-env-vars
 * - E2E_SITE_NAME (default: ai-tests)
 * - E2E_AI_SITE_ADMIN_EMAIL or E2E_TEST_EMAIL (required - site_admin account)
 * - E2E_AI_SITE_ADMIN_PASSWORD or E2E_TEST_PASSWORD (required)
 * - E2E_RUN_OPEN_BUGS=true (required to run this test, otherwise skipped)
 *
 * @test-cases
 * 1. Set up interceptors to detect 403 errors on Firestore requests
 * 2. Sign in as site_admin and select site
 * 3. Navigate to home page
 * 4. Open progress report for any assignment
 * 5. Verify progress report page loads
 * 6. Verify data table is visible
 * 7. Verify no 403 errors occurred
 *
 * @expected-behavior
 * - Progress report page loads successfully
 * - Data table ([data-cy="roar-data-table"]) is visible
 * - No 403 errors on Firestore runQuery or batchGet requests
 * - Page title contains "Progress Report"
 *
 * @related-docs
 * - https://github.com/levante-framework/levante-dashboard/issues/735 - Original issue
 * - src/pages/administration/ProgressReport.vue - Progress report component
 * - README_TESTS_PERMISSIONS.md - Permissions system documentation
 *
 * @modification-notes
 * To modify this test:
 * 1. Update intercept patterns if Firestore API endpoints change
 * 2. Update selectors if progress report UI structure changes
 * 3. Test is skipped by default (set E2E_RUN_OPEN_BUGS=true to run)
 * 4. Uses failOn403ForProgressReportRequests() helper to detect permission errors
 * 5. Test fails if any 403 errors are detected on progress report data fetches
 * 6. Includes helpful error message listing all 403 URLs if test fails
 */

import { ignoreKnownHostedUncaughtExceptions, pickToday, selectSite, signInWithPassword, typeInto } from '../_helpers';

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
  cy.intercept({ method: 'POST', url: '**:runQuery', middleware: true }, (req) => {
    req.on('response', (res) => {
      if (res.statusCode === 403) forbiddenRequests.push({ url: req.url, status: res.statusCode });
    });
    req.continue();
  }).as('fsRunQuery');

  cy.intercept({ method: 'POST', url: '**:batchGet', middleware: true }, (req) => {
    req.on('response', (res) => {
      if (res.statusCode === 403) forbiddenRequests.push({ url: req.url, status: res.statusCode });
    });
    req.continue();
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
    cy.contains('All Assignments', { timeout: 120000 }).should('be.visible');
    cy.get('body', { timeout: 120000 }).then(($body) => {
      if ($body.find('[data-cy="h2-card-admin-title"]').length) return;

      const runId = `${Date.now()}`;
      const cohortName = `e2e-cohort-735-${runId}`;
      const assignmentName = `e2e-assignment-735-${runId}`;

      cy.visit('/list-groups');
      cy.get('[data-testid="groups-page-ready"]', { timeout: 90000 }).should('exist');
      cy.get('body').then(($groupBody) => {
        if ($groupBody.find('[data-testid="add-group-btn"]').length) {
          cy.get('[data-testid="add-group-btn"]').should('be.visible').should('not.be.disabled').click();
          return;
        }
        cy.contains('button', /^Add Group$/, { timeout: 60000 }).should('be.visible').click();
      });

      cy.get('[data-testid="modalTitle"]').should('contain.text', 'Add New');
      cy.get('[data-cy="dropdown-org-type"]').click();
      cy.contains('[role="option"]', /^Cohort$/).click();
      typeInto('[data-cy="input-org-name"]', cohortName);
      cy.intercept('POST', /upsertOrg/i).as('upsertOrg');
      cy.get('[data-testid="submitBtn"]').should('not.be.disabled').click();
      cy.wait('@upsertOrg', { timeout: 120000 }).then((interception) => {
        const status = interception.response?.statusCode;
        if (status && status >= 400) throw new Error(`upsertOrg failed: HTTP ${status}`);
      });
      cy.contains('Cohort created successfully.', { timeout: 60000 }).should('exist');

      cy.visit('/create-assignment');
      typeInto('[data-cy="input-administration-name"]', assignmentName);
      pickToday('[data-cy="input-start-date"]');
      pickToday('[data-cy="input-end-date"]');

      cy.contains('[role="tab"]', /^Cohorts$/).click({ force: true });
      cy.get('[data-cy="group-picker-listbox"]', { timeout: 120000 })
        .filter(':visible')
        .first()
        .within(() => {
          cy.contains('[role="option"]', cohortName, { timeout: 120000 }).click();
        });

      cy.get('[data-cy="input-variant-name"]', { timeout: 120000 }).should('be.visible');
      cy.get('[data-cy="selected-variant"]', { timeout: 120000 }).should('exist').first().click();
      cy.get('[data-cy="panel-droppable-zone"]', { timeout: 120000 }).contains('Variant name:').should('exist');

      cy.get('input[id="No"]').should('exist').check({ force: true });

      cy.intercept('POST', /upsertAdministration/i).as('upsertAdministration');
      cy.get('[data-cy="button-create-administration"]').should('be.visible').should('not.be.disabled').click();
      cy.wait('@upsertAdministration', { timeout: 120000 }).then((interception) => {
        const status = interception.response?.statusCode;
        if (status && status >= 400) throw new Error(`upsertAdministration failed: HTTP ${status}`);
      });
      cy.contains('Your new assignment is being processed', { timeout: 60000 }).should('exist');

      cy.visit('/');
      cy.contains('All Assignments', { timeout: 120000 }).should('be.visible');
      cy.get('[data-cy="h2-card-admin-title"]', { timeout: 120000 }).should('exist');
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


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


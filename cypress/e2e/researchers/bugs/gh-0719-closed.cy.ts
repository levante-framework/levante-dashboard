/**
 * @fileoverview GH#719 [CLOSED]: Assignment Cards Show "See Details" When Stats Missing
 *
 * @description
 * Regression test for GitHub issue #719. Verifies that assignment cards continue to display
 * "See Details" buttons even when progress statistics documents are missing from Firestore.
 * This ensures the UI remains functional even if stats collection is incomplete.
 *
 * @test-id gh-0719-closed
 * @category bugs
 * @github-issue 719
 *
 * @setup
 * - Requires at least one assignment to exist
 * - Test intercepts Firestore batchGet requests to simulate missing stats documents
 * - Site selection required for permissions mode
 *
 * @required-env-vars
 * - E2E_SITE_NAME (default: ai-tests)
 * - E2E_AI_SITE_ADMIN_EMAIL or E2E_TEST_EMAIL (required)
 * - E2E_AI_SITE_ADMIN_PASSWORD or E2E_TEST_PASSWORD (required)
 *
 * @test-cases
 * 1. Intercept Firestore batchGet to return missing documents for all /stats/ requests
 * 2. Sign in and select site
 * 3. Navigate to home page
 * 4. Verify assignment cards render
 * 5. Verify "See Details" buttons are visible despite missing stats
 *
 * @expected-behavior
 * - Assignment cards render successfully even when stats docs are missing
 * - "See Details" buttons ([data-cy="button-progress"]) are visible
 * - No errors prevent card rendering
 * - UI remains functional for navigation to progress reports
 *
 * @related-docs
 * - https://github.com/levante-framework/levante-dashboard/issues/719 - Original issue
 * - src/pages/HomeAdministrator.vue - Assignment cards component
 *
 * @modification-notes
 * To modify this test:
 * 1. Update intercept pattern if Firestore API structure changes
 * 2. Update selectors if assignment card structure changes
 * 3. Test was updated to handle site selection gracefully (checks if dropdown exists)
 * 4. Uses ensureSiteSelected() helper to handle permissions mode
 * 5. Test simulates missing stats by intercepting batchGet and returning { missing: { name } }
 */

import 'cypress-real-events';
import { assert } from 'chai';

// GH#719: Assignment cards should still show "See Details" even when stats are missing.
// https://github.com/levante-framework/levante-dashboard/issues/719

Cypress.on('uncaught:exception', (err) => {
  if (err.message.includes('Missing or insufficient permissions')) return false;
});

const email: string =
  (Cypress.env('E2E_AI_SITE_ADMIN_EMAIL') as string) || (Cypress.env('E2E_TEST_EMAIL') as string) || 'student@levante.test';
const password: string =
  (Cypress.env('E2E_AI_SITE_ADMIN_PASSWORD') as string) ||
  (Cypress.env('E2E_TEST_PASSWORD') as string) ||
  'student123';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assertCurrentSiteSelected() {
  cy.window().then((win) => {
    const raw = win.sessionStorage.getItem('authStore');
    assert.isString(raw, 'authStore sessionStorage exists');
    if (typeof raw !== 'string') throw new Error('authStore sessionStorage missing');

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`authStore sessionStorage is not valid JSON: ${raw}`);
    }

    if (!isRecord(parsed)) throw new Error(`authStore sessionStorage is not an object: ${raw}`);
    const currentSite = parsed.currentSite;

    if (typeof currentSite !== 'string' || !currentSite || currentSite === 'any') {
      throw new Error(`Expected currentSite to be set (not "any"). Got: ${String(currentSite)}`);
    }
  });
}

function getCurrentSiteFromSessionStorage(): Cypress.Chainable<string | null> {
  return cy.window().then((win) => {
    const raw = win.sessionStorage.getItem('authStore');
    if (typeof raw !== 'string') return null;
    try {
      const parsed = JSON.parse(raw) as { currentSite?: unknown } | null;
      const currentSite = parsed?.currentSite;
      return typeof currentSite === 'string' ? currentSite : null;
    } catch {
      return null;
    }
  });
}

function ensureSiteSelected(siteName: string) {
  return getCurrentSiteFromSessionStorage().then((currentSite) => {
    if (typeof currentSite === 'string' && currentSite && currentSite !== 'any') {
      return;
    }

    cy.get('body', { timeout: 90000 }).then(($body) => {
      const hasSiteSelect = $body.find('[data-cy="site-select"]').length > 0;
      if (!hasSiteSelect) {
        cy.log(
          `site-select not present; continuing without explicit site selection (currentSite=${String(currentSite)})`,
        );
        return;
      }

      cy.get('[data-cy="site-select"]', { timeout: 90000 }).should('be.visible').click();
      cy.contains('[role="option"]', new RegExp(`^${escapeRegExp(siteName)}$`), { timeout: 60000 }).click();
      assertCurrentSiteSelected();
    });
  });
}

function typeInto(selector: string, value: string, opts: Partial<Cypress.TypeOptions> = {}) {
  cy.get(selector)
    .should('be.visible')
    .click()
    .type('{selectall}{backspace}', { delay: 0 })
    .type(value, { delay: 0, ...opts });
}

function signIn() {
  cy.intercept('POST', '**/accounts:signInWithPassword*').as('signInWithPassword');

  cy.get('[data-cy="input-username-email"]').should('be.visible');
  typeInto('[data-cy="input-username-email"]', email);
  typeInto('[data-cy="input-password"]', password, { log: false });
  cy.get('[data-cy="submit-sign-in-with-password"]').click();

  cy.wait('@signInWithPassword', { timeout: 60000 }).then((interception) => {
    const requestBody = interception.request?.body as { email?: string } | undefined;
    const requestEmail = requestBody?.email;
    expect(requestEmail, 'signInWithPassword request email').to.eq(email);

    const status = interception.response?.statusCode;
    const body = interception.response?.body as { error?: unknown } | undefined;
    if (status && status >= 400) {
      throw new Error(`Firebase signInWithPassword failed: HTTP ${status} body=${JSON.stringify(body)}`);
    }
    if (body?.error) {
      throw new Error(`Firebase signInWithPassword failed: error=${JSON.stringify(body.error)}`);
    }
  });

  cy.location('pathname', { timeout: 90000 }).should('not.eq', '/signin');
  cy.get('body', { timeout: 90000 }).then(($body) => {
    if ($body.find('[data-testid="nav-bar"]').length) return;
    if ($body.find('#levante-logo-loading').length) {
      cy.get('#levante-logo-loading', { timeout: 90000 }).should('not.exist');
    }
  });

  cy.get('#site-header', { timeout: 90000 }).should('be.visible');
}

describe('GH#719 [CLOSED] Assignment cards show "See Details" even if stats are missing', () => {
  it('renders assignment cards and See Details actions when stats docs are missing', () => {
    // Simulate "missing stats" by making Firestore batchGet return only `missing` for stats documents.
    // This should NOT prevent org rows from rendering (and therefore should not hide "See Details").
    cy.intercept('POST', '**:batchGet', (req) => {
      const body = req.body as { documents?: unknown } | undefined;
      const docs = body?.documents;
      if (!Array.isArray(docs)) return;

      const docStrings = docs.filter((d): d is string => typeof d === 'string');
      const isStatsBatch = docStrings.some((d) => d.includes('/stats/'));
      if (!isStatsBatch) return;

      req.reply(docStrings.map((name) => ({ missing: { name } })));
    }).as('batchGetStatsMissing');

    cy.visit('/signin');
    signIn();

    // Select a site (permissions mode requires this to render admin pages reliably).
    const siteName: string = (Cypress.env('E2E_SITE_NAME') as string) || 'ai-tests';
    ensureSiteSelected(siteName);

    // Home page: assignment cards should render.
    cy.visit('/');
    cy.get('[data-cy="h2-card-admin-title"]', { timeout: 120000 }).should('exist');

    // GH#719 expectation: even if progress stats are missing, "See Details" should still be present.
    // We assert at least one "See Details" action exists on the page.
    cy.get('[data-cy="button-progress"]', { timeout: 120000 }).should('exist').and('be.visible');
    cy.contains('button', /^See Details$/, { timeout: 120000 }).should('exist');
  });
});

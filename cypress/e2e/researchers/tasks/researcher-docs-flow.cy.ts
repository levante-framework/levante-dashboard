/**
 * Researcher Docs Flow (robust): groups → users → assignment → progress
 *
 * This is a from-scratch, reliability-first workflow spec:
 * - Uses stable selectors
 * - Uses network intercepts where possible
 * - Fails with actionable diagnostics if the app never finishes initializing
 *
 * Required env (via `.env` / `cypress.config.ts`):
 * - E2E_SITE_NAME (default: ai-tests)
 * - E2E_AI_SITE_ADMIN_EMAIL or E2E_TEST_EMAIL
 * - E2E_AI_SITE_ADMIN_PASSWORD or E2E_TEST_PASSWORD
 */

import 'cypress-real-events';

import { addAndLinkUsers, pickToday, selectSite, signInWithPassword, typeInto } from '../_helpers';

const email: string =
  (Cypress.env('E2E_AI_SITE_ADMIN_EMAIL') as string) ||
  (Cypress.env('E2E_TEST_EMAIL') as string) ||
  'student@levante.test';
const password: string =
  (Cypress.env('E2E_AI_SITE_ADMIN_PASSWORD') as string) ||
  (Cypress.env('E2E_TEST_PASSWORD') as string) ||
  'student123';
const siteName: string = (Cypress.env('E2E_SITE_NAME') as string) || 'ai-tests';

function writeDebugArtifacts(tag: string) {
  return cy
    .get('body', { log: false })
    .then(($body) => {
      return cy
        .writeFile(`cypress/tmp/${tag}-body.html`, $body.html() ?? '')
        .then(() => cy.writeFile(`cypress/tmp/${tag}-body-text.txt`, $body.text()));
    })
    .then(() => {
      return cy.window({ log: false }).then((win) => {
        const w = win as Window & { __LEVANTE_APP__?: unknown; __VITE_BASE_URL__?: unknown };
        const app = w.__LEVANTE_APP__ as any;
        const internal = app?.$;
        const globalProps = internal?.appContext?.config?.globalProperties;
        const router = globalProps?.$router;
        const currentRoute = router?.currentRoute?.value;
        const snapshot = {
          location: { href: win.location.href, pathname: win.location.pathname },
          viteBaseUrl: w.__VITE_BASE_URL__ ?? null,
          hasApp: Boolean(w.__LEVANTE_APP__),
          routerPath: currentRoute?.path ?? null,
          routerName: currentRoute?.name ?? null,
        };
        return cy.writeFile(`cypress/tmp/${tag}-app.json`, JSON.stringify(snapshot, null, 2));
      });
    });
}

function waitForAppToBeInteractive() {
  // We consider the app "interactive" when either:
  // - the signin form is present, or
  // - the nav bar is present (already signed in)
  const timeoutMs = 120_000;
  const startedAt = Date.now();

  function attempt(): Cypress.Chainable<void> {
    return cy.get('body', { timeout: 60000 }).then(($body) => {
      const hasSignIn = $body.find('[data-cy="input-username-email"]').length > 0;
      const hasNav = $body.find('[data-testid="nav-bar"]').length > 0;
      if (hasSignIn || hasNav) return;

      if (Date.now() - startedAt > timeoutMs) {
        return writeDebugArtifacts('app-not-interactive').then(() => {
          throw new Error(
            'App never became interactive (no signin form or nav bar). See cypress/tmp/app-not-interactive-* for diagnostics.',
          );
        });
      }

      cy.wait(1000, { log: false });
      return attempt();
    });
  }

  return attempt();
}

describe('researcher docs flow (robust): groups → users → assignment → progress', () => {
  it('completes the documented workflow end-to-end', () => {
    const runId = `${Date.now()}`;
    const cohortName = `e2e-cohort-${runId}`;
    const assignmentName = `e2e-assignment-${runId}`;

    const childId = `e2e_child_${runId}`;
    const caregiverId = `e2e_caregiver_${runId}`;
    const teacherId = `e2e_teacher_${runId}`;

    cy.visit('/signin');
    waitForAppToBeInteractive();

    // Sign in (password) and select the target site
    signInWithPassword({ email, password });
    selectSite(siteName);

    // Step 1: Create cohort group
    cy.visit('/list-groups');
    cy.get('[data-testid="groups-page-ready"]', { timeout: 90000 }).should('exist');
    cy.contains('button', /^Add Group$/, { timeout: 60000 }).should('be.visible').click();
    cy.get('[data-testid="modalTitle"]').should('contain.text', 'Add New');
    cy.get('[data-cy="dropdown-org-type"]').click();
    cy.contains('[role="option"]', /^Cohort$/).click();
    typeInto('[data-cy="input-org-name"]', cohortName);
    cy.get('[data-testid="submitBtn"]').should('not.be.disabled').click();

    // Accept either "Success" toast wording, and ensure modal closed.
    cy.get('.p-toast-message', { timeout: 60000 }).should('be.visible');
    cy.get('[data-testid="modalTitle"]', { timeout: 60000 }).should('not.exist');

    // Step 2: Add + link users (helper handles CSV upload flow)
    addAndLinkUsers({
      childId,
      caregiverId,
      teacherId,
      cohortName,
      month: 5,
      year: 2017,
    });

    // Step 3: Create assignment
    cy.visit('/create-assignment');
    typeInto('[data-cy="input-administration-name"]', assignmentName);
    pickToday('[data-cy="input-start-date"]');
    pickToday('[data-cy="input-end-date"]');

    cy.contains('[role="tab"]', /^Cohorts$/).click({ force: true });
    cy.get('[data-cy="group-picker-listbox"]')
      .filter(':visible')
      .first()
      .within(() => {
        cy.contains('[role="option"]', cohortName).click();
      });
    cy.get('.selected-groups-scroll-panel', { timeout: 10000 }).contains(cohortName).should('exist');

    cy.get('[data-cy="input-variant-name"]', { timeout: 120000 }).should('be.visible');
    cy.get('[data-cy="selected-variant"]', { timeout: 120000 }).should('exist').first().click();
    cy.get('[data-cy="panel-droppable-zone"]', { timeout: 120000 }).contains('Variant name:').should('exist');

    // Required validation field (sequential tasks)
    cy.get('input[id="No"]').should('exist').check({ force: true });

    cy.intercept('POST', /upsertAdministration/i).as('upsertAdministration');
    cy.get('[data-cy="button-create-administration"]').should('be.visible').should('not.be.disabled').click();
    cy.wait('@upsertAdministration', { timeout: 120000 }).then((interception) => {
      const status = interception.response?.statusCode;
      if (status && status >= 400) throw new Error(`upsertAdministration failed: HTTP ${status}`);
    });
    cy.contains('Your new assignment is being processed', { timeout: 60000 }).should('exist');

    // Step 4: Monitor completion (best-effort check for progress report UI)
    cy.visit('/');
    cy.contains('All Assignments', { timeout: 120000 }).should('be.visible');
    cy.get('body').then(($body) => {
      if ($body.find('.card-administration').length === 0) return;
      cy.get('.card-administration')
        .first()
        .within(() => cy.get('button[data-cy="button-progress"]').first().click({ force: true }));
      cy.location('pathname', { timeout: 60000 }).should('match', /^\/administration\//);
    });
  });
});


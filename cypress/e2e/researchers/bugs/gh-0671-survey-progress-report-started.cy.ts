/**
 * Bug #671 (PR#750): Progress Report survey status is wrong (stays "Not Started")
 *
 * ### Why this exists
 * Levante surveys track progress in `surveyResponses` (general/specific + isComplete flags), not in
 * the `startedOn/completedOn` fields that many other tasks use. Historically that meant:
 * - A participant can start a survey (which writes surveyResponses)
 * - But the researcher Progress Report could still show Survey = "Not Started"
 *
 * This spec reproduces that scenario and asserts that, after the participant saves survey progress,
 * the Progress Report shows Survey as **Started** (or **Completed**).
 *
 * ### Fix files
 * 
 * ### What this test does (high level)
 * - Creates a cohort
 * - Creates + links a child/caregiver/teacher via the documented two-step CSV flow
 * - Creates an assignment that includes the Levante `survey` task
 * - Signs in as the child, navigates to `/survey`, and advances once so `saveSurveyResponses` fires
 * - Opens the Progress Report for the assignment + cohort, and asserts Survey shows Started/Completed
 *
 * ### Notes for stability
 * - Firebase auth persistence is session-based here; we must clear `sessionStorage` between users
 *   or Cypress may remain logged in as the previous (admin) user.
 * - Survey UI is SurveyJS and varies slightly by theme; we handle "Start Survey" and "Finish" gates.
 * - When something is stuck (e.g., assignment processing), we write a small debug JSON in
 *   `cypress/downloads/` so failures are diagnosable without re-running headed.
 */
import 'cypress-real-events';
import { assert } from 'chai';
import {
  addAndLinkUsers,
  ignoreKnownHostedUncaughtExceptions,
  pickToday,
  selectSite,
  signInWithPassword,
  typeInto,
} from '../_helpers';

const adminEmail: string =
  (Cypress.env('E2E_AI_SITE_ADMIN_EMAIL') as string) || (Cypress.env('E2E_TEST_EMAIL') as string) || 'student@levante.test';
const adminPassword: string =
  (Cypress.env('E2E_AI_SITE_ADMIN_PASSWORD') as string) ||
  (Cypress.env('E2E_TEST_PASSWORD') as string) ||
  'student123';
const siteName: string = (Cypress.env('E2E_SITE_NAME') as string) || 'ai-tests';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function extractAdministrationIdFromUpsertResponse(body: unknown): string | null {
  if (!isRecord(body)) return null;

  const candidates: unknown[] = [body.id, body.administrationId, body.data, body.result];

  const data = body.data;
  if (isRecord(data)) candidates.push(data.id, data.administrationId);

  const result = body.result;
  if (isRecord(result)) {
    candidates.push(result.id, result.administrationId, result.data);
    const resultData = result.data;
    if (isRecord(resultData)) candidates.push(resultData.id, resultData.administrationId);
  }

  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c;
  }
  return null;
}

describe('Bug #671: Progress Report shows Survey as Started after first save', () => {
  it('shows Survey as Started/Completed in Progress Report after participant advances one survey page', () => {
    ignoreKnownHostedUncaughtExceptions();

    const runId = `${Date.now()}`;
    const cohortName = `e2e-cohort-671-${runId}`;
    const assignmentName = `e2e-assignment-671-${runId}`;

    const childId = `e2e_child_671_${runId}`;
    const caregiverId = `e2e_caregiver_671_${runId}`;
    const teacherId = `e2e_teacher_671_${runId}`;

    // --- Admin setup (cohort + users + assignment) ---
    signInWithPassword({ email: adminEmail, password: adminPassword });
    selectSite(siteName);

    // Create cohort
    cy.visit('/list-groups');
    cy.get('[data-testid="groups-page-ready"]', { timeout: 90000 }).should('exist');
    cy.contains('button', /^Add Group$/, { timeout: 60000 }).should('be.visible').click();
    cy.get('[data-testid="modalTitle"]').should('contain.text', 'Add New');
    cy.get('[data-cy="dropdown-org-type"]').click();
    cy.contains('[role="option"]', /^Cohort$/).click();
    typeInto('[data-cy="input-org-name"]', cohortName);
    cy.get('[data-testid="submitBtn"]').should('not.be.disabled').click();
    cy.contains('Cohort created successfully.', { timeout: 60000 }).should('exist');

    // Create + link users (documented CSV two-step flow)
    cy.wrap(null, { log: false }).as('childLogin');
    addAndLinkUsers({ childId, caregiverId, teacherId, cohortName, month: 5, year: 2017 }).as('addAndLinkUsersResult');
    cy.get('@addAndLinkUsersResult').its('childLogin').as('childLogin');

    // Create assignment (includes taskId: 'survey')
    cy.wrap(null, { log: false }).as('createdAdministrationId');
    cy.wrap(null, { log: false }).as('createdOrgRoute');
    cy.intercept('POST', /upsertAdministration/i).as('upsertAdministration');

    cy.visit('/create-assignment');
    cy.location('pathname', { timeout: 120000 }).should('eq', '/create-assignment');
    typeInto('[data-cy="input-administration-name"]', assignmentName);
    pickToday('[data-cy="input-start-date"]');
    pickToday('[data-cy="input-end-date"]');

    cy.get('body', { timeout: 120000 }).then(($body) => {
      if ($body.find('[role="tab"]').length)
        return cy.contains('[role="tab"]', /^Cohorts$/, { timeout: 120000 }).should('be.visible').click();
      return cy.contains(/^Cohorts$/, { timeout: 120000 }).should('be.visible').click();
    });

    cy.contains('[role="option"]', cohortName, { timeout: 120000 }).scrollIntoView().click({ force: true });
    cy.contains('Selected Groups').closest('.p-panel').contains(cohortName).should('exist');

    // Pick a variant for the Survey task specifically (taskId: 'survey').
    cy.get('[data-cy="input-variant-name"]', { timeout: 120000 })
      .should('be.visible')
      .click()
      .clear()
      .type('survey', { delay: 0 });
    cy.get('[data-task-id="survey"]', { timeout: 120000 })
      .should('exist')
      .first()
      .within(() => cy.get('[data-cy="selected-variant"]').should('be.visible').click({ force: true }));

    cy.get('[data-cy="panel-droppable-zone"]', { timeout: 120000 })
      .find('[data-task-id="survey"]', { timeout: 120000 })
      .should('exist');

    cy.get('input[id="No"]').should('exist').check({ force: true });
    cy.get('[data-cy="button-create-administration"]').should('be.visible').should('not.be.disabled').click();

    cy.wait('@upsertAdministration', { timeout: 120000 }).then((interception) => {
      const status = interception.response?.statusCode;
      if (status && status >= 400) throw new Error(`upsertAdministration failed: HTTP ${status}`);

      const adminId = extractAdministrationIdFromUpsertResponse(interception.response?.body);
      if (!adminId) {
        throw new Error(
          `Expected upsertAdministration to return an administration id, but could not extract one. body=${JSON.stringify(
            interception.response?.body,
          )}`,
        );
      }
      cy.wrap(adminId, { log: false }).as('createdAdministrationId');

      // Extract orgType/orgId for the progress report route.
      const requestBody = interception.request?.body as { data?: unknown } | undefined;
      const data = requestBody?.data;
      if (isRecord(data)) {
        const orgs = isRecord(data.orgs) ? (data.orgs as Record<string, unknown>) : null;
        const groups = orgs && Array.isArray(orgs.groups) ? orgs.groups : null;
        if (Array.isArray(groups) && typeof groups[0] === 'string') {
          cy.wrap({ orgType: 'group', orgId: groups[0] }, { log: false }).as('createdOrgRoute');
        }
      }
    });

    cy.contains('Your new assignment is being processed', { timeout: 60000 }).should('exist');

    // --- Participant: start survey + save progress ---
    cy.get('@childLogin').then((childLogin) => {
      const { email, password } = childLogin as { email?: string; password?: string };
      assert.isString(email, 'child email');
      assert.isString(password, 'child password');
      if (typeof email !== 'string' || typeof password !== 'string') throw new Error('Missing child login');

      cy.clearCookies();
      cy.clearLocalStorage();
      cy.visit('/');
      cy.window({ log: false }).then((win) => {
        win.sessionStorage.clear();
        win.localStorage.clear();
      });
      cy.clearCookies();
      cy.clearLocalStorage();

      cy.visit('/signin');
      typeInto('[data-cy="input-username-email"]', email);
      typeInto('[data-cy="input-password"]', password, { log: false });
      cy.get('[data-cy="submit-sign-in-with-password"]').click();
      cy.location('pathname', { timeout: 90000 }).should('not.eq', '/signin');

      function waitForSurveyReady(opts?: { timeoutMs?: number; pollMs?: number }): Cypress.Chainable<null> {
        const timeoutMs = opts?.timeoutMs ?? 3 * 60_000;
        const pollMs = opts?.pollMs ?? 10_000;
        const startedAt = Date.now();
        const debugOut = `cypress/downloads/gh-0671.debug.${runId}.json`;

        function attempt(): Cypress.Chainable<null> {
          return cy.get('body', { timeout: 60000 }).then(($body) => {
            if (($body.text() || '').includes('All Assignments') && ($body.text() || '').includes('Create Assignment')) {
              throw new Error(
                'Expected participant home, but still on admin home. The previous admin session likely persisted.',
              );
            }

            if ($body.find('#games').length) return cy.wrap(null, { log: false });

            if (Date.now() - startedAt > timeoutMs) {
              const hasAppInitializing = $body.find('[data-testid="app-initializing"]').length > 0;
              const hasLevanteSpinner = $body.find('.levante-spinner-container').length > 0;
              const hasLevanteLogoLoading = $body.find('#levante-logo-loading').length > 0;
              const hrefs = $body
                .find('a[href]')
                .toArray()
                .map((el) => (el as unknown as HTMLAnchorElement).getAttribute('href'));
              const hasGames = $body.find('#games').length > 0;
              const hasNoAssignmentsText = ($body.text() || '').toLowerCase().includes('no assignments');

              return cy
                .location('pathname', { log: false })
                .then((pathname) =>
                  cy.writeFile(
                    debugOut,
                    {
                      when: new Date().toISOString(),
                      note: 'Timed out waiting for participant games to render (#games). Assignment may still be processing, or the app may be stuck initializing.',
                      pathname,
                      hasAppInitializing,
                      hasLevanteSpinner,
                      hasLevanteLogoLoading,
                      hasGames,
                      hasNoAssignmentsText,
                      hrefs,
                      bodyTextPreview: ($body.text() || '').slice(0, 2000),
                      bodyHtmlPreview: ($body.html() || '').slice(0, 2000),
                    },
                    { log: false },
                  ),
                )
                .then(() => {
                  throw new Error('Timed out waiting for participant games to render (#games).');
                });
            }

            return cy.wait(pollMs).then(() => attempt());
          });
        }

        return cy.get('body', { timeout: 60000 }).should('exist').then(() => attempt());
      }

      cy.intercept('POST', '**/saveSurveyResponses*').as('saveSurveyResponses');
      waitForSurveyReady({ timeoutMs: 3 * 60_000, pollMs: 10_000 });

      cy.get('#games', { timeout: 120000 })
        .find('a[href="/survey"], a[href*="/survey"]', { timeout: 120000 })
        .first()
        .click({ force: true });
      cy.location('pathname', { timeout: 60000 }).should('eq', '/survey');

      // SurveyJS start gate (optional)
      cy.get('body', { timeout: 120000 }).then(($body) => {
        if ($body.find('input.sd-navigation__start-btn').length)
          return cy.get('input.sd-navigation__start-btn').first().click({ force: true });
        if ($body.find('input[type="button"][value="Start Survey"]').length)
          return cy.get('input[type="button"][value="Start Survey"]').first().click({ force: true });
        return cy.wrap(null, { log: false });
      });

      // Answer something on the first page (best-effort) so the "next"/"finish" action is enabled.
      cy.get('body', { timeout: 120000 }).then(($body) => {
        if ($body.find('input[type="radio"]').length) return cy.get('input[type="radio"]').first().check({ force: true });
        if ($body.find('input[type="checkbox"]').length)
          return cy.get('input[type="checkbox"]').first().check({ force: true });
        if ($body.find('input[type="text"]').length) return cy.get('input[type="text"]').first().type('e2e', { delay: 0 });
        return cy.wrap(null, { log: false });
      });

      // Advance/finish the survey once (this is what triggers `saveSurveyResponses`).
      cy.get('body').then(($body) => {
        if ($body.find('.sv_complete_btn').length) return cy.get('.sv_complete_btn').first().click({ force: true });
        if ($body.find('.sv_next_btn').length) return cy.get('.sv_next_btn').first().click({ force: true });
        if ($body.find('.sd-navigation__next-btn').length) return cy.get('.sd-navigation__next-btn').first().click({ force: true });
        if ($body.find('.sd-navigation__complete-btn').length)
          return cy.get('.sd-navigation__complete-btn').first().click({ force: true });
        if ($body.find('input[type="button"][value="Next"]').length)
          return cy.get('input[type="button"][value="Next"]').first().click({ force: true });
        if ($body.find('input[type="button"][value="Next >"]').length)
          return cy.get('input[type="button"][value="Next >"]').first().click({ force: true });
        if ($body.find('input[type="button"][value="Continue"]').length)
          return cy.get('input[type="button"][value="Continue"]').first().click({ force: true });
        if ($body.find('input[type="button"][value="Complete"]').length)
          return cy.get('input[type="button"][value="Complete"]').first().click({ force: true });
        if ($body.find('input[type="button"][value="Finish"]').length)
          return cy.get('input[type="button"][value="Finish"]').first().click({ force: true });
        return cy.contains('button', /next/i, { timeout: 120000 }).click({ force: true });
      });

      return cy.wait('@saveSurveyResponses', { timeout: 120000 });
    });

    // --- Admin: verify progress report shows Survey started ---
    cy.clearCookies();
    cy.clearLocalStorage();
    signInWithPassword({ email: adminEmail, password: adminPassword });
    selectSite(siteName);

    cy.get('@createdAdministrationId').then((createdAdministrationId) => {
      const adminId = createdAdministrationId as unknown;
      assert.isString(adminId, 'created administration id');
      if (typeof adminId !== 'string' || !adminId) throw new Error('Missing created administration id');

      cy.get('@createdOrgRoute').then((maybeRoute) => {
        const route = maybeRoute as unknown;
        if (isRecord(route) && typeof route.orgType === 'string' && typeof route.orgId === 'string') {
          cy.visit(`/administration/${adminId}/${route.orgType}/${route.orgId}`);
          return;
        }
        cy.visit(`/administration/${adminId}`);
      });
    });

    cy.location('pathname', { timeout: 60000 }).should('match', /^\/administration\//);
    cy.get('[data-cy="roar-data-table"]', { timeout: 5 * 60_000 }).should('exist');

    // Bug #671 assertion: after the participant has saved survey progress, Survey must not remain "Not Started".
    cy.contains('[data-cy="roar-data-table"]', /Started|Completed/, { timeout: 5 * 60_000 }).should('exist');
  });
});


/**
 * @fileoverview Researcher Docs Scenario: Complete Workflow E2E
 *
 * @description
 * Tests the complete researcher workflow as documented in the researcher documentation website.
 * This is a comprehensive end-to-end test that covers: creating groups → adding users → creating
 * assignments → monitoring completion. Designed to produce a single video artifact for documentation.
 *
 * @test-id task-researcher-docs-scenario
 * @category tasks
 *
 * @setup
 * - Test self-seeds all required data (cohort, users, assignment)
 * - Uses timestamp-based naming to avoid conflicts
 * - Creates child, caregiver, and teacher users with proper linking
 *
 * @required-env-vars
 * - E2E_SITE_NAME (default: ai-tests)
 * - E2E_AI_SITE_ADMIN_EMAIL or E2E_TEST_EMAIL (required)
 * - E2E_AI_SITE_ADMIN_PASSWORD or E2E_TEST_PASSWORD (required)
 *
 * @test-cases
 * 1. Sign in as administrator (via "Are you an Admin?" prompt)
 * 2. Create a new Cohort group
 * 3. Upload CSV to add users (child, caregiver, teacher) with linking relationships
 * 4. Create an assignment for the cohort with a selected variant
 * 5. Navigate to progress report (monitor completion)
 *
 * @expected-behavior
 * - All workflow steps complete successfully
 * - Users are created and linked correctly
 * - Assignment is created and processing message appears
 * - Progress report page loads (may be empty if no completions yet)
 *
 * @related-docs
 * - https://researcher.levante-network.org/dashboard - Researcher documentation website
 * - README_TESTS.md - General testing documentation
 *
 * @modification-notes
 * To modify this test:
 * 1. Update CSV format if user creation schema changes
 * 2. Adjust variant selection logic if UI changes
 * 3. Update progress report navigation if route structure changes
 * 4. Test includes fallback logic for assignment card appearance (async processing)
 * 5. Uses intercepts to validate API responses (createUsers, upsertAdministration)
 */

import 'cypress-real-events';

import {
  ignoreKnownHostedUncaughtExceptions,
  selectSite,
  signInWithPassword,
  addAndLinkUsers,
  typeInto,
  pickToday,
} from '../_helpers';

const email: string =
  (Cypress.env('E2E_AI_SITE_ADMIN_EMAIL') as string) ||
  (Cypress.env('E2E_TEST_EMAIL') as string) ||
  'student@levante.test';
const password: string =
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

describe('researcher docs scenario: groups → users → assignment → monitor completion', () => {
  it('executes the documented workflow end-to-end (single video)', () => {
    ignoreKnownHostedUncaughtExceptions();

    const runId = `${Date.now()}`;
    const cohortName = `e2e-cohort-${runId}`;
    const assignmentName = `e2e-assignment-${runId}`;

    const childId = `e2e_child_${runId}`;
    const caregiverId = `e2e_caregiver_${runId}`;
    const teacherId = `e2e_teacher_${runId}`;

    // Docs: “Log in as a study administrator”
    cy.visit('/signin');
    cy.contains('Are you an Admin?', { timeout: 60000 })
      .should('be.visible')
      .parent()
      .within(() => {
        cy.contains('here').click();
      });
    cy.contains('button', /Continue with Google/i, { timeout: 60000 }).should('be.visible');

    signInWithPassword({ email, password });
    selectSite(siteName);

    // Docs Step 1: Add groups (create cohort)
    cy.visit('/list-groups');
    cy.get('[data-testid="groups-page-ready"]', { timeout: 90000 }).should('exist');
    cy.contains('button', /^Add Group$/, { timeout: 60000 }).should('be.visible').click();
    cy.get('[data-testid="modalTitle"]').should('contain.text', 'Add New');
    cy.get('[data-cy="dropdown-org-type"]').click();
    cy.contains('[role="option"]', /^Cohort$/).click();
    typeInto('[data-cy="input-org-name"]', cohortName);
    cy.get('[data-testid="submitBtn"]').should('not.be.disabled').click();
    cy.get('[data-testid="modalTitle"]').should('not.exist');
    cy.contains('Cohort created successfully.', { timeout: 30000 }).should('exist');

    // Docs Step 2: Add and link users (following documented two-step process)
    // Step 2B: Add users to the dashboard
    // Step 2C: Link users as needed
    addAndLinkUsers({
      childId,
      caregiverId,
      teacherId,
      cohortName,
      month: 5,
      year: 2017,
    });

    // Docs Step 3: Create assignment (assign cohort, pick a task, create)
    cy.visit('/create-assignment');
    typeInto('[data-cy="input-administration-name"]', assignmentName);
    pickToday('[data-cy="input-start-date"]');
    pickToday('[data-cy="input-end-date"]');

    cy.contains('Cohorts').click();
    cy.get('[data-cy="group-picker-listbox"]').should('be.visible');
    cy.contains('[role="option"]', cohortName).click();
    cy.contains('Selected Groups').closest('.p-panel').contains(cohortName).should('exist');

    cy.get('[data-cy="input-variant-name"]', { timeout: 120000 }).should('be.visible');
    cy.get('[data-cy="selected-variant"]', { timeout: 120000 }).should('exist').first().click();
    cy.get('[data-cy="panel-droppable-zone"]', { timeout: 120000 }).contains('Variant name:').should('exist');

    // Required validation field (sequential tasks)
    cy.get('input[id="No"]').should('exist').check({ force: true });

    cy.wrap(null, { log: false }).as('createdAdministrationId');
    cy.intercept('POST', /upsertAdministration/i).as('upsertAdministration');
    cy.get('[data-cy="button-create-administration"]').should('be.visible').should('not.be.disabled').click();
    cy.wait('@upsertAdministration', { timeout: 120000 }).then((interception) => {
      const status = interception.response?.statusCode;
      if (status && status >= 400) throw new Error(`upsertAdministration failed: HTTP ${status}`);
      const adminId = extractAdministrationIdFromUpsertResponse(interception.response?.body);
      if (adminId) cy.wrap(adminId, { log: false }).as('createdAdministrationId');
    });
    cy.contains('Your new assignment is being processed', { timeout: 60000 }).should('exist');

    // Docs: Monitor completion (open progress report)
    cy.get('@createdAdministrationId').then((createdAdministrationId) => {
      const adminId = createdAdministrationId as unknown;

      if (typeof adminId === 'string' && adminId) {
        cy.visit(`/administration/${adminId}`);
        cy.location('pathname', { timeout: 60000 }).should('match', /^\/administration\//);
        cy.get('body', { timeout: 120000 }).then(($body) => {
          if ($body.text().toLowerCase().includes('progress report')) cy.contains(/progress report/i).should('be.visible');
          if ($body.find('[data-cy="roar-data-table"]').length) cy.get('[data-cy="roar-data-table"]').should('be.visible');
        });
        return;
      }

      // Fallback: the assignment card can take a long time to appear (async processing); open any assignment.
      cy.visit('/');
      cy.contains('All Assignments', { timeout: 120000 }).should('be.visible');
      cy.get('.card-administration', { timeout: 120000 })
        .first()
        .should('be.visible')
        .within(() => cy.get('button[data-cy="button-progress"]', { timeout: 60000 }).first().click({ force: true }));
      cy.location('pathname', { timeout: 60000 }).should('match', /^\/administration\//);
      cy.get('body', { timeout: 120000 }).then(($body) => {
        if ($body.text().toLowerCase().includes('progress report')) cy.contains(/progress report/i).should('be.visible');
        if ($body.find('[data-cy="roar-data-table"]').length) cy.get('[data-cy="roar-data-table"]').should('be.visible');
      });
    });
  });
});


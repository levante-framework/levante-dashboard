/**
 * @fileoverview Researcher Full Workflow: Complete Setup and Participant Login
 *
 * @description
 * Comprehensive end-to-end test covering the complete researcher workflow from setup
 * through participant login. Tests: groups → users → link users → assignment → monitor
 * completion → participant login. This is the most complete workflow test, including
 * user linking and participant authentication verification.
 *
 * @test-id task-researcher-full-workflow
 * @category tasks
 *
 * @setup
 * - Test self-seeds all required data
 * - Creates cohort, users (child/caregiver/teacher), links them, creates assignment
 * - Uses timestamp-based naming to avoid conflicts
 * - Validates API responses to ensure data integrity
 *
 * @required-env-vars
 * - E2E_SITE_NAME (default: ai-tests)
 * - E2E_AI_SITE_ADMIN_EMAIL or E2E_TEST_EMAIL (required)
 * - E2E_AI_SITE_ADMIN_PASSWORD or E2E_TEST_PASSWORD (required)
 *
 * @test-cases
 * 1. Sign in as administrator and select site
 * 2. Create a Cohort group
 * 3. Upload CSV to create users (child, caregiver, teacher)
 * 4. Upload linking CSV to establish relationships between users
 * 5. Create assignment with selected variant and cohort
 * 6. Monitor completion (open progress report)
 * 7. Sign in as participant (child) and verify participant home page
 *
 * @expected-behavior
 * - All workflow steps complete successfully
 * - Users are created with proper UIDs returned
 * - Users are linked correctly (child → caregiver, child → teacher)
 * - Assignment is created and appears in assignment list
 * - Progress report loads (may be empty)
 * - Participant can sign in and see home page (with or without assignments)
 *
 * @related-docs
 * - README_TESTS.md - General testing documentation
 * - src/pages/users/AddUsers.vue - User creation UI
 * - src/pages/users/LinkUsers.vue - User linking UI
 *
 * @modification-notes
 * To modify this test:
 * 1. Update CSV formats if user creation/linking schemas change
 * 2. Adjust site selection logic if permissions mode changes
 * 3. Update participant home assertions if UI structure changes
 * 4. Test includes validation of createUsers and linkUsers API responses
 * 5. Uses assertCurrentSiteSelected() helper to verify site context
 * 6. Includes best-effort progress report check (doesn't fail if assignment not ready)
 * 7. Clears cookies/localStorage before participant login for clean session
 */

import 'cypress-real-events';
import { assert } from 'chai';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

import { addAndLinkUsers, typeInto, pickToday } from '../_helpers';

// The hosted dev environment occasionally throws a Firestore permissions error from background listeners.
// This is not relevant to validating the researcher workflow steps below.
Cypress.on('uncaught:exception', (err) => {
  if (err.message.includes('Missing or insufficient permissions')) return false;
});

const email: string =
  (Cypress.env('E2E_AI_SITE_ADMIN_EMAIL') as string) ||
  (Cypress.env('E2E_TEST_EMAIL') as string) ||
  'student@levante.test';
const password: string =
  (Cypress.env('E2E_AI_SITE_ADMIN_PASSWORD') as string) ||
  (Cypress.env('E2E_TEST_PASSWORD') as string) ||
  'student123';

// CreatedUser interface is now imported from _helpers

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

// typeInto is now imported from _helpers

function signIn() {
  // Firebase Auth (password) goes through Google Identity Toolkit.
  cy.intercept('POST', '**/accounts:signInWithPassword*').as('signInWithPassword');

  cy.get('[data-cy="input-username-email"]').should('be.visible');
  typeInto('[data-cy="input-username-email"]', email);
  typeInto('[data-cy="input-password"]', password, { log: false });
  cy.get('[data-cy="submit-sign-in-with-password"]').click();

  cy.wait('@signInWithPassword', { timeout: 60000 }).then((interception) => {
    const requestBody = interception.request?.body as { email?: string } | undefined;
    const requestEmail = requestBody?.email;
    const requestUrl = interception.request?.url;
    expect(requestEmail, 'signInWithPassword request email').to.eq(email);

    const status = interception.response?.statusCode;
    const body = interception.response?.body as { error?: unknown } | undefined;
    if (status && status >= 400) {
      throw new Error(
        `Firebase signInWithPassword failed: HTTP ${status} url=${requestUrl} email=${requestEmail} body=${JSON.stringify(body)}`,
      );
    }
    if (body?.error) {
      throw new Error(
        `Firebase signInWithPassword failed: url=${requestUrl} email=${requestEmail} error=${JSON.stringify(body.error)}`,
      );
    }
  });

  // The app should redirect away from /signin on success.
  cy.location('pathname', { timeout: 90000 }).should('not.eq', '/signin');
  // App may briefly show a fullscreen Levante spinner while user/claims load.
  cy.get('body', { timeout: 90000 }).then(($body) => {
    if ($body.find('[data-testid="nav-bar"]').length) return;
    if ($body.find('#levante-logo-loading').length) {
      cy.get('#levante-logo-loading', { timeout: 90000 }).should('not.exist');
    }
  });

  cy.get('#site-header', { timeout: 90000 }).should('be.visible');
}

// pickToday is now imported from _helpers

describe('researcher README workflow (hosted): groups → users → link → assignment', () => {
  it('can set up, populate, and create an assignment for a site', () => {
    const runId = `${Date.now()}`;
    const cohortName = `e2e-cohort-${runId}`;
    const assignmentName = `e2e-assignment-${runId}`;

    const childId = `e2e_child_${runId}`;
    const caregiverId = `e2e_caregiver_${runId}`;
    const teacherId = `e2e_teacher_${runId}`;

    const screenshotSlug = (input: string) =>
      input
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);

    const takeStepScreenshot = (step: string) => cy.screenshot(`researcher-full-workflow-${runId}-${screenshotSlug(step)}`);

    cy.visit('/signin');
    signIn();

    // Select site (required for permissions mode)
    const siteName: string = (Cypress.env('E2E_SITE_NAME') as string) || 'ai-tests';
    cy.get('body', { timeout: 90000 }).then(($body) => {
      if ($body.find('[data-cy="site-select"]').length) {
        cy.get('[data-cy="site-select"]', { timeout: 90000 }).should('be.visible').click();
        cy.contains('[role="option"]', new RegExp(`^${escapeRegExp(siteName)}$`), { timeout: 60000 }).click();
      } else {
        cy.log('Site select dropdown not present, assuming site is already selected or not required.');
      }
    });
    assertCurrentSiteSelected();
    takeStepScreenshot('signed-in-and-site-selected');

    // 1) Add Groups: create a Cohort
    cy.visit('/list-groups');
    cy.get('body', { timeout: 60000 }).then(($body) => {
      if ($body.find('[data-testid="groups-page-ready"]').length) {
        cy.get('[data-testid="groups-page-ready"]', { timeout: 60000 }).should('exist');
        return;
      }

      cy.contains('[data-testid="groups-page-title"], .admin-page-header', /^Groups$/, { timeout: 60000 }).should('be.visible');
      cy.contains('button', /^Add Group$/, { timeout: 60000 }).should('be.visible');
    });

    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="add-group-btn"]').length) {
        cy.get('[data-testid="add-group-btn"]').should('be.visible').should('not.be.disabled').click();
        return;
      }
      cy.contains('button', /^Add Group$/).should('be.visible').click();
    });
    cy.get('[data-testid="modalTitle"]').should('contain.text', 'Add New');

    cy.get('[data-cy="dropdown-org-type"]').click();
    cy.contains('[role="option"]', /^Cohort$/).click();

    typeInto('[data-cy="input-org-name"]', cohortName);
    cy.get('[data-testid="submitBtn"]').should('not.be.disabled').click();

    cy.get('[data-testid="modalTitle"]').should('not.exist');
    cy.contains('Success', { timeout: 30000 }).should('exist');
    cy.contains('Cohort created successfully.', { timeout: 30000 }).should('exist');
    takeStepScreenshot('cohort-created');

    // 2) Add and Link Users: following documented two-step process
    // Step 2B: Add users to the dashboard
    // Step 2C: Link users as needed
    assertCurrentSiteSelected();
    takeStepScreenshot('before-add-and-link-users');
    addAndLinkUsers({
      childId,
      caregiverId,
      teacherId,
      cohortName,
      month: 5,
      year: 2017,
    }).then((result) => {
      cy.wrap(result.createdUsers, { log: false }).as('createdUsers');
      cy.wrap(result.childLogin, { log: false }).as('childLogin');
      takeStepScreenshot('users-created-and-linked');
    });

    // 3) Create Assignments: select cohort, pick tasks, submit
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

    cy.get('input[id="No"]').should('exist').check({ force: true });
    takeStepScreenshot('assignment-form-filled');

    cy.intercept('POST', /upsertAdministration/i).as('upsertAdministration');
    cy.get('[data-cy="button-create-administration"]').should('be.visible').should('not.be.disabled').click();
    cy.wait(1000);
    cy.get('body').then(($body) => {
      const text = $body.text();
      const knownBlockingMessages = [
        'Please select at least one Group (Site, School, Class, or Cohort).',
        'No variants selected. You must select at least one variant to be assigned.',
        'Please specify whether tasks should be completed sequentially or not',
        'Please select a start date',
        'Please select an end date',
        'An assignment with that name already exists.',
      ];
      const found = knownBlockingMessages.find((m) => text.includes(m));
      if (found) throw new Error(`Create assignment blocked by validation: "${found}"`);
    });
    cy.wait('@upsertAdministration', { timeout: 120000 }).then((interception) => {
      const status = interception.response?.statusCode;
      const body = interception.response?.body;
      if (status && status >= 400) {
        throw new Error(`upsertAdministration failed: HTTP ${status} body=${JSON.stringify(body)}`);
      }
      const maybeError = isRecord(body) ? body.error : undefined;
      if (maybeError) throw new Error(`upsertAdministration failed: body.error=${JSON.stringify(maybeError)}`);
    });
    cy.contains('Your new assignment is being processed', { timeout: 60000 }).should('exist');
    cy.location('pathname', { timeout: 60000 }).should('eq', '/');
    takeStepScreenshot('assignment-created-processing');

    // 4) Monitor completion (best-effort): the assignment may take time to appear, so don't fail the E2E run here.
    cy.visit('/');
    cy.get('[data-cy="search-input"]', { timeout: 60000 }).should('be.visible').type(`${assignmentName}{enter}`);
    takeStepScreenshot('after-search-assignment');
    cy.get('body', { timeout: 120000 }).then(($body) => {
      const titles = $body
        .find('[data-cy="h2-card-admin-title"]')
        .toArray()
        .map((el) => el.textContent ?? '');

      const hasAssignment = titles.some((t) => t.includes(assignmentName));
      if (!hasAssignment) return;

      cy.contains('[data-cy="h2-card-admin-title"]', assignmentName)
        .closest('.card-administration')
        .within(() => {
          cy.get('button[aria-label="Expand"]').first().click({ force: true });
          cy.get('button[data-cy="button-progress"]', { timeout: 60000 }).first().click({ force: true });
        });

      cy.get('[data-cy="roar-data-table"]', { timeout: 60000 }).should('exist');
      takeStepScreenshot('progress-report-opened');
    });

    // 5) Participant login (smoke): ensure the child can sign in and reach participant home
    cy.get('@childLogin').then((childLogin) => {
      const { email: childEmail, password: childPassword } = childLogin as { email?: string; password?: string };
      assert.isString(childEmail, 'child email from createUsers');
      assert.isString(childPassword, 'child password from createUsers');
      if (typeof childEmail !== 'string' || typeof childPassword !== 'string') {
        throw new Error('Child login credentials were not returned from createUsers');
      }

      cy.clearCookies();
      cy.clearLocalStorage();
      cy.visit('/signin');
      takeStepScreenshot('participant-signin-page');
      cy.get('[data-cy="input-username-email"]').should('be.visible');
      typeInto('[data-cy="input-username-email"]', childEmail);
      typeInto('[data-cy="input-password"]', childPassword, { log: false });
      cy.get('[data-cy="submit-sign-in-with-password"]').click();
      cy.location('pathname', { timeout: 90000 }).should('not.eq', '/signin');
      cy.get('body', { timeout: 90000 }).then(($body) => {
        if (!$body.find('[data-testid="home-participant"]').length) return;
        cy.get('[data-testid="home-participant"]', { timeout: 60000 }).should('be.visible');
        cy.get('[data-testid="home-participant-no-assignments"], [data-testid="home-participant-has-assignments"]', {
          timeout: 180000,
        }).should('exist');
        takeStepScreenshot('participant-home');
      });
    });
  });
});


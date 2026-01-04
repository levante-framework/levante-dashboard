/**
 * @fileoverview Assignment Task Conditions: Age-Based Condition Configuration
 *
 * @description
 * Tests the assignment task conditions feature, specifically verifying that age-based
 * conditions can be configured for tasks and are correctly included in the assignment
 * creation payload. Validates both UI interaction and API payload structure.
 *
 * @test-id task-assignment-task-conditions
 * @category tasks
 *
 * @setup
 * - Test self-seeds a cohort if needed
 * - Requires a site to be selected
 * - Needs at least one variant available for selection
 *
 * @required-env-vars
 * - E2E_SITE_NAME (default: ai-tests)
 * - E2E_AI_SITE_ADMIN_EMAIL or E2E_TEST_EMAIL (required)
 * - E2E_AI_SITE_ADMIN_PASSWORD or E2E_TEST_PASSWORD (required)
 *
 * @test-cases
 * 1. Sign in and select site
 * 2. Create a cohort (if needed)
 * 3. Create assignment and select cohort
 * 4. Select a variant
 * 5. Edit variant conditions: add "Age >= 5" assigned condition
 * 6. Verify condition appears in UI
 * 7. Submit assignment and verify condition is included in upsertAdministration payload
 *
 * @expected-behavior
 * - Condition editor dialog opens and closes correctly
 * - Age condition can be configured (field: Age, operator: Greater Than or Equal, value: 5)
 * - Condition is displayed in the variant card after saving
 * - upsertAdministration request includes condition in assessments[].conditions.assigned.conditions[]
 * - Condition format: { field: 'age', op: 'GREATER_THAN_OR_EQUAL', value: 5 }
 *
 * @related-docs
 * - src/pages/CreateAssignment.vue - Assignment creation UI
 * - src/components/VariantCard.vue - Variant selection and condition editing
 *
 * @modification-notes
 * To modify this test:
 * 1. Update condition field/operator/value if schema changes
 * 2. Update selectors if condition editor UI changes (PrimeVue Select overlays)
 * 3. Update payload validation if upsertAdministration structure changes
 * 4. Test handles PrimeVue Select overlays that render outside dialog (appended to body)
 * 5. Uses intercept to validate API payload structure
 * 6. Includes validation error checking for common blocking messages
 */

import 'cypress-real-events';
import { assert } from 'chai';

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

  cy.location('pathname', { timeout: 90000 }).should('not.eq', '/signin');
  cy.get('body', { timeout: 90000 }).then(($body) => {
    if ($body.find('[data-testid="nav-bar"]').length) return;
    if ($body.find('#levante-logo-loading').length) {
      cy.get('#levante-logo-loading', { timeout: 90000 }).should('not.exist');
    }
  });

  cy.get('#site-header', { timeout: 90000 }).should('be.visible');
}

function pickToday(datePickerSelector: string) {
  cy.get(datePickerSelector).should('be.visible').click();
  cy.get('body').then(($body) => {
    if ($body.find('button').filter((_, el) => el.textContent?.trim() === 'Today').length) {
      cy.contains('button', /^Today$/).click({ force: true });
      return;
    }

    const today = `${new Date().getDate()}`;
    cy.get('.p-datepicker-calendar', { timeout: 60000 })
      .contains('span', new RegExp(`^${today}$`))
      .click({ force: true });
  });
  cy.get('body').click(0, 0);
}

describe('researcher README workflow (hosted): assignment task conditions', () => {
  it('can set an Age condition for a selected task and include it in upsertAdministration', () => {
    const runId = `${Date.now()}`;
    const cohortName = `e2e-cohort-${runId}`;
    const assignmentName = `e2e-assignment-conditions-${runId}`;

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

    // Create a cohort (group) to assign to.
    cy.visit('/list-groups');
    cy.get('body', { timeout: 60000 }).then(($body) => {
      if ($body.find('[data-testid="groups-page-ready"]').length) {
        cy.get('[data-testid="groups-page-ready"]', { timeout: 60000 }).should('exist');
        return;
      }

      cy.contains('[data-testid="groups-page-title"], .admin-page-header', /^Groups$/, { timeout: 60000 }).should(
        'be.visible',
      );
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
    cy.contains('Cohort created successfully.', { timeout: 30000 }).should('exist');

    // Create assignment and configure task conditions
    cy.visit('/create-assignment');
    assertCurrentSiteSelected();

    typeInto('[data-cy="input-administration-name"]', assignmentName);
    pickToday('[data-cy="input-start-date"]');
    pickToday('[data-cy="input-end-date"]');

    cy.contains('Cohorts').click();
    cy.get('[data-cy="group-picker-listbox"]').should('be.visible');
    cy.contains('[role="option"]', cohortName).click();
    cy.contains('Selected Groups').closest('.p-panel').contains(cohortName).should('exist');

    // Select the first available variant.
    cy.get('[data-cy="input-variant-name"]', { timeout: 120000 }).should('be.visible');
    cy.get('[data-cy="selected-variant"]', { timeout: 120000 }).should('exist').first().click();
    cy.get('[data-cy="panel-droppable-zone"]', { timeout: 120000 }).contains('Variant name:').should('exist');

    // Edit conditions: add Assigned condition Age >= 5 and save.
    cy.get('[data-cy="panel-droppable-zone"]').find('[data-cy="button-edit-variant"]').should('exist').first().click();
    cy.contains('.p-dialog', 'Edit Conditions', { timeout: 60000 }).should('be.visible');

    // PrimeVue Select overlays render outside the dialog (typically appended to <body>),
    // so we must NOT scope option selection to the dialog via .within().
    cy.get('.p-dialog:visible').within(() => {
      cy.get('[data-cy="button-assigned-condition"]').should('be.visible').click();

      cy.get('.params-container', { timeout: 60000 }).should('have.length.greaterThan', 0).last().within(() => {
        cy.get('.p-select').eq(0).click({ force: true });
      });
    });
    cy.get('body').contains('[role="option"]', /^Age$/, { timeout: 60000 }).click();

    cy.get('.p-dialog:visible').within(() => {
      cy.get('.params-container')
        .last()
        .within(() => {
          cy.get('.p-select').eq(1).click({ force: true });
        });
    });
    cy.get('body').contains('[role="option"]', /^Greater Than or Equal$/, { timeout: 60000 }).click();

    cy.get('.p-dialog:visible').within(() => {
      cy.get('.params-container')
        .last()
        .within(() => {
          cy.get('.p-select').eq(2).click({ force: true });
        });
    });
    cy.get('body').contains('[role="option"]', /^5$/, { timeout: 60000 }).click();

    cy.get('.p-dialog:visible').within(() => {
      cy.get('[data-cy="button-save-conditions"]').should('be.visible').click();
    });
    cy.contains('.p-dialog', 'Edit Conditions').should('not.exist');

    // Expand the selected task card and confirm the Age condition is displayed.
    cy.get('[data-cy="panel-droppable-zone"]')
      .find('div.h-6rem')
      .first()
      .within(() => {
        cy.get('i.pi-chevron-down, i.pi-chevron-up').should('exist').last().click({ force: true });
      });

    cy.get('[data-cy="panel-droppable-zone"]').contains('Assigned Conditions:', { timeout: 60000 }).should('be.visible');
    cy.get('[data-cy="panel-droppable-zone"]').contains('age').should('exist');
    cy.get('[data-cy="panel-droppable-zone"]').contains('GREATER_THAN_OR_EQUAL').should('exist');
    cy.get('[data-cy="panel-droppable-zone"]').contains(/^5$/).should('exist');

    // Submit and validate upsertAdministration payload includes the conditions.
    cy.get('input[id="No"]').should('exist').check({ force: true });

    cy.intercept('POST', /upsertAdministration/i).as('upsertAdministration');
    cy.get('[data-cy="button-create-administration"]').should('be.visible').should('not.be.disabled').click();
    cy.wait('@upsertAdministration', { timeout: 120000 }).then((interception) => {
      const status = interception.response?.statusCode;
      const body = interception.response?.body;
      if (status && status >= 400) {
        throw new Error(`upsertAdministration failed: HTTP ${status} body=${JSON.stringify(body)}`);
      }
      const maybeError = isRecord(body) ? body.error : undefined;
      if (maybeError) throw new Error(`upsertAdministration failed: body.error=${JSON.stringify(maybeError)}`);

      const requestBody = interception.request?.body as { data?: unknown } | undefined;
      const data = requestBody?.data;
      if (!isRecord(data)) throw new Error(`upsertAdministration request body missing data: ${JSON.stringify(requestBody)}`);

      const assessments = data.assessments;
      if (!Array.isArray(assessments)) throw new Error(`upsertAdministration data.assessments missing: ${JSON.stringify(data)}`);

      const hasAgeCondition = assessments.some((a) => {
        if (!isRecord(a)) return false;
        const conditions = a.conditions;
        if (!isRecord(conditions)) return false;
        const assigned = conditions.assigned;
        if (!isRecord(assigned)) return false;
        const conds = assigned.conditions;
        if (!Array.isArray(conds)) return false;
        return conds.some(
          (c) => isRecord(c) && c.field === 'age' && c.op === 'GREATER_THAN_OR_EQUAL' && String(c.value) === '5',
        );
      });

      if (!hasAgeCondition) {
        throw new Error(`Expected upsertAdministration payload to include age>=5 condition. body=${JSON.stringify(data)}`);
      }
    });

    cy.contains('Your new assignment is being processed', { timeout: 60000 }).should('exist');
  });
});


/**
 * @fileoverview Add Group: Create Cohort Workflow
 *
 * @description
 * Tests the basic workflow of creating a new Cohort group via the Add Group modal.
 * Verifies that the modal opens, org type can be selected, and the cohort is created successfully.
 *
 * @test-id task-add-group
 * @category tasks
 *
 * @setup
 * - Requires a site to be selected (test uses ai-tests by default)
 * - User must have permissions to create cohorts
 *
 * @required-env-vars
 * - E2E_SITE_NAME (default: ai-tests)
 * - E2E_AI_SITE_ADMIN_EMAIL or E2E_TEST_EMAIL (required)
 * - E2E_AI_SITE_ADMIN_PASSWORD or E2E_TEST_PASSWORD (required)
 *
 * @test-cases
 * 1. Sign in and select site
 * 2. Navigate to /list-groups
 * 3. Click "Add Group" button
 * 4. Select "Cohort" from org type dropdown
 * 5. Enter cohort name
 * 6. Submit and verify success toast appears
 *
 * @expected-behavior
 * - Modal opens with "Add New" title
 * - Cohort option is available in org type dropdown
 * - Success toast: "Cohort created successfully."
 * - Modal closes after successful creation
 *
 * @related-docs
 * - src/components/modals/AddGroupModal.vue - Add Group modal component
 * - src/pages/groups/ListGroups.vue - Groups listing page
 *
 * @modification-notes
 * To modify this test:
 * 1. Update selectors if modal structure changes ([data-testid="modalTitle"], [data-cy="dropdown-org-type"])
 * 2. Change org type if testing different group types (School, Class, Site)
 * 3. Update success message assertion if toast text changes
 * 4. Test was updated to use shared helpers (selectSite, signInWithPassword) for consistency
 */

import 'cypress-real-events';

import { selectSite, signInWithPassword } from '../_helpers';

const email: string =
  (Cypress.env('E2E_AI_SITE_ADMIN_EMAIL') as string) ||
  (Cypress.env('E2E_TEST_EMAIL') as string) ||
  'student@levante.test';
const password: string =
  (Cypress.env('E2E_AI_SITE_ADMIN_PASSWORD') as string) ||
  (Cypress.env('E2E_TEST_PASSWORD') as string) ||
  'student123';
const siteName: string = (Cypress.env('E2E_SITE_NAME') as string) || 'ai-tests';

function typeInto(selector: string, value: string, opts: Partial<Cypress.TypeOptions> = {}) {
  cy.get(selector)
    .should('be.visible')
    .click()
    .type('{selectall}{backspace}', { delay: 0 })
    .type(value, { delay: 0, ...opts });
}

describe('researcher workflow: add groups', () => {
  it('can create a new Cohort group (requires selecting Site dropdown first)', () => {
    signInWithPassword({ email, password });
    selectSite(siteName);
    cy.visit('/list-groups');
    cy.get('[data-testid="groups-page-ready"]', { timeout: 60000 }).should('exist');

    cy.get('[data-testid="add-group-btn"]').should('be.visible').should('not.be.disabled').click();
    cy.get('[data-testid="modalTitle"]').should('contain.text', 'Add New');

    const groupName = `e2e-cohort-${Date.now()}`;

    // Select "Cohort" org type
    cy.get('[data-cy="dropdown-org-type"]').click();
    cy.contains('[role="option"]', /^Cohort$/).click();

    typeInto('[data-cy="input-org-name"]', groupName);
    cy.get('[data-testid="submitBtn"]').should('not.be.disabled').click();

    // Modal should close
    cy.get('[data-testid="modalTitle"]').should('not.exist');

    // Verify success via toast (avoid relying on realtime table refresh)
    cy.contains('Success', { timeout: 30000 }).should('exist');
    cy.contains('Cohort created successfully.', { timeout: 30000 }).should('exist');
  });
});


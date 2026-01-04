/**
 * @fileoverview GH#737 [OPEN]: Prohibit Identical Class Names Within Site
 *
 * @description
 * Tests GitHub issue #737 - verifies that the system prevents creating classes with duplicate
 * names within the same site, even if they're in different schools. This ensures data integrity
 * and prevents user confusion when classes have identical names.
 *
 * @test-id gh-0737-open
 * @category bugs
 * @github-issue 737
 *
 * @setup
 * - Test creates two schools and attempts to create classes with the same name
 * - Requires site selection
 * - Only runs if E2E_RUN_OPEN_BUGS=true (skipped by default)
 *
 * @required-env-vars
 * - E2E_SITE_NAME (default: ai-tests)
 * - E2E_TEST_EMAIL (required)
 * - E2E_TEST_PASSWORD (required)
 * - E2E_RUN_OPEN_BUGS=true (required to run this test, otherwise skipped)
 *
 * @test-cases
 * 1. Sign in and select site
 * 2. Create School A
 * 3. Create School B
 * 4. Create Class with name X in School A (should succeed)
 * 5. Attempt to create Class with name X in School B (should fail with duplicate error)
 *
 * @expected-behavior
 * - First class creation succeeds
 * - Second class creation fails with error: "Class Creation Error"
 * - Error message: "Class with name {name} already exists" (case-insensitive)
 * - Form submission is blocked
 *
 * @related-docs
 * - https://github.com/levante-framework/levante-dashboard/issues/737 - Original issue
 * - src/components/modals/AddGroupModal.vue - Class creation UI
 * - src/composables/mutations/useUpsertOrgMutation.ts - Backend validation
 *
 * @modification-notes
 * To modify this test:
 * 1. Update error message text if validation messages change
 * 2. Update selectors if modal structure changes
 * 3. Test is skipped by default (set E2E_RUN_OPEN_BUGS=true to run)
 * 4. Uses reloadGroupsPage() helper to ensure cached queries refresh
 * 5. Uses waitForGroupRow() helper to wait for async table updates
 * 6. Test validates uniqueness at site level (not school level)
 * 7. Includes helper functions for clarity (openAddGroupModal, selectOrgType, etc.)
 */

import { ignoreKnownHostedUncaughtExceptions, selectSite, signInWithPassword, typeInto } from '../_helpers';

// GH#737: Prohibit identical class names within a site (even across different schools).
// https://github.com/levante-framework/levante-dashboard/issues/737

const email: string = (Cypress.env('E2E_TEST_EMAIL') as string) || 'student@levante.test';
const password: string = (Cypress.env('E2E_TEST_PASSWORD') as string) || 'student123';

function openAddGroupModal() {
  cy.get('[data-testid="add-group-btn"]', { timeout: 60000 }).should('be.visible').click();
  cy.get('[data-testid="modalTitle"]', { timeout: 60000 }).should('contain.text', 'Add New');
}

function selectOrgType(label: 'School' | 'Class') {
  cy.get('[data-cy="dropdown-org-type"]', { timeout: 60000 }).should('be.visible').click();
  cy.contains('[role="option"]', new RegExp(`^${label}$`), { timeout: 60000 }).click();
}

function selectParentSchool(schoolName: string) {
  cy.get('[data-cy="dropdown-parent-school"]', { timeout: 60000 }).should('be.visible').click();
  cy.contains('[role="option"]', new RegExp(`^${escapeRegExp(schoolName)}$`), { timeout: 60000 }).click();
}

function submitAndExpectSuccess(label: string) {
  // Ensure we don't accidentally match a prior toast from a previous submission.
  cy.contains(`${label} created successfully.`, { timeout: 60000 }).should('not.exist');

  cy.get('[data-testid="submitBtn"]').should('be.visible').and('not.be.disabled').click();
  cy.contains('Success', { timeout: 60000 }).should('exist');
  cy.contains(`${label} created successfully.`, { timeout: 60000 }).should('exist');
}

function reloadGroupsPage() {
  cy.reload();
  cy.get('[data-testid="groups-page-ready"]', { timeout: 60000 }).should('exist');
}

function goToGroupsTab(label: 'Sites' | 'Schools' | 'Classes' | 'Cohorts') {
  cy.contains('[role="tab"]', new RegExp(`^${label}$`), { timeout: 60000 }).click();
}

function waitForGroupRow(name: string) {
  const startedAt = Date.now();
  const timeoutMs = 2 * 60_000;

  function attempt(): Cypress.Chainable<void> {
    cy.get('[data-cy="search-groups-input"]', { timeout: 60000 })
      .should('be.visible')
      .clear()
      .type(name);

    return cy.get('body', { timeout: 60000 }).then(($body) => {
      if ($body.text().includes(name)) return;

      if (Date.now() - startedAt > timeoutMs) {
        throw new Error(`Timed out waiting for group to appear in table: ${name}`);
      }

      cy.wait(2000);
      reloadGroupsPage();
      return attempt();
    });
  }

  return attempt();
}

function submitAndExpectDuplicateError(label: string, name: string) {
  // Ensure we don't accidentally match a prior toast from a previous submission.
  cy.contains(`${label} Creation Error`, { timeout: 60000 }).should('not.exist');

  cy.get('[data-testid="submitBtn"]').should('be.visible').and('not.be.disabled').click();
  cy.contains(`${label} Creation Error`, { timeout: 60000 }).should('exist');
  cy.contains(new RegExp(`${label} with name ${escapeRegExp(name)} already exists`, 'i'), { timeout: 60000 }).should('exist');
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

describe('GH#737 [OPEN] PERMISSIONS Prohibit identical class names within site', () => {
  const testRunner = Cypress.env('E2E_RUN_OPEN_BUGS') ? it : it.skip;

  testRunner('prevents creating a second class with the same name in a different school in the same site', () => {
    ignoreKnownHostedUncaughtExceptions();

    const nonce = Date.now();
    const schoolA = `e2e-school-a-${nonce}`;
    const schoolB = `e2e-school-b-${nonce}`;
    const className = `e2e-class-${nonce}`;

    cy.visit('/signin');
    signInWithPassword({ email, password });
    selectSite(((Cypress.env('E2E_SITE_NAME') as string) || 'ai-tests') as string);

    cy.visit('/list-groups');
    cy.get('[data-testid="groups-page-ready"]', { timeout: 60000 }).should('exist');

    openAddGroupModal();
    selectOrgType('School');
    typeInto('[data-cy="input-org-name"]', schoolA);
    submitAndExpectSuccess('School');

    openAddGroupModal();
    selectOrgType('School');
    typeInto('[data-cy="input-org-name"]', schoolB);
    submitAndExpectSuccess('School');

    // The school dropdown is fed by a cached query; a reload helps ensure newly created schools appear as options.
    reloadGroupsPage();
    goToGroupsTab('Schools');
    waitForGroupRow(schoolA);
    waitForGroupRow(schoolB);

    openAddGroupModal();
    selectOrgType('Class');
    selectParentSchool(schoolA);
    typeInto('[data-cy="input-org-name"]', className);
    submitAndExpectSuccess('Class');

    // Same deal: reload so the second class creation sees up-to-date school options.
    reloadGroupsPage();

    openAddGroupModal();
    selectOrgType('Class');
    selectParentSchool(schoolB);
    typeInto('[data-cy="input-org-name"]', className);

    // Expected behavior (what we want after GH#737 is fixed):
    // Class names must be unique within a site, even across different schools.
    submitAndExpectDuplicateError('Class', className);
  });
});


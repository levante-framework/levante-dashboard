/**
 * @fileoverview GH#733 [OPEN]: SuperAdmin Cannot Create Sites When No Site Selected
 *
 * @description
 * Tests GitHub issue #733 - verifies that SuperAdmins can create sites even when no site
 * is currently selected. This is a permissions system bug where site creation was incorrectly
 * gated by site selection state.
 *
 * @test-id gh-0733-open
 * @category bugs
 * @github-issue 733
 *
 * @setup
 * - Requires a SuperAdmin user account
 * - Test should run when no site is selected (or site selection is optional)
 * - Only runs if E2E_RUN_OPEN_BUGS=true (skipped by default)
 *
 * @required-env-vars
 * - E2E_AI_SUPER_ADMIN_EMAIL (required - SuperAdmin account)
 * - E2E_AI_SUPER_ADMIN_PASSWORD (required)
 * - E2E_RUN_OPEN_BUGS=true (required to run this test, otherwise skipped)
 *
 * @test-cases
 * 1. Sign in as SuperAdmin
 * 2. Navigate to /list-groups
 * 3. Click "Add Group" button (should be enabled)
 * 4. Select "Site" from org type dropdown
 * 5. Enter site name
 * 6. Submit and verify success
 *
 * @expected-behavior
 * - "Add Group" button is visible and enabled even when no site selected
 * - "Site" option appears in org type dropdown for SuperAdmins
 * - Site creation succeeds
 * - Success toast: "Site created successfully."
 *
 * @related-docs
 * - https://github.com/levante-framework/levante-dashboard/issues/733 - Original issue
 * - src/components/modals/AddGroupModal.vue - Add Group modal with permission gating
 * - README_TESTS_PERMISSIONS.md - Permissions system documentation
 *
 * @modification-notes
 * To modify this test:
 * 1. Update selectors if modal structure changes
 * 2. Update success message if toast text changes
 * 3. Test is skipped by default (set E2E_RUN_OPEN_BUGS=true to run)
 * 4. Uses helper functions (openAddGroupModal, selectOrgType) for clarity
 * 5. Test validates that SuperAdmin can create sites globally (not site-scoped)
 */

import { ignoreKnownHostedUncaughtExceptions, signInWithPassword, typeInto } from '../_helpers';

const email: string | undefined =
  (Cypress.env('E2E_AI_SUPER_ADMIN_EMAIL') as string | undefined) || (Cypress.env('E2E_TEST_EMAIL') as string | undefined);
const password: string | undefined =
  (Cypress.env('E2E_AI_SUPER_ADMIN_PASSWORD') as string | undefined) || (Cypress.env('E2E_TEST_PASSWORD') as string | undefined);

function openAddGroupModal() {
  cy.get('[data-testid="add-group-btn"]', { timeout: 60000 }).should('be.visible').click();
  cy.get('[data-testid="modalTitle"]', { timeout: 60000 }).should('contain.text', 'Add New');
}

function selectOrgType(label: 'Site' | 'School' | 'Class' | 'Cohort') {
  cy.get('[data-cy="dropdown-org-type"]', { timeout: 60000 }).should('be.visible').click();
  cy.contains('[role="option"]', new RegExp(`^${label}$`), { timeout: 60000 }).click();
}

describe('GH#733 [OPEN] PERMISSIONS SuperAdmins cannot create sites', () => {
  const testRunner = Cypress.env('E2E_RUN_OPEN_BUGS') ? it : it.skip;

  testRunner('allows SuperAdmin to create a Site when no site is selected', () => {
    ignoreKnownHostedUncaughtExceptions();

    if (!email || !password) {
      throw new Error(
        'Missing SuperAdmin credentials for GH#733 test. Set E2E_AI_SUPER_ADMIN_EMAIL and E2E_AI_SUPER_ADMIN_PASSWORD (preferred), ' +
          'or E2E_TEST_EMAIL and E2E_TEST_PASSWORD, in your local .env.',
      );
    }

    const nonce = Date.now();
    const siteName = `e2e-site-${nonce}`;

    cy.visit('/signin');
    signInWithPassword({ email, password });

    cy.visit('/list-groups');
    cy.get('[data-testid="groups-page-ready"]', { timeout: 60000 }).should('exist');

    cy.get('[data-testid="add-group-btn"]', { timeout: 60000 }).should('be.visible').and('not.be.disabled');

    openAddGroupModal();
    selectOrgType('Site');
    typeInto('[data-cy="input-org-name"]', siteName);
    cy.get('[data-testid="submitBtn"]').should('be.visible').and('not.be.disabled').click();

    cy.contains('Success', { timeout: 60000 }).should('exist');
    cy.contains('Site created successfully.', { timeout: 60000 }).should('exist');
  });
});


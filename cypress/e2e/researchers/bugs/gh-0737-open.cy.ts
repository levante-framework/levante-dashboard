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
    selectSite(((Cypress.env('E2E_SITE_NAME') as string) || 'AAA Site') as string);

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


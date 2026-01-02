import { ignoreKnownHostedUncaughtExceptions, signInWithPassword, typeInto } from '../_helpers';

const email: string = (Cypress.env('E2E_TEST_EMAIL') as string) || 'student@levante.test';
const password: string = (Cypress.env('E2E_TEST_PASSWORD') as string) || 'student123';

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


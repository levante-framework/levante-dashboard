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


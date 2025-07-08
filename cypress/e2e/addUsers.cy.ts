/// <reference types="cypress" />

const username = 'admin@levante.test';
const password = 'admin123';

// Add type augmentation - make this file a module
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      login(username: string, password: string): Chainable<Element>;
    }
  }
}

describe('Core Admin Actions', () => {
  beforeEach(() => {
    cy.login(username, password);
  });

  it('adds users', () => {
    cy.visit('/add-users');
    cy.get('[data-cy=upload-users-csv]').selectFile('cypress/e2e/fixtures/add-users.csv');
    cy.get('[data-cy=submit-add-users]').click();
    cy.get('[data-cy=continue-to-link-users]').should('exist');
  });

  it('creates an assignment', () => {
    
  });

  it('creates groups', () => {

  });
  
});

// Make this file a module
export {};

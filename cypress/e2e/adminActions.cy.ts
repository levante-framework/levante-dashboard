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

  // TODO: Verify that these can be done in any order.
  // Add another test to do these sequentially.

  it('creates all groups (site, school, class, and cohort)', () => {
    // Navigate through the navbar to Add Users, routing directtly causes reloads and breaks the test
    cy.contains('Groups').click();

    // Verify we're on the add groups page
    cy.url().should('include', '/list-groups');

    // SITE
    cy.contains('Add Group').click();
    // select "site" from the dropdown
    cy.get('[data-cy="dropdown-group-type"]').click();
    
    // Wait for dropdown to open and click Site option
    cy.get('.p-select-overlay').should('be.visible');
    cy.get('.p-select-overlay').contains('Site').click();
    
    // fill in the name
    cy.get('[data-cy="input-group-name"]').type('Cypress Site');
    // click the create button
    cy.get('[data-testid="submitBtn"]').click();
    // Verify the group was created
    cy.contains('success').should('exist');
      

    // SCHOOL
    cy.contains('Add Group').click();
    // select "school" from the dropdown
    cy.get('[data-cy="dropdown-group-type"]').click();
    cy.get('.p-select-overlay').should('be.visible');
    cy.get('.p-select-overlay').contains('School').click();
    // select district from the dropdown
    cy.get('[data-cy="dropdown-parent-district"]').click();
    cy.get('.p-select-overlay').should('be.visible');
    cy.get('.p-select-overlay').contains('Cypress Site').click();
    // fill in the name
    cy.get('[data-cy="input-group-name"]').type('Cypress School');
    // click the create button
    cy.get('[data-testid="submitBtn"]').click();
    // Verify the group was created
    cy.contains('success').should('exist');

    // CLASS
    cy.contains('Add Group').click();
    // select "class" from the dropdown
    cy.get('[data-cy="dropdown-group-type"]').click();
    cy.get('.p-select-overlay').should('be.visible');
    cy.get('.p-select-overlay').contains('Class').click();
    // select district from the dropdown
    cy.get('[data-cy="dropdown-parent-district"]').click();
    cy.get('.p-select-overlay').should('be.visible');
    cy.get('.p-select-overlay').contains('Cypress Site').click();
    // select school from the dropdown
    cy.get('[data-cy="dropdown-parent-school"]').click();
    cy.get('.p-select-overlay').should('be.visible');
    cy.get('.p-select-overlay').contains('Cypress School').click();
    // fill in the name
    cy.get('[data-cy="input-group-name"]').type('Cypress Class');
    // click the create button
    cy.get('[data-testid="submitBtn"]').click();
    // Verify the group was created
    cy.contains('success').should('exist');

    // COHORT
    cy.contains('Add Group').click(); 
    // select "cohort" from the dropdown
    cy.get('[data-cy="dropdown-group-type"]').click();
    cy.get('.p-select-overlay').should('be.visible');
    cy.get('.p-select-overlay').contains('Cohort').click();
    // select district from the dropdown
    cy.get('[data-cy="dropdown-parent-district"]').click();
    cy.get('.p-select-overlay').should('be.visible');
    cy.get('.p-select-overlay').contains('Cypress Site').click();
    // fill in the name
    cy.get('[data-cy="input-group-name"]').type('Cypress Cohort');
    // click the create button
    cy.get('[data-testid="submitBtn"]').click();
    // Verify the group was created
    cy.contains('success').should('exist');
    
  });

  it('adds users', () => {
    // Navigate through the navbar to Add Users, routing directtly causes reloads and breaks the test
    cy.contains('Users').click();
    cy.contains('Add Users').click();
    
    // Verify we're on the add users page
    cy.url().should('include', '/add-users');
    
    // Use force: true because PrimeVue hides the file input and uses a custom button
    cy.get('[data-cy="upload-users-csv"] input[type="file"]').selectFile('cypress/e2e/fixtures/add-users.csv', { force: true });
    cy.get('[data-cy=submit-add-users]').click();
    cy.get('[data-cy=continue-to-link-users]').should('exist');
  });

  it('creates an assignment', () => {
    cy.contains('Assignments').click();
    cy.contains('Create Assignment').click();

    // Verify we're on the add assignment page
    cy.url().should('include', '/create-assignment');

    // Fill in assignment name
    cy.get('[data-cy="input-administration-name"]').type('Cypress Assignment');

    // Select start date (today)
    cy.get('[data-cy="input-start-date"] .p-datepicker-trigger').click();
    cy.get('.p-datepicker-today').click();

    // Select end date (a week from now, assume same month for simplicity)
    cy.get('[data-cy="input-end-date"] .p-datepicker-trigger').click();
    const weekLater = new Date().getDate() + 7;
    cy.get('.p-datepicker').contains(weekLater).click();

    // Select group (Cypress Site)
    cy.get('[data-cy="dropdown-selected-district"]').click();
    cy.get('.p-select-overlay').should('be.visible');
    cy.get('.p-select-overlay').contains('Cypress Site').click();

    // Select task
    // Open task dropdown
    cy.get('input[placeholder="Select TaskID"]').click();
    // Select 'Vocabulary' from Language and Literacy group
    cy.get('.p-select-overlay').contains('Vocabulary').click();

    // Select the first variant by clicking the arrow button
    cy.get('.h-6rem').first().find('.pi-chevron-right').click();

    // Select radio "No" for sequential
    cy.get('[data-cy="radio-button-not-sequential"]').click();

    // Submit
    cy.get('[data-cy="button-create-administration"]').click();

    // Verify success
    cy.contains('success').should('exist');
  });
});

// Make this file a module
export {};

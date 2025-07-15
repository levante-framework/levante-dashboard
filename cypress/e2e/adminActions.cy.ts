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
    cy.get('.p-select-overlay').contains('Test District').click();
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
    cy.get('.p-select-overlay').contains('Test District').click();
    // select school from the dropdown
    cy.get('[data-cy="dropdown-parent-school"]').click();
    cy.get('.p-select-overlay').should('be.visible');
    cy.get('.p-select-overlay').contains('Test Elementary School').click();
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
    cy.get('.p-select-overlay').contains('Test District').click();
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

  it('creates an assignment for a site', () => {
    cy.contains('Assignments').click();
    cy.contains('Create Assignment').click();

    // Verify we're on the add assignment page
    cy.url().should('include', '/create-assignment');

    // Fill in assignment name
    cy.get('[data-cy="input-administration-name"]').type('Cypress Assignment');

    // Select start date (today) - use the Today button from PrimeVue
    cy.get('[data-cy="input-start-date"]').click();
    cy.get('.p-datepicker').should('be.visible');
    cy.get('.p-datepicker-buttonbar').contains('Today').click();
    
    // Wait for the start date picker panel to close after selecting Today
    cy.get('.p-datepicker-panel').should('not.exist');

    // Select end date (a week from now) - use a simpler approach
    cy.get('[data-cy="input-end-date"]').click();
    cy.get('.p-datepicker').should('be.visible');
    
    // Calculate a safe date (today + 7 days) and format it
    const today = new Date();
    const weekLater = new Date(today);
    weekLater.setDate(today.getDate() + 7);
    
    // If crossing month boundary, click next month arrow
    if (weekLater.getMonth() !== today.getMonth()) {
      cy.get('.p-datepicker-next').click();
    }
    
    // Select the specific day - use more specific selector to avoid ambiguity
    cy.get('.p-datepicker-calendar tbody td')
      .not('.p-datepicker-other-month')
      .contains(weekLater.getDate().toString())
      .first()
      .click();

    // Select group - choose the first site from the Sites tab (default tab)
    cy.get('.p-listbox').should('be.visible');
    cy.get('.p-listbox .p-listbox-option').first().click();

    // Select task from TaskPicker dropdown
    cy.contains('Select TaskID').click();
    cy.get('.p-select-overlay').should('be.visible');
    
    // Select Vocabulary directly from the grouped options
    cy.get('.p-select-overlay').contains('Vocabulary').click();

    // Wait for variant cards to appear and select the first variant
    cy.get('[data-cy="selected-variant"]').should('be.visible');
    cy.get('[data-cy="selected-variant"]').first().click();

    // Select radio "No" for sequential
    cy.get('[data-cy="radio-button-not-sequential"]').click();

    // Submit
    cy.get('[data-cy="button-create-administration"]').click();

    // Wait for success toast to appear before redirect
    cy.get('.p-toast-message-success').should('be.visible');
    cy.contains('Assignment created').should('be.visible');
  });

  it('creates an assignment for a school', () => {
    cy.contains('Assignments').click();
    cy.contains('Create Assignment').click();

    // Verify we're on the add assignment page
    cy.url().should('include', '/create-assignment');

    // Fill in assignment name
    cy.get('[data-cy="input-administration-name"]').type('Cypress School Assignment');

    // Select start date (today) - use the Today button from PrimeVue
    cy.get('[data-cy="input-start-date"]').click();
    cy.get('.p-datepicker').should('be.visible');
    cy.get('.p-datepicker-buttonbar').contains('Today').click();
    
    // Wait for the start date picker panel to close after selecting Today
    cy.get('.p-datepicker-panel').should('not.exist');

    // Select end date (a week from now) - use a simpler approach
    cy.get('[data-cy="input-end-date"]').click();
    cy.get('.p-datepicker').should('be.visible');
    
    // Calculate a safe date (today + 7 days) and format it
    const today = new Date();
    const weekLater = new Date(today);
    weekLater.setDate(today.getDate() + 7);
    
    // If crossing month boundary, click next month arrow
    if (weekLater.getMonth() !== today.getMonth()) {
      cy.get('.p-datepicker-next').click();
    }
    
    // Select the specific day - use more specific selector to avoid ambiguity
    cy.get('.p-datepicker-calendar tbody td')
      .not('.p-datepicker-other-month')
      .contains(weekLater.getDate().toString())
      .first()
      .click();

    // Wait for the GroupPicker component to be loaded (this includes waiting for claims to load)
    // The TabView has v-if="claimsLoaded" so we need to wait for it to actually render
    cy.get('.p-panel').should('be.visible');
    cy.get('.p-panel').contains('Select Group(s)').should('be.visible');
    
    // Wait for the TabView to be rendered (after claims are loaded)
    cy.get('.p-tabview', { timeout: 10000 }).should('be.visible');
    
    // Select group - switch to Schools tab and choose first school
    cy.get('.p-tabview-tab-header').contains('Schools').click();
    
    // Wait for the listbox to update after tab switch
    cy.get('.p-listbox').should('be.visible');
    cy.get('.p-listbox .p-listbox-option').first().click();

    // Select task from TaskPicker dropdown
    cy.contains('Select TaskID').click();
    cy.get('.p-select-overlay').should('be.visible');
    
    // Select Vocabulary directly from the grouped options
    cy.get('.p-select-overlay').contains('Vocabulary').click();

    // Wait for variant cards to appear and select the first variant
    cy.get('[data-cy="selected-variant"]').should('be.visible');
    cy.get('[data-cy="selected-variant"]').first().click();

    // Select radio "No" for sequential
    cy.get('[data-cy="radio-button-not-sequential"]').click();

    // Submit
    cy.get('[data-cy="button-create-administration"]').click();

    // Wait for success toast to appear before redirect
    cy.get('.p-toast-message-success').should('be.visible');
    cy.contains('Assignment created').should('be.visible');
  });

  it('creates an assignment for a class', () => {
    cy.contains('Assignments').click();
    cy.contains('Create Assignment').click();

    // Verify we're on the add assignment page
    cy.url().should('include', '/create-assignment');

    // Fill in assignment name
    cy.get('[data-cy="input-administration-name"]').type('Cypress Class Assignment');

    // Select start date (today) - use the Today button from PrimeVue
    cy.get('[data-cy="input-start-date"]').click();
    cy.get('.p-datepicker').should('be.visible');
    cy.get('.p-datepicker-buttonbar').contains('Today').click();
    
    // Wait for the start date picker panel to close after selecting Today
    cy.get('.p-datepicker-panel').should('not.exist');

    // Select end date (a week from now) - use a simpler approach
    cy.get('[data-cy="input-end-date"]').click();
    cy.get('.p-datepicker').should('be.visible');
    
    // Calculate a safe date (today + 7 days) and format it
    const today = new Date();
    const weekLater = new Date(today);
    weekLater.setDate(today.getDate() + 7);
    
    // If crossing month boundary, click next month arrow
    if (weekLater.getMonth() !== today.getMonth()) {
      cy.get('.p-datepicker-next').click();
    }
    
    // Select the specific day - use more specific selector to avoid ambiguity
    cy.get('.p-datepicker-calendar tbody td')
      .not('.p-datepicker-other-month')
      .contains(weekLater.getDate().toString())
      .first()
      .click();

    // Wait for the GroupPicker component to be loaded (this includes waiting for claims to load)
    // The TabView has v-if="claimsLoaded" so we need to wait for it to actually render
    cy.get('.p-panel').should('be.visible');
    cy.get('.p-panel').contains('Select Group(s)').should('be.visible');
    
    // Wait for the TabView to be rendered (after claims are loaded)
    cy.get('.p-tabview', { timeout: 10000 }).should('be.visible');
    
    // Select group - switch to Classes tab and choose first class
    cy.get('.p-tabview-tab-header').contains('Classes').click();
    
    // Wait for the listbox to update after tab switch
    cy.get('.p-listbox').should('be.visible');
    cy.get('.p-listbox .p-listbox-option').first().click();

    // Select task from TaskPicker dropdown
    cy.contains('Select TaskID').click();
    cy.get('.p-select-overlay').should('be.visible');
    
    // Select Vocabulary directly from the grouped options
    cy.get('.p-select-overlay').contains('Vocabulary').click();

    // Wait for variant cards to appear and select the first variant
    cy.get('[data-cy="selected-variant"]').should('be.visible');
    cy.get('[data-cy="selected-variant"]').first().click();

    // Select radio "No" for sequential
    cy.get('[data-cy="radio-button-not-sequential"]').click();

    // Submit
    cy.get('[data-cy="button-create-administration"]').click();

    // Wait for success toast to appear before redirect
    cy.get('.p-toast-message-success').should('be.visible');
    cy.contains('Assignment created').should('be.visible');
  });

  it('creates an assignment for a cohort', () => {
    cy.contains('Assignments').click();
    cy.contains('Create Assignment').click();

    // Verify we're on the add assignment page
    cy.url().should('include', '/create-assignment');

    // Fill in assignment name
    cy.get('[data-cy="input-administration-name"]').type('Cypress Cohort Assignment');

    // Select start date (today) - use the Today button from PrimeVue
    cy.get('[data-cy="input-start-date"]').click();
    cy.get('.p-datepicker').should('be.visible');
    cy.get('.p-datepicker-buttonbar').contains('Today').click();
    
    // Wait for the start date picker panel to close after selecting Today
    cy.get('.p-datepicker-panel').should('not.exist');

    // Select end date (a week from now) - use a simpler approach
    cy.get('[data-cy="input-end-date"]').click();
    cy.get('.p-datepicker').should('be.visible');
    
    // Calculate a safe date (today + 7 days) and format it
    const today = new Date();
    const weekLater = new Date(today);
    weekLater.setDate(today.getDate() + 7);
    
    // If crossing month boundary, click next month arrow
    if (weekLater.getMonth() !== today.getMonth()) {
      cy.get('.p-datepicker-next').click();
    }
    
    // Select the specific day - use more specific selector to avoid ambiguity
    cy.get('.p-datepicker-calendar tbody td')
      .not('.p-datepicker-other-month')
      .contains(weekLater.getDate().toString())
      .first()
      .click();

    // Wait for the GroupPicker component to be loaded (this includes waiting for claims to load)
    // The TabView has v-if="claimsLoaded" so we need to wait for it to actually render
    cy.get('.p-panel').should('be.visible');
    cy.get('.p-panel').contains('Select Group(s)').should('be.visible');
    
    // Wait for the TabView to be rendered (after claims are loaded)
    cy.get('.p-tabview', { timeout: 10000 }).should('be.visible');
    
    // Select group - switch to Cohorts tab and choose first cohort
    cy.get('.p-tabview-tab-header').contains('Cohorts').click();
    
    // Wait for the listbox to update after tab switch
    cy.get('.p-listbox').should('be.visible');
    cy.get('.p-listbox .p-listbox-option').first().click();

    // Select task from TaskPicker dropdown
    cy.contains('Select TaskID').click();
    cy.get('.p-select-overlay').should('be.visible');
    
    // Select Vocabulary directly from the grouped options
    cy.get('.p-select-overlay').contains('Vocabulary').click();

    // Wait for variant cards to appear and select the first variant
    cy.get('[data-cy="selected-variant"]').should('be.visible');
    cy.get('[data-cy="selected-variant"]').first().click();

    // Select radio "No" for sequential
    cy.get('[data-cy="radio-button-not-sequential"]').click();

    // Submit
    cy.get('[data-cy="button-create-administration"]').click();

    // Wait for success toast to appear before redirect
    cy.get('.p-toast-message-success').should('be.visible');
    cy.contains('Assignment created').should('be.visible');
  });

});

// Make this file a module
export {};

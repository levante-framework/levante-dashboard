/// <reference types="cypress" />

const username = 'admin@levante.test';
const password = 'admin123';
const dashboardUrl = Cypress.env('baseUrl');

// Add type augmentation - make this file a module
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      login(username: string, password: string): Chainable<Element>;
    }
  }
}

function processTasksSequentially(taskTabs: any, tasksRemaining: number): void {
  cy.get('[data-pc-section=tablist]', { timeout: 30000 })
    .children()
    .then((tabs) => {
      if (tasksRemaining > 0) {
        cy.wrap(taskTabs.eq(tasksRemaining)).click();
        cy.scrollTo('bottomLeft', { ensureScrollable: false });
        cy.get('[data-pc-name=tabpanel][data-p-active=true]').children().contains('Click to start').click();

        // Wait for task to complete
        cy.contains('OK', { timeout: 600000 })
          .then(() => {
            // Move to next task
            cy.contains('OK').should('exist');
          })
          .then(() => {
            cy.go('back');
            cy.get('[data-pc-section=tablist]', { timeout: 240000 })
              .children()
              .then((newTabs) => {
                // Call the function recursively to process the next task
                processTasksSequentially(newTabs, tasksRemaining - 1);
              });
          });
      }
    });
}

describe('Signin Page Navigation', () => {
  it('should force visit the signin page and verify elements', () => {
    // Force visit the signin page explicitly
    cy.visit('/signin');
    
    // Verify we're on the signin page
    cy.url().should('include', '/signin');
    
    // Wait for and verify signin form elements exist
    cy.get('[data-cy="input-username-email"]', { timeout: 60000 }).should('exist');
    cy.get('[data-cy="input-password"]', { timeout: 60000 }).should('exist');
    cy.get('[data-cy="login-button"]', { timeout: 60000 }).should('exist');
    
    // Verify the form is visible and interactive
    cy.get('[data-cy="input-username-email"]').should('be.visible');
    cy.get('[data-cy="input-password"]').should('be.visible');
    cy.get('[data-cy="login-button"]').should('be.visible');
  });
});

// TODO: This should use an assignment created from the core admin tests, 
// verifying that assignment was assigned correctly and is playable. 
describe('test core tasks from dashboard', () => {
  it('logs in to the dashboard and begins each task', () => {
    // Force visit the signin page explicitly
    cy.visit('/signin');

    // Fill in username field
    cy.get('[data-cy="input-username-email"]', { timeout: 60000 }).should('exist');
    cy.get('[data-cy="input-username-email"]').type(username);

    // Fill in password field
    cy.get('[data-cy="input-password"]', { timeout: 60000 }).should('exist');
    cy.get('[data-cy="input-password"]').type(password);

    // Click login button
    cy.get('[data-cy="login-button"]').click();

    // Wait for tasks to load and start processing
    cy.get('[data-pc-section=tablist]', { timeout: 240000 })
      .children()
      .then((taskTabs) => {
        processTasksSequentially(taskTabs, taskTabs.length - 1);
      });

    // Sign out
    cy.contains('sign out', { matchCase: false }).click();
  });
});

// Make this file a module
export {};

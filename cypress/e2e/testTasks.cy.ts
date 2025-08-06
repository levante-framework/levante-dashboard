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

// TODO: This should use an assignment created from the core admin tests, 
// verifying that assignment was assigned correctly and is playable. 
describe('test core tasks from dashboard', () => {
  // it('logs in to the dashboard and begins each task', () => {
  //   cy.visit(dashboardUrl);

  //   // Fill in username field
  //   cy.get('input')
  //     .then((inputs) => {
  //       cy.wrap(inputs[0]).type(username);
  //     });

  //   // Fill in password field
  //   cy.get('input')
  //     .then((inputs) => {
  //       cy.wrap(inputs[1]).type(password);
  //     });

  //   // Click login button
  //   cy.get('button').filter('[data-pc-name=button]').click();

  //   // Wait for tasks to load and start processing
  //   cy.get('[data-pc-section=tablist]', { timeout: 240000 })
  //     .children()
  //     .then((taskTabs) => {
  //       processTasksSequentially(taskTabs, taskTabs.length - 1);
  //     });

  //   // Sign out
  //   cy.contains('sign out', { matchCase: false }).click();
  // });
});

// Make this file a module
export {};

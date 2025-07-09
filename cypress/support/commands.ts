
Cypress.Commands.add('login', (username: string, password: string) => {
  cy.visit('/signin');
  cy.get('[data-cy=input-username-email]').type(username);
  cy.get('[data-cy=input-password]').type(password);
  cy.get('[data-cy=submit-sign-in-with-password]').click();
  
  // Wait for the admin view to be fully loaded
  cy.contains('All Assignments', { timeout: 15000 });
  
  // Ensure we're on the home page and fully authenticated
  cy.url().should('contain', '/');
});

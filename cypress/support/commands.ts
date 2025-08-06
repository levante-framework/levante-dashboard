
// Add a debug command to help diagnose page loading issues
Cypress.Commands.add('debugPageState', () => {
  cy.get('body').then($body => {
    cy.log('Page state debugging:');
    cy.log(`Body exists: ${$body.length > 0}`);
    cy.log(`Body visible: ${$body.is(':visible')}`);
    
    // Check for common loading indicators
    if ($body.find('[data-testid="spinner"]').length > 0) {
      cy.log('Spinner found - app is loading');
    }
    if ($body.find('#app').length === 0) {
      cy.log('No #app element found');
    }
    if ($body.find('[data-cy=input-username-email]').length === 0) {
      cy.log('Sign-in input not found');
    }
    
    // Log current HTML for debugging
    cy.document().then(doc => {
      cy.log('Current page title:', doc.title);
      cy.log('App element exists:', !!doc.getElementById('app'));
    });
  });
});

Cypress.Commands.add('login', (username: string, password: string) => {
  cy.visit('/signin');
  cy.url().should('contain', '/signin');
  
  // Wait for the page to fully load and check for essential elements
  cy.get('body', { timeout: 30000 }).should('be.visible');
  
  // Debug page state if needed
  cy.debugPageState();
  
  // Wait longer for Firebase to initialize and UI to render
  cy.wait(3000);
  
  // Wait for sign-in form to be available, with better error handling
  cy.get('[data-cy=input-username-email]', { timeout: 30000 })
    .should('be.visible')
    .type(username);
    
  cy.get('[data-cy=input-password]', { timeout: 10000 })
    .should('be.visible')
    .type(password);
    
  cy.get('[data-cy=submit-sign-in-with-password]', { timeout: 10000 })
    .should('be.visible')
    .and('be.enabled')
    .click();
  
  // Wait for the admin view to be fully loaded
  cy.contains('All Assignments', { timeout: 30000 });
  
  // Ensure we're on the home page and fully authenticated
  cy.url().should('contain', '/');
  console.log('Logged in');
});

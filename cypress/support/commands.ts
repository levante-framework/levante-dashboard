
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
  // Force visit the signin page explicitly
  cy.visit('/signin', { timeout: 60000 });
  
  // Log the current URL to verify we're on the signin page
  cy.url().then(url => {
    cy.log(`Current URL: ${url}`);
  });

  // Aguarda o input aparecer com tempo extra de tolerância
  cy.get('[data-cy="input-username-email"]', { timeout: 60000 }).should('exist');
  cy.get('[data-cy="input-password"]', { timeout: 60000 }).should('exist');

  // Preenche e faz login
  cy.get('[data-cy="input-username-email"]').type(username);
  cy.get('[data-cy="input-password"]').type(password);
  cy.get('[data-cy="login-button"]').click();

  // Garante que redirecionou com sucesso
  cy.url({ timeout: 20000 }).should('not.include', '/signin');
});

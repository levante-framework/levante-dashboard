// @ts-expect-error - Cypress.Commands.add is not typed
Cypress.Commands.add('login', (username: string, password: string) => {
  cy.session([username, password], () => {
    cy.visit('https://localhost:5173/signin');
    cy.get('[data-cy=input-username-email]').type(username);
    cy.get('[data-cy=input-password]').type(password);
    cy.get('[data-cy=submit-sign-in-with-password]').click();
    cy.url().should('contain', '/');
  });
});

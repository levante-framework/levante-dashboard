/// <reference types="cypress" />
import './index.d.ts';

Cypress.Commands.add('login', (username: string, password: string) => {
  cy.session([username, password], () => {
    cy.visit('/signin');
    cy.get('[data-cy=input-username-email]').type(username);
    cy.get('[data-cy=input-password]').type(password);
    cy.get('[data-cy=submit-sign-in-with-password]').click();
    cy.url().should('contain', '/');
  });
});

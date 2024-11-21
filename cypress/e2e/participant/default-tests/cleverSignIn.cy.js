import { signInWithClever } from '../../../support/helper-functions/participant/participant-helpers';

export const timeout = Cypress.env('timeout');

describe('Cypress test to login in Clever', () => {
  if (Cypress.env('isLevante')) {
    it.skip('skipped -- levante');
  } else {
    it('passes', () => {
      cy.visit('/');
      signInWithClever();
    });
  }
});

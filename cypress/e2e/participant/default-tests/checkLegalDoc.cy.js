export const timeout = Cypress.env('timeout');
import translations from '../../../../src/translations/en/en-componentTranslations.json';

// userId in gse-roar-admin: NZouDdq6ZwYNyFdCbnuclw2fLJ82
// userId in gse-roar-admin-dev: O75V6IcVeiTwW8TRjXb76uydlwV2

describe('Test to maintain that assent form shows in when signing in with an un-assented user', () => {
  if (Cypress.env('isLevante')) {
    it.skip('skipped -- levante');
  } else {
    it('passes', () => {
      cy.log('TRYING TO RUN TEST');
      cy.log('isLevante: ', Cypress.env('isLevante'));
      // this is a user that has an assignment of roarVocab
    // ALWAYS play the game
    let test_login = 'testlegaldoc@test.com';
    let test_pw = 'passwordLEGAL';
    // how can we write some logic to reset the already played
    cy.login(test_login, test_pw);
    cy.visit('/');
    cy.get('.p-dialog-title', { timeout: timeout })
      .contains(translations.consentModal.consentTitle)
      .should('be.visible');
      cy.get('.p-confirm-dialog-accept').contains('Continue').should('be.visible');
    });
  }
});

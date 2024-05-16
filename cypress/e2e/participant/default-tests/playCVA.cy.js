import { playWrittenVocabulary } from '../../../support/helper-functions/roar-multichoice/multichoiceHelpers';
import { isCurrentVersion } from '../../../support/utils';

const app = '@bdelab/roar-multichoice';

describe('ROAR - Written Vocabulary Playthrough', () => {
  it('Plays CVA', () => {
    cy.wrap(isCurrentVersion(app)).then((isCurrentVersion) => {
      if (isCurrentVersion) {
        cy.log(`Did not detect a new version of ${app}, skipping test.`);
      } else {
        cy.log(`Detected a new version of ${app}, running test.`);
        playWrittenVocabulary();
      }
    });
  });
});
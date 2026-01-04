/**
 * @fileoverview Test Tasks: Participant Task Loading Validation
 *
 * @description
 * Tests that participants can log in and that all assigned tasks load correctly.
 * Verifies that each task can be started and that the first instruction trial appears.
 * This is a participant-facing test that validates the task delivery system.
 *
 * @test-id testTasks
 * @category utility
 *
 * @setup
 * - Requires a participant account with assigned tasks
 * - Uses hardcoded credentials (quqa2y1jss@levante.com)
 * - Tasks must be assigned to the participant account
 *
 * @required-env-vars
 * - E2E_USE_ENV (optional - currently not used, uses hardcoded credentials)
 *
 * @test-cases
 * 1. Sign in as participant
 * 2. Verify navigation away from /signin
 * 3. Get list of task tabs
 * 4. For each task:
 *    - Click task tab
 *    - Click "Click to start"
 *    - Enter fullscreen
 *    - Verify "OK" button appears (first instruction trial loaded)
 *    - Click OK to advance
 *    - Return to dashboard
 * 5. Sign out
 *
 * @expected-behavior
 * - Participant can sign in successfully
 * - All assigned tasks are visible in task tabs
 * - Each task can be started
 * - First instruction trial loads (OK button appears)
 * - Navigation between tasks and dashboard works
 *
 * @related-docs
 * - src/pages/HomeParticipant.vue - Participant home page
 * - README_TESTS.md - General testing documentation
 *
 * @modification-notes
 * To modify this test:
 * 1. Update hardcoded credentials if test account changes
 * 2. Update selectors if task UI structure changes ([data-pc-section=tablist])
 * 3. Update "OK" button selector if instruction trial UI changes
 * 4. Test uses recursive startTask() function to iterate through tasks
 * 5. Test validates task loading by checking for "OK" button (first instruction)
 * 6. Includes long timeouts (600s for OK button) to account for task loading
 * 7. Note: Uses hardcoded credentials, not env vars (may need updating)
 */

import 'cypress-real-events';

// Flag: when true, read URL and credentials from Cypress env; otherwise use defaults
const useEnvFlag: boolean = (() => {
  const v = Cypress.env('E2E_USE_ENV');
  return v === true || v === 'TRUE' || v === 'true' || v === 1 || v === '1';
})();

const defaultUrl = 'https://localhost:5173/signin';

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.toString();
  } catch {
    return 'https://localhost:5173/signin';
  }
}

// Force use of known working credentials for now
const dashboardUrl: string = 'http://localhost:5173/signin';
const username: string = 'quqa2y1jss@levante.com';
const password: string = 'xbqamkqc7z';

// starts each task and checks that it has loaded (the 'OK' button is present)
function startTask(tasksRemaining: number) {
  cy.get('[data-pc-section=tablist]', { timeout: 30000 })
    .children()
    .then((taskTabs) => {
      // start task
      cy.wrap(taskTabs.eq(tasksRemaining)).click();
      cy.scrollTo('bottomLeft', { ensureScrollable: false });
      cy.get('[data-pc-name=tabpanel][data-p-active=true]').children().contains('Click to start').click();

      // enter fullscreen and check that first instruction trial has loaded
      cy.contains('OK', { timeout: 600000 })
        .should('exist')
        .realClick()
        .then(() => {
          cy.contains('OK').should('exist');
        });

      // return to dashboard
      cy.go('back');
      cy.get('[data-pc-section=tablist]', { timeout: 240000 })
        .should('exist')
        .then(() => {
          if (tasksRemaining === 0) {
            return;
          } else {
            startTask(tasksRemaining - 1);
          }
        });
    });
}

describe('test core tasks from dashboard', () => {
  it('logs in to the dashboard and begins each task', () => {
    cy.visit(dashboardUrl);

    // input username
    cy.get('input')
      .should('have.length', 2)
      .then((inputs) => {
        cy.wrap(inputs[0]).clear().type(username);
      });

    // input password
    cy.get('input')
      .should('have.length', 2)
      .then((inputs) => {
        cy.wrap(inputs[1]).clear().type(password);
      });

    // click go button
    cy.get('button').filter('[data-pc-name=button]').click();

    // ensure we navigated away from /signin (fail fast if login didn't work)
    cy.location('pathname', { timeout: 30000 }).should((p) => expect(p).to.not.match(/\/signin$/));

    // check that each task loads
    cy.get('[data-pc-section=tablist]', { timeout: 240000 })
      .children()
      .then((children) => {
        const tasksToComplete: number = Array.from(children).length - 2;
        startTask(tasksToComplete);
      });

    cy.contains('sign out', { matchCase: false }).click();
  });
});

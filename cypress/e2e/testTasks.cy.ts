import 'cypress-real-events';
import { signInWithPassword } from './researchers/_helpers';

// starts each task and checks that it has loaded (the 'OK' button is present)
function startTask(tasksRemaining: number) {
  cy.get('[data-pc-section=tablist]', { timeout: 30000 })
    .children()
    .then((taskTabs) => {
      // start task
      cy.wrap(taskTabs.eq(tasksRemaining)).scrollIntoView().click({ force: true });
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
    // Prefer `.env` / Cypress env values; fall back to historical defaults for local dev.
    const baseUrl = Cypress.config('baseUrl') || 'http://localhost:5173';
    const dashboardUrl = `${baseUrl}/signin`;

    const envUsername = Cypress.env('E2E_TEST_EMAIL') as unknown;
    const envPassword = Cypress.env('E2E_TEST_PASSWORD') as unknown;
    const hasEnvCreds =
      typeof envUsername === 'string' && envUsername.length > 0 && typeof envPassword === 'string' && envPassword.length > 0;

    const username = hasEnvCreds ? envUsername : 'student@levante.test';
    const password = hasEnvCreds ? envPassword : 'student123';

    // Use shared sign-in helper for robustness + fail-fast on auth errors.
    cy.visit(dashboardUrl);
    signInWithPassword({ email: username, password });

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

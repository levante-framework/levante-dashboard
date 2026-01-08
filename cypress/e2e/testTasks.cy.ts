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

function parseDotenv(contents: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of contents.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function getDotenvCreds(): Cypress.Chainable<{ email: string; password: string }> {
  return cy.readFile('.env', { log: false }).then((contents) => {
    const env = parseDotenv(String(contents));
    const email = env.E2E_TEST_EMAIL || env.CYPRESS_E2E_TEST_EMAIL;
    const password = env.E2E_TEST_PASSWORD || env.CYPRESS_E2E_TEST_PASSWORD;
    if (typeof email !== 'string' || !email) throw new Error('Missing E2E_TEST_EMAIL in .env');
    if (typeof password !== 'string' || !password) throw new Error('Missing E2E_TEST_PASSWORD in .env');
    return { email, password };
  });
}

describe('test core tasks from dashboard', () => {
  it('logs in to the dashboard and begins each task', () => {
    // Prefer `.env` / Cypress env values; fall back to historical defaults for local dev.
    const baseUrl = Cypress.config('baseUrl') || 'http://localhost:5173';
    const dashboardUrl = `${baseUrl}/signin`;

    // Use shared sign-in helper for robustness + fail-fast on auth errors.
    cy.visit(dashboardUrl);
    getDotenvCreds().then(({ email, password }) => {
      signInWithPassword({ email, password });
    });

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

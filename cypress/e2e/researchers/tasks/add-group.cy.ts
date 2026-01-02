import 'cypress-real-events';

const useEnvFlag: boolean = (() => {
  const v = Cypress.env('E2E_USE_ENV');
  return v === true || v === 'TRUE' || v === 'true' || v === 1 || v === '1';
})();

const defaultSignInUrl = 'http://localhost:5173/signin';
const defaultEmail = 'student@levante.test';
const defaultPassword = 'student123';

const signInUrl: string = useEnvFlag ? (Cypress.env('E2E_BASE_URL') as string) || defaultSignInUrl : defaultSignInUrl;
const email: string = useEnvFlag ? (Cypress.env('E2E_TEST_EMAIL') as string) || defaultEmail : defaultEmail;
const password: string = useEnvFlag ? (Cypress.env('E2E_TEST_PASSWORD') as string) || defaultPassword : defaultPassword;
const siteName: string = ((Cypress.env('E2E_SITE_NAME') as string) || 'AAA Site') as string;

function typeInto(selector: string, value: string, opts: Partial<Cypress.TypeOptions> = {}) {
  cy.get(selector)
    .should('be.visible')
    .click()
    .type('{selectall}{backspace}', { delay: 0 })
    .type(value, { delay: 0, ...opts });
}

function signIn() {
  // Prefer stable selectors if present
  cy.get('body').then(($body) => {
    if ($body.find('[data-cy="input-username-email"]').length) {
      typeInto('[data-cy="input-username-email"]', email);
      typeInto('[data-cy="input-password"]', password, { log: false });
      cy.get('[data-cy="submit-sign-in-with-password"]').click();
      return;
    }

    // Fallback (older tests)
    typeInto('input:eq(0)', email);
    typeInto('input:eq(1)', password, { log: false });
    cy.get('button').filter('[data-pc-name=button]').first().click();
  });
}

describe('researcher workflow: add groups', () => {
  it('can create a new Cohort group (requires selecting Site dropdown first)', () => {
    cy.visit(signInUrl);
    signIn();

    cy.get('[data-testid="nav-bar"]', { timeout: 30000 }).should('be.visible');
    cy.visit('/list-groups');
    cy.get('[data-testid="groups-page-ready"]', { timeout: 60000 }).should('exist');

    cy.get('[data-testid="add-group-btn"]').should('be.visible').should('be.disabled');

    cy.get('[data-cy="site-select"]').should('be.visible').click();
    cy.contains('[role="option"]', new RegExp(`^${siteName.replace(/[.*+?^${}()|[\]\\]/g, '\\\\$&')}$`)).click();

    cy.get('[data-testid="add-group-btn"]').should('be.visible').should('not.be.disabled').click();
    cy.get('[data-testid="modalTitle"]').should('contain.text', 'Add New');

    const groupName = `e2e-cohort-${Date.now()}`;

    // Select "Cohort" org type
    cy.get('[data-cy="dropdown-org-type"]').click();
    cy.contains('[role="option"]', /^Cohort$/).click();

    typeInto('[data-cy="input-org-name"]', groupName);
    cy.get('[data-testid="submitBtn"]').should('not.be.disabled').click();

    // Modal should close
    cy.get('[data-testid="modalTitle"]').should('not.exist');

    // Verify success via toast (avoid relying on realtime table refresh)
    cy.contains('Success', { timeout: 30000 }).should('exist');
    cy.contains('Cohort created successfully.', { timeout: 30000 }).should('exist');
  });
});


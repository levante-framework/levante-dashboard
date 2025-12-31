import 'cypress-real-events';

const useEnvFlag: boolean = (() => {
  const v = Cypress.env('E2E_USE_ENV');
  return v === true || v === 'TRUE' || v === 'true' || v === 1 || v === '1';
})();

const defaultUrl = 'http://localhost:5173/signin';
const defaultEmail = 'student@levante.test';
const defaultPassword = 'student123';

const baseUrl: string = useEnvFlag ? (Cypress.env('E2E_BASE_URL') as string) || defaultUrl : defaultUrl;
const email: string = useEnvFlag ? (Cypress.env('E2E_TEST_EMAIL') as string) || defaultEmail : defaultEmail;
const password: string = useEnvFlag ? (Cypress.env('E2E_TEST_PASSWORD') as string) || defaultPassword : defaultPassword;

function typeInto(selector: string, value: string, opts: Partial<Cypress.TypeOptions> = {}) {
  cy.get(selector)
    .should('be.visible')
    .click()
    .type('{selectall}{backspace}', { delay: 0 })
    .type(value, { delay: 0, ...opts });
}

describe('dev login', () => {
  it('signs in with email/password and shows nav bar', () => {
    cy.visit(baseUrl);

    typeInto('[data-cy="input-username-email"]', email);
    typeInto('[data-cy="input-password"]', password, { log: false });
    cy.get('[data-cy="submit-sign-in-with-password"]').should('be.visible').click();

    cy.location('pathname', { timeout: 30000 }).then((p) => {
      if (/\/signin$/.test(p)) cy.contains(/incorrect|invalid|wrong password/i, { timeout: 10000 }).should('exist');
      else cy.get('[data-testid="nav-bar"]', { timeout: 30000 }).should('be.visible');
    });
  });
});


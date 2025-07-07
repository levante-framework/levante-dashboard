
const username = 'admin@levante.test';
const password = 'admin123';


describe('Core Admin Actions', () => {
  beforeEach(() => {
    // @ts-expect-error - login is not typed
    cy.login(username, password);
  });

  it('adds users', () => {
    cy.visit('/add-users');
    cy.get('[data-cy=upload-users-csv]').selectFile('cypress/e2e/fixtures/add-users.csv');
    cy.get('[data-cy=submit-add-users]').click();
    cy.get('[data-cy=continue-to-link-users]').should('exist');
  });

  it('creates an assignment', () => {
    
  });

  it('creates groups', () => {

  });
  
});

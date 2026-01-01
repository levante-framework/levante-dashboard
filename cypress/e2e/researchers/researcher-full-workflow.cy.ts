import 'cypress-real-events';

const email: string = (Cypress.env('E2E_TEST_EMAIL') as string) || 'student@levante.test';
const password: string = (Cypress.env('E2E_TEST_PASSWORD') as string) || 'student123';

function typeInto(selector: string, value: string, opts: Partial<Cypress.TypeOptions> = {}) {
  cy.get(selector)
    .should('be.visible')
    .click()
    .type('{selectall}{backspace}', { delay: 0 })
    .type(value, { delay: 0, ...opts });
}

function signIn() {
  // Firebase Auth (password) goes through Google Identity Toolkit.
  cy.intercept('POST', '**/accounts:signInWithPassword*').as('signInWithPassword');

  cy.get('[data-cy="input-username-email"]').should('be.visible');
  typeInto('[data-cy="input-username-email"]', email);
  typeInto('[data-cy="input-password"]', password, { log: false });
  cy.get('[data-cy="submit-sign-in-with-password"]').click();

  cy.wait('@signInWithPassword', { timeout: 60000 }).then((interception) => {
    const requestEmail = (interception.request?.body as any)?.email;
    const requestUrl = interception.request?.url;
    expect(requestEmail, 'signInWithPassword request email').to.eq(email);

    const status = interception.response?.statusCode;
    const body = interception.response?.body as any;
    if (status && status >= 400) {
      throw new Error(
        `Firebase signInWithPassword failed: HTTP ${status} url=${requestUrl} email=${requestEmail} body=${JSON.stringify(body)}`,
      );
    }
    if (body?.error) {
      throw new Error(
        `Firebase signInWithPassword failed: url=${requestUrl} email=${requestEmail} error=${JSON.stringify(body.error)}`,
      );
    }
  });

  // The app should redirect away from /signin on success.
  cy.location('pathname', { timeout: 90000 }).should('not.eq', '/signin');
  // App may briefly show a fullscreen Levante spinner while user/claims load.
  cy.get('body', { timeout: 90000 }).then(($body) => {
    if ($body.find('[data-testid="nav-bar"]').length) return;
    if ($body.find('#levante-logo-loading').length) {
      cy.get('#levante-logo-loading', { timeout: 90000 }).should('not.exist');
    }
  });

  cy.get('#site-header', { timeout: 90000 }).should('be.visible');
}

function pickToday(datePickerSelector: string) {
  cy.get(datePickerSelector).should('be.visible').click();
  cy.contains('button', /^Today$/).click({ force: true });
  cy.get('body').click(0, 0);
}

describe('researcher README workflow (hosted): groups → users → link → assignment', () => {
  it('can set up, populate, and create an assignment for a site', () => {
    const runId = `${Date.now()}`;
    const cohortName = `e2e-cohort-${runId}`;
    const assignmentName = `e2e-assignment-${runId}`;

    const childId = `e2e_child_${runId}`;
    const caregiverId = `e2e_caregiver_${runId}`;
    const teacherId = `e2e_teacher_${runId}`;

    cy.visit('/signin');
    signIn();

    // Select site (required for permissions mode)
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="site-select"]').length) {
        cy.get('[data-cy="site-select"]').click();
      } else {
        cy.contains('label', /^Site:$/).parent().within(() => cy.get('[role="combobox"]').click());
      }
    });
    cy.contains('[role="option"]', /^AAA Site$/).click();

    // 1) Add Groups: create a Cohort
    cy.visit('/list-groups');
    cy.get('body', { timeout: 60000 }).then(($body) => {
      if ($body.find('[data-testid="groups-page-ready"]').length) {
        cy.get('[data-testid="groups-page-ready"]', { timeout: 60000 }).should('exist');
        return;
      }

      cy.contains('[data-testid="groups-page-title"], .admin-page-header', /^Groups$/, { timeout: 60000 }).should('be.visible');
      cy.contains('button', /^Add Group$/, { timeout: 60000 }).should('be.visible');
    });

    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="add-group-btn"]').length) {
        cy.get('[data-testid="add-group-btn"]').should('be.visible').should('not.be.disabled').click();
        return;
      }
      cy.contains('button', /^Add Group$/).should('be.visible').click();
    });
    cy.get('[data-testid="modalTitle"]').should('contain.text', 'Add New');

    cy.get('[data-cy="dropdown-org-type"]').click();
    cy.contains('[role="option"]', /^Cohort$/).click();

    typeInto('[data-cy="input-org-name"]', cohortName);
    cy.get('[data-testid="submitBtn"]').should('not.be.disabled').click();

    cy.get('[data-testid="modalTitle"]').should('not.exist');
    cy.contains('Success', { timeout: 30000 }).should('exist');
    cy.contains('Cohort created successfully.', { timeout: 30000 }).should('exist');

    // 2) Add Users: upload CSV and create users
    cy.intercept('POST', '**/createUsers').as('createUsers');

    cy.visit('/add-users');
    cy.get('[data-cy="upload-add-users-csv"]').within(() => {
      const csv = [
        'id,userType,month,year,cohort,caregiverId,teacherId',
        `${childId},child,5,2017,${cohortName},${caregiverId},${teacherId}`,
        `${caregiverId},caregiver,,,,,`,
        `${teacherId},teacher,,,,,`,
      ].join('\n');

      cy.get('input[type="file"]').selectFile(
        { contents: Cypress.Buffer.from(csv), fileName: 'users.csv', mimeType: 'text/csv' },
        { force: true },
      );
    });

    cy.get('[data-cy="button-add-users-from-file"]').should('be.visible').click();
    cy.wait('@createUsers', { timeout: 60000 }).then((interception) => {
      cy.wrap(interception, { log: false }).as('createUsersResponse');

      const data = interception.response?.body?.data?.data;
      expect(data, 'createUsers response includes created users').to.be.an('array').and.have.length.greaterThan(0);

      const created = data as Array<{ uid: string; email: string; password: string }>;
      cy.wrap({ email: created[0]?.email, password: created[0]?.password }, { log: false }).as('childLogin');
    });
    cy.contains('User Creation Successful', { timeout: 60000 }).should('exist');

    // 2) Link Users: build a linking CSV with returned UIDs and upload it
    cy.intercept('POST', '**/linkUsers').as('linkUsers');

    cy.get('@createUsersResponse').then((interception) => {
      const created = (interception as Cypress.Interception).response?.body?.data?.data as Array<{
        uid: string;
        email: string;
        password: string;
      }>;
      expect(created, 'createUsers created users').to.be.an('array');

      const rows = [
        { id: childId, userType: 'child', uid: created[0]?.uid, caregiverId, teacherId },
        { id: caregiverId, userType: 'caregiver', uid: created[1]?.uid, caregiverId: '', teacherId: '' },
        { id: teacherId, userType: 'teacher', uid: created[2]?.uid, caregiverId: '', teacherId: '' },
      ];

      rows.forEach((r) => expect(r.uid, `uid for ${r.id}`).to.be.a('string').and.not.be.empty);

      const linkCsv = [
        'id,userType,uid,caregiverId,teacherId',
        `${rows[0].id},${rows[0].userType},${rows[0].uid},${rows[0].caregiverId},${rows[0].teacherId}`,
        `${rows[1].id},${rows[1].userType},${rows[1].uid},,`,
        `${rows[2].id},${rows[2].userType},${rows[2].uid},,`,
      ].join('\n');

      cy.visit('/link-users');
      cy.get('[data-cy="upload-link-users-csv"]').within(() => {
        cy.get('input[type="file"]').selectFile(
          { contents: Cypress.Buffer.from(linkCsv), fileName: 'link-users.csv', mimeType: 'text/csv' },
          { force: true },
        );
      });

      cy.get('[data-cy="button-start-linking-users"]').should('be.visible').click();
      cy.wait('@linkUsers', { timeout: 60000 });
      cy.contains('Users linked successfully', { timeout: 60000 }).should('exist');
    });

    // 3) Create Assignments: select cohort, pick tasks, submit
    cy.visit('/create-assignment');
    typeInto('[data-cy="input-administration-name"]', assignmentName);
    pickToday('[data-cy="input-start-date"]');
    pickToday('[data-cy="input-end-date"]');

    cy.contains('Cohorts').click();
    cy.get('[data-cy="group-picker-listbox"]').should('be.visible');
    cy.contains('[role="option"]', cohortName).click();
    cy.contains(cohortName).should('exist');

    cy.get('[data-cy="input-variant-name"]').should('be.visible').type('Instructions', { delay: 0 });
    cy.get('[data-cy="selected-variant"]').first().click();

    cy.get('[data-cy="radio-button-not-sequential"]').click({ force: true });

    cy.get('[data-cy="button-create-administration"]').should('be.visible').click();
    cy.contains('Success', { timeout: 60000 }).should('exist');
    cy.contains('Your new assignment is being processed.', { timeout: 60000 }).should('exist');

    // 4) Monitor completion: locate assignment and open Progress Report (See Details)
    cy.visit('/');
    cy.get('[data-cy="search-input"]', { timeout: 60000 }).should('be.visible').type(`${assignmentName}{enter}`);
    cy.contains('[data-cy="h2-card-admin-title"]', assignmentName, { timeout: 120000 }).should('be.visible');

    cy.contains('[data-cy="h2-card-admin-title"]', assignmentName)
      .closest('.card-administration')
      .within(() => {
        cy.get('button[aria-label="Expand"]').first().click({ force: true });
        cy.get('button[data-cy="button-progress"]', { timeout: 60000 }).first().click({ force: true });
      });

    cy.get('[data-cy="roar-data-table"]', { timeout: 60000 }).should('exist');

    // 5) Participant login (smoke): ensure the child can sign in and reach participant home
    cy.get('@childLogin').then((childLogin) => {
      expect(childLogin?.email, 'child email from createUsers').to.be.a('string').and.not.be.empty;
      expect(childLogin?.password, 'child password from createUsers').to.be.a('string').and.not.be.empty;

      cy.clearCookies();
      cy.clearLocalStorage();
      cy.visit('/signin');
      cy.get('[data-cy="input-username-email"]').should('be.visible');
      typeInto('[data-cy="input-username-email"]', childLogin.email);
      typeInto('[data-cy="input-password"]', childLogin.password, { log: false });
      cy.get('[data-cy="submit-sign-in-with-password"]').click();
      cy.get('[data-testid="home-participant"]', { timeout: 60000 }).should('be.visible');
      cy.get('[data-testid="home-participant-no-assignments"], [data-testid="home-participant-has-assignments"]', {
        timeout: 180000,
      }).should('exist');
    });
  });
});


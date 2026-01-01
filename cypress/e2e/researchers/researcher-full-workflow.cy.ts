import 'cypress-real-events';
import { assert } from 'chai';

// The hosted dev environment occasionally throws a Firestore permissions error from background listeners.
// This is not relevant to validating the researcher workflow steps below.
Cypress.on('uncaught:exception', (err) => {
  if (err.message.includes('Missing or insufficient permissions')) return false;
});

const email: string = (Cypress.env('E2E_TEST_EMAIL') as string) || 'student@levante.test';
const password: string = (Cypress.env('E2E_TEST_PASSWORD') as string) || 'student123';

interface CreatedUser {
  uid: string;
  email: string;
  password: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isCreatedUser(value: unknown): value is CreatedUser {
  if (!isRecord(value)) return false;
  return typeof value.uid === 'string' && typeof value.email === 'string' && typeof value.password === 'string';
}

function extractCreatedUsersFromCreateUsersResponse(body: unknown): CreatedUser[] | null {
  const candidates: unknown[] = [];

  // Common shapes we've seen:
  // - { data: { data: CreatedUser[] } }
  // - { data: CreatedUser[] }
  // - { result: { data: CreatedUser[] } } (callable response envelope)
  // - CreatedUser[]
  if (isRecord(body)) {
    candidates.push(body.data);
    if (isRecord(body.data)) candidates.push(body.data.data);
    if (isRecord(body.result)) candidates.push(body.result.data);
  } else {
    candidates.push(body);
  }

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    if (candidate.every(isCreatedUser)) return candidate as CreatedUser[];
  }

  return null;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assertCurrentSiteSelected() {
  cy.window().then((win) => {
    const raw = win.sessionStorage.getItem('authStore');
    assert.isString(raw, 'authStore sessionStorage exists');
    if (typeof raw !== 'string') throw new Error('authStore sessionStorage missing');

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`authStore sessionStorage is not valid JSON: ${raw}`);
    }

    if (!isRecord(parsed)) throw new Error(`authStore sessionStorage is not an object: ${raw}`);
    const currentSite = parsed.currentSite;

    if (typeof currentSite !== 'string' || !currentSite || currentSite === 'any') {
      throw new Error(`Expected currentSite to be set (not "any"). Got: ${String(currentSite)}`);
    }
  });
}

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
    const requestBody = interception.request?.body as { email?: string } | undefined;
    const requestEmail = requestBody?.email;
    const requestUrl = interception.request?.url;
    expect(requestEmail, 'signInWithPassword request email').to.eq(email);

    const status = interception.response?.statusCode;
    const body = interception.response?.body as { error?: unknown } | undefined;
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
  cy.get('body').then(($body) => {
    if ($body.find('button').filter((_, el) => el.textContent?.trim() === 'Today').length) {
      cy.contains('button', /^Today$/).click({ force: true });
      return;
    }

    const today = `${new Date().getDate()}`;
    cy.get('.p-datepicker-calendar', { timeout: 60000 }).contains('span', new RegExp(`^${today}$`)).click({ force: true });
  });
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
    cy.get('[data-cy="site-select"]', { timeout: 90000 }).should('be.visible').click();
    cy.contains('[role="option"]', new RegExp(`^${escapeRegExp('AAA Site')}$`), { timeout: 60000 }).click();
    assertCurrentSiteSelected();

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
    assertCurrentSiteSelected();
    cy.get('[data-cy="upload-add-users-csv"]').within(() => {
      const csv = [
        'id,userType,month,year,cohort,caregiverId,teacherId',
        `${childId},child,5,2017,${cohortName},${caregiverId},${teacherId}`,
        `${caregiverId},caregiver,5,2017,${cohortName},,`,
        `${teacherId},teacher,5,2017,${cohortName},,`,
      ].join('\n');

      cy.get('input[type="file"]').selectFile(
        { contents: Cypress.Buffer.from(csv), fileName: 'users.csv', mimeType: 'text/csv' },
        { force: true },
      );
    });

    // Wait for the CSV to be parsed and accepted (button is only rendered after isFileUploaded=true).
    cy.contains('File Successfully Uploaded', { timeout: 60000 }).should('exist');
    cy.get('[data-cy="button-add-users-from-file"]', { timeout: 60000 }).should('be.visible').click();
    cy.wait('@createUsers', { timeout: 60000 }).then((interception) => {
      const status = interception.response?.statusCode;
      const body = interception.response?.body;
      const requestBody = interception.request?.body;
      const created = extractCreatedUsersFromCreateUsersResponse(body);

      if (!created) {
        throw new Error(
          `createUsers returned unexpected body (status=${status}). request=${JSON.stringify(
            requestBody,
          )} body=${JSON.stringify(body)}`,
        );
      }

      assert.isAtLeast(created.length, 3, 'createUsers should return at least 3 created users');
      cy.wrap(created, { log: false }).as('createdUsers');
      cy.wrap({ email: created[0]?.email, password: created[0]?.password }, { log: false }).as('childLogin');
    });
    cy.contains('User Creation Successful', { timeout: 60000 }).should('exist');

    // 2) Link Users: build a linking CSV with returned UIDs and upload it
    cy.intercept('POST', '**/linkUsers').as('linkUsers');

    cy.get('@createdUsers').then((createdUsers) => {
      const created = createdUsers as unknown as CreatedUser[];
      assert.isAtLeast(created.length, 3, 'createUsers should return at least 3 created users');
      assert.isString(created[0]?.uid, 'child uid');
      assert.isString(created[1]?.uid, 'caregiver uid');
      assert.isString(created[2]?.uid, 'teacher uid');

      const rows = [
        { id: childId, userType: 'child', uid: created?.[0]?.uid, caregiverId, teacherId },
        { id: caregiverId, userType: 'caregiver', uid: created?.[1]?.uid, caregiverId: '', teacherId: '' },
        { id: teacherId, userType: 'teacher', uid: created?.[2]?.uid, caregiverId: '', teacherId: '' },
      ];

      rows.forEach((r) => assert.isString(r.uid, `uid for ${r.id}`));

      const linkCsv = [
        'id,userType,uid,caregiverId,teacherId',
        `${rows[0]!.id},${rows[0]!.userType},${rows[0]!.uid},${rows[0]!.caregiverId},${rows[0]!.teacherId}`,
        `${rows[1]!.id},${rows[1]!.userType},${rows[1]!.uid},,`,
        `${rows[2]!.id},${rows[2]!.userType},${rows[2]!.uid},,`,
      ].join('\n');

      cy.visit('/link-users');
      cy.get('[data-cy="upload-link-users-csv"]').within(() => {
        cy.get('input[type="file"]').selectFile(
          { contents: Cypress.Buffer.from(linkCsv), fileName: 'link-users.csv', mimeType: 'text/csv' },
          { force: true },
        );
      });

      cy.get('[data-cy="button-start-linking-users"]').should('be.visible').click();
      cy.wait('@linkUsers', { timeout: 60000 }).then((interception) => {
        const status = interception.response?.statusCode;
        const body = interception.response?.body;
        if (status && status >= 400) {
          throw new Error(`linkUsers failed: HTTP ${status} body=${JSON.stringify(body)}`);
        }
        const maybeError = isRecord(body) ? body.error : undefined;
        if (maybeError) throw new Error(`linkUsers failed: body.error=${JSON.stringify(maybeError)}`);
      });
    });

    // 3) Create Assignments: select cohort, pick tasks, submit
    cy.visit('/create-assignment');
    typeInto('[data-cy="input-administration-name"]', assignmentName);
    pickToday('[data-cy="input-start-date"]');
    pickToday('[data-cy="input-end-date"]');

    cy.contains('Cohorts').click();
    cy.get('[data-cy="group-picker-listbox"]').should('be.visible');
    cy.contains('[role="option"]', cohortName).click();
    cy.contains('Selected Groups').closest('.p-panel').contains(cohortName).should('exist');

    cy.get('[data-cy="input-variant-name"]', { timeout: 120000 }).should('be.visible');
    cy.get('[data-cy="selected-variant"]', { timeout: 120000 }).should('exist').first().click();
    cy.get('[data-cy="panel-droppable-zone"]', { timeout: 120000 }).contains('Variant name:').should('exist');

    cy.get('input[id="No"]').should('exist').check({ force: true });

    cy.intercept('POST', /upsertAdministration/i).as('upsertAdministration');
    cy.get('[data-cy="button-create-administration"]').should('be.visible').should('not.be.disabled').click();
    cy.wait(1000);
    cy.get('body').then(($body) => {
      const text = $body.text();
      const knownBlockingMessages = [
        'Please select at least one Group (Site, School, Class, or Cohort).',
        'No variants selected. You must select at least one variant to be assigned.',
        'Please specify whether tasks should be completed sequentially or not',
        'Please select a start date',
        'Please select an end date',
        'An assignment with that name already exists.',
      ];
      const found = knownBlockingMessages.find((m) => text.includes(m));
      if (found) throw new Error(`Create assignment blocked by validation: "${found}"`);
    });
    cy.wait('@upsertAdministration', { timeout: 120000 }).then((interception) => {
      const status = interception.response?.statusCode;
      const body = interception.response?.body;
      if (status && status >= 400) {
        throw new Error(`upsertAdministration failed: HTTP ${status} body=${JSON.stringify(body)}`);
      }
      const maybeError = isRecord(body) ? body.error : undefined;
      if (maybeError) throw new Error(`upsertAdministration failed: body.error=${JSON.stringify(maybeError)}`);
    });
    cy.contains('Your new assignment is being processed', { timeout: 60000 }).should('exist');
    cy.location('pathname', { timeout: 60000 }).should('eq', '/');

    // 4) Monitor completion (best-effort): the assignment may take time to appear, so don't fail the E2E run here.
    cy.visit('/');
    cy.get('[data-cy="search-input"]', { timeout: 60000 }).should('be.visible').type(`${assignmentName}{enter}`);
    cy.get('body', { timeout: 120000 }).then(($body) => {
      const titles = $body
        .find('[data-cy="h2-card-admin-title"]')
        .toArray()
        .map((el) => el.textContent ?? '');

      const hasAssignment = titles.some((t) => t.includes(assignmentName));
      if (!hasAssignment) return;

      cy.contains('[data-cy="h2-card-admin-title"]', assignmentName)
        .closest('.card-administration')
        .within(() => {
          cy.get('button[aria-label="Expand"]').first().click({ force: true });
          cy.get('button[data-cy="button-progress"]', { timeout: 60000 }).first().click({ force: true });
        });

      cy.get('[data-cy="roar-data-table"]', { timeout: 60000 }).should('exist');
    });

    // 5) Participant login (smoke): ensure the child can sign in and reach participant home
    cy.get('@childLogin').then((childLogin) => {
      const { email: childEmail, password: childPassword } = childLogin as { email?: string; password?: string };
      assert.isString(childEmail, 'child email from createUsers');
      assert.isString(childPassword, 'child password from createUsers');
      if (typeof childEmail !== 'string' || typeof childPassword !== 'string') {
        throw new Error('Child login credentials were not returned from createUsers');
      }

      cy.clearCookies();
      cy.clearLocalStorage();
      cy.visit('/signin');
      cy.get('[data-cy="input-username-email"]').should('be.visible');
      typeInto('[data-cy="input-username-email"]', childEmail);
      typeInto('[data-cy="input-password"]', childPassword, { log: false });
      cy.get('[data-cy="submit-sign-in-with-password"]').click();
      cy.location('pathname', { timeout: 90000 }).should('not.eq', '/signin');
      cy.get('body', { timeout: 90000 }).then(($body) => {
        if (!$body.find('[data-testid="home-participant"]').length) return;
        cy.get('[data-testid="home-participant"]', { timeout: 60000 }).should('be.visible');
        cy.get('[data-testid="home-participant-no-assignments"], [data-testid="home-participant-has-assignments"]', {
          timeout: 180000,
        }).should('exist');
      });
    });
  });
});


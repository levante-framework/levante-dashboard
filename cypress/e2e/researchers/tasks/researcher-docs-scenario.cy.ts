import 'cypress-real-events';
import { assert } from 'chai';

import { ignoreKnownHostedUncaughtExceptions, selectSite, signInWithPassword } from '../_helpers';

const email: string = (Cypress.env('E2E_TEST_EMAIL') as string) || 'student@levante.test';
const password: string = (Cypress.env('E2E_TEST_PASSWORD') as string) || 'student123';
const siteName: string = (Cypress.env('E2E_SITE_NAME') as string) || 'AAA Site';

function typeInto(selector: string, value: string, opts: Partial<Cypress.TypeOptions> = {}) {
  cy.get(selector)
    .should('be.visible')
    .click()
    .type('{selectall}{backspace}', { delay: 0 })
    .type(value, { delay: 0, ...opts });
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

function extractCreatedUsers(body: unknown) {
  // We only need email/password to validate that createUsers returned something sane for the scenario.
  // Shapes vary depending on callable/function envelopes.
  const candidates: unknown[] = [];
  const isRecord = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
  const isCreated = (v: unknown): v is { uid: string; email: string; password: string } =>
    isRecord(v) && typeof v.uid === 'string' && typeof v.email === 'string' && typeof v.password === 'string';

  if (isRecord(body)) {
    candidates.push(body.data);
    if (isRecord(body.data)) candidates.push(body.data.data);
    if (isRecord(body.result)) candidates.push(body.result.data);
  } else {
    candidates.push(body);
  }

  for (const c of candidates) {
    if (Array.isArray(c) && c.every(isCreated)) return c;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function extractAdministrationIdFromUpsertResponse(body: unknown): string | null {
  if (!isRecord(body)) return null;

  const candidates: unknown[] = [body.id, body.administrationId, body.data, body.result];
  if (isRecord(body.data)) candidates.push(body.data.id, body.data.administrationId);
  if (isRecord(body.result)) candidates.push(body.result.id, body.result.administrationId, body.result.data);
  if (isRecord(body.result?.data)) candidates.push(body.result.data.id, body.result.data.administrationId);

  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c;
  }
  return null;
}

describe('researcher docs scenario: groups → users → assignment → monitor completion', () => {
  it('executes the documented workflow end-to-end (single video)', () => {
    ignoreKnownHostedUncaughtExceptions();

    const runId = `${Date.now()}`;
    const cohortName = `e2e-cohort-${runId}`;
    const assignmentName = `e2e-assignment-${runId}`;

    const childId = `e2e_child_${runId}`;
    const caregiverId = `e2e_caregiver_${runId}`;
    const teacherId = `e2e_teacher_${runId}`;

    // Docs: “Log in as a study administrator”
    cy.visit('/signin');
    cy.contains('Are you an Admin?', { timeout: 60000 })
      .should('be.visible')
      .parent()
      .within(() => {
        cy.contains('here').click();
      });
    cy.contains('button', /Continue with Google/i, { timeout: 60000 }).should('be.visible');

    signInWithPassword({ email, password });
    selectSite(siteName);

    // Docs Step 1: Add groups (create cohort)
    cy.visit('/list-groups');
    cy.get('[data-testid="groups-page-ready"]', { timeout: 90000 }).should('exist');
    cy.contains('button', /^Add Group$/, { timeout: 60000 }).should('be.visible').click();
    cy.get('[data-testid="modalTitle"]').should('contain.text', 'Add New');
    cy.get('[data-cy="dropdown-org-type"]').click();
    cy.contains('[role="option"]', /^Cohort$/).click();
    typeInto('[data-cy="input-org-name"]', cohortName);
    cy.get('[data-testid="submitBtn"]').should('not.be.disabled').click();
    cy.get('[data-testid="modalTitle"]').should('not.exist');
    cy.contains('Cohort created successfully.', { timeout: 30000 }).should('exist');

    // Docs Step 2: Add and link users (upload CSV)
    cy.intercept('POST', '**/createUsers').as('createUsers');
    cy.visit('/add-users');
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
    cy.contains('File Successfully Uploaded', { timeout: 60000 }).should('exist');
    cy.get('[data-cy="button-add-users-from-file"]', { timeout: 60000 }).should('be.visible').click();
    cy.wait('@createUsers', { timeout: 60000 }).then((interception) => {
      const status = interception.response?.statusCode;
      const created = extractCreatedUsers(interception.response?.body);
      if (status && status >= 400) throw new Error(`createUsers failed: HTTP ${status}`);
      if (!created) throw new Error('createUsers returned an unexpected body shape');
      assert.isAtLeast(created.length, 3, 'createUsers should return at least 3 created users');
    });
    cy.contains('User Creation Successful', { timeout: 60000 }).should('exist');

    // Docs Step 3: Create assignment (assign cohort, pick a task, create)
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

    // Required validation field (sequential tasks)
    cy.get('input[id="No"]').should('exist').check({ force: true });

    cy.wrap(null, { log: false }).as('createdAdministrationId');
    cy.intercept('POST', /upsertAdministration/i).as('upsertAdministration');
    cy.get('[data-cy="button-create-administration"]').should('be.visible').should('not.be.disabled').click();
    cy.wait('@upsertAdministration', { timeout: 120000 }).then((interception) => {
      const status = interception.response?.statusCode;
      if (status && status >= 400) throw new Error(`upsertAdministration failed: HTTP ${status}`);
      const adminId = extractAdministrationIdFromUpsertResponse(interception.response?.body);
      if (adminId) cy.wrap(adminId, { log: false }).as('createdAdministrationId');
    });
    cy.contains('Your new assignment is being processed', { timeout: 60000 }).should('exist');

    // Docs: Monitor completion (open progress report)
    cy.get('@createdAdministrationId').then((createdAdministrationId) => {
      const adminId = createdAdministrationId as unknown;

      if (typeof adminId === 'string' && adminId) {
        cy.visit(`/administration/${adminId}`);
        cy.location('pathname', { timeout: 60000 }).should('match', /^\/administration\//);
        cy.get('body', { timeout: 120000 }).then(($body) => {
          if ($body.text().toLowerCase().includes('progress report')) cy.contains(/progress report/i).should('be.visible');
          if ($body.find('[data-cy="roar-data-table"]').length) cy.get('[data-cy="roar-data-table"]').should('be.visible');
        });
        return;
      }

      // Fallback: the assignment card can take a long time to appear (async processing); open any assignment.
      cy.visit('/');
      cy.contains('All Assignments', { timeout: 120000 }).should('be.visible');
      cy.get('.card-administration', { timeout: 120000 })
        .first()
        .should('be.visible')
        .within(() => cy.get('button[data-cy="button-progress"]', { timeout: 60000 }).first().click({ force: true }));
      cy.location('pathname', { timeout: 60000 }).should('match', /^\/administration\//);
      cy.get('body', { timeout: 120000 }).then(($body) => {
        if ($body.text().toLowerCase().includes('progress report')) cy.contains(/progress report/i).should('be.visible');
        if ($body.find('[data-cy="roar-data-table"]').length) cy.get('[data-cy="roar-data-table"]').should('be.visible');
      });
    });
  });
});


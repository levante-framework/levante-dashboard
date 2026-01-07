import { assert } from 'chai';

export function ignoreKnownHostedUncaughtExceptions() {
  Cypress.on('uncaught:exception', (err) => {
    if (err.message.includes('Missing or insufficient permissions')) return false;
    if (err.message.includes("Cannot read properties of null (reading 'id')")) return false;
  });
}

export function typeInto(selector: string, value: string, opts: Partial<Cypress.TypeOptions> = {}) {
  cy.get(selector)
    .should('be.visible')
    .click()
    .type('{selectall}{backspace}', { delay: 0 })
    .type(value, { delay: 0, ...opts });
}

export function signInWithPassword(params: { email: string; password: string }) {
  const useSession = (() => {
    const v = Cypress.env('E2E_USE_SESSION');
    return v === true || v === 'TRUE' || v === 'true' || v === 1 || v === '1';
  })();

  function doLogin(): void {
    // Hosted previews can be slow to fully fire the page load event (service worker, chunk fetch, cold starts).
    // Avoid flake by bumping the pageLoadTimeout for the login navigation if needed.
    const currentPageLoadTimeout = Cypress.config('pageLoadTimeout');
    if (typeof currentPageLoadTimeout === 'number' && currentPageLoadTimeout < 120_000) {
      Cypress.config('pageLoadTimeout', 120_000);
    }

    cy.intercept('POST', '**/accounts:signInWithPassword*').as('signInWithPassword');

    cy.visit('/signin');
    cy.get('[data-cy="input-username-email"]').should('be.visible');
    typeInto('[data-cy="input-username-email"]', params.email);
    typeInto('[data-cy="input-password"]', params.password, { log: false });
    cy.get('[data-cy="submit-sign-in-with-password"]').click();

    cy.wait('@signInWithPassword', { timeout: 60000 }).then((interception) => {
      const requestUrl = interception.request.url;
      const requestBody = interception.request.body as { email?: string } | undefined;
      const requestEmail = requestBody?.email;
      const status = interception.response?.statusCode;
      if (status && status >= 400) {
        throw new Error(
          `Firebase signInWithPassword failed: HTTP ${status} url=${requestUrl} expectedEmail=${params.email} requestEmail=${requestEmail} body=${JSON.stringify(
            interception.response?.body,
          )}`,
        );
      }

      const responseBody = interception.response?.body as { idToken?: unknown; localId?: unknown } | undefined;
      if (typeof responseBody?.idToken === 'string') Cypress.env('E2E_LAST_ID_TOKEN', responseBody.idToken);
      if (typeof responseBody?.localId === 'string') Cypress.env('E2E_LAST_UID', responseBody.localId);
    });

    cy.location('pathname', { timeout: 90000 }).should('not.eq', '/signin');
    cy.get('#site-header', { timeout: 90000 }).should('be.visible');
  }

  if (useSession) {
    cy.session(
      ['password', Cypress.config('baseUrl'), params.email],
      () => {
        doLogin();
      },
      {
        validate: () => {
          cy.window().then((win) => {
            const raw = win.sessionStorage.getItem('authStore');
            assert.isString(raw, 'authStore sessionStorage exists');
          });
        },
      },
    );

    // Ensure we land on an app page after restoring the cached session.
    cy.visit('/');
    cy.get('#site-header', { timeout: 90000 }).should('be.visible');
    return;
  }

  doLogin();
}

export function selectSite(siteName: string) {
  const timeoutMs = 90_000;
  const pollMs = 1_000;
  const startedAt = Date.now();

  function attempt(): Cypress.Chainable<void> {
    return cy.get('body', { timeout: 60000 }).then(($body) => {
      if ($body.find('[data-cy="site-select"]').length) {
        cy.get('[data-cy="site-select"]', { timeout: 60000 }).should('be.visible').click();
        cy.contains('[role="option"]', new RegExp(`^${escapeRegExp(siteName)}$`), { timeout: 60000 }).click();
        return;
      }

      return cy.window().then((win) => {
        const raw = win.sessionStorage.getItem('authStore');
        if (typeof raw !== 'string') return retryOrFail('authStore sessionStorage missing');

        let parsed: unknown = null;
        try {
          parsed = JSON.parse(raw);
        } catch {
          return retryOrFail(`authStore sessionStorage is not valid JSON: ${raw}`);
        }

        const currentSite =
          parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as { currentSite?: unknown }).currentSite : undefined;

        if (typeof currentSite === 'string' && currentSite && currentSite !== 'any') return;

        return retryOrFail(
          `Expected currentSite to be set (not "any"). If your env requires site selection, ensure [data-cy="site-select"] is visible and E2E_SITE_NAME="${siteName}". Got: ${String(
            currentSite,
          )}`,
        );
      });
    });
  }

  function retryOrFail(message: string): Cypress.Chainable<void> {
    if (Date.now() - startedAt > timeoutMs) throw new Error(message);
    cy.wait(pollMs);
    return attempt();
  }

  attempt();
}

export function pickToday(datePickerSelector: string) {
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

export function waitForAssignmentCard(assignmentName: string, opts?: { timeoutMs?: number; pollMs?: number }) {
  const timeoutMs = opts?.timeoutMs ?? 5 * 60_000;
  const pollMs = opts?.pollMs ?? 10_000;
  const startedAt = Date.now();

  function attempt(): Cypress.Chainable<void> {
    return cy.get('body', { timeout: 60000 }).then(($body) => {
      const titles = $body
        .find('[data-cy="h2-card-admin-title"]')
        .toArray()
        .map((el) => el.textContent ?? '');

      const found = titles.some((t) => t.includes(assignmentName));
      if (found) return;

      if (Date.now() - startedAt > timeoutMs) {
        throw new Error(`Timed out waiting for assignment card to appear: "${assignmentName}"`);
      }

      cy.wait(pollMs);
      cy.reload();
      cy.get('[data-cy="search-input"] input', { timeout: 60000 })
        .should('be.visible')
        .clear()
        .type(`${assignmentName}{enter}`);
      return attempt();
    });
  }

  return attempt();
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface CreatedUser {
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

function extractCreatedUsersFromResponse(body: unknown): CreatedUser[] | null {
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

export interface AddAndLinkUsersParams {
  childId: string;
  caregiverId: string;
  teacherId: string;
  cohortName: string;
  month?: number;
  year?: number;
}

export interface AddAndLinkUsersResult {
  createdUsers: CreatedUser[];
  childLogin: { email: string; password: string };
}

/**
 * Adds and links users following the documented two-step process:
 * Step 2B: Add users to the dashboard (upload CSV, get UIDs back)
 * Step 2C: Link users as needed (upload linking CSV with UIDs)
 *
 * This matches the workflow described in the researcher documentation:
 * https://researcher.levante-network.org/dashboard/add-users
 *
 * @param params - User identifiers and cohort information
 * @returns Created users and child login credentials
 */
export function addAndLinkUsers(params: AddAndLinkUsersParams): Cypress.Chainable<AddAndLinkUsersResult> {
  const { childId, caregiverId, teacherId, cohortName, month = 5, year = 2017 } = params;

  // Step 2B: Add users to the dashboard
  cy.intercept('POST', '**/createUsers').as('createUsers');

  cy.visit('/add-users');
  cy.get('[data-cy="upload-add-users-csv"]').within(() => {
    // Note: caregiverId and teacherId are included in the CSV but will be empty strings
    // The actual linking happens in Step 2C after we get UIDs back
    const csv = [
      'id,userType,month,year,cohort,caregiverId,teacherId',
      `${childId},child,${month},${year},${cohortName},,`,
      `${caregiverId},caregiver,${month},${year},${cohortName},,`,
      `${teacherId},teacher,${month},${year},${cohortName},,`,
    ].join('\n');

    cy.get('input[type="file"]').selectFile(
      { contents: Cypress.Buffer.from(csv), fileName: 'users.csv', mimeType: 'text/csv' },
      { force: true },
    );
  });

  cy.contains('File Successfully Uploaded', { timeout: 60000 }).should('exist');
  cy.get('[data-cy="button-add-users-from-file"]', { timeout: 60000 }).should('be.visible').click();

  // Keep this fully Cypress-chained. We store intermediate data in closure variables and only "yield" a value at the end.
  let createdUsers: CreatedUser[] | null = null;

  return cy
    .wait('@createUsers', { timeout: 60000 })
    .then((interception) => {
      const status = interception.response?.statusCode;
      const body = interception.response?.body;
      const requestBody = interception.request?.body;
      const created = extractCreatedUsersFromResponse(body);

      if (!created) {
        throw new Error(
          `createUsers returned unexpected body (status=${status}). request=${JSON.stringify(
            requestBody,
          )} body=${JSON.stringify(body)}`,
        );
      }

      assert.isAtLeast(created.length, 3, 'createUsers should return at least 3 created users');
      assert.isString(created[0]?.uid, 'child uid');
      assert.isString(created[1]?.uid, 'caregiver uid');
      assert.isString(created[2]?.uid, 'teacher uid');

      createdUsers = created;
    })
    .then(() => {
      if (!createdUsers) throw new Error('createUsers did not return created users');

      cy.contains('User Creation Successful', { timeout: 60000 }).should('exist');

      // Step 2C: Link users as needed
      cy.intercept('POST', '**/linkUsers').as('linkUsers');

      const linkCsv = [
        'id,userType,uid,caregiverId,teacherId',
        `${childId},child,${createdUsers[0]!.uid},${caregiverId},${teacherId}`,
        `${caregiverId},caregiver,${createdUsers[1]!.uid},,`,
        `${teacherId},teacher,${createdUsers[2]!.uid},,`,
      ].join('\n');

      cy.visit('/link-users');
      cy.get('[data-cy="upload-link-users-csv"]').within(() => {
        cy.get('input[type="file"]').selectFile(
          { contents: Cypress.Buffer.from(linkCsv), fileName: 'link-users.csv', mimeType: 'text/csv' },
          { force: true },
        );
      });

      cy.get('[data-cy="button-start-linking-users"]').should('be.visible').click();
      return cy.wait('@linkUsers', { timeout: 60000 });
    })
    .then((linkInterception) => {
      const linkStatus = linkInterception.response?.statusCode;
      const linkBody = linkInterception.response?.body;
      if (linkStatus && linkStatus >= 400) {
        throw new Error(`linkUsers failed: HTTP ${linkStatus} body=${JSON.stringify(linkBody)}`);
      }
      const maybeError = isRecord(linkBody) ? linkBody.error : undefined;
      if (maybeError) throw new Error(`linkUsers failed: body.error=${JSON.stringify(maybeError)}`);
    })
    .then(() => {
      if (!createdUsers) throw new Error('createUsers did not return created users');
      return cy.wrap(
        {
          createdUsers,
          childLogin: { email: createdUsers[0]!.email, password: createdUsers[0]!.password },
        },
        { log: false },
      );
    });
}
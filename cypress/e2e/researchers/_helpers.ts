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


import 'cypress-real-events';
import { assert } from 'chai';
import { selectSite, signInWithPassword } from '../_helpers';

function assertCurrentSiteName(expectedName: string) {
  cy.window().then((win) => {
    const raw = win.sessionStorage.getItem('authStore');
    if (!raw) throw new Error('authStore sessionStorage missing');
    const parsed = JSON.parse(raw) as { currentSiteName?: string };
    const currentSiteName = parsed.currentSiteName ?? '';
    if (currentSiteName.trim() !== expectedName.trim()) {
      throw new Error(`Expected currentSiteName "${expectedName}", got "${currentSiteName}"`);
    }
  });
}

function logAuthStoreSnapshot(label: string) {
  cy.window().then((win) => {
    const raw = win.sessionStorage.getItem('authStore');
    const snapshot = raw ? JSON.parse(raw) : null;
    cy.log(`${label}: authStore=${JSON.stringify(snapshot)}`);
    cy.writeFile('cypress/tmp/link-users-authstore.json', snapshot ?? null, { log: false });
  });
}

function assertLoggedInEmail(expectedEmail: string) {
  cy.window().then((win) => {
    const raw = win.sessionStorage.getItem('authStore');
    if (!raw) throw new Error('authStore sessionStorage missing');
    const parsed = JSON.parse(raw) as { firebaseUser?: { adminFirebaseUser?: { email?: string } } };
    const email = parsed.firebaseUser?.adminFirebaseUser?.email ?? '';
    if (email.trim().toLowerCase() !== expectedEmail.trim().toLowerCase()) {
      throw new Error(`Expected logged-in email "${expectedEmail}", got "${email}"`);
    }
  });
}

function logSiteOptions() {
  cy.get('body', { timeout: 60000 }).then(($body) => {
    const hasSiteSelect = $body.find('[data-cy="site-select"]').length > 0;
    cy.writeFile('cypress/tmp/link-users-site-select.json', { hasSiteSelect }, { log: false });
    if (!hasSiteSelect) return;
    cy.get('[data-cy="site-select"]').click();
    cy.get('body').then(($options) => {
      const names = Array.from($options.find('[role="option"]')).map((el) => (el.textContent ?? '').trim());
      cy.log(`site options: ${JSON.stringify(names)}`);
      cy.writeFile('cypress/tmp/link-users-site-options.json', names, { log: false });
    });
    cy.get('body').type('{esc}');
  });
}

function waitForLinkUsersResult(): Cypress.Chainable<void> {
  const startedAt = Date.now();
  const timeoutMs = 120_000;
  const pollMs = 1_000;

  function attempt(): Cypress.Chainable<void> {
    return cy.get('body', { timeout: 60000 }).then(($body) => {
      const text = $body.text();
      if (text.includes('Users linked successfully')) return;
      if (text.includes('Failed to link users')) {
        throw new Error('Link users failed. See console/network logs for details.');
      }
      if (Date.now() - startedAt > timeoutMs) {
        throw new Error('Timed out waiting for link users result.');
      }
      return cy.wait(pollMs).then(() => attempt());
    }) as unknown as Cypress.Chainable<void>;
  }

  return attempt();
}

describe('link users (prod) with superadmin', () => {
  it('links users from CSV for target site', () => {
    const siteName: string = (Cypress.env('E2E_SITE_NAME') as string) || 'DE-mpieva-pilot';
    const csvPath: string =
      (Cypress.env('E2E_LINK_USERS_CSV_PATH') as string) ||
      '/mnt/c/Users/digit/Downloads/registered-users (50).csv';
    const superAdminEmail =
      (Cypress.env('E2E_AI_SUPER_ADMIN_EMAIL_PROD') as string) || (Cypress.env('E2E_TEST_EMAIL_PROD') as string);
    const superAdminPassword =
      (Cypress.env('E2E_AI_SUPER_ADMIN_PASSWORD_PROD') as string) || (Cypress.env('E2E_TEST_PASSWORD_PROD') as string);

    if (!superAdminEmail || !superAdminPassword) {
      throw new Error('Missing super admin creds: E2E_AI_SUPER_ADMIN_EMAIL_PROD / E2E_AI_SUPER_ADMIN_PASSWORD_PROD');
    }

    cy.clearCookies();
    cy.clearLocalStorage();
    cy.window().then((win) => win.sessionStorage.clear());

    Cypress.env('E2E_USE_SESSION', false);
    signInWithPassword({ email: superAdminEmail, password: superAdminPassword });
    logAuthStoreSnapshot('after-login');
    assertLoggedInEmail(superAdminEmail);
    logSiteOptions();
    selectSite(siteName);
    logAuthStoreSnapshot('after-select');
    assertCurrentSiteName(siteName);

    cy.visit('/link-users');
    cy.location('pathname', { timeout: 60000 }).should('eq', '/link-users');

    cy.readFile(csvPath, { log: false }).then((contents) => {
      const fileContents = Cypress.Buffer.from(contents as string);
      cy.get('body', { timeout: 60000 }).then(($body) => {
        if ($body.find('[data-cy="upload-link-users-csv"]').length) {
          cy.get('[data-cy="upload-link-users-csv"]').within(() => {
            cy.get('input[type="file"]').selectFile(
              { contents: fileContents, fileName: 'registered-users.csv', mimeType: 'text/csv' },
              { force: true },
            );
          });
          return;
        }

        cy.get('input[type="file"]', { timeout: 60000 })
          .first()
          .selectFile(
            { contents: fileContents, fileName: 'registered-users.csv', mimeType: 'text/csv' },
            { force: true },
          );
      });
    });

    cy.contains('File Successfully Uploaded', { timeout: 60000 }).should('exist');

    cy.intercept('POST', '**/linkUsers').as('linkUsers');

    cy.get('body', { timeout: 60000 }).then(($body) => {
      if ($body.find('[data-cy="button-start-linking-users"]').length) {
        cy.get('[data-cy="button-start-linking-users"]').should('be.visible').click();
        return;
      }
      cy.contains('button', 'Start Linking', { timeout: 60000 }).should('be.visible').click();
    });

    cy.wait('@linkUsers', { timeout: 120000 }).then((interception) => {
      const status = interception.response?.statusCode;
      const body = interception.response?.body;
      cy.log(`linkUsers status=${status} body=${JSON.stringify(body)}`);
    });

    waitForLinkUsersResult();
  });
});

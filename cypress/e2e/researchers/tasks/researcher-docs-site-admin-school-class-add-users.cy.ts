import { selectSite, signInWithPassword, typeInto } from '../_helpers';

const siteName = (Cypress.env('E2E_SITE_NAME') as string) || 'ai-tests';
const projectId = (Cypress.env('E2E_FIREBASE_PROJECT_ID') as string) || 'hs-levante-admin-dev';

function resetAiTestsSite() {
  const cmd = [
    'node scripts/e2e-init/reset-site.mjs',
    '--yes',
    `--site-name ${siteName}`,
    `--project-id ${projectId}`,
    '--out bug-tests/site.ai-tests.json',
    '--out-creds bug-tests/site.ai-tests.creds.json',
    '--admin-email ai-admin@levante.test',
    '--site-admin-email ai-site-admin@levante.test',
    '--research-assistant-email ai-research-assistant@levante.test',
  ].join(' ');
  return cy.exec(cmd, { timeout: 120000 });
}

function readSiteAdminCreds() {
  return cy.readFile('bug-tests/site.ai-tests.creds.json').then((creds) => {
    const siteAdmin = creds?.users?.site_admin;
    const email = siteAdmin?.email;
    const password = siteAdmin?.password;
    if (!email || !password) throw new Error('Missing site_admin creds in bug-tests/site.ai-tests.creds.json');
    return { email, password };
  });
}

function createGroup({ orgType, name, parentSchoolName }: { orgType: 'School' | 'Class'; name: string; parentSchoolName?: string }) {
  cy.get('[data-testid="add-group-btn"]', { timeout: 60000 }).should('be.visible').click();
  cy.get('[data-testid="modalTitle"]', { timeout: 60000 }).should('contain.text', 'Add New');
  cy.get('[data-cy="dropdown-org-type"]', { timeout: 60000 }).should('be.visible').click();
  cy.contains('[role="option"]', new RegExp(`^${orgType}$`), { timeout: 60000 }).click();
  if (orgType === 'Class' && parentSchoolName) {
    cy.get('[data-cy="dropdown-parent-school"]', { timeout: 60000 }).should('be.visible').click();
    cy.contains('[role="option"]', new RegExp(`^${parentSchoolName}$`), { timeout: 60000 }).click();
  }
  typeInto('[data-cy="input-org-name"]', name);
  cy.intercept('POST', '**/upsertOrg*').as('upsertOrg');
  cy.get('[data-testid="submitBtn"]', { timeout: 60000 }).should('be.visible').and('not.be.disabled').click();
  cy.wait('@upsertOrg', { timeout: 60000 }).then((interception) => {
    const status = interception.response?.statusCode;
    if (status && status >= 400) throw new Error(`upsertOrg failed: HTTP ${status}`);
  });
  cy.contains('Success', { timeout: 60000 }).should('exist');
  cy.contains(new RegExp(`^${orgType} created successfully\\.$`), { timeout: 60000 }).should('exist');
}

describe('researcher docs: site admin creates school/class then adds users', () => {
  it('creates a site, site admin, school, class, and adds users', () => {
    resetAiTestsSite();
    readSiteAdminCreds().then(({ email, password }) => {
      signInWithPassword({ email, password });
      selectSite(siteName);
    });

    const nonce = Date.now();
    const schoolName = `e2e-school-${nonce}`;
    const className = `e2e-class-${nonce}`;
    const childId = `e2e_child_${nonce}`;

    const debugRunQueryPayloads: Array<{ url: string; body: unknown }> = [];
    cy.intercept('POST', '**/documents:runQuery', (req) => {
      try {
        const body = req.body;
        const collectionId = body?.structuredQuery?.from?.[0]?.collectionId;
        if (collectionId === 'classes' || collectionId === 'schools' || collectionId === 'districts') {
          debugRunQueryPayloads.push({ url: req.url, body });
        }
      } catch {
        // ignore
      }
      req.continue();
    }).as('runQuery');

    cy.visit('/list-groups');
    cy.get('body', { timeout: 90000 }).then(($body) => {
      if ($body.find('[data-testid="groups-page-ready"]').length) {
        cy.get('[data-testid="groups-page-ready"]', { timeout: 90000 }).should('exist');
        return;
      }
      cy.contains('Groups', { timeout: 90000 }).should('exist');
      cy.contains('button', /^Add Group$/, { timeout: 90000 }).should('be.visible');
    });
    createGroup({ orgType: 'School', name: schoolName });
    createGroup({ orgType: 'Class', name: className, parentSchoolName: schoolName });

    let createUsersCalled = false;
    cy.intercept('POST', '**/createUsers', (req) => {
      createUsersCalled = true;
      req.continue();
    }).as('createUsers');
    cy.visit('/add-users');
    cy.contains('Add Users', { timeout: 90000 }).should('exist');
    const csv = [
      'id,userType,month,year,site,school,class',
      `${childId},child,5,2017,${siteName},${schoolName},${className}`,
    ].join('\n');
    cy.get('body', { timeout: 60000 }).then(($body) => {
      if ($body.find('[data-cy="upload-add-users-csv"]').length) {
        cy.get('[data-cy="upload-add-users-csv"]').within(() => {
          cy.get('input[type="file"]').selectFile(
            { contents: Cypress.Buffer.from(csv), fileName: 'users.csv', mimeType: 'text/csv' },
            { force: true },
          );
        });
        return;
      }
      cy.get('input[type="file"]', { timeout: 60000 }).first().selectFile(
        { contents: Cypress.Buffer.from(csv), fileName: 'users.csv', mimeType: 'text/csv' },
        { force: true },
      );
    });

    cy.contains('File Successfully Uploaded', { timeout: 60000 }).should('exist');
    cy.get('body', { timeout: 60000 }).then(($body) => {
      if ($body.find('[data-cy="button-add-users-from-file"]').length) {
        cy.get('[data-cy="button-add-users-from-file"]', { timeout: 60000 }).should('be.visible').click();
        return;
      }
      cy.contains('button', /^Add Users from Uploaded File$/, { timeout: 60000 }).should('be.visible').click();
    });

    const startedAt = Date.now();
    const timeoutMs = 120000;

    function waitForOutcome(): Cypress.Chainable<void> {
      return cy.get('body', { timeout: 60000 }).then(($body) => {
        if ($body.find('[data-cy="button-download-users"]').length) {
          cy.contains('User Creation Successful', { timeout: 60000 }).should('exist');
          return;
        }

        if ($body.find('.error-container').length || $body.find('table').filter((_, el) => el.textContent?.includes('Rows with Errors')).length) {
          const errorText = $body.find('.error-container').text() || $body.text();
          return cy
            .writeFile(
              `cypress/tmp/researcher-docs-site-admin-school-class-add-users.runquery.${nonce}.json`,
              debugRunQueryPayloads,
              { log: false },
            )
            .then(() => {
              throw new Error(`Add Users validation failed before createUsers: ${errorText}`);
            });
        }

        if (createUsersCalled) {
          cy.contains('User Creation Successful', { timeout: 60000 }).should('exist');
          return;
        }

        if (Date.now() - startedAt > timeoutMs) {
          return cy
            .writeFile(
              `cypress/tmp/researcher-docs-site-admin-school-class-add-users.runquery.${nonce}.json`,
              debugRunQueryPayloads,
              { log: false },
            )
            .then(() => {
              throw new Error('Timed out waiting for createUsers or validation error.');
            });
        }

        return cy.wait(1000).then(() => waitForOutcome());
      }) as unknown as Cypress.Chainable<void>;
    }

    waitForOutcome().then(() => {
      if (!debugRunQueryPayloads.length) return;
      return cy.writeFile(
        `cypress/tmp/researcher-docs-site-admin-school-class-add-users.runquery.${nonce}.json`,
        debugRunQueryPayloads,
        { log: false },
      );
    });
  });
});

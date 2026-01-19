import { ignoreKnownHostedUncaughtExceptions, selectSite, signInWithPassword, typeInto } from '../_helpers';

const email: string =
  (Cypress.env('E2E_AI_SITE_ADMIN_EMAIL') as string) ||
  (Cypress.env('E2E_TEST_EMAIL') as string) ||
  'student@levante.test';
const password: string =
  (Cypress.env('E2E_AI_SITE_ADMIN_PASSWORD') as string) ||
  (Cypress.env('E2E_TEST_PASSWORD') as string) ||
  'student123';
const siteName: string = (Cypress.env('E2E_SITE_NAME') as string) || 'ai-tests';

function openAddGroupModal() {
  cy.get('[data-testid="add-group-btn"]', { timeout: 60000 }).should('be.visible').click();
  cy.get('[data-testid="modalTitle"]', { timeout: 60000 }).should('contain.text', 'Add New');
}

function selectOrgType(label: 'School' | 'Class') {
  cy.get('[data-cy="dropdown-org-type"]', { timeout: 60000 }).should('be.visible').click();
  cy.contains('[role="option"]', new RegExp(`^${label}$`), { timeout: 60000 }).click();
}

function selectParentSchool(schoolName: string) {
  cy.get('[data-cy="dropdown-parent-school"]', { timeout: 60000 }).should('be.visible').click();
  cy.contains('[role="option"]', new RegExp(`^${escapeRegExp(schoolName)}$`), { timeout: 60000 }).click();
}

function submitAndExpectSuccess(label: string) {
  cy.contains(`${label} created successfully.`, { timeout: 60000 }).should('not.exist');
  cy.get('[data-testid="submitBtn"]').should('be.visible').and('not.be.disabled').click();
  cy.contains('Success', { timeout: 60000 }).should('exist');
  cy.contains(`${label} created successfully.`, { timeout: 60000 }).should('exist');
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

describe('GH#766 [OPEN] Add users fails for class + school combinations', () => {
  const testRunner = Cypress.env('E2E_RUN_OPEN_BUGS') ? it : it.skip;

  testRunner('shows invalid class error even when class exists', () => {
    ignoreKnownHostedUncaughtExceptions();

    const nonce = Date.now();
    const schoolName = `e2e-school-766-${nonce}`;
    const className = `e2e-class-766-${nonce}`;
    const childId = `e2e_child_766_${nonce}`;

    signInWithPassword({ email, password });
    selectSite(siteName);

    cy.visit('/list-groups');
    cy.get('[data-testid="groups-page-ready"]', { timeout: 90000 }).should('exist');

    openAddGroupModal();
    selectOrgType('School');
    typeInto('[data-cy="input-org-name"]', schoolName);
    submitAndExpectSuccess('School');

    openAddGroupModal();
    selectOrgType('Class');
    selectParentSchool(schoolName);
    typeInto('[data-cy="input-org-name"]', className);
    submitAndExpectSuccess('Class');

    cy.visit('/add-users');
    cy.get('[data-cy="upload-add-users-csv"]').within(() => {
      const csv = [
        'id,userType,month,year,site,school,class',
        `${childId},child,5,2017,${siteName},${schoolName},${className}`,
      ].join('\n');

      cy.get('input[type="file"]').selectFile(
        { contents: Cypress.Buffer.from(csv), fileName: 'users.csv', mimeType: 'text/csv' },
        { force: true },
      );
    });

    cy.contains('File Successfully Uploaded', { timeout: 60000 }).should('exist');
    cy.get('[data-cy="button-add-users-from-file"]', { timeout: 60000 }).should('be.visible').click();

    const expectedError = `Invalid Class: Class '${className}' not found in any of the specified site/school combinations`;
    const startedAt = Date.now();
    const timeoutMs = 90_000;

    function waitForOutcome(): Cypress.Chainable<void> {
      return cy.get('body', { timeout: 60000 }).then(($body) => {
        const bodyText = $body.text() || '';

        if (bodyText.includes(expectedError)) return;

        if (bodyText.includes('User Creation Successful') || $body.find('[data-cy="button-download-users"]').length) {
          throw new Error(
            `Bug not reproduced: Add Users succeeded for school+class. Expected error "${expectedError}".`,
          );
        }

        if (Date.now() - startedAt > timeoutMs) {
          throw new Error(`Timed out waiting for either "${expectedError}" or a success indicator.`);
        }

        return cy.wait(1000).then(() => waitForOutcome());
      }) as unknown as Cypress.Chainable<void>;
    }

    waitForOutcome();
  });
});

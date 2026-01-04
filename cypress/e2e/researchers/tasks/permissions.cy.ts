import { selectSite, signInWithPassword } from '../_helpers';

function hasCreds(email: unknown, password: unknown): boolean {
  return typeof email === 'string' && Boolean(email.trim()) && typeof password === 'string' && Boolean(password.trim());
}

function assertNewPermissionsEnabled() {
  const projectId: string = (Cypress.env('E2E_FIREBASE_PROJECT_ID') as string) || 'hs-levante-admin-dev';

  cy.then(() => {
    const idToken = Cypress.env('E2E_LAST_ID_TOKEN') as string | undefined;
    const uid = Cypress.env('E2E_LAST_UID') as string | undefined;
    if (!idToken || !uid) {
      throw new Error(
        'Missing Firebase auth token/uid for claims check. Expected signInWithPassword() to set Cypress env E2E_LAST_ID_TOKEN and E2E_LAST_UID.',
      );
    }

    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/userClaims/${encodeURIComponent(
      uid,
    )}`;

    cy.request({
      method: 'GET',
      url,
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
      failOnStatusCode: false,
    }).then((resp) => {
      if (resp.status !== 200) {
        throw new Error(`Failed to read userClaims via Firestore REST (status=${resp.status}). body=${JSON.stringify(resp.body)}`);
      }

      const useNewPermissions = resp.body?.fields?.claims?.mapValue?.fields?.useNewPermissions?.booleanValue;
      if (useNewPermissions !== true) {
        throw new Error(
          `New permissions flag not enabled in userClaims (expected claims.useNewPermissions=true). Got: ${JSON.stringify(useNewPermissions)}`,
        );
      }
    });
  });
}

function waitForPermissionsToLoad() {
  cy.contains('Loading permissions...', { timeout: 120000 }).should('not.exist');
}

function assertAllowed(path: string, readySelector: string) {
  cy.visit(path);
  cy.location('pathname', { timeout: 60000 }).should('eq', path);
  cy.get(readySelector, { timeout: 120000 }).should('be.visible');
}

function assertBlocked(path: string) {
  cy.visit(path);
  cy.location('pathname', { timeout: 60000 }).should('eq', '/');
}

describe('permissions: role-based route access', () => {
  const siteName: string = (Cypress.env('E2E_SITE_NAME') as string) || 'ai-tests';

  const adminEmail = Cypress.env('E2E_AI_ADMIN_EMAIL') as string | undefined;
  const adminPassword = Cypress.env('E2E_AI_ADMIN_PASSWORD') as string | undefined;

  const siteAdminEmail = Cypress.env('E2E_AI_SITE_ADMIN_EMAIL') as string | undefined;
  const siteAdminPassword = Cypress.env('E2E_AI_SITE_ADMIN_PASSWORD') as string | undefined;

  const researchAssistantEmail = Cypress.env('E2E_AI_RESEARCH_ASSISTANT_EMAIL') as string | undefined;
  const researchAssistantPassword = Cypress.env('E2E_AI_RESEARCH_ASSISTANT_PASSWORD') as string | undefined;

  const superAdminEmail = Cypress.env('E2E_AI_SUPER_ADMIN_EMAIL') as string | undefined;
  const superAdminPassword = Cypress.env('E2E_AI_SUPER_ADMIN_PASSWORD') as string | undefined;

  const participantEmail = Cypress.env('E2E_PARTICIPANT_EMAIL') as string | undefined;
  const participantPassword = Cypress.env('E2E_PARTICIPANT_PASSWORD') as string | undefined;

  it('admin: CRUD assignments; CRUD users; can create cohorts; cannot create sites; no super-admin-only routes', () => {
    if (!hasCreds(adminEmail, adminPassword)) {
      throw new Error('Missing required creds: E2E_AI_ADMIN_EMAIL / E2E_AI_ADMIN_PASSWORD');
    }
    signInWithPassword({ email: adminEmail!, password: adminPassword! });
    selectSite(siteName);
    assertNewPermissionsEnabled();

    assertAllowed('/list-groups', '[data-testid="groups-page-title"]');
    waitForPermissionsToLoad();
    cy.get('[data-cy="add-group-btn"]').should('be.visible').should('not.be.disabled').click();
    cy.get('[data-testid="modalTitle"]', { timeout: 60000 }).should('contain.text', 'Add New');
    cy.get('[data-cy="dropdown-org-type"]').should('be.visible').click();
    cy.contains('[role="option"]', /^Cohort$/).should('exist');
    cy.contains('[role="option"]', /^Site$/).should('not.exist');
    cy.get('[data-cy="add-users-btn"]').should('be.visible');

    assertAllowed('/add-users', '[data-cy="upload-add-users-csv"]');
    assertAllowed('/create-assignment', '[data-cy="input-administration-name"]');

    // Current router config: /testing-results is SUPER_ADMIN only.
    assertBlocked('/testing-results');
  });

  it('site_admin: CRUDE within site; can create cohorts; cannot access super-admin-only routes', () => {
    if (!hasCreds(siteAdminEmail, siteAdminPassword)) {
      throw new Error('Missing required creds: E2E_AI_SITE_ADMIN_EMAIL / E2E_AI_SITE_ADMIN_PASSWORD');
    }
    signInWithPassword({ email: siteAdminEmail!, password: siteAdminPassword! });
    selectSite(siteName);
    assertNewPermissionsEnabled();

    assertAllowed('/list-groups', '[data-testid="groups-page-title"]');
    waitForPermissionsToLoad();
    cy.get('[data-cy="add-group-btn"]').should('be.visible').click();
    cy.get('[data-testid="modalTitle"]', { timeout: 60000 }).should('contain.text', 'Add New');
    cy.get('[data-cy="dropdown-org-type"]').should('be.visible').click();
    cy.contains('[role="option"]', /^Cohort$/).should('exist');
    cy.contains('[role="option"]', /^Site$/).should('not.exist');

    assertAllowed('/add-users', '[data-cy="upload-add-users-csv"]');
    assertAllowed('/create-assignment', '[data-cy="input-administration-name"]');
    assertBlocked('/testing-results');
  });

  it('research_assistant: read groups/assignments; create users; no create groups/assignments; no super-admin routes', function () {
    if (!hasCreds(researchAssistantEmail, researchAssistantPassword)) this.skip();
    signInWithPassword({ email: researchAssistantEmail!, password: researchAssistantPassword! });
    selectSite(siteName);
    assertNewPermissionsEnabled();

    assertAllowed('/list-groups', '[data-testid="groups-page-title"]');
    waitForPermissionsToLoad();
    cy.get('[data-cy="add-group-btn"]').should('not.exist');
    cy.get('[data-cy="add-users-btn"]').should('be.visible');

    assertAllowed('/add-users', '[data-cy="upload-add-users-csv"]');
    assertBlocked('/create-assignment');
    assertBlocked('/testing-results');
  });

  it('super_admin (optional): can access super-admin-only routes and global site creation', function () {
    if (!hasCreds(superAdminEmail, superAdminPassword)) this.skip();
    signInWithPassword({ email: superAdminEmail!, password: superAdminPassword! });
    selectSite(siteName);
    assertNewPermissionsEnabled();

    cy.visit('/testing-results');
    cy.location('pathname', { timeout: 60000 }).should('eq', '/testing-results');
    cy.contains('E2E Results', { timeout: 60000 }).should('exist');

    assertAllowed('/list-groups', '[data-testid="groups-page-title"]');
    waitForPermissionsToLoad();
    cy.get('[data-cy="add-group-btn"]').should('be.visible').click();
    cy.get('[data-cy="dropdown-org-type"]').should('be.visible').click();
    cy.contains('[role="option"]', /^Site$/).should('exist');
  });

  it('participant (optional): cannot access admin routes', function () {
    if (!hasCreds(participantEmail, participantPassword)) this.skip();
    signInWithPassword({ email: participantEmail!, password: participantPassword! });

    assertBlocked('/list-groups');
    assertBlocked('/add-users');
    assertBlocked('/create-assignment');
    assertBlocked('/testing-results');
  });
});


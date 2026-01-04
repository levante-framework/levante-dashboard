/**
 * @fileoverview Permissions: Role-Based Access Control E2E Test
 *
 * @description
 * Tests the new resource-based permissions system, verifying that different roles
 * (admin, site_admin, research_assistant, super_admin, participant) have the correct
 * access to routes and UI elements based on their permissions.
 *
 * @test-id task-permissions
 * @category tasks
 *
 * @setup
 * This test automatically bootstraps the "ai-tests" site with required users when run
 * via the local E2E runner. The bootstrap process:
 * - Deletes and recreates the "ai-tests" site (district)
 * - Creates users with roles: admin, site_admin, research_assistant
 * - Sets useNewPermissions=true in userClaims for all admin users
 * - Writes credentials to bug-tests/site.ai-tests.creds.json
 *
 * @required-env-vars
 * The following environment variables are automatically injected by the local runner
 * (from bug-tests/site.ai-tests.creds.json):
 * - E2E_SITE_NAME=ai-tests
 * - E2E_USE_SESSION=TRUE
 * - E2E_FIREBASE_PROJECT_ID=hs-levante-admin-dev
 * - E2E_AI_ADMIN_EMAIL (auto-generated)
 * - E2E_AI_ADMIN_PASSWORD (auto-generated)
 * - E2E_AI_SITE_ADMIN_EMAIL (auto-generated)
 * - E2E_AI_SITE_ADMIN_PASSWORD (auto-generated)
 * - E2E_AI_RESEARCH_ASSISTANT_EMAIL (auto-generated)
 * - E2E_AI_RESEARCH_ASSISTANT_PASSWORD (auto-generated)
 *
 * Optional (for super_admin and participant tests):
 * - E2E_AI_SUPER_ADMIN_EMAIL
 * - E2E_AI_SUPER_ADMIN_PASSWORD
 * - E2E_PARTICIPANT_EMAIL
 * - E2E_PARTICIPANT_PASSWORD
 *
 * @test-cases
 * 1. admin: Can CRUD assignments/users; can create cohorts; cannot create sites; blocked from super-admin routes
 * 2. site_admin: Can CRUDE within site; can create cohorts; cannot create sites; blocked from super-admin routes
 * 3. research_assistant: Can read groups/assignments; can create users; cannot create groups/assignments; blocked from super-admin routes
 * 4. super_admin (optional): Can access super-admin routes; can create sites globally
 * 5. participant (optional): Cannot access any admin routes
 *
 * @expected-behavior
 * - All admin users must have useNewPermissions=true in their userClaims
 * - Permission checks use the new PermissionService from @levante-framework/permissions-core
 * - UI elements (buttons, routes) are gated by PermissionGuard components
 * - Router blocks unauthorized routes by redirecting to /
 *
 * @related-docs
 * - README_TESTS_PERMISSIONS.md - Full permissions system specification
 * - https://www.notion.so/Permissions-234244e26d9b80a98181c67ea1f27e91 - Original permissions spec
 * - src/composables/usePermissions.ts - Frontend permissions composable
 * - src/components/PermissionGuard.vue - UI permission gating component
 * - src/router/index.ts - Route-level permission checks
 *
 * @modification-notes
 * To modify this test:
 * 1. Update the test cases above to reflect new requirements
 * 2. Add/remove environment variables in the @required-env-vars section
 * 3. Update assertions in the test cases to match new UI/route expectations
 * 4. If adding new roles, ensure they're created in scripts/e2e-init/reset-site.mjs
 */

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


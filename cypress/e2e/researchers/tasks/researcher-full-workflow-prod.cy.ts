/**
 * @fileoverview Researcher Full Workflow (Prod): Super admin seeds site/admin
 *
 * @description
 * Prod-safe workflow: super admin creates site + assigns site admin role, then
 * site admin runs the standard cohort → users → link → assignment flow.
 *
 * @required-env-vars
 * - E2E_APP_URL (prod)
 * - E2E_SITE_NAME (default: ai-tests)
 * - E2E_AI_SUPER_ADMIN_EMAIL_PROD / E2E_AI_SUPER_ADMIN_PASSWORD_PROD
 * - E2E_AI_SITE_ADMIN_EMAIL_PROD / E2E_AI_SITE_ADMIN_PASSWORD_PROD
 */

import 'cypress-real-events';
import { assert } from 'chai';
import { addAndLinkUsers, pickToday, selectSite, signInWithPassword, typeInto } from '../_helpers';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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

function forceSetCurrentSite(siteId: string, siteName: string) {
  return cy.window().then((win) => {
    const w = win as Window & {
      __LEVANTE_APP__?: { $pinia?: { _s?: Map<string, unknown>; state?: { value?: { authStore?: unknown } } } };
    };
    const pinia = w.__LEVANTE_APP__?.$pinia;
    const authStore = pinia?._s?.get('authStore') as
      | { setCurrentSite?: (id: string | null, name: string | null) => void }
      | undefined;
    const authState = pinia?.state?.value?.authStore as { currentSite?: unknown; currentSiteName?: unknown } | undefined;
    if (authStore?.setCurrentSite) {
      authStore.setCurrentSite(siteId, siteName);
    } else if (authState) {
      authState.currentSite = siteId;
      authState.currentSiteName = siteName;
    }
  });
}

function resolveSiteInfo(defaultName: string): Cypress.Chainable<{ siteName: string; siteId?: string }> {
  return cy.readFile('bug-tests/site.ai-tests.json', { log: false }).then(
    (siteInfo) => {
      const siteName = siteInfo?.siteName ?? defaultName;
      const siteId = siteInfo?.districtId;
      return { siteName, siteId };
    },
    () => ({ siteName: defaultName }),
  );
}

function selectSiteIfExists(siteName: string): Cypress.Chainable<boolean> {
  let found = false;
  return cy.get('body').then(($body) => {
    if (!$body.find('[data-cy="site-select"]').length) return false;
    cy.get('[data-cy="site-select"]').click();
    return cy.get('body').then(($options) => {
      const option = Array.from($options.find('[role="option"]')).find((el) =>
        new RegExp(`^${escapeRegExp(siteName)}$`).test((el.textContent ?? '').trim()),
      );
      if (option) {
        found = true;
        cy.wrap(option).click();
      } else {
        cy.get('body').type('{esc}');
      }
      return found;
    });
  });
}

function createSiteIfMissing(siteName: string) {
  cy.visit('/list-groups');
  cy.get('body', { timeout: 90000 }).then(($body) => {
    if ($body.find('[data-testid="groups-page-ready"]').length) {
      cy.get('[data-testid="groups-page-ready"]', { timeout: 90000 }).should('exist');
      return;
    }
    cy.contains('Groups', { timeout: 90000 }).should('exist');
  });

  return selectSiteIfExists(siteName).then((alreadyExists) => {
    if (alreadyExists) return;
    cy.contains('button', /^Add Group$/, { timeout: 60000 }).click();
    cy.get('[data-testid="modalTitle"]', { timeout: 60000 }).should('contain.text', 'Add New');
    cy.get('[data-cy="dropdown-org-type"]', { timeout: 60000 }).should('be.visible').click();
    cy.contains('[role="option"]', /^Site$/, { timeout: 60000 }).click();
    typeInto('[data-cy="input-org-name"]', siteName);
    cy.get('[data-testid="submitBtn"]', { timeout: 60000 }).should('be.visible').and('not.be.disabled').click();
    cy.get('body', { timeout: 60000 }).then(($body) => {
      const text = $body.text();
      const hasSuccess = text.includes('Success') && text.includes('Site created successfully.');
      if (hasSuccess) return;
      const hasError = text.toLowerCase().includes('already exists') || $body.find('.p-error').length > 0;
      if (!hasError) {
        cy.log('No success toast detected after Add Site; continuing to site selection.');
      }
    });
    selectSite(siteName);
    assertCurrentSiteName(siteName);
  });
}

function writeSiteInfoFile(siteName: string) {
  const projectId = (Cypress.env('E2E_FIREBASE_PROJECT_ID_PROD') as string) || 'hs-levante-admin-prod';
  cy.window().then((win) => {
    const raw = win.sessionStorage.getItem('authStore');
    if (!raw) throw new Error('authStore sessionStorage missing');
    const parsed = JSON.parse(raw) as { currentSite?: string; currentSiteName?: string };
    const siteId = parsed.currentSite;
    if (!siteId || siteId === 'any') throw new Error(`Expected currentSite, got: ${String(siteId)}`);
    const payload = {
      projectId,
      districtId: siteId,
      siteName: parsed.currentSiteName ?? siteName,
      normalizedName: (parsed.currentSiteName ?? siteName).toLowerCase(),
    };
    cy.writeFile('bug-tests/site.ai-tests.json', payload, { log: false });
  });
}

function ensureSiteAdmin(email: string, siteName: string) {
  cy.visit('/manage-administrators');
  selectSite(siteName);

  cy.get('body', { timeout: 90000 }).then(($body) => {
    if ($body.text().includes(email)) return;
    cy.contains('button', /^Add Administrator$/, { timeout: 60000 }).click();
    cy.get('[data-cy="input-administrator-first-name"]').should('be.visible');
    typeInto('[data-cy="input-administrator-first-name"]', 'E2E');
    typeInto('[data-cy="input-administrator-last-name"]', 'SiteAdmin');
    typeInto('[data-cy="input-administrator-email"]', email);
    cy.get('[data-cy="select-role"]').click();
    cy.contains('[role="option"]', /^Site Admin$/).click();
    cy.get('[data-testid="submitBtn"]').should('be.visible').click();
  });

  cy.contains(email, { timeout: 120000 }).should('exist');
}

describe('researcher README workflow (prod): super admin seeds site + site admin flow', () => {
  it('creates site/admin then completes cohort → users → link → assignment', () => {
    const siteName: string = (Cypress.env('E2E_SITE_NAME') as string) || 'ai-tests';
    const superAdminEmail =
      (Cypress.env('E2E_AI_SUPER_ADMIN_EMAIL_PROD') as string) || (Cypress.env('E2E_TEST_EMAIL_PROD') as string);
    const superAdminPassword =
      (Cypress.env('E2E_AI_SUPER_ADMIN_PASSWORD_PROD') as string) || (Cypress.env('E2E_TEST_PASSWORD_PROD') as string);
    const siteAdminEmail = Cypress.env('E2E_AI_SITE_ADMIN_EMAIL_PROD') as string | undefined;
    const siteAdminPassword = Cypress.env('E2E_AI_SITE_ADMIN_PASSWORD_PROD') as string | undefined;

    if (!superAdminEmail || !superAdminPassword) {
      throw new Error('Missing super admin creds: E2E_AI_SUPER_ADMIN_EMAIL_PROD / E2E_AI_SUPER_ADMIN_PASSWORD_PROD');
    }
    if (!siteAdminEmail || !siteAdminPassword) {
      throw new Error('Missing site admin creds: E2E_AI_SITE_ADMIN_EMAIL_PROD / E2E_AI_SITE_ADMIN_PASSWORD_PROD');
    }

    const runId = `${Date.now()}`;
    const cohortName = `e2e-cohort-${runId}`;
    const assignmentName = `e2e-assignment-${runId}`;
    const childId = `e2e_child_${runId}`;
    const caregiverId = `e2e_caregiver_${runId}`;
    const teacherId = `e2e_teacher_${runId}`;
    const takeStepScreenshot = (step: string) => cy.screenshot(`researcher-full-workflow-prod-${runId}-${step}`);

    resolveSiteInfo(siteName).then((siteInfo) => {
      const effectiveSiteName = siteInfo.siteName;
      const effectiveSiteId = siteInfo.siteId;

      signInWithPassword({ email: superAdminEmail, password: superAdminPassword });
      createSiteIfMissing(effectiveSiteName);
      selectSite(effectiveSiteName);
      if (effectiveSiteId) forceSetCurrentSite(effectiveSiteId, effectiveSiteName);
      assertCurrentSiteName(effectiveSiteName);
      assertCurrentSiteSelected();
      writeSiteInfoFile(effectiveSiteName);
      ensureSiteAdmin(siteAdminEmail, effectiveSiteName);

      cy.clearCookies();
      cy.clearLocalStorage();

      signInWithPassword({ email: siteAdminEmail, password: siteAdminPassword });
      selectSite(effectiveSiteName);
      if (effectiveSiteId) forceSetCurrentSite(effectiveSiteId, effectiveSiteName);
      assertCurrentSiteSelected();
      takeStepScreenshot('signed-in-site-admin');

    cy.visit('/list-groups');
    cy.contains('Groups', { timeout: 60000 }).should('exist');
    cy.contains('button', /^Add Group$/, { timeout: 60000 }).should('be.visible').click();
    cy.get('[data-testid="modalTitle"]').should('contain.text', 'Add New');
    cy.get('[data-cy="dropdown-org-type"]').click();
    cy.contains('[role="option"]', /^Cohort$/).click();
    typeInto('[data-cy="input-org-name"]', cohortName);
    cy.get('[data-testid="submitBtn"]').should('not.be.disabled').click();
    cy.contains('Cohort created successfully.', { timeout: 30000 }).should('exist');
    takeStepScreenshot('cohort-created');
    cy.contains('[role="tab"]', /^Cohorts$/).click({ force: true });
    cy.contains(cohortName, { timeout: 120000 }).should('exist');

    assertCurrentSiteSelected();
    takeStepScreenshot('before-add-and-link-users');
    cy.visit('/add-users');
    cy.location('pathname', { timeout: 60000 }).should('eq', '/add-users');
    cy.get('input[type="file"]', { timeout: 60000 }).should('exist');
    addAndLinkUsers({
      childId,
      caregiverId,
      teacherId,
      cohortName,
      month: 5,
      year: 2017,
    }).then((result) => {
      cy.wrap(result.createdUsers, { log: false }).as('createdUsers');
      cy.wrap(result.childLogin, { log: false }).as('childLogin');
      takeStepScreenshot('users-created-and-linked');
    });

    cy.visit('/create-assignment');
    typeInto('[data-cy="input-administration-name"]', assignmentName);
    pickToday('[data-cy="input-start-date"]');
    pickToday('[data-cy="input-end-date"]');
    cy.contains('[role="tab"]', /^Cohorts$/).click({ force: true });
    cy.get('body', { timeout: 60000 }).then(($body) => {
      const listboxSelector = $body.find('[data-cy="group-picker-listbox"]').length
        ? '[data-cy="group-picker-listbox"]'
        : '[role="listbox"]';
      cy.get(listboxSelector)
        .filter(':visible')
        .first()
        .within(() => {
          cy.contains('[role="option"]', new RegExp(`^${escapeRegExp(cohortName)}$`)).click();
        });
    });
    cy.get('.selected-groups-scroll-panel', { timeout: 10000 }).contains(cohortName).should('exist');
    cy.get('[data-cy="input-variant-name"]', { timeout: 120000 }).should('be.visible');
    cy.get('[data-cy="selected-variant"]', { timeout: 120000 }).should('exist').first().click();
    cy.get('[data-cy="panel-droppable-zone"]', { timeout: 120000 }).contains('Variant name:').should('exist');
    cy.get('input[id="No"]').should('exist').check({ force: true });
    cy.intercept('POST', /upsertAdministration/i).as('upsertAdministration');
    cy.get('[data-cy="button-create-administration"]').should('be.visible').should('not.be.disabled').click();
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
    takeStepScreenshot('assignment-created-processing');
  });
    });
});

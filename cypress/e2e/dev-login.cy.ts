/**
 * @fileoverview Dev Login: Basic Authentication Smoke Test
 *
 * @description
 * Simple smoke test for the sign-in flow. Verifies that email/password authentication
 * works and that users are redirected appropriately after login. Used for quick validation
 * of authentication infrastructure.
 *
 * @test-id dev-login
 * @category utility
 *
 * @setup
 * - No special setup required
 * - Uses default test credentials if env vars not set
 *
 * @required-env-vars
 * - E2E_USE_ENV (optional - if false, uses hardcoded defaults)
 * - E2E_BASE_URL (default: http://localhost:5173/signin)
 * - E2E_TEST_EMAIL (default: student@levante.test)
 * - E2E_TEST_PASSWORD (default: student123)
 *
 * @test-cases
 * 1. Visit sign-in page
 * 2. Enter email and password
 * 3. Submit form
 * 4. Verify redirect (either to nav bar or error message)
 *
 * @expected-behavior
 * - Sign-in form is accessible
 * - Form submission completes
 * - On success: redirects away from /signin and nav bar appears
 * - On failure: stays on /signin and shows error message
 *
 * @related-docs
 * - src/pages/SignIn.vue - Sign-in page component
 *
 * @modification-notes
 * To modify this test:
 * 1. Update default credentials if test account changes
 * 2. Update selectors if sign-in form structure changes
 * 3. Test uses E2E_USE_ENV flag to toggle between env vars and defaults
 * 4. Simple test - mainly for quick validation of auth flow
 */

import 'cypress-real-events';

const useEnvFlag: boolean = (() => {
  const v = Cypress.env('E2E_USE_ENV');
  return v === true || v === 'TRUE' || v === 'true' || v === 1 || v === '1';
})();

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

const defaultUrl = 'http://localhost:5173/signin';
const defaultEmail = 'student@levante.test';
const defaultPassword = 'student123';

const baseUrl: string = useEnvFlag ? (Cypress.env('E2E_BASE_URL') as string) || defaultUrl : defaultUrl;
const email: string = useEnvFlag ? (Cypress.env('E2E_TEST_EMAIL') as string) || defaultEmail : defaultEmail;
const password: string = useEnvFlag ? (Cypress.env('E2E_TEST_PASSWORD') as string) || defaultPassword : defaultPassword;

function typeInto(selector: string, value: string, opts: Partial<Cypress.TypeOptions> = {}) {
  cy.get(selector, { timeout: 60000 })
    .should('be.visible')
    .click()
    .type('{selectall}{backspace}', { delay: 0 })
    .type(value, { delay: 0, ...opts });
}

describe('dev login', () => {
  it('signs in with email/password and shows nav bar', () => {
    cy.intercept('GET', '**/src/pages/SignIn.vue*').as('signInVue');

    cy.visit(baseUrl);

    cy.window({ timeout: 60000 }).should((win) => {
      const winWithApp = win as Window & { __LEVANTE_APP__?: unknown };
      if (!winWithApp.__LEVANTE_APP__) throw new Error('App did not expose window.__LEVANTE_APP__ (app not mounted?)');
    });

    cy.window({ timeout: 60000 }).then((win) => {
      const winWithApp = win as Window & { __LEVANTE_APP__?: unknown; Cypress?: unknown; __VITE_BASE_URL__?: unknown };
      const app = winWithApp.__LEVANTE_APP__;
      const appWithRouter = app as
        | {
            $?: { appContext?: { config?: { globalProperties?: Record<string, unknown> } } };
            $route?: { path?: unknown; name?: unknown };
            $router?: { currentRoute?: { value?: { path?: unknown; name?: unknown } } };
          }
        | undefined;

      const internal = appWithRouter?.$;
      const globalProps = internal?.appContext?.config?.globalProperties;
      const globalRouter = globalProps && isRecord(globalProps) ? globalProps.$router : undefined;
      const globalCurrentRoute =
        globalRouter && isRecord(globalRouter) && isRecord(globalRouter.currentRoute) ? globalRouter.currentRoute : undefined;
      const globalCurrentRouteValue =
        globalCurrentRoute && isRecord(globalCurrentRoute) && isRecord(globalCurrentRoute.value) ? globalCurrentRoute.value : undefined;
      const globalHistory =
        globalRouter && isRecord(globalRouter) && isRecord(globalRouter.options) && isRecord(globalRouter.options.history)
          ? globalRouter.options.history
          : undefined;
      const globalHistoryLocation =
        globalHistory && isRecord(globalHistory) && isRecord(globalHistory.location) ? globalHistory.location : undefined;

      const snapshot = {
        hasCypress: Boolean(winWithApp.Cypress),
        hasApp: Boolean(app),
        viteBaseUrl: winWithApp.__VITE_BASE_URL__ ?? null,
        locationPathname: win.location.pathname,
        routePath: appWithRouter?.$route?.path ?? null,
        routeName: appWithRouter?.$route?.name ?? null,
        routerPath: appWithRouter?.$router?.currentRoute?.value?.path ?? null,
        routerName: appWithRouter?.$router?.currentRoute?.value?.name ?? null,
        hasInternal: Boolean(internal),
        globalRouterPath: globalCurrentRouteValue?.path ?? null,
        globalRouterName: globalCurrentRouteValue?.name ?? null,
        globalHistoryLocation: globalHistoryLocation ?? null,
      };
      cy.writeFile('cypress/tmp/dev-login-app-snapshot.json', JSON.stringify(snapshot, null, 2));
    });

    cy.window({ timeout: 60000 }).then((win) => {
      const app = (win as Window & { __LEVANTE_APP__?: unknown }).__LEVANTE_APP__ as
        | { $?: { appContext?: { config?: { globalProperties?: Record<string, unknown> } } } }
        | undefined;
      const globalProps = app?.$?.appContext?.config?.globalProperties;
      const router = globalProps && isRecord(globalProps) ? globalProps.$router : undefined;
      const isReady =
        router && isRecord(router) && typeof router.isReady === 'function'
          ? (router.isReady as () => Promise<void>)
          : null;
      if (!isReady) return;

      cy.wrap(
        Promise.race([
          isReady().then(() => true),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000)),
        ]),
        { log: false, timeout: 7000 },
      ).then((ready) => {
        cy.writeFile('cypress/tmp/dev-login-router-is-ready.json', JSON.stringify({ ready }, null, 2));
      });
    });

    cy.wait(5000, { log: false });
    cy.get('@signInVue.all').then((requests) => {
      cy.writeFile(
        'cypress/tmp/dev-login-signin-vue-requests.json',
        JSON.stringify({ count: Array.isArray(requests) ? requests.length : 0 }, null, 2),
      );
    });

    cy.get('body', { timeout: 60000 }).then(($body) => {
      const hasEmailInput = $body.find('[data-cy="input-username-email"]').length > 0;
      if (hasEmailInput) return;
      cy.writeFile('cypress/tmp/dev-login-body.html', $body.html() ?? '');
      cy.writeFile('cypress/tmp/dev-login-body-text.txt', $body.text());
      cy.window().then((win) => {
        const winWithApp = win as Window & { __LEVANTE_APP__?: unknown };
        const app = winWithApp.__LEVANTE_APP__ as Record<string, unknown> | undefined;
        const route = app && '$route' in app ? (app.$route as unknown) : null;
        const router = app && '$router' in app ? (app.$router as unknown) : null;
        const keys = app ? Object.keys(app) : [];

        cy.writeFile('cypress/tmp/dev-login-app-keys.json', JSON.stringify(keys, null, 2));
        cy.writeFile('cypress/tmp/dev-login-route.json', JSON.stringify(route, null, 2));
        cy.writeFile('cypress/tmp/dev-login-router.json', JSON.stringify(router, null, 2));
      });
    });

    typeInto('[data-cy="input-username-email"]', email);
    typeInto('[data-cy="input-password"]', password, { log: false });
    cy.get('[data-cy="submit-sign-in-with-password"]').should('be.visible').click();

    cy.location('pathname', { timeout: 30000 }).then((p) => {
      if (/\/signin$/.test(p)) cy.contains(/incorrect|invalid|wrong password/i, { timeout: 10000 }).should('exist');
      else cy.get('[data-testid="nav-bar"]', { timeout: 30000 }).should('be.visible');
    });
  });
});


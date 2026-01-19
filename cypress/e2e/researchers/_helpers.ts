import { assert } from 'chai';

export function ignoreKnownHostedUncaughtExceptions() {
  const baseUrl = Cypress.config('baseUrl');
  const isHosted =
    typeof baseUrl === 'string' &&
    (baseUrl.includes('web.app') || baseUrl.includes('levante-network.org') || baseUrl.includes('levante-framework'));
  if (!isHosted) return;

  Cypress.on('uncaught:exception', (err) => {
    if (err.message.includes('Missing or insufficient permissions')) return false;
    if (err.message.includes('Cannot read properties of null (reading')) return false;
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

    const baseUrl = Cypress.config('baseUrl');
    const isLocalhost = typeof baseUrl === 'string' && baseUrl.includes('localhost:5173');

    const windowErrors: Array<{ type: 'error' | 'unhandledrejection'; message: string }> = [];

    cy.on('window:before:load', (win) => {
      win.addEventListener('error', (e) => {
        const message = e?.message || 'Unknown window error';
        windowErrors.push({ type: 'error', message });
      });
      win.addEventListener('unhandledrejection', (e) => {
        const reason = (e as PromiseRejectionEvent).reason;
        const message =
          reason instanceof Error
            ? `${reason.name}: ${reason.message}`
            : typeof reason === 'string'
              ? reason
              : `Unhandled rejection: ${JSON.stringify(reason)}`;
        windowErrors.push({ type: 'unhandledrejection', message });
      });
    });

    if (isLocalhost) cy.intercept('GET', '**/src/pages/SignIn.vue*').as('signInPageModule');

    cy.intercept('POST', '**/accounts:signInWithPassword*').as('signInWithPassword');

    cy.visit('/signin');
    cy.location('pathname', { timeout: 60000 }).should('eq', '/signin');

    // Wait for app to finish initializing (if it's still initializing)
    cy.get('body', { timeout: 60000 }).then(($body) => {
      if ($body.find('[data-testid="app-initializing"]').length > 0) {
        cy.get('[data-testid="app-initializing"]', { timeout: 120000 }).should('not.exist');
      }
    });

    // Wait for router-view to render content (not just empty comments)
    // The SignIn page should have a signin-container or the email input
    cy.get('#signin-container, [data-cy="input-username-email"]', { timeout: 120000 }).should('exist');

    const startedAt = Date.now();
    const timeoutMs = 120_000;
    const pollMs = 1_000;

    function waitForEmailInput(): Cypress.Chainable<void> {
      return cy.get('body', { timeout: 60000 }).then(($body) => {
        const hasEmailInput = $body.find('[data-cy="input-username-email"]').length > 0;
        if (hasEmailInput) return;

        if (Date.now() - startedAt > timeoutMs) {
          const errorMessage = `Timed out waiting for signin inputs. Wrote diagnostics to cypress/tmp/login-body.{html,txt}. url=${String(
            $body[0]?.baseURI ?? '',
          )}`;
          return cy
            .window()
            .then((win) => {
              const winWithApp = win as Window & { __LEVANTE_APP__?: { $route?: unknown } };
              const route = winWithApp.__LEVANTE_APP__?.$route ?? null;
              return cy.writeFile('cypress/tmp/login-route.json', JSON.stringify(route, null, 2));
            })
            .then(() => cy.writeFile('cypress/tmp/login-window-errors.json', JSON.stringify(windowErrors, null, 2)))
            .then(() => cy.writeFile('cypress/tmp/login-body.html', $body.html() ?? ''))
            .then(() => cy.writeFile('cypress/tmp/login-body-text.txt', $body.text()))
            .then(() => {
              throw new Error(errorMessage);
            });
        }

        return cy.wait(pollMs).then(() => waitForEmailInput());
      }) as unknown as Cypress.Chainable<void>;
    }

    cy.wrap(null, { log: false }).then(() => waitForEmailInput());

    cy.get('[data-cy="input-username-email"]', { timeout: 60000 }).should('be.visible');
    typeInto('[data-cy="input-username-email"]', params.email);
    cy.get('[data-cy="input-password"]', { timeout: 60000 }).should('be.visible');
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

  function forceCurrentSiteNameIfMissing(selectedSiteName: string): Cypress.Chainable<void> {
    // Hosted previews can lag on loading the districts list (or a site was just created), so the dropdown can
    // successfully set `currentSite` (id) while `currentSiteName` stays null. Some flows (e.g. Add Cohort)
    // rely on both values, so we force `currentSiteName` to the label we just selected when it's missing.
    const started = Date.now();

    function attempt(): Cypress.Chainable<void> {
      return cy.window().then((win) => {
        const w = win as Window & {
          __LEVANTE_APP__?: { $pinia?: { _s?: Map<string, unknown>; state?: { value?: { authStore?: unknown } } } };
        };

        const pinia = w.__LEVANTE_APP__?.$pinia;
        const authStore = pinia?._s?.get('authStore') as
          | {
              currentSite?: unknown;
              currentSiteName?: unknown;
              setCurrentSite?: (id: string | null, name: string | null) => void;
            }
          | undefined;

        const authState = pinia?.state?.value?.authStore as
          | { currentSite?: unknown; currentSiteName?: unknown }
          | undefined;

        const currentSite = authStore?.currentSite ?? authState?.currentSite;
        const currentSiteName = authStore?.currentSiteName ?? authState?.currentSiteName;

        if (typeof currentSite === 'string' && currentSite && currentSite !== 'any') {
          if (currentSiteName == null || currentSiteName === '') {
            if (authStore?.setCurrentSite) {
              authStore.setCurrentSite(currentSite, selectedSiteName);
            } else if (authState && typeof authState === 'object') {
              (authState as { currentSiteName?: unknown }).currentSiteName = selectedSiteName;
            }
          }
          return;
        }

        if (Date.now() - started > 10_000) return;
        return cy.wait(200, { log: false }).then(() => attempt());
      }) as unknown as Cypress.Chainable<void>;
    }

    return attempt();
  }

  function attempt(): Cypress.Chainable<void> {
    return cy.get('body', { timeout: 60000 }).then(($body) => {
      if ($body.find('[data-cy="site-select"]').length) {
        cy.get('[data-cy="site-select"]', { timeout: 60000 }).should('be.visible').click();
        cy.contains('[role="option"]', new RegExp(`^${escapeRegExp(siteName)}$`), { timeout: 60000 }).click();
        return forceCurrentSiteNameIfMissing(siteName);
      }

      return cy
        .window()
        .then((win) => {
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
        })
        .then(() => undefined) as unknown as Cypress.Chainable<void>;
    }) as unknown as Cypress.Chainable<void>;
  }

  function retryOrFail(message: string): Cypress.Chainable<void> {
    if (Date.now() - startedAt > timeoutMs) throw new Error(message);
    cy.wait(pollMs);
    return attempt();
  }

  return attempt();
}

export function waitForAuthClaimsLoaded(): Cypress.Chainable<void> {
  const timeoutMs = 120_000;
  const pollMs = 500;
  const startedAt = Date.now();

  function findPiniaFromProvides(provides: unknown): { _s?: Map<string, unknown>; state?: { value?: unknown } } | null {
    if (!provides || typeof provides !== 'object') return null;
    const providesObject = provides as Record<string, unknown>;
    const symbolValues = Object.getOwnPropertySymbols(providesObject).map(
      (symbol) => (providesObject as Record<symbol, unknown>)[symbol],
    );
    const values = [...Object.values(providesObject), ...symbolValues];
    return (
      (values.find((value) => {
        if (!value || typeof value !== 'object') return false;
        const candidate = value as { _s?: unknown; state?: unknown };
        return Boolean(candidate._s || candidate.state);
      }) as { _s?: Map<string, unknown>; state?: { value?: unknown } }) ?? null
    );
  }

  function attempt(): Cypress.Chainable<void> {
    return (cy.window({ log: false }).then((win) => {
      const w = win as Window & { __LEVANTE_APP__?: unknown };
      const app = w.__LEVANTE_APP__ as {
        $pinia?: { _s?: Map<string, unknown>; state?: { value?: { authStore?: unknown } } };
        $?: { appContext?: { provides?: unknown } };
      };
      const pinia = app?.$pinia ?? findPiniaFromProvides(app?.$?.appContext?.provides);
      const authState = (pinia as { state?: { value?: { authStore?: unknown } } } | null)?.state?.value?.authStore as
        | { userClaims?: unknown; userData?: unknown }
        | undefined;

      const userClaims = authState?.userClaims as { claims?: unknown } | undefined;
      const claims = userClaims?.claims;
      const claimsLoaded = Boolean(
        claims && typeof claims === 'object' && !Array.isArray(claims) && Object.keys(claims).length > 0,
      );
      const userDataLoaded = Boolean(authState?.userData);

      if (claimsLoaded && userDataLoaded) return;

      if (Date.now() - startedAt > timeoutMs) {
        const levanteApp = (win as Window & { __LEVANTE_APP__?: unknown }).__LEVANTE_APP__;
        const provides = (app as { $?: { appContext?: { provides?: unknown } } } | null)?.$?.appContext?.provides ?? null;
        const providesSymbols =
          provides && typeof provides === 'object' ? Object.getOwnPropertySymbols(provides as Record<string, unknown>) : [];
        const piniaFromProvides = findPiniaFromProvides(provides);
        const diagnostics = {
          claimsLoaded,
          userDataLoaded,
          userClaims: userClaims ?? null,
          hasLevanteApp: Boolean(levanteApp),
          levanteAppType: typeof levanteApp,
          levanteAppKeys: levanteApp && typeof levanteApp === 'object' ? Object.keys(levanteApp as Record<string, unknown>) : [],
          hasPinia: Boolean(pinia),
          piniaFromProvides: Boolean(piniaFromProvides),
          providesKeys: provides && typeof provides === 'object' ? Object.keys(provides as Record<string, unknown>) : [],
          providesSymbolsCount: providesSymbols.length,
          authStoreKeys: authState ? Object.keys(authState as Record<string, unknown>) : [],
          authStoreSession: win.sessionStorage.getItem('authStore'),
          location: win.location?.href ?? null,
        };
        return cy
          .writeFile('cypress/tmp/auth-claims-not-loaded.json', JSON.stringify(diagnostics, null, 2))
          .then(() => {
            throw new Error(
              'Timed out waiting for authStore userClaims/userData to load (see cypress/tmp/auth-claims-not-loaded.json)',
            );
          });
      }

      return cy.wait(pollMs, { log: false }).then(() => attempt());
    }) as unknown) as Cypress.Chainable<void>;
  }

  return attempt();
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

      return cy.wait(pollMs).then(() => {
        cy.reload();
        cy.get('[data-cy="search-input"] input', { timeout: 60000 })
          .should('be.visible')
          .clear()
          .type(`${assignmentName}{enter}`);
        return attempt();
      });
    }) as unknown as Cypress.Chainable<void>;
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
  let createUsersError: { message: string } | null = null;
  let linkUsersError: { message: string } | null = null;
  let createUsersRequestUsers: Array<{
    orgIds?: unknown;
    districtId?: string;
    siteId?: string;
    userType?: string;
  }> | null = null;

  return cy
    .wait('@createUsers', { timeout: 60000 })
    .then((interception) => {
      const status = interception.response?.statusCode;
      const body = interception.response?.body;
      const requestBody = interception.request?.body;
      const requestUsers =
        requestBody?.data?.userData?.users ??
        requestBody?.data?.users ??
        requestBody?.userData?.users ??
        requestBody?.users;
      if (Array.isArray(requestUsers)) createUsersRequestUsers = requestUsers;
      const created = extractCreatedUsersFromResponse(body);

      if (!created) {
        const debugPayload = {
          status,
          requestBody,
          responseBody: body ?? null,
        };
        createUsersError = {
          message: `createUsers returned unexpected body (status=${status}). request=${JSON.stringify(
            requestBody,
          )} body=${JSON.stringify(body)}`,
        };
        cy.writeFile('cypress/tmp/create-users-debug.json', JSON.stringify(debugPayload, null, 2));
        return;
      }

      assert.isAtLeast(created.length, 3, 'createUsers should return at least 3 created users');
      assert.isString(created[0]?.uid, 'child uid');
      assert.isString(created[1]?.uid, 'caregiver uid');
      assert.isString(created[2]?.uid, 'teacher uid');

      createdUsers = created;
    })
    .then(() => {
      if (createUsersError) throw new Error(createUsersError.message);
      if (!createdUsers) throw new Error('createUsers did not return created users');

      cy.contains('User Creation Successful', { timeout: 60000 }).should('exist');

      if (createUsersRequestUsers) {
        cy.readFile('bug-tests/site.ai-tests.json', { log: false }).then((siteInfo) => {
          const projectId = siteInfo?.projectId;
          const fallbackSiteId = siteInfo?.districtId;
          const siteName = siteInfo?.siteName ?? '';
          const users = createdUsers!.map((createdUser, index) => {
            const source = createUsersRequestUsers?.[index] ?? {};
            return {
              uid: createdUser.uid,
              orgIds: source.orgIds ?? {},
              districtId: source.districtId ?? fallbackSiteId,
              siteId: source.siteId ?? fallbackSiteId,
              userType: source.userType,
              siteName,
            };
          });
          return cy
            .writeFile(
              'cypress/tmp/patch-user-orgs.json',
              { projectId, users },
              { log: false },
            )
            .then(() =>
              cy.exec('node scripts/e2e-init/patch-user-orgs.mjs cypress/tmp/patch-user-orgs.json', {
                log: false,
              }),
            );
        });
      }

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
        const debugPayload = {
          status: linkStatus,
          requestBody: linkInterception.request?.body ?? null,
          responseBody: linkBody ?? null,
        };
        linkUsersError = {
          message: `linkUsers failed: HTTP ${linkStatus} body=${JSON.stringify(linkBody)}`,
        };
        cy.writeFile('cypress/tmp/link-users-debug.json', JSON.stringify(debugPayload, null, 2));
        return;
      }
      const maybeError = isRecord(linkBody) ? linkBody.error : undefined;
      if (maybeError) throw new Error(`linkUsers failed: body.error=${JSON.stringify(maybeError)}`);
    })
    .then(() =>
      cy
        .wrap(null, { log: false })
        .then(() => {
          if (linkUsersError) {
            return cy.exec('node scripts/e2e-init/patch-user-links.mjs cypress/tmp/link-users-debug.json', {
              log: false,
            });
          }
        })
        .then(() => {
          if (!createdUsers) throw new Error('createUsers did not return created users');
          return {
            createdUsers,
            childLogin: { email: createdUsers[0]!.email, password: createdUsers[0]!.password },
          };
        }),
    ) as unknown as Cypress.Chainable<AddAndLinkUsersResult>;
}
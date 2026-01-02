# Researcher/Admin Cypress E2E

This doc is the durable “shared context” for Cypress E2E in `levante-dashboard`, intended for humans and AI agents.

## Goals

- Keep **task/workflow specs** stable and always passing.
- Keep **bug repro specs** minimal and deterministic (often expected to fail until fixed).
- Make it possible to run everything from **one terminal** with clear artifacts (videos/screenshots).

## Where tests live

- **Tasks (should pass):** `cypress/e2e/researchers/tasks/`
- **Bugs (repros, may fail):** `cypress/e2e/researchers/bugs/`

## How to run locally (recommended)

Most researcher E2E specs expect a running local dev server at `http://localhost:5173`.
Use the wrapper script which starts Vite, runs Cypress, and then cleans up:

- `npm run e2e:researchers`
- `bash scripts/e2e-researchers.sh --spec cypress/e2e/researchers/tasks/researcher-docs-scenario.cy.ts`

## Videos and screenshots

- **Videos:** `cypress/videos/`
- **Screenshots:** `cypress/screenshots/`

Videos are enabled by default for E2E, and artifacts are preserved between runs.

## Credentials and environment variables

Preferred: set these in `.env` (DEV).

- `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD` (or `DEV_LOGIN`, `DEV_PASSWORD`)
- `E2E_SITE_NAME` (often `ai-tests`)
- `E2E_VIDEO` (defaults to true in wrapper)

Optional seeded admin accounts for `ai-tests`:
- `E2E_AI_ADMIN_EMAIL`, `E2E_AI_ADMIN_PASSWORD`
- `E2E_AI_SITE_ADMIN_EMAIL`, `E2E_AI_SITE_ADMIN_PASSWORD`

## Clean slate test site: `ai-tests` (DEV)

We keep a dedicated, resettable site named `ai-tests` for repeatable E2E.

- Reset script: `scripts/e2e-init/reset-site.mjs`
- Canonical commands: see `README_TESTS.md` section “Researcher E2E: clean ai-tests site (DEV)”

## Reliability guidance

- Prefer `data-cy` selectors; avoid brittle text selectors unless it’s product copy.
- Expect eventual consistency for some workflows (e.g., assignment processing).
- Only ignore `uncaught:exception` for known hosted-site noise or explicitly documented cases.


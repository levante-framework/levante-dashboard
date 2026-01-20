# Context History (LEVANTE Dashboard)

This file captures recent investigation context, testing changes, and fixes so we can pick up quickly after restarts.

## Jan 2026: E2E and bug #766

### What we added or changed

- Added the E2E Testing Results page to list Bugs and Tasks and run specs locally or via the remote runner.
- Added and updated Cypress specs:
  - `cypress/e2e/researchers/bugs/gh-0766-open.cy.ts`
  - `cypress/e2e/researchers/tasks/researcher-docs-site-admin-school-class-add-users.cy.ts`
- Updated E2E catalog entries in `src/testing/e2eCatalog.ts` to include new specs.
- Allowlisted new specs in `.github/workflows/e2e-remote-runner.yml`.
- Added `data-cy`/`data-testid` selectors to key UI elements for stable E2E selectors.
- Adjusted `scripts/e2e-init/reset-site.mjs` to preserve existing non-e2e admin users rather than failing.
- Added debug/admin scripts:
  - `scripts/e2e-init/debug-org-combo.mjs`
  - `scripts/e2e-init/debug-user-record.mjs`
  - `scripts/e2e-init/strip-user-claims.mjs`
  - `scripts/e2e-init/restore-user-claims.mjs`
- Updated `.gitignore` to avoid committing Cypress artifacts and generated bug-test data.

### Bug #766 root cause and fix

- Symptom: Add Users fails when using school + class combinations with "Invalid Class" errors.
- Root cause: `fetchOrgByName` in `src/helpers/query/orgs.js` was sending `parentSchool: null` for class lookups, which removed the school filter from the query.
- Fix: include the selected school id when `orgType` is `classes`, so class queries include the correct `parentSchool`.

### How we verified

- Reproduced the failure on prod and observed that the class `runQuery` payload lacked the `schoolId` filter.
- After the fix, the new spec validates that school + class Add Users succeeds and does not show row-level validation errors.

## E2E runner notes

- Local runner: `VITE_E2E_RUNNER=TRUE npm run dev:db:runner` then open `/testing-results`.
- Remote runner: `api/e2e/*` endpoints trigger `.github/workflows/e2e-remote-runner.yml`.
- Remote runner allowlist: spec ids must be mapped to a Cypress spec in the workflow.

## Data and artifacts

- `bug-tests/site.ai-tests.json` is required for local researcher E2E runs.
- Cypress artifacts are stored under `cypress/videos`, `cypress/screenshots`, `cypress/downloads`, and `cypress/tmp` and are ignored by git.

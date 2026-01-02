# Bug-focused Cypress E2E tests (GitHub Issues)

This repo supports writing Cypress specs that map 1:1 to GitHub Issues of type **[Bug]** (starting with **P0** and **P1**).

## Conventions

- **Location**: `cypress/e2e/researchers/bugs/`
- **File name**: `gh-####-(open|closed).cy.ts`
- **Spec title**: include `GH#####` and `[OPEN]` or `[CLOSED]`

## Open vs Closed expectations

- **Closed bugs**: tests should **pass** (regressions if they fail).
- **Open bugs**: tests are **skipped by default** unless you opt in with `E2E_RUN_OPEN_BUGS=true`.

## Fetch issues (P0/P1 + Bug)

Requires a GitHub token to avoid low rate limits:

- `GITHUB_TOKEN=...`

Run:

- `npm run bugtests:fetch:p0` (start here)
- `npm run bugtests:fetch:p1`

These write:

- `bug-tests/issues.priority-p0.open.json`
- `bug-tests/issues.priority-p1.open.json`

## Scaffold spec stubs

- `npm run bugtests:scaffold:p0`
- `npm run bugtests:scaffold:p1`
- `npm run bugtests:scaffold:p0p1`

This creates missing files under `cypress/e2e/researchers/bugs/` without overwriting existing specs.

To overwrite existing stubs:

- `npm run bugtests:scaffold -- --force`

## Run bug specs

- **Closed only (gating)**: `npm run bugtests:run:closed`
- **Open only (non-gating by default)**: `npm run bugtests:run:open`

## Priority is a GitHub Project field (not a label)

The Dashboard team tracks `Priority` in a GitHub Project (queryable as `priority:P0` / `priority:P1` in the project UI).
Our fetcher reads the Project via GitHub GraphQL and filters:

- **Repo**: `levante-framework/levante-dashboard`
- **Issue Type**: Bug (GitHub Issue Type when present; falls back to `[Bug]` prefix)
- **Priority**: `P0` or `P1`
- **State**: open (for the initial backlog)

This project lives at:

- `https://github.com/orgs/levante-framework/projects/1/...`

To run the fetcher you must pass the project identifier (already wired into the npm scripts):

- `--project-org <orgLogin>`
- `--project-number <number>`


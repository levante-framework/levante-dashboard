# ADR 0001: Researcher Cypress E2E structure (tasks vs bugs)

## Status

Accepted

## Context

We need Cypress E2E coverage for the researcher/admin experience in `levante-dashboard`.
Some specs represent stable user workflows, while others exist specifically to reproduce known/open bugs.
Mixing these in a single folder makes it hard to understand whether failures indicate regressions or expected bug repros.

## Decision

We split researcher E2E specs into two categories:

- `cypress/e2e/researchers/tasks/`: stable user-visible workflows that should pass consistently
- `cypress/e2e/researchers/bugs/`: minimal repro specs for known bugs (may intentionally fail)

We also standardize local execution via a wrapper that starts Vite and runs Cypress in a single terminal:

- `scripts/e2e-researchers.sh`

Videos are enabled and artifacts are preserved between runs to make debugging reproducible.

## Consequences

- Contributors can quickly distinguish “expected failing repro” from “regression”.
- CI can be configured to run `tasks/` by default and `bugs/` on demand.
- Bug repro specs can be referenced directly from GitHub issues for consistent reproduction steps.


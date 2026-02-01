# Dev Dependency Vulnerability Cleanup

This document summarizes the dev dependency cleanup work to reduce dev-only
vulnerabilities while keeping runtime behavior unchanged.

## What changed
- Updated dev dependencies to current versions (kept `@pinia/testing` on v0.x).
- Added `vue-eslint-parser` to satisfy `eslint-plugin-vue` v10.
- Removed `firebase-admin` and `firebase-tools` from devDependencies since they
  were unused in this repo and were a source of dev-only vulnerabilities.
- Removed `vite-plugin-node-polyfills` and its Vite plugin usage to avoid the
  low-severity dev-only vulnerability chain it introduced.

## Current status
- Dev-only vulnerabilities: 0
- Build: `npm run build:dev` succeeds.
- New build warnings:
  - Vite externalized `stream` for the roar/core-tasks bundles.
  - Font files did not resolve at build time (existing assets).
  - Sass deprecation warnings for `@import`.

## Notes
- The `stream` warnings come from compiled bundles in:
  - `@bdelab/roar-pa`, `@bdelab/roar-sre`, `@bdelab/roar-swr`
  - `@levante-framework/core-tasks`
- Those bundles import Node stream support via PapaParse. The app uses PapaParse
  only on in-memory strings, so the Node stream path should not be exercised.

## Suggested next steps
- If runtime errors appear in areas using roar tasks, reconsider adding a
  polyfill or upstreaming a fix to the roar/core-tasks bundles.
- Consider upstreaming a change in `@levante-framework/core-tasks` to move off
  `@bdelab/jscat@3.x` (Babel 6 chain) if the security posture requires it.
- Run `npm run lint` and `npm test` to verify eslint/vitest changes after the
  dev dependency upgrades.

# Permissions E2E Tests (LEVANTE Dashboard)

This document captures the permissions system redesign spec (from Notion) and the corresponding Cypress E2E coverage.

Source spec: `https://www.notion.so/Permissions-234244e26d9b80a98181c67ea1f27e91`

## Overview (spec)

- **Approach**: resource-based access control (RBAC per resource/action), roles baked into backend logic
- **No permission management UI**: roles/permissions come from backend + permissions document

### Roles (spec)

- **super_admin**: internal dev access to everything
- **site_admin**: full control over their site’s resources
- **admin**: subset of actions within their site
- **research_assistant**: read access with ability to create users
- **participant**: no access to admin side of dashboard

### User classification (spec)

- `userType`: who they are (assessment eligibility) — `'admin' | 'student' | 'teacher' | 'caregiver'`
- `role`: what they can do (management permissions) — `'super_admin' | 'site_admin' | 'admin' | 'research_assistant' | 'participant'`

### Data model (spec)

1) **Permissions doc**

- Firestore: collection `system`, document `permissions`
- Contains a permission matrix by role/resource/action (and group sub-resources like sites/schools/classes/cohorts)

2) **User doc**

- Firestore: collection `users`
- Add `roles: [{ siteId, siteName, role }]` so users can have different roles per site

3) **Legacy userClaims**

- Removed as the source of permission decisions
- Dashboard uses `userClaims.claims.useNewPermissions` to decide whether to enforce the new system in the UI

### Action matrix (spec summary)

- **Groups**: super_admin/site_admin CRUDE; admin CRUD; research_assistant R; participant -
- **Assignments**: super_admin/site_admin CRUDE; admin CRUD; research_assistant R; participant -
- **Users**: super_admin/site_admin CRUDE; admin CRUD; research_assistant CR; participant -
- **Admins**: super_admin/site_admin CRUDE; admin R; research_assistant R; participant -
- **Tasks**: super_admin/site_admin CRUDE; admin exclude-only for tasks management; research_assistant R; participant -

## What we test (automated)

The Cypress spec `cypress/e2e/researchers/tasks/permissions.cy.ts` validates:

1) **New system is actually enabled**
- Fails if `authStore.shouldUsePermissions !== true` after login (meaning `userClaims.claims.useNewPermissions` is not enabled for that test account).

2) **Route-level access control**
- Users without access are redirected to **Home** (`/`) (router guard behavior).

3) **Action-level UI gating**
- We assert that action buttons are shown/hidden based on the permissions system:
  - Example: **Create Cohort** (“Add Group”) is gated by `groups:create:cohorts`
  - Example: **Add Users** is gated by `users:create`

## Roles under test (E2E)

Required:

- **admin**: `E2E_AI_ADMIN_EMAIL` / `E2E_AI_ADMIN_PASSWORD`
- **site_admin**: `E2E_AI_SITE_ADMIN_EMAIL` / `E2E_AI_SITE_ADMIN_PASSWORD`

Optional:

- **research_assistant**: `E2E_AI_RESEARCH_ASSISTANT_EMAIL` / `E2E_AI_RESEARCH_ASSISTANT_PASSWORD`
- **super_admin**: `E2E_AI_SUPER_ADMIN_EMAIL` / `E2E_AI_SUPER_ADMIN_PASSWORD`
- **participant**: `E2E_PARTICIPANT_EMAIL` / `E2E_PARTICIPANT_PASSWORD`

## Environment variables

Required for this spec:

- `E2E_SITE_NAME` (default: `ai-tests`)
- Role credentials above

Recommended for speed:

- `E2E_USE_SESSION=TRUE` (uses `cy.session()` in the shared login helper to avoid re-logging in between tests)

## Running the spec directly

Run against the hosted preview (recommended):

```bash
E2E_APP_URL='https://hs-levante-admin-dev--ai-tests-dctel36u.web.app' \
E2E_SITE_NAME='ai-tests' \
E2E_USE_SESSION=TRUE \
E2E_AI_ADMIN_EMAIL='...' E2E_AI_ADMIN_PASSWORD='...' \
E2E_AI_SITE_ADMIN_EMAIL='...' E2E_AI_SITE_ADMIN_PASSWORD='...' \
npx cypress run --browser chrome --e2e --spec cypress/e2e/researchers/tasks/permissions.cy.ts \
  --config baseUrl=${E2E_APP_URL},video=true
```

Optional roles:

```bash
E2E_AI_RESEARCH_ASSISTANT_EMAIL='...' E2E_AI_RESEARCH_ASSISTANT_PASSWORD='...' \
E2E_AI_SUPER_ADMIN_EMAIL='...' E2E_AI_SUPER_ADMIN_PASSWORD='...' \
E2E_PARTICIPANT_EMAIL='...' E2E_PARTICIPANT_PASSWORD='...'
npx cypress run --browser chrome --e2e --spec cypress/e2e/researchers/tasks/permissions.cy.ts \
  --config baseUrl=${E2E_APP_URL},video=true
```

## Running from the E2E Results page

Start the local runner, then open `http://localhost:5173/testing-results`:

```bash
VITE_E2E_RUNNER=TRUE npm run dev:db:runner
```

Then click **Run** for the “Permissions” task.


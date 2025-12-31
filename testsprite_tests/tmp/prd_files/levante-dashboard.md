# LEVANTE Dashboard (Dev) – TestSprite PRD (Minimal)

## Purpose
LEVANTE Dashboard supports two primary roles:
- **Participants** (students, parents/caregivers, teachers) who complete tasks/assessments and surveys.
- **Administrators** who manage organizations, assignments, and users.

This PRD focuses on the **dev site login flow** and basic post-login readiness.

## Entry Point
- URL: `/signin`

## Login Requirements
- User can log in with **email + password**.
- Login form selectors:
  - Email input: `[data-cy="input-username-email"]`
  - Password input: `[data-cy="input-password"]`
  - Submit button: `[data-cy="submit-sign-in-with-password"]`
- After successful login, the user should be redirected to the appropriate landing page:
  - Participants → home/assignment selection and task list.
  - Admins → admin landing page.

## Success Criteria for “Login works”
- Sign-in form accepts credentials and submits.
- App navigates away from `/signin`.
- A logged-in navigation/landing UI is visible (e.g., nav bar / home content).

## Explicit Test Scenario (Email/Password)
1. Visit `/signin`
2. Fill email and password using the `data-cy` selectors above.
3. Click submit.
4. Assert `[data-testid="nav-bar"]` is visible.

## Non-Goals
- Deep coverage of every admin workflow.
- Full survey completion; only basic verification that user reaches post-login state.


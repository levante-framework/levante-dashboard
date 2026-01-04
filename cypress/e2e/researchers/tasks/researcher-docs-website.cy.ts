/**
 * @fileoverview Researcher Docs Website: Dashboard Section Smoke Test
 *
 * @description
 * Smoke test for the external researcher documentation website (researcher.levante-network.org).
 * Verifies that all documented dashboard pages render correctly with expected H1 headings.
 * This is an external site test, not testing the dashboard application itself.
 *
 * @test-id task-researcher-docs-website
 * @category tasks
 *
 * @setup
 * - Requires access to https://researcher.levante-network.org
 * - No authentication required (public documentation site)
 * - Test runs against external Next.js/React site
 *
 * @required-env-vars
 * - E2E_APP_URL (default: https://researcher.levante-network.org)
 *   Note: This test targets the docs site, not the dashboard app
 *
 * @test-cases
 * Tests each documented page renders with correct H1:
 * 1. /dashboard - "Dashboard"
 * 2. /dashboard/before-you-start - "Before you start"
 * 3. /dashboard/create-a-group - "1. Add groups"
 * 4. /dashboard/add-users - "2. Add and link users"
 * 5. /dashboard/create-an-assignment - "3. Create assignments"
 * 6. /dashboard/administrator-log-in - "Log in as a study administrator"
 * 7. /dashboard/monitor-completion - "Monitor completion"
 * 8. /dashboard/participant-user-log-in - "Use the dashboard as a child, caregiver, or teacher"
 *
 * @expected-behavior
 * - Each page loads successfully
 * - H1 element is visible and matches expected text (normalized for whitespace)
 * - Test tolerates React hydration errors (common in headless runs)
 *
 * @related-docs
 * - https://researcher.levante-network.org/dashboard - Documentation site
 * - README_TESTS.md - General testing documentation
 *
 * @modification-notes
 * To modify this test:
 * 1. Update page paths if documentation site structure changes
 * 2. Update H1 regex patterns if headings change
 * 3. H1 assertion normalizes whitespace to handle hidden/duplicated text
 * 4. Test ignores React minified errors (#418) as they don't affect page rendering
 * 5. Uses loosenAnchors() helper to make regex matching more flexible
 */

const pages: Array<{ path: string; h1: RegExp }> = [
  { path: '/dashboard', h1: /^Dashboard$/ },
  { path: '/dashboard/before-you-start', h1: /^Before you start$/ },
  { path: '/dashboard/create-a-group', h1: /^1\. Add groups$/ },
  { path: '/dashboard/add-users', h1: /^2\. Add and link users$/ },
  { path: '/dashboard/create-an-assignment', h1: /^3\. Create assignments$/ },
  { path: '/dashboard/administrator-log-in', h1: /^Log in as a study administrator$/ },
  { path: '/dashboard/monitor-completion', h1: /^Monitor completion$/ },
  { path: '/dashboard/participant-user-log-in', h1: /^Use the dashboard as a child, caregiver, or teacher$/ },
];

function loosenAnchors(input: RegExp): RegExp {
  const source = input.source.replace(/^\^/, '').replace(/\$$/, '');
  return new RegExp(source, input.flags);
}

describe('researcher docs website: dashboard section renders', () => {
  Cypress.on('uncaught:exception', (err) => {
    // The external docs site (Next/React) can throw hydration/runtime errors in headless runs.
    // For this smoke test we only care that the pages render enough to show the expected H1.
    if (err.message.includes('Minified React error #418')) return false;
  });

  pages.forEach(({ path, h1 }) => {
    it(`renders: ${path}`, () => {
      cy.visit(path, { timeout: 120000 });
      cy.get('h1', { timeout: 120000 })
        .should('be.visible')
        .invoke('text')
        .then((text) => text.replace(/\s+/g, ' ').trim())
        .should('match', loosenAnchors(h1));
    });
  });
});


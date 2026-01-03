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


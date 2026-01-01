import readme from '../../../README_RESEARCHERS.md?raw';
import testsReadme from '../../../README_TESTS.md?raw';

describe('README_RESEARCHERS.md coverage', () => {
  it('contains all expected dashboard sections (regenerated doc)', () => {
    const expectedSourceUrls = [
      'https://researcher.levante-network.org/dashboard',
      'https://researcher.levante-network.org/dashboard/before-you-start',
      'https://researcher.levante-network.org/dashboard/create-a-group',
      'https://researcher.levante-network.org/dashboard/add-users',
      'https://researcher.levante-network.org/dashboard/create-an-assignment',
      'https://researcher.levante-network.org/dashboard/administrator-log-in',
      'https://researcher.levante-network.org/dashboard/monitor-completion',
      'https://researcher.levante-network.org/dashboard/participant-user-log-in',
    ];

    expectedSourceUrls.forEach((u) => expect(readme, `README includes source url: ${u}`).toContain(u));
  });

  it('has an E2E spec that exercises the documented workflow end-to-end', () => {
    expect(testsReadme, 'README_TESTS documents researcher workflow spec').toContain(
      'cypress/e2e/researchers/researcher-full-workflow.cy.ts',
    );
  });
});


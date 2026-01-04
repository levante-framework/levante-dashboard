export type E2ECategory = 'bugs' | 'tasks';
export type E2EStatus = 'open' | 'closed';
export type E2EResult = 'unknown' | 'pass' | 'fail';

export interface E2EEntry {
  id: string;
  category: E2ECategory;
  name: string;
  githubIssueNumber?: number;
  specPath?: string;
  runScript: string;
  defaultStatus: E2EStatus;
}

export const e2eCatalog: E2EEntry[] = [
  {
    id: 'gh-0737-open',
    category: 'bugs',
    name: 'GH#737 Prohibit identical class names within site',
    githubIssueNumber: 737,
    specPath: 'cypress/e2e/researchers/bugs/gh-0737-open.cy.ts',
    runScript:
      "CYPRESS_E2E_RUN_OPEN_BUGS=true npx cypress run --browser chrome --e2e --spec cypress/e2e/researchers/bugs/gh-0737-open.cy.ts --config baseUrl=${E2E_APP_URL:-https://hs-levante-admin-dev--ai-tests-dctel36u.web.app},video=true",
    defaultStatus: 'open',
  },
  {
    id: 'gh-0733-open',
    category: 'bugs',
    name: 'GH#733 SuperAdmin cannot create a site when no site is selected',
    githubIssueNumber: 733,
    specPath: 'cypress/e2e/researchers/bugs/gh-0733-open.cy.ts',
    runScript:
      "CYPRESS_E2E_RUN_OPEN_BUGS=true npx cypress run --browser chrome --e2e --spec cypress/e2e/researchers/bugs/gh-0733-open.cy.ts --config baseUrl=${E2E_APP_URL:-https://hs-levante-admin-dev--ai-tests-dctel36u.web.app},video=true",
    defaultStatus: 'open',
  },
  {
    id: 'gh-0735-open',
    category: 'bugs',
    name: 'GH#735 Progress report blank/403 for some site admins',
    githubIssueNumber: 735,
    specPath: 'cypress/e2e/researchers/bugs/gh-0735-open.cy.ts',
    runScript:
      "CYPRESS_E2E_RUN_OPEN_BUGS=true npx cypress run --browser chrome --e2e --spec cypress/e2e/researchers/bugs/gh-0735-open.cy.ts --config baseUrl=${E2E_APP_URL:-https://hs-levante-admin-dev--ai-tests-dctel36u.web.app},video=true",
    defaultStatus: 'open',
  },
  {
    id: 'gh-0719-closed',
    category: 'bugs',
    name: 'GH#719 (closed)',
    githubIssueNumber: 719,
    specPath: 'cypress/e2e/researchers/bugs/gh-0719-closed.cy.ts',
    runScript:
      "npx cypress run --browser chrome --e2e --spec cypress/e2e/researchers/bugs/gh-0719-closed.cy.ts --config baseUrl=${E2E_APP_URL:-https://hs-levante-admin-dev--ai-tests-dctel36u.web.app},video=true",
    defaultStatus: 'closed',
  },
  {
    id: 'task-add-group',
    category: 'tasks',
    name: 'Add group',
    specPath: 'cypress/e2e/researchers/tasks/add-group.cy.ts',
    runScript:
      'npx cypress run --browser chrome --e2e --spec cypress/e2e/researchers/tasks/add-group.cy.ts --config baseUrl=${E2E_APP_URL:-https://hs-levante-admin-dev--ai-tests-dctel36u.web.app},video=true',
    defaultStatus: 'open',
  },
  {
    id: 'task-administrator-login',
    category: 'tasks',
    name: 'Administrator login',
    specPath: 'cypress/e2e/researchers/tasks/administrator-login.cy.ts',
    runScript:
      'npx cypress run --browser chrome --e2e --spec cypress/e2e/researchers/tasks/administrator-login.cy.ts --config baseUrl=${E2E_APP_URL:-https://hs-levante-admin-dev--ai-tests-dctel36u.web.app},video=true',
    defaultStatus: 'open',
  },
  {
    id: 'task-assignment-task-conditions',
    category: 'tasks',
    name: 'Assignment task conditions',
    specPath: 'cypress/e2e/researchers/tasks/assignment-task-conditions.cy.ts',
    runScript:
      'npx cypress run --browser chrome --e2e --spec cypress/e2e/researchers/tasks/assignment-task-conditions.cy.ts --config baseUrl=${E2E_APP_URL:-https://hs-levante-admin-dev--ai-tests-dctel36u.web.app},video=true',
    defaultStatus: 'open',
  },
  {
    id: 'task-monitor-completion',
    category: 'tasks',
    name: 'Monitor completion',
    specPath: 'cypress/e2e/researchers/tasks/monitor-completion.cy.ts',
    runScript:
      'npx cypress run --browser chrome --e2e --spec cypress/e2e/researchers/tasks/monitor-completion.cy.ts --config baseUrl=${E2E_APP_URL:-https://hs-levante-admin-dev--ai-tests-dctel36u.web.app},video=true',
    defaultStatus: 'open',
  },
  {
    id: 'task-researcher-full-workflow',
    category: 'tasks',
    name: 'Researcher full workflow',
    specPath: 'cypress/e2e/researchers/tasks/researcher-full-workflow.cy.ts',
    runScript:
      'npx cypress run --browser chrome --e2e --spec cypress/e2e/researchers/tasks/researcher-full-workflow.cy.ts --config baseUrl=${E2E_APP_URL:-https://hs-levante-admin-dev--ai-tests-dctel36u.web.app},video=true',
    defaultStatus: 'open',
  },
  {
    id: 'task-researcher-docs-website',
    category: 'tasks',
    name: 'Researcher docs website (video)',
    specPath: 'cypress/e2e/researchers/tasks/researcher-docs-website.cy.ts',
    runScript: 'npm run e2e:researcher-docs:video',
    defaultStatus: 'open',
  },
  {
    id: 'task-researcher-docs-scenario',
    category: 'tasks',
    name: 'Researcher docs scenario (single video)',
    specPath: 'cypress/e2e/researchers/tasks/researcher-docs-scenario.cy.ts',
    runScript:
      'npx cypress run --browser chrome --e2e --spec cypress/e2e/researchers/tasks/researcher-docs-scenario.cy.ts --config baseUrl=${E2E_APP_URL:-https://hs-levante-admin-dev--ai-tests-dctel36u.web.app},video=true',
    defaultStatus: 'open',
  },
  {
    id: 'task-permissions',
    category: 'tasks',
    name: 'Permissions',
    specPath: 'cypress/e2e/researchers/tasks/permissions.cy.ts',
    runScript:
      'npx cypress run --browser chrome --e2e --spec cypress/e2e/researchers/tasks/permissions.cy.ts --config baseUrl=${E2E_APP_URL:-https://hs-levante-admin-dev--ai-tests-dctel36u.web.app},video=true',
    defaultStatus: 'open',
  },
];


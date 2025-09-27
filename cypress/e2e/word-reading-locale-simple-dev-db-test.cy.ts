import 'cypress-real-events';

// Simplified test for Word Reading task locale functionality with dev:db
// This version is more resilient to real Firebase backend issues

describe('Word Reading Task - Simple dev:db Locale Test', () => {
  const spanishLocale = 'es-CO';
  const englishLocale = 'en-US';

  // Use environment variables for configuration
  const useEnvFlag: boolean = (() => {
    const v = Cypress.env('E2E_USE_ENV');
    return v === true || v === 'TRUE' || v === 'true' || v === 1 || v === '1';
  })();

  const dashboardUrl: string = useEnvFlag
    ? ((Cypress.env('E2E_BASE_URL') as string) || 'http://localhost:5173/signin')
    : 'http://localhost:5173/signin';

  const username: string = useEnvFlag
    ? ((Cypress.env('E2E_TEST_EMAIL') as string) || 'student@levante.test')
    : 'student@levante.test';

  const password: string = useEnvFlag
    ? ((Cypress.env('E2E_TEST_PASSWORD') as string) || 'student123')
    : 'student123';

  // Handle Firebase auth errors gracefully
  Cypress.on('uncaught:exception', (err) => {
    if (/auth\/network-request-failed/i.test(err.message)) return false;
    if (/auth\/too-many-requests/i.test(err.message)) return false;
    if (/auth\/user-not-found/i.test(err.message)) return false;
    return true;
  });

  function setLocaleBeforeLoad(locale: string) {
    return {
      onBeforeLoad(win: Window) {
        win.sessionStorage.setItem('levantePlatformLocale', locale);
        win.sessionStorage.setItem('roarPlatformLocale', locale);
      },
    };
  }

  function login() {
    // Wait for sign-in form to be ready
    cy.get('input', { timeout: 30000 }).should('have.length', 2);

    // Input credentials
    cy.get('input').first().clear().type(username);
    cy.get('input').last().clear().type(password);

    // Click login button
    cy.get('button').filter('[data-pc-name=button]').click();

    // Wait for navigation away from signin page (may take longer with real Firebase)
    cy.location('pathname', { timeout: 90000 }).should((p) => expect(p).to.not.match(/\/signin$/));
  }

  function verifyDashboardLoaded() {
    // Wait for dashboard to load
    cy.get('[data-pc-section=tablist]', { timeout: 60000 }).should('exist');
  }

  function findWordReadingTask() {
    // Look for Word Reading task by Spanish name first, then English
    cy.get('[data-pc-section=tablist]').children().then((taskTabs) => {
      let wordReadingTab = null;

      for (let i = 0; i < taskTabs.length; i++) {
        const tab = taskTabs[i];
        const text = tab.textContent?.toLowerCase() || '';

        if (text.includes('palabra') || text.includes('word reading')) {
          wordReadingTab = tab;
          break;
        }
      }

      if (wordReadingTab) {
        cy.wrap(wordReadingTab).click();
      } else {
        // If not found, just proceed with first task
        cy.log('Word Reading task not found, using first available task');
        cy.wrap(taskTabs.first()).click();
      }
    });
  }

  function verifyTaskInterface(expectedLocale: string) {
    // Wait for task panel to load
    cy.get('[data-pc-name=tabpanel][data-p-active=true]', { timeout: 30000 }).should('exist');

    if (expectedLocale === 'es-CO') {
      // Check for Spanish interface elements
      cy.contains('Palabra').should('exist');
      cy.contains('Las palabras aparecerán rápidamente').should('exist');
    } else {
      // Check for English interface elements
      cy.contains('Word Reading').should('exist');
      cy.contains('The words will appear quickly').should('exist');
    }
  }

  function attemptTaskStart() {
    // Try to start the task - this may not work in all cases with real backend
    cy.window().then((win) => {
      cy.spy(win, 'open').as('windowOpenSpy');
    });

    // Scroll and try to find start button
    cy.scrollTo('bottomLeft', { ensureScrollable: false });

    cy.get('[data-pc-name=tabpanel][data-p-active=true]').then(($panel) => {
      const hasSpanishButton = $panel.text().includes('Haz clic para empezar');
      const hasEnglishButton = $panel.text().includes('Click to start');

      if (hasSpanishButton) {
        cy.wrap($panel).contains('Haz clic para empezar').click();
      } else if (hasEnglishButton) {
        cy.wrap($panel).contains('Click to start').click();
      } else {
        // If no start button found, that's okay - we're mainly testing interface
        cy.log('No start button found - interface verification is sufficient');
      }
    });
  }

  describe('Word Reading Task Interface - Spanish (es-CO)', () => {
    it('should display Word Reading task in Spanish', () => {
      cy.visit(dashboardUrl, setLocaleBeforeLoad(spanishLocale));
      login();
      verifyDashboardLoaded();
      findWordReadingTask();
      verifyTaskInterface(spanishLocale);
      attemptTaskStart();
    });
  });

  describe('Word Reading Task Interface - English (en-US)', () => {
    it('should display Word Reading task in English', () => {
      cy.visit(dashboardUrl, setLocaleBeforeLoad(englishLocale));
      login();
      verifyDashboardLoaded();
      findWordReadingTask();
      verifyTaskInterface(englishLocale);
      attemptTaskStart();
    });
  });

  describe('Dashboard Interface Translation', () => {
    it('should show Spanish interface when locale is es-CO', () => {
      cy.visit(dashboardUrl, setLocaleBeforeLoad(spanishLocale));
      login();

      // Check for Spanish dashboard elements
      cy.contains('Tarea completa').should('exist'); // "Task Completed"
      cy.contains('Asignaciones').should('exist'); // "Assignments"
    });

    it('should show English interface when locale is en-US', () => {
      cy.visit(dashboardUrl, setLocaleBeforeLoad(englishLocale));
      login();

      // Check for English dashboard elements
      cy.contains('Task Completed').should('exist');
      cy.contains('Assignments').should('exist');
    });
  });
});

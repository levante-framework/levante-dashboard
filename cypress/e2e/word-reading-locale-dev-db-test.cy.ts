import 'cypress-real-events';

// Test for Word Reading task locale functionality with dev:db (real Firebase backend)
// This version works with npm run dev:db instead of npm run dev (with emulator)

describe('Word Reading Task - dev:db Locale Integration Test', () => {
  const spanishLocale = 'es-CO';
  const englishLocale = 'en-US';

  // Environment-based configuration
  const useEnvFlag: boolean = (() => {
    const v = Cypress.env('E2E_USE_ENV');
    return v === true || v === 'TRUE' || v === 'true' || v === 1 || v === '1';
  })();

  // Use environment variables or defaults
  const dashboardUrl: string = useEnvFlag
    ? ((Cypress.env('E2E_BASE_URL') as string) || 'http://localhost:5173/signin')
    : 'http://localhost:5173/signin';

  const username: string = useEnvFlag
    ? ((Cypress.env('E2E_TEST_EMAIL') as string) || 'student@levante.test')
    : 'student@levante.test';

  const password: string = useEnvFlag
    ? ((Cypress.env('E2E_TEST_PASSWORD') as string) || 'student123')
    : 'student123';

  // For dev:db mode, we need to handle Firebase auth network errors
  Cypress.on('uncaught:exception', (err) => {
    if (/auth\/network-request-failed/i.test(err.message)) return false;
    if (/auth\/too-many-requests/i.test(err.message)) return false;
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
    // Input username
    cy.get('input').should('have.length', 2).then((inputs) => {
      cy.wrap(inputs[0]).clear().type(username);
      cy.wrap(inputs[1]).clear().type(password);
    });

    // Click login button
    cy.get('button').filter('[data-pc-name=button]').click();

    // For dev:db mode, we might need longer timeout for real Firebase auth
    cy.location('pathname', { timeout: 60000 }).should((p) => expect(p).to.not.match(/\/signin$/));
  }

  function setupWindowOpenSpy() {
    cy.window().then((win) => {
      // Spy on window.open to capture the URL
      cy.spy(win, 'open').as('windowOpenSpy');
    });
  }

  function findAndClickWordReadingTask() {
    // Wait for tasks to load
    cy.get('[data-pc-section=tablist]', { timeout: 60000 }).should('exist');

    cy.get('[data-pc-section=tablist]').children().then((taskTabs) => {
      let wordReadingTab = null;
      for (let i = 0; i < taskTabs.length; i++) {
        const tab = taskTabs[i];
        if (tab.textContent && (
          tab.textContent.toLowerCase().includes('palabra') ||
          tab.textContent.toLowerCase().includes('word reading')
        )) {
          wordReadingTab = tab;
          break;
        }
      }

      if (wordReadingTab) {
        cy.wrap(wordReadingTab).click();
      } else {
        // Fallback: click first available task
        cy.wrap(taskTabs.first()).click();
      }
    });
  }

  function startTaskAndCaptureUrl() {
    // Set up spy before clicking start
    setupWindowOpenSpy();

    // Scroll to bottom and click start button
    cy.scrollTo('bottomLeft', { ensureScrollable: false });

    // Look for start button in Spanish or English
    cy.get('[data-pc-name=tabpanel][data-p-active=true]').then(($panel) => {
      const hasSpanishButton = $panel.text().includes('Haz clic para empezar');
      const hasEnglishButton = $panel.text().includes('Click to start');

      if (hasSpanishButton) {
        cy.wrap($panel).contains('Haz clic para empezar').click();
      } else if (hasEnglishButton) {
        cy.wrap($panel).contains('Click to start').click();
      } else {
        // Fallback: click any button in the panel
        cy.wrap($panel).find('button').first().click();
      }
    });
  }

  function verifyTaskUrl(expectedLocale: string) {
    cy.get('@windowOpenSpy').should('have.been.called');

    cy.get('@windowOpenSpy').then((spy) => {
      const callArgs = spy.getCall(0).args;
      const taskUrl = callArgs[0];

      // Verify the URL contains the expected locale parameter
      expect(taskUrl).to.include(`lng=${expectedLocale}`);
      expect(taskUrl).to.include('participant=');
      expect(taskUrl).to.include('schoolId=');
      expect(taskUrl).to.include('classId=');

      cy.log(`✅ Task URL contains locale parameter: ${taskUrl}`);
    });
  }

  describe('Word Reading Task - Spanish Locale (es-CO) - dev:db', () => {
    it('should launch Word Reading with Spanish locale and correct URL parameters', () => {
      // Visit with Spanish locale
      cy.visit(dashboardUrl, setLocaleBeforeLoad(spanishLocale));

      // Login to dashboard (may take longer with real Firebase)
      login();

      // Wait for tasks and find Word Reading
      findAndClickWordReadingTask();

      // Verify Spanish interface
      cy.get('[data-pc-name=tabpanel][data-p-active=true]', { timeout: 30000 }).should('exist');
      cy.contains('Palabra').should('exist');
      cy.contains('Las palabras aparecerán rápidamente').should('exist');

      // Start task and verify URL
      startTaskAndCaptureUrl();
      verifyTaskUrl(spanishLocale);
    });
  });

  describe('Word Reading Task - English Locale (en-US) - dev:db', () => {
    it('should launch Word Reading with English locale and correct URL parameters', () => {
      // Visit with English locale
      cy.visit(dashboardUrl, setLocaleBeforeLoad(englishLocale));

      // Login to dashboard
      login();

      // Wait for tasks and find Word Reading
      findAndClickWordReadingTask();

      // Verify English interface
      cy.get('[data-pc-name=tabpanel][data-p-active=true]', { timeout: 30000 }).should('exist');
      cy.contains('Word Reading').should('exist');
      cy.contains('The words will appear quickly').should('exist');

      // Start task and verify URL
      startTaskAndCaptureUrl();
      verifyTaskUrl(englishLocale);
    });
  });

  describe('Locale Parameter Verification for All ROAR Tasks - dev:db', () => {
    const roarTasks = [
      { id: 'swr', spanishName: 'Palabra', englishName: 'Word Reading' },
      { id: 'pa', spanishName: 'Fonema', englishName: 'Language Sounds' },
      { id: 'sre', spanishName: 'Frase', englishName: 'Sentence Reading' },
    ];

    roarTasks.forEach((task) => {
      it(`should include locale parameter when launching ${task.englishName}`, () => {
        cy.visit(dashboardUrl, setLocaleBeforeLoad(spanishLocale));
        login();

        findAndClickWordReadingTask();

        setupWindowOpenSpy();

        // Start the task
        cy.get('[data-pc-name=tabpanel][data-p-active=true]').then(($panel) => {
          if ($panel.text().includes('Haz clic para empezar')) {
            cy.wrap($panel).contains('Haz clic para empezar').click();
          } else {
            cy.wrap($panel).contains('Click to start').click();
          }
        });

        // Verify URL contains Spanish locale
        cy.get('@windowOpenSpy').should('have.been.called');
        cy.get('@windowOpenSpy').then((spy) => {
          const taskUrl = spy.getCall(0).args[0];
          expect(taskUrl).to.include('lng=es-CO');
        });
      });
    });
  });

  describe('Task Interface Translation Verification - dev:db', () => {
    it('should show Spanish interface elements when locale is es-CO', () => {
      cy.visit(dashboardUrl, setLocaleBeforeLoad(spanishLocale));
      login();

      // Verify dashboard shows Spanish text
      cy.contains('Tarea completa').should('exist'); // "Task Completed"

      // Find Word Reading task
      findAndClickWordReadingTask();

      // Verify task-specific Spanish text
      cy.contains('Palabra').should('exist');
      cy.contains('Las palabras aparecerán rápidamente').should('exist');
      cy.contains('Decide si son reales o inventadas').should('exist');
    });

    it('should show English interface elements when locale is en-US', () => {
      cy.visit(dashboardUrl, setLocaleBeforeLoad(englishLocale));
      login();

      // Verify dashboard shows English text
      cy.contains('Task Completed').should('exist');

      // Find Word Reading task
      findAndClickWordReadingTask();

      // Verify task-specific English text
      cy.contains('Word Reading').should('exist');
      cy.contains('The words will appear quickly').should('exist');
      cy.contains('Decide if they are real or made-up').should('exist');
    });
  });
});

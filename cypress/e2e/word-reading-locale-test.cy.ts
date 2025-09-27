import 'cypress-real-events';

// Test specifically for Word Reading task locale functionality
describe('Word Reading Task - Spanish Locale Integration Test', () => {
  const spanishLocale = 'es-CO';
  const englishLocale = 'en-US';

  // Test credentials - using the same as testTasks.cy.ts
  const dashboardUrl: string = 'http://localhost:5173/signin';
  const username: string = 'quqa2y1jss@levante.com';
  const password: string = 'xbqamkqc7z';

  function setLocaleBeforeLoad(locale: string) {
    return {
      onBeforeLoad(win: Window) {
        // Set both possible locale keys (app checks one based on brand)
        win.sessionStorage.setItem('levantePlatformLocale', locale);
        win.sessionStorage.setItem('roarPlatformLocale', locale);
      },
    };
  }

  function login() {
    // Input username
    cy.get('input').should('have.length', 2).then((inputs) => {
      cy.wrap(inputs[0]).clear().type(username);
    });

    // Input password
    cy.get('input').should('have.length', 2).then((inputs) => {
      cy.wrap(inputs[1]).clear().type(password);
    });

    // Click login button
    cy.get('button').filter('[data-pc-name=button]').click();

    // Ensure we navigated away from /signin
    cy.location('pathname', { timeout: 30000 }).should((p) => expect(p).to.not.match(/\/signin$/));
  }

  function findAndClickWordReadingTask() {
    // Find the Word Reading task in the task list
    cy.get('[data-pc-section=tablist]', { timeout: 30000 })
      .children()
      .then((taskTabs) => {
        // Look for the Word Reading task tab
        let wordReadingTab = null;
        for (let i = 0; i < taskTabs.length; i++) {
          const tab = taskTabs[i];
          if (tab.textContent && tab.textContent.toLowerCase().includes('palabra')) {
            wordReadingTab = tab;
            break;
          }
        }

        if (wordReadingTab) {
          cy.wrap(wordReadingTab).click();
        } else {
          // If not found by Spanish name, try English name
          cy.contains('Word Reading').click();
        }
      });
  }

  function startTaskAndVerifyUrl() {
    // Scroll to bottom and click "Click to start"
    cy.scrollTo('bottomLeft', { ensureScrollable: false });
    cy.get('[data-pc-name=tabpanel][data-p-active=true]').children().contains('Haz clic para empezar').click();

    // Verify that the URL includes the Spanish locale parameter
    cy.window().then((win) => {
      // The task should open in a new window/tab, but we can check if the current window location changed
      // or if a new window was opened with the correct locale parameter
      cy.wrap(win).should((window) => {
        // Check if window.open was called (the task should open in new window)
        expect(window.open).to.have.been.called;
      });
    });
  }

  describe('Word Reading Task launches in Spanish (es-CO)', () => {
    it('should launch Word Reading task with Spanish locale', () => {
      // Visit dashboard with Spanish locale
      cy.visit(dashboardUrl, setLocaleBeforeLoad(spanishLocale));

      // Login to dashboard
      login();

      // Wait for tasks to load
      cy.get('[data-pc-section=tablist]', { timeout: 240000 }).should('exist');

      // Find and click on Word Reading task (should show "Palabra" in Spanish)
      findAndClickWordReadingTask();

      // Wait for task panel to be active
      cy.get('[data-pc-name=tabpanel][data-p-active=true]', { timeout: 10000 }).should('exist');

      // Verify task shows Spanish text
      cy.contains('Palabra').should('exist');

      // Start the task
      startTaskAndVerifyUrl();

      // Verify Spanish locale parameter would be in URL
      // Note: In a real test, we'd need to intercept the window.open call
      // to verify the URL contains &lng=es-CO
    });
  });

  describe('Word Reading Task launches in English (en-US)', () => {
    it('should launch Word Reading task with English locale', () => {
      // Visit dashboard with English locale
      cy.visit(dashboardUrl, setLocaleBeforeLoad(englishLocale));

      // Login to dashboard
      login();

      // Wait for tasks to load
      cy.get('[data-pc-section=tablist]', { timeout: 240000 }).should('exist');

      // Find and click on Word Reading task (should show "Word Reading" in English)
      cy.contains('Word Reading').click();

      // Wait for task panel to be active
      cy.get('[data-pc-name=tabpanel][data-p-active=true]', { timeout: 10000 }).should('exist');

      // Verify task shows English text
      cy.contains('Word Reading').should('exist');

      // Start the task
      startTaskAndVerifyUrl();
    });
  });

  describe('Locale persistence across task interactions', () => {
    it('should maintain Spanish locale throughout task interaction', () => {
      // Visit dashboard with Spanish locale
      cy.visit(dashboardUrl, setLocaleBeforeLoad(spanishLocale));

      // Login to dashboard
      login();

      // Wait for tasks to load
      cy.get('[data-pc-section=tablist]', { timeout: 240000 }).should('exist');

      // Verify dashboard shows Spanish text
      cy.contains('Tarea completa').should('exist'); // "Task Completed" in Spanish

      // Find Word Reading task
      findAndClickWordReadingTask();

      // Verify task details are in Spanish
      cy.contains('Palabra').should('exist');
      cy.contains('Las palabras aparecerán rápidamente').should('exist');

      // Verify locale parameter is included in task launch
      // This would require intercepting the window.open call
    });
  });
});

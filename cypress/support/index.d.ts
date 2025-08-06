/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    /**
     * Custom command to log in a user
     * @param username - The username or email to log in with
     * @param password - The password to log in with
     */
    login(username: string, password: string): Chainable<Element>;
    
    /**
     * Custom command to debug page state for troubleshooting
     */
    debugPageState(): Chainable<Element>;
  }
} 

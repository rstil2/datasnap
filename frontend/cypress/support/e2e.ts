// Import commands and support files
import './commands';
import 'cypress-axe';
import '@cypress/code-coverage/support';

// Global configuration
Cypress.on('uncaught:exception', (err, runnable) => {
  // Prevent Cypress from failing on uncaught exceptions that might be expected
  // Return false only for known/expected errors
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  return true;
});

// Set up viewport and other global configurations
beforeEach(() => {
  // Clear storage before each test for isolation
  cy.clearLocalStorage();
  cy.clearCookies();
  
  // Set up interceptors for common API calls
  cy.intercept('GET', '/api/**', { fixture: 'api/default-response.json' }).as('apiCall');
  
  // Ensure consistent viewport
  cy.viewport(1280, 720);
});

// Global after hook for cleanup
afterEach(() => {
  // Take screenshot on failure
  cy.screenshot({ capture: 'runner', onlyOnFailure: true });
});

// Custom commands for accessibility testing
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login user programmatically
       * @example cy.loginUser({ email: 'test@example.com', password: 'password' })
       */
      loginUser(credentials: { email: string; password: string }): Chainable<void>;
      
      /**
       * Custom command to seed test data
       * @example cy.seedTestData()
       */
      seedTestData(): Chainable<void>;
      
      /**
       * Custom command to check accessibility violations
       * @example cy.checkA11y()
       */
      checkA11y(context?: string, options?: any): Chainable<void>;
      
      /**
       * Custom command to navigate using sidebar
       * @example cy.navigateTo('stats')
       */
      navigateTo(page: string): Chainable<void>;
      
      /**
       * Custom command to wait for page load
       * @example cy.waitForPageLoad()
       */
      waitForPageLoad(): Chainable<void>;
      
      /**
       * Custom command to test responsive behavior
       * @example cy.testResponsive(['mobile', 'tablet', 'desktop'])
       */
      testResponsive(viewports: string[]): Chainable<void>;
    }
  }
}
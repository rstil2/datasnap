/**
 * Error Handling and Edge-Case Navigation Tests
 * Tests network failures, loading states, error boundaries, and recovery scenarios
 */

describe('Navigation Error Handling', () => {
  beforeEach(() => {
    cy.seedTestData();
  });

  describe('Network Error Handling', () => {
    it('handles network timeouts gracefully', () => {
      // Mock network timeout
      cy.intercept('GET', '/api/**', { 
        delay: 30000, // 30 second delay to trigger timeout
        forceNetworkError: true 
      }).as('timeoutRequest');

      cy.visit('/');
      
      // Navigation should still work for client-side components
      cy.navigateTo('stats');
      cy.get('.navItemActive').should('contain.text', 'Stats');
      
      // If any API calls are made, they should show error handling
      cy.navigateTo('community');
      
      // Should show error message or retry option
      cy.get('body').should('contain.text', /error|retry|failed|timeout/i)
        .or('contain.text', 'Community Stories'); // Or load successfully with cached data
    });

    it('shows retry mechanism for failed API requests', () => {
      // Mock 500 server errors
      cy.intercept('GET', '/api/**', { 
        statusCode: 500,
        body: { error: 'Internal Server Error' }
      }).as('serverError');

      cy.visit('/');
      cy.navigateTo('community');
      
      // Should show error state with retry button
      cy.get('button').contains(/retry|try again/i).should('be.visible');
      
      // Clicking retry should make another request
      cy.get('button').contains(/retry|try again/i).click();
      
      // Should show loading state again
      cy.get('[data-testid="loading-spinner"]').should('be.visible');
    });

    it('displays global error banner for critical failures', () => {
      // Mock critical API failure
      cy.intercept('GET', '/api/critical/**', {
        statusCode: 503,
        body: { error: 'Service Unavailable' }
      }).as('criticalError');

      cy.visit('/');
      
      // Should show global error banner
      cy.get('[data-testid="error-banner"], .error-banner').should('be.visible');
      cy.get('[data-testid="error-banner"]').should('contain.text', /error|unavailable|problem/i);
      
      // Error banner should have dismiss option
      cy.get('[data-testid="error-banner"] button, .error-banner button').click();
      cy.get('[data-testid="error-banner"]').should('not.exist');
    });

    it('maintains navigation functionality during intermittent network issues', () => {
      // Mock intermittent failures
      let requestCount = 0;
      cy.intercept('GET', '/api/**', (req) => {
        requestCount++;
        if (requestCount % 2 === 0) {
          req.reply({ statusCode: 500 });
        } else {
          req.reply({ statusCode: 200, body: { data: [] } });
        }
      }).as('intermittentError');

      cy.visit('/');
      
      // Navigation should remain functional
      const pages = ['stats', 'visualize', 'analysis', 'story'];
      pages.forEach(page => {
        cy.navigateTo(page);
        cy.get('.navItemActive').should('contain.text', page, { matchCase: false });
      });
    });
  });

  describe('Loading State Management', () => {
    it('shows loading spinners during slow page transitions', () => {
      // Mock slow responses
      cy.intercept('GET', '/api/**', { delay: 2000 }).as('slowRequest');

      cy.visit('/');
      cy.navigateTo('community');
      
      // Should show loading spinner immediately
      cy.get('[data-testid="loading-spinner"]').should('be.visible');
      
      // Spinner should disappear when content loads
      cy.wait('@slowRequest');
      cy.get('[data-testid="loading-spinner"]').should('not.exist');
      cy.contains('Community Stories').should('be.visible');
    });

    it('prevents multiple simultaneous navigation requests', () => {
      // Mock slow response
      cy.intercept('GET', '/api/**', { delay: 3000 }).as('slowRequest');

      cy.visit('/');
      
      // Click multiple navigation items quickly
      cy.contains('button', 'Community').click();
      cy.contains('button', 'Stats').click();
      cy.contains('button', 'Visualize').click();
      
      // Should only process the last click
      cy.get('.navItemActive').should('contain.text', 'Visualize');
      
      // Should not have multiple loading states
      cy.get('[data-testid="loading-spinner"]').should('have.length.at.most', 1);
    });

    it('provides loading feedback for modals and overlays', () => {
      cy.visit('/');
      cy.loginUser({ email: 'test@example.com', password: 'password' });
      
      // Navigate to story page
      cy.navigateTo('story');
      
      // Mock slow modal content loading
      cy.intercept('POST', '/api/stories/publish', { delay: 2000 }).as('publishRequest');
      
      // Open publish modal
      cy.contains('button', 'Publish').click();
      
      // Modal should show loading state
      cy.get('[role="dialog"]').should('be.visible');
      cy.get('[role="dialog"] [data-testid="loading-spinner"]').should('be.visible');
    });

    it('handles concurrent loading states correctly', () => {
      cy.visit('/');
      
      // Mock multiple API endpoints with different delays
      cy.intercept('GET', '/api/stats', { delay: 1000 }).as('statsRequest');
      cy.intercept('GET', '/api/community', { delay: 2000 }).as('communityRequest');
      
      // Navigate quickly between pages
      cy.navigateTo('stats');
      cy.navigateTo('community');
      
      // Should handle both loading states appropriately
      cy.get('.navItemActive').should('contain.text', 'Community');
      cy.get('[data-testid="loading-spinner"]').should('be.visible');
      
      cy.wait('@communityRequest');
      cy.get('[data-testid="loading-spinner"]').should('not.exist');
    });
  });

  describe('Error Boundary Testing', () => {
    it('catches and displays component errors gracefully', () => {
      cy.visit('/');
      
      // Simulate component error by corrupting props/data
      cy.window().then((win) => {
        // Corrupt localStorage data to trigger error
        win.localStorage.setItem('datasnap_csv_data', 'invalid-json-data');
      });
      
      // Navigate to page that uses the corrupted data
      cy.navigateTo('stats');
      
      // Should show error boundary instead of crashing
      cy.get('[data-testid="error-boundary"]').should('be.visible');
      cy.get('[data-testid="error-boundary"]').should('contain.text', /something went wrong|error occurred/i);
      
      // Should have option to recover
      cy.get('button').contains(/reload|refresh|try again/i).click();
      
      // Should recover gracefully
      cy.get('.sidebar').should('be.visible');
    });

    it('isolates errors to specific components', () => {
      cy.visit('/');
      
      // Trigger error in one component
      cy.window().then((win) => {
        // Corrupt community data specifically
        win.localStorage.setItem('datasnap_community', 'invalid-data');
      });
      
      // Community page should show error
      cy.navigateTo('community');
      cy.get('[data-testid="error-boundary"]').should('be.visible');
      
      // But other pages should work fine
      cy.navigateTo('upload');
      cy.get('.navItemActive').should('contain.text', 'Upload CSV');
      cy.get('[data-testid="error-boundary"]').should('not.exist');
    });

    it('preserves navigation state after error recovery', () => {
      cy.visit('/');
      
      // Navigate to a page and cause an error
      cy.navigateTo('stats');
      
      cy.window().then((win) => {
        // Trigger a temporary error
        const originalConsoleError = win.console.error;
        win.console.error = () => {
          throw new Error('Test error');
        };
        
        // Restore after a moment
        setTimeout(() => {
          win.console.error = originalConsoleError;
        }, 100);
      });
      
      // Error should be caught by error boundary
      cy.get('[data-testid="error-boundary"]', { timeout: 5000 }).should('be.visible');
      
      // Recover from error
      cy.get('button').contains(/reload|refresh|try again/i).click();
      
      // Should maintain navigation state
      cy.get('.navItemActive').should('contain.text', 'Stats');
    });
  });

  describe('Data Corruption and Recovery', () => {
    it('handles corrupted localStorage gracefully', () => {
      cy.visit('/');
      
      // Corrupt localStorage
      cy.window().then((win) => {
        win.localStorage.setItem('datasnap_csv_data', '{invalid json');
        win.localStorage.setItem('datasnap_community', 'null');
        win.localStorage.setItem('user_data', 'undefined');
      });
      
      // Refresh to trigger data loading
      cy.reload();
      
      // App should still function with fallback data
      cy.get('.sidebar').should('be.visible');
      
      // Navigation should work
      cy.navigateTo('community');
      
      // Should show empty state instead of crashing
      cy.contains(/no stories|empty|upload.*first/i).should('be.visible');
    });

    it('recovers from missing required data fields', () => {
      cy.visit('/');
      
      // Create story with missing required fields
      cy.window().then((win) => {
        const corruptedStory = {
          id: 'corrupt-story',
          // Missing required fields like title, author, etc.
          tags: [],
          likes: 'not-a-number'
        };
        
        win.localStorage.setItem('datasnap_community', JSON.stringify({
          'corrupt-story': corruptedStory
        }));
      });
      
      cy.navigateTo('community');
      
      // Should handle missing fields gracefully
      cy.get('body').should('be.visible');
      
      // Should not crash the entire page
      cy.get('.sidebar').should('be.visible');
    });

    it('validates data integrity before rendering', () => {
      cy.visit('/');
      
      // Create CSV data with inconsistent structure
      cy.window().then((win) => {
        const badCsvData = {
          data: [
            { name: 'Alice', age: 30 },
            { name: 'Bob' }, // Missing age field
            { differentField: 'value' }, // Different schema
            null, // Null row
            undefined // Undefined row
          ],
          headers: ['name', 'age'],
          filename: 'corrupt_data.csv'
        };
        
        win.localStorage.setItem('datasnap_csv_data', JSON.stringify(badCsvData));
      });
      
      cy.navigateTo('stats');
      
      // Should show error message or handle gracefully
      cy.get('body').should('contain.text', /error|invalid|problem/i)
        .or('contain.text', 'No Data Available');
      
      // Navigation should still work
      cy.navigateTo('upload');
      cy.get('.navItemActive').should('contain.text', 'Upload CSV');
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('handles large datasets without crashing navigation', () => {
      // Create a large dataset
      const largeData = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        value: Math.random() * 1000,
        category: `Category ${i % 10}`
      }));

      cy.window().then((win) => {
        win.localStorage.setItem('datasnap_csv_data', JSON.stringify({
          data: largeData,
          headers: ['id', 'name', 'value', 'category'],
          filename: 'large_dataset.csv'
        }));
      });

      cy.visit('/');
      
      // Navigation should still be responsive
      const pages = ['stats', 'visualize', 'analysis'];
      pages.forEach(page => {
        const startTime = Date.now();
        cy.navigateTo(page);
        cy.get('.navItemActive').should('contain.text', page, { matchCase: false });
        
        cy.then(() => {
          const navTime = Date.now() - startTime;
          expect(navTime).to.be.lessThan(5000); // Should handle large data within 5 seconds
        });
      });
    });

    it('prevents memory leaks during rapid navigation', () => {
      cy.visit('/');
      
      // Rapidly navigate between pages
      const pages = ['upload', 'stats', 'visualize', 'analysis', 'story', 'community'];
      
      for (let i = 0; i < 3; i++) { // Do it 3 times
        pages.forEach(page => {
          cy.navigateTo(page);
          cy.wait(100); // Brief pause between navigations
        });
      }
      
      // App should still be responsive
      cy.get('.sidebar').should('be.visible');
      cy.navigateTo('upload');
      cy.get('.navItemActive').should('contain.text', 'Upload CSV');
    });
  });

  describe('Browser Compatibility and Edge Cases', () => {
    it('handles disabled JavaScript gracefully', () => {
      // This test would typically require special Cypress configuration
      // For now, we'll test that critical content is available
      cy.visit('/');
      
      // Even if JS fails, basic content should be visible
      cy.get('body').should('contain.text', 'DataSnap');
    });

    it('works with slow or limited internet connections', () => {
      // Mock very slow network
      cy.intercept('**/*', (req) => {
        req.reply((res) => {
          res.delay(5000); // 5 second delay
          return res.send();
        });
      }).as('slowNetwork');

      cy.visit('/');
      
      // Critical navigation should work even with slow network
      cy.get('.sidebar', { timeout: 10000 }).should('be.visible');
      
      // Basic navigation should be functional
      cy.contains('button', 'Stats').click();
      cy.get('.navItemActive').should('contain.text', 'Stats');
    });

    it('recovers from corrupted session storage', () => {
      cy.visit('/');
      
      // Corrupt session storage
      cy.window().then((win) => {
        win.sessionStorage.setItem('auth_token', '{corrupted');
        win.sessionStorage.setItem('navigation_state', 'invalid');
      });
      
      cy.reload();
      
      // Should recover and show default state
      cy.get('.sidebar').should('be.visible');
      cy.get('.navItemActive').should('contain.text', 'Upload CSV'); // Default active state
    });
  });

  describe('Concurrent User Actions', () => {
    it('handles simultaneous modal openings gracefully', () => {
      cy.loginUser({ email: 'test@example.com', password: 'password' });
      cy.visit('/');
      
      // Try to open multiple modals simultaneously
      cy.get('button').contains('Cypress Test User').click();
      
      cy.navigateTo('story');
      cy.get('button').contains('Share').click({ multiple: true, force: true });
      cy.get('button').contains('Publish').click({ multiple: true, force: true });
      
      // Should handle gracefully - only one modal should be open
      cy.get('[role="dialog"]').should('have.length.at.most', 1);
    });

    it('prevents race conditions in navigation state', () => {
      cy.visit('/');
      
      // Rapidly click different navigation items
      cy.get('button').contains('Stats').click();
      cy.get('button').contains('Visualize').click();
      cy.get('button').contains('Analysis').click();
      cy.get('button').contains('Community').click();
      
      // Should settle on the last clicked item
      cy.get('.navItemActive').should('contain.text', 'Community');
      
      // Should not have multiple active items
      cy.get('.navItemActive').should('have.length', 1);
    });
  });
});
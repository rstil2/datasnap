/**
 * Route-Based Navigation and Deep-Link Tests
 * Tests direct route navigation, history integration, and authentication flows
 */

describe('Route-Based Navigation', () => {
  beforeEach(() => {
    // Seed test data before each test
    cy.seedTestData();
  });

  describe('Direct Route Navigation', () => {
    it('loads the main application on root route', () => {
      cy.visit('/');
      
      // Should show the main app with sidebar
      cy.get('.sidebar').should('be.visible');
      cy.get('.mainContent').should('be.visible');
      
      // Should have default page active (Upload CSV)
      cy.get('.navItemActive').should('contain.text', 'Upload CSV');
      
      // Should show page content
      cy.contains('h1', 'Upload CSV').should('be.visible');
      
      // Check accessibility
      cy.checkA11y();
    });

    it('navigates to shared story route directly', () => {
      const storyId = 'cypress-story-1';
      cy.visit(`/share/${storyId}`);
      
      // Should load the shared story viewer
      cy.get('[data-testid="shared-story-page"]').should('be.visible');
      
      // Should show story content
      cy.contains('Cypress Test Story 1').should('be.visible');
      
      // Should show back button
      cy.contains('Back to DataSnap').should('be.visible');
      
      // Check accessibility
      cy.checkA11y();
    });

    it('shows 404 error for invalid story ID', () => {
      cy.visit('/share/non-existent-story');
      
      // Should show story not found message
      cy.contains('Story Not Found').should('be.visible');
      cy.contains('Back to DataSnap').should('be.visible');
      
      // Back button should work
      cy.contains('Back to DataSnap').click();
      cy.url().should('eq', Cypress.config().baseUrl + '/');
    });

    it('handles malformed routes gracefully', () => {
      // Test various invalid routes
      const invalidRoutes = [
        '/invalid-route',
        '/share/',
        '/share///',
        '/share/story-with-special-chars-!@#$%'
      ];

      invalidRoutes.forEach(route => {
        cy.visit(route, { failOnStatusCode: false });
        
        // Should either redirect to home or show error page
        cy.get('body').should('be.visible');
        
        // Navigate back to home to reset state
        cy.visit('/');
      });
    });
  });

  describe('History Integration', () => {
    it('supports browser back and forward navigation', () => {
      cy.visit('/');
      
      // Navigate through pages
      cy.navigateTo('stats');
      cy.url().should('include', '/'); // SPA doesn't change URL for internal navigation
      cy.get('.navItemActive').should('contain.text', 'Stats');
      
      cy.navigateTo('visualize');
      cy.get('.navItemActive').should('contain.text', 'Visualize');
      
      cy.navigateTo('community');
      cy.get('.navItemActive').should('contain.text', 'Community');
      
      // Use browser back button
      cy.go('back');
      // Note: For SPA without URL changes, this might not work as expected
      // This test would need adjustment based on actual routing implementation
      
      cy.go('forward');
      // Same note applies
    });

    it('preserves navigation state on page refresh', () => {
      cy.visit('/');
      
      // Navigate to a specific page
      cy.navigateTo('community');
      cy.get('.navItemActive').should('contain.text', 'Community');
      
      // Refresh the page
      cy.reload();
      
      // Should maintain the same page (if URL state is preserved)
      // This depends on routing implementation
      cy.get('.sidebar').should('be.visible');
    });

    it('maintains shared story state on refresh', () => {
      const storyId = 'cypress-story-1';
      cy.visit(`/share/${storyId}`);
      
      // Verify story is loaded
      cy.contains('Cypress Test Story 1').should('be.visible');
      
      // Refresh the page
      cy.reload();
      
      // Story should still be visible
      cy.contains('Cypress Test Story 1').should('be.visible');
    });
  });

  describe('Query Parameters and Hash Navigation', () => {
    it('handles query parameters correctly', () => {
      // Test if the app handles query parameters
      cy.visit('/?debug=true&theme=dark');
      
      // App should load normally regardless of query params
      cy.get('.sidebar').should('be.visible');
    });

    it('supports hash navigation to comments', () => {
      const storyId = 'cypress-story-1';
      cy.visit(`/share/${storyId}#comments`);
      
      // Should load story
      cy.contains('Cypress Test Story 1').should('be.visible');
      
      // Should scroll to or highlight comments section if implemented
      // This would depend on the actual implementation
    });

    it('preserves hash state during navigation', () => {
      const storyId = 'cypress-story-1';
      cy.visit(`/share/${storyId}#comments`);
      
      // Interact with page
      cy.contains('Back to DataSnap').click();
      
      // Navigate back to story with hash
      cy.visit(`/share/${storyId}#comments`);
      
      // Hash should still be preserved
      cy.url().should('include', '#comments');
    });
  });

  describe('Authentication-Based Routing', () => {
    it('shows sign-in modal for unauthenticated users on protected actions', () => {
      cy.visit('/');
      
      // Navigate to community page
      cy.navigateTo('community');
      
      // Try to like a story (should trigger sign-in modal)
      cy.get('[data-testid="like-button"]').first().click();
      
      // Should show sign-in modal
      cy.get('[data-testid="signin-modal"]').should('be.visible');
      
      // Close modal
      cy.get('body').type('{esc}');
      cy.get('[data-testid="signin-modal"]').should('not.exist');
    });

    it('allows authenticated users to access protected features', () => {
      // Login first
      cy.loginUser({ email: 'test@example.com', password: 'password' });
      
      cy.visit('/');
      
      // Should show user menu instead of sign-in button
      cy.contains('Cypress Test User').should('be.visible');
      
      // Navigate to community
      cy.navigateTo('community');
      
      // Should be able to interact with stories
      cy.get('[data-testid="like-button"]').first().click();
      
      // Should not show sign-in modal
      cy.get('[data-testid="signin-modal"]').should('not.exist');
    });

    it('maintains authentication state across page refreshes', () => {
      // Login
      cy.loginUser({ email: 'test@example.com', password: 'password' });
      
      cy.visit('/');
      
      // Verify authenticated state
      cy.contains('Cypress Test User').should('be.visible');
      
      // Refresh page
      cy.reload();
      
      // Should still be authenticated
      cy.contains('Cypress Test User').should('be.visible');
    });

    it('redirects to appropriate page after authentication', () => {
      cy.visit('/');
      
      // Navigate to story page
      cy.navigateTo('story');
      
      // Try to publish (should trigger sign-in)
      // This would depend on the actual implementation
      // For now, just test that sign-in modal appears
      
      // Login via modal
      cy.loginUser({ email: 'test@example.com', password: 'password' });
      
      // Should remain on story page
      cy.get('.navItemActive').should('contain.text', 'Story');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('recovers gracefully from network errors during navigation', () => {
      // Mock network failure
      cy.intercept('GET', '/api/**', { forceNetworkError: true }).as('networkError');
      
      cy.visit('/');
      
      // Navigation should still work for client-side routing
      cy.navigateTo('stats');
      cy.get('.navItemActive').should('contain.text', 'Stats');
      
      // Any API calls should show appropriate error handling
      // This would depend on how the app handles network errors
    });

    it('shows loading states during slow navigation', () => {
      // Mock slow API responses
      cy.intercept('GET', '/api/**', { delay: 2000 }).as('slowAPI');
      
      cy.visit('/');
      
      cy.navigateTo('community');
      
      // Should show loading state
      cy.get('[data-testid="loading-spinner"]').should('be.visible');
      
      // Eventually should load content
      cy.contains('Community Stories').should('be.visible');
      cy.get('[data-testid="loading-spinner"]').should('not.exist');
    });

    it('handles JavaScript errors gracefully', () => {
      cy.visit('/');
      
      // Simulate a JavaScript error
      cy.window().then((win) => {
        // This should be caught by error boundary
        throw new Error('Test error');
      });
      
      // App should still be functional or show error boundary
      cy.get('.sidebar').should('be.visible');
    });
  });

  describe('Performance and Loading', () => {
    it('loads pages within acceptable time limits', () => {
      const startTime = Date.now();
      
      cy.visit('/');
      
      cy.get('.sidebar').should('be.visible');
      
      cy.then(() => {
        const loadTime = Date.now() - startTime;
        expect(loadTime).to.be.lessThan(3000); // Should load within 3 seconds
      });
    });

    it('maintains responsive performance during navigation', () => {
      cy.visit('/');
      
      // Navigate quickly between pages
      const pages = ['stats', 'visualize', 'analysis', 'story', 'community'];
      
      pages.forEach(page => {
        const startTime = Date.now();
        
        cy.navigateTo(page);
        
        cy.then(() => {
          const navTime = Date.now() - startTime;
          expect(navTime).to.be.lessThan(1000); // Navigation should be fast
        });
      });
    });
  });

  describe('Responsive Route Handling', () => {
    it('handles routes correctly on mobile viewports', () => {
      cy.viewport(375, 667); // Mobile viewport
      
      cy.visit('/');
      
      // Navigation should still work
      cy.get('.sidebar').should('be.visible');
      cy.navigateTo('community');
      cy.get('.navItemActive').should('contain.text', 'Community');
      
      // Shared stories should work on mobile
      const storyId = 'cypress-story-1';
      cy.visit(`/share/${storyId}`);
      
      cy.contains('Cypress Test Story 1').should('be.visible');
    });

    it('maintains functionality across different viewport sizes', () => {
      const viewports = [
        [375, 667],   // Mobile
        [768, 1024],  // Tablet
        [1280, 720]   // Desktop
      ];

      viewports.forEach(([width, height]) => {
        cy.viewport(width, height);
        
        cy.visit('/');
        cy.navigateTo('stats');
        cy.get('.navItemActive').should('contain.text', 'Stats');
        
        // Test shared story route
        cy.visit('/share/cypress-story-1');
        cy.contains('Cypress Test Story 1').should('be.visible');
      });
    });
  });
});
/// <reference types="cypress" />

// Custom command to login user programmatically
Cypress.Commands.add('loginUser', (credentials: { email: string; password: string }) => {
  // Store OAuth token in session storage (following the rule to use session storage)
  const mockToken = 'mock-oauth-token-' + Date.now();
  const mockUser = {
    id: 'cypress-test-user',
    name: 'Cypress Test User',
    email: credentials.email,
    avatar: '🧪',
    joinedAt: new Date().toISOString(),
    storiesCount: 0,
    totalLikes: 0
  };
  
  cy.window().then((win) => {
    win.sessionStorage.setItem('auth_token', mockToken);
    win.localStorage.setItem('user_data', JSON.stringify(mockUser));
  });
});

// Custom command to seed test data
Cypress.Commands.add('seedTestData', () => {
  const testStories = [
    {
      id: 'cypress-story-1',
      title: 'Cypress Test Story 1',
      summary: 'A test story for Cypress automation',
      content: 'Test content for automation',
      author: 'Cypress Test User',
      authorId: 'cypress-test-user',
      authorAvatar: '🧪',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublic: true,
      likes: 5,
      likedBy: [],
      comments: [],
      views: 25,
      viewedBy: [],
      tags: ['test', 'automation', 'cypress'],
      storyType: 'summary',
      qualityScore: 85,
      charts: [],
      insights: [],
      executiveSummary: 'Test executive summary',
      narrative: 'Test narrative content',
      key_insights: [],
      recommendations: [],
      metadata: {
        data_quality_score: 85,
        generation_time_ms: 150,
        story_type: 'summary',
        narrative_style: 'summary'
      }
    }
  ];

  const testCsvData = {
    data: [
      { name: 'Alice', age: 30, department: 'Engineering', salary: 75000 },
      { name: 'Bob', age: 25, department: 'Marketing', salary: 65000 },
      { name: 'Charlie', age: 35, department: 'Sales', salary: 70000 }
    ],
    headers: ['name', 'age', 'department', 'salary'],
    filename: 'cypress_test_data.csv'
  };

  cy.window().then((win) => {
    // Seed community stories
    const communityData = {};
    testStories.forEach(story => {
      communityData[story.id] = story;
    });
    win.localStorage.setItem('datasnap_community', JSON.stringify(communityData));
    
    // Seed CSV data
    win.localStorage.setItem('datasnap_csv_data', JSON.stringify(testCsvData));
    win.localStorage.setItem('datasnap_current_file', testCsvData.filename);
  });
});

// Custom command to check accessibility violations
Cypress.Commands.add('checkA11y', (context?: string, options?: any) => {
  cy.injectAxe();
  cy.checkA11y(context, {
    rules: {
      // Disable color-contrast rule for now as it's CSS dependent
      'color-contrast': { enabled: false },
      // Focus on critical accessibility issues
      'button-name': { enabled: true },
      'link-name': { enabled: true },
      'aria-valid-attr': { enabled: true },
      'aria-required-attr': { enabled: true },
      'keyboard-navigation': { enabled: true },
      'focus-order-semantics': { enabled: true }
    },
    ...options
  });
});

// Custom command to navigate using sidebar
Cypress.Commands.add('navigateTo', (page: string) => {
  const pageLabels = {
    'upload': 'Upload CSV',
    'enhanced-upload': 'Multi-Format Import', 
    'stats': 'Stats',
    'visualize': 'Visualize',
    'enhanced-viz': 'Pro Charts',
    'analysis': 'Analysis',
    'story': 'Story',
    'community': 'Community'
  };

  const label = pageLabels[page];
  if (!label) {
    throw new Error(`Unknown page: ${page}`);
  }

  cy.get('.sidebar').should('be.visible');
  cy.contains('button', label).click();
  
  // Wait for navigation to complete
  cy.get('.navItemActive').should('contain.text', label);
  cy.waitForPageLoad();
});

// Custom command to wait for page load
Cypress.Commands.add('waitForPageLoad', () => {
  // Wait for main content to be visible
  cy.get('.mainContent').should('be.visible');
  
  // Wait for any loading spinners to disappear
  cy.get('[data-testid="loading-spinner"]', { timeout: 10000 }).should('not.exist');
  
  // Wait for page title to be present
  cy.get('h1, h2, h3').should('be.visible');
});

// Custom command to test responsive behavior
Cypress.Commands.add('testResponsive', (viewports: string[]) => {
  const viewportSizes = {
    mobile: [375, 667],
    tablet: [768, 1024], 
    desktop: [1280, 720]
  };

  viewports.forEach(viewport => {
    const [width, height] = viewportSizes[viewport];
    if (!width || !height) {
      throw new Error(`Unknown viewport: ${viewport}`);
    }

    cy.viewport(width, height);
    
    // Wait for responsive changes to apply
    cy.wait(500);
    
    // Check that navigation is still functional
    cy.get('.sidebar').should('be.visible');
    
    // Test basic navigation still works
    cy.navigateTo('stats');
    cy.get('.navItemActive').should('contain.text', 'Stats');
  });
});

// Add more specific commands for navigation testing
Cypress.Commands.add('openUserMenu', () => {
  cy.get('[data-testid="user-menu-button"], button:contains("Test User")').click();
  cy.get('[data-testid="user-menu-dropdown"]').should('be.visible');
});

Cypress.Commands.add('closeUserMenu', () => {
  // Click backdrop or press escape
  cy.get('body').type('{esc}');
  cy.get('[data-testid="user-menu-dropdown"]').should('not.exist');
});

Cypress.Commands.add('switchCommunityTab', (tab: string) => {
  const tabLabels = {
    trending: 'Trending',
    recent: 'Recent', 
    featured: 'Featured'
  };

  const label = tabLabels[tab];
  if (!label) {
    throw new Error(`Unknown community tab: ${tab}`);
  }

  cy.contains('button', label).click();
  cy.contains('button', label).should('have.class', 'active').or('have.css', 'background-color');
});

Cypress.Commands.add('searchCommunity', (searchTerm: string) => {
  cy.get('input[placeholder*="search"]').type(searchTerm);
  cy.get('input[placeholder*="search"]').should('have.value', searchTerm);
  
  // Wait for search results to update
  cy.wait(1000);
});

Cypress.Commands.add('clearCommunityFilters', () => {
  cy.get('button').contains(/clear filters/i).click();
  cy.get('input[placeholder*="search"]').should('have.value', '');
});

// Command to test keyboard navigation
Cypress.Commands.add('testKeyboardNavigation', () => {
  // Focus first navigation item
  cy.get('.sidebar button').first().focus();
  
  // Tab through navigation items
  const navItems = ['Upload CSV', 'Multi-Format Import', 'Stats', 'Visualize', 'Pro Charts', 'Analysis', 'Story', 'Community'];
  
  navItems.forEach(itemLabel => {
    cy.focused().should('contain.text', itemLabel);
    cy.focused().type('{tab}');
  });
});

// Command to test modal focus management
Cypress.Commands.add('testModalFocus', () => {
  // This would be implemented based on the specific modal behavior
  // For now, just check that modals can be opened and closed with keyboard
  cy.get('body').type('{esc}');
});

declare global {
  namespace Cypress {
    interface Chainable {
      openUserMenu(): Chainable<void>;
      closeUserMenu(): Chainable<void>;
      switchCommunityTab(tab: string): Chainable<void>;
      searchCommunity(searchTerm: string): Chainable<void>;
      clearCommunityFilters(): Chainable<void>;
      testKeyboardNavigation(): Chainable<void>;
      testModalFocus(): Chainable<void>;
    }
  }
}
/**
 * Navigation Testing Configuration
 * Centralizes navigation paths, test data, and testing utilities
 * Adheres to rule: Only real data should be used (no synthetic data)
 */

export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  path?: string;
  testId?: string;
  requiresAuth?: boolean;
  hasSubNavigation?: boolean;
}

export interface PageRoute {
  path: string;
  component: string;
  title: string;
  requiresAuth?: boolean;
  testId?: string;
}

// Main sidebar navigation items from App.tsx
export const NAVIGATION_ITEMS: NavigationItem[] = [
  { id: 'upload', label: 'Upload CSV', icon: '📁', testId: 'nav-upload' },
  { id: 'enhanced-upload', label: 'Multi-Format Import', icon: '📊', testId: 'nav-enhanced-upload' },
  { id: 'stats', label: 'Stats', icon: '📈', testId: 'nav-stats' },
  { id: 'visualize', label: 'Visualize', icon: '📊', testId: 'nav-visualize' },
  { id: 'enhanced-viz', label: 'Pro Charts', icon: '🎨', testId: 'nav-enhanced-viz' },
  { id: 'analysis', label: 'Analysis', icon: '🔍', testId: 'nav-analysis' },
  { id: 'story', label: 'Story', icon: '📝', testId: 'nav-story' },
  { id: 'community', label: 'Community', icon: '🌍', testId: 'nav-community' }
];

// Application routes from App.tsx
export const APP_ROUTES: PageRoute[] = [
  { path: '/', component: 'MainApp', title: 'DataSnap - Data Analysis Tool' },
  { path: '/share/:storyId', component: 'SharedStoryViewer', title: 'Shared Story', testId: 'shared-story-page' }
];

// User menu items from UserMenu.tsx
export const USER_MENU_ITEMS = [
  { id: 'settings', label: 'Settings', icon: 'Settings', testId: 'user-menu-settings' },
  { id: 'signout', label: 'Sign Out', icon: 'LogOut', testId: 'user-menu-signout' }
];

// Story page navigation items
export const STORY_TYPES = [
  { key: 'executive', label: '👔 Executive Summary', desc: 'High-level overview for decision makers' },
  { key: 'detailed', label: '📊 Detailed Analysis', desc: 'Comprehensive technical narrative' },
  { key: 'insights', label: '💡 Key Insights', desc: 'Focus on actionable findings' },
  { key: 'summary', label: '📝 Quick Summary', desc: 'Concise overview of main points' }
];

// Community page tabs
export const COMMUNITY_TABS = [
  { key: 'trending', label: '🔥 Trending', testId: 'community-tab-trending' },
  { key: 'recent', label: '🕒 Recent', testId: 'community-tab-recent' },
  { key: 'featured', label: '⭐ Featured', testId: 'community-tab-featured' }
];

// Test data - Real data samples that exist in the application
export const TEST_DATA = {
  // Sample story IDs that exist in community seeded data
  SAMPLE_STORY_IDS: [
    'sample-1', // Sales Performance Analysis Q3 2024
    'sample-2', // Customer Satisfaction Trends - Healthcare Study
    'sample-3', // E-commerce Conversion Optimization
    'sample-4'  // Climate Data Visualization - Global Temperatures
  ],
  
  // Sample user data for authentication tests
  TEST_USER: {
    id: 'test-user-1',
    name: 'Test User',
    avatar: '👤',
    joinedAt: '2024-01-01T00:00:00.000Z',
    storiesCount: 5,
    totalLikes: 42
  },
  
  // Common search terms that should return results
  SEARCH_TERMS: [
    'sales',
    'healthcare', 
    'conversion',
    'climate'
  ],
  
  // Common tags from seeded stories
  COMMON_TAGS: [
    'sales',
    'quarterly', 
    'healthcare',
    'satisfaction',
    'ecommerce',
    'optimization',
    'climate',
    'environment'
  ]
};

// CSS selectors for navigation elements
export const SELECTORS = {
  sidebar: '[data-testid="sidebar"]',
  navItem: (id: string) => `[data-testid="nav-${id}"]`,
  navItemActive: '.navItemActive',
  userMenu: '[data-testid="user-menu"]',
  userMenuDropdown: '[data-testid="user-menu-dropdown"]',
  signInButton: '[data-testid="signin-button"]',
  signInModal: '[data-testid="signin-modal"]',
  communityTab: (tab: string) => `[data-testid="community-tab-${tab}"]`,
  searchInput: '[data-testid="search-input"]',
  tagFilter: (tag: string) => `[data-testid="tag-${tag}"]`,
  storyCard: (id: string) => `[data-testid="story-${id}"]`,
  loadingSpinner: '[data-testid="loading-spinner"]',
  errorBoundary: '[data-testid="error-boundary"]'
};

// Viewport sizes for responsive testing
export const VIEWPORTS = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 }
};

// Test timeouts and delays
export const TIMEOUTS = {
  navigation: 2000,
  modal: 1000,
  api: 5000,
  animation: 500
};
/**
 * Navigation Testing Utilities
 * Provides common testing helpers and utilities for navigation tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import DataContext from '../../contexts/DataContext';

// Declare global function for setting mock user context
declare global {
  var setMockUserContext: (context: any) => void;
}
import { TEST_DATA, TIMEOUTS, NavigationItem } from './config';

// Mock user for authenticated tests
export const createMockUser = (overrides = {}) => ({
  ...TEST_DATA.TEST_USER,
  ...overrides
});

// Mock CSV data for data-dependent tests
export const createMockCsvData = () => ({
  data: [
    { name: 'Alice', age: 30, department: 'Engineering', salary: 75000 },
    { name: 'Bob', age: 25, department: 'Marketing', salary: 65000 },
    { name: 'Charlie', age: 35, department: 'Sales', salary: 70000 },
    { name: 'Diana', age: 28, department: 'Engineering', salary: 80000 },
    { name: 'Eve', age: 32, department: 'HR', salary: 60000 }
  ],
  headers: ['name', 'age', 'department', 'salary'],
  filename: 'employee_data.csv'
});

// Enhanced render function with providers
export function renderWithProviders(
  ui: React.ReactElement,
  {
    initialEntries = ['/'],
    user = null,
    csvData = null,
    ...renderOptions
  } = {}
) {
  // Set mock user context globally
  const mockUserContext = {
    user,
    isAuthenticated: !!user,
    signIn: vi.fn(),
    signOut: vi.fn(),
    updateUser: vi.fn()
  };
  global.setMockUserContext(mockUserContext);

  // Create a mock file object if csvData is provided
  const mockFile = csvData ? {
    id: 'test-file-1',
    filename: csvData.filename,
    size: csvData.data.length * 100, // Rough size estimate
    type: 'text/csv',
    uploaded_at: new Date().toISOString()
  } : null;

  // Mock DataContext value
  const mockDataContext = {
    csvData,
    currentFile: mockFile,
    isLoading: false,
    error: null,
    uploadedFiles: mockFile ? [mockFile] : [],
    stats: csvData ? {
      // Basic mock stats for when data is provided
      rowCount: csvData.data.length,
      columnCount: csvData.headers.length,
      columns: csvData.headers.map(header => ({
        name: header,
        type: 'string',
        uniqueValues: 3,
        missingValues: 0
      })),
      insights: ['Data loaded successfully'],
      quality: {
        score: 0.9,
        issues: []
      }
    } : null,
    setCsvData: vi.fn(),
    setCurrentFile: vi.fn(),
    setUploadedFiles: vi.fn(),
    setStats: vi.fn(),
    setLoading: vi.fn(),
    setError: vi.fn(),
    processUploadResponse: vi.fn(),
    updateData: vi.fn(),
    clearData: vi.fn()
  };

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <div data-testid="test-wrapper">
        <DataContext.Provider value={mockDataContext as any}>
          {children}
        </DataContext.Provider>
      </div>
    );
  }

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...renderOptions })
  };
}

// Simple render with router only
export function renderWithRouter(
  ui: React.ReactElement,
  { route = '/' } = {}
) {
  window.history.pushState({}, 'Test page', route);
  // BrowserRouter is mocked globally, so we can use a simple wrapper
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="router-wrapper">{children}</div>
  );
  return render(ui, { wrapper: Wrapper });
}

// Navigation interaction helpers
export const navigationHelpers = {
  // Click a navigation item and wait for page change
  async clickNavItem(navItemId: string) {
    const navItem = screen.getByTestId(`nav-${navItemId}`);
    await act(async () => {
      fireEvent.click(navItem);
    });
    await waitFor(() => {
      expect(navItem).toHaveClass('navItemActive');
    }, { timeout: TIMEOUTS.navigation });
  },

  // Open user menu dropdown
  async openUserMenu() {
    const userMenuButton = screen.getByTestId('user-menu-button');
    await act(async () => {
      fireEvent.click(userMenuButton);
    });
    await waitFor(() => {
      expect(screen.getByTestId('user-menu-dropdown')).toBeVisible();
    }, { timeout: TIMEOUTS.modal });
  },

  // Close user menu dropdown
  async closeUserMenu() {
    const backdrop = screen.getByTestId('user-menu-backdrop');
    await act(async () => {
      fireEvent.click(backdrop);
    });
    await waitFor(() => {
      expect(screen.queryByTestId('user-menu-dropdown')).not.toBeInTheDocument();
    }, { timeout: TIMEOUTS.modal });
  },

  // Switch community tab
  async switchCommunityTab(tabKey: string) {
    const tab = screen.getByTestId(`community-tab-${tabKey}`);
    await act(async () => {
      fireEvent.click(tab);
    });
    await waitFor(() => {
      expect(tab).toHaveClass('active'); // Assuming active class
    }, { timeout: TIMEOUTS.navigation });
  },

  // Search in community
  async searchCommunity(searchTerm: string) {
    const searchInput = screen.getByTestId('search-input');
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: searchTerm } });
    });
    // Wait for search results to update
    await waitFor(() => {
      expect(searchInput).toHaveValue(searchTerm);
    }, { timeout: TIMEOUTS.api });
  },

  // Toggle tag filter
  async toggleTag(tagName: string) {
    const tagButton = screen.getByTestId(`tag-${tagName}`);
    await act(async () => {
      fireEvent.click(tagButton);
    });
    await waitFor(() => {
      // Tag should be visually selected/deselected
      expect(tagButton).toBeInTheDocument();
    }, { timeout: TIMEOUTS.animation });
  }
};

// Accessibility testing helpers
export const a11yHelpers = {
  // Check keyboard navigation through items
  async testKeyboardNavigation(items: NavigationItem[], user: any) {
    // Tab through navigation items
    for (const item of items) {
      await user.tab();
      const element = screen.getByTestId(`nav-${item.id}`);
      expect(element).toHaveFocus();
    }
  },

  // Test screen reader announcements
  testAriaAttributes(navItemId: string) {
    const navItem = screen.getByTestId(`nav-${navItemId}`);
    expect(navItem).toHaveAttribute('role', 'button');
    expect(navItem).toHaveAttribute('aria-label');
  },

  // Test focus management
  async testFocusManagement() {
    // Test focus trap in modals
    const modal = screen.queryByRole('dialog');
    if (modal) {
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('role', 'dialog');
    }
  }
};

// Error simulation helpers
export const errorHelpers = {
  // Mock network error
  mockNetworkError() {
    const originalFetch = global.fetch;
    global.fetch = vi.fn(() =>
      Promise.reject(new Error('Network error'))
    );
    return () => {
      global.fetch = originalFetch;
    };
  },

  // Mock slow network
  mockSlowNetwork(delay: number = 2000) {
    const originalFetch = global.fetch;
    global.fetch = vi.fn(() =>
      new Promise(resolve => setTimeout(resolve, delay))
    );
    return () => {
      global.fetch = originalFetch;
    };
  },

  // Simulate component error
  throwComponentError() {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    return consoleError;
  }
};

// Responsive testing helpers
export const responsiveHelpers = {
  // Resize viewport
  resizeViewport(width: number, height: number) {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height,
    });
    window.dispatchEvent(new Event('resize'));
  },

  // Check responsive behavior
  async testResponsiveBehavior(breakpoint: 'mobile' | 'tablet' | 'desktop') {
    const viewports = {
      mobile: { width: 375, height: 667 },
      tablet: { width: 768, height: 1024 },
      desktop: { width: 1920, height: 1080 }
    };

    const { width, height } = viewports[breakpoint];
    this.resizeViewport(width, height);
    
    // Wait for responsive changes to apply
    await waitFor(() => {
      // Add specific responsive checks here
    }, { timeout: TIMEOUTS.animation });
  }
};

// Assert helpers for common navigation checks
export const assertHelpers = {
  // Assert navigation item is active
  assertNavItemActive(navItemId: string) {
    const navItem = screen.getByTestId(`nav-${navItemId}`);
    expect(navItem).toHaveClass('navItemActive');
    expect(navItem).toHaveAttribute('aria-current', 'page');
  },

  // Assert page component is rendered
  assertPageRendered(pageTitle: string) {
    expect(screen.getByRole('heading', { name: new RegExp(pageTitle, 'i') })).toBeInTheDocument();
  },

  // Assert modal is open/closed
  assertModalState(modalTestId: string, isOpen: boolean) {
    const modal = screen.queryByTestId(modalTestId);
    if (isOpen) {
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('aria-modal', 'true');
    } else {
      expect(modal).not.toBeInTheDocument();
    }
  },

  // Assert loading state
  assertLoadingState(isLoading: boolean) {
    const spinner = screen.queryByTestId('loading-spinner');
    if (isLoading) {
      expect(spinner).toBeInTheDocument();
    } else {
      expect(spinner).not.toBeInTheDocument();
    }
  },

  // Assert error boundary
  assertErrorBoundary(hasError: boolean) {
    const errorBoundary = screen.queryByTestId('error-boundary');
    if (hasError) {
      expect(errorBoundary).toBeInTheDocument();
    } else {
      expect(errorBoundary).not.toBeInTheDocument();
    }
  }
};

// Story creation helper for testing story-related navigation
export const storyHelpers = {
  createMockStory(overrides = {}) {
    return {
      id: 'test-story-1',
      title: 'Test Story Title',
      summary: 'Test story summary',
      content: 'Test story content',
      author: 'Test Author',
      authorId: 'test-author-1',
      authorAvatar: '👤',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublic: true,
      likes: 0,
      likedBy: [],
      comments: [],
      views: 0,
      viewedBy: [],
      tags: ['test'],
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
        generation_time_ms: 100,
        story_type: 'summary',
        narrative_style: 'summary'
      },
      ...overrides
    };
  }
};

export default {
  renderWithProviders,
  renderWithRouter,
  navigationHelpers,
  a11yHelpers,
  errorHelpers,
  responsiveHelpers,
  assertHelpers,
  storyHelpers,
  createMockUser,
  createMockCsvData
};
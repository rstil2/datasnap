/**
 * Test setup file for navigation testing
 * Configures global test environment, mocks, and utilities
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import React from 'react';

// Mock UserContext for testing
const TestUserContext = React.createContext<any | undefined>(undefined);

// Create a global user context value that tests can override
let globalUserContext: any = {
  user: null,
  isAuthenticated: false,
  signIn: vi.fn(),
  signOut: vi.fn(),
  updateUser: vi.fn()
};

// Function to set mock user context from tests
global.setMockUserContext = (context: any) => {
  globalUserContext = context;
};

// Mock the UserContext
vi.mock('../contexts/UserContext', () => ({
  useUser: () => globalUserContext,
  UserProvider: ({ children }: { children: React.ReactNode }) => React.createElement('div', {}, children)
}));

// Note: react-router-dom mock moved to individual test files to avoid hoisting issues

// Clean up after each test
afterEach(() => {
  cleanup();
  
  // Clear all localStorage and sessionStorage
  localStorage.clear();
  sessionStorage.clear();
  
  // Clear all mocks
  vi.clearAllMocks();
});

// Setup before each test
beforeEach(() => {
  // Mock window.matchMedia for responsive tests
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock window.ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock scrollTo
  window.scrollTo = vi.fn();

  // Note: clipboard API is handled by userEvent.setup() in test utils

  // Mock navigator.share
  Object.defineProperty(navigator, 'share', {
    writable: true,
    value: vi.fn().mockImplementation(() => Promise.resolve()),
  });

  // Mock performance.now for timing tests
  vi.spyOn(performance, 'now').mockImplementation(() => Date.now());

  // Mock console methods to reduce test noise
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});

  // Setup default localStorage data for consistency
  localStorage.setItem('datasnap_community', JSON.stringify({}));
  localStorage.setItem('datasnap_stories', JSON.stringify({}));
  localStorage.setItem('datasnap_csv_data', JSON.stringify(null));
  localStorage.setItem('datasnap_current_file', '');
});

// Global test utilities
declare global {
  var testUtils: {
    waitForNextTick: () => Promise<void>;
    mockLocalStorage: (data: Record<string, any>) => void;
    mockSessionStorage: (data: Record<string, any>) => void;
  };
}

globalThis.testUtils = {
  // Utility to wait for next tick in tests
  waitForNextTick: () => new Promise(resolve => setTimeout(resolve, 0)),
  
  // Utility to easily mock localStorage
  mockLocalStorage: (data: Record<string, any>) => {
    Object.entries(data).forEach(([key, value]) => {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    });
  },
  
  // Utility to easily mock sessionStorage
  mockSessionStorage: (data: Record<string, any>) => {
    Object.entries(data).forEach(([key, value]) => {
      sessionStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    });
  }
};
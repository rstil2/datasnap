/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts,tsx}'],
    exclude: ['node_modules', 'dist', 'cypress'],
    css: true,
    
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'dist/',
        'cypress/',
        '**/*.config.*',
        '**/*.d.ts',
        'src/__tests__/**',
        'src/main.tsx',
        'electron/'
      ],
      
      // Navigation components coverage thresholds
      thresholds: {
        global: {
          lines: 90,
          functions: 90,
          branches: 85,
          statements: 90
        },
        // Per-file thresholds for navigation components
        'src/App.tsx': {
          lines: 95,
          functions: 95,
          branches: 90,
          statements: 95
        },
        'src/components/UserMenu.tsx': {
          lines: 90,
          functions: 90,
          branches: 85,
          statements: 90
        },
        'src/components/StoryPage.tsx': {
          lines: 85,
          functions: 85,
          branches: 80,
          statements: 85
        },
        'src/components/CommunityPage.tsx': {
          lines: 85,
          functions: 85,
          branches: 80,
          statements: 85
        },
        'src/components/SharedStoryViewer.tsx': {
          lines: 85,
          functions: 85,
          branches: 80,
          statements: 85
        }
      }
    },
    
    // Test timeout configuration
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Test environment setup
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4
      }
    },
    
    // Reporter configuration
    reporter: process.env.CI ? ['junit', 'json', 'verbose'] : ['verbose'],
    outputFile: {
      junit: './coverage/junit.xml',
      json: './coverage/test-results.json'
    },
    
    // Updated configuration for better compatibility
    server: {
      deps: {
        inline: ['file-saver', 'html2canvas', 'jspdf', 'pptxgenjs', 'exceljs'],
      },
    },
  },
});

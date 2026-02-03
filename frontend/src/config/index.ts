/**
 * Centralized Configuration System
 * Manages environment variables and application settings
 */

export interface AppConfig {
  // Environment
  nodeEnv: 'development' | 'production' | 'test';
  isDevelopment: boolean;
  isProduction: boolean;
  
  // App Info
  appName: string;
  appVersion: string;
  
  // API Configuration
  apiBaseUrl: string;
  apiTimeout: number;
  
    // Feature Flags
    enableAnalytics: boolean;
    enableErrorReporting: boolean;
    enablePerformanceMonitoring: boolean;
  
  // Limits
  maxFileSize: number;
  maxRows: number;
  maxColumns: number;
  
  // Security
  enableContentSecurityPolicy: boolean;
  sentryDsn?: string;
  
  // Storage
  storagePrefix: string;
  
  // Firebase Configuration
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId?: string;
    useEmulators: boolean;
  };
}

// Helper function to parse boolean environment variables
const parseBool = (value: string | undefined, defaultValue = false): boolean => {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
};

// Helper function to parse number environment variables
const parseNumber = (value: string | undefined, defaultValue: number): number => {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && (
  (window as any).process?.type === 'renderer' ||
  (window as any).electron !== undefined ||
  navigator.userAgent.includes('Electron')
);

// Create configuration object from environment variables
const createConfig = (): AppConfig => {
  const nodeEnv = (process.env.NODE_ENV || 'development') as AppConfig['nodeEnv'];
  
  // Determine API base URL
  // In Electron (including App Store builds), always use localhost for bundled backend
  // Or use remote API URL if configured
  let apiBaseUrl = process.env.API_BASE_URL;
  if (!apiBaseUrl) {
    if (isElectron) {
      // Electron: use localhost for bundled backend, or remote API if provided
      apiBaseUrl = process.env.VITE_API_URL || 'http://localhost:8000';
    } else if (nodeEnv === 'production') {
      // Web production: use relative path or configured URL
      apiBaseUrl = '/api';
    } else {
      // Development: use localhost
      apiBaseUrl = 'http://localhost:8000';
    }
  }
  
  return {
    // Environment
    nodeEnv,
    isDevelopment: nodeEnv === 'development',
    isProduction: nodeEnv === 'production',
    
    // App Info
    appName: process.env.APP_NAME || 'DataSnap',
    appVersion: process.env.APP_VERSION || '1.0.0',
    
    // API Configuration
    apiBaseUrl,
    apiTimeout: parseNumber(process.env.API_TIMEOUT, nodeEnv === 'production' ? 30000 : 10000),
    
    // Feature Flags
    enableAnalytics: parseBool(process.env.ENABLE_ANALYTICS, nodeEnv === 'production'),
    enableErrorReporting: parseBool(process.env.ENABLE_ERROR_REPORTING, nodeEnv === 'production'),
    enablePerformanceMonitoring: parseBool(process.env.ENABLE_PERFORMANCE_MONITORING, nodeEnv === 'production'),
    
    // Limits
    maxFileSize: parseNumber(process.env.MAX_FILE_SIZE, nodeEnv === 'production' ? 52428800 : 104857600), // 50MB prod, 100MB dev
    maxRows: parseNumber(process.env.MAX_ROWS, nodeEnv === 'production' ? 100000 : 50000),
    maxColumns: parseNumber(process.env.MAX_COLUMNS, nodeEnv === 'production' ? 1000 : 500),
    
    // Security
    enableContentSecurityPolicy: parseBool(process.env.ENABLE_CONTENT_SECURITY_POLICY, nodeEnv === 'production'),
    sentryDsn: process.env.SENTRY_DSN,
    
    // Storage
    storagePrefix: process.env.STORAGE_PREFIX || (nodeEnv === 'production' ? 'datasnap_prod_' : 'datasnap_dev_'),
    
    // Firebase Configuration
    firebase: {
      apiKey: process.env.FIREBASE_API_KEY || '',
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
      projectId: process.env.FIREBASE_PROJECT_ID || '',
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
      appId: process.env.FIREBASE_APP_ID || '',
      measurementId: process.env.FIREBASE_MEASUREMENT_ID,
      useEmulators: parseBool(process.env.FIREBASE_USE_EMULATORS, nodeEnv === 'development'),
    }
  };
};

// Export singleton config instance
export const config = createConfig();

// Export utility functions for common checks
export const isProduction = () => config.isProduction;
export const isDevelopment = () => config.isDevelopment;
export const getStorageKey = (key: string) => `${config.storagePrefix}${key}`;

// Export formatted file size helper
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Export validation helper
export const validateFileSize = (fileSize: number): { valid: boolean; message?: string } => {
  if (fileSize > config.maxFileSize) {
    return {
      valid: false,
      message: `File size too large. Maximum allowed size is ${formatFileSize(config.maxFileSize)}.`
    };
  }
  
  return { valid: true };
};

// Configuration is ready - no logging in production
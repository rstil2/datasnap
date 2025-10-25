import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeColors {
  // Background colors
  bgPrimary: string;
  bgSecondary: string;
  bgElevated: string;
  bgOverlay: string;
  bgInput: string;
  bgHover: string;
  bgSelected: string;
  bgDisabled: string;

  // Text colors
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textDisabled: string;
  textInverse: string;
  textOnColor: string;

  // Border colors
  borderPrimary: string;
  borderSecondary: string;
  borderFocus: string;
  borderError: string;
  borderSuccess: string;
  borderWarning: string;

  // Accent colors
  accentPrimary: string;
  accentSecondary: string;
  accentHover: string;
  accentPressed: string;
  accentDisabled: string;

  // Status colors
  success: string;
  successBg: string;
  successBorder: string;
  error: string;
  errorBg: string;
  errorBorder: string;
  warning: string;
  warningBg: string;
  warningBorder: string;
  info: string;
  infoBg: string;
  infoBorder: string;

  // Chart colors
  chartPrimary: string;
  chartSecondary: string;
  chartTertiary: string;
  chartQuaternary: string;
  chartQuinary: string;
  chartSenary: string;
  chartGrid: string;
  chartAxis: string;
  chartTooltipBg: string;
  chartTooltipBorder: string;

  // Shadow colors
  shadowLight: string;
  shadowMedium: string;
  shadowHeavy: string;
  shadowFocus: string;
}

export interface ThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  '4xl': string;
}

export interface ThemeRadius {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  full: string;
}

export interface ThemeFonts {
  fontFamilyPrimary: string;
  fontFamilyMono: string;
  fontSizeXs: string;
  fontSizeSm: string;
  fontSizeMd: string;
  fontSizeLg: string;
  fontSizeXl: string;
  fontSize2xl: string;
  fontSize3xl: string;
  fontWeightNormal: string;
  fontWeightMedium: string;
  fontWeightSemibold: string;
  fontWeightBold: string;
  lineHeightTight: string;
  lineHeightNormal: string;
  lineHeightRelaxed: string;
}

export interface ThemeBreakpoints {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
}

export interface Theme {
  mode: ResolvedTheme;
  colors: ThemeColors;
  spacing: ThemeSpacing;
  radius: ThemeRadius;
  fonts: ThemeFonts;
  breakpoints: ThemeBreakpoints;
}

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  systemTheme: ResolvedTheme;
  isSystemTheme: boolean;
  applyThemeToDOM: () => void;
}

const STORAGE_KEY = 'datasnap-theme-mode';
const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)';

// Light theme colors
const lightColors: ThemeColors = {
  // Background colors
  bgPrimary: '#ffffff',
  bgSecondary: '#f8fafc',
  bgElevated: '#ffffff',
  bgOverlay: 'rgba(0, 0, 0, 0.5)',
  bgInput: '#ffffff',
  bgHover: '#f1f5f9',
  bgSelected: '#e2e8f0',
  bgDisabled: '#f1f5f9',

  // Text colors
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textTertiary: '#64748b',
  textDisabled: '#94a3b8',
  textInverse: '#ffffff',
  textOnColor: '#ffffff',

  // Border colors
  borderPrimary: '#e2e8f0',
  borderSecondary: '#cbd5e1',
  borderFocus: '#3b82f6',
  borderError: '#ef4444',
  borderSuccess: '#10b981',
  borderWarning: '#f59e0b',

  // Accent colors
  accentPrimary: '#3b82f6',
  accentSecondary: '#6366f1',
  accentHover: '#2563eb',
  accentPressed: '#1d4ed8',
  accentDisabled: '#94a3b8',

  // Status colors
  success: '#10b981',
  successBg: '#ecfdf5',
  successBorder: '#a7f3d0',
  error: '#ef4444',
  errorBg: '#fef2f2',
  errorBorder: '#fecaca',
  warning: '#f59e0b',
  warningBg: '#fffbeb',
  warningBorder: '#fed7aa',
  info: '#3b82f6',
  infoBg: '#eff6ff',
  infoBorder: '#bfdbfe',

  // Chart colors
  chartPrimary: '#3b82f6',
  chartSecondary: '#8b5cf6',
  chartTertiary: '#06b6d4',
  chartQuaternary: '#10b981',
  chartQuinary: '#f59e0b',
  chartSenary: '#ef4444',
  chartGrid: '#e2e8f0',
  chartAxis: '#64748b',
  chartTooltipBg: '#1e293b',
  chartTooltipBorder: '#475569',

  // Shadow colors
  shadowLight: 'rgba(0, 0, 0, 0.05)',
  shadowMedium: 'rgba(0, 0, 0, 0.1)',
  shadowHeavy: 'rgba(0, 0, 0, 0.25)',
  shadowFocus: 'rgba(59, 130, 246, 0.5)',
};

// Dark theme colors
const darkColors: ThemeColors = {
  // Background colors
  bgPrimary: '#0f172a',
  bgSecondary: '#1e293b',
  bgElevated: '#1e293b',
  bgOverlay: 'rgba(0, 0, 0, 0.75)',
  bgInput: '#1e293b',
  bgHover: '#334155',
  bgSelected: '#475569',
  bgDisabled: '#1e293b',

  // Text colors
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textTertiary: '#cbd5e1',
  textDisabled: '#64748b',
  textInverse: '#0f172a',
  textOnColor: '#ffffff',

  // Border colors
  borderPrimary: '#334155',
  borderSecondary: '#475569',
  borderFocus: '#60a5fa',
  borderError: '#f87171',
  borderSuccess: '#34d399',
  borderWarning: '#fbbf24',

  // Accent colors
  accentPrimary: '#60a5fa',
  accentSecondary: '#818cf8',
  accentHover: '#3b82f6',
  accentPressed: '#2563eb',
  accentDisabled: '#64748b',

  // Status colors
  success: '#34d399',
  successBg: '#064e3b',
  successBorder: '#065f46',
  error: '#f87171',
  errorBg: '#7f1d1d',
  errorBorder: '#991b1b',
  warning: '#fbbf24',
  warningBg: '#78350f',
  warningBorder: '#92400e',
  info: '#60a5fa',
  infoBg: '#1e3a8a',
  infoBorder: '#1d4ed8',

  // Chart colors
  chartPrimary: '#60a5fa',
  chartSecondary: '#a78bfa',
  chartTertiary: '#22d3ee',
  chartQuaternary: '#34d399',
  chartQuinary: '#fbbf24',
  chartSenary: '#f87171',
  chartGrid: '#334155',
  chartAxis: '#cbd5e1',
  chartTooltipBg: '#f8fafc',
  chartTooltipBorder: '#e2e8f0',

  // Shadow colors
  shadowLight: 'rgba(0, 0, 0, 0.3)',
  shadowMedium: 'rgba(0, 0, 0, 0.5)',
  shadowHeavy: 'rgba(0, 0, 0, 0.8)',
  shadowFocus: 'rgba(96, 165, 250, 0.5)',
};

// Shared theme properties
const spacing: ThemeSpacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.5rem',
  '2xl': '2rem',
  '3xl': '2.5rem',
  '4xl': '3rem',
};

const radius: ThemeRadius = {
  xs: '0.125rem',
  sm: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  full: '9999px',
};

const fonts: ThemeFonts = {
  fontFamilyPrimary: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontFamilyMono: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  fontSizeXs: '0.75rem',
  fontSizeSm: '0.875rem',
  fontSizeMd: '1rem',
  fontSizeLg: '1.125rem',
  fontSizeXl: '1.25rem',
  fontSize2xl: '1.5rem',
  fontSize3xl: '1.875rem',
  fontWeightNormal: '400',
  fontWeightMedium: '500',
  fontWeightSemibold: '600',
  fontWeightBold: '700',
  lineHeightTight: '1.25',
  lineHeightNormal: '1.5',
  lineHeightRelaxed: '1.75',
};

const breakpoints: ThemeBreakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

const createTheme = (resolvedTheme: ResolvedTheme): Theme => ({
  mode: resolvedTheme,
  colors: resolvedTheme === 'dark' ? darkColors : lightColors,
  spacing,
  radius,
  fonts,
  breakpoints,
});

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeMode;
  storageKey?: string;
  attribute?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'system',
  storageKey = STORAGE_KEY,
  attribute = 'data-theme',
  enableSystem = true,
  disableTransitionOnChange = false,
}) => {
  // System theme detection
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia(SYSTEM_THEME_QUERY).matches ? 'dark' : 'light';
  });

  // Theme mode state
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return defaultTheme;
    
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        return stored as ThemeMode;
      }
    } catch (error) {
      console.warn('Failed to read theme from localStorage:', error);
    }
    
    return defaultTheme;
  });

  // Resolved theme (actual theme being used)
  const resolvedTheme: ResolvedTheme = 
    themeMode === 'system' ? systemTheme : themeMode as ResolvedTheme;

  // Create theme object
  const theme = createTheme(resolvedTheme);

  // Update system theme on media query change
  useEffect(() => {
    if (!enableSystem) return;

    const mediaQuery = window.matchMedia(SYSTEM_THEME_QUERY);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [enableSystem]);

  // Apply theme to DOM
  const applyThemeToDOM = useCallback(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    
    // Disable transitions temporarily
    if (disableTransitionOnChange) {
      root.style.setProperty('transition', 'none', 'important');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          root.style.removeProperty('transition');
        });
      });
    }

    // Set attribute
    root.setAttribute(attribute, resolvedTheme);

    // Apply CSS custom properties
    Object.entries(theme.colors).forEach(([key, value]) => {
      const kebab = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      // Legacy variables used by global.css (e.g. --bg-primary, --text-primary, etc.)
      root.style.setProperty(`--${kebab}`, value);
      // Also set namespaced variables for component-level overrides if needed
      root.style.setProperty(`--color-${kebab}`, value);
    });

    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--space-${key}`, value);
    });

    Object.entries(theme.radius).forEach(([key, value]) => {
      root.style.setProperty(`--radius-${key}`, value);
    });

    Object.entries(theme.fonts).forEach(([key, value]) => {
      root.style.setProperty(`--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value);
    });

    Object.entries(theme.breakpoints).forEach(([key, value]) => {
      root.style.setProperty(`--breakpoint-${key}`, value);
    });

    // Set meta theme-color for mobile browsers
    let themeColorMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.name = 'theme-color';
      document.head.appendChild(themeColorMeta);
    }
    themeColorMeta.content = theme.colors.bgPrimary;

    // Update color-scheme CSS property
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme, theme, attribute, disableTransitionOnChange]);

  // Apply theme on change
  useEffect(() => {
    applyThemeToDOM();
  }, [applyThemeToDOM]);

  // Set theme mode with persistence
  const setThemeMode = useCallback((mode: ThemeMode) => {
    try {
      localStorage.setItem(storageKey, mode);
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error);
    }
    
    setThemeModeState(mode);
  }, [storageKey]);

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    if (themeMode === 'system') {
      // If system, switch to opposite of system preference
      setThemeMode(systemTheme === 'dark' ? 'light' : 'dark');
    } else {
      // Toggle between light and dark
      setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
    }
  }, [themeMode, systemTheme, setThemeMode]);

  const value: ThemeContextType = {
    theme,
    themeMode,
    resolvedTheme,
    setThemeMode,
    toggleTheme,
    systemTheme,
    isSystemTheme: themeMode === 'system',
    applyThemeToDOM,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Theme toggle button component
export interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'text' | 'both';
  showSystemOption?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  size = 'md',
  variant = 'icon',
  showSystemOption = false,
}) => {
  const { themeMode, resolvedTheme, setThemeMode, toggleTheme, isSystemTheme } = useTheme();

  const sizeClasses = {
    sm: 'p-1.5 text-sm',
    md: 'p-2 text-base',
    lg: 'p-3 text-lg',
  };

  if (showSystemOption) {
    return (
      <div className={`inline-flex rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
        {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setThemeMode(mode)}
            className={`${sizeClasses[size]} px-3 first:rounded-l-lg last:rounded-r-lg transition-colors ${
              themeMode === mode
                ? 'bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            type="button"
            aria-pressed={themeMode === mode}
          >
            {mode === 'light' && (variant === 'icon' || variant === 'both') && (
              <span role="img" aria-label="Light theme">☀️</span>
            )}
            {mode === 'dark' && (variant === 'icon' || variant === 'both') && (
              <span role="img" aria-label="Dark theme">🌙</span>
            )}
            {mode === 'system' && (variant === 'icon' || variant === 'both') && (
              <span role="img" aria-label="System theme">💻</span>
            )}
            {(variant === 'text' || variant === 'both') && (
              <span className={variant === 'both' ? 'ml-2' : ''}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`${sizeClasses[size]} rounded-lg transition-colors bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 ${className}`}
      type="button"
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
      title={`Current theme: ${isSystemTheme ? `System (${resolvedTheme})` : resolvedTheme}`}
    >
      {variant === 'icon' || variant === 'both' ? (
        <span role="img" aria-hidden="true">
          {resolvedTheme === 'dark' ? '☀️' : '🌙'}
        </span>
      ) : null}
      {variant === 'text' || variant === 'both' ? (
        <span className={variant === 'both' ? 'ml-2' : ''}>
          {resolvedTheme === 'dark' ? 'Light' : 'Dark'}
        </span>
      ) : null}
    </button>
  );
};

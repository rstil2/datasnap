import { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const isDevelopment = process.env.VITE_NODE_ENV === 'development';
    
    // Log to console in development
    if (isDevelopment) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    
    // Report to error monitoring service in production
    if (!isDevelopment && process.env.VITE_ENABLE_ERROR_REPORTING === 'true') {
      this.reportError(error, errorInfo);
    }
  }
  
  private reportError(error: Error, errorInfo: ErrorInfo) {
    // Log error with structured data for monitoring
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      appVersion: process.env.VITE_APP_VERSION || '1.0.0'
    };
    
    // Store error locally for debugging
    try {
      const existingErrors = JSON.parse(localStorage.getItem('datasnap_errors') || '[]');
      existingErrors.push(errorReport);
      // Keep only last 10 errors
      if (existingErrors.length > 10) {
        existingErrors.splice(0, existingErrors.length - 10);
      }
      localStorage.setItem('datasnap_errors', JSON.stringify(existingErrors));
    } catch (e) {
      // Ignore localStorage errors
    }
    
    // Send to monitoring service if configured
    // Note: This requires @sentry/react to be installed and configured
    if (process.env.VITE_SENTRY_DSN) {
      // Use dynamic import with proper error handling
      // This will only work if @sentry/react is installed
      try {
        // Check if Sentry is available at runtime
        if (typeof window !== 'undefined' && (window as any).Sentry) {
          (window as any).Sentry.captureException(error, { contexts: { react: errorInfo } });
        }
      } catch (e) {
        // Sentry not available or not configured, silently fail
        if (process.env.NODE_ENV === 'development') {
          console.warn('Sentry error tracking configured but not available. Install @sentry/react to enable.');
        }
      }
    }
    
    // Alternative: Send to custom error tracking endpoint
    if (process.env.VITE_ERROR_TRACKING_URL) {
      try {
        fetch(process.env.VITE_ERROR_TRACKING_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(errorReport)
        }).catch(() => {
          // Silently fail if error tracking endpoint is unavailable
        });
      } catch (e) {
        // Ignore errors in error reporting
      }
    }
  }

  render() {
    if (this.state.hasError) {
      const isDevelopment = process.env.VITE_NODE_ENV === 'development';
      
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: '#f8fafc',
          color: '#0f172a'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', fontWeight: '600' }}>
            Oops! Something went wrong
          </h1>
          <p style={{ marginBottom: '2rem', color: '#64748b', maxWidth: '400px' }}>
            {isDevelopment 
              ? 'DataSnap encountered an error while rendering the application. Check the console for details.'
              : 'We apologize for the inconvenience. Please try refreshing the page or contact support if the problem persists.'
            }
          </p>
          
          {/* Only show technical details in development */}
          {isDevelopment && (
            <details style={{ 
              marginBottom: '2rem', 
              padding: '1rem', 
              backgroundColor: '#f1f5f9',
              borderRadius: '0.5rem',
              textAlign: 'left',
              maxWidth: '600px',
              width: '100%'
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: '600', marginBottom: '0.5rem' }}>Error Details</summary>
              <pre style={{ 
                fontSize: '0.75rem', 
                margin: '1rem 0 0 0',
                whiteSpace: 'pre-wrap',
                color: '#374151',
                overflow: 'auto',
                maxHeight: '200px'
              }}>
                {this.state.error?.toString()}
              </pre>
            </details>
          )}
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600'
              }}
            >
              Reload Application
            </button>
            
            <button
              onClick={() => window.history.back()}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#f1f5f9',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600'
              }}
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
import React, { 
  Suspense, 
  lazy, 
  useState, 
  useEffect, 
  useRef, 
  useCallback, 
  useMemo,
  ReactNode,
  ComponentType,
  LazyExoticComponent
} from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export interface LazyComponentProps {
  component: () => Promise<{ default: ComponentType<any> }>;
  fallback?: ReactNode;
  errorFallback?: (error: Error, retry: () => void) => ReactNode;
  props?: Record<string, any>;
  loadingDelay?: number;
  retryAttempts?: number;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  preload?: boolean;
  className?: string;
}

export interface IntersectionLoaderProps extends LazyComponentProps {
  rootMargin?: string;
  threshold?: number;
  triggerOnce?: boolean;
  placeholder?: ReactNode;
}

export interface ChunkLoaderState {
  loaded: Set<string>;
  loading: Set<string>;
  failed: Set<string>;
  retryCount: Map<string, number>;
}

// Global chunk loader state
const chunkLoaderState: ChunkLoaderState = {
  loaded: new Set(),
  loading: new Set(),
  failed: new Set(),
  retryCount: new Map()
};

// Error Boundary for lazy components
class LazyErrorBoundary extends React.Component<
  {
    children: ReactNode;
    fallback: (error: Error, retry: () => void) => ReactNode;
    onError?: (error: Error) => void;
    retry: () => void;
  },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy component error:', error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback(this.state.error!, () => {
        this.setState({ hasError: false, error: null });
        this.props.retry();
      });
    }

    return this.props.children;
  }
}

// Default loading component
const DefaultLoader: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center justify-center p-8 ${className}`}>
    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
      <Loader2 className="animate-spin" size={20} />
      <span>Loading...</span>
    </div>
  </div>
);

// Default error component
const DefaultErrorFallback = (error: Error, retry: () => void) => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <AlertCircle className="text-red-500 mb-3" size={48} />
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
      Failed to Load Component
    </h3>
    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
      {error.message || 'An unexpected error occurred'}
    </p>
    <button
      onClick={retry}
      className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
    >
      <RefreshCw size={16} />
      Retry
    </button>
  </div>
);

// Lazy component loader with retry logic
export const LazyComponent: React.FC<LazyComponentProps> = ({
  component,
  fallback = <DefaultLoader />,
  errorFallback = DefaultErrorFallback,
  props = {},
  loadingDelay = 200,
  retryAttempts = 3,
  onLoad,
  onError,
  preload = false,
  className = ''
}) => {
  const [LazyComp, setLazyComp] = useState<LazyExoticComponent<ComponentType<any>> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [currentRetries, setCurrentRetries] = useState(0);
  const loaderTimeoutRef = useRef<NodeJS.Timeout>();

  const loadComponent = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    
    // Delay showing loader to prevent flash for fast loads
    loaderTimeoutRef.current = setTimeout(() => {
      setShowLoader(true);
    }, loadingDelay);

    try {
      const LazyLoadedComponent = lazy(component);
      
      // Preload the component
      await component();
      
      setLazyComp(() => LazyLoadedComponent);
      onLoad?.();
      setCurrentRetries(0);
    } catch (error) {
      console.error('Failed to load lazy component:', error);
      onError?.(error as Error);
      
      if (currentRetries < retryAttempts) {
        setCurrentRetries(prev => prev + 1);
        // Exponential backoff
        const delay = Math.pow(2, currentRetries) * 1000;
        setTimeout(() => {
          setRetryKey(prev => prev + 1);
        }, delay);
      }
    } finally {
      setIsLoading(false);
      setShowLoader(false);
      if (loaderTimeoutRef.current) {
        clearTimeout(loaderTimeoutRef.current);
      }
    }
  }, [component, loadingDelay, onLoad, onError, currentRetries, retryAttempts, isLoading]);

  const retry = useCallback(() => {
    setCurrentRetries(0);
    setRetryKey(prev => prev + 1);
    loadComponent();
  }, [loadComponent]);

  useEffect(() => {
    if (preload) {
      loadComponent();
    }
    
    return () => {
      if (loaderTimeoutRef.current) {
        clearTimeout(loaderTimeoutRef.current);
      }
    };
  }, [preload, loadComponent, retryKey]);

  if (!LazyComp) {
    if (preload) {
      return showLoader ? <div className={className}>{fallback}</div> : null;
    }
    
    return (
      <div className={className}>
        <button
          onClick={loadComponent}
          className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
        >
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">Click to load component</p>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      <LazyErrorBoundary
        fallback={errorFallback}
        onError={onError}
        retry={retry}
      >
        <Suspense fallback={showLoader ? fallback : <DefaultLoader />}>
          <LazyComp {...props} />
        </Suspense>
      </LazyErrorBoundary>
    </div>
  );
};

// Intersection-based lazy loader
export const IntersectionLazyLoader: React.FC<IntersectionLoaderProps> = ({
  rootMargin = '50px',
  threshold = 0.1,
  triggerOnce = true,
  placeholder,
  ...lazyProps
}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || hasTriggered && triggerOnce) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          if (triggerOnce) {
            setHasTriggered(true);
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsIntersecting(false);
        }
      },
      {
        rootMargin,
        threshold
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [rootMargin, threshold, triggerOnce, hasTriggered]);

  return (
    <div ref={elementRef} className={lazyProps.className}>
      {isIntersecting || hasTriggered ? (
        <LazyComponent {...lazyProps} preload={true} />
      ) : (
        placeholder || (
          <div className="flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">Component will load when visible</p>
          </div>
        )
      )}
    </div>
  );
};

// Chart-specific lazy loader with optimizations
export interface LazyChartProps extends LazyComponentProps {
  chartType: 'line' | 'bar' | 'scatter' | 'pie' | 'area' | 'violin' | 'radar' | 'treemap';
  data?: any;
  config?: Record<string, any>;
}

export const LazyChart: React.FC<LazyChartProps> = ({
  chartType,
  data,
  config,
  ...lazyProps
}) => {
  // Chart-specific optimizations
  const optimizedProps = {
    ...lazyProps.props,
    data,
    config,
  };

  // Chart-specific loading placeholder
  const chartFallback = (
    <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
      <div className="text-center p-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Loader2 className="animate-spin" size={16} />
          <span className="text-sm">Loading {chartType} chart...</span>
        </div>
      </div>
    </div>
  );

  return (
    <LazyComponent
      {...lazyProps}
      props={optimizedProps}
      fallback={lazyProps.fallback || chartFallback}
      onLoad={() => {
        // Track chart load for analytics
        // Chart loaded successfully
        lazyProps.onLoad?.();
      }}
    />
  );
};

import { getChartLoader } from '../../hooks/chartRegistry';

// Code splitting utility for dynamic imports - Updated to use chart registry
export const createLazyChartComponent = (chartType: string) => {
  const loader = getChartLoader(chartType);
  return loader || (() => Promise.reject(new Error(`Unknown chart type: ${chartType}`)));
};

// Hook for managing multiple lazy components
export const useLazyComponents = (components: string[]) => {
  const [loadedComponents, setLoadedComponents] = useState<Set<string>>(new Set());
  const [failedComponents, setFailedComponents] = useState<Set<string>>(new Set());

  const loadComponent = useCallback(async (componentName: string) => {
    if (loadedComponents.has(componentName) || failedComponents.has(componentName)) {
      return;
    }

    try {
      const componentLoader = createLazyChartComponent(componentName);
      await componentLoader();
      setLoadedComponents(prev => new Set([...prev, componentName]));
    } catch (error) {
      console.error(`Failed to load component ${componentName}:`, error);
      setFailedComponents(prev => new Set([...prev, componentName]));
    }
  }, [loadedComponents, failedComponents]);

  const preloadComponents = useCallback(async (componentNames: string[] = components) => {
    await Promise.allSettled(
      componentNames.map(name => loadComponent(name))
    );
  }, [components, loadComponent]);

  return {
    loadedComponents,
    failedComponents,
    loadComponent,
    preloadComponents,
    isLoaded: (component: string) => loadedComponents.has(component),
    isFailed: (component: string) => failedComponents.has(component)
  };
};

// Progressive loading component for dashboard
export interface ProgressiveLoaderProps {
  components: Array<{
    id: string;
    component: () => Promise<{ default: ComponentType<any> }>;
    priority: number;
    props?: Record<string, any>;
  }>;
  batchSize?: number;
  delay?: number;
  onProgress?: (loaded: number, total: number) => void;
}

export const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({
  components,
  batchSize = 3,
  delay = 100,
  onProgress
}) => {
  const [loadedComponents, setLoadedComponents] = useState<Set<string>>(new Set());
  const [currentBatch, setCurrentBatch] = useState(0);

  // Sort components by priority
  const sortedComponents = useMemo(() => 
    [...components].sort((a, b) => b.priority - a.priority),
    [components]
  );

  const totalBatches = Math.ceil(sortedComponents.length / batchSize);

  useEffect(() => {
    const loadNextBatch = async () => {
      if (currentBatch >= totalBatches) return;

      const start = currentBatch * batchSize;
      const end = Math.min(start + batchSize, sortedComponents.length);
      const batch = sortedComponents.slice(start, end);

      // Load batch components
      const loadPromises = batch.map(async (comp) => {
        try {
          await comp.component();
          setLoadedComponents(prev => new Set([...prev, comp.id]));
          return comp.id;
        } catch (error) {
          console.error(`Failed to load component ${comp.id}:`, error);
          return null;
        }
      });

      await Promise.allSettled(loadPromises);
      
      const newLoaded = loadedComponents.size + batch.length;
      onProgress?.(newLoaded, sortedComponents.length);

      // Schedule next batch
      if (currentBatch + 1 < totalBatches) {
        setTimeout(() => {
          setCurrentBatch(prev => prev + 1);
        }, delay);
      }
    };

    loadNextBatch();
  }, [currentBatch, totalBatches, batchSize, delay, onProgress, sortedComponents, loadedComponents.size]);

  return (
    <div className="space-y-4">
      {sortedComponents.map((comp) => (
        <div key={comp.id}>
          {loadedComponents.has(comp.id) ? (
            <LazyComponent
              component={comp.component}
              props={comp.props}
              preload={true}
            />
          ) : (
            <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          )}
        </div>
      ))}
    </div>
  );
};

// Bundle analyzer component for development
export const BundleAnalyzer: React.FC = () => {
  const [bundleInfo, setBundleInfo] = useState<any>(null);

  useEffect(() => {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      // Simulate bundle analysis
      const mockBundleInfo = {
        totalSize: '2.4 MB',
        chunks: [
          { name: 'main', size: '800 KB', loaded: true },
          { name: 'charts', size: '600 KB', loaded: false },
          { name: 'dashboard', size: '400 KB', loaded: false },
          { name: 'vendor', size: '600 KB', loaded: true }
        ]
      };
      setBundleInfo(mockBundleInfo);
    }
  }, []);

  if (!bundleInfo || (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'development')) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-sm">
      <h3 className="font-semibold mb-2">Bundle Info</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total: {bundleInfo.totalSize}</p>
      <div className="space-y-1">
        {bundleInfo.chunks.map((chunk: any) => (
          <div key={chunk.name} className="flex justify-between text-xs">
            <span className={chunk.loaded ? 'text-green-600' : 'text-gray-500'}>
              {chunk.name}
            </span>
            <span>{chunk.size}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LazyComponent;
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

export interface ChartLoadState {
  isLoading: boolean;
  isLoaded: boolean;
  error: Error | null;
  component: React.ComponentType<any> | null;
}

export interface LazyChartOptions {
  preload?: boolean;
  priority?: 'low' | 'normal' | 'high';
  threshold?: number;
  rootMargin?: string;
  retryAttempts?: number;
  retryDelay?: number;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export interface ChartComponentConfig {
  type: string;
  loader: () => Promise<{ default: React.ComponentType<any> }>;
  size?: 'small' | 'medium' | 'large';
  complexity?: 'low' | 'medium' | 'high';
}

// Global cache for loaded chart components
const chartComponentCache = new Map<string, React.ComponentType<any>>();
const loadingPromises = new Map<string, Promise<React.ComponentType<any>>>();

import { CHART_REGISTRY as CHART_COMPONENTS } from './chartRegistry';

// Re-export the type for backward compatibility
export type { ChartRegistryEntry as ChartComponentConfig } from './chartRegistry';

// Hook for loading a single chart component
export const useLazyChart = (
  chartType: string,
  options: LazyChartOptions = {}
): ChartLoadState => {
  const {
    preload = false,
    priority = 'normal',
    retryAttempts = 3,
    retryDelay = 1000,
    onLoad,
    onError
  } = options;

  const [state, setState] = useState<ChartLoadState>({
    isLoading: false,
    isLoaded: false,
    error: null,
    component: chartComponentCache.get(chartType) || null
  });

  const retryCountRef = useRef(0);
  const mountedRef = useRef(true);

  // Load chart component with caching and retry logic
  const loadChart = useCallback(async () => {
    if (!chartType || state.isLoaded || state.isLoading) return;

    // Check cache first
    const cachedComponent = chartComponentCache.get(chartType);
    if (cachedComponent) {
      setState({
        isLoading: false,
        isLoaded: true,
        error: null,
        component: cachedComponent
      });
      onLoad?.();
      return;
    }

    // Check if already loading
    const existingPromise = loadingPromises.get(chartType);
    if (existingPromise) {
      try {
        const component = await existingPromise;
        if (mountedRef.current) {
          setState({
            isLoading: false,
            isLoaded: true,
            error: null,
            component
          });
          onLoad?.();
        }
      } catch (error) {
        if (mountedRef.current) {
          setState(prev => ({ ...prev, isLoading: false, error: error as Error }));
          onError?.(error as Error);
        }
      }
      return;
    }

    const chartConfig = CHART_COMPONENTS[chartType];
    if (!chartConfig) {
      const error = new Error(`Unknown chart type: ${chartType}`);
      setState(prev => ({ ...prev, error, isLoading: false }));
      onError?.(error);
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    // Create loading promise
    const loadingPromise = (async () => {
      try {
        const module = await chartConfig.loader();
        const component = module.default;
        
        // Cache the component
        chartComponentCache.set(chartType, component);
        
        return component;
      } catch (error) {
        // Retry logic with exponential backoff
        if (retryCountRef.current < retryAttempts) {
          retryCountRef.current++;
          const delay = retryDelay * Math.pow(2, retryCountRef.current - 1);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Recursive retry
          return loadingPromise;
        }
        
        throw error;
      } finally {
        loadingPromises.delete(chartType);
      }
    })();

    loadingPromises.set(chartType, loadingPromise);

    try {
      const component = await loadingPromise;
      
      if (mountedRef.current) {
        setState({
          isLoading: false,
          isLoaded: true,
          error: null,
          component
        });
        onLoad?.();
        retryCountRef.current = 0;
      }
    } catch (error) {
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error as Error
        }));
        onError?.(error as Error);
      }
    }
  }, [chartType, state.isLoaded, state.isLoading, retryAttempts, retryDelay, onLoad, onError]);

  // Preload effect
  useEffect(() => {
    if (preload) {
      loadChart();
    }
  }, [preload, loadChart]);

  // Cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    ...state,
    // Expose load function for manual triggering
    load: loadChart
  } as ChartLoadState & { load: () => Promise<void> };
};

// Hook for intersection-based lazy loading
export const useLazyChartIntersection = (
  chartType: string,
  options: LazyChartOptions & {
    threshold?: number;
    rootMargin?: string;
  } = {}
): [ChartLoadState & { load: () => Promise<void> }, React.RefCallback<HTMLElement>] => {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    ...lazyOptions
  } = options;

  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const observerRef = useRef<IntersectionObserver>();

  const chartState = useLazyChart(chartType, {
    ...lazyOptions,
    preload: isIntersecting && !hasTriggered
  });

  const refCallback = useCallback((element: HTMLElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (element && !hasTriggered) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsIntersecting(true);
            setHasTriggered(true);
            observerRef.current?.disconnect();
          }
        },
        { threshold, rootMargin }
      );

      observerRef.current.observe(element);
    }
  }, [threshold, rootMargin, hasTriggered]);

  // Cleanup observer
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return [chartState, refCallback];
};

// Hook for managing multiple chart components
export const useLazyChartManager = (
  chartTypes: string[],
  options: LazyChartOptions = {}
) => {
  const [loadedCharts, setLoadedCharts] = useState<Set<string>>(new Set());
  const [failedCharts, setFailedCharts] = useState<Set<string>>(new Set());
  const [loadingCharts, setLoadingCharts] = useState<Set<string>>(new Set());

  const loadChart = useCallback(async (chartType: string) => {
    if (loadedCharts.has(chartType) || loadingCharts.has(chartType)) {
      return;
    }

    setLoadingCharts(prev => new Set([...prev, chartType]));

    try {
      const chartConfig = CHART_COMPONENTS[chartType];
      if (!chartConfig) {
        throw new Error(`Unknown chart type: ${chartType}`);
      }

      // Check cache first
      if (!chartComponentCache.has(chartType)) {
        const module = await chartConfig.loader();
        chartComponentCache.set(chartType, module.default);
      }

      setLoadedCharts(prev => new Set([...prev, chartType]));
      setFailedCharts(prev => {
        const newSet = new Set(prev);
        newSet.delete(chartType);
        return newSet;
      });
    } catch (error) {
      console.error(`Failed to load chart ${chartType}:`, error);
      setFailedCharts(prev => new Set([...prev, chartType]));
    } finally {
      setLoadingCharts(prev => {
        const newSet = new Set(prev);
        newSet.delete(chartType);
        return newSet;
      });
    }
  }, [loadedCharts, loadingCharts]);

  // Preload all charts based on priority
  const preloadCharts = useCallback(async (priorityLevel: 'low' | 'normal' | 'high' = 'normal') => {
    const chartsToLoad = chartTypes.filter(chartType => {
      const config = CHART_COMPONENTS[chartType];
      return config && (priorityLevel === 'low' || config.complexity !== 'high');
    });

    // Load charts in batches based on complexity
    const lowComplexity = chartsToLoad.filter(type => CHART_COMPONENTS[type]?.complexity === 'low');
    const mediumComplexity = chartsToLoad.filter(type => CHART_COMPONENTS[type]?.complexity === 'medium');
    const highComplexity = chartsToLoad.filter(type => CHART_COMPONENTS[type]?.complexity === 'high');

    // Load low complexity first
    await Promise.allSettled(lowComplexity.map(loadChart));
    
    // Then medium complexity
    await Promise.allSettled(mediumComplexity.map(loadChart));
    
    // Finally high complexity if priority allows
    if (priorityLevel === 'high') {
      await Promise.allSettled(highComplexity.map(loadChart));
    }
  }, [chartTypes, loadChart]);

  const getChartComponent = useCallback((chartType: string) => {
    return chartComponentCache.get(chartType) || null;
  }, []);

  const getLoadingState = useCallback((chartType: string) => ({
    isLoaded: loadedCharts.has(chartType),
    isLoading: loadingCharts.has(chartType),
    hasFailed: failedCharts.has(chartType)
  }), [loadedCharts, loadingCharts, failedCharts]);

  return {
    loadedCharts: Array.from(loadedCharts),
    failedCharts: Array.from(failedCharts),
    loadingCharts: Array.from(loadingCharts),
    loadChart,
    preloadCharts,
    getChartComponent,
    getLoadingState,
    loadProgress: loadedCharts.size / chartTypes.length
  };
};

// Hook for priority-based loading
export const usePriorityChartLoader = (
  chartConfigs: Array<{
    type: string;
    priority: number;
    props?: Record<string, any>;
  }>,
  options: LazyChartOptions = {}
) => {
  const [loadQueue, setLoadQueue] = useState<typeof chartConfigs>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Sort by priority on mount
  const sortedConfigs = useMemo(() => 
    [...chartConfigs].sort((a, b) => b.priority - a.priority),
    [chartConfigs]
  );

  const chartManager = useLazyChartManager(
    sortedConfigs.map(config => config.type),
    options
  );

  // Process loading queue
  useEffect(() => {
    const processQueue = async () => {
      if (isProcessing || loadQueue.length === 0) return;

      setIsProcessing(true);

      // Load charts in priority order, but limit concurrent loads
      const batchSize = 2;
      for (let i = 0; i < loadQueue.length; i += batchSize) {
        const batch = loadQueue.slice(i, i + batchSize);
        await Promise.allSettled(
          batch.map(config => chartManager.loadChart(config.type))
        );

        // Small delay between batches to prevent overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setLoadQueue([]);
      setIsProcessing(false);
    };

    processQueue();
  }, [loadQueue, isProcessing, chartManager]);

  const startLoading = useCallback(() => {
    setLoadQueue(sortedConfigs);
  }, [sortedConfigs]);

  const loadSpecificCharts = useCallback((chartTypes: string[]) => {
    const configs = sortedConfigs.filter(config => 
      chartTypes.includes(config.type)
    );
    setLoadQueue(configs);
  }, [sortedConfigs]);

  return {
    ...chartManager,
    startLoading,
    loadSpecificCharts,
    isProcessing,
    queueLength: loadQueue.length
  };
};

// Performance monitoring hook
export const useChartPerformance = () => {
  const [metrics, setMetrics] = useState<{
    loadTimes: Record<string, number>;
    memoryUsage: number;
    bundleSize: Record<string, number>;
  }>({
    loadTimes: {},
    memoryUsage: 0,
    bundleSize: {}
  });

  const recordLoadTime = useCallback((chartType: string, startTime: number) => {
    const endTime = performance.now();
    const loadTime = endTime - startTime;
    
    setMetrics(prev => ({
      ...prev,
      loadTimes: {
        ...prev.loadTimes,
        [chartType]: loadTime
      }
    }));

    console.log(`Chart ${chartType} loaded in ${loadTime.toFixed(2)}ms`);
  }, []);

  const updateMemoryUsage = useCallback(() => {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
      const memory = (window.performance as any).memory;
      setMetrics(prev => ({
        ...prev,
        memoryUsage: memory.usedJSHeapSize / 1024 / 1024 // MB
      }));
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(updateMemoryUsage, 5000);
    return () => clearInterval(interval);
  }, [updateMemoryUsage]);

  return {
    metrics,
    recordLoadTime,
    updateMemoryUsage
  };
};

export default useLazyChart;
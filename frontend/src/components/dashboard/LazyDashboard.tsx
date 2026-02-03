import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  IntersectionLazyLoader, 
  LazyChart, 
  ProgressiveLoader,
  BundleAnalyzer 
} from '../lazy/LazyLoader';
import { 
  useLazyChartManager, 
  usePriorityChartLoader, 
  useChartPerformance 
} from '../../hooks/useLazyChart';
import { 
  Activity, 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Loader2, 
  Settings, 
  RefreshCw 
} from 'lucide-react';

export interface DashboardConfig {
  id: string;
  title: string;
  chartType: string;
  priority: number;
  size: 'small' | 'medium' | 'large';
  data: any;
  config?: Record<string, any>;
  lazy?: boolean;
  intersectionThreshold?: number;
}

export interface LazyDashboardProps {
  configs: DashboardConfig[];
  layout?: 'grid' | 'masonry' | 'list';
  loadingStrategy?: 'progressive' | 'intersection' | 'manual';
  batchSize?: number;
  className?: string;
  onChartLoad?: (chartId: string) => void;
  onError?: (error: Error, chartId: string) => void;
  showPerformanceMetrics?: boolean;
}

const LazyDashboard: React.FC<LazyDashboardProps> = ({
  configs,
  layout = 'grid',
  loadingStrategy = 'intersection',
  batchSize = 3,
  className = '',
  onChartLoad,
  onError,
  showPerformanceMetrics = false
}) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [manualLoadEnabled, setManualLoadEnabled] = useState(loadingStrategy === 'manual');

  // Memoize chart configurations
  const chartConfigs = useMemo(() => 
    configs.map(config => ({
      id: config.id,
      component: () => import(`../visualization/charts/${config.chartType.charAt(0).toUpperCase() + config.chartType.slice(1)}Chart`),
      priority: config.priority,
      props: {
        data: config.data,
        config: config.config,
        id: config.id
      }
    })),
    [configs]
  );

  // Initialize hooks based on loading strategy
  const priorityLoader = usePriorityChartLoader(
    chartConfigs,
    {
      onLoad: () => {
        setLoadingProgress(prev => Math.min(prev + (1 / configs.length), 1));
      },
      onError: (error) => {
        console.error('Chart loading error:', error);
      }
    }
  );

  const chartManager = useLazyChartManager(
    configs.map(c => c.chartType),
    {
      onLoad: () => onChartLoad && configs.forEach(c => onChartLoad(c.id)),
      onError: (error) => onError && configs.forEach(c => onError(error, c.id))
    }
  );

  const performance = useChartPerformance();

  // Initialize dashboard
  useEffect(() => {
    const initialize = async () => {
      setIsInitializing(true);
      
      if (loadingStrategy === 'progressive') {
        priorityLoader.startLoading();
      } else if (loadingStrategy === 'intersection') {
        // Preload high priority charts only
        const highPriorityCharts = configs
          .filter(config => config.priority >= 8)
          .map(config => config.chartType);
        
        await chartManager.preloadCharts('low');
        chartManager.loadSpecificCharts?.(highPriorityCharts);
      }
      
      setIsInitializing(false);
    };

    initialize();
  }, [loadingStrategy, configs, priorityLoader, chartManager]);

  // Manual load all charts
  const handleLoadAll = useCallback(() => {
    if (loadingStrategy === 'progressive') {
      priorityLoader.startLoading();
    } else {
      chartManager.preloadCharts('high');
    }
    setManualLoadEnabled(false);
  }, [loadingStrategy, priorityLoader, chartManager]);

  // Retry failed charts
  const handleRetryFailed = useCallback(() => {
    const failedCharts = chartManager.failedCharts || priorityLoader.failedCharts || [];
    failedCharts.forEach(chartType => {
      chartManager.loadChart(chartType);
    });
  }, [chartManager, priorityLoader]);

  // Get layout classes
  const getLayoutClasses = () => {
    switch (layout) {
      case 'masonry':
        return 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4';
      case 'list':
        return 'space-y-4';
      case 'grid':
      default:
        return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';
    }
  };

  // Get chart size classes
  const getChartSizeClasses = (size: string) => {
    switch (size) {
      case 'small':
        return 'h-64 sm:col-span-1';
      case 'large':
        return 'h-96 sm:col-span-2 lg:col-span-2';
      case 'medium':
      default:
        return 'h-80 sm:col-span-1 lg:col-span-1';
    }
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Initializing dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`lazy-dashboard ${className}`}>
      {/* Dashboard Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Analytics Dashboard
          </h1>
          
          <div className="flex items-center gap-2">
            {/* Loading Progress */}
            {(loadingProgress > 0 && loadingProgress < 1) && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300 ease-out"
                    style={{ width: `${loadingProgress * 100}%` }}
                  />
                </div>
                <span>{Math.round(loadingProgress * 100)}%</span>
              </div>
            )}

            {/* Manual Load Button */}
            {manualLoadEnabled && (
              <button
                onClick={handleLoadAll}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                <Activity size={16} />
                Load All Charts
              </button>
            )}

            {/* Retry Failed Button */}
            {(chartManager.failedCharts?.length > 0 || priorityLoader?.failedCharts?.length > 0) && (
              <button
                onClick={handleRetryFailed}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                <RefreshCw size={16} />
                Retry Failed
              </button>
            )}

            {/* Settings (if needed) */}
            <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <Settings size={16} />
            </button>
          </div>
        </div>

        {/* Performance Metrics */}
        {showPerformanceMetrics && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-semibold mb-2">Performance Metrics</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <div className="text-gray-500 dark:text-gray-400">Memory Usage</div>
                <div className="font-medium">{performance.metrics.memoryUsage.toFixed(1)} MB</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Loaded Charts</div>
                <div className="font-medium">
                  {chartManager.loadedCharts?.length || 0} / {configs.length}
                </div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Failed Charts</div>
                <div className="font-medium text-red-600">
                  {chartManager.failedCharts?.length || priorityLoader?.failedCharts?.length || 0}
                </div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Avg Load Time</div>
                <div className="font-medium">
                  {Object.keys(performance.metrics.loadTimes).length > 0 
                    ? (Object.values(performance.metrics.loadTimes).reduce((a, b) => a + b, 0) / 
                       Object.keys(performance.metrics.loadTimes).length).toFixed(0)
                    : '0'
                  }ms
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dashboard Content */}
      {loadingStrategy === 'progressive' ? (
        <ProgressiveLoader
          components={chartConfigs}
          batchSize={batchSize}
          delay={200}
          onProgress={(loaded, total) => {
            setLoadingProgress(loaded / total);
          }}
        />
      ) : (
        <div className={getLayoutClasses()}>
          {configs.map((config) => {
            const ChartComponent = loadingStrategy === 'intersection' 
              ? IntersectionLazyLoader 
              : LazyChart;

            return (
              <div
                key={config.id}
                className={`
                  bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 
                  shadow-sm hover:shadow-md transition-shadow overflow-hidden
                  ${getChartSizeClasses(config.size)}
                  ${layout === 'masonry' ? 'break-inside-avoid mb-4' : ''}
                `}
              >
                {/* Chart Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {config.title}
                    </h3>
                    
                    <div className="flex items-center gap-2">
                      {/* Priority Badge */}
                      {config.priority >= 8 && (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full">
                          High
                        </span>
                      )}
                      
                      {/* Chart Type Icon */}
                      {config.chartType === 'bar' && <BarChart3 size={16} className="text-gray-500" />}
                      {config.chartType === 'pie' && <PieChart size={16} className="text-gray-500" />}
                      {config.chartType === 'line' && <TrendingUp size={16} className="text-gray-500" />}
                      {!['bar', 'pie', 'line'].includes(config.chartType) && (
                        <Activity size={16} className="text-gray-500" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Chart Content */}
                <div className="flex-1 p-4">
                  {loadingStrategy === 'intersection' ? (
                    <IntersectionLazyLoader
                      component={() => import(`../visualization/charts/${config.chartType.charAt(0).toUpperCase() + config.chartType.slice(1)}Chart`)}
                      props={{
                        data: config.data,
                        config: config.config,
                        id: config.id
                      }}
                      threshold={config.intersectionThreshold || 0.1}
                      rootMargin="100px"
                      className="h-full"
                      onLoad={() => {
                        onChartLoad?.(config.id);
                        const startTime = performance.now();
                        performance.recordLoadTime(config.chartType, startTime);
                      }}
                      onError={(error) => onError?.(error, config.id)}
                    />
                  ) : (
                    <LazyChart
                      chartType={config.chartType as any}
                      data={config.data}
                      config={config.config}
                      className="h-full"
                      preload={!manualLoadEnabled}
                      onLoad={() => {
                        onChartLoad?.(config.id);
                        const startTime = performance.now();
                        performance.recordLoadTime(config.chartType, startTime);
                      }}
                      onError={(error) => onError?.(error, config.id)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Development Bundle Analyzer */}
      {typeof process !== 'undefined' && process.env?.NODE_ENV === 'development' && <BundleAnalyzer />}
    </div>
  );
};

// Example usage component
export const DashboardExample: React.FC = () => {
  const [dashboardConfigs, setDashboardConfigs] = useState<DashboardConfig[]>([
    {
      id: 'revenue-chart',
      title: 'Revenue Overview',
      chartType: 'line',
      priority: 10,
      size: 'large',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Revenue',
          data: [12000, 15000, 13000, 17000, 16000, 19000],
          borderColor: '#3B82F6',
          backgroundColor: '#3B82F6'
        }]
      }
    },
    {
      id: 'user-distribution',
      title: 'User Distribution',
      chartType: 'pie',
      priority: 8,
      size: 'medium',
      data: {
        labels: ['Desktop', 'Mobile', 'Tablet'],
        datasets: [{
          data: [65, 30, 5],
          backgroundColor: ['#EF4444', '#10B981', '#F59E0B']
        }]
      }
    },
    {
      id: 'performance-metrics',
      title: 'Performance Metrics',
      chartType: 'bar',
      priority: 6,
      size: 'medium',
      data: {
        labels: ['Load Time', 'Response Time', 'Error Rate', 'Uptime'],
        datasets: [{
          label: 'Metrics',
          data: [2.3, 1.8, 0.5, 99.9],
          backgroundColor: ['#8B5CF6', '#06B6D4', '#EC4899', '#10B981']
        }]
      }
    },
    {
      id: 'sales-funnel',
      title: 'Sales Funnel',
      chartType: 'area',
      priority: 4,
      size: 'small',
      data: {
        labels: ['Visitors', 'Leads', 'Opportunities', 'Customers'],
        datasets: [{
          label: 'Count',
          data: [10000, 3000, 800, 200],
          backgroundColor: '#3B82F6'
        }]
      }
    }
  ]);

  const handleChartLoad = useCallback((chartId: string) => {
    // Chart loaded successfully
  }, []);

  const handleChartError = useCallback((error: Error, chartId: string) => {
    console.error(`Chart error in ${chartId}:`, error);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <LazyDashboard
        configs={dashboardConfigs}
        layout="grid"
        loadingStrategy="intersection"
        batchSize={2}
        showPerformanceMetrics={true}
        onChartLoad={handleChartLoad}
        onError={handleChartError}
        className="max-w-7xl mx-auto"
      />
    </div>
  );
};

export default LazyDashboard;
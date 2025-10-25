# Lazy Loading System for Charts and Heavy Components

A comprehensive lazy loading system designed specifically for DataSnap's chart components and other heavy UI elements. This system optimizes performance by loading components on demand, reducing initial bundle size and improving responsiveness.

## Features

- **Intersection Observer-based Loading**: Load components when they enter the viewport
- **Progressive Loading**: Load components in batches based on priority
- **Manual Loading**: Load components on user interaction
- **Caching**: Global component cache to prevent duplicate loads
- **Retry Logic**: Automatic retry with exponential backoff for failed loads
- **Performance Monitoring**: Track load times and memory usage
- **Error Boundaries**: Graceful error handling with retry options
- **TypeScript Support**: Full type safety and IntelliSense support

## Components

### LazyComponent

Basic lazy component loader with caching and retry logic.

```tsx
import { LazyComponent } from '../lazy/LazyLoader';

<LazyComponent
  component={() => import('../charts/LineChart')}
  props={{ data, config }}
  preload={false}
  retryAttempts={3}
  onLoad={() => console.log('Chart loaded')}
  onError={(error) => console.error('Load failed', error)}
/>
```

### IntersectionLazyLoader

Loads components when they enter the viewport using Intersection Observer.

```tsx
import { IntersectionLazyLoader } from '../lazy/LazyLoader';

<IntersectionLazyLoader
  component={() => import('../charts/BarChart')}
  props={{ data, config }}
  threshold={0.1}
  rootMargin="50px"
  triggerOnce={true}
  placeholder={<div>Loading chart...</div>}
/>
```

### LazyChart

Chart-specific lazy loader with optimizations for visualization components.

```tsx
import { LazyChart } from '../lazy/LazyLoader';

<LazyChart
  chartType="line"
  data={chartData}
  config={chartConfig}
  preload={false}
  onLoad={() => console.log('Chart ready')}
  onError={(error) => console.error('Chart failed', error)}
/>
```

### ProgressiveLoader

Loads multiple components progressively based on priority.

```tsx
import { ProgressiveLoader } from '../lazy/LazyLoader';

const components = [
  {
    id: 'high-priority-chart',
    component: () => import('../charts/LineChart'),
    priority: 10,
    props: { data: lineData }
  },
  {
    id: 'medium-priority-chart',
    component: () => import('../charts/BarChart'),
    priority: 5,
    props: { data: barData }
  }
];

<ProgressiveLoader
  components={components}
  batchSize={2}
  delay={100}
  onProgress={(loaded, total) => console.log(`${loaded}/${total} loaded`)}
/>
```

## Hooks

### useLazyChart

Hook for loading individual chart components with caching.

```tsx
import { useLazyChart } from '../../hooks/useLazyChart';

const MyComponent = () => {
  const { isLoading, isLoaded, component, error, load } = useLazyChart('line', {
    preload: false,
    retryAttempts: 3,
    onLoad: () => console.log('Loaded!'),
    onError: (error) => console.error('Failed!', error)
  });

  if (error) return <div>Error: {error.message}</div>;
  if (isLoading) return <div>Loading...</div>;
  if (!component) return <button onClick={load}>Load Chart</button>;

  const ChartComponent = component;
  return <ChartComponent data={data} />;
};
```

### useLazyChartIntersection

Hook combining lazy loading with intersection observer.

```tsx
import { useLazyChartIntersection } from '../../hooks/useLazyChart';

const MyComponent = () => {
  const [chartState, ref] = useLazyChartIntersection('pie', {
    threshold: 0.2,
    rootMargin: '100px',
    onLoad: () => console.log('Chart loaded!')
  });

  return (
    <div ref={ref}>
      {chartState.isLoaded && chartState.component && (
        <chartState.component data={pieData} />
      )}
    </div>
  );
};
```

### useLazyChartManager

Hook for managing multiple chart components.

```tsx
import { useLazyChartManager } from '../../hooks/useLazyChart';

const Dashboard = () => {
  const {
    loadedCharts,
    failedCharts,
    loadChart,
    preloadCharts,
    getChartComponent,
    loadProgress
  } = useLazyChartManager(['line', 'bar', 'pie']);

  useEffect(() => {
    // Preload low complexity charts
    preloadCharts('low');
  }, [preloadCharts]);

  return (
    <div>
      <div>Progress: {(loadProgress * 100).toFixed(0)}%</div>
      {['line', 'bar', 'pie'].map(type => {
        const Component = getChartComponent(type);
        return Component ? (
          <Component key={type} data={chartData[type]} />
        ) : (
          <button onClick={() => loadChart(type)}>
            Load {type} chart
          </button>
        );
      })}
    </div>
  );
};
```

## Dashboard Integration

### LazyDashboard

Complete dashboard solution with lazy loading support.

```tsx
import LazyDashboard, { DashboardConfig } from '../dashboard/LazyDashboard';

const configs: DashboardConfig[] = [
  {
    id: 'revenue',
    title: 'Revenue Overview',
    chartType: 'line',
    priority: 10, // High priority
    size: 'large',
    data: revenueData,
    intersectionThreshold: 0.1
  },
  {
    id: 'users',
    title: 'User Distribution',
    chartType: 'pie',
    priority: 5, // Medium priority
    size: 'medium',
    data: userData
  }
];

<LazyDashboard
  configs={configs}
  layout="grid"
  loadingStrategy="intersection"
  batchSize={2}
  showPerformanceMetrics={true}
  onChartLoad={(id) => console.log(`Chart ${id} loaded`)}
  onError={(error, id) => console.error(`Chart ${id} failed`, error)}
/>
```

## Loading Strategies

### 1. Intersection-based (Recommended)

Components load when they become visible in the viewport.

- **Pros**: Great UX, loads only what's needed
- **Cons**: Some delay when scrolling
- **Best for**: Dashboards, long pages with many components

```tsx
<LazyDashboard loadingStrategy="intersection" />
```

### 2. Progressive Loading

Components load in batches based on priority.

- **Pros**: Predictable loading, respects priority
- **Cons**: May load components not immediately needed
- **Best for**: Critical components, known user flows

```tsx
<LazyDashboard loadingStrategy="progressive" batchSize={3} />
```

### 3. Manual Loading

Components load only when explicitly triggered.

- **Pros**: Full control, minimal resource usage
- **Cons**: Requires user interaction
- **Best for**: Optional features, admin panels

```tsx
<LazyDashboard loadingStrategy="manual" />
```

## Performance Optimization

### Chart Component Registry

All chart components are registered with metadata for optimal loading:

```tsx
const CHART_COMPONENTS = {
  line: {
    loader: () => import('../charts/LineChart'),
    size: 'medium',
    complexity: 'medium'
  },
  violin: {
    loader: () => import('../charts/ViolinPlot'),
    size: 'large',
    complexity: 'high'
  }
};
```

### Loading Priority

Components are categorized by complexity:

- **Low**: Simple charts (pie, bar, histogram)
- **Medium**: Standard charts (line, scatter, area)
- **High**: Complex charts (violin, treemap, heatmap)

### Memory Management

The system includes automatic memory monitoring:

```tsx
import { useChartPerformance } from '../../hooks/useLazyChart';

const { metrics, recordLoadTime } = useChartPerformance();
console.log(`Memory usage: ${metrics.memoryUsage} MB`);
console.log(`Average load time: ${metrics.avgLoadTime} ms`);
```

## Error Handling

### Automatic Retry

Failed loads are automatically retried with exponential backoff:

```tsx
<LazyComponent
  component={() => import('../charts/ComplexChart')}
  retryAttempts={3} // Will retry 3 times
  retryDelay={1000} // Starting with 1s delay
/>
```

### Error Boundaries

All lazy components are wrapped in error boundaries:

```tsx
// Custom error fallback
const errorFallback = (error: Error, retry: () => void) => (
  <div>
    <h3>Failed to load chart</h3>
    <p>{error.message}</p>
    <button onClick={retry}>Retry</button>
  </div>
);

<LazyComponent
  component={() => import('../charts/Chart')}
  errorFallback={errorFallback}
/>
```

## Development Tools

### Bundle Analyzer

In development mode, a bundle analyzer shows chunk information:

```tsx
import { BundleAnalyzer } from '../lazy/LazyLoader';

// Only shows in development
<BundleAnalyzer />
```

### Performance Metrics

Enable performance monitoring in development:

```tsx
<LazyDashboard showPerformanceMetrics={true} />
```

## Best Practices

### 1. Use Appropriate Loading Strategy

- **Intersection**: For content that may not be immediately visible
- **Progressive**: For critical components that should load early
- **Manual**: For optional or rarely used components

### 2. Set Proper Priorities

```tsx
// High priority (8-10): Critical, above-the-fold charts
// Medium priority (4-7): Important but not critical
// Low priority (1-3): Optional or below-the-fold
```

### 3. Configure Intersection Thresholds

```tsx
// Load early for better UX
<IntersectionLazyLoader rootMargin="100px" threshold={0.1} />
```

### 4. Handle Loading States

Always provide meaningful loading and error states:

```tsx
<LazyChart
  chartType="line"
  fallback={<ChartSkeleton />}
  errorFallback={(error, retry) => <ChartError error={error} onRetry={retry} />}
/>
```

### 5. Preload Critical Components

```tsx
useEffect(() => {
  chartManager.preloadCharts('high'); // Preload high priority charts
}, []);
```

## Migration Guide

### From Regular Components

```tsx
// Before
import LineChart from '../charts/LineChart';
<LineChart data={data} />

// After
import { LazyChart } from '../lazy/LazyLoader';
<LazyChart chartType="line" data={data} preload={true} />
```

### From Dynamic Imports

```tsx
// Before
const LineChart = lazy(() => import('../charts/LineChart'));
<Suspense fallback={<div>Loading...</div>}>
  <LineChart data={data} />
</Suspense>

// After
<LazyComponent
  component={() => import('../charts/LineChart')}
  props={{ data }}
  fallback={<ChartSkeleton />}
/>
```

## TypeScript Support

All components and hooks are fully typed:

```tsx
interface ChartProps {
  data: ChartData;
  config?: ChartConfig;
}

const chart = useLazyChart<ChartProps>('line', {
  preload: true,
  onLoad: () => console.log('Loaded!')
});
```

This lazy loading system provides a robust, performant solution for managing heavy chart components in DataSnap's frontend application. It reduces initial load times, improves user experience, and provides comprehensive monitoring and error handling capabilities.
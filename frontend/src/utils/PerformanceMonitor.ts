/**
 * Performance monitoring utility for DataSnap
 * Tracks performance metrics and provides reporting capabilities
 */

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface PerformanceStats {
  count: number;
  min: number;
  max: number;
  avg: number;
  median: number;
  p95: number;
  p99: number;
  stdDev: number;
}

export interface MemoryUsage {
  used: number;
  total: number;
  limit: number;
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private memoryBaseline: number = 0;
  private thresholds: Map<string, number> = new Map();
  private onThresholdExceeded?: (metric: string, duration: number, threshold: number) => void;

  constructor() {
    this.setDefaultThresholds();
  }

  /**
   * Set default performance thresholds
   */
  private setDefaultThresholds(): void {
    this.thresholds.set('data-load-small', 100); // < 100ms for small datasets
    this.thresholds.set('data-load-medium', 500); // < 500ms for medium datasets
    this.thresholds.set('data-load-large', 2000); // < 2s for large datasets
    this.thresholds.set('chart-render', 300); // < 300ms for chart rendering
    this.thresholds.set('export-operation', 5000); // < 5s for export operations
    this.thresholds.set('user-interaction', 200); // < 200ms for user interactions
  }

  /**
   * Start measuring performance for a named operation
   */
  startMeasurement(name: string): void {
    performance.mark(`${name}-start`);
  }

  /**
   * End measurement and record the result
   */
  endMeasurement(name: string, metadata?: Record<string, any>): number {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const measure = performance.getEntriesByName(name, 'measure')[0];
    const duration = measure?.duration || 0;
    
    this.recordMetric(name, duration, metadata);
    
    // Check against threshold
    const threshold = this.thresholds.get(name);
    if (threshold && duration > threshold) {
      this.handleThresholdExceeded(name, duration, threshold);
    }
    
    return duration;
  }

  /**
   * Record a performance metric manually
   */
  recordMetric(name: string, duration: number, metadata?: Record<string, any>): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    this.metrics.get(name)!.push({
      name,
      duration,
      timestamp: Date.now(),
      metadata
    });
    
    // Check against threshold
    const threshold = this.thresholds.get(name);
    if (threshold && duration > threshold) {
      this.handleThresholdExceeded(name, duration, threshold);
    }
  }

  /**
   * Get performance statistics for a metric
   */
  getStats(name: string): PerformanceStats | null {
    const metrics = this.metrics.get(name);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const count = durations.length;
    const min = durations[0];
    const max = durations[count - 1];
    const avg = durations.reduce((sum, val) => sum + val, 0) / count;
    const median = durations[Math.floor(count / 2)];
    const p95 = durations[Math.floor(count * 0.95)];
    const p99 = durations[Math.floor(count * 0.99)];
    
    // Calculate standard deviation
    const variance = durations.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / count;
    const stdDev = Math.sqrt(variance);

    return {
      count,
      min,
      max,
      avg,
      median,
      p95,
      p99,
      stdDev
    };
  }

  /**
   * Get all recorded metrics
   */
  getAllMetrics(): Map<string, PerformanceMetric[]> {
    return new Map(this.metrics);
  }

  /**
   * Get recent metrics (last N measurements)
   */
  getRecentMetrics(name: string, limit: number = 10): PerformanceMetric[] {
    const metrics = this.metrics.get(name) || [];
    return metrics.slice(-limit);
  }

  /**
   * Measure memory usage
   */
  measureMemory(): MemoryUsage {
    if (typeof performance !== 'undefined' && performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }
    return { used: 0, total: 0, limit: 0 };
  }

  /**
   * Set memory baseline for tracking increases
   */
  setMemoryBaseline(): void {
    this.memoryBaseline = this.measureMemory().used;
  }

  /**
   * Get memory increase since baseline
   */
  getMemoryIncrease(): number {
    return this.measureMemory().used - this.memoryBaseline;
  }

  /**
   * Check if memory usage is concerning
   */
  isMemoryUsageConcerning(): boolean {
    const memory = this.measureMemory();
    const usagePercentage = memory.used / memory.limit;
    return usagePercentage > 0.8; // More than 80% of heap limit
  }

  /**
   * Set custom threshold for a metric
   */
  setThreshold(name: string, threshold: number): void {
    this.thresholds.set(name, threshold);
  }

  /**
   * Set callback for threshold exceeded events
   */
  setOnThresholdExceeded(callback: (metric: string, duration: number, threshold: number) => void): void {
    this.onThresholdExceeded = callback;
  }

  /**
   * Handle threshold exceeded
   */
  private handleThresholdExceeded(name: string, duration: number, threshold: number): void {
    console.warn(`Performance threshold exceeded for ${name}: ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`);
    
    if (this.onThresholdExceeded) {
      this.onThresholdExceeded(name, duration, threshold);
    }
  }

  /**
   * Generate performance report
   */
  generateReport(): {
    summary: Record<string, PerformanceStats>;
    alerts: { metric: string; issue: string; value: number }[];
    memory: MemoryUsage;
    recommendations: string[];
  } {
    const summary: Record<string, PerformanceStats> = {};
    const alerts: { metric: string; issue: string; value: number }[] = [];
    const recommendations: string[] = [];

    // Generate stats for all metrics
    for (const [name] of this.metrics) {
      const stats = this.getStats(name);
      if (stats) {
        summary[name] = stats;

        // Check for performance issues
        const threshold = this.thresholds.get(name);
        if (threshold && stats.p95 > threshold) {
          alerts.push({
            metric: name,
            issue: `95th percentile exceeds threshold`,
            value: stats.p95
          });
        }

        if (stats.stdDev > stats.avg * 0.5) {
          alerts.push({
            metric: name,
            issue: `High variability in performance`,
            value: stats.stdDev
          });
        }
      }
    }

    // Memory analysis
    const memory = this.measureMemory();
    if (this.isMemoryUsageConcerning()) {
      alerts.push({
        metric: 'memory',
        issue: 'Memory usage is high',
        value: (memory.used / memory.limit) * 100
      });
      recommendations.push('Consider implementing data pagination or virtualization');
    }

    // Generate recommendations
    if (alerts.some(a => a.metric.includes('data-load'))) {
      recommendations.push('Consider implementing progressive data loading');
      recommendations.push('Add data caching to reduce load times');
    }

    if (alerts.some(a => a.metric.includes('chart-render'))) {
      recommendations.push('Consider reducing chart complexity or using canvas rendering');
      recommendations.push('Implement chart virtualization for large datasets');
    }

    if (alerts.some(a => a.metric.includes('export'))) {
      recommendations.push('Consider implementing background export processing');
      recommendations.push('Add progress indicators for long-running operations');
    }
    
    // Add general recommendations if there are metrics but no specific alerts
    if (this.metrics.size > 0 && recommendations.length === 0) {
      recommendations.push('Monitor performance metrics regularly to identify trends');
      recommendations.push('Consider setting custom thresholds based on user experience requirements');
    }

    return {
      summary,
      alerts,
      memory,
      recommendations
    };
  }

  /**
   * Clear all recorded metrics
   */
  clear(): void {
    this.metrics.clear();
    performance.clearMarks();
    performance.clearMeasures();
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    const data = {
      timestamp: Date.now(),
      metrics: Object.fromEntries(this.metrics),
      thresholds: Object.fromEntries(this.thresholds),
      memory: this.measureMemory()
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import metrics from JSON
   */
  importMetrics(json: string): void {
    try {
      const data = JSON.parse(json);
      this.metrics = new Map(Object.entries(data.metrics));
      this.thresholds = new Map(Object.entries(data.thresholds));
    } catch (error) {
      console.error('Failed to import metrics:', error);
    }
  }
}

// Global instance for easy access
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export function usePerformanceMonitor() {
  return {
    startMeasurement: (name: string) => performanceMonitor.startMeasurement(name),
    endMeasurement: (name: string, metadata?: Record<string, any>) => 
      performanceMonitor.endMeasurement(name, metadata),
    getStats: (name: string) => performanceMonitor.getStats(name),
    measureMemory: () => performanceMonitor.measureMemory(),
    generateReport: () => performanceMonitor.generateReport()
  };
}

// Performance measurement decorator for functions
export function measurePerformance(name: string) {
  return function <T extends (...args: any[]) => any>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value;
    if (!originalMethod) return descriptor;

    descriptor.value = function (...args: any[]) {
      performanceMonitor.startMeasurement(`${name}-${propertyKey}`);
      try {
        const result = originalMethod.apply(this, args);
        
        // Handle async functions
        if (result instanceof Promise) {
          return result.finally(() => {
            performanceMonitor.endMeasurement(`${name}-${propertyKey}`);
          });
        }
        
        performanceMonitor.endMeasurement(`${name}-${propertyKey}`);
        return result;
      } catch (error) {
        performanceMonitor.endMeasurement(`${name}-${propertyKey}`);
        throw error;
      }
    } as any;

    return descriptor;
  };
}

// Utility for measuring React component render time
export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  name: string
): React.ComponentType<P> {
  return function PerformanceMonitoredComponent(props: P) {
    React.useEffect(() => {
      performanceMonitor.startMeasurement(`${name}-render`);
      return () => {
        performanceMonitor.endMeasurement(`${name}-render`);
      };
    }, []);

    return React.createElement(WrappedComponent, props);
  };
}
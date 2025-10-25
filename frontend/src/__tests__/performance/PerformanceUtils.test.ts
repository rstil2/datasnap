import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceMonitor } from '../../utils/PerformanceMonitor';

// Generate test datasets of various sizes
const generateDataset = (size: number) => {
  return Array.from({ length: size }, (_, i) => ({
    id: i,
    value: Math.random() * 1000,
    category: `Category ${i % 10}`,
    date: new Date(2023, i % 12, (i % 28) + 1).toISOString()
  }));
};

// Mock data processing function
const processData = (data: any[]) => {
  return data.map(item => ({
    ...item,
    processed: true,
    timestamp: Date.now()
  }));
};

// Mock data aggregation function
const aggregateData = (data: any[]) => {
  const grouped = data.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  return Object.entries(grouped).map(([category, items]) => ({
    category,
    count: items.length,
    totalValue: items.reduce((sum, item) => sum + item.value, 0),
    avgValue: items.reduce((sum, item) => sum + item.value, 0) / items.length
  }));
};

describe('Performance Monitoring and Benchmarks', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
  });

  afterEach(() => {
    monitor.clear();
  });

  describe('Performance Monitor Functionality', () => {
    it('should measure operation duration', () => {
      monitor.startMeasurement('test-operation');
      
      // Simulate some work
      const data = generateDataset(1000);
      processData(data);
      
      const duration = monitor.endMeasurement('test-operation');
      
      expect(duration).toBeGreaterThan(0);
      expect(typeof duration).toBe('number');
    });

    it('should track multiple measurements', () => {
      // Perform same operation multiple times
      for (let i = 0; i < 5; i++) {
        monitor.startMeasurement('repeated-operation');
        processData(generateDataset(100));
        monitor.endMeasurement('repeated-operation');
      }

      const stats = monitor.getStats('repeated-operation');
      
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(5);
      expect(stats!.avg).toBeGreaterThan(0);
      expect(stats!.min).toBeLessThanOrEqual(stats!.avg);
      expect(stats!.max).toBeGreaterThanOrEqual(stats!.avg);
    });

    it('should calculate performance statistics correctly', () => {
      // Add measurements with known values
      monitor.recordMetric('test-metric', 100);
      monitor.recordMetric('test-metric', 200);
      monitor.recordMetric('test-metric', 300);
      monitor.recordMetric('test-metric', 400);
      monitor.recordMetric('test-metric', 500);

      const stats = monitor.getStats('test-metric');
      
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(5);
      expect(stats!.min).toBe(100);
      expect(stats!.max).toBe(500);
      expect(stats!.avg).toBe(300);
      expect(stats!.median).toBe(300);
    });

    it('should track memory usage', () => {
      monitor.setMemoryBaseline();
      
      // Create large data structure
      const largeData = generateDataset(10000);
      const processedData = processData(largeData);
      
      const memoryIncrease = monitor.getMemoryIncrease();
      const memoryUsage = monitor.measureMemory();
      
      expect(memoryUsage.used).toBeGreaterThanOrEqual(0);
      expect(memoryUsage.total).toBeGreaterThanOrEqual(memoryUsage.used);
      
      console.log(`Memory usage: ${(memoryUsage.used / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Data Processing Performance', () => {
    it('should process small datasets quickly (< 50ms)', () => {
      const smallData = generateDataset(100);
      
      monitor.startMeasurement('small-data-processing');
      processData(smallData);
      const duration = monitor.endMeasurement('small-data-processing');
      
      expect(duration).toBeLessThan(50);
      console.log(`Small dataset (100 items) processed in ${duration.toFixed(2)}ms`);
    });

    it('should process medium datasets reasonably (< 200ms)', () => {
      const mediumData = generateDataset(1000);
      
      monitor.startMeasurement('medium-data-processing');
      processData(mediumData);
      const duration = monitor.endMeasurement('medium-data-processing');
      
      expect(duration).toBeLessThan(200);
      console.log(`Medium dataset (1,000 items) processed in ${duration.toFixed(2)}ms`);
    });

    it('should process large datasets with acceptable performance (< 1000ms)', () => {
      const largeData = generateDataset(10000);
      
      monitor.startMeasurement('large-data-processing');
      processData(largeData);
      const duration = monitor.endMeasurement('large-data-processing');
      
      expect(duration).toBeLessThan(1000);
      console.log(`Large dataset (10,000 items) processed in ${duration.toFixed(2)}ms`);
    });

    it('should aggregate data efficiently', () => {
      const data = generateDataset(5000);
      
      monitor.startMeasurement('data-aggregation');
      const aggregated = aggregateData(data);
      const duration = monitor.endMeasurement('data-aggregation');
      
      expect(aggregated).toHaveLength(10); // 10 categories
      expect(duration).toBeLessThan(100);
      console.log(`Data aggregation (5,000 items) completed in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Performance Scaling', () => {
    it('should demonstrate linear scaling for data processing', () => {
      const sizes = [100, 500, 1000, 2000];
      const results = [];
      
      for (const size of sizes) {
        const data = generateDataset(size);
        
        monitor.startMeasurement(`scaling-${size}`);
        processData(data);
        const duration = monitor.endMeasurement(`scaling-${size}`);
        
        results.push({ size, duration });
      }
      
      // Check that performance scales reasonably
      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1];
        const curr = results[i];
        const scaleFactor = curr.size / prev.size;
        const durationRatio = curr.duration / prev.duration;
        
        // Duration should not scale worse than quadratically
        expect(durationRatio).toBeLessThan(scaleFactor * scaleFactor);
        
        console.log(`Size: ${curr.size}, Duration: ${curr.duration.toFixed(2)}ms, Scale factor: ${scaleFactor}x, Duration ratio: ${durationRatio.toFixed(2)}x`);
      }
    });
  });

  describe('Memory Usage Analysis', () => {
    it('should not have significant memory leaks', () => {
      monitor.setMemoryBaseline();
      
      // Perform operations that might cause memory leaks
      for (let i = 0; i < 10; i++) {
        const data = generateDataset(1000);
        processData(data);
        aggregateData(data);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const memoryIncrease = monitor.getMemoryIncrease();
      
      // Memory increase should be reasonable (< 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      console.log(`Memory increase after 10 processing cycles: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Performance Reporting', () => {
    it('should generate comprehensive performance report', () => {
      // Generate various metrics
      monitor.recordMetric('fast-operation', 10);
      monitor.recordMetric('fast-operation', 15);
      monitor.recordMetric('fast-operation', 12);
      
      monitor.recordMetric('slow-operation', 200);
      monitor.recordMetric('slow-operation', 250);
      monitor.recordMetric('slow-operation', 300);
      
      // Set threshold for fast operation
      monitor.setThreshold('fast-operation', 20);
      monitor.setThreshold('slow-operation', 100);
      
      const report = monitor.generateReport();
      
      expect(report.summary).toHaveProperty('fast-operation');
      expect(report.summary).toHaveProperty('slow-operation');
      expect(report.alerts.length).toBeGreaterThan(0);
      expect(report.recommendations.length).toBeGreaterThan(0);
      
      console.log('Performance Report:');
      console.log(JSON.stringify(report, null, 2));
    });

    it('should export and import metrics', () => {
      // Add some metrics
      monitor.recordMetric('test-export', 100);
      monitor.recordMetric('test-export', 150);
      
      // Export metrics
      const exported = monitor.exportMetrics();
      expect(typeof exported).toBe('string');
      
      // Create new monitor and import
      const newMonitor = new PerformanceMonitor();
      newMonitor.importMetrics(exported);
      
      const stats = newMonitor.getStats('test-export');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(2);
      expect(stats!.avg).toBe(125);
    });
  });

  describe('Threshold Monitoring', () => {
    it('should detect when thresholds are exceeded', () => {
      const warnings: Array<{ metric: string; duration: number; threshold: number }> = [];
      
      monitor.setOnThresholdExceeded((metric, duration, threshold) => {
        warnings.push({ metric, duration, threshold });
      });
      
      // Set a low threshold
      monitor.setThreshold('test-threshold', 50);
      
      // Record measurements that exceed threshold
      monitor.recordMetric('test-threshold', 100);
      monitor.recordMetric('test-threshold', 25);
      monitor.recordMetric('test-threshold', 75);
      
      expect(warnings.length).toBe(2);
      expect(warnings[0].duration).toBe(100);
      expect(warnings[1].duration).toBe(75);
    });
  });
});
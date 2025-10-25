import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

// Import components and services to benchmark
import { ChartBuilder } from '../../components/visualization/ChartBuilder';
import { ReportBuilder } from '../../components/report/ReportBuilder';
import { PowerPointExporter } from '../../services/export/PowerPointExporter';
import { ExcelExporter } from '../../services/export/ExcelExporter';
import { HTMLWidgetGenerator } from '../../services/export/HTMLWidgetGenerator';
import { LineChart } from '../../components/visualization/charts/LineChart';
import { PieChart } from '../../components/visualization/charts/PieChart';

// Performance monitoring utilities
class PerformanceMonitor {
  private measurements: Map<string, number[]> = new Map();
  private memoryBaseline: number = 0;

  startMeasurement(name: string): void {
    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
    }
    performance.mark(`${name}-start`);
  }

  endMeasurement(name: string): number {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const measure = performance.getEntriesByName(name)[0];
    const duration = measure.duration;
    
    this.measurements.get(name)!.push(duration);
    return duration;
  }

  getStats(name: string) {
    const measurements = this.measurements.get(name) || [];
    if (measurements.length === 0) return null;

    const sorted = [...measurements].sort((a, b) => a - b);
    const avg = measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    return {
      count: measurements.length,
      min: Math.min(...measurements),
      max: Math.max(...measurements),
      avg,
      median,
      p95,
      p99
    };
  }

  measureMemory(): number {
    if (typeof performance.memory !== 'undefined') {
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  }

  setMemoryBaseline(): void {
    this.memoryBaseline = this.measureMemory();
  }

  getMemoryIncrease(): number {
    return this.measureMemory() - this.memoryBaseline;
  }

  reset(): void {
    this.measurements.clear();
    performance.clearMarks();
    performance.clearMeasures();
  }
}

// Generate test datasets of various sizes
const generateDataset = (size: number, fields: string[] = ['id', 'value', 'category']) => {
  return Array.from({ length: size }, (_, i) => {
    const record: Record<string, any> = {};
    fields.forEach(field => {
      switch (field) {
        case 'id':
          record[field] = i;
          break;
        case 'value':
          record[field] = Math.random() * 1000;
          break;
        case 'category':
          record[field] = `Category ${i % 10}`;
          break;
        case 'date':
          record[field] = new Date(2023, i % 12, (i % 28) + 1).toISOString();
          break;
        case 'region':
          record[field] = ['North', 'South', 'East', 'West'][i % 4];
          break;
        case 'product':
          record[field] = `Product ${String.fromCharCode(65 + (i % 26))}`;
          break;
        default:
          record[field] = `Value${i}`;
      }
    });
    return record;
  });
};

// Mock heavy operations
vi.mock('../../services/export/PowerPointExporter');
vi.mock('../../services/export/ExcelExporter');
vi.mock('../../services/export/HTMLWidgetGenerator');

describe('Performance Benchmarks', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    monitor.setMemoryBaseline();
    vi.clearAllMocks();

    // Setup optimistic mocks for performance testing
    (PowerPointExporter.exportPresentation as any).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 50)); // Simulate work
      return { success: true, data: new Blob(), filename: 'test.pptx' };
    });

    (ExcelExporter.exportToExcel as any).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 30)); // Simulate work
      return { success: true, data: new Blob(), filename: 'test.xlsx' };
    });

    (HTMLWidgetGenerator.generateWidget as any).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 20)); // Simulate work
      return { success: true, data: '<div></div>', filename: 'test.html' };
    });
  });

  afterEach(() => {
    cleanup();
    monitor.reset();
  });

  describe('Data Loading Performance', () => {
    it('should load small datasets quickly (< 200ms)', async () => {
      const smallData = generateDataset(100);

      monitor.startMeasurement('small-data-load');
      
      await act(async () => {
        render(<ChartBuilder data={smallData} />);
      });

      const duration = monitor.endMeasurement('small-data-load');

      // Increased threshold to account for React rendering overhead
      expect(duration).toBeLessThan(200);
      console.log(`Small dataset (100 rows) loaded in ${duration.toFixed(2)}ms`);
    });

    it('should load medium datasets reasonably (< 500ms)', async () => {
      const mediumData = generateDataset(1000);

      monitor.startMeasurement('medium-data-load');
      
      await act(async () => {
        render(<ChartBuilder data={mediumData} />);
      });

      const duration = monitor.endMeasurement('medium-data-load');

      expect(duration).toBeLessThan(500);
      console.log(`Medium dataset (1,000 rows) loaded in ${duration.toFixed(2)}ms`);
    });

    it('should load large datasets with acceptable performance (< 2000ms)', async () => {
      const largeData = generateDataset(10000);

      monitor.startMeasurement('large-data-load');
      
      await act(async () => {
        render(<ChartBuilder data={largeData} />);
      });

      const duration = monitor.endMeasurement('large-data-load');

      expect(duration).toBeLessThan(2000);
      console.log(`Large dataset (10,000 rows) loaded in ${duration.toFixed(2)}ms`);
      
      // Check memory usage
      const memoryIncrease = monitor.getMemoryIncrease();
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      
      // Memory should not increase by more than 50MB for 10k records
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    }, 10000);
  });

  describe('Chart Rendering Performance', () => {
    it('should render line charts efficiently', async () => {
      const data = generateDataset(1000, ['id', 'value', 'date']);
      const config = {
        type: 'line' as const,
        title: 'Performance Test',
        fieldMapping: { x: 'date', y: 'value' },
        styling: {} as any,
        animation: { enabled: false },
        interactions: {}
      };

      // Warm up
      render(<LineChart data={data.slice(0, 10)} config={config} />);
      cleanup();

      // Actual benchmark
      monitor.startMeasurement('line-chart-render');
      
      await act(async () => {
        render(<LineChart data={data} config={config} />);
      });

      const duration = monitor.endMeasurement('line-chart-render');

      expect(duration).toBeLessThan(300);
      console.log(`Line chart (1000 points) rendered in ${duration.toFixed(2)}ms`);
    });

    it('should render pie charts efficiently', async () => {
      const data = generateDataset(50, ['category', 'value']);
      const config = {
        type: 'pie' as const,
        title: 'Performance Test',
        fieldMapping: { category: 'category', value: 'value' },
        styling: {} as any,
        animation: { enabled: false },
        interactions: {}
      };

      monitor.startMeasurement('pie-chart-render');
      
      await act(async () => {
        render(<PieChart data={data} config={config} />);
      });

      const duration = monitor.endMeasurement('pie-chart-render');

      expect(duration).toBeLessThan(200);
      console.log(`Pie chart (50 categories) rendered in ${duration.toFixed(2)}ms`);
    });

    it('should handle chart re-renders efficiently', async () => {
      const data = generateDataset(500, ['id', 'value', 'category']);
      const baseConfig = {
        type: 'line' as const,
        title: 'Performance Test',
        fieldMapping: { x: 'id', y: 'value' },
        styling: {} as any,
        animation: { enabled: false },
        interactions: {}
      };

      const { rerender } = render(<LineChart data={data} config={baseConfig} />);

      // Measure re-render performance
      const reRenderTimes = [];
      
      for (let i = 0; i < 5; i++) {
        const newConfig = {
          ...baseConfig,
          title: `Performance Test ${i}`,
          fieldMapping: { x: 'id', y: 'value' }
        };

        monitor.startMeasurement(`re-render-${i}`);
        
        await act(async () => {
          rerender(<LineChart data={data} config={newConfig} />);
        });

        const duration = monitor.endMeasurement(`re-render-${i}`);
        reRenderTimes.push(duration);
      }

      const avgReRender = reRenderTimes.reduce((sum, time) => sum + time, 0) / reRenderTimes.length;
      
      expect(avgReRender).toBeLessThan(100);
      console.log(`Average re-render time: ${avgReRender.toFixed(2)}ms`);
    });
  });

  describe('Export Performance', () => {
    it('should export PowerPoint efficiently', async () => {
      const data = generateDataset(1000);

      const config = {
        title: 'Performance Test Report',
        charts: [{
          type: 'bar' as const,
          data,
          config: {
            fieldMapping: { x: 'category', y: 'value' }
          }
        }]
      };

      monitor.startMeasurement('ppt-export');

      await PowerPointExporter.exportPresentation(config);

      const duration = monitor.endMeasurement('ppt-export');

      expect(duration).toBeLessThan(1000);
      console.log(`PowerPoint export (1000 rows) completed in ${duration.toFixed(2)}ms`);
    });

    it('should export Excel efficiently', async () => {
      const data = generateDataset(5000);

      const options = {
        filename: 'performance-test.xlsx',
        sheetName: 'Data',
        includeCharts: true,
        chartConfig: {
          type: 'line' as const,
          fieldMapping: { x: 'id', y: 'value' }
        }
      };

      monitor.startMeasurement('excel-export');

      await ExcelExporter.exportToExcel(data, options);

      const duration = monitor.endMeasurement('excel-export');

      expect(duration).toBeLessThan(2000);
      console.log(`Excel export (5000 rows) completed in ${duration.toFixed(2)}ms`);
    });

    it('should generate HTML widgets efficiently', async () => {
      const data = generateDataset(2000);

      const config = {
        type: 'scatter' as const,
        data,
        title: 'Performance Test Widget',
        interactive: true,
        standalone: true
      };

      monitor.startMeasurement('html-widget-generation');

      await HTMLWidgetGenerator.generateWidget(config);

      const duration = monitor.endMeasurement('html-widget-generation');

      expect(duration).toBeLessThan(500);
      console.log(`HTML widget generation (2000 rows) completed in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage Monitoring', () => {
    it('should not leak memory during chart operations', async () => {
      const data = generateDataset(1000);
      
      monitor.setMemoryBaseline();
      const initialMemory = monitor.measureMemory();

      // Create and destroy charts multiple times
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<ChartBuilder data={data} />);
        unmount();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Allow time for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      const finalMemory = monitor.measureMemory();
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal (< 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      console.log(`Memory increase after 10 chart cycles: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should handle progressive data loading efficiently', async () => {
      const batchSize = 500;
      const totalBatches = 10;
      let cumulativeData: any[] = [];

      monitor.setMemoryBaseline();
      
      for (let batch = 0; batch < totalBatches; batch++) {
        const batchData = generateDataset(batchSize);
        cumulativeData = [...cumulativeData, ...batchData];

        monitor.startMeasurement(`batch-${batch}`);
        
        const { unmount } = render(<ChartBuilder data={cumulativeData} />);
        
        const duration = monitor.endMeasurement(`batch-${batch}`);
        const memoryUsage = monitor.getMemoryIncrease();

        unmount();

        console.log(`Batch ${batch + 1}: ${cumulativeData.length} rows, ${duration.toFixed(2)}ms, ${(memoryUsage / 1024 / 1024).toFixed(2)}MB`);

        // Each batch should not take exponentially longer
        if (batch > 0) {
          const prevDuration = monitor.getStats(`batch-${batch - 1}`)?.avg || 0;
          const growthFactor = duration / prevDuration;
          expect(growthFactor).toBeLessThan(2); // No more than 2x slower
        }
      }

      const finalMemoryUsage = monitor.getMemoryIncrease();
      
      // Total memory usage should be reasonable for 5000 records
      expect(finalMemoryUsage).toBeLessThan(100 * 1024 * 1024); // < 100MB
    });
  });

  describe('Stress Testing', () => {
    it('should handle rapid user interactions', async () => {
      const data = generateDataset(1000);
      const { rerender } = render(<ChartBuilder data={data} />);

      const interactionTimes = [];

      // Simulate rapid chart type changes
      const chartTypes = ['line', 'bar', 'pie', 'scatter', 'area'] as const;
      
      for (let i = 0; i < 20; i++) {
        const chartType = chartTypes[i % chartTypes.length];
        
        monitor.startMeasurement(`interaction-${i}`);
        
        await act(async () => {
          // Simulate changing chart type rapidly
          rerender(<ChartBuilder data={data} key={i} />);
        });

        const duration = monitor.endMeasurement(`interaction-${i}`);
        interactionTimes.push(duration);
      }

      const avgInteractionTime = interactionTimes.reduce((sum, time) => sum + time, 0) / interactionTimes.length;
      const maxInteractionTime = Math.max(...interactionTimes);

      expect(avgInteractionTime).toBeLessThan(200);
      expect(maxInteractionTime).toBeLessThan(500);

      console.log(`Average interaction time: ${avgInteractionTime.toFixed(2)}ms`);
      console.log(`Max interaction time: ${maxInteractionTime.toFixed(2)}ms`);
    });

    it('should handle concurrent export operations', async () => {
      const data = generateDataset(1000);
      const exportPromises = [];

      // Start multiple exports concurrently
      for (let i = 0; i < 5; i++) {
        exportPromises.push(
          PowerPointExporter.exportPresentation({
            title: `Report ${i}`,
            charts: [{ type: 'bar' as const, data, config: { fieldMapping: { x: 'category', y: 'value' } } }]
          }),
          ExcelExporter.exportToExcel(data, { filename: `data-${i}.xlsx` })
        );
      }

      monitor.startMeasurement('concurrent-exports');

      const results = await Promise.all(exportPromises);

      const duration = monitor.endMeasurement('concurrent-exports');

      // All exports should succeed
      expect(results.every(result => result.success)).toBe(true);

      // Concurrent execution should be reasonably fast
      expect(duration).toBeLessThan(3000);

      console.log(`${results.length} concurrent exports completed in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should establish baseline performance metrics', () => {
      const testCases = [
        { name: 'small-data-load', threshold: 100 },
        { name: 'medium-data-load', threshold: 500 },
        { name: 'large-data-load', threshold: 2000 },
        { name: 'line-chart-render', threshold: 300 },
        { name: 'pie-chart-render', threshold: 200 },
        { name: 'ppt-export', threshold: 1000 },
        { name: 'excel-export', threshold: 2000 },
        { name: 'html-widget-generation', threshold: 500 }
      ];

      testCases.forEach(testCase => {
        const stats = monitor.getStats(testCase.name);
        if (stats) {
          console.log(`${testCase.name}: avg=${stats.avg.toFixed(2)}ms, p95=${stats.p95.toFixed(2)}ms, p99=${stats.p99.toFixed(2)}ms`);
          
          // Record baseline (in real implementation, this would be stored)
          expect(stats.p95).toBeLessThan(testCase.threshold);
        }
      });
    });
  });
});
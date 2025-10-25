import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom';

// Import the services we'll test in integration
import { PowerPointExporter } from '../../services/export/PowerPointExporter';
import { ExcelExporter } from '../../services/export/ExcelExporter';
import { HTMLWidgetGenerator } from '../../services/export/HTMLWidgetGenerator';

// Test data that simulates real-world usage
const integrationTestData = [
  { product: 'Product A', sales: 15000, quarter: 'Q1', region: 'North', profit: 3000 },
  { product: 'Product B', sales: 23000, quarter: 'Q1', region: 'South', profit: 4600 },
  { product: 'Product C', sales: 18000, quarter: 'Q1', region: 'East', profit: 3600 },
  { product: 'Product A', sales: 19000, quarter: 'Q2', region: 'North', profit: 3800 },
  { product: 'Product B', sales: 27000, quarter: 'Q2', region: 'South', profit: 5400 }
];

// Mock external dependencies
const mockPowerPointExporter = vi.hoisted(() => ({
  exportPresentation: vi.fn()
}));

const mockExcelExporter = vi.hoisted(() => ({
  exportToExcel: vi.fn()
}));

const mockHTMLWidgetGenerator = vi.hoisted(() => ({
  generateWidget: vi.fn()
}));

vi.mock('../../services/export/PowerPointExporter', () => ({
  PowerPointExporter: mockPowerPointExporter
}));

vi.mock('../../services/export/ExcelExporter', () => ({
  ExcelExporter: mockExcelExporter
}));

vi.mock('../../services/export/HTMLWidgetGenerator', () => ({
  HTMLWidgetGenerator: mockHTMLWidgetGenerator
}));

describe('Export Workflow Integration Tests - Core', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup successful mock responses for all exporters
    mockPowerPointExporter.exportPresentation.mockResolvedValue({
      success: true,
      filename: 'sales-report.pptx',
      slideCount: 5
    });

    mockExcelExporter.exportToExcel.mockResolvedValue({
      success: true,
      filename: 'sales-data.xlsx',
      worksheetCount: 3
    });

    mockHTMLWidgetGenerator.generateWidget.mockResolvedValue({
      success: true,
      filename: 'chart-widget.html',
      size: '15 KB'
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Service Integration', () => {
    it('should integrate PowerPoint export with data processing', async () => {
      const mockChartElement = document.createElement('div');
      const mockConfig = {
        title: 'Sales Performance Report',
        type: 'bar' as const,
        fieldMapping: { x: 'product', y: 'sales' }
      };

      const options = {
        template: 'business' as const,
        includeInsights: true,
        includeDataSummary: true
      };

      const result = await PowerPointExporter.exportPresentation(
        mockChartElement,
        mockConfig,
        integrationTestData,
        null,
        options
      );

      expect(result.success).toBe(true);
      expect(result.filename).toBe('sales-report.pptx');
      expect(mockPowerPointExporter.exportPresentation).toHaveBeenCalledWith(
        mockChartElement,
        expect.objectContaining({
          title: 'Sales Performance Report',
          type: 'bar',
          fieldMapping: { x: 'product', y: 'sales' }
        }),
        integrationTestData,
        null,
        expect.objectContaining({
          template: 'business',
          includeInsights: true,
          includeDataSummary: true
        })
      );
    });

    it('should integrate Excel export with data transformations', async () => {
      const mockConfig = {
        title: 'Sales Analysis',
        type: 'line' as const,
        fieldMapping: { x: 'quarter', y: 'sales' }
      };
      
      const options = {
        includeRawData: true,
        includeInsights: true,
        includeSummaryStats: true,
        filename: 'sales-data.xlsx'
      };

      const result = await ExcelExporter.exportToExcel(
        mockConfig,
        integrationTestData,
        integrationTestData,
        null,
        options
      );

      expect(result.success).toBe(true);
      expect(result.filename).toBe('sales-data.xlsx');
      expect(mockExcelExporter.exportToExcel).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Sales Analysis',
          type: 'line',
          fieldMapping: { x: 'quarter', y: 'sales' }
        }),
        integrationTestData,
        integrationTestData,
        null,
        expect.objectContaining({
          includeRawData: true,
          includeInsights: true,
          includeSummaryStats: true
        })
      );
    });

    it('should integrate HTML widget generation with interactive features', async () => {
      const mockConfig = {
        title: 'Interactive Sales Widget',
        type: 'scatter' as const,
        fieldMapping: { x: 'product', y: 'sales' }
      };

      const options = {
        includeInsights: true,
        includeControls: true,
        responsive: true,
        theme: 'light' as const,
        filename: 'chart-widget.html'
      };

      const result = await HTMLWidgetGenerator.generateWidget(
        mockConfig,
        integrationTestData,
        null,
        options
      );

      expect(result.success).toBe(true);
      expect(result.filename).toBe('chart-widget.html');
      expect(mockHTMLWidgetGenerator.generateWidget).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Interactive Sales Widget',
          type: 'scatter',
          fieldMapping: { x: 'product', y: 'sales' }
        }),
        integrationTestData,
        null,
        expect.objectContaining({
          includeInsights: true,
          includeControls: true,
          responsive: true
        })
      );
    });
  });

  describe('Multi-Service Workflows', () => {
    it('should handle sequential export operations', async () => {
      const mockChartElement = document.createElement('div');
      const mockConfig = {
        title: 'Sequential Export Test',
        type: 'bar' as const,
        fieldMapping: { x: 'product', y: 'sales' }
      };

      // First export to PowerPoint
      const pptResult = await PowerPointExporter.exportPresentation(
        mockChartElement,
        mockConfig,
        integrationTestData,
        null
      );

      expect(pptResult.success).toBe(true);

      // Then export to Excel
      const excelResult = await ExcelExporter.exportToExcel(
        mockConfig,
        integrationTestData,
        integrationTestData,
        null,
        { filename: 'sequential-export.xlsx' }
      );

      expect(excelResult.success).toBe(true);

      // Verify both services were called
      expect(mockPowerPointExporter.exportPresentation).toHaveBeenCalled();
      expect(mockExcelExporter.exportToExcel).toHaveBeenCalled();
    });

    it('should handle concurrent export operations', async () => {
      const mockChartElement = document.createElement('div');
      const pptConfig = {
        title: 'Concurrent Export Test',
        type: 'bar' as const,
        fieldMapping: { x: 'product', y: 'sales' }
      };
      const excelConfig = {
        title: 'Concurrent Excel Test',
        type: 'line' as const,
        fieldMapping: { x: 'quarter', y: 'sales' }
      };
      const htmlConfig = {
        title: 'Concurrent Widget',
        type: 'pie' as const,
        fieldMapping: { category: 'product', value: 'sales' }
      };

      // Start all exports concurrently
      const exportPromises = [
        PowerPointExporter.exportPresentation(
          mockChartElement,
          pptConfig,
          integrationTestData,
          null
        ),
        ExcelExporter.exportToExcel(
          excelConfig,
          integrationTestData,
          integrationTestData,
          null,
          { filename: 'concurrent-test.xlsx' }
        ),
        HTMLWidgetGenerator.generateWidget(
          htmlConfig,
          integrationTestData,
          null
        )
      ];

      const results = await Promise.all(exportPromises);

      // All exports should succeed
      expect(results.every(result => result.success)).toBe(true);
      expect(results).toHaveLength(3);

      // Verify all services were called
      expect(mockPowerPointExporter.exportPresentation).toHaveBeenCalled();
      expect(mockExcelExporter.exportToExcel).toHaveBeenCalled();
      expect(mockHTMLWidgetGenerator.generateWidget).toHaveBeenCalled();
    });
  });

  describe('Error Handling in Workflows', () => {
    it('should handle export failures gracefully', async () => {
      // Mock export failure
      mockPowerPointExporter.exportPresentation.mockRejectedValue(
        new Error('Export service unavailable')
      );

      const mockChartElement = document.createElement('div');
      const mockConfig = {
        title: 'Failed Export Test',
        type: 'bar' as const,
        fieldMapping: { x: 'product', y: 'sales' }
      };

      await expect(PowerPointExporter.exportPresentation(
        mockChartElement,
        mockConfig,
        integrationTestData,
        null
      )).rejects.toThrow('Export service unavailable');
    });

    it('should handle invalid data gracefully', async () => {
      const invalidData = [
        { product: null, sales: 'invalid', quarter: undefined },
        { product: '', sales: NaN, quarter: '' }
      ];

      const mockConfig = {
        title: 'Invalid Data Test',
        type: 'bar' as const,
        fieldMapping: { x: 'product', y: 'sales' }
      };
      
      const result = await ExcelExporter.exportToExcel(
        mockConfig,
        invalidData,
        invalidData,
        null,
        { filename: 'invalid-data-test.xlsx' }
      );

      expect(result.success).toBe(true);
      expect(mockExcelExporter.exportToExcel).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Invalid Data Test',
          type: 'bar'
        }),
        invalidData,
        invalidData,
        null,
        expect.objectContaining({
          filename: 'invalid-data-test.xlsx'
        })
      );
    });

    it('should handle partial failures in concurrent exports', async () => {
      // Mock partial failure - PowerPoint fails, Excel succeeds
      mockPowerPointExporter.exportPresentation.mockRejectedValue(
        new Error('PowerPoint service unavailable')
      );

      const mockChartElement = document.createElement('div');
      const pptConfig = { title: 'Partial Failure Test', type: 'bar' as const, fieldMapping: { x: 'product', y: 'sales' } };
      const excelConfig = { title: 'Excel Test', type: 'line' as const, fieldMapping: { x: 'quarter', y: 'sales' } };

      const results = await Promise.allSettled([
        PowerPointExporter.exportPresentation(
          mockChartElement,
          pptConfig,
          integrationTestData,
          null
        ),
        ExcelExporter.exportToExcel(
          excelConfig,
          integrationTestData,
          integrationTestData,
          null,
          { filename: 'partial-failure.xlsx' }
        )
      ]);

      expect(results[0].status).toBe('rejected');
      expect(results[1].status).toBe('fulfilled');
      
      if (results[1].status === 'fulfilled') {
        expect(results[1].value.success).toBe(true);
      }
    });
  });

  describe('Data Consistency Across Formats', () => {
    it('should maintain data consistency across different export formats', async () => {
      const mockChartElement = document.createElement('div');
      const commonConfig = {
        title: 'Consistency Test',
        type: 'bar' as const,
        fieldMapping: { x: 'product', y: 'sales' }
      };

      // Export same data to different formats
      await PowerPointExporter.exportPresentation(
        mockChartElement,
        commonConfig,
        integrationTestData,
        null
      );

      await ExcelExporter.exportToExcel(
        commonConfig,
        integrationTestData,
        integrationTestData,
        null,
        { filename: 'consistency-test.xlsx' }
      );

      // Verify both services were called with the same data
      expect(mockPowerPointExporter.exportPresentation).toHaveBeenCalledWith(
        mockChartElement,
        expect.objectContaining(commonConfig),
        integrationTestData,
        null
      );
      expect(mockExcelExporter.exportToExcel).toHaveBeenCalledWith(
        expect.objectContaining(commonConfig),
        integrationTestData,
        integrationTestData,
        null,
        expect.objectContaining({ filename: 'consistency-test.xlsx' })
      );
    });
  });

  describe('Performance Integration', () => {
    it('should handle large datasets efficiently across services', async () => {
      const largeData = Array.from({ length: 5000 }, (_, i) => ({
        id: i,
        category: `Category ${i % 20}`,
        value: Math.random() * 1000,
        date: new Date(2023, i % 12, (i % 28) + 1).toISOString()
      }));

      const start = performance.now();

      const mockConfig = {
        title: 'Large Dataset Test',
        type: 'bar' as const,
        fieldMapping: { x: 'category', y: 'value' }
      };

      const result = await ExcelExporter.exportToExcel(
        mockConfig,
        largeData,
        largeData,
        null,
        { filename: 'large-dataset.xlsx' }
      );

      const duration = performance.now() - start;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete in less than 5 seconds
      
      console.log(`Large dataset export (5000 rows) completed in ${duration.toFixed(2)}ms`);
    });

    it('should optimize memory usage during export operations', async () => {
      const memoryBefore = typeof performance !== 'undefined' && performance.memory 
        ? performance.memory.usedJSHeapSize 
        : 0;

      const mockChartElement = document.createElement('div');
      
      // Create multiple exports to test memory usage
      for (let i = 0; i < 3; i++) {
        const config = {
          title: `Memory Test ${i}`,
          type: 'bar' as const,
          fieldMapping: { x: 'product', y: 'sales' }
        };
        await PowerPointExporter.exportPresentation(
          mockChartElement,
          config,
          integrationTestData,
          null
        );
      }

      const memoryAfter = typeof performance !== 'undefined' && performance.memory 
        ? performance.memory.usedJSHeapSize 
        : 0;

      const memoryIncrease = memoryAfter - memoryBefore;
      
      // Memory increase should be reasonable (less than 50MB)
      if (memoryBefore > 0) {
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
        console.log(`Memory increase after 3 exports: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      }
    });
  });
});
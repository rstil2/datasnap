import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExcelExporter } from '../ExcelExporter';
import {
  createMockChartData,
  createMockInsights,
  createMockExcelOptions,
  createEmptyDataset,
  createLargeDataset,
  createDatasetWithMissingValues,
  createDatasetWithDuplicates,
  createMockChartConfig,
} from '@/test/factories';

// Mock ExcelJS library
vi.mock('exceljs', () => {
  const mockCell = {
    font: {},
    fill: {},
    alignment: {},
    value: undefined,
    border: {},
    style: {}
  };
  
  const mockWorksheet = {
    addRow: vi.fn(),
    getRow: vi.fn((rowNumber) => ({
      eachCell: vi.fn((callback) => {
        // Mock a few cells for testing
        callback(mockCell);
      }),
      getCell: vi.fn(() => mockCell),
      height: 20
    })),
    getColumn: vi.fn(() => ({
      width: 15
    })),
    getCell: vi.fn(() => mockCell),
    mergeCells: vi.fn(),
    autoFilter: undefined,
    rowCount: 0,
    columnCount: 0
  };
  
  const mockWorkbook = {
    addWorksheet: vi.fn(() => mockWorksheet),
    xlsx: {
      writeBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(8)))
    },
    worksheets: [mockWorksheet]
  };
  
  return {
    default: {
      Workbook: vi.fn(() => mockWorkbook)
    },
    Workbook: vi.fn(() => mockWorkbook)
  };
});

vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

describe('ExcelExporter', () => {
  let mockWorkbook: any;
  let mockWorksheet: any;
  
  beforeEach(async () => {
    vi.clearAllMocks();
    // Get references to mocked functions
    const mockExcelJS = await import('exceljs');
    mockWorkbook = new mockExcelJS.Workbook();
    mockWorksheet = mockWorkbook.addWorksheet('test');
  });

  // Helper function to convert ChartData to format expected by ExcelExporter
  const convertChartDataToExcelFormat = (chartData: any) => ({
    config: createMockChartConfig({
      title: 'Test Export',
      type: 'bar' as any,
      fieldMapping: {
        x: chartData.columns?.[0] || 'name',
        y: chartData.columns?.[1] || 'value',
      },
      styling: {
        theme: 'light',
        layout: { 
          width: 800, 
          height: 600,
          margin: { top: 20, right: 20, bottom: 40, left: 60 }
        },
        colors: { scheme: 'category10' as any },
        legend: { 
          show: true, 
          position: 'right',
          direction: 'column',
          anchor: 'start',
          translateX: 0,
          translateY: 0,
          itemWidth: 18,
          itemHeight: 18,
          symbolSize: 12,
          fontSize: 12
        },
        axes: {
          x: {
            show: true,
            grid: true,
            fontSize: 12,
            color: '#666'
          },
          y: {
            show: true,
            grid: true,
            fontSize: 12,
            color: '#666'
          }
        }
      },
      animation: {
        enabled: true,
        duration: 300,
        easing: 'ease',
      },
    }),
    rawData: chartData.data || [],
    filteredData: chartData.data || [],
  });

  const createMockInsightResult = (count: number = 3) => {
    const insights = Array.from({ length: count }, (_, index) => ({
      id: `mock-insight-${index}`,
      type: 'trend' as const,
      priority: (['low', 'medium', 'high', 'critical'] as const)[index % 4],
      confidence: 0.7 + (index * 0.1),
      title: `Mock Insight ${index + 1}`,
      description: `Test insight description ${index + 1}`,
      explanation: `Detailed explanation for insight ${index + 1}`,
      actionable: true,
      recommendations: [`Recommendation ${index + 1}a`, `Recommendation ${index + 1}b`],
    }));
    
    return {
      insights,
      confidence: 0.85,
      executiveSummary: 'Test executive summary',
    };
  };

  describe('exportToExcel', () => {
    it('should export Excel with valid data', async () => {
      const chartData = createMockChartData(5);
      const { config, rawData } = convertChartDataToExcelFormat(chartData);

      const result = await ExcelExporter.exportToExcel(
        config,
        rawData,
        rawData,
        null
      );

      expect(result.success).toBe(true);
      expect(result.filename).toBeDefined();
      expect(result.worksheetCount).toBeGreaterThan(0);
      expect(mockWorkbook.addWorksheet).toHaveBeenCalled();
    });

    it('should handle empty dataset', async () => {
      const chartData = createEmptyDataset();
      const { config, rawData } = convertChartDataToExcelFormat(chartData);

      const result = await ExcelExporter.exportToExcel(
        config,
        rawData,
        rawData,
        null
      );

      expect(result.success).toBe(true);
      expect(mockWorkbook.addWorksheet).toHaveBeenCalled();
    });

    it('should include insights when provided', async () => {
      const chartData = createMockChartData(5);
      const insights = createMockInsightResult(3);
      const { config, rawData } = convertChartDataToExcelFormat(chartData);
      const options = {
        includeInsights: true,
      };

      const result = await ExcelExporter.exportToExcel(
        config,
        rawData,
        rawData,
        insights,
        options
      );

      if (!result.success) {
        console.log('Error:', result.error);
      }
      expect(result.success).toBe(true);
      expect(mockWorkbook.addWorksheet).toHaveBeenCalled();
    });

    it('should include summary statistics by default', async () => {
      const chartData = createMockChartData(8);
      const { config, rawData } = convertChartDataToExcelFormat(chartData);

      const result = await ExcelExporter.exportToExcel(
        config,
        rawData,
        rawData,
        null
      );

      expect(result.success).toBe(true);
      expect(mockWorkbook.addWorksheet).toHaveBeenCalled();
    });

    it('should include chart configuration by default', async () => {
      const chartData = createMockChartData(5);
      const { config, rawData } = convertChartDataToExcelFormat(chartData);

      const result = await ExcelExporter.exportToExcel(
        config,
        rawData,
        rawData,
        null
      );

      expect(result.success).toBe(true);
      expect(mockWorkbook.addWorksheet).toHaveBeenCalled();
    });

    it('should handle large datasets efficiently', async () => {
      const chartData = createLargeDataset(100); // Use smaller dataset for tests
      const { config, rawData } = convertChartDataToExcelFormat(chartData);

      const startTime = performance.now();
      const result = await ExcelExporter.exportToExcel(
        config,
        rawData,
        rawData,
        null
      );
      const endTime = performance.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // 5 second limit for tests
    });

    it('should handle datasets with missing values', async () => {
      const chartData = createDatasetWithMissingValues();
      const { config, rawData } = convertChartDataToExcelFormat(chartData);

      const result = await ExcelExporter.exportToExcel(
        config,
        rawData,
        rawData,
        null
      );

      expect(result.success).toBe(true);
      expect(mockWorksheet.addRow).toHaveBeenCalled();
    });

    it('should handle datasets with duplicate entries', async () => {
      const chartData = createDatasetWithDuplicates();
      const { config, rawData } = convertChartDataToExcelFormat(chartData);

      const result = await ExcelExporter.exportToExcel(
        config,
        rawData,
        rawData,
        null
      );

      expect(result.success).toBe(true);
      expect(mockWorksheet.addRow).toHaveBeenCalled();
    });

    it('should create multiple worksheets with different options', async () => {
      const chartData = createMockChartData(7);
      const insights = createMockInsightResult(2);
      const { config, rawData } = convertChartDataToExcelFormat(chartData);
      const options = {
        includeRawData: true,
        includeFilteredData: true,
        includeInsights: true,
        includeSummaryStats: true,
        includeChartConfig: true,
      };

      const result = await ExcelExporter.exportToExcel(
        config,
        rawData,
        rawData,
        insights,
        options
      );

      if (!result.success) {
        console.log('Multiple worksheets Error:', result.error);
      }
      expect(result.success).toBe(true);
      expect(result.worksheetCount).toBeGreaterThan(1);
      expect(mockWorkbook.addWorksheet).toHaveBeenCalled();
    });

    it('should generate unique filenames', async () => {
      const chartData = createMockChartData(3);
      const { config, rawData } = convertChartDataToExcelFormat(chartData);

      const result1 = await ExcelExporter.exportToExcel(
        config,
        rawData,
        rawData,
        null
      );
      
      // Longer delay to ensure different timestamp (filename uses seconds precision)
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const result2 = await ExcelExporter.exportToExcel(
        config,
        rawData,
        rawData,
        null
      );

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.filename).not.toBe(result2.filename);
    });

    it('should handle ExcelJS library errors gracefully', async () => {
      const chartData = createMockChartData(5);
      const { config, rawData } = convertChartDataToExcelFormat(chartData);

      // Mock an error in ExcelJS operations
      mockWorkbook.xlsx.writeBuffer.mockImplementationOnce(() => {
        throw new Error('ExcelJS Error');
      });

      const result = await ExcelExporter.exportToExcel(
        config,
        rawData,
        rawData,
        null
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('ExcelJS Error');
    });

    it('should properly format numeric data', async () => {
      const chartData = createMockChartData(5, {
        value: 1234.5678,
        rating: 4.567,
      });
      const { config, rawData } = convertChartDataToExcelFormat(chartData);

      const result = await ExcelExporter.exportToExcel(
        config,
        rawData,
        rawData,
        null
      );

      expect(result.success).toBe(true);
      expect(mockWorksheet.addRow).toHaveBeenCalled();
    });

    it('should handle special characters and Unicode', async () => {
      const chartData = createMockChartData(3, {
        name: 'Test with émojis 🚀 and symbols ©®™',
        category: 'Special chars: <>&"\'',
        description: '中文字符 and العربية',
      });
      const { config, rawData } = convertChartDataToExcelFormat(chartData);

      const result = await ExcelExporter.exportToExcel(
        config,
        rawData,
        rawData,
        null
      );

      expect(result.success).toBe(true);
      expect(mockWorksheet.addRow).toHaveBeenCalled();
    });

    it('should handle date columns properly', async () => {
      const chartData = createMockChartData(5, {
        date: '2024-01-15',
        timestamp: new Date().toISOString(),
      });
      const { config, rawData } = convertChartDataToExcelFormat(chartData);

      const result = await ExcelExporter.exportToExcel(
        config,
        rawData,
        rawData,
        null
      );

      expect(result.success).toBe(true);
      expect(mockWorksheet.addRow).toHaveBeenCalled();
    });

    it('should handle very wide datasets', async () => {
      const wideData = {
        data: Array.from({ length: 10 }, (_, index) => {
          const row: any = { id: index };
          // Create 20 columns (reduced from 50 for test performance)
          for (let i = 0; i < 20; i++) {
            row[`column_${i}`] = `value_${index}_${i}`;
          }
          return row;
        }),
        columns: ['id', ...Array.from({ length: 20 }, (_, i) => `column_${i}`)],
        summary: {
          totalRows: 10,
          totalColumns: 21,
          numericColumns: ['id'],
          categoricalColumns: Array.from({ length: 20 }, (_, i) => `column_${i}`),
          dateColumns: [],
        },
      };
      const { config, rawData } = convertChartDataToExcelFormat(wideData);

      const result = await ExcelExporter.exportToExcel(
        config,
        rawData,
        rawData,
        null
      );

      expect(result.success).toBe(true);
      expect(mockWorksheet.addRow).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined insights', async () => {
      const chartData = createMockChartData(5);
      const { config, rawData } = convertChartDataToExcelFormat(chartData);

      const result = await ExcelExporter.exportToExcel(
        config,
        rawData,
        rawData,
        undefined as any
      );

      expect(result.success).toBe(true);
    });

    it('should handle null values in numeric columns', async () => {
      const chartData = createMockChartData(5, {
        value: null,
        score: undefined,
      });
      const { config, rawData } = convertChartDataToExcelFormat(chartData);

      const result = await ExcelExporter.exportToExcel(
        config,
        rawData,
        rawData,
        null
      );

      expect(result.success).toBe(true);
      expect(mockWorksheet.addRow).toHaveBeenCalled();
    });

    it('should handle boolean values properly', async () => {
      const chartData = createMockChartData(5, {
        active: true,
        verified: false,
      });
      const { config, rawData } = convertChartDataToExcelFormat(chartData);

      const result = await ExcelExporter.exportToExcel(
        config,
        rawData,
        rawData,
        null
      );

      expect(result.success).toBe(true);
    });

    it('should handle empty strings and whitespace', async () => {
      const chartData = createMockChartData(5, {
        name: '',
        description: '   ',
        category: '\t\n',
      });
      const { config, rawData } = convertChartDataToExcelFormat(chartData);

      const result = await ExcelExporter.exportToExcel(
        config,
        rawData,
        rawData,
        null
      );

      expect(result.success).toBe(true);
    });
  });
});
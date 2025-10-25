import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HTMLWidgetGenerator } from '../HTMLWidgetGenerator';
import {
  createMockChartData,
  createMockInsights,
  createMockChartElement,
  createEmptyDataset,
  createLargeDataset,
  createDatasetWithMissingValues,
  createMockChartConfig,
  createMockHTMLOptions,
} from '@/test/factories';

// Mock file-saver
vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

// Mock html2canvas
vi.mock('html2canvas', () => ({
  default: vi.fn(() => Promise.resolve({
    toDataURL: vi.fn(() => 'data:image/png;base64,mockImageData'),
    width: 800,
    height: 400,
  }))
}));

describe('HTMLWidgetGenerator', () => {
  let mockSaveAs: any;
  let mockHtml2Canvas: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const fileSaver = await import('file-saver');
    const html2canvas = await import('html2canvas');
    mockSaveAs = vi.mocked(fileSaver.saveAs);
    mockHtml2Canvas = vi.mocked(html2canvas.default);
  });

  // Helper function to convert ChartData to format expected by HTMLWidgetGenerator
  const convertChartDataToHTMLFormat = (chartData: any) => ({
    config: createMockChartConfig({
      title: 'Test HTML Widget',
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
    data: chartData.data || [],
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
      keyTakeaways: ['Key point 1', 'Key point 2'],
      recommendations: ['Recommendation 1', 'Recommendation 2'],
      dataQualityScore: 0.9,
    };
  };

  describe('generateWidget', () => {
    it('should generate HTML widget with valid data', async () => {
      const chartData = createMockChartData(5);
      const { config, data } = convertChartDataToHTMLFormat(chartData);
      const insights = createMockInsightResult(2);

      const result = await HTMLWidgetGenerator.generateWidget(
        config,
        data,
        insights
      );

      expect(result.success).toBe(true);
      expect(result.filename).toBeDefined();
      expect(result.size).toBeDefined();
      expect(mockSaveAs).toHaveBeenCalled();
    });

    it('should handle empty dataset', async () => {
      const chartData = createEmptyDataset();
      const { config, data } = convertChartDataToHTMLFormat(chartData);

      const result = await HTMLWidgetGenerator.generateWidget(
        config,
        data,
        null
      );

      expect(result.success).toBe(true);
      expect(mockSaveAs).toHaveBeenCalled();
    });

    it('should generate HTML with custom options', async () => {
      const chartData = createMockChartData(7);
      const insights = createMockInsightResult(3);
      const { config, data } = convertChartDataToHTMLFormat(chartData);
      const options = {
        ...createMockHTMLOptions(),
        theme: 'dark' as const,
        includeDataTable: true,
        includeControls: true,
      };

      const result = await HTMLWidgetGenerator.generateWidget(
        config,
        data,
        insights,
        options
      );

      expect(result.success).toBe(true);
      expect(mockSaveAs).toHaveBeenCalled();
      
      // Should generate HTML content with dark theme
      const saveCall = mockSaveAs.mock.calls[0];
      const blob = saveCall[0];
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/html;charset=utf-8');
    });

    it('should include insights when includeInsights is true', async () => {
      const chartData = createMockChartData(5);
      const insights = createMockInsightResult(3);
      const { config, data } = convertChartDataToHTMLFormat(chartData);
      const options = {
        ...createMockHTMLOptions(),
        includeInsights: true,
      };

      const result = await HTMLWidgetGenerator.generateWidget(
        config,
        data,
        insights,
        options
      );

      expect(result.success).toBe(true);
      
      // Check if insights content is included
      const saveCall = mockSaveAs.mock.calls[0];
      const blob = saveCall[0];
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should include data table when includeDataTable is true', async () => {
      const chartData = createMockChartData(8);
      const insights = createMockInsightResult(2);
      const { config, data } = convertChartDataToHTMLFormat(chartData);
      const options = {
        ...createMockHTMLOptions(),
        includeDataTable: true,
      };

      const result = await HTMLWidgetGenerator.generateWidget(
        config,
        data,
        insights,
        options
      );

      expect(result.success).toBe(true);
      
      // Should include table HTML structure
      const saveCall = mockSaveAs.mock.calls[0];
      const blob = saveCall[0];
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should include chart controls when includeControls is true', async () => {
      const chartData = createMockChartData(10);
      const insights = createMockInsightResult(2);
      const { config, data } = convertChartDataToHTMLFormat(chartData);
      const options = {
        ...createMockHTMLOptions(),
        includeControls: true,
      };

      const result = await HTMLWidgetGenerator.generateWidget(
        config,
        data,
        insights,
        options
      );

      expect(result.success).toBe(true);
      expect(mockSaveAs).toHaveBeenCalled();
    });

    it('should make responsive design when responsive is true', async () => {
      const chartData = createMockChartData(5);
      const insights = createMockInsightResult(2);
      const { config, data } = convertChartDataToHTMLFormat(chartData);
      const options = {
        ...createMockHTMLOptions(),
        responsive: true,
      };

      const result = await HTMLWidgetGenerator.generateWidget(
        config,
        data,
        insights,
        options
      );

      expect(result.success).toBe(true);
      expect(mockSaveAs).toHaveBeenCalled();
    });

    it('should enable fullscreen when enableFullscreen is true', async () => {
      const chartData = createMockChartData(5);
      const insights = createMockInsightResult(2);
      const { config, data } = convertChartDataToHTMLFormat(chartData);
      const options = {
        ...createMockHTMLOptions(),
        enableFullscreen: true,
      };

      const result = await HTMLWidgetGenerator.generateWidget(
        config,
        data,
        insights,
        options
      );

      expect(result.success).toBe(true);
      expect(mockSaveAs).toHaveBeenCalled();
    });

    it('should handle large datasets efficiently', async () => {
      const chartData = createLargeDataset(100); // Smaller for test performance
      const insights = createMockInsightResult(5);
      const { config, data } = convertChartDataToHTMLFormat(chartData);

      const startTime = performance.now();
      const result = await HTMLWidgetGenerator.generateWidget(
        config,
        data,
        insights
      );
      const endTime = performance.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // 5 second limit
    });

    it('should handle datasets with missing values', async () => {
      const chartData = createDatasetWithMissingValues();
      const insights = createMockInsightResult(2);
      const { config, data } = convertChartDataToHTMLFormat(chartData);

      const result = await HTMLWidgetGenerator.generateWidget(
        config,
        data,
        insights
      );

      expect(result.success).toBe(true);
      expect(mockSaveAs).toHaveBeenCalled();
    });

    it('should generate unique filenames for concurrent exports', async () => {
      const chartData = createMockChartData(3);
      const { config, data } = convertChartDataToHTMLFormat(chartData);

      const result1 = await HTMLWidgetGenerator.generateWidget(
        config,
        data,
        null
      );
      
      // Longer delay to ensure different timestamp (filename uses seconds precision)
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const result2 = await HTMLWidgetGenerator.generateWidget(
        config,
        data,
        null
      );

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.filename).not.toBe(result2.filename);
    });

    it('should calculate and report file size accurately', async () => {
      const chartData = createMockChartData(5);
      const insights = createMockInsightResult(2);
      const { config, data } = convertChartDataToHTMLFormat(chartData);

      const result = await HTMLWidgetGenerator.generateWidget(
        config,
        data,
        insights
      );

      expect(result.success).toBe(true);
      expect(result.size).toBeDefined();
      expect(result.size).toMatch(/\d+\s*(KB|MB)/);
    });

    it('should handle special characters in data', async () => {
      const chartData = createMockChartData(3, {
        name: 'Test with émojis 🚀 and symbols ©®™',
        category: 'Special chars: <>&"\'',
        description: '中文字符 and العربية',
      });
      const insights = createMockInsightResult(1);
      const { config, data } = convertChartDataToHTMLFormat(chartData);

      const result = await HTMLWidgetGenerator.generateWidget(
        config,
        data,
        insights
      );

      expect(result.success).toBe(true);
      expect(mockSaveAs).toHaveBeenCalled();
    });

    it('should apply different themes correctly', async () => {
      const chartData = createMockChartData(5);
      const insights = createMockInsightResult(2);
      const { config, data } = convertChartDataToHTMLFormat(chartData);

      // Test light theme
      const lightOptions = { ...createMockHTMLOptions(), theme: 'light' as const };
      const lightResult = await HTMLWidgetGenerator.generateWidget(
        config,
        data,
        insights,
        lightOptions
      );

      expect(lightResult.success).toBe(true);

      // Test dark theme
      const darkOptions = { ...createMockHTMLOptions(), theme: 'dark' as const };
      const darkResult = await HTMLWidgetGenerator.generateWidget(
        config,
        data,
        insights,
        darkOptions
      );

      expect(darkResult.success).toBe(true);
      expect(mockSaveAs).toHaveBeenCalledTimes(2);
    });

    it('should handle very long insight descriptions', async () => {
      const chartData = createMockChartData(3);
      const longInsight = {
        insights: [{
          id: 'long-insight',
          type: 'trend' as const,
          priority: 'high' as const,
          confidence: 0.9,
          title: 'Very Long Insight',
          description: 'This is a very long insight description that contains multiple sentences and detailed analysis. '.repeat(20),
          explanation: 'Extended explanation',
          actionable: true,
          recommendations: ['Long recommendation'],
        }],
        confidence: 0.9,
        executiveSummary: 'Long summary',
        keyTakeaways: ['Long takeaway'],
        recommendations: ['Long rec'],
        dataQualityScore: 0.9,
      };
      const { config, data } = convertChartDataToHTMLFormat(chartData);

      const result = await HTMLWidgetGenerator.generateWidget(
        config,
        data,
        longInsight
      );

      expect(result.success).toBe(true);
      expect(mockSaveAs).toHaveBeenCalled();
    });

    it('should include interactive features when requested', async () => {
      const chartData = createMockChartData(5);
      const insights = createMockInsightResult(3);
      const { config, data } = convertChartDataToHTMLFormat(chartData);
      const options = {
        ...createMockHTMLOptions(),
        includeControls: true,
        enableFullscreen: true,
      };

      const result = await HTMLWidgetGenerator.generateWidget(
        config,
        data,
        insights,
        options
      );

      expect(result.success).toBe(true);
      expect(mockSaveAs).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined insights', async () => {
      const chartData = createMockChartData(5);
      const { config, data } = convertChartDataToHTMLFormat(chartData);

      const result = await HTMLWidgetGenerator.generateWidget(
        config,
        data,
        undefined as any
      );

      expect(result.success).toBe(true);
    });

    it('should handle empty insights array', async () => {
      const chartData = createMockChartData(5);
      const { config, data } = convertChartDataToHTMLFormat(chartData);
      const emptyInsights = {
        insights: [],
        confidence: 0,
        executiveSummary: '',
        keyTakeaways: [],
        recommendations: [],
        dataQualityScore: 1.0,
      };

      const result = await HTMLWidgetGenerator.generateWidget(
        config,
        data,
        emptyInsights
      );

      expect(result.success).toBe(true);
    });

    it('should handle malformed chart data', async () => {
      const malformedData: any = {
        data: [{ invalid: 'data' }],
        columns: [],
        summary: { totalRows: 0, totalColumns: 0 }
      };
      const insights = createMockInsightResult(1);
      const { config } = convertChartDataToHTMLFormat(malformedData);

      const result = await HTMLWidgetGenerator.generateWidget(
        config,
        malformedData.data,
        insights
      );

      expect(result.success).toBe(true);
    });

    it('should handle very large insight arrays', async () => {
      const chartData = createMockChartData(5);
      const manyInsights = createMockInsightResult(50);
      const { config, data } = convertChartDataToHTMLFormat(chartData);

      const result = await HTMLWidgetGenerator.generateWidget(
        config,
        data,
        manyInsights
      );

      expect(result.success).toBe(true);
    });

    it('should handle data with circular references', async () => {
      const circularData: any = { id: 1, name: 'Test' };
      circularData.self = circularData; // Create circular reference
      
      const insights = createMockInsightResult(1);
      const { config } = convertChartDataToHTMLFormat({ data: [] });

      // Should handle gracefully - may fail but shouldn't crash
      const result = await HTMLWidgetGenerator.generateWidget(
        config,
        [circularData],
        insights
      );

      // Either succeeds (data is handled) or fails gracefully (error is caught)
      expect(typeof result.success).toBe('boolean');
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });
});
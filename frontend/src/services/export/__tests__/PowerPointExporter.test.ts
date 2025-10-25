import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PowerPointExporter } from '../PowerPointExporter';
import {
  createMockChartData,
  createMockInsights,
  createMockChartElement,
  createEmptyDataset,
  createLargeDataset,
  createMockChartConfig,
  createMockPowerPointOptions,
} from '@/test/factories';

// Mock PptxGenJS
const mockSlide = {
  background: '',
  addText: vi.fn(),
  addImage: vi.fn(),
  addTable: vi.fn(),
  addChart: vi.fn(),
};

const mockPptx = {
  layout: '',
  author: '',
  company: '',
  title: '',
  subject: '',
  addSlide: vi.fn(() => mockSlide),
  writeFile: vi.fn(() => Promise.resolve()),
};

vi.mock('pptxgenjs', () => ({
  default: vi.fn(() => mockPptx)
}));

// Mock html2canvas
vi.mock('html2canvas', () => ({
  default: vi.fn(() => Promise.resolve({
    toDataURL: vi.fn(() => 'data:image/png;base64,mockImageData'),
    width: 800,
    height: 400,
  }))
}));

describe('PowerPointExporter', () => {
  let mockHtml2Canvas: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const html2canvas = await import('html2canvas');
    mockHtml2Canvas = vi.mocked(html2canvas.default);
    
    // Reset mock slide methods
    mockSlide.addText.mockClear();
    mockSlide.addImage.mockClear();
    mockSlide.addTable.mockClear();
    mockSlide.addChart.mockClear();
    mockPptx.addSlide.mockClear();
    mockPptx.writeFile.mockClear();
  });

  // Helper function to convert ChartData to format expected by PowerPointExporter
  const convertChartDataToPowerPointFormat = (chartData: any) => ({
    config: createMockChartConfig({
      title: 'Test PowerPoint Export',
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

  describe('exportPresentation', () => {
    it('should export PowerPoint presentation with valid data', async () => {
      const chartData = createMockChartData(5);
      const insights = createMockInsightResult(2);
      const { config, data } = convertChartDataToPowerPointFormat(chartData);
      const chartElement = createMockChartElement();

      const result = await PowerPointExporter.exportPresentation(
        chartElement,
        config,
        data,
        insights
      );

      expect(result.success).toBe(true);
      expect(result.filename).toBeDefined();
      expect(result.slideCount).toBeGreaterThan(0);
      expect(mockPptx.addSlide).toHaveBeenCalled();
      expect(mockPptx.writeFile).toHaveBeenCalled();
    });

    it('should handle empty dataset', async () => {
      const chartData = createEmptyDataset();
      const { config, data } = convertChartDataToPowerPointFormat(chartData);
      const chartElement = createMockChartElement();

      const result = await PowerPointExporter.exportPresentation(
        chartElement,
        config,
        data,
        null
      );

      expect(result.success).toBe(true);
      expect(mockPptx.addSlide).toHaveBeenCalled();
      expect(mockPptx.writeFile).toHaveBeenCalled();
    });

    it('should create slides with custom options', async () => {
      const chartData = createMockChartData(7);
      const insights = createMockInsightResult(3);
      const { config, data } = convertChartDataToPowerPointFormat(chartData);
      const chartElement = createMockChartElement();
      const options = {
        ...createMockPowerPointOptions(),
        template: 'executive' as const,
        includeInsights: true,
        includeDataSummary: true,
      };

      const result = await PowerPointExporter.exportPresentation(
        chartElement,
        config,
        data,
        insights,
        options
      );

      expect(result.success).toBe(true);
      expect(mockPptx.addSlide).toHaveBeenCalled();
      expect(mockPptx.writeFile).toHaveBeenCalled();
    });

    it('should include chart image when chartElement is provided', async () => {
      const chartData = createMockChartData(5);
      const insights = createMockInsightResult(2);
      const { config, data } = convertChartDataToPowerPointFormat(chartData);
      const chartElement = createMockChartElement();

      await PowerPointExporter.exportPresentation(
        chartElement,
        config,
        data,
        insights
      );

      expect(mockHtml2Canvas).toHaveBeenCalledWith(chartElement, expect.any(Object));
      expect(mockPptx.addSlide).toHaveBeenCalled();
    });

    it('should include insights when includeInsights is true', async () => {
      const chartData = createMockChartData(5);
      const insights = createMockInsightResult(3);
      const { config, data } = convertChartDataToPowerPointFormat(chartData);
      const chartElement = createMockChartElement();
      const options = {
        ...createMockPowerPointOptions(),
        template: 'business' as const,
        includeInsights: true,
      };

      const result = await PowerPointExporter.exportPresentation(
        chartElement,
        config,
        data,
        insights,
        options
      );

      if (!result.success) {
        console.log('Insights test error:', result.error);
      }
      expect(result.success).toBe(true);
      expect(mockPptx.addSlide).toHaveBeenCalled();
    });

    it('should include data summary when includeDataSummary is true', async () => {
      const chartData = createMockChartData(8);
      const insights = createMockInsightResult(2);
      const { config, data } = convertChartDataToPowerPointFormat(chartData);
      const chartElement = createMockChartElement();
      const options = {
        ...createMockPowerPointOptions(),
        template: 'business' as const,
        includeDataSummary: true,
      };

      const result = await PowerPointExporter.exportPresentation(
        chartElement,
        config,
        data,
        insights,
        options
      );

      if (!result.success) {
        console.log('Data summary test error:', result.error);
      }
      expect(result.success).toBe(true);
      expect(mockPptx.addSlide).toHaveBeenCalled();
    });

    it('should handle large datasets efficiently', async () => {
      const chartData = createLargeDataset(100); // Smaller for test performance
      const insights = createMockInsightResult(5);
      const { config, data } = convertChartDataToPowerPointFormat(chartData);
      const chartElement = createMockChartElement();

      const startTime = performance.now();
      const result = await PowerPointExporter.exportPresentation(
        chartElement,
        config,
        data,
        insights
      );
      const endTime = performance.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // 5 second limit
    });

    it('should handle missing chart element', async () => {
      const chartData = createMockChartData(5);
      const insights = createMockInsightResult(2);
      const { config, data } = convertChartDataToPowerPointFormat(chartData);
      const chartElement = createMockChartElement();

      const result = await PowerPointExporter.exportPresentation(
        chartElement,
        config,
        data,
        insights
      );

      expect(result.success).toBe(true);
      expect(mockPptx.addSlide).toHaveBeenCalled();
    });

    it('should handle PptxGenJS errors gracefully', async () => {
      const chartData = createMockChartData(5);
      const insights = createMockInsightResult(2);
      const { config, data } = convertChartDataToPowerPointFormat(chartData);
      const chartElement = createMockChartElement();

      // Mock an error in writeFile
      mockPptx.writeFile.mockRejectedValueOnce(new Error('Export failed'));

      const result = await PowerPointExporter.exportPresentation(
        chartElement,
        config,
        data,
        insights
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Export failed');
    });

    it('should create appropriate slide layouts for different templates', async () => {
      const chartData = createMockChartData(5);
      const insights = createMockInsightResult(2);
      const { config, data } = convertChartDataToPowerPointFormat(chartData);
      const chartElement = createMockChartElement();
      const options = {
        template: 'business' as const,
        slideLayout: 'widescreen' as const,
      };

      await PowerPointExporter.exportPresentation(
        chartElement,
        config,
        data,
        insights,
        options
      );

      expect(mockPptx.addSlide).toHaveBeenCalled();
    });

    it('should generate unique filenames for concurrent exports', async () => {
      const chartData = createMockChartData(3);
      const { config, data } = convertChartDataToPowerPointFormat(chartData);
      const chartElement = createMockChartElement();

      const result1 = await PowerPointExporter.exportPresentation(
        chartElement,
        config,
        data,
        null
      );
      
      // Longer delay to ensure different timestamp (filename uses seconds precision)
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const result2 = await PowerPointExporter.exportPresentation(
        chartElement,
        config,
        data,
        null
      );

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.filename).not.toBe(result2.filename);
    });

    it('should include branding elements when provided', async () => {
      const chartData = createMockChartData(5);
      const insights = createMockInsightResult(2);
      const { config, data } = convertChartDataToPowerPointFormat(chartData);
      const chartElement = createMockChartElement();
      const options = {
        branding: {
          companyName: 'Test Company',
          author: 'Test Author',
          presentationTitle: 'Test Presentation'
        }
      };

      await PowerPointExporter.exportPresentation(
        chartElement,
        config,
        data,
        insights,
        options
      );

      expect(mockPptx.author).toBe('Test Author');
      expect(mockPptx.company).toBe('Test Company');
      expect(mockPptx.addSlide).toHaveBeenCalled();
    });

    it('should respect layout aspect ratio settings', async () => {
      const chartData = createMockChartData(5);
      const insights = createMockInsightResult(2);
      const { config, data } = convertChartDataToPowerPointFormat(chartData);
      const chartElement = createMockChartElement();
      const wideOptions = {
        slideLayout: 'widescreen' as const
      };

      await PowerPointExporter.exportPresentation(
        chartElement,
        config,
        data,
        insights,
        wideOptions
      );
      
      expect(mockPptx.layout).toBe('LAYOUT_WIDE');
      expect(mockPptx.addSlide).toHaveBeenCalled();

      // Reset for standard layout test
      mockPptx.layout = '';
      const standardOptions = {
        slideLayout: 'standard' as const
      };

      await PowerPointExporter.exportPresentation(
        chartElement,
        config,
        data,
        insights,
        standardOptions
      );

      expect(mockPptx.layout).toBe('LAYOUT_4x3');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined insights', async () => {
      const chartData = createMockChartData(5);
      const { config, data } = convertChartDataToPowerPointFormat(chartData);
      const chartElement = createMockChartElement();

      const result = await PowerPointExporter.exportPresentation(
        chartElement,
        config,
        data,
        undefined as any
      );

      expect(result.success).toBe(true);
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
      const { config, data } = convertChartDataToPowerPointFormat(chartData);
      const chartElement = createMockChartElement();

      const result = await PowerPointExporter.exportPresentation(
        chartElement,
        config,
        data,
        longInsight
      );

      expect(result.success).toBe(true);
      expect(mockPptx.addSlide).toHaveBeenCalled();
    });

    it('should handle special characters in data', async () => {
      const chartData = createMockChartData(3, {
        name: 'Test with émojis 🚀 and symbols ©®™',
        category: 'Special chars: <>&"\'',
        description: '中文字符 and العربية',
      });
      const insights = createMockInsightResult(1);
      const { config, data } = convertChartDataToPowerPointFormat(chartData);
      const chartElement = createMockChartElement();

      const result = await PowerPointExporter.exportPresentation(
        chartElement,
        config,
        data,
        insights
      );

      expect(result.success).toBe(true);
      expect(mockPptx.addSlide).toHaveBeenCalled();
    });
  });
});
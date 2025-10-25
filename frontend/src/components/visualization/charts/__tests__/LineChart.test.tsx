import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LineChart } from '../LineChart';
import { ChartConfig, ChartEvent } from '../../../../types/VisualizationTypes';
import { createMockChartData } from '../../../../test/factories';
import { ResponsiveLine } from '@nivo/line';

// Mock @nivo/line
vi.mock('@nivo/line', () => ({
  ResponsiveLine: vi.fn(() => <div data-testid="mocked-responsive-line">Mocked Line Chart</div>),
}));

// Get the mocked function
const mockResponsiveLine = vi.mocked(ResponsiveLine);

describe('LineChart', () => {
  const mockConfig: ChartConfig = {
    type: 'line',
    title: 'Test Line Chart',
    fieldMapping: {
      x: 'date',
      y: 'value',
      color: 'category',
    },
    styling: {
      colors: {
        scheme: 'category10',
      },
      layout: {
        width: 800,
        height: 400,
        margin: { top: 20, right: 30, bottom: 40, left: 50 },
      },
      axes: {
        x: {
          show: true,
          label: 'Date',
          scale: 'time',
          grid: true,
          fontSize: 12,
          color: '#333',
        },
        y: {
          show: true,
          label: 'Value',
          scale: 'linear',
          domain: 'auto',
          grid: true,
          fontSize: 12,
          color: '#333',
        },
      },
      legend: {
        show: true,
        position: 'right',
        direction: 'column',
        anchor: 'middle',
        translateX: 0,
        translateY: 0,
        itemWidth: 100,
        itemHeight: 20,
        symbolSize: 12,
        fontSize: 12,
      },
      theme: 'light',
    },
    animation: {
      enabled: true,
      duration: 300,
      easing: 'easeInOut',
    },
    interactions: {
      hover: {
        enabled: true,
        crosshair: true,
      },
      click: {
        enabled: true,
        action: 'select',
      },
      zoom: {
        enabled: false,
      },
      brush: {
        enabled: false,
      },
    },
  };

  const mockData = [
    { date: '2024-01-01', value: 100, category: 'A' },
    { date: '2024-01-02', value: 150, category: 'A' },
    { date: '2024-01-03', value: 120, category: 'B' },
    { date: '2024-01-04', value: 180, category: 'B' },
    { date: '2024-01-05', value: 200, category: 'A' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the line chart component', () => {
      render(<LineChart data={mockData} config={mockConfig} />);
      
      // Check that the actual line chart container is rendered
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      // Check that the mocked ResponsiveLine is rendered inside
      expect(screen.getByTestId('mocked-responsive-line')).toBeInTheDocument();
      expect(mockResponsiveLine).toHaveBeenCalled();
    });

    it('should pass correct props to ResponsiveLine', () => {
      render(<LineChart data={mockData} config={mockConfig} />);
      
      const lastCall = mockResponsiveLine.mock.calls[mockResponsiveLine.mock.calls.length - 1][0];
      
      expect(lastCall).toHaveProperty('data');
      expect(lastCall).toHaveProperty('theme');
      expect(lastCall).toHaveProperty('colors');
      expect(lastCall).toHaveProperty('margin');
      expect(lastCall.margin).toEqual(mockConfig.styling.layout.margin);
    });

    it('should apply correct styling dimensions', () => {
      const { container } = render(<LineChart data={mockData} config={mockConfig} />);
      
      const chartContainer = container.firstChild as HTMLElement;
      expect(chartContainer).toHaveStyle({
        width: '100%',
        height: '400px',
        background: 'transparent',
      });
    });
  });

  describe('Data Transformation', () => {
    it('should transform data correctly for single series', () => {
      const singleSeriesConfig = {
        ...mockConfig,
        fieldMapping: { x: 'date', y: 'value' }, // No color field
      };

      render(<LineChart data={mockData} config={singleSeriesConfig} />);
      
      const lastCall = mockResponsiveLine.mock.calls[mockResponsiveLine.mock.calls.length - 1][0];
      expect(lastCall.data).toHaveLength(1);
      expect(lastCall.data[0]).toHaveProperty('id', 'value');
      expect(lastCall.data[0]).toHaveProperty('data');
    });

    it('should transform data correctly for multiple series', () => {
      render(<LineChart data={mockData} config={mockConfig} />);
      
      const lastCall = mockResponsiveLine.mock.calls[mockResponsiveLine.mock.calls.length - 1][0];
      expect(lastCall.data).toHaveLength(2); // Two categories: A and B
      
      const seriesIds = lastCall.data.map((series: any) => series.id);
      expect(seriesIds).toContain('A');
      expect(seriesIds).toContain('B');
    });

    it('should handle missing field mappings gracefully', () => {
      const incompleteConfig = {
        ...mockConfig,
        fieldMapping: { y: 'value' }, // Missing x field
      };

      render(<LineChart data={mockData} config={incompleteConfig} />);
      
      const lastCall = mockResponsiveLine.mock.calls[mockResponsiveLine.mock.calls.length - 1][0];
      expect(lastCall.data).toEqual([]);
    });

    it('should filter out invalid data points', () => {
      const invalidData = [
        { date: '2024-01-01', value: 100, category: 'A' },
        { date: '2024-01-02', value: 'invalid', category: 'A' },
        { date: null, value: 120, category: 'B' },
        { date: '2024-01-04', value: 180, category: 'B' },
      ];

      render(<LineChart data={invalidData} config={mockConfig} />);
      
      const lastCall = mockResponsiveLine.mock.calls[mockResponsiveLine.mock.calls.length - 1][0];
      
      // Should only include valid data points
      lastCall.data.forEach((series: any) => {
        series.data.forEach((point: any) => {
          expect(point.x).toBeInstanceOf(Date);
          expect(typeof point.y).toBe('number');
          expect(isNaN(point.y)).toBe(false);
        });
      });
    });

    it('should sort data points by date', () => {
      const unsortedData = [
        { date: '2024-01-03', value: 120, category: 'A' },
        { date: '2024-01-01', value: 100, category: 'A' },
        { date: '2024-01-02', value: 150, category: 'A' },
      ];

      render(<LineChart data={unsortedData} config={mockConfig} />);
      
      const lastCall = mockResponsiveLine.mock.calls[mockResponsiveLine.mock.calls.length - 1][0];
      const seriesA = lastCall.data.find((series: any) => series.id === 'A');
      
      // Check if dates are sorted
      for (let i = 1; i < seriesA.data.length; i++) {
        expect(seriesA.data[i].x.getTime()).toBeGreaterThanOrEqual(seriesA.data[i - 1].x.getTime());
      }
    });
  });

  describe('Theme and Styling', () => {
    it('should apply light theme correctly', () => {
      render(<LineChart data={mockData} config={mockConfig} />);
      
      const lastCall = mockResponsiveLine.mock.calls[mockResponsiveLine.mock.calls.length - 1][0];
      expect(lastCall.theme.grid.line.stroke).toBe('rgba(0, 0, 0, 0.1)');
    });

    it('should apply dark theme correctly', () => {
      const darkConfig = {
        ...mockConfig,
        styling: {
          ...mockConfig.styling,
          theme: 'dark' as const,
        },
      };

      render(<LineChart data={mockData} config={darkConfig} />);
      
      const lastCall = mockResponsiveLine.mock.calls[mockResponsiveLine.mock.calls.length - 1][0];
      expect(lastCall.theme.grid.line.stroke).toBe('rgba(255, 255, 255, 0.1)');
    });

    it('should apply custom colors when specified', () => {
      const customColorsConfig = {
        ...mockConfig,
        styling: {
          ...mockConfig.styling,
          colors: {
            scheme: 'custom' as const,
            customColors: ['#ff0000', '#00ff00', '#0000ff'],
          },
        },
      };

      render(<LineChart data={mockData} config={customColorsConfig} />);
      
      const lastCall = mockResponsiveLine.mock.calls[mockResponsiveLine.mock.calls.length - 1][0];
      expect(lastCall.colors).toEqual(['#ff0000', '#00ff00', '#0000ff']);
    });

    it('should use scheme colors when not custom', () => {
      render(<LineChart data={mockData} config={mockConfig} />);
      
      const lastCall = mockResponsiveLine.mock.calls[mockResponsiveLine.mock.calls.length - 1][0];
      expect(lastCall.colors).toEqual({ scheme: 'category10' });
    });
  });

  describe('Event Handling', () => {
    it('should call onEvent when chart is clicked', () => {
      const mockOnEvent = vi.fn();
      render(<LineChart data={mockData} config={mockConfig} onEvent={mockOnEvent} />);
      
      const lastCall = mockResponsiveLine.mock.calls[mockResponsiveLine.mock.calls.length - 1][0];
      
      // Simulate click event
      const mockPoint = { data: { x: new Date(), y: 100 } };
      const mockEvent = new MouseEvent('click');
      lastCall.onClick(mockPoint, mockEvent);
      
      expect(mockOnEvent).toHaveBeenCalledWith({
        type: 'click',
        data: mockPoint,
        event: mockEvent,
        chart: mockConfig,
      });
    });

    it('should not call onEvent when not provided', () => {
      render(<LineChart data={mockData} config={mockConfig} />);
      
      const lastCall = mockResponsiveLine.mock.calls[mockResponsiveLine.mock.calls.length - 1][0];
      
      // Should not throw error when onClick is called without onEvent
      expect(() => {
        lastCall.onClick({}, new MouseEvent('click'));
      }).not.toThrow();
    });
  });

  describe('Animation and Interactions', () => {
    it('should disable animation when configured', () => {
      const noAnimationConfig = {
        ...mockConfig,
        animation: {
          ...mockConfig.animation!,
          enabled: false,
        },
      };

      render(<LineChart data={mockData} config={noAnimationConfig} />);
      
      const lastCall = mockResponsiveLine.mock.calls[mockResponsiveLine.mock.calls.length - 1][0];
      expect(lastCall.animate).toBe(false);
    });

    it('should enable crosshair when configured', () => {
      render(<LineChart data={mockData} config={mockConfig} />);
      
      const lastCall = mockResponsiveLine.mock.calls[mockResponsiveLine.mock.calls.length - 1][0];
      expect(lastCall.enableCrosshair).toBe(true);
    });

    it('should disable grid when configured', () => {
      const noGridConfig = {
        ...mockConfig,
        styling: {
          ...mockConfig.styling,
          axes: {
            ...mockConfig.styling.axes,
            x: { ...mockConfig.styling.axes.x, grid: false },
            y: { ...mockConfig.styling.axes.y, grid: false },
          },
        },
      };

      render(<LineChart data={mockData} config={noGridConfig} />);
      
      const lastCall = mockResponsiveLine.mock.calls[mockResponsiveLine.mock.calls.length - 1][0];
      expect(lastCall.enableGridX).toBe(false);
      expect(lastCall.enableGridY).toBe(false);
    });
  });

  describe('Legend Configuration', () => {
    it('should show legend for multiple series', () => {
      render(<LineChart data={mockData} config={mockConfig} />);
      
      const lastCall = mockResponsiveLine.mock.calls[mockResponsiveLine.mock.calls.length - 1][0];
      expect(lastCall.legends).toHaveLength(1);
    });

    it('should hide legend for single series', () => {
      const singleSeriesConfig = {
        ...mockConfig,
        fieldMapping: { x: 'date', y: 'value' }, // No color field
      };

      render(<LineChart data={mockData} config={singleSeriesConfig} />);
      
      const lastCall = mockResponsiveLine.mock.calls[mockResponsiveLine.mock.calls.length - 1][0];
      expect(lastCall.legends).toHaveLength(0);
    });

    it('should hide legend when configured', () => {
      const noLegendConfig = {
        ...mockConfig,
        styling: {
          ...mockConfig.styling,
          legend: {
            ...mockConfig.styling.legend,
            show: false,
          },
        },
      };

      render(<LineChart data={mockData} config={noLegendConfig} />);
      
      const lastCall = mockResponsiveLine.mock.calls[mockResponsiveLine.mock.calls.length - 1][0];
      expect(lastCall.legends).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data array', () => {
      render(<LineChart data={[]} config={mockConfig} />);
      
      const lastCall = mockResponsiveLine.mock.calls[mockResponsiveLine.mock.calls.length - 1][0];
      expect(lastCall.data).toEqual([]);
    });

    it('should handle data with all null values', () => {
      const nullData = [
        { date: null, value: null, category: null },
        { date: null, value: null, category: null },
      ];

      render(<LineChart data={nullData} config={mockConfig} />);
      
      const lastCall = mockResponsiveLine.mock.calls[mockResponsiveLine.mock.calls.length - 1][0];
      // When all values are null, it should create a series with no data points
      expect(lastCall.data).toEqual([{ id: 'Unknown', data: [] }]);
    });

    it('should handle very large datasets', () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        value: Math.random() * 1000,
        category: i % 2 === 0 ? 'A' : 'B',
      }));

      render(<LineChart data={largeData} config={mockConfig} />);
      
      const lastCall = mockResponsiveLine.mock.calls[mockResponsiveLine.mock.calls.length - 1][0];
      expect(lastCall.data).toHaveLength(2); // Two categories
      expect(lastCall.data[0].data.length).toBeGreaterThan(0);
    });

    it('should handle date parsing for different formats', () => {
      const mixedDateData = [
        { date: '2024-01-01', value: 100, category: 'A' },
        { date: new Date('2024-01-02'), value: 150, category: 'A' },
        { date: '2024/01/03', value: 120, category: 'A' },
      ];

      render(<LineChart data={mixedDateData} config={mockConfig} />);
      
      const lastCall = mockResponsiveLine.mock.calls[mockResponsiveLine.mock.calls.length - 1][0];
      const seriesA = lastCall.data.find((series: any) => series.id === 'A');
      
      // All points should have valid Date objects
      seriesA.data.forEach((point: any) => {
        expect(point.x).toBeInstanceOf(Date);
        expect(isNaN(point.x.getTime())).toBe(false);
      });
    });
  });
});
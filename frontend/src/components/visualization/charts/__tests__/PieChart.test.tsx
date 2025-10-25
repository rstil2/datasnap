import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PieChart } from '../PieChart';
import { ChartConfig } from '../../../../types/VisualizationTypes';

// Mock @nivo/pie using vi.hoisted to avoid reference issues
const mockResponsivePie = vi.hoisted(() => vi.fn(() => <div data-testid="mocked-responsive-pie">Mocked Pie Chart</div>));

vi.mock('@nivo/pie', () => ({
  ResponsivePie: mockResponsivePie,
}));

describe('PieChart', () => {
  const mockConfig: ChartConfig = {
    type: 'pie',
    title: 'Test Pie Chart',
    fieldMapping: {
      category: 'category',
      value: 'value',
    },
    styling: {
      colors: {
        scheme: 'category10',
      },
      layout: {
        width: 500,
        height: 400,
        margin: { top: 40, right: 80, bottom: 80, left: 80 },
      },
      axes: {
        x: {
          show: true,
          grid: false,
          fontSize: 12,
          color: '#333',
        },
        y: {
          show: true,
          grid: false,
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
        itemHeight: 18,
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
    { category: 'A', value: 100 },
    { category: 'B', value: 150 },
    { category: 'C', value: 200 },
    { category: 'A', value: 50 }, // Duplicate category to test aggregation
    { category: 'D', value: 75 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the pie chart component', () => {
      render(<PieChart data={mockData} config={mockConfig} />);
      
      // Check that the actual pie chart container is rendered
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      // Check that the mocked ResponsivePie is rendered inside
      expect(screen.getByTestId('mocked-responsive-pie')).toBeInTheDocument();
      expect(mockResponsivePie).toHaveBeenCalled();
    });

    it('should pass correct props to ResponsivePie', () => {
      render(<PieChart data={mockData} config={mockConfig} />);
      
      const lastCall = mockResponsivePie.mock.calls[mockResponsivePie.mock.calls.length - 1][0];
      
      expect(lastCall).toHaveProperty('data');
      expect(lastCall).toHaveProperty('theme');
      expect(lastCall).toHaveProperty('colors');
      expect(lastCall).toHaveProperty('margin');
      expect(lastCall.margin).toEqual(mockConfig.styling.layout.margin);
    });

    it('should apply correct styling dimensions', () => {
      const { container } = render(<PieChart data={mockData} config={mockConfig} />);
      
      const chartContainer = container.firstChild as HTMLElement;
      expect(chartContainer).toHaveStyle({
        width: '100%',
        height: '400px',
        background: 'transparent',
      });
    });
  });

  describe('Data Transformation and Aggregation', () => {
    it('should aggregate data by category correctly', () => {
      render(<PieChart data={mockData} config={mockConfig} />);
      
      const lastCall = mockResponsivePie.mock.calls[mockResponsivePie.mock.calls.length - 1][0];
      
      // Should have 4 unique categories: A, B, C, D
      expect(lastCall.data).toHaveLength(4);
      
      // Category A should be aggregated (100 + 50 = 150)
      const categoryA = lastCall.data.find((item: any) => item.id === 'A');
      expect(categoryA.value).toBe(150);
      
      // Other categories should have their original values
      const categoryB = lastCall.data.find((item: any) => item.id === 'B');
      expect(categoryB.value).toBe(150);
    });

    it('should sort data by value in descending order', () => {
      render(<PieChart data={mockData} config={mockConfig} />);
      
      const lastCall = mockResponsivePie.mock.calls[mockResponsivePie.mock.calls.length - 1][0];
      
      // Should be sorted: C(200), A(150), B(150), D(75)
      expect(lastCall.data[0].id).toBe('C');
      expect(lastCall.data[0].value).toBe(200);
      expect(lastCall.data[lastCall.data.length - 1].id).toBe('D');
      expect(lastCall.data[lastCall.data.length - 1].value).toBe(75);
    });

    it('should handle missing field mappings gracefully', () => {
      const incompleteConfig = {
        ...mockConfig,
        fieldMapping: { value: 'value' }, // Missing category field
      };

      render(<PieChart data={mockData} config={incompleteConfig} />);
      
      const lastCall = mockResponsivePie.mock.calls[mockResponsivePie.mock.calls.length - 1][0];
      expect(lastCall.data).toEqual([]);
    });

    it('should handle invalid numeric values', () => {
      const invalidData = [
        { category: 'A', value: 100 },
        { category: 'B', value: 'invalid' },
        { category: 'C', value: null },
        { category: 'D', value: undefined },
        { category: 'E', value: '50' }, // String number
      ];

      render(<PieChart data={invalidData} config={mockConfig} />);
      
      const lastCall = mockResponsivePie.mock.calls[mockResponsivePie.mock.calls.length - 1][0];
      
      // Should handle invalid values as 0 and convert string numbers
      const categoryB = lastCall.data.find((item: any) => item.id === 'B');
      expect(categoryB.value).toBe(0);
      
      const categoryE = lastCall.data.find((item: any) => item.id === 'E');
      expect(categoryE.value).toBe(50);
    });

    it('should limit to top 20 categories', () => {
      const largeData = Array.from({ length: 25 }, (_, i) => ({
        category: `Category ${i + 1}`,
        value: Math.random() * 100,
      }));

      render(<PieChart data={largeData} config={mockConfig} />);
      
      const lastCall = mockResponsivePie.mock.calls[mockResponsivePie.mock.calls.length - 1][0];
      expect(lastCall.data).toHaveLength(20);
    });

    it('should handle null and undefined categories', () => {
      const nullCategoryData = [
        { category: null, value: 100 },
        { category: undefined, value: 150 },
        { category: 'A', value: 200 },
        { category: '', value: 75 }, // Empty string
      ];

      render(<PieChart data={nullCategoryData} config={mockConfig} />);
      
      const lastCall = mockResponsivePie.mock.calls[mockResponsivePie.mock.calls.length - 1][0];
      
      // Should group null, undefined, and empty as 'Unknown'
      const unknownCategory = lastCall.data.find((item: any) => item.id === 'Unknown');
      expect(unknownCategory).toBeDefined();
      expect(unknownCategory.value).toBe(325); // 100 + 150 + 75
    });
  });

  describe('Theme and Styling', () => {
    it('should apply light theme correctly', () => {
      render(<PieChart data={mockData} config={mockConfig} />);
      
      const lastCall = mockResponsivePie.mock.calls[mockResponsivePie.mock.calls.length - 1][0];
      expect(lastCall.theme.tooltip.container.background).toBe('white');
      expect(lastCall.theme.tooltip.container.color).toBe('#2d3748');
    });

    it('should apply dark theme correctly', () => {
      const darkConfig = {
        ...mockConfig,
        styling: {
          ...mockConfig.styling,
          theme: 'dark' as const,
        },
      };

      render(<PieChart data={mockData} config={darkConfig} />);
      
      const lastCall = mockResponsivePie.mock.calls[mockResponsivePie.mock.calls.length - 1][0];
      expect(lastCall.theme.tooltip.container.background).toBe('#2d3748');
      expect(lastCall.theme.tooltip.container.color).toBe('white');
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

      render(<PieChart data={mockData} config={customColorsConfig} />);
      
      const lastCall = mockResponsivePie.mock.calls[mockResponsivePie.mock.calls.length - 1][0];
      expect(lastCall.colors).toEqual(['#ff0000', '#00ff00', '#0000ff']);
    });

    it('should use scheme colors when not custom', () => {
      render(<PieChart data={mockData} config={mockConfig} />);
      
      const lastCall = mockResponsivePie.mock.calls[mockResponsivePie.mock.calls.length - 1][0];
      expect(lastCall.colors).toEqual({ scheme: 'category10' });
    });
  });

  describe('Event Handling', () => {
    it('should call onEvent when slice is clicked', () => {
      const mockOnEvent = vi.fn();
      render(<PieChart data={mockData} config={mockConfig} onEvent={mockOnEvent} />);
      
      const lastCall = mockResponsivePie.mock.calls[mockResponsivePie.mock.calls.length - 1][0];
      
      // Simulate click event
      const mockSlice = { id: 'A', value: 150, label: 'A' };
      const mockEvent = new MouseEvent('click');
      lastCall.onClick(mockSlice, mockEvent);
      
      expect(mockOnEvent).toHaveBeenCalledWith({
        type: 'click',
        data: mockSlice,
        event: mockEvent,
        chart: mockConfig,
      });
    });

    it('should call onEvent when slice is hovered', () => {
      const mockOnEvent = vi.fn();
      render(<PieChart data={mockData} config={mockConfig} onEvent={mockOnEvent} />);
      
      const lastCall = mockResponsivePie.mock.calls[mockResponsivePie.mock.calls.length - 1][0];
      
      // Simulate hover event
      const mockSlice = { id: 'B', value: 150, label: 'B' };
      const mockEvent = new MouseEvent('mouseenter');
      lastCall.onMouseEnter(mockSlice, mockEvent);
      
      expect(mockOnEvent).toHaveBeenCalledWith({
        type: 'hover',
        data: mockSlice,
        event: mockEvent,
        chart: mockConfig,
      });
    });

    it('should not call onEvent for hover when disabled', () => {
      const mockOnEvent = vi.fn();
      const noHoverConfig = {
        ...mockConfig,
        interactions: {
          ...mockConfig.interactions!,
          hover: {
            enabled: false,
          },
        },
      };

      render(<PieChart data={mockData} config={noHoverConfig} onEvent={mockOnEvent} />);
      
      const lastCall = mockResponsivePie.mock.calls[mockResponsivePie.mock.calls.length - 1][0];
      
      // Simulate hover event
      lastCall.onMouseEnter({}, new MouseEvent('mouseenter'));
      
      expect(mockOnEvent).not.toHaveBeenCalled();
    });

    it('should not call onEvent when not provided', () => {
      render(<PieChart data={mockData} config={mockConfig} />);
      
      const lastCall = mockResponsivePie.mock.calls[mockResponsivePie.mock.calls.length - 1][0];
      
      // Should not throw error when onClick is called without onEvent
      expect(() => {
        lastCall.onClick({}, new MouseEvent('click'));
        lastCall.onMouseEnter({}, new MouseEvent('mouseenter'));
      }).not.toThrow();
    });
  });

  describe('Animation', () => {
    it('should enable animation when configured', () => {
      render(<PieChart data={mockData} config={mockConfig} />);
      
      const lastCall = mockResponsivePie.mock.calls[mockResponsivePie.mock.calls.length - 1][0];
      expect(lastCall.animate).toBe(true);
      expect(lastCall.motionConfig).toBe('easeInOut');
    });

    it('should disable animation when configured', () => {
      const noAnimationConfig = {
        ...mockConfig,
        animation: {
          ...mockConfig.animation!,
          enabled: false,
        },
      };

      render(<PieChart data={mockData} config={noAnimationConfig} />);
      
      const lastCall = mockResponsivePie.mock.calls[mockResponsivePie.mock.calls.length - 1][0];
      expect(lastCall.animate).toBe(false);
    });
  });

  describe('Labels and Legend', () => {
    it('should show arc labels for small datasets', () => {
      const smallData = [
        { category: 'A', value: 100 },
        { category: 'B', value: 150 },
        { category: 'C', value: 200 },
      ];

      render(<PieChart data={smallData} config={mockConfig} />);
      
      const lastCall = mockResponsivePie.mock.calls[mockResponsivePie.mock.calls.length - 1][0];
      expect(lastCall.enableArcLabels).toBe(true);
    });

    it('should hide arc labels for large datasets', () => {
      const largeData = Array.from({ length: 15 }, (_, i) => ({
        category: `Category ${i + 1}`,
        value: Math.random() * 100,
      }));

      render(<PieChart data={largeData} config={mockConfig} />);
      
      const lastCall = mockResponsivePie.mock.calls[mockResponsivePie.mock.calls.length - 1][0];
      expect(lastCall.enableArcLabels).toBe(false);
    });

    it('should show legend when configured', () => {
      render(<PieChart data={mockData} config={mockConfig} />);
      
      const lastCall = mockResponsivePie.mock.calls[mockResponsivePie.mock.calls.length - 1][0];
      expect(lastCall.legends).toHaveLength(1);
      expect(lastCall.legends[0].anchor).toBe('right');
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

      render(<PieChart data={mockData} config={noLegendConfig} />);
      
      const lastCall = mockResponsivePie.mock.calls[mockResponsivePie.mock.calls.length - 1][0];
      expect(lastCall.legends).toHaveLength(0);
    });

    it('should show arc link labels for medium datasets when legend is enabled', () => {
      const mediumData = Array.from({ length: 8 }, (_, i) => ({
        category: `Category ${i + 1}`,
        value: Math.random() * 100,
      }));

      render(<PieChart data={mediumData} config={mockConfig} />);
      
      const lastCall = mockResponsivePie.mock.calls[mockResponsivePie.mock.calls.length - 1][0];
      expect(lastCall.enableArcLinkLabels).toBe(true);
    });

    it('should hide arc link labels for very large datasets', () => {
      const largeData = Array.from({ length: 20 }, (_, i) => ({
        category: `Category ${i + 1}`,
        value: Math.random() * 100,
      }));

      render(<PieChart data={largeData} config={mockConfig} />);
      
      const lastCall = mockResponsivePie.mock.calls[mockResponsivePie.mock.calls.length - 1][0];
      expect(lastCall.enableArcLinkLabels).toBe(false);
    });
  });

  describe('Custom Tooltip', () => {
    it('should render custom tooltip component', () => {
      render(<PieChart data={mockData} config={mockConfig} />);
      
      const lastCall = mockResponsivePie.mock.calls[mockResponsivePie.mock.calls.length - 1][0];
      expect(lastCall.tooltip).toBeDefined();
      expect(typeof lastCall.tooltip).toBe('function');
    });

    it('should format tooltip content correctly', () => {
      render(<PieChart data={mockData} config={mockConfig} />);
      
      const lastCall = mockResponsivePie.mock.calls[mockResponsivePie.mock.calls.length - 1][0];
      
      // Test tooltip with mock datum
      const mockDatum = { id: 'A', label: 'Category A', value: 150 };
      const tooltipComponent = lastCall.tooltip({ datum: mockDatum });
      
      expect(tooltipComponent).toBeDefined();
      expect(tooltipComponent.type).toBe('div');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data array', () => {
      render(<PieChart data={[]} config={mockConfig} />);
      
      const lastCall = mockResponsivePie.mock.calls[mockResponsivePie.mock.calls.length - 1][0];
      expect(lastCall.data).toEqual([]);
    });

    it('should handle data with all zero values', () => {
      const zeroData = [
        { category: 'A', value: 0 },
        { category: 'B', value: 0 },
        { category: 'C', value: 0 },
      ];

      render(<PieChart data={zeroData} config={mockConfig} />);
      
      const lastCall = mockResponsivePie.mock.calls[mockResponsivePie.mock.calls.length - 1][0];
      expect(lastCall.data).toHaveLength(3);
      expect(lastCall.data.every((item: any) => item.value === 0)).toBe(true);
    });

    it('should handle single category data', () => {
      const singleData = [
        { category: 'A', value: 100 },
        { category: 'A', value: 50 },
      ];

      render(<PieChart data={singleData} config={mockConfig} />);
      
      const lastCall = mockResponsivePie.mock.calls[mockResponsivePie.mock.calls.length - 1][0];
      expect(lastCall.data).toHaveLength(1);
      expect(lastCall.data[0].value).toBe(150);
    });

    it('should handle very small values', () => {
      const smallValueData = [
        { category: 'A', value: 0.001 },
        { category: 'B', value: 0.002 },
        { category: 'C', value: 0.003 },
      ];

      render(<PieChart data={smallValueData} config={mockConfig} />);
      
      const lastCall = mockResponsivePie.mock.calls[mockResponsivePie.mock.calls.length - 1][0];
      expect(lastCall.data).toHaveLength(3);
      expect(lastCall.data.every((item: any) => item.value > 0)).toBe(true);
    });

    it('should handle negative values', () => {
      const negativeData = [
        { category: 'A', value: -100 },
        { category: 'B', value: 150 },
        { category: 'C', value: -50 },
      ];

      render(<PieChart data={negativeData} config={mockConfig} />);
      
      const lastCall = mockResponsivePie.mock.calls[mockResponsivePie.mock.calls.length - 1][0];
      expect(lastCall.data).toHaveLength(3);
      
      // Check that negative values are preserved
      const categoryA = lastCall.data.find((item: any) => item.id === 'A');
      expect(categoryA.value).toBe(-100);
    });
  });
});
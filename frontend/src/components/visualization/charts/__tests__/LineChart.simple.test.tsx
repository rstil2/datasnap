import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LineChart } from '../LineChart';
import { ChartConfig } from '../../../../types/VisualizationTypes';

// Mock the entire @nivo/line module
vi.mock('@nivo/line', () => ({
  ResponsiveLine: vi.fn(({ data, ...props }) => (
    <div data-testid="mocked-responsive-line" data-series-count={data?.length || 0}>
      Mocked Line Chart
    </div>
  )),
}));

describe('LineChart - Basic Functionality', () => {
  const basicConfig: ChartConfig = {
    type: 'line',
    title: 'Test Line Chart',
    fieldMapping: {
      x: 'date',
      y: 'value',
      color: 'category',
    },
    styling: {
      colors: { scheme: 'category10' },
      layout: {
        width: 800,
        height: 400,
        margin: { top: 20, right: 30, bottom: 40, left: 50 },
      },
      axes: {
        x: {
          show: true,
          grid: true,
          fontSize: 12,
          color: '#333',
        },
        y: {
          show: true,
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
  };

  const testData = [
    { date: '2024-01-01', value: 100, category: 'A' },
    { date: '2024-01-02', value: 150, category: 'A' },
    { date: '2024-01-03', value: 120, category: 'B' },
  ];

  it('should render without crashing', () => {
    const { getByTestId } = render(
      <LineChart data={testData} config={basicConfig} />
    );
    
    expect(getByTestId('line-chart')).toBeInTheDocument();
  });

  it('should handle empty data', () => {
    const { getByTestId } = render(
      <LineChart data={[]} config={basicConfig} />
    );
    
    expect(getByTestId('line-chart')).toBeInTheDocument();
    expect(getByTestId('mocked-responsive-line')).toHaveAttribute('data-series-count', '0');
  });

  it('should apply correct container styling', () => {
    const { container } = render(
      <LineChart data={testData} config={basicConfig} />
    );
    
    const chartContainer = container.firstChild as HTMLElement;
    expect(chartContainer).toHaveStyle({
      width: '100%',
      height: '400px',
      background: 'transparent',
    });
  });

  it('should handle missing field mappings', () => {
    const incompleteConfig = {
      ...basicConfig,
      fieldMapping: { y: 'value' }, // Missing x field
    };

    const { getByTestId } = render(
      <LineChart data={testData} config={incompleteConfig} />
    );
    
    expect(getByTestId('line-chart')).toBeInTheDocument();
    expect(getByTestId('mocked-responsive-line')).toHaveAttribute('data-series-count', '0');
  });

  it('should handle onEvent callback', () => {
    const mockOnEvent = vi.fn();
    
    const { getByTestId } = render(
      <LineChart data={testData} config={basicConfig} onEvent={mockOnEvent} />
    );
    
    expect(getByTestId('line-chart')).toBeInTheDocument();
  });

  it('should transform data for rendering', () => {
    // This test verifies that the component doesn't crash with various data scenarios
    const scenarios = [
      // Valid data
      [{ date: '2024-01-01', value: 100, category: 'A' }],
      // Invalid numeric values
      [{ date: '2024-01-01', value: 'invalid', category: 'A' }],
      // Missing values
      [{ date: null, value: 100, category: 'A' }],
      // Mixed date formats
      [{ date: new Date('2024-01-01'), value: 100, category: 'A' }],
    ];

    scenarios.forEach((data, index) => {
      const { getByTestId, unmount } = render(
        <LineChart data={data} config={basicConfig} key={index} />
      );
      expect(getByTestId('line-chart')).toBeInTheDocument();
      // Unmount the component to avoid duplicate test IDs
      unmount();
    });
  });
});
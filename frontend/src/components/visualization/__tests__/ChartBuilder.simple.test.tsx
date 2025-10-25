import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChartBuilder } from '../ChartBuilder';
import { suggestFieldMapping } from '../../../services/ai/ChartRecommendations';

// Mock the services
vi.mock('../../../services/export/ChartExporter', () => ({
  ChartExporter: {
    exportChart: vi.fn(),
    exportAsPNG: vi.fn(),
    exportAsPDF: vi.fn(),
    createShareableLink: vi.fn()
  }
}));

vi.mock('../../../services/ai/ChartRecommendations', () => ({
  getChartRecommendations: vi.fn(() => [
    { type: 'bar', confidence: 0.9, reasoning: 'Best for categorical data', suggestedMapping: { x: 'name', y: 'value' } }
  ]),
  suggestFieldMapping: vi.fn(() => ({ x: 'name', y: 'value' }))
}));

vi.mock('../../../services/ai/InsightGenerator', () => ({
  InsightGenerator: {
    generateInsights: vi.fn(() => Promise.resolve({
      insights: [
        { type: 'recommendation', content: 'Use bar chart for categorical data', confidence: 0.9 }
      ],
      confidence: 0.8,
      executiveSummary: 'Data analysis complete'
    }))
  }
}));

vi.mock('../../../utils/visualization/dataAnalysis', () => ({
  generateDataSchema: vi.fn(() => ({
    fields: [
      { name: 'name', type: 'categorical' },
      { name: 'value', type: 'numeric' },
      { name: 'category', type: 'categorical' }
    ]
  }))
}));

// Mock chart components
vi.mock('../../../components/visualization/charts/LineChart', () => ({
  LineChart: ({ data }: any) => (
    <div data-testid="line-chart">LineChart with {data.length} data points</div>
  )
}));

vi.mock('../../../components/visualization/charts/PieChart', () => ({
  PieChart: ({ data }: any) => (
    <div data-testid="pie-chart">PieChart with {data.length} data points</div>
  )
}));

vi.mock('../../../components/visualization/charts/AreaChart', () => ({
  AreaChart: ({ data }: any) => (
    <div data-testid="area-chart">AreaChart with {data.length} data points</div>
  )
}));

vi.mock('../../../components/visualization/charts/BoxPlot', () => ({
  BoxPlot: ({ data }: any) => (
    <div data-testid="boxplot-chart">BoxPlot with {data.length} data points</div>
  )
}));

vi.mock('../../../components/visualization/charts/Histogram', () => ({
  Histogram: ({ data }: any) => (
    <div data-testid="histogram-chart">Histogram with {data.length} data points</div>
  )
}));

vi.mock('../../../components/visualization/charts/HeatmapChart', () => ({
  HeatmapChart: ({ data }: any) => (
    <div data-testid="heatmap-chart">HeatmapChart with {data.length} data points</div>
  )
}));

// Mock other components
vi.mock('../../../components/report/ReportBuilder', () => ({
  ReportBuilder: ({ onClose }: any) => (
    <div data-testid="report-builder-modal">
      <button onClick={onClose}>Close Report Builder</button>
    </div>
  )
}));

vi.mock('../ChartCustomizer', () => ({
  ChartCustomizer: ({ onConfigChange }: any) => (
    <div data-testid="chart-customizer">
      <button onClick={() => onConfigChange({ title: 'Custom Title' })}>
        Apply Customization
      </button>
    </div>
  )
}));

vi.mock('../AIInsightsPanel', () => ({
  AIInsightsPanel: ({ insights, compact }: any) => (
    <div data-testid="ai-insights-panel" data-compact={compact}>
      AI Insights Panel - {insights?.insights?.length || 0} insights
    </div>
  )
}));

vi.mock('../FieldMapper', () => ({
  FieldMapper: ({ chartType }: any) => (
    <div data-testid="field-mapper" data-chart-type={chartType}>
      Field Mapper for {chartType}
    </div>
  )
}));

// Mock Recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ data, children }: any) => (
    <div data-testid="bar-chart" data-points={data?.length}>
      {children}
    </div>
  ),
  ScatterChart: ({ data, children }: any) => (
    <div data-testid="scatter-chart" data-points={data?.length}>
      {children}
    </div>
  ),
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Bar: () => <div data-testid="bar" />,
  Scatter: () => <div data-testid="scatter" />
}));

const mockData = [
  { name: 'A', value: 100, category: 'Cat1' },
  { name: 'B', value: 200, category: 'Cat2' },
  { name: 'C', value: 150, category: 'Cat1' }
];

describe('ChartBuilder - Core Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // The mocks are already set up via vi.mock() calls above
    // We just need to configure their return values via importing the mocked modules
  });

  describe('Basic Rendering', () => {
    it('renders the chart builder interface', () => {
      render(<ChartBuilder data={mockData} />);
      
      expect(screen.getByText('Chart Type')).toBeInTheDocument();
      expect(screen.getByText('Data Fields')).toBeInTheDocument();
      expect(screen.getByText('Simple')).toBeInTheDocument();
      expect(screen.getByText('Advanced')).toBeInTheDocument();
    });

    it('displays empty state when no data', () => {
      render(<ChartBuilder data={[]} />);
      
      expect(screen.getByText('No data available for visualization')).toBeInTheDocument();
    });

    it('switches between interface modes', async () => {
      render(<ChartBuilder data={mockData} />);
      
      // Should start in simple mode
      expect(screen.queryByText('Professional Chart Builder')).not.toBeInTheDocument();
      
      // Switch to advanced mode
      fireEvent.click(screen.getByText('Advanced'));
      
      await waitFor(() => {
        expect(screen.getByText('Professional Chart Builder')).toBeInTheDocument();
      });
    });
  });

  describe('Chart Type Selection', () => {
    it('renders chart type options', () => {
      render(<ChartBuilder data={mockData} />);
      
      expect(screen.getByText('Line Chart')).toBeInTheDocument();
      expect(screen.getAllByText('Bar Chart')).toHaveLength(2);
      expect(screen.getByText('Pie Chart')).toBeInTheDocument();
    });

    it('updates chart type on selection', async () => {
      const onConfigChange = vi.fn();
      render(<ChartBuilder data={mockData} onConfigChange={onConfigChange} />);
      
      fireEvent.click(screen.getByText('Line Chart'));
      
      await waitFor(() => {
        expect(onConfigChange).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'line'
          })
        );
      });
    });
  });

  describe('Field Mapping', () => {
    it('shows field selectors for different chart types', async () => {
      render(<ChartBuilder data={mockData} />);
      
      // Test line chart fields
      fireEvent.click(screen.getByText('Line Chart'));
      expect(screen.getByText('X Axis:')).toBeInTheDocument();
      expect(screen.getByText('Y Axis:')).toBeInTheDocument();
      
      // Test pie chart fields
      fireEvent.click(screen.getByText('Pie Chart'));
      expect(screen.getByText('Category Field:')).toBeInTheDocument();
      expect(screen.getByText('Value Field:')).toBeInTheDocument();
    });

    it('updates field mapping when selections change', async () => {
      const onConfigChange = vi.fn();
      render(<ChartBuilder data={mockData} onConfigChange={onConfigChange} />);
      
      // Select a field
      const select = screen.getAllByRole('combobox')[0];
      fireEvent.change(select, { target: { value: 'name' } });
      
      await waitFor(() => {
        expect(onConfigChange).toHaveBeenCalledWith(
          expect.objectContaining({
            fieldMapping: expect.objectContaining({
              x: 'name'
            })
          })
        );
      });
    });
  });

  describe('Chart Rendering', () => {
    it('renders charts based on selected type and field mapping', async () => {
      render(<ChartBuilder data={mockData} />);
      
      // Select line chart and set fields
      fireEvent.click(screen.getByText('Line Chart'));
      
      const xSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(xSelect, { target: { value: 'name' } });
      
      const ySelect = screen.getAllByRole('combobox')[1];
      fireEvent.change(ySelect, { target: { value: 'value' } });
      
      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });

    it('shows validation message when required fields are missing', () => {
      // Mock empty field mapping for this test
      (suggestFieldMapping as any).mockReturnValue({});
      
      render(<ChartBuilder data={mockData} />);
      
      fireEvent.click(screen.getByText('Line Chart'));
      
      // Should show validation message when no fields selected  
      expect(screen.getByText('Please select X and Y fields')).toBeInTheDocument();
    });
  });

  describe('UI Interactions', () => {
    it('opens and closes report builder modal', async () => {
      render(<ChartBuilder data={mockData} />);
      
      fireEvent.click(screen.getByText('Report'));
      
      await waitFor(() => {
        expect(screen.getByTestId('report-builder-modal')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByLabelText('Close Report Builder'));
      
      await waitFor(() => {
        expect(screen.queryByTestId('report-builder-modal')).not.toBeInTheDocument();
      });
    });

    it('toggles insights panel', () => {
      render(<ChartBuilder data={mockData} />);
      
      // Insights should be visible initially
      expect(screen.queryByTestId('ai-insights-panel')).toBeInTheDocument();
      
      // Toggle off
      fireEvent.click(screen.getByText('Insights'));
      expect(screen.queryByTestId('ai-insights-panel')).not.toBeInTheDocument();
      
      // Toggle back on
      fireEvent.click(screen.getByText('Insights'));
      expect(screen.queryByTestId('ai-insights-panel')).toBeInTheDocument();
    });

    it('toggles customization panel', () => {
      render(<ChartBuilder data={mockData} />);
      
      fireEvent.click(screen.getByText('Style'));
      
      expect(screen.getByTestId('chart-customizer')).toBeInTheDocument();
    });
  });

  describe('Advanced Mode Features', () => {
    beforeEach(async () => {
      render(<ChartBuilder data={mockData} />);
      fireEvent.click(screen.getByText('Advanced'));
      
      await waitFor(() => {
        expect(screen.getByText('Professional Chart Builder')).toBeInTheDocument();
      });
    });

    it('shows field mapper in advanced mode', () => {
      expect(screen.getByTestId('field-mapper')).toBeInTheDocument();
    });

    it('provides professional report option', () => {
      expect(screen.getByText('Professional Report')).toBeInTheDocument();
    });
  });

  describe('Configuration Changes', () => {
    it('calls onConfigChange when configuration updates', async () => {
      const onConfigChange = vi.fn();
      render(<ChartBuilder data={mockData} onConfigChange={onConfigChange} />);
      
      // Should be called with initial configuration
      await waitFor(() => {
        expect(onConfigChange).toHaveBeenCalledWith(
          expect.objectContaining({
            type: expect.any(String),
            title: expect.any(String),
            fieldMapping: expect.any(Object)
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('handles invalid data gracefully', () => {
      const invalidData = [
        { field1: null, field2: undefined }
      ];
      
      expect(() => {
        render(<ChartBuilder data={invalidData} />);
      }).not.toThrow();
      
      expect(screen.getByText('Chart Type')).toBeInTheDocument();
    });
  });
});
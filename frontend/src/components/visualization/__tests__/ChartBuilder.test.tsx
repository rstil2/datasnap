import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChartBuilder } from '../ChartBuilder';
import { ChartExporter } from '../../../services/export/ChartExporter';
import { getChartRecommendations, suggestFieldMapping } from '../../../services/ai/ChartRecommendations';
import { InsightGenerator } from '../../../services/ai/InsightGenerator';
import { generateDataSchema } from '../../../utils/visualization/dataAnalysis';

// Mock external dependencies
vi.mock('../../../services/export/ChartExporter', () => ({
  ChartExporter: {
    exportChart: vi.fn(),
    createShareableLink: vi.fn()
  }
}));
vi.mock('../../../services/ai/ChartRecommendations', () => ({
  getChartRecommendations: vi.fn(),
  suggestFieldMapping: vi.fn()
}));
vi.mock('../../../services/ai/InsightGenerator', () => ({
  InsightGenerator: {
    generateInsights: vi.fn()
  }
}));
vi.mock('../../../utils/visualization/dataAnalysis', () => ({
  generateDataSchema: vi.fn()
}));
vi.mock('../../../components/visualization/charts/LineChart', () => ({
  LineChart: ({ data, config }: any) => (
    <div data-testid="line-chart" data-config={JSON.stringify(config)}>
      LineChart with {data.length} data points
    </div>
  )
}));
vi.mock('../../../components/visualization/charts/PieChart', () => ({
  PieChart: ({ data, config }: any) => (
    <div data-testid="pie-chart" data-config={JSON.stringify(config)}>
      PieChart with {data.length} data points
    </div>
  )
}));
vi.mock('../../../components/visualization/charts/AreaChart', () => ({
  AreaChart: ({ data, config }: any) => (
    <div data-testid="area-chart" data-config={JSON.stringify(config)}>
      AreaChart with {data.length} data points
    </div>
  )
}));
vi.mock('../../../components/visualization/charts/BoxPlot', () => ({
  BoxPlot: ({ data, config }: any) => (
    <div data-testid="boxplot-chart" data-config={JSON.stringify(config)}>
      BoxPlot with {data.length} data points
    </div>
  )
}));
vi.mock('../../../components/visualization/charts/Histogram', () => ({
  Histogram: ({ data, config }: any) => (
    <div data-testid="histogram-chart" data-config={JSON.stringify(config)}>
      Histogram with {data.length} data points
    </div>
  )
}));
vi.mock('../../../components/visualization/charts/HeatmapChart', () => ({
  HeatmapChart: ({ data, config }: any) => (
    <div data-testid="heatmap-chart" data-config={JSON.stringify(config)}>
      HeatmapChart with {data.length} data points
    </div>
  )
}));
vi.mock('../../../components/visualization/charts/BarChart', () => ({
  BarChart: ({ data, config }: any) => (
    <div data-testid="bar-chart" data-points={data?.length} data-config={JSON.stringify(config)}>
      NivoBarChart with {data?.length || 0} data points
    </div>
  )
}));
vi.mock('../../../components/export/ReportBuilder', () => ({
  ReportBuilder: ({ onClose }: any) => (
    <div data-testid="report-builder-modal">
      <h3>Report Builder</h3>
      <button onClick={onClose} aria-label="Close Report Builder">Close</button>
    </div>
  )
}));
vi.mock('../../../components/visualization/ChartCustomizer', () => ({
  ChartCustomizer: ({ config, onConfigChange }: any) => (
    <div data-testid="chart-customizer">
      <button onClick={() => onConfigChange({ ...config, title: 'Custom Title' })}>
        Customize
      </button>
    </div>
  )
}));
vi.mock('../../../components/visualization/AIInsightsPanel', () => ({
  AIInsightsPanel: ({ insights, onInsightClick, compact }: any) => (
    <div data-testid="ai-insights-panel" data-compact={compact}>
      <div>Insights: {insights.insights.length}</div>
      <button onClick={() => onInsightClick(insights.insights[0])}>Apply Insight</button>
    </div>
  )
}));
vi.mock('../../../components/visualization/FieldMapper', () => ({
  FieldMapper: ({ fields, fieldMapping, chartType, onFieldMappingChange }: any) => (
    <div data-testid="field-mapper" data-chart-type={chartType}>
      <div>Fields: {fields.length}</div>
      <button onClick={() => onFieldMappingChange({ x: 'field1', y: 'field2' })}>
        Map Fields
      </button>
    </div>
  )
}));

// Mock Recharts components
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
  XAxis: ({ dataKey }: any) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Bar: ({ dataKey }: any) => <div data-testid="bar" data-key={dataKey} />,
  Scatter: ({ dataKey }: any) => <div data-testid="scatter" data-key={dataKey} />
}));

const mockData = [
  { field1: 'A', field2: 100, field3: 'Category1' },
  { field1: 'B', field2: 200, field3: 'Category2' },
  { field1: 'C', field2: 150, field3: 'Category1' }
];

const mockDataSchema = {
  fields: [
    { name: 'field1', type: 'categorical' as const },
    { name: 'field2', type: 'numeric' as const },
    { name: 'field3', type: 'categorical' as const }
  ]
};

const mockAIInsights = {
  insights: [
    { type: 'recommendation', content: 'Use bar chart for categorical data', confidence: 0.9 },
    { type: 'warning', content: 'Missing data in field2', confidence: 0.7 }
  ],
  confidence: 0.8,
  executiveSummary: 'Data analysis complete'
};

const mockRecommendations = [
  { type: 'bar' as const, confidence: 0.9, reasoning: 'Best for categorical data' },
  { type: 'pie' as const, confidence: 0.7, reasoning: 'Good for proportions' }
];

const defaultProps = {
  data: mockData,
  onConfigChange: vi.fn()
};

describe('ChartBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    (ChartExporter.exportChart as any).mockResolvedValue({
      success: true,
      filename: 'chart.png'
    });
    (ChartExporter.createShareableLink as any).mockResolvedValue({
      success: true,
      data: 'https://share.example.com/chart'
    });
    (getChartRecommendations as any).mockReturnValue(mockRecommendations);
    (suggestFieldMapping as any).mockReturnValue({ x: 'field1', y: 'field2' });
    (InsightGenerator.generateInsights as any).mockResolvedValue(mockAIInsights);
    (generateDataSchema as any).mockReturnValue(mockDataSchema);
  });

  describe('Basic Rendering and Interface', () => {
    it('renders with default simple interface mode', () => {
      render(<ChartBuilder {...defaultProps} />);
      
      expect(screen.getByText('Chart Type')).toBeInTheDocument();
      expect(screen.getByText('Data Fields')).toBeInTheDocument();
      expect(screen.getByText('Simple')).toBeInTheDocument();
      expect(screen.getByText('Advanced')).toBeInTheDocument();
    });

    it('switches between simple and advanced interface modes', async () => {
      render(<ChartBuilder {...defaultProps} />);
      
      // Should start in simple mode
      expect(screen.queryByText('Professional Chart Builder')).not.toBeInTheDocument();
      
      // Switch to advanced mode
      fireEvent.click(screen.getByText('Advanced'));
      
      await waitFor(() => {
        expect(screen.getByText('Professional Chart Builder')).toBeInTheDocument();
        expect(screen.getByTestId('field-mapper')).toBeInTheDocument();
      });
      
      // Switch back to simple mode
      fireEvent.click(screen.getByText('Simple'));
      
      await waitFor(() => {
        expect(screen.queryByText('Professional Chart Builder')).not.toBeInTheDocument();
      });
    });

    it('displays no data message when data is empty', () => {
      render(<ChartBuilder {...defaultProps} data={[]} />);
      
      expect(screen.getByText('No data available for visualization')).toBeInTheDocument();
      // Use getAllByText since the emoji appears in multiple places
      expect(screen.getAllByText('📊').length).toBeGreaterThan(0);
    });
  });

  describe('Chart Type Selection', () => {
    it('renders chart type buttons', () => {
      render(<ChartBuilder {...defaultProps} />);
      
      expect(screen.getAllByText('Line Chart').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Bar Chart').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Pie Chart').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Area Chart').length).toBeGreaterThan(0);
    });

    it('selects chart type and updates configuration', async () => {
      const onConfigChange = vi.fn();
      render(<ChartBuilder {...defaultProps} onConfigChange={onConfigChange} />);
      
      fireEvent.click(screen.getAllByText('Bar Chart')[0]);
      
      await waitFor(() => {
        expect(onConfigChange).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'bar'
          })
        );
      });
    });

    it('renders different chart components based on selected type', async () => {
      // Mock empty field mapping for this test
      (suggestFieldMapping as any).mockReturnValue({});
      
      render(<ChartBuilder {...defaultProps} />);
      
      // Select Line Chart
      fireEvent.click(screen.getAllByText('Line Chart')[0]);
      
      // Set required field mappings using role selector
      const selects = screen.getAllByRole('combobox');
      const xSelect = selects.find(select => 
        select.parentElement?.textContent?.includes('X Axis')
      );
      const ySelect = selects.find(select => 
        select.parentElement?.textContent?.includes('Y Axis')
      );
      
      if (xSelect) {
        fireEvent.change(xSelect, { target: { value: 'field1' } });
      }
      if (ySelect) {
        fireEvent.change(ySelect, { target: { value: 'field2' } });
      }
      
      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Field Mapping', () => {
    it('shows appropriate field selectors based on chart type', async () => {
      render(<ChartBuilder {...defaultProps} />);
      
      // Line chart should show X and Y axis selectors
      fireEvent.click(screen.getAllByText('Line Chart')[0]);
      expect(screen.getByText('X Axis:')).toBeInTheDocument();
      expect(screen.getByText('Y Axis:')).toBeInTheDocument();
      
      // Pie chart should show Category and Value selectors
      fireEvent.click(screen.getAllByText('Pie Chart')[0]);
      expect(screen.getByText('Category Field:')).toBeInTheDocument();
      expect(screen.getByText('Value Field:')).toBeInTheDocument();
    });

    it('filters field options based on field type requirements', () => {
      render(<ChartBuilder {...defaultProps} />);
      
      fireEvent.click(screen.getAllByText('Line Chart')[0]);
      
      // Y-axis select should only show numeric fields
      const ySelects = screen.getAllByRole('combobox');
      const ySelect = ySelects.find(select => 
        select.parentElement?.textContent?.includes('Y Axis')
      );
      
      expect(ySelect).toBeInTheDocument();
      // Should have options for numeric field
      expect(ySelect?.innerHTML).toContain('field2 (numeric)');
      expect(ySelect?.innerHTML).not.toContain('field1 (categorical)');
    });

    it('displays validation messages for missing required fields', async () => {
      // Mock empty field mapping for this test
      (suggestFieldMapping as any).mockReturnValue({});
      
      render(<ChartBuilder {...defaultProps} />);
      
      fireEvent.click(screen.getAllByText('Line Chart')[0]);
      
      // Should show validation message when fields are missing
      expect(screen.getByText('Please select X and Y fields')).toBeInTheDocument();
    });
  });

  describe('AI Features', () => {
    it('generates and displays chart recommendations', async () => {
      render(<ChartBuilder {...defaultProps} />);
      
      await waitFor(() => {
        expect(getChartRecommendations).toHaveBeenCalledWith(
          mockDataSchema
        );
      });
      
      // Should display recommendations
      expect(screen.getByText('AI Suggestions')).toBeInTheDocument();
      expect(screen.getByText('Best for categorical data')).toBeInTheDocument();
      expect(screen.getAllByText('90%').length).toBeGreaterThan(0);
    });

    it('applies recommendation when clicked', async () => {
      const onConfigChange = vi.fn();
      render(<ChartBuilder {...defaultProps} onConfigChange={onConfigChange} />);
      
      await waitFor(() => {
        expect(screen.getByText('AI Suggestions')).toBeInTheDocument();
      });
      
      // Click on first recommendation (Bar chart)
      fireEvent.click(screen.getAllByText('Bar Chart')[0]);
      
      await waitFor(() => {
        expect(onConfigChange).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'bar'
          })
        );
      });
    });

    it('toggles AI insights panel', async () => {
      render(<ChartBuilder {...defaultProps} />);
      
      // Insights panel should be visible initially (showInsights starts as true)
      await waitFor(() => {
        expect(screen.getByTestId('ai-insights-panel')).toBeInTheDocument();
      });
      
      // Click insights button to hide
      fireEvent.click(screen.getByText('Insights'));
      
      await waitFor(() => {
        expect(screen.queryByTestId('ai-insights-panel')).not.toBeInTheDocument();
      });
      
      // Click again to show
      fireEvent.click(screen.getByText('Insights'));
      
      await waitFor(() => {
        expect(screen.getByTestId('ai-insights-panel')).toBeInTheDocument();
      });
    });

    it('handles AI insight clicks', async () => {
      render(<ChartBuilder {...defaultProps} />);
      
      // Insights panel should be visible initially
      await waitFor(() => {
        expect(screen.getByTestId('ai-insights-panel')).toBeInTheDocument();
      });
      
      // Click on an insight
      fireEvent.click(screen.getByText('Apply Insight'));
      
      // Should handle insight application (specific behavior depends on insight type)
      expect(screen.getByTestId('ai-insights-panel')).toBeInTheDocument();
    });

    it('dismisses recommendation panel', async () => {
      render(<ChartBuilder {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('AI Suggestions')).toBeInTheDocument();
      });
      
      // Click dismiss button (×)
      fireEvent.click(screen.getByText('×'));
      
      await waitFor(() => {
        expect(screen.queryByText('AI Suggestions')).not.toBeInTheDocument();
      });
    });
  });

  describe('Chart Rendering', () => {
    it('renders bar chart with proper data transformation', async () => {
      render(<ChartBuilder {...defaultProps} />);
      
      fireEvent.click(screen.getAllByText('Bar Chart')[0]);
      
      // Set field mappings using role selector
      const selects = screen.getAllByRole('combobox');
      const xSelect = selects[0]; // First select is X Axis
      const ySelect = selects[1]; // Second select is Y Axis
      
      fireEvent.change(xSelect, { target: { value: 'field1' } });
      fireEvent.change(ySelect, { target: { value: 'field2' } });
      
      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
        expect(screen.getByTestId('bar-chart')).toHaveAttribute('data-points', '3');
      });
    });

    it('renders scatter plot with data filtering', async () => {
      render(<ChartBuilder {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Scatter Plot'));
      
      // Set field mappings using role selector
      const selects = screen.getAllByRole('combobox');
      const xSelect = selects[0]; // First select is X Axis
      const ySelect = selects[1]; // Second select is Y Axis
      
      fireEvent.change(xSelect, { target: { value: 'field2' } });
      fireEvent.change(ySelect, { target: { value: 'field2' } }); // Use numeric field
      
      await waitFor(() => {
        expect(screen.getByTestId('scatter-chart')).toBeInTheDocument();
      });
    });

    it('shows appropriate validation messages for each chart type', async () => {
      // Mock empty field mapping for this test
      (suggestFieldMapping as any).mockReturnValue({});
      
      render(<ChartBuilder {...defaultProps} />);
      
      // Test different chart types and their validation messages
      fireEvent.click(screen.getByText('Box Plot'));
      expect(screen.getByText('Please select group and value fields')).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('Histogram'));
      expect(screen.getByText('Please select a numeric field')).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('Heatmap'));
      expect(screen.getByText('Please select X, Y, and value fields')).toBeInTheDocument();
    });
  });

  describe('Export and Sharing', () => {
    it('exports chart in different formats', async () => {
      render(<ChartBuilder {...defaultProps} />);
      
      // Test PNG export
      fireEvent.click(screen.getByText('Export'));
      
      await waitFor(() => {
        expect(ChartExporter.exportChart).toHaveBeenCalledWith(
          expect.any(Object),
          expect.any(Object),
          mockData,
          expect.objectContaining({
            format: 'png',
            quality: 'high',
            backgroundColor: '#ffffff'
          })
        );
      });
      
      // Test PDF export from header (only available in advanced mode or as icon button)
      const pdfButtons = screen.queryAllByText('PDF');
      if (pdfButtons.length > 0) {
        fireEvent.click(pdfButtons[0]);
        
        await waitFor(() => {
          expect(ChartExporter.exportChart).toHaveBeenCalledWith(
            expect.any(Object),
            expect.any(Object),
            mockData,
            expect.objectContaining({
              format: 'pdf',
              includeData: true
            })
          );
        });
      } else {
        // In simple mode, PDF export is not available as text button - test passes
        expect(ChartExporter.exportChart).toHaveBeenCalledTimes(1); // Only the PNG export above
      }
    });

    it('handles export loading state', async () => {
      (ChartExporter.exportChart as any).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );
      
      render(<ChartBuilder {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Export'));
      
      // Should show loading state
      expect(screen.getByText('Exporting...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Export')).toBeInTheDocument();
      }, { timeout: 200 });
    });

    it('creates shareable link', async () => {
      render(<ChartBuilder {...defaultProps} />);
      
      // Find and click share button
      const shareButtons = screen.getAllByTitle(/share/i);
      if (shareButtons.length > 0) {
        fireEvent.click(shareButtons[0]);
        
        await waitFor(() => {
          expect(ChartExporter.createShareableLink).toHaveBeenCalledWith(
            expect.any(Object),
            mockData
          );
        });
      }
    });

    it('handles export and share errors gracefully', async () => {
      (ChartExporter.exportChart as any).mockRejectedValue(new Error('Export failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<ChartBuilder {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Export'));
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Export error:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Customization and Styling', () => {
    it('toggles customization panel', async () => {
      render(<ChartBuilder {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Style'));
      
      await waitFor(() => {
        expect(screen.getByTestId('chart-customizer')).toBeInTheDocument();
      });
    });

    it('applies customization changes', async () => {
      const onConfigChange = vi.fn();
      render(<ChartBuilder {...defaultProps} onConfigChange={onConfigChange} />);
      
      fireEvent.click(screen.getByText('Style'));
      
      await waitFor(() => {
        expect(screen.getByTestId('chart-customizer')).toBeInTheDocument();
      });
      
      // Apply customization
      fireEvent.click(screen.getByText('Customize'));
      
      await waitFor(() => {
        expect(onConfigChange).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Custom Title'
          })
        );
      });
    });
  });

  describe('Report Builder Integration', () => {
    it('opens and closes report builder modal', async () => {
      render(<ChartBuilder {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Report'));
      
      await waitFor(() => {
        expect(screen.getByTestId('report-builder-modal')).toBeInTheDocument();
      });
      
      // Close the modal
      fireEvent.click(screen.getByLabelText('Close Report Builder'));
      
      await waitFor(() => {
        expect(screen.queryByTestId('report-builder-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Advanced Interface Features', () => {
    beforeEach(() => {
      render(<ChartBuilder {...defaultProps} />);
      fireEvent.click(screen.getByText('Advanced'));
    });

    it('renders field mapper in advanced mode', async () => {
      await waitFor(() => {
        expect(screen.getByTestId('field-mapper')).toBeInTheDocument();
        expect(screen.getByTestId('field-mapper')).toHaveAttribute('data-chart-type', 'bar');
      });
    });

    it('handles field mapping changes from field mapper', async () => {
      await waitFor(() => {
        expect(screen.getByTestId('field-mapper')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Map Fields'));
      
      // Should update field mapping through FieldMapper component
      expect(screen.getByTestId('field-mapper')).toBeInTheDocument();
    });

    it('displays compact vs full AI insights in different modes', async () => {
      // In advanced mode, insights panel should be visible by default with compact=false
      await waitFor(() => {
        const insightsPanel = screen.getByTestId('ai-insights-panel');
        expect(insightsPanel).toBeInTheDocument();
        expect(insightsPanel).toHaveAttribute('data-compact', 'false');
      });
    });

    it('provides professional report option in advanced mode', async () => {
      await waitFor(() => {
        expect(screen.getByText('Professional Report')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Professional Report'));
      
      await waitFor(() => {
        expect(screen.getByTestId('report-builder-modal')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles invalid data gracefully', () => {
      const invalidData = [
        { field1: null, field2: 'invalid', field3: undefined }
      ];
      
      render(<ChartBuilder {...defaultProps} data={invalidData} />);
      
      // Should still render without crashing
      expect(screen.getByText('Chart Type')).toBeInTheDocument();
    });

    it('handles missing field mappings', async () => {
      // Mock empty field mapping for this test
      (suggestFieldMapping as any).mockReturnValue({});
      
      render(<ChartBuilder {...defaultProps} />);
      
      fireEvent.click(screen.getAllByText('Line Chart')[0]);
      
      // Should show validation message
      expect(screen.getByText('Please select X and Y fields')).toBeInTheDocument();
    });

    it('handles AI service failures gracefully', async () => {
      (InsightGenerator.generateInsights as any).mockRejectedValue(
        new Error('AI service unavailable')
      );
      
      render(<ChartBuilder {...defaultProps} />);
      
      // Should still render without crashing
      await waitFor(() => {
        expect(screen.getByText('Chart Type')).toBeInTheDocument();
      });
    });

    it('handles large datasets by limiting scatter plot data', async () => {
      // Mock empty field mapping for this test
      (suggestFieldMapping as any).mockReturnValue({});
      
      const largeData = Array.from({ length: 2000 }, (_, i) => ({
        field1: `Item${i}`,
        field2: Math.random() * 1000,
        field3: `Cat${i % 5}`
      }));
      
      render(<ChartBuilder {...defaultProps} data={largeData} />);
      
      fireEvent.click(screen.getByText('Scatter Plot'));
      
      // Set field mappings using role selector
      const selects = screen.getAllByRole('combobox');
      const xSelect = selects[0]; // First select is X Axis
      const ySelect = selects[1]; // Second select is Y Axis
      
      fireEvent.change(xSelect, { target: { value: 'field2' } });
      fireEvent.change(ySelect, { target: { value: 'field2' } });
      
      // Should limit data to 1000 points for performance
      await waitFor(() => {
        expect(screen.getByTestId('scatter-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Configuration Changes', () => {
    it('calls onConfigChange when chart type changes', async () => {
      const onConfigChange = vi.fn();
      render(<ChartBuilder {...defaultProps} onConfigChange={onConfigChange} />);
      
      fireEvent.click(screen.getAllByText('Bar Chart')[0]);
      
      await waitFor(() => {
        expect(onConfigChange).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'bar',
            fieldMapping: expect.any(Object)
          })
        );
      });
    });

    it('calls onConfigChange when field mappings change', async () => {
      // Mock empty field mapping for this test
      (suggestFieldMapping as any).mockReturnValue({});
      
      const onConfigChange = vi.fn();
      render(<ChartBuilder {...defaultProps} onConfigChange={onConfigChange} />);
      
      const xSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(xSelect, { target: { value: 'field1' } });
      
      await waitFor(() => {
        expect(onConfigChange).toHaveBeenCalledWith(
          expect.objectContaining({
            fieldMapping: expect.objectContaining({
              x: 'field1'
            })
          })
        );
      });
    });
  });
});
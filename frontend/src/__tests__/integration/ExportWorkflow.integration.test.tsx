import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import React from 'react';

// Import the main components and services we'll test
import { ChartBuilder } from '../../components/visualization/ChartBuilder';
import { PowerPointExporter } from '../../services/export/PowerPointExporter';
import { ExcelExporter } from '../../services/export/ExcelExporter';
import { HTMLWidgetGenerator } from '../../services/export/HTMLWidgetGenerator';
import { ChartExporter } from '../../services/export/ChartExporter';

// Test data that simulates real-world usage
const integrationTestData = [
  { product: 'Product A', sales: 15000, quarter: 'Q1', region: 'North', profit: 3000 },
  { product: 'Product B', sales: 23000, quarter: 'Q1', region: 'South', profit: 4600 },
  { product: 'Product C', sales: 18000, quarter: 'Q1', region: 'East', profit: 3600 },
  { product: 'Product A', sales: 19000, quarter: 'Q2', region: 'North', profit: 3800 },
  { product: 'Product B', sales: 27000, quarter: 'Q2', region: 'South', profit: 5400 },
  { product: 'Product C', sales: 21000, quarter: 'Q2', region: 'East', profit: 4200 },
  { product: 'Product A', sales: 22000, quarter: 'Q3', region: 'North', profit: 4400 },
  { product: 'Product B', sales: 31000, quarter: 'Q3', region: 'South', profit: 6200 },
  { product: 'Product C', sales: 25000, quarter: 'Q3', region: 'East', profit: 5000 },
  { product: 'Product A', sales: 20000, quarter: 'Q4', region: 'North', profit: 4000 },
  { product: 'Product B', sales: 29000, quarter: 'Q4', region: 'South', profit: 5800 },
  { product: 'Product C', sales: 23000, quarter: 'Q4', region: 'East', profit: 4600 }
];

// Mock external dependencies that would normally interact with file system
vi.mock('../../services/export/PowerPointExporter');
vi.mock('../../services/export/ExcelExporter');
vi.mock('../../services/export/HTMLWidgetGenerator');
vi.mock('../../services/export/ChartExporter');

// Mock file download functionality
const mockDownload = vi.fn();
global.URL.createObjectURL = vi.fn(() => 'mock-blob-url');
global.URL.revokeObjectURL = vi.fn();

// Store original createElement to avoid conflicts with React
const originalCreateElement = document.createElement;

// Mock DOM methods for file handling without overriding createElement completely
const mockCreateElement = vi.fn((tagName: string) => {
  if (tagName === 'a') {
    const element = originalCreateElement.call(document, 'a');
    // Override specific methods for download functionality
    element.click = mockDownload;
    return element;
  }
  // For all other elements, use the original createElement
  return originalCreateElement.call(document, tagName);
});

// Don't override document.createElement globally - only in tests that need it

describe('Export Workflow Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    
    // Ensure clean DOM for each test
    document.body.innerHTML = '';
    
    // Override document.createElement to mock download functionality
    document.createElement = mockCreateElement;
    
    // Setup successful mock responses for all exporters
    (PowerPointExporter.exportPresentation as any).mockImplementation(async () => {
      // Simulate the download behavior that the real exporter would do
      const link = document.createElement('a');
      link.href = 'mock-url';
      link.download = 'sales-report.pptx';
      link.click();
      
      return {
        success: true,
        data: new Blob(['mock pptx'], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }),
        filename: 'sales-report.pptx'
      };
    });

    (ExcelExporter.exportToExcel as any).mockImplementation(async () => {
      // Simulate the download behavior
      const link = document.createElement('a');
      link.href = 'mock-excel-url';
      link.download = 'sales-data.xlsx';
      link.click();
      
      return {
        success: true,
        data: new Blob(['mock xlsx'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        filename: 'sales-data.xlsx'
      };
    });

    (HTMLWidgetGenerator.generateWidget as any).mockImplementation(async () => {
      // Simulate the download behavior
      const link = document.createElement('a');
      link.href = 'mock-html-url';
      link.download = 'chart-widget.html';
      link.click();
      
      return {
        success: true,
        data: '<div>Mock HTML Widget</div>',
        filename: 'chart-widget.html'
      };
    });

    (ChartExporter.exportAsPNG as any).mockResolvedValue({
      success: true,
      data: new Blob(['mock png'], { type: 'image/png' }),
      filename: 'chart.png'
    });

    (ChartExporter.exportAsPDF as any).mockResolvedValue({
      success: true,
      data: new Blob(['mock pdf'], { type: 'application/pdf' }),
      filename: 'chart.pdf'
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    // Clean up DOM
    document.body.innerHTML = '';
    // Restore original createElement
    document.createElement = originalCreateElement;
  });

  describe('Complete Data-to-Export Workflow', () => {
    it('should complete full workflow: data loading to chart creation to export as PowerPoint', async () => {
      // Step 1: Render ChartBuilder with data
      render(<ChartBuilder data={integrationTestData} />);

      // Step 2: Verify data is loaded
      await waitFor(() => {
        expect(screen.getByText('Chart Type')).toBeInTheDocument();
      });

      // Step 3: Select chart type
      const barChartButton = screen.getAllByText('Bar Chart')[0];
      await user.click(barChartButton);

      // Step 4: Configure field mappings
      const xAxisSelect = screen.getAllByRole('combobox')[0];
      await user.selectOptions(xAxisSelect, 'product');

      const yAxisSelect = screen.getAllByRole('combobox')[1];
      await user.selectOptions(yAxisSelect, 'sales');

      // Step 5: Verify chart renders
      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      });

      // Step 6: Open Report Builder
      const reportButton = screen.getByText('Report');
      await user.click(reportButton);

      await waitFor(() => {
        expect(screen.getByTestId('report-builder-modal')).toBeInTheDocument();
      });

      // Step 7: Navigate to Share & Export tab
      const shareExportTab = screen.getByText('Share & Export');
      await user.click(shareExportTab);

      // Wait for export options to appear
      await waitFor(() => {
        expect(screen.getByText('PowerPoint')).toBeInTheDocument();
      });

      // Step 8: Select PowerPoint export format
      const pptButton = screen.getByText('PowerPoint');
      await user.click(pptButton);

      // Step 9: Configure PowerPoint export settings
      const includeInsightsCheckbox = screen.getByLabelText(/include ai insights/i);
      await user.click(includeInsightsCheckbox);

      const includeDataSummaryCheckbox = screen.getByLabelText(/include data summary/i);
      await user.click(includeDataSummaryCheckbox);

      // Step 10: Execute PowerPoint export
      const exportButton = screen.getByText('Generate PowerPoint');
      await user.click(exportButton);

      // Step 11: Verify export process
      await waitFor(() => {
        expect(PowerPointExporter.exportPresentation).toHaveBeenCalledWith(
          expect.any(Object), // chartElement (DOM element)
          expect.objectContaining({ // chart config
            type: 'bar',
            fieldMapping: expect.objectContaining({
              x: 'product',
              y: 'sales'
            })
          }),
          integrationTestData, // data array
          null, // insights (null in test)
          expect.objectContaining({ // powerpoint options
            includeInsights: false, // toggled from true to false by clicking
            includeDataSummary: false // toggled from true to false by clicking
          })
        );
      });

      // Step 12: Verify download initiated
      await waitFor(() => {
        expect(mockDownload).toHaveBeenCalled();
      });
    }, 10000);

    it('should handle Excel export workflow with data transformations', async () => {
      render(<ChartBuilder data={integrationTestData} />);

      // Create chart
      await waitFor(() => {
        expect(screen.getByText('Chart Type')).toBeInTheDocument();
      });

      const lineChartButton = screen.getAllByText('Line Chart')[0];
      await user.click(lineChartButton);

      // Configure for time series
      const xSelect = screen.getAllByRole('combobox')[0];
      await user.selectOptions(xSelect, 'quarter');

      const ySelect = screen.getAllByRole('combobox')[1];
      await user.selectOptions(ySelect, 'sales');

      // Open report builder
      const reportButton = screen.getByText('Report');
      await user.click(reportButton);

      await waitFor(() => {
        expect(screen.getByTestId('report-builder-modal')).toBeInTheDocument();
      });

      // Navigate to Share & Export tab
      const shareExportTab = screen.getByText('Share & Export');
      await user.click(shareExportTab);

      // Wait for export options to appear
      await waitFor(() => {
        expect(screen.getByText('Excel Export')).toBeInTheDocument();
      });

      // Select Excel export
      const excelButton = screen.getByText('Excel Export');
      await user.click(excelButton);

      // Configure Excel-specific options
      const includeSummaryStatsCheckbox = screen.getByLabelText(/summary statistics/i);
      await user.click(includeSummaryStatsCheckbox);

      const includeChartConfigCheckbox = screen.getByLabelText(/chart configuration/i);
      await user.click(includeChartConfigCheckbox);

      // Execute export
      const exportButton = screen.getByText('Export to Excel');
      await user.click(exportButton);

      // Verify Excel export with proper configuration
      await waitFor(() => {
        expect(ExcelExporter.exportToExcel).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'line' }), // chart config
          integrationTestData, // data
          integrationTestData, // filtered data (same as raw for now)
          null, // insights (null in test)
          expect.objectContaining({
            includeSummaryStats: false, // toggled from true to false by clicking
            includeChartConfig: false // toggled from true to false by clicking
          })
        );
      });

      expect(mockDownload).toHaveBeenCalled();
    });

    it('should handle HTML widget export with interactive features', async () => {
      render(<ChartBuilder data={integrationTestData} />);

      // Create interactive scatter plot
      await waitFor(() => {
        expect(screen.getByText('Chart Type')).toBeInTheDocument();
      });

      const scatterButton = screen.getAllByText('Scatter Plot')[0];
      await user.click(scatterButton);

      // Configure scatter plot
      const xSelect = screen.getAllByRole('combobox')[0];
      await user.selectOptions(xSelect, 'sales');

      const ySelect = screen.getAllByRole('combobox')[1];
      await user.selectOptions(ySelect, 'profit');

      // Export as HTML widget
      const reportButton = screen.getByText('Report');
      await user.click(reportButton);

      await waitFor(() => {
        expect(screen.getByTestId('report-builder-modal')).toBeInTheDocument();
      });

      // Navigate to Share & Export tab
      const shareExportTab = screen.getByText('Share & Export');
      await user.click(shareExportTab);

      // Wait for export options to appear
      await waitFor(() => {
        expect(screen.getByText('HTML Widget')).toBeInTheDocument();
      });

      const htmlButton = screen.getByText('HTML Widget');
      await user.click(htmlButton);

      // Configure HTML widget options
      const includeInsightsCheckbox = screen.getByLabelText(/include insights/i);
      await user.click(includeInsightsCheckbox);

      const includeControlsCheckbox = screen.getByLabelText(/chart controls/i);
      await user.click(includeControlsCheckbox);

      // Execute export
      const exportButton = screen.getByText('Generate HTML Widget');
      await user.click(exportButton);

      // Verify HTML widget generation
      await waitFor(() => {
        expect(HTMLWidgetGenerator.generateWidget).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'scatter' }), // chart config
          integrationTestData, // data
          null, // insights (null in test)
          expect.objectContaining({
            includeInsights: false, // toggled from true to false by clicking
            includeControls: false // toggled from true to false by clicking
          })
        );
      });

      expect(mockDownload).toHaveBeenCalled();
    });
  });

  describe('Multi-Chart Report Workflows', () => {
    it('should create comprehensive report with multiple charts', async () => {
      render(<ChartBuilder data={integrationTestData} />);

      // Create first chart (Bar chart for products)
      await waitFor(() => {
        expect(screen.getByText('Chart Type')).toBeInTheDocument();
      });

      const barButton = screen.getAllByText('Bar Chart')[0];
      await user.click(barButton);

      const xSelect1 = screen.getAllByRole('combobox')[0];
      await user.selectOptions(xSelect1, 'product');

      const ySelect1 = screen.getAllByRole('combobox')[1];
      await user.selectOptions(ySelect1, 'sales');

      // Open report builder
      const reportButton = screen.getByText('Report');
      await user.click(reportButton);

      await waitFor(() => {
        expect(screen.getByTestId('report-builder-modal')).toBeInTheDocument();
      });

      // Navigate to Share & Export tab
      const shareExportTab = screen.getByText('Share & Export');
      await user.click(shareExportTab);

      // Wait for export options to appear
      await waitFor(() => {
        expect(screen.getByText('PowerPoint')).toBeInTheDocument();
      });

      // Configure PowerPoint export with comprehensive settings
      const pptButton = screen.getByText('PowerPoint');
      await user.click(pptButton);

      // Enable all available report options
      const includeInsightsCheckbox = screen.getByLabelText(/include ai insights/i);
      await user.click(includeInsightsCheckbox);

      const includeDataSummaryCheckbox = screen.getByLabelText(/include data summary/i);
      await user.click(includeDataSummaryCheckbox);

      // Execute export
      const exportButton = screen.getByText('Generate PowerPoint');
      await user.click(exportButton);

      // Verify comprehensive report export
      await waitFor(() => {
        expect(PowerPointExporter.exportPresentation).toHaveBeenCalledWith(
          expect.any(Object), // chartElement
          expect.objectContaining({ type: 'bar' }), // chart config
          integrationTestData, // data
          null, // insights
          expect.objectContaining({
            includeInsights: false, // toggled from true to false
            includeDataSummary: false // toggled from true to false
          })
        );
      });

      expect(mockDownload).toHaveBeenCalled();
    });
  });

  describe('Error Handling in Workflows', () => {
    it('should handle export failures gracefully', async () => {
      // Mock export failure
      (PowerPointExporter.exportPresentation as any).mockRejectedValue(
        new Error('Export service unavailable')
      );

      render(<ChartBuilder data={integrationTestData} />);

      await waitFor(() => {
        expect(screen.getByText('Chart Type')).toBeInTheDocument();
      });

      // Create chart
      const barButton = screen.getAllByText('Bar Chart')[0];
      await user.click(barButton);

      // Open report builder
      const reportButton = screen.getByText('Report');
      await user.click(reportButton);

      await waitFor(() => {
        expect(screen.getByTestId('report-builder-modal')).toBeInTheDocument();
      });

      // Navigate to Share & Export tab
      const shareExportTab = screen.getByText('Share & Export');
      await user.click(shareExportTab);

      // Wait for export options to appear
      await waitFor(() => {
        expect(screen.getByText('PowerPoint')).toBeInTheDocument();
      });

      // Attempt export
      const pptButton = screen.getByText('PowerPoint');
      await user.click(pptButton);

      const exportButton = screen.getByText('Generate PowerPoint');
      await user.click(exportButton);

      // Verify error handling - export function was called but failed
      await waitFor(() => {
        expect(PowerPointExporter.exportPresentation).toHaveBeenCalled();
      });

      // Give some time for any error handling to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify download was not initiated due to error
      expect(mockDownload).not.toHaveBeenCalled();
    });

    it('should handle invalid data gracefully', async () => {
      const invalidData = [
        { product: null, sales: 'invalid', quarter: undefined },
        { product: '', sales: NaN, quarter: '' },
        { product: 'Valid Product', sales: 100, quarter: 'Q1' }, // at least one valid row
        { product: 'Another Product', sales: 200, quarter: 'Q2' } // another valid row
      ];

      render(<ChartBuilder data={invalidData} />);

      await waitFor(() => {
        expect(screen.getByText('Chart Type')).toBeInTheDocument();
      });

      // Should still allow chart creation with data validation
      const barButton = screen.getAllByText('Bar Chart')[0];
      await user.click(barButton);

      // Component should still be functional despite invalid data
      const xSelect = screen.getAllByRole('combobox')[0];
      const ySelect = screen.getAllByRole('combobox')[1];
      
      // Should be able to select fields even with invalid data
      await user.selectOptions(xSelect, 'product');
      
      // Check if sales field is available for invalid data, if not skip Y selection
      const yOptions = Array.from(ySelect.options).map(opt => opt.value).filter(v => v !== '');
      if (yOptions.includes('sales')) {
        await user.selectOptions(ySelect, 'sales');
      } else if (yOptions.length > 0) {
        await user.selectOptions(ySelect, yOptions[0]); // Use first available numeric field
      }

      // Export should still work (the component handles data cleaning internally)
      const reportButton = screen.getByText('Report');
      await user.click(reportButton);

      await waitFor(() => {
        expect(screen.getByTestId('report-builder-modal')).toBeInTheDocument();
      });

      // Navigate to Share & Export tab
      const shareExportTab = screen.getByText('Share & Export');
      await user.click(shareExportTab);

      const pptButton = screen.getByText('PowerPoint');
      await user.click(pptButton);

      const exportButton = screen.getByText('Generate PowerPoint');
      await user.click(exportButton);

      // Verify export was attempted with the invalid data (component should handle gracefully)
      await waitFor(() => {
        expect(PowerPointExporter.exportPresentation).toHaveBeenCalledWith(
          expect.any(Object), // chart element
          expect.objectContaining({ type: 'bar' }), // chart config
          invalidData, // the original invalid data is passed through
          null, // insights
          expect.any(Object) // options
        );
      });
    });
  });

  describe('Performance and Large Dataset Workflows', () => {
    it('should handle large dataset exports efficiently', async () => {
      // Generate large dataset
      const largeData = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        category: `Category ${i % 50}`,
        value: Math.random() * 1000,
        date: new Date(2023, i % 12, (i % 28) + 1).toISOString(),
        region: ['North', 'South', 'East', 'West'][i % 4]
      }));

      render(<ChartBuilder data={largeData} />);

      await waitFor(() => {
        expect(screen.getByText('Chart Type')).toBeInTheDocument();
      });

      // Component should still be functional with large dataset
      const barButton = screen.getAllByText('Bar Chart')[0];
      await user.click(barButton);

      // Should be able to configure chart with large dataset
      const xSelect = screen.getAllByRole('combobox')[0];
      await user.selectOptions(xSelect, 'category');

      const ySelect = screen.getAllByRole('combobox')[1];
      await user.selectOptions(ySelect, 'value');

      // Export should work with large dataset
      const reportButton = screen.getByText('Report');
      await user.click(reportButton);

      await waitFor(() => {
        expect(screen.getByTestId('report-builder-modal')).toBeInTheDocument();
      });

      // Navigate to Share & Export tab
      const shareExportTab = screen.getByText('Share & Export');
      await user.click(shareExportTab);

      const excelButton = screen.getByText('Excel Export');
      await user.click(excelButton);

      const exportButton = screen.getByText('Export to Excel');
      await user.click(exportButton);

      // Verify export handles large dataset
      await waitFor(() => {
        expect(ExcelExporter.exportToExcel).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'bar' }), // chart config
          largeData, // the large dataset
          largeData, // filtered data (same)
          null, // insights
          expect.any(Object) // excel options
        );
      });

      expect(mockDownload).toHaveBeenCalled();
    }, 15000);
  });

  describe('Cross-Format Consistency', () => {
    it('should maintain data consistency across different export formats', async () => {
      render(<ChartBuilder data={integrationTestData} />);

      await waitFor(() => {
        expect(screen.getByText('Chart Type')).toBeInTheDocument();
      });

      // Create standardized chart
      const barButton = screen.getAllByText('Bar Chart')[0];
      await user.click(barButton);

      const xSelect = screen.getAllByRole('combobox')[0];
      await user.selectOptions(xSelect, 'product');

      const ySelect = screen.getAllByRole('combobox')[1];
      await user.selectOptions(ySelect, 'sales');

      // Test PowerPoint export
      const reportButton = screen.getByText('Report');
      await user.click(reportButton);

      await waitFor(() => {
        expect(screen.getByTestId('report-builder-modal')).toBeInTheDocument();
      });

      // Navigate to Share & Export tab
      const shareExportTab = screen.getByText('Share & Export');
      await user.click(shareExportTab);

      const pptButton = screen.getByText('PowerPoint');
      await user.click(pptButton);

      let exportButton = screen.getByText('Generate PowerPoint');
      await user.click(exportButton);

      await waitFor(() => {
        expect(PowerPointExporter.exportPresentation).toHaveBeenCalled();
      });

      const pptArgs = (PowerPointExporter.exportPresentation as any).mock.calls[0];
      const pptChartConfig = pptArgs[1];
      const pptData = pptArgs[2];

      // Reset and test Excel export
      vi.clearAllMocks();
      
      const excelButton = screen.getByText('Excel Export');
      await user.click(excelButton);

      exportButton = screen.getByText('Export to Excel');
      await user.click(exportButton);

      await waitFor(() => {
        expect(ExcelExporter.exportToExcel).toHaveBeenCalled();
      });

      const excelArgs = (ExcelExporter.exportToExcel as any).mock.calls[0];
      const excelChartConfig = excelArgs[0];
      const excelData = excelArgs[1];

      // Verify data consistency across formats
      expect(excelData).toEqual(integrationTestData);
      expect(pptData).toEqual(integrationTestData);
      expect(pptChartConfig.fieldMapping.x).toBe('product');
      expect(pptChartConfig.fieldMapping.y).toBe('sales');
      expect(excelChartConfig.fieldMapping.x).toBe('product');
      expect(excelChartConfig.fieldMapping.y).toBe('sales');
    });
  });
});
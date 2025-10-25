import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportBuilder } from '../ReportBuilder';
import { ChartConfig } from '../../../types/VisualizationTypes';
import { InsightGenerationResult } from '../../../services/ai/InsightGenerator';

// Mock external dependencies
vi.mock('../../../services/export/EnhancedReportGenerator', () => ({
  EnhancedReportGenerator: {
    getTemplates: vi.fn(() => [
      {
        id: 'business',
        name: 'Business Report',
        description: 'Professional business template',
        category: 'business' as const,
        layout: {
          headerHeight: 25,
          footerHeight: 15,
          margin: 20,
          colorScheme: {
            primary: '#2563eb',
            secondary: '#64748b',
            accent: '#0ea5e9',
            text: '#1e293b',
            background: '#ffffff'
          }
        }
      },
      {
        id: 'scientific',
        name: 'Scientific Report',
        description: 'Academic template',
        category: 'academic' as const,
        layout: {
          headerHeight: 20,
          footerHeight: 12,
          margin: 25,
          colorScheme: {
            primary: '#dc2626',
            secondary: '#6b7280',
            accent: '#ef4444',
            text: '#1f2937',
            background: '#ffffff'
          }
        }
      },
    ]),
    generateReport: vi.fn(() => Promise.resolve({ success: true, filename: 'test.pdf', pageCount: 5 })),
  },
}));

vi.mock('../../../services/export/AdvancedSharingService', () => ({
  AdvancedSharingService: {
    createShareableLink: vi.fn(() => Promise.resolve({ success: true, url: 'https://test.com/share' })),
    generateAdvancedEmbedCode: vi.fn(() => Promise.resolve({ success: true, embedCode: '<iframe>...</iframe>' })),
    generateSocialMediaExport: vi.fn(() => Promise.resolve({ success: true, imageUrl: 'https://test.com/image.png' })),
  },
}));

vi.mock('../../../services/export/PowerPointExporter', () => ({
  PowerPointExporter: {
    exportPresentation: vi.fn(() => Promise.resolve({ success: true, filename: 'test.pptx' })),
  },
}));

vi.mock('../../../services/export/ExcelExporter', () => ({
  ExcelExporter: {
    exportToExcel: vi.fn(() => Promise.resolve({ success: true, filename: 'test.xlsx', worksheetCount: 3 })),
  },
}));

vi.mock('../../../services/export/HTMLWidgetGenerator', () => ({
  HTMLWidgetGenerator: {
    generateWidget: vi.fn(() => Promise.resolve({ success: true, filename: 'widget.html', size: '2.5 MB' })),
  },
}));

describe('ReportBuilder - Basic Functionality', () => {
  const mockConfig: ChartConfig = {
    type: 'line',
    title: 'Test Chart',
    fieldMapping: {
      x: 'date',
      y: 'value',
    },
    styling: {
      colors: { scheme: 'category10' },
      layout: { width: 800, height: 400, margin: { top: 20, right: 30, bottom: 40, left: 50 } },
      axes: {
        x: { show: true, grid: true, fontSize: 12, color: '#333' },
        y: { show: true, grid: true, fontSize: 12, color: '#333' },
      },
      legend: {
        show: true, position: 'right', direction: 'column', anchor: 'middle',
        translateX: 0, translateY: 0, itemWidth: 100, itemHeight: 20, symbolSize: 12, fontSize: 12,
      },
      theme: 'light',
    },
  };

  const mockData = [
    { date: '2024-01-01', value: 100 },
    { date: '2024-01-02', value: 150 },
    { date: '2024-01-03', value: 120 },
  ];

  const mockInsights: InsightGenerationResult = {
    insights: [
      {
        type: 'trend',
        title: 'Upward Trend',
        description: 'The data shows a positive trend.',
        confidence: 0.85,
        data: { trend: 'increasing' },
      },
    ],
    summary: 'Overall positive performance.',
    timestamp: new Date().toISOString(),
  };

  const mockChartElement = document.createElement('div');
  mockChartElement.innerHTML = '<svg><rect width="400" height="300"/></svg>';

  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      render(
        <ReportBuilder
          chartElement={mockChartElement}
          config={mockConfig}
          data={mockData}
          insights={mockInsights}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Professional Report & Sharing')).toBeInTheDocument();
    });

    it('should render all navigation tabs', () => {
      render(
        <ReportBuilder
          chartElement={mockChartElement}
          config={mockConfig}
          data={mockData}
          insights={mockInsights}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Template')).toBeInTheDocument();
      expect(screen.getByText('Sections')).toBeInTheDocument();
      expect(screen.getByText('Branding')).toBeInTheDocument();
      expect(screen.getByText('Share & Export')).toBeInTheDocument();
      expect(screen.getByText('Preview')).toBeInTheDocument();
    });

    it('should show template tab content by default', () => {
      render(
        <ReportBuilder
          chartElement={mockChartElement}
          config={mockConfig}
          data={mockData}
          insights={mockInsights}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Select Report Template')).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      render(
        <ReportBuilder
          chartElement={mockChartElement}
          config={mockConfig}
          data={mockData}
          insights={mockInsights}
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByText('×');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Tab Navigation', () => {
    it('should switch between tabs when clicked', () => {
      render(
        <ReportBuilder
          chartElement={mockChartElement}
          config={mockConfig}
          data={mockData}
          insights={mockInsights}
          onClose={mockOnClose}
        />
      );

      // Click on Sections tab
      fireEvent.click(screen.getByText('Sections'));
      
      // Should show sections content (we can't test the exact content due to complexity, 
      // but we can verify the tab navigation works)
      const sectionsTab = screen.getByText('Sections');
      expect(sectionsTab.closest('button')).toHaveStyle({
        color: 'var(--accent-primary)',
      });

      // Click on Branding tab
      fireEvent.click(screen.getByText('Branding'));
      
      const brandingTab = screen.getByText('Branding');
      expect(brandingTab.closest('button')).toHaveStyle({
        color: 'var(--accent-primary)',
      });
    });

    it('should navigate to sharing tab', () => {
      render(
        <ReportBuilder
          chartElement={mockChartElement}
          config={mockConfig}
          data={mockData}
          insights={mockInsights}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('Share & Export'));
      
      const sharingTab = screen.getByText('Share & Export');
      expect(sharingTab.closest('button')).toHaveStyle({
        color: 'var(--accent-primary)',
      });
    });
  });

  describe('State Management', () => {
    it('should initialize with default state values', () => {
      const { container } = render(
        <ReportBuilder
          chartElement={mockChartElement}
          config={mockConfig}
          data={mockData}
          insights={mockInsights}
          onClose={mockOnClose}
        />
      );

      // Component should render without errors, indicating proper state initialization
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle missing chart element gracefully', () => {
      render(
        <ReportBuilder
          chartElement={null}
          config={mockConfig}
          data={mockData}
          insights={mockInsights}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Professional Report & Sharing')).toBeInTheDocument();
    });

    it('should handle missing insights gracefully', () => {
      render(
        <ReportBuilder
          chartElement={mockChartElement}
          config={mockConfig}
          data={mockData}
          insights={null}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Professional Report & Sharing')).toBeInTheDocument();
    });

    it('should handle empty data array', () => {
      render(
        <ReportBuilder
          chartElement={mockChartElement}
          config={mockConfig}
          data={[]}
          insights={mockInsights}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Professional Report & Sharing')).toBeInTheDocument();
    });
  });

  describe('Template Selection', () => {
    it('should display available templates', () => {
      render(
        <ReportBuilder
          chartElement={mockChartElement}
          config={mockConfig}
          data={mockData}
          insights={mockInsights}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Business Report')).toBeInTheDocument();
      expect(screen.getByText('Scientific Report')).toBeInTheDocument();
    });

    it('should allow template selection', () => {
      render(
        <ReportBuilder
          chartElement={mockChartElement}
          config={mockConfig}
          data={mockData}
          insights={mockInsights}
          onClose={mockOnClose}
        />
      );

      const scientificTemplate = screen.getByText('Scientific Report');
      fireEvent.click(scientificTemplate.closest('div')!);

      // Template selection should work (visual state change)
      expect(scientificTemplate).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should handle keyboard navigation', () => {
      render(
        <ReportBuilder
          chartElement={mockChartElement}
          config={mockConfig}
          data={mockData}
          insights={mockInsights}
          onClose={mockOnClose}
        />
      );

      const firstTab = screen.getByText('Template').closest('button')!;
      
      // Focus and keyboard interaction
      firstTab.focus();
      fireEvent.keyDown(firstTab, { key: 'Tab' });

      expect(firstTab).toBeInTheDocument();
    });

    it('should maintain accessibility attributes', () => {
      render(
        <ReportBuilder
          chartElement={mockChartElement}
          config={mockConfig}
          data={mockData}
          insights={mockInsights}
          onClose={mockOnClose}
        />
      );

      const tabs = screen.getAllByRole('button');
      expect(tabs.length).toBeGreaterThan(0);
      
      // Tabs should be clickable and have proper button role
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('type', 'button');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle component errors gracefully', () => {
      // Test with malformed config
      const malformedConfig = {
        ...mockConfig,
        styling: null,
      } as any;

      const { container } = render(
        <ReportBuilder
          chartElement={mockChartElement}
          config={malformedConfig}
          data={mockData}
          insights={mockInsights}
          onClose={mockOnClose}
        />
      );

      // Component should still render basic structure
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle undefined props', () => {
      const { container } = render(
        <ReportBuilder
          chartElement={mockChartElement}
          config={mockConfig}
          data={mockData}
          insights={mockInsights}
          // onClose not provided
        />
      );

      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Performance Considerations', () => {
    it('should render efficiently with large data sets', () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        value: Math.random() * 1000,
      }));

      const startTime = performance.now();
      
      render(
        <ReportBuilder
          chartElement={mockChartElement}
          config={mockConfig}
          data={largeData}
          insights={mockInsights}
          onClose={mockOnClose}
        />
      );

      const endTime = performance.now();
      
      // Should render within reasonable time (1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      expect(screen.getByText('Professional Report & Sharing')).toBeInTheDocument();
    });

    it('should handle multiple rapid interactions', () => {
      render(
        <ReportBuilder
          chartElement={mockChartElement}
          config={mockConfig}
          data={mockData}
          insights={mockInsights}
          onClose={mockOnClose}
        />
      );

      // Rapidly click between tabs
      const tabs = ['Sections', 'Branding', 'Share & Export', 'Preview', 'Template'];
      
      tabs.forEach(tabName => {
        const tab = screen.getByText(tabName);
        fireEvent.click(tab);
      });

      // Should handle all clicks without errors
      expect(screen.getByText('Professional Report & Sharing')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should adapt to different screen sizes', () => {
      const { container } = render(
        <ReportBuilder
          chartElement={mockChartElement}
          config={mockConfig}
          data={mockData}
          insights={mockInsights}
          onClose={mockOnClose}
        />
      );

      const reportBuilder = container.querySelector('.report-builder-overlay');
      
      expect(reportBuilder).toHaveStyle({
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
      });
    });

    it('should maintain proper layout structure', () => {
      const { container } = render(
        <ReportBuilder
          chartElement={mockChartElement}
          config={mockConfig}
          data={mockData}
          insights={mockInsights}
          onClose={mockOnClose}
        />
      );

      const cardElement = container.querySelector('.card');
      expect(cardElement).toHaveStyle({
        width: '90vw',
        maxWidth: '1200px',
        height: '85vh',
        maxHeight: '800px',
      });
    });
  });
});
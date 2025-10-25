import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ChartConfig, ExportOptions } from '../../types/VisualizationTypes';
import { InsightGenerationResult, DataInsight } from '../ai/InsightGenerator';

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'business' | 'academic' | 'technical' | 'executive';
  layout: {
    headerHeight: number;
    footerHeight: number;
    margin: number;
    colorScheme: {
      primary: string;
      secondary: string;
      accent: string;
      text: string;
      background: string;
    };
  };
}

export interface ReportSection {
  type: 'cover' | 'executive_summary' | 'chart' | 'insights' | 'data_summary' | 'appendix';
  title: string;
  content?: string;
  includePageBreak?: boolean;
}

export interface ReportOptions extends Partial<ExportOptions> {
  template: ReportTemplate;
  sections: ReportSection[];
  branding?: {
    logo?: string;
    companyName?: string;
    reportTitle?: string;
    author?: string;
    date?: string;
  };
  includeTableOfContents?: boolean;
  watermark?: string;
}

export interface ReportResult {
  success: boolean;
  data?: Blob;
  error?: string;
  filename?: string;
  pageCount?: number;
}

export class EnhancedReportGenerator {
  private static readonly TEMPLATES: ReportTemplate[] = [
    {
      id: 'business_standard',
      name: 'Business Standard',
      description: 'Clean, professional layout for business reports',
      category: 'business',
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
      id: 'executive_summary',
      name: 'Executive Summary',
      description: 'High-level overview for executives and stakeholders',
      category: 'executive',
      layout: {
        headerHeight: 30,
        footerHeight: 20,
        margin: 25,
        colorScheme: {
          primary: '#7c3aed',
          secondary: '#6b7280',
          accent: '#8b5cf6',
          text: '#111827',
          background: '#ffffff'
        }
      }
    },
    {
      id: 'technical_analysis',
      name: 'Technical Analysis',
      description: 'Detailed technical report with comprehensive data',
      category: 'technical',
      layout: {
        headerHeight: 20,
        footerHeight: 15,
        margin: 18,
        colorScheme: {
          primary: '#059669',
          secondary: '#6b7280',
          accent: '#10b981',
          text: '#374151',
          background: '#ffffff'
        }
      }
    },
    {
      id: 'academic_research',
      name: 'Academic Research',
      description: 'Formal academic-style report layout',
      category: 'academic',
      layout: {
        headerHeight: 15,
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
    }
  ];

  static getTemplates(): ReportTemplate[] {
    return this.TEMPLATES;
  }

  static getTemplate(id: string): ReportTemplate | undefined {
    return this.TEMPLATES.find(t => t.id === id);
  }

  /**
   * Generate comprehensive PDF report with AI insights
   */
  static async generateReport(
    chartElement: HTMLElement,
    config: ChartConfig,
    data: Record<string, any>[],
    insights: InsightGenerationResult | null,
    options: ReportOptions
  ): Promise<ReportResult> {
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const template = options.template;
      const { margin } = template.layout;

      let currentY = margin;
      let pageCount = 1;

      // Helper function to add new page
      const addNewPage = () => {
        pdf.addPage();
        pageCount++;
        currentY = margin;
        this.addHeader(pdf, template, options.branding, pageWidth, pageCount);
        return margin + template.layout.headerHeight + 10;
      };

      // Helper function to check if we need a new page
      const checkPageBreak = (requiredHeight: number): number => {
        if (currentY + requiredHeight > pageHeight - template.layout.footerHeight - margin) {
          return addNewPage();
        }
        return currentY;
      };

      // Add header to first page
      this.addHeader(pdf, template, options.branding, pageWidth, pageCount);
      currentY += template.layout.headerHeight + 10;

      // Process each section
      for (const section of options.sections) {
        if (section.includePageBreak) {
          currentY = addNewPage();
        }

        switch (section.type) {
          case 'cover':
            currentY = await this.addCoverPage(pdf, template, options.branding, pageWidth, pageHeight);
            if (options.sections.length > 1) currentY = addNewPage();
            break;

          case 'executive_summary':
            currentY = await this.addExecutiveSummary(pdf, template, insights, pageWidth, currentY, checkPageBreak);
            break;

          case 'chart':
            currentY = await this.addChartSection(pdf, chartElement, config, template, pageWidth, currentY, checkPageBreak);
            break;

          case 'insights':
            if (insights && insights.insights.length > 0) {
              currentY = await this.addInsightsSection(pdf, insights, template, pageWidth, currentY, checkPageBreak);
            }
            break;

          case 'data_summary':
            currentY = await this.addDataSummary(pdf, data, config, template, pageWidth, currentY, checkPageBreak);
            break;

          case 'appendix':
            currentY = await this.addAppendix(pdf, data, config, template, pageWidth, currentY, checkPageBreak);
            break;
        }

        currentY += 15; // Add spacing between sections
      }

      // Add footers to all pages
      this.addFooters(pdf, template, options.branding, pageWidth, pageHeight, pageCount);

      const filename = options.filename || this.generateReportFilename(config, options.branding);
      
      // Save PDF
      pdf.save(filename);

      return {
        success: true,
        data: pdf.output('blob'),
        filename,
        pageCount,
      };
    } catch (error) {
      return {
        success: false,
        error: `Report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private static addHeader(
    pdf: jsPDF, 
    template: ReportTemplate, 
    branding: ReportOptions['branding'], 
    pageWidth: number, 
    pageNumber: number
  ): void {
    const { colorScheme, headerHeight, margin } = template.layout;
    
    // Header background
    pdf.setFillColor(colorScheme.primary);
    pdf.rect(0, 0, pageWidth, headerHeight, 'F');

    // Company name and logo area
    if (branding?.companyName) {
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(branding.companyName, margin, 12);
    }

    // Report title (on first page only)
    if (pageNumber === 1 && branding?.reportTitle) {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(branding.reportTitle, margin, 20);
    }

    // Date on right side
    if (branding?.date) {
      pdf.setFontSize(9);
      const dateText = branding.date;
      const dateWidth = pdf.getTextWidth(dateText);
      pdf.text(dateText, pageWidth - margin - dateWidth, 12);
    }

    pdf.setTextColor(colorScheme.text); // Reset text color
  }

  private static async addCoverPage(
    pdf: jsPDF,
    template: ReportTemplate,
    branding: ReportOptions['branding'],
    pageWidth: number,
    pageHeight: number
  ): Promise<number> {
    const { colorScheme, margin } = template.layout;
    const centerX = pageWidth / 2;
    
    // Main title
    if (branding?.reportTitle) {
      pdf.setFontSize(28);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(colorScheme.primary);
      
      const titleLines = pdf.splitTextToSize(branding.reportTitle, pageWidth - 2 * margin);
      let titleY = pageHeight * 0.3;
      
      titleLines.forEach((line: string) => {
        const lineWidth = pdf.getTextWidth(line);
        pdf.text(line, centerX - lineWidth / 2, titleY);
        titleY += 12;
      });
    }

    // Subtitle/description
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(colorScheme.secondary);
    const subtitle = 'Data Analysis Report';
    const subtitleWidth = pdf.getTextWidth(subtitle);
    pdf.text(subtitle, centerX - subtitleWidth / 2, pageHeight * 0.45);

    // Author and date
    let infoY = pageHeight * 0.7;
    pdf.setFontSize(12);
    pdf.setTextColor(colorScheme.text);

    if (branding?.author) {
      const authorText = `Prepared by: ${branding.author}`;
      const authorWidth = pdf.getTextWidth(authorText);
      pdf.text(authorText, centerX - authorWidth / 2, infoY);
      infoY += 10;
    }

    if (branding?.date) {
      const dateText = `Generated on: ${branding.date}`;
      const dateWidth = pdf.getTextWidth(dateText);
      pdf.text(dateText, centerX - dateWidth / 2, infoY);
    }

    // Company name at bottom
    if (branding?.companyName) {
      pdf.setFontSize(10);
      pdf.setTextColor(colorScheme.secondary);
      const companyWidth = pdf.getTextWidth(branding.companyName);
      pdf.text(branding.companyName, centerX - companyWidth / 2, pageHeight - margin - 10);
    }

    return pageHeight; // Force page break
  }

  private static async addExecutiveSummary(
    pdf: jsPDF,
    template: ReportTemplate,
    insights: InsightGenerationResult | null,
    pageWidth: number,
    startY: number,
    checkPageBreak: (height: number) => number
  ): Promise<number> {
    const { colorScheme, margin } = template.layout;
    let currentY = checkPageBreak(40);

    // Section title
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(colorScheme.primary);
    pdf.text('Executive Summary', margin, currentY);
    currentY += 15;

    // Executive summary content
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(colorScheme.text);

    let summaryText = '';
    if (insights?.executiveSummary) {
      summaryText = insights.executiveSummary;
    } else {
      summaryText = 'This report provides a comprehensive analysis of the provided dataset, including key insights, trends, and patterns discovered through advanced data analysis techniques.';
    }

    const summaryLines = pdf.splitTextToSize(summaryText, pageWidth - 2 * margin);
    summaryLines.forEach((line: string) => {
      currentY = checkPageBreak(6);
      pdf.text(line, margin, currentY);
      currentY += 6;
    });

    // Key findings
    if (insights && insights.insights.length > 0) {
      currentY += 10;
      currentY = checkPageBreak(15);
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(colorScheme.primary);
      pdf.text('Key Findings', margin, currentY);
      currentY += 10;

      // Show top 3 critical insights
      const criticalInsights = insights.insights
        .filter(i => i.priority === 'critical' || i.priority === 'high')
        .slice(0, 3);

      criticalInsights.forEach((insight, index) => {
        currentY = checkPageBreak(15);
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(colorScheme.accent);
        pdf.text(`${index + 1}. ${insight.title}`, margin, currentY);
        currentY += 6;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(colorScheme.text);
        const descLines = pdf.splitTextToSize(insight.description, pageWidth - 2 * margin - 10);
        descLines.forEach((line: string) => {
          currentY = checkPageBreak(5);
          pdf.text(line, margin + 5, currentY);
          currentY += 5;
        });
        currentY += 3;
      });
    }

    return currentY;
  }

  private static async addChartSection(
    pdf: jsPDF,
    chartElement: HTMLElement,
    config: ChartConfig,
    template: ReportTemplate,
    pageWidth: number,
    startY: number,
    checkPageBreak: (height: number) => number
  ): Promise<number> {
    const { colorScheme, margin } = template.layout;
    let currentY = checkPageBreak(60);

    // Section title
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(colorScheme.primary);
    pdf.text('Data Visualization', margin, currentY);
    currentY += 15;

    // Chart title
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(colorScheme.text);
    pdf.text(config.title, margin, currentY);
    currentY += 10;

    // Chart description if available
    if (config.description) {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const descLines = pdf.splitTextToSize(config.description, pageWidth - 2 * margin);
      descLines.forEach((line: string) => {
        currentY = checkPageBreak(5);
        pdf.text(line, margin, currentY);
        currentY += 5;
      });
      currentY += 5;
    }

    // Capture and add chart
    try {
      const canvas = await html2canvas(chartElement, {
        backgroundColor: template.layout.colorScheme.background,
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      const imgData = canvas.toDataURL('image/png');
      
      // Calculate chart dimensions
      const chartAspectRatio = canvas.width / canvas.height;
      const availableWidth = pageWidth - 2 * margin;
      const maxHeight = 120; // Maximum height for chart
      
      let chartWidth = availableWidth;
      let chartHeight = chartWidth / chartAspectRatio;
      
      if (chartHeight > maxHeight) {
        chartHeight = maxHeight;
        chartWidth = chartHeight * chartAspectRatio;
      }

      currentY = checkPageBreak(chartHeight + 10);
      
      // Center the chart horizontally
      const chartX = (pageWidth - chartWidth) / 2;
      
      pdf.addImage(imgData, 'PNG', chartX, currentY, chartWidth, chartHeight);
      currentY += chartHeight + 10;

    } catch (error) {
      // If chart capture fails, add error message
      pdf.setFontSize(10);
      pdf.setTextColor(colorScheme.secondary);
      pdf.text('Error: Unable to capture chart visualization', margin, currentY);
      currentY += 10;
    }

    return currentY;
  }

  private static async addInsightsSection(
    pdf: jsPDF,
    insights: InsightGenerationResult,
    template: ReportTemplate,
    pageWidth: number,
    startY: number,
    checkPageBreak: (height: number) => number
  ): Promise<number> {
    const { colorScheme, margin } = template.layout;
    let currentY = checkPageBreak(30);

    // Section title
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(colorScheme.primary);
    pdf.text('AI-Powered Insights', margin, currentY);
    currentY += 15;

    // Overall confidence
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(colorScheme.secondary);
    pdf.text(`Analysis Confidence: ${Math.round(insights.confidence * 100)}%`, margin, currentY);
    currentY += 10;

    // Group insights by priority
    const groupedInsights = {
      critical: insights.insights.filter(i => i.priority === 'critical'),
      high: insights.insights.filter(i => i.priority === 'high'),
      medium: insights.insights.filter(i => i.priority === 'medium'),
      low: insights.insights.filter(i => i.priority === 'low'),
    };

    for (const [priority, insightList] of Object.entries(groupedInsights)) {
      if (insightList.length === 0) continue;

      currentY = checkPageBreak(20);
      
      // Priority section header
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      
      const priorityColors = {
        critical: '#dc2626',
        high: '#ea580c',
        medium: '#d97706',
        low: '#65a30d'
      };
      
      pdf.setTextColor(priorityColors[priority as keyof typeof priorityColors]);
      pdf.text(`${priority.toUpperCase()} Priority Insights`, margin, currentY);
      currentY += 8;

      // List insights
      insightList.forEach((insight) => {
        currentY = checkPageBreak(25);
        
        // Insight title
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(colorScheme.text);
        pdf.text(`• ${insight.title}`, margin, currentY);
        currentY += 6;
        
        // Insight description
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(colorScheme.secondary);
        const descLines = pdf.splitTextToSize(insight.description, pageWidth - 2 * margin - 10);
        descLines.forEach((line: string) => {
          currentY = checkPageBreak(5);
          pdf.text(line, margin + 5, currentY);
          currentY += 4;
        });
        
        // Confidence indicator
        pdf.setFontSize(8);
        pdf.setTextColor(colorScheme.secondary);
        pdf.text(`Confidence: ${Math.round(insight.confidence * 100)}%`, margin + 5, currentY);
        currentY += 8;
      });
      
      currentY += 5;
    }

    return currentY;
  }

  private static async addDataSummary(
    pdf: jsPDF,
    data: Record<string, any>[],
    config: ChartConfig,
    template: ReportTemplate,
    pageWidth: number,
    startY: number,
    checkPageBreak: (height: number) => number
  ): Promise<number> {
    const { colorScheme, margin } = template.layout;
    let currentY = checkPageBreak(30);

    // Section title
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(colorScheme.primary);
    pdf.text('Data Summary', margin, currentY);
    currentY += 15;

    if (data.length === 0) {
      pdf.setFontSize(10);
      pdf.setTextColor(colorScheme.secondary);
      pdf.text('No data available', margin, currentY);
      return currentY + 10;
    }

    // Dataset overview
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(colorScheme.text);
    pdf.text(`Total Records: ${data.length.toLocaleString()}`, margin, currentY);
    currentY += 8;

    const headers = Object.keys(data[0]);
    pdf.text(`Fields: ${headers.length}`, margin, currentY);
    currentY += 12;

    // Field information
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Field Details:', margin, currentY);
    currentY += 8;

    headers.slice(0, 10).forEach((header) => { // Limit to first 10 fields
      currentY = checkPageBreak(6);
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      
      // Analyze field type
      const values = data.slice(0, 100).map(row => row[header]).filter(v => v != null);
      const numericValues = values.filter(v => !isNaN(Number(v))).length;
      const fieldType = numericValues > values.length * 0.8 ? 'Numeric' : 'Text';
      
      pdf.text(`• ${header} (${fieldType})`, margin, currentY);
      currentY += 5;
    });

    if (headers.length > 10) {
      pdf.text(`... and ${headers.length - 10} more fields`, margin, currentY);
      currentY += 5;
    }

    return currentY;
  }

  private static async addAppendix(
    pdf: jsPDF,
    data: Record<string, any>[],
    config: ChartConfig,
    template: ReportTemplate,
    pageWidth: number,
    startY: number,
    checkPageBreak: (height: number) => number
  ): Promise<number> {
    const { colorScheme, margin } = template.layout;
    let currentY = checkPageBreak(30);

    // Section title
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(colorScheme.primary);
    pdf.text('Appendix', margin, currentY);
    currentY += 15;

    // Technical details
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(colorScheme.text);
    pdf.text('Technical Details', margin, currentY);
    currentY += 10;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(colorScheme.secondary);

    const technicalInfo = [
      `Chart Type: ${config.type}`,
      `Analysis Date: ${new Date().toLocaleDateString()}`,
      `Data Points: ${data.length.toLocaleString()}`,
      `Generated by: DataSnap AI Analytics Platform`,
    ];

    technicalInfo.forEach((info) => {
      currentY = checkPageBreak(5);
      pdf.text(info, margin, currentY);
      currentY += 5;
    });

    return currentY;
  }

  private static addFooters(
    pdf: jsPDF,
    template: ReportTemplate,
    branding: ReportOptions['branding'],
    pageWidth: number,
    pageHeight: number,
    totalPages: number
  ): void {
    const { colorScheme, footerHeight, margin } = template.layout;

    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      
      // Footer background
      pdf.setFillColor(colorScheme.background);
      pdf.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, 'F');
      
      // Page number
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(colorScheme.secondary);
      
      const pageText = `Page ${i} of ${totalPages}`;
      const pageWidth_text = pdf.getTextWidth(pageText);
      pdf.text(pageText, pageWidth - margin - pageWidth_text, pageHeight - 8);
      
      // Footer text
      const footerText = branding?.companyName || 'Generated by DataSnap';
      pdf.text(footerText, margin, pageHeight - 8);
    }
  }

  private static generateReportFilename(config: ChartConfig, branding: ReportOptions['branding']): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const title = (branding?.reportTitle || config.title || 'DataSnap Report')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .substring(0, 30);
    
    return `${title}-report-${timestamp}.pdf`;
  }
}
// Conditional import for pptxgenjs - only works in Electron
let PptxGenJS: any = null;
try {
  if (typeof window !== 'undefined' && (window as any).require) {
    PptxGenJS = (window as any).require('pptxgenjs');
  }
} catch (e) {
  console.warn('pptxgenjs not available - PowerPoint export will be disabled');
}

import html2canvas from 'html2canvas';
import { ChartConfig } from '../../types/VisualizationTypes';
import { InsightGenerationResult, DataInsight } from '../ai/InsightGenerator';

export interface PowerPointOptions {
  template?: 'business' | 'executive' | 'technical' | 'minimal';
  branding?: {
    companyName?: string;
    presentationTitle?: string;
    author?: string;
    date?: string;
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
  includeInsights?: boolean;
  includeDataSummary?: boolean;
  slideLayout?: 'standard' | 'widescreen';
  filename?: string;
}

export interface PowerPointResult {
  success: boolean;
  filename?: string;
  error?: string;
  slideCount?: number;
}

export class PowerPointExporter {
  private static readonly TEMPLATES = {
    business: {
      primaryColor: '2563eb',
      secondaryColor: '64748b',
      accentColor: '0ea5e9',
      backgroundColor: 'ffffff',
      textColor: '1e293b'
    },
    executive: {
      primaryColor: '7c3aed',
      secondaryColor: '6b7280',
      accentColor: '8b5cf6',
      backgroundColor: 'ffffff',
      textColor: '111827'
    },
    technical: {
      primaryColor: '059669',
      secondaryColor: '6b7280',
      accentColor: '10b981',
      backgroundColor: 'ffffff',
      textColor: '374151'
    },
    minimal: {
      primaryColor: '1f2937',
      secondaryColor: '9ca3af',
      accentColor: '6366f1',
      backgroundColor: 'ffffff',
      textColor: '111827'
    }
  };

  /**
   * Export comprehensive PowerPoint presentation with charts and insights
   */
  static async exportPresentation(
    chartElement: HTMLElement,
    config: ChartConfig,
    data: Record<string, any>[],
    insights: InsightGenerationResult | null,
    options: PowerPointOptions = {}
  ): Promise<PowerPointResult> {
    try {
      if (!PptxGenJS) {
        return {
          success: false,
          error: 'PowerPoint export is only available in the desktop app'
        };
      }
      
      const pptx = new PptxGenJS();
      const template = this.TEMPLATES[options.template || 'business'];
      
      // Configure presentation layout
      pptx.layout = options.slideLayout === 'widescreen' ? 'LAYOUT_WIDE' : 'LAYOUT_4x3';
      
      // Set presentation properties
      pptx.author = options.branding?.author || 'DataSnap';
      pptx.company = options.branding?.companyName || 'DataSnap Analytics';
      pptx.title = options.branding?.presentationTitle || `${config.title} - Data Analysis`;
      pptx.subject = 'Data Analysis Presentation';

      let slideCount = 0;

      // Slide 1: Title Slide
      slideCount += await this.createTitleSlide(pptx, config, options, template);

      // Slide 2: Executive Summary (if insights available)
      if (options.includeInsights && insights && insights.executiveSummary) {
        slideCount += await this.createExecutiveSummarySlide(pptx, insights, options, template);
      }

      // Slide 3: Data Visualization
      slideCount += await this.createChartSlide(pptx, chartElement, config, options, template);

      // Slide 4: Key Insights (if available)
      if (options.includeInsights && insights && insights.insights.length > 0) {
        slideCount += await this.createInsightsSlide(pptx, insights, options, template);
      }

      // Slide 5: Data Summary (if requested)
      if (options.includeDataSummary && data.length > 0) {
        slideCount += await this.createDataSummarySlide(pptx, data, config, options, template);
      }

      // Slide 6: Next Steps & Recommendations
      if (insights && insights.insights.some(i => i.recommendations && i.recommendations.length > 0)) {
        slideCount += await this.createRecommendationsSlide(pptx, insights, options, template);
      }

      // Generate filename
      const filename = options.filename || this.generateFilename(config, options.branding);

      // Save presentation
      await pptx.writeFile({ fileName: filename });

      return {
        success: true,
        filename,
        slideCount
      };

    } catch (error) {
      return {
        success: false,
        error: `PowerPoint export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static async createTitleSlide(
    pptx: PptxGenJS,
    config: ChartConfig,
    options: PowerPointOptions,
    template: any
  ): Promise<number> {
    const slide = pptx.addSlide();
    
    // Background
    slide.background = { color: template.backgroundColor };

    // Title
    const title = options.branding?.presentationTitle || `${config.title} Analysis`;
    slide.addText(title, {
      x: 0.5,
      y: 2,
      w: '90%',
      h: 1.5,
      fontSize: 44,
      fontFace: 'Calibri',
      color: template.primaryColor,
      bold: true,
      align: 'center'
    });

    // Subtitle
    slide.addText('Data Analysis & Insights Report', {
      x: 0.5,
      y: 3.8,
      w: '90%',
      h: 0.8,
      fontSize: 24,
      fontFace: 'Calibri',
      color: template.secondaryColor,
      align: 'center'
    });

    // Company and author info
    const companyText = options.branding?.companyName ? `${options.branding.companyName}` : '';
    const authorText = options.branding?.author ? `Prepared by: ${options.branding.author}` : '';
    const dateText = options.branding?.date || new Date().toLocaleDateString();

    if (companyText) {
      slide.addText(companyText, {
        x: 0.5,
        y: 5.5,
        w: '90%',
        h: 0.6,
        fontSize: 18,
        fontFace: 'Calibri',
        color: template.textColor,
        bold: true,
        align: 'center'
      });
    }

    if (authorText) {
      slide.addText(authorText, {
        x: 0.5,
        y: 6.2,
        w: '90%',
        h: 0.5,
        fontSize: 14,
        fontFace: 'Calibri',
        color: template.secondaryColor,
        align: 'center'
      });
    }

    slide.addText(dateText, {
      x: 0.5,
      y: 6.8,
      w: '90%',
      h: 0.5,
      fontSize: 14,
      fontFace: 'Calibri',
      color: template.secondaryColor,
      align: 'center'
    });

    return 1;
  }

  private static async createExecutiveSummarySlide(
    pptx: PptxGenJS,
    insights: InsightGenerationResult,
    options: PowerPointOptions,
    template: any
  ): Promise<number> {
    const slide = pptx.addSlide();
    slide.background = { color: template.backgroundColor };

    // Title
    slide.addText('Executive Summary', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 32,
      fontFace: 'Calibri',
      color: template.primaryColor,
      bold: true
    });

    // Summary content
    slide.addText(insights.executiveSummary, {
      x: 0.5,
      y: 1.5,
      w: '90%',
      h: 4,
      fontSize: 16,
      fontFace: 'Calibri',
      color: template.textColor,
      align: 'left',
      valign: 'top'
    });

    // Confidence indicator
    slide.addText(`Analysis Confidence: ${Math.round(insights.confidence * 100)}%`, {
      x: 0.5,
      y: 6,
      w: '90%',
      h: 0.5,
      fontSize: 12,
      fontFace: 'Calibri',
      color: template.secondaryColor,
      italic: true
    });

    return 1;
  }

  private static async createChartSlide(
    pptx: PptxGenJS,
    chartElement: HTMLElement,
    config: ChartConfig,
    options: PowerPointOptions,
    template: any
  ): Promise<number> {
    const slide = pptx.addSlide();
    slide.background = { color: template.backgroundColor };

    // Title
    slide.addText(config.title, {
      x: 0.5,
      y: 0.3,
      w: '90%',
      h: 0.8,
      fontSize: 28,
      fontFace: 'Calibri',
      color: template.primaryColor,
      bold: true
    });

    try {
      // Capture chart as image
      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      const chartImageData = canvas.toDataURL('image/png');

      // Add chart image to slide
      slide.addImage({
        data: chartImageData,
        x: 1,
        y: 1.3,
        w: 8,
        h: 5,
        sizing: {
          type: 'contain',
          w: 8,
          h: 5
        }
      });

    } catch (error) {
      // Fallback if chart capture fails
      slide.addText('Chart visualization could not be captured', {
        x: 1,
        y: 3.5,
        w: 8,
        h: 1,
        fontSize: 16,
        fontFace: 'Calibri',
        color: template.secondaryColor,
        align: 'center',
        italic: true
      });
    }

    // Chart description if available
    if (config.description) {
      slide.addText(config.description, {
        x: 0.5,
        y: 6.8,
        w: '90%',
        h: 0.8,
        fontSize: 12,
        fontFace: 'Calibri',
        color: template.secondaryColor,
        align: 'center'
      });
    }

    return 1;
  }

  private static async createInsightsSlide(
    pptx: PptxGenJS,
    insights: InsightGenerationResult,
    options: PowerPointOptions,
    template: any
  ): Promise<number> {
    const slide = pptx.addSlide();
    slide.background = { color: template.backgroundColor };

    // Title
    slide.addText('Key Insights', {
      x: 0.5,
      y: 0.3,
      w: '90%',
      h: 0.8,
      fontSize: 28,
      fontFace: 'Calibri',
      color: template.primaryColor,
      bold: true
    });

    // Get top insights
    const topInsights = insights.insights
      .filter(i => i.priority === 'critical' || i.priority === 'high')
      .slice(0, 4);

    let yPosition = 1.5;
    topInsights.forEach((insight, index) => {
      // Bullet point
      slide.addText(`${index + 1}.`, {
        x: 0.8,
        y: yPosition,
        w: 0.5,
        h: 0.4,
        fontSize: 16,
        fontFace: 'Calibri',
        color: template.accentColor,
        bold: true
      });

      // Insight title
      slide.addText(insight.title, {
        x: 1.3,
        y: yPosition,
        w: 8,
        h: 0.4,
        fontSize: 16,
        fontFace: 'Calibri',
        color: template.textColor,
        bold: true
      });

      // Insight description
      slide.addText(insight.description, {
        x: 1.3,
        y: yPosition + 0.4,
        w: 8,
        h: 0.8,
        fontSize: 14,
        fontFace: 'Calibri',
        color: template.textColor
      });

      // Confidence indicator
      slide.addText(`(${Math.round(insight.confidence * 100)}% confidence)`, {
        x: 1.3,
        y: yPosition + 1.1,
        w: 8,
        h: 0.3,
        fontSize: 10,
        fontFace: 'Calibri',
        color: template.secondaryColor,
        italic: true
      });

      yPosition += 1.6;
    });

    return 1;
  }

  private static async createDataSummarySlide(
    pptx: PptxGenJS,
    data: Record<string, any>[],
    config: ChartConfig,
    options: PowerPointOptions,
    template: any
  ): Promise<number> {
    const slide = pptx.addSlide();
    slide.background = { color: template.backgroundColor };

    // Title
    slide.addText('Data Summary', {
      x: 0.5,
      y: 0.3,
      w: '90%',
      h: 0.8,
      fontSize: 28,
      fontFace: 'Calibri',
      color: template.primaryColor,
      bold: true
    });

    // Dataset overview
    const headers = data.length > 0 ? Object.keys(data[0]) : [];
    const numericFields = headers.filter(header => {
      const values = data.slice(0, 100).map(row => row[header]).filter(v => v != null);
      const numericValues = values.filter(v => !isNaN(Number(v))).length;
      return numericValues > values.length * 0.8;
    });

    const summaryData = [
      ['Total Records', data.length.toLocaleString()],
      ['Total Fields', headers.length.toString()],
      ['Numeric Fields', numericFields.length.toString()],
      ['Text Fields', (headers.length - numericFields.length).toString()]
    ];

    // Add summary table
    slide.addTable(summaryData, {
      x: 2,
      y: 2,
      w: 6,
      rowH: 0.6,
      fontSize: 14,
      fontFace: 'Calibri',
      color: template.textColor,
      fill: { color: 'f8f9fa' },
      border: { pt: 1, color: template.secondaryColor }
    });

    // Field details
    if (headers.length > 0) {
      slide.addText('Field Details:', {
        x: 0.5,
        y: 4.5,
        w: '90%',
        h: 0.4,
        fontSize: 16,
        fontFace: 'Calibri',
        color: template.textColor,
        bold: true
      });

      const fieldList = headers.slice(0, 8).map(header => {
        const isNumeric = numericFields.includes(header);
        return `• ${header} (${isNumeric ? 'Numeric' : 'Text'})`;
      }).join('\n');

      slide.addText(fieldList, {
        x: 0.5,
        y: 5,
        w: '90%',
        h: 2,
        fontSize: 12,
        fontFace: 'Calibri',
        color: template.textColor
      });

      if (headers.length > 8) {
        slide.addText(`... and ${headers.length - 8} more fields`, {
          x: 0.5,
          y: 7,
          w: '90%',
          h: 0.4,
          fontSize: 12,
          fontFace: 'Calibri',
          color: template.secondaryColor,
          italic: true
        });
      }
    }

    return 1;
  }

  private static async createRecommendationsSlide(
    pptx: PptxGenJS,
    insights: InsightGenerationResult,
    options: PowerPointOptions,
    template: any
  ): Promise<number> {
    const slide = pptx.addSlide();
    slide.background = { color: template.backgroundColor };

    // Title
    slide.addText('Next Steps & Recommendations', {
      x: 0.5,
      y: 0.3,
      w: '90%',
      h: 0.8,
      fontSize: 28,
      fontFace: 'Calibri',
      color: template.primaryColor,
      bold: true
    });

    // Collect all recommendations
    const allRecommendations: string[] = [];
    insights.insights.forEach(insight => {
      if (insight.recommendations) {
        allRecommendations.push(...insight.recommendations);
      }
    });

    // Display top recommendations
    const topRecommendations = allRecommendations.slice(0, 5);
    
    let yPosition = 1.8;
    topRecommendations.forEach((recommendation, index) => {
      slide.addText(`${index + 1}.`, {
        x: 0.8,
        y: yPosition,
        w: 0.5,
        h: 0.4,
        fontSize: 16,
        fontFace: 'Calibri',
        color: template.accentColor,
        bold: true
      });

      slide.addText(recommendation, {
        x: 1.3,
        y: yPosition,
        w: 8,
        h: 0.8,
        fontSize: 14,
        fontFace: 'Calibri',
        color: template.textColor
      });

      yPosition += 1;
    });

    // Footer
    slide.addText('Generated by DataSnap AI Analytics Platform', {
      x: 0.5,
      y: 7.2,
      w: '90%',
      h: 0.4,
      fontSize: 10,
      fontFace: 'Calibri',
      color: template.secondaryColor,
      align: 'center',
      italic: true
    });

    return 1;
  }

  private static generateFilename(config: ChartConfig, branding?: PowerPointOptions['branding']): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const title = (branding?.presentationTitle || config.title || 'DataSnap Analysis')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .substring(0, 30);
    
    return `${title}-presentation-${timestamp}.pptx`;
  }
}
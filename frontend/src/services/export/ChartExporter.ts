import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ChartConfig, ExportOptions } from '../../types/VisualizationTypes';

export interface ExportResult {
  success: boolean;
  data?: string | Blob;
  error?: string;
  filename?: string;
}

export class ChartExporter {
  private static generateFilename(config: ChartConfig, format: string): string {
    const chartType = config.type;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const title = config.title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30);
    
    return `${title}-${chartType}-${timestamp}.${format}`;
  }

  /**
   * Export chart as PNG image
   */
  static async exportAsPNG(
    chartElement: HTMLElement,
    config: ChartConfig,
    options: Partial<ExportOptions> = {}
  ): Promise<ExportResult> {
    try {
      const canvas = await html2canvas(chartElement, {
        backgroundColor: options.backgroundColor || '#ffffff',
        scale: options.quality === 'high' ? 3 : options.quality === 'medium' ? 2 : 1,
        width: options.width || config.styling.layout.width,
        height: options.height || config.styling.layout.height,
        useCORS: true,
        allowTaint: true,
        removeContainer: true,
      });

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            const filename = options.filename || this.generateFilename(config, 'png');
            
            // Create download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            resolve({
              success: true,
              data: blob,
              filename,
            });
          } else {
            resolve({
              success: false,
              error: 'Failed to create PNG blob',
            });
          }
        }, 'image/png', 1.0);
      });
    } catch (error) {
      return {
        success: false,
        error: `PNG export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Export chart as SVG
   */
  static async exportAsSVG(
    chartElement: HTMLElement,
    config: ChartConfig,
    options: Partial<ExportOptions> = {}
  ): Promise<ExportResult> {
    try {
      // Find SVG elements in the chart
      const svgElements = chartElement.querySelectorAll('svg');
      
      if (svgElements.length === 0) {
        return {
          success: false,
          error: 'No SVG elements found in chart',
        };
      }

      // Clone the first (main) SVG element
      const svgElement = svgElements[0].cloneNode(true) as SVGElement;
      
      // Set dimensions if provided
      if (options.width) svgElement.setAttribute('width', options.width.toString());
      if (options.height) svgElement.setAttribute('height', options.height.toString());
      
      // Set background if provided
      if (options.backgroundColor) {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', '100%');
        rect.setAttribute('height', '100%');
        rect.setAttribute('fill', options.backgroundColor);
        svgElement.insertBefore(rect, svgElement.firstChild);
      }

      // Convert SVG to string
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgElement);
      
      // Add XML header and create blob
      const fullSvgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;
      const blob = new Blob([fullSvgString], { type: 'image/svg+xml;charset=utf-8' });
      
      const filename = options.filename || this.generateFilename(config, 'svg');
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return {
        success: true,
        data: blob,
        filename,
      };
    } catch (error) {
      return {
        success: false,
        error: `SVG export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Export chart as PDF
   */
  static async exportAsPDF(
    chartElement: HTMLElement,
    config: ChartConfig,
    data: Record<string, any>[],
    options: Partial<ExportOptions> = {}
  ): Promise<ExportResult> {
    try {
      // Create PDF document
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;

      // Add title
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(config.title, margin, margin + 10);

      // Add chart description if available
      if (config.description) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        const lines = pdf.splitTextToSize(config.description, pageWidth - 2 * margin);
        pdf.text(lines, margin, margin + 20);
      }

      // Capture chart as image
      const canvas = await html2canvas(chartElement, {
        backgroundColor: options.backgroundColor || '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      const imgData = canvas.toDataURL('image/png');
      
      // Calculate chart dimensions to fit page
      const chartAspectRatio = canvas.width / canvas.height;
      const availableWidth = pageWidth - 2 * margin;
      const availableHeight = (pageHeight - margin * 3 - 30); // Account for title space
      
      let chartWidth = availableWidth;
      let chartHeight = chartWidth / chartAspectRatio;
      
      if (chartHeight > availableHeight) {
        chartHeight = availableHeight;
        chartWidth = chartHeight * chartAspectRatio;
      }

      // Add chart image
      pdf.addImage(
        imgData, 
        'PNG', 
        (pageWidth - chartWidth) / 2, 
        margin + 35, 
        chartWidth, 
        chartHeight
      );

      // Add data summary if requested
      if (options.includeData && data.length > 0) {
        pdf.addPage();
        
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Data Summary', margin, margin + 10);
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        
        const headers = Object.keys(data[0]);
        const maxRows = 40; // Limit rows to fit on page
        const rowHeight = 6;
        let yPosition = margin + 25;
        
        // Add headers
        pdf.setFont('helvetica', 'bold');
        headers.forEach((header, index) => {
          pdf.text(header, margin + (index * 35), yPosition);
        });
        
        yPosition += rowHeight;
        pdf.setFont('helvetica', 'normal');
        
        // Add data rows
        data.slice(0, maxRows).forEach((row, rowIndex) => {
          headers.forEach((header, colIndex) => {
            const value = String(row[header] || '').substring(0, 15);
            pdf.text(value, margin + (colIndex * 35), yPosition + (rowIndex * rowHeight));
          });
        });
        
        if (data.length > maxRows) {
          pdf.text(
            `... and ${data.length - maxRows} more rows`, 
            margin, 
            yPosition + (maxRows * rowHeight) + 10
          );
        }
      }

      // Add footer with export info
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(128);
        
        const exportDate = new Date().toLocaleDateString();
        const footerText = `Generated by DataSnap on ${exportDate} | Page ${i} of ${totalPages}`;
        
        const textWidth = pdf.getTextWidth(footerText);
        pdf.text(footerText, pageWidth - margin - textWidth, pageHeight - 10);
      }

      const filename = options.filename || this.generateFilename(config, 'pdf');
      
      // Save PDF
      pdf.save(filename);

      return {
        success: true,
        data: pdf.output('blob'),
        filename,
      };
    } catch (error) {
      return {
        success: false,
        error: `PDF export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Export data as JSON
   */
  static async exportAsJSON(
    data: Record<string, any>[],
    config: ChartConfig,
    options: Partial<ExportOptions> = {}
  ): Promise<ExportResult> {
    try {
      const exportData = {
        meta: {
          title: config.title,
          description: config.description,
          chartType: config.type,
          fieldMapping: config.fieldMapping,
          exportDate: new Date().toISOString(),
          rowCount: data.length,
        },
        data: data,
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      const filename = options.filename || this.generateFilename(config, 'json');
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return {
        success: true,
        data: blob,
        filename,
      };
    } catch (error) {
      return {
        success: false,
        error: `JSON export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Generate shareable link for the chart
   */
  static async createShareableLink(
    config: ChartConfig,
    data: Record<string, any>[],
    options: { password?: string } = {}
  ): Promise<ExportResult> {
    try {
      // In a real implementation, this would send data to a server
      // For now, we'll create a local storage solution
      
      const shareId = this.generateShareId();
      const shareData = {
        id: shareId,
        config,
        data: options.password ? this.encryptData(data, options.password) : data,
        password: options.password ? true : false,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      };

      // Store in localStorage (in production, this would be sent to a server)
      localStorage.setItem(`share_${shareId}`, JSON.stringify(shareData));
      
      const baseUrl = window.location.origin;
      const shareUrl = `${baseUrl}/share/${shareId}`;

      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);

      return {
        success: true,
        data: shareUrl,
        filename: `share-${shareId}`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Share link creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Generate embed code for the chart
   */
  static async generateEmbedCode(
    config: ChartConfig,
    data: Record<string, any>[],
    options: { width?: number; height?: number } = {}
  ): Promise<ExportResult> {
    try {
      const shareResult = await this.createShareableLink(config, data);
      
      if (!shareResult.success || !shareResult.data) {
        return {
          success: false,
          error: 'Failed to create shareable link for embed',
        };
      }

      const shareUrl = shareResult.data as string;
      const width = options.width || config.styling.layout.width;
      const height = options.height || config.styling.layout.height;

      const embedCode = `<iframe
  src="${shareUrl}?embed=true"
  width="${width}"
  height="${height}"
  frameborder="0"
  allowfullscreen
  title="${config.title}"
  style="border: 1px solid #ddd; border-radius: 4px;"
></iframe>`;

      // Copy to clipboard
      await navigator.clipboard.writeText(embedCode);

      return {
        success: true,
        data: embedCode,
        filename: 'embed-code',
      };
    } catch (error) {
      return {
        success: false,
        error: `Embed code generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private static generateShareId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  private static encryptData(data: any, password: string): string {
    // Simple base64 encoding with password (in production, use proper encryption)
    const jsonString = JSON.stringify(data);
    const encoded = btoa(unescape(encodeURIComponent(jsonString + '::' + password)));
    return encoded;
  }

  /**
   * Main export function that handles all formats
   */
  static async exportChart(
    chartElement: HTMLElement,
    config: ChartConfig,
    data: Record<string, any>[],
    options: ExportOptions
  ): Promise<ExportResult> {
    switch (options.format) {
      case 'png':
        return this.exportAsPNG(chartElement, config, options);
      case 'svg':
        return this.exportAsSVG(chartElement, config, options);
      case 'pdf':
        return this.exportAsPDF(chartElement, config, data, options);
      case 'json':
        return this.exportAsJSON(data, config, options);
      default:
        return {
          success: false,
          error: `Unsupported export format: ${options.format}`,
        };
    }
  }
}
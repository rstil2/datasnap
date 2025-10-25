import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { ChartConfig } from '../../types/VisualizationTypes';
import { InsightGenerationResult } from '../ai/InsightGenerator';

export interface ExcelExportOptions {
  includeRawData?: boolean;
  includeFilteredData?: boolean;
  includeInsights?: boolean;
  includeChartConfig?: boolean;
  includeSummaryStats?: boolean;
  filename?: string;
  worksheetNames?: {
    rawData?: string;
    filteredData?: string;
    insights?: string;
    summary?: string;
    config?: string;
  };
}

export interface ExcelExportResult {
  success: boolean;
  filename?: string;
  worksheetCount?: number;
  error?: string;
}

export class ExcelExporter {
  /**
   * Export comprehensive Excel workbook with multiple worksheets
   */
  static async exportToExcel(
    config: ChartConfig,
    rawData: Record<string, unknown>[],
    filteredData?: Record<string, unknown>[],
    insights?: InsightGenerationResult | null,
    options: ExcelExportOptions = {}
  ): Promise<ExcelExportResult> {
    try {
      const workbook = new ExcelJS.Workbook();
      let worksheetCount = 0;

      const worksheetNames = {
        rawData: options.worksheetNames?.rawData || 'Raw Data',
        filteredData: options.worksheetNames?.filteredData || 'Filtered Data',
        insights: options.worksheetNames?.insights || 'AI Insights',
        summary: options.worksheetNames?.summary || 'Summary Statistics',
        config: options.worksheetNames?.config || 'Chart Configuration',
        ...options.worksheetNames
      };

      // 1. Raw Data Worksheet
      if (options.includeRawData !== false && rawData.length > 0) {
        await this.createRawDataWorksheet(workbook, rawData, worksheetNames.rawData);
        worksheetCount++;
      }

      // 2. Filtered Data Worksheet (if different from raw)
      if (options.includeFilteredData && filteredData && filteredData.length > 0 && filteredData !== rawData) {
        await this.createFilteredDataWorksheet(workbook, filteredData, config, worksheetNames.filteredData);
        worksheetCount++;
      }

      // 3. Summary Statistics Worksheet
      if (options.includeSummaryStats !== false && rawData.length > 0) {
        await this.createSummaryStatsWorksheet(workbook, rawData, config, worksheetNames.summary);
        worksheetCount++;
      }

      // 4. AI Insights Worksheet
      if (options.includeInsights && insights && insights.insights.length > 0) {
        await this.createInsightsWorksheet(workbook, insights, worksheetNames.insights);
        worksheetCount++;
      }

      // 5. Chart Configuration Worksheet
      if (options.includeChartConfig !== false) {
        await this.createConfigWorksheet(workbook, config, worksheetNames.config);
        worksheetCount++;
      }

      // Generate filename
      const filename = options.filename || this.generateFilename(config);

      // Convert workbook to buffer and save
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      saveAs(blob, filename);

      return {
        success: true,
        filename,
        worksheetCount
      };

    } catch (error) {
      return {
        success: false,
        error: `Excel export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static async createRawDataWorksheet(
    workbook: ExcelJS.Workbook, 
    data: Record<string, unknown>[], 
    sheetName: string
  ): Promise<void> {
    const worksheet = workbook.addWorksheet(sheetName);
    
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    
    // Add headers
    worksheet.addRow(headers);
    
    // Style headers
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2563EB' }
      };
      cell.alignment = { horizontal: 'center' };
    });
    
    // Add data rows
    data.forEach(row => {
      const values = headers.map(header => row[header]);
      worksheet.addRow(values);
    });
    
    // Set column widths
    headers.forEach((header, index) => {
      const column = worksheet.getColumn(index + 1);
      column.width = Math.max(header.length, 15);
    });
    
    // Add autofilter
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: headers.length }
    };
  }

  private static async createFilteredDataWorksheet(
    workbook: ExcelJS.Workbook,
    data: Record<string, unknown>[],
    config: ChartConfig,
    sheetName: string
  ): Promise<void> {
    const worksheet = workbook.addWorksheet(sheetName);
    
    // Add metadata about filtering
    const metadata = [
      ['Filtered Data for Chart:', config.title],
      ['Chart Type:', config.type],
      ['Generated:', new Date().toISOString()],
      ['Total Records:', data.length.toString()],
      [''], // Empty row
      ['Field Mapping:']
    ];

    // Add field mapping info
    Object.entries(config.fieldMapping).forEach(([role, field]) => {
      if (field) {
        metadata.push([`${role.toUpperCase()}:`, field]);
      }
    });

    metadata.push(['']); // Empty row before data

    // Add metadata rows
    metadata.forEach(row => worksheet.addRow(row));

    // Add the actual data below metadata
    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      const dataStartRow = metadata.length + 1;
      
      // Add headers
      worksheet.addRow(headers);
      
      // Style data headers
      const headerRow = worksheet.getRow(dataStartRow);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF059669' }
        };
        cell.alignment = { horizontal: 'center' };
      });
      
      // Add data rows
      data.forEach(row => {
        const values = headers.map(header => row[header]);
        worksheet.addRow(values);
      });
      
      // Set column widths
      headers.forEach((header, index) => {
        const column = worksheet.getColumn(index + 1);
        column.width = Math.max(header.length, 15);
      });
    }
  }

  private static async createSummaryStatsWorksheet(
    workbook: ExcelJS.Workbook,
    data: Record<string, unknown>[],
    config: ChartConfig,
    sheetName: string
  ): Promise<void> {
    const worksheet = workbook.addWorksheet(sheetName);
    const headers = data.length > 0 ? Object.keys(data[0]) : [];
    
    // Add title
    worksheet.addRow(['Dataset Summary']);
    worksheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF2563EB' } };
    
    // Add basic info
    worksheet.addRow(['Chart Title:', config.title]);
    worksheet.addRow(['Chart Type:', config.type]);
    worksheet.addRow(['Generated:', new Date().toLocaleString()]);
    worksheet.addRow(['']);
    
    // Dataset statistics
    worksheet.addRow(['Dataset Statistics:']);
    const statsHeaderRow = worksheet.lastRow?.number || 0;
    worksheet.getCell(`A${statsHeaderRow}`).font = { bold: true, color: { argb: 'FF059669' } };
    
    worksheet.addRow(['Total Records:', data.length.toString()]);
    worksheet.addRow(['Total Fields:', headers.length.toString()]);
    worksheet.addRow(['']);
    
    // Field analysis header
    worksheet.addRow(['Field Analysis:']);
    const fieldHeaderRow = worksheet.lastRow?.number || 0;
    worksheet.getCell(`A${fieldHeaderRow}`).font = { bold: true, color: { argb: 'FF059669' } };
    
    worksheet.addRow(['Field Name', 'Type', 'Non-Null Count', 'Unique Values', 'Sample Values']);
    const tableHeaderRow = worksheet.getRow(worksheet.lastRow?.number || 0);
    tableHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF8B5CF6' }
      };
    });

    // Analyze each field
    headers.forEach(header => {
      const values = data.map(row => row[header]).filter(v => v != null && v !== '');
      const uniqueValues = new Set(values);
      const numericValues = values.filter(v => !isNaN(Number(v))).length;
      const fieldType = numericValues > values.length * 0.8 ? 'Numeric' : 'Text';
      
      const sampleValues = Array.from(uniqueValues).slice(0, 3).map(v => String(v)).join(', ');

      worksheet.addRow([
        header,
        fieldType,
        values.length.toString(),
        uniqueValues.size.toString(),
        sampleValues + (uniqueValues.size > 3 ? '...' : '')
      ]);
    });

    // Add numeric field statistics if any
    const numericHeaders = headers.filter(header => {
      const values = data.map(row => row[header]).filter(v => v != null);
      const numericValues = values.filter(v => !isNaN(Number(v))).length;
      return numericValues > values.length * 0.8;
    });

    if (numericHeaders.length > 0) {
      worksheet.addRow(['']);
      worksheet.addRow(['Numeric Field Statistics:']);
      const numStatsHeaderRow = worksheet.lastRow?.number || 0;
      worksheet.getCell(`A${numStatsHeaderRow}`).font = { bold: true, color: { argb: 'FF059669' } };
      
      worksheet.addRow(['Field Name', 'Min', 'Max', 'Mean', 'Median']);
      const numTableHeaderRow = worksheet.getRow(worksheet.lastRow?.number || 0);
      numTableHeaderRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF8B5CF6' }
        };
      });

      numericHeaders.forEach(header => {
        const values = data.map(row => Number(row[header])).filter(v => !isNaN(v));
        
        if (values.length > 0) {
          values.sort((a, b) => a - b);
          const min = Math.min(...values);
          const max = Math.max(...values);
          const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
          const median = values.length % 2 === 0 
            ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
            : values[Math.floor(values.length / 2)];

          worksheet.addRow([
            header,
            min.toFixed(2),
            max.toFixed(2),
            mean.toFixed(2),
            median.toFixed(2)
          ]);
        }
      });
    }

    // Set column widths
    worksheet.getColumn(1).width = 20;
    worksheet.getColumn(2).width = 15;
    worksheet.getColumn(3).width = 15;
    worksheet.getColumn(4).width = 15;
    worksheet.getColumn(5).width = 30;
  }

  private static async createInsightsWorksheet(
    workbook: ExcelJS.Workbook,
    insights: InsightGenerationResult,
    sheetName: string
  ): Promise<void> {
    const worksheet = workbook.addWorksheet(sheetName);
    
    // Title
    worksheet.addRow(['AI-Powered Insights Report']);
    worksheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF7C3AED' } };
    
    worksheet.addRow(['Generated:', new Date().toLocaleString()]);
    worksheet.addRow(['Overall Confidence:', `${Math.round(insights.confidence * 100)}%`]);
    worksheet.addRow(['']);
    
    // Executive summary
    worksheet.addRow(['Executive Summary:']);
    const execSummaryRow = worksheet.lastRow?.number || 0;
    worksheet.getCell(`A${execSummaryRow}`).font = { bold: true, color: { argb: 'FF8B5CF6' } };
    
    worksheet.addRow([insights.executiveSummary || 'No executive summary available']);
    worksheet.addRow(['']);
    
    // Detailed insights
    worksheet.addRow(['Detailed Insights:']);
    const detailedInsightsRow = worksheet.lastRow?.number || 0;
    worksheet.getCell(`A${detailedInsightsRow}`).font = { bold: true, color: { argb: 'FF8B5CF6' } };
    
    worksheet.addRow(['Priority', 'Type', 'Title', 'Description', 'Confidence', 'Recommendations']);
    const headerRow = worksheet.getRow(worksheet.lastRow?.number || 0);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF8B5CF6' }
      };
    });

    // Add each insight
    insights.insights.forEach(insight => {
      const recommendations = insight.recommendations ? insight.recommendations.join('; ') : 'None';
      
      worksheet.addRow([
        insight.priority.toUpperCase(),
        insight.type,
        insight.title,
        insight.description,
        `${Math.round(insight.confidence * 100)}%`,
        recommendations
      ]);
    });

    // Add insights summary
    worksheet.addRow(['']);
    worksheet.addRow(['Insights Summary by Priority:']);
    const summaryRow = worksheet.lastRow?.number || 0;
    worksheet.getCell(`A${summaryRow}`).font = { bold: true, color: { argb: 'FF8B5CF6' } };
    
    const priorityCounts = {
      critical: insights.insights.filter(i => i.priority === 'critical').length,
      high: insights.insights.filter(i => i.priority === 'high').length,
      medium: insights.insights.filter(i => i.priority === 'medium').length,
      low: insights.insights.filter(i => i.priority === 'low').length
    };

    Object.entries(priorityCounts).forEach(([priority, count]) => {
      if (count > 0) {
        worksheet.addRow([`${priority.toUpperCase()}:`, count.toString()]);
      }
    });

    // Set column widths
    worksheet.getColumn(1).width = 12; // Priority
    worksheet.getColumn(2).width = 15; // Type
    worksheet.getColumn(3).width = 30; // Title
    worksheet.getColumn(4).width = 50; // Description
    worksheet.getColumn(5).width = 12; // Confidence
    worksheet.getColumn(6).width = 40; // Recommendations
  }

  private static async createConfigWorksheet(
    workbook: ExcelJS.Workbook,
    config: ChartConfig,
    sheetName: string
  ): Promise<void> {
    const worksheet = workbook.addWorksheet(sheetName);
    
    // Title
    worksheet.addRow(['Chart Configuration']);
    worksheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF059669' } };
    
    worksheet.addRow(['Generated:', new Date().toLocaleString()]);
    worksheet.addRow(['']);
    
    // Basic settings
    worksheet.addRow(['Basic Settings:']);
    let currentRow = worksheet.lastRow?.number || 0;
    worksheet.getCell(`A${currentRow}`).font = { bold: true, color: { argb: 'FF10B981' } };
    
    worksheet.addRow(['Title:', config.title]);
    worksheet.addRow(['Chart Type:', config.type]);
    worksheet.addRow(['Description:', config.description || 'None']);
    worksheet.addRow(['']);
    
    // Field mapping
    worksheet.addRow(['Field Mapping:']);
    currentRow = worksheet.lastRow?.number || 0;
    worksheet.getCell(`A${currentRow}`).font = { bold: true, color: { argb: 'FF10B981' } };
    
    Object.entries(config.fieldMapping).forEach(([role, field]) => {
      if (field) {
        worksheet.addRow([`${role.toUpperCase()}:`, field]);
      }
    });

    worksheet.addRow(['']);
    
    // Styling configuration
    worksheet.addRow(['Styling Configuration:']);
    currentRow = worksheet.lastRow?.number || 0;
    worksheet.getCell(`A${currentRow}`).font = { bold: true, color: { argb: 'FF10B981' } };
    
    worksheet.addRow(['Theme:', config.styling.theme]);
    worksheet.addRow(['Width:', config.styling.layout.width.toString()]);
    worksheet.addRow(['Height:', config.styling.layout.height.toString()]);
    worksheet.addRow(['Color Scheme:', config.styling.colors.scheme]);

    if (config.styling.legend) {
      worksheet.addRow(['']);
      worksheet.addRow(['Legend Settings:']);
      currentRow = worksheet.lastRow?.number || 0;
      worksheet.getCell(`A${currentRow}`).font = { bold: true, color: { argb: 'FF10B981' } };
      
      worksheet.addRow(['Show Legend:', config.styling.legend.show ? 'Yes' : 'No']);
      worksheet.addRow(['Legend Position:', config.styling.legend.position]);
    }

    if (config.animation) {
      worksheet.addRow(['']);
      worksheet.addRow(['Animation Settings:']);
      currentRow = worksheet.lastRow?.number || 0;
      worksheet.getCell(`A${currentRow}`).font = { bold: true, color: { argb: 'FF10B981' } };
      
      worksheet.addRow(['Enabled:', config.animation.enabled ? 'Yes' : 'No']);
      worksheet.addRow(['Duration:', `${config.animation.duration}ms`]);
      worksheet.addRow(['Easing:', config.animation.easing]);
    }

    // Set column widths
    worksheet.getColumn(1).width = 25; // Setting name
    worksheet.getColumn(2).width = 30; // Setting value
  }

  private static generateFilename(config: ChartConfig): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const title = config.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .substring(0, 30);
    
    return `${title}-data-export-${timestamp}.xlsx`;
  }
}
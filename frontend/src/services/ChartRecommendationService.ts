/**
 * AI-Powered Chart Recommendation Service
 * Analyzes data structure and suggests optimal visualizations
 */

import { FileParseResult } from './FileParserService';
import { apiService } from './api';

export interface ChartRecommendation {
  id: string;
  chartType: 'scatter' | 'line' | 'bar' | 'pie' | 'histogram' | 'boxplot' | 'heatmap' | 'area';
  title: string;
  description: string;
  confidence: number; // 0-1
  reasoning: string;
  columns: {
    x?: string;
    y?: string;
    color?: string;
    size?: string;
    group?: string;
  };
  preview?: {
    thumbnail?: string;
    sampleData?: any[];
  };
  insights: string[];
  complexity: 'simple' | 'intermediate' | 'advanced';
  tags: string[];
}

export interface DataAnalysis {
  numericalColumns: string[];
  categoricalColumns: string[];
  dateColumns: string[];
  booleanColumns: string[];
  correlations: Array<{
    column1: string;
    column2: string;
    strength: number;
    type: 'positive' | 'negative' | 'none';
  }>;
  patterns: Array<{
    type: 'trend' | 'seasonal' | 'outlier' | 'distribution';
    description: string;
    columns: string[];
  }>;
  dataQuality: {
    completeness: number;
    uniqueness: Record<string, number>;
    outliers: Record<string, number>;
  };
}

export class ChartRecommendationService {
  private static readonly CHART_RULES = {
    scatter: {
      minNumerical: 2,
      maxCategorical: 2,
      description: 'Shows relationships between two numerical variables',
      useCases: ['correlation', 'relationship', 'clustering']
    },
    line: {
      minNumerical: 1,
      requiresDate: false,
      description: 'Shows trends over time or ordered data',
      useCases: ['time-series', 'trend', 'progression']
    },
    bar: {
      minCategorical: 1,
      minNumerical: 1,
      description: 'Compares values across categories',
      useCases: ['comparison', 'ranking', 'categorical-analysis']
    },
    pie: {
      minCategorical: 1,
      maxCategories: 8,
      description: 'Shows parts of a whole',
      useCases: ['composition', 'percentage', 'parts-to-whole']
    },
    histogram: {
      minNumerical: 1,
      description: 'Shows distribution of a single variable',
      useCases: ['distribution', 'frequency', 'data-exploration']
    },
    boxplot: {
      minNumerical: 1,
      description: 'Shows statistical summary and outliers',
      useCases: ['outlier-detection', 'statistical-summary', 'comparison']
    },
    heatmap: {
      minNumerical: 2,
      description: 'Shows correlation or intensity patterns',
      useCases: ['correlation', 'pattern-detection', 'matrix-data']
    },
    area: {
      minNumerical: 1,
      requiresDate: false,
      description: 'Shows cumulative trends or stacked comparisons',
      useCases: ['cumulative', 'stacked-comparison', 'time-series']
    }
  };

  /**
   * Analyze data structure and generate chart recommendations
   */
  static async generateRecommendations(
    parseResult: FileParseResult,
    options: {
      maxRecommendations?: number;
      minConfidence?: number;
      includeAdvanced?: boolean;
    } = {}
  ): Promise<ChartRecommendation[]> {
    const {
      maxRecommendations = 6,
      minConfidence = 0.3,
      includeAdvanced = true
    } = options;

    // Analyze data structure
    const analysis = this.analyzeDataStructure(parseResult);
    
    // Generate base recommendations
    const recommendations: ChartRecommendation[] = [];

    // 1. Scatter plots for numerical relationships
    if (analysis.numericalColumns.length >= 2) {
      const scatterRecs = this.generateScatterRecommendations(analysis, parseResult);
      recommendations.push(...scatterRecs);
    }

    // 2. Bar charts for categorical analysis
    if (analysis.categoricalColumns.length >= 1 && analysis.numericalColumns.length >= 1) {
      const barRecs = this.generateBarRecommendations(analysis, parseResult);
      recommendations.push(...barRecs);
    }

    // 3. Line charts for trends (especially with dates)
    if (analysis.numericalColumns.length >= 1) {
      const lineRecs = this.generateLineRecommendations(analysis, parseResult);
      recommendations.push(...lineRecs);
    }

    // 4. Histograms for distributions
    if (analysis.numericalColumns.length >= 1) {
      const histRecs = this.generateHistogramRecommendations(analysis, parseResult);
      recommendations.push(...histRecs);
    }

    // 5. Pie charts for composition
    if (analysis.categoricalColumns.length >= 1) {
      const pieRecs = this.generatePieRecommendations(analysis, parseResult);
      recommendations.push(...pieRecs);
    }

    // 6. Advanced visualizations
    if (includeAdvanced) {
      const advancedRecs = this.generateAdvancedRecommendations(analysis, parseResult);
      recommendations.push(...advancedRecs);
    }

    // Sort by confidence and limit results
    return recommendations
      .filter(rec => rec.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxRecommendations)
      .map((rec, index) => ({ ...rec, id: `rec_${index}_${rec.chartType}` }));
  }

  /**
   * Analyze data structure and extract patterns
   */
  private static analyzeDataStructure(parseResult: FileParseResult): DataAnalysis {
    const { schema, data } = parseResult;
    
    const numericalColumns = schema.columns
      .filter(col => col.type === 'number')
      .map(col => col.name);
    
    const categoricalColumns = schema.columns
      .filter(col => col.type === 'string' && this.isCategorical(col, data))
      .map(col => col.name);
    
    const dateColumns = schema.columns
      .filter(col => col.type === 'date')
      .map(col => col.name);
    
    const booleanColumns = schema.columns
      .filter(col => col.type === 'boolean')
      .map(col => col.name);

    // Calculate correlations between numerical columns
    const correlations = this.calculateCorrelations(numericalColumns, data);
    
    // Detect patterns
    const patterns = this.detectPatterns(schema.columns, data);
    
    // Assess data quality
    const dataQuality = this.assessDataQuality(schema.columns, data);

    return {
      numericalColumns,
      categoricalColumns,
      dateColumns,
      booleanColumns,
      correlations,
      patterns,
      dataQuality
    };
  }

  /**
   * Generate scatter plot recommendations
   */
  private static generateScatterRecommendations(
    analysis: DataAnalysis,
    parseResult: FileParseResult
  ): ChartRecommendation[] {
    const recommendations: ChartRecommendation[] = [];
    const { numericalColumns, categoricalColumns, correlations } = analysis;

    // Find strong correlations
    const strongCorrelations = correlations
      .filter(corr => Math.abs(corr.strength) > 0.5)
      .sort((a, b) => Math.abs(b.strength) - Math.abs(a.strength))
      .slice(0, 3);

    strongCorrelations.forEach((corr, index) => {
      const colorColumn = categoricalColumns.length > 0 ? categoricalColumns[0] : undefined;
      const confidence = Math.min(0.9, 0.6 + Math.abs(corr.strength) * 0.3);
      
      recommendations.push({
        id: '',
        chartType: 'scatter',
        title: `${corr.column1} vs ${corr.column2} Relationship`,
        description: `Scatter plot showing ${corr.type} correlation between ${corr.column1} and ${corr.column2}`,
        confidence,
        reasoning: `Strong ${corr.type} correlation (${Math.abs(corr.strength).toFixed(2)}) detected between these variables`,
        columns: {
          x: corr.column1,
          y: corr.column2,
          color: colorColumn
        },
        insights: [
          `${corr.type.charAt(0).toUpperCase() + corr.type.slice(1)} correlation strength: ${Math.abs(corr.strength).toFixed(2)}`,
          colorColumn ? `Color-coded by ${colorColumn} for additional insights` : 'Consider adding grouping for deeper analysis'
        ],
        complexity: colorColumn ? 'intermediate' : 'simple',
        tags: ['correlation', 'relationship', 'scatter']
      });
    });

    return recommendations;
  }

  /**
   * Generate bar chart recommendations
   */
  private static generateBarRecommendations(
    analysis: DataAnalysis,
    parseResult: FileParseResult
  ): ChartRecommendation[] {
    const recommendations: ChartRecommendation[] = [];
    const { numericalColumns, categoricalColumns } = analysis;

    // Primary categorical vs numerical comparisons
    categoricalColumns.slice(0, 2).forEach(catCol => {
      numericalColumns.slice(0, 2).forEach(numCol => {
        const uniqueValues = this.getUniqueValueCount(catCol, parseResult.data);
        const confidence = uniqueValues <= 10 ? 0.8 : Math.max(0.4, 0.8 - (uniqueValues - 10) * 0.05);

        recommendations.push({
          id: '',
          chartType: 'bar',
          title: `${numCol} by ${catCol}`,
          description: `Compare ${numCol} values across different ${catCol} categories`,
          confidence,
          reasoning: `${catCol} has ${uniqueValues} categories, ideal for bar chart comparison`,
          columns: {
            x: catCol,
            y: numCol
          },
          insights: [
            `Compares ${numCol} across ${uniqueValues} categories`,
            uniqueValues > 5 ? 'Consider filtering for top categories' : 'All categories clearly visible'
          ],
          complexity: uniqueValues > 8 ? 'intermediate' : 'simple',
          tags: ['comparison', 'categorical', 'bar']
        });
      });
    });

    return recommendations;
  }

  /**
   * Generate line chart recommendations
   */
  private static generateLineRecommendations(
    analysis: DataAnalysis,
    parseResult: FileParseResult
  ): ChartRecommendation[] {
    const recommendations: ChartRecommendation[] = [];
    const { numericalColumns, dateColumns, categoricalColumns } = analysis;

    // Time series if date column exists
    if (dateColumns.length > 0) {
      numericalColumns.slice(0, 2).forEach(numCol => {
        recommendations.push({
          id: '',
          chartType: 'line',
          title: `${numCol} Over Time`,
          description: `Track ${numCol} trends over time`,
          confidence: 0.85,
          reasoning: `Date column detected - perfect for time series analysis`,
          columns: {
            x: dateColumns[0],
            y: numCol,
            color: categoricalColumns.length > 0 ? categoricalColumns[0] : undefined
          },
          insights: [
            'Time-based trend analysis',
            'Identify patterns and seasonality',
            categoricalColumns.length > 0 ? `Group by ${categoricalColumns[0]} for comparison` : 'Consider adding grouping variable'
          ],
          complexity: 'intermediate',
          tags: ['time-series', 'trend', 'temporal']
        });
      });
    } else {
      // Ordered numerical progression
      if (numericalColumns.length >= 2) {
        const firstNum = numericalColumns[0];
        const secondNum = numericalColumns[1];
        
        recommendations.push({
          id: '',
          chartType: 'line',
          title: `${secondNum} Progression`,
          description: `Show ${secondNum} values in sequence`,
          confidence: 0.6,
          reasoning: `Line chart can show progression or ordering in the data`,
          columns: {
            x: firstNum,
            y: secondNum
          },
          insights: [
            'Shows progression or sequence in data',
            'Consider if data has natural ordering'
          ],
          complexity: 'simple',
          tags: ['progression', 'sequence', 'line']
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate histogram recommendations
   */
  private static generateHistogramRecommendations(
    analysis: DataAnalysis,
    parseResult: FileParseResult
  ): ChartRecommendation[] {
    const recommendations: ChartRecommendation[] = [];
    const { numericalColumns, categoricalColumns } = analysis;

    numericalColumns.slice(0, 3).forEach(numCol => {
      const uniqueValues = this.getUniqueValueCount(numCol, parseResult.data);
      const confidence = uniqueValues > 10 ? 0.75 : 0.5;

      recommendations.push({
        id: '',
        chartType: 'histogram',
        title: `${numCol} Distribution`,
        description: `Explore the distribution and frequency of ${numCol} values`,
        confidence,
        reasoning: `${uniqueValues} unique values provide good distribution analysis`,
        columns: {
          x: numCol,
          group: categoricalColumns.length > 0 ? categoricalColumns[0] : undefined
        },
        insights: [
          'Understand data distribution patterns',
          'Identify outliers and skewness',
          categoricalColumns.length > 0 ? `Compare distributions by ${categoricalColumns[0]}` : 'Single distribution analysis'
        ],
        complexity: 'simple',
        tags: ['distribution', 'frequency', 'exploration']
      });
    });

    return recommendations;
  }

  /**
   * Generate pie chart recommendations
   */
  private static generatePieRecommendations(
    analysis: DataAnalysis,
    parseResult: FileParseResult
  ): ChartRecommendation[] {
    const recommendations: ChartRecommendation[] = [];
    const { categoricalColumns } = analysis;

    categoricalColumns.forEach(catCol => {
      const uniqueValues = this.getUniqueValueCount(catCol, parseResult.data);
      
      if (uniqueValues <= 8 && uniqueValues >= 2) {
        const confidence = Math.max(0.4, 0.8 - (uniqueValues - 3) * 0.1);

        recommendations.push({
          id: '',
          chartType: 'pie',
          title: `${catCol} Composition`,
          description: `Show the proportional breakdown of ${catCol} categories`,
          confidence,
          reasoning: `${uniqueValues} categories ideal for pie chart composition`,
          columns: {
            x: catCol
          },
          insights: [
            `Shows percentage breakdown of ${uniqueValues} categories`,
            uniqueValues > 5 ? 'Consider combining smaller categories' : 'Clear categorical breakdown'
          ],
          complexity: 'simple',
          tags: ['composition', 'percentage', 'categorical']
        });
      }
    });

    return recommendations;
  }

  /**
   * Generate advanced visualization recommendations
   */
  private static generateAdvancedRecommendations(
    analysis: DataAnalysis,
    parseResult: FileParseResult
  ): ChartRecommendation[] {
    const recommendations: ChartRecommendation[] = [];
    const { numericalColumns, categoricalColumns } = analysis;

    // Heatmap for correlations
    if (numericalColumns.length >= 3) {
      recommendations.push({
        id: '',
        chartType: 'heatmap',
        title: 'Correlation Heatmap',
        description: 'Visualize correlations between all numerical variables',
        confidence: 0.65,
        reasoning: `${numericalColumns.length} numerical columns provide rich correlation analysis`,
        columns: {},
        insights: [
          'Identify hidden relationships between variables',
          'Spot multicollinearity issues',
          'Find unexpected correlations'
        ],
        complexity: 'advanced',
        tags: ['correlation', 'advanced', 'matrix']
      });
    }

    // Box plots for statistical analysis
    if (numericalColumns.length >= 1 && categoricalColumns.length >= 1) {
      const numCol = numericalColumns[0];
      const catCol = categoricalColumns[0];
      
      recommendations.push({
        id: '',
        chartType: 'boxplot',
        title: `${numCol} Distribution by ${catCol}`,
        description: `Statistical summary of ${numCol} across ${catCol} groups`,
        confidence: 0.55,
        reasoning: `Box plot reveals distribution differences and outliers across groups`,
        columns: {
          x: catCol,
          y: numCol
        },
        insights: [
          'Compare statistical distributions across groups',
          'Identify outliers within each category',
          'Understand data spread and quartiles'
        ],
        complexity: 'advanced',
        tags: ['statistical', 'distribution', 'outliers']
      });
    }

    return recommendations;
  }

  /**
   * Helper methods
   */
  private static isCategorical(column: any, data: any[]): boolean {
    const uniqueValues = new Set(data.map(row => row[column.name])).size;
    const totalValues = data.length;
    return uniqueValues / totalValues <= 0.5 && uniqueValues <= 20;
  }

  private static getUniqueValueCount(columnName: string, data: any[]): number {
    return new Set(data.map(row => row[columnName])).size;
  }

  private static calculateCorrelations(numericalColumns: string[], data: any[]): DataAnalysis['correlations'] {
    const correlations: DataAnalysis['correlations'] = [];
    
    for (let i = 0; i < numericalColumns.length; i++) {
      for (let j = i + 1; j < numericalColumns.length; j++) {
        const col1 = numericalColumns[i];
        const col2 = numericalColumns[j];
        
        // Simple correlation calculation (Pearson)
        const values1 = data.map(row => parseFloat(row[col1])).filter(val => !isNaN(val));
        const values2 = data.map(row => parseFloat(row[col2])).filter(val => !isNaN(val));
        
        if (values1.length > 0 && values2.length > 0) {
          const correlation = this.pearsonCorrelation(values1, values2);
          
          correlations.push({
            column1: col1,
            column2: col2,
            strength: correlation,
            type: correlation > 0.1 ? 'positive' : correlation < -0.1 ? 'negative' : 'none'
          });
        }
      }
    }
    
    return correlations;
  }

  private static pearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;
    
    const sumX = x.slice(0, n).reduce((a, b) => a + b, 0);
    const sumY = y.slice(0, n).reduce((a, b) => a + b, 0);
    const sumXY = x.slice(0, n).reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.slice(0, n).reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.slice(0, n).reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private static detectPatterns(columns: any[], data: any[]): DataAnalysis['patterns'] {
    const patterns: DataAnalysis['patterns'] = [];
    
    // Simple pattern detection
    columns.forEach(column => {
      if (column.type === 'number') {
        const values = data.map(row => parseFloat(row[column.name])).filter(val => !isNaN(val));
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const std = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
        
        // Detect outliers
        const outliers = values.filter(val => Math.abs(val - mean) > 2 * std).length;
        if (outliers > 0) {
          patterns.push({
            type: 'outlier',
            description: `${outliers} potential outliers detected in ${column.name}`,
            columns: [column.name]
          });
        }
      }
    });
    
    return patterns;
  }

  private static assessDataQuality(columns: any[], data: any[]): DataAnalysis['dataQuality'] {
    const completeness = data.length > 0 ? 
      columns.reduce((sum, col) => {
        const nonNullCount = data.filter(row => 
          row[col.name] !== null && row[col.name] !== undefined && row[col.name] !== ''
        ).length;
        return sum + (nonNullCount / data.length);
      }, 0) / columns.length : 0;

    const uniqueness: Record<string, number> = {};
    const outliers: Record<string, number> = {};

    columns.forEach(column => {
      const values = data.map(row => row[column.name]);
      const uniqueCount = new Set(values).size;
      uniqueness[column.name] = values.length > 0 ? uniqueCount / values.length : 0;
      outliers[column.name] = 0; // Simplified for now
    });

    return {
      completeness,
      uniqueness,
      outliers
    };
  }

  /**
   * Get chart suggestions using the existing API
   */
  static async getAPIRecommendations(fileId: number): Promise<ChartRecommendation[]> {
    try {
      const response = await apiService.getChartSuggestions(fileId);
      
      return response.suggestions.map((suggestion, index) => ({
        id: `api_rec_${index}`,
        chartType: suggestion.chart_type as any,
        title: `${suggestion.chart_type} - ${suggestion.columns.join(' vs ')}`,
        description: suggestion.reason,
        confidence: suggestion.confidence,
        reasoning: suggestion.reason,
        columns: this.parseAPIColumns(suggestion.chart_type, suggestion.columns),
        insights: [`API confidence: ${(suggestion.confidence * 100).toFixed(1)}%`],
        complexity: 'intermediate',
        tags: [suggestion.chart_type, 'api-suggested']
      }));
    } catch (error) {
      console.warn('Failed to get API recommendations:', error);
      return [];
    }
  }

  private static parseAPIColumns(chartType: string, columns: string[]): ChartRecommendation['columns'] {
    switch (chartType) {
      case 'scatter':
        return { x: columns[0], y: columns[1], color: columns[2] };
      case 'bar':
        return { x: columns[0], y: columns[1] };
      case 'line':
        return { x: columns[0], y: columns[1] };
      default:
        return { x: columns[0], y: columns[1] };
    }
  }
}

export default ChartRecommendationService;
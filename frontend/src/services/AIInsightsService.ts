/**
 * AI Insights Service
 * Generates natural language insights from data analysis
 */

import { FileParseResult } from './FileParserService';
import { ChartRecommendation } from './ChartRecommendationService';
import { apiService } from './api';

export interface DataInsight {
  id: string;
  type: 'trend' | 'correlation' | 'outlier' | 'distribution' | 'composition' | 'summary';
  title: string;
  description: string;
  confidence: number; // 0-1
  importance: 'critical' | 'high' | 'medium' | 'low';
  evidence: {
    dataPoints: any[];
    statistics?: Record<string, number>;
    visualSuggestion?: string;
  };
  narrative: string;
  actionableRecommendation?: string;
}

export interface InsightSummary {
  keyFindings: string[];
  dataQuality: {
    score: number; // 0-100
    issues: string[];
    strengths: string[];
  };
  recommendedActions: string[];
  overallNarrative: string;
  trustScore: number; // 0-100
}

interface DataStats {
  numerical: Record<string, {
    mean: number;
    median: number;
    std: number;
    min: number;
    max: number;
    outliers: number;
    nullCount: number;
  }>;
  categorical: Record<string, {
    uniqueCount: number;
    topValues: Array<{ value: any; count: number }>;
    nullCount: number;
    entropy: number;
  }>;
  overall: {
    totalRows: number;
    totalColumns: number;
    completeness: number;
    duplicates: number;
  };
}

export class AIInsightsService {
  /**
   * Generate comprehensive insights from parsed data
   */
  static async generateInsights(
    parseResult: FileParseResult,
    recommendations?: ChartRecommendation[]
  ): Promise<{ insights: DataInsight[]; summary: InsightSummary }> {
    const { data, headers, schema } = parseResult;
    
    // Calculate comprehensive data statistics
    const stats = this.calculateDataStats(data, headers, schema.columns);
    
    // Generate various types of insights
    const insights: DataInsight[] = [
      ...this.generateSummaryInsights(stats, parseResult),
      ...this.generateTrendInsights(stats, data, schema.columns),
      ...this.generateCorrelationInsights(stats, data, schema.columns),
      ...this.generateDistributionInsights(stats, data, schema.columns),
      ...this.generateOutlierInsights(stats, data, schema.columns),
      ...this.generateCompositionInsights(stats, data, schema.columns),
    ];
    
    // Generate overall summary
    const summary = this.generateInsightSummary(insights, stats, recommendations);
    
    // Sort insights by importance and confidence
    insights.sort((a, b) => {
      const importanceWeight = { critical: 4, high: 3, medium: 2, low: 1 };
      const aScore = importanceWeight[a.importance] * a.confidence;
      const bScore = importanceWeight[b.importance] * b.confidence;
      return bScore - aScore;
    });
    
    return { insights: insights.slice(0, 12), summary };
  }

  /**
   * Generate insights for chart recommendations
   */
  static async generateChartInsights(
    recommendation: ChartRecommendation,
    data: Record<string, any>[]
  ): Promise<DataInsight[]> {
    const insights: DataInsight[] = [];
    
    // Chart-specific insights
    const chartInsight: DataInsight = {
      id: `chart_${recommendation.id}`,
      type: 'summary',
      title: `${recommendation.chartType.charAt(0).toUpperCase() + recommendation.chartType.slice(1)} Chart Recommendation`,
      description: recommendation.description,
      confidence: recommendation.confidence,
      importance: recommendation.confidence > 0.8 ? 'critical' : recommendation.confidence > 0.6 ? 'high' : 'medium',
      evidence: {
        dataPoints: Object.values(recommendation.columns).filter(Boolean).map(col => ({
          column: col,
          relevance: 'primary'
        })),
        statistics: { confidence: recommendation.confidence }
      },
      narrative: this.generateChartNarrative(recommendation, data),
      actionableRecommendation: `Create a ${recommendation.chartType} chart to ${recommendation.description.toLowerCase()}.`
    };
    
    insights.push(chartInsight);
    
    // Column-specific insights
    if (recommendation.columns.x && recommendation.columns.y) {
      const relationshipInsight = this.analyzeColumnRelationship(
        recommendation.columns.x,
        recommendation.columns.y,
        data
      );
      if (relationshipInsight) {
        insights.push(relationshipInsight);
      }
    }
    
    return insights;
  }

  /**
   * Calculate comprehensive data statistics
   */
  private static calculateDataStats(
    data: Record<string, any>[],
    headers: string[],
    columns: any[]
  ): DataStats {
    const stats: DataStats = {
      numerical: {},
      categorical: {},
      overall: {
        totalRows: data.length,
        totalColumns: headers.length,
        completeness: 0,
        duplicates: 0
      }
    };

    // Calculate completeness
    let totalCells = 0;
    let nonNullCells = 0;
    
    headers.forEach(header => {
      const values = data.map(row => row[header]);
      const nonNull = values.filter(val => val != null && val !== '');
      nonNullCells += nonNull.length;
      totalCells += values.length;
      
      const column = columns.find(col => col.name === header);
      
      if (column?.type === 'number') {
        const numericValues = nonNull.map(val => Number(val)).filter(val => !isNaN(val));
        
        if (numericValues.length > 0) {
          const sorted = numericValues.sort((a, b) => a - b);
          const mean = numericValues.reduce((a, b) => a + b) / numericValues.length;
          const median = sorted[Math.floor(sorted.length / 2)];
          const std = Math.sqrt(
            numericValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / numericValues.length
          );
          
          // Detect outliers using IQR method
          const q1 = sorted[Math.floor(sorted.length * 0.25)];
          const q3 = sorted[Math.floor(sorted.length * 0.75)];
          const iqr = q3 - q1;
          const outliers = numericValues.filter(val => 
            val < q1 - 1.5 * iqr || val > q3 + 1.5 * iqr
          ).length;
          
          stats.numerical[header] = {
            mean,
            median,
            std,
            min: Math.min(...numericValues),
            max: Math.max(...numericValues),
            outliers,
            nullCount: values.length - nonNull.length
          };
        }
      } else {
        // Categorical analysis
        const valueCounts = new Map<any, number>();
        nonNull.forEach(val => {
          valueCounts.set(val, (valueCounts.get(val) || 0) + 1);
        });
        
        const topValues = Array.from(valueCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([value, count]) => ({ value, count }));
        
        // Calculate entropy for diversity measure
        const total = nonNull.length;
        const entropy = Array.from(valueCounts.values()).reduce((ent, count) => {
          const p = count / total;
          return ent - p * Math.log2(p || 1);
        }, 0);
        
        stats.categorical[header] = {
          uniqueCount: valueCounts.size,
          topValues,
          nullCount: values.length - nonNull.length,
          entropy
        };
      }
    });
    
    stats.overall.completeness = totalCells > 0 ? nonNullCells / totalCells : 0;
    
    // Detect duplicates (simplified)
    const uniqueRows = new Set(data.map(row => JSON.stringify(row)));
    stats.overall.duplicates = data.length - uniqueRows.size;
    
    return stats;
  }

  /**
   * Generate summary insights
   */
  private static generateSummaryInsights(stats: DataStats, parseResult: FileParseResult): DataInsight[] {
    const insights: DataInsight[] = [];
    
    // Data quality insight
    const qualityScore = Math.round(stats.overall.completeness * 100);
    const qualityInsight: DataInsight = {
      id: 'data_quality',
      type: 'summary',
      title: 'Data Quality Assessment',
      description: `Your dataset has ${qualityScore}% completeness with ${stats.overall.duplicates} duplicate records`,
      confidence: 0.95,
      importance: qualityScore < 80 ? 'high' : qualityScore < 95 ? 'medium' : 'low',
      evidence: {
        dataPoints: [],
        statistics: {
          completeness: stats.overall.completeness,
          duplicates: stats.overall.duplicates,
          totalRows: stats.overall.totalRows
        }
      },
      narrative: this.generateQualityNarrative(qualityScore, stats.overall.duplicates, stats.overall.totalRows),
      actionableRecommendation: qualityScore < 90 ? 'Consider cleaning missing values and removing duplicates before analysis.' : undefined
    };
    
    insights.push(qualityInsight);
    
    // Dataset overview insight
    const overviewInsight: DataInsight = {
      id: 'dataset_overview',
      type: 'summary',
      title: 'Dataset Overview',
      description: `${stats.overall.totalRows.toLocaleString()} records across ${Object.keys(stats.numerical).length} numerical and ${Object.keys(stats.categorical).length} categorical columns`,
      confidence: 1.0,
      importance: 'medium',
      evidence: {
        dataPoints: parseResult.headers.map(h => ({ column: h, type: parseResult.schema.columns.find(col => col.name === h)?.type })),
        statistics: {
          numericalColumns: Object.keys(stats.numerical).length,
          categoricalColumns: Object.keys(stats.categorical).length,
          totalRows: stats.overall.totalRows
        }
      },
      narrative: `Your dataset contains ${stats.overall.totalRows.toLocaleString()} records with a good mix of ${Object.keys(stats.numerical).length} numerical columns for quantitative analysis and ${Object.keys(stats.categorical).length} categorical columns for segmentation and grouping. This structure enables diverse analytical approaches including trend analysis, correlation studies, and comparative visualizations.`,
      actionableRecommendation: 'This balanced data structure is well-suited for comprehensive analysis and visualization.'
    };
    
    insights.push(overviewInsight);
    
    return insights;
  }

  /**
   * Generate trend insights for numerical columns
   */
  private static generateTrendInsights(stats: DataStats, data: Record<string, any>[], columns: any[]): DataInsight[] {
    const insights: DataInsight[] = [];
    
    // Look for columns that might represent time or sequence
    const potentialTimeColumns = columns.filter(col => 
      col.type === 'date' || col.name.toLowerCase().includes('date') || col.name.toLowerCase().includes('time')
    );
    
    if (potentialTimeColumns.length > 0) {
      const timeColumn = potentialTimeColumns[0].name;
      const numericalColumns = Object.keys(stats.numerical);
      
      if (numericalColumns.length > 0) {
        const valueColumn = numericalColumns[0];
        const trendInsight = this.analyzeTrend(timeColumn, valueColumn, data);
        if (trendInsight) {
          insights.push(trendInsight);
        }
      }
    }
    
    return insights;
  }

  /**
   * Generate correlation insights
   */
  private static generateCorrelationInsights(stats: DataStats, data: Record<string, any>[], columns: any[]): DataInsight[] {
    const insights: DataInsight[] = [];
    const numericalColumns = Object.keys(stats.numerical);
    
    if (numericalColumns.length >= 2) {
      // Calculate correlations between numerical columns
      for (let i = 0; i < numericalColumns.length; i++) {
        for (let j = i + 1; j < numericalColumns.length; j++) {
          const col1 = numericalColumns[i];
          const col2 = numericalColumns[j];
          
          const correlation = this.calculateCorrelation(col1, col2, data);
          
          if (Math.abs(correlation) > 0.5) {
            const correlationInsight: DataInsight = {
              id: `correlation_${col1}_${col2}`,
              type: 'correlation',
              title: `${col1} and ${col2} Relationship`,
              description: `${Math.abs(correlation) > 0.7 ? 'Strong' : 'Moderate'} ${correlation > 0 ? 'positive' : 'negative'} correlation (${(correlation * 100).toFixed(1)}%)`,
              confidence: Math.min(0.95, Math.abs(correlation) + 0.2),
              importance: Math.abs(correlation) > 0.7 ? 'high' : 'medium',
              evidence: {
                dataPoints: data.slice(0, 10).map(row => ({ [col1]: row[col1], [col2]: row[col2] })),
                statistics: { correlation, strength: Math.abs(correlation) }
              },
              narrative: this.generateCorrelationNarrative(col1, col2, correlation),
              actionableRecommendation: `Create a scatter plot to visualize the relationship between ${col1} and ${col2}.`
            };
            
            insights.push(correlationInsight);
          }
        }
      }
    }
    
    return insights;
  }

  /**
   * Generate distribution insights
   */
  private static generateDistributionInsights(stats: DataStats, data: Record<string, any>[], columns: any[]): DataInsight[] {
    const insights: DataInsight[] = [];
    
    Object.entries(stats.numerical).forEach(([column, stat]) => {
      const skewness = this.calculateSkewness(column, data);
      
      if (Math.abs(skewness) > 1) {
        const distributionInsight: DataInsight = {
          id: `distribution_${column}`,
          type: 'distribution',
          title: `${column} Distribution Pattern`,
          description: `${column} shows ${skewness > 0 ? 'right' : 'left'}-skewed distribution`,
          confidence: 0.8,
          importance: 'medium',
          evidence: {
            dataPoints: [
              { metric: 'mean', value: stat.mean },
              { metric: 'median', value: stat.median },
              { metric: 'skewness', value: skewness }
            ],
            statistics: { skewness, mean: stat.mean, median: stat.median }
          },
          narrative: `The ${column} values are ${skewness > 0 ? 'concentrated on the lower end with some high outliers' : 'concentrated on the higher end with some low outliers'}. This ${Math.abs(skewness) > 2 ? 'highly' : 'moderately'} skewed distribution (skewness: ${skewness.toFixed(2)}) suggests the data is not normally distributed.`,
          actionableRecommendation: `Consider using a histogram or box plot to visualize the ${column} distribution.`
        };
        
        insights.push(distributionInsight);
      }
    });
    
    return insights;
  }

  /**
   * Generate outlier insights
   */
  private static generateOutlierInsights(stats: DataStats, data: Record<string, any>[], columns: any[]): DataInsight[] {
    const insights: DataInsight[] = [];
    
    Object.entries(stats.numerical).forEach(([column, stat]) => {
      if (stat.outliers > 0) {
        const outlierPercentage = (stat.outliers / data.length) * 100;
        
        const outlierInsight: DataInsight = {
          id: `outliers_${column}`,
          type: 'outlier',
          title: `${column} Outliers Detected`,
          description: `${stat.outliers} outliers found (${outlierPercentage.toFixed(1)}% of data)`,
          confidence: 0.9,
          importance: outlierPercentage > 10 ? 'high' : outlierPercentage > 5 ? 'medium' : 'low',
          evidence: {
            dataPoints: [],
            statistics: { 
              outlierCount: stat.outliers, 
              percentage: outlierPercentage,
              min: stat.min,
              max: stat.max,
              mean: stat.mean
            }
          },
          narrative: `${column} contains ${stat.outliers} outlier values that deviate significantly from the typical range. These represent ${outlierPercentage.toFixed(1)}% of your data and could indicate ${outlierPercentage > 10 ? 'data quality issues or' : ''} unusual but potentially meaningful patterns.`,
          actionableRecommendation: outlierPercentage > 10 ? 
            'Investigate these outliers - they might indicate data quality issues that need addressing.' :
            'These outliers might represent important edge cases worth highlighting in your analysis.'
        };
        
        insights.push(outlierInsight);
      }
    });
    
    return insights;
  }

  /**
   * Generate composition insights for categorical data
   */
  private static generateCompositionInsights(stats: DataStats, data: Record<string, any>[], columns: any[]): DataInsight[] {
    const insights: DataInsight[] = [];
    
    Object.entries(stats.categorical).forEach(([column, stat]) => {
      if (stat.uniqueCount <= 10 && stat.uniqueCount >= 2) {
        const dominantValue = stat.topValues[0];
        const dominantPercentage = (dominantValue.count / data.length) * 100;
        
        const compositionInsight: DataInsight = {
          id: `composition_${column}`,
          type: 'composition',
          title: `${column} Category Distribution`,
          description: `"${dominantValue.value}" dominates with ${dominantPercentage.toFixed(1)}% of records`,
          confidence: 0.85,
          importance: dominantPercentage > 80 ? 'high' : dominantPercentage > 60 ? 'medium' : 'low',
          evidence: {
            dataPoints: stat.topValues.slice(0, 5),
            statistics: { 
              uniqueCount: stat.uniqueCount,
              dominantPercentage,
              entropy: stat.entropy
            }
          },
          narrative: `The ${column} field shows ${dominantPercentage > 70 ? 'high concentration' : dominantPercentage > 50 ? 'moderate concentration' : 'balanced distribution'} with "${dominantValue.value}" representing ${dominantPercentage.toFixed(1)}% of all records. ${stat.uniqueCount} distinct categories provide ${stat.entropy > 2 ? 'good' : stat.entropy > 1 ? 'moderate' : 'limited'} diversity for segmentation analysis.`,
          actionableRecommendation: dominantPercentage > 70 ? 
            'The high concentration in one category may limit analysis - consider grouping smaller categories or focusing on the dominant segment.' :
            `Use ${column} for grouping and comparison analysis - the balanced distribution enables meaningful insights.`
        };
        
        insights.push(compositionInsight);
      }
    });
    
    return insights;
  }

  /**
   * Generate overall insight summary
   */
  private static generateInsightSummary(
    insights: DataInsight[], 
    stats: DataStats, 
    recommendations?: ChartRecommendation[]
  ): InsightSummary {
    const keyFindings: string[] = [];
    const criticalInsights = insights.filter(i => i.importance === 'critical');
    const highInsights = insights.filter(i => i.importance === 'high');
    
    // Extract key findings
    if (criticalInsights.length > 0) {
      keyFindings.push(criticalInsights[0].description);
    }
    
    highInsights.slice(0, 2).forEach(insight => {
      keyFindings.push(insight.description);
    });
    
    // Data quality assessment
    const qualityScore = Math.round(stats.overall.completeness * 100);
    const qualityIssues: string[] = [];
    const qualityStrengths: string[] = [];
    
    if (qualityScore < 90) {
      qualityIssues.push(`${100 - qualityScore}% of data is missing`);
    } else {
      qualityStrengths.push('High data completeness');
    }
    
    if (stats.overall.duplicates > 0) {
      qualityIssues.push(`${stats.overall.duplicates} duplicate records found`);
    } else {
      qualityStrengths.push('No duplicate records');
    }
    
    if (Object.keys(stats.numerical).length > 0) {
      qualityStrengths.push('Good numerical data for quantitative analysis');
    }
    
    if (Object.keys(stats.categorical).length > 0) {
      qualityStrengths.push('Categorical data available for segmentation');
    }
    
    // Recommended actions
    const recommendedActions: string[] = [];
    
    if (qualityScore < 85) {
      recommendedActions.push('Clean missing data before analysis');
    }
    
    if (stats.overall.duplicates > 0) {
      recommendedActions.push('Remove duplicate records');
    }
    
    const correlationInsights = insights.filter(i => i.type === 'correlation');
    if (correlationInsights.length > 0) {
      recommendedActions.push('Explore relationships with scatter plots');
    }
    
    const trendInsights = insights.filter(i => i.type === 'trend');
    if (trendInsights.length > 0) {
      recommendedActions.push('Analyze trends over time with line charts');
    }
    
    if (recommendations && recommendations.length > 0) {
      recommendedActions.push(`Start with ${recommendations[0].chartType} chart (${Math.round(recommendations[0].confidence * 100)}% confidence)`);
    }
    
    // Overall narrative
    const overallNarrative = this.generateOverallNarrative(stats, insights, qualityScore);
    
    // Trust score based on data quality and insight confidence
    const avgConfidence = insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length;
    const trustScore = Math.round((qualityScore * 0.6 + avgConfidence * 100 * 0.4));
    
    return {
      keyFindings,
      dataQuality: {
        score: qualityScore,
        issues: qualityIssues,
        strengths: qualityStrengths
      },
      recommendedActions,
      overallNarrative,
      trustScore
    };
  }

  // Helper methods
  private static calculateCorrelation(col1: string, col2: string, data: Record<string, any>[]): number {
    const pairs = data
      .map(row => ({ x: Number(row[col1]), y: Number(row[col2]) }))
      .filter(pair => !isNaN(pair.x) && !isNaN(pair.y));
    
    if (pairs.length < 2) return 0;
    
    const n = pairs.length;
    const sumX = pairs.reduce((sum, p) => sum + p.x, 0);
    const sumY = pairs.reduce((sum, p) => sum + p.y, 0);
    const sumXY = pairs.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumX2 = pairs.reduce((sum, p) => sum + p.x * p.x, 0);
    const sumY2 = pairs.reduce((sum, p) => sum + p.y * p.y, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private static calculateSkewness(column: string, data: Record<string, any>[]): number {
    const values = data.map(row => Number(row[column])).filter(val => !isNaN(val));
    if (values.length < 3) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);
    
    if (std === 0) return 0;
    
    const skewness = values.reduce((sum, val) => sum + Math.pow((val - mean) / std, 3), 0) / values.length;
    return skewness;
  }

  private static generateQualityNarrative(qualityScore: number, duplicates: number, totalRows: number): string {
    const qualityLevel = qualityScore >= 95 ? 'excellent' : qualityScore >= 85 ? 'good' : qualityScore >= 70 ? 'fair' : 'poor';
    
    return `Your dataset demonstrates ${qualityLevel} data quality with ${qualityScore}% completeness. ${duplicates > 0 ? `There are ${duplicates} duplicate records (${((duplicates / totalRows) * 100).toFixed(1)}% of data) that should be reviewed.` : 'No duplicate records were found, which is positive for analysis reliability.'} ${qualityScore < 90 ? 'Consider addressing missing values to improve analysis accuracy.' : 'The high completeness rate ensures reliable analytical results.'}`;
  }

  private static generateCorrelationNarrative(col1: string, col2: string, correlation: number): string {
    const strength = Math.abs(correlation) > 0.7 ? 'strong' : 'moderate';
    const direction = correlation > 0 ? 'positive' : 'negative';
    
    return `There is a ${strength} ${direction} relationship between ${col1} and ${col2} (correlation: ${(correlation * 100).toFixed(1)}%). This means that as ${col1} ${correlation > 0 ? 'increases' : 'decreases'}, ${col2} tends to ${correlation > 0 ? 'increase' : 'decrease'} as well. ${Math.abs(correlation) > 0.8 ? 'This strong relationship suggests these variables may be closely related or influenced by similar factors.' : 'This relationship is worth exploring further to understand the underlying connection.'}`;
  }

  private static generateChartNarrative(recommendation: ChartRecommendation, data: Record<string, any>[]): string {
    const sampleSize = Math.min(data.length, 1000);
    return `Based on analysis of ${data.length.toLocaleString()} data points, a ${recommendation.chartType} chart is recommended with ${Math.round(recommendation.confidence * 100)}% confidence. ${recommendation.reasoning} The suggested visualization will help you ${recommendation.description.toLowerCase()} effectively, providing clear insights into your data patterns.`;
  }

  private static generateOverallNarrative(stats: DataStats, insights: DataInsight[], qualityScore: number): string {
    const criticalCount = insights.filter(i => i.importance === 'critical').length;
    const highCount = insights.filter(i => i.importance === 'high').length;
    
    return `Your dataset of ${stats.overall.totalRows.toLocaleString()} records shows ${qualityScore >= 90 ? 'excellent' : qualityScore >= 80 ? 'good' : 'fair'} data quality (${qualityScore}% complete) and reveals ${criticalCount + highCount} significant patterns worth investigating. With ${Object.keys(stats.numerical).length} numerical and ${Object.keys(stats.categorical).length} categorical columns, the data structure supports comprehensive analysis including trend analysis, correlation studies, and segmentation. ${criticalCount > 0 ? 'Several critical insights have been identified that should guide your analysis priorities.' : 'The insights discovered provide a solid foundation for data-driven decision making.'} ${qualityScore < 85 ? 'Addressing data quality issues will enhance the reliability of your analysis.' : 'The high data quality ensures reliable and trustworthy analytical results.'}`;
  }

  private static analyzeTrend(timeColumn: string, valueColumn: string, data: Record<string, any>[]): DataInsight | null {
    // Simplified trend analysis - in a real implementation, you'd use proper time series analysis
    const timeValues = data
      .map(row => ({ time: new Date(row[timeColumn]), value: Number(row[valueColumn]) }))
      .filter(item => !isNaN(item.time.getTime()) && !isNaN(item.value))
      .sort((a, b) => a.time.getTime() - b.time.getTime());
    
    if (timeValues.length < 10) return null;
    
    // Simple linear trend calculation
    const firstHalf = timeValues.slice(0, Math.floor(timeValues.length / 2));
    const secondHalf = timeValues.slice(Math.floor(timeValues.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, item) => sum + item.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, item) => sum + item.value, 0) / secondHalf.length;
    
    const trendDirection = secondAvg > firstAvg ? 'upward' : secondAvg < firstAvg ? 'downward' : 'stable';
    const trendStrength = Math.abs(secondAvg - firstAvg) / firstAvg;
    
    if (trendStrength > 0.1) { // Only report significant trends
      return {
        id: `trend_${timeColumn}_${valueColumn}`,
        type: 'trend',
        title: `${valueColumn} Trend Over Time`,
        description: `${trendDirection.charAt(0).toUpperCase() + trendDirection.slice(1)} trend detected (${(trendStrength * 100).toFixed(1)}% change)`,
        confidence: Math.min(0.9, trendStrength + 0.6),
        importance: trendStrength > 0.3 ? 'high' : 'medium',
        evidence: {
          dataPoints: [
            { period: 'first_half', average: firstAvg },
            { period: 'second_half', average: secondAvg }
          ],
          statistics: { trendStrength, direction: trendDirection }
        },
        narrative: `Analysis of ${valueColumn} over time reveals a ${trendDirection} trend with a ${(trendStrength * 100).toFixed(1)}% change from the first half to the second half of the time period. This ${trendStrength > 0.2 ? 'significant' : 'moderate'} trend suggests ${trendDirection === 'upward' ? 'growth or improvement' : trendDirection === 'downward' ? 'decline or reduction' : 'stability'} in ${valueColumn} values over the observed timeframe.`,
        actionableRecommendation: `Create a line chart to visualize the ${valueColumn} trend over ${timeColumn}.`
      };
    }
    
    return null;
  }

  private static analyzeColumnRelationship(col1: string, col2: string, data: Record<string, any>[]): DataInsight | null {
    const correlation = this.calculateCorrelation(col1, col2, data);
    
    if (Math.abs(correlation) > 0.3) {
      return {
        id: `relationship_${col1}_${col2}`,
        type: 'correlation',
        title: `${col1} and ${col2} Relationship Analysis`,
        description: `${Math.abs(correlation) > 0.6 ? 'Strong' : 'Moderate'} ${correlation > 0 ? 'positive' : 'negative'} relationship found`,
        confidence: Math.min(0.9, Math.abs(correlation) + 0.3),
        importance: Math.abs(correlation) > 0.6 ? 'high' : 'medium',
        evidence: {
          dataPoints: data.slice(0, 20).map(row => ({ [col1]: row[col1], [col2]: row[col2] })),
          statistics: { correlation }
        },
        narrative: this.generateCorrelationNarrative(col1, col2, correlation),
        actionableRecommendation: `This relationship is well-suited for the recommended chart visualization.`
      };
    }
    
    return null;
  }
}

export default AIInsightsService;
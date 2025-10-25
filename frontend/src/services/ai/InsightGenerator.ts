import { PatternDetectionResult, TrendResult, AnomalyResult } from './PatternDetection';
import { CorrelationDiscoveryResult, CorrelationResult } from './CorrelationDiscovery';
import nlp from 'compromise';

export interface DataInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'correlation' | 'pattern' | 'recommendation' | 'summary';
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  title: string;
  description: string;
  explanation: string;
  actionable: boolean;
  recommendations?: string[];
  dataPoints?: {
    field?: string;
    value?: number;
    position?: number;
    context?: string;
  };
  visualSuggestion?: {
    chartType: string;
    reason: string;
  };
}

export interface InsightGenerationResult {
  insights: DataInsight[];
  executiveSummary: string;
  keyTakeaways: string[];
  recommendations: string[];
  confidence: number;
  dataQualityScore: number;
}

export class InsightGenerator {
  /**
   * Generate comprehensive insights from pattern detection and correlation analysis
   */
  static generateInsights(
    patterns: PatternDetectionResult,
    correlations: CorrelationDiscoveryResult,
    data: Record<string, any>[],
    fieldNames?: string[]
  ): InsightGenerationResult {
    const insights: DataInsight[] = [];

    // Generate pattern-based insights
    insights.push(...this.generatePatternInsights(patterns));

    // Generate correlation-based insights
    insights.push(...this.generateCorrelationInsights(correlations));

    // Generate data quality insights
    insights.push(...this.generateDataQualityInsights(data, patterns, correlations));

    // Generate recommendations
    const recommendationInsights = this.generateRecommendationInsights(patterns, correlations, data.length);
    insights.push(...recommendationInsights);

    // Sort insights by priority and confidence
    const sortedInsights = this.prioritizeInsights(insights);

    // Generate executive summary
    const executiveSummary = this.generateExecutiveSummary(sortedInsights, data.length);

    // Extract key takeaways
    const keyTakeaways = this.extractKeyTakeaways(sortedInsights);

    // Compile actionable recommendations
    const recommendations = this.compileRecommendations(sortedInsights);

    // Calculate overall confidence and data quality
    const confidence = this.calculateOverallConfidence(sortedInsights);
    const dataQualityScore = this.assessDataQuality(data, patterns, correlations);

    return {
      insights: sortedInsights,
      executiveSummary,
      keyTakeaways,
      recommendations,
      confidence,
      dataQualityScore
    };
  }

  /**
   * Generate insights specifically for a given chart type and field mapping
   */
  static generateContextualInsights(
    data: Record<string, any>[],
    chartType: string,
    fieldMapping: Record<string, string>
  ): DataInsight[] {
    const insights: DataInsight[] = [];

    // Quick pattern analysis for the specific fields
    const relevantFields = Object.values(fieldMapping).filter(Boolean);
    
    if (relevantFields.length === 0) {
      return [{
        id: 'no-fields',
        type: 'recommendation',
        priority: 'medium',
        confidence: 1.0,
        title: 'Select Data Fields',
        description: 'Map your data fields to chart axes to see AI-powered insights',
        explanation: 'The AI insights engine analyzes your data once you specify which fields to visualize.',
        actionable: true,
        recommendations: ['Drag data fields to the chart areas', 'Choose fields that might be related to each other']
      }];
    }

    // Analyze the specific field combination
    if (fieldMapping.x && fieldMapping.y) {
      const xField = fieldMapping.x;
      const yField = fieldMapping.y;
      
      // Quick correlation check
      insights.push(...this.generateFieldSpecificInsights(data, xField, yField, chartType));
    }

    // Chart type specific suggestions
    insights.push(...this.generateChartSpecificInsights(chartType, fieldMapping, data));

    return insights.slice(0, 5); // Limit to most relevant insights
  }

  // Private methods for generating specific types of insights

  private static generatePatternInsights(patterns: PatternDetectionResult): DataInsight[] {
    const insights: DataInsight[] = [];

    // Safety check for patterns object
    if (!patterns) {
      return insights;
    }

    // Trend insights
    const trends = patterns.trends || [];
    trends.forEach((trend, index) => {
      const priority = this.determinePriority(trend.confidence, trend.strength);
      
      insights.push({
        id: `trend-${index}`,
        type: 'trend',
        priority,
        confidence: trend.confidence,
        title: this.generateTrendTitle(trend),
        description: trend.description,
        explanation: this.generateTrendExplanation(trend),
        actionable: trend.type !== 'stable',
        recommendations: this.generateTrendRecommendations(trend),
        visualSuggestion: {
          chartType: 'line',
          reason: 'Line charts are ideal for visualizing trends over time'
        }
      });
    });

    // Seasonality insights
    if (patterns.seasonality) {
      insights.push({
        id: 'seasonality',
        type: 'pattern',
        priority: patterns.seasonality.confidence > 0.7 ? 'high' : 'medium',
        confidence: patterns.seasonality.confidence,
        title: 'Seasonal Pattern Detected',
        description: patterns.seasonality.description,
        explanation: this.generateSeasonalityExplanation(patterns.seasonality),
        actionable: true,
        recommendations: [
          'Plan for seasonal fluctuations in your operations',
          'Consider seasonal adjustments in forecasting models',
          'Align marketing and inventory strategies with seasonal patterns'
        ],
        visualSuggestion: {
          chartType: 'line',
          reason: 'Line charts with time series data best reveal seasonal patterns'
        }
      });
    }

    // Anomaly insights
    const anomalies = patterns.anomalies || [];
    anomalies.slice(0, 3).forEach((anomaly, index) => {
      const priority = anomaly.severity === 'severe' ? 'critical' : 
                     anomaly.severity === 'moderate' ? 'high' : 'medium';

      insights.push({
        id: `anomaly-${index}`,
        type: 'anomaly',
        priority,
        confidence: anomaly.confidence,
        title: `${this.capitalizeFirst(anomaly.severity)} Anomaly Detected`,
        description: anomaly.description,
        explanation: this.generateAnomalyExplanation(anomaly),
        actionable: true,
        dataPoints: {
          position: anomaly.index,
          value: anomaly.value,
          context: `Expected around ${anomaly.expectedValue.toFixed(2)}`
        },
        recommendations: this.generateAnomalyRecommendations(anomaly)
      });
    });

    return insights;
  }

  private static generateCorrelationInsights(correlations: CorrelationDiscoveryResult): DataInsight[] {
    const insights: DataInsight[] = [];

    // Safety check for correlations object
    if (!correlations || !correlations.correlations || !Array.isArray(correlations.correlations)) {
      return insights;
    }

    // Strong correlations
    correlations.correlations.slice(0, 5).forEach((corr, index) => {
      const priority = this.determineCorrelationPriority(corr);
      
      insights.push({
        id: `correlation-${index}`,
        type: 'correlation',
        priority,
        confidence: corr.confidence,
        title: this.generateCorrelationTitle(corr),
        description: corr.description,
        explanation: this.generateCorrelationExplanation(corr),
        actionable: corr.strength !== 'weak',
        recommendations: this.generateCorrelationRecommendations(corr),
        visualSuggestion: {
          chartType: 'scatter',
          reason: 'Scatter plots are perfect for visualizing correlations between two variables'
        }
      });
    });

    return insights;
  }

  private static generateDataQualityInsights(
    data: Record<string, any>[],
    patterns: PatternDetectionResult,
    correlations: CorrelationDiscoveryResult
  ): DataInsight[] {
    const insights: DataInsight[] = [];

    // Data size assessment
    if (data.length < 30) {
      insights.push({
        id: 'small-sample',
        type: 'recommendation',
        priority: 'medium',
        confidence: 1.0,
        title: 'Small Dataset Warning',
        description: `Dataset contains only ${data.length} observations`,
        explanation: 'Small sample sizes can reduce the reliability of statistical analyses. Results should be interpreted with caution.',
        actionable: true,
        recommendations: [
          'Consider collecting more data for more reliable insights',
          'Be cautious about generalizing findings from this small sample',
          'Look for consistent patterns rather than one-off occurrences'
        ]
      });
    }

    // Missing data patterns
    const missingDataAnalysis = this.analyzeMissingData(data);
    if (missingDataAnalysis.hasSignificantMissing) {
      insights.push({
        id: 'missing-data',
        type: 'recommendation',
        priority: 'medium',
        confidence: 0.9,
        title: 'Missing Data Detected',
        description: `${missingDataAnalysis.affectedFields.length} fields have significant missing data`,
        explanation: 'Missing data can bias analysis results and reduce statistical power.',
        actionable: true,
        recommendations: [
          'Review data collection processes for affected fields',
          'Consider data imputation techniques if appropriate',
          'Document missing data patterns for transparent reporting'
        ]
      });
    }

    return insights;
  }

  private static generateRecommendationInsights(
    patterns: PatternDetectionResult,
    correlations: CorrelationDiscoveryResult,
    dataSize: number
  ): DataInsight[] {
    const insights: DataInsight[] = [];

    // Next steps recommendations
    const nextSteps = [];
    
    // Safety checks before accessing patterns and correlations
    const trends = patterns?.trends || [];
    const anomalies = patterns?.anomalies || [];
    const correlationsList = correlations?.correlations || [];
    
    if (trends.length > 0 && trends[0].confidence > 0.7) {
      nextSteps.push('Investigate the underlying drivers of the detected trend');
    }
    
    if (correlationsList.length > 0) {
      const strongCorrs = correlationsList.filter(c => c.strength === 'strong');
      if (strongCorrs.length > 0) {
        nextSteps.push('Explore causal relationships behind strong correlations');
      }
    }
    
    if (anomalies.length > 0) {
      nextSteps.push('Investigate anomalies to understand their root causes');
    }

    if (nextSteps.length > 0) {
      insights.push({
        id: 'next-steps',
        type: 'recommendation',
        priority: 'medium',
        confidence: 0.8,
        title: 'Recommended Next Steps',
        description: 'Based on the analysis, here are suggested follow-up actions',
        explanation: 'These recommendations can help you gain deeper insights from your data.',
        actionable: true,
        recommendations: nextSteps
      });
    }

    return insights;
  }

  private static generateFieldSpecificInsights(
    data: Record<string, any>[],
    xField: string,
    yField: string,
    chartType: string
  ): DataInsight[] {
    const insights: DataInsight[] = [];

    // Quick correlation analysis for the two fields
    const pairs = data
      .map(row => ({
        x: parseFloat(String(row[xField])),
        y: parseFloat(String(row[yField]))
      }))
      .filter(pair => !isNaN(pair.x) && !isNaN(pair.y) && isFinite(pair.x) && isFinite(pair.y));

    if (pairs.length < 3) {
      return insights;
    }

    // Simple correlation calculation
    const xValues = pairs.map(p => p.x);
    const yValues = pairs.map(p => p.y);
    
    // Calculate means
    const xMean = xValues.reduce((sum, x) => sum + x, 0) / xValues.length;
    const yMean = yValues.reduce((sum, y) => sum + y, 0) / yValues.length;
    
    // Calculate correlation
    let numerator = 0;
    let xSumSq = 0;
    let ySumSq = 0;
    
    for (let i = 0; i < pairs.length; i++) {
      const xDiff = xValues[i] - xMean;
      const yDiff = yValues[i] - yMean;
      numerator += xDiff * yDiff;
      xSumSq += xDiff * xDiff;
      ySumSq += yDiff * yDiff;
    }
    
    const correlation = numerator / Math.sqrt(xSumSq * ySumSq);

    if (Math.abs(correlation) > 0.3) {
      const strength = Math.abs(correlation) > 0.7 ? 'strong' : Math.abs(correlation) > 0.5 ? 'moderate' : 'weak';
      const direction = correlation > 0 ? 'positive' : 'negative';
      
      insights.push({
        id: 'field-correlation',
        type: 'correlation',
        priority: Math.abs(correlation) > 0.7 ? 'high' : 'medium',
        confidence: Math.min(0.9, Math.abs(correlation)),
        title: `${this.capitalizeFirst(strength)} ${direction} relationship`,
        description: `${xField} and ${yField} show a ${strength} ${direction} correlation (r=${correlation.toFixed(3)})`,
        explanation: direction === 'positive' 
          ? `As ${xField} increases, ${yField} tends to increase as well`
          : `As ${xField} increases, ${yField} tends to decrease`,
        actionable: strength !== 'weak',
        recommendations: [
          direction === 'positive' 
            ? `Consider strategies that leverage the positive relationship between ${xField} and ${yField}`
            : `Be aware of the trade-off between ${xField} and ${yField}`
        ]
      });
    }

    return insights;
  }

  private static generateChartSpecificInsights(
    chartType: string,
    fieldMapping: Record<string, string>,
    data: Record<string, any>[]
  ): DataInsight[] {
    const insights: DataInsight[] = [];

    switch (chartType) {
      case 'histogram':
        if (fieldMapping.x) {
          insights.push({
            id: 'histogram-insight',
            type: 'summary',
            priority: 'low',
            confidence: 0.8,
            title: 'Distribution Analysis',
            description: `Analyzing the distribution of ${fieldMapping.x}`,
            explanation: 'Histograms reveal the shape, central tendency, and spread of your data distribution.',
            actionable: false,
            recommendations: [
              'Look for normal vs. skewed distributions',
              'Identify potential outliers in the tails',
              'Consider if the distribution matches your expectations'
            ]
          });
        }
        break;

      case 'scatter':
        if (fieldMapping.x && fieldMapping.y) {
          insights.push({
            id: 'scatter-insight',
            type: 'summary',
            priority: 'low',
            confidence: 0.8,
            title: 'Relationship Analysis',
            description: `Exploring the relationship between ${fieldMapping.x} and ${fieldMapping.y}`,
            explanation: 'Scatter plots are excellent for discovering correlations and non-linear relationships between variables.',
            actionable: false,
            recommendations: [
              'Look for linear or non-linear patterns',
              'Identify clusters or groups in the data',
              'Check for outliers that might influence relationships'
            ]
          });
        }
        break;

      case 'boxplot':
        if (fieldMapping.x && fieldMapping.y) {
          insights.push({
            id: 'boxplot-insight',
            type: 'summary',
            priority: 'low',
            confidence: 0.8,
            title: 'Distribution Comparison',
            description: `Comparing distributions of ${fieldMapping.y} across different ${fieldMapping.x} categories`,
            explanation: 'Box plots show median, quartiles, and outliers for each group, making it easy to compare distributions.',
            actionable: false,
            recommendations: [
              'Compare median values between groups',
              'Look for differences in variability (box sizes)',
              'Identify groups with more outliers'
            ]
          });
        }
        break;
    }

    return insights;
  }

  // Helper methods for text generation and analysis

  private static generateTrendTitle(trend: TrendResult): string {
    const strength = this.capitalizeFirst(trend.strength);
    const direction = trend.type === 'increasing' ? 'Upward' : 
                     trend.type === 'decreasing' ? 'Downward' : 
                     trend.type === 'volatile' ? 'Volatile' : 'Stable';
    return `${strength} ${direction} Trend`;
  }

  private static generateTrendExplanation(trend: TrendResult): string {
    const explanations = {
      increasing: 'The data shows a consistent upward movement over time, indicating growth or improvement.',
      decreasing: 'The data shows a consistent downward movement over time, indicating decline or reduction.',
      stable: 'The data remains relatively constant over time with no significant directional movement.',
      volatile: 'The data shows irregular fluctuations with high variability and no clear directional pattern.'
    };
    
    let explanation = explanations[trend.type];
    
    if (trend.rSquared > 0.7) {
      explanation += ' This trend is very consistent and predictable.';
    } else if (trend.rSquared > 0.4) {
      explanation += ' This trend is moderately consistent with some variation.';
    } else {
      explanation += ' This trend shows considerable variation around the general direction.';
    }

    return explanation;
  }

  private static generateCorrelationTitle(corr: CorrelationResult): string {
    const strength = this.capitalizeFirst(corr.strength);
    const direction = this.capitalizeFirst(corr.direction);
    return `${strength} ${direction} Correlation`;
  }

  private static generateCorrelationExplanation(corr: CorrelationResult): string {
    const direction = corr.direction === 'positive' ? 'together' : 'in opposite directions';
    let explanation = `${corr.field1} and ${corr.field2} tend to move ${direction}. `;
    
    if (corr.strength === 'strong') {
      explanation += 'This strong relationship suggests they may be closely linked or influence each other.';
    } else if (corr.strength === 'moderate') {
      explanation += 'This moderate relationship indicates some connection, but other factors also play a role.';
    } else {
      explanation += 'This weak relationship suggests only a minor connection between these variables.';
    }

    return explanation;
  }

  private static generateAnomalyExplanation(anomaly: AnomalyResult): string {
    const severity = anomaly.severity === 'severe' ? 'extremely unusual' :
                    anomaly.severity === 'moderate' ? 'notably unusual' : 'somewhat unusual';
    
    return `This data point is ${severity} compared to the typical pattern. It deviates significantly from what we would expect based on the surrounding data.`;
  }

  private static generateSeasonalityExplanation(seasonality: any): string {
    return `The data shows a repeating pattern that occurs every ${seasonality.period} periods. This could indicate regular cycles in your business, natural phenomena, or behavioral patterns that repeat over time.`;
  }

  private static generateTrendRecommendations(trend: TrendResult): string[] {
    const recommendations: string[] = [];

    switch (trend.type) {
      case 'increasing':
        recommendations.push('Monitor if this growth is sustainable');
        recommendations.push('Investigate what factors are driving the increase');
        recommendations.push('Consider scaling resources to support continued growth');
        break;
      case 'decreasing':
        recommendations.push('Identify root causes of the decline');
        recommendations.push('Develop intervention strategies to reverse the trend');
        recommendations.push('Monitor the rate of decline closely');
        break;
      case 'volatile':
        recommendations.push('Investigate causes of high variability');
        recommendations.push('Consider smoothing techniques for clearer insights');
        recommendations.push('Look for underlying patterns within the volatility');
        break;
      case 'stable':
        recommendations.push('Consider if stability is desirable for this metric');
        recommendations.push('Look for opportunities to drive positive change');
        break;
    }

    return recommendations;
  }

  private static generateCorrelationRecommendations(corr: CorrelationResult): string[] {
    const recommendations: string[] = [];

    if (corr.strength === 'strong') {
      recommendations.push('Investigate whether this relationship is causal or coincidental');
      recommendations.push(`Consider using ${corr.field1} to predict ${corr.field2}`);
    }

    if (corr.direction === 'negative') {
      recommendations.push('Understand the trade-offs between these variables');
      recommendations.push('Look for ways to minimize negative impacts');
    } else {
      recommendations.push('Explore ways to leverage this positive relationship');
      recommendations.push('Consider joint optimization of both variables');
    }

    return recommendations;
  }

  private static generateAnomalyRecommendations(anomaly: AnomalyResult): string[] {
    const recommendations = [
      'Investigate the circumstances around this unusual value',
      'Check for data entry errors or measurement issues',
      'Consider if this represents a special case or outlier',
    ];

    if (anomaly.severity === 'severe') {
      recommendations.push('This extreme value may require immediate attention');
    }

    return recommendations;
  }

  private static prioritizeInsights(insights: DataInsight[]): DataInsight[] {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    
    return insights.sort((a, b) => {
      // First sort by priority
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      // Then by confidence
      return b.confidence - a.confidence;
    });
  }

  private static generateExecutiveSummary(insights: DataInsight[], dataSize: number): string {
    const highPriorityInsights = insights.filter(i => i.priority === 'critical' || i.priority === 'high');
    const trends = insights.filter(i => i.type === 'trend');
    const correlations = insights.filter(i => i.type === 'correlation');
    const anomalies = insights.filter(i => i.type === 'anomaly');

    let summary = `Analysis of ${dataSize} data points reveals `;

    const summaryParts: string[] = [];

    if (highPriorityInsights.length > 0) {
      summaryParts.push(`${highPriorityInsights.length} high-priority finding${highPriorityInsights.length === 1 ? '' : 's'}`);
    }

    if (trends.length > 0) {
      summaryParts.push(`${trends.length} trend${trends.length === 1 ? '' : 's'}`);
    }

    if (correlations.length > 0) {
      summaryParts.push(`${correlations.length} significant correlation${correlations.length === 1 ? '' : 's'}`);
    }

    if (anomalies.length > 0) {
      summaryParts.push(`${anomalies.length} anomal${anomalies.length === 1 ? 'y' : 'ies'}`);
    }

    if (summaryParts.length === 0) {
      summary += 'stable patterns with no significant anomalies or strong trends.';
    } else {
      summary += summaryParts.join(', ') + '.';
    }

    // Add top insight
    if (highPriorityInsights.length > 0) {
      summary += ` Key finding: ${highPriorityInsights[0].title.toLowerCase()}.`;
    }

    return summary;
  }

  private static extractKeyTakeaways(insights: DataInsight[]): string[] {
    return insights
      .filter(i => i.priority === 'critical' || i.priority === 'high')
      .slice(0, 5)
      .map(i => i.title);
  }

  private static compileRecommendations(insights: DataInsight[]): string[] {
    const recommendations = new Set<string>();

    insights
      .filter(i => i.actionable && i.recommendations)
      .forEach(i => {
        i.recommendations?.forEach(rec => recommendations.add(rec));
      });

    return Array.from(recommendations).slice(0, 8);
  }

  private static calculateOverallConfidence(insights: DataInsight[]): number {
    if (insights.length === 0) return 0;
    
    const confidenceSum = insights.reduce((sum, i) => sum + i.confidence, 0);
    return confidenceSum / insights.length;
  }

  private static assessDataQuality(
    data: Record<string, any>[],
    patterns: PatternDetectionResult,
    correlations: CorrelationDiscoveryResult
  ): number {
    let score = 1.0;

    // Penalize small sample sizes
    if (data.length < 30) score *= 0.8;
    if (data.length < 10) score *= 0.6;

    // Reward finding patterns (indicates data richness)
    if (patterns.trends.length > 0) score += 0.1;
    if (patterns.seasonality) score += 0.1;
    if (correlations.correlations.length > 0) score += 0.1;

    // Penalize too many anomalies (might indicate data quality issues)
    const anomalyRate = patterns.anomalies.length / data.length;
    if (anomalyRate > 0.1) score *= 0.9;
    if (anomalyRate > 0.2) score *= 0.8;

    return Math.max(0.1, Math.min(1.0, score));
  }

  private static analyzeMissingData(data: Record<string, any>[]): { hasSignificantMissing: boolean; affectedFields: string[] } {
    if (data.length === 0) return { hasSignificantMissing: false, affectedFields: [] };

    const fields = Object.keys(data[0]);
    const affectedFields: string[] = [];

    fields.forEach(field => {
      const missingCount = data.filter(row => row[field] == null || row[field] === '').length;
      const missingRate = missingCount / data.length;
      
      if (missingRate > 0.1) { // More than 10% missing
        affectedFields.push(field);
      }
    });

    return {
      hasSignificantMissing: affectedFields.length > 0,
      affectedFields
    };
  }

  private static determinePriority(confidence: number, strength?: string): 'low' | 'medium' | 'high' | 'critical' {
    if (confidence > 0.9) return 'critical';
    if (confidence > 0.7 && strength === 'strong') return 'high';
    if (confidence > 0.5) return 'medium';
    return 'low';
  }

  private static determineCorrelationPriority(corr: CorrelationResult): 'low' | 'medium' | 'high' | 'critical' {
    if (Math.abs(corr.correlation) > 0.8 && corr.pValue < 0.01) return 'critical';
    if (Math.abs(corr.correlation) > 0.6 && corr.pValue < 0.05) return 'high';
    if (Math.abs(corr.correlation) > 0.4) return 'medium';
    return 'low';
  }

  private static capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
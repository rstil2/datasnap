import * as ss from 'simple-statistics';
import { Matrix } from 'ml-matrix';

export interface CorrelationResult {
  field1: string;
  field2: string;
  correlation: number;
  pValue: number;
  significance: 'not-significant' | 'weak' | 'moderate' | 'strong' | 'very-strong';
  direction: 'positive' | 'negative';
  description: string;
  strength: 'weak' | 'moderate' | 'strong';
  confidence: number;
  sampleSize: number;
}

export interface CorrelationMatrix {
  fields: string[];
  matrix: number[][];
  significanceMatrix: number[][];
}

export interface CorrelationDiscoveryResult {
  correlations: CorrelationResult[];
  matrix: CorrelationMatrix;
  summary: string;
  keyFindings: string[];
  recommendations: string[];
}

export class CorrelationDiscovery {
  /**
   * Find all interesting correlations in a dataset
   */
  static analyzeCorrelations(
    data: Record<string, any>[],
    minCorrelation: number = 0.3,
    maxResults: number = 20
  ): CorrelationDiscoveryResult {
    if (data.length === 0) {
      return {
        correlations: [],
        matrix: { fields: [], matrix: [], significanceMatrix: [] },
        summary: "No data available for correlation analysis.",
        keyFindings: [],
        recommendations: []
      };
    }

    // Extract numeric fields
    const numericFields = this.extractNumericFields(data);
    
    if (numericFields.length < 2) {
      return {
        correlations: [],
        matrix: { fields: [], matrix: [], significanceMatrix: [] },
        summary: `Only ${numericFields.length} numeric field${numericFields.length === 1 ? '' : 's'} available. Need at least 2 for correlation analysis.`,
        keyFindings: [],
        recommendations: []
      };
    }

    // Calculate correlation matrix
    const matrix = this.calculateCorrelationMatrix(data, numericFields);

    // Find significant correlations
    const correlations = this.findSignificantCorrelations(data, numericFields, minCorrelation)
      .slice(0, maxResults);

    // Generate insights
    const summary = this.generateSummary(correlations, numericFields.length);
    const keyFindings = this.generateKeyFindings(correlations);
    const recommendations = this.generateRecommendations(correlations);

    return {
      correlations,
      matrix,
      summary,
      keyFindings,
      recommendations
    };
  }

  /**
   * Calculate correlation between two specific fields
   */
  static calculateFieldCorrelation(
    data: Record<string, any>[],
    field1: string,
    field2: string
  ): CorrelationResult | null {
    const pairs = data
      .map(row => ({
        x: parseFloat(String(row[field1])),
        y: parseFloat(String(row[field2]))
      }))
      .filter(pair => !isNaN(pair.x) && !isNaN(pair.y) && isFinite(pair.x) && isFinite(pair.y));

    if (pairs.length < 3) {
      return null;
    }

    const xValues = pairs.map(p => p.x);
    const yValues = pairs.map(p => p.y);

    const correlation = ss.sampleCorrelation(xValues, yValues);
    const pValue = this.calculateCorrelationPValue(correlation, pairs.length);
    
    const significance = this.classifySignificance(Math.abs(correlation), pValue);
    const direction = correlation >= 0 ? 'positive' : 'negative';
    const strength = this.classifyStrength(Math.abs(correlation));
    const confidence = this.calculateConfidence(Math.abs(correlation), pValue, pairs.length);
    const description = this.generateCorrelationDescription(field1, field2, correlation, significance, direction);

    return {
      field1,
      field2,
      correlation,
      pValue,
      significance,
      direction,
      description,
      strength,
      confidence,
      sampleSize: pairs.length
    };
  }

  /**
   * Find correlations that might indicate causation
   */
  static identifyPotentialCausation(correlations: CorrelationResult[]): CorrelationResult[] {
    return correlations.filter(corr => {
      // Look for strong correlations with good statistical significance
      const isStrong = Math.abs(corr.correlation) > 0.7;
      const isSignificant = corr.pValue < 0.01;
      const hasGoodSample = corr.sampleSize > 30;
      
      return isStrong && isSignificant && hasGoodSample;
    });
  }

  /**
   * Group correlations by themes or categories
   */
  static groupCorrelations(correlations: CorrelationResult[]): Record<string, CorrelationResult[]> {
    const groups: Record<string, CorrelationResult[]> = {
      'strong-positive': [],
      'strong-negative': [],
      'moderate': [],
      'weak-but-significant': []
    };

    correlations.forEach(corr => {
      const absCorr = Math.abs(corr.correlation);
      
      if (absCorr > 0.7) {
        if (corr.direction === 'positive') {
          groups['strong-positive'].push(corr);
        } else {
          groups['strong-negative'].push(corr);
        }
      } else if (absCorr > 0.4) {
        groups['moderate'].push(corr);
      } else if (corr.significance !== 'not-significant') {
        groups['weak-but-significant'].push(corr);
      }
    });

    return groups;
  }

  // Private helper methods
  private static extractNumericFields(data: Record<string, any>[]): string[] {
    if (data.length === 0) return [];

    const firstRow = data[0];
    const numericFields: string[] = [];

    Object.keys(firstRow).forEach(field => {
      let numericCount = 0;
      let totalCount = 0;

      // Sample up to 100 rows to determine if field is numeric
      const sampleSize = Math.min(100, data.length);
      for (let i = 0; i < sampleSize; i++) {
        const value = data[i][field];
        if (value != null) {
          totalCount++;
          const numValue = parseFloat(String(value));
          if (!isNaN(numValue) && isFinite(numValue)) {
            numericCount++;
          }
        }
      }

      // Field is considered numeric if >80% of non-null values are numeric
      if (totalCount > 0 && (numericCount / totalCount) > 0.8) {
        numericFields.push(field);
      }
    });

    return numericFields;
  }

  private static calculateCorrelationMatrix(
    data: Record<string, any>[],
    fields: string[]
  ): CorrelationMatrix {
    const n = fields.length;
    const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    const significanceMatrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(1));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1; // Perfect correlation with self
          significanceMatrix[i][j] = 0; // Perfect significance
        } else {
          const result = this.calculateFieldCorrelation(data, fields[i], fields[j]);
          if (result) {
            matrix[i][j] = result.correlation;
            significanceMatrix[i][j] = result.pValue;
          }
        }
      }
    }

    return {
      fields,
      matrix,
      significanceMatrix
    };
  }

  private static findSignificantCorrelations(
    data: Record<string, any>[],
    fields: string[],
    minCorrelation: number
  ): CorrelationResult[] {
    const correlations: CorrelationResult[] = [];

    for (let i = 0; i < fields.length; i++) {
      for (let j = i + 1; j < fields.length; j++) {
        const result = this.calculateFieldCorrelation(data, fields[i], fields[j]);
        
        if (result && Math.abs(result.correlation) >= minCorrelation) {
          correlations.push(result);
        }
      }
    }

    // Sort by strength of correlation (absolute value)
    return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }

  private static calculateCorrelationPValue(correlation: number, sampleSize: number): number {
    // Calculate t-statistic for correlation
    const absCorr = Math.abs(correlation);
    if (absCorr >= 1) return 0; // Perfect correlation
    
    const tStat = absCorr * Math.sqrt((sampleSize - 2) / (1 - absCorr * absCorr));
    
    // Simplified p-value calculation based on t-statistic
    if (tStat > 3.5) return 0.001;
    if (tStat > 3.0) return 0.005;
    if (tStat > 2.8) return 0.01;
    if (tStat > 2.0) return 0.05;
    if (tStat > 1.7) return 0.1;
    return 0.2;
  }

  private static classifySignificance(
    absCorrelation: number,
    pValue: number
  ): 'not-significant' | 'weak' | 'moderate' | 'strong' | 'very-strong' {
    if (pValue > 0.05) {
      return 'not-significant';
    }
    
    if (absCorrelation > 0.8) return 'very-strong';
    if (absCorrelation > 0.6) return 'strong';
    if (absCorrelation > 0.4) return 'moderate';
    return 'weak';
  }

  private static classifyStrength(absCorrelation: number): 'weak' | 'moderate' | 'strong' {
    if (absCorrelation > 0.7) return 'strong';
    if (absCorrelation > 0.4) return 'moderate';
    return 'weak';
  }

  private static calculateConfidence(
    absCorrelation: number,
    pValue: number,
    sampleSize: number
  ): number {
    // Combine correlation strength, significance, and sample size
    let confidence = absCorrelation; // Base on correlation strength
    
    // Adjust for significance
    if (pValue < 0.001) confidence *= 1.2;
    else if (pValue < 0.01) confidence *= 1.1;
    else if (pValue < 0.05) confidence *= 1.0;
    else confidence *= 0.8;
    
    // Adjust for sample size
    if (sampleSize > 100) confidence *= 1.1;
    else if (sampleSize > 50) confidence *= 1.05;
    else if (sampleSize < 20) confidence *= 0.9;
    
    return Math.min(0.95, confidence);
  }

  private static generateCorrelationDescription(
    field1: string,
    field2: string,
    correlation: number,
    significance: string,
    direction: string
  ): string {
    const absCorr = Math.abs(correlation);
    const strength = absCorr > 0.7 ? 'strong' : absCorr > 0.4 ? 'moderate' : 'weak';
    
    const relationshipType = direction === 'positive' ? 'positive relationship' : 'inverse relationship';
    
    let description = `${strength} ${relationshipType} between ${field1} and ${field2}`;
    
    if (direction === 'positive') {
      description += ` - as one increases, the other tends to increase`;
    } else {
      description += ` - as one increases, the other tends to decrease`;
    }
    
    description += ` (r=${correlation.toFixed(3)})`;
    
    return description;
  }

  private static generateSummary(correlations: CorrelationResult[], totalFields: number): string {
    if (correlations.length === 0) {
      return `Analyzed ${totalFields} numeric fields. No significant correlations found above the threshold.`;
    }

    const strongCount = correlations.filter(c => c.strength === 'strong').length;
    const moderateCount = correlations.filter(c => c.strength === 'moderate').length;
    const weakCount = correlations.filter(c => c.strength === 'weak').length;
    
    let summary = `Found ${correlations.length} significant correlation${correlations.length === 1 ? '' : 's'} among ${totalFields} numeric fields.`;
    
    const parts: string[] = [];
    if (strongCount > 0) parts.push(`${strongCount} strong`);
    if (moderateCount > 0) parts.push(`${moderateCount} moderate`);
    if (weakCount > 0) parts.push(`${weakCount} weak`);
    
    if (parts.length > 0) {
      summary += ` Breakdown: ${parts.join(', ')}.`;
    }

    return summary;
  }

  private static generateKeyFindings(correlations: CorrelationResult[]): string[] {
    const findings: string[] = [];

    // Strongest correlation
    if (correlations.length > 0) {
      const strongest = correlations[0];
      findings.push(`Strongest relationship: ${strongest.description}`);
    }

    // Strong positive correlations
    const strongPositive = correlations.filter(c => c.strength === 'strong' && c.direction === 'positive');
    if (strongPositive.length > 0) {
      findings.push(`${strongPositive.length} strong positive correlation${strongPositive.length === 1 ? '' : 's'} detected`);
    }

    // Strong negative correlations
    const strongNegative = correlations.filter(c => c.strength === 'strong' && c.direction === 'negative');
    if (strongNegative.length > 0) {
      findings.push(`${strongNegative.length} strong inverse relationship${strongNegative.length === 1 ? '' : 's'} identified`);
    }

    // Perfect correlations (very rare, might indicate duplicate data)
    const perfect = correlations.filter(c => Math.abs(c.correlation) > 0.95);
    if (perfect.length > 0) {
      findings.push(`⚠️ ${perfect.length} near-perfect correlation${perfect.length === 1 ? '' : 's'} - check for duplicate fields`);
    }

    // High confidence findings
    const highConfidence = correlations.filter(c => c.confidence > 0.8);
    if (highConfidence.length > 0) {
      findings.push(`${highConfidence.length} high-confidence relationship${highConfidence.length === 1 ? '' : 's'} identified`);
    }

    return findings.slice(0, 5); // Limit to top 5 findings
  }

  private static generateRecommendations(correlations: CorrelationResult[]): string[] {
    const recommendations: string[] = [];

    if (correlations.length === 0) {
      recommendations.push("Consider collecting more data or examining different variables for relationships");
      return recommendations;
    }

    // Strong correlations suggest further investigation
    const strong = correlations.filter(c => c.strength === 'strong');
    if (strong.length > 0) {
      recommendations.push(`Investigate the ${strong.length} strong correlation${strong.length === 1 ? '' : 's'} further - they may indicate causal relationships`);
    }

    // Perfect correlations might indicate data issues
    const perfect = correlations.filter(c => Math.abs(c.correlation) > 0.95);
    if (perfect.length > 0) {
      recommendations.push("Review near-perfect correlations to ensure they represent genuine relationships, not duplicate data");
    }

    // Negative correlations can be as valuable as positive ones
    const negative = correlations.filter(c => c.direction === 'negative' && Math.abs(c.correlation) > 0.5);
    if (negative.length > 0) {
      recommendations.push("Examine inverse relationships - they may reveal important trade-offs or constraints");
    }

    // Large number of moderate correlations
    const moderate = correlations.filter(c => c.strength === 'moderate');
    if (moderate.length > 5) {
      recommendations.push("Many moderate correlations suggest complex interdependencies - consider multivariate analysis");
    }

    // Low sample size warning
    const lowSample = correlations.filter(c => c.sampleSize < 30);
    if (lowSample.length > correlations.length * 0.5) {
      recommendations.push("Collect more data to increase reliability of correlation estimates (aim for 30+ observations)");
    }

    return recommendations.slice(0, 4); // Limit to top 4 recommendations
  }
}
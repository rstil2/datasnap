import * as ss from 'simple-statistics';
import { Matrix } from 'ml-matrix';

export interface DataPoint {
  x: number | string | Date;
  y: number;
  index: number;
}

export interface TrendResult {
  type: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  confidence: number;
  slope: number;
  rSquared: number;
  pValue: number;
  description: string;
  strength: 'weak' | 'moderate' | 'strong';
}

export interface SeasonalityResult {
  isPresent: boolean;
  confidence: number;
  period: number;
  amplitude: number;
  description: string;
  peaks: number[];
  valleys: number[];
}

export interface AnomalyResult {
  index: number;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: 'mild' | 'moderate' | 'severe';
  confidence: number;
  description: string;
}

export interface ChangePointResult {
  index: number;
  confidence: number;
  beforeMean: number;
  afterMean: number;
  changeType: 'level-shift' | 'trend-change' | 'variance-change';
  description: string;
}

export interface PatternDetectionResult {
  trends: TrendResult[];
  seasonality: SeasonalityResult | null;
  anomalies: AnomalyResult[];
  changePoints: ChangePointResult[];
  summary: string;
  confidence: number;
}

export class PatternDetection {
  /**
   * Detect linear trends in time series data
   */
  static detectTrends(data: DataPoint[]): TrendResult[] {
    if (data.length < 3) {
      return [];
    }

    const numericData = data
      .map((d, i) => ({ x: i, y: d.y }))
      .filter(d => !isNaN(d.y) && isFinite(d.y));

    if (numericData.length < 3) {
      return [];
    }

    const xValues = numericData.map(d => d.x);
    const yValues = numericData.map(d => d.y);

    // Linear regression
    const regression = ss.linearRegression(numericData);
    const rSquared = ss.rSquared(numericData, regression.m, regression.b);
    
    // Calculate p-value for slope significance
    const n = numericData.length;
    const correlation = ss.sampleCorrelation(xValues, yValues);
    const tStat = Math.abs(correlation * Math.sqrt((n - 2) / (1 - correlation * correlation)));
    const pValue = this.calculatePValue(tStat, n - 2);

    // Determine trend type and strength
    const slope = regression.m;
    const absSlope = Math.abs(slope);
    
    let type: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    let strength: 'weak' | 'moderate' | 'strong';
    const confidence = Math.min(0.95, rSquared);

    if (pValue > 0.05) {
      type = 'stable';
      strength = 'weak';
    } else if (slope > 0) {
      type = 'increasing';
    } else {
      type = 'decreasing';
    }

    if (rSquared > 0.7) {
      strength = 'strong';
    } else if (rSquared > 0.4) {
      strength = 'moderate';
    } else {
      strength = 'weak';
    }

    // Check for volatility
    const residuals = numericData.map(d => d.y - (regression.m * d.x + regression.b));
    const residualStd = ss.standardDeviation(residuals);
    const dataStd = ss.standardDeviation(yValues);
    
    if (residualStd / dataStd > 0.5 && rSquared < 0.3) {
      type = 'volatile';
    }

    const description = this.generateTrendDescription(type, strength, slope, rSquared, pValue);

    return [{
      type,
      confidence,
      slope,
      rSquared,
      pValue,
      description,
      strength
    }];
  }

  /**
   * Detect seasonal patterns in data
   */
  static detectSeasonality(data: DataPoint[]): SeasonalityResult | null {
    if (data.length < 12) {
      return null;
    }

    const numericData = data
      .map(d => d.y)
      .filter(y => !isNaN(y) && isFinite(y));

    if (numericData.length < 12) {
      return null;
    }

    // Try different seasonal periods
    const possiblePeriods = [7, 12, 24, 30, 52]; // Daily, monthly, bi-annual, monthly, yearly patterns
    let bestPeriod = 0;
    let bestScore = 0;

    for (const period of possiblePeriods) {
      if (period >= numericData.length / 2) continue;

      const score = this.calculateSeasonalityScore(numericData, period);
      if (score > bestScore) {
        bestScore = score;
        bestPeriod = period;
      }
    }

    if (bestScore < 0.3) {
      return null; // Not enough evidence for seasonality
    }

    // Analyze the seasonal pattern
    const { peaks, valleys, amplitude } = this.analyzeSeasonalPattern(numericData, bestPeriod);
    
    const confidence = Math.min(0.95, bestScore);
    const description = this.generateSeasonalityDescription(bestPeriod, amplitude, confidence);

    return {
      isPresent: true,
      confidence,
      period: bestPeriod,
      amplitude,
      description,
      peaks,
      valleys
    };
  }

  /**
   * Detect anomalies using statistical methods
   */
  static detectAnomalies(data: DataPoint[]): AnomalyResult[] {
    if (data.length < 10) {
      return [];
    }

    const numericData = data
      .map((d, i) => ({ ...d, y: d.y, originalIndex: i }))
      .filter(d => !isNaN(d.y) && isFinite(d.y));

    if (numericData.length < 10) {
      return [];
    }

    const values = numericData.map(d => d.y);
    const mean = ss.mean(values);
    const stdDev = ss.standardDeviation(values);
    const median = ss.median(values);
    const q1 = ss.quantile(values, 0.25);
    const q3 = ss.quantile(values, 0.75);
    const iqr = q3 - q1;

    const anomalies: AnomalyResult[] = [];

    numericData.forEach((point) => {
      const value = point.y;
      
      // Z-score method
      const zScore = Math.abs((value - mean) / stdDev);
      
      // IQR method
      const isIqrOutlier = value < (q1 - 1.5 * iqr) || value > (q3 + 1.5 * iqr);
      const isExtremeIqrOutlier = value < (q1 - 3 * iqr) || value > (q3 + 3 * iqr);
      
      // Modified Z-score using median
      const modifiedZScore = Math.abs((value - median) / (1.4826 * ss.medianAbsoluteDeviation(values)));

      let isAnomaly = false;
      let severity: 'mild' | 'moderate' | 'severe' = 'mild';
      let confidence = 0;

      if (zScore > 3 || modifiedZScore > 3.5 || isExtremeIqrOutlier) {
        isAnomaly = true;
        severity = 'severe';
        confidence = 0.95;
      } else if (zScore > 2.5 || modifiedZScore > 2.5 || isIqrOutlier) {
        isAnomaly = true;
        severity = 'moderate';
        confidence = 0.8;
      } else if (zScore > 2 || modifiedZScore > 2) {
        isAnomaly = true;
        severity = 'mild';
        confidence = 0.6;
      }

      if (isAnomaly) {
        const expectedValue = median; // Use median as expected value
        const deviation = Math.abs(value - expectedValue);
        const description = this.generateAnomalyDescription(value, expectedValue, severity, point.originalIndex);

        anomalies.push({
          index: point.originalIndex,
          value,
          expectedValue,
          deviation,
          severity,
          confidence,
          description
        });
      }
    });

    // Sort by severity and confidence
    return anomalies
      .sort((a, b) => {
        const severityOrder = { severe: 3, moderate: 2, mild: 1 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[b.severity] - severityOrder[a.severity];
        }
        return b.confidence - a.confidence;
      })
      .slice(0, 10); // Limit to top 10 anomalies
  }

  /**
   * Detect change points in the data
   */
  static detectChangePoints(data: DataPoint[]): ChangePointResult[] {
    if (data.length < 20) {
      return [];
    }

    const numericData = data
      .map(d => d.y)
      .filter(y => !isNaN(y) && isFinite(y));

    if (numericData.length < 20) {
      return [];
    }

    const changePoints: ChangePointResult[] = [];
    const minSegmentLength = Math.max(5, Math.floor(numericData.length / 10));

    // Sliding window approach to detect change points
    for (let i = minSegmentLength; i < numericData.length - minSegmentLength; i++) {
      const beforeSegment = numericData.slice(Math.max(0, i - minSegmentLength), i);
      const afterSegment = numericData.slice(i, Math.min(numericData.length, i + minSegmentLength));

      const beforeMean = ss.mean(beforeSegment);
      const afterMean = ss.mean(afterSegment);
      const beforeStd = ss.standardDeviation(beforeSegment);
      const afterStd = ss.standardDeviation(afterSegment);

      // Test for mean change (level shift)
      const meanDifference = Math.abs(afterMean - beforeMean);
      const pooledStd = Math.sqrt(((beforeSegment.length - 1) * beforeStd * beforeStd + 
                                  (afterSegment.length - 1) * afterStd * afterStd) / 
                                 (beforeSegment.length + afterSegment.length - 2));
      
      const tStat = meanDifference / (pooledStd * Math.sqrt(1/beforeSegment.length + 1/afterSegment.length));
      const pValue = this.calculatePValue(tStat, beforeSegment.length + afterSegment.length - 2);

      if (pValue < 0.05) {
        const confidence = 1 - pValue;
        const changeType = Math.abs(afterStd - beforeStd) > pooledStd ? 'variance-change' : 'level-shift';
        const description = this.generateChangePointDescription(i, beforeMean, afterMean, changeType, confidence);

        changePoints.push({
          index: i,
          confidence,
          beforeMean,
          afterMean,
          changeType,
          description
        });
      }
    }

    // Remove nearby change points (keep the one with highest confidence)
    const filteredChangePoints = [];
    for (let i = 0; i < changePoints.length; i++) {
      let keepPoint = true;
      for (let j = 0; j < filteredChangePoints.length; j++) {
        if (Math.abs(changePoints[i].index - filteredChangePoints[j].index) < minSegmentLength) {
          if (changePoints[i].confidence <= filteredChangePoints[j].confidence) {
            keepPoint = false;
            break;
          } else {
            filteredChangePoints.splice(j, 1);
            break;
          }
        }
      }
      if (keepPoint) {
        filteredChangePoints.push(changePoints[i]);
      }
    }

    return filteredChangePoints
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // Limit to top 5 change points
  }

  /**
   * Main pattern detection function
   */
  static analyzePatterns(data: DataPoint[]): PatternDetectionResult {
    if (data.length === 0) {
      return {
        trends: [],
        seasonality: null,
        anomalies: [],
        changePoints: [],
        summary: "No data available for pattern analysis.",
        confidence: 0
      };
    }

    const trends = this.detectTrends(data);
    const seasonality = this.detectSeasonality(data);
    const anomalies = this.detectAnomalies(data);
    const changePoints = this.detectChangePoints(data);

    const summary = this.generateOverallSummary(trends, seasonality, anomalies, changePoints, data.length);
    const confidence = this.calculateOverallConfidence(trends, seasonality, anomalies, changePoints);

    return {
      trends,
      seasonality,
      anomalies,
      changePoints,
      summary,
      confidence
    };
  }

  // Helper methods
  private static calculateSeasonalityScore(data: number[], period: number): number {
    if (data.length < period * 2) return 0;

    // Calculate autocorrelation at the given period
    const mean = ss.mean(data);
    const variance = ss.variance(data);
    
    let autocorr = 0;
    let count = 0;

    for (let i = 0; i < data.length - period; i++) {
      autocorr += (data[i] - mean) * (data[i + period] - mean);
      count++;
    }

    return count > 0 ? (autocorr / count) / variance : 0;
  }

  private static analyzeSeasonalPattern(data: number[], period: number): { peaks: number[], valleys: number[], amplitude: number } {
    const cycleAverages: number[] = new Array(period).fill(0);
    const cycleCounts: number[] = new Array(period).fill(0);

    // Calculate average for each position in the cycle
    for (let i = 0; i < data.length; i++) {
      const position = i % period;
      cycleAverages[position] += data[i];
      cycleCounts[position]++;
    }

    for (let i = 0; i < period; i++) {
      if (cycleCounts[i] > 0) {
        cycleAverages[i] /= cycleCounts[i];
      }
    }

    const maxValue = Math.max(...cycleAverages);
    const minValue = Math.min(...cycleAverages);
    const amplitude = maxValue - minValue;

    const peaks = cycleAverages
      .map((value, index) => ({ value, index }))
      .filter(item => item.value > maxValue - amplitude * 0.2)
      .map(item => item.index);

    const valleys = cycleAverages
      .map((value, index) => ({ value, index }))
      .filter(item => item.value < minValue + amplitude * 0.2)
      .map(item => item.index);

    return { peaks, valleys, amplitude };
  }

  private static calculatePValue(tStat: number, df: number): number {
    // Simplified p-value calculation (in production, use proper statistical library)
    const absT = Math.abs(tStat);
    if (absT > 3) return 0.001;
    if (absT > 2.5) return 0.01;
    if (absT > 2) return 0.05;
    if (absT > 1.5) return 0.1;
    return 0.2;
  }

  private static generateTrendDescription(type: string, strength: string, slope: number, rSquared: number, pValue: number): string {
    const confidenceLevel = pValue < 0.01 ? 'very significant' : pValue < 0.05 ? 'significant' : 'moderate';
    const fit = rSquared > 0.7 ? 'excellent' : rSquared > 0.4 ? 'good' : 'moderate';
    
    switch (type) {
      case 'increasing':
        return `${strength} upward trend detected (${confidenceLevel}, ${fit} fit: R²=${rSquared.toFixed(3)})`;
      case 'decreasing':
        return `${strength} downward trend detected (${confidenceLevel}, ${fit} fit: R²=${rSquared.toFixed(3)})`;
      case 'stable':
        return `Data appears stable with no significant trend (p=${pValue.toFixed(3)})`;
      case 'volatile':
        return `High volatility detected with irregular fluctuations (R²=${rSquared.toFixed(3)})`;
      default:
        return `Trend analysis completed`;
    }
  }

  private static generateSeasonalityDescription(period: number, amplitude: number, confidence: number): string {
    let periodDescription = '';
    if (period === 7) periodDescription = 'weekly';
    else if (period === 12) periodDescription = 'monthly';
    else if (period === 24) periodDescription = 'bi-annual';
    else if (period === 52) periodDescription = 'yearly';
    else periodDescription = `${period}-period`;

    const confidenceLevel = confidence > 0.8 ? 'strong' : confidence > 0.6 ? 'moderate' : 'weak';
    
    return `${confidenceLevel} ${periodDescription} seasonal pattern detected (confidence: ${(confidence * 100).toFixed(1)}%)`;
  }

  private static generateAnomalyDescription(value: number, expected: number, severity: string, index: number): string {
    const deviation = ((value - expected) / expected * 100).toFixed(1);
    const direction = value > expected ? 'above' : 'below';
    
    return `${severity} anomaly at position ${index + 1}: ${value.toFixed(2)} (${Math.abs(parseFloat(deviation))}% ${direction} expected)`;
  }

  private static generateChangePointDescription(index: number, beforeMean: number, afterMean: number, type: string, confidence: number): string {
    const change = afterMean - beforeMean;
    const direction = change > 0 ? 'increase' : 'decrease';
    const magnitude = Math.abs(change);
    
    return `${type.replace('-', ' ')} at position ${index + 1}: ${direction} of ${magnitude.toFixed(2)} (${(confidence * 100).toFixed(1)}% confidence)`;
  }

  private static generateOverallSummary(trends: TrendResult[], seasonality: SeasonalityResult | null, anomalies: AnomalyResult[], changePoints: ChangePointResult[], dataLength: number): string {
    const parts: string[] = [`Analyzed ${dataLength} data points.`];

    if (trends.length > 0) {
      const trend = trends[0];
      parts.push(trend.description);
    }

    if (seasonality && seasonality.isPresent) {
      parts.push(seasonality.description);
    }

    if (anomalies.length > 0) {
      parts.push(`Found ${anomalies.length} anomal${anomalies.length === 1 ? 'y' : 'ies'}.`);
    }

    if (changePoints.length > 0) {
      parts.push(`Detected ${changePoints.length} change point${changePoints.length === 1 ? '' : 's'}.`);
    }

    if (trends.length === 0 && !seasonality && anomalies.length === 0 && changePoints.length === 0) {
      parts.push("No significant patterns detected in the data.");
    }

    return parts.join(' ');
  }

  private static calculateOverallConfidence(trends: TrendResult[], seasonality: SeasonalityResult | null, anomalies: AnomalyResult[], changePoints: ChangePointResult[]): number {
    const scores: number[] = [];

    if (trends.length > 0) {
      scores.push(trends[0].confidence);
    }

    if (seasonality) {
      scores.push(seasonality.confidence);
    }

    if (anomalies.length > 0) {
      scores.push(Math.max(...anomalies.map(a => a.confidence)));
    }

    if (changePoints.length > 0) {
      scores.push(Math.max(...changePoints.map(cp => cp.confidence)));
    }

    if (scores.length === 0) {
      return 0;
    }

    return ss.mean(scores);
  }
}
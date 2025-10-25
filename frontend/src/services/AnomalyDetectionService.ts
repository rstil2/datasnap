import * as d3 from 'd3';

export type AnomalyType = 
  | 'statistical_outlier'
  | 'trend_deviation' 
  | 'seasonal_anomaly'
  | 'contextual_anomaly'
  | 'collective_anomaly'
  | 'point_anomaly';

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  score: number; // Anomaly score (0-1, higher = more anomalous)
  confidence: number; // Detection confidence (0-1)
  timestamp: Date;
  rowIndex: number;
  columnName: string;
  value: any;
  expectedValue?: any;
  deviation?: number;
  description: string;
  context: {
    method: string;
    parameters: Record<string, any>;
    statistics?: Record<string, number>;
  };
  recommendations: string[];
}

export interface AnomalyDetectionResult {
  anomalies: Anomaly[];
  summary: {
    totalAnomalies: number;
    severityBreakdown: Record<AnomalySeverity, number>;
    typeBreakdown: Record<AnomalyType, number>;
    affectedColumns: string[];
    overallRiskScore: number; // 0-1 scale
  };
  metadata: {
    detectionTime: number;
    methodsUsed: string[];
    dataPoints: number;
    thresholds: Record<string, number>;
  };
}

export interface DetectionOptions {
  methods?: Array<'zscore' | 'iqr' | 'isolation_forest' | 'lof' | 'trend' | 'seasonal'>;
  sensitivity?: 'low' | 'medium' | 'high';
  includeContextual?: boolean;
  timeColumn?: string;
  minConfidence?: number;
}

export class AnomalyDetectionService {
  private static readonly DEFAULT_OPTIONS: DetectionOptions = {
    methods: ['zscore', 'iqr', 'trend'],
    sensitivity: 'medium',
    includeContextual: true,
    minConfidence: 0.7
  };

  private static readonly SENSITIVITY_THRESHOLDS = {
    low: { zscore: 3.0, iqr: 2.0, confidence: 0.8 },
    medium: { zscore: 2.5, iqr: 1.5, confidence: 0.7 },
    high: { zscore: 2.0, iqr: 1.0, confidence: 0.6 }
  };

  /**
   * Detect anomalies in a dataset using multiple statistical methods
   */
  static async detectAnomalies(
    data: Record<string, any>[],
    options: DetectionOptions = {}
  ): Promise<AnomalyDetectionResult> {
    const startTime = performance.now();
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const thresholds = this.SENSITIVITY_THRESHOLDS[opts.sensitivity!];
    
    if (!data || data.length === 0) {
      return {
        anomalies: [],
        summary: {
          totalAnomalies: 0,
          severityBreakdown: { low: 0, medium: 0, high: 0, critical: 0 },
          typeBreakdown: {} as Record<AnomalyType, number>,
          affectedColumns: [],
          overallRiskScore: 0
        },
        metadata: {
          detectionTime: 0,
          methodsUsed: [],
          dataPoints: 0,
          thresholds: {}
        }
      };
    }

    const anomalies: Anomaly[] = [];
    const methodsUsed: string[] = [];

    // Get numeric columns for analysis
    const numericColumns = this.getNumericColumns(data);
    const timeColumn = opts.timeColumn || this.detectTimeColumn(data);

    // Apply different detection methods
    if (opts.methods!.includes('zscore')) {
      const zscoreAnomalies = this.detectZScoreAnomalies(data, numericColumns, thresholds.zscore);
      anomalies.push(...zscoreAnomalies);
      methodsUsed.push('Z-Score');
    }

    if (opts.methods!.includes('iqr')) {
      const iqrAnomalies = this.detectIQRAnomalies(data, numericColumns, thresholds.iqr);
      anomalies.push(...iqrAnomalies);
      methodsUsed.push('Interquartile Range');
    }

    if (opts.methods!.includes('isolation_forest')) {
      const isolationAnomalies = this.detectIsolationForestAnomalies(data, numericColumns);
      anomalies.push(...isolationAnomalies);
      methodsUsed.push('Isolation Forest');
    }

    if (opts.methods!.includes('lof')) {
      const lofAnomalies = this.detectLocalOutlierFactorAnomalies(data, numericColumns);
      anomalies.push(...lofAnomalies);
      methodsUsed.push('Local Outlier Factor');
    }

    if (opts.methods!.includes('trend') && timeColumn) {
      const trendAnomalies = this.detectTrendAnomalies(data, numericColumns, timeColumn);
      anomalies.push(...trendAnomalies);
      methodsUsed.push('Trend Analysis');
    }

    if (opts.methods!.includes('seasonal') && timeColumn) {
      const seasonalAnomalies = this.detectSeasonalAnomalies(data, numericColumns, timeColumn);
      anomalies.push(...seasonalAnomalies);
      methodsUsed.push('Seasonal Decomposition');
    }

    // Filter by confidence
    const filteredAnomalies = anomalies.filter(a => a.confidence >= opts.minConfidence!);

    // Remove duplicates and merge similar anomalies
    const uniqueAnomalies = this.deduplicate(filteredAnomalies);

    // Calculate summary statistics
    const summary = this.calculateSummary(uniqueAnomalies, data.length);

    const endTime = performance.now();

    return {
      anomalies: uniqueAnomalies,
      summary,
      metadata: {
        detectionTime: endTime - startTime,
        methodsUsed,
        dataPoints: data.length,
        thresholds: {
          zscore: thresholds.zscore,
          iqr: thresholds.iqr,
          minConfidence: opts.minConfidence!
        }
      }
    };
  }

  /**
   * Z-Score based anomaly detection
   */
  private static detectZScoreAnomalies(
    data: Record<string, any>[],
    numericColumns: string[],
    threshold: number
  ): Anomaly[] {
    const anomalies: Anomaly[] = [];

    numericColumns.forEach(column => {
      const values = data.map(row => parseFloat(String(row[column]))).filter(v => !isNaN(v));
      if (values.length < 3) return;

      const mean = d3.mean(values) || 0;
      const stdDev = d3.deviation(values) || 1;

      data.forEach((row, index) => {
        const value = parseFloat(String(row[column]));
        if (isNaN(value)) return;

        const zscore = Math.abs((value - mean) / stdDev);
        if (zscore > threshold) {
          const severity = this.calculateSeverity(zscore, threshold);
          const score = Math.min(1, zscore / (threshold * 2));

          anomalies.push({
            id: `zscore_${column}_${index}`,
            type: 'statistical_outlier',
            severity,
            score,
            confidence: Math.min(0.95, 0.5 + (zscore / threshold) * 0.4),
            timestamp: new Date(),
            rowIndex: index,
            columnName: column,
            value,
            expectedValue: mean,
            deviation: zscore,
            description: `Value ${value} deviates ${zscore.toFixed(2)} standard deviations from mean (${mean.toFixed(2)})`,
            context: {
              method: 'Z-Score',
              parameters: { threshold, mean, stdDev },
              statistics: { zscore, mean, stdDev }
            },
            recommendations: [
              'Review data entry for potential errors',
              'Consider if this is a legitimate extreme value',
              'Check for measurement or recording issues'
            ]
          });
        }
      });
    });

    return anomalies;
  }

  /**
   * IQR based anomaly detection
   */
  private static detectIQRAnomalies(
    data: Record<string, any>[],
    numericColumns: string[],
    multiplier: number
  ): Anomaly[] {
    const anomalies: Anomaly[] = [];

    numericColumns.forEach(column => {
      const values = data.map(row => parseFloat(String(row[column]))).filter(v => !isNaN(v));
      if (values.length < 4) return;

      const sorted = [...values].sort((a, b) => a - b);
      const q1 = d3.quantile(sorted, 0.25) || 0;
      const q3 = d3.quantile(sorted, 0.75) || 0;
      const iqr = q3 - q1;
      const lowerBound = q1 - multiplier * iqr;
      const upperBound = q3 + multiplier * iqr;

      data.forEach((row, index) => {
        const value = parseFloat(String(row[column]));
        if (isNaN(value)) return;

        if (value < lowerBound || value > upperBound) {
          const deviation = Math.max(
            lowerBound - value,
            value - upperBound,
            0
          ) / iqr;
          
          const severity = this.calculateSeverity(deviation, multiplier);
          const score = Math.min(1, deviation / (multiplier * 2));

          anomalies.push({
            id: `iqr_${column}_${index}`,
            type: 'statistical_outlier',
            severity,
            score,
            confidence: Math.min(0.9, 0.6 + (deviation / multiplier) * 0.3),
            timestamp: new Date(),
            rowIndex: index,
            columnName: column,
            value,
            expectedValue: value < lowerBound ? lowerBound : upperBound,
            deviation,
            description: `Value ${value} is outside IQR bounds [${lowerBound.toFixed(2)}, ${upperBound.toFixed(2)}]`,
            context: {
              method: 'IQR',
              parameters: { multiplier, q1, q3, iqr, lowerBound, upperBound },
              statistics: { deviation, iqr }
            },
            recommendations: [
              'Verify data accuracy and collection process',
              'Consider domain-specific reasons for extreme values',
              'Evaluate impact on downstream analysis'
            ]
          });
        }
      });
    });

    return anomalies;
  }

  /**
   * Simplified Isolation Forest implementation
   */
  private static detectIsolationForestAnomalies(
    data: Record<string, any>[],
    numericColumns: string[]
  ): Anomaly[] {
    const anomalies: Anomaly[] = [];
    
    if (numericColumns.length < 2 || data.length < 10) return anomalies;

    // Convert data to numeric matrix
    const matrix = data.map(row => 
      numericColumns.map(col => parseFloat(String(row[col])) || 0)
    );

    // Simple isolation scoring based on distance to neighbors
    data.forEach((row, index) => {
      const point = numericColumns.map(col => parseFloat(String(row[col])) || 0);
      
      // Calculate average distance to k nearest neighbors
      const distances = matrix.map((otherPoint, otherIndex) => {
        if (otherIndex === index) return Infinity;
        return this.euclideanDistance(point, otherPoint);
      }).sort((a, b) => a - b);

      const k = Math.min(5, Math.floor(data.length * 0.1));
      const avgDistance = d3.mean(distances.slice(0, k)) || 0;
      const maxDistance = d3.max(distances) || 1;
      
      const isolationScore = avgDistance / maxDistance;
      
      if (isolationScore > 0.7) { // Threshold for isolation
        const severity = this.calculateSeverity(isolationScore, 0.7);
        
        numericColumns.forEach(column => {
          const value = parseFloat(String(row[column]));
          if (isNaN(value)) return;

          anomalies.push({
            id: `isolation_${column}_${index}`,
            type: 'contextual_anomaly',
            severity,
            score: isolationScore,
            confidence: Math.min(0.85, 0.5 + isolationScore * 0.35),
            timestamp: new Date(),
            rowIndex: index,
            columnName: column,
            value,
            description: `Data point is isolated from other observations (score: ${isolationScore.toFixed(3)})`,
            context: {
              method: 'Isolation Forest',
              parameters: { k, threshold: 0.7 },
              statistics: { isolationScore, avgDistance, maxDistance }
            },
            recommendations: [
              'Check if this represents a new pattern or data quality issue',
              'Consider contextual factors that might explain the isolation',
              'Validate data collection and preprocessing steps'
            ]
          });
        });
      }
    });

    return anomalies;
  }

  /**
   * Local Outlier Factor (simplified implementation)
   */
  private static detectLocalOutlierFactorAnomalies(
    data: Record<string, any>[],
    numericColumns: string[]
  ): Anomaly[] {
    const anomalies: Anomaly[] = [];
    
    if (numericColumns.length < 2 || data.length < 10) return anomalies;

    const matrix = data.map(row => 
      numericColumns.map(col => parseFloat(String(row[col])) || 0)
    );

    data.forEach((row, index) => {
      const point = numericColumns.map(col => parseFloat(String(row[col])) || 0);
      const k = Math.min(5, Math.floor(data.length * 0.1));
      
      // Calculate k-distance and local reachability density
      const distances = matrix.map((otherPoint, otherIndex) => ({
        index: otherIndex,
        distance: otherIndex === index ? Infinity : this.euclideanDistance(point, otherPoint)
      })).sort((a, b) => a.distance - b.distance);

      const kNeighbors = distances.slice(0, k);
      const kDistance = kNeighbors[k - 1]?.distance || 0;
      
      // Simplified LOF calculation
      const reachabilityDistances = kNeighbors.map(neighbor => 
        Math.max(neighbor.distance, kDistance)
      );
      const lrd = k / (d3.sum(reachabilityDistances) || 1);
      
      // Compare with neighbors' LRD
      const neighborLRDs = kNeighbors.map(neighbor => {
        const neighborPoint = matrix[neighbor.index];
        const neighborDistances = matrix.map((otherPoint, otherIndex) => ({
          index: otherIndex,
          distance: otherIndex === neighbor.index ? Infinity : this.euclideanDistance(neighborPoint, otherPoint)
        })).sort((a, b) => a.distance - b.distance).slice(0, k);
        
        const neighborKDistance = neighborDistances[k - 1]?.distance || 0;
        const neighborReachabilityDistances = neighborDistances.map(nd => 
          Math.max(nd.distance, neighborKDistance)
        );
        return k / (d3.sum(neighborReachabilityDistances) || 1);
      });

      const lof = (d3.mean(neighborLRDs) || 1) / lrd;
      
      if (lof > 1.5) { // LOF threshold
        const severity = this.calculateSeverity(lof, 1.5);
        
        numericColumns.forEach(column => {
          const value = parseFloat(String(row[column]));
          if (isNaN(value)) return;

          anomalies.push({
            id: `lof_${column}_${index}`,
            type: 'contextual_anomaly',
            severity,
            score: Math.min(1, (lof - 1) / 2),
            confidence: Math.min(0.8, 0.4 + (lof - 1) * 0.2),
            timestamp: new Date(),
            rowIndex: index,
            columnName: column,
            value,
            description: `Point has high local outlier factor (${lof.toFixed(3)}) compared to neighbors`,
            context: {
              method: 'Local Outlier Factor',
              parameters: { k, threshold: 1.5 },
              statistics: { lof, lrd, kDistance }
            },
            recommendations: [
              'Examine local data patterns and neighborhood context',
              'Check for data collection anomalies in this region',
              'Consider if this represents a legitimate local outlier'
            ]
          });
        });
      }
    });

    return anomalies;
  }

  /**
   * Trend-based anomaly detection for time series data
   */
  private static detectTrendAnomalies(
    data: Record<string, any>[],
    numericColumns: string[],
    timeColumn: string
  ): Anomaly[] {
    const anomalies: Anomaly[] = [];
    
    // Sort data by time
    const sortedData = [...data].sort((a, b) => {
      const dateA = new Date(a[timeColumn]);
      const dateB = new Date(b[timeColumn]);
      return dateA.getTime() - dateB.getTime();
    });

    numericColumns.forEach(column => {
      const values = sortedData.map(row => parseFloat(String(row[column]))).filter(v => !isNaN(v));
      if (values.length < 10) return;

      // Calculate moving average and trend
      const windowSize = Math.max(3, Math.floor(values.length * 0.1));
      const movingAverage: number[] = [];
      
      for (let i = windowSize - 1; i < values.length; i++) {
        const window = values.slice(i - windowSize + 1, i + 1);
        movingAverage.push(d3.mean(window) || 0);
      }

      // Detect trend deviations
      values.slice(windowSize - 1).forEach((value, i) => {
        const expected = movingAverage[i];
        const deviation = Math.abs(value - expected);
        const avgDeviation = d3.mean(
          values.slice(Math.max(0, i + windowSize - 6), i + windowSize + 1)
            .map(v => Math.abs(v - expected))
        ) || 1;

        if (deviation > avgDeviation * 2.5) {
          const severity = this.calculateSeverity(deviation / avgDeviation, 2.5);
          const actualIndex = i + windowSize - 1;
          
          if (actualIndex < sortedData.length) {
            anomalies.push({
              id: `trend_${column}_${actualIndex}`,
              type: 'trend_deviation',
              severity,
              score: Math.min(1, deviation / (avgDeviation * 5)),
              confidence: 0.75,
              timestamp: new Date(sortedData[actualIndex][timeColumn]),
              rowIndex: actualIndex,
              columnName: column,
              value,
              expectedValue: expected,
              deviation: deviation / avgDeviation,
              description: `Value deviates significantly from trend (${(deviation / avgDeviation).toFixed(2)}x average deviation)`,
              context: {
                method: 'Trend Analysis',
                parameters: { windowSize, threshold: 2.5 },
                statistics: { deviation, avgDeviation, expected }
              },
              recommendations: [
                'Check for external factors affecting the trend',
                'Verify data collection consistency over time',
                'Consider seasonal or cyclical patterns'
              ]
            });
          }
        }
      });
    });

    return anomalies;
  }

  /**
   * Seasonal anomaly detection (simplified)
   */
  private static detectSeasonalAnomalies(
    data: Record<string, any>[],
    numericColumns: string[],
    timeColumn: string
  ): Anomaly[] {
    const anomalies: Anomaly[] = [];
    
    // This is a simplified seasonal detection - in practice, you'd use more sophisticated methods
    const sortedData = [...data].sort((a, b) => {
      const dateA = new Date(a[timeColumn]);
      const dateB = new Date(b[timeColumn]);
      return dateA.getTime() - dateB.getTime();
    });

    numericColumns.forEach(column => {
      const values = sortedData.map((row, index) => ({
        value: parseFloat(String(row[column])),
        date: new Date(row[timeColumn]),
        index
      })).filter(item => !isNaN(item.value));

      if (values.length < 20) return;

      // Group by hour of day for daily patterns
      const hourlyPatterns = new Map<number, number[]>();
      values.forEach(item => {
        const hour = item.date.getHours();
        if (!hourlyPatterns.has(hour)) {
          hourlyPatterns.set(hour, []);
        }
        hourlyPatterns.get(hour)!.push(item.value);
      });

      // Detect seasonal anomalies
      values.forEach(item => {
        const hour = item.date.getHours();
        const hourValues = hourlyPatterns.get(hour) || [];
        
        if (hourValues.length >= 3) {
          const mean = d3.mean(hourValues) || 0;
          const stdDev = d3.deviation(hourValues) || 1;
          const zscore = Math.abs((item.value - mean) / stdDev);
          
          if (zscore > 2.0) {
            const severity = this.calculateSeverity(zscore, 2.0);
            
            anomalies.push({
              id: `seasonal_${column}_${item.index}`,
              type: 'seasonal_anomaly',
              severity,
              score: Math.min(1, zscore / 4),
              confidence: 0.7,
              timestamp: item.date,
              rowIndex: item.index,
              columnName: column,
              value: item.value,
              expectedValue: mean,
              deviation: zscore,
              description: `Value is unusual for hour ${hour} (${zscore.toFixed(2)} std devs from seasonal mean)`,
              context: {
                method: 'Seasonal Analysis',
                parameters: { hour, threshold: 2.0 },
                statistics: { zscore, mean, stdDev }
              },
              recommendations: [
                'Consider time-of-day effects on data patterns',
                'Check for seasonal business or operational changes',
                'Validate timestamp accuracy'
              ]
            });
          }
        }
      });
    });

    return anomalies;
  }

  /**
   * Helper methods
   */
  private static getNumericColumns(data: Record<string, any>[]): string[] {
    if (data.length === 0) return [];
    
    const firstRow = data[0];
    return Object.keys(firstRow).filter(key => {
      const values = data.slice(0, 100).map(row => row[key]); // Sample first 100 rows
      const numericValues = values.filter(val => !isNaN(parseFloat(String(val))));
      return numericValues.length / values.length > 0.8;
    });
  }

  private static detectTimeColumn(data: Record<string, any>[]): string | undefined {
    if (data.length === 0) return undefined;
    
    const firstRow = data[0];
    return Object.keys(firstRow).find(key => {
      const values = data.slice(0, 10).map(row => row[key]);
      const dateValues = values.filter(val => !isNaN(Date.parse(String(val))));
      return dateValues.length / values.length > 0.8;
    });
  }

  private static calculateSeverity(score: number, threshold: number): AnomalySeverity {
    const ratio = score / threshold;
    if (ratio > 3) return 'critical';
    if (ratio > 2) return 'high';
    if (ratio > 1.5) return 'medium';
    return 'low';
  }

  private static euclideanDistance(point1: number[], point2: number[]): number {
    return Math.sqrt(
      point1.reduce((sum, val, i) => sum + Math.pow(val - point2[i], 2), 0)
    );
  }

  private static deduplicate(anomalies: Anomaly[]): Anomaly[] {
    const uniqueAnomalies = new Map<string, Anomaly>();
    
    anomalies.forEach(anomaly => {
      const key = `${anomaly.rowIndex}_${anomaly.columnName}`;
      const existing = uniqueAnomalies.get(key);
      
      if (!existing || anomaly.score > existing.score) {
        uniqueAnomalies.set(key, anomaly);
      }
    });
    
    return Array.from(uniqueAnomalies.values()).sort((a, b) => b.score - a.score);
  }

  private static calculateSummary(
    anomalies: Anomaly[], 
    totalDataPoints: number
  ): AnomalyDetectionResult['summary'] {
    const severityBreakdown: Record<AnomalySeverity, number> = {
      low: 0, medium: 0, high: 0, critical: 0
    };
    
    const typeBreakdown: Record<AnomalyType, number> = {} as Record<AnomalyType, number>;
    const affectedColumns = new Set<string>();
    
    anomalies.forEach(anomaly => {
      severityBreakdown[anomaly.severity]++;
      typeBreakdown[anomaly.type] = (typeBreakdown[anomaly.type] || 0) + 1;
      affectedColumns.add(anomaly.columnName);
    });

    // Calculate overall risk score
    const severityWeights = { low: 0.25, medium: 0.5, high: 0.75, critical: 1.0 };
    const weightedScore = Object.entries(severityBreakdown).reduce(
      (sum, [severity, count]) => sum + count * severityWeights[severity as AnomalySeverity],
      0
    );
    const overallRiskScore = Math.min(1, weightedScore / (totalDataPoints * 0.1));

    return {
      totalAnomalies: anomalies.length,
      severityBreakdown,
      typeBreakdown,
      affectedColumns: Array.from(affectedColumns),
      overallRiskScore
    };
  }
}

export default AnomalyDetectionService;
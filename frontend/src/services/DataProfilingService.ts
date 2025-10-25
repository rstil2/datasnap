export interface DataProfile {
  columns: ColumnProfile[];
  summary: DatasetSummary;
  quality: QualityMetrics;
  relationships: ColumnRelationship[];
  patterns: DataPattern[];
  recommendations: DataRecommendation[];
  generatedAt: Date;
}

export interface ColumnProfile {
  name: string;
  dataType: DataType;
  statistics: ColumnStatistics;
  quality: ColumnQuality;
  patterns: ValuePattern[];
  distribution: Distribution;
  uniqueness: UniquenessInfo;
  nullability: NullabilityInfo;
}

export interface DatasetSummary {
  rowCount: number;
  columnCount: number;
  totalCells: number;
  memoryUsage: number;
  completeness: number;
  consistency: number;
  validity: number;
  uniqueness: number;
}

export interface QualityMetrics {
  overall: number;
  completeness: number;
  validity: number;
  consistency: number;
  uniqueness: number;
  accuracy: number;
  issues: QualityIssue[];
}

export interface ColumnRelationship {
  column1: string;
  column2: string;
  type: RelationshipType;
  strength: number;
  description: string;
}

export interface DataPattern {
  type: PatternType;
  columns: string[];
  description: string;
  confidence: number;
  examples: string[];
}

export interface DataRecommendation {
  type: RecommendationType;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedColumns: string[];
  actionable: boolean;
  estimatedImpact: string;
}

export type DataType = 'string' | 'number' | 'boolean' | 'date' | 'categorical' | 'mixed';
export type RelationshipType = 'correlation' | 'functional_dependency' | 'hierarchy' | 'semantic';
export type PatternType = 'format' | 'range' | 'category' | 'temporal' | 'geographic';
export type RecommendationType = 'quality' | 'performance' | 'visualization' | 'analysis' | 'cleaning';

export interface ColumnStatistics {
  count: number;
  nullCount: number;
  uniqueCount: number;
  min?: number | string | Date;
  max?: number | string | Date;
  mean?: number;
  median?: number;
  mode?: any;
  standardDeviation?: number;
  variance?: number;
  skewness?: number;
  kurtosis?: number;
  quartiles?: [number, number, number];
}

export interface ColumnQuality {
  completeness: number;
  validity: number;
  consistency: number;
  uniqueness: number;
  issues: string[];
}

export interface ValuePattern {
  pattern: string;
  regex?: string;
  frequency: number;
  examples: string[];
  description: string;
}

export interface Distribution {
  type: 'normal' | 'uniform' | 'skewed' | 'bimodal' | 'categorical' | 'unknown';
  parameters?: Record<string, number>;
  histogram?: { bins: string[]; counts: number[] };
  topValues?: { value: any; count: number; percentage: number }[];
}

export interface UniquenessInfo {
  uniqueRatio: number;
  duplicateCount: number;
  isUnique: boolean;
  isPrimaryKeyCandidate: boolean;
}

export interface NullabilityInfo {
  nullRatio: number;
  nullPattern: 'random' | 'systematic' | 'none';
  nullRepresentations: string[];
}

export interface QualityIssue {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  column?: string;
  description: string;
  count: number;
  percentage: number;
  examples: any[];
}

class DataProfilingService {
  private static instance: DataProfilingService;

  static getInstance(): DataProfilingService {
    if (!DataProfilingService.instance) {
      DataProfilingService.instance = new DataProfilingService();
    }
    return DataProfilingService.instance;
  }

  async profileDataset(data: Record<string, any>[], options?: {
    sampleSize?: number;
    includeRelationships?: boolean;
    includePatterns?: boolean;
    qualityThresholds?: Partial<QualityMetrics>;
  }): Promise<DataProfile> {
    const startTime = Date.now();
    
    // Sample data if needed
    const sampleData = options?.sampleSize && data.length > options.sampleSize 
      ? this.sampleData(data, options.sampleSize)
      : data;

    // Profile each column
    const columns = await this.profileColumns(sampleData);
    
    // Generate dataset summary
    const summary = this.generateDatasetSummary(sampleData, columns);
    
    // Calculate quality metrics
    const quality = this.calculateQualityMetrics(columns, summary);
    
    // Find relationships between columns
    const relationships = options?.includeRelationships !== false 
      ? await this.findColumnRelationships(sampleData, columns)
      : [];
    
    // Identify patterns
    const patterns = options?.includePatterns !== false
      ? await this.identifyDataPatterns(sampleData, columns)
      : [];
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(columns, quality, relationships, patterns);

    return {
      columns,
      summary,
      quality,
      relationships,
      patterns,
      recommendations,
      generatedAt: new Date()
    };
  }

  private sampleData(data: Record<string, any>[], sampleSize: number): Record<string, any>[] {
    if (data.length <= sampleSize) return data;
    
    // Systematic sampling
    const step = Math.floor(data.length / sampleSize);
    const sampled: Record<string, any>[] = [];
    
    for (let i = 0; i < data.length && sampled.length < sampleSize; i += step) {
      sampled.push(data[i]);
    }
    
    return sampled;
  }

  private async profileColumns(data: Record<string, any>[]): Promise<ColumnProfile[]> {
    if (data.length === 0) return [];
    
    const columnNames = Object.keys(data[0]);
    const profiles: ColumnProfile[] = [];
    
    for (const columnName of columnNames) {
      const values = data.map(row => row[columnName]);
      const profile = await this.profileSingleColumn(columnName, values);
      profiles.push(profile);
    }
    
    return profiles;
  }

  private async profileSingleColumn(name: string, values: any[]): Promise<ColumnProfile> {
    // Infer data type
    const dataType = this.inferDataType(values);
    
    // Calculate statistics
    const statistics = this.calculateColumnStatistics(values, dataType);
    
    // Assess quality
    const quality = this.assessColumnQuality(values, dataType);
    
    // Identify patterns
    const patterns = this.identifyValuePatterns(values, dataType);
    
    // Analyze distribution
    const distribution = this.analyzeDistribution(values, dataType);
    
    // Calculate uniqueness
    const uniqueness = this.calculateUniqueness(values);
    
    // Analyze nullability
    const nullability = this.analyzeNullability(values);
    
    return {
      name,
      dataType,
      statistics,
      quality,
      patterns,
      distribution,
      uniqueness,
      nullability
    };
  }

  private inferDataType(values: any[]): DataType {
    const nonNullValues = values.filter(v => v != null && v !== '');
    if (nonNullValues.length === 0) return 'string';
    
    const sample = nonNullValues.slice(0, Math.min(100, nonNullValues.length));
    
    let numberCount = 0;
    let booleanCount = 0;
    let dateCount = 0;
    
    for (const value of sample) {
      if (typeof value === 'boolean' || (typeof value === 'string' && /^(true|false|yes|no|0|1)$/i.test(value))) {
        booleanCount++;
      } else if (!isNaN(Number(value)) && isFinite(Number(value))) {
        numberCount++;
      } else if (this.isDate(value)) {
        dateCount++;
      }
    }
    
    const total = sample.length;
    if (booleanCount / total > 0.8) return 'boolean';
    if (numberCount / total > 0.8) return 'number';
    if (dateCount / total > 0.8) return 'date';
    
    // Check for categorical data
    const uniqueValues = new Set(sample).size;
    if (uniqueValues <= Math.max(10, total * 0.1)) {
      return 'categorical';
    }
    
    return 'string';
  }

  private isDate(value: any): boolean {
    if (value instanceof Date) return true;
    if (typeof value === 'string') {
      const date = new Date(value);
      return !isNaN(date.getTime()) && value.match(/\d{4}/) !== null;
    }
    return false;
  }

  private calculateColumnStatistics(values: any[], dataType: DataType): ColumnStatistics {
    const nonNullValues = values.filter(v => v != null && v !== '');
    const nullCount = values.length - nonNullValues.length;
    const uniqueCount = new Set(nonNullValues).size;
    
    const stats: ColumnStatistics = {
      count: values.length,
      nullCount,
      uniqueCount
    };
    
    if (dataType === 'number') {
      const numbers = nonNullValues.map(v => Number(v)).filter(n => !isNaN(n));
      if (numbers.length > 0) {
        numbers.sort((a, b) => a - b);
        stats.min = numbers[0];
        stats.max = numbers[numbers.length - 1];
        stats.mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
        stats.median = this.calculateMedian(numbers);
        stats.standardDeviation = this.calculateStandardDeviation(numbers, stats.mean);
        stats.variance = Math.pow(stats.standardDeviation || 0, 2);
        stats.quartiles = this.calculateQuartiles(numbers);
        stats.skewness = this.calculateSkewness(numbers, stats.mean, stats.standardDeviation || 1);
        stats.kurtosis = this.calculateKurtosis(numbers, stats.mean, stats.standardDeviation || 1);
      }
    } else if (dataType === 'date') {
      const dates = nonNullValues.map(v => new Date(v)).filter(d => !isNaN(d.getTime()));
      if (dates.length > 0) {
        dates.sort((a, b) => a.getTime() - b.getTime());
        stats.min = dates[0];
        stats.max = dates[dates.length - 1];
      }
    } else {
      if (nonNullValues.length > 0) {
        const sorted = [...nonNullValues].sort();
        stats.min = sorted[0];
        stats.max = sorted[sorted.length - 1];
      }
    }
    
    // Calculate mode
    const frequency = new Map();
    nonNullValues.forEach(value => {
      frequency.set(value, (frequency.get(value) || 0) + 1);
    });
    
    if (frequency.size > 0) {
      const maxFreq = Math.max(...frequency.values());
      stats.mode = Array.from(frequency.entries())
        .filter(([_, freq]) => freq === maxFreq)
        .map(([value, _]) => value)[0];
    }
    
    return stats;
  }

  private calculateMedian(numbers: number[]): number {
    const len = numbers.length;
    const mid = Math.floor(len / 2);
    return len % 2 === 0 ? (numbers[mid - 1] + numbers[mid]) / 2 : numbers[mid];
  }

  private calculateStandardDeviation(numbers: number[], mean: number): number {
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, sq) => sum + sq, 0) / numbers.length;
    return Math.sqrt(avgSquaredDiff);
  }

  private calculateQuartiles(numbers: number[]): [number, number, number] {
    const len = numbers.length;
    const q1Index = Math.floor(len * 0.25);
    const q2Index = Math.floor(len * 0.5);
    const q3Index = Math.floor(len * 0.75);
    
    return [numbers[q1Index], numbers[q2Index], numbers[q3Index]];
  }

  private calculateSkewness(numbers: number[], mean: number, stdDev: number): number {
    const n = numbers.length;
    const sum = numbers.reduce((acc, num) => acc + Math.pow((num - mean) / stdDev, 3), 0);
    return (n / ((n - 1) * (n - 2))) * sum;
  }

  private calculateKurtosis(numbers: number[], mean: number, stdDev: number): number {
    const n = numbers.length;
    const sum = numbers.reduce((acc, num) => acc + Math.pow((num - mean) / stdDev, 4), 0);
    return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum - 
           (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
  }

  private assessColumnQuality(values: any[], dataType: DataType): ColumnQuality {
    const nonNullValues = values.filter(v => v != null && v !== '');
    const completeness = nonNullValues.length / values.length;
    
    let validity = 1;
    let consistency = 1;
    const issues: string[] = [];
    
    // Check validity based on data type
    if (dataType === 'number') {
      const validNumbers = nonNullValues.filter(v => !isNaN(Number(v)) && isFinite(Number(v)));
      validity = validNumbers.length / nonNullValues.length;
      if (validity < 1) issues.push('Invalid numeric values detected');
    } else if (dataType === 'date') {
      const validDates = nonNullValues.filter(v => !isNaN(new Date(v).getTime()));
      validity = validDates.length / nonNullValues.length;
      if (validity < 1) issues.push('Invalid date values detected');
    }
    
    // Check consistency (format consistency for strings)
    if (dataType === 'string') {
      const formats = new Map();
      nonNullValues.forEach(value => {
        const format = this.getStringFormat(String(value));
        formats.set(format, (formats.get(format) || 0) + 1);
      });
      
      const maxFormatCount = Math.max(...formats.values());
      consistency = maxFormatCount / nonNullValues.length;
      if (consistency < 0.8) issues.push('Inconsistent string formats detected');
    }
    
    const uniqueness = new Set(nonNullValues).size / nonNullValues.length;
    
    return {
      completeness,
      validity,
      consistency,
      uniqueness,
      issues
    };
  }

  private getStringFormat(value: string): string {
    // Simple format detection
    if (/^\d+$/.test(value)) return 'digits';
    if (/^[A-Z]+$/.test(value)) return 'uppercase';
    if (/^[a-z]+$/.test(value)) return 'lowercase';
    if (/^[A-Za-z\s]+$/.test(value)) return 'text';
    if (/^\w+@\w+\.\w+$/.test(value)) return 'email';
    if (/^\+?\d[\d\s\-\(\)]+$/.test(value)) return 'phone';
    return 'mixed';
  }

  private identifyValuePatterns(values: any[], dataType: DataType): ValuePattern[] {
    const patterns: ValuePattern[] = [];
    const nonNullValues = values.filter(v => v != null && v !== '');
    
    if (dataType === 'string') {
      // Common patterns
      const patternMap = new Map<string, { count: number; examples: Set<string> }>();
      
      nonNullValues.forEach(value => {
        const str = String(value);
        const pattern = str.replace(/\d/g, '9').replace(/[A-Za-z]/g, 'A');
        
        if (!patternMap.has(pattern)) {
          patternMap.set(pattern, { count: 0, examples: new Set() });
        }
        
        const entry = patternMap.get(pattern)!;
        entry.count++;
        if (entry.examples.size < 3) {
          entry.examples.add(str);
        }
      });
      
      // Convert to patterns
      patternMap.forEach((info, pattern) => {
        if (info.count >= Math.max(2, nonNullValues.length * 0.05)) {
          patterns.push({
            pattern,
            frequency: info.count / nonNullValues.length,
            examples: Array.from(info.examples),
            description: `Pattern: ${pattern} (${info.count} occurrences)`
          });
        }
      });
    }
    
    return patterns.sort((a, b) => b.frequency - a.frequency).slice(0, 5);
  }

  private analyzeDistribution(values: any[], dataType: DataType): Distribution {
    const nonNullValues = values.filter(v => v != null && v !== '');
    
    if (dataType === 'number') {
      const numbers = nonNullValues.map(v => Number(v)).filter(n => !isNaN(n));
      return this.analyzeNumericDistribution(numbers);
    } else if (dataType === 'categorical' || dataType === 'string' || dataType === 'boolean') {
      return this.analyzeCategoricalDistribution(nonNullValues);
    }
    
    return { type: 'unknown' };
  }

  private analyzeNumericDistribution(numbers: number[]): Distribution {
    if (numbers.length === 0) return { type: 'unknown' };
    
    // Create histogram
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    const binCount = Math.min(20, Math.ceil(Math.sqrt(numbers.length)));
    const binWidth = (max - min) / binCount;
    
    const bins: string[] = [];
    const counts: number[] = [];
    
    for (let i = 0; i < binCount; i++) {
      const binStart = min + i * binWidth;
      const binEnd = min + (i + 1) * binWidth;
      bins.push(`${binStart.toFixed(2)}-${binEnd.toFixed(2)}`);
      
      const count = numbers.filter(n => n >= binStart && (i === binCount - 1 ? n <= binEnd : n < binEnd)).length;
      counts.push(count);
    }
    
    // Determine distribution type (simplified)
    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    const variance = numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / numbers.length;
    
    return {
      type: 'normal', // Simplified - could implement proper distribution testing
      parameters: { mean, variance },
      histogram: { bins, counts }
    };
  }

  private analyzeCategoricalDistribution(values: any[]): Distribution {
    const frequency = new Map();
    values.forEach(value => {
      frequency.set(value, (frequency.get(value) || 0) + 1);
    });
    
    const topValues = Array.from(frequency.entries())
      .map(([value, count]) => ({
        value,
        count: count as number,
        percentage: (count as number) / values.length
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return {
      type: 'categorical',
      topValues
    };
  }

  private calculateUniqueness(values: any[]): UniquenessInfo {
    const nonNullValues = values.filter(v => v != null && v !== '');
    const uniqueValues = new Set(nonNullValues);
    const uniqueRatio = uniqueValues.size / nonNullValues.length;
    const duplicateCount = nonNullValues.length - uniqueValues.size;
    
    return {
      uniqueRatio,
      duplicateCount,
      isUnique: uniqueRatio === 1,
      isPrimaryKeyCandidate: uniqueRatio === 1 && nonNullValues.length === values.length
    };
  }

  private analyzeNullability(values: any[]): NullabilityInfo {
    const nullValues = values.filter(v => v == null || v === '');
    const nullRatio = nullValues.length / values.length;
    
    // Detect null representations
    const nullRepresentations = new Set<string>();
    values.forEach(value => {
      if (value === null) nullRepresentations.add('null');
      if (value === undefined) nullRepresentations.add('undefined');
      if (value === '') nullRepresentations.add('empty string');
      if (value === 'NULL') nullRepresentations.add('NULL');
      if (value === 'N/A') nullRepresentations.add('N/A');
      if (value === 'null') nullRepresentations.add('null string');
    });
    
    return {
      nullRatio,
      nullPattern: 'random', // Simplified - could implement pattern detection
      nullRepresentations: Array.from(nullRepresentations)
    };
  }

  private generateDatasetSummary(data: Record<string, any>[], columns: ColumnProfile[]): DatasetSummary {
    const rowCount = data.length;
    const columnCount = columns.length;
    const totalCells = rowCount * columnCount;
    
    const completeness = columns.reduce((sum, col) => sum + col.quality.completeness, 0) / columnCount;
    const consistency = columns.reduce((sum, col) => sum + col.quality.consistency, 0) / columnCount;
    const validity = columns.reduce((sum, col) => sum + col.quality.validity, 0) / columnCount;
    const uniqueness = columns.reduce((sum, col) => sum + col.quality.uniqueness, 0) / columnCount;
    
    // Estimate memory usage (rough approximation)
    const memoryUsage = JSON.stringify(data).length;
    
    return {
      rowCount,
      columnCount,
      totalCells,
      memoryUsage,
      completeness,
      consistency,
      validity,
      uniqueness
    };
  }

  private calculateQualityMetrics(columns: ColumnProfile[], summary: DatasetSummary): QualityMetrics {
    const issues: QualityIssue[] = [];
    
    // Collect issues from columns
    columns.forEach(column => {
      if (column.quality.completeness < 0.95) {
        issues.push({
          type: 'completeness',
          severity: column.quality.completeness < 0.5 ? 'critical' : 
                   column.quality.completeness < 0.8 ? 'high' : 'medium',
          column: column.name,
          description: `Column has ${Math.round((1 - column.quality.completeness) * 100)}% missing values`,
          count: column.statistics.nullCount,
          percentage: 1 - column.quality.completeness,
          examples: []
        });
      }
      
      if (column.quality.validity < 0.95) {
        issues.push({
          type: 'validity',
          severity: column.quality.validity < 0.8 ? 'high' : 'medium',
          column: column.name,
          description: `Column has ${Math.round((1 - column.quality.validity) * 100)}% invalid values`,
          count: Math.round(column.statistics.count * (1 - column.quality.validity)),
          percentage: 1 - column.quality.validity,
          examples: []
        });
      }
    });
    
    const overall = (summary.completeness + summary.validity + summary.consistency + summary.uniqueness) / 4;
    
    return {
      overall,
      completeness: summary.completeness,
      validity: summary.validity,
      consistency: summary.consistency,
      uniqueness: summary.uniqueness,
      accuracy: summary.validity, // Simplified - accuracy would need ground truth
      issues
    };
  }

  private async findColumnRelationships(data: Record<string, any>[], columns: ColumnProfile[]): Promise<ColumnRelationship[]> {
    const relationships: ColumnRelationship[] = [];
    
    // Find correlations between numeric columns
    const numericColumns = columns.filter(col => col.dataType === 'number');
    
    for (let i = 0; i < numericColumns.length; i++) {
      for (let j = i + 1; j < numericColumns.length; j++) {
        const col1 = numericColumns[i];
        const col2 = numericColumns[j];
        
        const correlation = this.calculateCorrelation(
          data.map(row => Number(row[col1.name])).filter(n => !isNaN(n)),
          data.map(row => Number(row[col2.name])).filter(n => !isNaN(n))
        );
        
        if (Math.abs(correlation) > 0.5) {
          relationships.push({
            column1: col1.name,
            column2: col2.name,
            type: 'correlation',
            strength: Math.abs(correlation),
            description: `${correlation > 0 ? 'Positive' : 'Negative'} correlation (r=${correlation.toFixed(3)})`
          });
        }
      }
    }
    
    return relationships;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;
    
    const meanX = x.slice(0, n).reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.slice(0, n).reduce((sum, val) => sum + val, 0) / n;
    
    let numerator = 0;
    let sumXSquared = 0;
    let sumYSquared = 0;
    
    for (let i = 0; i < n; i++) {
      const deltaX = x[i] - meanX;
      const deltaY = y[i] - meanY;
      numerator += deltaX * deltaY;
      sumXSquared += deltaX * deltaX;
      sumYSquared += deltaY * deltaY;
    }
    
    const denominator = Math.sqrt(sumXSquared * sumYSquared);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private async identifyDataPatterns(data: Record<string, any>[], columns: ColumnProfile[]): Promise<DataPattern[]> {
    const patterns: DataPattern[] = [];
    
    // Identify date/time patterns
    const dateColumns = columns.filter(col => col.dataType === 'date');
    if (dateColumns.length > 0) {
      patterns.push({
        type: 'temporal',
        columns: dateColumns.map(col => col.name),
        description: 'Dataset contains temporal data',
        confidence: 0.9,
        examples: dateColumns.slice(0, 3).map(col => col.name)
      });
    }
    
    // Identify ID patterns
    const idColumns = columns.filter(col => 
      col.name.toLowerCase().includes('id') && col.uniqueness.isUnique
    );
    if (idColumns.length > 0) {
      patterns.push({
        type: 'format',
        columns: idColumns.map(col => col.name),
        description: 'Unique identifier columns detected',
        confidence: 0.95,
        examples: idColumns.slice(0, 3).map(col => col.name)
      });
    }
    
    return patterns;
  }

  private generateRecommendations(
    columns: ColumnProfile[], 
    quality: QualityMetrics, 
    relationships: ColumnRelationship[], 
    patterns: DataPattern[]
  ): DataRecommendation[] {
    const recommendations: DataRecommendation[] = [];
    
    // Quality recommendations
    const lowQualityColumns = columns.filter(col => 
      col.quality.completeness < 0.8 || col.quality.validity < 0.9
    );
    
    if (lowQualityColumns.length > 0) {
      recommendations.push({
        type: 'quality',
        priority: 'high',
        title: 'Address Data Quality Issues',
        description: `${lowQualityColumns.length} columns have significant quality issues that should be addressed`,
        affectedColumns: lowQualityColumns.map(col => col.name),
        actionable: true,
        estimatedImpact: 'Improved analysis accuracy and reliability'
      });
    }
    
    // Performance recommendations
    const highCardinalityColumns = columns.filter(col => 
      col.statistics.uniqueCount > 1000 && col.dataType === 'categorical'
    );
    
    if (highCardinalityColumns.length > 0) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        title: 'Consider Indexing High-Cardinality Columns',
        description: 'Some categorical columns have very high cardinality which may impact performance',
        affectedColumns: highCardinalityColumns.map(col => col.name),
        actionable: true,
        estimatedImpact: 'Improved query and analysis performance'
      });
    }
    
    // Visualization recommendations
    const numericColumns = columns.filter(col => col.dataType === 'number');
    if (numericColumns.length >= 2) {
      recommendations.push({
        type: 'visualization',
        priority: 'low',
        title: 'Explore Numeric Relationships',
        description: 'Multiple numeric columns detected - consider correlation analysis and scatter plots',
        affectedColumns: numericColumns.map(col => col.name),
        actionable: true,
        estimatedImpact: 'Better understanding of data relationships'
      });
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
}

export default DataProfilingService;
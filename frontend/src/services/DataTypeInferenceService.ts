export interface DataTypeInference {
  column: string;
  originalType: InferredDataType;
  suggestedType: InferredDataType;
  confidence: number;
  reasoning: string;
  examples: TypeExample[];
  conversionPreview: ConversionPreview;
  validationRules?: ValidationRule[];
  metadata: InferenceMetadata;
}

export interface TypeExample {
  originalValue: any;
  convertedValue: any;
  isValid: boolean;
  conversionNote?: string;
}

export interface ConversionPreview {
  totalValues: number;
  convertibleValues: number;
  unconvertibleValues: number;
  conversionRate: number;
  potentialDataLoss: boolean;
  lossDescription?: string;
  sampleConversions: TypeExample[];
}

export interface ValidationRule {
  type: 'range' | 'format' | 'enum' | 'length' | 'required' | 'unique';
  constraint: any;
  description: string;
  severity: 'error' | 'warning' | 'info';
}

export interface InferenceMetadata {
  analysisDate: Date;
  sampleSize: number;
  patternMatches: PatternMatch[];
  statisticalProperties: StatisticalProperties;
  qualityScore: number;
  ambiguityLevel: number;
}

export interface PatternMatch {
  pattern: string;
  regex: string;
  matches: number;
  percentage: number;
  description: string;
  confidence: number;
}

export interface StatisticalProperties {
  nullCount: number;
  uniqueCount: number;
  mostCommonValues: Array<{ value: any; count: number; percentage: number }>;
  averageLength?: number;
  minLength?: number;
  maxLength?: number;
  numericProperties?: NumericProperties;
  dateProperties?: DateProperties;
}

export interface NumericProperties {
  min: number;
  max: number;
  mean: number;
  median: number;
  standardDeviation: number;
  isInteger: boolean;
  hasNegatives: boolean;
  hasDecimals: boolean;
  distribution: 'normal' | 'uniform' | 'skewed' | 'unknown';
}

export interface DateProperties {
  earliestDate: Date;
  latestDate: Date;
  commonFormats: string[];
  timezone?: string;
  granularity: 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second' | 'millisecond';
}

export type InferredDataType = 
  | 'string' | 'integer' | 'float' | 'boolean' | 'date' | 'datetime' 
  | 'time' | 'email' | 'url' | 'phone' | 'currency' | 'percentage' 
  | 'uuid' | 'json' | 'categorical' | 'ordinal' | 'unknown';

export interface UserConfirmation {
  column: string;
  acceptedType: InferredDataType;
  customValidation?: ValidationRule[];
  userNotes?: string;
  timestamp: Date;
}

export interface InferenceSession {
  id: string;
  datasetId: string;
  inferences: DataTypeInference[];
  confirmations: UserConfirmation[];
  status: 'analyzing' | 'pending_review' | 'confirmed' | 'applied';
  createdAt: Date;
  updatedAt: Date;
}

class DataTypeInferenceService {
  private static instance: DataTypeInferenceService;
  private sessions: Map<string, InferenceSession> = new Map();
  private typePatterns: Map<InferredDataType, RegExp[]> = new Map();
  private typeValidators: Map<InferredDataType, (value: any) => boolean> = new Map();

  constructor() {
    this.initializePatterns();
    this.initializeValidators();
  }

  static getInstance(): DataTypeInferenceService {
    if (!DataTypeInferenceService.instance) {
      DataTypeInferenceService.instance = new DataTypeInferenceService();
    }
    return DataTypeInferenceService.instance;
  }

  // Main inference methods
  async analyzeDataTypes(
    datasetId: string,
    data: Record<string, any>[],
    options?: {
      sampleSize?: number;
      confidenceThreshold?: number;
      includeAdvancedTypes?: boolean;
      customPatterns?: Map<string, RegExp[]>;
    }
  ): Promise<InferenceSession> {
    const sessionId = `inference_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const sampleSize = options?.sampleSize || Math.min(1000, data.length);
    const sample = this.sampleData(data, sampleSize);
    
    const inferences: DataTypeInference[] = [];
    
    if (sample.length === 0) {
      return this.createEmptySession(sessionId, datasetId);
    }

    const columns = Object.keys(sample[0]);
    
    for (const column of columns) {
      const inference = await this.inferColumnType(column, sample, options);
      inferences.push(inference);
    }

    const session: InferenceSession = {
      id: sessionId,
      datasetId,
      inferences,
      confirmations: [],
      status: 'pending_review',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  async inferColumnType(
    column: string,
    data: Record<string, any>[],
    options?: {
      confidenceThreshold?: number;
      includeAdvancedTypes?: boolean;
      customPatterns?: Map<string, RegExp[]>;
    }
  ): Promise<DataTypeInference> {
    const values = data.map(row => row[column]).filter(v => v != null && v !== '');
    
    if (values.length === 0) {
      return this.createUnknownInference(column, data.length);
    }

    // Analyze statistical properties
    const stats = this.calculateStatisticalProperties(values);
    
    // Test different type hypotheses
    const typeScores = new Map<InferredDataType, number>();
    
    // Basic types
    typeScores.set('string', this.scoreStringType(values, stats));
    typeScores.set('integer', this.scoreIntegerType(values, stats));
    typeScores.set('float', this.scoreFloatType(values, stats));
    typeScores.set('boolean', this.scoreBooleanType(values, stats));
    typeScores.set('date', this.scoreDateType(values, stats));
    typeScores.set('datetime', this.scoreDateTimeType(values, stats));
    
    // Advanced types (if enabled)
    if (options?.includeAdvancedTypes !== false) {
      typeScores.set('email', this.scoreEmailType(values, stats));
      typeScores.set('url', this.scoreUrlType(values, stats));
      typeScores.set('phone', this.scorePhoneType(values, stats));
      typeScores.set('currency', this.scoreCurrencyType(values, stats));
      typeScores.set('percentage', this.scorePercentageType(values, stats));
      typeScores.set('uuid', this.scoreUuidType(values, stats));
      typeScores.set('categorical', this.scoreCategoricalType(values, stats));
    }

    // Find best type
    const sortedTypes = Array.from(typeScores.entries())
      .sort((a, b) => b[1] - a[1]);
    
    const [suggestedType, confidence] = sortedTypes[0];
    const originalType = this.getOriginalType(values);
    
    // Generate examples and conversion preview
    const examples = this.generateTypeExamples(values, originalType, suggestedType);
    const conversionPreview = this.generateConversionPreview(values, originalType, suggestedType);
    
    // Find pattern matches
    const patternMatches = this.findPatternMatches(values, suggestedType);
    
    // Generate validation rules
    const validationRules = this.generateValidationRules(values, suggestedType, stats);
    
    return {
      column,
      originalType,
      suggestedType,
      confidence,
      reasoning: this.generateReasoning(suggestedType, confidence, stats, patternMatches),
      examples,
      conversionPreview,
      validationRules,
      metadata: {
        analysisDate: new Date(),
        sampleSize: values.length,
        patternMatches,
        statisticalProperties: stats,
        qualityScore: this.calculateQualityScore(stats, confidence),
        ambiguityLevel: this.calculateAmbiguityLevel(typeScores)
      }
    };
  }

  // Type scoring methods
  private scoreStringType(values: any[], stats: StatisticalProperties): number {
    // Base score for string type (always applicable)
    let score = 0.3;
    
    // Penalty for high numeric conversion rate
    const numericValues = values.filter(v => !isNaN(Number(v)) && isFinite(Number(v)));
    if (numericValues.length / values.length > 0.8) {
      score -= 0.4;
    }
    
    // Bonus for string-like characteristics
    if (stats.averageLength && stats.averageLength > 20) score += 0.1;
    if (stats.uniqueCount / values.length > 0.8) score += 0.1;
    
    return Math.max(0, Math.min(1, score));
  }

  private scoreIntegerType(values: any[], stats: StatisticalProperties): number {
    const numericValues = values.filter(v => {
      const num = Number(v);
      return !isNaN(num) && isFinite(num) && Number.isInteger(num);
    });
    
    const conversionRate = numericValues.length / values.length;
    
    if (conversionRate < 0.8) return 0;
    
    let score = conversionRate;
    
    // Bonus for integer-like patterns
    if (stats.numericProperties && !stats.numericProperties.hasDecimals) {
      score += 0.1;
    }
    
    return Math.min(1, score);
  }

  private scoreFloatType(values: any[], stats: StatisticalProperties): number {
    const numericValues = values.filter(v => {
      const num = Number(v);
      return !isNaN(num) && isFinite(num);
    });
    
    const conversionRate = numericValues.length / values.length;
    
    if (conversionRate < 0.8) return 0;
    
    let score = conversionRate;
    
    // Bonus for decimal presence
    if (stats.numericProperties?.hasDecimals) {
      score += 0.1;
    }
    
    // Penalty if all values are integers
    if (stats.numericProperties && !stats.numericProperties.hasDecimals) {
      score -= 0.2;
    }
    
    return Math.max(0, Math.min(1, score));
  }

  private scoreBooleanType(values: any[], stats: StatisticalProperties): number {
    const booleanValues = values.filter(v => 
      typeof v === 'boolean' || 
      (typeof v === 'string' && /^(true|false|yes|no|y|n|1|0)$/i.test(v.trim())) ||
      (typeof v === 'number' && (v === 0 || v === 1))
    );
    
    const conversionRate = booleanValues.length / values.length;
    
    if (conversionRate < 0.9) return 0;
    
    // Strong bonus if only 2 unique values
    if (stats.uniqueCount <= 2) {
      return conversionRate + 0.2;
    }
    
    return conversionRate;
  }

  private scoreDateType(values: any[], stats: StatisticalProperties): number {
    const dateValues = values.filter(v => {
      if (v instanceof Date) return true;
      if (typeof v === 'string') {
        const date = new Date(v);
        return !isNaN(date.getTime()) && v.match(/\d{4}/) !== null;
      }
      return false;
    });
    
    const conversionRate = dateValues.length / values.length;
    
    if (conversionRate < 0.8) return 0;
    
    let score = conversionRate;
    
    // Bonus for date patterns
    const datePatterns = [
      /\d{4}-\d{2}-\d{2}/, // YYYY-MM-DD
      /\d{2}\/\d{2}\/\d{4}/, // MM/DD/YYYY
      /\d{2}-\d{2}-\d{4}/, // MM-DD-YYYY
    ];
    
    const patternMatches = datePatterns.some(pattern => 
      values.some(v => typeof v === 'string' && pattern.test(v))
    );
    
    if (patternMatches) score += 0.1;
    
    return Math.min(1, score);
  }

  private scoreDateTimeType(values: any[], stats: StatisticalProperties): number {
    const dateTimeValues = values.filter(v => {
      if (v instanceof Date) return true;
      if (typeof v === 'string') {
        // Check for time components
        if (!v.includes(':') && !v.includes('T')) return false;
        const date = new Date(v);
        return !isNaN(date.getTime());
      }
      return false;
    });
    
    return dateTimeValues.length / values.length;
  }

  private scoreEmailType(values: any[], stats: StatisticalProperties): number {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailValues = values.filter(v => 
      typeof v === 'string' && emailPattern.test(v.trim())
    );
    
    return emailValues.length / values.length;
  }

  private scoreUrlType(values: any[], stats: StatisticalProperties): number {
    const urlPattern = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
    const urlValues = values.filter(v => 
      typeof v === 'string' && urlPattern.test(v.trim())
    );
    
    return urlValues.length / values.length;
  }

  private scorePhoneType(values: any[], stats: StatisticalProperties): number {
    const phonePattern = /^[\+]?[\d\s\-\(\)]{10,}$/;
    const phoneValues = values.filter(v => 
      typeof v === 'string' && phonePattern.test(v.trim())
    );
    
    return phoneValues.length / values.length;
  }

  private scoreCurrencyType(values: any[], stats: StatisticalProperties): number {
    const currencyPattern = /^[\$£€¥]?[\d,]+\.?\d*$/;
    const currencyValues = values.filter(v => 
      typeof v === 'string' && currencyPattern.test(v.trim())
    );
    
    return currencyValues.length / values.length;
  }

  private scorePercentageType(values: any[], stats: StatisticalProperties): number {
    const percentagePattern = /^\d+\.?\d*%$/;
    const percentageValues = values.filter(v => 
      typeof v === 'string' && percentagePattern.test(v.trim())
    );
    
    return percentageValues.length / values.length;
  }

  private scoreUuidType(values: any[], stats: StatisticalProperties): number {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const uuidValues = values.filter(v => 
      typeof v === 'string' && uuidPattern.test(v.trim())
    );
    
    return uuidValues.length / values.length;
  }

  private scoreCategoricalType(values: any[], stats: StatisticalProperties): number {
    const uniqueRatio = stats.uniqueCount / values.length;
    
    // Categorical if low unique ratio and reasonable number of categories
    if (uniqueRatio < 0.1 && stats.uniqueCount < 20) {
      return 0.8;
    } else if (uniqueRatio < 0.3 && stats.uniqueCount < 50) {
      return 0.6;
    }
    
    return 0;
  }

  // Helper methods
  private calculateStatisticalProperties(values: any[]): StatisticalProperties {
    const nonNullValues = values.filter(v => v != null && v !== '');
    const uniqueValues = new Set(nonNullValues);
    
    // Count frequencies
    const frequencies = new Map();
    nonNullValues.forEach(value => {
      frequencies.set(value, (frequencies.get(value) || 0) + 1);
    });
    
    const mostCommonValues = Array.from(frequencies.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([value, count]) => ({
        value,
        count: count as number,
        percentage: (count as number) / nonNullValues.length
      }));

    const stats: StatisticalProperties = {
      nullCount: values.length - nonNullValues.length,
      uniqueCount: uniqueValues.size,
      mostCommonValues
    };

    // String statistics
    const stringValues = nonNullValues.filter(v => typeof v === 'string');
    if (stringValues.length > 0) {
      const lengths = stringValues.map(v => v.length);
      stats.averageLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
      stats.minLength = Math.min(...lengths);
      stats.maxLength = Math.max(...lengths);
    }

    // Numeric statistics
    const numericValues = nonNullValues
      .map(v => Number(v))
      .filter(n => !isNaN(n) && isFinite(n));
    
    if (numericValues.length > nonNullValues.length * 0.8) {
      stats.numericProperties = this.calculateNumericProperties(numericValues);
    }

    return stats;
  }

  private calculateNumericProperties(numbers: number[]): NumericProperties {
    const sorted = [...numbers].sort((a, b) => a - b);
    const sum = numbers.reduce((a, b) => a + b, 0);
    const mean = sum / numbers.length;
    
    const variance = numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / numbers.length;
    const standardDeviation = Math.sqrt(variance);

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean,
      median: sorted[Math.floor(sorted.length / 2)],
      standardDeviation,
      isInteger: numbers.every(n => Number.isInteger(n)),
      hasNegatives: numbers.some(n => n < 0),
      hasDecimals: numbers.some(n => !Number.isInteger(n)),
      distribution: this.determineDistribution(numbers, mean, standardDeviation)
    };
  }

  private determineDistribution(numbers: number[], mean: number, stdDev: number): 'normal' | 'uniform' | 'skewed' | 'unknown' {
    // Simplified distribution detection
    const skewness = this.calculateSkewness(numbers, mean, stdDev);
    
    if (Math.abs(skewness) < 0.5) {
      return 'normal';
    } else if (Math.abs(skewness) > 2) {
      return 'skewed';
    }
    
    return 'unknown';
  }

  private calculateSkewness(numbers: number[], mean: number, stdDev: number): number {
    if (stdDev === 0) return 0;
    
    const n = numbers.length;
    const sum = numbers.reduce((acc, num) => acc + Math.pow((num - mean) / stdDev, 3), 0);
    return (n / ((n - 1) * (n - 2))) * sum;
  }

  private getOriginalType(values: any[]): InferredDataType {
    // Determine the current/original type based on JavaScript types
    const sample = values.slice(0, 10);
    
    if (sample.every(v => typeof v === 'boolean')) return 'boolean';
    if (sample.every(v => typeof v === 'number')) return Number.isInteger(sample[0]) ? 'integer' : 'float';
    if (sample.every(v => v instanceof Date)) return 'datetime';
    
    return 'string';
  }

  private generateTypeExamples(values: any[], originalType: InferredDataType, suggestedType: InferredDataType): TypeExample[] {
    const examples: TypeExample[] = [];
    const sampleValues = values.slice(0, 5);
    
    for (const value of sampleValues) {
      const converted = this.convertValue(value, suggestedType);
      examples.push({
        originalValue: value,
        convertedValue: converted.value,
        isValid: converted.success,
        conversionNote: converted.note
      });
    }
    
    return examples;
  }

  private generateConversionPreview(values: any[], originalType: InferredDataType, suggestedType: InferredDataType): ConversionPreview {
    const conversions = values.map(v => this.convertValue(v, suggestedType));
    const convertibleValues = conversions.filter(c => c.success).length;
    
    return {
      totalValues: values.length,
      convertibleValues,
      unconvertibleValues: values.length - convertibleValues,
      conversionRate: convertibleValues / values.length,
      potentialDataLoss: convertibleValues < values.length,
      lossDescription: convertibleValues < values.length ? 
        `${values.length - convertibleValues} values cannot be converted` : undefined,
      sampleConversions: conversions.slice(0, 5).map(c => ({
        originalValue: c.originalValue,
        convertedValue: c.value,
        isValid: c.success,
        conversionNote: c.note
      }))
    };
  }

  private convertValue(value: any, targetType: InferredDataType): { value: any; success: boolean; note?: string; originalValue: any } {
    const result = { originalValue: value, value: value, success: true };
    
    try {
      switch (targetType) {
        case 'integer':
          const intVal = parseInt(String(value), 10);
          if (isNaN(intVal)) {
            result.success = false;
            result.note = 'Cannot convert to integer';
          } else {
            result.value = intVal;
          }
          break;
          
        case 'float':
          const floatVal = parseFloat(String(value));
          if (isNaN(floatVal)) {
            result.success = false;
            result.note = 'Cannot convert to float';
          } else {
            result.value = floatVal;
          }
          break;
          
        case 'boolean':
          if (typeof value === 'boolean') {
            result.value = value;
          } else if (typeof value === 'string') {
            const str = value.toLowerCase().trim();
            if (['true', 'yes', 'y', '1'].includes(str)) {
              result.value = true;
            } else if (['false', 'no', 'n', '0'].includes(str)) {
              result.value = false;
            } else {
              result.success = false;
              result.note = 'Cannot convert to boolean';
            }
          } else if (typeof value === 'number') {
            result.value = value !== 0;
          } else {
            result.success = false;
            result.note = 'Cannot convert to boolean';
          }
          break;
          
        case 'date':
        case 'datetime':
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            result.success = false;
            result.note = 'Cannot convert to date';
          } else {
            result.value = date;
          }
          break;
          
        default:
          result.value = String(value);
      }
    } catch (error) {
      result.success = false;
      result.note = 'Conversion error';
    }
    
    return result;
  }

  private findPatternMatches(values: any[], type: InferredDataType): PatternMatch[] {
    const patterns = this.typePatterns.get(type) || [];
    const matches: PatternMatch[] = [];
    
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      const matchCount = values.filter(v => 
        typeof v === 'string' && pattern.test(v)
      ).length;
      
      if (matchCount > 0) {
        matches.push({
          pattern: pattern.source,
          regex: pattern.toString(),
          matches: matchCount,
          percentage: matchCount / values.length,
          description: `Pattern ${i + 1} for ${type}`,
          confidence: matchCount / values.length
        });
      }
    }
    
    return matches;
  }

  private generateValidationRules(values: any[], type: InferredDataType, stats: StatisticalProperties): ValidationRule[] {
    const rules: ValidationRule[] = [];
    
    // Common rules based on type
    switch (type) {
      case 'integer':
      case 'float':
        if (stats.numericProperties) {
          rules.push({
            type: 'range',
            constraint: { min: stats.numericProperties.min, max: stats.numericProperties.max },
            description: `Value should be between ${stats.numericProperties.min} and ${stats.numericProperties.max}`,
            severity: 'error'
          });
        }
        break;
        
      case 'string':
        if (stats.minLength !== undefined && stats.maxLength !== undefined) {
          rules.push({
            type: 'length',
            constraint: { min: stats.minLength, max: stats.maxLength },
            description: `Length should be between ${stats.minLength} and ${stats.maxLength} characters`,
            severity: 'warning'
          });
        }
        break;
        
      case 'categorical':
        const validValues = stats.mostCommonValues.map(v => v.value);
        rules.push({
          type: 'enum',
          constraint: validValues,
          description: `Value should be one of: ${validValues.join(', ')}`,
          severity: 'error'
        });
        break;
    }
    
    return rules;
  }

  private generateReasoning(
    type: InferredDataType, 
    confidence: number, 
    stats: StatisticalProperties,
    patterns: PatternMatch[]
  ): string {
    let reasoning = `Suggested as ${type} with ${(confidence * 100).toFixed(1)}% confidence. `;
    
    if (patterns.length > 0) {
      reasoning += `Detected ${patterns.length} matching pattern(s). `;
    }
    
    if (stats.uniqueCount === stats.mostCommonValues[0]?.count) {
      reasoning += 'All values are identical. ';
    } else if (stats.uniqueCount < 10) {
      reasoning += 'Limited unique values suggest categorical data. ';
    }
    
    if (stats.nullCount > 0) {
      reasoning += `${stats.nullCount} null values present. `;
    }
    
    return reasoning.trim();
  }

  private calculateQualityScore(stats: StatisticalProperties, confidence: number): number {
    let score = confidence;
    
    // Penalty for high null rate
    const nullRate = stats.nullCount / (stats.uniqueCount + stats.nullCount);
    score -= nullRate * 0.3;
    
    // Bonus for good uniqueness ratio (not too low, not too high)
    const uniquenessRatio = stats.uniqueCount / (stats.uniqueCount + stats.nullCount);
    if (uniquenessRatio > 0.1 && uniquenessRatio < 0.9) {
      score += 0.1;
    }
    
    return Math.max(0, Math.min(1, score));
  }

  private calculateAmbiguityLevel(typeScores: Map<InferredDataType, number>): number {
    const scores = Array.from(typeScores.values()).sort((a, b) => b - a);
    
    if (scores.length < 2) return 0;
    
    const topScore = scores[0];
    const secondScore = scores[1];
    
    // Higher ambiguity when top two scores are close
    return 1 - (topScore - secondScore);
  }

  private sampleData(data: Record<string, any>[], sampleSize: number): Record<string, any>[] {
    if (data.length <= sampleSize) return data;
    
    const step = Math.floor(data.length / sampleSize);
    const sample: Record<string, any>[] = [];
    
    for (let i = 0; i < data.length && sample.length < sampleSize; i += step) {
      sample.push(data[i]);
    }
    
    return sample;
  }

  private createEmptySession(sessionId: string, datasetId: string): InferenceSession {
    return {
      id: sessionId,
      datasetId,
      inferences: [],
      confirmations: [],
      status: 'confirmed',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private createUnknownInference(column: string, totalRows: number): DataTypeInference {
    return {
      column,
      originalType: 'unknown',
      suggestedType: 'unknown',
      confidence: 0,
      reasoning: 'No valid data found for analysis',
      examples: [],
      conversionPreview: {
        totalValues: 0,
        convertibleValues: 0,
        unconvertibleValues: 0,
        conversionRate: 0,
        potentialDataLoss: false,
        sampleConversions: []
      },
      metadata: {
        analysisDate: new Date(),
        sampleSize: 0,
        patternMatches: [],
        statisticalProperties: {
          nullCount: totalRows,
          uniqueCount: 0,
          mostCommonValues: []
        },
        qualityScore: 0,
        ambiguityLevel: 0
      }
    };
  }

  // Session management
  getSession(sessionId: string): InferenceSession | undefined {
    return this.sessions.get(sessionId);
  }

  async confirmTypes(sessionId: string, confirmations: UserConfirmation[]): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    session.confirmations = confirmations;
    session.status = 'confirmed';
    session.updatedAt = new Date();
  }

  async applyInferences(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'confirmed') return;
    
    session.status = 'applied';
    session.updatedAt = new Date();
  }

  // Initialize patterns and validators
  private initializePatterns(): void {
    this.typePatterns.set('email', [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    ]);
    
    this.typePatterns.set('phone', [
      /^\+?[\d\s\-\(\)]{10,}$/,
      /^\(\d{3}\)\s?\d{3}-\d{4}$/,
      /^\d{3}-\d{3}-\d{4}$/
    ]);
    
    this.typePatterns.set('url', [
      /^https?:\/\/[^\s/$.?#].[^\s]*$/i,
      /^www\.[^\s/$.?#].[^\s]*$/i
    ]);
    
    this.typePatterns.set('uuid', [
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    ]);
    
    this.typePatterns.set('currency', [
      /^[\$£€¥]?[\d,]+\.?\d*$/,
      /^\$\d{1,3}(,\d{3})*(\.\d{2})?$/
    ]);
    
    this.typePatterns.set('percentage', [
      /^\d+\.?\d*%$/,
      /^0?\.\d+%$/
    ]);
  }

  private initializeValidators(): void {
    this.typeValidators.set('email', (value) => {
      return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    });
    
    this.typeValidators.set('phone', (value) => {
      return typeof value === 'string' && /^\+?[\d\s\-\(\)]{10,}$/.test(value);
    });
    
    this.typeValidators.set('url', (value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    });
    
    this.typeValidators.set('uuid', (value) => {
      return typeof value === 'string' && 
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    });
  }
}

export default DataTypeInferenceService;
import { apiService, StatisticalStats } from '../services/api';

export interface ProcessedColumn {
  name: string;
  type: 'numeric' | 'categorical' | 'datetime' | 'text';
  count: number;
  missing: number;
  missingPercent: number;
  unique?: number;
  uniquePercent?: number;
  // Numeric stats
  mean?: number;
  median?: number;
  stdDev?: number;
  min?: number;
  max?: number;
  q1?: number;
  q3?: number;
  skewness?: number;
  kurtosis?: number;
  cv?: number;
  outliers?: number;
  // Categorical stats
  mostCommon?: string;
  mostCommonCount?: number;
  mostCommonPercent?: number;
  diversity?: number; // Shannon diversity or similar
}

export interface ProcessedDataset {
  filename: string;
  totalRows: number;
  totalColumns: number;
  columns: ProcessedColumn[];
  dataQualityScore: number;
  completeness: number;
  summary: {
    numericColumns: number;
    categoricalColumns: number;
    datetimeColumns: number;
    textColumns: number;
  };
}

/**
 * Detect the data type of a column based on its values
 */
export function detectColumnType(values: any[]): 'numeric' | 'categorical' | 'datetime' | 'text' {
  const nonEmptyValues = values.filter(val => val !== null && val !== undefined && val !== '');
  
  if (nonEmptyValues.length === 0) return 'text';
  
  // Check for numeric
  const numericValues = nonEmptyValues.map(val => {
    const num = parseFloat(String(val));
    return isNaN(num) ? null : num;
  }).filter(val => val !== null);
  
  if (numericValues.length > nonEmptyValues.length * 0.8) {
    return 'numeric';
  }
  
  // Check for datetime
  const dateValues = nonEmptyValues.filter(val => {
    const dateTest = new Date(String(val));
    return !isNaN(dateTest.getTime()) && String(val).match(/\d{2,4}[-\/]\d{1,2}[-\/]\d{1,4}|\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/);
  });
  
  if (dateValues.length > nonEmptyValues.length * 0.7) {
    return 'datetime';
  }
  
  // Check for categorical (limited unique values)
  const uniqueValues = new Set(nonEmptyValues.map(val => String(val)));
  const uniqueRatio = uniqueValues.size / nonEmptyValues.length;
  
  if (uniqueRatio < 0.1 || uniqueValues.size < 20) {
    return 'categorical';
  }
  
  return 'text';
}

/**
 * Calculate comprehensive statistics for numeric data
 */
export function calculateNumericStats(values: number[]): Partial<ProcessedColumn> {
  if (values.length === 0) return {};
  
  const sorted = [...values].sort((a, b) => a - b);
  const n = values.length;
  const sum = values.reduce((acc, val) => acc + val, 0);
  const mean = sum / n;
  
  // Calculate median
  const median = n % 2 === 0 
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];
  
  // Calculate variance and standard deviation
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  
  // Calculate quartiles
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  
  // Calculate outliers (using IQR method)
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  const outliers = values.filter(v => v < lowerBound || v > upperBound).length;
  
  // Calculate skewness
  const skewness = n > 2 ? (n / ((n - 1) * (n - 2))) * values.reduce((sum, value) => {
    return sum + Math.pow((value - mean) / stdDev, 3);
  }, 0) : 0;
  
  // Calculate kurtosis
  const kurtosis = n > 3 ? (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3)) * 
    values.reduce((sum, value) => sum + Math.pow((value - mean) / stdDev, 4), 0) - 
    3 * Math.pow(n - 1, 2) / ((n - 2) * (n - 3)) : 0;
  
  // Coefficient of variation
  const cv = mean !== 0 ? (stdDev / Math.abs(mean)) * 100 : 0;
  
  return {
    mean: parseFloat(mean.toFixed(4)),
    median: parseFloat(median.toFixed(4)),
    stdDev: parseFloat(stdDev.toFixed(4)),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    q1: parseFloat(q1.toFixed(4)),
    q3: parseFloat(q3.toFixed(4)),
    skewness: parseFloat(skewness.toFixed(4)),
    kurtosis: parseFloat(kurtosis.toFixed(4)),
    cv: parseFloat(cv.toFixed(2)),
    outliers
  };
}

/**
 * Calculate statistics for categorical data
 */
export function calculateCategoricalStats(values: string[]): Partial<ProcessedColumn> {
  if (values.length === 0) return {};
  
  const counts = new Map<string, number>();
  values.forEach(val => {
    const key = String(val);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  
  const sortedCounts = Array.from(counts.entries()).sort(([,a], [,b]) => b - a);
  const unique = counts.size;
  const uniquePercent = (unique / values.length) * 100;
  
  // Shannon diversity index
  const diversity = -Array.from(counts.values()).reduce((acc, count) => {
    const p = count / values.length;
    return acc + p * Math.log2(p);
  }, 0);
  
  const mostCommon = sortedCounts[0];
  
  return {
    unique,
    uniquePercent: parseFloat(uniquePercent.toFixed(2)),
    mostCommon: mostCommon ? mostCommon[0] : undefined,
    mostCommonCount: mostCommon ? mostCommon[1] : 0,
    mostCommonPercent: mostCommon ? parseFloat(((mostCommon[1] / values.length) * 100).toFixed(2)) : 0,
    diversity: parseFloat(diversity.toFixed(4))
  };
}

/**
 * Process a complete dataset and return comprehensive statistics
 */
export function processDataset(data: Record<string, any>[], filename: string): ProcessedDataset {
  if (!data || data.length === 0) {
    throw new Error('No data provided for processing');
  }
  
  const headers = Object.keys(data[0]);
  const totalRows = data.length;
  const totalColumns = headers.length;
  
  const columns: ProcessedColumn[] = headers.map(header => {
    const values = data.map(row => row[header]);
    const nonNullValues = values.filter(val => val !== null && val !== undefined && val !== '');
    const missing = totalRows - nonNullValues.length;
    const missingPercent = (missing / totalRows) * 100;
    
    const type = detectColumnType(values);
    
    const baseStats: ProcessedColumn = {
      name: header,
      type,
      count: nonNullValues.length,
      missing,
      missingPercent: parseFloat(missingPercent.toFixed(2))
    };
    
    if (type === 'numeric') {
      const numericValues = nonNullValues.map(val => parseFloat(String(val))).filter(val => !isNaN(val));
      return { ...baseStats, ...calculateNumericStats(numericValues) };
    } else if (type === 'categorical') {
      const stringValues = nonNullValues.map(val => String(val));
      return { ...baseStats, ...calculateCategoricalStats(stringValues) };
    }
    
    return baseStats;
  });
  
  // Calculate data quality metrics
  const totalCells = totalRows * totalColumns;
  const totalMissing = columns.reduce((sum, col) => sum + col.missing, 0);
  const completeness = ((totalCells - totalMissing) / totalCells) * 100;
  
  // Quality score based on completeness, consistency, and type distribution
  const completenessScore = Math.min(completeness / 95, 1) * 40;
  const typeDistributionScore = Math.min(columns.filter(col => col.type !== 'text').length / columns.length, 1) * 30;
  const outlierPenalty = columns.reduce((penalty, col) => {
    if (col.type === 'numeric' && col.outliers) {
      return penalty + (col.outliers / (col.count || 1)) * 10;
    }
    return penalty;
  }, 0);
  
  const dataQualityScore = Math.max(0, completenessScore + typeDistributionScore + 30 - outlierPenalty);
  
  const summary = {
    numericColumns: columns.filter(col => col.type === 'numeric').length,
    categoricalColumns: columns.filter(col => col.type === 'categorical').length,
    datetimeColumns: columns.filter(col => col.type === 'datetime').length,
    textColumns: columns.filter(col => col.type === 'text').length
  };
  
  return {
    filename,
    totalRows,
    totalColumns,
    columns,
    dataQualityScore: parseFloat(dataQualityScore.toFixed(1)),
    completeness: parseFloat(completeness.toFixed(1)),
    summary
  };
}

/**
 * Attempt to use API service, fallback to local processing
 */
export async function getStatistics(fileId: number, data: Record<string, any>[], filename: string): Promise<StatisticalStats | ProcessedDataset> {
  try {
    // Try API first

    const apiStats = await apiService.getDescriptiveStats(fileId);

    return apiStats;
  } catch (error) {
    console.warn('API service unavailable, using local processing:', error);
    // Fallback to local processing
    const localStats = processDataset(data, filename);
    
    // Convert to API-compatible format
    const apiCompatibleStats: StatisticalStats = {
      column_stats: {},
      missing_values: {},
      data_types: {}
    };
    
    localStats.columns.forEach(col => {
      apiCompatibleStats.data_types[col.name] = col.type;
      apiCompatibleStats.missing_values[col.name] = col.missing;
      
      if (col.type === 'numeric') {
        apiCompatibleStats.column_stats[col.name] = {
          count: col.count,
          mean: col.mean,
          std: col.stdDev,
          min: col.min,
          max: col.max,
          '25%': col.q1,
          '50%': col.median,
          '75%': col.q3
        };
      } else {
        apiCompatibleStats.column_stats[col.name] = {
          count: col.count,
          unique: col.unique,
          top: col.mostCommon,
          freq: col.mostCommonCount
        };
      }
    });
    
    return apiCompatibleStats;
  }
}

/**
 * Standardized error handling for data processing operations
 */
export function handleDataError(error: unknown, operation: string): string {
  console.error(`Error during ${operation}:`, error);
  
  if (error instanceof Error) {
    // Handle common API errors
    if (error.message.includes('Failed to fetch')) {
      return `Network error: Unable to connect to the server for ${operation}. Using local processing instead.`;
    }
    if (error.message.includes('404')) {
      return `Resource not found: The requested data for ${operation} could not be found.`;
    }
    if (error.message.includes('500')) {
      return `Server error: The server encountered an error during ${operation}. Please try again later.`;
    }
    return error.message;
  }
  
  return `An unexpected error occurred during ${operation}. Please try again.`;
}

/**
 * Validate data before processing
 */
export function validateData(data: any[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data || !Array.isArray(data)) {
    errors.push('Data must be an array');
    return { isValid: false, errors };
  }
  
  if (data.length === 0) {
    errors.push('Data array is empty');
    return { isValid: false, errors };
  }
  
  if (data.length < 2) {
    errors.push('Dataset must have at least 2 rows for meaningful analysis');
  }
  
  const firstRow = data[0];
  if (!firstRow || typeof firstRow !== 'object') {
    errors.push('Data rows must be objects');
    return { isValid: false, errors };
  }
  
  const headers = Object.keys(firstRow);
  if (headers.length === 0) {
    errors.push('Data rows must have at least one column');
    return { isValid: false, errors };
  }
  
  // Check for consistency across rows
  const inconsistentRows = data.slice(1, 100).filter(row => { // Check first 100 rows for performance
    const rowHeaders = Object.keys(row);
    return rowHeaders.length !== headers.length || !headers.every(h => rowHeaders.includes(h));
  });
  
  if (inconsistentRows.length > 0) {
    errors.push('Data rows have inconsistent column structure');
  }
  
  return { isValid: errors.length === 0, errors };
}
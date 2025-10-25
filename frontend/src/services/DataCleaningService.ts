/**
 * AI-Powered Data Cleaning Service
 * Automatically detects and fixes data quality issues
 */

import { FileParseResult } from './FileParserService';

export interface DataQualityIssue {
  id: string;
  type: 'missing_values' | 'duplicates' | 'inconsistent_format' | 'outliers' | 'invalid_data' | 'encoding_issues';
  severity: 'critical' | 'high' | 'medium' | 'low';
  column: string;
  description: string;
  affectedRows: number;
  affectedPercentage: number;
  examples: any[];
  suggestedFix: {
    method: string;
    description: string;
    preview: any[];
    confidence: number;
  };
  autoFixable: boolean;
}

export interface CleaningRecommendation {
  id: string;
  title: string;
  description: string;
  impact: string;
  fixes: DataQualityIssue[];
  estimatedImprovement: number; // 0-100%
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface CleaningResult {
  originalData: Record<string, any>[];
  cleanedData: Record<string, any>[];
  appliedFixes: Array<{
    issueId: string;
    method: string;
    rowsAffected: number;
  }>;
  qualityImprovement: {
    before: number;
    after: number;
    improvement: number;
  };
  summary: string;
}

export class DataCleaningService {
  private static readonly OUTLIER_THRESHOLD = 3; // Standard deviations
  private static readonly DUPLICATE_SIMILARITY_THRESHOLD = 0.95;
  private static readonly MIN_CONFIDENCE_FOR_AUTO_FIX = 0.8;

  /**
   * Analyze data and detect quality issues
   */
  static analyzeDataQuality(parseResult: FileParseResult): {
    issues: DataQualityIssue[];
    recommendations: CleaningRecommendation[];
    overallScore: number;
  } {
    const { data, headers, schema } = parseResult;
    const issues: DataQualityIssue[] = [];

    // Detect various data quality issues
    issues.push(...this.detectMissingValues(data, headers, schema.columns));
    issues.push(...this.detectDuplicates(data, headers));
    issues.push(...this.detectInconsistentFormats(data, headers, schema.columns));
    issues.push(...this.detectOutliers(data, headers, schema.columns));
    issues.push(...this.detectInvalidData(data, headers, schema.columns));
    issues.push(...this.detectEncodingIssues(data, headers));

    // Generate recommendations
    const recommendations = this.generateCleaningRecommendations(issues);

    // Calculate overall quality score
    const overallScore = this.calculateQualityScore(data, issues);

    return { issues, recommendations, overallScore };
  }

  /**
   * Apply selected cleaning fixes to the data
   */
  static async applyCleaningFixes(
    data: Record<string, any>[],
    fixes: Array<{ issueId: string; method: string; parameters?: any }>
  ): Promise<CleaningResult> {
    const originalData = [...data];
    let cleanedData = [...data];
    const appliedFixes: CleaningResult['appliedFixes'] = [];

    for (const fix of fixes) {
      const result = await this.applySpecificFix(cleanedData, fix);
      cleanedData = result.data;
      appliedFixes.push({
        issueId: fix.issueId,
        method: fix.method,
        rowsAffected: result.rowsAffected
      });
    }

    // Calculate quality improvement
    const beforeScore = this.calculateDataQualityScore(originalData);
    const afterScore = this.calculateDataQualityScore(cleanedData);
    
    return {
      originalData,
      cleanedData,
      appliedFixes,
      qualityImprovement: {
        before: beforeScore,
        after: afterScore,
        improvement: afterScore - beforeScore
      },
      summary: this.generateCleaningSummary(appliedFixes, beforeScore, afterScore)
    };
  }

  /**
   * Detect missing values
   */
  private static detectMissingValues(
    data: Record<string, any>[],
    headers: string[],
    columns: any[]
  ): DataQualityIssue[] {
    const issues: DataQualityIssue[] = [];

    headers.forEach(header => {
      const values = data.map(row => row[header]);
      const missingCount = values.filter(val => 
        val === null || val === undefined || val === '' || val === 'null' || val === 'NULL' || val === 'N/A' || val === 'n/a'
      ).length;

      if (missingCount > 0) {
        const percentage = (missingCount / data.length) * 100;
        const column = columns.find(col => col.name === header);
        
        // Suggest fix based on column type and missing percentage
        let suggestedFix;
        if (column?.type === 'number') {
          const nonMissingValues = values.filter(val => val != null && val !== '' && !isNaN(Number(val)));
          const mean = nonMissingValues.reduce((sum, val) => sum + Number(val), 0) / nonMissingValues.length;
          const median = [...nonMissingValues].sort((a, b) => Number(a) - Number(b))[Math.floor(nonMissingValues.length / 2)];
          
          suggestedFix = {
            method: percentage < 10 ? 'fill_with_median' : percentage < 30 ? 'fill_with_mean' : 'remove_rows',
            description: percentage < 10 
              ? `Fill missing values with median (${median?.toFixed(2)})`
              : percentage < 30 
              ? `Fill missing values with mean (${mean?.toFixed(2)})`
              : 'Remove rows with missing values',
            preview: percentage < 30 
              ? data.filter(row => row[header] === null || row[header] === '' || row[header] === undefined)
                    .slice(0, 3)
                    .map(row => ({ ...row, [header]: percentage < 10 ? median : mean }))
              : [],
            confidence: percentage < 5 ? 0.9 : percentage < 15 ? 0.75 : 0.6
          };
        } else if (column?.type === 'string') {
          const nonMissingValues = values.filter(val => val != null && val !== '');
          const mostCommon = this.getMostCommonValue(nonMissingValues);
          
          suggestedFix = {
            method: percentage < 5 ? 'fill_with_mode' : percentage < 20 ? 'fill_with_unknown' : 'remove_rows',
            description: percentage < 5 
              ? `Fill with most common value: "${mostCommon}"`
              : percentage < 20 
              ? 'Fill with "Unknown" placeholder'
              : 'Remove rows with missing values',
            preview: data.filter(row => row[header] === null || row[header] === '' || row[header] === undefined)
                        .slice(0, 3)
                        .map(row => ({ 
                          ...row, 
                          [header]: percentage < 5 ? mostCommon : percentage < 20 ? 'Unknown' : '[REMOVED]'
                        })),
            confidence: percentage < 3 ? 0.85 : percentage < 10 ? 0.7 : 0.55
          };
        } else {
          suggestedFix = {
            method: 'remove_rows',
            description: 'Remove rows with missing values',
            preview: [],
            confidence: 0.8
          };
        }

        issues.push({
          id: `missing_${header}`,
          type: 'missing_values',
          severity: percentage > 30 ? 'critical' : percentage > 15 ? 'high' : percentage > 5 ? 'medium' : 'low',
          column: header,
          description: `${missingCount} missing values in ${header} (${percentage.toFixed(1)}% of data)`,
          affectedRows: missingCount,
          affectedPercentage: percentage,
          examples: values.filter((val, idx) => (val === null || val === undefined || val === '') && idx < 5),
          suggestedFix,
          autoFixable: suggestedFix.confidence >= this.MIN_CONFIDENCE_FOR_AUTO_FIX
        });
      }
    });

    return issues;
  }

  /**
   * Detect duplicate rows
   */
  private static detectDuplicates(data: Record<string, any>[], headers: string[]): DataQualityIssue[] {
    const issues: DataQualityIssue[] = [];
    const seenRows = new Map<string, number>();
    const duplicateGroups: Array<{ key: string; indices: number[]; count: number }> = [];

    // Find exact duplicates
    data.forEach((row, index) => {
      const rowKey = JSON.stringify(row);
      if (seenRows.has(rowKey)) {
        const firstIndex = seenRows.get(rowKey)!;
        let group = duplicateGroups.find(g => g.key === rowKey);
        if (!group) {
          group = { key: rowKey, indices: [firstIndex], count: 1 };
          duplicateGroups.push(group);
        }
        group.indices.push(index);
        group.count++;
      } else {
        seenRows.set(rowKey, index);
      }
    });

    if (duplicateGroups.length > 0) {
      const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + group.count - 1, 0);
      const percentage = (totalDuplicates / data.length) * 100;

      issues.push({
        id: 'duplicates_exact',
        type: 'duplicates',
        severity: percentage > 10 ? 'high' : percentage > 5 ? 'medium' : 'low',
        column: 'All columns',
        description: `${totalDuplicates} exact duplicate rows found (${percentage.toFixed(1)}% of data)`,
        affectedRows: totalDuplicates,
        affectedPercentage: percentage,
        examples: duplicateGroups.slice(0, 3).map(group => 
          JSON.parse(group.key)
        ),
        suggestedFix: {
          method: 'remove_duplicates',
          description: 'Remove duplicate rows, keeping the first occurrence',
          preview: duplicateGroups.slice(0, 3).map(group => ({
            action: 'remove',
            row: JSON.parse(group.key),
            duplicateCount: group.count - 1
          })),
          confidence: 0.95
        },
        autoFixable: true
      });
    }

    return issues;
  }

  /**
   * Detect inconsistent formats
   */
  private static detectInconsistentFormats(
    data: Record<string, any>[],
    headers: string[],
    columns: any[]
  ): DataQualityIssue[] {
    const issues: DataQualityIssue[] = [];

    headers.forEach(header => {
      const column = columns.find(col => col.name === header);
      const values = data.map(row => row[header]).filter(val => val != null && val !== '');

      if (column?.type === 'date' || header.toLowerCase().includes('date')) {
        const dateFormats = this.detectDateFormats(values);
        if (dateFormats.length > 1) {
          const inconsistentCount = values.length - dateFormats[0].count;
          const percentage = (inconsistentCount / values.length) * 100;

          issues.push({
            id: `format_${header}_date`,
            type: 'inconsistent_format',
            severity: percentage > 20 ? 'high' : 'medium',
            column: header,
            description: `Multiple date formats detected in ${header}`,
            affectedRows: inconsistentCount,
            affectedPercentage: percentage,
            examples: dateFormats.slice(0, 3).map(format => ({
              format: format.pattern,
              example: format.examples[0],
              count: format.count
            })),
            suggestedFix: {
              method: 'standardize_date_format',
              description: `Convert all dates to ${dateFormats[0].pattern} format`,
              preview: values.slice(0, 3).map(val => ({
                original: val,
                standardized: this.standardizeDate(val, dateFormats[0].pattern)
              })),
              confidence: 0.8
            },
            autoFixable: true
          });
        }
      }

      if (column?.type === 'number') {
        const numberFormats = this.detectNumberFormats(values);
        if (numberFormats.inconsistencies > 0) {
          const percentage = (numberFormats.inconsistencies / values.length) * 100;

          issues.push({
            id: `format_${header}_number`,
            type: 'inconsistent_format',
            severity: percentage > 15 ? 'medium' : 'low',
            column: header,
            description: `Inconsistent number formats in ${header}`,
            affectedRows: numberFormats.inconsistencies,
            affectedPercentage: percentage,
            examples: numberFormats.examples,
            suggestedFix: {
              method: 'standardize_numbers',
              description: 'Convert all numbers to consistent decimal format',
              preview: numberFormats.examples.slice(0, 3).map(example => ({
                original: example,
                standardized: this.standardizeNumber(example)
              })),
              confidence: 0.85
            },
            autoFixable: true
          });
        }
      }
    });

    return issues;
  }

  /**
   * Detect outliers using statistical methods
   */
  private static detectOutliers(
    data: Record<string, any>[],
    headers: string[],
    columns: any[]
  ): DataQualityIssue[] {
    const issues: DataQualityIssue[] = [];

    headers.forEach(header => {
      const column = columns.find(col => col.name === header);
      if (column?.type !== 'number') return;

      const values = data.map(row => Number(row[header])).filter(val => !isNaN(val));
      if (values.length < 10) return; // Need sufficient data for outlier detection

      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const std = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
      
      // Z-score method for outlier detection
      const outliers = data
        .map((row, index) => ({ row, index, value: Number(row[header]) }))
        .filter(item => !isNaN(item.value) && Math.abs(item.value - mean) > this.OUTLIER_THRESHOLD * std);

      if (outliers.length > 0) {
        const percentage = (outliers.length / data.length) * 100;

        issues.push({
          id: `outliers_${header}`,
          type: 'outliers',
          severity: percentage > 10 ? 'medium' : 'low',
          column: header,
          description: `${outliers.length} statistical outliers detected in ${header}`,
          affectedRows: outliers.length,
          affectedPercentage: percentage,
          examples: outliers.slice(0, 5).map(item => ({
            value: item.value,
            zScore: ((item.value - mean) / std).toFixed(2),
            rowIndex: item.index
          })),
          suggestedFix: {
            method: percentage > 5 ? 'cap_outliers' : 'flag_for_review',
            description: percentage > 5 
              ? `Cap extreme values to ${(mean + 2 * std).toFixed(2)} / ${(mean - 2 * std).toFixed(2)}`
              : 'Flag outliers for manual review',
            preview: outliers.slice(0, 3).map(item => ({
              original: item.value,
              suggested: percentage > 5 
                ? Math.min(Math.max(item.value, mean - 2 * std), mean + 2 * std).toFixed(2)
                : '[FLAGGED]'
            })),
            confidence: percentage > 5 ? 0.7 : 0.9
          },
          autoFixable: false // Outliers should typically be reviewed manually
        });
      }
    });

    return issues;
  }

  /**
   * Detect invalid data based on expected patterns
   */
  private static detectInvalidData(
    data: Record<string, any>[],
    headers: string[],
    columns: any[]
  ): DataQualityIssue[] {
    const issues: DataQualityIssue[] = [];

    headers.forEach(header => {
      const column = columns.find(col => col.name === header);
      const values = data.map(row => row[header]).filter(val => val != null && val !== '');
      
      let invalidValues: Array<{ value: any; reason: string; rowIndex: number }> = [];

      // Check for invalid emails
      if (header.toLowerCase().includes('email')) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        invalidValues = data
          .map((row, index) => ({ value: row[header], rowIndex: index }))
          .filter(item => item.value && !emailRegex.test(item.value))
          .map(item => ({ ...item, reason: 'Invalid email format' }));
      }

      // Check for invalid phone numbers
      if (header.toLowerCase().includes('phone')) {
        const phoneRegex = /^[\+]?[\s\-\(\)]*[0-9][\s\-\(\)0-9]{8,}$/;
        invalidValues = data
          .map((row, index) => ({ value: row[header], rowIndex: index }))
          .filter(item => item.value && !phoneRegex.test(item.value))
          .map(item => ({ ...item, reason: 'Invalid phone format' }));
      }

      // Check for negative values in columns that shouldn't have them
      if (column?.type === 'number' && (
        header.toLowerCase().includes('price') ||
        header.toLowerCase().includes('cost') ||
        header.toLowerCase().includes('amount') ||
        header.toLowerCase().includes('quantity')
      )) {
        invalidValues = data
          .map((row, index) => ({ value: Number(row[header]), rowIndex: index }))
          .filter(item => !isNaN(item.value) && item.value < 0)
          .map(item => ({ ...item, reason: 'Negative value in price/quantity field' }));
      }

      if (invalidValues.length > 0) {
        const percentage = (invalidValues.length / data.length) * 100;

        issues.push({
          id: `invalid_${header}`,
          type: 'invalid_data',
          severity: percentage > 10 ? 'high' : percentage > 5 ? 'medium' : 'low',
          column: header,
          description: `${invalidValues.length} invalid values detected in ${header}`,
          affectedRows: invalidValues.length,
          affectedPercentage: percentage,
          examples: invalidValues.slice(0, 5),
          suggestedFix: {
            method: 'flag_for_review',
            description: 'Flag invalid values for manual correction',
            preview: invalidValues.slice(0, 3).map(item => ({
              original: item.value,
              issue: item.reason,
              action: 'FLAG_FOR_REVIEW'
            })),
            confidence: 0.95
          },
          autoFixable: false
        });
      }
    });

    return issues;
  }

  /**
   * Detect encoding issues
   */
  private static detectEncodingIssues(data: Record<string, any>[], headers: string[]): DataQualityIssue[] {
    const issues: DataQualityIssue[] = [];

    headers.forEach(header => {
      const values = data.map(row => String(row[header])).filter(val => val !== 'null' && val !== 'undefined');
      const encodingIssues = values.filter(val => 
        /�/.test(val) || // Replacement character
        /[^\x00-\x7F]/.test(val) && !/^[\w\s\-\.@]+$/.test(val) // Non-ASCII characters that look suspicious
      );

      if (encodingIssues.length > 0) {
        const percentage = (encodingIssues.length / values.length) * 100;

        issues.push({
          id: `encoding_${header}`,
          type: 'encoding_issues',
          severity: percentage > 5 ? 'medium' : 'low',
          column: header,
          description: `${encodingIssues.length} potential encoding issues in ${header}`,
          affectedRows: encodingIssues.length,
          affectedPercentage: percentage,
          examples: encodingIssues.slice(0, 5),
          suggestedFix: {
            method: 'flag_for_review',
            description: 'Flag potentially corrupted text for manual review',
            preview: encodingIssues.slice(0, 3).map(val => ({
              original: val,
              action: 'MANUAL_REVIEW_NEEDED'
            })),
            confidence: 0.8
          },
          autoFixable: false
        });
      }
    });

    return issues;
  }

  /**
   * Generate cleaning recommendations based on detected issues
   */
  private static generateCleaningRecommendations(issues: DataQualityIssue[]): CleaningRecommendation[] {
    const recommendations: CleaningRecommendation[] = [];

    // Group issues by severity and type
    const criticalIssues = issues.filter(issue => issue.severity === 'critical');
    const highIssues = issues.filter(issue => issue.severity === 'high');
    const autoFixableIssues = issues.filter(issue => issue.autoFixable);

    if (criticalIssues.length > 0) {
      recommendations.push({
        id: 'critical_fixes',
        title: 'Critical Data Quality Issues',
        description: 'Address these critical issues that significantly impact data reliability',
        impact: 'High - Essential for accurate analysis',
        fixes: criticalIssues,
        estimatedImprovement: 40,
        complexity: 'simple'
      });
    }

    if (autoFixableIssues.length > 0) {
      recommendations.push({
        id: 'auto_fixes',
        title: 'Automated Quick Fixes',
        description: 'Apply these AI-suggested fixes automatically with high confidence',
        impact: 'Medium - Improves data consistency with minimal risk',
        fixes: autoFixableIssues,
        estimatedImprovement: 25,
        complexity: 'simple'
      });
    }

    if (highIssues.length > 0) {
      recommendations.push({
        id: 'high_priority',
        title: 'High Priority Manual Review',
        description: 'These issues require manual review but have significant impact',
        impact: 'Medium - Important for data quality assurance',
        fixes: highIssues,
        estimatedImprovement: 30,
        complexity: 'moderate'
      });
    }

    return recommendations;
  }

  /**
   * Apply a specific fix to the data
   */
  private static async applySpecificFix(
    data: Record<string, any>[],
    fix: { issueId: string; method: string; parameters?: any }
  ): Promise<{ data: Record<string, any>[]; rowsAffected: number }> {
    let modifiedData = [...data];
    let rowsAffected = 0;

    const [, column] = fix.issueId.split('_', 2);

    switch (fix.method) {
      case 'fill_with_median':
        const nonMissingValues = data
          .map(row => Number(row[column]))
          .filter(val => !isNaN(val))
          .sort((a, b) => a - b);
        const median = nonMissingValues[Math.floor(nonMissingValues.length / 2)];
        
        modifiedData = modifiedData.map(row => {
          if (row[column] === null || row[column] === undefined || row[column] === '') {
            rowsAffected++;
            return { ...row, [column]: median };
          }
          return row;
        });
        break;

      case 'fill_with_mean':
        const values = data
          .map(row => Number(row[column]))
          .filter(val => !isNaN(val));
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        
        modifiedData = modifiedData.map(row => {
          if (row[column] === null || row[column] === undefined || row[column] === '') {
            rowsAffected++;
            return { ...row, [column]: mean };
          }
          return row;
        });
        break;

      case 'remove_duplicates':
        const seen = new Set<string>();
        modifiedData = modifiedData.filter(row => {
          const key = JSON.stringify(row);
          if (seen.has(key)) {
            rowsAffected++;
            return false;
          }
          seen.add(key);
          return true;
        });
        break;

      case 'remove_rows':
        modifiedData = modifiedData.filter(row => {
          const shouldRemove = row[column] === null || row[column] === undefined || row[column] === '';
          if (shouldRemove) rowsAffected++;
          return !shouldRemove;
        });
        break;

      default:
        console.warn(`Unknown fix method: ${fix.method}`);
    }

    return { data: modifiedData, rowsAffected };
  }

  /**
   * Helper methods
   */
  private static calculateQualityScore(data: Record<string, any>[], issues: DataQualityIssue[]): number {
    if (data.length === 0) return 0;
    
    const totalCells = data.length * Object.keys(data[0] || {}).length;
    const problemCells = issues.reduce((sum, issue) => sum + issue.affectedRows, 0);
    
    return Math.round(((totalCells - problemCells) / totalCells) * 100);
  }

  private static calculateDataQualityScore(data: Record<string, any>[]): number {
    if (data.length === 0) return 0;
    
    const headers = Object.keys(data[0] || {});
    let totalCells = 0;
    let validCells = 0;

    data.forEach(row => {
      headers.forEach(header => {
        totalCells++;
        if (row[header] !== null && row[header] !== undefined && row[header] !== '') {
          validCells++;
        }
      });
    });

    return Math.round((validCells / totalCells) * 100);
  }

  private static getMostCommonValue(values: any[]): any {
    const counts = new Map<any, number>();
    values.forEach(val => {
      counts.set(val, (counts.get(val) || 0) + 1);
    });
    
    let maxCount = 0;
    let mostCommon = null;
    counts.forEach((count, value) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = value;
      }
    });
    
    return mostCommon;
  }

  private static detectDateFormats(values: any[]): Array<{
    pattern: string;
    count: number;
    examples: any[];
  }> {
    const patterns = [
      { regex: /^\d{4}-\d{2}-\d{2}$/, pattern: 'YYYY-MM-DD' },
      { regex: /^\d{2}\/\d{2}\/\d{4}$/, pattern: 'MM/DD/YYYY' },
      { regex: /^\d{2}-\d{2}-\d{4}$/, pattern: 'MM-DD-YYYY' },
      { regex: /^\d{1,2}\/\d{1,2}\/\d{4}$/, pattern: 'M/D/YYYY' }
    ];

    const formatCounts = patterns.map(pattern => ({
      pattern: pattern.pattern,
      count: 0,
      examples: [] as any[]
    }));

    values.forEach(value => {
      const str = String(value);
      patterns.forEach((pattern, index) => {
        if (pattern.regex.test(str)) {
          formatCounts[index].count++;
          if (formatCounts[index].examples.length < 3) {
            formatCounts[index].examples.push(value);
          }
        }
      });
    });

    return formatCounts.filter(format => format.count > 0);
  }

  private static detectNumberFormats(values: any[]): {
    inconsistencies: number;
    examples: any[];
  } {
    let inconsistencies = 0;
    const examples: any[] = [];

    values.forEach(value => {
      const str = String(value);
      // Check for inconsistent formatting (commas, spaces, currency symbols)
      if (/[,$£€¥]/.test(str) || /\s/.test(str)) {
        inconsistencies++;
        if (examples.length < 5) {
          examples.push(value);
        }
      }
    });

    return { inconsistencies, examples };
  }

  private static standardizeDate(value: any, targetFormat: string): string {
    // Simple date standardization - in production, use a proper date library
    const date = new Date(value);
    if (isNaN(date.getTime())) return String(value);
    
    switch (targetFormat) {
      case 'YYYY-MM-DD':
        return date.toISOString().split('T')[0];
      case 'MM/DD/YYYY':
        return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
      default:
        return String(value);
    }
  }

  private static standardizeNumber(value: any): string {
    const str = String(value);
    // Remove currency symbols and spaces, keep only numbers and decimal points
    const cleaned = str.replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? str : num.toString();
  }

  private static generateCleaningSummary(
    appliedFixes: CleaningResult['appliedFixes'],
    beforeScore: number,
    afterScore: number
  ): string {
    const improvement = afterScore - beforeScore;
    const fixCount = appliedFixes.length;
    const totalRowsAffected = appliedFixes.reduce((sum, fix) => sum + fix.rowsAffected, 0);

    return `Applied ${fixCount} data cleaning fixes affecting ${totalRowsAffected} rows. Data quality improved from ${beforeScore}% to ${afterScore}% (${improvement.toFixed(1)}% improvement). Your dataset is now more reliable for analysis and visualization.`;
  }
}

export default DataCleaningService;
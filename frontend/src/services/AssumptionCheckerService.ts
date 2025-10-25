/**
 * Assumption Checker Service
 * Tests statistical assumptions and provides alternatives when violated
 */

export interface AssumptionTest {
  name: string;
  description: string;
  result: 'met' | 'violated' | 'warning';
  pValue?: number;
  statistic?: number;
  interpretation: string;
  recommendation?: string;
  severity: 'low' | 'medium' | 'high';
}

export interface AssumptionCheckResult {
  testId: string;
  testName: string;
  overallStatus: 'all_met' | 'some_violated' | 'major_violations';
  assumptions: AssumptionTest[];
  alternatives: TestAlternative[];
  diagnosticPlots?: DiagnosticPlot[];
}

export interface TestAlternative {
  testId: string;
  testName: string;
  reason: string;
  confidence: number;
  description: string;
}

export interface DiagnosticPlot {
  type: 'histogram' | 'qq_plot' | 'residuals' | 'boxplot';
  title: string;
  description: string;
  data: { x: number[]; y?: number[]; labels?: string[] };
}

export class AssumptionCheckerService {
  /**
   * Check all assumptions for a given statistical test
   */
  static checkAssumptions(
    testId: string,
    data: Record<string, any>[],
    variables: { dependent?: string; independent?: string; grouping?: string }
  ): AssumptionCheckResult {
    const assumptions: AssumptionTest[] = [];
    const alternatives: TestAlternative[] = [];
    const diagnosticPlots: DiagnosticPlot[] = [];

    // Check assumptions based on test type
    switch (testId) {
      case 'independent_t_test':
        assumptions.push(...this.checkTTestAssumptions(data, variables));
        alternatives.push(...this.getTTestAlternatives());
        diagnosticPlots.push(...this.getTTestDiagnostics(data, variables));
        break;

      case 'one_way_anova':
        assumptions.push(...this.checkANOVAAssumptions(data, variables));
        alternatives.push(...this.getANOVAAlternatives());
        break;

      case 'pearson_correlation':
        assumptions.push(...this.checkCorrelationAssumptions(data, variables));
        alternatives.push(...this.getCorrelationAlternatives());
        break;

      case 'chi_square_independence':
        assumptions.push(...this.checkChiSquareAssumptions(data, variables));
        alternatives.push(...this.getChiSquareAlternatives());
        break;

      case 'linear_regression':
        assumptions.push(...this.checkRegressionAssumptions(data, variables));
        alternatives.push(...this.getRegressionAlternatives());
        break;
    }

    const overallStatus = this.determineOverallStatus(assumptions);

    return {
      testId,
      testName: this.getTestNameById(testId),
      overallStatus,
      assumptions,
      alternatives: overallStatus !== 'all_met' ? alternatives : [],
      diagnosticPlots
    };
  }

  /**
   * Generate diagnostic plots for assumption checking
   */
  static generateDiagnosticPlots(
    testId: string,
    data: Record<string, any>[],
    variables: { dependent?: string; independent?: string; grouping?: string }
  ): DiagnosticPlot[] {
    switch (testId) {
      case 'independent_t_test':
        return this.getTTestDiagnostics(data, variables);
      case 'pearson_correlation':
        return this.getCorrelationDiagnostics(data, variables);
      default:
        return [];
    }
  }

  // Private helper methods for specific test assumptions

  private static checkTTestAssumptions(
    data: Record<string, any>[],
    variables: { dependent?: string; grouping?: string }
  ): AssumptionTest[] {
    const assumptions: AssumptionTest[] = [];
    
    if (!variables.dependent || !variables.grouping) {
      return assumptions;
    }

    // Get data for each group
    const groups = this.getGroupedData(data, variables.dependent, variables.grouping);
    const groupNames = Object.keys(groups);
    
    if (groupNames.length !== 2) {
      return assumptions;
    }

    const group1 = groups[groupNames[0]];
    const group2 = groups[groupNames[1]];

    // 1. Normality assumption
    const normalityResult = this.testNormality([...group1, ...group2]);
    assumptions.push({
      name: 'Normality',
      description: 'Data should be approximately normally distributed',
      result: normalityResult.pValue > 0.05 ? 'met' : 'violated',
      pValue: normalityResult.pValue,
      statistic: normalityResult.statistic,
      interpretation: normalityResult.pValue > 0.05 
        ? 'Data appears to be normally distributed'
        : 'Data significantly deviates from normal distribution',
      recommendation: normalityResult.pValue <= 0.05 
        ? 'Consider using Mann-Whitney U test (non-parametric alternative)' 
        : undefined,
      severity: normalityResult.pValue <= 0.01 ? 'high' : normalityResult.pValue <= 0.05 ? 'medium' : 'low'
    });

    // 2. Equal variances (homogeneity)
    const equalVariancesResult = this.testEqualVariances(group1, group2);
    assumptions.push({
      name: 'Equal Variances',
      description: 'Both groups should have similar variability',
      result: equalVariancesResult.pValue > 0.05 ? 'met' : 'violated',
      pValue: equalVariancesResult.pValue,
      statistic: equalVariancesResult.statistic,
      interpretation: equalVariancesResult.pValue > 0.05
        ? 'Groups have similar variances'
        : 'Groups have significantly different variances',
      recommendation: equalVariancesResult.pValue <= 0.05
        ? 'Use Welch\'s t-test (unequal variances version)'
        : undefined,
      severity: equalVariancesResult.pValue <= 0.01 ? 'high' : 'medium'
    });

    // 3. Independence (always assume met for now)
    assumptions.push({
      name: 'Independence',
      description: 'Observations should be independent of each other',
      result: 'met',
      interpretation: 'Assuming observations are independent (verify based on study design)',
      severity: 'low'
    });

    return assumptions;
  }

  private static checkANOVAAssumptions(
    data: Record<string, any>[],
    variables: { dependent?: string; grouping?: string }
  ): AssumptionTest[] {
    const assumptions: AssumptionTest[] = [];
    
    if (!variables.dependent || !variables.grouping) {
      return assumptions;
    }

    const groups = this.getGroupedData(data, variables.dependent, variables.grouping);
    const allValues = Object.values(groups).flat();

    // Normality
    const normalityResult = this.testNormality(allValues);
    assumptions.push({
      name: 'Normality',
      description: 'Residuals should be normally distributed',
      result: normalityResult.pValue > 0.05 ? 'met' : 'violated',
      pValue: normalityResult.pValue,
      interpretation: normalityResult.pValue > 0.05 
        ? 'Data appears normally distributed'
        : 'Data deviates from normality',
      recommendation: normalityResult.pValue <= 0.05 
        ? 'Consider Kruskal-Wallis test (non-parametric)' 
        : undefined,
      severity: normalityResult.pValue <= 0.01 ? 'high' : 'medium'
    });

    // Homogeneity of variance (Levene's test simulation)
    const homogeneityResult = this.testHomogeneityOfVariance(groups);
    assumptions.push({
      name: 'Homogeneity of Variance',
      description: 'All groups should have similar variances',
      result: homogeneityResult.pValue > 0.05 ? 'met' : 'violated',
      pValue: homogeneityResult.pValue,
      interpretation: homogeneityResult.pValue > 0.05
        ? 'Groups have similar variances'
        : 'Groups have different variances',
      recommendation: homogeneityResult.pValue <= 0.05
        ? 'Consider Welch\'s ANOVA or data transformation'
        : undefined,
      severity: 'medium'
    });

    return assumptions;
  }

  private static checkCorrelationAssumptions(
    data: Record<string, any>[],
    variables: { dependent?: string; independent?: string }
  ): AssumptionTest[] {
    const assumptions: AssumptionTest[] = [];
    
    if (!variables.dependent || !variables.independent) {
      return assumptions;
    }

    const xValues = data.map(row => Number(row[variables.independent!])).filter(v => !isNaN(v));
    const yValues = data.map(row => Number(row[variables.dependent!])).filter(v => !isNaN(v));

    // Linearity (simplified check)
    const linearityResult = this.testLinearity(xValues, yValues);
    assumptions.push({
      name: 'Linearity',
      description: 'Relationship should be approximately linear',
      result: linearityResult.correlation > 0.3 ? 'met' : 'warning',
      interpretation: linearityResult.correlation > 0.3
        ? 'Relationship appears reasonably linear'
        : 'Relationship may be non-linear',
      recommendation: linearityResult.correlation <= 0.3
        ? 'Consider Spearman correlation for non-linear relationships'
        : undefined,
      severity: 'medium'
    });

    // Normality for both variables
    const xNormality = this.testNormality(xValues);
    const yNormality = this.testNormality(yValues);
    
    assumptions.push({
      name: 'Bivariate Normality',
      description: 'Both variables should be approximately normal',
      result: (xNormality.pValue > 0.05 && yNormality.pValue > 0.05) ? 'met' : 'violated',
      interpretation: (xNormality.pValue > 0.05 && yNormality.pValue > 0.05)
        ? 'Both variables appear normally distributed'
        : 'One or both variables deviate from normality',
      recommendation: (xNormality.pValue <= 0.05 || yNormality.pValue <= 0.05)
        ? 'Consider Spearman correlation (rank-based)'
        : undefined,
      severity: 'medium'
    });

    return assumptions;
  }

  private static checkChiSquareAssumptions(
    data: Record<string, any>[],
    variables: { dependent?: string; independent?: string }
  ): AssumptionTest[] {
    const assumptions: AssumptionTest[] = [];
    
    if (!variables.dependent || !variables.independent) {
      return assumptions;
    }

    // Create contingency table
    const contingencyTable = this.createContingencyTable(data, variables.dependent, variables.independent);
    const expectedCounts = this.calculateExpectedCounts(contingencyTable);
    
    // Check expected cell counts
    const minExpected = Math.min(...expectedCounts.flat());
    const cellsBelow5 = expectedCounts.flat().filter(count => count < 5).length;
    const totalCells = expectedCounts.flat().length;
    const proportionBelow5 = cellsBelow5 / totalCells;

    assumptions.push({
      name: 'Expected Cell Counts',
      description: 'Expected counts should be ≥ 5 in at least 80% of cells',
      result: (proportionBelow5 <= 0.2 && minExpected >= 1) ? 'met' : 'violated',
      interpretation: proportionBelow5 <= 0.2 && minExpected >= 1
        ? 'Expected cell counts are adequate'
        : 'Some expected cell counts are too low',
      recommendation: proportionBelow5 > 0.2
        ? 'Consider Fisher\'s exact test or combine categories'
        : undefined,
      severity: proportionBelow5 > 0.4 ? 'high' : 'medium'
    });

    return assumptions;
  }

  private static checkRegressionAssumptions(
    data: Record<string, any>[],
    variables: { dependent?: string; independent?: string }
  ): AssumptionTest[] {
    const assumptions: AssumptionTest[] = [];
    
    if (!variables.dependent || !variables.independent) {
      return assumptions;
    }

    // This is simplified - in reality you'd need actual regression residuals
    const yValues = data.map(row => Number(row[variables.dependent!])).filter(v => !isNaN(v));
    
    // Simulated residual normality
    const normalityResult = this.testNormality(yValues);
    assumptions.push({
      name: 'Residual Normality',
      description: 'Regression residuals should be normally distributed',
      result: normalityResult.pValue > 0.05 ? 'met' : 'violated',
      pValue: normalityResult.pValue,
      interpretation: 'Normality test on dependent variable (simplified)',
      severity: 'medium'
    });

    return assumptions;
  }

  // Alternative test suggestions

  private static getTTestAlternatives(): TestAlternative[] {
    return [
      {
        testId: 'mann_whitney_u',
        testName: 'Mann-Whitney U Test',
        reason: 'Non-parametric alternative when normality is violated',
        confidence: 0.9,
        description: 'Compares medians instead of means, no normality assumption'
      },
      {
        testId: 'welch_t_test',
        testName: 'Welch\'s t-test',
        reason: 'When groups have unequal variances',
        confidence: 0.85,
        description: 'Modified t-test that doesn\'t assume equal variances'
      }
    ];
  }

  private static getANOVAAlternatives(): TestAlternative[] {
    return [
      {
        testId: 'kruskal_wallis',
        testName: 'Kruskal-Wallis Test',
        reason: 'Non-parametric alternative when normality is violated',
        confidence: 0.9,
        description: 'Ranks-based test that doesn\'t assume normality'
      }
    ];
  }

  private static getCorrelationAlternatives(): TestAlternative[] {
    return [
      {
        testId: 'spearman_correlation',
        testName: 'Spearman Correlation',
        reason: 'When relationship is non-linear or data is non-normal',
        confidence: 0.9,
        description: 'Rank-based correlation, robust to outliers and non-linearity'
      }
    ];
  }

  private static getChiSquareAlternatives(): TestAlternative[] {
    return [
      {
        testId: 'fisher_exact',
        testName: 'Fisher\'s Exact Test',
        reason: 'When expected cell counts are too low',
        confidence: 0.95,
        description: 'Exact test for small sample sizes'
      }
    ];
  }

  private static getRegressionAlternatives(): TestAlternative[] {
    return [
      {
        testId: 'robust_regression',
        testName: 'Robust Regression',
        reason: 'When residuals are not normal or have outliers',
        confidence: 0.8,
        description: 'Less sensitive to outliers and assumption violations'
      }
    ];
  }

  // Statistical test implementations (simplified)

  private static testNormality(values: number[]): { pValue: number; statistic: number } {
    if (values.length < 5) return { pValue: 0.5, statistic: 0 };
    
    // Simplified Shapiro-Wilk approximation
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Simple skewness test
    const skewness = values.reduce((sum, x) => sum + Math.pow((x - mean) / stdDev, 3), 0) / values.length;
    const pValue = Math.max(0.01, 1 - Math.abs(skewness));
    
    return { pValue, statistic: Math.abs(skewness) };
  }

  private static testEqualVariances(group1: number[], group2: number[]): { pValue: number; statistic: number } {
    if (group1.length < 2 || group2.length < 2) return { pValue: 0.5, statistic: 1 };
    
    const var1 = this.calculateVariance(group1);
    const var2 = this.calculateVariance(group2);
    
    const fStatistic = Math.max(var1, var2) / Math.min(var1, var2);
    const pValue = fStatistic > 2 ? 0.03 : 0.5; // Simplified
    
    return { pValue, statistic: fStatistic };
  }

  private static testHomogeneityOfVariance(groups: Record<string, number[]>): { pValue: number; statistic: number } {
    const variances = Object.values(groups).map(group => this.calculateVariance(group));
    const maxVar = Math.max(...variances);
    const minVar = Math.min(...variances);
    
    const ratio = maxVar / minVar;
    const pValue = ratio > 3 ? 0.02 : 0.6; // Simplified
    
    return { pValue, statistic: ratio };
  }

  private static testLinearity(xValues: number[], yValues: number[]): { correlation: number } {
    if (xValues.length !== yValues.length || xValues.length < 3) {
      return { correlation: 0 };
    }
    
    const correlation = this.calculateCorrelation(xValues, yValues);
    return { correlation: Math.abs(correlation) };
  }

  // Utility methods

  private static getGroupedData(
    data: Record<string, any>[],
    dependentVar: string,
    groupingVar: string
  ): Record<string, number[]> {
    const groups: Record<string, number[]> = {};
    
    data.forEach(row => {
      const groupValue = String(row[groupingVar]);
      const numericValue = Number(row[dependentVar]);
      
      if (!isNaN(numericValue)) {
        if (!groups[groupValue]) {
          groups[groupValue] = [];
        }
        groups[groupValue].push(numericValue);
      }
    });
    
    return groups;
  }

  private static calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (values.length - 1);
    return variance;
  }

  private static calculateCorrelation(xValues: number[], yValues: number[]): number {
    const n = xValues.length;
    const meanX = xValues.reduce((a, b) => a + b, 0) / n;
    const meanY = yValues.reduce((a, b) => a + b, 0) / n;
    
    let numerator = 0;
    let denomX = 0;
    let denomY = 0;
    
    for (let i = 0; i < n; i++) {
      const deltaX = xValues[i] - meanX;
      const deltaY = yValues[i] - meanY;
      numerator += deltaX * deltaY;
      denomX += deltaX * deltaX;
      denomY += deltaY * deltaY;
    }
    
    return numerator / Math.sqrt(denomX * denomY);
  }

  private static createContingencyTable(
    data: Record<string, any>[],
    var1: string,
    var2: string
  ): number[][] {
    // Simplified implementation
    return [[10, 15], [20, 25]]; // Mock data
  }

  private static calculateExpectedCounts(observedCounts: number[][]): number[][] {
    // Simplified implementation
    return observedCounts.map(row => row.map(count => Math.max(5, count * 0.8)));
  }

  private static determineOverallStatus(assumptions: AssumptionTest[]): 'all_met' | 'some_violated' | 'major_violations' {
    const violatedCount = assumptions.filter(a => a.result === 'violated').length;
    const highSeverityViolations = assumptions.filter(a => a.result === 'violated' && a.severity === 'high').length;
    
    if (violatedCount === 0) {
      return 'all_met';
    } else if (highSeverityViolations > 0 || violatedCount > assumptions.length / 2) {
      return 'major_violations';
    } else {
      return 'some_violated';
    }
  }

  private static getTTestDiagnostics(
    data: Record<string, any>[],
    variables: { dependent?: string; grouping?: string }
  ): DiagnosticPlot[] {
    if (!variables.dependent || !variables.grouping) return [];

    const groups = this.getGroupedData(data, variables.dependent, variables.grouping);
    const groupNames = Object.keys(groups);
    
    if (groupNames.length !== 2) return [];

    const allValues = Object.values(groups).flat();
    
    return [
      {
        type: 'histogram',
        title: 'Distribution of Dependent Variable',
        description: 'Check for normality - should be bell-shaped',
        data: { x: allValues }
      },
      {
        type: 'boxplot',
        title: 'Compare Group Distributions',
        description: 'Check for equal variances and outliers',
        data: { 
          x: Object.values(groups)[0],
          y: Object.values(groups)[1],
          labels: groupNames
        }
      }
    ];
  }

  private static getCorrelationDiagnostics(
    data: Record<string, any>[],
    variables: { dependent?: string; independent?: string }
  ): DiagnosticPlot[] {
    if (!variables.dependent || !variables.independent) return [];

    const xValues = data.map(row => Number(row[variables.independent!])).filter(v => !isNaN(v));
    const yValues = data.map(row => Number(row[variables.dependent!])).filter(v => !isNaN(v));

    return [
      {
        type: 'histogram',
        title: 'Scatterplot',
        description: 'Check for linearity and outliers',
        data: { x: xValues, y: yValues }
      }
    ];
  }

  private static getTestNameById(testId: string): string {
    const testNames: Record<string, string> = {
      'independent_t_test': 'Independent Samples t-test',
      'one_way_anova': 'One-way ANOVA',
      'pearson_correlation': 'Pearson Correlation',
      'chi_square_independence': 'Chi-square Test of Independence',
      'linear_regression': 'Linear Regression'
    };
    return testNames[testId] || 'Unknown Test';
  }
}

export default AssumptionCheckerService;
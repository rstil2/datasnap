/**
 * Statistical Test Service
 * AI-powered statistical test selection and recommendation engine
 */

export interface TestRecommendation {
  id: string;
  testName: string;
  testType: 'comparison' | 'association' | 'regression' | 'descriptive';
  description: string;
  whenToUse: string;
  assumptions: string[];
  dataRequirements: {
    minSampleSize: number;
    variableTypes: string[];
    groupCount?: number;
  };
  confidence: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  interpretation: string;
}

export interface DataCharacteristics {
  variableCount: number;
  sampleSize: number;
  variables: VariableAnalysis[];
  hasGroups: boolean;
  groupCount?: number;
  dataQuality: number;
}

export interface VariableAnalysis {
  name: string;
  type: 'numeric' | 'categorical' | 'ordinal' | 'binary';
  distribution: 'normal' | 'skewed' | 'uniform' | 'unknown';
  missingCount: number;
  uniqueValues: number;
  outlierCount: number;
  range?: { min: number; max: number };
  categories?: string[];
}

export interface TestResult {
  testName: string;
  statistic: number;
  pValue: number;
  effect: {
    size: number;
    interpretation: 'negligible' | 'small' | 'medium' | 'large';
  };
  confidence: {
    level: number;
    interval?: [number, number];
  };
  interpretation: {
    statistical: string;
    practical: string;
    recommendation: string;
  };
  assumptions: {
    name: string;
    met: boolean;
    pValue?: number;
    recommendation?: string;
  }[];
}

export class StatisticalTestService {
  /**
   * Analyze data characteristics to understand what tests are possible
   */
  static analyzeData(data: Record<string, any>[], headers: string[]): DataCharacteristics {
    const variables: VariableAnalysis[] = [];
    
    headers.forEach(header => {
      const values = data.map(row => row[header]).filter(val => val != null && val !== '');
      const analysis = this.analyzeVariable(header, values);
      variables.push(analysis);
    });

    const sampleSize = data.length;
    const numericVariables = variables.filter(v => v.type === 'numeric').length;
    const categoricalVariables = variables.filter(v => v.type === 'categorical' || v.type === 'binary').length;
    
    // Detect if data has natural grouping structure
    const potentialGroupingVars = variables.filter(v => 
      (v.type === 'categorical' || v.type === 'binary') && v.uniqueValues <= 10 && v.uniqueValues >= 2
    );
    
    const hasGroups = potentialGroupingVars.length > 0;
    const groupCount = hasGroups ? Math.min(...potentialGroupingVars.map(v => v.uniqueValues)) : undefined;

    return {
      variableCount: variables.length,
      sampleSize,
      variables,
      hasGroups,
      groupCount,
      dataQuality: this.calculateDataQuality(variables, sampleSize)
    };
  }

  /**
   * Recommend statistical tests based on data characteristics and user intent
   */
  static recommendTests(
    characteristics: DataCharacteristics, 
    intent?: 'compare_groups' | 'find_relationships' | 'predict' | 'describe'
  ): TestRecommendation[] {
    const recommendations: TestRecommendation[] = [];

    // Based on data structure and intent, recommend appropriate tests
    if (intent === 'compare_groups' || characteristics.hasGroups) {
      recommendations.push(...this.getComparisonTests(characteristics));
    }

    if (intent === 'find_relationships' || characteristics.variables.filter(v => v.type === 'numeric').length >= 2) {
      recommendations.push(...this.getAssociationTests(characteristics));
    }

    if (intent === 'predict') {
      recommendations.push(...this.getRegressionTests(characteristics));
    }

    if (intent === 'describe' || recommendations.length === 0) {
      recommendations.push(...this.getDescriptiveTests(characteristics));
    }

    return recommendations
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // Top 5 recommendations
  }

  /**
   * Execute a statistical test (simulated - in real app would call statistical computing service)
   */
  static async executeTest(
    testId: string, 
    data: Record<string, any>[], 
    variables: { dependent?: string; independent?: string; grouping?: string }
  ): Promise<TestResult> {
    // This is a simulation - in a real implementation, you'd call actual statistical functions
    const testName = this.getTestNameById(testId);
    
    // Simulate test execution
    const result = this.simulateTestExecution(testId, data, variables);
    
    return result;
  }

  // Private helper methods

  private static analyzeVariable(name: string, values: any[]): VariableAnalysis {
    const nonNullValues = values.filter(v => v != null && v !== '');
    const uniqueValues = new Set(nonNullValues).size;
    
    // Determine variable type
    let type: VariableAnalysis['type'];
    const numericValues = nonNullValues.filter(v => !isNaN(Number(v)));
    const numericRatio = numericValues.length / nonNullValues.length;
    
    if (numericRatio > 0.8 && uniqueValues > 2) {
      // If most values are numeric and we have more than 2 unique values, treat as numeric
      type = 'numeric';
    } else if (uniqueValues === 2) {
      type = 'binary';
    } else if (uniqueValues <= 10) {
      type = 'categorical';
    } else if (uniqueValues <= 20) {
      type = 'ordinal';
    } else {
      type = 'categorical';
    }

    // Analyze distribution (simplified)
    let distribution: VariableAnalysis['distribution'] = 'unknown';
    if (type === 'numeric') {
      distribution = this.analyzeDistribution(numericValues.map(Number));
    }

    // Detect outliers (simplified IQR method)
    const outlierCount = type === 'numeric' ? this.detectOutliers(numericValues.map(Number)).length : 0;

    return {
      name,
      type,
      distribution,
      missingCount: values.length - nonNullValues.length,
      uniqueValues,
      outlierCount,
      range: type === 'numeric' ? {
        min: Math.min(...numericValues.map(Number)),
        max: Math.max(...numericValues.map(Number))
      } : undefined,
      categories: type === 'categorical' ? Array.from(new Set(nonNullValues.map(String))) : undefined
    };
  }

  private static analyzeDistribution(values: number[]): VariableAnalysis['distribution'] {
    if (values.length < 5) return 'unknown';
    
    // Simple normality check (Shapiro-Wilk would be better)
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const median = values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
    const skewness = Math.abs(mean - median);
    const range = Math.max(...values) - Math.min(...values);
    
    if (skewness / (range / 6) < 0.1) {
      return 'normal';
    } else {
      return 'skewed';
    }
  }

  private static detectOutliers(values: number[]): number[] {
    if (values.length < 4) return [];
    
    const sorted = values.sort((a, b) => a - b);
    const q1 = sorted[Math.floor(values.length * 0.25)];
    const q3 = sorted[Math.floor(values.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return values.filter(v => v < lowerBound || v > upperBound);
  }

  private static calculateDataQuality(variables: VariableAnalysis[], sampleSize: number): number {
    let qualityScore = 1.0;
    
    // Penalize for missing data
    const totalMissing = variables.reduce((sum, v) => sum + v.missingCount, 0);
    const missingRate = totalMissing / (variables.length * sampleSize);
    qualityScore -= missingRate * 0.3;
    
    // Penalize for outliers
    const totalOutliers = variables.reduce((sum, v) => sum + v.outlierCount, 0);
    const outlierRate = totalOutliers / sampleSize;
    qualityScore -= outlierRate * 0.2;
    
    // Reward for adequate sample size
    if (sampleSize < 30) {
      qualityScore -= 0.2;
    } else if (sampleSize > 100) {
      qualityScore += 0.1;
    }
    
    return Math.max(0, Math.min(1, qualityScore));
  }

  private static getComparisonTests(characteristics: DataCharacteristics): TestRecommendation[] {
    const tests: TestRecommendation[] = [];
    const numericVars = characteristics.variables.filter(v => v.type === 'numeric');
    const groupingVars = characteristics.variables.filter(v => v.type === 'categorical' || v.type === 'binary');
    
    if (numericVars.length > 0 && groupingVars.length > 0) {
      // Independent samples t-test
      if (characteristics.groupCount === 2) {
        tests.push({
          id: 'independent_t_test',
          testName: 'Independent Samples t-test',
          testType: 'comparison',
          description: 'Compare means between two independent groups',
          whenToUse: 'When you want to compare the average of a numeric variable between two groups',
          assumptions: ['Normal distribution', 'Equal variances', 'Independent observations'],
          dataRequirements: {
            minSampleSize: 30,
            variableTypes: ['numeric', 'categorical'],
            groupCount: 2
          },
          confidence: characteristics.sampleSize >= 30 ? 0.9 : 0.7,
          difficulty: 'beginner',
          interpretation: 'Tells you if the difference between group means is statistically significant'
        });
      }
      
      // One-way ANOVA
      if (characteristics.groupCount && characteristics.groupCount > 2) {
        tests.push({
          id: 'one_way_anova',
          testName: 'One-way ANOVA',
          testType: 'comparison',
          description: 'Compare means across multiple groups',
          whenToUse: 'When you want to compare the average of a numeric variable across 3 or more groups',
          assumptions: ['Normal distribution', 'Equal variances', 'Independent observations'],
          dataRequirements: {
            minSampleSize: 20,
            variableTypes: ['numeric', 'categorical'],
            groupCount: 3
          },
          confidence: characteristics.sampleSize >= 60 ? 0.85 : 0.65,
          difficulty: 'intermediate',
          interpretation: 'Tells you if there are significant differences between any of the group means'
        });
      }
    }
    
    return tests;
  }

  private static getAssociationTests(characteristics: DataCharacteristics): TestRecommendation[] {
    const tests: TestRecommendation[] = [];
    const numericVars = characteristics.variables.filter(v => v.type === 'numeric');
    const categoricalVars = characteristics.variables.filter(v => v.type === 'categorical');
    const binaryVars = characteristics.variables.filter(v => v.type === 'binary');
    
    // Pearson correlation
    if (numericVars.length >= 2) {
      tests.push({
        id: 'pearson_correlation',
        testName: 'Pearson Correlation',
        testType: 'association',
        description: 'Measure linear relationship between two numeric variables',
        whenToUse: 'When you want to know if two numeric variables are related and how strongly',
        assumptions: ['Linear relationship', 'Normal distribution', 'No extreme outliers'],
        dataRequirements: {
          minSampleSize: 20,
          variableTypes: ['numeric', 'numeric']
        },
        confidence: 0.9,
        difficulty: 'beginner',
        interpretation: 'Correlation coefficient ranges from -1 to 1, indicating strength and direction of relationship'
      });
    }
    
    // Chi-square test of independence
    if (categoricalVars.length >= 2 || (categoricalVars.length + binaryVars.length) >= 2) {
      tests.push({
        id: 'chi_square_independence',
        testName: 'Chi-square Test of Independence',
        testType: 'association',
        description: 'Test if two categorical variables are independent',
        whenToUse: 'When you want to know if two categorical variables are related',
        assumptions: ['Expected cell counts ≥ 5', 'Independent observations'],
        dataRequirements: {
          minSampleSize: 50,
          variableTypes: ['categorical', 'categorical']
        },
        confidence: characteristics.sampleSize >= 100 ? 0.85 : 0.7,
        difficulty: 'intermediate',
        interpretation: 'Determines if the distribution of one categorical variable depends on another'
      });
    }
    
    return tests;
  }

  private static getRegressionTests(characteristics: DataCharacteristics): TestRecommendation[] {
    const tests: TestRecommendation[] = [];
    const numericVars = characteristics.variables.filter(v => v.type === 'numeric');
    
    if (numericVars.length >= 2) {
      tests.push({
        id: 'linear_regression',
        testName: 'Linear Regression',
        testType: 'regression',
        description: 'Predict one numeric variable from another',
        whenToUse: 'When you want to predict or explain one variable using another',
        assumptions: ['Linear relationship', 'Independent errors', 'Homoscedasticity', 'Normal residuals'],
        dataRequirements: {
          minSampleSize: 30,
          variableTypes: ['numeric', 'numeric']
        },
        confidence: 0.8,
        difficulty: 'intermediate',
        interpretation: 'Shows how much change in the dependent variable is associated with the independent variable'
      });
    }
    
    return tests;
  }

  private static getDescriptiveTests(characteristics: DataCharacteristics): TestRecommendation[] {
    const tests: TestRecommendation[] = [];
    
    tests.push({
      id: 'descriptive_statistics',
      testName: 'Descriptive Statistics',
      testType: 'descriptive',
      description: 'Summarize and describe your data',
      whenToUse: 'When you want to understand the basic characteristics of your data',
      assumptions: ['None'],
      dataRequirements: {
        minSampleSize: 1,
        variableTypes: ['any']
      },
      confidence: 1.0,
      difficulty: 'beginner',
      interpretation: 'Provides measures of central tendency, variability, and distribution shape'
    });
    
    return tests;
  }

  private static getTestNameById(testId: string): string {
    const testNames: Record<string, string> = {
      'independent_t_test': 'Independent Samples t-test',
      'one_way_anova': 'One-way ANOVA',
      'pearson_correlation': 'Pearson Correlation',
      'chi_square_independence': 'Chi-square Test of Independence',
      'linear_regression': 'Linear Regression',
      'descriptive_statistics': 'Descriptive Statistics'
    };
    return testNames[testId] || 'Unknown Test';
  }

  private static simulateTestExecution(
    testId: string, 
    data: Record<string, any>[], 
    variables: { dependent?: string; independent?: string; grouping?: string }
  ): TestResult {
    // This is a simulation for demo purposes
    // In a real implementation, you'd use actual statistical libraries
    
    const testName = this.getTestNameById(testId);
    
    // Generate appropriate statistic based on test type
    let statistic: number;
    if (testId === 'pearson_correlation' || testId === 'spearman_correlation') {
      // Correlation coefficients should be between -1 and 1
      statistic = (Math.random() - 0.5) * 2; // Range: -1 to 1
    } else if (testId.includes('t_test')) {
      // t-statistics can be any real number, but typically small
      statistic = (Math.random() - 0.5) * 6; // Range: -3 to 3
    } else {
      // Default: positive statistics
      statistic = Math.random() * 10;
    }
    
    return {
      testName,
      statistic,
      pValue: Math.random(),
      effect: {
        size: Math.random(),
        interpretation: Math.random() > 0.5 ? 'medium' : 'small'
      },
      confidence: {
        level: 0.95,
        interval: [Math.random() * 10, Math.random() * 20]
      },
      interpretation: {
        statistical: 'The test statistic indicates a significant/non-significant result.',
        practical: 'This result suggests a meaningful/trivial effect in real-world terms.',
        recommendation: 'Consider collecting more data / The effect is large enough to be important.'
      },
      assumptions: [
        {
          name: 'Normality',
          met: Math.random() > 0.3,
          pValue: Math.random(),
          recommendation: Math.random() > 0.3 ? undefined : 'Consider using a non-parametric alternative'
        }
      ]
    };
  }
}

export default StatisticalTestService;
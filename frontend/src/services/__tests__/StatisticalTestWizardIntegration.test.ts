/**
 * Integration tests for Statistical Test Wizard
 */

import { StatisticalTestService } from '../StatisticalTestService';
import { AssumptionCheckerService } from '../AssumptionCheckerService';

describe('Statistical Test Wizard Integration', () => {
  const sampleData = [
    { 'Age': 25, 'Score': 85, 'Group': 'A', 'Pass': 'true' },
    { 'Age': 30, 'Score': 92, 'Group': 'B', 'Pass': 'true' },
    { 'Age': 35, 'Score': 78, 'Group': 'A', 'Pass': 'false' },
    { 'Age': 28, 'Score': 95, 'Group': 'B', 'Pass': 'true' },
    { 'Age': 22, 'Score': 88, 'Group': 'A', 'Pass': 'true' },
    { 'Age': 40, 'Score': 72, 'Group': 'B', 'Pass': 'false' },
    { 'Age': 27, 'Score': 90, 'Group': 'A', 'Pass': 'true' },
    { 'Age': 33, 'Score': 82, 'Group': 'B', 'Pass': 'false' }
  ];

  const headers = ['Age', 'Score', 'Group', 'Pass'];

  describe('End-to-end workflow', () => {
    it('should analyze data characteristics correctly', () => {
      const characteristics = StatisticalTestService.analyzeData(sampleData, headers);
      
      expect(characteristics.sampleSize).toBe(8);
      expect(characteristics.variableCount).toBe(4);
      expect(characteristics.hasGroups).toBe(true);
      // Group count should be the minimum unique values among categorical variables with 2-10 unique values
      // In our data: Group has 2 unique values (A, B), Pass has 2 unique values (true, false)
      // So groupCount should be 2 (minimum of 2, 2)
      expect(characteristics.groupCount).toBe(2);
      expect(characteristics.dataQuality).toBeGreaterThan(0.5);
      
      // Should identify numeric and categorical variables
      const numericVars = characteristics.variables.filter(v => v.type === 'numeric');
      const categoricalVars = characteristics.variables.filter(v => v.type === 'categorical' || v.type === 'binary');
      
      expect(numericVars.length).toBeGreaterThanOrEqual(2);
      expect(categoricalVars.length).toBeGreaterThanOrEqual(1);
    });

    it('should recommend appropriate tests for group comparison', () => {
      const characteristics = StatisticalTestService.analyzeData(sampleData, headers);
      const recommendations = StatisticalTestService.recommendTests(characteristics, 'compare_groups');
      
      expect(recommendations.length).toBeGreaterThan(0);
      
      // Should recommend t-test for 2 groups
      const tTestRecommendation = recommendations.find(r => r.id === 'independent_t_test');
      expect(tTestRecommendation).toBeDefined();
      expect(tTestRecommendation?.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should recommend appropriate tests for finding relationships', () => {
      const characteristics = StatisticalTestService.analyzeData(sampleData, headers);
      const recommendations = StatisticalTestService.recommendTests(characteristics, 'find_relationships');
      
      expect(recommendations.length).toBeGreaterThan(0);
      
      // Should recommend correlation for numeric variables
      const correlationRecommendation = recommendations.find(r => r.id === 'pearson_correlation');
      expect(correlationRecommendation).toBeDefined();
    });

    it('should check assumptions for t-test', () => {
      const testId = 'independent_t_test';
      const variables = { dependent: 'Score', grouping: 'Group' };
      
      const assumptionResults = AssumptionCheckerService.checkAssumptions(
        testId,
        sampleData,
        variables
      );
      
      expect(assumptionResults.testId).toBe(testId);
      expect(assumptionResults.assumptions.length).toBeGreaterThan(0);
      expect(assumptionResults.overallStatus).toBeDefined();
      
      // Should have normality, equal variances, and independence checks
      const normalityCheck = assumptionResults.assumptions.find(a => a.name === 'Normality');
      const varianceCheck = assumptionResults.assumptions.find(a => a.name === 'Equal Variances');
      const independenceCheck = assumptionResults.assumptions.find(a => a.name === 'Independence');
      
      expect(normalityCheck).toBeDefined();
      expect(varianceCheck).toBeDefined();
      expect(independenceCheck).toBeDefined();
    });

    it('should provide alternatives when assumptions are violated', () => {
      const testId = 'independent_t_test';
      const variables = { dependent: 'Score', grouping: 'Group' };
      
      const assumptionResults = AssumptionCheckerService.checkAssumptions(
        testId,
        sampleData,
        variables
      );
      
      if (assumptionResults.overallStatus !== 'all_met') {
        expect(assumptionResults.alternatives.length).toBeGreaterThan(0);
        
        const mannWhitneyAlternative = assumptionResults.alternatives.find(
          a => a.testId === 'mann_whitney_u'
        );
        if (mannWhitneyAlternative) {
          expect(mannWhitneyAlternative.confidence).toBeGreaterThan(0.8);
        }
      }
    });

    it('should execute statistical tests and return results', async () => {
      const testId = 'independent_t_test';
      const variables = { dependent: 'Score', grouping: 'Group' };
      
      const result = await StatisticalTestService.executeTest(
        testId,
        sampleData,
        variables
      );
      
      expect(result.testName).toBe('Independent Samples t-test');
      expect(typeof result.statistic).toBe('number');
      expect(result.pValue).toBeGreaterThanOrEqual(0);
      expect(result.pValue).toBeLessThanOrEqual(1);
      expect(result.effect.size).toBeGreaterThanOrEqual(0);
      expect(result.effect.interpretation).toMatch(/small|medium|large|negligible/);
      
      // Should provide interpretations
      expect(result.interpretation.statistical).toBeDefined();
      expect(result.interpretation.practical).toBeDefined();
      expect(result.interpretation.recommendation).toBeDefined();
      
      // Should check assumptions
      expect(result.assumptions.length).toBeGreaterThan(0);
    });

    it('should handle correlation analysis workflow', async () => {
      const characteristics = StatisticalTestService.analyzeData(sampleData, headers);
      const recommendations = StatisticalTestService.recommendTests(characteristics, 'find_relationships');
      
      const correlationTest = recommendations.find(r => r.id === 'pearson_correlation');
      if (correlationTest) {
        const variables = { dependent: 'Score', independent: 'Age' };
        
        // Check assumptions
        const assumptions = AssumptionCheckerService.checkAssumptions(
          'pearson_correlation',
          sampleData,
          variables
        );
        
        expect(assumptions.assumptions.length).toBeGreaterThan(0);
        
        // Execute test
        const result = await StatisticalTestService.executeTest(
          'pearson_correlation',
          sampleData,
          variables
        );
        
        expect(result.testName).toBe('Pearson Correlation');
        expect(result.statistic).toBeGreaterThanOrEqual(-1);
        expect(result.statistic).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle empty datasets gracefully', () => {
      const characteristics = StatisticalTestService.analyzeData([], []);
      
      expect(characteristics.sampleSize).toBe(0);
      expect(characteristics.variableCount).toBe(0);
      expect(characteristics.variables).toEqual([]);
    });

    it('should handle single-column datasets', () => {
      const singleColumnData = [{ 'Value': 1 }, { 'Value': 2 }];
      const singleHeader = ['Value'];
      
      const characteristics = StatisticalTestService.analyzeData(singleColumnData, singleHeader);
      const recommendations = StatisticalTestService.recommendTests(characteristics, 'describe');
      
      expect(recommendations.length).toBeGreaterThan(0);
      
      // Should recommend descriptive statistics
      const descriptiveTest = recommendations.find(r => r.id === 'descriptive_statistics');
      expect(descriptiveTest).toBeDefined();
    });

    it('should handle datasets with missing values', () => {
      const dataWithMissing = [
        { 'A': 1, 'B': null },
        { 'A': 2, 'B': 5 },
        { 'A': null, 'B': 6 }
      ];
      
      const characteristics = StatisticalTestService.analyzeData(dataWithMissing, ['A', 'B']);
      
      expect(characteristics.variables.length).toBe(2);
      characteristics.variables.forEach(variable => {
        expect(variable.missingCount).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('User experience workflow', () => {
    it('should provide comprehensive test information', () => {
      const characteristics = StatisticalTestService.analyzeData(sampleData, headers);
      const recommendations = StatisticalTestService.recommendTests(characteristics, 'compare_groups');
      
      recommendations.forEach(recommendation => {
        // Should have all required information for UI
        expect(recommendation.testName).toBeDefined();
        expect(recommendation.description).toBeDefined();
        expect(recommendation.whenToUse).toBeDefined();
        expect(recommendation.assumptions).toBeDefined();
        expect(recommendation.dataRequirements).toBeDefined();
        expect(recommendation.difficulty).toMatch(/beginner|intermediate|advanced/);
        expect(recommendation.interpretation).toBeDefined();
      });
    });

    it('should provide clear assumption checking feedback', () => {
      const testId = 'independent_t_test';
      const variables = { dependent: 'Score', grouping: 'Group' };
      
      const assumptionResults = AssumptionCheckerService.checkAssumptions(
        testId,
        sampleData,
        variables
      );
      
      assumptionResults.assumptions.forEach(assumption => {
        // Should have clear user-facing information
        expect(assumption.name).toBeDefined();
        expect(assumption.description).toBeDefined();
        expect(assumption.interpretation).toBeDefined();
        expect(assumption.result).toMatch(/met|violated|warning/);
        expect(assumption.severity).toMatch(/low|medium|high/);
      });
    });

    it('should provide actionable recommendations', () => {
      const testId = 'independent_t_test';
      const variables = { dependent: 'Score', grouping: 'Group' };
      
      const assumptionResults = AssumptionCheckerService.checkAssumptions(
        testId,
        sampleData,
        variables
      );
      
      if (assumptionResults.alternatives.length > 0) {
        assumptionResults.alternatives.forEach(alternative => {
          expect(alternative.testName).toBeDefined();
          expect(alternative.reason).toBeDefined();
          expect(alternative.description).toBeDefined();
          expect(alternative.confidence).toBeGreaterThan(0);
        });
      }
    });
  });
});
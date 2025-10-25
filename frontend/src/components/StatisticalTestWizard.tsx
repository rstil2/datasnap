import React, { useState, useEffect } from 'react';
import { 
  StatisticalTestService, 
  type DataCharacteristics, 
  type TestRecommendation,
  type TestResult 
} from '../services/StatisticalTestService';
import { 
  AssumptionCheckerService, 
  type AssumptionCheckResult 
} from '../services/AssumptionCheckerService';
import './StatisticalTestWizard.css';

interface StatisticalTestWizardProps {
  data: Record<string, any>[];
  headers: string[];
  onTestComplete: (result: TestResult) => void;
}

type WizardStep = 'intent' | 'recommendations' | 'variables' | 'assumptions' | 'results';
type UserIntent = 'compare_groups' | 'find_relationships' | 'predict' | 'describe' | 'explore';

const StatisticalTestWizard: React.FC<StatisticalTestWizardProps> = ({
  data,
  headers,
  onTestComplete
}) => {
  // State management
  const [currentStep, setCurrentStep] = useState<WizardStep>('intent');
  const [userIntent, setUserIntent] = useState<UserIntent | null>(null);
  const [dataCharacteristics, setDataCharacteristics] = useState<DataCharacteristics | null>(null);
  const [recommendations, setRecommendations] = useState<TestRecommendation[]>([]);
  const [selectedTest, setSelectedTest] = useState<TestRecommendation | null>(null);
  const [selectedVariables, setSelectedVariables] = useState<{
    dependent?: string;
    independent?: string;
    grouping?: string;
  }>({});
  const [assumptionResults, setAssumptionResults] = useState<AssumptionCheckResult | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize data analysis
  useEffect(() => {
    if (data.length > 0 && headers.length > 0) {
      const characteristics = StatisticalTestService.analyzeData(data, headers);
      setDataCharacteristics(characteristics);
    }
  }, [data, headers]);

  // Handle user intent selection
  const handleIntentSelection = (intent: UserIntent) => {
    setUserIntent(intent);
    
    if (dataCharacteristics) {
      const recs = StatisticalTestService.recommendTests(dataCharacteristics, intent);
      setRecommendations(recs);
      setCurrentStep('recommendations');
    }
  };

  // Handle test selection
  const handleTestSelection = (test: TestRecommendation) => {
    setSelectedTest(test);
    setCurrentStep('variables');
  };

  // Handle variable selection
  const handleVariableSelection = (variables: typeof selectedVariables) => {
    setSelectedVariables(variables);
    setCurrentStep('assumptions');
    
    // Check assumptions
    if (selectedTest) {
      const assumptions = AssumptionCheckerService.checkAssumptions(
        selectedTest.id,
        data,
        variables
      );
      setAssumptionResults(assumptions);
    }
  };

  // Execute the test
  const handleRunTest = async () => {
    if (!selectedTest) return;
    
    setIsLoading(true);
    try {
      const result = await StatisticalTestService.executeTest(
        selectedTest.id,
        data,
        selectedVariables
      );
      setTestResult(result);
      setCurrentStep('results');
      onTestComplete(result);
    } catch (error) {
      console.error('Error running test:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset wizard
  const handleRestart = () => {
    setCurrentStep('intent');
    setUserIntent(null);
    setSelectedTest(null);
    setSelectedVariables({});
    setAssumptionResults(null);
    setTestResult(null);
  };

  // Render different steps
  const renderStep = () => {
    switch (currentStep) {
      case 'intent':
        return renderIntentStep();
      case 'recommendations':
        return renderRecommendationsStep();
      case 'variables':
        return renderVariablesStep();
      case 'assumptions':
        return renderAssumptionsStep();
      case 'results':
        return renderResultsStep();
      default:
        return null;
    }
  };

  const renderIntentStep = () => (
    <div className="wizard-step">
      <div className="step-header">
        <h2>What do you want to analyze?</h2>
        <p>Choose your analysis goal to get personalized test recommendations</p>
      </div>
      
      <div className="intent-options">
        <div 
          className="intent-card"
          onClick={() => handleIntentSelection('compare_groups')}
        >
          <div className="intent-icon">📊</div>
          <h3>Compare Groups</h3>
          <p>Compare averages or distributions between different groups</p>
          <div className="intent-examples">
            <span>Examples: t-test, ANOVA</span>
          </div>
        </div>

        <div 
          className="intent-card"
          onClick={() => handleIntentSelection('find_relationships')}
        >
          <div className="intent-icon">🔗</div>
          <h3>Find Relationships</h3>
          <p>Discover how variables are related or associated</p>
          <div className="intent-examples">
            <span>Examples: correlation, chi-square</span>
          </div>
        </div>

        <div 
          className="intent-card"
          onClick={() => handleIntentSelection('predict')}
        >
          <div className="intent-icon">🎯</div>
          <h3>Make Predictions</h3>
          <p>Use one variable to predict or explain another</p>
          <div className="intent-examples">
            <span>Examples: regression, forecasting</span>
          </div>
        </div>

        <div 
          className="intent-card"
          onClick={() => handleIntentSelection('describe')}
        >
          <div className="intent-icon">📋</div>
          <h3>Describe Data</h3>
          <p>Summarize and understand your data characteristics</p>
          <div className="intent-examples">
            <span>Examples: descriptive statistics</span>
          </div>
        </div>
      </div>

      {dataCharacteristics && (
        <div className="data-summary">
          <h4>Your Data Overview:</h4>
          <div className="data-stats">
            <span>{dataCharacteristics.sampleSize} rows</span>
            <span>{dataCharacteristics.variableCount} variables</span>
            <span>Quality: {Math.round(dataCharacteristics.dataQuality * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  );

  const renderRecommendationsStep = () => (
    <div className="wizard-step">
      <div className="step-header">
        <h2>Recommended Statistical Tests</h2>
        <p>Based on your data and analysis goal, here are the best options</p>
      </div>

      <div className="recommendations-list">
        {recommendations.map((test) => (
          <div 
            key={test.id}
            className="recommendation-card"
            onClick={() => handleTestSelection(test)}
          >
            <div className="recommendation-header">
              <div className="test-info">
                <h3>{test.testName}</h3>
                <span className={`difficulty-badge ${test.difficulty}`}>
                  {test.difficulty}
                </span>
                <span className="confidence-score">
                  {Math.round(test.confidence * 100)}% match
                </span>
              </div>
            </div>

            <div className="recommendation-content">
              <p className="test-description">{test.description}</p>
              <div className="when-to-use">
                <strong>When to use:</strong> {test.whenToUse}
              </div>
              <div className="test-interpretation">
                <strong>What it tells you:</strong> {test.interpretation}
              </div>
            </div>

            <div className="test-requirements">
              <div className="sample-size">
                Min sample size: {test.dataRequirements.minSampleSize}
              </div>
              <div className="assumptions">
                <strong>Key assumptions:</strong>
                <ul>
                  {test.assumptions.map((assumption, idx) => (
                    <li key={idx}>{assumption}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="step-navigation">
        <button onClick={() => setCurrentStep('intent')} className="back-button">
          ← Back to Goals
        </button>
      </div>
    </div>
  );

  const renderVariablesStep = () => {
    if (!selectedTest) return null;

    const numericVars = dataCharacteristics?.variables.filter(v => v.type === 'numeric') || [];
    const categoricalVars = dataCharacteristics?.variables.filter(v => 
      v.type === 'categorical' || v.type === 'binary'
    ) || [];

    return (
      <div className="wizard-step">
        <div className="step-header">
          <h2>Select Variables for {selectedTest.testName}</h2>
          <p>Choose which variables to use in your analysis</p>
        </div>

        <div className="variable-selection">
          {/* Dependent Variable */}
          {(selectedTest.testType === 'comparison' || selectedTest.testType === 'regression') && (
            <div className="variable-group">
              <label>
                <strong>Dependent Variable</strong> 
                <span className="variable-help">(the outcome you're measuring)</span>
              </label>
              <select 
                value={selectedVariables.dependent || ''}
                onChange={(e) => setSelectedVariables({
                  ...selectedVariables,
                  dependent: e.target.value
                })}
              >
                <option value="">Select variable...</option>
                {numericVars.map(variable => (
                  <option key={variable.name} value={variable.name}>
                    {variable.name} (numeric)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Independent/Predictor Variable */}
          {(selectedTest.testType === 'association' || selectedTest.testType === 'regression') && (
            <div className="variable-group">
              <label>
                <strong>Independent Variable</strong>
                <span className="variable-help">(the predictor/explanatory variable)</span>
              </label>
              <select 
                value={selectedVariables.independent || ''}
                onChange={(e) => setSelectedVariables({
                  ...selectedVariables,
                  independent: e.target.value
                })}
              >
                <option value="">Select variable...</option>
                {(selectedTest.id === 'pearson_correlation' ? numericVars : [...numericVars, ...categoricalVars]).map(variable => (
                  <option key={variable.name} value={variable.name}>
                    {variable.name} ({variable.type})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Grouping Variable */}
          {selectedTest.testType === 'comparison' && (
            <div className="variable-group">
              <label>
                <strong>Grouping Variable</strong>
                <span className="variable-help">(defines the groups to compare)</span>
              </label>
              <select 
                value={selectedVariables.grouping || ''}
                onChange={(e) => setSelectedVariables({
                  ...selectedVariables,
                  grouping: e.target.value
                })}
              >
                <option value="">Select variable...</option>
                {categoricalVars.map(variable => (
                  <option key={variable.name} value={variable.name}>
                    {variable.name} ({variable.uniqueValues} groups)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="variable-preview">
          <h4>Variable Summary:</h4>
          {dataCharacteristics?.variables.map(variable => (
            <div key={variable.name} className="variable-info">
              <span className="variable-name">{variable.name}</span>
              <span className="variable-type">{variable.type}</span>
              <span className="variable-stats">
                {variable.type === 'numeric' 
                  ? `Range: ${variable.range?.min} - ${variable.range?.max}`
                  : `${variable.uniqueValues} unique values`
                }
              </span>
            </div>
          ))}
        </div>

        <div className="step-navigation">
          <button onClick={() => setCurrentStep('recommendations')} className="back-button">
            ← Back to Tests
          </button>
          <button 
            onClick={() => handleVariableSelection(selectedVariables)}
            disabled={!isVariableSelectionValid()}
            className="next-button"
          >
            Check Assumptions →
          </button>
        </div>
      </div>
    );
  };

  const renderAssumptionsStep = () => {
    if (!assumptionResults || !selectedTest) return null;

    return (
      <div className="wizard-step">
        <div className="step-header">
          <h2>Assumption Check for {selectedTest.testName}</h2>
          <p>Let's verify that your data meets the test requirements</p>
        </div>

        <div className={`assumptions-status ${assumptionResults.overallStatus}`}>
          <div className="status-icon">
            {assumptionResults.overallStatus === 'all_met' ? '✅' : 
             assumptionResults.overallStatus === 'some_violated' ? '⚠️' : '❌'}
          </div>
          <div className="status-text">
            {assumptionResults.overallStatus === 'all_met' && 'All assumptions are met! You can proceed with confidence.'}
            {assumptionResults.overallStatus === 'some_violated' && 'Some assumptions are violated, but you can still proceed with caution.'}
            {assumptionResults.overallStatus === 'major_violations' && 'Major assumption violations detected. Consider alternative tests.'}
          </div>
        </div>

        <div className="assumptions-list">
          {assumptionResults.assumptions.map((assumption, idx) => (
            <div key={idx} className={`assumption-item ${assumption.result}`}>
              <div className="assumption-header">
                <div className="assumption-name">
                  <span className={`result-icon ${assumption.result}`}>
                    {assumption.result === 'met' ? '✅' : 
                     assumption.result === 'warning' ? '⚠️' : '❌'}
                  </span>
                  <strong>{assumption.name}</strong>
                  <span className={`severity ${assumption.severity}`}>
                    {assumption.severity}
                  </span>
                </div>
              </div>

              <p className="assumption-description">{assumption.description}</p>
              <p className="assumption-interpretation">{assumption.interpretation}</p>

              {assumption.pValue && (
                <div className="statistical-details">
                  <span>p-value: {assumption.pValue.toFixed(4)}</span>
                  {assumption.statistic && (
                    <span>Test statistic: {assumption.statistic.toFixed(3)}</span>
                  )}
                </div>
              )}

              {assumption.recommendation && (
                <div className="assumption-recommendation">
                  <strong>Recommendation:</strong> {assumption.recommendation}
                </div>
              )}
            </div>
          ))}
        </div>

        {assumptionResults.alternatives.length > 0 && (
          <div className="alternatives-section">
            <h4>Alternative Tests to Consider:</h4>
            <div className="alternatives-list">
              {assumptionResults.alternatives.map((alt, idx) => (
                <div key={idx} className="alternative-item">
                  <h5>{alt.testName}</h5>
                  <p><strong>Why consider this:</strong> {alt.reason}</p>
                  <p>{alt.description}</p>
                  <div className="confidence-badge">
                    {Math.round(alt.confidence * 100)}% recommended
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="step-navigation">
          <button onClick={() => setCurrentStep('variables')} className="back-button">
            ← Back to Variables
          </button>
          <button 
            onClick={handleRunTest}
            disabled={isLoading}
            className="run-test-button"
          >
            {isLoading ? (
              <>
                <div className="spinner"></div>
                Running Test...
              </>
            ) : (
              `Run ${selectedTest.testName} →`
            )}
          </button>
        </div>
      </div>
    );
  };

  const renderResultsStep = () => {
    if (!testResult || !selectedTest) return null;

    return (
      <div className="wizard-step">
        <div className="step-header">
          <h2>{testResult.testName} Results</h2>
          <p>Here's what your analysis revealed</p>
        </div>

        <div className="results-content">
          <div className="main-result">
            <div className="statistical-result">
              <div className="test-statistic">
                <label>Test Statistic:</label>
                <span>{testResult.statistic.toFixed(3)}</span>
              </div>
              <div className="p-value">
                <label>p-value:</label>
                <span className={testResult.pValue < 0.05 ? 'significant' : 'not-significant'}>
                  {testResult.pValue.toFixed(4)}
                </span>
              </div>
              <div className="effect-size">
                <label>Effect Size:</label>
                <span className={`effect-${testResult.effect.interpretation}`}>
                  {testResult.effect.size.toFixed(3)} ({testResult.effect.interpretation})
                </span>
              </div>
            </div>
          </div>

          <div className="interpretations">
            <div className="interpretation-section">
              <h4>Statistical Interpretation</h4>
              <p>{testResult.interpretation.statistical}</p>
            </div>

            <div className="interpretation-section">
              <h4>Practical Significance</h4>
              <p>{testResult.interpretation.practical}</p>
            </div>

            <div className="interpretation-section">
              <h4>Recommendation</h4>
              <p>{testResult.interpretation.recommendation}</p>
            </div>
          </div>

          {testResult.confidence.interval && (
            <div className="confidence-interval">
              <h4>95% Confidence Interval</h4>
              <span>
                [{testResult.confidence.interval[0].toFixed(3)}, {testResult.confidence.interval[1].toFixed(3)}]
              </span>
            </div>
          )}
        </div>

        <div className="step-navigation">
          <button onClick={handleRestart} className="restart-button">
            ← Run Another Test
          </button>
          <button 
            onClick={() => onTestComplete(testResult)}
            className="finish-button"
          >
            Finish Analysis ✓
          </button>
        </div>
      </div>
    );
  };

  const isVariableSelectionValid = () => {
    if (!selectedTest) return false;
    
    switch (selectedTest.testType) {
      case 'comparison':
        return selectedVariables.dependent && selectedVariables.grouping;
      case 'association':
        return selectedVariables.dependent && selectedVariables.independent;
      case 'regression':
        return selectedVariables.dependent && selectedVariables.independent;
      default:
        return true;
    }
  };

  const getStepIndicator = () => {
    const steps = ['intent', 'recommendations', 'variables', 'assumptions', 'results'];
    const currentIndex = steps.indexOf(currentStep);
    
    return (
      <div className="step-indicator">
        {steps.map((step, index) => (
          <div 
            key={step}
            className={`step-dot ${index <= currentIndex ? 'active' : ''}`}
          >
            {index + 1}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="statistical-test-wizard">
      <div className="wizard-header">
        <h1>Statistical Test Wizard</h1>
        {getStepIndicator()}
      </div>

      <div className="wizard-content">
        {renderStep()}
      </div>
    </div>
  );
};

export default StatisticalTestWizard;
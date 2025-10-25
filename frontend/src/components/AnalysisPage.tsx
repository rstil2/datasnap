import { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import * as ss from 'simple-statistics';

type AnalysisType = 'ttest' | 'anova' | 'chisquare' | 'correlation';

interface StatTestResult {
  test_name: string;
  test_statistic: number;
  p_value: number;
  degrees_of_freedom?: number;
  effect_size?: number;
  confidence_interval?: [number, number];
  interpretation: string;
  conclusion: string;
  sample_size: number;
  assumptions: {
    normality?: boolean;
    equal_variances?: boolean;
    independence?: boolean;
  };
  error?: string;
}

export function AnalysisPage() {
  const { csvData, currentFile } = useData();
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisType>('ttest');
  const [column1, setColumn1] = useState('');
  const [column2, setColumn2] = useState('');
  const [groupColumn, setGroupColumn] = useState('');
  const [testValue, setTestValue] = useState<number>(0); // For one-sample t-test
  const [alpha, setAlpha] = useState<number>(0.05);
  const [error, setError] = useState<string | null>(null);
  
  // Helper functions for statistical computations
  const getNumericValues = (column: string): number[] => {
    if (!csvData) return [];
    return csvData.data
      .map(row => parseFloat(String(row[column])))
      .filter(val => !isNaN(val) && isFinite(val));
  };
  
  const getGroupedValues = (valueColumn: string, groupColumn: string): Record<string, number[]> => {
    if (!csvData) return {};
    const groups: Record<string, number[]> = {};
    
    csvData.data.forEach(row => {
      const value = parseFloat(String(row[valueColumn]));
      const group = String(row[groupColumn]).trim();
      
      if (!isNaN(value) && isFinite(value) && group) {
        if (!groups[group]) groups[group] = [];
        groups[group].push(value);
      }
    });
    
    return groups;
  };
  
  const calculateTTest = (sample1: number[], sample2?: number[], testValue?: number): StatTestResult => {
    try {
      let tStat: number, pValue: number, df: number;
      let testName: string;
      let sampleSize: number;
      
      if (testValue !== undefined) {
        // One-sample t-test
        if (sample1.length < 2) throw new Error('Need at least 2 values for one-sample t-test');
        
        const mean = ss.mean(sample1);
        const stdDev = ss.standardDeviation(sample1);
        const n = sample1.length;
        
        tStat = (mean - testValue) / (stdDev / Math.sqrt(n));
        df = n - 1;
        pValue = 2 * (1 - ss.cumulativeStdNormalProbability(Math.abs(tStat))); // Approximation
        testName = 'One-Sample T-Test';
        sampleSize = n;
      } else if (sample2) {
        // Independent samples t-test
        if (sample1.length < 2 || sample2.length < 2) {
          throw new Error('Need at least 2 values in each group for independent t-test');
        }
        
        const mean1 = ss.mean(sample1);
        const mean2 = ss.mean(sample2);
        const var1 = ss.variance(sample1);
        const var2 = ss.variance(sample2);
        const n1 = sample1.length;
        const n2 = sample2.length;
        
        // Pooled variance (assuming equal variances)
        const pooledVar = ((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2);
        const standardError = Math.sqrt(pooledVar * (1/n1 + 1/n2));
        
        tStat = (mean1 - mean2) / standardError;
        df = n1 + n2 - 2;
        pValue = 2 * (1 - ss.cumulativeStdNormalProbability(Math.abs(tStat))); // Approximation
        testName = 'Independent Samples T-Test';
        sampleSize = n1 + n2;
      } else {
        throw new Error('Invalid t-test parameters');
      }
      
      const isSignificant = pValue < alpha;
      const effectSize = sample2 ? Math.abs(ss.mean(sample1) - ss.mean(sample2)) / Math.sqrt(((sample1.length - 1) * ss.variance(sample1) + (sample2.length - 1) * ss.variance(sample2)) / (sample1.length + sample2.length - 2)) : undefined;
      
      return {
        test_name: testName,
        test_statistic: parseFloat(tStat.toFixed(4)),
        p_value: parseFloat(pValue.toFixed(6)),
        degrees_of_freedom: df,
        effect_size: effectSize ? parseFloat(effectSize.toFixed(4)) : undefined,
        sample_size: sampleSize,
        interpretation: `With α = ${alpha}, the test is ${isSignificant ? 'statistically significant' : 'not statistically significant'}.`,
        conclusion: isSignificant 
          ? `Reject the null hypothesis (p = ${pValue.toFixed(6)} < ${alpha}). There is sufficient evidence of a significant difference.`
          : `Fail to reject the null hypothesis (p = ${pValue.toFixed(6)} ≥ ${alpha}). There is insufficient evidence of a significant difference.`,
        assumptions: {
          normality: true, // Assumed for now
          equal_variances: sample2 ? true : undefined,
          independence: true
        }
      };
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to perform t-test');
    }
  };
  
  const calculateANOVA = (groups: Record<string, number[]>): StatTestResult => {
    try {
      const groupNames = Object.keys(groups);
      if (groupNames.length < 2) throw new Error('Need at least 2 groups for ANOVA');
      
      // Check each group has sufficient data
      for (const group of groupNames) {
        if (groups[group].length < 2) {
          throw new Error(`Group "${group}" has insufficient data (need at least 2 values per group)`);
        }
      }
      
      const allValues = groupNames.flatMap(group => groups[group]);
      const grandMean = ss.mean(allValues);
      const totalN = allValues.length;
      const k = groupNames.length; // number of groups
      
      // Calculate sum of squares
      let ssb = 0; // Sum of squares between groups
      let ssw = 0; // Sum of squares within groups
      
      groupNames.forEach(group => {
        const groupData = groups[group];
        const groupMean = ss.mean(groupData);
        const n = groupData.length;
        
        // Between groups SS
        ssb += n * Math.pow(groupMean - grandMean, 2);
        
        // Within groups SS
        groupData.forEach(value => {
          ssw += Math.pow(value - groupMean, 2);
        });
      });
      
      const dfBetween = k - 1;
      const dfWithin = totalN - k;
      
      const msb = ssb / dfBetween; // Mean square between
      const msw = ssw / dfWithin;  // Mean square within
      
      const fStat = msb / msw;
      
      // Approximate p-value using F-distribution approximation (simplified)
      // For a more accurate p-value, you'd need a proper F-distribution function
      let pValue: number;
      if (fStat > 4) pValue = 0.001; // Very significant
      else if (fStat > 3) pValue = 0.01;  // Significant
      else if (fStat > 2) pValue = 0.05;  // Marginally significant
      else pValue = 0.1; // Not significant
      
      const isSignificant = pValue < alpha;
      const etaSquared = ssb / (ssb + ssw); // Effect size (eta-squared)
      
      return {
        test_name: 'One-Way ANOVA',
        test_statistic: parseFloat(fStat.toFixed(4)),
        p_value: parseFloat(pValue.toFixed(6)),
        degrees_of_freedom: dfBetween,
        effect_size: parseFloat(etaSquared.toFixed(4)),
        sample_size: totalN,
        interpretation: `With α = ${alpha}, the ANOVA is ${isSignificant ? 'statistically significant' : 'not statistically significant'}.`,
        conclusion: isSignificant 
          ? `Reject the null hypothesis (p ≈ ${pValue.toFixed(6)} < ${alpha}). There are significant differences between group means.`
          : `Fail to reject the null hypothesis (p ≈ ${pValue.toFixed(6)} ≥ ${alpha}). No significant differences between group means.`,
        assumptions: {
          normality: true, // Assumed
          equal_variances: true, // Assumed
          independence: true
        }
      };
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to perform ANOVA');
    }
  };
  
  const calculateCorrelation = (x: number[], y: number[]): StatTestResult => {
    try {
      if (x.length !== y.length || x.length < 3) {
        throw new Error('Need at least 3 paired values for correlation analysis');
      }
      
      const r = ss.sampleCorrelation(x, y);
      const n = x.length;
      const df = n - 2;
      
      // Calculate t-statistic for correlation
      const tStat = r * Math.sqrt(df) / Math.sqrt(1 - r * r);
      const pValue = 2 * (1 - ss.cumulativeStdNormalProbability(Math.abs(tStat))); // Approximation
      
      const isSignificant = pValue < alpha;
      const rSquared = r * r; // Coefficient of determination
      
      let strength: string;
      const absR = Math.abs(r);
      if (absR >= 0.7) strength = 'strong';
      else if (absR >= 0.3) strength = 'moderate';
      else strength = 'weak';
      
      return {
        test_name: 'Pearson Correlation',
        test_statistic: parseFloat(r.toFixed(4)),
        p_value: parseFloat(pValue.toFixed(6)),
        degrees_of_freedom: df,
        effect_size: parseFloat(rSquared.toFixed(4)),
        sample_size: n,
        interpretation: `The correlation coefficient is ${r.toFixed(3)}, indicating a ${strength} ${r >= 0 ? 'positive' : 'negative'} relationship.`,
        conclusion: isSignificant 
          ? `The correlation is statistically significant (p = ${pValue.toFixed(6)} < ${alpha}). There is a significant linear relationship between the variables.`
          : `The correlation is not statistically significant (p = ${pValue.toFixed(6)} ≥ ${alpha}). No significant linear relationship detected.`,
        assumptions: {
          normality: true, // Assumed
          independence: true
        }
      };
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to calculate correlation');
    }
  };
  
  // Compute test result
  const testResult = useMemo((): StatTestResult | null => {
    if (!csvData || !column1) return null;
    
    try {
      setError(null);
      
      switch (selectedAnalysis) {
        case 'ttest': {
          if (column2) {
            // Two-sample t-test
            const sample1 = getNumericValues(column1);
            const sample2 = getNumericValues(column2);
            return calculateTTest(sample1, sample2);
          } else {
            // One-sample t-test
            const sample = getNumericValues(column1);
            return calculateTTest(sample, undefined, testValue);
          }
        }
        case 'anova': {
          if (!groupColumn) return null;
          const groups = getGroupedValues(column1, groupColumn);
          return calculateANOVA(groups);
        }
        case 'correlation': {
          if (!column2) return null;
          const x = getNumericValues(column1);
          const y = getNumericValues(column2);
          return calculateCorrelation(x, y);
        }
        default:
          return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to perform statistical test');
      return null;
    }
  }, [csvData, selectedAnalysis, column1, column2, groupColumn, testValue, alpha]);
  
  // Note: Chi-square test is not implemented in client-side
  
  if (!csvData || !currentFile) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Statistical Analysis</h1>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">No Data Available</h3>
          </div>
          <div className="card-content">
            <p>Upload a CSV file first to perform advanced statistical analysis and tests.</p>
          </div>
        </div>
    </div>
  );
  }
  
  const numericColumns = csvData.headers.filter(header => {
    const values = csvData.data.map(row => row[header]).filter(v => {
      if (!v) return false;
      const stringValue = typeof v === 'string' ? v : String(v);
      return stringValue.trim() !== '';
    });
    const numericValues = values.map(v => parseFloat(String(v))).filter(v => !isNaN(v));
    return numericValues.length > 0;
  });
  
  
  
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Statistical Analysis</h1>
        <p className="page-description">Hypothesis testing and statistical significance</p>
      </div>
      
      {/* Analysis Selection */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="card-header">
          <h3 className="card-title">Statistical Test</h3>
        </div>
        <div className="card-content">
          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', marginBottom: 'var(--space-lg)' }}>
            {[
              { key: 'ttest', label: '📈 T-Test', desc: 'Compare means (one-sample or two-sample)' },
              { key: 'anova', label: '📊 ANOVA', desc: 'Compare means across multiple groups' },
              { key: 'correlation', label: '🔗 Correlation', desc: 'Measure linear relationship between variables' }
            ].map(analysis => (
              <button
                key={analysis.key}
                onClick={() => {
                  setSelectedAnalysis(analysis.key as AnalysisType);
                  setError(null);
                }}
                style={{
                  padding: 'var(--space-md)',
                  background: selectedAnalysis === analysis.key ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                  color: selectedAnalysis === analysis.key ? 'white' : 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  minWidth: '200px',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <div style={{ fontWeight: '600', marginBottom: 'var(--space-xs)' }}>{analysis.label}</div>
                <div style={{ fontSize: '0.8125rem', opacity: 0.8 }}>{analysis.desc}</div>
              </button>
            ))}
          </div>
          
          {/* Column Selection */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-sm)', fontWeight: '600', color: 'var(--text-primary)' }}>
                {selectedAnalysis === 'anova' ? 'Numeric Variable:' : 'First Variable:'}
              </label>
              <select 
                value={column1} 
                onChange={(e) => setColumn1(e.target.value)}
                style={{ 
                  width: '100%',
                  padding: 'var(--space-md)', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border-primary)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="">Select column...</option>
                {numericColumns.map(header => (
                  <option key={header} value={header}>{header}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-sm)', fontWeight: '600', color: 'var(--text-primary)' }}>
                {selectedAnalysis === 'anova' ? 'Group Variable:' : 'Second Numeric Variable (optional for one-sample t-test):'}
              </label>
              <select 
                value={selectedAnalysis === 'anova' ? groupColumn : column2} 
                onChange={(e) => selectedAnalysis === 'anova' ? setGroupColumn(e.target.value) : setColumn2(e.target.value)}
                style={{ 
                  width: '100%',
                  padding: 'var(--space-md)', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border-primary)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="">Select column...</option>
                {(selectedAnalysis === 'anova' ? csvData.headers : numericColumns).map(header => (
                  <option key={header} value={header}>{header}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Test Parameters */}
          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', marginBottom: 'var(--space-lg)' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-sm)', fontWeight: '600', color: 'var(--text-primary)' }}>Alpha (Significance Level)</label>
              <input 
                type="number" 
                step="0.01" 
                min="0.001"
                max="0.2"
                value={alpha}
                onChange={(e) => setAlpha(Math.max(0.001, Math.min(0.2, parseFloat(e.target.value))))}
                style={{ 
                  width: '160px',
                  padding: 'var(--space-md)', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border-primary)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            {selectedAnalysis === 'ttest' && !column2 && (
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-sm)', fontWeight: '600', color: 'var(--text-primary)' }}>Test Value (One-Sample T-Test)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={testValue}
                  onChange={(e) => setTestValue(parseFloat(e.target.value))}
                  style={{ 
                    width: '200px',
                    padding: 'var(--space-md)', 
                    borderRadius: 'var(--radius-md)', 
                    border: '1px solid var(--border-primary)',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            )}
          </div>
          
          {/* Results */}
          {error && (
            <div style={{ 
              marginTop: 'var(--space-md)',
              padding: 'var(--space-md)',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--error)'
            }}>
              <div style={{ color: 'var(--error)', marginBottom: 'var(--space-sm)' }}>
                <strong>Analysis Error:</strong>
              </div>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{error}</p>
            </div>
          )}

          {testResult && (
            <div style={{ 
              marginTop: 'var(--space-lg)',
              padding: 'var(--space-lg)',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-primary)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                <h4 style={{ color: 'var(--text-primary)', margin: 0 }}>{testResult.test_name}</h4>
                <span style={{ 
                  padding: '2px 8px', 
                  borderRadius: '10px', 
                  background: testResult.p_value < alpha ? 'var(--success)' : 'var(--border-secondary)',
                  color: 'white',
                  fontSize: '0.8125rem'
                }}>
                  {testResult.p_value < alpha ? 'Significant' : 'Not Significant'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-md)' }}>
                <div>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Statistic</div>
                  <div style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 600 }}>{testResult.test_statistic}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>p-value</div>
                  <div style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 600 }}>{testResult.p_value}</div>
                </div>
                {testResult.degrees_of_freedom !== undefined && (
                  <div>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>df</div>
                    <div style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 600 }}>{testResult.degrees_of_freedom}</div>
                  </div>
                )}
                {testResult.effect_size !== undefined && (
                  <div>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Effect Size</div>
                    <div style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 600 }}>{testResult.effect_size}</div>
                  </div>
                )}
                <div>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Sample Size</div>
                  <div style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 600 }}>{testResult.sample_size}</div>
                </div>
              </div>
              <div style={{ marginTop: 'var(--space-md)', color: 'var(--text-secondary)' }}>
                <p style={{ margin: 0 }}><strong>Interpretation:</strong> {testResult.interpretation}</p>
                <p style={{ margin: 0 }}><strong>Conclusion:</strong> {testResult.conclusion}</p>
              </div>
            </div>
          )}
          
          {!testResult && !error && (
            <div style={{ 
              textAlign: 'center', 
              padding: 'var(--space-xl)',
              color: 'var(--text-tertiary)'
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-md)', opacity: 0.5 }}>🧪</div>
              <p>
                {selectedAnalysis === 'ttest' && !column1 ? 'Select a numeric column for t-test' :
                 selectedAnalysis === 'ttest' && !column2 ? 'Enter a test value for one-sample or select a second column for two-sample t-test' :
                 selectedAnalysis === 'anova' && (!column1 || !groupColumn) ? 'Select a numeric column and a group column for ANOVA' :
                 selectedAnalysis === 'correlation' && (!column1 || !column2) ? 'Select two numeric columns for correlation' :
                 'Adjust parameters to see results'}
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Dataset Info */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Dataset Summary</h3>
        </div>
        <div className="card-content">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-lg)' }}>
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>File:</strong>
              <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-family-mono)' }}>{currentFile?.filename || 'No file selected'}</div>
            </div>
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Rows:</strong>
              <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-family-mono)' }}>{csvData.data.length.toLocaleString()}</div>
            </div>
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Numeric Columns:</strong>
              <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-family-mono)' }}>{numericColumns.length}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

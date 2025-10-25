import { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { getStatistics, handleDataError, validateData } from '../utils/dataProcessing';
import StatisticalTestWizard from './StatisticalTestWizard';
import type { TestResult } from '../services/StatisticalTestService';

export function StatsPage() {
  const { currentFile, csvData, stats, setStats, isLoading, setLoading, error, setError } = useData();
  const [showCorrelation, setShowCorrelation] = useState(false);
  const [showOutliers, setShowOutliers] = useState(false);
  const [showStatisticalTests, setShowStatisticalTests] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  
  // Statistics are now handled by standardized data processing utilities

  // Load statistics when a file is selected - using local calculation for now
  useEffect(() => {
    if (currentFile && csvData && !stats) {
      loadStatistics();
    }
  }, [currentFile, csvData, stats]);
  
  const loadStatistics = async () => {
    if (!currentFile || !csvData) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Validate data first
      const validation = validateData(csvData.data);
      if (!validation.isValid) {
        throw new Error('Data validation failed: ' + validation.errors.join(', '));
      }
      
      // Use standardized data processing with API fallback
      const stats = await getStatistics(currentFile.id, csvData.data, csvData.filename);
      setStats(stats);

    } catch (error) {
      const errorMessage = handleDataError(error, 'statistics calculation');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  const handleTestComplete = (result: TestResult) => {
    setTestResults(prev => [...prev, result]);
  };
  
  const calculateStats = (_column: string, values: string[]) => {
    const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
    if (numericValues.length === 0) return null;
    
    const sorted = numericValues.sort((a, b) => a - b);
    const sum = numericValues.reduce((a, b) => a + b, 0);
    const mean = sum / numericValues.length;
    const median = sorted.length % 2 === 0 
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    const variance = numericValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / numericValues.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate additional statistics
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    const outliers = numericValues.filter(v => v < lowerBound || v > upperBound);
    
    // Calculate skewness
    const n = numericValues.length;
    const skewness = n > 2 ? (n / ((n - 1) * (n - 2))) * numericValues.reduce((sum, value) => {
      return sum + Math.pow((value - mean) / stdDev, 3);
    }, 0) : 0;
    
    return {
      count: numericValues.length,
      mean: mean.toFixed(2),
      median: median.toFixed(2),
      min: Math.min(...numericValues).toFixed(2),
      max: Math.max(...numericValues).toFixed(2),
      stdDev: stdDev.toFixed(2),
      q1: q1.toFixed(2),
      q3: q3.toFixed(2),
      iqr: iqr.toFixed(2),
      skewness: skewness.toFixed(3),
      outliers: outliers.length,
      cv: ((stdDev / mean) * 100).toFixed(2) // Coefficient of variation
    };
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Descriptive Statistics</h1>
          <p className="page-description">Loading statistical analysis...</p>
        </div>
        <div className="card">
          <div className="card-content" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-lg)', opacity: 0.6 }}>⟳</div>
            <p style={{ color: 'var(--text-secondary)' }}>Analyzing your data...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Descriptive Statistics</h1>
          <p className="page-description">Error loading statistical analysis</p>
        </div>
        <div className="card">
          <div className="card-content" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-lg)', opacity: 0.6 }}>❌</div>
            <p style={{ color: 'var(--error)', marginBottom: 'var(--space-md)' }}>Error: {error}</p>
            <button 
              onClick={loadStatistics}
              style={{
                padding: 'var(--space-md) var(--space-lg)',
                background: 'var(--accent-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer'
              }}
            >
              Retry Analysis
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (!csvData || !currentFile) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Descriptive Statistics</h1>
          <p className="page-description">Statistical overview of your data</p>
        </div>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">No Data Available</h3>
          </div>
          <div className="card-content">
            <p>Upload a CSV file first to view descriptive statistics and insights about your data.</p>
          </div>
        </div>
      </div>
    );
  }
  
  const columnStats = csvData.headers.map(header => {
    const values = csvData.data.map(row => row[header]).filter(v => {
      if (!v) return false;
      const stringValue = typeof v === 'string' ? v : String(v);
      return stringValue.trim() !== '';
    });
    const stats = calculateStats(header, values);
    const uniqueValues = new Set(values).size;
    
    return {
      column: header,
      totalValues: values.length,
      uniqueValues,
      isNumeric: stats !== null,
      stats
    };
  });
  
  const numericColumns = columnStats.filter(col => col.isNumeric);
  
  // Calculate correlation matrix
  const calculateCorrelationMatrix = () => {
    if (numericColumns.length < 2) return null;
    
    const matrix: { [key: string]: { [key: string]: number } } = {};
    
    numericColumns.forEach(col1 => {
      matrix[col1.column] = {};
      const values1 = csvData.data
        .map(row => parseFloat(row[col1.column]))
        .filter(v => !isNaN(v));
        
      numericColumns.forEach(col2 => {
        const values2 = csvData.data
          .map(row => parseFloat(row[col2.column]))
          .filter(v => !isNaN(v));
          
        if (values1.length !== values2.length) {
          matrix[col1.column][col2.column] = NaN;
          return;
        }
        
        // Calculate Pearson correlation coefficient
        const mean1 = values1.reduce((a, b) => a + b, 0) / values1.length;
        const mean2 = values2.reduce((a, b) => a + b, 0) / values2.length;
        
        let numerator = 0;
        let sum1 = 0;
        let sum2 = 0;
        
        for (let i = 0; i < values1.length; i++) {
          const diff1 = values1[i] - mean1;
          const diff2 = values2[i] - mean2;
          numerator += diff1 * diff2;
          sum1 += diff1 * diff1;
          sum2 += diff2 * diff2;
        }
        
        const denominator = Math.sqrt(sum1 * sum2);
        matrix[col1.column][col2.column] = denominator === 0 ? 0 : numerator / denominator;
      });
    });
    
    return matrix;
  };
  
  const correlationMatrix = calculateCorrelationMatrix();

  // Generate outlier analysis data
  const getOutlierData = () => {
    return numericColumns.map(col => {
      const values = csvData.data
        .map(row => parseFloat(row[col.column]))
        .filter(v => !isNaN(v));
      
      const sorted = values.sort((a, b) => a - b);
      const q1Index = Math.floor(sorted.length * 0.25);
      const q3Index = Math.floor(sorted.length * 0.75);
      const q1 = sorted[q1Index];
      const q3 = sorted[q3Index];
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;
      const outliers = values.filter(v => v < lowerBound || v > upperBound);
      
      return {
        column: col.column,
        outliers,
        lowerBound,
        upperBound,
        q1,
        q3
      };
    }).filter(col => col.outliers.length > 0);
  };
  
  const outlierData = getOutlierData();
  
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Descriptive Statistics</h1>
        <p className="page-description">Statistical overview of your data</p>
      </div>
      
      {/* Dataset Overview */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="card-header">
          <h3 className="card-title">Dataset Overview</h3>
        </div>
        <div className="card-content">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-lg)' }}>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>File:</strong>
                  <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-family-mono)' }}>{csvData.filename}</div>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Rows:</strong>
                  <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-family-mono)' }}>{csvData.data.length.toLocaleString()}</div>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Columns:</strong>
                  <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-family-mono)' }}>{csvData.headers.length} ({numericColumns.length} numeric)</div>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Missing Values:</strong>
                  <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-family-mono)' }}>
                    {(csvData.data.length * csvData.headers.length - csvData.data.reduce((sum, row) => 
                      sum + csvData.headers.filter(header => {
                        const value = row[header];
                        if (!value) return false;
                        const stringValue = typeof value === 'string' ? value : String(value);
                        return stringValue.trim() !== '';
                      }).length, 0
                    )).toLocaleString()}
                  </div>
                </div>
              </div>
              
              {/* Analysis Controls */}
              <div style={{ marginTop: 'var(--space-lg)', display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => setShowCorrelation(!showCorrelation)}
                  style={{
                    padding: 'var(--space-sm) var(--space-md)',
                    background: showCorrelation ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    color: showCorrelation ? 'white' : 'var(--text-primary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  📊 {showCorrelation ? 'Hide' : 'Show'} Correlation Matrix
                </button>
                
                <button 
                  onClick={() => setShowOutliers(!showOutliers)}
                  style={{
                    padding: 'var(--space-sm) var(--space-md)',
                    background: showOutliers ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    color: showOutliers ? 'white' : 'var(--text-primary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  🔍 {showOutliers ? 'Hide' : 'Show'} Outlier Analysis
                </button>
                
                <button 
                  onClick={() => setShowStatisticalTests(!showStatisticalTests)}
                  style={{
                    padding: 'var(--space-sm) var(--space-md)',
                    background: showStatisticalTests ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    color: showStatisticalTests ? 'white' : 'var(--text-primary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  🧪 {showStatisticalTests ? 'Hide' : 'Show'} Statistical Tests
                </button>
              </div>
        </div>
      </div>
      
      {/* Column Statistics */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Column Statistics</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            fontSize: '0.875rem',
            background: 'var(--bg-secondary)'
          }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                <th style={{ padding: 'var(--space-md)', textAlign: 'left', fontWeight: '600', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-primary)' }}>Column</th>
                <th style={{ padding: 'var(--space-md)', textAlign: 'left', fontWeight: '600', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-primary)' }}>Type</th>
                <th style={{ padding: 'var(--space-md)', textAlign: 'left', fontWeight: '600', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-primary)' }}>Count</th>
                <th style={{ padding: 'var(--space-md)', textAlign: 'left', fontWeight: '600', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-primary)' }}>Unique</th>
                <th style={{ padding: 'var(--space-md)', textAlign: 'left', fontWeight: '600', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-primary)' }}>Mean</th>
                <th style={{ padding: 'var(--space-md)', textAlign: 'left', fontWeight: '600', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-primary)' }}>Median</th>
                <th style={{ padding: 'var(--space-md)', textAlign: 'left', fontWeight: '600', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-primary)' }}>Min</th>
                <th style={{ padding: 'var(--space-md)', textAlign: 'left', fontWeight: '600', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-primary)' }}>Max</th>
                <th style={{ padding: 'var(--space-md)', textAlign: 'left', fontWeight: '600', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-primary)' }}>Std Dev</th>
                <th style={{ padding: 'var(--space-md)', textAlign: 'left', fontWeight: '600', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-primary)' }}>Q1</th>
                <th style={{ padding: 'var(--space-md)', textAlign: 'left', fontWeight: '600', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-primary)' }}>Q3</th>
                <th style={{ padding: 'var(--space-md)', textAlign: 'left', fontWeight: '600', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-primary)' }}>Skewness</th>
                <th style={{ padding: 'var(--space-md)', textAlign: 'left', fontWeight: '600', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-primary)' }}>Outliers</th>
              </tr>
            </thead>
            <tbody>
              {columnStats.map((col, index) => (
                <tr key={index} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: 'var(--space-md)', fontWeight: 'bold', color: 'var(--text-primary)' }}>{col.column}</td>
                  <td style={{ padding: 'var(--space-md)' }}>
                    <span style={{ 
                      padding: '2px 8px', 
                      borderRadius: '12px', 
                      fontSize: '12px',
                      backgroundColor: col.isNumeric ? 'var(--success)' : 'var(--warning)',
                      color: 'white',
                      fontWeight: '500'
                    }}>
                      {col.isNumeric ? 'Numeric' : 'Text'}
                    </span>
                  </td>
                  <td style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontFamily: 'var(--font-family-mono)' }}>{col.totalValues.toLocaleString()}</td>
                  <td style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontFamily: 'var(--font-family-mono)' }}>{col.uniqueValues.toLocaleString()}</td>
                  <td style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontFamily: 'var(--font-family-mono)' }}>{col.stats?.mean || 'N/A'}</td>
                  <td style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontFamily: 'var(--font-family-mono)' }}>{col.stats?.median || 'N/A'}</td>
                  <td style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontFamily: 'var(--font-family-mono)' }}>{col.stats?.min || 'N/A'}</td>
                  <td style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontFamily: 'var(--font-family-mono)' }}>{col.stats?.max || 'N/A'}</td>
                  <td style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontFamily: 'var(--font-family-mono)' }}>{col.stats?.stdDev || 'N/A'}</td>
                  <td style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontFamily: 'var(--font-family-mono)' }}>{col.stats?.q1 || 'N/A'}</td>
                  <td style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontFamily: 'var(--font-family-mono)' }}>{col.stats?.q3 || 'N/A'}</td>
                  <td style={{ 
                    padding: 'var(--space-md)', 
                    color: col.stats ? (Math.abs(parseFloat(col.stats.skewness)) > 1 ? 'var(--warning)' : 'var(--text-secondary)') : 'var(--text-secondary)', 
                    fontFamily: 'var(--font-family-mono)'
                  }}>
                    {col.stats?.skewness || 'N/A'}
                  </td>
                  <td style={{ 
                    padding: 'var(--space-md)', 
                    color: col.stats && col.stats.outliers > 0 ? 'var(--error)' : 'var(--text-secondary)', 
                    fontFamily: 'var(--font-family-mono)'
                  }}>
                    {col.stats?.outliers || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Correlation Matrix */}
      {showCorrelation && numericColumns.length >= 2 && correlationMatrix && (
        <div className="card" style={{ marginTop: 'var(--space-xl)' }}>
          <div className="card-header">
            <h3 className="card-title">Correlation Matrix</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Shows relationships between numeric columns. Values range from -1 (negative correlation) to 1 (positive correlation).
            </p>
          </div>
          <div className="card-content">
            <div style={{ height: '600px' }}>
              <div style={{ 
                height: '600px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                border: '2px dashed var(--border-primary)'
              }}>
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>📊</div>
                  <div>Advanced correlation matrix visualization</div>
                  <div style={{ fontSize: '0.875rem', marginTop: 'var(--space-sm)' }}>Available with premium chart package</div>
                </div>
              </div>
            </div>
            
            {/* Correlation insights */}
            <div style={{ marginTop: 'var(--space-lg)' }}>
              <h4 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>Key Correlations</h4>
              <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                {numericColumns.flatMap(col1 => 
                  numericColumns
                    .filter(col2 => col1.column < col2.column)
                    .map(col2 => ({
                      col1: col1.column,
                      col2: col2.column,
                      correlation: correlationMatrix[col1.column][col2.column]
                    }))
                ).sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
                .slice(0, 5)
                .map(({ col1, col2, correlation }, index) => (
                  <div key={index} style={{
                    padding: 'var(--space-md)',
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-primary)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-primary)' }}>
                        <strong>{col1}</strong> ↔ <strong>{col2}</strong>
                      </span>
                      <span style={{
                        color: Math.abs(correlation) > 0.7 ? 'var(--success)' : Math.abs(correlation) > 0.4 ? 'var(--warning)' : 'var(--text-secondary)',
                        fontFamily: 'var(--font-family-mono)',
                        fontWeight: '600'
                      }}>
                        {correlation.toFixed(3)}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: 'var(--space-xs)' }}>
                      {Math.abs(correlation) > 0.7 ? 'Strong' : Math.abs(correlation) > 0.4 ? 'Moderate' : 'Weak'} 
                      {correlation > 0 ? ' positive' : ' negative'} correlation
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Outlier Analysis */}
      {showOutliers && outlierData.length > 0 && (
        <div className="card" style={{ marginTop: 'var(--space-xl)' }}>
          <div className="card-header">
            <h3 className="card-title">Outlier Analysis</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Data points that fall outside 1.5 × IQR from the quartiles are considered outliers.
            </p>
          </div>
          <div className="card-content">
            <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
              {outlierData.map((data, index) => (
                <div key={index} style={{
                  padding: 'var(--space-lg)',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-primary)'
                }}>
                  <h4 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>
                    {data.column} - {data.outliers.length} outliers detected
                  </h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>Lower Bound:</strong>
                      <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-family-mono)' }}>{data.lowerBound.toFixed(2)}</div>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>Upper Bound:</strong>
                      <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-family-mono)' }}>{data.upperBound.toFixed(2)}</div>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>Q1:</strong>
                      <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-family-mono)' }}>{data.q1.toFixed(2)}</div>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>Q3:</strong>
                      <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-family-mono)' }}>{data.q3.toFixed(2)}</div>
                    </div>
                  </div>
                  
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Outlier Values:</strong>
                    <div style={{ 
                      marginTop: 'var(--space-sm)', 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: 'var(--space-xs)'
                    }}>
                      {data.outliers.slice(0, 20).map((outlier, i) => (
                        <span key={i} style={{
                          padding: '2px 6px',
                          background: 'var(--error)',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '0.8125rem',
                          fontFamily: 'var(--font-family-mono)'
                        }}>
                          {outlier.toFixed(2)}
                        </span>
                      ))}
                      {data.outliers.length > 20 && (
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
                          +{data.outliers.length - 20} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Statistical Test Wizard */}
      {showStatisticalTests && (
        <div style={{ marginTop: 'var(--space-xl)' }}>
          <StatisticalTestWizard
            data={csvData.data}
            headers={csvData.headers}
            onTestComplete={handleTestComplete}
          />
        </div>
      )}
      
      {/* Test Results History */}
      {testResults.length > 0 && (
        <div className="card" style={{ marginTop: 'var(--space-xl)' }}>
          <div className="card-header">
            <h3 className="card-title">Statistical Test Results</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Results from previous statistical tests performed on this dataset.
            </p>
          </div>
          <div className="card-content">
            <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
              {testResults.map((result, index) => (
                <div key={index} style={{
                  padding: 'var(--space-lg)',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-primary)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                    <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>{result.testName}</h4>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '16px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: 'white',
                      background: result.pValue < 0.05 ? 'var(--success)' : 'var(--warning)'
                    }}>
                      {result.pValue < 0.05 ? 'Significant' : 'Not Significant'}
                    </span>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>p-value:</strong>
                      <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-family-mono)' }}>{result.pValue.toFixed(4)}</div>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>Test Statistic:</strong>
                      <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-family-mono)' }}>{result.statistic.toFixed(3)}</div>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>Effect Size:</strong>
                      <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-family-mono)' }}>
                        {result.effect.size.toFixed(3)} ({result.effect.interpretation})
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ padding: 'var(--space-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                    <p style={{ margin: '0 0 var(--space-sm) 0', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                      <strong>Interpretation:</strong> {result.interpretation.statistical}
                    </p>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      <strong>Recommendation:</strong> {result.interpretation.recommendation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

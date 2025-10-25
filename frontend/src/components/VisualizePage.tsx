import { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { handleDataError, validateData } from '../utils/dataProcessing';

type ChartType = 'histogram' | 'scatter' | 'correlation' | 'table';
type HistogramData = { bin: string; count: number; }[];
type ScatterData = { x: number; y: number; [key: string]: any }[];
type CorrelationData = { variable1: string; variable2: string; correlation: number; }[];

export function VisualizePage() {
  const { csvData, currentFile } = useData();
  const [selectedColumn, setSelectedColumn] = useState('');
  const [selectedColumn2, setSelectedColumn2] = useState('');
  const [chartType, setChartType] = useState<ChartType>('histogram');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Local data processing functions
  const processHistogramData = (column: string): HistogramData => {
    if (!csvData) return [];
    
    const values = csvData.data
      .map(row => row[column])
      .filter(val => val !== null && val !== undefined && val !== '')
      .map(val => {
        const num = parseFloat(String(val));
        return isNaN(num) ? String(val).trim() : num;
      });
    
    // Check if numeric or categorical
    const numericValues = values.filter(val => typeof val === 'number') as number[];
    
    if (numericValues.length > values.length * 0.8) {
      // Numeric histogram - create bins
      const min = Math.min(...numericValues);
      const max = Math.max(...numericValues);
      const binCount = Math.min(20, Math.max(5, Math.ceil(Math.sqrt(numericValues.length))));
      const binWidth = (max - min) / binCount;
      
      const bins = Array.from({ length: binCount }, (_, i) => {
        const start = min + i * binWidth;
        const end = start + binWidth;
        return {
          bin: i === binCount - 1 ? `[${start.toFixed(1)}, ${end.toFixed(1)}]` : `[${start.toFixed(1)}, ${end.toFixed(1)})`,
          count: 0,
          start,
          end
        };
      });
      
      numericValues.forEach(val => {
        const binIndex = val === max ? binCount - 1 : Math.floor((val - min) / binWidth);
        if (binIndex >= 0 && binIndex < binCount) {
          bins[binIndex].count++;
        }
      });
      
      return bins;
    } else {
      // Categorical histogram - count frequencies
      const counts = new Map<string, number>();
      values.forEach(val => {
        const key = String(val);
        counts.set(key, (counts.get(key) || 0) + 1);
      });
      
      return Array.from(counts.entries())
        .map(([bin, count]) => ({ bin, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20); // Top 20 categories
    }
  };
  
  const processScatterData = (xColumn: string, yColumn: string): ScatterData => {
    if (!csvData) return [];
    
    return csvData.data
      .map(row => {
        const x = parseFloat(String(row[xColumn]));
        const y = parseFloat(String(row[yColumn]));
        return isNaN(x) || isNaN(y) ? null : { x, y, ...row };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .slice(0, 1000); // Limit to 1000 points for performance
  };
  
  const processCorrelationData = (): CorrelationData => {
    if (!csvData) return [];
    
    const numericColumns = csvData.headers.filter(header => {
      const values = csvData.data.map(row => row[header]).filter(v => v && String(v).trim());
      const numericValues = values.map(v => parseFloat(String(v))).filter(v => !isNaN(v));
      return numericValues.length > values.length * 0.8;
    });
    
    const correlations: CorrelationData = [];
    
    for (let i = 0; i < numericColumns.length; i++) {
      for (let j = i + 1; j < numericColumns.length; j++) {
        const col1 = numericColumns[i];
        const col2 = numericColumns[j];
        
        const pairs = csvData.data
          .map(row => {
            const x = parseFloat(String(row[col1]));
            const y = parseFloat(String(row[col2]));
            return isNaN(x) || isNaN(y) ? null : [x, y];
          })
          .filter((pair): pair is [number, number] => pair !== null);
        
        if (pairs.length > 1) {
          const correlation = calculateCorrelation(pairs);
          correlations.push({ variable1: col1, variable2: col2, correlation });
        }
      }
    }
    
    return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  };
  
  const calculateCorrelation = (pairs: [number, number][]): number => {
    const n = pairs.length;
    if (n === 0) return 0;
    
    const sumX = pairs.reduce((sum, [x]) => sum + x, 0);
    const sumY = pairs.reduce((sum, [, y]) => sum + y, 0);
    const sumXY = pairs.reduce((sum, [x, y]) => sum + x * y, 0);
    const sumX2 = pairs.reduce((sum, [x]) => sum + x * x, 0);
    const sumY2 = pairs.reduce((sum, [, y]) => sum + y * y, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  };
  
  // Compute visualization data
  const visualizationData = useMemo(() => {
    if (!csvData || !selectedColumn) return null;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Validate data first
      const validation = validateData(csvData.data);
      if (!validation.isValid) {
        const errorMessage = 'Data validation failed: ' + validation.errors.join(', ');
        setError(errorMessage);
        setIsProcessing(false);
        return null;
      }
      
      let result;
      switch (chartType) {
        case 'histogram':
          result = { type: 'histogram', data: processHistogramData(selectedColumn) };
          break;
        case 'scatter':
          if (!selectedColumn2) {
            setIsProcessing(false);
            return null;
          }
          result = { type: 'scatter', data: processScatterData(selectedColumn, selectedColumn2) };
          break;
        case 'correlation':
          result = { type: 'correlation', data: processCorrelationData() };
          break;
        case 'table':
          result = { type: 'table', data: csvData.data.slice(0, 100) }; // First 100 rows
          break;
        default:
          setIsProcessing(false);
          return null;
      }
      
      setIsProcessing(false);
      return result;
    } catch (err) {
      const errorMessage = handleDataError(err, 'data visualization processing');
      setError(errorMessage);
      setIsProcessing(false);
      return null;
    }
  }, [csvData, selectedColumn, selectedColumn2, chartType]);
  
  if (!csvData || !currentFile) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Data Visualizations</h1>
          <p className="page-description">Create charts and graphs from your data</p>
        </div>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">No Data Available</h3>
          </div>
          <div className="card-content">
            <p>Upload a CSV file first to create beautiful visualizations and charts.</p>
          </div>
        </div>
      </div>
    );
  }
  
  const numericColumns = csvData.headers.filter(header => {
    const values = csvData.data.map(row => row[header]).filter(v => v && typeof v === 'string' ? v.trim() : String(v).trim());
    const numericValues = values.map(v => parseFloat(String(v))).filter(v => !isNaN(v));
    return numericValues.length > 0;
  });
  
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Data Visualizations</h1>
        <p className="page-description">Create charts and graphs from your data</p>
      </div>
      
      {/* Chart Builder */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="card-header">
          <h3 className="card-title">Chart Builder</h3>
        </div>
        <div className="card-content">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-sm)', fontWeight: '600', color: 'var(--text-primary)' }}>Chart Type:</label>
              <select 
                value={chartType} 
                onChange={(e) => setChartType(e.target.value as ChartType)}
                style={{ 
                  width: '100%',
                  padding: 'var(--space-md)', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border-primary)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem'
                }}
              >
                <option value="table">Data Table</option>
                <option value="histogram">Histogram</option>
                <option value="scatter">Scatter Plot</option>
                <option value="correlation">Correlation Heatmap</option>
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-sm)', fontWeight: '600', color: 'var(--text-primary)' }}>Primary Column:</label>
              <select 
                value={selectedColumn} 
                onChange={(e) => setSelectedColumn(e.target.value)}
                style={{ 
                  width: '100%',
                  padding: 'var(--space-md)', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border-primary)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem'
                }}
              >
                <option value="">Choose a column...</option>
                {csvData.headers.map(header => (
                  <option key={header} value={header}>{header}</option>
                ))}
              </select>
            </div>
            
            {chartType === 'scatter' && (
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-sm)', fontWeight: '600', color: 'var(--text-primary)' }}>Secondary Column:</label>
                <select 
                  value={selectedColumn2} 
                  onChange={(e) => setSelectedColumn2(e.target.value)}
                  style={{ 
                    width: '100%',
                    padding: 'var(--space-md)', 
                    borderRadius: 'var(--radius-md)', 
                    border: '1px solid var(--border-primary)',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="">Choose second column...</option>
                  {csvData.headers.map(header => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          {/* Visualization Display */}
          {error && (
            <div className="status-message status-error" style={{ marginTop: 'var(--space-lg)' }}>
              <div style={{ fontSize: '1.5rem' }}>⚠️</div>
              <div>
                <strong>Visualization Error:</strong>
                <p style={{ margin: '0', marginTop: 'var(--space-xs)' }}>{error}</p>
              </div>
            </div>
          )}
          
          {isProcessing && (
            <div style={{ 
              marginTop: 'var(--space-lg)',
              textAlign: 'center',
              padding: 'var(--space-xl)'
            }}>
              <div className="loading-spinner" style={{ margin: '0 auto var(--space-md) auto' }}></div>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Processing visualization data...</p>
            </div>
          )}
          
          {/* Render Charts */}
          {visualizationData && visualizationData.type === 'histogram' && (
            <div style={{ marginTop: 'var(--space-lg)' }}>
              <h4 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>
                Histogram - {selectedColumn}
              </h4>
              <div style={{
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-primary)',
                padding: 'var(--space-lg)',
                height: '400px'
              }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={visualizationData.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" />
                    <XAxis 
                      dataKey="bin" 
                      stroke="var(--text-secondary)" 
                      fontSize={12}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis stroke="var(--text-secondary)" fontSize={12} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-primary)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)'
                      }}
                    />
                    <Bar dataKey="count" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p style={{ 
                marginTop: 'var(--space-md)', 
                fontSize: '0.875rem', 
                color: 'var(--text-secondary)',
                textAlign: 'center'
              }}>
                Showing distribution of {selectedColumn} ({visualizationData.data.length} bins, {(visualizationData.data as HistogramData).reduce((sum, bin) => sum + bin.count, 0)} total values)
              </p>
            </div>
          )}
          
          {visualizationData && visualizationData.type === 'scatter' && (
            <div style={{ marginTop: 'var(--space-lg)' }}>
              <h4 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>
                Scatter Plot - {selectedColumn} vs {selectedColumn2}
              </h4>
              <div style={{
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-primary)',
                padding: 'var(--space-lg)',
                height: '400px'
              }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart data={visualizationData.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" />
                    <XAxis 
                      type="number" 
                      dataKey="x" 
                      name={selectedColumn}
                      stroke="var(--text-secondary)" 
                      fontSize={12}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="y" 
                      name={selectedColumn2}
                      stroke="var(--text-secondary)" 
                      fontSize={12}
                    />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      contentStyle={{
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-primary)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)'
                      }}
                      formatter={(value: any, name: string) => [
                        typeof value === 'number' ? value.toFixed(3) : value,
                        name === 'x' ? selectedColumn : name === 'y' ? selectedColumn2 : name
                      ]}
                    />
                    <Scatter dataKey="y" fill="var(--accent-primary)" fillOpacity={0.6} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <p style={{ 
                marginTop: 'var(--space-md)', 
                fontSize: '0.875rem', 
                color: 'var(--text-secondary)',
                textAlign: 'center'
              }}>
                Scatter plot showing relationship between {selectedColumn} and {selectedColumn2} ({visualizationData.data.length} data points)
              </p>
            </div>
          )}
          
          {visualizationData && visualizationData.type === 'correlation' && (
            <div style={{ marginTop: 'var(--space-lg)' }}>
              <h4 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>
                Correlation Analysis
              </h4>
              <div style={{
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-primary)',
                padding: 'var(--space-lg)'
              }}>
                {visualizationData.data.length > 0 ? (
                  <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-elevated)' }}>
                        <tr>
                          <th style={{ padding: 'var(--space-md)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>Variable 1</th>
                          <th style={{ padding: 'var(--space-md)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>Variable 2</th>
                          <th style={{ padding: 'var(--space-md)', textAlign: 'right', borderBottom: '1px solid var(--border-subtle)' }}>Correlation</th>
                          <th style={{ padding: 'var(--space-md)', textAlign: 'center', borderBottom: '1px solid var(--border-subtle)' }}>Strength</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(visualizationData.data as CorrelationData).map((item, index) => {
                          const absCorr = Math.abs(item.correlation);
                          const strength = absCorr > 0.7 ? 'Strong' : absCorr > 0.3 ? 'Moderate' : 'Weak';
                          const color = absCorr > 0.7 ? 'var(--success)' : absCorr > 0.3 ? 'var(--warning)' : 'var(--text-secondary)';
                          
                          return (
                            <tr key={index} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                              <td style={{ padding: 'var(--space-md)', fontFamily: 'var(--font-family-mono)' }}>{item.variable1}</td>
                              <td style={{ padding: 'var(--space-md)', fontFamily: 'var(--font-family-mono)' }}>{item.variable2}</td>
                              <td style={{ 
                                padding: 'var(--space-md)', 
                                textAlign: 'right', 
                                fontFamily: 'var(--font-family-mono)',
                                fontWeight: '600',
                                color
                              }}>
                                {item.correlation.toFixed(3)}
                              </td>
                              <td style={{ 
                                padding: 'var(--space-md)', 
                                textAlign: 'center',
                                color,
                                fontWeight: '500'
                              }}>
                                {strength}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ textAlign: 'center', color: 'var(--text-secondary)', margin: 0 }}>
                    No numeric columns found for correlation analysis.
                  </p>
                )}
              </div>
              <p style={{ 
                marginTop: 'var(--space-md)', 
                fontSize: '0.875rem', 
                color: 'var(--text-secondary)',
                textAlign: 'center'
              }}>
                Correlation coefficients range from -1 (perfect negative) to +1 (perfect positive). 
                Values near 0 indicate little to no linear relationship.
              </p>
            </div>
          )}
          
          
          {/* Data Table View */}
          {chartType === 'table' && visualizationData && visualizationData.type === 'table' && (
            <div style={{ marginTop: 'var(--space-lg)' }}>
              <h4 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>
                Data Table - First 100 Rows
              </h4>
              <div style={{
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-primary)',
                overflow: 'hidden'
              }}>
                <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-elevated)' }}>
                      <tr>
                        {csvData.headers.map(header => (
                          <th key={header} style={{ 
                            padding: 'var(--space-md)', 
                            textAlign: 'left', 
                            borderBottom: '1px solid var(--border-subtle)',
                            fontWeight: '600'
                          }}>
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(visualizationData.data as Record<string, any>[]).map((row, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          {csvData.headers.map(header => (
                            <td key={header} style={{ 
                              padding: 'var(--space-md)', 
                              fontFamily: 'var(--font-family-mono)',
                              fontSize: '0.875rem'
                            }}>
                              {row[header] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <p style={{ 
                marginTop: 'var(--space-md)', 
                fontSize: '0.875rem', 
                color: 'var(--text-secondary)',
                textAlign: 'center'
              }}>
                Showing first 100 rows of {csvData.data.length} total rows, {csvData.headers.length} columns
              </p>
            </div>
          )}
          
          {!visualizationData && !error && chartType !== 'table' && (
            <div style={{ 
              textAlign: 'center', 
              padding: 'var(--space-2xl)',
              color: 'var(--text-tertiary)',
              marginTop: 'var(--space-lg)'
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-md)', opacity: 0.5 }}>📊</div>
              <p>
                {!selectedColumn ? 'Select a column to create visualizations' :
                 chartType === 'scatter' && !selectedColumn2 ? 'Select a second column for scatter plot' :
                 'Choose your visualization settings above'}
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Available Columns */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Available Columns</h3>
        </div>
        <div className="card-content">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
            {csvData.headers.map(header => {
              const isNumeric = numericColumns.includes(header);
              return (
                <div key={header} style={{
                  padding: 'var(--space-md)',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-primary)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)'
                }} onClick={() => setSelectedColumn(header)}>
                  <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: 'var(--space-xs)' }}>
                    {header}
                  </div>
                  <span style={{ 
                    padding: '2px 6px', 
                    borderRadius: '8px', 
                    fontSize: '0.75rem',
                    backgroundColor: isNumeric ? 'var(--success)' : 'var(--warning)',
                    color: 'white',
                    fontWeight: '500'
                  }}>
                    {isNumeric ? 'Numeric' : 'Text'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

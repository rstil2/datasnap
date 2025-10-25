import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import DataCleaningService, { DataQualityIssue, CleaningRecommendation } from '../../services/DataCleaningService';
import { FileParseResult } from '../../services/FileParserService';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  Database, 
  Eye, 
  Zap,
  BarChart3,
  Activity,
  Filter,
  RefreshCw,
  Download,
  Settings
} from 'lucide-react';
import toast from 'react-hot-toast';

interface QualityMetric {
  label: string;
  value: number;
  percentage: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  icon: React.ReactNode;
  description: string;
}

interface DataQualityDashboardProps {
  onCleaningApplied?: (cleanedData: Record<string, any>[]) => void;
  compact?: boolean;
}

export const DataQualityDashboard: React.FC<DataQualityDashboardProps> = ({ 
  onCleaningApplied, 
  compact = false 
}) => {
  const { csvData, currentFile } = useData();
  const [qualityAnalysis, setQualityAnalysis] = useState<{
    issues: DataQualityIssue[];
    recommendations: CleaningRecommendation[];
    overallScore: number;
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Analyze data quality
  const analyzeDataQuality = useCallback(async () => {
    if (!csvData?.data || csvData.data.length === 0) return;

    setIsAnalyzing(true);
    try {
      // Simulate the FileParseResult structure that DataCleaningService expects
      const parseResult: FileParseResult = {
        data: csvData.data,
        headers: csvData.headers,
        schema: {
          columns: csvData.headers.map(header => ({
            name: header,
            type: inferColumnType(csvData.data.map(row => row[header])),
            nullable: csvData.data.some(row => row[header] == null || row[header] === ''),
            unique: new Set(csvData.data.map(row => row[header])).size === csvData.data.length
          }))
        },
        metadata: {
          rowCount: csvData.data.length,
          columnCount: csvData.headers.length,
          fileSize: 0,
          parseTime: 0
        }
      };

      const analysis = DataCleaningService.analyzeDataQuality(parseResult);
      setQualityAnalysis(analysis);
    } catch (error) {
      console.error('Error analyzing data quality:', error);
      toast.error('Failed to analyze data quality');
    } finally {
      setIsAnalyzing(false);
    }
  }, [csvData]);

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh && refreshInterval) {
      const interval = setInterval(analyzeDataQuality, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, analyzeDataQuality]);

  // Initial analysis
  useEffect(() => {
    if (csvData?.data && csvData.data.length > 0) {
      analyzeDataQuality();
    }
  }, [csvData, analyzeDataQuality]);

  // Calculate quality metrics
  const qualityMetrics = useMemo((): QualityMetric[] => {
    if (!qualityAnalysis || !csvData) return [];

    const totalRows = csvData.rowCount;
    const totalColumns = csvData.columnCount;
    const totalCells = totalRows * totalColumns;

    const criticalIssues = qualityAnalysis.issues.filter(i => i.severity === 'critical').length;
    const highIssues = qualityAnalysis.issues.filter(i => i.severity === 'high').length;
    const mediumIssues = qualityAnalysis.issues.filter(i => i.severity === 'medium').length;

    const missingCells = qualityAnalysis.issues
      .filter(i => i.type === 'missing_values')
      .reduce((sum, i) => sum + i.affectedRows, 0);

    const duplicateRows = qualityAnalysis.issues
      .filter(i => i.type === 'duplicates')
      .reduce((sum, i) => sum + i.affectedRows, 0);

    const outliers = qualityAnalysis.issues
      .filter(i => i.type === 'outliers')
      .reduce((sum, i) => sum + i.affectedRows, 0);

    return [
      {
        label: 'Overall Quality',
        value: qualityAnalysis.overallScore,
        percentage: qualityAnalysis.overallScore,
        status: qualityAnalysis.overallScore >= 90 ? 'excellent' : 
               qualityAnalysis.overallScore >= 75 ? 'good' : 
               qualityAnalysis.overallScore >= 50 ? 'warning' : 'critical',
        icon: <TrendingUp size={20} />,
        description: 'Comprehensive data quality assessment'
      },
      {
        label: 'Data Completeness',
        value: totalCells - missingCells,
        percentage: ((totalCells - missingCells) / totalCells) * 100,
        status: missingCells === 0 ? 'excellent' : 
               missingCells < totalCells * 0.05 ? 'good' : 
               missingCells < totalCells * 0.15 ? 'warning' : 'critical',
        icon: <Database size={20} />,
        description: 'Percentage of non-missing values'
      },
      {
        label: 'Data Uniqueness',
        value: totalRows - duplicateRows,
        percentage: duplicateRows === 0 ? 100 : ((totalRows - duplicateRows) / totalRows) * 100,
        status: duplicateRows === 0 ? 'excellent' : 
               duplicateRows < totalRows * 0.01 ? 'good' : 
               duplicateRows < totalRows * 0.05 ? 'warning' : 'critical',
        icon: <CheckCircle size={20} />,
        description: 'Percentage of unique records'
      },
      {
        label: 'Data Consistency',
        value: qualityAnalysis.issues.filter(i => i.type === 'inconsistent_format').length,
        percentage: Math.max(0, 100 - (qualityAnalysis.issues.filter(i => i.type === 'inconsistent_format').length / totalColumns) * 100),
        status: qualityAnalysis.issues.filter(i => i.type === 'inconsistent_format').length === 0 ? 'excellent' : 
               qualityAnalysis.issues.filter(i => i.type === 'inconsistent_format').length < totalColumns * 0.1 ? 'good' : 'warning',
        icon: <Activity size={20} />,
        description: 'Format consistency across columns'
      }
    ];
  }, [qualityAnalysis, csvData]);

  // Apply selected cleaning fixes
  const applyCleaningFixes = async () => {
    if (!qualityAnalysis || !csvData?.data || selectedIssues.length === 0) return;

    const fixes = selectedIssues.map(issueId => {
      const issue = qualityAnalysis.issues.find(i => i.id === issueId);
      return issue ? {
        issueId,
        method: issue.suggestedFix.method,
        parameters: {}
      } : null;
    }).filter(Boolean) as Array<{ issueId: string; method: string; parameters: any }>;

    try {
      const result = await DataCleaningService.applyCleaningFixes(csvData.data, fixes);
      
      toast.success(`Applied ${fixes.length} cleaning fixes. Quality improved by ${result.qualityImprovement.improvement.toFixed(1)}%`);
      
      if (onCleaningApplied) {
        onCleaningApplied(result.cleanedData);
      }
      
      // Re-analyze after cleaning
      setTimeout(analyzeDataQuality, 1000);
    } catch (error) {
      console.error('Error applying cleaning fixes:', error);
      toast.error('Failed to apply cleaning fixes');
    }
  };

  const getStatusColor = (status: QualityMetric['status']) => {
    switch (status) {
      case 'excellent': return 'var(--success)';
      case 'good': return 'var(--info)';
      case 'warning': return 'var(--warning)';
      case 'critical': return 'var(--error)';
      default: return 'var(--text-secondary)';
    }
  };

  const getStatusIcon = (status: QualityMetric['status']) => {
    switch (status) {
      case 'excellent': return <CheckCircle size={16} style={{ color: 'var(--success)' }} />;
      case 'good': return <CheckCircle size={16} style={{ color: 'var(--info)' }} />;
      case 'warning': return <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />;
      case 'critical': return <XCircle size={16} style={{ color: 'var(--error)' }} />;
      default: return null;
    }
  };

  if (!csvData || !currentFile) {
    return (
      <div style={{ 
        padding: 'var(--space-xl)', 
        textAlign: 'center',
        background: 'var(--bg-elevated)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-primary)'
      }}>
        <Database size={48} style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-md)' }} />
        <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-sm)' }}>No Data Loaded</h3>
        <p style={{ color: 'var(--text-secondary)' }}>Upload a dataset to begin data quality analysis</p>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 'var(--space-lg)',
      padding: compact ? 'var(--space-md)' : 'var(--space-lg)'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 'var(--space-md)'
      }}>
        <div>
          <h2 style={{ 
            fontSize: compact ? '1.25rem' : '1.5rem',
            fontWeight: 'var(--font-weight-bold)', 
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-xs)'
          }}>
            Data Quality Dashboard
          </h2>
          <p style={{ 
            color: 'var(--text-secondary)', 
            fontSize: '0.875rem' 
          }}>
            {currentFile.filename} • {csvData.rowCount.toLocaleString()} rows • {csvData.columnCount} columns
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              padding: 'var(--space-sm) var(--space-md)',
              background: autoRefresh ? 'var(--accent-primary)' : 'var(--bg-secondary)',
              color: autoRefresh ? 'white' : 'var(--text-primary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-xs)'
            }}
          >
            <RefreshCw size={14} />
            Auto Refresh
          </button>
          
          {/* Manual refresh */}
          <button
            onClick={analyzeDataQuality}
            disabled={isAnalyzing}
            style={{
              padding: 'var(--space-sm) var(--space-md)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-md)',
              cursor: isAnalyzing ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-xs)',
              opacity: isAnalyzing ? 0.6 : 1
            }}
          >
            <RefreshCw size={14} style={{ animation: isAnalyzing ? 'spin 1s linear infinite' : 'none' }} />
            Analyze
          </button>
        </div>
      </div>

      {/* Quality Metrics */}
      {qualityMetrics.length > 0 && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: compact ? '1fr 1fr' : 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: 'var(--space-md)' 
        }}>
          {qualityMetrics.map((metric, index) => (
            <div
              key={index}
              style={{
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-primary)',
                padding: 'var(--space-lg)',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <div style={{ color: getStatusColor(metric.status) }}>
                    {metric.icon}
                  </div>
                  <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-primary)' }}>
                    {metric.label}
                  </span>
                </div>
                {getStatusIcon(metric.status)}
              </div>
              
              <div style={{ marginBottom: 'var(--space-sm)' }}>
                <div style={{ 
                  fontSize: '1.75rem', 
                  fontWeight: 'var(--font-weight-bold)', 
                  color: getStatusColor(metric.status) 
                }}>
                  {metric.percentage.toFixed(1)}%
                </div>
              </div>
              
              <div style={{ 
                width: '100%', 
                height: '6px', 
                background: 'var(--bg-tertiary)', 
                borderRadius: '3px',
                overflow: 'hidden',
                marginBottom: 'var(--space-sm)'
              }}>
                <div
                  style={{
                    width: `${Math.min(100, metric.percentage)}%`,
                    height: '100%',
                    background: getStatusColor(metric.status),
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
              
              <p style={{ 
                fontSize: '0.75rem', 
                color: 'var(--text-secondary)', 
                lineHeight: '1.4' 
              }}>
                {metric.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Issues and Recommendations */}
      {qualityAnalysis && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: compact ? '1fr' : '1fr 1fr', 
          gap: 'var(--space-lg)' 
        }}>
          {/* Issues */}
          <div style={{
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-primary)',
            padding: 'var(--space-lg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-primary)' }}>
                Data Quality Issues ({qualityAnalysis.issues.length})
              </h3>
              <button
                onClick={() => setShowDetails(!showDetails)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-primary)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-xs)'
                }}
              >
                <Eye size={14} />
                {showDetails ? 'Hide Details' : 'Show Details'}
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', maxHeight: '400px', overflow: 'auto' }}>
              {qualityAnalysis.issues.map((issue) => (
                <div
                  key={issue.id}
                  style={{
                    padding: 'var(--space-md)',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${
                      issue.severity === 'critical' ? 'var(--error)' :
                      issue.severity === 'high' ? 'var(--warning)' :
                      'var(--border-primary)'
                    }`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <input
                        type="checkbox"
                        checked={selectedIssues.includes(issue.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIssues([...selectedIssues, issue.id]);
                          } else {
                            setSelectedIssues(selectedIssues.filter(id => id !== issue.id));
                          }
                        }}
                        disabled={!issue.autoFixable}
                      />
                      <div>
                        <span style={{ 
                          fontWeight: 'var(--font-weight-medium)', 
                          color: 'var(--text-primary)' 
                        }}>
                          {issue.column}
                        </span>
                        <span style={{
                          marginLeft: 'var(--space-sm)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          background: 
                            issue.severity === 'critical' ? 'var(--error-light)' :
                            issue.severity === 'high' ? 'var(--warning-light)' :
                            'var(--info-light)',
                          color:
                            issue.severity === 'critical' ? 'var(--error)' :
                            issue.severity === 'high' ? 'var(--warning)' :
                            'var(--info)'
                        }}>
                          {issue.severity}
                        </span>
                      </div>
                    </div>
                    
                    {issue.autoFixable && (
                      <Zap size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
                    )}
                  </div>
                  
                  <p style={{ 
                    fontSize: '0.875rem', 
                    color: 'var(--text-secondary)', 
                    marginBottom: 'var(--space-sm)' 
                  }}>
                    {issue.description}
                  </p>
                  
                  {showDetails && (
                    <div style={{ 
                      padding: 'var(--space-sm)', 
                      background: 'var(--bg-tertiary)', 
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)'
                    }}>
                      <div><strong>Affected:</strong> {issue.affectedRows} rows ({issue.affectedPercentage.toFixed(1)}%)</div>
                      <div><strong>Suggested Fix:</strong> {issue.suggestedFix.description}</div>
                      <div><strong>Confidence:</strong> {(issue.suggestedFix.confidence * 100).toFixed(0)}%</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div style={{
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-primary)',
            padding: 'var(--space-lg)'
          }}>
            <h3 style={{ 
              fontSize: '1.125rem', 
              fontWeight: 'var(--font-weight-semibold)', 
              color: 'var(--text-primary)',
              marginBottom: 'var(--space-md)'
            }}>
              Recommendations
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {qualityAnalysis.recommendations.map((rec, index) => (
                <div
                  key={rec.id}
                  style={{
                    padding: 'var(--space-md)',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-primary)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                    <h4 style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--text-primary)' }}>
                      {rec.title}
                    </h4>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      background: 'var(--success-light)',
                      color: 'var(--success)'
                    }}>
                      +{rec.estimatedImprovement}% improvement
                    </span>
                  </div>
                  
                  <p style={{ 
                    fontSize: '0.875rem', 
                    color: 'var(--text-secondary)', 
                    lineHeight: '1.4' 
                  }}>
                    {rec.description}
                  </p>
                </div>
              ))}
              
              {/* Apply fixes button */}
              {selectedIssues.length > 0 && (
                <button
                  onClick={applyCleaningFixes}
                  style={{
                    width: '100%',
                    padding: 'var(--space-md)',
                    background: 'var(--accent-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 'var(--font-weight-semibold)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 'var(--space-sm)'
                  }}
                >
                  <Zap size={16} />
                  Apply {selectedIssues.length} Fix{selectedIssues.length > 1 ? 'es' : ''}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to infer column type
const inferColumnType = (values: any[]): string => {
  const nonNullValues = values.filter(v => v != null && v !== '');
  if (nonNullValues.length === 0) return 'text';
  
  const numericValues = nonNullValues.filter(v => !isNaN(parseFloat(String(v))));
  if (numericValues.length / nonNullValues.length > 0.8) return 'numeric';
  
  const dateValues = nonNullValues.filter(v => !isNaN(Date.parse(String(v))));
  if (dateValues.length / nonNullValues.length > 0.7) return 'datetime';
  
  return 'text';
};

export default DataQualityDashboard;
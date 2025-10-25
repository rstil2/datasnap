import React, { useState } from 'react';
import { DataInsight, InsightGenerationResult } from '../../services/ai/InsightGenerator';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Link2, 
  Target, 
  Info,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  CheckCircle,
  AlertCircle,
  XCircle,
  BarChart3,
  Zap,
  Star
} from 'lucide-react';

interface AIInsightsPanelProps {
  insights: InsightGenerationResult;
  isLoading?: boolean;
  onInsightClick?: (insight: DataInsight) => void;
  compact?: boolean;
}

const InsightTypeIcon = ({ type, priority }: { type: DataInsight['type'], priority: DataInsight['priority'] }) => {
  const iconProps = { size: 16 };
  
  const getColor = () => {
    switch (priority) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#d97706';
      case 'low': return '#65a30d';
      default: return '#6b7280';
    }
  };

  const color = getColor();
  
  switch (type) {
    case 'trend':
      return <TrendingUp {...iconProps} color={color} />;
    case 'anomaly':
      return <AlertTriangle {...iconProps} color={color} />;
    case 'correlation':
      return <Link2 {...iconProps} color={color} />;
    case 'pattern':
      return <BarChart3 {...iconProps} color={color} />;
    case 'recommendation':
      return <Lightbulb {...iconProps} color={color} />;
    case 'summary':
      return <Info {...iconProps} color={color} />;
    default:
      return <Brain {...iconProps} color={color} />;
  }
};

const PriorityBadge = ({ priority, confidence }: { priority: DataInsight['priority'], confidence: number }) => {
  const getBadgeStyle = () => {
    switch (priority) {
      case 'critical':
        return {
          background: '#fef2f2',
          color: '#dc2626',
          border: '1px solid #fecaca'
        };
      case 'high':
        return {
          background: '#fff7ed',
          color: '#ea580c',
          border: '1px solid #fed7aa'
        };
      case 'medium':
        return {
          background: '#fffbeb',
          color: '#d97706',
          border: '1px solid #fde68a'
        };
      case 'low':
        return {
          background: '#f7fee7',
          color: '#65a30d',
          border: '1px solid #d9f99d'
        };
      default:
        return {
          background: '#f9fafb',
          color: '#6b7280',
          border: '1px solid #e5e7eb'
        };
    }
  };

  const style = getBadgeStyle();

  return (
    <div style={{
      ...style,
      padding: '2px 6px',
      borderRadius: '12px',
      fontSize: '0.7rem',
      fontWeight: '600',
      textTransform: 'uppercase',
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    }}>
      {priority}
      <span style={{ 
        fontSize: '0.65rem', 
        fontWeight: '400',
        opacity: 0.8 
      }}>
        {Math.round(confidence * 100)}%
      </span>
    </div>
  );
};

const ConfidenceBar = ({ confidence }: { confidence: number }) => {
  const getColor = () => {
    if (confidence > 0.8) return '#10b981';
    if (confidence > 0.6) return '#f59e0b';
    if (confidence > 0.4) return '#ef4444';
    return '#6b7280';
  };

  return (
    <div style={{
      width: '100%',
      height: '4px',
      background: '#e5e7eb',
      borderRadius: '2px',
      overflow: 'hidden'
    }}>
      <div style={{
        width: `${confidence * 100}%`,
        height: '100%',
        background: getColor(),
        borderRadius: '2px',
        transition: 'width 0.3s ease'
      }} />
    </div>
  );
};

const InsightCard = ({ 
  insight, 
  isExpanded, 
  onToggle, 
  onClick 
}: { 
  insight: DataInsight;
  isExpanded: boolean;
  onToggle: () => void;
  onClick?: () => void;
}) => {
  return (
    <div 
      style={{
        background: 'var(--bg-elevated)',
        border: `1px solid var(--border-primary)`,
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-md)',
        marginBottom: 'var(--space-sm)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative'
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent-primary)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-primary)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'flex-start', 
        justifyContent: 'space-between',
        marginBottom: 'var(--space-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flex: 1 }}>
          <InsightTypeIcon type={insight.type} priority={insight.priority} />
          <div style={{ flex: 1 }}>
            <h4 style={{ 
              margin: 0, 
              fontSize: '0.875rem', 
              fontWeight: '600',
              color: 'var(--text-primary)',
              lineHeight: '1.3'
            }}>
              {insight.title}
            </h4>
          </div>
          <PriorityBadge priority={insight.priority} confidence={insight.confidence} />
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px',
            color: 'var(--text-secondary)',
            marginLeft: 'var(--space-sm)'
          }}
        >
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {/* Description */}
      <p style={{ 
        margin: '0 0 var(--space-sm) 0', 
        fontSize: '0.8rem', 
        color: 'var(--text-secondary)',
        lineHeight: '1.4'
      }}>
        {insight.description}
      </p>

      {/* Confidence bar */}
      <div style={{ marginBottom: 'var(--space-sm)' }}>
        <ConfidenceBar confidence={insight.confidence} />
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div style={{ 
          borderTop: '1px solid var(--border-secondary)',
          paddingTop: 'var(--space-sm)',
          marginTop: 'var(--space-sm)'
        }}>
          {/* Explanation */}
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <h5 style={{ 
              margin: '0 0 var(--space-xs) 0',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: 'var(--text-primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Explanation
            </h5>
            <p style={{ 
              margin: 0, 
              fontSize: '0.8rem', 
              color: 'var(--text-secondary)',
              lineHeight: '1.5'
            }}>
              {insight.explanation}
            </p>
          </div>

          {/* Data points */}
          {insight.dataPoints && (
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <h5 style={{ 
                margin: '0 0 var(--space-xs) 0',
                fontSize: '0.75rem',
                fontWeight: '600',
                color: 'var(--text-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Data Details
              </h5>
              <div style={{
                background: 'var(--bg-secondary)',
                padding: 'var(--space-sm)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem'
              }}>
                {insight.dataPoints.position !== undefined && (
                  <div>Position: {insight.dataPoints.position + 1}</div>
                )}
                {insight.dataPoints.value !== undefined && (
                  <div>Value: {insight.dataPoints.value}</div>
                )}
                {insight.dataPoints.context && (
                  <div>Context: {insight.dataPoints.context}</div>
                )}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {insight.recommendations && insight.recommendations.length > 0 && (
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <h5 style={{ 
                margin: '0 0 var(--space-xs) 0',
                fontSize: '0.75rem',
                fontWeight: '600',
                color: 'var(--text-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Recommendations
              </h5>
              <ul style={{ 
                margin: 0, 
                paddingLeft: 'var(--space-md)',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)'
              }}>
                {insight.recommendations.map((rec, index) => (
                  <li key={index} style={{ marginBottom: 'var(--space-xs)' }}>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Visual suggestion */}
          {insight.visualSuggestion && (
            <div style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-secondary)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)'
            }}>
              <BarChart3 size={14} color="var(--accent-primary)" />
              <div style={{ fontSize: '0.8rem' }}>
                <strong>Suggested chart:</strong> {insight.visualSuggestion.chartType}
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: 'var(--text-secondary)',
                  marginTop: '2px'
                }}>
                  {insight.visualSuggestion.reason}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export function AIInsightsPanel({ insights, isLoading, onInsightClick, compact = false }: AIInsightsPanelProps) {
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'all' | 'critical' | 'trends' | 'correlations'>('all');

  const toggleInsight = (insightId: string) => {
    const newExpanded = new Set(expandedInsights);
    if (newExpanded.has(insightId)) {
      newExpanded.delete(insightId);
    } else {
      newExpanded.add(insightId);
    }
    setExpandedInsights(newExpanded);
  };

  const getFilteredInsights = () => {
    switch (activeTab) {
      case 'critical':
        return insights.insights.filter(i => i.priority === 'critical' || i.priority === 'high');
      case 'trends':
        return insights.insights.filter(i => i.type === 'trend' || i.type === 'pattern');
      case 'correlations':
        return insights.insights.filter(i => i.type === 'correlation');
      default:
        return insights.insights;
    }
  };

  const filteredInsights = getFilteredInsights();

  if (isLoading) {
    return (
      <div className="card" style={{ height: compact ? '200px' : '400px' }}>
        <div className="card-header">
          <h3 className="card-title" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
            <Brain size={16} />
            AI Insights
          </h3>
        </div>
        <div className="card-content" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: '100%'
        }}>
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ 
              width: '32px', 
              height: '32px', 
              border: '3px solid var(--border-primary)',
              borderTop: '3px solid var(--accent-primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto var(--space-md)'
            }} />
            <p>Analyzing your data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ height: compact ? 'auto' : '500px' }} data-testid="ai-insights-panel">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <h3 className="card-title" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
            <Brain size={16} />
            AI Insights
            {insights.insights.length > 0 && (
              <span style={{
                background: 'var(--accent-primary)',
                color: 'white',
                fontSize: '0.7rem',
                fontWeight: '600',
                padding: '2px 6px',
                borderRadius: '10px',
                marginLeft: 'var(--space-xs)'
              }}>
                {insights.insights.length}
              </span>
            )}
          </h3>
          
          <div style={{ 
            fontSize: '0.75rem', 
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-xs)'
          }}>
            <Star size={12} />
            {Math.round(insights.confidence * 100)}% confidence
          </div>
        </div>
      </div>

      {insights.insights.length === 0 ? (
        <div className="card-content" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: '200px',
          flexDirection: 'column',
          gap: 'var(--space-md)'
        }}>
          <Brain size={48} color="var(--text-tertiary)" />
          <div style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
            <p style={{ margin: '0 0 var(--space-sm) 0', fontWeight: '600' }}>
              No insights available yet
            </p>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>
              Upload data and create visualizations to see AI-powered insights
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Filter tabs */}
          {!compact && (
            <div style={{
              borderBottom: '1px solid var(--border-primary)',
              display: 'flex',
              padding: '0 var(--space-md)'
            }}>
              {[
                { id: 'all', label: 'All', count: insights.insights.length },
                { id: 'critical', label: 'Priority', count: insights.insights.filter(i => i.priority === 'critical' || i.priority === 'high').length },
                { id: 'trends', label: 'Trends', count: insights.insights.filter(i => i.type === 'trend' || i.type === 'pattern').length },
                { id: 'correlations', label: 'Correlations', count: insights.insights.filter(i => i.type === 'correlation').length }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    padding: 'var(--space-sm) var(--space-md)',
                    border: 'none',
                    background: activeTab === tab.id ? 'var(--bg-elevated)' : 'transparent',
                    color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    borderBottom: `2px solid ${activeTab === tab.id ? 'var(--accent-primary)' : 'transparent'}`,
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-xs)'
                  }}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span style={{
                      background: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                      color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      padding: '1px 4px',
                      borderRadius: '8px',
                      minWidth: '16px',
                      textAlign: 'center'
                    }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Executive summary */}
          {!compact && insights.executiveSummary && (
            <div style={{
              margin: 'var(--space-md)',
              padding: 'var(--space-md)',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              borderLeft: '4px solid var(--accent-primary)'
            }}>
              <h4 style={{ 
                margin: '0 0 var(--space-sm) 0',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)'
              }}>
                <Zap size={14} />
                Executive Summary
              </h4>
              <p style={{ 
                margin: 0, 
                fontSize: '0.8rem', 
                color: 'var(--text-secondary)',
                lineHeight: '1.5'
              }}>
                {insights.executiveSummary}
              </p>
            </div>
          )}

          {/* Insights list */}
          <div style={{ 
            padding: 'var(--space-md)', 
            maxHeight: compact ? '300px' : '400px',
            overflowY: 'auto'
          }}>
            {filteredInsights.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                color: 'var(--text-tertiary)',
                padding: 'var(--space-xl)'
              }}>
                <p>No insights match the current filter</p>
              </div>
            ) : (
              filteredInsights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  isExpanded={expandedInsights.has(insight.id)}
                  onToggle={() => toggleInsight(insight.id)}
                  onClick={() => onInsightClick?.(insight)}
                />
              ))
            )}
          </div>
        </>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
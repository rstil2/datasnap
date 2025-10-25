import React, { useState, useEffect } from 'react';
import { ChartRecommendation, ChartRecommendationService } from '../../services/ChartRecommendationService';
import { FileParseResult } from '../../services/FileParserService';
import { AIInsightsService, DataInsight, InsightSummary } from '../../services/AIInsightsService';
import './ChartSuggestions.css';

interface ChartSuggestionsProps {
  parseResult: FileParseResult;
  onCreateChart: (recommendation: ChartRecommendation) => void;
  onSkip?: () => void;
  className?: string;
}

interface FilterOptions {
  complexity: 'all' | 'simple' | 'intermediate' | 'advanced';
  chartType: 'all' | string;
  minConfidence: number;
}

export const ChartSuggestions: React.FC<ChartSuggestionsProps> = ({
  parseResult,
  onCreateChart,
  onSkip,
  className = ''
}) => {
  const [recommendations, setRecommendations] = useState<ChartRecommendation[]>([]);
  const [filteredRecommendations, setFilteredRecommendations] = useState<ChartRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    complexity: 'all',
    chartType: 'all',
    minConfidence: 0.3
  });
  const [selectedRecommendation, setSelectedRecommendation] = useState<string | null>(null);
  const [dataInsights, setDataInsights] = useState<DataInsight[]>([]);
  const [insightSummary, setInsightSummary] = useState<InsightSummary | null>(null);
  const [showInsights, setShowInsights] = useState(false);

  // Generate recommendations on mount
  useEffect(() => {
    const generateRecommendations = async () => {
      setLoading(true);
      setError(null);

      try {
        const recs = await ChartRecommendationService.generateRecommendations(parseResult, {
          maxRecommendations: 10,
          minConfidence: 0.3,
          includeAdvanced: true
        });

        setRecommendations(recs);
        setFilteredRecommendations(recs);
        
        // Generate AI insights in parallel
        try {
          const { insights, summary } = await AIInsightsService.generateInsights(parseResult, recs);
          setDataInsights(insights);
          setInsightSummary(summary);
          setShowInsights(insights.length > 0);
        } catch (insightError) {
          console.warn('Failed to generate AI insights:', insightError);
          // Don't fail the whole process if insights fail
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate recommendations');
      } finally {
        setLoading(false);
      }
    };

    if (parseResult) {
      generateRecommendations();
    }
  }, [parseResult]);

  // Apply filters
  useEffect(() => {
    let filtered = recommendations;

    if (filters.complexity !== 'all') {
      filtered = filtered.filter(rec => rec.complexity === filters.complexity);
    }

    if (filters.chartType !== 'all') {
      filtered = filtered.filter(rec => rec.chartType === filters.chartType);
    }

    filtered = filtered.filter(rec => rec.confidence >= filters.minConfidence);

    setFilteredRecommendations(filtered);
  }, [recommendations, filters]);

  const getChartIcon = (chartType: string): string => {
    const icons: Record<string, string> = {
      scatter: '📊',
      line: '📈',
      bar: '📊',
      pie: '🥧',
      histogram: '📊',
      boxplot: '📦',
      heatmap: '🔥',
      area: '📈'
    };
    return icons[chartType] || '📊';
  };

  const getComplexityColor = (complexity: string): string => {
    const colors: Record<string, string> = {
      simple: '#22c55e',
      intermediate: '#f59e0b',
      advanced: '#ef4444'
    };
    return colors[complexity] || '#6b7280';
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return '#22c55e';
    if (confidence >= 0.6) return '#f59e0b';
    return '#ef4444';
  };

  const handleCreateChart = (recommendation: ChartRecommendation) => {
    setSelectedRecommendation(recommendation.id);
    onCreateChart(recommendation);
  };

  const uniqueChartTypes = [...new Set(recommendations.map(rec => rec.chartType))];

  if (loading) {
    return (
      <div className={`chart-suggestions ${className}`}>
        <div className="suggestions-header">
          <h3>✨ AI Chart Recommendations</h3>
          <p>Analyzing your data to suggest the best visualizations...</p>
        </div>
        <div className="suggestions-loading">
          <div className="loading-spinner"></div>
          <p>Generating smart suggestions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`chart-suggestions ${className}`}>
        <div className="suggestions-header">
          <h3>✨ AI Chart Recommendations</h3>
        </div>
        <div className="suggestions-error">
          <div className="error-icon">❌</div>
          <h4>Failed to Generate Recommendations</h4>
          <p>{error}</p>
          <button onClick={onSkip} className="btn btn-secondary">
            Continue Without Suggestions
          </button>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className={`chart-suggestions ${className}`}>
        <div className="suggestions-header">
          <h3>✨ AI Chart Recommendations</h3>
        </div>
        <div className="suggestions-empty">
          <div className="empty-icon">🤔</div>
          <h4>No Recommendations Available</h4>
          <p>Your data structure doesn't match our current recommendation patterns. You can still create charts manually!</p>
          <button onClick={onSkip} className="btn btn-primary">
            Continue to Charts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`chart-suggestions ${className}`}>
      <div className="suggestions-header">
        <h3>✨ AI Chart Recommendations</h3>
        <p>Based on your data structure, here are the best visualization options:</p>
        
        {/* Summary Stats */}
        <div className="data-summary">
          <div className="summary-item">
            <span className="summary-label">Rows:</span>
            <span className="summary-value">{parseResult.metadata.rowCount.toLocaleString()}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Columns:</span>
            <span className="summary-value">{parseResult.metadata.columnCount}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Recommendations:</span>
            <span className="summary-value">{filteredRecommendations.length}</span>
          </div>
          {insightSummary && (
            <div className="summary-item">
              <span className="summary-label">Data Quality:</span>
              <span className="summary-value" style={{ color: insightSummary.dataQuality.score >= 85 ? '#22c55e' : insightSummary.dataQuality.score >= 70 ? '#f59e0b' : '#ef4444' }}>
                {insightSummary.dataQuality.score}%
              </span>
            </div>
          )}
        </div>

        {/* AI Insights Section */}
        {showInsights && insightSummary && (
          <div className="ai-insights-section">
            <div className="insights-header">
              <h4>🧠 AI Data Insights</h4>
              <div className="trust-score">
                Trust Score: <span className="score-value">{insightSummary.trustScore}%</span>
              </div>
            </div>
            
            <div className="insights-summary">
              <div className="narrative-box">
                <h5>📊 Overall Assessment</h5>
                <p>{insightSummary.overallNarrative}</p>
              </div>
              
              {insightSummary.keyFindings.length > 0 && (
                <div className="key-findings">
                  <h5>🔍 Key Findings</h5>
                  <ul>
                    {insightSummary.keyFindings.map((finding, index) => (
                      <li key={index}>{finding}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {insightSummary.recommendedActions.length > 0 && (
                <div className="recommended-actions">
                  <h5>💡 Recommended Actions</h5>
                  <ul>
                    {insightSummary.recommendedActions.map((action, index) => (
                      <li key={index}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <button 
              className="toggle-insights-btn"
              onClick={() => setShowInsights(!showInsights)}
            >
              {dataInsights.length > 0 ? `View ${dataInsights.length} Detailed Insights` : 'Hide Insights'}
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="suggestions-filters">
        <div className="filter-group">
          <label>Complexity:</label>
          <select 
            value={filters.complexity} 
            onChange={(e) => setFilters(prev => ({ ...prev, complexity: e.target.value as FilterOptions['complexity'] }))}
          >
            <option value="all">All Levels</option>
            <option value="simple">Simple</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Chart Type:</label>
          <select 
            value={filters.chartType} 
            onChange={(e) => setFilters(prev => ({ ...prev, chartType: e.target.value }))}
          >
            <option value="all">All Types</option>
            {uniqueChartTypes.map(type => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Min Confidence:</label>
          <input 
            type="range"
            min="0.1"
            max="1.0"
            step="0.1"
            value={filters.minConfidence}
            onChange={(e) => setFilters(prev => ({ ...prev, minConfidence: parseFloat(e.target.value) }))}
          />
          <span className="confidence-value">{Math.round(filters.minConfidence * 100)}%</span>
        </div>
      </div>

      {/* Recommendations Grid */}
      <div className="suggestions-grid">
        {filteredRecommendations.map((recommendation) => (
          <div 
            key={recommendation.id}
            className={`suggestion-card ${selectedRecommendation === recommendation.id ? 'selected' : ''}`}
            onClick={() => handleCreateChart(recommendation)}
          >
            {/* Card Header */}
            <div className="card-header">
              <div className="chart-icon">
                {getChartIcon(recommendation.chartType)}
              </div>
              <div className="card-title">
                <h4>{recommendation.title}</h4>
                <div className="card-metadata">
                  <span 
                    className="complexity-badge"
                    style={{ backgroundColor: getComplexityColor(recommendation.complexity) }}
                  >
                    {recommendation.complexity}
                  </span>
                  <span 
                    className="confidence-badge"
                    style={{ backgroundColor: getConfidenceColor(recommendation.confidence) }}
                  >
                    {Math.round(recommendation.confidence * 100)}% confident
                  </span>
                </div>
              </div>
            </div>

            {/* Card Content */}
            <div className="card-content">
              <p className="card-description">{recommendation.description}</p>
              
              <div className="reasoning">
                <strong>Why this chart?</strong>
                <p>{recommendation.reasoning}</p>
              </div>

              {/* Column Mapping */}
              {Object.keys(recommendation.columns).length > 0 && (
                <div className="column-mapping">
                  <strong>Data Mapping:</strong>
                  <div className="mapping-items">
                    {Object.entries(recommendation.columns).map(([role, column]) => 
                      column ? (
                        <div key={role} className="mapping-item">
                          <span className="mapping-role">{role.toUpperCase()}:</span>
                          <span className="mapping-column">{column}</span>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              )}

              {/* Insights */}
              {recommendation.insights.length > 0 && (
                <div className="insights">
                  <strong>Insights:</strong>
                  <ul>
                    {recommendation.insights.map((insight, index) => (
                      <li key={index}>{insight}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tags */}
              {recommendation.tags.length > 0 && (
                <div className="tags">
                  {recommendation.tags.map(tag => (
                    <span key={tag} className="tag">#{tag}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Card Actions */}
            <div className="card-actions">
              <button 
                className="btn btn-primary create-chart-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCreateChart(recommendation);
                }}
              >
                Create Chart ✨
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="suggestions-footer">
        <button onClick={onSkip} className="btn btn-secondary">
          Skip Suggestions
        </button>
        <div className="footer-info">
          <p>💡 Click any recommendation to create a chart with pre-configured settings</p>
        </div>
      </div>
    </div>
  );
};

export default ChartSuggestions;
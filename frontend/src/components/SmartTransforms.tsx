import React, { useState, useEffect } from 'react';
import { 
  SmartTransformService, 
  type TransformationSuggestion 
} from '../services/SmartTransformService';
import './SmartTransforms.css';

interface SmartTransformsProps {
  data: Record<string, any>[];
  headers: string[];
  onTransformationsApplied: (
    transformedData: Record<string, any>[], 
    summary: string
  ) => void;
}

const SmartTransforms: React.FC<SmartTransformsProps> = ({
  data,
  headers,
  onTransformationsApplied
}) => {
  const [suggestions, setSuggestions] = useState<TransformationSuggestion[]>([]);
  const [selectedTransforms, setSelectedTransforms] = useState<Set<string>>(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    analyzeSuggestions();
  }, [data, headers]);

  const analyzeSuggestions = async () => {
    setIsAnalyzing(true);
    try {
      const transformSuggestions = SmartTransformService.analyzeTransformations(data, headers);
      setSuggestions(transformSuggestions);
    } catch (error) {
      console.error('Failed to analyze transformations:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleTransformation = (suggestionId: string) => {
    const newSelected = new Set(selectedTransforms);
    if (newSelected.has(suggestionId)) {
      newSelected.delete(suggestionId);
    } else {
      newSelected.add(suggestionId);
    }
    setSelectedTransforms(newSelected);
  };

  const applySelectedTransformations = async () => {
    if (selectedTransforms.size === 0) return;

    setIsApplying(true);
    try {
      const transformationsToApply = Array.from(selectedTransforms).map(id => ({ suggestionId: id }));
      const result = await SmartTransformService.applyTransformations(data, transformationsToApply);
      onTransformationsApplied(result.transformedData, result.summary);
    } catch (error) {
      console.error('Failed to apply transformations:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'date': return '📅';
      case 'number': return '🔢';
      case 'category': return '🏷️';
      case 'boolean': return '✅';
      default: return '📝';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#22c55e';
    if (confidence >= 0.6) return '#f59e0b';
    return '#ef4444';
  };

  if (isAnalyzing) {
    return (
      <div className="smart-transforms analyzing">
        <div className="analyzing-header">
          <div className="analyzing-icon">🤖</div>
          <h3>Analyzing Data Types...</h3>
          <p>AI is examining your data for optimization opportunities</p>
        </div>
        <div className="analyzing-progress">
          <div className="progress-bar">
            <div className="progress-fill"></div>
          </div>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="smart-transforms no-suggestions">
        <div className="no-suggestions-content">
          <div className="no-suggestions-icon">✨</div>
          <h3>Data Looks Great!</h3>
          <p>Your data types are already well-optimized for analysis.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="smart-transforms">
      <div className="transforms-header">
        <div className="header-icon">🚀</div>
        <div className="header-content">
          <h3>Smart Data Transformations</h3>
          <p>AI-powered suggestions to optimize your data for better analysis</p>
        </div>
      </div>

      <div className="suggestions-list">
        {suggestions.map((suggestion) => (
          <div 
            key={suggestion.id} 
            className={`suggestion-card ${selectedTransforms.has(suggestion.id) ? 'selected' : ''}`}
          >
            <div className="suggestion-header">
              <div className="type-info">
                <span className="type-icon">
                  {getTypeIcon(suggestion.suggestedType)}
                </span>
                <div className="type-details">
                  <h4>{suggestion.column}</h4>
                  <span className="type-conversion">
                    {suggestion.currentType} → {suggestion.suggestedType}
                  </span>
                </div>
              </div>
              
              <div className="confidence-badge">
                <div 
                  className="confidence-bar"
                  style={{ backgroundColor: getConfidenceColor(suggestion.confidence) }}
                >
                  <span className="confidence-text">
                    {Math.round(suggestion.confidence * 100)}%
                  </span>
                </div>
              </div>

              <label className="transform-checkbox">
                <input
                  type="checkbox"
                  checked={selectedTransforms.has(suggestion.id)}
                  onChange={() => toggleTransformation(suggestion.id)}
                />
                <span className="checkmark"></span>
              </label>
            </div>

            <div className="suggestion-content">
              <p className="description">{suggestion.description}</p>
              <p className="reasoning">{suggestion.reasoning}</p>

              <div className="preview-section">
                <h5>Preview:</h5>
                <div className="preview-comparison">
                  <div className="preview-column">
                    <span className="preview-label">Current:</span>
                    {suggestion.preview.original.map((val, idx) => (
                      <div key={idx} className="preview-value original">
                        {String(val)}
                      </div>
                    ))}
                  </div>
                  <div className="preview-arrow">→</div>
                  <div className="preview-column">
                    <span className="preview-label">Transformed:</span>
                    {suggestion.preview.transformed.map((val, idx) => (
                      <div key={idx} className="preview-value transformed">
                        {String(val)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="impact-section">
                <div className="data-quality">
                  <span className="impact-label">Quality Improvement:</span>
                  <span className="quality-score">
                    +{suggestion.impact.dataQualityImprovement}%
                  </span>
                </div>
                <div className="capabilities">
                  <span className="impact-label">Enables:</span>
                  <div className="capability-tags">
                    {suggestion.impact.analysisCapabilities.map((capability, idx) => (
                      <span key={idx} className="capability-tag">
                        {capability}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedTransforms.size > 0 && (
        <div className="apply-section">
          <div className="apply-summary">
            <span className="selected-count">
              {selectedTransforms.size} transformation{selectedTransforms.size !== 1 ? 's' : ''} selected
            </span>
            <p className="apply-description">
              These changes will optimize your data types for better analysis capabilities.
            </p>
          </div>
          <button
            className="apply-button"
            onClick={applySelectedTransformations}
            disabled={isApplying}
          >
            {isApplying ? (
              <>
                <div className="spinner"></div>
                Applying Transformations...
              </>
            ) : (
              <>
                <span className="apply-icon">✨</span>
                Apply Selected Transformations
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default SmartTransforms;
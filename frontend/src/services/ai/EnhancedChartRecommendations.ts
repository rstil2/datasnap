import { 
  DataSchema, 
  ChartType, 
  ChartRecommendation, 
  FieldMapping 
} from '../../types/VisualizationTypes';

export interface EnhancedChartRecommendation extends ChartRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  dataComplexity: number; // 0-1 scale
  visualComplexity: number; // 0-1 scale
  interpretability: number; // 0-1 scale (higher = easier to understand)
  interactivity: number; // 0-1 scale
  insights: string[];
  limitations: string[];
  alternatives: ChartType[];
  sampleSize: {
    minimum: number;
    recommended: number;
    maximum?: number;
  };
  dataQuality: {
    missingDataTolerance: number; // 0-1 scale
    outlierSensitivity: number; // 0-1 scale
    scaleInvariance: boolean;
  };
  cognitiveLoad: number; // 0-1 scale (lower = easier to process)
  businessValue: number; // 0-1 scale
  technicalComplexity: number; // 0-1 scale
}

export interface RecommendationContext {
  purpose?: 'exploration' | 'presentation' | 'analysis' | 'monitoring';
  audience?: 'technical' | 'business' | 'general';
  interactivity?: 'static' | 'interactive' | 'dashboard';
  emphasis?: 'accuracy' | 'clarity' | 'aesthetics' | 'insights';
}

export class EnhancedChartRecommendations {
  private static readonly CHART_PROFILES: Record<ChartType, Partial<EnhancedChartRecommendation>> = {
    'line': {
      difficulty: 'beginner',
      visualComplexity: 0.3,
      interpretability: 0.9,
      interactivity: 0.6,
      cognitiveLoad: 0.2,
      businessValue: 0.8,
      technicalComplexity: 0.2,
      insights: [
        'Shows trends over time clearly',
        'Easy to spot patterns and anomalies',
        'Effective for comparing multiple time series'
      ],
      limitations: [
        'Requires temporal or sequential data',
        'Can become cluttered with too many lines',
        'Not suitable for categorical comparisons'
      ],
      alternatives: ['area', 'scatter'],
      sampleSize: { minimum: 10, recommended: 50 },
      dataQuality: {
        missingDataTolerance: 0.7,
        outlierSensitivity: 0.6,
        scaleInvariance: false
      }
    },
    'bar': {
      difficulty: 'beginner',
      visualComplexity: 0.2,
      interpretability: 0.95,
      interactivity: 0.5,
      cognitiveLoad: 0.15,
      businessValue: 0.9,
      technicalComplexity: 0.1,
      insights: [
        'Perfect for comparing categories',
        'Easy to read exact values',
        'Works well with both small and large datasets'
      ],
      limitations: [
        'Limited to categorical data',
        'Can become crowded with many categories',
        'Not ideal for showing relationships'
      ],
      alternatives: ['column', 'horizontal-bar'],
      sampleSize: { minimum: 3, recommended: 20, maximum: 50 },
      dataQuality: {
        missingDataTolerance: 0.3,
        outlierSensitivity: 0.2,
        scaleInvariance: true
      }
    },
    'scatter': {
      difficulty: 'intermediate',
      visualComplexity: 0.5,
      interpretability: 0.7,
      interactivity: 0.8,
      cognitiveLoad: 0.4,
      businessValue: 0.85,
      technicalComplexity: 0.3,
      insights: [
        'Reveals relationships between variables',
        'Excellent for outlier detection',
        'Can show multiple dimensions with color/size'
      ],
      limitations: [
        'Requires numeric data for both axes',
        'Can be overwhelming with too many points',
        'Patterns may not be obvious without interaction'
      ],
      alternatives: ['bubble', 'line'],
      sampleSize: { minimum: 20, recommended: 100 },
      dataQuality: {
        missingDataTolerance: 0.8,
        outlierSensitivity: 0.9,
        scaleInvariance: false
      }
    },
    'pie': {
      difficulty: 'beginner',
      visualComplexity: 0.3,
      interpretability: 0.6,
      interactivity: 0.3,
      cognitiveLoad: 0.5,
      businessValue: 0.5,
      technicalComplexity: 0.1,
      insights: [
        'Shows part-to-whole relationships',
        'Good for highlighting dominant categories',
        'Familiar to most audiences'
      ],
      limitations: [
        'Poor for comparing similar-sized segments',
        'Limited to small number of categories',
        'Can be misleading with 3D effects'
      ],
      alternatives: ['bar', 'donut'],
      sampleSize: { minimum: 3, recommended: 7, maximum: 10 },
      dataQuality: {
        missingDataTolerance: 0.1,
        outlierSensitivity: 0.3,
        scaleInvariance: true
      }
    },
    'area': {
      difficulty: 'intermediate',
      visualComplexity: 0.4,
      interpretability: 0.7,
      interactivity: 0.6,
      cognitiveLoad: 0.3,
      businessValue: 0.7,
      technicalComplexity: 0.3,
      insights: [
        'Emphasizes magnitude of change over time',
        'Good for showing cumulative effects',
        'Effective for stacked data visualization'
      ],
      limitations: [
        'Can hide trends in lower layers when stacked',
        'Requires careful color selection',
        'May overemphasize differences'
      ],
      alternatives: ['line', 'stream'],
      sampleSize: { minimum: 15, recommended: 50 },
      dataQuality: {
        missingDataTolerance: 0.6,
        outlierSensitivity: 0.4,
        scaleInvariance: false
      }
    },
    'boxplot': {
      difficulty: 'advanced',
      visualComplexity: 0.7,
      interpretability: 0.5,
      interactivity: 0.4,
      cognitiveLoad: 0.6,
      businessValue: 0.6,
      technicalComplexity: 0.6,
      insights: [
        'Shows distribution shape and outliers',
        'Great for comparing multiple groups',
        'Compact representation of statistical summary'
      ],
      limitations: [
        'Requires statistical literacy to interpret',
        'Hides actual data distribution shape',
        'May not be suitable for non-technical audiences'
      ],
      alternatives: ['violin', 'histogram'],
      sampleSize: { minimum: 30, recommended: 100 },
      dataQuality: {
        missingDataTolerance: 0.4,
        outlierSensitivity: 0.9,
        scaleInvariance: false
      }
    },
    'histogram': {
      difficulty: 'intermediate',
      visualComplexity: 0.4,
      interpretability: 0.8,
      interactivity: 0.5,
      cognitiveLoad: 0.3,
      businessValue: 0.7,
      technicalComplexity: 0.4,
      insights: [
        'Shows data distribution shape',
        'Identifies skewness and modality',
        'Helps detect data quality issues'
      ],
      limitations: [
        'Bin size selection affects interpretation',
        'Limited to single variable analysis',
        'May not work well with small datasets'
      ],
      alternatives: ['density', 'boxplot'],
      sampleSize: { minimum: 30, recommended: 200 },
      dataQuality: {
        missingDataTolerance: 0.2,
        outlierSensitivity: 0.3,
        scaleInvariance: false
      }
    },
    'heatmap': {
      difficulty: 'intermediate',
      visualComplexity: 0.6,
      interpretability: 0.6,
      interactivity: 0.7,
      cognitiveLoad: 0.5,
      businessValue: 0.75,
      technicalComplexity: 0.5,
      insights: [
        'Reveals patterns in high-dimensional data',
        'Good for correlation matrices',
        'Effective for time-based patterns'
      ],
      limitations: [
        'Color perception varies between users',
        'Can be overwhelming with too much data',
        'Requires careful color scale selection'
      ],
      alternatives: ['scatter', 'bubble'],
      sampleSize: { minimum: 50, recommended: 500 },
      dataQuality: {
        missingDataTolerance: 0.5,
        outlierSensitivity: 0.6,
        scaleInvariance: false
      }
    },
    'violin': {
      difficulty: 'advanced',
      visualComplexity: 0.8,
      interpretability: 0.4,
      interactivity: 0.5,
      cognitiveLoad: 0.7,
      businessValue: 0.5,
      technicalComplexity: 0.8,
      insights: [
        'Shows full distribution shape',
        'Combines box plot and density plot',
        'Great for comparing distributions'
      ],
      limitations: [
        'Requires statistical expertise to interpret',
        'Can be confusing for general audiences',
        'Kernel density estimation may smooth over important details'
      ],
      alternatives: ['boxplot', 'histogram'],
      sampleSize: { minimum: 50, recommended: 200 },
      dataQuality: {
        missingDataTolerance: 0.3,
        outlierSensitivity: 0.8,
        scaleInvariance: false
      }
    },
    'radar': {
      difficulty: 'advanced',
      visualComplexity: 0.9,
      interpretability: 0.3,
      interactivity: 0.6,
      cognitiveLoad: 0.8,
      businessValue: 0.4,
      technicalComplexity: 0.7,
      insights: [
        'Shows multidimensional profiles',
        'Good for comparing entities across multiple metrics',
        'Compact representation of high-dimensional data'
      ],
      limitations: [
        'Difficult to read precise values',
        'Can be misleading with different scales',
        'Not suitable for most business presentations'
      ],
      alternatives: ['parallel-coordinates', 'heatmap'],
      sampleSize: { minimum: 10, recommended: 50 },
      dataQuality: {
        missingDataTolerance: 0.2,
        outlierSensitivity: 0.7,
        scaleInvariance: false
      }
    }
  };

  /**
   * Get enhanced chart recommendations with AI-powered confidence scoring
   */
  static getEnhancedRecommendations(
    schema: DataSchema, 
    context: RecommendationContext = {}
  ): EnhancedChartRecommendation[] {
    const baseRecommendations = this.generateBaseRecommendations(schema);
    const enhancedRecommendations = baseRecommendations.map(rec => 
      this.enhanceRecommendation(rec, schema, context)
    );

    // Apply context-specific scoring adjustments
    const contextAdjustedRecommendations = enhancedRecommendations.map(rec => 
      this.applyContextAdjustments(rec, context)
    );

    // Sort by adjusted confidence and priority
    return contextAdjustedRecommendations
      .sort((a, b) => {
        // First sort by priority (high > medium > low)
        const priorityScore = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityScore[b.priority] - priorityScore[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        // Then by confidence
        return b.confidence - a.confidence;
      })
      .slice(0, 8); // Limit to top 8 recommendations
  }

  private static generateBaseRecommendations(schema: DataSchema): ChartRecommendation[] {
    const numericFields = schema.fields.filter(f => f.type === 'numeric');
    const categoricalFields = schema.fields.filter(f => f.type === 'categorical');
    const datetimeFields = schema.fields.filter(f => f.type === 'datetime');
    const textFields = schema.fields.filter(f => f.type === 'text');

    const recommendations: ChartRecommendation[] = [];

    // Line chart recommendations
    if (datetimeFields.length >= 1 && numericFields.length >= 1) {
      recommendations.push({
        type: 'line',
        confidence: this.calculateBaseConfidence('line', schema),
        reasoning: 'Time series data detected with numeric values - excellent for trend analysis',
        suggestedMapping: {
          x: datetimeFields[0].name,
          y: numericFields[0].name,
          color: categoricalFields.length > 0 ? categoricalFields[0].name : undefined
        },
        pros: ['Clear trend visualization', 'Time-based insights', 'Multiple series support'],
        cons: ['Requires temporal data', 'Can be cluttered'],
        bestFor: ['Trend analysis', 'Time series forecasting', 'Performance tracking']
      });
    }

    // Bar chart recommendations
    if (categoricalFields.length >= 1 && numericFields.length >= 1) {
      const categoryCount = categoricalFields[0].statistics?.uniqueCount || 0;
      const confidence = categoryCount <= 20 ? 0.9 : categoryCount <= 50 ? 0.7 : 0.4;
      
      recommendations.push({
        type: 'bar',
        confidence: confidence * this.calculateBaseConfidence('bar', schema),
        reasoning: `Categorical data with ${categoryCount} categories - ideal for comparisons`,
        suggestedMapping: {
          x: categoricalFields[0].name,
          y: numericFields[0].name,
          color: categoricalFields.length > 1 ? categoricalFields[1].name : undefined
        },
        pros: ['Easy comparison', 'Clear value reading', 'Universally understood'],
        cons: ['Limited to categories', 'Can be crowded'],
        bestFor: ['Category comparison', 'Rankings', 'Performance metrics']
      });
    }

    // Scatter plot recommendations
    if (numericFields.length >= 2) {
      recommendations.push({
        type: 'scatter',
        confidence: this.calculateBaseConfidence('scatter', schema),
        reasoning: 'Multiple numeric variables detected - perfect for correlation analysis',
        suggestedMapping: {
          x: numericFields[0].name,
          y: numericFields[1].name,
          color: categoricalFields.length > 0 ? categoricalFields[0].name : undefined,
          size: numericFields.length > 2 ? numericFields[2].name : undefined
        },
        pros: ['Shows relationships', 'Outlier detection', 'Multi-dimensional'],
        cons: ['Can be cluttered', 'Requires numeric data'],
        bestFor: ['Correlation analysis', 'Outlier detection', 'Pattern discovery']
      });
    }

    // Histogram recommendations
    if (numericFields.length >= 1) {
      recommendations.push({
        type: 'histogram',
        confidence: this.calculateBaseConfidence('histogram', schema),
        reasoning: 'Numeric data available - shows distribution characteristics',
        suggestedMapping: {
          x: numericFields[0].name
        },
        pros: ['Distribution analysis', 'Data quality assessment', 'Pattern identification'],
        cons: ['Single variable only', 'Bin size dependency'],
        bestFor: ['Data exploration', 'Quality analysis', 'Statistical overview']
      });
    }

    // Violin plot recommendations (advanced)
    if (numericFields.length >= 1 && categoricalFields.length >= 1 && schema.rowCount >= 50) {
      recommendations.push({
        type: 'violin',
        confidence: this.calculateBaseConfidence('violin', schema),
        reasoning: 'Sufficient data for distribution analysis across categories',
        suggestedMapping: {
          x: categoricalFields[0].name,
          y: numericFields[0].name
        },
        pros: ['Full distribution view', 'Statistical detail', 'Group comparison'],
        cons: ['Complex interpretation', 'Requires statistical knowledge'],
        bestFor: ['Statistical analysis', 'Distribution comparison', 'Advanced analytics']
      });
    }

    // Radar chart recommendations (for multidimensional profiles)
    if (numericFields.length >= 3 && schema.rowCount <= 100) {
      recommendations.push({
        type: 'radar',
        confidence: this.calculateBaseConfidence('radar', schema),
        reasoning: 'Multiple metrics available - suitable for entity profiling',
        suggestedMapping: {
          category: categoricalFields.length > 0 ? categoricalFields[0].name : undefined
        },
        pros: ['Multi-metric view', 'Profile comparison', 'Compact visualization'],
        cons: ['Hard to read precisely', 'Scale dependency', 'Complex interpretation'],
        bestFor: ['Performance profiles', 'Multi-criteria comparison', 'Benchmarking']
      });
    }

    return recommendations;
  }

  private static enhanceRecommendation(
    base: ChartRecommendation, 
    schema: DataSchema, 
    context: RecommendationContext
  ): EnhancedChartRecommendation {
    const profile = this.CHART_PROFILES[base.type] || {};
    
    return {
      ...base,
      id: `${base.type}_${Math.random().toString(36).substr(2, 9)}`,
      priority: this.calculatePriority(base, schema, context),
      difficulty: profile.difficulty || 'intermediate',
      dataComplexity: this.calculateDataComplexity(schema),
      visualComplexity: profile.visualComplexity || 0.5,
      interpretability: profile.interpretability || 0.5,
      interactivity: profile.interactivity || 0.5,
      insights: profile.insights || [],
      limitations: profile.limitations || [],
      alternatives: profile.alternatives || [],
      sampleSize: profile.sampleSize || { minimum: 10, recommended: 50 },
      dataQuality: profile.dataQuality || {
        missingDataTolerance: 0.5,
        outlierSensitivity: 0.5,
        scaleInvariance: true
      },
      cognitiveLoad: profile.cognitiveLoad || 0.5,
      businessValue: profile.businessValue || 0.5,
      technicalComplexity: profile.technicalComplexity || 0.5
    };
  }

  private static calculateBaseConfidence(chartType: ChartType, schema: DataSchema): number {
    const numericFields = schema.fields.filter(f => f.type === 'numeric').length;
    const categoricalFields = schema.fields.filter(f => f.type === 'categorical').length;
    const datetimeFields = schema.fields.filter(f => f.type === 'datetime').length;
    const rowCount = schema.rowCount;

    // Data quality factors
    const totalFields = schema.fields.length;
    const nullPercentage = schema.fields.reduce((sum, field) => {
      return sum + (field.statistics?.nullCount || 0);
    }, 0) / (rowCount * totalFields);
    
    const dataQualityScore = Math.max(0, 1 - nullPercentage);
    
    // Sample size adequacy
    const profile = this.CHART_PROFILES[chartType];
    const minSize = profile?.sampleSize?.minimum || 10;
    const recSize = profile?.sampleSize?.recommended || 50;
    
    const sampleSizeScore = rowCount >= recSize ? 1 : 
                           rowCount >= minSize ? 0.7 : 
                           Math.max(0.1, rowCount / minSize);

    // Base confidence by chart type requirements
    let baseScore = 0.5;
    
    switch (chartType) {
      case 'line':
        baseScore = datetimeFields >= 1 && numericFields >= 1 ? 0.9 : 0.1;
        break;
      case 'bar':
        baseScore = categoricalFields >= 1 && numericFields >= 1 ? 0.85 : 0.1;
        break;
      case 'scatter':
        baseScore = numericFields >= 2 ? 0.8 : 0.1;
        break;
      case 'histogram':
        baseScore = numericFields >= 1 ? 0.75 : 0.1;
        break;
      case 'violin':
        baseScore = numericFields >= 1 && categoricalFields >= 1 && rowCount >= 30 ? 0.6 : 0.1;
        break;
      case 'radar':
        baseScore = numericFields >= 3 ? 0.5 : 0.1;
        break;
    }

    return Math.min(0.95, baseScore * dataQualityScore * sampleSizeScore);
  }

  private static calculatePriority(
    rec: ChartRecommendation, 
    schema: DataSchema, 
    context: RecommendationContext
  ): 'high' | 'medium' | 'low' {
    const { purpose = 'analysis', audience = 'general' } = context;
    
    // High priority for simple, well-suited charts
    if (rec.confidence > 0.8) {
      if (['bar', 'line'].includes(rec.type) || 
          (audience === 'technical' && ['scatter', 'histogram'].includes(rec.type))) {
        return 'high';
      }
    }
    
    // Medium priority for moderately complex or specialized charts
    if (rec.confidence > 0.6) {
      if (purpose === 'exploration' || audience === 'technical') {
        return 'medium';
      }
    }
    
    return 'low';
  }

  private static calculateDataComplexity(schema: DataSchema): number {
    const fieldCount = schema.fields.length;
    const rowCount = schema.rowCount;
    const uniqueRatios = schema.fields.map(f => 
      (f.statistics?.uniqueCount || 1) / rowCount
    );
    
    const avgUniqueRatio = uniqueRatios.reduce((sum, ratio) => sum + ratio, 0) / fieldCount;
    
    // Complexity factors
    const dimensionalityScore = Math.min(1, fieldCount / 10);
    const cardinalityScore = Math.min(1, avgUniqueRatio);
    const sizeScore = Math.min(1, Math.log10(rowCount) / 4); // Log scale for row count
    
    return (dimensionalityScore + cardinalityScore + sizeScore) / 3;
  }

  private static applyContextAdjustments(
    rec: EnhancedChartRecommendation, 
    context: RecommendationContext
  ): EnhancedChartRecommendation {
    const { purpose, audience, emphasis } = context;
    let adjustedConfidence = rec.confidence;
    
    // Audience adjustments
    if (audience === 'general' && rec.difficulty === 'advanced') {
      adjustedConfidence *= 0.7; // Penalize complex charts for general audience
    }
    if (audience === 'technical' && rec.difficulty === 'beginner') {
      adjustedConfidence *= 1.1; // Slight boost for technical audience with simple charts
    }
    
    // Purpose adjustments
    if (purpose === 'presentation' && rec.cognitiveLoad > 0.6) {
      adjustedConfidence *= 0.8; // Penalize high cognitive load for presentations
    }
    if (purpose === 'exploration' && rec.interactivity > 0.7) {
      adjustedConfidence *= 1.2; // Boost interactive charts for exploration
    }
    
    // Emphasis adjustments
    if (emphasis === 'clarity' && rec.interpretability > 0.8) {
      adjustedConfidence *= 1.15;
    }
    if (emphasis === 'insights' && rec.businessValue > 0.7) {
      adjustedConfidence *= 1.1;
    }
    
    return {
      ...rec,
      confidence: Math.min(0.95, Math.max(0.05, adjustedConfidence))
    };
  }
}

export default EnhancedChartRecommendations;
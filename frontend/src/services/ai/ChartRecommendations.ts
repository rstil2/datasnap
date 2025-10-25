import { ChartType, DataType, FieldMapping, ChartRecommendation } from '../../types/VisualizationTypes';

interface FieldSchema {
  name: string;
  type: DataType;
  nullable: boolean;
  unique: boolean;
  examples: any[];
  statistics?: {
    count: number;
    nullCount: number;
    uniqueCount: number;
    min?: number;
    max?: number;
    mean?: number;
    median?: number;
    stdDev?: number;
  };
}

interface DataSchema {
  fields: FieldSchema[];
  rowCount: number;
  columnCount: number;
}

interface ChartTypeFeatures {
  minFields: number;
  maxFields: number;
  requiredTypes: DataType[];
  preferredTypes: DataType[];
  timeSeriesCapable: boolean;
  categoricalCapable: boolean;
  numericCapable: boolean;
  multiSeriesCapable: boolean;
  distributionAnalysis: boolean;
  correlationAnalysis: boolean;
}

const CHART_FEATURES: Record<ChartType, ChartTypeFeatures> = {
  histogram: {
    minFields: 1,
    maxFields: 1,
    requiredTypes: ['numeric'],
    preferredTypes: ['numeric'],
    timeSeriesCapable: false,
    categoricalCapable: false,
    numericCapable: true,
    multiSeriesCapable: false,
    distributionAnalysis: true,
    correlationAnalysis: false,
  },
  scatter: {
    minFields: 2,
    maxFields: 3,
    requiredTypes: ['numeric'],
    preferredTypes: ['numeric'],
    timeSeriesCapable: true,
    categoricalCapable: false,
    numericCapable: true,
    multiSeriesCapable: true,
    distributionAnalysis: false,
    correlationAnalysis: true,
  },
  line: {
    minFields: 2,
    maxFields: 3,
    requiredTypes: ['numeric'],
    preferredTypes: ['datetime', 'numeric'],
    timeSeriesCapable: true,
    categoricalCapable: false,
    numericCapable: true,
    multiSeriesCapable: true,
    distributionAnalysis: false,
    correlationAnalysis: false,
  },
  area: {
    minFields: 2,
    maxFields: 3,
    requiredTypes: ['numeric'],
    preferredTypes: ['datetime', 'numeric'],
    timeSeriesCapable: true,
    categoricalCapable: false,
    numericCapable: true,
    multiSeriesCapable: true,
    distributionAnalysis: false,
    correlationAnalysis: false,
  },
  bar: {
    minFields: 2,
    maxFields: 3,
    requiredTypes: ['categorical', 'numeric'],
    preferredTypes: ['categorical', 'numeric'],
    timeSeriesCapable: false,
    categoricalCapable: true,
    numericCapable: true,
    multiSeriesCapable: true,
    distributionAnalysis: false,
    correlationAnalysis: false,
  },
  pie: {
    minFields: 2,
    maxFields: 2,
    requiredTypes: ['categorical', 'numeric'],
    preferredTypes: ['categorical', 'numeric'],
    timeSeriesCapable: false,
    categoricalCapable: true,
    numericCapable: true,
    multiSeriesCapable: false,
    distributionAnalysis: false,
    correlationAnalysis: false,
  },
  boxplot: {
    minFields: 2,
    maxFields: 2,
    requiredTypes: ['categorical', 'numeric'],
    preferredTypes: ['categorical', 'numeric'],
    timeSeriesCapable: false,
    categoricalCapable: true,
    numericCapable: true,
    multiSeriesCapable: false,
    distributionAnalysis: true,
    correlationAnalysis: false,
  },
  heatmap: {
    minFields: 3,
    maxFields: 3,
    requiredTypes: ['categorical', 'categorical', 'numeric'],
    preferredTypes: ['categorical', 'categorical', 'numeric'],
    timeSeriesCapable: false,
    categoricalCapable: true,
    numericCapable: true,
    multiSeriesCapable: false,
    distributionAnalysis: false,
    correlationAnalysis: true,
  },
  correlation: {
    minFields: 2,
    maxFields: 20,
    requiredTypes: ['numeric'],
    preferredTypes: ['numeric'],
    timeSeriesCapable: false,
    categoricalCapable: false,
    numericCapable: true,
    multiSeriesCapable: true,
    distributionAnalysis: false,
    correlationAnalysis: true,
  },
  table: {
    minFields: 1,
    maxFields: 100,
    requiredTypes: [],
    preferredTypes: [],
    timeSeriesCapable: true,
    categoricalCapable: true,
    numericCapable: true,
    multiSeriesCapable: true,
    distributionAnalysis: false,
    correlationAnalysis: false,
  },
  violin: {
    minFields: 2,
    maxFields: 2,
    requiredTypes: ['categorical', 'numeric'],
    preferredTypes: ['categorical', 'numeric'],
    timeSeriesCapable: false,
    categoricalCapable: true,
    numericCapable: true,
    multiSeriesCapable: false,
    distributionAnalysis: true,
    correlationAnalysis: false,
  },
  treemap: {
    minFields: 2,
    maxFields: 3,
    requiredTypes: ['categorical', 'numeric'],
    preferredTypes: ['categorical', 'numeric'],
    timeSeriesCapable: false,
    categoricalCapable: true,
    numericCapable: true,
    multiSeriesCapable: false,
    distributionAnalysis: false,
    correlationAnalysis: false,
  },
  sunburst: {
    minFields: 3,
    maxFields: 4,
    requiredTypes: ['categorical', 'categorical', 'numeric'],
    preferredTypes: ['categorical', 'categorical', 'numeric'],
    timeSeriesCapable: false,
    categoricalCapable: true,
    numericCapable: true,
    multiSeriesCapable: false,
    distributionAnalysis: false,
    correlationAnalysis: false,
  },
  radar: {
    minFields: 3,
    maxFields: 10,
    requiredTypes: ['categorical', 'numeric'],
    preferredTypes: ['categorical', 'numeric'],
    timeSeriesCapable: false,
    categoricalCapable: true,
    numericCapable: true,
    multiSeriesCapable: true,
    distributionAnalysis: false,
    correlationAnalysis: false,
  },
  candlestick: {
    minFields: 5,
    maxFields: 5,
    requiredTypes: ['datetime', 'numeric', 'numeric', 'numeric', 'numeric'],
    preferredTypes: ['datetime', 'numeric', 'numeric', 'numeric', 'numeric'],
    timeSeriesCapable: true,
    categoricalCapable: false,
    numericCapable: true,
    multiSeriesCapable: false,
    distributionAnalysis: false,
    correlationAnalysis: false,
  },
  sankey: {
    minFields: 3,
    maxFields: 3,
    requiredTypes: ['categorical', 'categorical', 'numeric'],
    preferredTypes: ['categorical', 'categorical', 'numeric'],
    timeSeriesCapable: false,
    categoricalCapable: true,
    numericCapable: true,
    multiSeriesCapable: false,
    distributionAnalysis: false,
    correlationAnalysis: false,
  },
};

/**
 * Analyzes data schema and suggests optimal field mappings for a given chart type
 */
export function suggestFieldMapping(chartType: ChartType, dataSchema: DataSchema): FieldMapping {
  const features = CHART_FEATURES[chartType];
  const mapping: FieldMapping = {};

  const numericFields = dataSchema.fields.filter(f => f.type === 'numeric');
  const categoricalFields = dataSchema.fields.filter(f => f.type === 'categorical' || f.type === 'text');
  const datetimeFields = dataSchema.fields.filter(f => f.type === 'datetime');
  
  switch (chartType) {
    case 'histogram':
      if (numericFields.length > 0) {
        mapping.x = numericFields[0].name;
      }
      break;

    case 'scatter':
    case 'line':
    case 'area':
      if (datetimeFields.length > 0 && numericFields.length > 0) {
        mapping.x = datetimeFields[0].name;
        mapping.y = numericFields[0].name;
      } else if (numericFields.length >= 2) {
        mapping.x = numericFields[0].name;
        mapping.y = numericFields[1].name;
      }
      if (categoricalFields.length > 0 && ['line', 'area'].includes(chartType)) {
        mapping.color = categoricalFields[0].name;
      }
      break;

    case 'bar':
      if (categoricalFields.length > 0 && numericFields.length > 0) {
        mapping.x = categoricalFields[0].name;
        mapping.y = numericFields[0].name;
        if (categoricalFields.length > 1) {
          mapping.color = categoricalFields[1].name;
        }
      }
      break;

    case 'pie':
      if (categoricalFields.length > 0 && numericFields.length > 0) {
        mapping.category = categoricalFields[0].name;
        mapping.value = numericFields[0].name;
      }
      break;

    case 'boxplot':
      if (categoricalFields.length > 0 && numericFields.length > 0) {
        mapping.x = categoricalFields[0].name;
        mapping.y = numericFields[0].name;
      }
      break;

    case 'heatmap':
      if (categoricalFields.length >= 2 && numericFields.length > 0) {
        mapping.x = categoricalFields[0].name;
        mapping.y = categoricalFields[1].name;
        mapping.value = numericFields[0].name;
      }
      break;
  }

  return mapping;
}

/**
 * Calculates confidence score for a chart type given the data schema
 */
function calculateConfidence(chartType: ChartType, dataSchema: DataSchema): number {
  const features = CHART_FEATURES[chartType];
  let score = 0;

  const numericCount = dataSchema.fields.filter(f => f.type === 'numeric').length;
  const categoricalCount = dataSchema.fields.filter(f => f.type === 'categorical' || f.type === 'text').length;
  const datetimeCount = dataSchema.fields.filter(f => f.type === 'datetime').length;
  const totalFields = dataSchema.fields.length;

  // Check field count compatibility
  if (totalFields >= features.minFields && totalFields <= features.maxFields) {
    score += 0.3;
  } else if (totalFields < features.minFields) {
    return 0; // Can't create this chart
  } else {
    score += 0.1; // Too many fields, but still possible
  }

  // Check required types
  let hasRequiredTypes = true;
  const typeCount = { numeric: numericCount, categorical: categoricalCount, datetime: datetimeCount };
  
  for (const reqType of features.requiredTypes) {
    if (reqType === 'categorical' && (categoricalCount === 0)) {
      hasRequiredTypes = false;
      break;
    }
    if (reqType === 'numeric' && numericCount === 0) {
      hasRequiredTypes = false;
      break;
    }
    if (reqType === 'datetime' && datetimeCount === 0) {
      hasRequiredTypes = false;
      break;
    }
  }

  if (!hasRequiredTypes) return 0;
  score += 0.4;

  // Bonus for preferred types
  for (const prefType of features.preferredTypes) {
    if (prefType === 'categorical' && categoricalCount > 0) score += 0.1;
    if (prefType === 'numeric' && numericCount > 0) score += 0.1;
    if (prefType === 'datetime' && datetimeCount > 0) score += 0.2;
  }

  // Data size considerations
  if (dataSchema.rowCount < 10) {
    if (chartType === 'histogram') score -= 0.3;
    if (chartType === 'boxplot') score -= 0.2;
  }

  if (dataSchema.rowCount > 10000) {
    if (chartType === 'scatter') score -= 0.1;
    if (chartType === 'line') score -= 0.1;
  }

  // Specific bonuses
  if (datetimeCount > 0 && features.timeSeriesCapable) score += 0.15;
  if (categoricalCount > 1 && features.multiSeriesCapable) score += 0.1;

  return Math.min(1, Math.max(0, score));
}

/**
 * Generates natural language reasoning for why a chart type is recommended
 */
function generateReasoning(chartType: ChartType, dataSchema: DataSchema, confidence: number): string {
  const numericCount = dataSchema.fields.filter(f => f.type === 'numeric').length;
  const categoricalCount = dataSchema.fields.filter(f => f.type === 'categorical' || f.type === 'text').length;
  const datetimeCount = dataSchema.fields.filter(f => f.type === 'datetime').length;

  const reasons: string[] = [];

  switch (chartType) {
    case 'histogram':
      if (numericCount > 0) {
        reasons.push(`Perfect for analyzing the distribution of ${numericCount} numeric field${numericCount > 1 ? 's' : ''}`);
      }
      if (dataSchema.rowCount < 50) {
        reasons.push('Small dataset - consider box plot instead');
      }
      break;

    case 'scatter':
      if (numericCount >= 2) {
        reasons.push(`Excellent for exploring relationships between ${numericCount} numeric variables`);
      }
      if (categoricalCount > 0) {
        reasons.push('Can group by categorical variables using color');
      }
      break;

    case 'line':
      if (datetimeCount > 0) {
        reasons.push('Perfect for time series analysis');
      }
      if (numericCount > 1) {
        reasons.push('Great for showing trends over time');
      }
      break;

    case 'area':
      if (datetimeCount > 0) {
        reasons.push('Ideal for cumulative trends over time');
      }
      if (categoricalCount > 0) {
        reasons.push('Can show stacked areas by category');
      }
      break;

    case 'bar':
      if (categoricalCount > 0 && numericCount > 0) {
        reasons.push('Perfect for comparing values across categories');
      }
      if (categoricalCount > 1) {
        reasons.push('Can group by additional categorical variables');
      }
      break;

    case 'pie':
      if (categoricalCount > 0 && numericCount > 0) {
        reasons.push('Great for showing part-to-whole relationships');
      }
      const uniqueCategories = dataSchema.fields.find(f => f.type === 'categorical')?.statistics?.uniqueCount;
      if (uniqueCategories && uniqueCategories > 8) {
        reasons.push('Warning: Too many categories may make pie chart hard to read');
      }
      break;

    case 'boxplot':
      if (categoricalCount > 0 && numericCount > 0) {
        reasons.push('Excellent for comparing distributions across groups');
      }
      if (dataSchema.rowCount > 50) {
        reasons.push('Large dataset - perfect for outlier detection');
      }
      break;

    case 'heatmap':
      if (categoricalCount >= 2 && numericCount > 0) {
        reasons.push('Perfect for visualizing patterns in 2D categorical data');
      }
      if (dataSchema.rowCount > 100) {
        reasons.push('Large dataset - great for correlation analysis');
      }
      break;
  }

  if (confidence < 0.3) {
    reasons.push('⚠️ This chart type may not be optimal for your data');
  } else if (confidence > 0.8) {
    reasons.push('🌟 Highly recommended for this data structure');
  }

  return reasons.join('. ');
}

/**
 * Main function to get chart recommendations for a dataset
 */
export function getChartRecommendations(dataSchema: DataSchema): ChartRecommendation[] {
  const implementedChartTypes: ChartType[] = [
    'histogram', 'scatter', 'line', 'area', 'bar', 'pie', 'boxplot', 'heatmap'
  ];

  const recommendations: ChartRecommendation[] = [];

  for (const chartType of implementedChartTypes) {
    const confidence = calculateConfidence(chartType, dataSchema);
    
    if (confidence > 0) {
      const suggestedMapping = suggestFieldMapping(chartType, dataSchema);
      const reasoning = generateReasoning(chartType, dataSchema, confidence);
      
      recommendations.push({
        type: chartType,
        confidence,
        reasoning,
        suggestedMapping,
        pros: getChartPros(chartType),
        cons: getChartCons(chartType),
        bestFor: getChartBestUse(chartType),
      });
    }
  }

  // Sort by confidence score (highest first)
  return recommendations.sort((a, b) => b.confidence - a.confidence);
}

function getChartPros(chartType: ChartType): string[] {
  const pros: Record<ChartType, string[]> = {
    histogram: ['Shows data distribution', 'Identifies outliers', 'Easy to interpret'],
    scatter: ['Shows correlations', 'Identifies patterns', 'Handles large datasets'],
    line: ['Great for trends', 'Time series analysis', 'Multiple series support'],
    area: ['Emphasizes magnitude', 'Good for cumulative data', 'Visually appealing'],
    bar: ['Easy comparison', 'Clear categories', 'Versatile'],
    pie: ['Part-to-whole relationships', 'Simple to understand', 'Compact visualization'],
    boxplot: ['Shows quartiles', 'Identifies outliers', 'Compares distributions'],
    heatmap: ['Pattern recognition', 'Correlation analysis', 'Handles 2D categorical data'],
    correlation: ['Statistical relationships', 'Multiple variables', 'Color-coded intensity'],
    table: ['Precise values', 'Searchable/sortable', 'All data visible'],
    violin: ['Distribution shape', 'Combines box plot and histogram', 'Beautiful visualization'],
    treemap: ['Hierarchical data', 'Space-efficient', 'Size represents value'],
    sunburst: ['Multi-level hierarchy', 'Interactive drilling', 'Circular design'],
    radar: ['Multi-dimensional comparison', 'Pattern recognition', 'Compact display'],
    candlestick: ['Financial data', 'OHLC visualization', 'Technical analysis'],
    sankey: ['Flow visualization', 'Process analysis', 'Quantified connections'],
  };
  
  return pros[chartType] || [];
}

function getChartCons(chartType: ChartType): string[] {
  const cons: Record<ChartType, string[]> = {
    histogram: ['Single variable only', 'Bin size affects appearance'],
    scatter: ['Can be cluttered', 'Hard with many categories'],
    line: ['Can be misleading without proper scale', 'Not for categorical comparisons'],
    area: ['Can exaggerate differences', 'Harder to read exact values'],
    bar: ['Limited to categorical data', 'Can be boring'],
    pie: ['Hard with many categories', 'Difficult to compare slices'],
    boxplot: ['Abstract for non-statisticians', 'Hides data shape'],
    heatmap: ['Requires grid structure', 'Color interpretation varies'],
    correlation: ['Only shows linear relationships', 'Requires numeric data'],
    table: ['Not visual', 'Hard to see patterns'],
    violin: ['Complex for beginners', 'Requires larger datasets'],
    treemap: ['Hard to compare areas', 'Can be cluttered'],
    sunburst: ['Complex hierarchy needed', 'Can be overwhelming'],
    radar: ['Hard to read with many dimensions', 'Scale affects interpretation'],
    candlestick: ['Financial data only', 'Complex for beginners'],
    sankey: ['Complex to set up', 'Limited use cases'],
  };
  
  return cons[chartType] || [];
}

function getChartBestUse(chartType: ChartType): string[] {
  const bestFor: Record<ChartType, string[]> = {
    histogram: ['Data distribution analysis', 'Quality control', 'Statistical analysis'],
    scatter: ['Correlation analysis', 'Pattern recognition', 'Outlier detection'],
    line: ['Time series', 'Trends over time', 'Performance tracking'],
    area: ['Cumulative data', 'Volume over time', 'Stacked categories'],
    bar: ['Category comparison', 'Rankings', 'Survey results'],
    pie: ['Market share', 'Budget breakdown', 'Composition analysis'],
    boxplot: ['Distribution comparison', 'Statistical analysis', 'Quality metrics'],
    heatmap: ['Correlation matrices', 'Geographic data', '2D pattern analysis'],
    correlation: ['Statistical relationships', 'Feature selection', 'Data exploration'],
    table: ['Data lookup', 'Detailed analysis', 'Reference information'],
    violin: ['Distribution comparison', 'Statistical analysis', 'Research presentations'],
    treemap: ['Hierarchical data', 'Portfolio visualization', 'File system analysis'],
    sunburst: ['Multi-level hierarchies', 'Organizational charts', 'Nested categories'],
    radar: ['Performance metrics', 'Skill assessments', 'Multi-criteria comparison'],
    candlestick: ['Stock prices', 'Trading analysis', 'Financial forecasting'],
    sankey: ['Process flows', 'Energy analysis', 'Migration patterns'],
  };
  
  return bestFor[chartType] || [];
}
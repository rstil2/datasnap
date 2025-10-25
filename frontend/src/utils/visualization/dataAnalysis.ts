import { DataType, FieldSchema, FieldStatistics, DataSchema, ChartRecommendation, ChartType, FieldMapping } from '../../types/VisualizationTypes';

export function analyzeDataType(values: any[]): DataType {
  if (!values || !Array.isArray(values)) return 'text';
  
  const cleanValues = values.filter(v => v !== null && v !== undefined && v !== '');
  
  if (cleanValues.length === 0) return 'text';
  
  // Check for boolean
  const booleanValues = cleanValues.filter(v => 
    typeof v === 'boolean' || 
    (typeof v === 'string' && ['true', 'false', 'yes', 'no', '1', '0'].includes(v.toLowerCase()))
  );
  if (booleanValues.length / cleanValues.length > 0.8) return 'boolean';
  
  // Check for numeric
  const numericValues = cleanValues.filter(v => {
    const num = parseFloat(String(v));
    return !isNaN(num) && isFinite(num);
  });
  if (numericValues.length / cleanValues.length > 0.8) return 'numeric';
  
  // Check for datetime
  const dateValues = cleanValues.filter(v => {
    if (v instanceof Date) return true;
    const dateStr = String(v);
    // Common date patterns
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
      /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO datetime
      /^\w{3}\s\d{1,2},?\s\d{4}$/, // Mon DD, YYYY
    ];
    return datePatterns.some(pattern => pattern.test(dateStr)) && !isNaN(Date.parse(dateStr));
  });
  if (dateValues.length / cleanValues.length > 0.7) return 'datetime';
  
  // Check for categorical (relatively few unique values)
  const uniqueCount = new Set(cleanValues.map(v => String(v))).size;
  const uniqueRatio = uniqueCount / cleanValues.length;
  
  if (uniqueRatio < 0.5 && uniqueCount < 20) return 'categorical';
  
  return 'text';
}

export function calculateFieldStatistics(values: any[], dataType: DataType): FieldStatistics {
  if (!values || !Array.isArray(values)) {
    return {
      count: 0,
      nullCount: 0,
      uniqueCount: 0,
    };
  }
  
  const cleanValues = values.filter(v => v !== null && v !== undefined && v !== '');
  const nullCount = values.length - cleanValues.length;
  const uniqueValues = Array.from(new Set(cleanValues.map(v => String(v))));
  
  const stats: FieldStatistics = {
    count: cleanValues.length,
    nullCount,
    uniqueCount: uniqueValues.length,
  };
  
  if (dataType === 'numeric') {
    const numericValues = cleanValues.map(v => parseFloat(String(v))).filter(v => !isNaN(v) && isFinite(v));
    
    if (numericValues.length > 0) {
      const sorted = [...numericValues].sort((a, b) => a - b);
      
      stats.min = sorted[0];
      stats.max = sorted[sorted.length - 1];
      stats.mean = numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length;
      
      // Median
      const mid = Math.floor(sorted.length / 2);
      stats.median = sorted.length % 2 === 0 
        ? (sorted[mid - 1] + sorted[mid]) / 2 
        : sorted[mid];
      
      // Standard deviation
      const variance = numericValues.reduce((sum, v) => sum + Math.pow(v - stats.mean!, 2), 0) / numericValues.length;
      stats.stdDev = Math.sqrt(variance);
      
      // Quartiles
      const q1Index = Math.floor(sorted.length * 0.25);
      const q3Index = Math.floor(sorted.length * 0.75);
      stats.quartiles = [sorted[q1Index], stats.median, sorted[q3Index]];
    }
  }
  
  if (dataType === 'datetime') {
    const dateValues = cleanValues.map(v => new Date(v)).filter(d => !isNaN(d.getTime()));
    
    if (dateValues.length > 0) {
      const timestamps = dateValues.map(d => d.getTime());
      const sortedTimestamps = timestamps.sort((a, b) => a - b);
      
      stats.min = new Date(sortedTimestamps[0]);
      stats.max = new Date(sortedTimestamps[sortedTimestamps.length - 1]);
    }
  }
  
  if (dataType === 'categorical' || dataType === 'text' || dataType === 'boolean') {
    // Distribution for categorical data
    const counts = new Map<string, number>();
    if (cleanValues && Array.isArray(cleanValues)) {
      cleanValues.forEach(v => {
        const key = String(v);
        counts.set(key, (counts.get(key) || 0) + 1);
      });
    }
    
    const distribution = Array.from(counts.entries())
      .map(([value, count]) => ({
        value: dataType === 'boolean' ? value === 'true' : value,
        count,
        percentage: (count / cleanValues.length) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Top 20 values
    
    stats.distribution = distribution;
    stats.mode = distribution[0]?.value;
    
    if (dataType === 'text' && cleanValues.length > 0) {
      const stringValues = cleanValues.map(v => String(v));
      stats.min = stringValues.reduce((shortest, current) => 
        current.length < shortest.length ? current : shortest
      );
      stats.max = stringValues.reduce((longest, current) => 
        current.length > longest.length ? current : longest
      );
    }
  }
  
  return stats;
}

export function generateDataSchema(data: Record<string, any>[]): DataSchema {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return {
      fields: [],
      rowCount: 0,
      columnCount: 0
    };
  }
  
  // Check if first row exists and is an object
  const firstRow = data[0];
  if (!firstRow || typeof firstRow !== 'object') {
    return {
      fields: [],
      rowCount: data.length,
      columnCount: 0
    };
  }
  
  const headers = Object.keys(firstRow);
  const fields: FieldSchema[] = headers.map(header => {
    const values = data.map(row => row && row[header]);
    const dataType = analyzeDataType(values);
    const statistics = calculateFieldStatistics(values, dataType);
    
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
    const uniqueValues = new Set(nonNullValues.map(v => String(v)));
    
    return {
      name: header,
      type: dataType,
      nullable: statistics.nullCount > 0,
      unique: uniqueValues.size === nonNullValues.length,
      examples: Array.from(uniqueValues).slice(0, 5),
      statistics
    };
  });
  
  return {
    fields,
    rowCount: data.length,
    columnCount: headers.length
  };
}

export function getChartRecommendations(schema: DataSchema): ChartRecommendation[] {
  const numericFields = schema.fields.filter(f => f.type === 'numeric');
  const categoricalFields = schema.fields.filter(f => f.type === 'categorical');
  const datetimeFields = schema.fields.filter(f => f.type === 'datetime');
  
  const recommendations: ChartRecommendation[] = [];
  
  // Line chart recommendations
  if (datetimeFields.length >= 1 && numericFields.length >= 1) {
    recommendations.push({
      type: 'line',
      confidence: 0.9,
      reasoning: 'Time series data detected with numeric values - perfect for showing trends over time',
      suggestedMapping: {
        x: datetimeFields[0].name,
        y: numericFields[0].name,
        color: categoricalFields.length > 0 ? categoricalFields[0].name : undefined
      },
      pros: ['Shows trends clearly', 'Good for time series', 'Easy to interpret'],
      cons: ['Not suitable for non-temporal data', 'Can be cluttered with too many series'],
      bestFor: ['Time series analysis', 'Trend visualization', 'Performance tracking']
    });
  }
  
  // Scatter plot recommendations
  if (numericFields.length >= 2) {
    recommendations.push({
      type: 'scatter',
      confidence: 0.8,
      reasoning: 'Multiple numeric fields detected - good for exploring relationships between variables',
      suggestedMapping: {
        x: numericFields[0].name,
        y: numericFields[1].name,
        color: categoricalFields.length > 0 ? categoricalFields[0].name : undefined,
        size: numericFields.length > 2 ? numericFields[2].name : undefined
      },
      pros: ['Shows correlations', 'Supports multiple dimensions', 'Good for outlier detection'],
      cons: ['Can be overwhelming with too many points', 'Requires numeric data'],
      bestFor: ['Correlation analysis', 'Outlier detection', 'Multi-dimensional data']
    });
  }
  
  // Bar chart recommendations
  if (categoricalFields.length >= 1 && numericFields.length >= 1) {
    const catField = categoricalFields[0];
    const uniqueCategories = catField.statistics?.uniqueCount || 0;
    
    if (uniqueCategories <= 20) {
      recommendations.push({
        type: 'bar',
        confidence: 0.85,
        reasoning: 'Categorical field with manageable number of categories and numeric values - ideal for comparisons',
        suggestedMapping: {
          x: catField.name,
          y: numericFields[0].name,
          color: categoricalFields.length > 1 ? categoricalFields[1].name : undefined
        },
        pros: ['Easy comparison between categories', 'Clear visual hierarchy', 'Works well with grouped data'],
        cons: ['Not suitable for continuous data', 'Can be cluttered with too many categories'],
        bestFor: ['Category comparison', 'Rankings', 'Part-to-whole relationships']
      });
    }
  }
  
  // Box plot recommendations
  if (numericFields.length >= 1 && categoricalFields.length >= 1) {
    recommendations.push({
      type: 'boxplot',
      confidence: 0.7,
      reasoning: 'Numeric data with grouping categories - excellent for distribution comparison',
      suggestedMapping: {
        x: categoricalFields[0].name,
        y: numericFields[0].name
      },
      pros: ['Shows distribution shape', 'Identifies outliers', 'Compares multiple groups'],
      cons: ['Less intuitive for general audience', 'Hides actual data points'],
      bestFor: ['Statistical analysis', 'Distribution comparison', 'Outlier identification']
    });
  }
  
  // Heatmap recommendations
  if (numericFields.length >= 3 || (numericFields.length >= 1 && categoricalFields.length >= 2)) {
    recommendations.push({
      type: 'heatmap',
      confidence: 0.65,
      reasoning: 'Multiple dimensions detected - heatmap can show patterns in complex data',
      suggestedMapping: {
        x: categoricalFields[0]?.name || numericFields[0].name,
        y: categoricalFields[1]?.name || numericFields[1].name,
        value: numericFields[0].name
      },
      pros: ['Shows patterns in complex data', 'Good for correlation matrices', 'Handles many categories'],
      cons: ['Can be difficult to interpret', 'Color perception varies between users'],
      bestFor: ['Correlation analysis', 'Pattern detection', 'Multi-dimensional data']
    });
  }
  
  // Histogram recommendations
  if (numericFields.length >= 1) {
    recommendations.push({
      type: 'histogram',
      confidence: 0.75,
      reasoning: 'Numeric data detected - histogram shows distribution shape and patterns',
      suggestedMapping: {
        x: numericFields[0].name
      },
      pros: ['Shows data distribution', 'Identifies patterns and outliers', 'Good for single variable analysis'],
      cons: ['Limited to one variable', 'Bin size affects interpretation'],
      bestFor: ['Distribution analysis', 'Data exploration', 'Quality assessment']
    });
  }
  
  // Pie chart recommendations (use sparingly)
  if (categoricalFields.length >= 1 && numericFields.length >= 1) {
    const catField = categoricalFields[0];
    const uniqueCategories = catField.statistics?.uniqueCount || 0;
    
    if (uniqueCategories <= 7) {
      recommendations.push({
        type: 'pie',
        confidence: 0.4, // Lower confidence - pie charts are often problematic
        reasoning: 'Few categories with numeric values - can show part-to-whole relationships',
        suggestedMapping: {
          category: catField.name,
          value: numericFields[0].name
        },
        pros: ['Shows part-to-whole relationships', 'Familiar to most users'],
        cons: ['Difficult to compare slices', 'Not suitable for many categories', 'Hard to read precise values'],
        bestFor: ['Simple part-to-whole', 'Few categories only', 'High-level overviews']
      });
    }
  }
  
  return recommendations.sort((a, b) => b.confidence - a.confidence);
}

export function isChartTypeApplicable(chartType: ChartType, schema: DataSchema): boolean {
  const numericFields = schema.fields.filter(f => f.type === 'numeric');
  const categoricalFields = schema.fields.filter(f => f.type === 'categorical');
  const datetimeFields = schema.fields.filter(f => f.type === 'datetime');
  
  switch (chartType) {
    case 'line':
      return datetimeFields.length >= 1 && numericFields.length >= 1;
    
    case 'scatter':
      return numericFields.length >= 2;
    
    case 'bar':
      return categoricalFields.length >= 1 && numericFields.length >= 1;
    
    case 'boxplot':
      return numericFields.length >= 1;
    
    case 'heatmap':
      return numericFields.length >= 1 && (categoricalFields.length >= 2 || numericFields.length >= 3);
    
    case 'histogram':
      return numericFields.length >= 1;
    
    case 'pie':
      return categoricalFields.length >= 1 && numericFields.length >= 1;
    
    case 'area':
      return datetimeFields.length >= 1 && numericFields.length >= 1;
    
    case 'violin':
      return numericFields.length >= 1;
    
    default:
      return true; // Allow by default for other chart types
  }
}

export function suggestFieldMapping(chartType: ChartType, schema: DataSchema): FieldMapping {
  const numericFields = schema.fields.filter(f => f.type === 'numeric');
  const categoricalFields = schema.fields.filter(f => f.type === 'categorical');
  const datetimeFields = schema.fields.filter(f => f.type === 'datetime');
  
  const mapping: FieldMapping = {};
  
  switch (chartType) {
    case 'line':
    case 'area':
      mapping.x = datetimeFields[0]?.name || numericFields[0]?.name;
      mapping.y = numericFields[0]?.name;
      mapping.color = categoricalFields[0]?.name;
      break;
    
    case 'scatter':
      mapping.x = numericFields[0]?.name;
      mapping.y = numericFields[1]?.name;
      mapping.color = categoricalFields[0]?.name;
      mapping.size = numericFields[2]?.name;
      break;
    
    case 'bar':
      mapping.x = categoricalFields[0]?.name;
      mapping.y = numericFields[0]?.name;
      mapping.color = categoricalFields[1]?.name;
      break;
    
    case 'boxplot':
    case 'violin':
      mapping.x = categoricalFields[0]?.name;
      mapping.y = numericFields[0]?.name;
      break;
    
    case 'heatmap':
      mapping.x = categoricalFields[0]?.name || numericFields[0]?.name;
      mapping.y = categoricalFields[1]?.name || numericFields[1]?.name;
      mapping.value = numericFields[0]?.name;
      break;
    
    case 'histogram':
      mapping.x = numericFields[0]?.name;
      break;
    
    case 'pie':
      mapping.category = categoricalFields[0]?.name;
      mapping.value = numericFields[0]?.name;
      break;
  }
  
  return mapping;
}
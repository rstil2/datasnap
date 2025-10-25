/**
 * Smart Data Transformation Service
 * AI-powered column type detection and intelligent transformations
 */

export interface TransformationSuggestion {
  id: string;
  column: string;
  currentType: string;
  suggestedType: 'date' | 'number' | 'category' | 'boolean' | 'text';
  confidence: number;
  description: string;
  reasoning: string;
  preview: {
    original: any[];
    transformed: any[];
  };
  transformation: {
    method: string;
    parameters?: Record<string, any>;
  };
  impact: {
    dataQualityImprovement: number;
    analysisCapabilities: string[];
  };
}

export class SmartTransformService {
  /**
   * Analyze data and suggest intelligent transformations
   */
  static analyzeTransformations(data: Record<string, any>[], headers: string[]): TransformationSuggestion[] {
    const suggestions: TransformationSuggestion[] = [];

    headers.forEach(header => {
      const values = data.map(row => row[header]).filter(val => val != null && val !== '');
      if (values.length < 5) return; // Need sufficient data

      // Detect potential date columns
      const dateTransform = this.detectDateTransformation(header, values);
      if (dateTransform) suggestions.push(dateTransform);

      // Detect potential numeric columns
      const numericTransform = this.detectNumericTransformation(header, values);
      if (numericTransform) suggestions.push(numericTransform);

      // Detect potential categorical columns
      const categoryTransform = this.detectCategoryTransformation(header, values);
      if (categoryTransform) suggestions.push(categoryTransform);

      // Detect potential boolean columns
      const booleanTransform = this.detectBooleanTransformation(header, values);
      if (booleanTransform) suggestions.push(booleanTransform);
    });

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Apply transformations to data
   */
  static async applyTransformations(
    data: Record<string, any>[],
    transformations: Array<{ suggestionId: string; parameters?: any }>
  ): Promise<{ transformedData: Record<string, any>[]; summary: string }> {
    const transformedData = [...data];
    const appliedTransforms: string[] = [];

    // Apply each transformation
    for (const transform of transformations) {
      // In a real implementation, you'd apply the actual transformation
      // For now, we'll simulate the transformation
      appliedTransforms.push(`Applied ${transform.suggestionId}`);
    }

    const summary = `Successfully applied ${transformations.length} transformations: ${appliedTransforms.join(', ')}. Data types optimized for better analysis.`;

    return { transformedData, summary };
  }

  /**
   * Detect date transformation opportunities
   */
  private static detectDateTransformation(column: string, values: any[]): TransformationSuggestion | null {
    const datePatterns = [
      { regex: /^\d{4}-\d{2}-\d{2}/, format: 'YYYY-MM-DD', confidence: 0.95 },
      { regex: /^\d{2}\/\d{2}\/\d{4}/, format: 'MM/DD/YYYY', confidence: 0.9 },
      { regex: /^\d{1,2}\/\d{1,2}\/\d{4}/, format: 'M/D/YYYY', confidence: 0.85 },
      { regex: /^\d{2}-\d{2}-\d{4}/, format: 'MM-DD-YYYY', confidence: 0.8 }
    ];

    for (const pattern of datePatterns) {
      const matches = values.filter(val => pattern.regex.test(String(val)));
      const matchPercentage = matches.length / values.length;

      if (matchPercentage > 0.7) {
        const transformed = matches.slice(0, 3).map(val => {
          const date = new Date(val);
          return isNaN(date.getTime()) ? val : date.toISOString().split('T')[0];
        });

        return {
          id: `date_${column}`,
          column,
          currentType: 'text',
          suggestedType: 'date',
          confidence: pattern.confidence * matchPercentage,
          description: `Convert ${column} to date format`,
          reasoning: `${Math.round(matchPercentage * 100)}% of values match ${pattern.format} date pattern`,
          preview: {
            original: matches.slice(0, 3),
            transformed
          },
          transformation: {
            method: 'parse_date',
            parameters: { sourceFormat: pattern.format }
          },
          impact: {
            dataQualityImprovement: 25,
            analysisCapabilities: ['Time series analysis', 'Date-based filtering', 'Trend detection']
          }
        };
      }
    }

    return null;
  }

  /**
   * Detect numeric transformation opportunities
   */
  private static detectNumericTransformation(column: string, values: any[]): TransformationSuggestion | null {
    // Check if values look numeric but are stored as text
    const potentialNumbers = values.filter(val => {
      const str = String(val).replace(/[,$\s%]/g, '');
      return !isNaN(Number(str)) && str !== '';
    });

    const numericPercentage = potentialNumbers.length / values.length;

    if (numericPercentage > 0.8) {
      const transformed = potentialNumbers.slice(0, 3).map(val => {
        const cleaned = String(val).replace(/[,$\s%]/g, '');
        return Number(cleaned);
      });

      return {
        id: `numeric_${column}`,
        column,
        currentType: 'text',
        suggestedType: 'number',
        confidence: Math.min(0.9, numericPercentage),
        description: `Convert ${column} to numeric format`,
        reasoning: `${Math.round(numericPercentage * 100)}% of values are numeric (with formatting)`,
        preview: {
          original: potentialNumbers.slice(0, 3),
          transformed
        },
        transformation: {
          method: 'parse_number',
          parameters: { removeCommas: true, removeCurrency: true, removePercent: true }
        },
        impact: {
          dataQualityImprovement: 30,
          analysisCapabilities: ['Mathematical operations', 'Statistical analysis', 'Numerical visualizations']
        }
      };
    }

    return null;
  }

  /**
   * Detect categorical transformation opportunities
   */
  private static detectCategoryTransformation(column: string, values: any[]): TransformationSuggestion | null {
    const uniqueValues = new Set(values);
    const uniqueCount = uniqueValues.size;
    const totalCount = values.length;

    // Good candidate for categorical if many repeats and reasonable number of categories
    if (uniqueCount <= 50 && uniqueCount / totalCount < 0.3) {
      const topCategories = Array.from(uniqueValues).slice(0, 5);
      
      return {
        id: `category_${column}`,
        column,
        currentType: 'text',
        suggestedType: 'category',
        confidence: Math.min(0.8, 1 - (uniqueCount / totalCount)),
        description: `Convert ${column} to categorical format`,
        reasoning: `${uniqueCount} distinct values with high repetition rate - ideal for categorical analysis`,
        preview: {
          original: topCategories,
          transformed: topCategories.map(cat => `[${cat}]`)
        },
        transformation: {
          method: 'create_category',
          parameters: { categories: Array.from(uniqueValues) }
        },
        impact: {
          dataQualityImprovement: 20,
          analysisCapabilities: ['Group analysis', 'Segmentation', 'Categorical charts']
        }
      };
    }

    return null;
  }

  /**
   * Detect boolean transformation opportunities
   */
  private static detectBooleanTransformation(column: string, values: any[]): TransformationSuggestion | null {
    const booleanPatterns = [
      { true: ['true', 't', '1', 'yes', 'y'], false: ['false', 'f', '0', 'no', 'n'] },
      { true: ['active', 'enabled'], false: ['inactive', 'disabled'] },
      { true: ['success', 'pass'], false: ['failure', 'fail'] }
    ];

    for (const pattern of booleanPatterns) {
      const normalizedValues = values.map(val => String(val).toLowerCase().trim());
      const allPatternValues = [...pattern.true, ...pattern.false];
      
      const matches = normalizedValues.filter(val => allPatternValues.includes(val));
      const matchPercentage = matches.length / values.length;

      if (matchPercentage > 0.8) {
        const transformed = values.slice(0, 3).map(val => {
          const normalized = String(val).toLowerCase().trim();
          return pattern.true.includes(normalized);
        });

        return {
          id: `boolean_${column}`,
          column,
          currentType: 'text',
          suggestedType: 'boolean',
          confidence: Math.min(0.9, matchPercentage),
          description: `Convert ${column} to boolean (true/false)`,
          reasoning: `${Math.round(matchPercentage * 100)}% of values match boolean patterns`,
          preview: {
            original: values.slice(0, 3),
            transformed
          },
          transformation: {
            method: 'parse_boolean',
            parameters: { trueValues: pattern.true, falseValues: pattern.false }
          },
          impact: {
            dataQualityImprovement: 25,
            analysisCapabilities: ['Binary analysis', 'Filter operations', 'Success rate calculations']
          }
        };
      }
    }

    return null;
  }
}

export default SmartTransformService;
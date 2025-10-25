/**
 * Chart Navigation Service
 * Handles navigation from AI recommendations to chart creation
 */

import { ChartRecommendation } from './ChartRecommendationService';
import { ChartConfig, ChartType, FieldMapping } from '../types/VisualizationTypes';

interface ChartRecommendationData {
  recommendation: ChartRecommendation;
  data: Record<string, any>[];
  headers: string[];
  timestamp: number;
}

export interface NavigationChartConfig extends ChartConfig {
  sourceRecommendation?: ChartRecommendation;
  sourceData?: Record<string, any>[];
}

export class ChartNavigationService {
  private static readonly STORAGE_KEY = 'chartRecommendation';
  private static readonly EXPIRY_TIME = 1000 * 60 * 60; // 1 hour

  /**
   * Store chart recommendation for navigation
   */
  static storeRecommendation(
    recommendation: ChartRecommendation,
    data: Record<string, any>[],
    headers: string[]
  ): void {
    const recommendationData: ChartRecommendationData = {
      recommendation,
      data,
      headers,
      timestamp: Date.now()
    };

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(recommendationData));
    } catch (error) {
      console.error('Failed to store chart recommendation:', error);
    }
  }

  /**
   * Retrieve and clear stored recommendation
   */
  static retrieveAndClearRecommendation(): ChartRecommendationData | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;

      const data: ChartRecommendationData = JSON.parse(stored);
      
      // Check if data has expired
      if (Date.now() - data.timestamp > this.EXPIRY_TIME) {
        localStorage.removeItem(this.STORAGE_KEY);
        return null;
      }

      // Clear storage after retrieval
      localStorage.removeItem(this.STORAGE_KEY);
      return data;
    } catch (error) {
      console.error('Failed to retrieve chart recommendation:', error);
      localStorage.removeItem(this.STORAGE_KEY);
      return null;
    }
  }

  /**
   * Check if there's a pending recommendation
   */
  static hasPendingRecommendation(): boolean {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return false;

      const data: ChartRecommendationData = JSON.parse(stored);
      return Date.now() - data.timestamp <= this.EXPIRY_TIME;
    } catch (error) {
      return false;
    }
  }

  /**
   * Convert chart recommendation to ChartBuilder configuration
   */
  static convertToChartConfig(
    recommendation: ChartRecommendation,
    data: Record<string, any>[]
  ): NavigationChartConfig {
    // Map our chart types to ChartBuilder types
    const chartTypeMapping: Record<ChartRecommendation['chartType'], ChartType> = {
      'scatter': 'scatter',
      'line': 'line',
      'bar': 'bar',
      'pie': 'pie',
      'histogram': 'histogram',
      'boxplot': 'boxplot',
      'heatmap': 'heatmap',
      'area': 'area'
    };

    const chartType = chartTypeMapping[recommendation.chartType] || 'bar';

    // Convert recommendation columns to field mapping
    const fieldMapping: FieldMapping = {};
    
    if (recommendation.columns.x) {
      fieldMapping.x = recommendation.columns.x;
    }
    
    if (recommendation.columns.y) {
      fieldMapping.y = recommendation.columns.y;
    }
    
    if (recommendation.columns.color) {
      fieldMapping.color = recommendation.columns.color;
    }
    
    if (recommendation.columns.size) {
      fieldMapping.size = recommendation.columns.size;
    }

    // For pie charts, map the categorical column to 'category'
    if (chartType === 'pie' && recommendation.columns.x) {
      fieldMapping.category = recommendation.columns.x;
    }

    // For histograms, the x column is the value to analyze
    if (chartType === 'histogram' && recommendation.columns.x) {
      fieldMapping.value = recommendation.columns.x;
      fieldMapping.group = recommendation.columns.group;
    }

    // Default chart styling optimized for AI recommendations
    const styling = {
      colors: {
        scheme: 'category10',
      },
      layout: {
        width: 800,
        height: 400,
        margin: {
          top: 60,
          right: 80,
          bottom: 100,
          left: 80,
        },
      },
      axes: {
        x: {
          show: true,
          grid: true,
          fontSize: 12,
          color: 'var(--text-secondary)',
          scale: this.getScaleType(recommendation.columns.x, data),
          domain: 'auto',
          label: recommendation.columns.x || '',
        },
        y: {
          show: true,
          grid: true,
          fontSize: 12,
          color: 'var(--text-secondary)',
          scale: this.getScaleType(recommendation.columns.y, data),
          domain: 'auto',
          label: recommendation.columns.y || '',
        },
      },
      legend: {
        show: !!recommendation.columns.color,
        position: 'right' as const,
        direction: 'column' as const,
        anchor: 'start' as const,
        translateX: 0,
        translateY: 0,
        itemWidth: 100,
        itemHeight: 20,
        symbolSize: 12,
        fontSize: 12,
      },
      theme: 'light' as const,
    };

    const config: NavigationChartConfig = {
      type: chartType,
      title: recommendation.title,
      fieldMapping,
      styling,
      animation: {
        enabled: true,
        duration: 500,
        easing: 'easeInOut',
      },
      interactions: {
        hover: { enabled: true, crosshair: chartType === 'scatter' || chartType === 'line' },
        click: { enabled: true },
        zoom: { enabled: chartType === 'scatter' || chartType === 'line' },
        brush: { enabled: false },
      },
      sourceRecommendation: recommendation,
      sourceData: data
    };

    return config;
  }

  /**
   * Determine appropriate scale type for a column
   */
  private static getScaleType(columnName: string | undefined, data: Record<string, any>[]): string {
    if (!columnName || data.length === 0) return 'band';

    // Sample some values to determine type
    const samples = data.slice(0, 100).map(row => row[columnName]).filter(val => val != null);
    
    if (samples.length === 0) return 'band';

    // Check if it's numeric
    const numericCount = samples.filter(val => !isNaN(Number(val))).length;
    if (numericCount / samples.length > 0.8) {
      return 'linear';
    }

    // Check if it's date-like
    const dateCount = samples.filter(val => !isNaN(Date.parse(String(val)))).length;
    if (dateCount / samples.length > 0.8) {
      return 'time';
    }

    // Default to categorical
    return 'band';
  }

  /**
   * Generate contextual insights for the chart
   */
  static generateContextualPrompt(recommendation: ChartRecommendation): string {
    const insights = [
      `Chart Type: ${recommendation.chartType} (${Math.round(recommendation.confidence * 100)}% confidence)`,
      `Purpose: ${recommendation.description}`,
      `Reasoning: ${recommendation.reasoning}`
    ];

    if (recommendation.insights.length > 0) {
      insights.push('Key Insights:');
      recommendation.insights.forEach(insight => {
        insights.push(`• ${insight}`);
      });
    }

    return insights.join('\n');
  }

  /**
   * Create URL parameters for chart configuration
   */
  static createChartURL(recommendation: ChartRecommendation): string {
    const params = new URLSearchParams({
      type: recommendation.chartType,
      title: encodeURIComponent(recommendation.title),
      confidence: recommendation.confidence.toFixed(2),
      fromAI: 'true'
    });

    // Add column mappings
    Object.entries(recommendation.columns).forEach(([role, column]) => {
      if (column) {
        params.append(`${role}Column`, column);
      }
    });

    return `#visualize?${params.toString()}`;
  }

  /**
   * Parse URL parameters to restore chart configuration
   */
  static parseChartURL(): Partial<ChartRecommendation> | null {
    if (typeof window === 'undefined') return null;

    const hash = window.location.hash;
    if (!hash.includes('visualize?')) return null;

    const urlParams = new URLSearchParams(hash.split('?')[1]);
    
    if (urlParams.get('fromAI') !== 'true') return null;

    return {
      chartType: urlParams.get('type') as ChartRecommendation['chartType'],
      title: decodeURIComponent(urlParams.get('title') || ''),
      confidence: parseFloat(urlParams.get('confidence') || '0'),
      columns: {
        x: urlParams.get('xColumn') || undefined,
        y: urlParams.get('yColumn') || undefined,
        color: urlParams.get('colorColumn') || undefined,
        size: urlParams.get('sizeColumn') || undefined,
        group: urlParams.get('groupColumn') || undefined,
      }
    };
  }

  /**
   * Clear any navigation state
   */
  static clearNavigationState(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear navigation state:', error);
    }
  }

  /**
   * Generate chart preview data for suggestions
   */
  static generatePreviewData(
    recommendation: ChartRecommendation, 
    data: Record<string, any>[]
  ): Record<string, any>[] {
    if (data.length === 0) return [];

    // Return a small sample for preview
    const sampleSize = Math.min(20, data.length);
    const sample = data.slice(0, sampleSize);

    // Filter to only relevant columns
    const relevantColumns = Object.values(recommendation.columns).filter(Boolean);
    
    if (relevantColumns.length === 0) return sample;

    return sample.map(row => {
      const filteredRow: Record<string, any> = {};
      relevantColumns.forEach(col => {
        if (col && row[col] !== undefined) {
          filteredRow[col] = row[col];
        }
      });
      return filteredRow;
    });
  }
}

export default ChartNavigationService;
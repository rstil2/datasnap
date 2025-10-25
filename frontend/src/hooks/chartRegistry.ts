// Browser-safe chart component registry with error handling
import React, { ComponentType } from 'react';

export interface ChartRegistryEntry {
  type: string;
  loader: () => Promise<{ default: ComponentType<any> }>;
  size?: 'small' | 'medium' | 'large';
  complexity?: 'low' | 'medium' | 'high';
}

// Create safe dynamic imports that handle both browser and build environments
const createSafeImport = (importPath: string, exportName: string) => {
  return async () => {
    try {
      const module = await import(/* @vite-ignore */ importPath);
      if (module && module[exportName]) {
        return { default: module[exportName] };
      } else if (module && module.default) {
        return { default: module.default };
      } else {
        throw new Error(`Component ${exportName} not found in ${importPath}`);
      }
    } catch (error) {
      console.error(`Failed to import ${exportName} from ${importPath}:`, error);
      // Return a fallback component
      return {
        default: () => {
          return React.createElement('div', {
            style: {
              padding: '2rem',
              textAlign: 'center',
              border: '2px dashed #ccc',
              borderRadius: '8px',
              color: '#666'
            }
          }, `Chart component "${exportName}" failed to load`);
        }
      };
    }
  };
};

// Chart registry with safe imports
export const CHART_REGISTRY: Record<string, ChartRegistryEntry> = {
  line: {
    type: 'line',
    loader: createSafeImport('../components/visualization/charts/LineChart', 'LineChart'),
    size: 'medium',
    complexity: 'medium'
  },
  bar: {
    type: 'bar', 
    loader: createSafeImport('../components/visualization/charts/BarChart', 'BarChart'),
    size: 'medium',
    complexity: 'low'
  },
  scatter: {
    type: 'scatter',
    loader: createSafeImport('../components/visualization/charts/ScatterChart', 'ScatterChart'),
    size: 'medium',
    complexity: 'medium'
  },
  pie: {
    type: 'pie',
    loader: createSafeImport('../components/visualization/charts/PieChart', 'PieChart'),
    size: 'small',
    complexity: 'low'
  },
  area: {
    type: 'area',
    loader: createSafeImport('../components/visualization/charts/AreaChart', 'AreaChart'),
    size: 'medium',
    complexity: 'medium'
  },
  violin: {
    type: 'violin',
    loader: createSafeImport('../components/visualization/charts/ViolinPlot', 'ViolinPlot'),
    size: 'large',
    complexity: 'high'
  },
  radar: {
    type: 'radar',
    loader: createSafeImport('../components/visualization/charts/RadarChart', 'RadarChart'),
    size: 'medium',
    complexity: 'medium'
  },
  treemap: {
    type: 'treemap',
    loader: createSafeImport('../components/visualization/charts/TreemapChart', 'TreemapChart'),
    size: 'large',
    complexity: 'high'
  },
  heatmap: {
    type: 'heatmap',
    loader: createSafeImport('../components/visualization/charts/HeatmapChart', 'HeatmapChart'),
    size: 'large',
    complexity: 'high'
  },
  boxplot: {
    type: 'boxplot',
    loader: createSafeImport('../components/visualization/charts/BoxPlot', 'BoxPlot'),
    size: 'medium',
    complexity: 'medium'
  },
  histogram: {
    type: 'histogram',
    loader: createSafeImport('../components/visualization/charts/Histogram', 'Histogram'),
    size: 'medium',
    complexity: 'low'
  }
};

// Helper function to get chart loader
export const getChartLoader = (chartType: string): (() => Promise<{ default: ComponentType<any> }>) | null => {
  const registry = CHART_REGISTRY[chartType];
  return registry ? registry.loader : null;
};

// Helper function to check if chart type is supported
export const isChartTypeSupported = (chartType: string): boolean => {
  return chartType in CHART_REGISTRY;
};

// Helper function to get chart complexity
export const getChartComplexity = (chartType: string): 'low' | 'medium' | 'high' => {
  const registry = CHART_REGISTRY[chartType];
  return registry?.complexity || 'medium';
};

export default CHART_REGISTRY;
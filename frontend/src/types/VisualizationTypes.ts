import React from 'react';

export type ChartType =
  | 'histogram' 
  | 'scatter' 
  | 'correlation' 
  | 'table'
  | 'line'
  | 'area'
  | 'boxplot'
  | 'heatmap'
  | 'bar'
  | 'pie'
  | 'violin'
  | 'treemap'
  | 'sunburst'
  | 'radar'
  | 'candlestick'
  | 'sankey';

export type DataType = 'numeric' | 'categorical' | 'datetime' | 'text' | 'boolean';

export interface FieldMapping {
  x?: string;
  y?: string;
  color?: string;
  size?: string;
  group?: string;
  value?: string;
  category?: string;
  time?: string;
}

export interface ChartConfig {
  type: ChartType;
  title: string;
  description?: string;
  fieldMapping: FieldMapping;
  styling: ChartStyling;
  animation?: AnimationConfig;
  interactions?: InteractionConfig;
}

export interface ChartStyling {
  colors: {
    scheme: ColorScheme;
    customColors?: string[];
  };
  layout: {
    width: number;
    height: number;
    margin: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  };
  axes: {
    x: AxisConfig;
    y: AxisConfig;
  };
  legend: LegendConfig;
  theme: 'light' | 'dark' | 'custom';
}

export interface AxisConfig {
  show: boolean;
  label?: string;
  labelAngle?: number;
  tickFormat?: string;
  scale?: 'linear' | 'log' | 'symlog' | 'time' | 'band' | 'point';
  domain?: [number, number] | 'auto';
  grid: boolean;
  fontSize: number;
  color: string;
}

export interface LegendConfig {
  show: boolean;
  position: 'top' | 'right' | 'bottom' | 'left' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  direction: 'row' | 'column';
  anchor: 'start' | 'middle' | 'end';
  translateX: number;
  translateY: number;
  itemWidth: number;
  itemHeight: number;
  symbolSize: number;
  fontSize: number;
}

export interface AnimationConfig {
  enabled: boolean;
  duration: number;
  easing: 'linear' | 'ease' | 'easeIn' | 'easeOut' | 'easeInOut' | 'bounce';
  stagger?: number;
}

export interface InteractionConfig {
  hover: {
    enabled: boolean;
    highlightColor?: string;
    crosshair?: boolean;
  };
  click: {
    enabled: boolean;
    action?: 'select' | 'filter' | 'drill' | 'custom';
  };
  zoom: {
    enabled: boolean;
    scaleExtent?: [number, number];
  };
  brush: {
    enabled: boolean;
    direction?: 'x' | 'y' | 'xy';
  };
}

export type ColorScheme = 
  | 'category10'
  | 'accent'
  | 'dark2'
  | 'paired'
  | 'pastel1'
  | 'pastel2'
  | 'set1'
  | 'set2'
  | 'set3'
  | 'tableau10'
  | 'blues'
  | 'greens'
  | 'greys'
  | 'oranges'
  | 'purples'
  | 'reds'
  | 'viridis'
  | 'plasma'
  | 'inferno'
  | 'magma'
  | 'cividis'
  | 'custom';

export interface ChartData {
  raw: Record<string, any>[];
  processed: any;
  schema: DataSchema;
  summary: DataSummary;
}

export interface DataSchema {
  fields: FieldSchema[];
  rowCount: number;
  columnCount: number;
}

export interface FieldSchema {
  name: string;
  type: DataType;
  nullable: boolean;
  unique: boolean;
  examples: any[];
  statistics?: FieldStatistics;
}

export interface FieldStatistics {
  count: number;
  nullCount: number;
  uniqueCount: number;
  min?: number | string | Date;
  max?: number | string | Date;
  mean?: number;
  median?: number;
  mode?: any;
  stdDev?: number;
  quartiles?: [number, number, number];
  distribution?: { value: any; count: number; percentage: number }[];
}

export interface DataSummary {
  totalRows: number;
  totalColumns: number;
  memoryUsage: string;
  dataTypes: { [type in DataType]: number };
  missingValues: number;
  duplicateRows: number;
}

export interface ChartRecommendation {
  type: ChartType;
  confidence: number;
  reasoning: string;
  suggestedMapping: FieldMapping;
  pros: string[];
  cons: string[];
  bestFor: string[];
}

export interface ExportOptions {
  format: 'png' | 'svg' | 'pdf' | 'html' | 'json';
  quality?: 'low' | 'medium' | 'high';
  width?: number;
  height?: number;
  dpi?: number;
  backgroundColor?: string;
  includeData?: boolean;
  filename?: string;
}

export interface ChartTemplate {
  id: string;
  name: string;
  description: string;
  category: 'business' | 'scientific' | 'financial' | 'marketing' | 'custom';
  thumbnail: string;
  config: Partial<ChartConfig>;
  requiredFields: string[];
  tags: string[];
}

// Event types for chart interactions
export interface ChartEvent {
  type: 'click' | 'hover' | 'brush' | 'zoom';
  data: any;
  event: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent;
  chart: ChartConfig;
}

export interface ChartState {
  isLoading: boolean;
  error: string | null;
  data: ChartData | null;
  config: ChartConfig;
  selectedItems: any[];
  filters: FilterState[];
  zoomState?: ZoomState;
}

export interface FilterState {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater' | 'less' | 'contains' | 'between' | 'in' | 'not_in';
  value: any;
  active: boolean;
}

export interface ZoomState {
  x: [number, number];
  y: [number, number];
  scale: number;
}

// Utility types
export type ChartComponent = React.ComponentType<{
  data: any[];
  config: ChartConfig;
  onEvent?: (event: ChartEvent) => void;
}>;

export type ChartFactory = (type: ChartType) => ChartComponent | null;
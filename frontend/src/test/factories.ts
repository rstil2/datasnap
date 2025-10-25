import { ChartData, DataRow, ChartConfig, AIInsight } from '@/types';

/**
 * Factory functions for creating test data
 */

export const createMockDataRow = (overrides: Partial<DataRow> = {}): DataRow => ({
  id: Math.random().toString(36),
  name: 'Test Item',
  value: 100,
  category: 'Category A',
  date: '2024-01-01',
  ...overrides,
});

export const createMockChartData = (count: number = 5, overrides: Partial<DataRow> = {}): ChartData => {
  const data = Array.from({ length: count }, (_, index) => 
    createMockDataRow({
      id: `item-${index}`,
      name: `Item ${index + 1}`,
      value: Math.floor(Math.random() * 1000) + 1,
      category: `Category ${String.fromCharCode(65 + (index % 3))}`, // A, B, C
      date: `2024-01-${String(index + 1).padStart(2, '0')}`,
      ...overrides,
    })
  );

  return {
    data,
    columns: Object.keys(data[0] || {}),
    summary: {
      totalRows: data.length,
      totalColumns: Object.keys(data[0] || {}).length,
      numericColumns: ['value'],
      categoricalColumns: ['name', 'category'],
      dateColumns: ['date'],
    },
  };
};

export const createMockChartConfig = (overrides: Partial<ChartConfig> = {}): ChartConfig => ({
  type: 'bar',
  xAxis: 'name',
  yAxis: 'value',
  colorBy: 'category',
  title: 'Test Chart',
  showLegend: true,
  showGrid: true,
  responsive: true,
  ...overrides,
});

export const createMockAIInsight = (overrides: Partial<AIInsight> = {}): AIInsight => ({
  type: 'trend',
  title: 'Test Insight',
  description: 'This is a test insight for validation purposes.',
  confidence: 0.85,
  data: {
    trend: 'increasing',
    correlation: 0.75,
    significance: 'high',
  },
  ...overrides,
});

export const createMockInsights = (count: number = 3): AIInsight[] => 
  Array.from({ length: count }, (_, index) => 
    createMockAIInsight({
      type: ['trend', 'correlation', 'outlier'][index % 3] as any,
      title: `Insight ${index + 1}`,
      description: `Test insight description ${index + 1}`,
      confidence: 0.7 + (index * 0.1),
    })
  );

export const createMockCSVData = (): string => `
name,value,category,date
Item 1,150,Category A,2024-01-01
Item 2,200,Category B,2024-01-02
Item 3,175,Category A,2024-01-03
Item 4,300,Category C,2024-01-04
Item 5,250,Category B,2024-01-05
`.trim();

export const createLargeDataset = (rows: number = 1000): ChartData => {
  const categories = ['Electronics', 'Clothing', 'Books', 'Home', 'Sports'];
  const regions = ['North', 'South', 'East', 'West'];
  
  const data = Array.from({ length: rows }, (_, index) => ({
    id: `item-${index}`,
    product: `Product ${index + 1}`,
    sales: Math.floor(Math.random() * 10000) + 100,
    profit: Math.floor(Math.random() * 2000) + 50,
    category: categories[index % categories.length],
    region: regions[index % regions.length],
    date: new Date(2024, 0, (index % 365) + 1).toISOString().split('T')[0],
    rating: (Math.random() * 4 + 1).toFixed(1),
  }));

  return {
    data,
    columns: Object.keys(data[0]),
    summary: {
      totalRows: data.length,
      totalColumns: Object.keys(data[0]).length,
      numericColumns: ['sales', 'profit', 'rating'],
      categoricalColumns: ['product', 'category', 'region'],
      dateColumns: ['date'],
    },
  };
};

export const createMockChartElement = (): HTMLElement => {
  const element = document.createElement('div');
  element.id = 'mock-chart';
  element.innerHTML = '<svg><rect width="400" height="300"/></svg>';
  element.style.width = '400px';
  element.style.height = '300px';
  return element;
};

export const createMockFile = (content: string, name: string, type: string = 'text/csv'): File => {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
};

export const createMockPowerPointOptions = () => ({
  template: 'professional' as const,
  layout: '16:9' as const,
  includeCharts: true,
  includeInsights: true,
  includeBranding: true,
  includeDataSummary: false,
});

export const createMockExcelOptions = () => ({
  includeRawData: true,
  includeInsights: true,
  includeSummaryStats: true,
  includeChartConfig: false,
});

export const createMockHTMLOptions = () => ({
  theme: 'light' as const,
  responsive: true,
  includeInsights: true,
  includeControls: false,
  includeDataTable: false,
  enableFullscreen: true,
});

/**
 * Test data scenarios for edge cases
 */

export const createEmptyDataset = (): ChartData => ({
  data: [],
  columns: [],
  summary: {
    totalRows: 0,
    totalColumns: 0,
    numericColumns: [],
    categoricalColumns: [],
    dateColumns: [],
  },
});

export const createDatasetWithMissingValues = (): ChartData => ({
  data: [
    { id: '1', name: 'Item 1', value: 100, category: 'A' },
    { id: '2', name: '', value: null, category: 'B' },
    { id: '3', name: 'Item 3', value: 200, category: '' },
    { id: '4', name: 'Item 4', value: 150, category: null },
  ],
  columns: ['id', 'name', 'value', 'category'],
  summary: {
    totalRows: 4,
    totalColumns: 4,
    numericColumns: ['value'],
    categoricalColumns: ['name', 'category'],
    dateColumns: [],
  },
});

export const createDatasetWithDuplicates = (): ChartData => ({
  data: [
    { id: '1', name: 'Item 1', value: 100, category: 'A' },
    { id: '2', name: 'Item 1', value: 100, category: 'A' },
    { id: '3', name: 'Item 2', value: 200, category: 'B' },
    { id: '4', name: 'Item 2', value: 200, category: 'B' },
  ],
  columns: ['id', 'name', 'value', 'category'],
  summary: {
    totalRows: 4,
    totalColumns: 4,
    numericColumns: ['value'],
    categoricalColumns: ['name', 'category'],
    dateColumns: [],
  },
});
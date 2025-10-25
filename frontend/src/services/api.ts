// API service for connecting to DataSnap backend services
const API_BASE = 'http://localhost:8000/api/v1';

// Development mode - set to true to use mock data instead of real API
const DEVELOPMENT_MODE = process.env.DEVELOPMENT_MODE === 'true' || process.env.NODE_ENV === 'development';

// Mock data for development
const createMockCSVFile = (filename: string): CSVFile => ({
  id: Math.floor(Math.random() * 1000),
  filename
});

const generateMockData = (rows = 100) => {
  const data = [];
  for (let i = 0; i < rows; i++) {
    data.push({
      id: i + 1,
      name: `Item ${i + 1}`,
      value: Math.floor(Math.random() * 1000),
      category: ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)],
      date: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
      rating: Math.random() * 5,
      active: Math.random() > 0.5
    });
  }
  return data;
};

export interface CSVFile {
  id: number;
  filename: string;
}

export interface FileUploadResponse {
  message: string;
  file: CSVFile;
  statistics: {
    total_rows: number;
    total_columns: number;
    numeric_columns: string[];
    categorical_columns: string[];
  };
  column_preview: Record<string, any>[];
}

export interface EnhancedUploadResponse {
  message: string;
  file: {
    id: number;
    filename: string;
    file_type: string;
    file_size: number;
    upload_time: string;
  };
  metadata: {
    total_rows: number;
    total_columns: number;
    column_mappings: Record<string, string>;
    original_headers: string[];
    mapped_headers: string[];
  };
  validation: {
    is_valid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export interface StatisticalStats {
  column_stats: Record<string, {
    count: number;
    mean?: number;
    std?: number;
    min?: number;
    max?: number;
    '25%'?: number;
    '50%'?: number;
    '75%'?: number;
    unique?: number;
    top?: string;
    freq?: number;
  }>;
  missing_values: Record<string, number>;
  data_types: Record<string, string>;
}

export interface VisualizationResponse {
  chart_type: string;
  title: string;
  chart_data: any;
  insights: string[];
  metadata: {
    creation_time: string;
    data_points: number;
    columns_used: string[];
  };
}

export interface StatisticalTestResult {
  test_name: string;
  test_statistic: number;
  p_value: number;
  alpha: number;
  is_significant: boolean;
  effect_size?: number;
  confidence_interval?: [number, number];
  interpretation: string;
  recommendations: string[];
  metadata: {
    sample_size: number;
    test_assumptions: Record<string, boolean>;
  };
}

export interface NarrativeResponse {
  title: string;
  summary: string;
  content: string;
  key_insights: Array<{
    title: string;
    description: string;
    confidence: 'high' | 'medium' | 'low';
    priority: 'critical' | 'high' | 'medium' | 'low';
  }>;
  recommendations: string[];
  patterns: Array<{
    type: string;
    description: string;
    statistical_evidence: string;
  }>;
  metadata: {
    generation_time_ms: number;
    data_quality_score: number;
    narrative_type: string;
  };
}

class ApiService {
  // CSV Upload and Management
  async uploadCSV(file: File): Promise<FileUploadResponse> {
    // Development mode - return mock data
    if (DEVELOPMENT_MODE) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate upload delay
      
      const mockData = generateMockData(150);
      const csvFile = createMockCSVFile(file.name);
      
      return {
        message: `Successfully uploaded ${file.name}`,
        file: csvFile,
        statistics: {
          total_rows: mockData.length,
          total_columns: Object.keys(mockData[0]).length,
          numeric_columns: ['id', 'value', 'rating'],
          categorical_columns: ['name', 'category', 'active']
        },
        column_preview: mockData.slice(0, 10)
      };
    }
    
    // Production mode - actual API call
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE}/csv/upload`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to upload file');
    }
    
    return response.json();
  }

  // Enhanced Multi-format Upload
  async uploadData(
    data: Record<string, any>[], 
    metadata: {
      fileName: string;
      columnMappings: Array<{ original: string; mapped: string; type: string }>;
      parseMetadata: {
        fileType: string;
        fileSize: number;
        rowCount: number;
        columnCount: number;
        parseTime: number;
      };
    }
  ): Promise<EnhancedUploadResponse> {
    // Development mode - return mock response
    if (DEVELOPMENT_MODE) {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate upload delay
      
      const fileId = Math.floor(Math.random() * 1000);
      
      return {
        message: `Successfully processed ${metadata.fileName}`,
        file: {
          id: fileId,
          filename: metadata.fileName,
          file_type: metadata.parseMetadata.fileType,
          file_size: metadata.parseMetadata.fileSize,
          upload_time: new Date().toISOString()
        },
        metadata: {
          total_rows: data.length,
          total_columns: metadata.parseMetadata.columnCount,
          column_mappings: metadata.columnMappings.reduce((acc, mapping) => {
            acc[mapping.original] = mapping.mapped;
            return acc;
          }, {} as Record<string, string>),
          original_headers: metadata.columnMappings.map(m => m.original),
          mapped_headers: metadata.columnMappings.map(m => m.mapped)
        },
        validation: {
          is_valid: true,
          errors: [],
          warnings: []
        }
      };
    }
    
    // Production mode - actual API call
    const payload = {
      data,
      metadata: {
        filename: metadata.fileName,
        file_type: metadata.parseMetadata.fileType,
        file_size: metadata.parseMetadata.fileSize,
        total_rows: metadata.parseMetadata.rowCount,
        total_columns: metadata.parseMetadata.columnCount,
        parse_time: metadata.parseMetadata.parseTime,
        column_mappings: metadata.columnMappings.reduce((acc, mapping) => {
          acc[mapping.original] = mapping.mapped;
          return acc;
        }, {} as Record<string, string>),
        column_types: metadata.columnMappings.reduce((acc, mapping) => {
          acc[mapping.mapped] = mapping.type;
          return acc;
        }, {} as Record<string, string>)
      }
    };

    const response = await fetch(`${API_BASE}/data/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to upload data');
    }
    
    return response.json();
  }
  
  async listFiles(): Promise<{ files: CSVFile[] }> {
    const response = await fetch(`${API_BASE}/csv/files`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch files');
    }
    
    return response.json();
  }
  
  // Statistical Analysis
  async getDescriptiveStats(fileId: number): Promise<StatisticalStats> {
    const response = await fetch(`${API_BASE}/stats/${fileId}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get statistics');
    }
    
    return response.json();
  }
  
  // Visualizations
  async createScatterPlot(params: {
    file_id: number;
    x_column: string;
    y_column: string;
    color_column?: string;
    size_column?: string;
    title?: string;
    x_label?: string;
    y_label?: string;
    color_scheme?: string;
  }): Promise<VisualizationResponse> {
    const response = await fetch(`${API_BASE}/visualizations/scatter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create scatter plot');
    }
    
    return response.json();
  }
  
  async createHistogram(params: {
    file_id: number;
    column: string;
    bins?: number;
    group_column?: string;
    title?: string;
    x_label?: string;
    y_label?: string;
    color_scheme?: string;
  }): Promise<VisualizationResponse> {
    const response = await fetch(`${API_BASE}/visualizations/histogram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create histogram');
    }
    
    return response.json();
  }
  
  async createBoxplot(params: {
    file_id: number;
    y_column: string;
    x_column?: string;
    title?: string;
    x_label?: string;
    y_label?: string;
    color_scheme?: string;
  }): Promise<VisualizationResponse> {
    const response = await fetch(`${API_BASE}/visualizations/boxplot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create boxplot');
    }
    
    return response.json();
  }
  
  async getChartSuggestions(fileId: number): Promise<{
    suggestions: Array<{
      chart_type: string;
      columns: string[];
      confidence: number;
      reason: string;
    }>;
  }> {
    const response = await fetch(`${API_BASE}/visualizations/suggestions/${fileId}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get chart suggestions');
    }
    
    return response.json();
  }
  
  // Statistical Tests
  async performOneSampleTTest(params: {
    file_id: number;
    variable_column: string;
    test_value: number;
    alpha?: number;
  }): Promise<StatisticalTestResult> {
    const response = await fetch(`${API_BASE}/statistical_tests/one_sample_ttest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to perform t-test');
    }
    
    return response.json();
  }
  
  async performIndependentTTest(params: {
    file_id: number;
    variable_column: string;
    group_column: string;
    alpha?: number;
  }): Promise<StatisticalTestResult> {
    const response = await fetch(`${API_BASE}/statistical_tests/independent_ttest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to perform independent t-test');
    }
    
    return response.json();
  }
  
  async performPairedTTest(params: {
    file_id: number;
    variable1_column: string;
    variable2_column: string;
    alpha?: number;
  }): Promise<StatisticalTestResult> {
    const response = await fetch(`${API_BASE}/statistical_tests/paired_ttest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to perform paired t-test');
    }
    
    return response.json();
  }
  
  async performOneWayAnova(params: {
    file_id: number;
    variable_column: string;
    group_column: string;
    alpha?: number;
  }): Promise<StatisticalTestResult> {
    const response = await fetch(`${API_BASE}/statistical_tests/one_way_anova`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to perform ANOVA');
    }
    
    return response.json();
  }
  
  // Narratives and AI Insights
  async generateStatisticalNarrative(params: {
    narrative_type: 'statistical_test';
    test_name: string;
    test_statistic: number;
    p_value: number;
    sample_size: number;
    alpha?: number;
    effect_size?: number;
    confidence_interval?: [number, number];
    variable_names?: string[];
    context?: string;
  }): Promise<NarrativeResponse> {
    const response = await fetch(`${API_BASE}/narratives/statistical-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate narrative');
    }
    
    return response.json();
  }
  
  async generateDataSummaryNarrative(params: {
    narrative_type: 'data_summary';
    total_rows: number;
    total_columns: number;
    numeric_columns: number;
    categorical_columns: number;
    missing_values_percent: number;
    data_quality_score: number;
    column_names?: string[];
    data_types?: Record<string, string>;
    outliers_detected?: number;
    context?: string;
  }): Promise<NarrativeResponse> {
    const response = await fetch(`${API_BASE}/narratives/data-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate data summary');
    }
    
    return response.json();
  }
  
  async generateVisualizationNarrative(params: {
    narrative_type: 'visualization';
    chart_type: string;
    chart_title: string;
    data_insights: string[];
    patterns_identified: string[];
    outliers_count?: number;
    trend_direction?: string;
    correlation_strength?: number;
    context?: string;
  }): Promise<NarrativeResponse> {
    const response = await fetch(`${API_BASE}/narratives/visualization`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate visualization narrative');
    }
    
    return response.json();
  }
  
  async generateBatchNarrative(params: {
    requests: any[];
    combine_insights?: boolean;
  }): Promise<{
    narratives: NarrativeResponse[];
    combined_insights: any[];
    executive_summary?: string;
    total_generation_time_ms: number;
  }> {
    const response = await fetch(`${API_BASE}/narratives/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate batch narratives');
    }
    
    return response.json();
  }
  
  // Narrative Management
  async saveNarrative(narrative: NarrativeResponse, params?: {
    csv_file_id?: number;
    user_id?: number;
    tags?: string[];
  }): Promise<{ narrative_id: number; message: string; created_at: string }> {
    const response = await fetch(`${API_BASE}/narratives/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...narrative, ...params }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to save narrative');
    }
    
    return response.json();
  }
  
  async listNarratives(params?: {
    user_id?: number;
    csv_file_id?: number;
    narrative_type?: string;
    limit?: number;
    offset?: number;
  }): Promise<Array<{
    id: number;
    title: string;
    summary: string;
    narrative_type: string;
    insights_count: number;
    created_at: string;
  }>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    const response = await fetch(`${API_BASE}/narratives/list?${searchParams}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to list narratives');
    }
    
    return response.json();
  }
  
  async getNarrative(narrativeId: number): Promise<NarrativeResponse> {
    const response = await fetch(`${API_BASE}/narratives/${narrativeId}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get narrative');
    }
    
    return response.json();
  }
  
  // Additional helper methods for frontend components
  async performTTest(fileId: CSVFile, column1: string, column2: string): Promise<any> {
    return this.performPairedTTest({
      file_id: fileId.id,
      variable1_column: column1,
      variable2_column: column2
    });
  }
  
  async performAnova(fileId: CSVFile, column1: string, groupColumn: string): Promise<any> {
    return this.performOneWayAnova({
      file_id: fileId.id,
      variable_column: column1,
      group_column: groupColumn
    });
  }
  
  async performChiSquare(_fileId: CSVFile, _column1: string, _column2: string): Promise<any> {
    // For now, return a placeholder since chi-square test isn't in the API
    throw new Error('Chi-square test not yet implemented in backend');
  }
  
  async performCorrelation(_fileId: CSVFile, _column1: string, _column2: string): Promise<any> {
    // For now, return a placeholder since correlation test isn't in the API
    throw new Error('Correlation test not yet implemented in backend');
  }
  
  async createCorrelationHeatmap(_fileId: CSVFile): Promise<any> {
    // For now, return a placeholder since correlation heatmap isn't in the API
    throw new Error('Correlation heatmap not yet implemented in backend');
  }
  
  async generateNarrative(fileId: CSVFile): Promise<any> {
    // Use the data summary narrative as a placeholder
    return this.generateDataSummaryNarrative({
      narrative_type: 'data_summary',
      total_rows: 0,
      total_columns: 0,
      numeric_columns: 0,
      categorical_columns: 0,
      missing_values_percent: 0,
      data_quality_score: 0,
      context: `Analysis of file: ${fileId.filename}`
    });
  }
  
  // Helper methods for visualization calls from components
  async createHistogramSimple(fileId: CSVFile, column: string): Promise<any> {
    return this.createHistogram({
      file_id: fileId.id,
      column: column
    });
  }
  
  async createScatterPlotSimple(fileId: CSVFile, xColumn: string, yColumn: string): Promise<any> {
    return this.createScatterPlot({
      file_id: fileId.id,
      x_column: xColumn,
      y_column: yColumn
    });
  }
  
  // Health and Status
  async checkServiceHealth(): Promise<{
    status: string;
    response_time_ms: number;
    available_templates: number;
    ai_integration: string;
  }> {
    const response = await fetch(`${API_BASE}/narratives/health`);
    return response.json();
  }
}

export const apiService = new ApiService();
export default apiService;
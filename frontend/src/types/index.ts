// Central type definitions for DataSnap Frontend

// Basic data structures
export interface CSVData {
  headers: string[];
  data: Record<string, any>[];
  filename: string;
  rowCount: number;
  columnCount: number;
}

// API-related types
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

// Statistical analysis types
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

// Story/Narrative types
export interface Insight {
  title: string;
  description: string;
  confidence: 'high' | 'medium' | 'low';
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface Pattern {
  type: string;
  description: string;
  statistical_evidence: string;
}

export interface DataStory {
  title: string;
  narrative: string;
  key_insights: Insight[];
  recommendations: string[];
  patterns: Pattern[];
  executive_summary: string;
  metadata: {
    generation_time_ms: number;
    data_quality_score: number;
    story_type: string;
    narrative_style: string;
  };
  error?: string;
}

// Export functionality types
export interface ExportableStory {
  id: string;
  title: string;
  summary: string;
  narrative: string;
  key_insights: Insight[];
  recommendations: string[];
  metadata: {
    generation_time_ms: number;
    data_quality_score: number;
    story_type: string;
    narrative_style: string;
  };
  charts?: any[];
}

// Visualization types
export type ChartType = 'histogram' | 'scatter' | 'correlation' | 'table';

export interface HistogramData {
  bin: string;
  count: number;
}

export interface ScatterData {
  x: number;
  y: number;
  [key: string]: any;
}

export interface CorrelationData {
  variable1: string;
  variable2: string;
  correlation: number;
}

export interface VisualizationData {
  type: ChartType;
  data: HistogramData[] | ScatterData[] | CorrelationData[] | Record<string, any>[];
}

// Component prop types
export interface PageProps {
  onPageChange?: (page: string) => void;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Analysis types (for statistical tests)
export type AnalysisType = 'ttest' | 'anova' | 'chisquare' | 'correlation';

export interface StatTestResult {
  test_name: string;
  test_statistic: number;
  p_value: number;
  degrees_of_freedom?: number;
  effect_size?: number;
  confidence_interval?: [number, number];
  interpretation: string;
  conclusion: string;
  sample_size: number;
  assumptions: {
    normality?: boolean;
    equal_variances?: boolean;
    independence?: boolean;
  };
  error?: string;
}

// Data processing types
export interface ProcessedColumn {
  name: string;
  type: 'numeric' | 'categorical' | 'datetime' | 'text';
  count: number;
  missing: number;
  missingPercent: number;
  unique?: number;
  uniquePercent?: number;
  // Numeric stats
  mean?: number;
  median?: number;
  stdDev?: number;
  min?: number;
  max?: number;
  q1?: number;
  q3?: number;
  skewness?: number;
  kurtosis?: number;
  cv?: number;
  outliers?: number;
  // Categorical stats
  mostCommon?: string;
  mostCommonCount?: number;
  mostCommonPercent?: number;
  diversity?: number;
}

export interface ProcessedDataset {
  filename: string;
  totalRows: number;
  totalColumns: number;
  columns: ProcessedColumn[];
  dataQualityScore: number;
  completeness: number;
  summary: {
    numericColumns: number;
    categoricalColumns: number;
    datetimeColumns: number;
    textColumns: number;
  };
}

// Utility types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// User/authentication types
export interface User {
  id: string;
  name: string;
  email?: string;
  avatar: string;
  joinedAt?: string;
  storiesCount?: number;
  totalLikes?: number;
  preferences?: {
    theme?: 'light' | 'dark' | 'auto';
    notifications?: boolean;
    dataRetention?: number;
  };
  subscription?: {
    tier: 'free' | 'pro' | 'enterprise';
    expiresAt: string | null;
    features: {
      maxFileSize: number;
      maxExports: number;
      advancedAnalytics: boolean;
      customBranding: boolean;
    };
  };
}

export interface UserSession {
  user: User | null;
  isAuthenticated: boolean;
}

export interface UserContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  createAccount: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

// Community/sharing types
export interface CommunityStory {
  id: string;
  title: string;
  author: string;
  authorId?: string;
  authorEmail?: string;
  authorAvatar?: string;
  summary: string;
  storyType: string;
  qualityScore: number;
  createdAt: string;
  likes: number;
  comments: number;
  views: number;
  tags: string[];
  isPublic: boolean;
  previewChart?: {
    type: string;
    data: any[];
  };
}

// Context types
export interface DataContextType {
  // Current file state
  currentFile: CSVFile | null;
  csvData: CSVData | null;
  isLoading: boolean;
  error: string | null;
  
  // File management
  uploadedFiles: CSVFile[];
  
  // Analysis data
  stats: StatisticalStats | ProcessedDataset | null;
  
  // Actions
  setCurrentFile: (file: CSVFile | null) => void;
  setCsvData: (data: CSVData | null) => void;
  setUploadedFiles: (files: CSVFile[]) => void;
  setStats: (stats: StatisticalStats | ProcessedDataset | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Helper functions
  processUploadResponse: (response: FileUploadResponse) => void;
  clearData: () => void;
}

// Event handler types
export type ChangeHandler<T = HTMLInputElement> = (event: React.ChangeEvent<T>) => void;
export type ClickHandler = (event: React.MouseEvent<HTMLButtonElement>) => void;
export type SubmitHandler = (event: React.FormEvent<HTMLFormElement>) => void;

// Export options types
export interface StoryExportOptions {
  format: 'png' | 'pdf' | 'url' | 'json';
  size?: 'square' | 'wide' | 'tall';
  theme?: 'dark' | 'light';
  includeCharts?: boolean;
  includeData?: boolean;
}

// Social media platform types
export type SocialMediaPlatform = 'twitter' | 'linkedin' | 'facebook';

// Loading state types
export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

// Error types
export interface ErrorState {
  hasError: boolean;
  message?: string;
  code?: string | number;
}

// Navigation types
export type NavigationPage = 'upload' | 'stats' | 'visualize' | 'analysis' | 'story' | 'community';

export interface NavigationItem {
  id: NavigationPage;
  label: string;
  icon: string;
}

// Generic utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Status types
export type Status = 'idle' | 'loading' | 'success' | 'error';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Confidence = 'low' | 'medium' | 'high';
export interface BatchJob {
  id: string;
  name: string;
  type: BatchJobType;
  status: BatchJobStatus;
  progress: BatchProgress;
  config: BatchJobConfig;
  input: BatchInput;
  output?: BatchOutput;
  error?: BatchError;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration?: number;
  actualDuration?: number;
}

export interface BatchProgress {
  currentStep: number;
  totalSteps: number;
  processedRows: number;
  totalRows: number;
  percentage: number;
  currentOperation: string;
  operationsCompleted: string[];
  operationsRemaining: string[];
  throughput: number; // rows per second
  eta: number; // estimated time remaining in seconds
}

export interface BatchJobConfig {
  chunkSize: number;
  maxConcurrency: number;
  retryAttempts: number;
  timeout: number;
  preserveOriginal: boolean;
  compressionEnabled: boolean;
  validationEnabled: boolean;
  progressUpdateInterval: number;
  memoryLimit: number; // in MB
  optimizeForMemory: boolean;
}

export interface BatchInput {
  type: 'file' | 'dataset' | 'query';
  source: string;
  format: 'csv' | 'json' | 'excel' | 'parquet';
  size: number;
  estimatedRows: number;
  schema?: ColumnSchema[];
}

export interface BatchOutput {
  type: 'file' | 'dataset' | 'stream';
  destination: string;
  format: 'csv' | 'json' | 'excel' | 'parquet';
  size: number;
  actualRows: number;
  schema: ColumnSchema[];
  qualityReport?: BatchQualityReport;
}

export interface BatchError {
  code: string;
  message: string;
  details: string;
  timestamp: Date;
  recoverable: boolean;
  affectedRows: number[];
  suggestedFix?: string;
}

export interface BatchQualityReport {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicatesRemoved: number;
  nullsHandled: number;
  typeConversions: number;
  qualityScore: number;
  issues: BatchQualityIssue[];
}

export interface BatchQualityIssue {
  type: 'validation' | 'conversion' | 'duplicate' | 'missing';
  column: string;
  count: number;
  examples: any[];
  severity: 'low' | 'medium' | 'high';
}

export interface ColumnSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  nullable: boolean;
  constraints?: ColumnConstraints;
}

export interface ColumnConstraints {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  enum?: any[];
  required?: boolean;
}

export type BatchJobType = 
  | 'data_cleaning' | 'data_transformation' | 'data_validation' 
  | 'data_export' | 'data_import' | 'data_analysis' | 'data_profiling';

export type BatchJobStatus = 
  | 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface BatchProcessor {
  process(job: BatchJob): Promise<BatchJob>;
  pause(jobId: string): Promise<void>;
  resume(jobId: string): Promise<void>;
  cancel(jobId: string): Promise<void>;
}

export interface BatchTransformationStep {
  id: string;
  name: string;
  type: 'filter' | 'map' | 'aggregate' | 'sort' | 'join' | 'validate';
  config: Record<string, any>;
  enabled: boolean;
}

class BatchProcessingService {
  private static instance: BatchProcessingService;
  private jobs: Map<string, BatchJob> = new Map();
  private processors: Map<BatchJobType, BatchProcessor> = new Map();
  private maxConcurrentJobs = 3;
  private runningJobs = 0;

  constructor() {
    this.initializeProcessors();
  }

  static getInstance(): BatchProcessingService {
    if (!BatchProcessingService.instance) {
      BatchProcessingService.instance = new BatchProcessingService();
    }
    return BatchProcessingService.instance;
  }

  // Job Management
  async createJob(
    name: string,
    type: BatchJobType,
    input: BatchInput,
    config?: Partial<BatchJobConfig>
  ): Promise<BatchJob> {
    const jobId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const defaultConfig: BatchJobConfig = {
      chunkSize: 1000,
      maxConcurrency: 2,
      retryAttempts: 3,
      timeout: 300000, // 5 minutes
      preserveOriginal: true,
      compressionEnabled: true,
      validationEnabled: true,
      progressUpdateInterval: 1000, // 1 second
      memoryLimit: 512, // 512 MB
      optimizeForMemory: false
    };

    const job: BatchJob = {
      id: jobId,
      name,
      type,
      status: 'queued',
      progress: {
        currentStep: 0,
        totalSteps: 1,
        processedRows: 0,
        totalRows: input.estimatedRows,
        percentage: 0,
        currentOperation: 'Initializing',
        operationsCompleted: [],
        operationsRemaining: [],
        throughput: 0,
        eta: 0
      },
      config: { ...defaultConfig, ...config },
      input,
      createdAt: new Date()
    };

    this.jobs.set(jobId, job);
    
    // Auto-start if capacity allows
    if (this.runningJobs < this.maxConcurrentJobs) {
      this.executeJob(jobId);
    }

    return job;
  }

  async executeJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'queued') return;

    this.runningJobs++;
    job.status = 'running';
    job.startedAt = new Date();

    try {
      const processor = this.processors.get(job.type);
      if (!processor) {
        throw new Error(`No processor found for job type: ${job.type}`);
      }

      const updatedJob = await processor.process(job);
      updatedJob.status = 'completed';
      updatedJob.completedAt = new Date();
      updatedJob.actualDuration = updatedJob.completedAt.getTime() - (updatedJob.startedAt?.getTime() || 0);

      this.jobs.set(jobId, updatedJob);
    } catch (error) {
      job.status = 'failed';
      job.error = {
        code: 'PROCESSING_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack || '' : String(error),
        timestamp: new Date(),
        recoverable: false,
        affectedRows: []
      };
      job.completedAt = new Date();
    } finally {
      this.runningJobs--;
      // Start next queued job if available
      this.startNextQueuedJob();
    }
  }

  async pauseJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'running') {
      const processor = this.processors.get(job.type);
      if (processor) {
        await processor.pause(jobId);
        job.status = 'paused';
      }
    }
  }

  async resumeJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'paused') {
      const processor = this.processors.get(job.type);
      if (processor) {
        await processor.resume(jobId);
        job.status = 'running';
      }
    }
  }

  async cancelJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job && (job.status === 'running' || job.status === 'paused' || job.status === 'queued')) {
      if (job.status === 'running' || job.status === 'paused') {
        const processor = this.processors.get(job.type);
        if (processor) {
          await processor.cancel(jobId);
        }
        this.runningJobs--;
      }
      job.status = 'cancelled';
      job.completedAt = new Date();
    }
  }

  getJob(jobId: string): BatchJob | undefined {
    return this.jobs.get(jobId);
  }

  getAllJobs(): BatchJob[] {
    return Array.from(this.jobs.values()).sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  getJobsByStatus(status: BatchJobStatus): BatchJob[] {
    return this.getAllJobs().filter(job => job.status === status);
  }

  // Processing Operations
  async processDataCleaning(
    data: Record<string, any>[],
    config: BatchJobConfig,
    onProgress?: (progress: BatchProgress) => void
  ): Promise<{ cleaned: Record<string, any>[]; report: BatchQualityReport }> {
    const totalRows = data.length;
    let processedRows = 0;
    const cleaned: Record<string, any>[] = [];
    const qualityIssues: BatchQualityIssue[] = [];
    
    let duplicatesRemoved = 0;
    let nullsHandled = 0;
    let typeConversions = 0;

    const startTime = Date.now();
    
    // Process in chunks
    for (let i = 0; i < data.length; i += config.chunkSize) {
      const chunk = data.slice(i, i + config.chunkSize);
      
      for (const row of chunk) {
        const cleanedRow: Record<string, any> = {};
        let hasIssue = false;

        // Clean each field
        for (const [key, value] of Object.entries(row)) {
          if (value === null || value === undefined || value === '') {
            if (config.validationEnabled) {
              nullsHandled++;
              cleanedRow[key] = this.getDefaultValue(key, data);
            } else {
              cleanedRow[key] = value;
            }
          } else if (typeof value === 'string') {
            // Clean string values
            cleanedRow[key] = value.trim();
            
            // Attempt type conversion if needed
            if (this.shouldConvertToNumber(key, value, data)) {
              const numValue = parseFloat(value);
              if (!isNaN(numValue)) {
                cleanedRow[key] = numValue;
                typeConversions++;
              }
            }
          } else {
            cleanedRow[key] = value;
          }
        }

        // Check for duplicates
        const isDuplicate = cleaned.some(existingRow => 
          JSON.stringify(existingRow) === JSON.stringify(cleanedRow)
        );

        if (!isDuplicate) {
          cleaned.push(cleanedRow);
        } else {
          duplicatesRemoved++;
        }

        processedRows++;
        
        // Update progress
        if (onProgress && processedRows % 100 === 0) {
          const elapsed = Date.now() - startTime;
          const throughput = processedRows / (elapsed / 1000);
          const eta = (totalRows - processedRows) / throughput;

          onProgress({
            currentStep: 1,
            totalSteps: 1,
            processedRows,
            totalRows,
            percentage: (processedRows / totalRows) * 100,
            currentOperation: 'Cleaning data',
            operationsCompleted: [],
            operationsRemaining: ['Finalizing'],
            throughput,
            eta
          });
        }
      }
    }

    const report: BatchQualityReport = {
      totalRows,
      validRows: cleaned.length,
      invalidRows: totalRows - cleaned.length,
      duplicatesRemoved,
      nullsHandled,
      typeConversions,
      qualityScore: (cleaned.length / totalRows) * 100,
      issues: qualityIssues
    };

    return { cleaned, report };
  }

  async processDataTransformation(
    data: Record<string, any>[],
    steps: BatchTransformationStep[],
    config: BatchJobConfig,
    onProgress?: (progress: BatchProgress) => void
  ): Promise<Record<string, any>[]> {
    let result = data;
    const totalSteps = steps.filter(step => step.enabled).length;
    let currentStep = 0;

    for (const step of steps) {
      if (!step.enabled) continue;

      currentStep++;
      
      if (onProgress) {
        onProgress({
          currentStep,
          totalSteps,
          processedRows: 0,
          totalRows: result.length,
          percentage: (currentStep - 1) / totalSteps * 100,
          currentOperation: `Applying ${step.name}`,
          operationsCompleted: steps.slice(0, currentStep - 1).map(s => s.name),
          operationsRemaining: steps.slice(currentStep).filter(s => s.enabled).map(s => s.name),
          throughput: 0,
          eta: 0
        });
      }

      result = await this.applyTransformationStep(result, step, config);
    }

    return result;
  }

  // Helper Methods
  private async applyTransformationStep(
    data: Record<string, any>[],
    step: BatchTransformationStep,
    config: BatchJobConfig
  ): Promise<Record<string, any>[]> {
    switch (step.type) {
      case 'filter':
        return data.filter(row => this.evaluateFilterCondition(row, step.config));
      
      case 'map':
        return data.map(row => this.applyFieldMappings(row, step.config));
      
      case 'sort':
        return [...data].sort((a, b) => this.compareBySortConfig(a, b, step.config));
      
      case 'aggregate':
        return this.performAggregation(data, step.config);
      
      default:
        return data;
    }
  }

  private evaluateFilterCondition(row: Record<string, any>, config: any): boolean {
    const { column, operator, value } = config;
    const rowValue = row[column];

    switch (operator) {
      case 'equals': return rowValue == value;
      case 'not_equals': return rowValue != value;
      case 'greater': return Number(rowValue) > Number(value);
      case 'less': return Number(rowValue) < Number(value);
      case 'contains': return String(rowValue).includes(String(value));
      default: return true;
    }
  }

  private applyFieldMappings(row: Record<string, any>, config: any): Record<string, any> {
    const mappings = config.mappings || {};
    const result: Record<string, any> = {};

    for (const [oldKey, newKey] of Object.entries(mappings)) {
      if (row.hasOwnProperty(oldKey)) {
        result[newKey as string] = row[oldKey];
      }
    }

    // Include unmapped fields
    for (const [key, value] of Object.entries(row)) {
      if (!mappings[key]) {
        result[key] = value;
      }
    }

    return result;
  }

  private compareBySortConfig(a: Record<string, any>, b: Record<string, any>, config: any): number {
    const { column, direction = 'asc' } = config;
    const aVal = a[column];
    const bVal = b[column];
    
    let result = 0;
    if (aVal > bVal) result = 1;
    else if (aVal < bVal) result = -1;
    
    return direction === 'desc' ? -result : result;
  }

  private performAggregation(data: Record<string, any>[], config: any): Record<string, any>[] {
    const { groupBy, aggregates } = config;
    
    if (!groupBy || !aggregates) return data;

    const groups = new Map<string, Record<string, any>[]>();
    
    // Group data
    for (const row of data) {
      const key = groupBy.map((col: string) => row[col]).join('|');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }

    // Perform aggregation
    const result: Record<string, any>[] = [];
    
    for (const [groupKey, groupData] of groups) {
      const aggregated: Record<string, any> = {};
      
      // Add group by columns
      groupBy.forEach((col: string, index: number) => {
        aggregated[col] = groupKey.split('|')[index];
      });

      // Calculate aggregates
      for (const { column, operation } of aggregates) {
        const values = groupData.map(row => Number(row[column])).filter(v => !isNaN(v));
        
        switch (operation) {
          case 'sum':
            aggregated[`${column}_sum`] = values.reduce((sum, val) => sum + val, 0);
            break;
          case 'avg':
            aggregated[`${column}_avg`] = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
            break;
          case 'count':
            aggregated[`${column}_count`] = groupData.length;
            break;
          case 'min':
            aggregated[`${column}_min`] = values.length > 0 ? Math.min(...values) : null;
            break;
          case 'max':
            aggregated[`${column}_max`] = values.length > 0 ? Math.max(...values) : null;
            break;
        }
      }

      result.push(aggregated);
    }

    return result;
  }

  private getDefaultValue(column: string, data: Record<string, any>[]): any {
    // Simple default value strategy
    const values = data.map(row => row[column]).filter(v => v != null && v !== '');
    if (values.length === 0) return null;
    
    // Return most common value
    const frequency = new Map();
    values.forEach(value => frequency.set(value, (frequency.get(value) || 0) + 1));
    return Array.from(frequency.entries()).sort((a, b) => b[1] - a[1])[0][0];
  }

  private shouldConvertToNumber(column: string, value: string, data: Record<string, any>[]): boolean {
    // Simple heuristic: if most values in this column are numeric, convert
    const columnValues = data.map(row => row[column]).filter(v => v != null && v !== '');
    const numericValues = columnValues.filter(v => !isNaN(Number(v))).length;
    return numericValues / columnValues.length > 0.8;
  }

  private initializeProcessors(): void {
    // Initialize default processors
    this.processors.set('data_cleaning', new DataCleaningProcessor());
    this.processors.set('data_transformation', new DataTransformationProcessor());
    this.processors.set('data_validation', new DataValidationProcessor());
    this.processors.set('data_profiling', new DataProfilingProcessor());
  }

  private startNextQueuedJob(): void {
    if (this.runningJobs >= this.maxConcurrentJobs) return;
    
    const queuedJobs = this.getJobsByStatus('queued');
    if (queuedJobs.length > 0) {
      this.executeJob(queuedJobs[0].id);
    }
  }

  // Configuration
  setMaxConcurrentJobs(max: number): void {
    this.maxConcurrentJobs = max;
  }

  // Cleanup
  async cleanup(): Promise<void> {
    // Cancel all running jobs
    const runningJobs = this.getJobsByStatus('running');
    for (const job of runningJobs) {
      await this.cancelJob(job.id);
    }
  }
}

// Default Processor Implementations
class DataCleaningProcessor implements BatchProcessor {
  async process(job: BatchJob): Promise<BatchJob> {
    // Implementation would depend on the specific data cleaning requirements
    job.progress.currentOperation = 'Cleaning data...';
    return job;
  }

  async pause(jobId: string): Promise<void> {
    // Implementation for pausing
  }

  async resume(jobId: string): Promise<void> {
    // Implementation for resuming
  }

  async cancel(jobId: string): Promise<void> {
    // Implementation for cancelling
  }
}

class DataTransformationProcessor implements BatchProcessor {
  async process(job: BatchJob): Promise<BatchJob> {
    job.progress.currentOperation = 'Transforming data...';
    return job;
  }

  async pause(jobId: string): Promise<void> {}
  async resume(jobId: string): Promise<void> {}
  async cancel(jobId: string): Promise<void> {}
}

class DataValidationProcessor implements BatchProcessor {
  async process(job: BatchJob): Promise<BatchJob> {
    job.progress.currentOperation = 'Validating data...';
    return job;
  }

  async pause(jobId: string): Promise<void> {}
  async resume(jobId: string): Promise<void> {}
  async cancel(jobId: string): Promise<void> {}
}

class DataProfilingProcessor implements BatchProcessor {
  async process(job: BatchJob): Promise<BatchJob> {
    job.progress.currentOperation = 'Profiling data...';
    return job;
  }

  async pause(jobId: string): Promise<void> {}
  async resume(jobId: string): Promise<void> {}
  async cancel(jobId: string): Promise<void> {}
}

export default BatchProcessingService;
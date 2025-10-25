import React, { useState, useCallback, useMemo } from 'react';
import { FileParserService, FileParseResult } from '../../services/FileParserService';
import { ChartRecommendation } from '../../services/ChartRecommendationService';
import { ChartNavigationService } from '../../services/ChartNavigationService';
import { apiService } from '../../services/api';
import { ChartSuggestions } from '../suggestions/ChartSuggestions';
import { useData } from '../../contexts/DataContext';
import './UploadPage.css';

interface ValidationMessage {
  type: 'error' | 'warning' | 'info';
  message: string;
}

interface ColumnMapping {
  original: string;
  mapped: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'mixed';
}

export const EnhancedUploadPage: React.FC = () => {
  const { processUploadResponse, setLoading: setGlobalLoading, setError: setGlobalError } = useData();
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<FileParseResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [currentStep, setCurrentStep] = useState<'select' | 'preview' | 'mapping' | 'confirm' | 'upload' | 'suggestions'>('select');
  const [validationMessages, setValidationMessages] = useState<ValidationMessage[]>([]);

  // File drop handlers
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFileSelection(files[0]);
    }
  }, []);

  const onFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileSelection(files[0]);
    }
  }, []);

  // File processing
  const handleFileSelection = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsLoading(true);
    setValidationMessages([]);

    try {
      // Check if file is supported
      if (!FileParserService.isSupported(selectedFile.name)) {
        const supportedFormats = ['.csv', '.tsv', '.txt', '.json', '.xlsx', '.xls'];
        setValidationMessages([{
          type: 'error',
          message: `Unsupported file format. Supported formats: ${supportedFormats.join(', ')}`
        }]);
        return;
      }

      // Parse file
      const result = await FileParserService.parseFile(selectedFile, {
        previewRows: 20,
        skipEmptyLines: true,
        trimHeaders: true
      });

      setParseResult(result);

      // Convert validation to messages
      const messages: ValidationMessage[] = [
        ...result.validation.errors.map(error => ({ type: 'error' as const, message: error })),
        ...result.validation.warnings.map(warning => ({ type: 'warning' as const, message: warning }))
      ];

      if (messages.length === 0 && result.validation.isValid) {
        messages.push({
          type: 'info',
          message: `Successfully parsed ${result.metadata.rowCount} rows with ${result.metadata.columnCount} columns`
        });
      }

      setValidationMessages(messages);

      // Initialize column mappings
      if (result.validation.isValid && result.headers.length > 0) {
        const mappings = result.headers.map(header => {
          const column = result.schema.columns.find(col => col.name === header);
          return {
            original: header,
            mapped: header,
            type: column?.type || 'string' as const
          };
        });
        setColumnMappings(mappings);
        setCurrentStep('preview');
      } else {
        setCurrentStep('select');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setGlobalError(`Failed to parse file: ${errorMessage}`);
      setValidationMessages([{
        type: 'error',
        message: `Failed to parse file: ${errorMessage}`
      }]);
      setCurrentStep('select');
    } finally {
      setIsLoading(false);
    }
  };

  // Column mapping handlers
  const updateColumnMapping = (originalName: string, newMapping: Partial<ColumnMapping>) => {
    setColumnMappings(prev => 
      prev.map(mapping => 
        mapping.original === originalName 
          ? { ...mapping, ...newMapping }
          : mapping
      )
    );
  };

  // Upload handlers
  const handleUpload = async () => {
    if (!parseResult || !file) return;

    setIsLoading(true);
    setCurrentStep('upload');

    try {
      // Transform data based on column mappings
      const transformedData = parseResult.data.map(row => {
        const newRow: Record<string, any> = {};
        columnMappings.forEach(mapping => {
          if (mapping.mapped && mapping.original in row) {
            newRow[mapping.mapped] = row[mapping.original];
          }
        });
        return newRow;
      });

      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Call upload API
      const enhancedResponse = await apiService.uploadData(transformedData, {
        fileName: file.name,
        columnMappings,
        parseMetadata: parseResult.metadata
      });

      // Infer column types from the data and column mappings
      const numericColumns: string[] = [];
      const categoricalColumns: string[] = [];
      
      columnMappings.forEach(mapping => {
        if (mapping.mapped && mapping.type) {
          if (mapping.type === 'number') {
            numericColumns.push(mapping.mapped);
          } else if (mapping.type === 'string' || mapping.type === 'boolean') {
            categoricalColumns.push(mapping.mapped);
          }
          // date type columns are treated as categorical for now
          else if (mapping.type === 'date') {
            categoricalColumns.push(mapping.mapped);
          }
        }
      });

      // Convert EnhancedUploadResponse to FileUploadResponse format for DataContext
      const convertedResponse = {
        message: enhancedResponse.message,
        file: {
          id: enhancedResponse.file.id,
          filename: enhancedResponse.file.filename
        },
        statistics: {
          total_rows: enhancedResponse.metadata.total_rows,
          total_columns: enhancedResponse.metadata.total_columns,
          numeric_columns: numericColumns,
          categorical_columns: categoricalColumns
        },
        column_preview: transformedData.slice(0, 10) // Use first 10 rows as preview
      };

      // Update the global data context
      processUploadResponse(convertedResponse);
      setGlobalError(null);

      setValidationMessages([{
        type: 'info',
        message: 'Data uploaded successfully! Available in all visualization tools.'
      }]);

      // Navigate to suggestions after successful upload
      setTimeout(() => {
        setCurrentStep('suggestions');
      }, 1500);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setGlobalError(`Upload failed: ${errorMessage}`);
      setValidationMessages([{
        type: 'error',
        message: `Upload failed: ${errorMessage}`
      }]);
      setCurrentStep('confirm');
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const resetState = () => {
    setFile(null);
    setParseResult(null);
    setColumnMappings([]);
    setValidationMessages([]);
    setCurrentStep('select');
  };

  // Chart suggestion handlers
  const handleCreateChart = (recommendation: ChartRecommendation) => {
    if (!parseResult) return;

    // Store recommendation data using navigation service
    ChartNavigationService.storeRecommendation(
      recommendation,
      parseResult.data,
      parseResult.headers
    );
    
    // Show feedback message
    setValidationMessages([{
      type: 'info',
      message: `✨ Creating ${recommendation.chartType} chart: ${recommendation.title}`
    }]);
    
    // Navigate to enhanced visualization page after short delay
    setTimeout(() => {
      // In a real app, you'd use proper routing. For now, we'll trigger a page change
      window.dispatchEvent(new CustomEvent('navigateToChart', {
        detail: { 
          recommendation, 
          fromAI: true,
          confidence: recommendation.confidence
        }
      }));

    }, 1000);
  };

  const handleSkipSuggestions = () => {
    setValidationMessages([{
      type: 'info',
      message: 'Upload completed successfully! You can create charts manually from the Visualize page.'
    }]);
    
    setTimeout(() => {
      resetState();
    }, 2000);
  };

  // Computed values
  const fileMetadata = useMemo(() => {
    if (!parseResult) return null;
    
    return {
      ...parseResult.metadata,
      fileSizeMB: (parseResult.metadata.fileSize / 1024 / 1024).toFixed(2),
      parseTimeMs: parseResult.metadata.parseTime.toFixed(1)
    };
  }, [parseResult]);

  const canProceedToMapping = useMemo(() => {
    return parseResult?.validation.isValid && parseResult.data.length > 0;
  }, [parseResult]);

  const canUpload = useMemo(() => {
    return canProceedToMapping && columnMappings.some(mapping => mapping.mapped);
  }, [canProceedToMapping, columnMappings]);

  return (
    <div className="upload-page">
      <div className="upload-container">
        <h2>Import Data</h2>

        {/* Step indicator */}
        <div className="step-indicator">
          <div className={`step ${currentStep === 'select' ? 'active' : ''}`}>1. Select File</div>
          <div className={`step ${currentStep === 'preview' ? 'active' : ''}`}>2. Preview Data</div>
          <div className={`step ${currentStep === 'mapping' ? 'active' : ''}`}>3. Map Columns</div>
          <div className={`step ${currentStep === 'confirm' ? 'active' : ''}`}>4. Confirm</div>
          <div className={`step ${currentStep === 'upload' ? 'active' : ''}`}>5. Upload</div>
          <div className={`step ${currentStep === 'suggestions' ? 'active' : ''}`}>6. AI Suggestions</div>
        </div>

        {/* Validation messages */}
        {validationMessages.length > 0 && (
          <div className="validation-messages">
            {validationMessages.map((msg, index) => (
              <div key={index} className={`message message-${msg.type}`}>
                {msg.message}
              </div>
            ))}
          </div>
        )}

        {/* File selection */}
        {currentStep === 'select' && (
          <div className="file-upload-section">
            <div
              className="file-drop-zone"
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              <div className="drop-zone-content">
                <div className="upload-icon">📁</div>
                <p>Drag and drop your file here</p>
                <p className="supported-formats">
                  Supported formats: CSV, TSV, JSON, Excel (.xlsx, .xls)
                </p>
                <div className="or-divider">or</div>
                <label className="file-input-label">
                  <input
                    type="file"
                    accept=".csv,.tsv,.txt,.json,.xlsx,.xls"
                    onChange={onFileInputChange}
                    className="file-input"
                  />
                  Choose File
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Data preview */}
        {currentStep === 'preview' && parseResult && (
          <div className="data-preview-section">
            <h3>Data Preview</h3>
            
            {fileMetadata && (
              <div className="file-metadata">
                <div className="metadata-item">
                  <strong>File:</strong> {fileMetadata.fileName} ({fileMetadata.fileSizeMB} MB)
                </div>
                <div className="metadata-item">
                  <strong>Format:</strong> {fileMetadata.fileType}
                </div>
                <div className="metadata-item">
                  <strong>Rows:</strong> {fileMetadata.rowCount.toLocaleString()}
                </div>
                <div className="metadata-item">
                  <strong>Columns:</strong> {fileMetadata.columnCount}
                </div>
                <div className="metadata-item">
                  <strong>Parse Time:</strong> {fileMetadata.parseTimeMs}ms
                </div>
              </div>
            )}

            <div className="schema-info">
              <h4>Column Schema</h4>
              <div className="schema-grid">
                {parseResult.schema.columns.map(column => (
                  <div key={column.name} className="schema-column">
                    <div className="column-name">{column.name}</div>
                    <div className="column-type">{column.type}</div>
                    <div className="column-flags">
                      {column.nullable && <span className="flag nullable">Nullable</span>}
                      {column.unique && <span className="flag unique">Unique</span>}
                    </div>
                    {column.samples.length > 0 && (
                      <div className="column-samples">
                        Samples: {column.samples.slice(0, 3).map(String).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="data-table-container">
              <table className="data-preview-table">
                <thead>
                  <tr>
                    {parseResult.headers.map(header => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parseResult.preview.map((row, index) => (
                    <tr key={index}>
                      {parseResult.headers.map(header => (
                        <td key={header}>
                          {String(row[header] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="preview-actions">
              <button onClick={resetState} className="btn btn-secondary">
                Start Over
              </button>
              {canProceedToMapping && (
                <button 
                  onClick={() => setCurrentStep('mapping')}
                  className="btn btn-primary"
                >
                  Next: Map Columns
                </button>
              )}
            </div>
          </div>
        )}

        {/* Column mapping */}
        {currentStep === 'mapping' && parseResult && (
          <div className="column-mapping-section">
            <h3>Column Mapping</h3>
            <p>Map your data columns to the desired output format:</p>

            <div className="mapping-grid">
              {columnMappings.map(mapping => (
                <div key={mapping.original} className="mapping-row">
                  <div className="original-column">
                    <strong>{mapping.original}</strong>
                    <span className="column-type">({mapping.type})</span>
                  </div>
                  <div className="mapping-arrow">→</div>
                  <div className="mapped-column">
                    <input
                      type="text"
                      value={mapping.mapped}
                      onChange={(e) => updateColumnMapping(mapping.original, { mapped: e.target.value })}
                      placeholder="Enter new column name"
                      className="mapping-input"
                    />
                    <select
                      value={mapping.type}
                      onChange={(e) => updateColumnMapping(mapping.original, { 
                        type: e.target.value as ColumnMapping['type'] 
                      })}
                      className="type-select"
                    >
                      <option value="string">Text</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="boolean">Boolean</option>
                      <option value="mixed">Mixed</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div className="mapping-actions">
              <button onClick={() => setCurrentStep('preview')} className="btn btn-secondary">
                Back to Preview
              </button>
              {canUpload && (
                <button 
                  onClick={() => setCurrentStep('confirm')}
                  className="btn btn-primary"
                >
                  Next: Confirm Upload
                </button>
              )}
            </div>
          </div>
        )}

        {/* Upload confirmation */}
        {currentStep === 'confirm' && parseResult && (
          <div className="confirm-section">
            <h3>Confirm Upload</h3>
            <div className="upload-summary">
              <div className="summary-item">
                <strong>File:</strong> {parseResult.metadata.fileName}
              </div>
              <div className="summary-item">
                <strong>Rows to upload:</strong> {parseResult.metadata.rowCount.toLocaleString()}
              </div>
              <div className="summary-item">
                <strong>Mapped columns:</strong> {columnMappings.filter(m => m.mapped).length}
              </div>
            </div>

            <div className="final-mapping-preview">
              <h4>Final Column Mapping</h4>
              {columnMappings.filter(m => m.mapped).map(mapping => (
                <div key={mapping.original} className="final-mapping">
                  {mapping.original} → <strong>{mapping.mapped}</strong> ({mapping.type})
                </div>
              ))}
            </div>

            <div className="confirm-actions">
              <button onClick={() => setCurrentStep('mapping')} className="btn btn-secondary">
                Back to Mapping
              </button>
              <button 
                onClick={handleUpload}
                disabled={!canUpload}
                className="btn btn-primary"
              >
                Upload Data
              </button>
            </div>
          </div>
        )}

        {/* Upload progress */}
        {currentStep === 'upload' && (
          <div className="upload-progress-section">
            <h3>Uploading Data...</h3>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="progress-text">{uploadProgress}%</div>
          </div>
        )}

        {/* AI Chart Suggestions */}
        {currentStep === 'suggestions' && parseResult && (
          <div className="suggestions-section">
            <ChartSuggestions
              parseResult={parseResult}
              onCreateChart={handleCreateChart}
              onSkip={handleSkipSuggestions}
              className="upload-suggestions"
            />
          </div>
        )}

        {/* Loading overlay */}
        {isLoading && currentStep !== 'upload' && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>Processing file...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedUploadPage;
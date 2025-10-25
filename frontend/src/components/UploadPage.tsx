import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { apiService } from '../services/api';
import { config, validateFileSize, formatFileSize } from '../config';
import SmartTransforms from './SmartTransforms';
import styles from './UploadPage.module.css';

interface UploadPageProps {
  onPageChange: (page: string) => void;
}

export function UploadPage({ onPageChange }: UploadPageProps) {
  const { processUploadResponse, setLoading, setError, isLoading, error, csvData, updateData } = useData();
  const [file, setFile] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [showTransforms, setShowTransforms] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const validateFile = (file: File): string | null => {
    // Check file type
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      return 'Please select a CSV file (.csv extension required)';
    }
    
    // Check file size using centralized config
    const fileSizeValidation = validateFileSize(file.size);
    if (!fileSizeValidation.valid) {
      return fileSizeValidation.message || 'File size too large';
    }
    
    // Check minimum file size
    if (file.size < 10) {
      return 'File appears to be empty or corrupted.';
    }
    
    return null;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setFile(selectedFile);
    setError(null);
    setUploadSuccess(null);
    
    // Automatically upload the file
    await handleUpload(selectedFile);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };
  
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) {
      setError('No files were dropped');
      return;
    }
    
    if (files.length > 1) {
      setError('Please drop only one file at a time');
      return;
    }
    
    const selectedFile = files[0];
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setFile(selectedFile);
    setError(null);
    setUploadSuccess(null);
    
    // Automatically upload the dropped file
    await handleUpload(selectedFile);
  };
  
  const handleUpload = async (uploadFile?: File) => {
    const fileToUpload = uploadFile || file;
    if (!fileToUpload) return;
    
    setLoading(true);
    setError(null);
    setUploadSuccess(null);
    
    try {
      const response = await apiService.uploadCSV(fileToUpload);
      
      // Validate response
      if (!response || !response.statistics) {
        throw new Error('Invalid response from server. Please try again.');
      }
      
      if (response.statistics.total_rows === 0) {
        throw new Error('The uploaded file appears to be empty or contains no valid data rows.');
      }
      
      if (response.statistics.total_columns === 0) {
        throw new Error('The uploaded file contains no valid columns.');
      }
      
      processUploadResponse(response);
      setUploadSuccess(`Successfully uploaded ${fileToUpload.name} with ${response.statistics.total_rows.toLocaleString()} rows and ${response.statistics.total_columns} columns`);
      
      // Show smart transformations
      setTimeout(() => {
        setShowTransforms(true);
      }, 1500);
      
    } catch (error) {
      let errorMessage = 'Failed to upload file';
      
      if (error instanceof Error) {
        if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Upload timed out. Please try with a smaller file or check your connection.';
        } else if (error.message.includes('413') || error.message.includes('too large')) {
          errorMessage = 'File too large. Please select a file smaller than 50MB.';
        } else if (error.message.includes('400') || error.message.includes('invalid')) {
          errorMessage = 'Invalid file format. Please ensure your CSV file is properly formatted.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleTransformationsApplied = (transformedData: Record<string, any>[], summary: string) => {
    // Update the data context with transformed data
    if (updateData) {
      updateData(transformedData);
    }
    
    // Show success message
    setUploadSuccess(summary);
    
    // Navigate to stats page
    setTimeout(() => {

      onPageChange('stats');
    }, 2000);
  };

  const handleSkipTransformations = () => {
    // Navigate directly to stats

    onPageChange('stats');
  };
  
  return (
    <div className={styles.uploadContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Upload CSV Data</h1>
        <p className={styles.pageDescription}>Import your data to begin analysis</p>
      </div>
      
      <div className={styles.uploadSection}>
        <div 
          className={`${styles.uploadArea} ${isDragOver ? styles.dragOver : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className={styles.uploadIcon}>📁</div>
          <h2>Select your CSV file</h2>
          <p>Choose a file or drag & drop to automatically upload and analyze</p>
          
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleFileSelect}
            className={styles.fileInput}
            id="file-upload"
            disabled={isLoading}
          />
          <label htmlFor="file-upload" className={`${styles.fileLabel} ${isLoading ? styles.fileLabelDisabled : ''}`}>
            {isLoading ? 'Processing...' : 'Choose File'}
          </label>
        </div>
        
        {file && (
          <div className={styles.fileInfo}>
            <div className={styles.fileDetails}>
              <div className={styles.fileIcon}>📄</div>
              <div className={styles.fileMeta}>
                <div className={styles.fileName}>{file.name}</div>
                <div className={styles.fileSize}>{formatFileSize(file.size)}</div>
              </div>
            </div>
            
            {isLoading && (
              <div className={styles.uploadStatus}>
                <span className={styles.loadingSpinner}>⟳</span>
                Uploading and analyzing...
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Success/Error Messages */}
      {uploadSuccess && (
        <div className={`${styles.statusMessage} ${styles.successMessage}`}>
          <span className={styles.statusIcon}>✅</span>
          {uploadSuccess}
        </div>
      )}
      
      {error && (
        <div className={`${styles.statusMessage} ${styles.errorMessage}`}>
          <span className={styles.statusIcon}>❌</span>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {csvData && (
        <div className={styles.previewSection}>
          <div className={styles.previewHeader}>
            <h2>Data Preview</h2>
            <span className={styles.rowCount}>{csvData.data?.length || 0} rows loaded</span>
          </div>
          
          <div className={styles.tableWrapper}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  {csvData.headers?.map((header, index) => (
                    <th key={index}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvData.data?.slice(0, 10).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {csvData.headers?.map((header, colIndex) => (
                      <td key={colIndex}>{row[header] || '-'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <p className={styles.previewNote}>Showing first 10 rows of {csvData.data?.length || 0} total rows</p>
        </div>
      )}
      
      {/* Smart Transformations Section */}
      {showTransforms && csvData && csvData.data && csvData.headers && (
        <div className={styles.transformsSection}>
          <SmartTransforms
            data={csvData.data}
            headers={csvData.headers}
            onTransformationsApplied={handleTransformationsApplied}
          />
          
          <div className={styles.skipSection}>
            <button 
              onClick={handleSkipTransformations}
              className={styles.skipButton}
            >
              Skip Transformations & Continue to Analysis
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
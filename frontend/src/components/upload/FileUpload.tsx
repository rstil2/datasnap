import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useScreenReaderAnnouncement } from '../../utils/accessibility';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  file?: File;
  url?: string;
}

export interface FileUploadProps {
  onFilesUploaded: (files: UploadedFile[]) => void;
  onProgress?: (fileId: string, progress: number) => void;
  onError?: (fileId: string, error: string) => void;
  acceptedTypes?: string[];
  maxFileSize?: number; // in bytes
  maxFiles?: number;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  uploadUrl?: string;
  customUploader?: (file: File) => Promise<{ url: string }>;
}

export interface DragState {
  isDragActive: boolean;
  isDragAccept: boolean;
  isDragReject: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFilesUploaded,
  onProgress,
  onError,
  acceptedTypes = ['.csv', '.xlsx', '.json', '.txt'],
  maxFileSize = 50 * 1024 * 1024, // 50MB
  maxFiles = 10,
  multiple = true,
  disabled = false,
  className = '',
  uploadUrl = '/api/upload',
  customUploader
}) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragState, setDragState] = useState<DragState>({
    isDragActive: false,
    isDragAccept: false,
    isDragReject: false
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const announce = useScreenReaderAnnouncement();

  // Generate unique ID for files
  const generateFileId = useCallback(() => {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Validate file
  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize) {
      return `File size must be less than ${formatFileSize(maxFileSize)}`;
    }

    // Check file type
    if (acceptedTypes.length > 0) {
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const mimeTypeAccepted = acceptedTypes.some(type => 
        type.startsWith('.') ? type === fileExtension : file.type.includes(type)
      );
      
      if (!mimeTypeAccepted) {
        return `File type not supported. Accepted types: ${acceptedTypes.join(', ')}`;
      }
    }

    // Check max files
    if (files.length >= maxFiles) {
      return `Maximum ${maxFiles} files allowed`;
    }

    return null;
  }, [acceptedTypes, maxFileSize, maxFiles, files.length]);

  // Handle file upload
  const uploadFile = useCallback(async (uploadedFile: UploadedFile): Promise<void> => {
    if (!uploadedFile.file) return;

    setFiles(prev => prev.map(f => 
      f.id === uploadedFile.id 
        ? { ...f, status: 'uploading', progress: 0 }
        : f
    ));

    try {
      let result: { url: string };

      if (customUploader) {
        // Use custom uploader
        result = await customUploader(uploadedFile.file);
      } else {
        // Default upload implementation
        result = await defaultUpload(uploadedFile);
      }

      setFiles(prev => prev.map(f => 
        f.id === uploadedFile.id 
          ? { ...f, status: 'completed', progress: 100, url: result.url }
          : f
      ));

      announce(`File ${uploadedFile.name} uploaded successfully`, 'polite');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setFiles(prev => prev.map(f => 
        f.id === uploadedFile.id 
          ? { ...f, status: 'error', error: errorMessage }
          : f
      ));

      if (onError) {
        onError(uploadedFile.id, errorMessage);
      }

      announce(`File ${uploadedFile.name} upload failed: ${errorMessage}`, 'assertive');
    }
  }, [customUploader, onError, announce]);

  // Default upload implementation with progress
  const defaultUpload = useCallback(async (uploadedFile: UploadedFile): Promise<{ url: string }> => {
    return new Promise((resolve, reject) => {
      if (!uploadedFile.file) {
        reject(new Error('No file to upload'));
        return;
      }

      const formData = new FormData();
      formData.append('file', uploadedFile.file);

      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          
          setFiles(prev => prev.map(f => 
            f.id === uploadedFile.id 
              ? { ...f, progress }
              : f
          ));

          if (onProgress) {
            onProgress(uploadedFile.id, progress);
          }
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve({ url: response.url || response.path || '' });
          } catch {
            resolve({ url: '' });
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Upload failed due to network error'));
      };

      xhr.open('POST', uploadUrl);
      xhr.send(formData);
    });
  }, [uploadUrl, onProgress]);

  // Process files
  const processFiles = useCallback((fileList: FileList | File[]) => {
    const filesToProcess = Array.from(fileList).slice(0, maxFiles - files.length);
    const newFiles: UploadedFile[] = [];

    filesToProcess.forEach(file => {
      const validation = validateFile(file);
      const uploadedFile: UploadedFile = {
        id: generateFileId(),
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: validation ? 'error' : 'pending',
        error: validation || undefined,
        file: validation ? undefined : file
      };

      newFiles.push(uploadedFile);
    });

    setFiles(prev => [...prev, ...newFiles]);

    // Start uploading valid files
    newFiles
      .filter(f => f.status === 'pending')
      .forEach(uploadFile);

    // Announce file addition
    const validCount = newFiles.filter(f => f.status === 'pending').length;
    const invalidCount = newFiles.filter(f => f.status === 'error').length;
    
    if (validCount > 0) {
      announce(`Added ${validCount} file${validCount > 1 ? 's' : ''} for upload`, 'polite');
    }
    if (invalidCount > 0) {
      announce(`${invalidCount} file${invalidCount > 1 ? 's' : ''} rejected due to validation errors`, 'assertive');
    }
  }, [files.length, maxFiles, validateFile, generateFileId, uploadFile, announce]);

  // Handle file input change
  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      processFiles(files);
    }
    // Reset input value to allow selecting the same file again
    event.target.value = '';
  }, [processFiles]);

  // Handle drag events
  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const files = event.dataTransfer.files;
    const hasFiles = files && files.length > 0;
    const hasValidFiles = hasFiles && Array.from(files).some(file => !validateFile(file));

    setDragState({
      isDragActive: true,
      isDragAccept: hasValidFiles,
      isDragReject: hasFiles && !hasValidFiles
    });
  }, [validateFile]);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    // Only reset drag state if leaving the drop zone entirely
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragState({
        isDragActive: false,
        isDragAccept: false,
        isDragReject: false
      });
    }
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    setDragState({
      isDragActive: false,
      isDragAccept: false,
      isDragReject: false
    });

    const files = event.dataTransfer.files;
    if (files) {
      processFiles(files);
    }
  }, [processFiles]);

  // Handle click to open file dialog
  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  // Remove file
  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    announce('File removed', 'polite');
  }, [announce]);

  // Retry upload
  const retryUpload = useCallback((fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file && file.status === 'error') {
      uploadFile(file);
    }
  }, [files, uploadFile]);

  // Clear all files
  const clearAll = useCallback(() => {
    setFiles([]);
    announce('All files cleared', 'polite');
  }, [announce]);

  // Notify parent when files are uploaded
  useEffect(() => {
    const completedFiles = files.filter(f => f.status === 'completed');
    if (completedFiles.length > 0) {
      onFilesUploaded(completedFiles);
    }
  }, [files, onFilesUploaded]);

  const getDropZoneStyles = () => {
    let styles = 'border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ';
    
    if (disabled) {
      styles += 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 cursor-not-allowed ';
    } else if (dragState.isDragReject) {
      styles += 'border-red-400 bg-red-50 dark:bg-red-900/20 ';
    } else if (dragState.isDragAccept) {
      styles += 'border-green-400 bg-green-50 dark:bg-green-900/20 ';
    } else if (dragState.isDragActive) {
      styles += 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 ';
    } else {
      styles += 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer ';
    }

    return styles;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drop Zone */}
      <div
        className={getDropZoneStyles()}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={`Upload files. Accepts ${acceptedTypes.join(', ')}. Maximum ${maxFiles} files, ${formatFileSize(maxFileSize)} each.`}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
          aria-describedby="upload-description"
        />

        <div className="space-y-3">
          <Upload 
            size={48} 
            className={`mx-auto ${
              disabled ? 'text-gray-400 dark:text-gray-500' : 
              dragState.isDragReject ? 'text-red-500' :
              dragState.isDragAccept ? 'text-green-500' :
              dragState.isDragActive ? 'text-blue-500' :
              'text-gray-400 dark:text-gray-500'
            }`}
          />
          
          <div>
            <p className={`text-lg font-medium ${
              disabled ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'
            }`}>
              {dragState.isDragActive 
                ? dragState.isDragAccept 
                  ? 'Drop files here'
                  : 'Some files are not supported'
                : disabled
                ? 'Upload disabled'
                : 'Drag & drop files here, or click to browse'
              }
            </p>
            
            {!disabled && (
              <p id="upload-description" className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Supports {acceptedTypes.join(', ')} • Max {formatFileSize(maxFileSize)} per file • Up to {maxFiles} files
              </p>
            )}
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Files ({files.length})
            </h4>
            {files.length > 0 && (
              <button
                onClick={clearAll}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {files.map(file => (
              <FileItem
                key={file.id}
                file={file}
                onRemove={removeFile}
                onRetry={retryUpload}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Individual File Item Component
interface FileItemProps {
  file: UploadedFile;
  onRemove: (fileId: string) => void;
  onRetry: (fileId: string) => void;
}

const FileItem: React.FC<FileItemProps> = ({ file, onRemove, onRetry }) => {
  const getStatusIcon = () => {
    switch (file.status) {
      case 'uploading':
        return <Loader className="animate-spin text-blue-500" size={16} />;
      case 'completed':
        return <CheckCircle className="text-green-500" size={16} />;
      case 'error':
        return <AlertCircle className="text-red-500" size={16} />;
      default:
        return <File className="text-gray-400" size={16} />;
    }
  };

  const getStatusColor = () => {
    switch (file.status) {
      case 'uploading':
        return 'border-blue-200 dark:border-blue-800';
      case 'completed':
        return 'border-green-200 dark:border-green-800';
      case 'error':
        return 'border-red-200 dark:border-red-800';
      default:
        return 'border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <div className={`border rounded-lg p-3 ${getStatusColor()}`}>
      <div className="flex items-center gap-3">
        {getStatusIcon()}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {file.name}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(file.size)}
              </span>
              <button
                onClick={() => onRemove(file.id)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label={`Remove ${file.name}`}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          {file.status === 'uploading' && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>Uploading...</span>
                <span>{file.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div 
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${file.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {file.status === 'error' && file.error && (
            <div className="mt-1 flex items-center justify-between">
              <p className="text-xs text-red-600 dark:text-red-400">
                {file.error}
              </p>
              <button
                onClick={() => onRetry(file.id)}
                className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium"
              >
                Retry
              </button>
            </div>
          )}

          {/* Success Message */}
          {file.status === 'completed' && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              Upload completed successfully
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Utility function to format file sizes
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default FileUpload;
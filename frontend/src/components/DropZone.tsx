import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import './DropZone.css';

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  isUploading?: boolean;
  uploadProgress?: number;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFileSelect,
  isUploading = false,
  uploadProgress = 0,
}) => {
  const [isDragActive, setIsDragActive] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    multiple: false,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
  });

  return (
    <div
      {...getRootProps()}
      className={`dropzone ${isDragActive ? 'active' : ''} ${
        isUploading ? 'uploading' : ''
      }`}
    >
      <input {...getInputProps()} />
      <div className="dropzone-content">
        {isUploading ? (
          <div className="upload-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <span className="progress-text">{uploadProgress}% uploaded</span>
          </div>
        ) : (
          <>
            <div className="dropzone-icon">📁</div>
            <p className="dropzone-text">
              {isDragActive
                ? 'Drop the CSV file here'
                : 'Drag & drop a CSV file here, or click to select'}
            </p>
          </>
        )}
      </div>
    </div>
  );
};
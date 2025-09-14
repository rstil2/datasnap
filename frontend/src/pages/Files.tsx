import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { DropZone } from '../components/DropZone';
import { Button } from '../components/Button';
import { filesService } from '../services/files';
import './Files.css';

interface FileData {
  id: string;
  filename: string;
  file_size: number;
  created_at: string;
}

export const Files: React.FC = () => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setIsLoading(true);
      const fileList = await filesService.listFiles();
      setFiles(fileList);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Simulated progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      await filesService.uploadFile(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Reload file list
      await loadFiles();
    } catch (error) {
      console.error('Failed to upload file:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDownload = async (fileId: string, filename: string) => {
    try {
      const blob = await filesService.downloadFile(fileId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      await filesService.deleteFile(fileId);
      await loadFiles();
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <DashboardLayout>
      <div className="files-container">
        <div className="files-header">
          <h1>Files</h1>
          <p>Upload and manage your CSV files</p>
        </div>

        <DropZone
          onFileSelect={handleFileSelect}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
        />

        <div className="files-list">
          <h2>Uploaded Files</h2>
          {isLoading ? (
            <div className="loading-state">Loading...</div>
          ) : files.length === 0 ? (
            <div className="empty-state">No files uploaded yet</div>
          ) : (
            <div className="files-grid">
              {files.map((file) => (
                <div key={file.id} className="file-card">
                  <div className="file-icon">📄</div>
                  <div className="file-info">
                    <h3 className="file-name">{file.filename}</h3>
                    <p className="file-meta">
                      {formatFileSize(file.file_size)} •{' '}
                      {new Date(file.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="file-actions">
                    <Button
                      variant="outlined"
                      onClick={() => handleDownload(file.id, file.filename)}
                    >
                      Download
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleDelete(file.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};
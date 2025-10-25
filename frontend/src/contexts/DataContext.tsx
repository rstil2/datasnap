import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { CSVFile, FileUploadResponse, StatisticalStats } from '../services/api';
import { ProcessedDataset } from '../utils/dataProcessing';

interface CSVData {
  headers: string[];
  data: Record<string, any>[];
  filename: string;
  rowCount: number;
  columnCount: number;
}

interface DataContextType {
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
  updateData: (transformedData: Record<string, any>[]) => void;
  clearData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [currentFile, setCurrentFile] = useState<CSVFile | null>(null);
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<CSVFile[]>([]);
  const [stats, setStats] = useState<StatisticalStats | ProcessedDataset | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const processUploadResponse = (response: FileUploadResponse) => {
    try {

      // Set the current file
      setCurrentFile(response.file);
      
      // Process the column preview into CSVData format
      const headers = response.column_preview && response.column_preview.length > 0 ? Object.keys(response.column_preview[0]) : [];
      const processedData: CSVData = {
        headers,
        data: response.column_preview || [],
        filename: response.file.filename,
        rowCount: response.statistics.total_rows,
        columnCount: response.statistics.total_columns
      };

      setCsvData(processedData);
      
      // Add to uploaded files if not already present
      setUploadedFiles(prev => {
        const exists = prev.find(f => f.id === response.file.id);
        if (!exists) {
          return [...prev, response.file];
        }
        return prev;
      });
      
      setError(null);

    } catch (err) {
      console.error('Error processing upload response:', err);
      setError(err instanceof Error ? err.message : 'Error processing upload response');
    }
  };
  
  const updateData = (transformedData: Record<string, any>[]) => {
    if (csvData) {
      setCsvData({
        ...csvData,
        data: transformedData,
        rowCount: transformedData.length
      });
    }
  };
  
  const clearData = () => {
    setCurrentFile(null);
    setCsvData(null);
    setStats(null);
    setError(null);
  };
  
  const contextValue: DataContextType = {
    currentFile,
    csvData,
    isLoading,
    error,
    uploadedFiles,
    stats,
    
    setCurrentFile,
    setCsvData,
    setUploadedFiles,
    setStats,
    setLoading,
    setError,
    
    processUploadResponse,
    updateData,
    clearData
  };
  
  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  
  
  return context;
}

export default DataContext;
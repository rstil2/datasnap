import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { ChartBuilder } from './visualization/ChartBuilder';
import { ChartConfig } from '../types/VisualizationTypes';
import { generateDataSchema } from '../utils/visualization/dataAnalysis';
import { BarChart3 } from 'lucide-react';

export function EnhancedVisualizePage() {
  const { csvData, currentFile } = useData();
  const [, setCurrentChartConfig] = useState<ChartConfig | null>(null);

  // Convert CSV data to the format expected by ChartBuilder
  const chartBuilderData = useMemo(() => {
    if (!csvData || !csvData.data) return [];
    return csvData.data;
  }, [csvData]);

  // Generate data schema for the current data
  const dataSchema = useMemo(() => {
    if (!chartBuilderData.length) {
      return { fields: [], rowCount: 0, columnCount: 0 };
    }
    try {
      return generateDataSchema(chartBuilderData);
    } catch (error) {
      console.error('Error generating data schema:', error);
      return { fields: [], rowCount: 0, columnCount: 0 };
    }
  }, [chartBuilderData]);

  const handleConfigChange = (config: ChartConfig) => {
    setCurrentChartConfig(config);
  };

  const handleExport = () => {
    // Export functionality will be handled by ChartBuilder's internal logic
  };

  if (!csvData || !currentFile) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">
            <BarChart3 size={32} style={{ marginRight: 'var(--space-sm)' }} />
            Professional Chart Builder
          </h1>
          <p className="page-description">
            Create interactive charts with AI-powered insights and advanced customization
          </p>
        </div>
        
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">No Data Available</h3>
          </div>
          <div className="card-content">
            <div style={{ 
              textAlign: 'center', 
              padding: 'var(--space-2xl)',
              color: 'var(--text-secondary)'
            }}>
              <div style={{ fontSize: '4rem', marginBottom: 'var(--space-lg)', opacity: 0.3 }}>📊</div>
              <h4 style={{ margin: '0 0 var(--space-md) 0' }}>Upload Data to Get Started</h4>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>
                Upload a CSV file to access the professional chart builder.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">
          <BarChart3 size={32} style={{ marginRight: 'var(--space-sm)' }} />
          Professional Chart Builder
        </h1>
        
        <p className="page-description">
          Create interactive charts with AI-powered insights from{' '}
          <strong style={{ color: 'var(--accent-primary)' }}>
            {currentFile && currentFile.filename ? currentFile.filename : 'your data'}
          </strong>
          {dataSchema && dataSchema.rowCount > 0 && (
            <span>
              {' '}({dataSchema.rowCount.toLocaleString()} records, {dataSchema.fields.length} fields)
            </span>
          )}
        </p>
      </div>

      {/* Professional Chart Builder */}
      {chartBuilderData.length > 0 && (
        <ChartBuilder
          data={chartBuilderData}
          onConfigChange={handleConfigChange}
          onExport={handleExport}
        />
      )}
      
      {chartBuilderData.length === 0 && (
        <div className="card">
          <div className="card-content">
            <div style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>
              <p>Loading chart builder...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
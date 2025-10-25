import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  ChartConfig,
  ChartType,
  FieldMapping,
  ChartStyling,
  ChartEvent
} from '../../types/VisualizationTypes';
import { generateDataSchema } from '../../utils/visualization/dataAnalysis';
import { getChartRecommendations, suggestFieldMapping } from '../../services/ai/ChartRecommendations';
import { ChartExporter } from '../../services/export/ChartExporter';
import { FieldMapper } from './FieldMapper';
import { ChartCustomizer } from './ChartCustomizer';
import {
  Lightbulb,
  Download,
  Share2,
  Settings,
  Wand2,
  MousePointer,
  Activity,
  Loader2
} from 'lucide-react';
import { LazyChart } from '../lazy/LazyLoader';
import { useLazyChartManager, useChartPerformance } from '../../hooks/useLazyChart';

interface LazyChartBuilderProps {
  data: Record<string, unknown>[];
  onConfigChange?: (config: ChartConfig) => void;
  onExport?: (format: string) => void;
}

const CHART_TYPES: { type: ChartType; label: string; icon: string; description: string }[] = [
  { type: 'line', label: 'Line Chart', icon: '📈', description: 'Time series and trends' },
  { type: 'bar', label: 'Bar Chart', icon: '📊', description: 'Compare categories' },
  { type: 'scatter', label: 'Scatter Plot', icon: '🔵', description: 'Correlation analysis' },
  { type: 'boxplot', label: 'Box Plot', icon: '📦', description: 'Distribution analysis' },
  { type: 'histogram', label: 'Histogram', icon: '📶', description: 'Data distribution' },
  { type: 'heatmap', label: 'Heatmap', icon: '🔥', description: 'Pattern visualization' },
  { type: 'pie', label: 'Pie Chart', icon: '🥧', description: 'Part-to-whole' },
  { type: 'area', label: 'Area Chart', icon: '🏔️', description: 'Cumulative trends' },
  { type: 'violin', label: 'Violin Plot', icon: '🎻', description: 'Distribution comparison' },
  { type: 'radar', label: 'Radar Chart', icon: '🕸️', description: 'Multivariate data' },
  { type: 'treemap', label: 'Treemap', icon: '🌳', description: 'Hierarchical data' }
];

export function LazyChartBuilder({ data, onConfigChange }: LazyChartBuilderProps) {
  const [selectedType, setSelectedType] = useState<ChartType>('bar');
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [showCustomization, setShowCustomization] = useState(false);
  const [interfaceMode, setInterfaceMode] = useState<'simple' | 'advanced'>('simple');
  const [isExporting, setIsExporting] = useState(false);
  const [showPerformanceMetrics, setShowPerformanceMetrics] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  // Instantiate lazy chart loading manager
  const chartManager = useLazyChartManager(
    ['line', 'bar', 'scatter', 'boxplot', 'heatmap', 'pie', 'area', 'violin', 'radar', 'treemap'],
    {
      onLoad: () => {
        console.log(`Chart type ${selectedType} loaded successfully`);
      },
      onError: (error) => {
        console.error(`Failed to load chart type ${selectedType}:`, error);
      }
    }
  );

  // Performance monitoring
  const performance = useChartPerformance();

  // Analyze the data structure
  const dataSchema = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return { fields: [], rowCount: 0, sampleData: [] };
    }
    return generateDataSchema(data);
  }, [data]);

  // Get chart recommendations
  const recommendations = useMemo(() => getChartRecommendations(dataSchema), [dataSchema]);

  // Default chart styling - memoized to prevent recreating on every render
  const defaultStyling: ChartStyling = useMemo(() => ({
    colors: {
      scheme: 'category10',
    },
    layout: {
      width: 800,
      height: 400,
      margin: {
        top: 50,
        right: 50,
        bottom: 80,
        left: 80,
      },
    },
    axes: {
      x: {
        show: true,
        grid: true,
        fontSize: 12,
        color: 'var(--text-secondary)',
        scale: 'band',
        domain: 'auto',
      },
      y: {
        show: true,
        grid: true,
        fontSize: 12,
        color: 'var(--text-secondary)',
        scale: 'linear',
        domain: 'auto',
      },
    },
    legend: {
      show: true,
      position: 'right',
      direction: 'column',
      anchor: 'start',
      translateX: 0,
      translateY: 0,
      itemWidth: 100,
      itemHeight: 20,
      symbolSize: 12,
      fontSize: 12,
    },
    theme: 'light',
  }), []);

  // Current chart configuration
  const chartConfig: ChartConfig = useMemo(() => ({
    type: selectedType,
    title: `${CHART_TYPES.find(t => t.type === selectedType)?.label || ''} Analysis`,
    fieldMapping,
    styling: defaultStyling,
    animation: {
      enabled: true,
      duration: 300,
      easing: 'easeInOut',
    },
    interactions: {
      hover: { enabled: true, crosshair: true },
      click: { enabled: true },
      zoom: { enabled: false },
      brush: { enabled: false },
    },
  }), [selectedType, fieldMapping, defaultStyling]);

  // Auto-suggest field mapping when chart type changes
  React.useEffect(() => {
    const suggested = suggestFieldMapping(selectedType, dataSchema);
    setFieldMapping(suggested);
  }, [selectedType, dataSchema]);

  // Preload high priority chart types
  React.useEffect(() => {
    // Preload commonly used chart types
    chartManager.preloadCharts('low');
  }, [chartManager]);

  // Notify parent of config changes
  React.useEffect(() => {
    onConfigChange?.(chartConfig);
  }, [chartConfig, onConfigChange]);

  const handleFieldMappingChange = (field: keyof FieldMapping, value: string) => {
    setFieldMapping(prev => ({ ...prev, [field]: value || undefined }));
  };

  const handleRecommendationClick = useCallback((type: ChartType) => {
    setSelectedType(type);
    const suggested = suggestFieldMapping(type, dataSchema);
    setFieldMapping(suggested);
    setShowRecommendations(false);

    // Preload the selected chart type
    const startTime = performance.now();
    chartManager.loadChart(type);
    performance.recordLoadTime(type, startTime);
  }, [chartManager, dataSchema, performance]);

  const handleChartEvent = useCallback((event: ChartEvent) => {
    console.log('Chart event:', event.type, event.data);
  }, []);

  const handleExport = async (format: 'png' | 'svg' | 'pdf' | 'json') => {
    if (!chartRef.current) return;
    
    setIsExporting(true);
    try {
      const result = await ChartExporter.exportChart(
        chartRef.current,
        chartConfig,
        data,
        {
          format,
          quality: 'high',
          backgroundColor: '#ffffff',
          includeData: format === 'pdf',
        }
      );
      
      if (!result.success) {
        console.error('Export failed:', result.error);
      }
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const renderLazyChart = () => {
    // Get required fields based on chart type
    const requiredFields = getRequiredFields(selectedType);
    const missingFields = requiredFields.filter(field => !fieldMapping[field as keyof FieldMapping]);
    
    if (missingFields.length > 0) {
      return (
        <div className="chart-placeholder">
          <div className="chart-placeholder-content">
            <div className="chart-placeholder-icon">📊</div>
            <div className="chart-placeholder-text">
              Please select {missingFields.join(' and ')} fields to create the chart
            </div>
          </div>
        </div>
      );
    }
    
    const loadingState = chartManager.getLoadingState(selectedType);
    
    return (
      <div ref={chartRef} style={{ width: '100%', height: defaultStyling.layout.height }}>
        <LazyChart
          chartType={selectedType as any}
          data={data}
          config={chartConfig}
          onEvent={handleChartEvent}
          preload={true}
          className="chart-container"
          onLoad={() => {
            const loadTime = performance.now();
            performance.recordLoadTime(selectedType, loadTime);
          }}
        />
      </div>
    );
  };

  // Get required fields based on chart type
  const getRequiredFields = (chartType: ChartType): string[] => {
    switch (chartType) {
      case 'line':
      case 'area':
      case 'bar':
      case 'scatter':
        return ['x', 'y'];
      case 'boxplot':
      case 'violin':
        return ['x', 'y'];
      case 'heatmap':
        return ['x', 'y', 'value'];
      case 'pie':
        return ['category', 'value'];
      case 'histogram':
        return ['x'];
      case 'radar':
        return ['category', 'value'];
      case 'treemap':
        return ['size', 'category', 'group'];
      default:
        return ['x', 'y'];
    }
  };

  if (!data || !Array.isArray(data)) {
    return (
      <div className="chart-builder-empty">
        <div className="chart-builder-empty-content">
          <div className="chart-builder-empty-icon">📊</div>
          <p>No data available for chart building</p>
          <p className="chart-builder-empty-subtitle">Please upload data to create visualizations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lazy-chart-builder">
      {/* Interface Mode Toggle */}
      <div className="interface-mode-toggle">
        <div className="interface-mode-buttons">
          <button
            onClick={() => setInterfaceMode('simple')}
            className={`interface-mode-button ${interfaceMode === 'simple' ? 'active' : ''}`}
          >
            <MousePointer size={14} />
            Simple
          </button>
          <button
            onClick={() => setInterfaceMode('advanced')}
            className={`interface-mode-button ${interfaceMode === 'advanced' ? 'active' : ''}`}
          >
            <Wand2 size={14} />
            Advanced
          </button>
        </div>
      </div>
      
      {/* Main Container */}
      <div className="lazy-chart-builder-container">
        {/* Sidebar */}
        <div className="lazy-chart-builder-sidebar">
          {/* Chart Type Selector */}
          <div className="chart-type-selector">
            <h3 className="sidebar-heading">Chart Type</h3>
            <div className="chart-type-grid">
              {CHART_TYPES.map(type => (
                <div 
                  key={type.type}
                  className={`chart-type-item ${selectedType === type.type ? 'active' : ''}`}
                  onClick={() => handleRecommendationClick(type.type)}
                >
                  <div className="chart-type-icon">{type.icon}</div>
                  <div className="chart-type-label">{type.label}</div>
                  {chartManager.getLoadingState(type.type).isLoaded && (
                    <div className="chart-type-badge">Ready</div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Field Mapping */}
          <div className="field-mapping-section">
            <h3 className="sidebar-heading">Map Fields</h3>
            <FieldMapper 
              schema={dataSchema} 
              mapping={fieldMapping} 
              chartType={selectedType}
              onChange={handleFieldMappingChange}
            />
          </div>

          {/* Performance Metrics */}
          {showPerformanceMetrics && (
            <div className="performance-metrics">
              <h3 className="sidebar-heading">Performance</h3>
              <div className="metrics-grid">
                <div className="metric">
                  <div className="metric-label">Memory Usage</div>
                  <div className="metric-value">{performance.metrics.memoryUsage.toFixed(1)} MB</div>
                </div>
                <div className="metric">
                  <div className="metric-label">Loaded Charts</div>
                  <div className="metric-value">{chartManager.loadedCharts.length} / 10</div>
                </div>
                <div className="metric">
                  <div className="metric-label">Load Time</div>
                  <div className="metric-value">
                    {performance.metrics.loadTimes[selectedType] 
                      ? `${performance.metrics.loadTimes[selectedType].toFixed(0)} ms` 
                      : 'N/A'
                    }
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="action-buttons">
            <button 
              className="action-button"
              onClick={() => setShowPerformanceMetrics(!showPerformanceMetrics)}
            >
              <Activity size={16} />
              {showPerformanceMetrics ? 'Hide Metrics' : 'Show Metrics'}
            </button>
            <button 
              className="action-button"
              onClick={() => setShowCustomization(!showCustomization)}
            >
              <Settings size={16} />
              {showCustomization ? 'Hide Styling' : 'Customize'}
            </button>
            <button 
              className="action-button export-button"
              onClick={() => handleExport('png')}
              disabled={isExporting}
            >
              {isExporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
              Export
            </button>
          </div>
        </div>
        
        {/* Main Chart Area */}
        <div className="lazy-chart-builder-main">
          {/* Chart Title */}
          <h2 className="chart-title">{chartConfig.title}</h2>
          
          {/* Chart Display */}
          <div className="chart-display-area">
            {renderLazyChart()}
          </div>
          
          {/* Chart Customizer */}
          {showCustomization && (
            <div className="chart-customizer">
              <ChartCustomizer 
                config={chartConfig} 
                onChange={(updatedConfig) => onConfigChange?.(updatedConfig)} 
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Loading Status */}
      {chartManager.loadingCharts.length > 0 && (
        <div className="loading-status">
          <Loader2 className="animate-spin" size={16} />
          Loading charts... ({chartManager.loadedCharts.length}/{chartManager.loadedCharts.length + chartManager.loadingCharts.length})
        </div>
      )}
    </div>
  );
}
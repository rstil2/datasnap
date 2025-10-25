import React, { useState, useMemo, useRef, useCallback } from 'react';
import { ChartConfig, ChartType, FieldMapping, ChartStyling, ChartRecommendation } from '../../types/VisualizationTypes';
import { generateDataSchema } from '../../utils/visualization/dataAnalysis';
import { getChartRecommendations, suggestFieldMapping } from '../../services/ai/ChartRecommendations';
import { LineChart } from './charts/LineChart';
import { BoxPlot } from './charts/BoxPlot';
import { PieChart } from './charts/PieChart';
import { AreaChart } from './charts/AreaChart';
import { Histogram } from './charts/Histogram';
import { HeatmapChart } from './charts/HeatmapChart';
import { BarChart as NivoBarChart } from './charts/BarChart';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { FieldMapper } from './FieldMapper';
import { ChartCustomizer } from './ChartCustomizer';
import { ChartExporter } from '../../services/export/ChartExporter';
import { InsightGenerator, InsightGenerationResult, DataInsight } from '../../services/ai/InsightGenerator';
import { AIInsightsPanel } from './AIInsightsPanel';
import { ReportBuilder } from '../export/ReportBuilder';
import { Lightbulb, Download, Share2, Settings, Wand2, MousePointer, Brain, FileText } from 'lucide-react';

interface ChartBuilderProps {
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
];

export function ChartBuilder({ data, onConfigChange }: ChartBuilderProps) {
  // All React Hooks must be called before any conditional logic
  const [selectedType, setSelectedType] = useState<ChartType>('bar');
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [showCustomization, setShowCustomization] = useState(false);
  const [showInsights, setShowInsights] = useState(true);
  const [interfaceMode, setInterfaceMode] = useState<'simple' | 'advanced'>('simple');
  const [isExporting, setIsExporting] = useState(false);
  const [aiInsights, setAiInsights] = useState<InsightGenerationResult | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [showReportBuilder, setShowReportBuilder] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  
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
  
  // Current chart configuration - memoized to prevent infinite loops
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
  
  // Define generateAIInsights function before useEffects that use it
  const generateAIInsights = useCallback(async () => {
    if (!data || !Array.isArray(data) || data.length === 0) return;
    
    setIsGeneratingInsights(true);
    try {
      // Use generateContextualInsights which matches the available method signature
      const insights = InsightGenerator.generateContextualInsights(
        data,
        selectedType,
        fieldMapping
      );
      
      // Convert to the expected format
      const formattedInsights = {
        insights,
        executiveSummary: insights.length > 0 
          ? `Found ${insights.length} insights for ${selectedType} chart visualization.`
          : 'No specific insights available for current configuration.',
        keyTakeaways: insights.slice(0, 3).map(insight => insight.title),
        recommendations: insights.filter(i => i.actionable).flatMap(i => i.recommendations || []),
        confidence: insights.length > 0 ? insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length : 0,
        dataQualityScore: 0.8 // Default score
      };
      
      setAiInsights(formattedInsights);
    } catch (error) {
      console.error('Failed to generate insights:', error);
    } finally {
      setIsGeneratingInsights(false);
    }
  }, [data, selectedType, fieldMapping]);
  
  // Auto-suggest field mapping when chart type changes
  React.useEffect(() => {
    const suggested = suggestFieldMapping(selectedType, dataSchema);
    setFieldMapping(suggested);
  }, [selectedType, dataSchema]);
  
  // Auto-detect chart type when field mapping changes
  React.useEffect(() => {
    if (interfaceMode === 'advanced' && Object.keys(fieldMapping).length > 0) {
      const recommendations = getChartRecommendations(dataSchema);
      if (recommendations.length > 0 && recommendations[0].confidence > 0.8) {
        const bestChart = recommendations[0];
        if (bestChart.type !== selectedType) {
          // Only auto-switch if the confidence is very high
          // TODO: Implement auto-switching logic with user consent
        }
      }
    }
  }, [fieldMapping, dataSchema, interfaceMode, selectedType]);
  
  // Generate AI insights when data or chart configuration changes
  React.useEffect(() => {
    if (data.length > 0 && Object.keys(fieldMapping).length > 0) {
      generateAIInsights();
    }
  }, [data, fieldMapping, generateAIInsights]); // Include all dependencies used in the effect
  
  // Notify parent of config changes
  React.useEffect(() => {
    onConfigChange?.(chartConfig);
  }, [chartConfig, onConfigChange]);
  
  const handleInsightClick = (insight: DataInsight) => {
    // Handle insight interaction (could auto-adjust chart settings, highlight data points, etc.)

    // If the insight has a visual suggestion, apply it
    if (insight.visualSuggestion?.chartType && insight.visualSuggestion.chartType !== selectedType) {
      const newType = insight.visualSuggestion.chartType as ChartType;
      if (CHART_TYPES.some(t => t.type === newType)) {
        setSelectedType(newType);
      }
    }
  };
  
  const handleFieldMappingChange = (field: keyof FieldMapping, value: string) => {
    setFieldMapping(prev => ({ ...prev, [field]: value || undefined }));
  };
  
  const handleRecommendationClick = (rec: ChartRecommendation) => {
    setSelectedType(rec.type);
    setFieldMapping(rec.suggestedMapping);
    setShowRecommendations(false);
  };
  
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
      
      if (result.success) {
        // Export completed successfully - file downloaded automatically
      } else {
        console.error('Export failed:', result.error);
      }
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };
  
  const handleShare = async () => {
    try {
      const result = await ChartExporter.createShareableLink(chartConfig, data);
      if (result.success) {
        // Share link created successfully
      } else {
        console.error('Share failed:', result.error);
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };
  
  const renderChart = () => {
    switch (selectedType) {
      case 'line':
        if (!fieldMapping.x || !fieldMapping.y) return <div>Please select X and Y fields</div>;
        return <LineChart data={data} config={chartConfig} />;
      
      case 'area':
        if (!fieldMapping.x || !fieldMapping.y) return <div>Please select X and Y fields</div>;
        return <AreaChart data={data} config={chartConfig} />;
      
      case 'boxplot':
        if (!fieldMapping.x || !fieldMapping.y) return <div>Please select group and value fields</div>;
        return <BoxPlot data={data} config={chartConfig} />;
      
      case 'pie':
        if (!fieldMapping.category || !fieldMapping.value) return <div>Please select category and value fields</div>;
        return <PieChart data={data} config={chartConfig} />;
      
      case 'histogram':
        if (!fieldMapping.x) return <div>Please select a numeric field</div>;
        return <Histogram data={data} config={chartConfig} />;
      
      case 'heatmap':
        if (!fieldMapping.x || !fieldMapping.y || !fieldMapping.value) return <div>Please select X, Y, and value fields</div>;
        if (!data || !Array.isArray(data) || data.length === 0) return <div>No data available for heatmap</div>;
        return <HeatmapChart data={data} config={chartConfig} />;
      
      case 'bar':
        if (!fieldMapping.x || !fieldMapping.y) return <div>Please select X and Y fields</div>;
        return <NivoBarChart data={data} config={chartConfig} />;
      
      case 'scatter':
        return renderScatterChart();
      
      default:
        return <div>Chart type not implemented yet</div>;
    }
  };
  
  
  const renderScatterChart = () => {
    if (!fieldMapping.x || !fieldMapping.y) {
      return <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 'var(--space-xl)' }}>Please select X and Y fields</div>;
    }
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      return <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 'var(--space-xl)' }}>No data available</div>;
    }
    
    const chartData = data.map(row => {
      const x = parseFloat(String(row[fieldMapping.x!]));
      const y = parseFloat(String(row[fieldMapping.y!]));
      return isNaN(x) || isNaN(y) ? null : { x, y };
    }).filter(Boolean).slice(0, 1000);
    
    return (
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" />
          <XAxis 
            type="number" 
            dataKey="x" 
            stroke="var(--text-secondary)" 
          />
          <YAxis 
            type="number" 
            dataKey="y" 
            stroke="var(--text-secondary)" 
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)'
            }}
          />
          <Scatter dataKey="y" fill="var(--accent-primary)" fillOpacity={0.6} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  };
  
  // Early safety check for data - handle in JSX instead of early return
  if (!data || !Array.isArray(data)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)', opacity: 0.5 }}>📊</div>
          <p>No data available for chart building</p>
          <p style={{ fontSize: '0.875rem', marginTop: 'var(--space-sm)' }}>Please upload data to create visualizations</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="chart-builder" style={{ display: 'flex', gap: 'var(--space-lg)', height: '100%' }}>
      {/* Interface Mode Toggle */}
      <div style={{ position: 'absolute', top: 'var(--space-md)', right: 'var(--space-md)', zIndex: 10 }}>
        <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '2px', border: '1px solid var(--border-primary)' }}>
          <button
            onClick={() => setInterfaceMode('simple')}
            style={{
              padding: 'var(--space-sm) var(--space-md)',
              background: interfaceMode === 'simple' ? 'var(--accent-primary)' : 'transparent',
              color: interfaceMode === 'simple' ? 'white' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-xs)',
            }}
          >
            <MousePointer size={14} />
            Simple
          </button>
          <button
            onClick={() => setInterfaceMode('advanced')}
            style={{
              padding: 'var(--space-sm) var(--space-md)',
              background: interfaceMode === 'advanced' ? 'var(--accent-primary)' : 'transparent',
              color: interfaceMode === 'advanced' ? 'white' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-xs)',
            }}
          >
            <Wand2 size={14} />
            Advanced
          </button>
        </div>
      </div>

      {/* Render different interfaces based on mode */}
      {interfaceMode === 'simple' ? (
        // Simple Interface (existing)
        <>
          {/* Left Panel - Configuration */}
          <div style={{ 
            width: '320px', 
            flexShrink: 0, 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 'var(--space-lg)' 
          }}>
        
        {/* Chart Type Selection */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ fontSize: '1rem' }}>Chart Type</h3>
          </div>
          <div className="card-content">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-sm)' }}>
              {CHART_TYPES.slice(0, 8).map(chartType => (
                <button
                  key={chartType.type}
                  onClick={() => setSelectedType(chartType.type)}
                  style={{
                    padding: 'var(--space-sm)',
                    background: selectedType === chartType.type ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                    color: selectedType === chartType.type ? 'white' : 'var(--text-primary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: '2px' }}>{chartType.icon}</div>
                  <div style={{ fontWeight: '600' }}>{chartType.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* AI Recommendations */}
        {showRecommendations && recommendations.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                <Lightbulb size={16} color="var(--warning)" />
                <h3 className="card-title" style={{ fontSize: '1rem' }}>AI Suggestions</h3>
              </div>
              <button 
                onClick={() => setShowRecommendations(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                ×
              </button>
            </div>
            <div className="card-content">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {recommendations.slice(0, 3).map((rec, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecommendationClick(rec)}
                    style={{
                      padding: 'var(--space-sm)',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
                      <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                        {CHART_TYPES.find(t => t.type === rec.type)?.label}
                      </span>
                      <span style={{ 
                        background: rec.confidence > 0.8 ? 'var(--success)' : rec.confidence > 0.6 ? 'var(--warning)' : 'var(--text-tertiary)',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontSize: '0.7rem'
                      }}>
                        {Math.round(rec.confidence * 100)}%
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {rec.reasoning}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* AI Insights Panel */}
        {showInsights && data.length > 0 && (
          <AIInsightsPanel
            insights={aiInsights || { insights: [], confidence: 0, executiveSummary: '' }}
            isLoading={isGeneratingInsights}
            onInsightClick={handleInsightClick}
            compact={true}
          />
        )}
        
        {/* Field Mapping */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ fontSize: '1rem' }}>Data Fields</h3>
          </div>
          <div className="card-content">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              
              {/* X Axis */}
              {!['pie'].includes(selectedType) && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: 'var(--space-xs)', color: 'var(--text-primary)' }}>
                    {selectedType === 'boxplot' ? 'Group Field:' : 
                     selectedType === 'histogram' ? 'Numeric Field:' : 
                     selectedType === 'heatmap' ? 'X Axis (Columns):' :
                     'X Axis:'}
                  </label>
                <select 
                  value={fieldMapping.x || ''}
                  onChange={(e) => handleFieldMappingChange('x', e.target.value)}
                  style={{
                    width: '100%',
                    padding: 'var(--space-sm)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="">Select field...</option>
                  {dataSchema.fields.map(field => (
                    <option key={field.name} value={field.name}>
                      {field.name} ({field.type})
                    </option>
                  ))}
                </select>
                </div>
              )}
              
              {/* Y Axis */}
              {!['pie', 'histogram'].includes(selectedType) && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: 'var(--space-xs)', color: 'var(--text-primary)' }}>
                    {selectedType === 'boxplot' ? 'Value Field:' : 
                     selectedType === 'heatmap' ? 'Y Axis (Rows):' :
                     'Y Axis:'}
                  </label>
                  <select 
                    value={fieldMapping.y || ''}
                    onChange={(e) => handleFieldMappingChange('y', e.target.value)}
                    style={{
                      width: '100%',
                      padding: 'var(--space-sm)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="">Select field...</option>
                    {dataSchema.fields.filter(f => f.type === 'numeric').map(field => (
                      <option key={field.name} value={field.name}>
                        {field.name} ({field.type})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Category Field for Pie Charts */}
              {selectedType === 'pie' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: 'var(--space-xs)', color: 'var(--text-primary)' }}>
                    Category Field:
                  </label>
                  <select 
                    value={fieldMapping.category || ''}
                    onChange={(e) => handleFieldMappingChange('category', e.target.value)}
                    style={{
                      width: '100%',
                      padding: 'var(--space-sm)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="">Select field...</option>
                    {dataSchema.fields.filter(f => f.type === 'categorical' || f.type === 'text').map(field => (
                      <option key={field.name} value={field.name}>
                        {field.name} ({field.type})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Value Field for Pie Charts and Heatmaps */}
              {(['pie', 'heatmap'].includes(selectedType)) && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: 'var(--space-xs)', color: 'var(--text-primary)' }}>
                    Value Field:
                  </label>
                  <select 
                    value={fieldMapping.value || ''}
                    onChange={(e) => handleFieldMappingChange('value', e.target.value)}
                    style={{
                      width: '100%',
                      padding: 'var(--space-sm)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="">Select field...</option>
                    {dataSchema.fields.filter(f => f.type === 'numeric').map(field => (
                      <option key={field.name} value={field.name}>
                        {field.name} ({field.type})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Color Field */}
              {(['line', 'bar', 'scatter', 'area'].includes(selectedType)) && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: 'var(--space-xs)', color: 'var(--text-primary)' }}>
                    Color by (optional):
                  </label>
                  <select 
                    value={fieldMapping.color || ''}
                    onChange={(e) => handleFieldMappingChange('color', e.target.value)}
                    style={{
                      width: '100%',
                      padding: 'var(--space-sm)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="">None</option>
                    {dataSchema.fields.filter(f => f.type === 'categorical').map(field => (
                      <option key={field.name} value={field.name}>
                        {field.name} ({field.type})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button 
            onClick={() => setShowInsights(!showInsights)}
            style={{
              flex: 1,
              padding: 'var(--space-sm)',
              background: showInsights ? 'var(--accent-primary)' : 'var(--bg-secondary)',
              color: showInsights ? 'white' : 'var(--text-primary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-xs)',
              fontSize: '0.875rem'
            }}
          >
            <Brain size={14} />
            Insights
          </button>
          
          <button 
            onClick={() => setShowCustomization(!showCustomization)}
            style={{
              flex: 1,
              padding: 'var(--space-sm)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-xs)',
              fontSize: '0.875rem'
            }}
          >
            <Settings size={14} />
            Style
          </button>
          
          <button 
            onClick={() => setShowReportBuilder(true)}
            style={{
              flex: 1,
              padding: 'var(--space-sm)',
              background: 'var(--success)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-xs)',
              fontSize: '0.875rem'
            }}
          >
            <FileText size={14} />
            Report
          </button>
          
          <div style={{ position: 'relative', flex: 1 }}>
            <button 
              onClick={() => handleExport('png')}
              disabled={isExporting}
              style={{
                width: '100%',
                padding: 'var(--space-sm)',
                background: 'var(--accent-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: isExporting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-xs)',
                fontSize: '0.875rem',
                opacity: isExporting ? 0.6 : 1
              }}
            >
              <Download size={14} />
              {isExporting ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>
        
      </div>
      
      {/* Right Panel - Chart Preview */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        <div className="card" style={{ flex: 1 }}>
          <div className="card-header">
            <h3 className="card-title">{chartConfig.title}</h3>
            <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
              <button 
                onClick={() => handleShare()}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 'var(--space-xs)' }}
                title="Share chart"
              >
                <Share2 size={16} color="var(--text-secondary)" />
              </button>
              
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={() => handleExport('pdf')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 'var(--space-xs)' }}
                  title="Export as PDF"
                >
                  <Download size={16} color="var(--text-secondary)" />
                </button>
              </div>
            </div>
          </div>
          <div 
            ref={chartRef}
            className="card-content" 
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {data.length > 0 ? (
              renderChart()
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)', opacity: 0.5 }}>📊</div>
                <p>No data available for visualization</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Customization Panel */}
        {showCustomization && (
          <ChartCustomizer 
            config={chartConfig}
            onConfigChange={(config) => {
              setSelectedType(config.type);
              setFieldMapping(config.fieldMapping);
              onConfigChange?.(config);
            }}
          />
        )}
      </div>
      </>
      ) : (
        // Advanced Interface (drag-and-drop)
        <>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            {/* Advanced Chart Builder Header */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Professional Chart Builder</h3>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  <button 
                    onClick={() => handleExport('png')}
                    disabled={isExporting}
                    style={{
                      padding: 'var(--space-sm) var(--space-md)',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: isExporting ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                      opacity: isExporting ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-xs)'
                    }}
                  >
                    <Download size={14} />
                    PNG
                  </button>
                  
                  <button 
                    onClick={() => handleExport('pdf')}
                    disabled={isExporting}
                    style={{
                      padding: 'var(--space-sm) var(--space-md)',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: isExporting ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                      opacity: isExporting ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-xs)'
                    }}
                  >
                    <Download size={14} />
                    PDF
                  </button>
                  
                  <button 
                    onClick={() => setShowReportBuilder(true)}
                    style={{
                      padding: 'var(--space-sm) var(--space-md)',
                      background: 'var(--success)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-xs)'
                    }}
                  >
                    <FileText size={14} />
                    Professional Report
                  </button>
                  
                  <button 
                    onClick={() => handleShare()}
                    style={{
                      padding: 'var(--space-sm) var(--space-md)',
                      background: 'var(--accent-primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-xs)'
                    }}
                  >
                    <Share2 size={14} />
                    Share
                  </button>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 'var(--space-lg)' }}>
              {/* Left: Field Mapper */}
              <div style={{ width: '60%' }}>
                <FieldMapper 
                  fields={dataSchema.fields}
                  fieldMapping={fieldMapping}
                  chartType={selectedType}
                  onFieldMappingChange={setFieldMapping}
                />
              </div>
              
              {/* Right: Chart Preview + Customizer */}
              <div style={{ width: '40%', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                {/* Chart Type Selector */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title" style={{ fontSize: '1rem' }}>Chart Type</h3>
                  </div>
                  <div className="card-content">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-sm)' }}>
                      {CHART_TYPES.slice(0, 8).map(chartType => (
                        <button
                          key={chartType.type}
                          onClick={() => setSelectedType(chartType.type)}
                          style={{
                            padding: 'var(--space-sm)',
                            background: selectedType === chartType.type ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                            color: selectedType === chartType.type ? 'white' : 'var(--text-primary)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            textAlign: 'center',
                            fontSize: '0.75rem',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ fontSize: '1.5rem', marginBottom: '2px' }}>{chartType.icon}</div>
                          <div style={{ fontWeight: '600' }}>{chartType.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Chart Preview */}
                <div className="card" style={{ flex: 1 }}>
                  <div className="card-header">
                    <h3 className="card-title" style={{ fontSize: '1rem' }}>{chartConfig.title}</h3>
                  </div>
                  <div 
                    ref={chartRef}
                    className="card-content" 
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}
                  >
                    {data.length > 0 ? (
                      renderChart()
                    ) : (
                      <div style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)', opacity: 0.5 }}>📊</div>
                        <p>No data available for visualization</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Chart Customizer */}
                <ChartCustomizer 
                  config={chartConfig}
                  onConfigChange={(config) => {
                    setSelectedType(config.type);
                    setFieldMapping(config.fieldMapping);
                    onConfigChange?.(config);
                  }}
                />
                
                {/* AI Insights Panel */}
                {showInsights && data.length > 0 && (
                  <AIInsightsPanel
                    insights={aiInsights || { insights: [], confidence: 0, executiveSummary: '' }}
                    isLoading={isGeneratingInsights}
                    onInsightClick={handleInsightClick}
                    compact={false}
                  />
                )}
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Professional Report Builder Modal */}
      {showReportBuilder && (
        <ReportBuilder
          chartElement={chartRef.current}
          config={chartConfig}
          data={data}
          insights={aiInsights}
          onClose={() => setShowReportBuilder(false)}
        />
      )}
    </div>
  );
}

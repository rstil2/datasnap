import React from 'react';
import { ChartConfig, ChartEvent } from '../../../types/VisualizationTypes';

interface HeatmapChartProps {
  data: any[];
  config: ChartConfig;
  onEvent?: (event: ChartEvent) => void;
}

export function HeatmapChart({ data, config, onEvent }: HeatmapChartProps) {
  // Safety checks
  if (!config || !config.fieldMapping || !config.styling) {
    return <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>Chart configuration error</div>;
  }
  
  if (!data || !Array.isArray(data) || data.length === 0) {
    return <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>No data available for heatmap</div>;
  }
  
  // Transform data for custom heatmap
  const heatmapData = React.useMemo(() => {
    if (!config.fieldMapping.x || !config.fieldMapping.y || !config.fieldMapping.value) {
      return { cells: [], xLabels: [], yLabels: [], minValue: 0, maxValue: 1 };
    }

    const xField = config.fieldMapping.x;
    const yField = config.fieldMapping.y;
    const valueField = config.fieldMapping.value;
    
    // Group data
    const dataMap = new Map<string, Map<string, number[]>>();
    
    data.forEach(row => {
      const xValue = String(row[xField] || 'Unknown');
      const yValue = String(row[yField] || 'Unknown');
      const value = parseFloat(String(row[valueField]));
      
      if (!isNaN(value) && isFinite(value)) {
        if (!dataMap.has(yValue)) {
          dataMap.set(yValue, new Map());
        }
        if (!dataMap.get(yValue)!.has(xValue)) {
          dataMap.get(yValue)!.set(xValue, []);
        }
        dataMap.get(yValue)!.get(xValue)!.push(value);
      }
    });
    
    // Get unique labels
    const xLabels = Array.from(new Set(data.map(row => String(row[xField] || 'Unknown')))).sort();
    const yLabels = Array.from(new Set(data.map(row => String(row[yField] || 'Unknown')))).sort();
    
    // Create cells with aggregated values
    const cells: Array<{ x: number; y: number; value: number; xLabel: string; yLabel: string }> = [];
    let minValue = Infinity;
    let maxValue = -Infinity;
    
    yLabels.forEach((yLabel, yIndex) => {
      xLabels.forEach((xLabel, xIndex) => {
        const values = dataMap.get(yLabel)?.get(xLabel) || [];
        const avgValue = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
        
        cells.push({
          x: xIndex,
          y: yIndex,
          value: avgValue,
          xLabel,
          yLabel
        });
        
        if (avgValue > 0) {
          minValue = Math.min(minValue, avgValue);
          maxValue = Math.max(maxValue, avgValue);
        }
      });
    });
    
    return {
      cells,
      xLabels,
      yLabels,
      minValue: minValue === Infinity ? 0 : minValue,
      maxValue: maxValue === -Infinity ? 1 : maxValue
    };
  }, [data, config.fieldMapping]);
  
  // Color function
  const getColor = (value: number) => {
    const { minValue, maxValue } = heatmapData;
    const range = maxValue - minValue;
    if (range === 0 || value === 0) return '#f8f9fa';
    
    const intensity = Math.max(0, Math.min(1, (value - minValue) / range));
    
    // Blue color scheme
    const hue = 210; // Blue hue
    const saturation = 70 + (intensity * 30); // 70-100%
    const lightness = 95 - (intensity * 45); // 95% to 50%
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };
  
  if (heatmapData.cells.length === 0) {
    return (
      <div style={{ 
        width: '100%', 
        height: config.styling?.layout?.height || 400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        border: '1px solid #e2e8f0',
        borderRadius: '8px'
      }}>
        <div style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
          <div>No data available for heatmap</div>
          <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>
            Please check your data and field mappings
          </div>
        </div>
      </div>
    );
  }

  const cellSize = Math.max(40, Math.min(80, 400 / Math.max(heatmapData.xLabels.length, heatmapData.yLabels.length)));
  const labelHeight = 60;
  const labelWidth = 100;

  return (
    <div style={{ 
      width: '100%', 
      height: config.styling?.layout?.height || 400,
      padding: '20px',
      background: 'transparent',
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      {/* Title */}
      {config.title && (
        <h3 style={{ 
          margin: '0 0 20px 0', 
          textAlign: 'center',
          color: 'var(--text-primary, #333)',
          fontSize: '18px',
          fontWeight: '600'
        }}>
          {config.title}
        </h3>
      )}
      
      <div style={{ 
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px'
      }}>
        {/* Y-axis label */}
        <div style={{ 
          writingMode: 'vertical-lr',
          textAlign: 'center',
          fontSize: '14px',
          color: 'var(--text-secondary, #666)',
          fontWeight: 'bold',
          width: '20px',
          height: (heatmapData.yLabels.length * cellSize) + labelHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {config.fieldMapping.y}
        </div>
        
        <div>
          {/* Heatmap grid container */}
          <div style={{
            display: 'inline-block',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: 'white'
          }}>
            {/* X-axis labels */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: `${labelWidth}px repeat(${heatmapData.xLabels.length}, ${cellSize}px)`,
              backgroundColor: '#f8f9fa',
              borderBottom: '1px solid #e2e8f0'
            }}>
              {/* Empty corner cell */}
              <div style={{ 
                width: `${labelWidth}px`, 
                height: `${labelHeight}px`,
                borderRight: '1px solid #e2e8f0'
              }} />
              
              {/* X-axis labels */}
              {heatmapData.xLabels.map((label, index) => (
                <div key={`x-${label}-${index}`} style={{
                  padding: '8px 4px',
                  textAlign: 'center',
                  color: 'var(--text-secondary, #666)',
                  fontSize: '11px',
                  fontWeight: '600',
                  height: `${labelHeight}px`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  wordBreak: 'break-word',
                  borderRight: index < heatmapData.xLabels.length - 1 ? '1px solid #e2e8f0' : 'none'
                }}>
                  <span style={{ transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>
                    {label.length > 8 ? label.substring(0, 8) + '...' : label}
                  </span>
                </div>
              ))}
            </div>
            
            {/* Data rows */}
            {heatmapData.yLabels.map((yLabel, yIndex) => (
              <div key={`row-${yLabel}-${yIndex}`} style={{
                display: 'grid',
                gridTemplateColumns: `${labelWidth}px repeat(${heatmapData.xLabels.length}, ${cellSize}px)`,
                borderBottom: yIndex < heatmapData.yLabels.length - 1 ? '1px solid #e2e8f0' : 'none'
              }}>
                {/* Y-axis label */}
                <div style={{
                  padding: '8px',
                  textAlign: 'right',
                  color: 'var(--text-secondary, #666)',
                  fontSize: '11px',
                  fontWeight: '600',
                  height: `${cellSize}px`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  wordBreak: 'break-word',
                  backgroundColor: '#f8f9fa',
                  borderRight: '1px solid #e2e8f0'
                }}>
                  {yLabel.length > 12 ? yLabel.substring(0, 12) + '...' : yLabel}
                </div>
                
                {/* Data cells */}
                {heatmapData.xLabels.map((xLabel, xIndex) => {
                  const cell = heatmapData.cells.find(c => c.xLabel === xLabel && c.yLabel === yLabel);
                  const value = cell?.value || 0;
                  const displayValue = value > 0 ? (value < 1 ? value.toFixed(2) : value.toFixed(1)) : '';
                  
                  return (
                    <div
                      key={`${xLabel}-${yLabel}-${xIndex}-${yIndex}`}
                      style={{
                        width: `${cellSize}px`,
                        height: `${cellSize}px`,
                        backgroundColor: getColor(value),
                        borderRight: xIndex < heatmapData.xLabels.length - 1 ? '1px solid #e2e8f0' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        color: value > (heatmapData.maxValue * 0.6) ? 'white' : '#333',
                        transition: 'all 0.2s ease',
                        position: 'relative'
                      }}
                      onClick={(event) => {
                        if (onEvent) {
                          onEvent({
                            type: 'click',
                            data: { xLabel, yLabel, value, displayValue },
                            event,
                            chart: config
                          });
                        }
                      }}
                      onMouseEnter={(event) => {
                        if (onEvent && config.interactions?.hover?.enabled !== false) {
                          onEvent({
                            type: 'hover',
                            data: { xLabel, yLabel, value, displayValue },
                            event,
                            chart: config
                          });
                        }
                      }}
                      title={`${yLabel} × ${xLabel}: ${value.toFixed(3)}`}
                    >
                      {displayValue}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          
          {/* X-axis label */}
          <div style={{ 
            textAlign: 'center',
            fontSize: '14px',
            color: 'var(--text-secondary, #666)',
            fontWeight: 'bold',
            marginTop: '15px',
            marginLeft: `${labelWidth}px`
          }}>
            {config.fieldMapping.x}
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        fontSize: '12px',
        color: 'var(--text-secondary, #666)',
        marginTop: '20px',
        padding: '10px 15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '6px',
        border: '1px solid #e2e8f0'
      }}>
        <span style={{ fontWeight: '600' }}>Value Range:</span>
        <span>Min: {heatmapData.minValue.toFixed(2)}</span>
        <div style={{
          display: 'flex',
          height: '16px',
          width: '120px',
          background: `linear-gradient(to right, #f8f9fa, hsl(210, 100%, 50%))`,
          borderRadius: '3px',
          border: '1px solid #e2e8f0'
        }} />
        <span>Max: {heatmapData.maxValue.toFixed(2)}</span>
      </div>
    </div>
  );
}
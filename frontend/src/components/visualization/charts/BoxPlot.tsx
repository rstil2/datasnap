import React from 'react';
import { ResponsiveBoxPlot } from '@nivo/boxplot';
import { ChartConfig, ChartEvent } from '../../../types/VisualizationTypes';
import * as ss from 'simple-statistics';

interface BoxPlotProps {
  data: any[];
  config: ChartConfig;
  onEvent?: (event: ChartEvent) => void;
}

export function BoxPlot({ data, config, onEvent }: BoxPlotProps) {
  // Transform data for Nivo box plot format
  const transformedData = React.useMemo(() => {
    if (!config.fieldMapping.x || !config.fieldMapping.y) return [];
    
    const xField = config.fieldMapping.x; // Group field
    const yField = config.fieldMapping.y; // Numeric field
    
    // Group data by x field
    const groups = new Map<string, number[]>();
    
    data.forEach(row => {
      const groupKey = String(row[xField] || 'Unknown');
      const value = parseFloat(String(row[yField]));
      
      if (!isNaN(value) && isFinite(value)) {
        if (!groups.has(groupKey)) {
          groups.set(groupKey, []);
        }
        groups.get(groupKey)!.push(value);
      }
    });
    
    // Calculate basic box plot statistics for each group
    return Array.from(groups.entries()).map(([group, values]) => {
      if (values.length === 0) return null;
      
      const sorted = [...values].sort((a, b) => a - b);
      const n = sorted.length;
      
      // Calculate basic statistics
      const mean = ss.mean(values);
      const stdDev = ss.standardDeviation(values);
      
      return {
        group,
        mu: mean,
        sd: stdDev,
        n: n
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);
  }, [data, config.fieldMapping]);
  
  
  const colors = config.styling.colors.scheme === 'custom' 
    ? config.styling.colors.customColors || ['#3182ce']
    : config.styling.colors.scheme === 'viridis' || config.styling.colors.scheme === 'plasma' || config.styling.colors.scheme === 'inferno' || config.styling.colors.scheme === 'magma' || config.styling.colors.scheme === 'cividis' 
      ? ['#3182ce'] // Use fallback for unsupported schemes
      : { scheme: config.styling.colors.scheme as any };
  
  return (
    <div style={{ 
      width: '100%', 
      height: config.styling.layout.height,
      background: 'transparent'
    }}>
      <ResponsiveBoxPlot
        data={transformedData}
        colors={colors}
        margin={config.styling.layout.margin}
        minValue={config.styling.axes.y.domain === 'auto' ? 'auto' : config.styling.axes.y.domain?.[0]}
        maxValue={config.styling.axes.y.domain === 'auto' ? 'auto' : config.styling.axes.y.domain?.[1]}
        subGroupBy="group"
        padding={0.12}
        enableGridX={config.styling.axes.x.grid}
        enableGridY={config.styling.axes.y.grid}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: config.styling.axes.x.labelAngle || 0,
          legend: config.styling.axes.x.label || config.fieldMapping.x,
          legendPosition: 'middle',
          legendOffset: 32,
          renderTick: config.styling.axes.x.show ? undefined : () => null,
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: config.styling.axes.y.label || config.fieldMapping.y,
          legendPosition: 'middle',
          legendOffset: -40,
          format: config.styling.axes.y.tickFormat || '.2f',
          renderTick: config.styling.axes.y.show ? undefined : () => null,
        }}
        animate={config.animation?.enabled !== false}
        motionConfig={config.animation?.easing || 'easeInOut'}
        onClick={(box, event) => {
          if (onEvent) {
            onEvent({
              type: 'click',
              data: box,
              event,
              chart: config
            });
          }
        }}
        onMouseEnter={(box, event) => {
          if (onEvent && config.interactions?.hover.enabled !== false) {
            onEvent({
              type: 'hover',
              data: box,
              event,
              chart: config
            });
          }
        }}
        tooltip={(props) => {
          return (
            <div
              style={{
                background: config.styling.theme === 'dark' ? '#2d3748' : 'white',
                color: config.styling.theme === 'dark' ? 'white' : '#2d3748',
                padding: '12px',
                border: `1px solid ${config.styling.theme === 'dark' ? '#4a5568' : '#e2e8f0'}`,
                borderRadius: '4px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                fontSize: '12px',
                minWidth: '200px'
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                Box Plot Data
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px' }}>
                <div><strong>Values:</strong></div>
                <div>{JSON.stringify(props)}</div>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}

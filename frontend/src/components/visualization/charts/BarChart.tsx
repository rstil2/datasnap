import React from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { ChartConfig, ChartEvent } from '../../../types/VisualizationTypes';

interface BarChartProps {
  data: any[];
  config: ChartConfig;
  onEvent?: (event: ChartEvent) => void;
}

export function BarChart({ data, config, onEvent }: BarChartProps) {
  // Transform data for Nivo bar chart format
  const transformedData = React.useMemo(() => {
    if (!config.fieldMapping.x || !config.fieldMapping.y) return [];
    
    const xField = config.fieldMapping.x;
    const yField = config.fieldMapping.y;
    const colorField = config.fieldMapping.color;
    
    if (colorField) {
      // Group data by x-axis and color field
      const grouped = new Map<string, Record<string, number>>();
      
      data.forEach(row => {
        const xValue = String(row[xField] || 'Unknown');
        const yValue = parseFloat(String(row[yField])) || 0;
        const colorValue = String(row[colorField] || 'Default');
        
        if (!grouped.has(xValue)) {
          grouped.set(xValue, { [xField]: xValue });
        }
        
        const existing = grouped.get(xValue)!;
        existing[colorValue] = (existing[colorValue] || 0) + yValue;
      });
      
      return Array.from(grouped.values());
    } else {
      // Simple aggregation by x-axis
      const aggregated = new Map<string, number>();
      
      data.forEach(row => {
        const xValue = String(row[xField] || 'Unknown');
        const yValue = parseFloat(String(row[yField])) || 0;
        
        aggregated.set(xValue, (aggregated.get(xValue) || 0) + yValue);
      });
      
      return Array.from(aggregated.entries()).map(([key, value]) => ({
        [xField]: key,
        [yField]: value
      }));
    }
  }, [data, config.fieldMapping]);

  const keys = React.useMemo(() => {
    if (!config.fieldMapping.color) {
      return [config.fieldMapping.y!];
    }
    
    const colorValues = new Set<string>();
    data.forEach(row => {
      const colorValue = String(row[config.fieldMapping.color!] || 'Default');
      colorValues.add(colorValue);
    });
    
    return Array.from(colorValues);
  }, [data, config.fieldMapping]);

  const theme = {
    background: 'transparent',
    text: {
      fontSize: config.styling?.axes?.x?.fontSize || 12,
      fill: config.styling?.axes?.x?.color || '#666',
    },
    axis: {
      domain: {
        line: {
          stroke: config.styling?.axes?.x?.color || '#666',
          strokeWidth: 1,
        },
      },
      legend: {
        text: {
          fontSize: (config.styling?.axes?.x?.fontSize || 12) + 2,
          fill: config.styling?.axes?.x?.color || '#666',
          fontWeight: 600,
        },
      },
      ticks: {
        line: {
          stroke: config.styling?.axes?.x?.color || '#666',
          strokeWidth: 1,
        },
        text: {
          fontSize: config.styling?.axes?.x?.fontSize || 12,
          fill: config.styling?.axes?.x?.color || '#666',
        },
      },
    },
    grid: {
      line: {
        stroke: (config.styling?.theme || 'light') === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        strokeWidth: 1,
      },
    },
  };

  const colors = config.styling?.colors?.scheme === 'custom' 
    ? config.styling?.colors?.customColors || ['#3182ce', '#38a169', '#d69e2e', '#e53e3e', '#805ad5']
    : { scheme: (config.styling?.colors?.scheme || 'category10') as any };

  return (
    <div 
      data-testid="bar-chart"
      style={{ 
        width: '100%', 
        height: config.styling?.layout?.height || 400,
        background: 'transparent'
      }}
    >
      <ResponsiveBar
        data={transformedData}
        keys={keys}
        indexBy={config.fieldMapping.x!}
        theme={theme}
        colors={colors}
        margin={config.styling?.layout?.margin || { top: 50, right: 50, bottom: 80, left: 80 }}
        padding={0.3}
        valueScale={{ type: 'linear' }}
        indexScale={{ type: 'band', round: true }}
        borderColor={{
          from: 'color',
          modifiers: [['darker', 1.6]]
        }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: config.styling?.axes?.x?.labelAngle || 0,
          legend: config.styling?.axes?.x?.label || config.fieldMapping.x,
          legendPosition: 'middle',
          legendOffset: 32,
          renderTick: (config.styling?.axes?.x?.show !== false) ? undefined : () => null,
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: config.styling?.axes?.y?.label || config.fieldMapping.y,
          legendPosition: 'middle',
          legendOffset: -40,
          format: config.styling?.axes?.y?.tickFormat || '.2f',
          renderTick: (config.styling?.axes?.y?.show !== false) ? undefined : () => null,
        }}
        enableGridY={config.styling?.axes?.y?.grid !== false}
        enableGridX={config.styling?.axes?.x?.grid !== false}
        labelSkipWidth={12}
        labelSkipHeight={12}
        labelTextColor={{
          from: 'color',
          modifiers: [['darker', 1.6]]
        }}
        legends={(config.styling?.legend?.show !== false) && keys.length > 1 ? [
          {
            dataFrom: 'keys',
            anchor: (config.styling?.legend?.position || 'right') === 'top' ? 'top-right' :
                    (config.styling?.legend?.position || 'right') === 'bottom' ? 'bottom-right' :
                    (config.styling?.legend?.position || 'right') === 'left' ? 'top-left' :
                    'bottom-right',
            direction: config.styling?.legend?.direction || 'column',
            justify: false,
            translateX: config.styling?.legend?.translateX || 120,
            translateY: config.styling?.legend?.translateY || 0,
            itemsSpacing: 2,
            itemWidth: config.styling?.legend?.itemWidth || 100,
            itemHeight: config.styling?.legend?.itemHeight || 20,
            itemDirection: 'left-to-right',
            itemOpacity: 0.85,
            symbolSize: config.styling?.legend?.symbolSize || 20,
          }
        ] : []}
        animate={config.animation?.enabled !== false}
        motionConfig={config.animation?.easing || 'easeInOut'}
        onClick={(node, event) => {
          if (onEvent) {
            onEvent({
              type: 'click',
              data: node,
              event,
              chart: config
            });
          }
        }}
        onMouseEnter={(node, event) => {
          if (onEvent && config.interactions?.hover?.enabled !== false) {
            onEvent({
              type: 'hover',
              data: node,
              event,
              chart: config
            });
          }
        }}
        tooltip={({ id, value, color, indexValue }) => (
          <div
            style={{
              background: (config.styling?.theme || 'light') === 'dark' ? '#2d3748' : 'white',
              color: (config.styling?.theme || 'light') === 'dark' ? 'white' : '#2d3748',
              padding: '9px 12px',
              border: `1px solid ${(config.styling?.theme || 'light') === 'dark' ? '#4a5568' : '#e2e8f0'}`,
              borderRadius: '4px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              fontSize: '12px',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              {indexValue}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div 
                style={{ 
                  width: '12px', 
                  height: '12px', 
                  backgroundColor: color, 
                  borderRadius: '2px' 
                }} 
              />
              <span><strong>{id}:</strong> {typeof value === 'number' ? value.toFixed(2) : value}</span>
            </div>
          </div>
        )}
      />
    </div>
  );
}
import React from 'react';
import { ResponsiveLine } from '@nivo/line';
import { ChartConfig, ChartEvent } from '../../../types/VisualizationTypes';

interface LineChartProps {
  data: any[];
  config: ChartConfig;
  onEvent?: (event: ChartEvent) => void;
}

export function LineChart({ data, config, onEvent }: LineChartProps) {
  // Transform data for Nivo format
  const transformedData = React.useMemo(() => {
    if (!config.fieldMapping.x || !config.fieldMapping.y) return [];
    
    const xField = config.fieldMapping.x;
    const yField = config.fieldMapping.y;
    const colorField = config.fieldMapping.color;
    
    if (colorField) {
      // Group data by color field
      const groups = new Map<string, any[]>();
      
      data.forEach(row => {
        const groupKey = String(row[colorField] || 'Unknown');
        if (!groups.has(groupKey)) {
          groups.set(groupKey, []);
        }
        
        const xValue = row[xField];
        const yValue = parseFloat(String(row[yField]));
        
        if (!isNaN(yValue) && xValue !== null && xValue !== undefined) {
          groups.get(groupKey)!.push({
            x: xValue instanceof Date ? xValue : new Date(xValue),
            y: yValue
          });
        }
      });
      
      return Array.from(groups.entries()).map(([id, data]) => ({
        id,
        data: data.sort((a, b) => a.x.getTime() - b.x.getTime())
      }));
    } else {
      // Single series
      const points = data
        .map(row => {
          const xValue = row[xField];
          const yValue = parseFloat(String(row[yField]));
          
          if (!isNaN(yValue) && xValue !== null && xValue !== undefined) {
            return {
              x: xValue instanceof Date ? xValue : new Date(xValue),
              y: yValue
            };
          }
          return null;
        })
        .filter((point): point is NonNullable<typeof point> => point !== null)
        .sort((a, b) => a.x.getTime() - b.x.getTime());
      
      return [{
        id: config.fieldMapping.y,
        data: points
      }];
    }
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
    crosshair: {
      line: {
        stroke: config.styling?.colors?.scheme === 'custom' ? config.styling?.colors?.customColors?.[0] || '#3182ce' : '#3182ce',
        strokeWidth: 1,
        strokeOpacity: 0.75,
      },
    },
  };
  
  const colors = config.styling?.colors?.scheme === 'custom' 
    ? config.styling?.colors?.customColors || ['#3182ce', '#38a169', '#d69e2e', '#e53e3e', '#805ad5']
    : (config.styling?.colors?.scheme === 'viridis' || config.styling?.colors?.scheme === 'plasma' || config.styling?.colors?.scheme === 'inferno' || config.styling?.colors?.scheme === 'magma' || config.styling?.colors?.scheme === 'cividis') 
      ? ['#3182ce', '#38a169', '#d69e2e', '#e53e3e', '#805ad5'] // Use fallback for unsupported schemes
      : { scheme: (config.styling?.colors?.scheme || 'category10') as any };
  
  return (
    <div 
      data-testid="line-chart"
      style={{ 
        width: '100%', 
        height: config.styling?.layout?.height || 400,
        background: 'transparent'
      }}
    >
      <ResponsiveLine
        data={transformedData}
        theme={theme}
        colors={colors}
        margin={config.styling?.layout?.margin || { top: 50, right: 50, bottom: 80, left: 80 }}
        xScale={{
          type: 'time',
          format: 'native',
          useUTC: false,
          precision: 'day',
        }}
        xFormat="time:%Y-%m-%d"
        yScale={{
          type: (config.styling?.axes?.y?.scale || 'linear') === 'log' ? 'log' : 'linear',
          min: (config.styling?.axes?.y?.domain || 'auto') === 'auto' ? 'auto' : config.styling?.axes?.y?.domain?.[0],
          max: (config.styling?.axes?.y?.domain || 'auto') === 'auto' ? 'auto' : config.styling?.axes?.y?.domain?.[1],
          stacked: false,
          reverse: false,
        }}
        curve="monotoneX"
        axisTop={null}
        axisRight={null}
        axisBottom={{
          format: '%Y-%m-%d',
          tickValues: 'every 1 day',
          legend: config.styling?.axes?.x?.label || config.fieldMapping.x,
          legendOffset: -12,
          legendPosition: 'middle',
          tickSize: 5,
          tickPadding: 5,
          tickRotation: config.styling?.axes?.x?.labelAngle || 0,
          renderTick: (config.styling?.axes?.x?.show !== false) ? undefined : () => null,
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: config.styling?.axes?.y?.label || config.fieldMapping.y,
          legendOffset: -40,
          legendPosition: 'middle',
          format: config.styling?.axes?.y?.tickFormat || '.2f',
          renderTick: (config.styling?.axes?.y?.show !== false) ? undefined : () => null,
        }}
        pointSize={6}
        pointColor={{ from: 'color', modifiers: [] }}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serieColor', modifiers: [] }}
        pointLabelYOffset={-12}
        enableCrosshair={config.interactions?.hover?.crosshair !== false}
        useMesh={true}
        enableGridX={config.styling?.axes?.x?.grid !== false}
        enableGridY={config.styling?.axes?.y?.grid !== false}
        animate={config.animation?.enabled !== false}
        motionConfig={config.animation?.easing || 'easeInOut'}
        legends={(config.styling?.legend?.show !== false) && transformedData.length > 1 ? [
          {
            anchor: (config.styling?.legend?.position || 'right') === 'top' ? 'top-left' :
                    (config.styling?.legend?.position || 'right') === 'bottom' ? 'bottom-left' :
                    (config.styling?.legend?.position || 'right') === 'left' ? 'left' :
                    'right',
            direction: config.styling?.legend?.direction || 'column',
            itemWidth: config.styling?.legend?.itemWidth || 100,
            itemHeight: config.styling?.legend?.itemHeight || 20,
            translateX: config.styling?.legend?.translateX || 0,
            translateY: config.styling?.legend?.translateY || 0,
          },
        ] : []}
        onClick={(point, event) => {
          if (onEvent) {
            onEvent({
              type: 'click',
              data: point,
              event,
              chart: config
            });
          }
        }}
        onMouseEnter={(point, event) => {
          if (onEvent && config.interactions?.hover.enabled !== false) {
            onEvent({
              type: 'hover',
              data: point,
              event,
              chart: config
            });
          }
        }}
        tooltip={({ point }) => (
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
              {point.seriesId}
            </div>
            <div>
              <strong>Date:</strong> {new Date(point.data.x).toLocaleDateString()}
            </div>
            <div>
              <strong>Value:</strong> {typeof point.data.y === 'number' ? point.data.y.toFixed(2) : point.data.y}
            </div>
          </div>
        )}
      />
    </div>
  );
}
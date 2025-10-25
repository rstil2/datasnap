import React from 'react';
import { ResponsiveLine } from '@nivo/line';
import { ChartConfig, ChartEvent } from '../../../types/VisualizationTypes';

interface AreaChartProps {
  data: any[];
  config: ChartConfig;
  onEvent?: (event: ChartEvent) => void;
}

export function AreaChart({ data, config, onEvent }: AreaChartProps) {
  // Transform data for Nivo format (similar to LineChart but optimized for area)
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
      fontSize: config.styling.axes.x.fontSize,
      fill: config.styling.axes.x.color,
    },
    axis: {
      domain: {
        line: {
          stroke: config.styling.axes.x.color,
          strokeWidth: 1,
        },
      },
      legend: {
        text: {
          fontSize: config.styling.axes.x.fontSize + 2,
          fill: config.styling.axes.x.color,
          fontWeight: 600,
        },
      },
      ticks: {
        line: {
          stroke: config.styling.axes.x.color,
          strokeWidth: 1,
        },
        text: {
          fontSize: config.styling.axes.x.fontSize,
          fill: config.styling.axes.x.color,
        },
      },
    },
    grid: {
      line: {
        stroke: config.styling.theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        strokeWidth: 1,
      },
    },
    crosshair: {
      line: {
        stroke: config.styling.colors.scheme === 'custom' ? config.styling.colors.customColors?.[0] || '#3182ce' : '#3182ce',
        strokeWidth: 1,
        strokeOpacity: 0.75,
      },
    },
  };
  
  const colors = config.styling.colors.scheme === 'custom' 
    ? config.styling.colors.customColors || ['#3182ce', '#38a169', '#d69e2e', '#e53e3e', '#805ad5']
    : { scheme: config.styling.colors.scheme as any };
  
  return (
    <div style={{ 
      width: '100%', 
      height: config.styling.layout.height,
      background: 'transparent'
    }}>
      <ResponsiveLine
        data={transformedData}
        theme={theme}
        colors={colors}
        margin={config.styling.layout.margin}
        xScale={{
          type: 'time',
          format: 'native',
          useUTC: false,
          precision: 'day',
        }}
        xFormat="time:%Y-%m-%d"
        yScale={{
          type: config.styling.axes.y.scale === 'log' ? 'log' : 'linear',
          min: config.styling.axes.y.domain === 'auto' ? 0 : config.styling.axes.y.domain?.[0], // Start from 0 for area charts
          max: config.styling.axes.y.domain === 'auto' ? 'auto' : config.styling.axes.y.domain?.[1],
          stacked: false,
          reverse: false,
        }}
        curve="monotoneX"
        axisTop={null}
        axisRight={null}
        axisBottom={{
          format: '%Y-%m-%d',
          tickValues: 'every 1 day',
          legend: config.styling.axes.x.label || config.fieldMapping.x,
          legendOffset: -12,
          legendPosition: 'middle',
          tickSize: 5,
          tickPadding: 5,
          tickRotation: config.styling.axes.x.labelAngle || 0,
          renderTick: config.styling.axes.x.show ? undefined : () => null,
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: config.styling.axes.y.label || config.fieldMapping.y,
          legendOffset: -40,
          legendPosition: 'middle',
          format: config.styling.axes.y.tickFormat || '.2f',
          renderTick: config.styling.axes.y.show ? undefined : () => null,
        }}
        pointSize={4}
        pointColor={{ from: 'color', modifiers: [] }}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serieColor', modifiers: [] }}
        pointLabelYOffset={-12}
        enableCrosshair={config.interactions?.hover.crosshair || true}
        useMesh={true}
        enableGridX={config.styling.axes.x.grid}
        enableGridY={config.styling.axes.y.grid}
        animate={config.animation?.enabled !== false}
        motionConfig={config.animation?.easing || 'easeInOut'}
        // Area chart specific properties
        enableArea={true}
        areaOpacity={0.15}
        areaBaselineValue={0}
        enableSlices="x"
        // Line styling for area charts
        lineWidth={2}
        legends={config.styling.legend.show && transformedData.length > 1 ? [
          {
            anchor: config.styling.legend.position === 'top' ? 'top-left' :
                    config.styling.legend.position === 'bottom' ? 'bottom-left' :
                    config.styling.legend.position === 'left' ? 'left' :
                    'right',
            direction: config.styling.legend.direction,
            itemWidth: config.styling.legend.itemWidth,
            itemHeight: config.styling.legend.itemHeight,
            translateX: config.styling.legend.translateX,
            translateY: config.styling.legend.translateY,
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
              background: config.styling.theme === 'dark' ? '#2d3748' : 'white',
              color: config.styling.theme === 'dark' ? 'white' : '#2d3748',
              padding: '9px 12px',
              border: `1px solid ${config.styling.theme === 'dark' ? '#4a5568' : '#e2e8f0'}`,
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
        sliceTooltip={({ slice }) => (
          <div
            style={{
              background: config.styling.theme === 'dark' ? '#2d3748' : 'white',
              color: config.styling.theme === 'dark' ? 'white' : '#2d3748',
              padding: '9px 12px',
              border: `1px solid ${config.styling.theme === 'dark' ? '#4a5568' : '#e2e8f0'}`,
              borderRadius: '4px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              fontSize: '12px',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              {new Date(slice.points[0].data.x).toLocaleDateString()}
            </div>
            {slice.points.map(point => (
              <div key={point.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: point.serieColor,
                    marginRight: '6px',
                    borderRadius: '2px'
                  }}
                />
                <span style={{ marginRight: '8px' }}>{point.serieId}:</span>
                <span style={{ fontWeight: 'bold' }}>
                  {typeof point.data.y === 'number' ? point.data.y.toFixed(2) : point.data.y}
                </span>
              </div>
            ))}
          </div>
        )}
      />
    </div>
  );
}
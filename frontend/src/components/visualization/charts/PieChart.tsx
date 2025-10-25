import React from 'react';
import { ResponsivePie } from '@nivo/pie';
import { ChartConfig, ChartEvent } from '../../../types/VisualizationTypes';

interface PieChartProps {
  data: any[];
  config: ChartConfig;
  onEvent?: (event: ChartEvent) => void;
}

export function PieChart({ data, config, onEvent }: PieChartProps) {
  // Transform data for Nivo pie chart format
  const transformedData = React.useMemo(() => {
    if (!config.fieldMapping.category || !config.fieldMapping.value) return [];
    
    const categoryField = config.fieldMapping.category;
    const valueField = config.fieldMapping.value;
    
    // Aggregate data by category
    const aggregated = new Map<string, number>();
    
    data.forEach(row => {
      const category = String(row[categoryField] || 'Unknown');
      const value = parseFloat(String(row[valueField])) || 0;
      
      if (aggregated.has(category)) {
        aggregated.set(category, aggregated.get(category)! + value);
      } else {
        aggregated.set(category, value);
      }
    });
    
    // Convert to Nivo format and sort by value
    return Array.from(aggregated.entries())
      .map(([id, value]) => ({
        id,
        label: id,
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 20); // Limit to top 20 categories for readability
  }, [data, config.fieldMapping]);
  
  const theme = {
    background: 'transparent',
    text: {
      fontSize: config.styling?.legend?.fontSize || 12,
      fill: config.styling?.axes?.x?.color || '#666',
    },
    tooltip: {
      container: {
        background: (config.styling?.theme || 'light') === 'dark' ? '#2d3748' : 'white',
        color: (config.styling?.theme || 'light') === 'dark' ? 'white' : '#2d3748',
        fontSize: '12px',
        borderRadius: '4px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        border: `1px solid ${(config.styling?.theme || 'light') === 'dark' ? '#4a5568' : '#e2e8f0'}`,
      }
    }
  };
  
  const colors = config.styling?.colors?.scheme === 'custom' 
    ? config.styling?.colors?.customColors || ['#3182ce', '#38a169', '#d69e2e', '#e53e3e', '#805ad5', '#00b4d8', '#f72585', '#4cc9f0', '#7209b7', '#f77f00']
    : { scheme: (config.styling?.colors?.scheme || 'category10') as any };
  
  return (
    <div 
      data-testid="pie-chart"
      style={{ 
        width: '100%', 
        height: config.styling?.layout?.height || 400,
        background: 'transparent'
      }}
    >
      <ResponsivePie
        data={transformedData}
        theme={theme}
        colors={colors}
        margin={config.styling?.layout?.margin || { top: 50, right: 50, bottom: 50, left: 50 }}
        innerRadius={0.5}
        padAngle={0.7}
        cornerRadius={3}
        activeOuterRadiusOffset={8}
        borderWidth={1}
        borderColor={{
          from: 'color',
          modifiers: [['darker', 0.2]]
        }}
        arcLinkLabelsSkipAngle={10}
        arcLinkLabelsTextColor={config.styling?.axes?.x?.color || '#666'}
        arcLinkLabelsThickness={2}
        arcLinkLabelsColor={{ from: 'color' }}
        arcLabelsSkipAngle={10}
        arcLabelsTextColor={{
          from: 'color',
          modifiers: [['darker', 2]]
        }}
        enableArcLabels={transformedData.length <= 10}
        enableArcLinkLabels={(config.styling?.legend?.show !== false) && transformedData.length <= 15}
        animate={config.animation?.enabled !== false}
        motionConfig={config.animation?.easing || 'easeInOut'}
        legends={(config.styling?.legend?.show !== false) ? [
          {
            anchor: (config.styling?.legend?.position || 'right') === 'top' ? 'top' :
                    (config.styling?.legend?.position || 'right') === 'bottom' ? 'bottom' :
                    (config.styling?.legend?.position || 'right') === 'left' ? 'left' :
                    'right',
            direction: config.styling?.legend?.direction || 'column',
            justify: false,
            translateX: config.styling?.legend?.translateX || 0,
            translateY: config.styling?.legend?.translateY || 0,
            itemsSpacing: 2,
            itemWidth: config.styling?.legend?.itemWidth || 100,
            itemHeight: config.styling?.legend?.itemHeight || 20,
            itemTextColor: config.styling?.axes?.x?.color || '#666',
            itemDirection: 'left-to-right',
            itemOpacity: 1,
            symbolSize: config.styling?.legend?.symbolSize || 12,
            symbolShape: 'circle',
          }
        ] : []}
        onClick={(slice, event) => {
          if (onEvent) {
            onEvent({
              type: 'click',
              data: slice,
              event,
              chart: config
            });
          }
        }}
        onMouseEnter={(slice, event) => {
          if (onEvent && config.interactions?.hover.enabled !== false) {
            onEvent({
              type: 'hover',
              data: slice,
              event,
              chart: config
            });
          }
        }}
        tooltip={({ datum }) => (
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
              {datum.label}
            </div>
            <div>
              <strong>Value:</strong> {typeof datum.value === 'number' ? datum.value.toFixed(2) : datum.value}
            </div>
            <div>
              <strong>Percentage:</strong> {((datum.value / transformedData.reduce((sum, d) => sum + d.value, 0)) * 100).toFixed(1)}%
            </div>
          </div>
        )}
      />
    </div>
  );
}
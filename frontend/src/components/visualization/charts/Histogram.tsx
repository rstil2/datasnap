import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartConfig, ChartEvent } from '../../../types/VisualizationTypes';
import * as ss from 'simple-statistics';

interface HistogramProps {
  data: any[];
  config: ChartConfig;
  onEvent?: (event: ChartEvent) => void;
}

export function Histogram({ data, config, onEvent }: HistogramProps) {
  // Transform data for histogram format
  const transformedData = React.useMemo(() => {
    if (!config.fieldMapping.x) return [];
    
    const field = config.fieldMapping.x;
    const values = data
      .map(row => parseFloat(String(row[field])))
      .filter(val => !isNaN(val) && isFinite(val));
    
    if (values.length === 0) return [];
    
    // Calculate optimal number of bins using Sturges' rule
    const binCount = Math.max(1, Math.ceil(Math.log2(values.length) + 1));
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const binWidth = (maxValue - minValue) / binCount;
    
    // Create bins
    const bins = Array.from({ length: binCount }, (_, i) => {
      const start = minValue + i * binWidth;
      const end = start + binWidth;
      return {
        start,
        end,
        midpoint: start + binWidth / 2,
        count: 0,
        label: `${start.toFixed(2)} - ${end.toFixed(2)}`,
        range: `[${start.toFixed(2)}, ${end.toFixed(2)}${i === binCount - 1 ? ']' : ')'}`
      };
    });
    
    // Count values in each bin
    values.forEach(value => {
      let binIndex = Math.floor((value - minValue) / binWidth);
      // Handle edge case for maximum value
      if (binIndex >= binCount) binIndex = binCount - 1;
      if (binIndex < 0) binIndex = 0;
      bins[binIndex].count++;
    });
    
    // Calculate statistics for tooltip
    const mean = ss.mean(values);
    const median = ss.median(values);
    const stdDev = ss.standardDeviation(values);
    
    return bins.map((bin, index) => ({
      ...bin,
      name: bin.range,
      value: bin.count,
      frequency: (bin.count / values.length) * 100,
      density: bin.count / (binWidth * values.length),
      stats: { mean, median, stdDev, total: values.length }
    }));
  }, [data, config.fieldMapping]);
  
  const maxCount = Math.max(...transformedData.map(d => d.count));
  
  return (
    <div style={{ 
      width: '100%', 
      height: config.styling.layout.height,
      background: 'transparent'
    }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={transformedData} 
          margin={config.styling.layout.margin}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={config.styling.theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}
            horizontal={config.styling.axes.y.grid}
            vertical={config.styling.axes.x.grid}
          />
          
          <XAxis 
            dataKey="name"
            stroke={config.styling.axes.x.color}
            fontSize={config.styling.axes.x.fontSize}
            angle={config.styling.axes.x.labelAngle || -45}
            textAnchor="end"
            height={80}
            interval={0}
            tick={config.styling.axes.x.show ? undefined : false}
            label={config.styling.axes.x.show ? {
              value: config.styling.axes.x.label || config.fieldMapping.x,
              position: 'insideBottom',
              offset: -5,
              style: { textAnchor: 'middle', fontSize: config.styling.axes.x.fontSize + 2 }
            } : undefined}
          />
          
          <YAxis 
            stroke={config.styling.axes.y.color}
            fontSize={config.styling.axes.y.fontSize}
            tick={config.styling.axes.y.show ? undefined : false}
            label={config.styling.axes.y.show ? {
              value: 'Frequency',
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fontSize: config.styling.axes.y.fontSize + 2 }
            } : undefined}
            domain={[0, Math.ceil(maxCount * 1.1)]}
          />
          
          <Tooltip 
            content={({ active, payload, label }) => {
              if (active && payload && payload.length > 0) {
                const data = payload[0].payload;
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
                      Bin: {data.range}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px' }}>
                      <div><strong>Count:</strong></div>
                      <div>{data.count}</div>
                      
                      <div><strong>Frequency:</strong></div>
                      <div>{data.frequency.toFixed(1)}%</div>
                      
                      <div><strong>Density:</strong></div>
                      <div>{data.density.toFixed(4)}</div>
                    </div>
                    
                    <hr style={{ margin: '8px 0', border: 'none', borderTop: `1px solid ${config.styling.theme === 'dark' ? '#4a5568' : '#e2e8f0'}` }} />
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px', fontSize: '11px', color: config.styling.theme === 'dark' ? '#a0aec0' : '#718096' }}>
                      <div>Mean:</div>
                      <div>{data.stats.mean.toFixed(2)}</div>
                      
                      <div>Median:</div>
                      <div>{data.stats.median.toFixed(2)}</div>
                      
                      <div>Std Dev:</div>
                      <div>{data.stats.stdDev.toFixed(2)}</div>
                      
                      <div>Total:</div>
                      <div>{data.stats.total}</div>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          
          <Bar 
            dataKey="value"
            fill={
              config.styling.colors.scheme === 'custom' 
                ? config.styling.colors.customColors?.[0] || '#3182ce'
                : '#3182ce'
            }
            radius={[2, 2, 0, 0]}
            stroke={config.styling.theme === 'dark' ? '#4a5568' : '#e2e8f0'}
            strokeWidth={1}
            onClick={(data, event) => {
              if (onEvent) {
                onEvent({
                  type: 'click',
                  data,
                  event,
                  chart: config
                });
              }
            }}
            onMouseEnter={(data, event) => {
              if (onEvent && config.interactions?.hover.enabled !== false) {
                onEvent({
                  type: 'hover',
                  data,
                  event,
                  chart: config
                });
              }
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
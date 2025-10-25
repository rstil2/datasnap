import React from 'react';
import { ResponsiveHeatMap } from '@nivo/heatmap';
import { ChartConfig, ChartEvent } from '../../../types/VisualizationTypes';

interface TestHeatmapChartProps {
  data: any[];
  config: ChartConfig;
  onEvent?: (event: ChartEvent) => void;
}

export function TestHeatmapChart({ data, config, onEvent }: TestHeatmapChartProps) {
  // Comprehensive safety checks
  
  if (!data) {
    return <div style={{ padding: '1rem', textAlign: 'center', color: 'red' }}>Error: No data provided</div>;
  }
  
  if (!Array.isArray(data)) {
    return <div style={{ padding: '1rem', textAlign: 'center', color: 'red' }}>Error: Data is not an array</div>;
  }
  
  if (data.length === 0) {
    return <div style={{ padding: '1rem', textAlign: 'center', color: 'orange' }}>No data available for heatmap</div>;
  }
  
  if (!config) {
    return <div style={{ padding: '1rem', textAlign: 'center', color: 'red' }}>Error: No config provided</div>;
  }
  
  if (!config.fieldMapping) {
    return <div style={{ padding: '1rem', textAlign: 'center', color: 'red' }}>Error: No field mapping in config</div>;
  }
  
  if (!config.fieldMapping.x || !config.fieldMapping.y || !config.fieldMapping.value) {
    return <div style={{ padding: '1rem', textAlign: 'center', color: 'orange' }}>Please select X, Y, and value fields</div>;
  }
  
  // Create minimal test data
  const testData = [
    { id: 'Row1', Col1: 10, Col2: 20, Col3: 15 },
    { id: 'Row2', Col1: 25, Col2: 5, Col3: 30 },
    { id: 'Row3', Col1: 15, Col2: 35, Col3: 10 }
  ];
  
  const keys = ['Col1', 'Col2', 'Col3'];
  
  try {
    return (
      <div style={{ width: '100%', height: '400px', background: 'transparent' }}>
        <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>
          Test Heatmap (Using Static Data)
        </h4>
        <div style={{ height: '350px' }}>
          <ResponsiveHeatMap
            data={testData}
            keys={keys}
            indexBy="id"
            margin={{ top: 60, right: 90, bottom: 60, left: 80 }}
            minValue={0}
            maxValue={35}
            colors="blues"
            axisTop={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: -45,
              legend: 'X Axis',
              legendPosition: 'middle',
              legendOffset: -36,
            }}
            axisRight={null}
            axisBottom={null}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: 'Y Axis',
              legendPosition: 'middle',
              legendOffset: -40,
            }}
            cellOpacity={0.8}
            cellBorderWidth={1}
            cellBorderColor="#e2e8f0"
            labelTextColor="#333"
            animate={true}
            motionConfig="easeInOut"
            hoverTarget="cell"
          />
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center', color: 'red' }}>
        <div>Error rendering heatmap:</div>
        <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
          {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </div>
    );
  }
}
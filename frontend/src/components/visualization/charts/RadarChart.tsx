import React, { useMemo, useCallback } from 'react';
import { ChartConfig, ChartEvent } from '../../../types/VisualizationTypes';
import * as d3 from 'd3';

interface RadarChartProps {
  data: Record<string, any>[];
  config: ChartConfig;
  onEvent?: (event: ChartEvent) => void;
}

interface RadarData {
  name: string;
  values: Array<{ axis: string; value: number; normalizedValue: number }>;
  color: string;
}

export function RadarChart({ data, config, onEvent }: RadarChartProps) {
  const radarData = useMemo(() => {
    if (!data || data.length === 0) return { series: [], axes: [], maxValues: {} };
    
    // Identify numeric columns for radar axes
    const numericFields = Object.keys(data[0]).filter(key => {
      const values = data.map(row => row[key]);
      return values.some(val => !isNaN(parseFloat(String(val))));
    });
    
    if (numericFields.length < 3) {
      return { series: [], axes: numericFields, maxValues: {} };
    }
    
    // Calculate max values for normalization
    const maxValues: Record<string, number> = {};
    numericFields.forEach(field => {
      const values = data.map(row => parseFloat(String(row[field])) || 0);
      maxValues[field] = d3.max(values) || 1;
    });
    
    // Group data by category if specified, otherwise treat each row as a series
    const groupField = config.fieldMapping.category || config.fieldMapping.color;
    const colors = d3.schemeCategory10;
    let colorIndex = 0;
    
    let series: RadarData[];
    
    if (groupField && data.some(row => row[groupField])) {
      // Group by category
      const grouped = new Map<string, Record<string, any>[]>();
      data.forEach(row => {
        const category = String(row[groupField] || 'Unknown');
        if (!grouped.has(category)) {
          grouped.set(category, []);
        }
        grouped.get(category)!.push(row);
      });
      
      series = Array.from(grouped.entries()).map(([category, rows]) => {
        const avgValues = numericFields.map(field => {
          const values = rows.map(row => parseFloat(String(row[field])) || 0);
          const avg = d3.mean(values) || 0;
          return {
            axis: field,
            value: avg,
            normalizedValue: avg / maxValues[field]
          };
        });
        
        return {
          name: category,
          values: avgValues,
          color: colors[colorIndex++ % colors.length]
        };
      });
    } else {
      // Each row is a series (limit to first 10 for readability)
      series = data.slice(0, 10).map((row, index) => {
        const values = numericFields.map(field => {
          const value = parseFloat(String(row[field])) || 0;
          return {
            axis: field,
            value,
            normalizedValue: value / maxValues[field]
          };
        });
        
        return {
          name: row.name || row.id || `Series ${index + 1}`,
          values,
          color: colors[index % colors.length]
        };
      });
    }
    
    return { series, axes: numericFields, maxValues };
  }, [data, config.fieldMapping]);
  
  const svgRef = React.useRef<SVGSVGElement>(null);
  
  const drawRadarChart = useCallback(() => {
    if (!svgRef.current || radarData.series.length === 0) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    
    const margin = config.styling?.layout?.margin || { top: 50, right: 80, bottom: 50, left: 80 };
    const width = (config.styling?.layout?.width || 600) - margin.left - margin.right;
    const height = (config.styling?.layout?.height || 600) - margin.top - margin.bottom;
    
    const radius = Math.min(width, height) / 2;
    const centerX = width / 2 + margin.left;
    const centerY = height / 2 + margin.top;
    
    const g = svg.append('g')
      .attr('transform', `translate(${centerX}, ${centerY})`);
    
    const numAxes = radarData.axes.length;
    const angleSlice = (Math.PI * 2) / numAxes;
    
    // Create scales
    const radiusScale = d3.scaleLinear()
      .domain([0, 1])
      .range([0, radius * 0.8]);
    
    // Draw background circles
    const levels = 5;
    for (let i = 1; i <= levels; i++) {
      g.append('circle')
        .attr('class', 'grid-circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', radiusScale(i / levels))
        .attr('fill', 'none')
        .attr('stroke', 'var(--border-secondary)')
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.3);
      
      // Add level labels
      g.append('text')
        .attr('class', 'level-label')
        .attr('x', 4)
        .attr('y', -radiusScale(i / levels) + 4)
        .text(`${(i * 20)}%`)
        .attr('font-size', '10px')
        .attr('fill', 'var(--text-tertiary)');
    }
    
    // Draw axis lines and labels
    radarData.axes.forEach((axis, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      // Axis line
      g.append('line')
        .attr('class', 'axis-line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', x)
        .attr('y2', y)
        .attr('stroke', 'var(--border-primary)')
        .attr('stroke-width', 1);
      
      // Axis label
      const labelOffset = 20;
      const labelX = Math.cos(angle) * (radius + labelOffset);
      const labelY = Math.sin(angle) * (radius + labelOffset);
      
      g.append('text')
        .attr('class', 'axis-label')
        .attr('x', labelX)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .text(axis)
        .attr('font-size', (config.styling?.axes?.x?.fontSize || 12) + 'px')
        .attr('fill', 'var(--text-primary)')
        .attr('font-weight', 600);
    });
    
    // Line generator for radar areas
    const lineGenerator = d3.lineRadial<{ axis: string; value: number; normalizedValue: number }>()
      .angle((d, i) => angleSlice * i)
      .radius(d => radiusScale(d.normalizedValue))
      .curve(d3.curveLinearClosed);
    
    // Draw each series
    radarData.series.forEach((series, seriesIndex) => {
      const seriesGroup = g.append('g')
        .attr('class', `series-${seriesIndex}`);
      
      // Draw area
      const areaPath = lineGenerator(series.values);
      if (areaPath) {
        seriesGroup.append('path')
          .attr('class', 'radar-area')
          .attr('d', areaPath)
          .attr('fill', series.color)
          .attr('fill-opacity', 0.1)
          .attr('stroke', series.color)
          .attr('stroke-width', 2)
          .on('mouseenter', function() {
            d3.select(this)
              .attr('fill-opacity', 0.2)
              .attr('stroke-width', 3);
            
            if (onEvent) {
              onEvent({
                type: 'hover',
                data: series,
                event: d3.event,
                chart: config
              });
            }
          })
          .on('mouseleave', function() {
            d3.select(this)
              .attr('fill-opacity', 0.1)
              .attr('stroke-width', 2);
          })
          .on('click', function() {
            if (onEvent) {
              onEvent({
                type: 'click',
                data: series,
                event: d3.event,
                chart: config
              });
            }
          });
      }
      
      // Draw data points
      series.values.forEach((point, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const x = Math.cos(angle) * radiusScale(point.normalizedValue);
        const y = Math.sin(angle) * radiusScale(point.normalizedValue);
        
        seriesGroup.append('circle')
          .attr('class', 'data-point')
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', 4)
          .attr('fill', series.color)
          .attr('stroke', 'white')
          .attr('stroke-width', 2)
          .on('mouseenter', function(event) {
            // Show tooltip
            const tooltip = g.append('g')
              .attr('class', 'tooltip')
              .attr('transform', `translate(${x + 10}, ${y - 10})`);
            
            const text = tooltip.append('text')
              .attr('font-size', '12px')
              .attr('fill', 'var(--text-primary)');
            
            text.append('tspan')
              .attr('x', 0)
              .attr('dy', 0)
              .text(`${series.name}`);
            
            text.append('tspan')
              .attr('x', 0)
              .attr('dy', '1.2em')
              .text(`${point.axis}: ${point.value.toFixed(2)}`);
            
            const bbox = text.node()?.getBBox();
            if (bbox) {
              tooltip.insert('rect', 'text')
                .attr('x', bbox.x - 4)
                .attr('y', bbox.y - 2)
                .attr('width', bbox.width + 8)
                .attr('height', bbox.height + 4)
                .attr('fill', 'var(--bg-elevated)')
                .attr('stroke', 'var(--border-primary)')
                .attr('rx', 4);
            }
          })
          .on('mouseleave', function() {
            g.select('.tooltip').remove();
          });
      });
    });
    
    // Add legend
    if (radarData.series.length > 1) {
      const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width + margin.left - 100}, ${margin.top})`);
      
      radarData.series.forEach((series, i) => {
        const legendItem = legend.append('g')
          .attr('transform', `translate(0, ${i * 25})`);
        
        legendItem.append('rect')
          .attr('width', 16)
          .attr('height', 16)
          .attr('fill', series.color)
          .attr('fill-opacity', 0.7);
        
        legendItem.append('text')
          .attr('x', 20)
          .attr('y', 8)
          .attr('dy', '0.35em')
          .text(series.name)
          .attr('font-size', '12px')
          .attr('fill', 'var(--text-primary)');
      });
    }
    
  }, [radarData, config, onEvent]);
  
  React.useEffect(() => {
    drawRadarChart();
  }, [drawRadarChart]);
  
  if (radarData.series.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: config.styling?.layout?.height || 600,
        color: 'var(--text-tertiary)',
        fontSize: '0.875rem',
        flexDirection: 'column',
        gap: 'var(--space-md)'
      }}>
        <div style={{ fontSize: '3rem', opacity: 0.3 }}>📡</div>
        <div>
          <div style={{ fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-xs)' }}>
            No data available for radar chart
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Radar charts require at least 3 numeric columns
          </div>
        </div>
      </div>
    );
  }
  
  if (radarData.axes.length < 3) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: config.styling?.layout?.height || 600,
        color: 'var(--warning)',
        fontSize: '0.875rem',
        flexDirection: 'column',
        gap: 'var(--space-md)'
      }}>
        <div style={{ fontSize: '3rem', opacity: 0.5 }}>⚠️</div>
        <div>
          <div style={{ fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-xs)' }}>
            Insufficient data dimensions
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Radar charts require at least 3 numeric columns. Found: {radarData.axes.length}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div style={{ width: '100%', height: config.styling?.layout?.height || 600, overflow: 'auto' }}>
      <svg
        ref={svgRef}
        width={config.styling?.layout?.width || 600}
        height={config.styling?.layout?.height || 600}
        style={{ display: 'block' }}
      />
    </div>
  );
}
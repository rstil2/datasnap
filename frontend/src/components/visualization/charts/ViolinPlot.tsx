import React, { useMemo } from 'react';
import { ChartConfig, ChartEvent } from '../../../types/VisualizationTypes';
import * as d3 from 'd3';

interface ViolinPlotProps {
  data: Record<string, any>[];
  config: ChartConfig;
  onEvent?: (event: ChartEvent) => void;
}

interface ViolinData {
  category: string;
  values: number[];
  quartiles: [number, number, number]; // Q1, median, Q3
  kde: Array<{ value: number; density: number }>;
  outliers: number[];
  color: string;
}

export function ViolinPlot({ data, config, onEvent }: ViolinPlotProps) {
  const violinData = useMemo(() => {
    if (!config.fieldMapping.x || !config.fieldMapping.y) return [];
    
    const xField = config.fieldMapping.x;
    const yField = config.fieldMapping.y;
    
    // Group data by x-field (categories)
    const grouped = new Map<string, number[]>();
    
    data.forEach(row => {
      const category = String(row[xField] || 'Unknown');
      const value = parseFloat(String(row[yField]));
      
      if (!isNaN(value)) {
        if (!grouped.has(category)) {
          grouped.set(category, []);
        }
        grouped.get(category)!.push(value);
      }
    });
    
    // Create violin data with KDE and statistics
    const colors = d3.schemeCategory10;
    let colorIndex = 0;
    
    return Array.from(grouped.entries()).map(([category, values]) => {
      values.sort((a, b) => a - b);
      
      // Calculate quartiles
      const q1 = d3.quantile(values, 0.25) || 0;
      const median = d3.quantile(values, 0.5) || 0;
      const q3 = d3.quantile(values, 0.75) || 0;
      const iqr = q3 - q1;
      
      // Find outliers
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;
      const outliers = values.filter(v => v < lowerBound || v > upperBound);
      
      // Create KDE (Kernel Density Estimation)
      const kde = kernelDensityEstimation(values);
      
      return {
        category,
        values,
        quartiles: [q1, median, q3] as [number, number, number],
        kde,
        outliers,
        color: colors[colorIndex++ % colors.length]
      };
    });
  }, [data, config.fieldMapping]);
  
  const svgRef = React.useRef<SVGSVGElement>(null);
  
  React.useEffect(() => {
    if (!svgRef.current || violinData.length === 0) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render
    
    const margin = config.styling?.layout?.margin || { top: 50, right: 50, bottom: 80, left: 80 };
    const width = (config.styling?.layout?.width || 800) - margin.left - margin.right;
    const height = (config.styling?.layout?.height || 400) - margin.top - margin.bottom;
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Create scales
    const xScale = d3.scaleBand()
      .domain(violinData.map(d => d.category))
      .range([0, width])
      .padding(0.1);
    
    const allValues = violinData.flatMap(d => d.values);
    const yScale = d3.scaleLinear()
      .domain(d3.extent(allValues) as [number, number])
      .nice()
      .range([height, 0]);
    
    const densityScale = d3.scaleLinear()
      .domain([0, d3.max(violinData.flatMap(d => d.kde.map(k => k.density))) || 1])
      .range([0, xScale.bandwidth() / 2]);
    
    // Add axes
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale));
    
    g.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(yScale));
    
    // Add axis labels
    g.append('text')
      .attr('class', 'x-label')
      .attr('text-anchor', 'middle')
      .attr('x', width / 2)
      .attr('y', height + margin.bottom - 10)
      .text(config.styling?.axes?.x?.label || config.fieldMapping.x);
    
    g.append('text')
      .attr('class', 'y-label')
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -margin.left + 20)
      .text(config.styling?.axes?.y?.label || config.fieldMapping.y);
    
    // Draw violins
    violinData.forEach(violin => {
      const xPos = xScale(violin.category)! + xScale.bandwidth() / 2;
      
      // Create line function for violin shape
      const line = d3.line<{ value: number; density: number }>()
        .x(d => densityScale(d.density))
        .y(d => yScale(d.value))
        .curve(d3.curveBasis);
      
      // Draw left side of violin
      const leftPath = line(violin.kde.map(d => ({ ...d, density: -d.density })));
      if (leftPath) {
        g.append('path')
          .attr('d', leftPath)
          .attr('transform', `translate(${xPos}, 0)`)
          .attr('fill', violin.color)
          .attr('fill-opacity', 0.6)
          .attr('stroke', violin.color)
          .attr('stroke-width', 1);
      }
      
      // Draw right side of violin
      const rightPath = line(violin.kde);
      if (rightPath) {
        g.append('path')
          .attr('d', rightPath)
          .attr('transform', `translate(${xPos}, 0)`)
          .attr('fill', violin.color)
          .attr('fill-opacity', 0.6)
          .attr('stroke', violin.color)
          .attr('stroke-width', 1);
      }
      
      // Draw box plot inside violin
      const boxWidth = xScale.bandwidth() * 0.1;
      const [q1, median, q3] = violin.quartiles;
      
      // Box
      g.append('rect')
        .attr('x', xPos - boxWidth / 2)
        .attr('y', yScale(q3))
        .attr('width', boxWidth)
        .attr('height', yScale(q1) - yScale(q3))
        .attr('fill', 'white')
        .attr('stroke', violin.color)
        .attr('stroke-width', 2);
      
      // Median line
      g.append('line')
        .attr('x1', xPos - boxWidth / 2)
        .attr('x2', xPos + boxWidth / 2)
        .attr('y1', yScale(median))
        .attr('y2', yScale(median))
        .attr('stroke', violin.color)
        .attr('stroke-width', 3);
      
      // Outliers
      violin.outliers.forEach(outlier => {
        g.append('circle')
          .attr('cx', xPos + (Math.random() - 0.5) * boxWidth * 0.5) // Small jitter
          .attr('cy', yScale(outlier))
          .attr('r', 2)
          .attr('fill', violin.color)
          .attr('fill-opacity', 0.7);
      });
    });
    
    // Add grid lines if enabled
    if (config.styling?.axes?.y?.grid !== false) {
      g.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(yScale)
          .tickSize(-width)
          .tickFormat('' as any)
        )
        .selectAll('line')
        .attr('stroke', 'var(--border-secondary)')
        .attr('stroke-dasharray', '3,3')
        .attr('opacity', 0.3);
    }
    
    // Style axes
    svg.selectAll('.x-axis, .y-axis')
      .selectAll('text')
      .attr('fill', 'var(--text-secondary)')
      .attr('font-size', config.styling?.axes?.x?.fontSize || 12);
    
    svg.selectAll('.x-axis, .y-axis')
      .selectAll('path, line')
      .attr('stroke', 'var(--border-primary)');
    
    svg.selectAll('.x-label, .y-label')
      .attr('fill', 'var(--text-primary)')
      .attr('font-size', (config.styling?.axes?.x?.fontSize || 12) + 2)
      .attr('font-weight', 600);
    
  }, [violinData, config]);
  
  if (violinData.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: config.styling?.layout?.height || 400,
        color: 'var(--text-tertiary)',
        fontSize: '0.875rem'
      }}>
        No data available for violin plot
      </div>
    );
  }
  
  return (
    <div style={{ width: '100%', height: config.styling?.layout?.height || 400, overflow: 'auto' }}>
      <svg
        ref={svgRef}
        width={config.styling?.layout?.width || 800}
        height={config.styling?.layout?.height || 400}
        style={{ display: 'block' }}
      />
    </div>
  );
}

// Helper function for Kernel Density Estimation
function kernelDensityEstimation(values: number[], bandwidth?: number): Array<{ value: number; density: number }> {
  const n = values.length;
  if (n === 0) return [];
  
  // Auto-bandwidth using Silverman's rule of thumb
  const std = d3.deviation(values) || 1;
  const bw = bandwidth || 1.06 * std * Math.pow(n, -1/5);
  
  const min = d3.min(values) || 0;
  const max = d3.max(values) || 0;
  const range = max - min;
  
  // Create evaluation points
  const numPoints = Math.min(100, Math.max(20, Math.floor(range / (bw / 4))));
  const step = range / numPoints;
  const evaluationPoints = d3.range(min - bw * 2, max + bw * 2, step);
  
  // Calculate density at each evaluation point
  return evaluationPoints.map(x => {
    const density = values.reduce((sum, value) => {
      const u = (x - value) / bw;
      // Gaussian kernel
      return sum + Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);
    }, 0) / (n * bw);
    
    return { value: x, density };
  });
}
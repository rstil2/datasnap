import { saveAs } from 'file-saver';
import { ChartConfig } from '../../types/VisualizationTypes';
import { InsightGenerationResult } from '../ai/InsightGenerator';

export interface HTMLWidgetOptions {
  includeInsights?: boolean;
  includeControls?: boolean;
  includeDataTable?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  customCSS?: string;
  title?: string;
  description?: string;
  responsive?: boolean;
  enableFullscreen?: boolean;
  showBranding?: boolean;
  filename?: string;
}

export interface HTMLWidgetResult {
  success: boolean;
  filename?: string;
  size?: string;
  error?: string;
}

export class HTMLWidgetGenerator {
  /**
   * Generate standalone interactive HTML widget
   */
  static async generateWidget(
    config: ChartConfig,
    data: Record<string, any>[],
    insights: InsightGenerationResult | null,
    options: HTMLWidgetOptions = {}
  ): Promise<HTMLWidgetResult> {
    try {
      // Generate the complete HTML document
      const htmlContent = this.generateHTMLDocument(config, data, insights, options);
      
      // Create blob and download
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const filename = options.filename || this.generateFilename(config);
      
      saveAs(blob, filename);
      
      // Calculate approximate size
      const sizeKB = Math.round(blob.size / 1024);
      
      return {
        success: true,
        filename,
        size: sizeKB > 1024 ? `${Math.round(sizeKB / 1024 * 10) / 10} MB` : `${sizeKB} KB`
      };

    } catch (error) {
      return {
        success: false,
        error: `HTML widget generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static generateHTMLDocument(
    config: ChartConfig,
    data: Record<string, any>[],
    insights: InsightGenerationResult | null,
    options: HTMLWidgetOptions
  ): string {
    const title = options.title || config.title || 'DataSnap Chart';
    const description = options.description || config.description || '';
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(title)}</title>
    <meta name="description" content="${this.escapeHtml(description)}">
    <meta name="generator" content="DataSnap AI Analytics Platform">
    
    <!-- Recharts Library -->
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/recharts@2.8.0/umd/Recharts.js"></script>
    
    <!-- D3 for advanced visualizations -->
    <script src="https://d3js.org/d3.v7.min.js"></script>
    
    <style>
        ${this.generateCSS(options)}
    </style>
</head>
<body>
    <div id="app">
        <div class="loading">
            <div class="spinner"></div>
            <p>Loading chart...</p>
        </div>
    </div>

    <script>
        ${this.generateJavaScript(config, data, insights, options)}
    </script>
</body>
</html>`;
  }

  private static generateCSS(options: HTMLWidgetOptions): string {
    const theme = options.theme || 'light';
    
    return `
        :root {
            /* Color Variables */
            --primary-color: ${theme === 'dark' ? '#60a5fa' : '#2563eb'};
            --secondary-color: ${theme === 'dark' ? '#94a3b8' : '#64748b'};
            --background-color: ${theme === 'dark' ? '#0f172a' : '#ffffff'};
            --surface-color: ${theme === 'dark' ? '#1e293b' : '#f8fafc'};
            --text-primary: ${theme === 'dark' ? '#f1f5f9' : '#1e293b'};
            --text-secondary: ${theme === 'dark' ? '#cbd5e1' : '#64748b'};
            --border-color: ${theme === 'dark' ? '#334155' : '#e2e8f0'};
            --success-color: ${theme === 'dark' ? '#34d399' : '#10b981'};
            --warning-color: ${theme === 'dark' ? '#fbbf24' : '#f59e0b'};
            --error-color: ${theme === 'dark' ? '#f87171' : '#ef4444'};
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            background: var(--background-color);
            color: var(--text-primary);
            line-height: 1.6;
            ${options.responsive ? 'margin: 0; padding: 0;' : ''}
        }

        .container {
            max-width: ${options.responsive ? '100%' : '1200px'};
            margin: 0 auto;
            padding: ${options.responsive ? '10px' : '20px'};
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 20px;
        }

        .title {
            font-size: ${options.responsive ? 'clamp(1.5rem, 4vw, 2.5rem)' : '2.5rem'};
            font-weight: 700;
            color: var(--primary-color);
            margin-bottom: 10px;
        }

        .description {
            font-size: 1.1rem;
            color: var(--text-secondary);
            max-width: 600px;
            margin: 0 auto;
        }

        .chart-container {
            background: var(--surface-color);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            ${options.responsive ? 'overflow-x: auto;' : ''}
        }

        .chart-wrapper {
            ${options.responsive ? 'min-height: 300px; width: 100%;' : 'height: 400px;'}
        }

        .controls {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            margin-bottom: 20px;
            padding: 15px;
            background: var(--surface-color);
            border-radius: 8px;
            border: 1px solid var(--border-color);
        }

        .control-group {
            display: flex;
            flex-direction: column;
            min-width: 120px;
        }

        .control-label {
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 5px;
        }

        .control-select, .control-input {
            padding: 8px 12px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            background: var(--background-color);
            color: var(--text-primary);
            font-size: 0.875rem;
        }

        .insights-panel {
            background: var(--surface-color);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 30px;
        }

        .insights-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--primary-color);
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .insight-card {
            background: var(--background-color);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 15px;
            transition: all 0.2s ease;
        }

        .insight-card:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            border-color: var(--primary-color);
        }

        .insight-header {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 12px;
        }

        .insight-priority {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
        }

        .priority-critical {
            background: var(--error-color);
            color: white;
        }

        .priority-high {
            background: var(--warning-color);
            color: white;
        }

        .priority-medium {
            background: var(--warning-color);
            color: white;
            opacity: 0.8;
        }

        .priority-low {
            background: var(--success-color);
            color: white;
        }

        .insight-title-text {
            font-size: 1.1rem;
            font-weight: 600;
            color: var(--text-primary);
            flex: 1;
        }

        .insight-description {
            color: var(--text-secondary);
            line-height: 1.6;
            margin-bottom: 10px;
        }

        .insight-confidence {
            font-size: 0.875rem;
            color: var(--text-secondary);
            font-style: italic;
        }

        .data-table {
            background: var(--surface-color);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            overflow: hidden;
            margin-bottom: 30px;
        }

        .data-table-header {
            padding: 20px;
            border-bottom: 1px solid var(--border-color);
        }

        .data-table-title {
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--primary-color);
        }

        .table-wrapper {
            overflow-x: auto;
            max-height: 400px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid var(--border-color);
        }

        th {
            background: var(--primary-color);
            color: white;
            font-weight: 600;
            position: sticky;
            top: 0;
        }

        tr:hover {
            background: var(--surface-color);
        }

        .footer {
            text-align: center;
            padding: 20px;
            border-top: 1px solid var(--border-color);
            color: var(--text-secondary);
            font-size: 0.875rem;
        }

        .branding {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .fullscreen-btn {
            position: absolute;
            top: 15px;
            right: 15px;
            background: var(--primary-color);
            color: white;
            border: none;
            border-radius: 6px;
            padding: 8px 12px;
            cursor: pointer;
            font-size: 0.875rem;
            transition: all 0.2s ease;
        }

        .fullscreen-btn:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }

        .loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 300px;
            color: var(--text-secondary);
        }

        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid var(--border-color);
            border-top: 4px solid var(--primary-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 15px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }
            
            .controls {
                flex-direction: column;
            }
            
            .control-group {
                min-width: auto;
            }
            
            .insight-header {
                flex-direction: column;
                gap: 8px;
            }
        }

        @media (prefers-color-scheme: dark) {
            ${options.theme === 'auto' ? `
            :root {
                --primary-color: #60a5fa;
                --secondary-color: #94a3b8;
                --background-color: #0f172a;
                --surface-color: #1e293b;
                --text-primary: #f1f5f9;
                --text-secondary: #cbd5e1;
                --border-color: #334155;
                --success-color: #34d399;
                --warning-color: #fbbf24;
                --error-color: #f87171;
            }
            ` : ''}
        }

        ${options.customCSS || ''}
    `;
  }

  private static generateJavaScript(
    config: ChartConfig,
    data: Record<string, any>[],
    insights: InsightGenerationResult | null,
    options: HTMLWidgetOptions
  ): string {
    const chartData = JSON.stringify(data);
    const insightsData = JSON.stringify(insights);
    const configData = JSON.stringify(config);
    
    return `
        // Data and Configuration
        const chartData = ${chartData};
        const insights = ${insightsData};
        const config = ${configData};
        const options = ${JSON.stringify(options)};

        // Chart rendering functions
        function createChart(containerId, data, config) {
            const container = document.getElementById(containerId);
            if (!container) return;

            // Clear loading state
            container.innerHTML = '';

            try {
                switch (config.type) {
                    case 'bar':
                        createBarChart(container, data, config);
                        break;
                    case 'line':
                        createLineChart(container, data, config);
                        break;
                    case 'scatter':
                        createScatterChart(container, data, config);
                        break;
                    case 'pie':
                        createPieChart(container, data, config);
                        break;
                    default:
                        createBarChart(container, data, config); // Default fallback
                }
            } catch (error) {
                container.innerHTML = \`<div class="error">Error rendering chart: \${error.message}</div>\`;
            }
        }

        function createBarChart(container, data, config) {
            const processedData = data.map(row => ({
                name: String(row[config.fieldMapping.x] || ''),
                value: parseFloat(row[config.fieldMapping.y]) || 0
            })).filter(d => d.name && !isNaN(d.value));

            // Create SVG
            const svg = d3.select(container)
                .append('svg')
                .attr('width', '100%')
                .attr('height', 400)
                .attr('viewBox', \`0 0 800 400\`)
                .style('background', 'var(--background-color)');

            const margin = { top: 20, right: 30, left: 60, bottom: 80 };
            const width = 800 - margin.left - margin.right;
            const height = 400 - margin.top - margin.bottom;

            const g = svg.append('g')
                .attr('transform', \`translate(\${margin.left}, \${margin.top})\`);

            // Scales
            const xScale = d3.scaleBand()
                .domain(processedData.map(d => d.name))
                .range([0, width])
                .padding(0.1);

            const yScale = d3.scaleLinear()
                .domain([0, d3.max(processedData, d => d.value)])
                .nice()
                .range([height, 0]);

            // Bars
            g.selectAll('.bar')
                .data(processedData)
                .enter().append('rect')
                .attr('class', 'bar')
                .attr('x', d => xScale(d.name))
                .attr('width', xScale.bandwidth())
                .attr('y', height)
                .attr('height', 0)
                .attr('fill', 'var(--primary-color)')
                .attr('rx', 4)
                .transition()
                .duration(800)
                .attr('y', d => yScale(d.value))
                .attr('height', d => height - yScale(d.value));

            // X Axis
            g.append('g')
                .attr('transform', \`translate(0, \${height})\`)
                .call(d3.axisBottom(xScale))
                .selectAll('text')
                .attr('transform', 'rotate(-45)')
                .style('text-anchor', 'end')
                .style('fill', 'var(--text-primary)');

            // Y Axis
            g.append('g')
                .call(d3.axisLeft(yScale))
                .selectAll('text')
                .style('fill', 'var(--text-primary)');

            // Grid lines
            g.append('g')
                .attr('class', 'grid')
                .call(d3.axisLeft(yScale)
                    .tickSize(-width)
                    .tickFormat('')
                )
                .style('stroke-dasharray', '3,3')
                .style('opacity', 0.3);
        }

        function createLineChart(container, data, config) {
            const processedData = data.map(row => ({
                x: String(row[config.fieldMapping.x] || ''),
                y: parseFloat(row[config.fieldMapping.y]) || 0
            })).filter(d => d.x && !isNaN(d.y));

            const svg = d3.select(container)
                .append('svg')
                .attr('width', '100%')
                .attr('height', 400)
                .attr('viewBox', \`0 0 800 400\`)
                .style('background', 'var(--background-color)');

            const margin = { top: 20, right: 30, left: 60, bottom: 60 };
            const width = 800 - margin.left - margin.right;
            const height = 400 - margin.top - margin.bottom;

            const g = svg.append('g')
                .attr('transform', \`translate(\${margin.left}, \${margin.top})\`);

            // Scales
            const xScale = d3.scalePoint()
                .domain(processedData.map(d => d.x))
                .range([0, width]);

            const yScale = d3.scaleLinear()
                .domain(d3.extent(processedData, d => d.y))
                .nice()
                .range([height, 0]);

            // Line
            const line = d3.line()
                .x(d => xScale(d.x))
                .y(d => yScale(d.y))
                .curve(d3.curveMonotoneX);

            const path = g.append('path')
                .datum(processedData)
                .attr('fill', 'none')
                .attr('stroke', 'var(--primary-color)')
                .attr('stroke-width', 3)
                .attr('d', line);

            // Animate the line
            const totalLength = path.node().getTotalLength();
            path
                .attr('stroke-dasharray', totalLength + ' ' + totalLength)
                .attr('stroke-dashoffset', totalLength)
                .transition()
                .duration(1200)
                .attr('stroke-dashoffset', 0);

            // Points
            g.selectAll('.point')
                .data(processedData)
                .enter().append('circle')
                .attr('class', 'point')
                .attr('cx', d => xScale(d.x))
                .attr('cy', d => yScale(d.y))
                .attr('r', 0)
                .attr('fill', 'var(--primary-color)')
                .transition()
                .delay(800)
                .duration(400)
                .attr('r', 4);

            // Axes
            g.append('g')
                .attr('transform', \`translate(0, \${height})\`)
                .call(d3.axisBottom(xScale))
                .selectAll('text')
                .style('fill', 'var(--text-primary)');

            g.append('g')
                .call(d3.axisLeft(yScale))
                .selectAll('text')
                .style('fill', 'var(--text-primary)');
        }

        function createScatterChart(container, data, config) {
            const processedData = data.map(row => ({
                x: parseFloat(row[config.fieldMapping.x]) || 0,
                y: parseFloat(row[config.fieldMapping.y]) || 0
            })).filter(d => !isNaN(d.x) && !isNaN(d.y));

            const svg = d3.select(container)
                .append('svg')
                .attr('width', '100%')
                .attr('height', 400)
                .attr('viewBox', \`0 0 800 400\`)
                .style('background', 'var(--background-color)');

            const margin = { top: 20, right: 30, left: 60, bottom: 60 };
            const width = 800 - margin.left - margin.right;
            const height = 400 - margin.top - margin.bottom;

            const g = svg.append('g')
                .attr('transform', \`translate(\${margin.left}, \${margin.top})\`);

            // Scales
            const xScale = d3.scaleLinear()
                .domain(d3.extent(processedData, d => d.x))
                .nice()
                .range([0, width]);

            const yScale = d3.scaleLinear()
                .domain(d3.extent(processedData, d => d.y))
                .nice()
                .range([height, 0]);

            // Points
            g.selectAll('.point')
                .data(processedData)
                .enter().append('circle')
                .attr('class', 'point')
                .attr('cx', d => xScale(d.x))
                .attr('cy', d => yScale(d.y))
                .attr('r', 0)
                .attr('fill', 'var(--primary-color)')
                .attr('opacity', 0.7)
                .transition()
                .duration(800)
                .attr('r', 5);

            // Axes
            g.append('g')
                .attr('transform', \`translate(0, \${height})\`)
                .call(d3.axisBottom(xScale))
                .selectAll('text')
                .style('fill', 'var(--text-primary)');

            g.append('g')
                .call(d3.axisLeft(yScale))
                .selectAll('text')
                .style('fill', 'var(--text-primary)');
        }

        function createPieChart(container, data, config) {
            const processedData = data.map(row => ({
                name: String(row[config.fieldMapping.category] || ''),
                value: parseFloat(row[config.fieldMapping.value]) || 0
            })).filter(d => d.name && d.value > 0);

            const svg = d3.select(container)
                .append('svg')
                .attr('width', '100%')
                .attr('height', 400)
                .attr('viewBox', \`0 0 800 400\`)
                .style('background', 'var(--background-color)');

            const width = 800;
            const height = 400;
            const radius = Math.min(width, height) / 2 - 40;

            const g = svg.append('g')
                .attr('transform', \`translate(\${width/2}, \${height/2})\`);

            const color = d3.scaleOrdinal(d3.schemeCategory10);

            const pie = d3.pie()
                .value(d => d.value);

            const arc = d3.arc()
                .innerRadius(0)
                .outerRadius(radius);

            const arcs = g.selectAll('.arc')
                .data(pie(processedData))
                .enter().append('g')
                .attr('class', 'arc');

            arcs.append('path')
                .attr('d', arc)
                .attr('fill', (d, i) => color(i))
                .attr('opacity', 0)
                .transition()
                .duration(800)
                .attr('opacity', 0.8);

            arcs.append('text')
                .attr('transform', d => \`translate(\${arc.centroid(d)})\`)
                .attr('dy', '.35em')
                .style('text-anchor', 'middle')
                .style('fill', 'var(--text-primary)')
                .style('font-size', '12px')
                .text(d => d.data.name);
        }

        function renderApp() {
            const app = document.getElementById('app');
            const title = options.title || config.title || 'DataSnap Chart';
            const description = options.description || config.description || '';

            app.innerHTML = \`
                <div class="container">
                    \${options.enableFullscreen ? '<button class="fullscreen-btn" onclick="toggleFullscreen()">⛶ Fullscreen</button>' : ''}
                    
                    <div class="header">
                        <h1 class="title">\${escapeHtml(title)}</h1>
                        \${description ? \`<p class="description">\${escapeHtml(description)}</p>\` : ''}
                    </div>

                    \${options.includeControls ? \`
                    <div class="controls">
                        <div class="control-group">
                            <label class="control-label">Chart Type</label>
                            <select class="control-select" onchange="updateChart(this.value)">
                                <option value="bar" \${config.type === 'bar' ? 'selected' : ''}>Bar Chart</option>
                                <option value="line" \${config.type === 'line' ? 'selected' : ''}>Line Chart</option>
                                <option value="scatter" \${config.type === 'scatter' ? 'selected' : ''}>Scatter Plot</option>
                                <option value="pie" \${config.type === 'pie' ? 'selected' : ''}>Pie Chart</option>
                            </select>
                        </div>
                    </div>
                    \` : ''}

                    <div class="chart-container">
                        <div class="chart-wrapper">
                            <div id="chart"></div>
                        </div>
                    </div>

                    \${options.includeInsights && insights && insights.insights.length > 0 ? \`
                    <div class="insights-panel">
                        <h2 class="insights-title">
                            🧠 AI-Powered Insights
                            <span style="font-size: 0.8em; color: var(--text-secondary);">(\${Math.round(insights.confidence * 100)}% confidence)</span>
                        </h2>
                        \${insights.insights.slice(0, 5).map(insight => \`
                            <div class="insight-card">
                                <div class="insight-header">
                                    <span class="insight-priority priority-\${insight.priority}">\${insight.priority}</span>
                                    <span class="insight-title-text">\${escapeHtml(insight.title)}</span>
                                </div>
                                <p class="insight-description">\${escapeHtml(insight.description)}</p>
                                <p class="insight-confidence">Confidence: \${Math.round(insight.confidence * 100)}%</p>
                            </div>
                        \`).join('')}
                    </div>
                    \` : ''}

                    \${options.includeDataTable ? \`
                    <div class="data-table">
                        <div class="data-table-header">
                            <h3 class="data-table-title">Data Sample (First 50 rows)</h3>
                        </div>
                        <div class="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        \${Object.keys(chartData[0] || {}).map(key => \`<th>\${escapeHtml(key)}</th>\`).join('')}
                                    </tr>
                                </thead>
                                <tbody>
                                    \${chartData.slice(0, 50).map(row => \`
                                        <tr>
                                            \${Object.values(row).map(value => \`<td>\${escapeHtml(String(value || ''))}</td>\`).join('')}
                                        </tr>
                                    \`).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    \` : ''}

                    \${options.showBranding !== false ? \`
                    <div class="footer">
                        <div class="branding">
                            <span>📊</span>
                            <span>Generated with DataSnap AI Analytics Platform</span>
                        </div>
                    </div>
                    \` : ''}
                </div>
            \`;

            // Render the chart
            createChart('chart', chartData, config);
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function updateChart(newType) {
            const newConfig = { ...config, type: newType };
            createChart('chart', chartData, newConfig);
        }

        function toggleFullscreen() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        }

        // Initialize the app
        document.addEventListener('DOMContentLoaded', renderApp);
    `;
  }

  private static escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private static generateFilename(config: ChartConfig): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const title = config.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .substring(0, 30);
    
    return `${title}-interactive-widget-${timestamp}.html`;
  }
}
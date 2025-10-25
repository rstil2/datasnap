import React, { useState, useCallback } from 'react';
import { ChartConfig } from '../../types/VisualizationTypes';
import { LazyChartBuilder } from '../visualization/LazyChartBuilder';
import { IntersectionLazyLoader, LazyChart } from '../lazy/LazyLoader';
import LazyDashboard, { DashboardConfig } from '../dashboard/LazyDashboard';
import { useLazyChart, useLazyChartManager } from '../../hooks/useLazyChart';
import '../lazy/LazyChartBuilder.css';

// Sample data for demonstration
const sampleData = [
  { date: '2024-01-01', sales: 1200, region: 'North', category: 'Electronics', profit: 240 },
  { date: '2024-01-02', sales: 1500, region: 'South', category: 'Electronics', profit: 300 },
  { date: '2024-01-03', sales: 980, region: 'East', category: 'Books', profit: 196 },
  { date: '2024-01-04', sales: 2200, region: 'West', category: 'Electronics', profit: 440 },
  { date: '2024-01-05', sales: 1800, region: 'North', category: 'Clothing', profit: 360 },
  { date: '2024-01-06', sales: 1350, region: 'South', category: 'Books', profit: 270 },
  { date: '2024-01-07', sales: 1900, region: 'East', category: 'Electronics', profit: 380 },
  { date: '2024-01-08', sales: 1650, region: 'West', category: 'Clothing', profit: 330 },
  { date: '2024-01-09', sales: 2100, region: 'North', category: 'Electronics', profit: 420 },
  { date: '2024-01-10', sales: 1750, region: 'South', category: 'Clothing', profit: 350 }
];

export const LazyVisualizationExample: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'builder' | 'dashboard' | 'individual'>('builder');
  const [chartConfig, setChartConfig] = useState<ChartConfig | null>(null);

  const handleConfigChange = useCallback((config: ChartConfig) => {
    setChartConfig(config);
    console.log('Chart configuration changed:', config);
  }, []);

  return (
    <div className="lazy-visualization-example">
      <div className="example-header">
        <h1>Lazy Loading Visualization System</h1>
        <p>Demonstrating integration with existing DataSnap chart components</p>
        
        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-button ${activeTab === 'builder' ? 'active' : ''}`}
            onClick={() => setActiveTab('builder')}
          >
            Chart Builder
          </button>
          <button
            className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`tab-button ${activeTab === 'individual' ? 'active' : ''}`}
            onClick={() => setActiveTab('individual')}
          >
            Individual Charts
          </button>
        </div>
      </div>

      <div className="example-content">
        {activeTab === 'builder' && (
          <LazyChartBuilderDemo onConfigChange={handleConfigChange} />
        )}
        
        {activeTab === 'dashboard' && (
          <LazyDashboardDemo />
        )}
        
        {activeTab === 'individual' && (
          <IndividualChartsDemo />
        )}
      </div>

      {/* Configuration Display */}
      {chartConfig && activeTab === 'builder' && (
        <div className="config-display">
          <h3>Current Configuration:</h3>
          <pre>{JSON.stringify(chartConfig, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

// Chart Builder Demo Component
const LazyChartBuilderDemo: React.FC<{ onConfigChange: (config: ChartConfig) => void }> = ({ onConfigChange }) => {
  return (
    <div className="demo-section">
      <h2>Interactive Chart Builder</h2>
      <p>Build charts with lazy loading and performance monitoring</p>
      
      <div className="chart-builder-wrapper">
        <LazyChartBuilder 
          data={sampleData}
          onConfigChange={onConfigChange}
        />
      </div>
    </div>
  );
};

// Dashboard Demo Component
const LazyDashboardDemo: React.FC = () => {
  const dashboardConfigs: DashboardConfig[] = [
    {
      id: 'sales-trend',
      title: 'Sales Trend',
      chartType: 'line',
      priority: 10,
      size: 'large',
      data: sampleData,
      config: {
        fieldMapping: { x: 'date', y: 'sales' }
      }
    },
    {
      id: 'region-distribution',
      title: 'Region Distribution',
      chartType: 'pie',
      priority: 8,
      size: 'medium',
      data: sampleData,
      config: {
        fieldMapping: { category: 'region', value: 'sales' }
      }
    },
    {
      id: 'category-performance',
      title: 'Category Performance',
      chartType: 'bar',
      priority: 6,
      size: 'medium',
      data: sampleData,
      config: {
        fieldMapping: { x: 'category', y: 'sales' }
      }
    },
    {
      id: 'profit-analysis',
      title: 'Profit Analysis',
      chartType: 'area',
      priority: 4,
      size: 'small',
      data: sampleData,
      config: {
        fieldMapping: { x: 'date', y: 'profit' }
      }
    }
  ];

  const handleChartLoad = useCallback((chartId: string) => {
    console.log(`Dashboard chart loaded: ${chartId}`);
  }, []);

  const handleChartError = useCallback((error: Error, chartId: string) => {
    console.error(`Dashboard chart error in ${chartId}:`, error);
  }, []);

  return (
    <div className="demo-section">
      <h2>Lazy Loading Dashboard</h2>
      <p>Dashboard with intersection-based loading and performance metrics</p>
      
      <LazyDashboard
        configs={dashboardConfigs}
        layout="grid"
        loadingStrategy="intersection"
        batchSize={2}
        showPerformanceMetrics={true}
        onChartLoad={handleChartLoad}
        onError={handleChartError}
        className="dashboard-demo"
      />
    </div>
  );
};

// Individual Charts Demo Component
const IndividualChartsDemo: React.FC = () => {
  const chartManager = useLazyChartManager(['line', 'bar', 'pie']);
  
  const lineChartState = useLazyChart('line', {
    preload: false,
    onLoad: () => console.log('Line chart loaded!'),
    onError: (error) => console.error('Line chart error:', error)
  });

  return (
    <div className="demo-section">
      <h2>Individual Chart Components</h2>
      <p>Demonstrating different lazy loading patterns</p>

      <div className="charts-grid">
        {/* Manual Load Chart */}
        <div className="chart-card">
          <h3>Manual Load Chart</h3>
          <p>Click to load when needed</p>
          
          <LazyChart
            chartType="line"
            data={sampleData}
            config={{
              type: 'line',
              title: 'Sales Trend',
              fieldMapping: { x: 'date', y: 'sales' },
              styling: {
                colors: { scheme: 'category10' },
                layout: { width: 400, height: 300, margin: { top: 20, right: 20, bottom: 40, left: 40 } },
                axes: {
                  x: { show: true, grid: false, fontSize: 10, color: '#666', scale: 'time', domain: 'auto' },
                  y: { show: true, grid: true, fontSize: 10, color: '#666', scale: 'linear', domain: 'auto' }
                },
                legend: { show: false, position: 'right', direction: 'column', anchor: 'start', translateX: 0, translateY: 0, itemWidth: 100, itemHeight: 20, symbolSize: 12, fontSize: 10 },
                theme: 'light'
              }
            }}
            preload={false}
          />
        </div>

        {/* Intersection Load Chart */}
        <div className="chart-card">
          <h3>Intersection Load Chart</h3>
          <p>Loads when scrolled into view</p>
          
          <IntersectionLazyLoader
            component={() => import('../visualization/charts/BarChart').then(m => ({ default: m.BarChart }))}
            props={{
              data: sampleData,
              config: {
                type: 'bar',
                title: 'Regional Sales',
                fieldMapping: { x: 'region', y: 'sales' },
                styling: {
                  colors: { scheme: 'category10' },
                  layout: { width: 400, height: 300, margin: { top: 20, right: 20, bottom: 40, left: 40 } },
                  axes: {
                    x: { show: true, grid: false, fontSize: 10, color: '#666', scale: 'band', domain: 'auto' },
                    y: { show: true, grid: true, fontSize: 10, color: '#666', scale: 'linear', domain: 'auto' }
                  },
                  legend: { show: false, position: 'right', direction: 'column', anchor: 'start', translateX: 0, translateY: 0, itemWidth: 100, itemHeight: 20, symbolSize: 12, fontSize: 10 },
                  theme: 'light'
                }
              }
            }}
            threshold={0.1}
            rootMargin="50px"
            className="intersection-chart"
          />
        </div>

        {/* Hook-based Chart */}
        <div className="chart-card">
          <h3>Hook-based Chart</h3>
          <p>Using useLazyChart hook</p>
          
          <div className="hook-chart-container">
            {lineChartState.error ? (
              <div className="error-state">
                <p>Error loading chart: {lineChartState.error.message}</p>
                <button onClick={() => (lineChartState as any).load?.()}>Retry</button>
              </div>
            ) : lineChartState.isLoading ? (
              <div className="loading-state">
                <div className="spinner">⏳</div>
                <p>Loading chart...</p>
              </div>
            ) : lineChartState.component ? (
              <lineChartState.component
                data={sampleData}
                config={{
                  type: 'line',
                  title: 'Profit Trend',
                  fieldMapping: { x: 'date', y: 'profit' },
                  styling: {
                    colors: { scheme: 'category10' },
                    layout: { width: 400, height: 300, margin: { top: 20, right: 20, bottom: 40, left: 40 } },
                    axes: {
                      x: { show: true, grid: false, fontSize: 10, color: '#666', scale: 'time', domain: 'auto' },
                      y: { show: true, grid: true, fontSize: 10, color: '#666', scale: 'linear', domain: 'auto' }
                    },
                    legend: { show: false, position: 'right', direction: 'column', anchor: 'start', translateX: 0, translateY: 0, itemWidth: 100, itemHeight: 20, symbolSize: 12, fontSize: 10 },
                    theme: 'light'
                  }
                }}
              />
            ) : (
              <button onClick={() => (lineChartState as any).load?.()}>Load Chart</button>
            )}
          </div>
        </div>

        {/* Chart Manager Status */}
        <div className="chart-card">
          <h3>Chart Manager Status</h3>
          <div className="manager-status">
            <p><strong>Loaded:</strong> {chartManager.loadedCharts.length}</p>
            <p><strong>Loading:</strong> {chartManager.loadingCharts.length}</p>
            <p><strong>Failed:</strong> {chartManager.failedCharts.length}</p>
            <p><strong>Progress:</strong> {(chartManager.loadProgress * 100).toFixed(0)}%</p>
            
            <div className="manager-actions">
              <button onClick={() => chartManager.preloadCharts('low')}>
                Preload Low Priority
              </button>
              <button onClick={() => chartManager.preloadCharts('high')}>
                Preload All
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Additional CSS for the example component
const exampleStyles = `
.lazy-visualization-example {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.example-header {
  text-align: center;
  margin-bottom: 2rem;
}

.example-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text-primary, #333);
  margin: 0 0 1rem 0;
}

.example-header p {
  font-size: 1.125rem;
  color: var(--text-secondary, #666);
  margin: 0 0 2rem 0;
}

.tab-navigation {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.tab-button {
  padding: 0.75rem 1.5rem;
  border: 1px solid var(--border-primary, #e2e8f0);
  background: var(--bg-primary, #fff);
  color: var(--text-secondary, #666);
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.tab-button:hover {
  background: var(--bg-hover, #f7fafc);
  border-color: var(--accent-primary, #3182ce);
}

.tab-button.active {
  background: var(--accent-primary, #3182ce);
  color: white;
  border-color: var(--accent-primary, #3182ce);
}

.demo-section {
  margin-bottom: 3rem;
}

.demo-section h2 {
  font-size: 1.875rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
}

.demo-section p {
  color: var(--text-secondary, #666);
  margin: 0 0 2rem 0;
}

.chart-builder-wrapper {
  border: 1px solid var(--border-primary, #e2e8f0);
  border-radius: 1rem;
  overflow: hidden;
  min-height: 600px;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 2rem;
}

.chart-card {
  background: var(--bg-elevated, #fff);
  border: 1px solid var(--border-primary, #e2e8f0);
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.chart-card h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
}

.chart-card p {
  color: var(--text-secondary, #666);
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
}

.hook-chart-container {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-state, .loading-state {
  text-align: center;
  color: var(--text-secondary, #666);
}

.error-state button {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: var(--accent-primary, #3182ce);
  color: white;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
}

.spinner {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.manager-status {
  font-size: 0.875rem;
}

.manager-status p {
  margin: 0.5rem 0;
  display: flex;
  justify-content: space-between;
}

.manager-actions {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.manager-actions button {
  padding: 0.5rem 0.75rem;
  background: var(--bg-secondary, #f8fafc);
  border: 1px solid var(--border-primary, #e2e8f0);
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.8125rem;
}

.manager-actions button:hover {
  background: var(--bg-hover, #f1f5f9);
}

.config-display {
  margin-top: 2rem;
  background: var(--bg-secondary, #f8fafc);
  border: 1px solid var(--border-primary, #e2e8f0);
  border-radius: 0.75rem;
  padding: 1.5rem;
}

.config-display h3 {
  margin: 0 0 1rem 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.config-display pre {
  background: var(--bg-primary, #fff);
  border: 1px solid var(--border-secondary, #f1f5f9);
  border-radius: 0.5rem;
  padding: 1rem;
  font-size: 0.75rem;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

@media (max-width: 768px) {
  .lazy-visualization-example {
    padding: 1rem;
  }
  
  .tab-navigation {
    flex-wrap: wrap;
  }
  
  .charts-grid {
    grid-template-columns: 1fr;
  }
  
  .chart-builder-wrapper {
    min-height: 500px;
  }
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = exampleStyles;
  document.head.appendChild(styleElement);
}

export default LazyVisualizationExample;
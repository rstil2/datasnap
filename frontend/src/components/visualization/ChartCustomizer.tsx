import React, { useState } from 'react';
import { ChartStyling, ColorScheme, ChartConfig } from '../../types/VisualizationTypes';
import { 
  Palette, 
  Settings, 
  Type, 
  Grid3X3, 
  Eye, 
  Layers, 
  RotateCcw,
  Sliders,
  Image,
  MousePointer
} from 'lucide-react';

interface ChartCustomizerProps {
  config: ChartConfig;
  onConfigChange: (config: ChartConfig) => void;
}

interface StyleTab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const STYLE_TABS: StyleTab[] = [
  { id: 'colors', label: 'Colors', icon: <Palette size={16} /> },
  { id: 'layout', label: 'Layout', icon: <Grid3X3 size={16} /> },
  { id: 'axes', label: 'Axes', icon: <Sliders size={16} /> },
  { id: 'legend', label: 'Legend', icon: <Layers size={16} /> },
  { id: 'animation', label: 'Animation', icon: <MousePointer size={16} /> },
];

const COLOR_SCHEMES: { scheme: ColorScheme; name: string; colors: string[] }[] = [
  {
    scheme: 'category10',
    name: 'Category 10',
    colors: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf']
  },
  {
    scheme: 'tableau10',
    name: 'Tableau',
    colors: ['#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f', '#edc949', '#af7aa1', '#ff9d9a', '#9c755f', '#bab0ab']
  },
  {
    scheme: 'set1',
    name: 'Set 1',
    colors: ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#ffff33', '#a65628', '#f781bf', '#999999']
  },
  {
    scheme: 'blues',
    name: 'Blues',
    colors: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b']
  },
  {
    scheme: 'reds',
    name: 'Reds',
    colors: ['#fff5f0', '#fee0d2', '#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#a50f15', '#67000d']
  },
  {
    scheme: 'greens',
    name: 'Greens',
    colors: ['#f7fcf5', '#e5f5e0', '#c7e9c0', '#a1d99b', '#74c476', '#41ab5d', '#238b45', '#006d2c', '#00441b']
  },
  {
    scheme: 'viridis',
    name: 'Viridis',
    colors: ['#440154', '#482777', '#3f4a8a', '#31678e', '#26838f', '#1f9d8a', '#6cce5a', '#b6de2b', '#fee825']
  },
];

export function ChartCustomizer({ config, onConfigChange }: ChartCustomizerProps) {
  const [activeTab, setActiveTab] = useState<string>('colors');

  const updateStyling = (updates: Partial<ChartStyling>) => {
    onConfigChange({
      ...config,
      styling: {
        ...config.styling,
        ...updates,
      },
    });
  };

  const updateConfig = (updates: Partial<ChartConfig>) => {
    onConfigChange({
      ...config,
      ...updates,
    });
  };

  const renderColorsTab = () => (
    <div style={{ padding: 'var(--space-md)' }}>
      <h4 style={{ 
        fontSize: '0.875rem', 
        fontWeight: '600', 
        marginBottom: 'var(--space-md)',
        color: 'var(--text-primary)'
      }}>
        Color Schemes
      </h4>
      
      <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
        {COLOR_SCHEMES.map((colorScheme) => (
          <button
            key={colorScheme.scheme}
            onClick={() => updateStyling({ 
              colors: { 
                scheme: colorScheme.scheme,
                customColors: config.styling.colors.customColors 
              }
            })}
            style={{
              padding: 'var(--space-sm)',
              border: `2px solid ${config.styling.colors.scheme === colorScheme.scheme ? 'var(--accent-primary)' : 'var(--border-primary)'}`,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: 'var(--space-xs)'
            }}>
              <span style={{ 
                fontSize: '0.875rem', 
                fontWeight: '500',
                color: 'var(--text-primary)'
              }}>
                {colorScheme.name}
              </span>
              {config.styling.colors.scheme === colorScheme.scheme && (
                <div style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: 'var(--accent-primary)' 
                }} />
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '2px' }}>
              {colorScheme.colors.slice(0, 8).map((color, index) => (
                <div
                  key={index}
                  style={{
                    width: '16px',
                    height: '12px',
                    backgroundColor: color,
                    borderRadius: '2px',
                  }}
                />
              ))}
            </div>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 'var(--space-lg)' }}>
        <h4 style={{ 
          fontSize: '0.875rem', 
          fontWeight: '600', 
          marginBottom: 'var(--space-sm)',
          color: 'var(--text-primary)'
        }}>
          Theme
        </h4>
        
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          {(['light', 'dark'] as const).map((theme) => (
            <button
              key={theme}
              onClick={() => updateStyling({ theme })}
              style={{
                flex: 1,
                padding: 'var(--space-sm)',
                border: `2px solid ${config.styling.theme === theme ? 'var(--accent-primary)' : 'var(--border-primary)'}`,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-elevated)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'var(--text-primary)',
                textTransform: 'capitalize',
                transition: 'all 0.2s ease',
              }}
            >
              {theme}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderLayoutTab = () => (
    <div style={{ padding: 'var(--space-md)' }}>
      <h4 style={{ 
        fontSize: '0.875rem', 
        fontWeight: '600', 
        marginBottom: 'var(--space-md)',
        color: 'var(--text-primary)'
      }}>
        Chart Dimensions
      </h4>
      
      <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
        <div>
          <label style={{ 
            display: 'block', 
            fontSize: '0.875rem', 
            fontWeight: '500',
            marginBottom: 'var(--space-xs)',
            color: 'var(--text-primary)'
          }}>
            Width
          </label>
          <input
            type="range"
            min="400"
            max="1200"
            step="50"
            value={config.styling.layout.width}
            onChange={(e) => updateStyling({ 
              layout: { 
                ...config.styling.layout, 
                width: parseInt(e.target.value) 
              }
            })}
            style={{ width: '100%' }}
          />
          <div style={{ 
            fontSize: '0.75rem', 
            color: 'var(--text-secondary)',
            textAlign: 'center',
            marginTop: '2px'
          }}>
            {config.styling.layout.width}px
          </div>
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            fontSize: '0.875rem', 
            fontWeight: '500',
            marginBottom: 'var(--space-xs)',
            color: 'var(--text-primary)'
          }}>
            Height
          </label>
          <input
            type="range"
            min="200"
            max="800"
            step="25"
            value={config.styling.layout.height}
            onChange={(e) => updateStyling({ 
              layout: { 
                ...config.styling.layout, 
                height: parseInt(e.target.value) 
              }
            })}
            style={{ width: '100%' }}
          />
          <div style={{ 
            fontSize: '0.75rem', 
            color: 'var(--text-secondary)',
            textAlign: 'center',
            marginTop: '2px'
          }}>
            {config.styling.layout.height}px
          </div>
        </div>
      </div>

      <h4 style={{ 
        fontSize: '0.875rem', 
        fontWeight: '600', 
        margin: 'var(--space-lg) 0 var(--space-md)',
        color: 'var(--text-primary)'
      }}>
        Margins
      </h4>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
        {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
          <div key={side}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '500',
              marginBottom: 'var(--space-xs)',
              color: 'var(--text-primary)',
              textTransform: 'capitalize'
            }}>
              {side}
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={config.styling.layout.margin[side]}
              onChange={(e) => updateStyling({ 
                layout: { 
                  ...config.styling.layout, 
                  margin: {
                    ...config.styling.layout.margin,
                    [side]: parseInt(e.target.value) || 0
                  }
                }
              })}
              style={{
                width: '100%',
                padding: 'var(--space-xs)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem'
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );

  const renderAxesTab = () => (
    <div style={{ padding: 'var(--space-md)' }}>
      {(['x', 'y'] as const).map((axis) => (
        <div key={axis} style={{ marginBottom: 'var(--space-lg)' }}>
          <h4 style={{ 
            fontSize: '0.875rem', 
            fontWeight: '600', 
            marginBottom: 'var(--space-md)',
            color: 'var(--text-primary)',
            textTransform: 'uppercase'
          }}>
            {axis} Axis
          </h4>
          
          <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <input
                type="checkbox"
                id={`${axis}-show`}
                checked={config.styling.axes[axis].show}
                onChange={(e) => updateStyling({
                  axes: {
                    ...config.styling.axes,
                    [axis]: {
                      ...config.styling.axes[axis],
                      show: e.target.checked
                    }
                  }
                })}
              />
              <label htmlFor={`${axis}-show`} style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                Show Axis
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <input
                type="checkbox"
                id={`${axis}-grid`}
                checked={config.styling.axes[axis].grid}
                onChange={(e) => updateStyling({
                  axes: {
                    ...config.styling.axes,
                    [axis]: {
                      ...config.styling.axes[axis],
                      grid: e.target.checked
                    }
                  }
                })}
              />
              <label htmlFor={`${axis}-grid`} style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                Show Grid
              </label>
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                fontWeight: '500',
                marginBottom: 'var(--space-xs)',
                color: 'var(--text-primary)'
              }}>
                Label
              </label>
              <input
                type="text"
                value={config.styling.axes[axis].label || ''}
                onChange={(e) => updateStyling({
                  axes: {
                    ...config.styling.axes,
                    [axis]: {
                      ...config.styling.axes[axis],
                      label: e.target.value
                    }
                  }
                })}
                placeholder={`${axis.toUpperCase()} Axis Label`}
                style={{
                  width: '100%',
                  padding: 'var(--space-sm)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                fontWeight: '500',
                marginBottom: 'var(--space-xs)',
                color: 'var(--text-primary)'
              }}>
                Font Size
              </label>
              <input
                type="range"
                min="8"
                max="20"
                value={config.styling.axes[axis].fontSize}
                onChange={(e) => updateStyling({
                  axes: {
                    ...config.styling.axes,
                    [axis]: {
                      ...config.styling.axes[axis],
                      fontSize: parseInt(e.target.value)
                    }
                  }
                })}
                style={{ width: '100%' }}
              />
              <div style={{ 
                fontSize: '0.75rem', 
                color: 'var(--text-secondary)',
                textAlign: 'center',
                marginTop: '2px'
              }}>
                {config.styling.axes[axis].fontSize}px
              </div>
            </div>

            {axis === 'x' && (
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500',
                  marginBottom: 'var(--space-xs)',
                  color: 'var(--text-primary)'
                }}>
                  Label Rotation
                </label>
                <input
                  type="range"
                  min="-90"
                  max="90"
                  step="15"
                  value={config.styling.axes[axis].labelAngle || 0}
                  onChange={(e) => updateStyling({
                    axes: {
                      ...config.styling.axes,
                      [axis]: {
                        ...config.styling.axes[axis],
                        labelAngle: parseInt(e.target.value)
                      }
                    }
                  })}
                  style={{ width: '100%' }}
                />
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: 'var(--text-secondary)',
                  textAlign: 'center',
                  marginTop: '2px'
                }}>
                  {config.styling.axes[axis].labelAngle || 0}°
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderLegendTab = () => (
    <div style={{ padding: 'var(--space-md)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
        <input
          type="checkbox"
          id="legend-show"
          checked={config.styling.legend.show}
          onChange={(e) => updateStyling({
            legend: {
              ...config.styling.legend,
              show: e.target.checked
            }
          })}
        />
        <label htmlFor="legend-show" style={{ 
          fontSize: '0.875rem', 
          fontWeight: '600',
          color: 'var(--text-primary)' 
        }}>
          Show Legend
        </label>
      </div>

      {config.styling.legend.show && (
        <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '500',
              marginBottom: 'var(--space-xs)',
              color: 'var(--text-primary)'
            }}>
              Position
            </label>
            <select
              value={config.styling.legend.position}
              onChange={(e) => updateStyling({
                legend: {
                  ...config.styling.legend,
                  position: e.target.value as any
                }
              })}
              style={{
                width: '100%',
                padding: 'var(--space-sm)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem'
              }}
            >
              <option value="top">Top</option>
              <option value="right">Right</option>
              <option value="bottom">Bottom</option>
              <option value="left">Left</option>
            </select>
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '500',
              marginBottom: 'var(--space-xs)',
              color: 'var(--text-primary)'
            }}>
              Direction
            </label>
            <select
              value={config.styling.legend.direction}
              onChange={(e) => updateStyling({
                legend: {
                  ...config.styling.legend,
                  direction: e.target.value as 'row' | 'column'
                }
              })}
              style={{
                width: '100%',
                padding: 'var(--space-sm)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem'
              }}
            >
              <option value="row">Row</option>
              <option value="column">Column</option>
            </select>
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '500',
              marginBottom: 'var(--space-xs)',
              color: 'var(--text-primary)'
            }}>
              Font Size
            </label>
            <input
              type="range"
              min="8"
              max="16"
              value={config.styling.legend.fontSize}
              onChange={(e) => updateStyling({
                legend: {
                  ...config.styling.legend,
                  fontSize: parseInt(e.target.value)
                }
              })}
              style={{ width: '100%' }}
            />
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--text-secondary)',
              textAlign: 'center',
              marginTop: '2px'
            }}>
              {config.styling.legend.fontSize}px
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderAnimationTab = () => (
    <div style={{ padding: 'var(--space-md)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
        <input
          type="checkbox"
          id="animation-enabled"
          checked={config.animation?.enabled !== false}
          onChange={(e) => updateConfig({
            animation: {
              ...config.animation,
              enabled: e.target.checked,
              duration: config.animation?.duration || 300,
              easing: config.animation?.easing || 'easeInOut'
            }
          })}
        />
        <label htmlFor="animation-enabled" style={{ 
          fontSize: '0.875rem', 
          fontWeight: '600',
          color: 'var(--text-primary)' 
        }}>
          Enable Animations
        </label>
      </div>

      {config.animation?.enabled !== false && (
        <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '500',
              marginBottom: 'var(--space-xs)',
              color: 'var(--text-primary)'
            }}>
              Duration
            </label>
            <input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={config.animation?.duration || 300}
              onChange={(e) => updateConfig({
                animation: {
                  ...config.animation,
                  enabled: config.animation?.enabled !== false,
                  duration: parseInt(e.target.value),
                  easing: config.animation?.easing || 'easeInOut'
                }
              })}
              style={{ width: '100%' }}
            />
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--text-secondary)',
              textAlign: 'center',
              marginTop: '2px'
            }}>
              {config.animation?.duration || 300}ms
            </div>
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '500',
              marginBottom: 'var(--space-xs)',
              color: 'var(--text-primary)'
            }}>
              Easing
            </label>
            <select
              value={config.animation?.easing || 'easeInOut'}
              onChange={(e) => updateConfig({
                animation: {
                  ...config.animation,
                  enabled: config.animation?.enabled !== false,
                  duration: config.animation?.duration || 300,
                  easing: e.target.value as any
                }
              })}
              style={{
                width: '100%',
                padding: 'var(--space-sm)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem'
              }}
            >
              <option value="linear">Linear</option>
              <option value="ease">Ease</option>
              <option value="easeIn">Ease In</option>
              <option value="easeOut">Ease Out</option>
              <option value="easeInOut">Ease In Out</option>
              <option value="bounce">Bounce</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'colors': return renderColorsTab();
      case 'layout': return renderLayoutTab();
      case 'axes': return renderAxesTab();
      case 'legend': return renderLegendTab();
      case 'animation': return renderAnimationTab();
      default: return renderColorsTab();
    }
  };

  return (
    <div className="card" style={{ height: 'fit-content' }}>
      <div className="card-header">
        <h3 className="card-title" style={{ fontSize: '1rem' }}>
          <Settings size={16} style={{ marginRight: 'var(--space-xs)' }} />
          Customize Chart
        </h3>
      </div>
      
      {/* Tab Navigation */}
      <div style={{ 
        borderBottom: '1px solid var(--border-primary)',
        display: 'flex',
        overflow: 'auto'
      }}>
        {STYLE_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: 'var(--space-sm) var(--space-md)',
              border: 'none',
              background: activeTab === tab.id ? 'var(--bg-elevated)' : 'transparent',
              color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-xs)',
              borderBottom: `2px solid ${activeTab === tab.id ? 'var(--accent-primary)' : 'transparent'}`,
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ 
        maxHeight: '400px', 
        overflowY: 'auto',
        minHeight: '200px'
      }}>
        {renderTabContent()}
      </div>
    </div>
  );
}
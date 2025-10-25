import React, { useState, useCallback, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Plus, Play, Save, Download, Settings, ArrowRight, X, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

export type TransformationType = 
  | 'filter' | 'sort' | 'group' | 'aggregate' | 'join' | 'pivot' 
  | 'clean' | 'normalize' | 'calculate' | 'sample';

export interface TransformationStep {
  id: string;
  type: TransformationType;
  name: string;
  description: string;
  parameters: Record<string, any>;
  enabled: boolean;
}

export interface Pipeline {
  id: string;
  name: string;
  steps: TransformationStep[];
  createdAt: Date;
  updatedAt: Date;
}

const TRANSFORMATION_TEMPLATES: Record<TransformationType, Omit<TransformationStep, 'id'>> = {
  filter: {
    type: 'filter',
    name: 'Filter Rows',
    description: 'Remove rows based on conditions',
    parameters: { column: '', operator: 'equals', value: '' },
    enabled: true
  },
  sort: {
    type: 'sort',
    name: 'Sort Data',
    description: 'Sort rows by column values',
    parameters: { column: '', direction: 'asc' },
    enabled: true
  },
  group: {
    type: 'group',
    name: 'Group By',
    description: 'Group rows by column values',
    parameters: { columns: [] },
    enabled: true
  },
  aggregate: {
    type: 'aggregate',
    name: 'Aggregate',
    description: 'Calculate summary statistics',
    parameters: { column: '', operation: 'sum' },
    enabled: true
  },
  join: {
    type: 'join',
    name: 'Join Data',
    description: 'Combine with another dataset',
    parameters: { dataset: '', joinKey: '', type: 'inner' },
    enabled: true
  },
  pivot: {
    type: 'pivot',
    name: 'Pivot Table',
    description: 'Reshape data from long to wide format',
    parameters: { index: '', columns: '', values: '' },
    enabled: true
  },
  clean: {
    type: 'clean',
    name: 'Clean Data',
    description: 'Remove duplicates and handle missing values',
    parameters: { removeDuplicates: true, fillMissing: 'drop' },
    enabled: true
  },
  normalize: {
    type: 'normalize',
    name: 'Normalize',
    description: 'Scale numeric values to standard range',
    parameters: { columns: [], method: 'z-score' },
    enabled: true
  },
  calculate: {
    type: 'calculate',
    name: 'Calculate Field',
    description: 'Create new column based on expression',
    parameters: { newColumn: '', expression: '' },
    enabled: true
  },
  sample: {
    type: 'sample',
    name: 'Sample Data',
    description: 'Take a random or systematic sample',
    parameters: { method: 'random', size: 1000 },
    enabled: true
  }
};

export const DataTransformationPipeline: React.FC = () => {
  const { csvData } = useData();
  const [pipeline, setPipeline] = useState<Pipeline>({
    id: 'default',
    name: 'New Pipeline',
    steps: [],
    createdAt: new Date(),
    updatedAt: new Date()
  });
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, any>[] | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const availableColumns = useMemo(() => {
    return csvData?.headers || [];
  }, [csvData]);

  const addTransformationStep = useCallback((type: TransformationType) => {
    const template = TRANSFORMATION_TEMPLATES[type];
    const newStep: TransformationStep = {
      ...template,
      id: `${type}_${Date.now()}`
    };

    setPipeline(prev => ({
      ...prev,
      steps: [...prev.steps, newStep],
      updatedAt: new Date()
    }));
  }, []);

  const updateStep = useCallback((stepId: string, updates: Partial<TransformationStep>) => {
    setPipeline(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === stepId ? { ...step, ...updates } : step
      ),
      updatedAt: new Date()
    }));
  }, []);

  const removeStep = useCallback((stepId: string) => {
    setPipeline(prev => ({
      ...prev,
      steps: prev.steps.filter(step => step.id !== stepId),
      updatedAt: new Date()
    }));
    setSelectedStep(null);
  }, []);

  const executeStep = useCallback((step: TransformationStep, inputData: Record<string, any>[]) => {
    // Simple transformation implementations
    switch (step.type) {
      case 'filter':
        return inputData.filter(row => {
          const value = row[step.parameters.column];
          const target = step.parameters.value;
          switch (step.parameters.operator) {
            case 'equals': return value == target;
            case 'not_equals': return value != target;
            case 'greater': return parseFloat(value) > parseFloat(target);
            case 'less': return parseFloat(value) < parseFloat(target);
            default: return true;
          }
        });
      
      case 'sort':
        return [...inputData].sort((a, b) => {
          const aVal = a[step.parameters.column];
          const bVal = b[step.parameters.column];
          const direction = step.parameters.direction === 'desc' ? -1 : 1;
          return (aVal > bVal ? 1 : aVal < bVal ? -1 : 0) * direction;
        });
      
      case 'clean':
        let cleaned = inputData;
        if (step.parameters.removeDuplicates) {
          const seen = new Set();
          cleaned = cleaned.filter(row => {
            const key = JSON.stringify(row);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        }
        return cleaned;
      
      case 'sample':
        const size = Math.min(step.parameters.size, inputData.length);
        if (step.parameters.method === 'random') {
          return inputData.sort(() => 0.5 - Math.random()).slice(0, size);
        }
        return inputData.slice(0, size);
      
      default:
        return inputData;
    }
  }, []);

  const executePipeline = useCallback(async () => {
    if (!csvData?.data) return;

    setIsExecuting(true);
    try {
      let result = csvData.data;
      
      for (const step of pipeline.steps) {
        if (step.enabled) {
          result = executeStep(step, result);
        }
      }
      
      setPreviewData(result.slice(0, 100)); // Show first 100 rows
      toast.success(`Pipeline executed successfully. ${result.length} rows processed.`);
    } catch (error) {
      toast.error('Pipeline execution failed');
      console.error(error);
    } finally {
      setIsExecuting(false);
    }
  }, [csvData, pipeline.steps, executeStep]);

  const renderStepEditor = (step: TransformationStep) => {
    return (
      <div style={{ 
        padding: 'var(--space-lg)', 
        background: 'var(--bg-elevated)', 
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-primary)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
          <h4 style={{ fontSize: '1.125rem', fontWeight: 'var(--font-weight-semibold)' }}>{step.name}</h4>
          <button onClick={() => setSelectedStep(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        {step.type === 'filter' && (
          <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontSize: '0.875rem', fontWeight: '500' }}>Column</label>
              <select 
                value={step.parameters.column} 
                onChange={(e) => updateStep(step.id, { parameters: { ...step.parameters, column: e.target.value } })}
                style={{ width: '100%', padding: 'var(--space-sm)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}
              >
                <option value="">Select column...</option>
                {availableColumns.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontSize: '0.875rem', fontWeight: '500' }}>Operator</label>
              <select 
                value={step.parameters.operator} 
                onChange={(e) => updateStep(step.id, { parameters: { ...step.parameters, operator: e.target.value } })}
                style={{ width: '100%', padding: 'var(--space-sm)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}
              >
                <option value="equals">Equals</option>
                <option value="not_equals">Not equals</option>
                <option value="greater">Greater than</option>
                <option value="less">Less than</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontSize: '0.875rem', fontWeight: '500' }}>Value</label>
              <input 
                type="text" 
                value={step.parameters.value} 
                onChange={(e) => updateStep(step.id, { parameters: { ...step.parameters, value: e.target.value } })}
                style={{ width: '100%', padding: 'var(--space-sm)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}
              />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
          <button
            onClick={() => updateStep(step.id, { enabled: !step.enabled })}
            style={{
              padding: 'var(--space-sm) var(--space-md)',
              background: step.enabled ? 'var(--success)' : 'var(--bg-secondary)',
              color: step.enabled ? 'white' : 'var(--text-primary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer'
            }}
          >
            {step.enabled ? 'Enabled' : 'Disabled'}
          </button>
          <button
            onClick={() => removeStep(step.id)}
            style={{
              padding: 'var(--space-sm) var(--space-md)',
              background: 'var(--error)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer'
            }}
          >
            Remove
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 'var(--space-xl)', height: '100vh' }}>
      {/* Main Pipeline View */}
      <div style={{ padding: 'var(--space-lg)', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-xs)' }}>
              Data Transformation Pipeline
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>Build visual data processing workflows</p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button
              onClick={executePipeline}
              disabled={isExecuting || pipeline.steps.length === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-xs)',
                padding: 'var(--space-sm) var(--space-lg)',
                background: 'var(--accent-primary)', color: 'white',
                border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer'
              }}
            >
              <Play size={16} /> {isExecuting ? 'Executing...' : 'Run Pipeline'}
            </button>
          </div>
        </div>

        {/* Pipeline Steps */}
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          {pipeline.steps.length === 0 ? (
            <div style={{ 
              textAlign: 'center', padding: 'var(--space-xl)', 
              background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
              border: '2px dashed var(--border-secondary)' 
            }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                No transformation steps added yet
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                Add transformation steps from the panel on the right to build your pipeline
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {pipeline.steps.map((step, index) => (
                <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                  {index > 0 && <ArrowRight size={20} style={{ color: 'var(--text-tertiary)' }} />}
                  <div
                    onClick={() => setSelectedStep(step.id)}
                    style={{
                      flex: 1, padding: 'var(--space-md)', 
                      background: step.enabled ? 'var(--bg-elevated)' : 'var(--bg-secondary)',
                      border: selectedStep === step.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-primary)',
                      borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                      opacity: step.enabled ? 1 : 0.6
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ fontWeight: 'var(--font-weight-semibold)' }}>{step.name}</h4>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{step.description}</p>
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedStep(step.id); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          <Settings size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview Results */}
        {previewData && (
          <div>
            <h3 style={{ marginBottom: 'var(--space-md)' }}>Preview Results ({previewData.length} rows)</h3>
            <div style={{ 
              background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-lg)', overflow: 'hidden'
            }}>
              <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: 'var(--bg-secondary)', position: 'sticky', top: 0 }}>
                    <tr>
                      {Object.keys(previewData[0] || {}).map(header => (
                        <th key={header} style={{ 
                          padding: 'var(--space-sm)', textAlign: 'left',
                          borderBottom: '1px solid var(--border-primary)',
                          fontSize: '0.875rem', fontWeight: 'var(--font-weight-semibold)'
                        }}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 50).map((row, index) => (
                      <tr key={index}>
                        {Object.values(row).map((value, cellIndex) => (
                          <td key={cellIndex} style={{
                            padding: 'var(--space-sm)', fontSize: '0.875rem',
                            borderBottom: '1px solid var(--border-secondary)'
                          }}>
                            {String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel */}
      <div style={{ borderLeft: '1px solid var(--border-primary)', padding: 'var(--space-lg)', overflow: 'auto' }}>
        {selectedStep ? (
          renderStepEditor(pipeline.steps.find(s => s.id === selectedStep)!)
        ) : (
          <div>
            <h3 style={{ marginBottom: 'var(--space-md)' }}>Add Transformation</h3>
            <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
              {Object.entries(TRANSFORMATION_TEMPLATES).map(([type, template]) => (
                <button
                  key={type}
                  onClick={() => addTransformationStep(type as TransformationType)}
                  style={{
                    padding: 'var(--space-md)', textAlign: 'left',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-md)', cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-xs)' }}>
                    {template.name}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {template.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataTransformationPipeline;
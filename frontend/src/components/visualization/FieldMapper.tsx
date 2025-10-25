import React from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { DataType, FieldMapping, ChartType } from '../../types/VisualizationTypes';
import { Hash, Calendar, Type, BarChart3, Palette, Layers } from 'lucide-react';

interface FieldSchema {
  name: string;
  type: DataType;
  nullable: boolean;
  unique: boolean;
  examples: any[];
}

interface FieldMapperProps {
  fields: FieldSchema[];
  fieldMapping: FieldMapping;
  chartType: ChartType;
  onFieldMappingChange: (mapping: FieldMapping) => void;
}

interface DroppableZoneProps {
  id: string;
  label: string;
  description: string;
  acceptsTypes: DataType[];
  currentField?: string;
  icon: React.ReactNode;
  required?: boolean;
  chartType: ChartType;
}

function DroppableZone({ 
  id, 
  label, 
  description, 
  acceptsTypes, 
  currentField, 
  icon, 
  required = false,
  chartType 
}: DroppableZoneProps) {
  const isEmpty = !currentField;
  
  return (
    <div
      data-droppable-id={id}
      style={{
        minHeight: '80px',
        border: `2px dashed ${isEmpty ? 'var(--border-secondary)' : 'var(--accent-primary)'}`,
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-md)',
        background: isEmpty ? 'var(--bg-tertiary)' : 'var(--bg-elevated)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        transition: 'all 0.2s ease',
        cursor: isEmpty ? 'default' : 'pointer',
      }}
      className="droppable-zone"
    >
      {required && (
        <div
          style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--error)',
          }}
        />
      )}
      
      <div style={{ 
        color: isEmpty ? 'var(--text-tertiary)' : 'var(--accent-primary)', 
        marginBottom: 'var(--space-xs)' 
      }}>
        {icon}
      </div>
      
      <div style={{
        textAlign: 'center',
        fontSize: '0.875rem',
      }}>
        <div style={{ 
          fontWeight: '600', 
          color: isEmpty ? 'var(--text-secondary)' : 'var(--text-primary)',
          marginBottom: '2px'
        }}>
          {label}
        </div>
        
        {currentField ? (
          <div style={{ 
            background: 'var(--accent-primary)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.75rem',
            fontWeight: '600',
            margin: '4px 0'
          }}>
            {currentField}
          </div>
        ) : (
          <div style={{ 
            fontSize: '0.75rem', 
            color: 'var(--text-tertiary)',
            fontStyle: 'italic'
          }}>
            {description}
          </div>
        )}
        
        <div style={{ 
          fontSize: '0.7rem', 
          color: 'var(--text-tertiary)',
          marginTop: '4px'
        }}>
          Accepts: {acceptsTypes.join(', ')}
        </div>
      </div>
    </div>
  );
}

function DraggableField({ field }: { field: FieldSchema }) {
  const getFieldIcon = (type: DataType) => {
    switch (type) {
      case 'numeric': return <Hash size={16} />;
      case 'datetime': return <Calendar size={16} />;
      case 'categorical': return <BarChart3 size={16} />;
      case 'text': return <Type size={16} />;
      case 'boolean': return <BarChart3 size={16} />;
      default: return <Hash size={16} />;
    }
  };

  const getTypeColor = (type: DataType) => {
    switch (type) {
      case 'numeric': return '#3182ce';
      case 'datetime': return '#38a169';
      case 'categorical': return '#d69e2e';
      case 'text': return '#805ad5';
      case 'boolean': return '#e53e3e';
      default: return '#718096';
    }
  };

  return (
    <div
      draggable
      style={{
        padding: 'var(--space-sm)',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-primary)',
        borderRadius: 'var(--radius-sm)',
        marginBottom: 'var(--space-xs)',
        cursor: 'grab',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-xs)',
        transition: 'all 0.2s ease',
        fontSize: '0.875rem'
      }}
      onDragStart={(e) => {
        e.dataTransfer.setData('application/json', JSON.stringify({
          fieldName: field.name,
          fieldType: field.type
        }));
      }}
    >
      <div style={{ color: getTypeColor(field.type) }}>
        {getFieldIcon(field.type)}
      </div>
      
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
          {field.name}
        </div>
        <div style={{ 
          fontSize: '0.75rem', 
          color: 'var(--text-secondary)',
          textTransform: 'capitalize'
        }}>
          {field.type} • {field.examples.slice(0, 2).map(ex => String(ex)).join(', ')}
        </div>
      </div>
    </div>
  );
}

export function FieldMapper({ fields, fieldMapping, chartType, onFieldMappingChange }: FieldMapperProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const [activeField, setActiveField] = React.useState<FieldSchema | null>(null);

  // Define drop zones based on chart type
  const getDropZones = (): DroppableZoneProps[] => {
    const common = [
      {
        id: 'x',
        label: chartType === 'boxplot' ? 'Groups' : 
               chartType === 'histogram' ? 'Values' :
               chartType === 'heatmap' ? 'X Axis (Columns)' :
               'X Axis',
        description: 'Drag field here',
        acceptsTypes: chartType === 'histogram' ? ['numeric'] as DataType[] :
                     ['numeric', 'categorical', 'datetime', 'text'] as DataType[],
        currentField: fieldMapping.x,
        icon: <BarChart3 size={24} />,
        required: !['pie'].includes(chartType),
        chartType
      }
    ];

    if (!['pie', 'histogram'].includes(chartType)) {
      common.push({
        id: 'y',
        label: chartType === 'boxplot' ? 'Values' : 
               chartType === 'heatmap' ? 'Y Axis (Rows)' :
               'Y Axis',
        description: 'Drag field here',
        acceptsTypes: chartType === 'heatmap' ? ['categorical', 'text'] as DataType[] :
                     ['numeric'] as DataType[],
        currentField: fieldMapping.y,
        icon: <BarChart3 size={24} style={{ transform: 'rotate(90deg)' }} />,
        required: true,
        chartType
      });
    }

    if (chartType === 'pie') {
      common.push({
        id: 'category',
        label: 'Categories',
        description: 'Drag field here',
        acceptsTypes: ['categorical', 'text'] as DataType[],
        currentField: fieldMapping.category,
        icon: <Layers size={24} />,
        required: true,
        chartType
      });
    }

    if (['pie', 'heatmap'].includes(chartType)) {
      common.push({
        id: 'value',
        label: 'Values',
        description: 'Drag field here',
        acceptsTypes: ['numeric'] as DataType[],
        currentField: fieldMapping.value,
        icon: <Hash size={24} />,
        required: true,
        chartType
      });
    }

    if (['line', 'bar', 'scatter', 'area'].includes(chartType)) {
      common.push({
        id: 'color',
        label: 'Color By',
        description: 'Optional grouping',
        acceptsTypes: ['categorical', 'text'] as DataType[],
        currentField: fieldMapping.color,
        icon: <Palette size={24} />,
        required: false,
        chartType
      });
    }

    return common;
  };

  const dropZones = getDropZones();

  const handleDragStart = (event: DragStartEvent) => {
    const field = fields.find(f => f.name === event.active.id);
    setActiveField(field || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveField(null);
    
    const { active, over } = event;
    if (!over) return;

    const fieldName = active.id as string;
    const dropZoneId = over.id as string;
    
    // Update field mapping
    const newMapping = { ...fieldMapping };
    
    // Clear the field from its current position
    Object.keys(newMapping).forEach(key => {
      if (newMapping[key as keyof FieldMapping] === fieldName) {
        delete newMapping[key as keyof FieldMapping];
      }
    });
    
    // Set the field in its new position
    (newMapping as any)[dropZoneId] = fieldName;
    
    onFieldMappingChange(newMapping);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    
    const target = event.currentTarget as HTMLElement;
    const dropZoneElement = target.closest('[data-droppable-id]') as HTMLElement;
    
    if (!dropZoneElement) return;
    
    const dropZoneId = dropZoneElement.getAttribute('data-droppable-id');
    if (!dropZoneId) return;

    try {
      const data = JSON.parse(event.dataTransfer.getData('application/json'));
      const { fieldName } = data;
      
      // Update field mapping
      const newMapping = { ...fieldMapping };
      
      // Clear the field from its current position
      Object.keys(newMapping).forEach(key => {
        if (newMapping[key as keyof FieldMapping] === fieldName) {
          delete newMapping[key as keyof FieldMapping];
        }
      });
      
      // Set the field in its new position
      (newMapping as any)[dropZoneId] = fieldName;
      
      onFieldMappingChange(newMapping);
    } catch (error) {
      console.error('Error parsing drop data:', error);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 'var(--space-lg)', height: '100%' }}>
      {/* Fields Sidebar */}
      <div style={{ 
        width: '280px', 
        flexShrink: 0,
        borderRight: '1px solid var(--border-primary)',
        paddingRight: 'var(--space-lg)'
      }}>
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <h3 style={{ 
            fontSize: '1rem', 
            fontWeight: '600',
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-sm)'
          }}>
            Data Fields
          </h3>
          <p style={{ 
            fontSize: '0.875rem', 
            color: 'var(--text-secondary)',
            margin: 0 
          }}>
            Drag fields to the chart areas below
          </p>
        </div>
        
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {fields.map((field) => (
            <DraggableField key={field.name} field={field} />
          ))}
        </div>
      </div>

      {/* Drop Zones */}
      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <h3 style={{ 
            fontSize: '1rem', 
            fontWeight: '600',
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-sm)'
          }}>
            Chart Mapping
          </h3>
          <p style={{ 
            fontSize: '0.875rem', 
            color: 'var(--text-secondary)',
            margin: 0 
          }}>
            Configure your {chartType} chart
          </p>
        </div>
        
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: 'var(--space-md)',
            alignItems: 'start'
          }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {dropZones.map((zone) => (
            <DroppableZone key={zone.id} {...zone} />
          ))}
        </div>

        {/* Mapping Status */}
        <div style={{ 
          marginTop: 'var(--space-lg)',
          padding: 'var(--space-md)',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.875rem'
        }}>
          <div style={{ fontWeight: '600', marginBottom: 'var(--space-xs)' }}>
            Mapping Status:
          </div>
          {dropZones.map(zone => (
            <div key={zone.id} style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '2px'
            }}>
              <span>{zone.label}:</span>
              <span style={{ 
                color: zone.currentField ? 'var(--success)' : 
                       zone.required ? 'var(--error)' : 'var(--text-secondary)'
              }}>
                {zone.currentField || (zone.required ? 'Required' : 'Optional')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { FixedSizeList as List, VariableSizeList, ListChildComponentProps } from 'react-window';
import { FixedSizeGrid as Grid, GridChildComponentProps } from 'react-window';
import { ChevronUp, ChevronDown, ArrowUpDown, Search, Filter } from 'lucide-react';

export interface VirtualTableColumn {
  key: string;
  title: string;
  width: number;
  minWidth?: number;
  maxWidth?: number;
  sortable?: boolean;
  filterable?: boolean;
  resizable?: boolean;
  render?: (value: any, row: any, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  fixed?: 'left' | 'right';
}

export interface VirtualTableProps {
  data: any[];
  columns: VirtualTableColumn[];
  height: number;
  width?: number;
  rowHeight?: number;
  headerHeight?: number;
  overscan?: number;
  sortable?: boolean;
  filterable?: boolean;
  selectable?: boolean;
  selectedRows?: Set<number>;
  onRowSelect?: (selectedRows: Set<number>) => void;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: Record<string, any>) => void;
  className?: string;
  estimatedRowHeight?: (index: number) => number;
  variableHeight?: boolean;
}

export interface SortState {
  column: string | null;
  direction: 'asc' | 'desc';
}

export interface FilterState {
  [columnKey: string]: string;
}

export const VirtualTable: React.FC<VirtualTableProps> = ({
  data,
  columns,
  height,
  width = '100%',
  rowHeight = 40,
  headerHeight = 44,
  overscan = 5,
  sortable = true,
  filterable = false,
  selectable = false,
  selectedRows = new Set(),
  onRowSelect,
  onSort,
  onFilter,
  className = '',
  estimatedRowHeight,
  variableHeight = false
}) => {
  const [sortState, setSortState] = useState<SortState>({ column: null, direction: 'asc' });
  const [filters, setFilters] = useState<FilterState>({});
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => 
    columns.reduce((acc, col) => ({ ...acc, [col.key]: col.width }), {})
  );

  const gridRef = useRef<any>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Calculate total width and column positions
  const { totalWidth, columnPositions } = useMemo(() => {
    let totalWidth = selectable ? 40 : 0; // Checkbox column width
    const positions: Record<string, number> = {};
    
    if (selectable) {
      positions['__select__'] = 0;
    }

    columns.forEach(column => {
      positions[column.key] = totalWidth;
      totalWidth += columnWidths[column.key] || column.width;
    });

    return { totalWidth, columnPositions: positions };
  }, [columns, columnWidths, selectable]);

  // Filter and sort data
  const processedData = useMemo(() => {
    let result = [...data];

    // Apply filters
    if (Object.keys(filters).length > 0) {
      result = result.filter(row => {
        return Object.entries(filters).every(([columnKey, filterValue]) => {
          if (!filterValue) return true;
          const cellValue = String(row[columnKey] || '').toLowerCase();
          return cellValue.includes(filterValue.toLowerCase());
        });
      });
    }

    // Apply sorting
    if (sortState.column) {
      result.sort((a, b) => {
        const aVal = a[sortState.column!];
        const bVal = b[sortState.column!];
        
        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        else if (aVal > bVal) comparison = 1;
        
        return sortState.direction === 'desc' ? -comparison : comparison;
      });
    }

    return result;
  }, [data, filters, sortState]);

  // Handle sorting
  const handleSort = useCallback((columnKey: string) => {
    if (!sortable) return;

    const column = columns.find(col => col.key === columnKey);
    if (!column?.sortable) return;

    const newDirection = sortState.column === columnKey && sortState.direction === 'asc' ? 'desc' : 'asc';
    const newSortState = { column: columnKey, direction: newDirection };
    
    setSortState(newSortState);
    onSort?.(columnKey, newDirection);
  }, [sortState, columns, sortable, onSort]);

  // Handle filtering
  const handleFilter = useCallback((columnKey: string, value: string) => {
    const newFilters = { ...filters, [columnKey]: value };
    setFilters(newFilters);
    onFilter?.(newFilters);
  }, [filters, onFilter]);

  // Handle column resize
  const handleColumnResize = useCallback((columnKey: string, newWidth: number) => {
    const column = columns.find(col => col.key === columnKey);
    if (!column?.resizable) return;

    const minWidth = column.minWidth || 50;
    const maxWidth = column.maxWidth || 500;
    const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

    setColumnWidths(prev => ({
      ...prev,
      [columnKey]: constrainedWidth
    }));
  }, [columns]);

  // Handle row selection
  const handleRowSelect = useCallback((rowIndex: number, selected: boolean) => {
    if (!selectable || !onRowSelect) return;

    const newSelectedRows = new Set(selectedRows);
    if (selected) {
      newSelectedRows.add(rowIndex);
    } else {
      newSelectedRows.delete(rowIndex);
    }
    onRowSelect(newSelectedRows);
  }, [selectable, selectedRows, onRowSelect]);

  // Handle select all
  const handleSelectAll = useCallback((selected: boolean) => {
    if (!selectable || !onRowSelect) return;

    const newSelectedRows = selected 
      ? new Set(Array.from({ length: processedData.length }, (_, i) => i))
      : new Set<number>();
    onRowSelect(newSelectedRows);
  }, [selectable, processedData.length, onRowSelect]);

  // Header component
  const TableHeader: React.FC = () => (
    <div 
      ref={headerRef}
      className="flex bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
      style={{ height: headerHeight, width: totalWidth }}
    >
      {selectable && (
        <div 
          className="flex items-center justify-center border-r border-gray-200 dark:border-gray-700"
          style={{ width: 40 }}
        >
          <input
            type="checkbox"
            checked={selectedRows.size === processedData.length && processedData.length > 0}
            onChange={(e) => handleSelectAll(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>
      )}
      
      {columns.map((column) => (
        <HeaderCell
          key={column.key}
          column={column}
          width={columnWidths[column.key]}
          sortState={sortState}
          filters={filters}
          onSort={handleSort}
          onFilter={handleFilter}
          onResize={handleColumnResize}
          filterable={filterable}
        />
      ))}
    </div>
  );

  // Row component for fixed height
  const RowComponent: React.FC<ListChildComponentProps> = ({ index, style }) => {
    const row = processedData[index];
    const isSelected = selectedRows.has(index);

    return (
      <div 
        style={style} 
        className={`flex border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
          isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
        }`}
      >
        {selectable && (
          <div 
            className="flex items-center justify-center border-r border-gray-100 dark:border-gray-700"
            style={{ width: 40 }}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => handleRowSelect(index, e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
        )}
        
        {columns.map((column) => (
          <CellComponent
            key={column.key}
            column={column}
            value={row[column.key]}
            row={row}
            rowIndex={index}
            width={columnWidths[column.key]}
          />
        ))}
      </div>
    );
  };

  // Grid cell component for variable layouts
  const GridCellComponent: React.FC<GridChildComponentProps> = ({ columnIndex, rowIndex, style }) => {
    // Handle selection column
    if (selectable && columnIndex === 0) {
      if (rowIndex === 0) {
        // Header
        return (
          <div style={style} className="flex items-center justify-center bg-gray-50 dark:bg-gray-800 border-b border-r border-gray-200 dark:border-gray-700">
            <input
              type="checkbox"
              checked={selectedRows.size === processedData.length && processedData.length > 0}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
        );
      } else {
        // Data row
        const dataIndex = rowIndex - 1;
        const isSelected = selectedRows.has(dataIndex);
        return (
          <div 
            style={style} 
            className={`flex items-center justify-center border-b border-r border-gray-100 dark:border-gray-700 ${
              isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
            }`}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => handleRowSelect(dataIndex, e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
        );
      }
    }

    const actualColumnIndex = selectable ? columnIndex - 1 : columnIndex;
    const column = columns[actualColumnIndex];
    
    if (!column) return null;

    if (rowIndex === 0) {
      // Header
      return (
        <div style={style}>
          <HeaderCell
            column={column}
            width={columnWidths[column.key]}
            sortState={sortState}
            filters={filters}
            onSort={handleSort}
            onFilter={handleFilter}
            onResize={handleColumnResize}
            filterable={filterable}
            isGrid={true}
          />
        </div>
      );
    } else {
      // Data row
      const dataIndex = rowIndex - 1;
      const row = processedData[dataIndex];
      const isSelected = selectedRows.has(dataIndex);
      
      return (
        <div 
          style={style} 
          className={`${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
        >
          <CellComponent
            column={column}
            value={row[column.key]}
            row={row}
            rowIndex={dataIndex}
            width={columnWidths[column.key]}
            isGrid={true}
          />
        </div>
      );
    }
  };

  const containerWidth = typeof width === 'string' ? undefined : width;

  return (
    <div className={`virtual-table ${className}`}>
      {!variableHeight ? (
        // Fixed height implementation
        <div style={{ height, width }}>
          <TableHeader />
          <List
            ref={gridRef}
            height={height - headerHeight}
            itemCount={processedData.length}
            itemSize={rowHeight}
            overscanCount={overscan}
            width={containerWidth}
          >
            {RowComponent}
          </List>
        </div>
      ) : (
        // Grid implementation for more complex layouts
        <Grid
          ref={gridRef}
          height={height}
          width={containerWidth}
          rowCount={processedData.length + 1} // +1 for header
          columnCount={columns.length + (selectable ? 1 : 0)}
          rowHeight={(index) => index === 0 ? headerHeight : (estimatedRowHeight?.(index - 1) || rowHeight)}
          columnWidth={(index) => {
            if (selectable && index === 0) return 40;
            const actualIndex = selectable ? index - 1 : index;
            return columnWidths[columns[actualIndex]?.key] || 100;
          }}
          overscanRowCount={overscan}
          overscanColumnCount={1}
        >
          {GridCellComponent}
        </Grid>
      )}
    </div>
  );
};

// Header Cell Component
interface HeaderCellProps {
  column: VirtualTableColumn;
  width: number;
  sortState: SortState;
  filters: FilterState;
  onSort: (columnKey: string) => void;
  onFilter: (columnKey: string, value: string) => void;
  onResize: (columnKey: string, newWidth: number) => void;
  filterable: boolean;
  isGrid?: boolean;
}

const HeaderCell: React.FC<HeaderCellProps> = ({
  column,
  width,
  sortState,
  filters,
  onSort,
  onFilter,
  onResize,
  filterable,
  isGrid = false
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!column.resizable) return;
    
    setIsResizing(true);
    startX.current = e.clientX;
    startWidth.current = width;
    
    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX.current;
      onResize(column.key, startWidth.current + diff);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [column.resizable, column.key, width, onResize]);

  const isSorted = sortState.column === column.key;
  const sortIcon = isSorted ? (
    sortState.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
  ) : <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-50" />;

  return (
    <div 
      className={`relative flex flex-col bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 ${
        isGrid ? 'h-full' : ''
      }`}
      style={{ width }}
    >
      {/* Header content */}
      <div 
        className={`flex items-center justify-between px-3 py-2 h-full ${
          column.sortable ? 'cursor-pointer group hover:bg-gray-100 dark:hover:bg-gray-700' : ''
        }`}
        onClick={() => column.sortable && onSort(column.key)}
      >
        <span 
          className="font-medium text-sm text-gray-900 dark:text-white truncate"
          title={column.title}
        >
          {column.title}
        </span>
        
        <div className="flex items-center gap-1">
          {column.sortable && sortIcon}
          {filterable && column.filterable && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowFilter(!showFilter);
              }}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            >
              <Filter size={12} className={filters[column.key] ? 'text-blue-500' : 'text-gray-400'} />
            </button>
          )}
        </div>
      </div>

      {/* Filter input */}
      {filterable && column.filterable && showFilter && (
        <div className="absolute top-full left-0 right-0 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="p-2">
            <div className="flex items-center gap-1">
              <Search size={14} className="text-gray-400" />
              <input
                type="text"
                placeholder={`Filter ${column.title}...`}
                value={filters[column.key] || ''}
                onChange={(e) => onFilter(column.key, e.target.value)}
                className="flex-1 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                autoFocus
              />
            </div>
          </div>
        </div>
      )}

      {/* Resize handle */}
      {column.resizable && (
        <div
          className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 ${
            isResizing ? 'bg-blue-500' : ''
          }`}
          onMouseDown={handleMouseDown}
        />
      )}
    </div>
  );
};

// Cell Component
interface CellComponentProps {
  column: VirtualTableColumn;
  value: any;
  row: any;
  rowIndex: number;
  width: number;
  isGrid?: boolean;
}

const CellComponent: React.FC<CellComponentProps> = ({
  column,
  value,
  row,
  rowIndex,
  width,
  isGrid = false
}) => {
  const displayValue = column.render ? column.render(value, row, rowIndex) : String(value || '');
  
  const alignmentClass = column.align === 'center' ? 'justify-center' : 
                         column.align === 'right' ? 'justify-end' : 'justify-start';

  return (
    <div 
      className={`flex items-center px-3 py-2 text-sm text-gray-900 dark:text-white border-r border-gray-100 dark:border-gray-700 ${alignmentClass} ${
        isGrid ? 'h-full' : ''
      }`}
      style={{ width }}
      title={typeof displayValue === 'string' ? displayValue : undefined}
    >
      <span className="truncate">
        {displayValue}
      </span>
    </div>
  );
};

export default VirtualTable;
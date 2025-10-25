import React, { useState, useRef, useEffect, ReactNode, createContext, useContext } from 'react';
import { HelpCircle, ExternalLink, Book, Video, FileText, ChevronRight } from 'lucide-react';
import { useFocusTrap, useScreenReaderAnnouncement } from '../../utils/accessibility';

export interface HelpItem {
  id: string;
  title: string;
  description: string;
  content: ReactNode;
  category: HelpCategory;
  tags: string[];
  links?: HelpLink[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime?: number;
}

export interface HelpLink {
  title: string;
  url: string;
  type: 'documentation' | 'video' | 'tutorial' | 'blog' | 'external';
  description?: string;
}

export type HelpCategory = 
  | 'getting-started' 
  | 'data-import' 
  | 'visualization' 
  | 'charts' 
  | 'analysis' 
  | 'export' 
  | 'collaboration' 
  | 'troubleshooting'
  | 'advanced';

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'hover' | 'click' | 'focus';
  delay?: number;
  maxWidth?: number;
  className?: string;
  ariaLabel?: string;
}

export interface HelpContextType {
  showHelp: (itemId: string) => void;
  hideHelp: () => void;
  currentHelpItem: string | null;
  isHelpOpen: boolean;
  registerHelpItem: (item: HelpItem) => void;
  getHelpItem: (id: string) => HelpItem | undefined;
  searchHelp: (query: string) => HelpItem[];
}

const HelpContext = createContext<HelpContextType | undefined>(undefined);

export const useHelp = (): HelpContextType => {
  const context = useContext(HelpContext);
  if (!context) {
    throw new Error('useHelp must be used within a HelpProvider');
  }
  return context;
};

// Default help items
const defaultHelpItems: HelpItem[] = [
  {
    id: 'data-import-csv',
    title: 'Importing CSV Files',
    description: 'Learn how to import and work with CSV data',
    category: 'data-import',
    tags: ['csv', 'import', 'upload', 'data'],
    difficulty: 'beginner',
    estimatedReadTime: 3,
    content: (
      <div>
        <h3>Importing CSV Files</h3>
        <p>DataSnap makes it easy to work with your CSV data. Here's how to get started:</p>
        <ol>
          <li>Click the "Import Data" button in the main toolbar</li>
          <li>Select your CSV file from your computer</li>
          <li>Review the data preview to ensure proper formatting</li>
          <li>Adjust column types if needed</li>
          <li>Click "Import" to start working with your data</li>
        </ol>
        <p><strong>Tip:</strong> Make sure your CSV file has headers in the first row for the best experience.</p>
      </div>
    ),
    links: [
      {
        title: 'CSV Format Best Practices',
        url: '/docs/csv-format',
        type: 'documentation',
        description: 'Guidelines for preparing your CSV files'
      }
    ]
  },
  {
    id: 'creating-charts',
    title: 'Creating Your First Chart',
    description: 'Step-by-step guide to creating beautiful visualizations',
    category: 'charts',
    tags: ['charts', 'visualization', 'getting started'],
    difficulty: 'beginner',
    estimatedReadTime: 5,
    content: (
      <div>
        <h3>Creating Your First Chart</h3>
        <p>Visualizing your data is simple with DataSnap's chart builder:</p>
        <ol>
          <li>Select the data you want to visualize</li>
          <li>Click "Create Chart" from the toolbar</li>
          <li>Choose a chart type (bar, line, scatter, etc.)</li>
          <li>Configure your axes and styling</li>
          <li>Preview and refine your chart</li>
          <li>Save or export your visualization</li>
        </ol>
        <p><strong>Pro tip:</strong> Our AI assistant can suggest the best chart type for your data!</p>
      </div>
    ),
    links: [
      {
        title: 'Chart Types Guide',
        url: '/docs/chart-types',
        type: 'documentation',
        description: 'Complete reference for all available chart types'
      },
      {
        title: 'Chart Creation Tutorial',
        url: '/tutorials/charts',
        type: 'video',
        description: 'Video walkthrough of the chart creation process'
      }
    ]
  },
  {
    id: 'data-transformation',
    title: 'Data Transformation Pipeline',
    description: 'Learn to clean and transform your data',
    category: 'analysis',
    tags: ['transformation', 'cleaning', 'pipeline', 'advanced'],
    difficulty: 'intermediate',
    estimatedReadTime: 8,
    content: (
      <div>
        <h3>Data Transformation Pipeline</h3>
        <p>Transform and clean your data with our visual pipeline builder:</p>
        <ul>
          <li><strong>Filter:</strong> Remove unwanted rows based on conditions</li>
          <li><strong>Clean:</strong> Handle missing values and duplicates</li>
          <li><strong>Transform:</strong> Create new columns and modify existing ones</li>
          <li><strong>Aggregate:</strong> Group and summarize your data</li>
        </ul>
        <p>Each step in the pipeline can be configured and reordered as needed.</p>
      </div>
    ),
    links: [
      {
        title: 'Transformation Functions Reference',
        url: '/docs/transformations',
        type: 'documentation'
      }
    ]
  }
];

export interface HelpProviderProps {
  children: ReactNode;
  helpItems?: HelpItem[];
}

export const HelpProvider: React.FC<HelpProviderProps> = ({
  children,
  helpItems = defaultHelpItems
}) => {
  const [items, setItems] = useState<Map<string, HelpItem>>(
    new Map(helpItems.map(item => [item.id, item]))
  );
  const [currentHelpItem, setCurrentHelpItem] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const showHelp = (itemId: string) => {
    setCurrentHelpItem(itemId);
    setIsHelpOpen(true);
  };

  const hideHelp = () => {
    setCurrentHelpItem(null);
    setIsHelpOpen(false);
  };

  const registerHelpItem = (item: HelpItem) => {
    setItems(prev => new Map(prev.set(item.id, item)));
  };

  const getHelpItem = (id: string): HelpItem | undefined => {
    return items.get(id);
  };

  const searchHelp = (query: string): HelpItem[] => {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(items.values()).filter(item => 
      item.title.toLowerCase().includes(lowercaseQuery) ||
      item.description.toLowerCase().includes(lowercaseQuery) ||
      item.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  };

  const value: HelpContextType = {
    showHelp,
    hideHelp,
    currentHelpItem,
    isHelpOpen,
    registerHelpItem,
    getHelpItem,
    searchHelp
  };

  return (
    <HelpContext.Provider value={value}>
      {children}
      {isHelpOpen && <HelpModal />}
    </HelpContext.Provider>
  );
};

// Tooltip Component
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  trigger = 'hover',
  delay = 300,
  maxWidth = 300,
  className = '',
  ariaLabel
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [actualPosition, setActualPosition] = useState(position);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const showTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      // Calculate optimal position after showing
      requestAnimationFrame(() => {
        calculatePosition();
      });
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    let newPosition = position;

    // Check if tooltip would go off-screen and adjust position
    switch (position) {
      case 'top':
        if (triggerRect.top - tooltipRect.height < 0) {
          newPosition = 'bottom';
        }
        break;
      case 'bottom':
        if (triggerRect.bottom + tooltipRect.height > viewport.height) {
          newPosition = 'top';
        }
        break;
      case 'left':
        if (triggerRect.left - tooltipRect.width < 0) {
          newPosition = 'right';
        }
        break;
      case 'right':
        if (triggerRect.right + tooltipRect.width > viewport.width) {
          newPosition = 'left';
        }
        break;
    }

    setActualPosition(newPosition);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getTooltipStyles = (): React.CSSProperties => {
    if (!triggerRef.current) return {};

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const offset = 8;
    
    let styles: React.CSSProperties = {
      position: 'fixed',
      zIndex: 1000,
      maxWidth: `${maxWidth}px`
    };

    switch (actualPosition) {
      case 'top':
        styles.bottom = `${window.innerHeight - triggerRect.top + offset}px`;
        styles.left = `${triggerRect.left + triggerRect.width / 2}px`;
        styles.transform = 'translateX(-50%)';
        break;
      case 'bottom':
        styles.top = `${triggerRect.bottom + offset}px`;
        styles.left = `${triggerRect.left + triggerRect.width / 2}px`;
        styles.transform = 'translateX(-50%)';
        break;
      case 'left':
        styles.right = `${window.innerWidth - triggerRect.left + offset}px`;
        styles.top = `${triggerRect.top + triggerRect.height / 2}px`;
        styles.transform = 'translateY(-50%)';
        break;
      case 'right':
        styles.left = `${triggerRect.right + offset}px`;
        styles.top = `${triggerRect.top + triggerRect.height / 2}px`;
        styles.transform = 'translateY(-50%)';
        break;
    }

    return styles;
  };

  const triggerProps: React.HTMLAttributes<HTMLDivElement> = {};

  if (trigger === 'hover') {
    triggerProps.onMouseEnter = showTooltip;
    triggerProps.onMouseLeave = hideTooltip;
  } else if (trigger === 'click') {
    triggerProps.onClick = () => isVisible ? hideTooltip() : showTooltip();
  } else if (trigger === 'focus') {
    triggerProps.onFocus = showTooltip;
    triggerProps.onBlur = hideTooltip;
  }

  return (
    <>
      <div 
        ref={triggerRef} 
        className="inline-block"
        aria-describedby={isVisible ? 'tooltip' : undefined}
        {...triggerProps}
      >
        {children}
      </div>
      
      {isVisible && (
        <div
          ref={tooltipRef}
          id="tooltip"
          role="tooltip"
          aria-label={ariaLabel}
          className={`bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg max-w-xs ${className}`}
          style={getTooltipStyles()}
        >
          {content}
          <div 
            className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${
              actualPosition === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' :
              actualPosition === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' :
              actualPosition === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2' :
              'left-[-4px] top-1/2 -translate-y-1/2'
            }`}
          />
        </div>
      )}
    </>
  );
};

// Help Button Component
export interface HelpButtonProps {
  helpId: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'text';
}

export const HelpButton: React.FC<HelpButtonProps> = ({
  helpId,
  className = '',
  size = 'md',
  variant = 'icon'
}) => {
  const { showHelp, getHelpItem } = useHelp();
  const helpItem = getHelpItem(helpId);

  if (!helpItem) {
    console.warn(`Help item with id "${helpId}" not found`);
    return null;
  }

  const sizeClasses = {
    sm: 'p-1 text-sm',
    md: 'p-1.5 text-base',
    lg: 'p-2 text-lg'
  };

  return (
    <Tooltip content={helpItem.description} position="top">
      <button
        onClick={() => showHelp(helpId)}
        className={`inline-flex items-center gap-1 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors ${sizeClasses[size]} ${className}`}
        aria-label={`Get help: ${helpItem.title}`}
      >
        <HelpCircle size={size === 'sm' ? 14 : size === 'md' ? 16 : 20} />
        {variant === 'text' && <span className="text-xs">Help</span>}
      </button>
    </Tooltip>
  );
};

// Help Modal Component
const HelpModal: React.FC = () => {
  const { currentHelpItem, hideHelp, getHelpItem } = useHelp();
  const modalRef = useRef<HTMLDivElement>(null);
  const announce = useScreenReaderAnnouncement();

  useFocusTrap(modalRef, true, {
    onEscape: hideHelp,
    returnFocusOnDeactivate: true
  });

  useEffect(() => {
    if (currentHelpItem) {
      const item = getHelpItem(currentHelpItem);
      if (item) {
        announce(`Help opened: ${item.title}`);
      }
    }
  }, [currentHelpItem, getHelpItem, announce]);

  if (!currentHelpItem) return null;

  const helpItem = getHelpItem(currentHelpItem);
  if (!helpItem) return null;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900';
      case 'advanced': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        role="dialog"
        aria-labelledby="help-title"
        aria-describedby="help-content"
      >
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="help-title" className="text-xl font-semibold text-gray-900 dark:text-white">
                {helpItem.title}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(helpItem.difficulty)}`}>
                  {helpItem.difficulty}
                </span>
                {helpItem.estimatedReadTime && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {helpItem.estimatedReadTime} min read
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={hideHelp}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Close help"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div id="help-content" className="prose dark:prose-invert max-w-none">
            {helpItem.content}
          </div>

          {/* Tags */}
          {helpItem.tags.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tags:</h4>
              <div className="flex flex-wrap gap-2">
                {helpItem.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          {helpItem.links && helpItem.links.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Related Resources:</h4>
              <div className="space-y-2">
                {helpItem.links.map((link, index) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                  >
                    {link.type === 'documentation' && <Book size={16} className="text-blue-500" />}
                    {link.type === 'video' && <Video size={16} className="text-red-500" />}
                    {link.type === 'tutorial' && <FileText size={16} className="text-green-500" />}
                    {(link.type === 'blog' || link.type === 'external') && <ExternalLink size={16} className="text-gray-500" />}
                    
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {link.title}
                      </div>
                      {link.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {link.description}
                        </div>
                      )}
                    </div>
                    
                    <ChevronRight size={16} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Quick Help Component for contextual tips
export interface QuickHelpProps {
  title: string;
  content: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: ReactNode;
}

export const QuickHelp: React.FC<QuickHelpProps> = ({
  title,
  content,
  position = 'top',
  children
}) => {
  return (
    <Tooltip 
      content={
        <div>
          <div className="font-medium mb-1">{title}</div>
          <div className="text-sm opacity-90">{content}</div>
        </div>
      }
      position={position}
      maxWidth={250}
    >
      {children}
    </Tooltip>
  );
};

export default HelpProvider;
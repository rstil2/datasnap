/**
 * Performance Monitoring Utilities
 * Provides performance tracking and optimization helpers
 */

import { config } from '../config';

// Performance mark names
export const PERFORMANCE_MARKS = {
  UPLOAD_START: 'upload_start',
  UPLOAD_END: 'upload_end',
  ANALYSIS_START: 'analysis_start',
  ANALYSIS_END: 'analysis_end',
  CHART_RENDER_START: 'chart_render_start',
  CHART_RENDER_END: 'chart_render_end',
  STORY_GENERATION_START: 'story_generation_start',
  STORY_GENERATION_END: 'story_generation_end',
  EXPORT_START: 'export_start',
  EXPORT_END: 'export_end'
} as const;

export type PerformanceMark = typeof PERFORMANCE_MARKS[keyof typeof PERFORMANCE_MARKS];

// Performance measurement names
export const PERFORMANCE_MEASURES = {
  UPLOAD_DURATION: 'upload_duration',
  ANALYSIS_DURATION: 'analysis_duration',
  CHART_RENDER_DURATION: 'chart_render_duration',
  STORY_GENERATION_DURATION: 'story_generation_duration',
  EXPORT_DURATION: 'export_duration'
} as const;

export type PerformanceMeasure = typeof PERFORMANCE_MEASURES[keyof typeof PERFORMANCE_MEASURES];

/**
 * Mark the start of a performance measurement
 */
export const markStart = (mark: PerformanceMark): void => {
  if (!config.enablePerformanceMonitoring) return;
  
  try {
    performance.mark(mark);
  } catch (error) {
    // Silently ignore performance API errors
    if (config.isDevelopment) {
      console.warn('Performance API not available:', error);
    }
  }
};

/**
 * Mark the end of a performance measurement and optionally measure duration
 */
export const markEnd = (
  endMark: PerformanceMark, 
  startMark: PerformanceMark, 
  measureName: PerformanceMeasure
): number | null => {
  if (!config.enablePerformanceMonitoring) return null;
  
  try {
    performance.mark(endMark);
    performance.measure(measureName, startMark, endMark);
    
    const measure = performance.getEntriesByName(measureName)[0];
    const duration = measure?.duration || 0;
    
    if (config.isDevelopment) {
      console.log(`⏱️ ${measureName}: ${duration.toFixed(2)}ms`);
    }
    
    // Clean up marks and measures to avoid memory leaks
    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
    performance.clearMeasures(measureName);
    
    return duration;
  } catch (error) {
    if (config.isDevelopment) {
      console.warn('Performance measurement failed:', error);
    }
    return null;
  }
};

/**
 * Simple timer utility for measuring code execution
 */
export class PerfTimer {
  private startTime: number;
  private label: string;
  
  constructor(label: string) {
    this.label = label;
    this.startTime = performance.now();
  }
  
  end(): number {
    const duration = performance.now() - this.startTime;
    
    if (config.isDevelopment) {
      console.log(`⏱️ ${this.label}: ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }
}

/**
 * Memory usage monitoring
 */
export const getMemoryUsage = (): any => {
  if (!config.enablePerformanceMonitoring) return null;
  
  try {
    // @ts-ignore - memory API may not be available in all browsers
    if (performance.memory) {
      // @ts-ignore
      const memory = performance.memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usedPercentage: ((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(2)
      };
    }
  } catch (error) {
    if (config.isDevelopment) {
      console.warn('Memory API not available:', error);
    }
  }
  
  return null;
};

/**
 * Log memory usage for debugging
 */
export const logMemoryUsage = (label: string = 'Memory Usage'): void => {
  if (!config.isDevelopment) return;
  
  const memory = getMemoryUsage();
  if (memory) {
    console.log(`🧠 ${label}:`, {
      used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
      total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
      limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`,
      percentage: `${memory.usedPercentage}%`
    });
  }
};

/**
 * Debounce utility for performance optimization
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Throttle utility for performance optimization
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), delay);
    }
  };
};

/**
 * Measure and log performance of async operations
 */
export const measureAsync = async <T>(
  operation: () => Promise<T>,
  label: string
): Promise<T> => {
  const timer = new PerfTimer(label);
  
  try {
    const result = await operation();
    timer.end();
    return result;
  } catch (error) {
    timer.end();
    throw error;
  }
};
// Accessibility utilities for keyboard navigation and screen reader support

export interface KeyboardNavigationConfig {
  element: HTMLElement;
  onEnter?: (event: KeyboardEvent) => void;
  onSpace?: (event: KeyboardEvent) => void;
  onArrowKeys?: (event: KeyboardEvent, direction: 'up' | 'down' | 'left' | 'right') => void;
  onEscape?: (event: KeyboardEvent) => void;
  onTab?: (event: KeyboardEvent) => void;
  trapFocus?: boolean;
  autoFocus?: boolean;
}

export interface FocusTrapConfig {
  container: HTMLElement;
  initialFocus?: HTMLElement;
  onEscape?: () => void;
  returnFocusOnDeactivate?: boolean;
}

export interface ScreenReaderConfig {
  liveRegion: HTMLElement;
  politeness?: 'polite' | 'assertive';
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all';
}

class AccessibilityManager {
  private static instance: AccessibilityManager;
  private keyboardHandlers: Map<HTMLElement, (event: KeyboardEvent) => void> = new Map();
  private focusTraps: Map<HTMLElement, FocusTrap> = new Map();
  private liveRegions: Map<string, HTMLElement> = new Map();
  private announcements: string[] = [];
  private announcementTimeout: NodeJS.Timeout | null = null;

  static getInstance(): AccessibilityManager {
    if (!AccessibilityManager.instance) {
      AccessibilityManager.instance = new AccessibilityManager();
    }
    return AccessibilityManager.instance;
  }

  // Keyboard Navigation
  enableKeyboardNavigation(config: KeyboardNavigationConfig): () => void {
    const { element, onEnter, onSpace, onArrowKeys, onEscape, onTab, trapFocus, autoFocus } = config;

    // Make element focusable if it isn't already
    if (!element.hasAttribute('tabindex')) {
      element.setAttribute('tabindex', '0');
    }

    // Add ARIA role if appropriate
    if (!element.getAttribute('role')) {
      if (onEnter || onSpace) {
        element.setAttribute('role', 'button');
      }
    }

    const keyboardHandler = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Enter':
          if (onEnter) {
            event.preventDefault();
            onEnter(event);
          }
          break;

        case ' ':
        case 'Space':
          if (onSpace) {
            event.preventDefault();
            onSpace(event);
          }
          break;

        case 'ArrowUp':
          if (onArrowKeys) {
            event.preventDefault();
            onArrowKeys(event, 'up');
          }
          break;

        case 'ArrowDown':
          if (onArrowKeys) {
            event.preventDefault();
            onArrowKeys(event, 'down');
          }
          break;

        case 'ArrowLeft':
          if (onArrowKeys) {
            event.preventDefault();
            onArrowKeys(event, 'left');
          }
          break;

        case 'ArrowRight':
          if (onArrowKeys) {
            event.preventDefault();
            onArrowKeys(event, 'right');
          }
          break;

        case 'Escape':
          if (onEscape) {
            event.preventDefault();
            onEscape(event);
          }
          break;

        case 'Tab':
          if (onTab) {
            onTab(event);
          }
          if (trapFocus) {
            this.handleFocusTrap(event, element);
          }
          break;
      }
    };

    element.addEventListener('keydown', keyboardHandler);
    this.keyboardHandlers.set(element, keyboardHandler);

    // Auto focus if requested
    if (autoFocus) {
      requestAnimationFrame(() => element.focus());
    }

    // Return cleanup function
    return () => {
      element.removeEventListener('keydown', keyboardHandler);
      this.keyboardHandlers.delete(element);
    };
  }

  // Focus Management
  createFocusTrap(config: FocusTrapConfig): FocusTrap {
    const focusTrap = new FocusTrap(config);
    this.focusTraps.set(config.container, focusTrap);
    return focusTrap;
  }

  removeFocusTrap(container: HTMLElement): void {
    const focusTrap = this.focusTraps.get(container);
    if (focusTrap) {
      focusTrap.deactivate();
      this.focusTraps.delete(container);
    }
  }

  // Screen Reader Support
  createLiveRegion(id: string, config: ScreenReaderConfig): HTMLElement {
    const { politeness = 'polite', atomic = true, relevant = 'additions text' } = config;
    
    let liveRegion = this.liveRegions.get(id);
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', politeness);
      liveRegion.setAttribute('aria-atomic', atomic.toString());
      liveRegion.setAttribute('aria-relevant', relevant);
      liveRegion.setAttribute('role', 'status');
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-9999px';
      liveRegion.style.width = '1px';
      liveRegion.style.height = '1px';
      liveRegion.style.overflow = 'hidden';
      
      document.body.appendChild(liveRegion);
      this.liveRegions.set(id, liveRegion);
    }

    return liveRegion;
  }

  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    this.announcements.push(message);
    
    if (this.announcementTimeout) {
      clearTimeout(this.announcementTimeout);
    }

    this.announcementTimeout = setTimeout(() => {
      const liveRegion = this.createLiveRegion('announcements', {
        liveRegion: document.createElement('div'),
        politeness: priority
      });
      
      liveRegion.textContent = this.announcements.join('. ');
      this.announcements = [];
    }, 100);
  }

  // ARIA Utilities
  setAriaLabel(element: HTMLElement, label: string): void {
    element.setAttribute('aria-label', label);
  }

  setAriaDescription(element: HTMLElement, description: string): void {
    // Create or update description element
    let descriptionId = element.getAttribute('aria-describedby');
    let descriptionElement: HTMLElement | null = null;

    if (descriptionId) {
      descriptionElement = document.getElementById(descriptionId);
    } else {
      descriptionId = `desc-${Math.random().toString(36).substr(2, 9)}`;
      descriptionElement = document.createElement('div');
      descriptionElement.id = descriptionId;
      descriptionElement.style.position = 'absolute';
      descriptionElement.style.left = '-9999px';
      descriptionElement.style.width = '1px';
      descriptionElement.style.height = '1px';
      descriptionElement.style.overflow = 'hidden';
      document.body.appendChild(descriptionElement);
      element.setAttribute('aria-describedby', descriptionId);
    }

    if (descriptionElement) {
      descriptionElement.textContent = description;
    }
  }

  setAriaExpanded(element: HTMLElement, expanded: boolean): void {
    element.setAttribute('aria-expanded', expanded.toString());
  }

  setAriaSelected(element: HTMLElement, selected: boolean): void {
    element.setAttribute('aria-selected', selected.toString());
  }

  setAriaPressed(element: HTMLElement, pressed: boolean): void {
    element.setAttribute('aria-pressed', pressed.toString());
  }

  // Focus Utilities
  getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ];

    return Array.from(container.querySelectorAll(focusableSelectors.join(', ')))
      .filter(el => {
        const element = el as HTMLElement;
        return this.isVisible(element) && !this.isInert(element);
      }) as HTMLElement[];
  }

  focusFirst(container: HTMLElement): boolean {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
      return true;
    }
    return false;
  }

  focusLast(container: HTMLElement): boolean {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1].focus();
      return true;
    }
    return false;
  }

  // Helper Methods
  private handleFocusTrap(event: KeyboardEvent, container: HTMLElement): void {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement as HTMLElement;

    if (event.shiftKey) {
      // Shift + Tab
      if (activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }

  private isVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0';
  }

  private isInert(element: HTMLElement): boolean {
    // Check if element or any parent has inert attribute
    let current: HTMLElement | null = element;
    while (current) {
      if (current.hasAttribute('inert')) {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  }

  // Cleanup
  cleanup(): void {
    // Remove all keyboard handlers
    this.keyboardHandlers.forEach((handler, element) => {
      element.removeEventListener('keydown', handler);
    });
    this.keyboardHandlers.clear();

    // Deactivate all focus traps
    this.focusTraps.forEach(focusTrap => {
      focusTrap.deactivate();
    });
    this.focusTraps.clear();

    // Remove live regions
    this.liveRegions.forEach(liveRegion => {
      if (liveRegion.parentNode) {
        liveRegion.parentNode.removeChild(liveRegion);
      }
    });
    this.liveRegions.clear();

    // Clear announcements
    if (this.announcementTimeout) {
      clearTimeout(this.announcementTimeout);
    }
  }
}

// Focus Trap Implementation
class FocusTrap {
  private container: HTMLElement;
  private initialFocus?: HTMLElement;
  private onEscape?: () => void;
  private returnFocusOnDeactivate: boolean;
  private previousActiveElement: HTMLElement | null = null;
  private active = false;

  constructor(config: FocusTrapConfig) {
    this.container = config.container;
    this.initialFocus = config.initialFocus;
    this.onEscape = config.onEscape;
    this.returnFocusOnDeactivate = config.returnFocusOnDeactivate ?? true;

    this.activate();
  }

  activate(): void {
    if (this.active) return;

    this.previousActiveElement = document.activeElement as HTMLElement;
    this.active = true;

    // Focus initial element or first focusable element
    const targetElement = this.initialFocus || 
      AccessibilityManager.getInstance().getFocusableElements(this.container)[0];

    if (targetElement) {
      requestAnimationFrame(() => targetElement.focus());
    }

    // Add event listeners
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('focusin', this.handleFocusIn);
  }

  deactivate(): void {
    if (!this.active) return;

    this.active = false;

    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('focusin', this.handleFocusIn);

    // Return focus if requested
    if (this.returnFocusOnDeactivate && this.previousActiveElement) {
      this.previousActiveElement.focus();
    }
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.active) return;

    if (event.key === 'Escape' && this.onEscape) {
      event.preventDefault();
      this.onEscape();
    }

    if (event.key === 'Tab') {
      const focusableElements = AccessibilityManager.getInstance()
        .getFocusableElements(this.container);
      
      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement;

      if (event.shiftKey) {
        // Shift + Tab
        if (activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }
  };

  private handleFocusIn = (event: FocusEvent): void => {
    if (!this.active) return;

    const target = event.target as HTMLElement;
    
    // If focus moves outside the container, bring it back
    if (!this.container.contains(target)) {
      event.preventDefault();
      const focusableElements = AccessibilityManager.getInstance()
        .getFocusableElements(this.container);
      
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }
  };
}

// Keyboard Navigation Helpers
export const createKeyboardHandler = (handlers: {
  onEnter?: () => void;
  onSpace?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onEscape?: () => void;
}) => {
  return (event: KeyboardEvent) => {
    switch (event.key) {
      case 'Enter':
        if (handlers.onEnter) {
          event.preventDefault();
          handlers.onEnter();
        }
        break;
      case ' ':
      case 'Space':
        if (handlers.onSpace) {
          event.preventDefault();
          handlers.onSpace();
        }
        break;
      case 'ArrowUp':
        if (handlers.onArrowUp) {
          event.preventDefault();
          handlers.onArrowUp();
        }
        break;
      case 'ArrowDown':
        if (handlers.onArrowDown) {
          event.preventDefault();
          handlers.onArrowDown();
        }
        break;
      case 'ArrowLeft':
        if (handlers.onArrowLeft) {
          event.preventDefault();
          handlers.onArrowLeft();
        }
        break;
      case 'ArrowRight':
        if (handlers.onArrowRight) {
          event.preventDefault();
          handlers.onArrowRight();
        }
        break;
      case 'Escape':
        if (handlers.onEscape) {
          event.preventDefault();
          handlers.onEscape();
        }
        break;
    }
  };
};

// React Hook for Keyboard Navigation
export const useKeyboardNavigation = (
  elementRef: React.RefObject<HTMLElement>,
  config: Omit<KeyboardNavigationConfig, 'element'>,
  dependencies: React.DependencyList = []
) => {
  React.useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const cleanup = AccessibilityManager.getInstance()
      .enableKeyboardNavigation({ ...config, element });

    return cleanup;
  }, [elementRef, ...dependencies]);
};

// React Hook for Focus Trap
export const useFocusTrap = (
  containerRef: React.RefObject<HTMLElement>,
  active: boolean,
  config?: Omit<FocusTrapConfig, 'container'>
) => {
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container || !active) return;

    const focusTrap = AccessibilityManager.getInstance()
      .createFocusTrap({ ...config, container });

    return () => {
      AccessibilityManager.getInstance().removeFocusTrap(container);
    };
  }, [containerRef, active, config]);
};

// React Hook for Announcements
export const useScreenReaderAnnouncement = () => {
  const announce = React.useCallback((message: string, priority?: 'polite' | 'assertive') => {
    AccessibilityManager.getInstance().announce(message, priority);
  }, []);

  return announce;
};

// Export the singleton instance
export default AccessibilityManager.getInstance();
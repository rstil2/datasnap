export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

class ToastService {
  private toasts: Toast[] = [];
  private listeners: ((toasts: Toast[]) => void)[] = [];
  private nextId = 1;

  subscribe(listener: (toasts: Toast[]) => void): () => void {
    this.listeners.push(listener);
    // Immediately notify with current toasts
    listener(this.toasts);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener([...this.toasts]));
  }

  private generateId(): string {
    return `toast-${this.nextId++}`;
  }

  show(message: string, type: Toast['type'] = 'info', options?: {
    duration?: number;
    action?: Toast['action'];
  }): string {
    const id = this.generateId();
    const toast: Toast = {
      id,
      message,
      type,
      duration: options?.duration || 4000,
      action: options?.action
    };

    this.toasts.push(toast);
    this.notify();

    // Auto-remove after duration if no action
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, toast.duration);
    }

    return id;
  }

  success(message: string, options?: { duration?: number; action?: Toast['action'] }): string {
    return this.show(message, 'success', options);
  }

  error(message: string, options?: { duration?: number; action?: Toast['action'] }): string {
    return this.show(message, 'error', { duration: 6000, ...options });
  }

  warning(message: string, options?: { duration?: number; action?: Toast['action'] }): string {
    return this.show(message, 'warning', options);
  }

  info(message: string, options?: { duration?: number; action?: Toast['action'] }): string {
    return this.show(message, 'info', options);
  }

  dismiss(id: string): void {
    this.toasts = this.toasts.filter(toast => toast.id !== id);
    this.notify();
  }

  dismissAll(): void {
    this.toasts = [];
    this.notify();
  }

  // Convenience methods for common comment actions
  commentAdded(author?: string): string {
    return this.success(author ? `${author} added a comment` : 'Comment added successfully');
  }

  replyAdded(author?: string): string {
    return this.success(author ? `${author} replied to your comment` : 'Reply added successfully');
  }

  commentEdited(): string {
    return this.success('Comment updated successfully');
  }

  commentDeleted(): string {
    return this.success('Comment deleted');
  }

  commentLiked(): string {
    return this.success('Comment liked');
  }

  commentUnliked(): string {
    return this.info('Comment unliked');
  }

  commentError(action: string = 'perform action'): string {
    return this.error(`Failed to ${action}. Please try again.`);
  }
}

export const toastService = new ToastService();
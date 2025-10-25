// Real-time update service for syncing story engagement across components

export interface StoryUpdateEvent {
  storyId: string;
  type: 'like' | 'comment' | 'view';
  data: {
    likes?: number;
    comments?: number;
    views?: number;
    likedBy?: string[];
    viewedBy?: string[];
    newComment?: any;
  };
}

export interface CommentUpdateEvent {
  storyId: string;
  commentId: string;
  type: 'like';
  data: {
    likes: number;
    likedBy: string[];
  };
}

class RealtimeUpdateService {
  private static instance: RealtimeUpdateService;
  private storyListeners: Map<string, ((event: StoryUpdateEvent) => void)[]> = new Map();
  private commentListeners: Map<string, ((event: CommentUpdateEvent) => void)[]> = new Map();
  private globalListeners: ((event: StoryUpdateEvent) => void)[] = [];

  static getInstance(): RealtimeUpdateService {
    if (!RealtimeUpdateService.instance) {
      RealtimeUpdateService.instance = new RealtimeUpdateService();
    }
    return RealtimeUpdateService.instance;
  }

  // Subscribe to updates for a specific story
  subscribeToStory(storyId: string, callback: (event: StoryUpdateEvent) => void): () => void {
    if (!this.storyListeners.has(storyId)) {
      this.storyListeners.set(storyId, []);
    }
    this.storyListeners.get(storyId)!.push(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.storyListeners.get(storyId);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
        if (listeners.length === 0) {
          this.storyListeners.delete(storyId);
        }
      }
    };
  }

  // Subscribe to comment updates for a specific story
  subscribeToComments(storyId: string, callback: (event: CommentUpdateEvent) => void): () => void {
    const key = `comments_${storyId}`;
    if (!this.commentListeners.has(key)) {
      this.commentListeners.set(key, []);
    }
    this.commentListeners.get(key)!.push(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.commentListeners.get(key);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
        if (listeners.length === 0) {
          this.commentListeners.delete(key);
        }
      }
    };
  }

  // Subscribe to all story updates (for community feed)
  subscribeToAllStories(callback: (event: StoryUpdateEvent) => void): () => void {
    this.globalListeners.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.globalListeners.indexOf(callback);
      if (index > -1) {
        this.globalListeners.splice(index, 1);
      }
    };
  }

  // Emit story update event
  emitStoryUpdate(event: StoryUpdateEvent): void {
    // Notify specific story listeners
    const storyListeners = this.storyListeners.get(event.storyId);
    if (storyListeners) {
      storyListeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in story update listener:', error);
        }
      });
    }

    // Notify global listeners (community feed)
    this.globalListeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in global story update listener:', error);
      }
    });

    // Also emit as custom browser event for cross-tab communication
    window.dispatchEvent(new CustomEvent('storyUpdate', { detail: event }));
  }

  // Emit comment update event
  emitCommentUpdate(event: CommentUpdateEvent): void {
    const key = `comments_${event.storyId}`;
    const commentListeners = this.commentListeners.get(key);
    if (commentListeners) {
      commentListeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in comment update listener:', error);
        }
      });
    }

    // Also emit as custom browser event
    window.dispatchEvent(new CustomEvent('commentUpdate', { detail: event }));
  }

  // Initialize cross-tab communication listeners
  initializeCrossTabSync(): void {
    // Listen for story updates from other tabs
    window.addEventListener('storyUpdate', ((event: CustomEvent<StoryUpdateEvent>) => {
      const storyListeners = this.storyListeners.get(event.detail.storyId);
      if (storyListeners) {
        storyListeners.forEach(callback => {
          try {
            callback(event.detail);
          } catch (error) {
            console.error('Error in cross-tab story update:', error);
          }
        });
      }

      this.globalListeners.forEach(callback => {
        try {
          callback(event.detail);
        } catch (error) {
          console.error('Error in cross-tab global update:', error);
        }
      });
    }) as EventListener);

    // Listen for comment updates from other tabs
    window.addEventListener('commentUpdate', ((event: CustomEvent<CommentUpdateEvent>) => {
      const key = `comments_${event.detail.storyId}`;
      const commentListeners = this.commentListeners.get(key);
      if (commentListeners) {
        commentListeners.forEach(callback => {
          try {
            callback(event.detail);
          } catch (error) {
            console.error('Error in cross-tab comment update:', error);
          }
        });
      }
    }) as EventListener);

    // Listen for localStorage changes (for cross-tab sync)
    window.addEventListener('storage', (event) => {
      if (event.key?.includes('datasnap_community') || event.key?.includes('datasnap_stories')) {
        // Broadcast a general refresh event when storage changes
        window.dispatchEvent(new CustomEvent('storageSync', { 
          detail: { key: event.key, newValue: event.newValue } 
        }));
      }
    });
  }

  // Clean up all listeners
  cleanup(): void {
    this.storyListeners.clear();
    this.commentListeners.clear();
    this.globalListeners.length = 0;
  }
}

export const realtimeUpdates = RealtimeUpdateService.getInstance();

// Initialize cross-tab sync when the service is imported
realtimeUpdates.initializeCrossTabSync();
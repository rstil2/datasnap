import { ExportableStory, CommunityStory, User } from '../types';
import { storyService } from './firebase/storyService';
import { authService } from './firebase/authService';
import { config } from '../config';

// Import the legacy storage for fallback
import { storyStorage as legacyStorage } from './storyStorage';

export interface StoredStory extends ExportableStory {
  // Additional fields for storage
  createdAt: string;
  updatedAt: string;
  author: string;
  authorId: string;
  authorAvatar: string;
  isPublic: boolean;
  likes: number;
  likedBy: string[]; // Array of user IDs who liked this story
  comments: Comment[];
  views: number;
  viewedBy: string[]; // Array of user IDs who viewed this story
  tags: string[];
}

export interface StoryStats {
  totalStories: number;
  publicStories: number;
  totalViews: number;
  totalLikes: number;
}

class HybridStoryStorageService {
  private static instance: HybridStoryStorageService;
  private isFirebaseAvailable = false;

  static getInstance(): HybridStoryStorageService {
    if (!HybridStoryStorageService.instance) {
      HybridStoryStorageService.instance = new HybridStoryStorageService();
    }
    return HybridStoryStorageService.instance;
  }

  constructor() {
    this.checkFirebaseAvailability();
  }

  private async checkFirebaseAvailability(): Promise<void> {
    try {
      // Check if Firebase config is available
      this.isFirebaseAvailable = !!(
        config.firebase.apiKey &&
        config.firebase.projectId &&
        config.firebase.authDomain
      );
    } catch (error) {
      this.isFirebaseAvailable = false;
      if (config.isDevelopment) {
        console.warn('Firebase not available, using localStorage fallback:', error);
      }
    }
  }

  // Check if user is authenticated with Firebase
  private isUserAuthenticated(): boolean {
    return this.isFirebaseAvailable && authService.isAuthenticated();
  }

  // Publish a story to the community feed
  async publishStory(
    story: ExportableStory, 
    user: User, 
    isPublic: boolean = true, 
    tags: string[] = []
  ): Promise<string> {
    try {
      if (this.isUserAuthenticated() && isPublic) {
        // Use Firebase for public stories when user is authenticated
        console.log('Publishing story with user info:', {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          userAvatar: user.avatar
        });
        const storyId = await storyService.publishStory(
          story, 
          user.id, 
          user.name, 
          user.email,
          user.avatar
        );
        
        // Also save locally for offline access
        legacyStorage.saveStoryWithUser(story, user, isPublic, tags);
        
        return storyId;
      } else {
        // Use localStorage for private stories or when not authenticated
        return legacyStorage.saveStoryWithUser(story, user, isPublic, tags);
      }
    } catch (error) {
      if (config.isDevelopment) {
        console.error('Failed to publish story to Firebase, using localStorage:', error);
      }
      // Fallback to localStorage on error
      return legacyStorage.saveStoryWithUser(story, user, isPublic, tags);
    }
  }

  // Get community stories with real-time updates
  async getCommunityStories(
    sortBy: 'recent' | 'trending' | 'popular' = 'recent'
  ): Promise<CommunityStory[]> {
    try {
      if (this.isFirebaseAvailable) {
        // Get stories from Firebase
        const firebaseStories = await storyService.getStories(50, sortBy);
        
        // Merge with local stories for offline-first experience
        const localStories = legacyStorage.getCommunityStoriesArray();
        
        // Combine and deduplicate
        const storyMap = new Map<string, CommunityStory>();
        
        // Add local stories first
        localStories.forEach(story => {
          storyMap.set(story.id, story);
        });
        
        // Add/override with Firebase stories
        firebaseStories.forEach(story => {
          storyMap.set(story.id, story);
        });
        
        return Array.from(storyMap.values())
          .sort((a, b) => {
            switch (sortBy) {
              case 'trending':
                return (b.views + b.likes) - (a.views + a.likes);
              case 'popular':
                return b.likes - a.likes;
              case 'recent':
              default:
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
          })
          .slice(0, 50);
      } else {
        // Fallback to localStorage
        return legacyStorage.getCommunityStoriesArray();
      }
    } catch (error) {
      if (config.isDevelopment) {
        console.error('Failed to fetch stories from Firebase, using localStorage:', error);
      }
      return legacyStorage.getCommunityStoriesArray();
    }
  }

  // Subscribe to real-time story updates
  onStoriesChange(
    callback: (stories: CommunityStory[]) => void,
    sortBy: 'recent' | 'trending' | 'popular' = 'recent'
  ): () => void {
    if (this.isFirebaseAvailable) {
      // Use Firebase real-time updates
      return storyService.onStoriesChange((firebaseStories) => {
        // Merge with local stories
        const localStories = legacyStorage.getCommunityStoriesArray();
        const storyMap = new Map<string, CommunityStory>();
        
        localStories.forEach(story => storyMap.set(story.id, story));
        firebaseStories.forEach(story => storyMap.set(story.id, story));
        
        const mergedStories = Array.from(storyMap.values())
          .sort((a, b) => {
            switch (sortBy) {
              case 'trending':
                return (b.views + b.likes) - (a.views + a.likes);
              case 'popular':
                return b.likes - a.likes;
              case 'recent':
              default:
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
          })
          .slice(0, 50);
        
        callback(mergedStories);
      }, sortBy);
    } else {
      // For localStorage, we'll poll for changes
      const interval = setInterval(async () => {
        const stories = await this.getCommunityStories(sortBy);
        callback(stories);
      }, 5000); // Poll every 5 seconds
      
      // Return cleanup function
      return () => clearInterval(interval);
    }
  }

  // Like a story
  async likeStoryWithUser(storyId: string, userId: string): Promise<void> {
    try {
      if (this.isUserAuthenticated()) {
        // Use Firebase
        await storyService.likeStory(storyId, userId);
      } else {
        // Use localStorage
        legacyStorage.likeStoryWithUser(storyId, userId);
      }
    } catch (error) {
      if (config.isDevelopment) {
        console.error('Failed to like story via Firebase, using localStorage:', error);
      }
      // Fallback to localStorage
      legacyStorage.likeStoryWithUser(storyId, userId);
    }
  }

  // Check if user liked a story
  async hasUserLikedStory(storyId: string, userId: string): Promise<boolean> {
    try {
      if (this.isUserAuthenticated()) {
        // Use Firebase
        return await storyService.hasUserLikedStory(storyId, userId);
      } else {
        // Use localStorage
        return legacyStorage.hasUserLikedStory(storyId, userId);
      }
    } catch (error) {
      if (config.isDevelopment) {
        console.error('Failed to check like status via Firebase, using localStorage:', error);
      }
      return legacyStorage.hasUserLikedStory(storyId, userId);
    }
  }

  // Get a single story
  async getStory(storyId: string): Promise<CommunityStory | null> {
    try {
      if (this.isFirebaseAvailable) {
        const firebaseStory = await storyService.getStory(storyId);
        if (firebaseStory) return firebaseStory;
      }
      
      // Fallback to localStorage
      const localStory = legacyStorage.getStory(storyId);
      return localStory ? legacyStorage.toCommunityStory(localStory) : null;
    } catch (error) {
      if (config.isDevelopment) {
        console.error('Failed to fetch story from Firebase, using localStorage:', error);
      }
      const localStory = legacyStorage.getStory(storyId);
      return localStory ? legacyStorage.toCommunityStory(localStory) : null;
    }
  }

  // Increment view count
  async incrementViews(storyId: string): Promise<void> {
    try {
      if (this.isUserAuthenticated()) {
        await storyService.incrementViews(storyId);
      } else {
        legacyStorage.incrementViews(storyId);
      }
    } catch (error) {
      if (config.isDevelopment) {
        console.error('Failed to increment views via Firebase, using localStorage:', error);
      }
      legacyStorage.incrementViews(storyId);
    }
  }

  // Increment view count with user tracking
  async incrementStoryViews(storyId: string, userId: string): Promise<void> {
    try {
      if (this.isUserAuthenticated()) {
        await storyService.incrementViewsWithUser(storyId, userId);
      } else {
        legacyStorage.incrementViews(storyId);
      }
    } catch (error) {
      if (config.isDevelopment) {
        console.error('Failed to increment story views via Firebase, using localStorage:', error);
      }
      legacyStorage.incrementViews(storyId);
    }
  }

  // Delete a story
  async deleteStory(storyId: string, authorId: string): Promise<void> {
    try {
      if (this.isUserAuthenticated()) {
        await storyService.deleteStory(storyId, authorId);
      }
      // Always also delete locally
      legacyStorage.deleteStory(storyId);
    } catch (error) {
      if (config.isDevelopment) {
        console.error('Failed to delete story via Firebase, deleting locally only:', error);
      }
      legacyStorage.deleteStory(storyId);
    }
  }

  // Search stories
  async searchStories(query: string, limitCount = 20): Promise<CommunityStory[]> {
    try {
      if (this.isFirebaseAvailable) {
        const firebaseResults = await storyService.searchStories(query, limitCount);
        const localResults = legacyStorage.searchStories(query, limitCount);
        
        // Combine and deduplicate results
        const storyMap = new Map<string, CommunityStory>();
        localResults.forEach(story => storyMap.set(story.id, story));
        firebaseResults.forEach(story => storyMap.set(story.id, story));
        
        return Array.from(storyMap.values()).slice(0, limitCount);
      } else {
        return legacyStorage.searchStories(query, limitCount);
      }
    } catch (error) {
      if (config.isDevelopment) {
        console.error('Failed to search via Firebase, using localStorage:', error);
      }
      return legacyStorage.searchStories(query, limitCount);
    }
  }

  // Get user's own stories
  getUserStories(userId?: string): StoredStory[] {
    // This mainly uses localStorage as it's for private/draft stories
    return legacyStorage.getUserStoriesArray(userId);
  }

  // Legacy compatibility methods
  toCommunityStory(story: StoredStory): CommunityStory {
    return legacyStorage.toCommunityStory(story);
  }

  getCommunityStoriesArray(): CommunityStory[] {
    // This will be replaced by the async version above
    return legacyStorage.getCommunityStoriesArray();
  }

  // Export Firebase availability status
  isFirebaseEnabled(): boolean {
    return this.isFirebaseAvailable;
  }
}

// Export singleton instance
export const hybridStoryStorage = HybridStoryStorageService.getInstance();
export default hybridStoryStorage;
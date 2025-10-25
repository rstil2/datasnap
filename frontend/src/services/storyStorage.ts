import { ExportableStory, CommunityStory, User } from '../types';
import { userService } from './userService';
import { realtimeUpdates } from './realtimeUpdates';

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

export interface Comment {
  id: string;
  author: string;
  authorId: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  likes: number;
  likedBy: string[]; // Array of user IDs who liked this comment
  parentId?: string; // For threaded comments
}

export interface StoryStats {
  totalStories: number;
  publicStories: number;
  totalViews: number;
  totalLikes: number;
}

class StoryStorageService {
  private static instance: StoryStorageService;
  private readonly STORIES_KEY = 'datasnap_stories';
  private readonly USER_KEY = 'datasnap_user';
  private readonly COMMUNITY_STORIES_KEY = 'datasnap_community';

  static getInstance(): StoryStorageService {
    if (!StoryStorageService.instance) {
      StoryStorageService.instance = new StoryStorageService();
    }
    return StoryStorageService.instance;
  }

  // User management (simple system for now)
  getCurrentUser(): string {
    let user = localStorage.getItem(this.USER_KEY);
    if (!user) {
      // Generate a simple user ID
      user = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(this.USER_KEY, user);
    }
    return user;
  }

  setUserName(name: string): void {
    const currentUser = this.getCurrentUser();
    const userData = {
      id: currentUser,
      name: name,
      createdAt: new Date().toISOString()
    };
    localStorage.setItem(this.USER_KEY, JSON.stringify(userData));
  }

  getUserData(): { id: string; name: string; createdAt: string } {
    const userData = localStorage.getItem(this.USER_KEY);
    if (!userData) {
      const user = this.getCurrentUser();
      return {
        id: user,
        name: `Anonymous User`,
        createdAt: new Date().toISOString()
      };
    }
    
    try {
      const parsed = JSON.parse(userData);
      if (typeof parsed === 'string') {
        // Legacy format - just the ID
        return {
          id: parsed,
          name: `User ${parsed.slice(-8)}`,
          createdAt: new Date().toISOString()
        };
      }
      return parsed;
    } catch {
      const user = this.getCurrentUser();
      return {
        id: user,
        name: `User ${user.slice(-8)}`,
        createdAt: new Date().toISOString()
      };
    }
  }

  // Story CRUD operations
  saveStory(story: ExportableStory, isPublic: boolean = false, tags: string[] = []): string {
    const user = this.getUserData();
    const now = new Date().toISOString();
    
    const storedStory: StoredStory = {
      ...story,
      createdAt: now,
      updatedAt: now,
      author: user.name,
      authorId: user.id,
      authorAvatar: '👤', // Default avatar for legacy stories
      isPublic,
      likes: 0,
      likedBy: [],
      comments: [],
      views: 0,
      viewedBy: [],
      tags
    };

    // Save to user's stories
    const userStories = this.getUserStories();
    userStories[story.id] = storedStory;
    localStorage.setItem(this.STORIES_KEY, JSON.stringify(userStories));

    // If public, add to community feed
    if (isPublic) {
      this.addToCommunityFeed(storedStory);
    }

    return story.id;
  }

  // New method to save story with proper user context
  saveStoryWithUser(story: ExportableStory, user: User, isPublic: boolean = false, tags: string[] = []): string {
    const now = new Date().toISOString();
    
    const storedStory: StoredStory = {
      ...story,
      createdAt: now,
      updatedAt: now,
      author: user.name,
      authorId: user.id,
      authorAvatar: user.avatar,
      isPublic,
      likes: 0,
      likedBy: [],
      comments: [],
      views: 0,
      viewedBy: [],
      tags
    };

    // Save to user's stories (use userId as key prefix for proper isolation)
    const userStoriesKey = `${this.STORIES_KEY}_${user.id}`;
    const userStories = this.getUserStoriesForUser(user.id);
    userStories[story.id] = storedStory;
    localStorage.setItem(userStoriesKey, JSON.stringify(userStories));

    // If public, add to community feed
    if (isPublic) {
      this.addToCommunityFeed(storedStory);
    }

    // Increment user story count
    userService.incrementStoriesCount();

    return story.id;
  }

  getStory(storyId: string): StoredStory | null {
    // Check user stories first
    const userStories = this.getUserStories();
    if (userStories[storyId]) {
      return userStories[storyId];
    }

    // Check community stories
    const communityStories = this.getCommunityStories();
    return communityStories[storyId] || null;
  }

  getUserStories(): Record<string, StoredStory> {
    try {
      const stories = localStorage.getItem(this.STORIES_KEY);
      return stories ? JSON.parse(stories) : {};
    } catch {
      return {};
    }
  }

  getUserStoriesForUser(userId: string): Record<string, StoredStory> {
    try {
      const userStoriesKey = `${this.STORIES_KEY}_${userId}`;
      const stories = localStorage.getItem(userStoriesKey);
      return stories ? JSON.parse(stories) : {};
    } catch {
      return {};
    }
  }

  getUserStoriesArray(): StoredStory[] {
    const stories = this.getUserStories();
    return Object.values(stories).sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  updateStory(storyId: string, updates: Partial<StoredStory>): boolean {
    const userStories = this.getUserStories();
    if (!userStories[storyId]) return false;

    userStories[storyId] = {
      ...userStories[storyId],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(this.STORIES_KEY, JSON.stringify(userStories));

    // Update in community feed if public
    if (userStories[storyId].isPublic) {
      this.updateCommunityStory(storyId, updates);
    }

    return true;
  }

  deleteStory(storyId: string): boolean {
    const userStories = this.getUserStories();
    if (!userStories[storyId]) return false;

    delete userStories[storyId];
    localStorage.setItem(this.STORIES_KEY, JSON.stringify(userStories));

    // Remove from community feed
    this.removeFromCommunityFeed(storyId);

    return true;
  }

  // Community feed operations
  getCommunityStories(): Record<string, StoredStory> {
    try {
      const stories = localStorage.getItem(this.COMMUNITY_STORIES_KEY);
      return stories ? JSON.parse(stories) : {};
    } catch {
      return {};
    }
  }

  getCommunityStoriesArray(filters?: {
    tags?: string[];
    author?: string;
    sortBy?: 'recent' | 'popular' | 'likes';
    limit?: number;
  }): StoredStory[] {
    let stories = Object.values(this.getCommunityStories()).filter(story => story.isPublic);

    // Apply filters
    if (filters?.tags && filters.tags.length > 0) {
      stories = stories.filter(story => 
        story.tags.some(tag => filters.tags!.includes(tag))
      );
    }

    if (filters?.author) {
      stories = stories.filter(story => 
        story.author.toLowerCase().includes(filters.author!.toLowerCase())
      );
    }

    // Sort stories
    switch (filters?.sortBy) {
      case 'popular':
        stories.sort((a, b) => b.views - a.views);
        break;
      case 'likes':
        stories.sort((a, b) => b.likes - a.likes);
        break;
      case 'recent':
      default:
        stories.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
    }

    // Apply limit
    if (filters?.limit) {
      stories = stories.slice(0, filters.limit);
    }

    return stories;
  }

  private addToCommunityFeed(story: StoredStory): void {
    const communityStories = this.getCommunityStories();
    communityStories[story.id] = story;
    localStorage.setItem(this.COMMUNITY_STORIES_KEY, JSON.stringify(communityStories));
  }

  private updateCommunityStory(storyId: string, updates: Partial<StoredStory>): void {
    const communityStories = this.getCommunityStories();
    if (communityStories[storyId]) {
      communityStories[storyId] = { ...communityStories[storyId], ...updates };
      localStorage.setItem(this.COMMUNITY_STORIES_KEY, JSON.stringify(communityStories));
    }
  }

  private removeFromCommunityFeed(storyId: string): void {
    const communityStories = this.getCommunityStories();
    delete communityStories[storyId];
    localStorage.setItem(this.COMMUNITY_STORIES_KEY, JSON.stringify(communityStories));
  }

  // Social interactions
  likeStory(storyId: string): boolean {
    const story = this.getStory(storyId);
    if (!story) return false;

    // Simple like system - just increment (in real app, would track user likes)
    this.updateStory(storyId, { likes: story.likes + 1 });
    return true;
  }

  // Enhanced like system with user tracking
  likeStoryWithUser(storyId: string, userId: string): { success: boolean; isLiked: boolean; newLikeCount: number } {
    const story = this.getStory(storyId);
    if (!story) return { success: false, isLiked: false, newLikeCount: 0 };

    const likedBy = story.likedBy || [];
    const hasLiked = likedBy.includes(userId);

    let newLikedBy: string[];
    let newLikes: number;
    let isLiked: boolean;

    if (hasLiked) {
      // User is unliking the story
      newLikedBy = likedBy.filter(id => id !== userId);
      newLikes = Math.max(0, story.likes - 1);
      isLiked = false;
    } else {
      // User is liking the story
      newLikedBy = [...likedBy, userId];
      newLikes = story.likes + 1;
      isLiked = true;
      
      // Update the story author's total likes count
      if (story.authorId && story.authorId !== userId) {
        userService.incrementTotalLikes(1);
      }
    }

    const updateResult = this.updateStory(storyId, { 
      likes: newLikes, 
      likedBy: newLikedBy 
    });

    // Emit real-time update event
    if (updateResult) {
      realtimeUpdates.emitStoryUpdate({
        storyId,
        type: 'like',
        data: {
          likes: newLikes,
          likedBy: newLikedBy
        }
      });
    }

    return { 
      success: updateResult, 
      isLiked, 
      newLikeCount: newLikes 
    };
  }

  // Check if a user has liked a story
  hasUserLikedStory(storyId: string, userId: string): boolean {
    const story = this.getStory(storyId);
    if (!story) return false;
    
    return (story.likedBy || []).includes(userId);
  }

  addComment(storyId: string, content: string): string | null {
    const story = this.getStory(storyId);
    if (!story) return null;

    const user = this.getUserData();
    const comment: Comment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      author: user.name,
      authorId: user.id,
      authorAvatar: '👤', // Default avatar for legacy comments
      content,
      createdAt: new Date().toISOString(),
      likes: 0,
      likedBy: []
    };

    const updatedComments = [...story.comments, comment];
    this.updateStory(storyId, { comments: updatedComments });

    return comment.id;
  }

  // Enhanced comment system with user tracking
  addCommentWithUser(storyId: string, content: string, user: User, parentId?: string): string | null {
    const story = this.getStory(storyId);
    if (!story) return null;

    const comment: Comment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      author: user.name,
      authorId: user.id,
      authorAvatar: user.avatar,
      content: content.trim(),
      createdAt: new Date().toISOString(),
      likes: 0,
      likedBy: [],
      parentId
    };

    const updatedComments = [...story.comments, comment];
    const updateResult = this.updateStory(storyId, { comments: updatedComments });

    // Emit real-time update event
    if (updateResult) {
      realtimeUpdates.emitStoryUpdate({
        storyId,
        type: 'comment',
        data: {
          comments: updatedComments.length,
          newComment: comment
        }
      });
    }

    return comment.id;
  }

  // Like a comment
  likeComment(storyId: string, commentId: string, userId: string): { success: boolean; isLiked: boolean; newLikeCount: number } {
    const story = this.getStory(storyId);
    if (!story) return { success: false, isLiked: false, newLikeCount: 0 };

    const commentIndex = story.comments.findIndex(c => c.id === commentId);
    if (commentIndex === -1) return { success: false, isLiked: false, newLikeCount: 0 };

    const comment = story.comments[commentIndex];
    const likedBy = comment.likedBy || [];
    const hasLiked = likedBy.includes(userId);

    let newLikedBy: string[];
    let newLikes: number;
    let isLiked: boolean;

    if (hasLiked) {
      // User is unliking the comment
      newLikedBy = likedBy.filter(id => id !== userId);
      newLikes = Math.max(0, comment.likes - 1);
      isLiked = false;
    } else {
      // User is liking the comment
      newLikedBy = [...likedBy, userId];
      newLikes = comment.likes + 1;
      isLiked = true;
    }

    const updatedComments = [...story.comments];
    updatedComments[commentIndex] = {
      ...comment,
      likes: newLikes,
      likedBy: newLikedBy
    };

    const updateResult = this.updateStory(storyId, { comments: updatedComments });

    // Emit real-time comment update event
    if (updateResult) {
      realtimeUpdates.emitCommentUpdate({
        storyId,
        commentId,
        type: 'like',
        data: {
          likes: newLikes,
          likedBy: newLikedBy
        }
      });
    }

    return { 
      success: updateResult, 
      isLiked, 
      newLikeCount: newLikes 
    };
  }

  // Check if a user has liked a comment
  hasUserLikedComment(storyId: string, commentId: string, userId: string): boolean {
    const story = this.getStory(storyId);
    if (!story) return false;
    
    const comment = story.comments.find(c => c.id === commentId);
    if (!comment) return false;
    
    return (comment.likedBy || []).includes(userId);
  }

  // Edit a comment (only by the author)
  editComment(storyId: string, commentId: string, newContent: string, userId: string): boolean {
    const story = this.getStory(storyId);
    if (!story) return false;

    const commentIndex = story.comments.findIndex(c => c.id === commentId);
    if (commentIndex === -1) return false;

    const comment = story.comments[commentIndex];
    // Only allow the author to edit their own comment
    if (comment.authorId !== userId) return false;

    const updatedComments = [...story.comments];
    updatedComments[commentIndex] = {
      ...comment,
      content: newContent.trim(),
      updatedAt: new Date().toISOString()
    };

    return this.updateStory(storyId, { comments: updatedComments });
  }

  // Delete a comment (only by the author)
  deleteComment(storyId: string, commentId: string, userId: string): boolean {
    const story = this.getStory(storyId);
    if (!story) return false;

    const comment = story.comments.find(c => c.id === commentId);
    if (!comment) return false;

    // Only allow the author to delete their own comment
    if (comment.authorId !== userId) return false;

    // Remove the comment and any replies to it
    const updatedComments = story.comments.filter(c => 
      c.id !== commentId && c.parentId !== commentId
    );

    const updateResult = this.updateStory(storyId, { comments: updatedComments });
    
    // Emit real-time update event
    if (updateResult) {
      realtimeUpdates.emitStoryUpdate({
        storyId,
        type: 'comment',
        data: {
          comments: updatedComments.length
        }
      });
    }

    return updateResult;
  }

  // Get threaded comments for a story (organized by parent-child relationships)
  getThreadedComments(storyId: string): { topLevel: Comment[], replies: Record<string, Comment[]> } {
    const story = this.getStory(storyId);
    if (!story) return { topLevel: [], replies: {} };

    const topLevel: Comment[] = [];
    const replies: Record<string, Comment[]> = {};

    story.comments.forEach(comment => {
      if (!comment.parentId) {
        topLevel.push(comment);
      } else {
        if (!replies[comment.parentId]) {
          replies[comment.parentId] = [];
        }
        replies[comment.parentId].push(comment);
      }
    });

    // Sort top-level comments by creation date (newest first)
    topLevel.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Sort replies by creation date (oldest first for natural conversation flow)
    Object.keys(replies).forEach(parentId => {
      replies[parentId].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });

    return { topLevel, replies };
  }

  incrementViews(storyId: string): void {
    const story = this.getStory(storyId);
    if (story && story.author !== this.getUserData().name) {
      // Don't count views from the author
      this.updateStory(storyId, { views: story.views + 1 });
    }
  }

  // Enhanced view tracking with user awareness
  incrementViewsWithUser(storyId: string, userId: string): boolean {
    const story = this.getStory(storyId);
    if (!story || story.authorId === userId) {
      // Don't count views from the story author
      return false;
    }

    const viewedBy = story.viewedBy || [];
    const hasViewed = viewedBy.includes(userId);

    if (!hasViewed) {
      // Only count unique views per user
      const newViewedBy = [...viewedBy, userId];
      const newViews = story.views + 1;
      
      const updateResult = this.updateStory(storyId, { 
        views: newViews, 
        viewedBy: newViewedBy 
      });
      
      // Emit real-time update event
      if (updateResult) {
        realtimeUpdates.emitStoryUpdate({
          storyId,
          type: 'view',
          data: {
            views: newViews,
            viewedBy: newViewedBy
          }
        });
      }
      
      return updateResult;
    }

    return false; // User has already viewed this story
  }

  // Statistics
  getStoryStats(): StoryStats {
    const userStories = this.getUserStoriesArray();
    const communityStories = this.getCommunityStoriesArray();

    return {
      totalStories: userStories.length,
      publicStories: userStories.filter(s => s.isPublic).length,
      totalViews: communityStories.reduce((sum, s) => sum + s.views, 0),
      totalLikes: communityStories.reduce((sum, s) => sum + s.likes, 0)
    };
  }

  // Utility functions
  getAllTags(): string[] {
    const communityStories = this.getCommunityStoriesArray();
    const allTags = communityStories.flatMap(story => story.tags);
    return [...new Set(allTags)].sort();
  }

  searchStories(query: string): StoredStory[] {
    const stories = this.getCommunityStoriesArray();
    const lowerQuery = query.toLowerCase();

    return stories.filter(story => 
      story.title.toLowerCase().includes(lowerQuery) ||
      story.summary.toLowerCase().includes(lowerQuery) ||
      story.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      story.author.toLowerCase().includes(lowerQuery)
    );
  }

  // Export/Import for backup
  exportData(): string {
    const data = {
      user: this.getUserData(),
      userStories: this.getUserStories(),
      communityStories: this.getCommunityStories(),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  }

  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.userStories) {
        localStorage.setItem(this.STORIES_KEY, JSON.stringify(data.userStories));
      }
      
      if (data.communityStories) {
        localStorage.setItem(this.COMMUNITY_STORIES_KEY, JSON.stringify(data.communityStories));
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  // Convert StoredStory to CommunityStory format
  toCommunityStory(story: StoredStory): CommunityStory {
    return {
      id: story.id,
      title: story.title,
      author: story.author,
      authorId: story.authorId,
      authorAvatar: story.authorAvatar,
      summary: story.summary,
      storyType: story.metadata.story_type,
      qualityScore: story.metadata.data_quality_score,
      createdAt: story.createdAt,
      likes: story.likes,
      comments: story.comments.length,
      views: story.views,
      tags: story.tags,
      isPublic: story.isPublic,
      previewChart: story.charts?.[0] || undefined
    };
  }
}

export const storyStorage = StoryStorageService.getInstance();
export default storyStorage;
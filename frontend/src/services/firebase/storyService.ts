import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  increment,
  serverTimestamp,
  Timestamp,
  DocumentReference,
  QuerySnapshot,
  DocumentSnapshot,
  FirestoreError,
} from 'firebase/firestore';
import { db } from './config';
import { CommunityStory, ExportableStory } from '../../types';
import { config } from '../../config';

export interface FirebaseStory extends Omit<CommunityStory, 'id' | 'createdAt' | 'updatedAt'> {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  authorId: string;
  authorEmail?: string;
}

export interface StoryLike {
  storyId: string;
  userId: string;
  createdAt: Timestamp;
}

export interface FirestoreServiceError {
  code: string;
  message: string;
}

class FirebaseStoryService {
  private readonly COLLECTIONS = {
    STORIES: 'stories',
    LIKES: 'story_likes',
    VIEWS: 'story_views',
    COMMENTS: 'story_comments',
  } as const;

  // Convert Firestore document to CommunityStory
  private formatStory(doc: DocumentSnapshot): CommunityStory | null {
    if (!doc.exists()) return null;

    const data = doc.data() as FirebaseStory;
    return {
      id: doc.id,
      title: data.title,
      summary: data.summary,
      narrative: data.narrative || '',
      key_insights: data.key_insights || [],
      recommendations: data.recommendations || [],
      author: data.author,
      authorId: data.authorId,
      authorEmail: data.authorEmail,
      authorAvatar: data.authorAvatar,
      storyType: data.storyType,
      tags: data.tags || [],
      likes: data.likes || 0,
      comments: data.comments || 0,
      views: data.views || 0,
      qualityScore: data.qualityScore || 0,
      metadata: data.metadata || {},
      createdAt: data.createdAt.toDate().toISOString(),
      updatedAt: data.updatedAt.toDate().toISOString(),
    };
  }

  // Handle Firestore errors
  private formatError(error: FirestoreError): FirestoreServiceError {
    return {
      code: error.code,
      message: this.getFriendlyErrorMessage(error.code),
    };
  }

  // Get user-friendly error messages
  private getFriendlyErrorMessage(errorCode: string): string {
    const errorMessages: Record<string, string> = {
      'permission-denied': 'You do not have permission to perform this action.',
      'not-found': 'The requested story was not found.',
      'already-exists': 'A story with this ID already exists.',
      'resource-exhausted': 'Too many requests. Please try again later.',
      'failed-precondition': 'The operation could not be completed.',
      'aborted': 'The operation was aborted. Please try again.',
      'out-of-range': 'The request is outside the valid range.',
      'unimplemented': 'This feature is not yet implemented.',
      'internal': 'An internal error occurred. Please try again later.',
      'unavailable': 'The service is temporarily unavailable. Please try again.',
      'data-loss': 'Data loss occurred. Please contact support.',
      'unauthenticated': 'You must be signed in to perform this action.',
    };

    return errorMessages[errorCode] || 'An unexpected error occurred. Please try again.';
  }

  // Helper function to format display names
  private formatDisplayName(author: string, authorId: string): string {
    // If author looks like a Firebase UID (long alphanumeric string), generate a better name
    if (author && author.length >= 20 && /^[a-zA-Z0-9]+$/.test(author) && !author.includes('@')) {
      return 'User'; // Replace UID with generic 'User'
    }
    
    // If it's an email, extract a clean name
    if (author && author.includes('@')) {
      const emailPrefix = author.split('@')[0];
      return emailPrefix
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
    }
    
    // Return the author name as-is if it looks normal
    return author || 'Anonymous';
  }

  // Publish a new story
  async publishStory(story: ExportableStory, authorId: string, author: string, authorEmail?: string, authorAvatar?: string): Promise<string> {
    try {
      // Clean up the author display name
      const cleanAuthor = this.formatDisplayName(author, authorId);
      
      const storyData: Omit<FirebaseStory, 'createdAt' | 'updatedAt'> = {
        title: story.title,
        summary: story.summary,
        narrative: story.narrative || '',
        key_insights: story.key_insights || [],
        recommendations: story.recommendations || [],
        author: cleanAuthor,
        authorId,
        authorEmail: authorEmail || null,
        authorAvatar: authorAvatar || null,
        storyType: story.metadata?.story_type || 'insights',
        tags: this.extractTags(story),
        likes: 0,
        comments: 0,
        views: 0,
        qualityScore: story.metadata?.data_quality_score || 0,
        metadata: story.metadata || {},
      };

      const docRef = await addDoc(collection(db, this.COLLECTIONS.STORIES), {
        ...storyData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return docRef.id;
    } catch (error) {
      throw this.formatError(error as FirestoreError);
    }
  }

  // Get all stories with pagination
  async getStories(limitCount = 50, sortBy: 'recent' | 'trending' | 'popular' = 'recent'): Promise<CommunityStory[]> {
    try {
      let q = query(collection(db, this.COLLECTIONS.STORIES));

      switch (sortBy) {
        case 'recent':
          q = query(q, orderBy('createdAt', 'desc'), limit(limitCount));
          break;
        case 'trending':
          q = query(q, orderBy('views', 'desc'), orderBy('createdAt', 'desc'), limit(limitCount));
          break;
        case 'popular':
          q = query(q, orderBy('likes', 'desc'), orderBy('createdAt', 'desc'), limit(limitCount));
          break;
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => this.formatStory(doc)).filter(Boolean) as CommunityStory[];
    } catch (error) {
      throw this.formatError(error as FirestoreError);
    }
  }

  // Get stories by author
  async getStoriesByAuthor(authorId: string, limitCount = 20): Promise<CommunityStory[]> {
    try {
      const q = query(
        collection(db, this.COLLECTIONS.STORIES),
        where('authorId', '==', authorId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => this.formatStory(doc)).filter(Boolean) as CommunityStory[];
    } catch (error) {
      throw this.formatError(error as FirestoreError);
    }
  }

  // Get a single story
  async getStory(storyId: string): Promise<CommunityStory | null> {
    try {
      const docRef = doc(db, this.COLLECTIONS.STORIES, storyId);
      const docSnapshot = await getDoc(docRef);
      return this.formatStory(docSnapshot);
    } catch (error) {
      throw this.formatError(error as FirestoreError);
    }
  }

  // Like a story
  async likeStory(storyId: string, userId: string): Promise<void> {
    try {
      // Check if user already liked this story
      const likesQuery = query(
        collection(db, this.COLLECTIONS.LIKES),
        where('storyId', '==', storyId),
        where('userId', '==', userId)
      );
      
      const existingLikes = await getDocs(likesQuery);
      
      if (!existingLikes.empty) {
        // Unlike - remove the like and decrement counter
        await deleteDoc(existingLikes.docs[0].ref);
        await updateDoc(doc(db, this.COLLECTIONS.STORIES, storyId), {
          likes: increment(-1),
          updatedAt: serverTimestamp(),
        });
      } else {
        // Like - add like and increment counter
        await addDoc(collection(db, this.COLLECTIONS.LIKES), {
          storyId,
          userId,
          createdAt: serverTimestamp(),
        });
        
        await updateDoc(doc(db, this.COLLECTIONS.STORIES, storyId), {
          likes: increment(1),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      throw this.formatError(error as FirestoreError);
    }
  }

  // Check if user liked a story
  async hasUserLikedStory(storyId: string, userId: string): Promise<boolean> {
    try {
      const likesQuery = query(
        collection(db, this.COLLECTIONS.LIKES),
        where('storyId', '==', storyId),
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(likesQuery);
      return !snapshot.empty;
    } catch (error) {
      throw this.formatError(error as FirestoreError);
    }
  }

  // Increment view count
  async incrementViews(storyId: string): Promise<void> {
    try {
      await updateDoc(doc(db, this.COLLECTIONS.STORIES, storyId), {
        views: increment(1),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      throw this.formatError(error as FirestoreError);
    }
  }

  // Increment view count with user tracking (prevents duplicate views)
  async incrementViewsWithUser(storyId: string, userId: string): Promise<void> {
    try {
      // Check if user already viewed this story recently (within 1 hour)
      const viewsQuery = query(
        collection(db, this.COLLECTIONS.VIEWS),
        where('storyId', '==', storyId),
        where('userId', '==', userId)
      );
      
      const existingViews = await getDocs(viewsQuery);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      // Check if there's a recent view
      const hasRecentView = existingViews.docs.some(doc => {
        const viewData = doc.data();
        return viewData.createdAt.toDate() > oneHourAgo;
      });
      
      if (!hasRecentView) {
        // Record the view
        await addDoc(collection(db, this.COLLECTIONS.VIEWS), {
          storyId,
          userId,
          createdAt: serverTimestamp(),
        });
        
        // Increment view count
        await updateDoc(doc(db, this.COLLECTIONS.STORIES, storyId), {
          views: increment(1),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      // Fallback to regular increment on error
      await this.incrementViews(storyId);
    }
  }

  // Subscribe to real-time story updates
  onStoriesChange(callback: (stories: CommunityStory[]) => void, sortBy: 'recent' | 'trending' | 'popular' = 'recent'): () => void {
    let q = query(collection(db, this.COLLECTIONS.STORIES));

    switch (sortBy) {
      case 'recent':
        q = query(q, orderBy('createdAt', 'desc'), limit(50));
        break;
      case 'trending':
        q = query(q, orderBy('views', 'desc'), orderBy('createdAt', 'desc'), limit(50));
        break;
      case 'popular':
        q = query(q, orderBy('likes', 'desc'), orderBy('createdAt', 'desc'), limit(50));
        break;
    }

    return onSnapshot(q, 
      (snapshot: QuerySnapshot) => {
        const stories = snapshot.docs.map(doc => this.formatStory(doc)).filter(Boolean) as CommunityStory[];
        callback(stories);
      },
      (error: FirestoreError) => {
        if (config.isDevelopment) {
          console.error('Stories subscription error:', error);
        }
      }
    );
  }

  // Subscribe to a single story's updates
  onStoryChange(storyId: string, callback: (story: CommunityStory | null) => void): () => void {
    const docRef = doc(db, this.COLLECTIONS.STORIES, storyId);
    
    return onSnapshot(docRef,
      (doc: DocumentSnapshot) => {
        const story = this.formatStory(doc);
        callback(story);
      },
      (error: FirestoreError) => {
        if (config.isDevelopment) {
          console.error('Story subscription error:', error);
        }
      }
    );
  }

  // Delete a story (author only)
  async deleteStory(storyId: string, authorId: string): Promise<void> {
    try {
      // Verify ownership
      const storyDoc = await getDoc(doc(db, this.COLLECTIONS.STORIES, storyId));
      if (!storyDoc.exists()) {
        throw { code: 'not-found', message: 'Story not found' };
      }

      const storyData = storyDoc.data() as FirebaseStory;
      if (storyData.authorId !== authorId) {
        throw { code: 'permission-denied', message: 'You can only delete your own stories' };
      }

      // Delete the story
      await deleteDoc(doc(db, this.COLLECTIONS.STORIES, storyId));

      // Clean up associated likes
      const likesQuery = query(
        collection(db, this.COLLECTIONS.LIKES),
        where('storyId', '==', storyId)
      );
      const likesSnapshot = await getDocs(likesQuery);
      const deleteLikesPromises = likesSnapshot.docs.map(likeDoc => deleteDoc(likeDoc.ref));
      await Promise.all(deleteLikesPromises);
      
    } catch (error) {
      throw this.formatError(error as FirestoreError);
    }
  }

  // Extract tags from story content
  private extractTags(story: ExportableStory): string[] {
    const tags: string[] = [];
    
    // Add story type as tag
    if (story.metadata?.story_type) {
      tags.push(story.metadata.story_type);
    }
    
    // Extract keywords from title and summary
    const text = `${story.title} ${story.summary}`.toLowerCase();
    const keywords = [
      'sales', 'revenue', 'business', 'growth', 'performance',
      'healthcare', 'medical', 'patients', 'clinical',
      'education', 'students', 'learning', 'academic',
      'finance', 'investment', 'profit', 'budget',
      'marketing', 'customer', 'engagement', 'conversion',
      'data', 'analytics', 'insights', 'trends', 'statistics'
    ];
    
    keywords.forEach(keyword => {
      if (text.includes(keyword) && !tags.includes(keyword)) {
        tags.push(keyword);
      }
    });
    
    return tags.slice(0, 5); // Limit to 5 tags
  }

  // Search stories
  async searchStories(query: string, limitCount = 20): Promise<CommunityStory[]> {
    try {
      // Note: This is a basic search. For production, consider using Algolia or similar
      const allStories = await this.getStories(100);
      const searchQuery = query.toLowerCase();
      
      return allStories
        .filter(story => 
          story.title.toLowerCase().includes(searchQuery) ||
          story.summary.toLowerCase().includes(searchQuery) ||
          story.author.toLowerCase().includes(searchQuery) ||
          story.tags.some(tag => tag.toLowerCase().includes(searchQuery))
        )
        .slice(0, limitCount);
    } catch (error) {
      throw this.formatError(error as FirestoreError);
    }
  }
}

// Export singleton instance
export const storyService = new FirebaseStoryService();
export default storyService;
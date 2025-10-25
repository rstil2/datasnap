import { User, UserSession } from '../types';

const STORAGE_KEY = 'datasnap_user';

// Predefined avatar options for users to choose from
export const AVATAR_OPTIONS = [
  '👨‍💻', '👩‍💻', '👨‍💼', '👩‍💼', '👨‍🔬', '👩‍🔬', '👨‍🎨', '👩‍🎨',
  '👨‍🏫', '👩‍🏫', '👨‍⚕️', '👩‍⚕️', '👨‍🚀', '👩‍🚀', '🧑‍💻', '🧑‍💼',
  '🦸‍♂️', '🦸‍♀️', '🥷', '👩‍🎤', '👨‍🎤', '👩‍🎯', '👨‍🎯', '🧙‍♀️',
  '🧙‍♂️', '👩‍🔧', '👨‍🔧', '👩‍🌾', '👨‍🌾', '👩‍🍳', '👨‍🍳', '👩‍🏭'
];

class UserService {
  private currentUser: User | null = null;

  constructor() {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    try {
      const storedUser = localStorage.getItem(STORAGE_KEY);
      if (storedUser) {
        this.currentUser = JSON.parse(storedUser);
      }
    } catch (error) {
      console.error('Failed to load user from storage:', error);
      this.clearUser();
    }
  }

  private saveUserToStorage(user: User): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to save user to storage:', error);
    }
  }

  private clearUser(): void {
    this.currentUser = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  private generateUserId(): string {
    return 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Get current user session
  getCurrentSession(): UserSession {
    return {
      user: this.currentUser,
      isAuthenticated: this.currentUser !== null
    };
  }

  // Sign in a user (create or login)
  signIn(userData: { name: string; avatar: string }): User {
    const now = new Date().toISOString();
    
    // Check if user already exists with this name
    const existingUser = this.findUserByName(userData.name);
    if (existingUser) {
      this.currentUser = existingUser;
      this.saveUserToStorage(existingUser);
      return existingUser;
    }

    // Create new user
    const newUser: User = {
      id: this.generateUserId(),
      name: userData.name.trim(),
      avatar: userData.avatar,
      joinedAt: now,
      storiesCount: 0,
      totalLikes: 0,
      preferences: {
        theme: 'auto',
        notifications: true
      }
    };

    this.currentUser = newUser;
    this.saveUserToStorage(newUser);
    return newUser;
  }

  // Sign out current user
  signOut(): void {
    this.clearUser();
  }

  // Update user data
  updateUser(updates: Partial<User>): User | null {
    if (!this.currentUser) {
      throw new Error('No user signed in');
    }

    const updatedUser = {
      ...this.currentUser,
      ...updates,
      id: this.currentUser.id, // Protect ID from being changed
      joinedAt: this.currentUser.joinedAt // Protect join date
    };

    this.currentUser = updatedUser;
    this.saveUserToStorage(updatedUser);
    return updatedUser;
  }

  // Helper to find user by name (for returning users)
  private findUserByName(name: string): User | null {
    // In a real app, this would query a database
    // For now, we just check the current stored user
    if (this.currentUser && this.currentUser.name.toLowerCase() === name.toLowerCase()) {
      return this.currentUser;
    }
    return null;
  }

  // Increment user stats
  incrementStoriesCount(): void {
    if (this.currentUser) {
      this.updateUser({
        storiesCount: this.currentUser.storiesCount + 1
      });
    }
  }

  incrementTotalLikes(count: number = 1): void {
    if (this.currentUser) {
      this.updateUser({
        totalLikes: this.currentUser.totalLikes + count
      });
    }
  }

  // Get avatar options
  getAvatarOptions(): string[] {
    return AVATAR_OPTIONS;
  }

  // Get random avatar
  getRandomAvatar(): string {
    return AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)];
  }

  // Validate user data
  validateUserData(userData: { name: string; avatar: string }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!userData.name || userData.name.trim().length === 0) {
      errors.push('Name is required');
    } else if (userData.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    } else if (userData.name.trim().length > 50) {
      errors.push('Name must be less than 50 characters');
    }

    if (!userData.avatar || !AVATAR_OPTIONS.includes(userData.avatar)) {
      errors.push('Please select a valid avatar');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const userService = new UserService();
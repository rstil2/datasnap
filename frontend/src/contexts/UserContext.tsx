import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserContextType } from '../types';
import { userService } from '../services/userService';
import { authService, type AuthUser, type AuthServiceError } from '../services/firebase';

// Create the context
const UserContext = createContext<UserContextType | undefined>(undefined);

// Custom hook to use the user context
export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

// Provider component props
interface UserProviderProps {
  children: ReactNode;
}

// Provider component
export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Convert Firebase AuthUser to our User interface
  const convertFirebaseUser = (firebaseUser: AuthUser): User => {
    // Generate a clean display name - be more aggressive about fixing bad names
    let displayName = firebaseUser.displayName;
    
    // If displayName looks like a Firebase UID or is missing, generate a better one
    if (!displayName || 
        (displayName.length >= 20 && /^[a-zA-Z0-9]+$/.test(displayName) && !displayName.includes('@'))) {
      if (firebaseUser.email) {
        // Extract name from email (everything before @ symbol)
        const emailPrefix = firebaseUser.email.split('@')[0];
        // Make it more readable: replace dots/underscores with spaces and capitalize
        displayName = emailPrefix
          .replace(/[._-]/g, ' ')
          .replace(/\b\w/g, (char) => char.toUpperCase());
      } else {
        displayName = 'User';
      }
    }
    
    // Final fallback
    displayName = displayName || 'Anonymous';
    
    console.log('Converting Firebase user:', {
      uid: firebaseUser.uid,
      originalDisplayName: firebaseUser.displayName,
      email: firebaseUser.email,
      finalDisplayName: displayName,
      wasDisplayNameBad: !firebaseUser.displayName || 
        (firebaseUser.displayName && firebaseUser.displayName.length >= 20 && /^[a-zA-Z0-9]+$/.test(firebaseUser.displayName))
    });
    
    return {
      id: firebaseUser.uid,
      name: displayName,
      email: firebaseUser.email || '',
      avatar: '👤', // Always use emoji instead of URL
      joinedAt: new Date().toISOString(),
      storiesCount: 0,
      totalLikes: 0,
      preferences: {
        theme: 'light',
        notifications: true,
        dataRetention: 30,
      },
      subscription: {
        tier: 'free',
        expiresAt: null,
        features: {
          maxFileSize: 50,
          maxExports: 10,
          advancedAnalytics: false,
          customBranding: false,
        },
      },
    };
  };

  // Initialize Firebase auth state listener
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((firebaseUser) => {
      if (firebaseUser) {
        const convertedUser = convertFirebaseUser(firebaseUser);
        setUser(convertedUser);
        setIsAuthenticated(true);
        // Also update the legacy userService for compatibility
        userService.signIn({ name: convertedUser.name, avatar: convertedUser.avatar });
      } else {
        setUser(null);
        setIsAuthenticated(false);
        userService.signOut();
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      await authService.signInWithEmail(email, password);
      // Firebase auth state change will handle updating the user state
    } catch (error) {
      const authError = error as AuthServiceError;
      setError(authError.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      setError(null);
      setLoading(true);
      await authService.signInWithGoogle();
    } catch (error) {
      const authError = error as AuthServiceError;
      setError(authError.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign in with GitHub
  const signInWithGitHub = async () => {
    try {
      setError(null);
      setLoading(true);
      await authService.signInWithGitHub();
    } catch (error) {
      const authError = error as AuthServiceError;
      setError(authError.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Create account with email and password
  const createAccount = async (email: string, password: string, displayName?: string) => {
    try {
      setError(null);
      setLoading(true);
      await authService.createAccount(email, password, displayName);
    } catch (error) {
      const authError = error as AuthServiceError;
      setError(authError.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      setError(null);
      await authService.signOut();
      // Firebase auth state change will handle updating the user state
    } catch (error) {
      const authError = error as AuthServiceError;
      setError(authError.message);
      throw error;
    }
  };

  // Update user function
  const updateUser = (updates: Partial<User>) => {
    try {
      const updatedUser = userService.updateUser(updates);
      if (updatedUser) {
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('User update failed:', error);
      throw error;
    }
  };

  // Context value
  const value: UserContextType = {
    user,
    isAuthenticated,
    loading,
    error,
    signIn,
    signInWithGoogle,
    signInWithGitHub,
    createAccount,
    signOut,
    updateUser
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
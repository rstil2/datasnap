import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  GithubAuthProvider,
  User as FirebaseUser,
  UserCredential,
  sendPasswordResetEmail,
  updateProfile,
  AuthError
} from 'firebase/auth';
import { auth } from './config';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
}

export interface AuthServiceError {
  code: string;
  message: string;
}

class FirebaseAuthService {
  private providers = {
    google: new GoogleAuthProvider(),
    github: new GithubAuthProvider(),
  };

  constructor() {
    // Configure providers
    this.providers.google.addScope('email');
    this.providers.google.addScope('profile');
    
    this.providers.github.addScope('user:email');
  }

  // Convert Firebase user to our AuthUser interface
  private formatUser(firebaseUser: FirebaseUser): AuthUser {
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      emailVerified: firebaseUser.emailVerified,
      isAnonymous: firebaseUser.isAnonymous,
    };
  }

  // Handle Firebase auth errors
  private formatError(error: AuthError): AuthServiceError {
    return {
      code: error.code,
      message: this.getFriendlyErrorMessage(error.code),
    };
  }

  // Get user-friendly error messages
  private getFriendlyErrorMessage(errorCode: string): string {
    const errorMessages: Record<string, string> = {
      'auth/user-not-found': 'No account found with this email address.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/weak-password': 'Password should be at least 6 characters long.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/user-disabled': 'This account has been disabled.',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
      'auth/network-request-failed': 'Network error. Please check your connection.',
      'auth/popup-closed-by-user': 'Sign-in was cancelled.',
      'auth/cancelled-popup-request': 'Sign-in was cancelled.',
      'auth/popup-blocked': 'Popup was blocked. Please allow popups for this site.',
    };

    return errorMessages[errorCode] || 'An unexpected error occurred. Please try again.';
  }

  // Sign in with email and password
  async signInWithEmail(email: string, password: string): Promise<AuthUser> {
    if (!auth) {
      throw { code: 'auth/not-configured', message: 'Authentication is not configured' };
    }
    try {
      const result: UserCredential = await signInWithEmailAndPassword(auth, email, password);
      return this.formatUser(result.user);
    } catch (error) {
      throw this.formatError(error as AuthError);
    }
  }

  // Create account with email and password
  async createAccount(email: string, password: string, displayName?: string): Promise<AuthUser> {
    try {
      const result: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update display name if provided
      if (displayName) {
        await updateProfile(result.user, { displayName });
      }
      
      return this.formatUser(result.user);
    } catch (error) {
      throw this.formatError(error as AuthError);
    }
  }

  // Sign in with Google
  async signInWithGoogle(): Promise<AuthUser> {
    try {
      const result: UserCredential = await signInWithPopup(auth, this.providers.google);
      return this.formatUser(result.user);
    } catch (error) {
      throw this.formatError(error as AuthError);
    }
  }

  // Sign in with GitHub
  async signInWithGitHub(): Promise<AuthUser> {
    try {
      const result: UserCredential = await signInWithPopup(auth, this.providers.github);
      return this.formatUser(result.user);
    } catch (error) {
      throw this.formatError(error as AuthError);
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      throw this.formatError(error as AuthError);
    }
  }

  // Send password reset email
  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw this.formatError(error as AuthError);
    }
  }

  // Get current user
  getCurrentUser(): AuthUser | null {
    const user = auth.currentUser;
    return user ? this.formatUser(user) : null;
  }

  // Listen to authentication state changes
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    if (!auth) {
      // If auth is not configured, call callback with null and return a no-op unsubscribe
      callback(null);
      return () => {};
    }
    return onAuthStateChanged(auth, (firebaseUser) => {
      const user = firebaseUser ? this.formatUser(firebaseUser) : null;
      callback(user);
    });
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return auth.currentUser !== null;
  }

  // Wait for auth to initialize
  async waitForAuthInit(): Promise<AuthUser | null> {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user ? this.formatUser(user) : null);
      });
    });
  }
}

// Export singleton instance
export const authService = new FirebaseAuthService();
export default authService;
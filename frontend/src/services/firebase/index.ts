// Firebase configuration
export { app, auth, db, analytics } from './config';

// Firebase services
export { authService, type AuthUser, type AuthServiceError } from './authService';
export { storyService, type FirebaseStory, type StoryLike, type FirestoreServiceError } from './storyService';

// Re-export Firebase types that might be useful
export type {
  User as FirebaseUser,
  UserCredential,
  AuthError,
} from 'firebase/auth';

export type {
  DocumentSnapshot,
  QuerySnapshot,
  Timestamp,
  FirestoreError,
} from 'firebase/firestore';
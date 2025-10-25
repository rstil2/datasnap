import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { config } from '../../config';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: config.firebase.apiKey,
  authDomain: config.firebase.authDomain,
  projectId: config.firebase.projectId,
  storageBucket: config.firebase.storageBucket,
  messagingSenderId: config.firebase.messagingSenderId,
  appId: config.firebase.appId,
  measurementId: config.firebase.measurementId,
};

// Check if Firebase is configured
const isFirebaseConfigured = firebaseConfig.apiKey && firebaseConfig.projectId;

// Initialize Firebase only if configured
export const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;

// Initialize Firebase Authentication
export const auth = app ? getAuth(app) : null;

// Initialize Firestore
export const db = app ? getFirestore(app) : null;

// Initialize Analytics (only in production and if supported)
let analytics: any = null;
if (app && config.isDevelopment === false) {
  isSupported().then(supported => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}
export { analytics };

// Connect to emulators in development mode if enabled
if (app && auth && db && config.isDevelopment && config.firebase.useEmulators) {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, 'localhost', 8080);
  } catch (error) {
    // Emulators might already be connected, ignore connection errors
    if (config.isDevelopment) {
      console.warn('Firebase emulators connection warning:', error);
    }
  }
}

// Log warning if Firebase is not configured
if (!isFirebaseConfigured && config.isDevelopment) {
  console.warn('Firebase is not configured. Authentication features will be disabled.');
}

// Export Firebase services
export default app;

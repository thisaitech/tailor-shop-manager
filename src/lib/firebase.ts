import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  enableIndexedDbPersistence,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  CACHE_SIZE_UNLIMITED,
  Firestore,
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Firebase configuration
// Replace these with your actual Firebase config from Firebase Console
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

// Initialize Firebase with offline persistence
// Using definite assignment - will be set in try block or throw
let app!: FirebaseApp;
let db!: Firestore;
let auth!: Auth;
let storage!: FirebaseStorage;

// Track offline persistence status
let offlinePersistenceEnabled = false;

try {
  app = initializeApp(firebaseConfig);

  // Initialize Firestore with persistent cache for offline support
  // This is the modern approach (Firebase v9.8.0+)
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
        cacheSizeBytes: CACHE_SIZE_UNLIMITED,
      }),
    });
    offlinePersistenceEnabled = true;
    console.log('✅ Firestore initialized with offline persistence (multi-tab)');
  } catch (persistenceError: any) {
    // If modern persistence fails, fall back to legacy approach
    if (persistenceError.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time
      console.warn('⚠️ Multiple tabs detected. Offline persistence enabled in another tab.');
      db = getFirestore(app);
    } else if (persistenceError.code === 'unimplemented') {
      // The current browser doesn't support persistence
      console.warn('⚠️ Browser does not support offline persistence. Using online-only mode.');
      db = getFirestore(app);
    } else {
      // Unknown error, try legacy enableIndexedDbPersistence
      console.warn('⚠️ Modern persistence failed, trying legacy approach:', persistenceError);
      db = getFirestore(app);

      // Try legacy persistence enablement
      enableIndexedDbPersistence(db)
        .then(() => {
          offlinePersistenceEnabled = true;
          console.log('✅ Firestore offline persistence enabled (legacy)');
        })
        .catch((err) => {
          if (err.code === 'failed-precondition') {
            console.warn('⚠️ Offline persistence unavailable: Multiple tabs open');
          } else if (err.code === 'unimplemented') {
            console.warn('⚠️ Offline persistence unavailable: Browser not supported');
          } else {
            console.error('❌ Error enabling offline persistence:', err);
          }
        });
    }
  }

  auth = getAuth(app);
  storage = getStorage(app);
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
}

/**
 * Check if offline persistence is enabled
 */
export function isOfflinePersistenceEnabled(): boolean {
  return offlinePersistenceEnabled;
}

/**
 * Get offline cache status for debugging
 */
export function getOfflineStatus(): {
  persistenceEnabled: boolean;
  isOnline: boolean;
} {
  return {
    persistenceEnabled: offlinePersistenceEnabled,
    isOnline: navigator.onLine,
  };
}

export { db, auth, storage };
export default app;

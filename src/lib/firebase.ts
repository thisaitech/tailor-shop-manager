import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  enableIndexedDbPersistence,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  CACHE_SIZE_UNLIMITED,
  Firestore,
  collection,
  getDocs,
  limit,
  query,
  enableNetwork,
  waitForPendingWrites,
} from 'firebase/firestore';
import { getAuth as firebaseGetAuth, Auth } from 'firebase/auth';
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

// Track Firebase initialization status
let firebaseInitialized = false;
let firebaseInitPromise: Promise<void> | null = null;

// Detect if running in Capacitor/native app
const isCapacitor = typeof window !== 'undefined' && !!(window as any).Capacitor;
const isNativePlatform = isCapacitor && (window as any).Capacitor?.isNativePlatform?.();

/**
 * Test Firestore connection readiness by performing a warmup query
 * This ensures the connection is actually established before proceeding
 * CRITICAL for mobile apps on cold start - the first query often fails without this
 */
async function testFirestoreConnection(firestore: Firestore, maxRetries = 5): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 [Firebase] Connection warmup attempt ${attempt}/${maxRetries}...`);

      // Ensure network is enabled
      await enableNetwork(firestore);

      // Small delay before first attempt on mobile to let the network stack initialize
      if (attempt === 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Do a lightweight test query to verify connection
      // Query a collection that should exist (employees is used for auth)
      const testQuery = query(collection(firestore, 'employees'), limit(1));
      const startTime = Date.now();
      await getDocs(testQuery);
      const duration = Date.now() - startTime;

      console.log(`✅ [Firebase] Connection warmup successful (${duration}ms)`);
      return true;
    } catch (error: any) {
      console.warn(`⚠️ [Firebase] Connection warmup attempt ${attempt} failed:`, error.message);

      if (attempt < maxRetries) {
        // Wait before retry with exponential backoff (more aggressive for mobile)
        const delay = Math.min(800 * Math.pow(1.5, attempt - 1), 3000);
        console.log(`⏳ [Firebase] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.warn('⚠️ [Firebase] Connection warmup failed after all retries, proceeding anyway');
  return false;
}

/**
 * Initialize Firebase and wait for all async setup to complete
 */
async function initializeFirebaseAsync(): Promise<void> {
  if (firebaseInitialized) {
    return;
  }

  try {
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase app initialized');

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

        // Try legacy persistence enablement - AWAIT this!
        try {
          await enableIndexedDbPersistence(db);
          offlinePersistenceEnabled = true;
          console.log('✅ Firestore offline persistence enabled (legacy)');
        } catch (err: any) {
          if (err.code === 'failed-precondition') {
            console.warn('⚠️ Offline persistence unavailable: Multiple tabs open');
          } else if (err.code === 'unimplemented') {
            console.warn('⚠️ Offline persistence unavailable: Browser not supported');
          } else {
            console.error('❌ Error enabling offline persistence:', err);
          }
          // Continue without persistence - not a fatal error
        }
      }
    }

    auth = firebaseGetAuth(app);
    storage = getStorage(app);

    // CRITICAL: Perform connection warmup on native mobile platforms
    // This ensures Firestore connection is actually established before first use
    // Without this, the first query on app cold start may fail
    if (isNativePlatform) {
      console.log('📱 [Firebase] Native platform detected, performing connection warmup...');
      await testFirestoreConnection(db, 3);
    }

    firebaseInitialized = true;
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    throw error;
  }
}

// Start initialization immediately
firebaseInitPromise = initializeFirebaseAsync();

/**
 * Wait for Firebase to be fully initialized
 * Call this before any Firebase operations on first app load
 */
export async function waitForFirebase(): Promise<void> {
  if (firebaseInitialized) {
    return;
  }
  if (firebaseInitPromise) {
    await firebaseInitPromise;
  }
}

/**
 * Check if Firebase is initialized
 */
export function isFirebaseReady(): boolean {
  return firebaseInitialized;
}

/**
 * Get Firestore instance - ensures Firebase is initialized first
 * Use this instead of importing db directly in services
 */
export async function getDb(): Promise<Firestore> {
  await waitForFirebase();
  return db;
}

/**
 * Get Auth instance - ensures Firebase is initialized first
 */
export async function getAuthInstance(): Promise<Auth> {
  await waitForFirebase();
  return auth;
}

/**
 * Get Storage instance - ensures Firebase is initialized first
 */
export async function getStorageInstance(): Promise<FirebaseStorage> {
  await waitForFirebase();
  return storage;
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

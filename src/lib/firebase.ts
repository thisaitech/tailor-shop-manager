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
let connectionWarmedUp = false;

// Detect if running in Capacitor/native app
// Note: Check dynamically as Capacitor may not be immediately available on cold start
function checkIsNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as any).Capacitor;
  if (!cap) return false;
  // Check multiple ways to detect native platform
  return cap.isNativePlatform?.() === true || cap.getPlatform?.() === 'android' || cap.getPlatform?.() === 'ios';
}

// For initial checks before Capacitor loads, assume native if we see signs of it
function checkIsLikelyMobile(): boolean {
  if (typeof window === 'undefined') return false;
  // Check for Capacitor
  if ((window as any).Capacitor) return true;
  // Check user agent for mobile
  const ua = navigator.userAgent || '';
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

// Track if this is a fresh install (first ever app launch)
const FIREBASE_INIT_KEY = 'firebase_initialized_once';
function isFirstEverLaunch(): boolean {
  try {
    return !localStorage.getItem(FIREBASE_INIT_KEY);
  } catch {
    return true; // Assume first launch if localStorage fails
  }
}

function markAsInitialized(): void {
  try {
    localStorage.setItem(FIREBASE_INIT_KEY, 'true');
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Test Firestore connection readiness by performing a warmup query
 * This ensures the connection is actually established before proceeding
 * CRITICAL for mobile apps on cold start - the first query often fails without this
 */
async function testFirestoreConnection(firestore: Firestore, maxRetries = 5): Promise<boolean> {
  const isMobile = checkIsLikelyMobile();
  const isNative = checkIsNativePlatform();
  const isFirstLaunch = isFirstEverLaunch();

  console.log(`🔄 [Firebase] Connection test - isMobile: ${isMobile}, isNative: ${isNative}, isFirstLaunch: ${isFirstLaunch}`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 [Firebase] Connection warmup attempt ${attempt}/${maxRetries}...`);

      // Ensure network is enabled
      await enableNetwork(firestore);

      // CRITICAL: On first ever launch, add significant delay to let everything initialize
      // This is the key fix for the "first login after install" issue
      if (attempt === 1) {
        let initialDelay = 500; // Default for web
        if (isFirstLaunch && isMobile) {
          initialDelay = 2000; // 2 seconds for first launch on mobile
          console.log(`⏳ [Firebase] FIRST LAUNCH DETECTED - extended delay ${initialDelay}ms...`);
        } else if (isMobile) {
          initialDelay = 1000; // 1 second for subsequent mobile launches
          console.log(`⏳ [Firebase] Mobile platform - delay ${initialDelay}ms...`);
        } else {
          console.log(`⏳ [Firebase] Web platform - delay ${initialDelay}ms...`);
        }
        await new Promise(resolve => setTimeout(resolve, initialDelay));
      }

      // Do a lightweight test query to verify connection
      // Query a collection that should exist (employees is used for auth)
      const testQuery = query(collection(firestore, 'employees'), limit(1));
      const startTime = Date.now();
      await getDocs(testQuery);
      const duration = Date.now() - startTime;

      console.log(`✅ [Firebase] Connection warmup successful (${duration}ms)`);

      // On mobile/first launch, do additional verification queries to ensure stability
      if (isMobile || isFirstLaunch) {
        console.log('🔄 [Firebase] Performing stability checks...');
        await new Promise(resolve => setTimeout(resolve, 300));

        // First stability check
        const verifyQuery1 = query(collection(firestore, 'employees'), limit(1));
        await getDocs(verifyQuery1);
        console.log('✅ [Firebase] Stability check 1 passed');

        // On first launch, do one more check
        if (isFirstLaunch) {
          await new Promise(resolve => setTimeout(resolve, 300));
          const verifyQuery2 = query(collection(firestore, 'vendors'), limit(1));
          await getDocs(verifyQuery2);
          console.log('✅ [Firebase] Stability check 2 passed (vendors collection)');
        }
      }

      return true;
    } catch (error: any) {
      console.warn(`⚠️ [Firebase] Connection warmup attempt ${attempt} failed:`, error.message);

      if (attempt < maxRetries) {
        // Wait before retry with exponential backoff (longer delays for mobile/first launch)
        const baseDelay = (isMobile || isFirstLaunch) ? 1500 : 800;
        const delay = Math.min(baseDelay * Math.pow(1.5, attempt - 1), 6000);
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

    // CRITICAL: Perform connection warmup on ALL platforms for fresh installs
    // This ensures Firestore connection is actually established before first use
    // Without this, the first query on app cold start may fail
    // Previously only ran on native platforms, but the issue affects all platforms on cold start
    const isFirstLaunch = isFirstEverLaunch();
    const isMobile = checkIsLikelyMobile();

    console.log(`🔄 [Firebase] Performing connection warmup... (firstLaunch: ${isFirstLaunch}, mobile: ${isMobile})`);

    // Use more retries on first launch
    const retries = isFirstLaunch ? 5 : 3;
    const warmupSuccess = await testFirestoreConnection(db, retries);
    connectionWarmedUp = warmupSuccess;

    // Mark as initialized so subsequent launches don't have the extended delays
    markAsInitialized();

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
 * Check if connection warmup was successful
 */
export function isConnectionWarmedUp(): boolean {
  return connectionWarmedUp;
}

/**
 * Ensure connection is warmed up before critical operations like auth
 * This should be called before the first authentication attempt
 * Returns true if connection is ready, false if warmup failed
 */
export async function ensureConnectionReady(): Promise<boolean> {
  await waitForFirebase();

  const isMobile = checkIsLikelyMobile();
  const isNative = checkIsNativePlatform();

  // If already warmed up on web platforms, no need to do it again
  if (connectionWarmedUp && !isMobile && !isNative) {
    return true;
  }

  // On mobile/native platform, even if warmup succeeded, do a quick re-verification
  // This handles the edge case where first warmup succeeded but connection dropped
  if (connectionWarmedUp && (isMobile || isNative)) {
    console.log('🔄 [Firebase] Mobile/Native platform - verifying connection before auth...');
    try {
      const verifyQuery = query(collection(db, 'employees'), limit(1));
      const startTime = Date.now();
      await getDocs(verifyQuery);
      const duration = Date.now() - startTime;
      console.log(`✅ [Firebase] Connection verified for auth (${duration}ms)`);

      // If the query took too long (> 3 seconds), the connection might be unstable
      if (duration > 3000) {
        console.warn('⚠️ [Firebase] Query was slow, doing additional warmup...');
        await new Promise(resolve => setTimeout(resolve, 500));
        await getDocs(query(collection(db, 'employees'), limit(1)));
      }

      return true;
    } catch (error: any) {
      console.warn('⚠️ [Firebase] Connection verification failed, re-warming...', error.message);
      connectionWarmedUp = false;
    }
  }

  // Connection wasn't warmed up during init (maybe network was unavailable)
  // Try warming up now with more retries for critical auth operation
  console.log('🔄 [Firebase] Connection not warmed up, attempting now...');
  const retries = (isMobile || isNative) ? 5 : 3;
  const success = await testFirestoreConnection(db, retries);
  connectionWarmedUp = success;
  return success;
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

import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence, initializeFirestore, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDVG2vCeZasJij_CM37J-W6W73rTbtjbpI',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'thisai-tailor-shop.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'thisai-tailor-shop',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'thisai-tailor-shop.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '206247305625',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:206247305625:web:86c33abf5e39218a91b308',
};

// Validate Firebase configuration
const isConfigValid = firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId;

if (!isConfigValid) {
  console.error('❌ Firebase configuration is incomplete!');
  console.error('Please check your .env file or environment variables');
}

// Initialize Firebase
let app;
let db;
let auth;
let storage;
let firebaseReady = false;
let initializationPromise: Promise<void>;

// Create a promise that resolves when Firebase is fully ready
initializationPromise = new Promise((resolve) => {
  try {
    console.log('🔥 Initializing Firebase...');
    console.log('Project ID:', firebaseConfig.projectId);
    
    app = initializeApp(firebaseConfig);
    
    // Initialize Firestore with optimized settings for mobile
    db = initializeFirestore(app, {
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
      experimentalForceLongPolling: false,
    });
    
    auth = getAuth(app);
    storage = getStorage(app);
    
    console.log('✅ Firebase core initialized successfully');
    
    // Enable offline persistence for better performance (non-blocking)
    enableIndexedDbPersistence(db, {
      forceOwnership: false
    }).then(() => {
      console.log('✅ Firebase offline persistence enabled');
    }).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('⚠️ Multiple tabs open, persistence can only be enabled in one tab at a time.');
      } else if (err.code === 'unimplemented') {
        console.warn('⚠️ The current browser does not support offline persistence');
      } else {
        console.error('❌ Persistence error:', err);
      }
      // Persistence failure is not critical - continue anyway
    });
    
    // Wait a moment for auth state to initialize, then mark as ready
    setTimeout(() => {
      firebaseReady = true;
      console.log('✅ Firebase fully ready for operations');
      resolve();
    }, 1500); // Increased from 1000ms to 1500ms for mobile devices
    
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    firebaseReady = false;
    resolve(); // Resolve anyway to prevent hanging
  }
});

/**
 * Wait for Firebase to be ready (with timeout)
 * Waits for the initialization promise to complete
 */
export async function waitForFirebase(timeoutMs: number = 10000): Promise<boolean> {
  // If already ready, return immediately
  if (firebaseReady && db) {
    return true;
  }
  
  // Wait for initialization promise with timeout
  try {
    await Promise.race([
      initializationPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Firebase initialization timeout')), timeoutMs)
      )
    ]);
    return firebaseReady && !!db;
  } catch (error) {
    console.error('❌ Firebase wait timeout:', error);
    // Return current state even if timeout
    return firebaseReady && !!db;
  }
}

export { db, auth, storage };
export default app;

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

try {
  console.log('🔥 Initializing Firebase...');
  console.log('Project ID:', firebaseConfig.projectId);
  
  app = initializeApp(firebaseConfig);
  
  // Initialize Firestore with optimized settings for mobile
  db = initializeFirestore(app, {
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    experimentalForceLongPolling: false,
  });
  
  // Enable offline persistence for better performance
  enableIndexedDbPersistence(db, {
    forceOwnership: false
  }).then(() => {
    console.log('✅ Firebase offline persistence enabled');
    firebaseReady = true;
  }).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('⚠️ Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('⚠️ The current browser does not support offline persistence');
    } else {
      console.error('❌ Persistence error:', err);
    }
    firebaseReady = true; // Still mark as ready even if persistence fails
  });
  
  auth = getAuth(app);
  storage = getStorage(app);
  
  console.log('✅ Firebase initialized successfully');
  
  // Mark as ready after initial setup
  setTimeout(() => {
    firebaseReady = true;
  }, 1000);
  
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  firebaseReady = false;
}

/**
 * Check if Firebase is ready for queries
 */
export function isFirebaseReady(): boolean {
  return firebaseReady && !!db;
}

/**
 * Wait for Firebase to be ready (with timeout)
 */
export async function waitForFirebase(timeoutMs: number = 5000): Promise<boolean> {
  if (firebaseReady && db) {
    return true;
  }
  
  const startTime = Date.now();
  while (!firebaseReady && (Date.now() - startTime) < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return firebaseReady && !!db;
}

export { db, auth, storage };
export default app;

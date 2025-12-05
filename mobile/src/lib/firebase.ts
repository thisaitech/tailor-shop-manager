import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration
const firebaseConfig = {
    apiKey: 'AIzaSyDVG2vCeZasJij_CM37J-W6W73rTbtjbpI',
    authDomain: 'thisai-tailor-shop.firebaseapp.com',
    projectId: 'thisai-tailor-shop',
    storageBucket: 'thisai-tailor-shop.firebasestorage.app',
    messagingSenderId: '206247305625',
    appId: '1:206247305625:web:86c33abf5e39218a91b308',
};

// Initialize Firebase
let app;
let db;
let auth;
let storage;
let firebaseReady = false;

try {
    console.log('🔥 Initializing Firebase (Mobile)...');

    app = initializeApp(firebaseConfig);

    // Initialize Firestore
    db = initializeFirestore(app, {
        cacheSizeBytes: CACHE_SIZE_UNLIMITED,
        experimentalForceLongPolling: false,
    });

    // Initialize Auth with React Native persistence
    auth = initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage)
    });

    storage = getStorage(app);

    firebaseReady = true;
    console.log('✅ Firebase core initialized successfully');

} catch (error) {
    console.error('❌ Firebase initialization error:', error);
}

export { db, auth, storage, firebaseReady };
export default app;

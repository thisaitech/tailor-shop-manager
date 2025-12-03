import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";
import "@github/spark/spark"

import App from './App.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'
import { KeyboardProvider } from './components/KeyboardProvider.tsx'

import "./main.css"
import "./styles/theme.css"
import "./index.css"

// Detect if running in Capacitor/native app
const isCapacitor = !!(window as any).Capacitor;
const isNativePlatform = isCapacitor && (window as any).Capacitor.isNativePlatform?.();
const isNativeApp = isNativePlatform || (window.matchMedia('(display-mode: standalone)').matches);

// Add platform-specific classes
if (isCapacitor) {
  document.documentElement.classList.add('capacitor-app');
}
if (isNativePlatform) {
  document.documentElement.classList.add('native-platform');
}
if (isNativeApp) {
  document.documentElement.classList.add('native-app');
}

// Add platform-specific class (android/ios/web)
if (isCapacitor && (window as any).Capacitor.getPlatform) {
  const platform = (window as any).Capacitor.getPlatform();
  document.documentElement.classList.add(`platform-${platform}`);
  document.documentElement.setAttribute('data-platform', platform);
}

// Lock the viewport height on mobile to prevent keyboard resize issues
const setAppHeight = () => {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
  document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
};

// Initial set
setAppHeight();

// Only update on orientation change for native apps (not on keyboard open/close)
if (isNativeApp) {
  let initialHeight = window.innerHeight;
  
  window.addEventListener('resize', () => {
    // Only update if it's a significant change (orientation), not keyboard
    const heightDiff = Math.abs(window.innerHeight - initialHeight);
    if (heightDiff > 150) {
      setAppHeight();
      initialHeight = window.innerHeight;
    }
  });
  
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      setAppHeight();
      initialHeight = window.innerHeight;
    }, 100);
  });
} else {
  // For web, update on all resizes
  window.addEventListener('resize', setAppHeight);
}

// Initialize app
const initApp = async () => {
  // Wait for Capacitor plugins if in native environment
  if (isNativePlatform) {
    try {
      // Dynamically import and configure Capacitor plugins
      // StatusBar configuration is handled natively via capacitor.config.json
      console.log('[Init] Running in native Capacitor environment');
    } catch (e) {
      console.log('[Init] Plugin initialization error:', e);
    }
  }
  
  // Render the app
  createRoot(document.getElementById('root')!).render(
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <KeyboardProvider>
        <App />
      </KeyboardProvider>
    </ErrorBoundary>
  );
};

// Initialize
initApp();

// Register Service Worker for PWA (skip for native Capacitor apps)
if ('serviceWorker' in navigator && !isNativePlatform) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[SW] Registered:', registration);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available, notify user
                console.log('[SW] New content available');
              }
            });
          }
        });
      })
      .catch((error) => {
        console.log('[SW] Registration failed:', error);
      });
  });
}


import { useEffect, useCallback, useState } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/**
 * Hook to handle Android hardware back button using Capacitor App plugin
 * Call this in your main App component
 */
export function useHardwareBackButton(onBackPress: () => boolean) {
  useEffect(() => {
    // Only use native back button on Capacitor/native platforms
    if (!Capacitor.isNativePlatform()) {
      console.log('[useHardwareBackButton] Not on native platform, using browser history API');
      
      // Fallback to browser history API for web
      const handleBackButton = (e: PopStateEvent) => {
        e.preventDefault();
        const handled = onBackPress();
        
        if (!handled) {
          window.history.back();
        } else {
          window.history.pushState(null, '', window.location.href);
        }
      };

      window.history.pushState(null, '', window.location.href);
      window.addEventListener('popstate', handleBackButton);
      
      return () => {
        window.removeEventListener('popstate', handleBackButton);
      };
    }

    // Use Capacitor's native back button handler
    console.log('[useHardwareBackButton] Setting up Capacitor back button listener');
    
    const backButtonListener = App.addListener('backButton', ({ canGoBack }) => {
      console.log('[BackButton] Native back button pressed, canGoBack:', canGoBack);
      
      // Call the custom back handler
      const handled = onBackPress();
      
      if (!handled) {
        console.log('[BackButton] Not handled by app, minimizing app');
        // Minimize the app instead of closing it
        App.minimizeApp();
      } else {
        console.log('[BackButton] Handled by app navigation');
      }
    });
    
    return () => {
      console.log('[useHardwareBackButton] Removing back button listener');
      backButtonListener.then(listener => listener.remove());
    };
  }, [onBackPress]);
}

/**
 * Hook to detect if app is running in standalone mode (installed as PWA/APK)
 */
export function useIsStandalone(): boolean {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const checkStandalone = () => {
      const standalone = 
        (window.matchMedia('(display-mode: standalone)').matches) ||
        ((window.navigator as any).standalone === true) ||
        document.referrer.includes('android-app://');
      
      setIsStandalone(standalone);
    };

    checkStandalone();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkStandalone);

    return () => {
      mediaQuery.removeEventListener('change', checkStandalone);
    };
  }, []);

  return isStandalone;
}

/**
 * Hook to handle screen orientation
 */
export function useScreenOrientation() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    const updateOrientation = () => {
      if (window.screen.orientation) {
        setOrientation(
          window.screen.orientation.type.includes('portrait') ? 'portrait' : 'landscape'
        );
      } else {
        // Fallback for older browsers
        setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
      }
    };

    updateOrientation();

    window.addEventListener('orientationchange', updateOrientation);
    window.addEventListener('resize', updateOrientation);

    return () => {
      window.removeEventListener('orientationchange', updateOrientation);
      window.removeEventListener('resize', updateOrientation);
    };
  }, []);

  return orientation;
}

/**
 * Hook to lock screen orientation (requires Capacitor or similar)
 */
export function useLockOrientation(orientation: 'portrait' | 'landscape' | 'any') {
  useEffect(() => {
    const lockOrientation = async () => {
      try {
        if (screen.orientation && (screen.orientation as any).lock) {
          if (orientation === 'portrait') {
            await (screen.orientation as any).lock('portrait-primary');
          } else if (orientation === 'landscape') {
            await (screen.orientation as any).lock('landscape-primary');
          }
        }
      } catch (error) {
        // Orientation lock not supported or not allowed
        console.log('Orientation lock not supported');
      }
    };

    if (orientation !== 'any') {
      lockOrientation();
    }

    return () => {
      try {
        if (screen.orientation && (screen.orientation as any).unlock) {
          (screen.orientation as any).unlock();
        }
      } catch (error) {
        // Ignore errors on cleanup
      }
    };
  }, [orientation]);
}

/**
 * Hook to prevent app from sleeping/dimming screen
 */
export function useKeepAwake(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    let wakeLock: any = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
          console.log('Wake lock acquired');
        }
      } catch (error) {
        console.log('Wake lock not supported or denied');
      }
    };

    requestWakeLock();

    // Re-acquire wake lock if visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (wakeLock) {
        wakeLock.release();
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled]);
}

/**
 * Hook to detect network status
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    const updateConnectionType = () => {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;
      
      if (connection) {
        setConnectionType(connection.effectiveType || connection.type || 'unknown');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    updateConnectionType();

    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateConnectionType);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', updateConnectionType);
      }
    };
  }, []);

  return { isOnline, connectionType };
}

/**
 * Hook to vibrate device (for feedback)
 */
export function useVibrate() {
  const vibrate = useCallback((pattern: number | number[] = 50) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  const vibrateSuccess = useCallback(() => {
    vibrate([50, 30, 50]); // Short double vibration
  }, [vibrate]);

  const vibrateError = useCallback(() => {
    vibrate([100, 50, 100, 50, 100]); // Triple vibration
  }, [vibrate]);

  const vibrateTap = useCallback(() => {
    vibrate(30); // Very short tap feedback
  }, [vibrate]);

  return { vibrate, vibrateSuccess, vibrateError, vibrateTap };
}

/**
 * Hook to detect if device has notch/cutout
 */
export function useHasNotch(): boolean {
  const [hasNotch, setHasNotch] = useState(false);

  useEffect(() => {
    // Check for safe area insets
    const checkNotch = () => {
      const root = document.documentElement;
      const safeAreaTop = getComputedStyle(root).getPropertyValue('--safe-area-inset-top') || 
                         getComputedStyle(root).getPropertyValue('env(safe-area-inset-top)');
      
      // If safe area inset is greater than typical status bar height, device has notch
      setHasNotch(parseInt(safeAreaTop || '0') > 24);
    };

    checkNotch();
    window.addEventListener('resize', checkNotch);

    return () => {
      window.removeEventListener('resize', checkNotch);
    };
  }, []);

  return hasNotch;
}

/**
 * Prevent default touch behaviors that can interfere with app
 * MINIMAL VERSION: Only prevents pull-to-refresh, allows all scrolling
 */
export function usePreventDefaultTouchBehaviors() {
  useEffect(() => {
    let touchStartY = 0;

    // Track touch start - PASSIVE
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartY = e.touches[0].clientY;
      }
    };

    // ONLY prevent pull-to-refresh at top of page
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      
      const touchY = e.touches[0].clientY;
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      const target = e.target as HTMLElement;
      
      // Only prevent if:
      // 1. User is at the top of the page
      // 2. User is pulling down (not scrolling within a container)
      // 3. Not inside a scrollable element
      if (scrollTop <= 0 && touchY > touchStartY + 50 && !target.closest('.overflow-auto, .overflow-y-auto, .overflow-scroll, [data-radix-scroll-area-viewport]')) {
        e.preventDefault();
      }
    };

    // Minimal CSS - ONLY prevent double-tap zoom on buttons
    const style = document.createElement('style');
    style.id = 'touch-fix';
    style.textContent = `
      /* Allow scrolling everywhere */
      html, body, #root {
        touch-action: pan-y !important;
      }
      /* Prevent double-tap zoom on interactive elements only */
      button, a, [role="button"], input[type="button"], input[type="submit"] {
        touch-action: manipulation;
      }
    `;
    if (!document.getElementById('touch-fix')) {
      document.head.appendChild(style);
    }

    // PASSIVE listeners (won't block scrolling)
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.getElementById('touch-fix')?.remove();
    };
  }, []);
}


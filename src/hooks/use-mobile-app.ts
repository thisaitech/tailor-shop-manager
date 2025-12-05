import { useEffect, useCallback, useState } from 'react';
import { App } from '@capacitor/app';

/**
 * Hook to handle Android hardware back button
 * Uses Capacitor App plugin for native back button handling
 */
export function useHardwareBackButton(onBackPress: () => boolean) {
  useEffect(() => {
    // Check if running in Capacitor
    const isCapacitor = !!(window as any).Capacitor?.isNativePlatform?.();

    let backButtonListener: { remove: () => void } | null = null;

    if (isCapacitor) {
      // Use Capacitor App plugin for native back button
      const setupBackButton = async () => {
        try {
          backButtonListener = await App.addListener('backButton', ({ canGoBack }) => {
            console.log('[BackButton] Native back button pressed, canGoBack:', canGoBack);

            // Call the custom back handler
            const handled = onBackPress();

            if (!handled) {
              // If not handled and can't go back in web history, minimize app
              if (!canGoBack) {
                App.minimizeApp();
              } else {
                window.history.back();
              }
            }
            // If handled, do nothing - the app handled the navigation
          });
          console.log('[BackButton] Capacitor back button listener registered');
        } catch (error) {
          console.error('[BackButton] Failed to setup Capacitor back button:', error);
        }
      };

      setupBackButton();

      return () => {
        if (backButtonListener) {
          backButtonListener.remove();
        }
      };
    } else {
      // Fallback for web: use popstate
      const handleBackButton = () => {
        const handled = onBackPress();

        if (handled) {
          // Push a dummy state to prevent actual navigation
          window.history.pushState(null, '', window.location.href);
        }
      };

      // Push initial state
      window.history.pushState(null, '', window.location.href);
      window.addEventListener('popstate', handleBackButton);

      return () => {
        window.removeEventListener('popstate', handleBackButton);
      };
    }
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
 * FIXED: Prevents pull-to-refresh and overscroll for both Capacitor and PWA
 */
export function usePreventDefaultTouchBehaviors() {
  useEffect(() => {
    // Add CSS overscroll protection for all environments
    const style = document.createElement('style');
    style.id = 'touch-fix';
    style.textContent = `
      html, body {
        overscroll-behavior-y: contain;
        overscroll-behavior-x: none;
      }
      * {
        -webkit-tap-highlight-color: transparent;
      }
      /* Prevent pull-to-refresh on the header area */
      header {
        touch-action: manipulation;
        overscroll-behavior: contain;
      }
    `;
    if (!document.getElementById('touch-fix')) {
      document.head.appendChild(style);
    }

    // Prevent pull-to-refresh on touchmove at document level
    const preventPullToRefresh = (e: TouchEvent) => {
      // Only prevent if scrolling at top of page and pulling down
      if (window.scrollY === 0) {
        const touch = e.touches[0];
        const startY = (e.target as any)._touchStartY;
        if (startY !== undefined && touch.clientY > startY) {
          // Pulling down at top of page - this could trigger refresh
          // Only prevent if the target is not a scrollable element
          const target = e.target as HTMLElement;
          if (!target.closest('.native-scroll') && !target.closest('[data-radix-scroll-area-viewport]')) {
            e.preventDefault();
          }
        }
      }
    };

    const trackTouchStart = (e: TouchEvent) => {
      (e.target as any)._touchStartY = e.touches[0].clientY;
    };

    document.addEventListener('touchstart', trackTouchStart, { passive: true });
    document.addEventListener('touchmove', preventPullToRefresh, { passive: false });

    return () => {
      document.getElementById('touch-fix')?.remove();
      document.removeEventListener('touchstart', trackTouchStart);
      document.removeEventListener('touchmove', preventPullToRefresh);
    };
  }, []);
}


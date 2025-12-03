import { useEffect, useCallback, useState } from 'react';

/**
 * Hook to handle Android hardware back button
 * Call this in your main App component
 */
export function useHardwareBackButton(onBackPress: () => boolean) {
  useEffect(() => {
    const handleBackButton = (e: PopStateEvent) => {
      // Prevent default back navigation
      e.preventDefault();
      
      // Call the custom back handler
      const handled = onBackPress();
      
      if (!handled) {
        // If not handled, allow default behavior (exit app or go back)
        window.history.back();
      } else {
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
 * FIXED: No longer blocks touch/click events
 */
export function usePreventDefaultTouchBehaviors() {
  useEffect(() => {
    let touchStartY = 0;
    let isPulling = false;

    // Track touch start - PASSIVE (doesn't block clicks)
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartY = e.touches[0].clientY;
        const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
        isPulling = scrollTop <= 0;
      }
    };

    // Only prevent on touchmove for pull-to-refresh
    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || e.touches.length !== 1) return;
      
      const touchY = e.touches[0].clientY;
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      
      if (scrollTop <= 0 && touchY > touchStartY + 10) {
        const target = e.target as HTMLElement;
        if (!target.closest('.overflow-auto, .overflow-y-auto, .overflow-y-scroll')) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = () => {
      isPulling = false;
    };

    // Add CSS for double-tap zoom prevention (doesn't block clicks)
    const style = document.createElement('style');
    style.id = 'touch-fix';
    style.textContent = `* { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }`;
    if (!document.getElementById('touch-fix')) {
      document.head.appendChild(style);
    }

    // PASSIVE listeners for start/end (won't block clicks)
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.getElementById('touch-fix')?.remove();
    };
  }, []);
}


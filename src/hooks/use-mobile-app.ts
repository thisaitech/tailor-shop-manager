import { useEffect, useCallback, useState, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';

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
 */
export function usePreventDefaultTouchBehaviors() {
  useEffect(() => {
    // Prevent pull-to-refresh
    const preventPullToRefresh = (e: TouchEvent) => {
      if (e.touches.length > 1) return; // Allow pinch zoom
      
      const touch = e.touches[0];
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      
      if (scrollTop <= 0 && touch.clientY > 0) {
        // At top of page, prevent pull-to-refresh
        // But allow if touching a scrollable element
        const target = e.target as HTMLElement;
        if (!target.closest('[data-allow-pull-refresh]')) {
          e.preventDefault();
        }
      }
    };

    // Prevent double-tap zoom
    let lastTouchEnd = 0;
    const preventDoubleTapZoom = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };

    document.addEventListener('touchstart', preventPullToRefresh, { passive: false });
    document.addEventListener('touchend', preventDoubleTapZoom, { passive: false });

    return () => {
      document.removeEventListener('touchstart', preventPullToRefresh);
      document.removeEventListener('touchend', preventDoubleTapZoom);
    };
  }, []);
}

// ============================================
// NATIVE CAMERA HOOK
// ============================================

/**
 * Check if running on native platform (Android/iOS)
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Hook to use native camera on mobile devices
 * Falls back to HTML input on web
 */
export function useNativeCamera() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Take a photo using the native camera (back camera by default)
   */
  const takePhoto = useCallback(async (): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      if (isNativePlatform()) {
        // Use Capacitor Camera on native platforms
        const photo: Photo = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
          direction: 'rear', // Use back camera
          correctOrientation: true,
          width: 1200,
          height: 1600,
        });

        setIsLoading(false);
        return photo.dataUrl || null;
      } else {
        // Fallback for web - this will be handled by the component
        setIsLoading(false);
        return null;
      }
    } catch (err: any) {
      console.error('[useNativeCamera] Error:', err);
      setError(err.message || 'Failed to take photo');
      setIsLoading(false);
      return null;
    }
  }, []);

  /**
   * Pick photo from gallery
   */
  const pickFromGallery = useCallback(async (): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      if (isNativePlatform()) {
        const photo: Photo = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos,
          correctOrientation: true,
          width: 1200,
          height: 1600,
        });

        setIsLoading(false);
        return photo.dataUrl || null;
      } else {
        setIsLoading(false);
        return null;
      }
    } catch (err: any) {
      console.error('[useNativeCamera] Error:', err);
      setError(err.message || 'Failed to pick photo');
      setIsLoading(false);
      return null;
    }
  }, []);

  /**
   * Check and request camera permission
   */
  const checkPermission = useCallback(async (): Promise<boolean> => {
    if (!isNativePlatform()) return true;

    try {
      const permission = await Camera.checkPermissions();
      if (permission.camera === 'granted') return true;

      const requestResult = await Camera.requestPermissions({ permissions: ['camera'] });
      return requestResult.camera === 'granted';
    } catch (err) {
      console.error('[useNativeCamera] Permission error:', err);
      return false;
    }
  }, []);

  return {
    takePhoto,
    pickFromGallery,
    checkPermission,
    isLoading,
    error,
    isNative: isNativePlatform(),
  };
}

// ============================================
// PUSH NOTIFICATIONS HOOK
// ============================================

export interface NotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
}

/**
 * Hook to handle push notifications
 */
export function usePushNotifications(
  onNotificationReceived?: (notification: PushNotificationSchema) => void,
  onNotificationTapped?: (notification: ActionPerformed) => void
) {
  const [token, setToken] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listenersSetup = useRef(false);

  // Initialize push notifications
  const initialize = useCallback(async () => {
    if (!isNativePlatform()) {
      console.log('[PushNotifications] Not on native platform, skipping');
      return;
    }

    try {
      // Request permission
      const permResult = await PushNotifications.requestPermissions();
      
      if (permResult.receive !== 'granted') {
        setError('Push notification permission denied');
        return;
      }

      // Register for push notifications
      await PushNotifications.register();
      setIsRegistered(true);

      // Setup listeners only once
      if (!listenersSetup.current) {
        listenersSetup.current = true;

        // Token received
        PushNotifications.addListener('registration', (tokenData: Token) => {
          console.log('[PushNotifications] Token:', tokenData.value);
          setToken(tokenData.value);
        });

        // Registration error
        PushNotifications.addListener('registrationError', (error: any) => {
          console.error('[PushNotifications] Registration error:', error);
          setError(error.message || 'Registration failed');
        });

        // Notification received while app is open
        PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
          console.log('[PushNotifications] Received:', notification);
          onNotificationReceived?.(notification);
        });

        // Notification tapped
        PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
          console.log('[PushNotifications] Action performed:', action);
          onNotificationTapped?.(action);
        });
      }
    } catch (err: any) {
      console.error('[PushNotifications] Error:', err);
      setError(err.message || 'Failed to initialize push notifications');
    }
  }, [onNotificationReceived, onNotificationTapped]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    token,
    isRegistered,
    error,
    initialize,
  };
}

// ============================================
// LOCAL NOTIFICATIONS HOOK
// ============================================

/**
 * Hook to send local notifications (for order status updates)
 */
export function useLocalNotifications() {
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Request permission on mount
  useEffect(() => {
    const requestPermission = async () => {
      if (!isNativePlatform()) {
        // For web, check Notification API
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          setPermissionGranted(permission === 'granted');
        }
        return;
      }

      try {
        const result = await LocalNotifications.requestPermissions();
        setPermissionGranted(result.display === 'granted');
      } catch (err) {
        console.error('[LocalNotifications] Permission error:', err);
      }
    };

    requestPermission();
  }, []);

  /**
   * Send a local notification
   */
  const sendNotification = useCallback(async (
    title: string,
    body: string,
    data?: Record<string, any>,
    id?: number
  ) => {
    const notificationId = id || Date.now();

    if (!isNativePlatform()) {
      // Use Web Notification API
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          data,
        });
      }
      return;
    }

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notificationId,
            title,
            body,
            extra: data,
            schedule: { at: new Date(Date.now() + 100) }, // Immediate
            sound: 'beep.wav',
            smallIcon: 'ic_stat_icon_config_sample',
            iconColor: '#7c3aed',
          },
        ],
      });
      console.log('[LocalNotifications] Sent:', title);
    } catch (err) {
      console.error('[LocalNotifications] Error:', err);
    }
  }, []);

  /**
   * Send order status notification
   */
  const sendOrderStatusNotification = useCallback(async (
    orderNumber: string,
    status: string,
    customerName?: string
  ) => {
    const statusMessages: Record<string, { title: string; body: string }> = {
      'open': {
        title: '📋 New Order Created',
        body: `Order ${orderNumber} has been created${customerName ? ` for ${customerName}` : ''}.`,
      },
      'awaiting': {
        title: '⏳ Order Assigned',
        body: `Order ${orderNumber} has been assigned and is awaiting acceptance.`,
      },
      'inprogress': {
        title: '🧵 Work In Progress',
        body: `Order ${orderNumber} is now being worked on.`,
      },
      'ready': {
        title: '✅ Order Ready',
        body: `Order ${orderNumber} is ready for delivery!`,
      },
      'job-completed': {
        title: '🎉 Job Completed',
        body: `Order ${orderNumber} has been completed by the tailor.`,
      },
      'delivered': {
        title: '📦 Order Delivered',
        body: `Order ${orderNumber} has been delivered successfully.`,
      },
      'rejected': {
        title: '❌ Order Rejected',
        body: `Order ${orderNumber} has been rejected. Please reassign.`,
      },
    };

    const message = statusMessages[status] || {
      title: '📋 Order Update',
      body: `Order ${orderNumber} status changed to ${status}.`,
    };

    await sendNotification(message.title, message.body, {
      orderNumber,
      status,
      customerName,
    });
  }, [sendNotification]);

  return {
    permissionGranted,
    sendNotification,
    sendOrderStatusNotification,
  };
}

/**
 * Convert data URL to File object
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}


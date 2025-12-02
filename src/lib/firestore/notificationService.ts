import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  updateDoc,
  onSnapshot,
  Unsubscribe,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Notification as AppNotification, NotificationType } from '@/lib/types';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

const NOTIFICATIONS_COLLECTION = 'notifications';

/**
 * Send a local device notification (popup notification on the device)
 */
async function sendLocalDeviceNotification(
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  const notificationId = Date.now();

  if (Capacitor.isNativePlatform()) {
    // Native platform - use Capacitor Local Notifications
    try {
      const permResult = await LocalNotifications.checkPermissions();
      if (permResult.display !== 'granted') {
        await LocalNotifications.requestPermissions();
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            id: notificationId,
            title,
            body,
            extra: data,
            schedule: { at: new Date(Date.now() + 100) },
            sound: 'default',
            smallIcon: 'ic_stat_icon_config_sample',
            iconColor: '#7c3aed',
          },
        ],
      });
      console.log('[LocalNotification] Sent:', title);
    } catch (error) {
      console.error('[LocalNotification] Error:', error);
    }
  } else {
    // Web platform - use Web Notification API
    if ('Notification' in window) {
      try {
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }
        
        if (Notification.permission === 'granted') {
          new Notification(title, {
            body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            data,
            tag: `notification-${notificationId}`,
          });
          console.log('[WebNotification] Sent:', title);
        }
      } catch (error) {
        console.error('[WebNotification] Error:', error);
      }
    }
  }
}

/**
 * Generate notification ID
 */
function generateNotificationId(): string {
  return `NOTIF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new notification
 * Also sends a local device notification for immediate user feedback
 */
export async function createNotification(
  notification: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>,
  sendDeviceNotification: boolean = true
): Promise<AppNotification> {
  try {
    const notificationId = generateNotificationId();
    const now = Date.now();

    const newNotification: AppNotification = {
      id: notificationId,
      ...notification,
      isRead: false,
      createdAt: now,
    };

    const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await setDoc(notificationRef, newNotification);

    console.log(`[Notification] Created notification ${notificationId} for ${notification.recipientId}`);

    // Also send a local device notification for immediate feedback
    if (sendDeviceNotification) {
      await sendLocalDeviceNotification(
        notification.title,
        notification.message,
        {
          notificationId,
          type: notification.type,
          orderId: notification.orderId,
          orderNumber: notification.orderNumber,
        }
      );
    }

    return newNotification;
  } catch (error) {
    console.error('[Notification] Error creating notification:', error);
    throw error;
  }
}

/**
 * Create order assignment notification
 */
export async function createOrderAssignmentNotification(
  orderId: string,
  orderNumber: string,
  recipientId: string,
  recipientType: 'employee' | 'vendor',
  senderName: string,
  companyId?: string
): Promise<AppNotification> {
  return createNotification({
    type: 'order_assigned',
    title: 'New Order Assigned',
    message: `Order ${orderNumber} has been assigned to you by ${senderName}`,
    recipientId,
    recipientType,
    senderName,
    orderId,
    orderNumber,
    companyId,
  });
}

/**
 * Create order acceptance notification for admin
 */
export async function createOrderAcceptedNotification(
  orderId: string,
  orderNumber: string,
  adminId: string,
  acceptedByName: string,
  companyId?: string
): Promise<AppNotification> {
  return createNotification({
    type: 'order_accepted',
    title: 'Order Accepted',
    message: `Order ${orderNumber} has been accepted by ${acceptedByName}`,
    recipientId: adminId,
    recipientType: 'admin',
    senderName: acceptedByName,
    orderId,
    orderNumber,
    companyId,
  });
}

/**
 * Create order rejection notification for admin
 */
export async function createOrderRejectedNotification(
  orderId: string,
  orderNumber: string,
  adminId: string,
  rejectedByName: string,
  reason: string,
  companyId?: string
): Promise<AppNotification> {
  return createNotification({
    type: 'order_rejected',
    title: 'Order Rejected',
    message: `Order ${orderNumber} has been rejected by ${rejectedByName}. Reason: ${reason}`,
    recipientId: adminId,
    recipientType: 'admin',
    senderName: rejectedByName,
    orderId,
    orderNumber,
    companyId,
    metadata: { reason },
  });
}

/**
 * Create order completed notification for admin
 */
export async function createOrderCompletedNotification(
  orderId: string,
  orderNumber: string,
  adminId: string,
  completedByName: string,
  companyId?: string
): Promise<AppNotification> {
  return createNotification({
    type: 'order_completed',
    title: 'Order Completed',
    message: `Order ${orderNumber} has been marked as completed by ${completedByName}`,
    recipientId: adminId,
    recipientType: 'admin',
    senderName: completedByName,
    orderId,
    orderNumber,
    companyId,
  });
}

/**
 * Create order reassigned notification
 */
export async function createOrderReassignedNotification(
  orderId: string,
  orderNumber: string,
  recipientId: string,
  recipientType: 'employee' | 'vendor',
  senderName: string,
  companyId?: string
): Promise<AppNotification> {
  return createNotification({
    type: 'order_reassigned',
    title: 'Order Reassigned',
    message: `Order ${orderNumber} has been reassigned to you by ${senderName}`,
    recipientId,
    recipientType,
    senderName,
    orderId,
    orderNumber,
    companyId,
  });
}

/**
 * Get notifications for a user
 * Note: Sorting in memory to avoid requiring a composite Firestore index
 */
export async function getNotificationsByUser(
  userId: string,
  limitCount: number = 50
): Promise<AppNotification[]> {
  try {
    const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
    // Query only by recipientId, then sort in memory
    const q = query(
      notificationsRef,
      where('recipientId', '==', userId)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs
      .map((doc) => doc.data() as AppNotification)
      .sort((a, b) => b.createdAt - a.createdAt) // Sort descending by createdAt
      .slice(0, limitCount); // Apply limit
  } catch (error) {
    console.error('[Notification] Error fetching notifications:', error);
    return [];
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
    const q = query(
      notificationsRef,
      where('recipientId', '==', userId),
      where('isRead', '==', false)
    );
    const snapshot = await getDocs(q);

    return snapshot.size;
  } catch (error) {
    console.error('[Notification] Error getting unread count:', error);
    return 0;
  }
}

/**
 * Subscribe to notifications for a user (real-time updates)
 * Note: Sorting in memory to avoid requiring a composite Firestore index
 */
export function subscribeToNotifications(
  userId: string,
  callback: (notifications: AppNotification[]) => void
): Unsubscribe {
  const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
  // Query only by recipientId, then sort in memory to avoid composite index requirement
  const q = query(
    notificationsRef,
    where('recipientId', '==', userId)
  );

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs
      .map((doc) => doc.data() as AppNotification)
      .sort((a, b) => b.createdAt - a.createdAt) // Sort descending by createdAt
      .slice(0, 50); // Limit to 50
    callback(notifications);
  }, (error) => {
    console.error('[Notification] Subscription error:', error);
    callback([]); // Return empty array on error
  });
}

/**
 * Subscribe to unread notification count (real-time updates)
 */
export function subscribeToUnreadCount(
  userId: string,
  callback: (count: number) => void
): Unsubscribe {
  const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
  const q = query(
    notificationsRef,
    where('recipientId', '==', userId),
    where('isRead', '==', false)
  );

  return onSnapshot(
    q, 
    (snapshot) => {
      console.log(`[Notification] Unread count updated for ${userId}: ${snapshot.size}`);
      callback(snapshot.size);
    },
    (error) => {
      console.error('[Notification] Unread count subscription error:', error);
      callback(0); // Return 0 on error
    }
  );
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await updateDoc(notificationRef, { isRead: true });
    console.log(`[Notification] Marked ${notificationId} as read`);
  } catch (error) {
    console.error('[Notification] Error marking as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  try {
    const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
    const q = query(
      notificationsRef,
      where('recipientId', '==', userId),
      where('isRead', '==', false)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnapshot) => {
      batch.update(docSnapshot.ref, { isRead: true });
    });

    await batch.commit();
    console.log(`[Notification] Marked all notifications as read for ${userId}`);
  } catch (error) {
    console.error('[Notification] Error marking all as read:', error);
    throw error;
  }
}

/**
 * Get a single notification
 */
export async function getNotification(notificationId: string): Promise<AppNotification | null> {
  try {
    const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    const docSnap = await getDoc(notificationRef);

    if (docSnap.exists()) {
      return docSnap.data() as Notification;
    }
    return null;
  } catch (error) {
    console.error('[Notification] Error fetching notification:', error);
    return null;
  }
}

/**
 * Send order status change notification (local device notification only)
 * Use this for quick status updates without storing in Firestore
 */
export async function sendOrderStatusNotification(
  orderNumber: string,
  status: string,
  customerName?: string
): Promise<void> {
  const statusMessages: Record<string, { title: string; body: string }> = {
    'open': {
      title: '📋 New Order Created',
      body: `Order ${orderNumber} has been created${customerName ? ` for ${customerName}` : ''}.`,
    },
    'awaiting': {
      title: '⏳ Order Assigned',
      body: `Order ${orderNumber} has been assigned and is awaiting acceptance.`,
    },
    'waitingForDC': {
      title: '📝 Waiting for Delivery Challan',
      body: `Order ${orderNumber} is waiting for delivery challan creation.`,
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
    'received-note': {
      title: '📦 Goods Received',
      body: `Goods for order ${orderNumber} have been received at the shop.`,
    },
    'delivered': {
      title: '🚀 Order Delivered',
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

  await sendLocalDeviceNotification(message.title, message.body, {
    orderNumber,
    status,
    customerName,
  });
}

/**
 * Request notification permission (call this early in app lifecycle)
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await LocalNotifications.requestPermissions();
      return result.display === 'granted';
    } catch (error) {
      console.error('[Notification] Permission error:', error);
      return false;
    }
  } else if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}


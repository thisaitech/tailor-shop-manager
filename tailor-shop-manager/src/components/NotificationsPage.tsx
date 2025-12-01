import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  ArrowLeft,
  Package,
  CheckCircle,
  XCircle,
  ArrowsClockwise,
  Truck,
  ClipboardText,
  Check,
  Checks,
} from '@phosphor-icons/react';
import { Notification } from '@/lib/types';
import {
  getNotificationsByUser,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  subscribeToNotifications,
} from '@/lib/firestore/notificationService';
import { useAuth } from '@/hooks/use-auth';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { EmptyState } from './EmptyState';

interface NotificationsPageProps {
  onBack: () => void;
}

export function NotificationsPage({ onBack }: NotificationsPageProps) {
  const { user, employee, vendor } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Get current user ID based on user type
  const getCurrentUserId = (): string | null => {
    if (user?.role === 'owner') return user.id;
    if (employee) return employee.id;
    if (vendor) return vendor.id;
    return null;
  };

  const userId = getCurrentUserId();

  useEffect(() => {
    if (!userId) return;

    // Subscribe to real-time notifications
    const unsubscribe = subscribeToNotifications(userId, (notifs) => {
      setNotifications(notifs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!userId) return;

    try {
      await markAllNotificationsAsRead(userId);
      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'order_assigned':
        return <Package size={20} weight="duotone" className="text-blue-500" />;
      case 'order_accepted':
        return <CheckCircle size={20} weight="duotone" className="text-green-500" />;
      case 'order_rejected':
        return <XCircle size={20} weight="duotone" className="text-red-500" />;
      case 'order_completed':
        return <CheckCircle size={20} weight="duotone" className="text-indigo-500" />;
      case 'order_ready':
        return <ClipboardText size={20} weight="duotone" className="text-purple-500" />;
      case 'order_delivered':
        return <Truck size={20} weight="duotone" className="text-gray-500" />;
      case 'order_reassigned':
        return <ArrowsClockwise size={20} weight="duotone" className="text-amber-500" />;
      case 'dc_created':
        return <ClipboardText size={20} weight="duotone" className="text-teal-500" />;
      case 'goods_received':
        return <Package size={20} weight="duotone" className="text-emerald-500" />;
      default:
        return <Bell size={20} weight="duotone" className="text-gray-500" />;
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'order_assigned':
        return { bg: '#dbeafe', border: '#3b82f6' };
      case 'order_accepted':
        return { bg: '#dcfce7', border: '#22c55e' };
      case 'order_rejected':
        return { bg: '#fee2e2', border: '#ef4444' };
      case 'order_completed':
        return { bg: '#e0e7ff', border: '#6366f1' };
      case 'order_ready':
        return { bg: '#f3e8ff', border: '#a855f7' };
      case 'order_delivered':
        return { bg: '#f3f4f6', border: '#6b7280' };
      case 'order_reassigned':
        return { bg: '#fef3c7', border: '#f59e0b' };
      case 'dc_created':
        return { bg: '#ccfbf1', border: '#14b8a6' };
      case 'goods_received':
        return { bg: '#d1fae5', border: '#10b981' };
      default:
        return { bg: '#f3f4f6', border: '#9ca3af' };
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-2xl font-bold">Notifications</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell size={28} weight="duotone" className="text-purple-600" />
              Notifications
            </h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'} • {notifications.length} total
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            className="gap-2"
          >
            <Checks size={16} />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="You'll see notifications for order updates here"
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((notification, index) => {
            const colors = getNotificationColor(notification.type);
            return (
              <Card
                key={notification.id}
                className={`transition-all duration-200 hover:shadow-md cursor-pointer animate-on-load animate-fade-slide-up stagger-${(index % 6) + 1} ${
                  !notification.isRead ? 'ring-2 ring-purple-400 ring-offset-2' : ''
                }`}
                style={{
                  background: notification.isRead ? '#ffffff' : colors.bg,
                  borderColor: colors.border,
                  borderWidth: '2px',
                }}
                onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ background: colors.bg }}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            {notification.title}
                            {!notification.isRead && (
                              <Badge className="bg-purple-500 text-white text-[10px] px-1.5 py-0">
                                New
                              </Badge>
                            )}
                          </h3>
                          <p className="text-sm text-gray-600 mt-0.5">
                            {notification.message}
                          </p>
                          {notification.orderNumber && (
                            <Badge
                              variant="outline"
                              className="mt-2 font-mono text-xs"
                              style={{ borderColor: colors.border, color: colors.border }}
                            >
                              {notification.orderNumber}
                            </Badge>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                          </span>
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(notification.id);
                              }}
                            >
                              <Check size={12} className="mr-1" />
                              Mark read
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Timestamp */}
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(notification.createdAt, 'dd MMM yyyy, hh:mm a')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}


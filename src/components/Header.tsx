import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { useIsMobile } from '@/hooks/use-mobile';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { AdminMenu } from '@/components/AdminMenu';
import { EmployeeMenu } from '@/components/EmployeeMenu';
import { VendorMenu } from '@/components/VendorMenu';
import { Button } from '@/components/ui/button';
import { Scissors, SignOut, Bell, ArrowLeft } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { subscribeToNotifications } from '@/lib/firestore/notificationService';
import { Notification } from '@/lib/types';

interface HeaderProps {
  onDashboardClick?: () => void;
  onCustomersClick?: () => void;
  onProfileClick?: () => void;
  onEmployeeClick?: () => void;
  onVendorClick?: () => void;
  onDesignClick?: () => void;
  onPaymentClick?: () => void;
  onDeliveryChallanClick?: () => void;
  onGoodsReceiptClick?: () => void;
  onEmployeeProfileClick?: () => void;
  onVendorProfileClick?: () => void;
  onNotificationsClick?: () => void;
  onBackClick?: () => void;
  showBackButton?: boolean;
}

export function Header({ onDashboardClick, onCustomersClick, onProfileClick, onEmployeeClick, onVendorClick, onDesignClick, onPaymentClick, onDeliveryChallanClick, onGoodsReceiptClick, onEmployeeProfileClick, onVendorProfileClick, onNotificationsClick, onBackClick, showBackButton }: HeaderProps) {
  const { user, employee, vendor, logout } = useAuth();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [unreadCount, setUnreadCount] = useState(0);

  // Get current user ID based on user type
  const getCurrentUserId = (): string | null => {
    if (user?.role === 'owner') return user.id;
    if (employee) return employee.id;
    if (vendor) return vendor.id;
    return null;
  };

  const userId = getCurrentUserId();
  const prevNotificationsRef = useRef<Notification[]>([]);
  const isFirstLoadRef = useRef(true);

  // Subscribe to notifications for real-time updates and toast notifications
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToNotifications(userId, (notifications) => {
      // Calculate unread count
      const newUnreadCount = notifications.filter(n => !n.isRead).length;
      setUnreadCount(newUnreadCount);

      // Check for new notifications (not on first load)
      if (!isFirstLoadRef.current && notifications.length > 0) {
        const prevIds = new Set(prevNotificationsRef.current.map(n => n.id));
        const newNotifications = notifications.filter(n => !prevIds.has(n.id) && !n.isRead);
        
        // Show toast for each new notification
        newNotifications.forEach((notification) => {
          toast.info(notification.title, {
            description: notification.message,
            duration: 5000,
            action: {
              label: 'View',
              onClick: () => {
                if (onNotificationsClick) onNotificationsClick();
              },
            },
          });
        });
      }

      // Update refs
      prevNotificationsRef.current = notifications;
      isFirstLoadRef.current = false;
    });

    return () => {
      unsubscribe();
      isFirstLoadRef.current = true;
    };
  }, [userId, onNotificationsClick]);

  const handleLogout = () => {
    logout();
    toast.success('Logout successful');
  };

  return (
    <header className="border-b backdrop-blur-md sticky top-0 z-50 shadow-lg" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #8b5cf6 100%)', borderColor: 'rgba(196, 181, 253, 0.3)' }}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Back Button */}
            {isMobile && showBackButton && onBackClick && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBackClick}
                className="hover:bg-white/20 text-white -ml-2 min-w-[44px] min-h-[44px]"
                style={{ touchAction: 'manipulation' }}
              >
                <ArrowLeft size={26} weight="bold" />
              </Button>
            )}
            <div className="p-2.5 rounded-lg shadow-md" style={{ background: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(10px)' }}>
              <Scissors size={28} className="text-white" weight="duotone" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{t('appName')}</h1>
              <p className="text-xs text-purple-100 hidden sm:block">
                {user?.role === 'owner' && 'Owner Dashboard'}
                {user?.role === 'tailor' && 'Tailor Portal'}
                {user?.role === 'customer' && 'Customer Portal'}
                {employee && 'Employee Portal'}
                {vendor && 'Job Work Portal'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            {onNotificationsClick && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onNotificationsClick}
                className="relative hover:bg-white/20 text-white min-w-[44px] min-h-[44px]"
                style={{ touchAction: 'manipulation' }}
              >
                <Bell size={24} weight={unreadCount > 0 ? 'fill' : 'regular'} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Button>
            )}
            <LanguageSwitcher />
            {user?.role === 'owner' && onProfileClick && onEmployeeClick && onVendorClick && onDesignClick ? (
              <AdminMenu
                onDashboardClick={onDashboardClick}
                onCustomersClick={onCustomersClick}
                onProfileClick={onProfileClick}
                onEmployeeClick={onEmployeeClick}
                onVendorClick={onVendorClick}
                onDesignClick={onDesignClick}
                onPaymentClick={onPaymentClick}
                onDeliveryChallanClick={onDeliveryChallanClick}
                onGoodsReceiptClick={onGoodsReceiptClick}
              />
            ) : employee && onEmployeeProfileClick ? (
              <EmployeeMenu onProfileClick={onEmployeeProfileClick} />
            ) : vendor && onVendorProfileClick ? (
              <VendorMenu onProfileClick={onVendorProfileClick} />
            ) : (
              <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
                <SignOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

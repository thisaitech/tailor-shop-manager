import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { AdminMenu } from '@/components/AdminMenu';
import { EmployeeMenu } from '@/components/EmployeeMenu';
import { VendorMenu } from '@/components/VendorMenu';
import { Button } from '@/components/ui/button';
import { Scissors, SignOut } from '@phosphor-icons/react';
import { toast } from 'sonner';

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
}

export function Header({ onDashboardClick, onCustomersClick, onProfileClick, onEmployeeClick, onVendorClick, onDesignClick, onPaymentClick, onDeliveryChallanClick, onGoodsReceiptClick, onEmployeeProfileClick, onVendorProfileClick }: HeaderProps) {
  const { user, employee, vendor, logout } = useAuth();
  const { t } = useLanguage();

  const handleLogout = () => {
    logout();
    toast.success('Logout successful');
  };

  return (
    <header className="border-b backdrop-blur-md sticky top-0 z-50 shadow-lg" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #8b5cf6 100%)', borderColor: 'rgba(196, 181, 253, 0.3)' }}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
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

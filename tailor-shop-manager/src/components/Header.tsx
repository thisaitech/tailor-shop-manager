import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { AdminMenu } from '@/components/AdminMenu';
import { EmployeeMenu } from '@/components/EmployeeMenu';
import { Button } from '@/components/ui/button';
import { Scissors, SignOut } from '@phosphor-icons/react';
import { toast } from 'sonner';

interface HeaderProps {
  onProfileClick?: () => void;
  onEmployeeClick?: () => void;
  onVendorClick?: () => void;
  onDesignClick?: () => void;
  onPaymentClick?: () => void;
  onDeliveryChallanClick?: () => void;
  onGoodsReceiptClick?: () => void;
  onEmployeeProfileClick?: () => void;
}

export function Header({ onProfileClick, onEmployeeClick, onVendorClick, onDesignClick, onPaymentClick, onDeliveryChallanClick, onGoodsReceiptClick, onEmployeeProfileClick }: HeaderProps) {
  const { user, employee, logout } = useAuth();
  const { t } = useLanguage();

  const handleLogout = () => {
    logout();
    toast.success('Logout successful');
  };

  return (
    <header className="border-b backdrop-blur-md sticky top-0 z-50 shadow-sm" style={{ backgroundColor: '#b1f2ff', borderColor: '#7de8f7' }}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2.5 rounded-lg">
              <Scissors size={28} className="text-primary-foreground" weight="duotone" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t('appName')}</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {user?.role === 'owner' && 'Owner Dashboard'}
                {user?.role === 'tailor' && 'Tailor Portal'}
                {user?.role === 'customer' && 'Customer Portal'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {user?.role === 'owner' && onProfileClick && onEmployeeClick && onVendorClick && onDesignClick ? (
              <AdminMenu
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

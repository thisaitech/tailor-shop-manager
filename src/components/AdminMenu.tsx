import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { List, User, Users, UsersThree, SignOut, Storefront, Scissors, CurrencyInr, Truck, Package, ChartBar } from '@phosphor-icons/react';
import { toast } from 'sonner';

interface AdminMenuProps {
  onDashboardClick?: () => void;
  onCustomersClick?: () => void;
  onProfileClick: () => void;
  onEmployeeClick: () => void;
  onVendorClick: () => void;
  onDesignClick: () => void;
  onPaymentClick?: () => void;
  onReportsClick?: () => void;
  onDeliveryChallanClick?: () => void;
  onGoodsReceiptClick?: () => void;
}

export function AdminMenu({
  onDashboardClick,
  onCustomersClick,
  onProfileClick,
  onEmployeeClick,
  onVendorClick,
  onDesignClick,
  onPaymentClick,
  onReportsClick,
  onDeliveryChallanClick,
  onGoodsReceiptClick,
}: AdminMenuProps) {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logout successful');
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" style={{ backgroundColor: 'white' }}>
          <List size={20} weight="bold" />
          <span className="hidden sm:inline">Menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-purple-50 border border-purple-200 shadow-lg">
        {onDashboardClick && (
          <DropdownMenuItem onClick={() => { onDashboardClick(); setOpen(false); }} className="cursor-pointer">
            <Package size={18} className="mr-2" />
            Dashboard
          </DropdownMenuItem>
        )}
        {onCustomersClick && (
          <DropdownMenuItem onClick={() => { onCustomersClick(); setOpen(false); }} className="cursor-pointer">
            <UsersThree size={18} className="mr-2" />
            Customers
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => { onProfileClick(); setOpen(false); }} className="cursor-pointer">
          <User size={18} className="mr-2" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { onEmployeeClick(); setOpen(false); }} className="cursor-pointer">
          <Users size={18} className="mr-2" />
          Employees
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { onVendorClick(); setOpen(false); }} className="cursor-pointer">
          <Storefront size={18} className="mr-2" />
          Job Work Tailor
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { onDesignClick(); setOpen(false); }} className="cursor-pointer">
          <Scissors size={18} className="mr-2" />
          Design
        </DropdownMenuItem>
        {onPaymentClick && (
          <DropdownMenuItem onClick={() => { onPaymentClick(); setOpen(false); }} className="cursor-pointer">
            <CurrencyInr size={18} className="mr-2" />
            Payment
          </DropdownMenuItem>
        )}
        {onReportsClick && (
          <DropdownMenuItem onClick={() => { onReportsClick(); setOpen(false); }} className="cursor-pointer">
            <ChartBar size={18} className="mr-2" />
            Reports
          </DropdownMenuItem>
        )}
        {onDeliveryChallanClick && (
          <DropdownMenuItem onClick={() => { onDeliveryChallanClick(); setOpen(false); }} className="cursor-pointer">
            <Truck size={18} className="mr-2" />
            Delivery Challan
          </DropdownMenuItem>
        )}
        {onGoodsReceiptClick && (
          <DropdownMenuItem onClick={() => { onGoodsReceiptClick(); setOpen(false); }} className="cursor-pointer">
            <Package size={18} className="mr-2" />
            Goods Receipt
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
          <SignOut size={18} className="mr-2" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

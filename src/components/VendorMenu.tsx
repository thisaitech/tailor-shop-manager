import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { User, SignOut, CaretDown } from '@phosphor-icons/react';
import { toast } from 'sonner';

interface VendorMenuProps {
  onProfileClick: () => void;
}

export function VendorMenu({ onProfileClick }: VendorMenuProps) {
  const { vendor, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logout successful');
    setOpen(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 px-2 sm:px-3" style={{ backgroundColor: 'white' }}>
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #6366f1 100%)' }}
          >
            {vendor?.tailorName ? getInitials(vendor.tailorName) : <User size={14} />}
          </div>
          <span className="hidden sm:inline font-medium text-gray-700 max-w-[100px] truncate">
            {vendor?.tailorName || 'User'}
          </span>
          <CaretDown size={14} className="text-gray-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-purple-50 border border-purple-200 shadow-lg">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{vendor?.tailorName || 'User'}</p>
            <p className="text-xs leading-none text-muted-foreground">{vendor?.contactNumber || ''}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { onProfileClick(); setOpen(false); }} className="cursor-pointer">
          <User size={18} className="mr-2" />
          User Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
          <SignOut size={18} className="mr-2" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

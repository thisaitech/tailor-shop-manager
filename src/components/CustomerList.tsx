import { useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { Customer } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MagnifyingGlass, UserCircle, Plus, DotsThree, PencilSimple, Trash, Phone, WhatsappLogo } from '@phosphor-icons/react';
import { CustomerForm } from './CustomerForm';
import { sendWhatsAppMessage } from '@/lib/utils';

interface CustomerListProps {
  customers: Customer[];
  onAddCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateCustomer?: (id: string, customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDeleteCustomer?: (id: string) => void;
  onSelectCustomer?: (customer: Customer) => void;
}

export function CustomerList({ customers, onAddCustomer, onUpdateCustomer, onDeleteCustomer, onSelectCustomer }: CustomerListProps) {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>();
  const [deleteCustomerId, setDeleteCustomerId] = useState<string | null>(null);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.place.toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleEdit = (customer: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const handleDelete = (customerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteCustomerId(customerId);
  };

  const confirmDelete = () => {
    if (deleteCustomerId && onDeleteCustomer) {
      onDeleteCustomer(deleteCustomerId);
      setDeleteCustomerId(null);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingCustomer(undefined);
  };

  const handleSave = (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingCustomer && onUpdateCustomer) {
      onUpdateCustomer(editingCustomer.id, customerData);
    } else {
      onAddCustomer(customerData);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <MagnifyingGlass
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={20}
          />
          <Input
            placeholder={t('searchCustomers')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 sm:h-10 text-base sm:text-sm touch-manipulation"
          />
        </div>
        <Button onClick={() => setShowForm(true)} className="h-11 sm:h-10 text-base sm:text-sm font-semibold touch-manipulation px-5">
          <Plus size={20} className="mr-2" weight="bold" />
          <span className="hidden sm:inline">{t('addCustomer')}</span>
          <span className="sm:hidden">Add Customer</span>
        </Button>
      </div>

      {filteredCustomers.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center">
          <UserCircle size={56} className="sm:size-16 mx-auto text-muted-foreground mb-4" weight="duotone" />
          <p className="text-base sm:text-base text-muted-foreground mb-4 font-medium">
            {search ? t('noCustomers') : t('noCustomers')}
          </p>
          {!search && (
            <Button onClick={() => setShowForm(true)} className="text-base sm:text-sm h-11 sm:h-10 touch-manipulation">
              <Plus size={20} className="mr-2" weight="bold" />
              {t('addCustomer')}
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredCustomers.map((customer) => (
            <Card
              key={customer.id}
              className="p-4 sm:p-4 hover:shadow-lg transition-all duration-200 cursor-pointer hover:-translate-y-0.5"
              onClick={() => onSelectCustomer?.(customer)}
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-11 w-11 sm:h-10 sm:w-10">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm sm:text-sm font-bold">
                    {getInitials(customer.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base sm:text-base text-foreground break-words">
                    {customer.name}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <a 
                      href={`tel:${customer.phone}`}
                      className="text-sm sm:text-sm text-muted-foreground hover:text-primary hover:underline transition-colors font-medium break-all"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {customer.phone}
                    </a>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <a 
                        href={`tel:${customer.phone}`}
                        className="text-primary hover:text-primary/80 transition-colors p-1 touch-manipulation"
                        onClick={(e) => e.stopPropagation()}
                        title={t('call')}
                      >
                        <Phone size={16} className="sm:size-4" weight="fill" />
                      </a>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          sendWhatsAppMessage(customer.phone, `Hello ${customer.name},`);
                        }}
                        className="text-green-600 hover:text-green-700 transition-colors p-1 touch-manipulation"
                        title={t('whatsapp')}
                      >
                        <WhatsappLogo size={16} className="sm:size-4" weight="fill" />
                      </button>
                    </div>
                  </div>
                  {customer.place && (
                    <p className="text-sm sm:text-sm text-muted-foreground mt-1 font-medium break-words">
                      {customer.place}
                    </p>
                  )}
                  <div className="mt-2">
                    <Badge variant="outline" className="text-sm sm:text-xs font-semibold">
                      {t(customer.gender)}
                    </Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-8 sm:w-8 flex-shrink-0 touch-manipulation">
                      <DotsThree size={20} className="sm:size-5" weight="bold" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <a 
                        href={`tel:${customer.phone}`}
                        className="flex items-center cursor-pointer text-base sm:text-sm font-medium"
                      >
                        <Phone size={18} className="mr-2" weight="bold" />
                        {t('call')}
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        sendWhatsAppMessage(customer.phone, `Hello ${customer.name},`);
                      }}
                      className="cursor-pointer text-base sm:text-sm font-medium"
                    >
                      <WhatsappLogo size={18} className="mr-2" weight="bold" />
                      {t('whatsapp')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => handleEdit(customer, e)} className="text-base sm:text-sm font-medium">
                      <PencilSimple size={18} className="mr-2" weight="bold" />
                      {t('edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => handleDelete(customer.id, e)}
                      className="text-destructive focus:text-destructive text-base sm:text-sm font-medium"
                    >
                      <Trash size={18} className="mr-2" weight="bold" />
                      {t('delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CustomerForm
        open={showForm}
        onOpenChange={handleFormClose}
        onSave={handleSave}
        customer={editingCustomer}
      />

      <AlertDialog open={deleteCustomerId !== null} onOpenChange={() => setDeleteCustomerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteCustomer')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteCustomerConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

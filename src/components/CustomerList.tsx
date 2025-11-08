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
import { MagnifyingGlass, UserCircle, Plus, DotsThree, PencilSimple, Trash, Phone } from '@phosphor-icons/react';
import { CustomerForm } from './CustomerForm';

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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlass
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={20}
          />
          <Input
            placeholder={t('searchCustomers')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={20} className="mr-2" />
          {t('addCustomer')}
        </Button>
      </div>

      {filteredCustomers.length === 0 ? (
        <Card className="p-12 text-center">
          <UserCircle size={64} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">
            {search ? t('noCustomers') : t('noCustomers')}
          </p>
          {!search && (
            <Button onClick={() => setShowForm(true)}>
              <Plus size={20} className="mr-2" />
              {t('addCustomer')}
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => (
            <Card
              key={customer.id}
              className="p-4 hover:shadow-lg transition-all duration-200 cursor-pointer hover:-translate-y-1"
              onClick={() => onSelectCustomer?.(customer)}
            >
              <div className="flex items-start gap-3">
                <Avatar>
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials(customer.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {customer.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <a 
                      href={`tel:${customer.phone}`}
                      className="text-sm text-muted-foreground hover:text-primary hover:underline transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {customer.phone}
                    </a>
                    <a 
                      href={`tel:${customer.phone}`}
                      className="text-primary hover:text-primary/80 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                      title="Call customer"
                    >
                      <Phone size={18} weight="fill" />
                    </a>
                  </div>
                  {customer.place && (
                    <p className="text-sm text-muted-foreground truncate">
                      {customer.place}
                    </p>
                  )}
                  <div className="mt-2">
                    <Badge variant="outline">
                      {t(customer.gender)}
                    </Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <DotsThree size={20} weight="bold" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <a 
                        href={`tel:${customer.phone}`}
                        className="flex items-center cursor-pointer"
                      >
                        <Phone size={16} className="mr-2" />
                        {t('call')}
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => handleEdit(customer, e)}>
                      <PencilSimple size={16} className="mr-2" />
                      {t('edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => handleDelete(customer.id, e)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash size={16} className="mr-2" />
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

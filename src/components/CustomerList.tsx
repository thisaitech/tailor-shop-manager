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
  const [alphabetFilter, setAlphabetFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>();
  const [deleteCustomerId, setDeleteCustomerId] = useState<string | null>(null);

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.place.toLowerCase().includes(search.toLowerCase());
    
    const matchesAlphabet = 
      alphabetFilter === 'all' || 
      c.name.charAt(0).toLowerCase() === alphabetFilter.toLowerCase();
    
    return matchesSearch && matchesAlphabet;
  });

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

  const alphabetLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  
  const getCustomerCountForLetter = (letter: string) => {
    return customers.filter(c => c.name.charAt(0).toLowerCase() === letter.toLowerCase()).length;
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-2 sm:gap-3">
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
              className="pl-10 h-10 touch-manipulation"
            />
          </div>
          <Button onClick={() => setShowForm(true)} className="h-10 font-semibold touch-manipulation px-4 text-xs sm:text-sm whitespace-nowrap">
            <Plus size={18} className="mr-1.5" weight="bold" />
            {t('addCustomer')}
          </Button>
        </div>
        
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          <Button
            variant={alphabetFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAlphabetFilter('all')}
            className="text-xs font-semibold whitespace-nowrap touch-manipulation h-8 px-3"
          >
            {t('all')} ({customers.length})
          </Button>
          {alphabetLetters.map((letter) => {
            const count = getCustomerCountForLetter(letter);
            if (count === 0) return null;
            return (
              <Button
                key={letter}
                variant={alphabetFilter === letter ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAlphabetFilter(letter)}
                className="text-xs font-semibold touch-manipulation h-8 px-2.5 min-w-[2.5rem]"
              >
                {letter} ({count})
              </Button>
            );
          })}
        </div>
      </div>

      {filteredCustomers.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center">
          <UserCircle size={64} className="mx-auto text-muted-foreground mb-4" weight="duotone" />
          <p className="text-base text-muted-foreground mb-4 font-medium">
            {search ? t('noCustomers') : t('noCustomers')}
          </p>
          {!search && (
            <Button onClick={() => setShowForm(true)} className="h-10 touch-manipulation text-xs sm:text-sm">
              <Plus size={18} className="mr-1.5" weight="bold" />
              {t('addCustomer')}
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          {filteredCustomers.map((customer) => (
            <Card
              key={customer.id}
              className="p-4 hover:shadow-lg transition-all duration-200 cursor-pointer hover:-translate-y-0.5 w-full"
              onClick={() => onSelectCustomer?.(customer)}
            >
              <div className="flex flex-col items-center gap-3 w-full text-center">
                <div className="flex items-center justify-between w-full">
                  <div className="w-8"></div>
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground font-bold text-[10px]">
                      {getInitials(customer.name)}
                    </AvatarFallback>
                  </Avatar>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 touch-manipulation">
                        <DotsThree size={20} weight="bold" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <a 
                          href={`tel:${customer.phone}`}
                          className="flex items-center cursor-pointer font-medium"
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
                        className="cursor-pointer font-medium"
                      >
                        <WhatsappLogo size={18} className="mr-2" weight="bold" />
                        {t('whatsapp')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleEdit(customer, e)} className="font-medium">
                        <PencilSimple size={18} className="mr-2" weight="bold" />
                        {t('edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => handleDelete(customer.id, e)}
                        className="text-destructive focus:text-destructive font-medium"
                      >
                        <Trash size={18} className="mr-2" weight="bold" />
                        {t('delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="w-full space-y-2 min-w-0">
                  <h3 className="font-bold text-sm text-foreground break-words leading-tight line-clamp-2">
                    {customer.name}
                  </h3>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <a 
                      href={`tel:${customer.phone}`}
                      className="text-xs text-muted-foreground hover:text-primary hover:underline transition-colors font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {customer.phone}
                    </a>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <a 
                        href={`tel:${customer.phone}`}
                        className="text-primary hover:text-primary/80 transition-colors p-0.5 touch-manipulation"
                        onClick={(e) => e.stopPropagation()}
                        title={t('call')}
                      >
                        <Phone size={14} weight="fill" />
                      </a>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          sendWhatsAppMessage(customer.phone, `Hello ${customer.name},`);
                        }}
                        className="text-green-600 hover:text-green-700 transition-colors p-0.5 touch-manipulation"
                        title={t('whatsapp')}
                      >
                        <WhatsappLogo size={14} weight="fill" />
                      </button>
                    </div>
                  </div>
                  {customer.place && (
                    <p className="text-xs text-muted-foreground font-medium line-clamp-1">
                      {customer.place}
                    </p>
                  )}
                  <div className="flex justify-center">
                    <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0.5">
                      {t(customer.gender)}
                    </Badge>
                  </div>
                </div>
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

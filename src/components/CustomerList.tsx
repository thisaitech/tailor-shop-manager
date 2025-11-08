import { useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { Customer } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MagnifyingGlass, UserCircle, Plus } from '@phosphor-icons/react';
import { CustomerForm } from './CustomerForm';

interface CustomerListProps {
  customers: Customer[];
  onAddCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onSelectCustomer?: (customer: Customer) => void;
}

export function CustomerList({ customers, onAddCustomer, onSelectCustomer }: CustomerListProps) {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

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
                  <p className="text-sm text-muted-foreground">{customer.phone}</p>
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
              </div>
            </Card>
          ))}
        </div>
      )}

      <CustomerForm
        open={showForm}
        onOpenChange={setShowForm}
        onSave={onAddCustomer}
      />
    </div>
  );
}

import { useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { Order, OrderStatus } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MagnifyingGlass, Scissors, Plus, Warning, Phone, WhatsappLogo } from '@phosphor-icons/react';
import { format, isPast, isToday } from 'date-fns';
import { OrderForm } from './OrderForm';
import { Customer, Tailor } from '@/lib/types';
import { sendWhatsAppMessage } from '@/lib/utils';

interface OrderListProps {
  orders: Order[];
  customers: Customer[];
  tailors: Tailor[];
  onAddOrder: (order: {
    customerId: string;
    customerName: string;
    customerPhone: string;
    measurements: any;
    fabricDetails: string;
    designNotes: string;
    assignedTailor: string;
    deliveryDate: number;
  }) => void;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
}

export function OrderList({
  orders,
  customers,
  tailors,
  onAddOrder,
  onUpdateStatus,
}: OrderListProps) {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filteredOrders = orders.filter(
    (o) =>
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.customerPhone.includes(search) ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.assignedTailor.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'delivered':
        return 'bg-slate-100 text-slate-800';
    }
  };

  const isOverdue = (order: Order) => {
    return order.status !== 'delivered' && isPast(order.deliveryDate);
  };

  const getOrderStatusMessage = (order: Order) => {
    const statusMessages = {
      pending: `Your order ${order.id.slice(0, 8)} is pending. Expected delivery: ${format(order.deliveryDate, 'MMM dd, yyyy')}`,
      'in-progress': `Your order ${order.id.slice(0, 8)} is being stitched by ${order.assignedTailor}. Expected delivery: ${format(order.deliveryDate, 'MMM dd, yyyy')}`,
      ready: `Good news! Your order ${order.id.slice(0, 8)} is ready for pickup. Please collect at your earliest convenience.`,
      delivered: `Thank you! Your order ${order.id.slice(0, 8)} has been delivered. We hope you love it!`,
    };
    return statusMessages[order.status];
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <MagnifyingGlass
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={18}
          />
          <Input
            placeholder={t('searchOrders')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 sm:h-10 text-sm"
          />
        </div>
        <Button onClick={() => setShowForm(true)} className="h-9 sm:h-10 text-sm">
          <Plus size={18} className="mr-1.5" />
          <span className="hidden sm:inline">{t('newOrder')}</span>
          <span className="sm:hidden">New</span>
        </Button>
      </div>

      {filteredOrders.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center">
          <Scissors size={48} className="sm:size-16 mx-auto text-muted-foreground mb-3 sm:mb-4" />
          <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
            {search ? t('noOrders') : t('noOrders')}
          </p>
          {!search && (
            <Button onClick={() => setShowForm(true)} className="text-sm">
              <Plus size={18} className="mr-1.5" />
              {t('newOrder')}
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {filteredOrders.map((order) => (
            <Card
              key={order.id}
              className={`p-3 sm:p-4 hover:shadow-lg transition-all duration-200 cursor-pointer ${
                isOverdue(order) ? 'border-destructive' : ''
              }`}
              onClick={() => setSelectedOrder(order)}
            >
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                        <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
                          {order.customerName}
                        </h3>
                        {isOverdue(order) && (
                          <Warning size={16} className="sm:size-5 text-destructive flex-shrink-0" weight="fill" />
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {t('orderId')}: {order.id.slice(0, 8)}
                      </p>
                      <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
                        <a 
                          href={`tel:${order.customerPhone}`}
                          className="text-xs sm:text-sm text-muted-foreground hover:text-primary hover:underline transition-colors truncate"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {order.customerPhone}
                        </a>
                        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                          <a 
                            href={`tel:${order.customerPhone}`}
                            className="text-primary hover:text-primary/80 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                            title={t('call')}
                          >
                            <Phone size={14} className="sm:size-4" weight="fill" />
                          </a>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              sendWhatsAppMessage(order.customerPhone, getOrderStatusMessage(order));
                            }}
                            className="text-green-600 hover:text-green-700 transition-colors"
                            title={t('whatsapp')}
                          >
                            <WhatsappLogo size={14} className="sm:size-4" weight="fill" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 sm:gap-2 text-xs sm:text-sm">
                    <Badge variant="outline" className="text-xs">
                      {t('tailor')}: {order.assignedTailor}
                    </Badge>
                    <Badge
                      variant={
                        isOverdue(order)
                          ? 'destructive'
                          : isToday(order.deliveryDate)
                          ? 'default'
                          : 'outline'
                      }
                      className="text-xs"
                    >
                      {isOverdue(order)
                        ? t('overdue')
                        : isToday(order.deliveryDate)
                        ? t('dueToday')
                        : format(order.deliveryDate, 'MMM dd, yyyy')}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center">
                  <Select
                    value={order.status}
                    onValueChange={(value) => {
                      onUpdateStatus(order.id, value as OrderStatus);
                    }}
                  >
                    <SelectTrigger
                      className="w-full sm:w-[180px] h-9 text-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">
                        <span className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${getStatusColor('pending')}`}
                          />
                          {t('pending')}
                        </span>
                      </SelectItem>
                      <SelectItem value="in-progress">
                        <span className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${getStatusColor(
                              'in-progress'
                            )}`}
                          />
                          {t('inProgress')}
                        </span>
                      </SelectItem>
                      <SelectItem value="ready">
                        <span className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${getStatusColor('ready')}`}
                          />
                          {t('ready')}
                        </span>
                      </SelectItem>
                      <SelectItem value="delivered">
                        <span className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${getStatusColor(
                              'delivered'
                            )}`}
                          />
                          {t('delivered')}
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(order.fabricDetails || order.designNotes) && (
                <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t text-xs sm:text-sm text-muted-foreground space-y-1">
                  {order.fabricDetails && (
                    <p>
                      <span className="font-medium">{t('fabricDetails')}:</span>{' '}
                      {order.fabricDetails}
                    </p>
                  )}
                  {order.designNotes && (
                    <p>
                      <span className="font-medium">{t('designNotes')}:</span>{' '}
                      {order.designNotes}
                    </p>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <OrderForm
        open={showForm}
        onOpenChange={setShowForm}
        onSave={onAddOrder}
        customers={customers}
        tailors={tailors}
      />
    </div>
  );
}

import { useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { Order, OrderStatus, InventoryItem } from '@/lib/types';
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
import { MagnifyingGlass, Scissors, Plus, Warning, Phone, WhatsappLogo, CaretDown, CaretUp } from '@phosphor-icons/react';
import { format, isPast, isToday } from 'date-fns';
import { OrderForm } from './OrderForm';
import { PhotoGallery } from './PhotoGallery';
import { Customer, Tailor } from '@/lib/types';
import { sendWhatsAppMessage } from '@/lib/utils';

interface OrderListProps {
  orders: Order[];
  customers: Customer[];
  tailors: Tailor[];
  inventory: InventoryItem[];
  onAddOrder: (order: {
    customerId: string;
    customerName: string;
    customerPhone: string;
    measurements: any;
    fabricDetails: string;
    designNotes: string;
    fabricPhotos?: string[];
    designPhotos?: string[];
    assignedTailor: string;
    materialsUsed?: any[];
    deliveryDate: number;
  }) => void;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
}

export function OrderList({
  orders,
  customers,
  tailors,
  inventory,
  onAddOrder,
  onUpdateStatus,
}: OrderListProps) {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const filteredOrders = (orders || []).filter((o) => {
    const matchesSearch =
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.customerPhone.includes(search) ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.assignedTailor.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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

  const toggleExpanded = (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedOrders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
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
      <div className="flex flex-col gap-2 sm:gap-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <MagnifyingGlass
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={20}
            />
            <Input
              placeholder={t('searchOrders')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 touch-manipulation"
            />
          </div>
          <Button onClick={() => setShowForm(true)} className="h-10 font-semibold touch-manipulation px-4 text-xs sm:text-sm whitespace-nowrap">
            <Plus size={18} className="mr-1.5" weight="bold" />
            {t('newOrder')}
          </Button>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
            className="text-xs font-semibold whitespace-nowrap touch-manipulation"
          >
            {t('all')} ({(orders || []).length})
          </Button>
          <Button
            variant={statusFilter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('pending')}
            className="text-xs font-semibold whitespace-nowrap touch-manipulation"
          >
            {t('pending')} ({(orders || []).filter(o => o.status === 'pending').length})
          </Button>
          <Button
            variant={statusFilter === 'in-progress' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('in-progress')}
            className="text-xs font-semibold whitespace-nowrap touch-manipulation"
          >
            {t('inProgress')} ({(orders || []).filter(o => o.status === 'in-progress').length})
          </Button>
          <Button
            variant={statusFilter === 'ready' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('ready')}
            className="text-xs font-semibold whitespace-nowrap touch-manipulation"
          >
            {t('ready')} ({(orders || []).filter(o => o.status === 'ready').length})
          </Button>
          <Button
            variant={statusFilter === 'delivered' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('delivered')}
            className="text-xs font-semibold whitespace-nowrap touch-manipulation"
          >
            {t('delivered')} ({(orders || []).filter(o => o.status === 'delivered').length})
          </Button>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center">
          <Scissors size={64} className="mx-auto text-muted-foreground mb-4" weight="duotone" />
          <p className="text-base text-muted-foreground mb-4 font-medium">
            {search ? t('noOrders') : t('noOrders')}
          </p>
          {!search && (
            <Button onClick={() => setShowForm(true)} className="h-10 touch-manipulation text-xs sm:text-sm">
              <Plus size={18} className="mr-1.5" weight="bold" />
              {t('newOrder')}
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {filteredOrders.map((order) => {
            const isExpanded = expandedOrders.has(order.id);
            return (
              <Card
                key={order.id}
                className={`p-4 sm:p-4 hover:shadow-lg transition-all duration-200 ${
                  isOverdue(order) ? 'border-destructive border-2' : ''
                }`}
              >
                <div className="flex flex-col gap-3 sm:gap-4">
                  <div className="flex-1 space-y-2 sm:space-y-2 min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-sm text-foreground break-words leading-tight flex-1 line-clamp-1">
                            {order.customerName}
                          </h3>
                          {isOverdue(order) && (
                            <Warning size={18} className="text-destructive flex-shrink-0" weight="fill" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-medium break-words">
                          {t('orderId')}: {order.id.slice(0, 10)}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <a 
                            href={`tel:${order.customerPhone}`}
                            className="text-xs text-muted-foreground hover:text-primary hover:underline transition-colors font-medium break-all"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {order.customerPhone}
                          </a>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <a 
                              href={`tel:${order.customerPhone}`}
                              className="text-primary hover:text-primary/80 transition-colors p-1 touch-manipulation"
                              onClick={(e) => e.stopPropagation()}
                              title={t('call')}
                            >
                              <Phone size={14} weight="fill" />
                            </a>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                sendWhatsAppMessage(order.customerPhone, getOrderStatusMessage(order));
                              }}
                              className="text-green-600 hover:text-green-700 transition-colors p-1 touch-manipulation"
                              title={t('whatsapp')}
                            >
                              <WhatsappLogo size={14} weight="fill" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge variant="outline" className="text-[10px] font-semibold line-clamp-1">
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
                        className="text-[10px] font-semibold"
                      >
                        {isOverdue(order)
                          ? t('overdue')
                          : isToday(order.deliveryDate)
                          ? t('dueToday')
                          : format(order.deliveryDate, 'MMM dd, yyyy')}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={order.status}
                      onValueChange={(value) => {
                        onUpdateStatus(order.id, value as OrderStatus);
                      }}
                    >
                      <SelectTrigger
                        className="w-full sm:flex-1 h-10 font-semibold touch-manipulation"
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

                    {(order.fabricPhotos?.length || order.designPhotos?.length) ? (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 flex-shrink-0 touch-manipulation"
                        onClick={(e) => toggleExpanded(order.id, e)}
                      >
                        {isExpanded ? (
                          <CaretUp size={20} weight="bold" />
                        ) : (
                          <CaretDown size={20} weight="bold" />
                        )}
                      </Button>
                    ) : null}
                  </div>
                </div>

                {isExpanded && (order.fabricPhotos?.length || order.designPhotos?.length) && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    {order.fabricPhotos && order.fabricPhotos.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-foreground">
                          {t('fabricPhotos')} ({order.fabricPhotos.length})
                        </p>
                        <PhotoGallery photos={order.fabricPhotos} minimized={true} />
                      </div>
                    )}
                    {order.designPhotos && order.designPhotos.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-foreground">
                          {t('designPhotos')} ({order.designPhotos.length})
                        </p>
                        <PhotoGallery photos={order.designPhotos} minimized={true} />
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <OrderForm
        open={showForm}
        onOpenChange={setShowForm}
        onSave={onAddOrder}
        customers={customers}
        tailors={tailors}
        inventory={inventory}
      />
    </div>
  );
}

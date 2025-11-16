import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { Order } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, MagnifyingGlass, Phone, WhatsappLogo, ClockCounterClockwise, TrendUp, CheckCircle } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { PhotoGallery } from './PhotoGallery';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { sendWhatsAppMessage } from '@/lib/utils';

interface OrderTrackingProps {
  orders: Order[];
  initialFilter?: 'all' | 'active' | 'ready' | 'completed';
}

export function OrderTracking({ orders, initialFilter = 'all' }: OrderTrackingProps) {
  const { t } = useLanguage();
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in-progress' | 'ready' | 'delivered'>('all');
  const [tailorFilter, setTailorFilter] = useState<string>('all');

  // Get unique tailors from orders
  const uniqueTailors = Array.from(new Set((orders || []).map(order => order.assignedTailor))).sort();

  // Apply filters automatically whenever filters or search change
  const filteredOrders = (orders || []).filter(order => {
    // Search filter (phone or order ID)
    const matchesSearch = !searchValue.trim() || 
      order.customerPhone.includes(searchValue.trim()) ||
      order.id.toLowerCase().includes(searchValue.toLowerCase().trim()) ||
      order.customerName.toLowerCase().includes(searchValue.toLowerCase().trim());

    // Status filter
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    // Tailor filter
    const matchesTailor = tailorFilter === 'all' || order.assignedTailor === tailorFilter;

    return matchesSearch && matchesStatus && matchesTailor;
  });

  useEffect(() => {
    if (initialFilter !== 'all') {
      switch (initialFilter) {
        case 'active':
          setStatusFilter('in-progress');
          break;
        case 'ready':
          setStatusFilter('ready');
          break;
        case 'completed':
          setStatusFilter('delivered');
          break;
      }
    }
  }, [initialFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'delivered':
        return 'bg-slate-100 text-slate-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusStep = (status: string) => {
    switch (status) {
      case 'pending':
        return 0;
      case 'in-progress':
        return 1;
      case 'ready':
        return 2;
      case 'delivered':
        return 3;
      default:
        return 0;
    }
  };

  const getOrderStatusMessage = (order: Order) => {
    const deliveryDateStr = order?.deliveryDate ? format(order.deliveryDate, 'MMM dd, yyyy') : 'TBD';
    const statusMessages = {
      pending: `Your order ${order.id.slice(0, 8)} is pending. Expected delivery: ${deliveryDateStr}`,
      'in-progress': `Your order ${order.id.slice(0, 8)} is being stitched by ${order.assignedTailor}. Expected delivery: ${deliveryDateStr}`,
      ready: `Good news! Your order ${order.id.slice(0, 8)} is ready for pickup. Please collect at your earliest convenience.`,
      delivered: `Thank you! Your order ${order.id.slice(0, 8)} has been delivered. We hope you love it!`,
    };
    return statusMessages[order.status];
  };

  const stats = useMemo(() => {
    const pending = (orders || []).filter(o => o.status === 'pending').length;
    const inProgress = (orders || []).filter(o => o.status === 'in-progress').length;
    const ready = (orders || []).filter(o => o.status === 'ready').length;
    const delivered = (orders || []).filter(o => o.status === 'delivered').length;

    return [
      {
        label: t('pending'),
        value: pending,
        icon: ClockCounterClockwise,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
      },
      {
        label: t('inProgress'),
        value: inProgress,
        icon: TrendUp,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
      },
      {
        label: t('ready'),
        value: ready,
        icon: Package,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
      },
      {
        label: t('delivered'),
        value: delivered,
        icon: CheckCircle,
        color: 'text-slate-600',
        bgColor: 'bg-slate-50',
      },
    ];
  }, [orders, t]);

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-3xl font-bold mb-2 line-clamp-2">{t('trackYourOrder')}</h1>
        <p className="text-xs sm:text-base text-muted-foreground line-clamp-2">{t('enterPhoneOrOrderId')}</p>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="p-3 sm:p-6">
            <div className="flex flex-col items-center justify-center text-center gap-2 sm:gap-3">
              <div className={`${stat.bgColor} ${stat.color} p-2 sm:p-3 rounded-lg flex-shrink-0`}>
                <stat.icon size={20} className="sm:size-7" weight="duotone" />
              </div>
              <div className="w-full min-w-0">
                <p className="text-3xl sm:text-5xl font-bold text-foreground mb-1">
                  {stat.value}
                </p>
                <p className="text-[9px] sm:text-xs font-medium text-muted-foreground line-clamp-2 leading-tight px-1">
                  {stat.label}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4 sm:p-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Input
              placeholder={t('enterPhoneOrOrderId')}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="h-10 sm:h-11"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">{t('filterByStatus')}:</span>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allStatuses')}</SelectItem>
                  <SelectItem value="pending">{t('pending')}</SelectItem>
                  <SelectItem value="in-progress">{t('inProgress')}</SelectItem>
                  <SelectItem value="ready">{t('ready')}</SelectItem>
                  <SelectItem value="delivered">{t('delivered')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">{t('filterByTailor')}:</span>
              <Select value={tailorFilter} onValueChange={setTailorFilter}>
                <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allTailors')}</SelectItem>
                  {uniqueTailors.map((tailor) => (
                    <SelectItem key={tailor} value={tailor}>
                      {tailor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
            <Card className="p-8 sm:p-12 text-center">
              <Package size={48} className="sm:size-16 mx-auto text-muted-foreground mb-3 sm:mb-4" />
              <p className="text-base sm:text-lg font-medium mb-2">{t('noOrdersFound')}</p>
              <p className="text-sm sm:text-base text-muted-foreground">{t('checkDetails')}</p>
            </Card>
          ) : (
            filteredOrders.map((order) => (
              <Card key={order.id} className="p-4 sm:p-6">
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-base sm:text-xl font-semibold mb-1 break-words line-clamp-2">
                        {order.customerName}
                      </h2>
                      <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                        <p className="text-xs sm:text-sm text-muted-foreground break-all">
                          {order.customerPhone}
                        </p>
                        <a 
                          href={`tel:${order.customerPhone}`}
                          className="text-primary hover:text-primary/80 transition-colors flex-shrink-0"
                        >
                          <Phone size={14} className="sm:size-4" weight="fill" />
                        </a>
                        <button
                          onClick={() => {
                            sendWhatsAppMessage(order.customerPhone, getOrderStatusMessage(order));
                          }}
                          className="text-green-600 hover:text-green-700 transition-colors flex-shrink-0"
                        >
                          <WhatsappLogo size={14} className="sm:size-4" weight="fill" />
                        </button>
                      </div>
                    </div>
                    <div className="text-right space-y-1 flex-shrink-0">
                      <div className="flex justify-end">
                        <Badge className={`${getStatusColor(order.status)} text-xs`}>
                          {t(order.status === 'in-progress' ? 'inProgress' : order.status)}
                        </Badge>
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                        {t('tailor')}: {order.assignedTailor}
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                        {t('deliveryDate')}: {order?.deliveryDate ? format(order.deliveryDate, 'MMM dd, yyyy') : 'TBD'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 sm:space-y-6">
                    <div className="relative">
                      <div className="flex justify-between mb-2">
                        {[
                          { key: 'pending', label: t('pending') },
                          { key: 'in-progress', label: t('inProgress') },
                          { key: 'ready', label: t('ready') },
                          { key: 'delivered', label: t('delivered') },
                        ].map((step, index) => (
                          <div
                            key={step.key}
                            className="flex flex-col items-center gap-1 sm:gap-2 z-10 flex-1"
                          >
                            <div
                              className={`w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold text-xs sm:text-base ${
                                getStatusStep(order.status) >= index
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {index + 1}
                            </div>
                            <p
                              className={`text-[8px] sm:text-xs text-center leading-tight line-clamp-2 w-full ${
                                getStatusStep(order.status) >= index
                                  ? 'text-foreground font-medium'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {step.label}
                            </p>
                          </div>
                      ))}
                    </div>
                    </div>

                    {(order.fabricPhotos?.length || order.designPhotos?.length) && (
                      <div className="pt-3 sm:pt-4 border-t">
                        <Accordion type="multiple" className="w-full">
                          {order.fabricPhotos && order.fabricPhotos.length > 0 && (
                            <AccordionItem value={`fabric-${order.id}`}>
                              <AccordionTrigger className="text-[10px] sm:text-sm font-medium">
                                {t('fabricPhotos')} ({order.fabricPhotos.length})
                              </AccordionTrigger>
                              <AccordionContent className="pt-2">
                                <PhotoGallery photos={order.fabricPhotos} />
                              </AccordionContent>
                            </AccordionItem>
                          )}
                          {order.designPhotos && order.designPhotos.length > 0 && (
                            <AccordionItem value={`design-${order.id}`}>
                              <AccordionTrigger className="text-[10px] sm:text-sm font-medium">
                                {t('designPhotos')} ({order.designPhotos.length})
                              </AccordionTrigger>
                              <AccordionContent className="pt-2">
                                <PhotoGallery photos={order.designPhotos} />
                              </AccordionContent>
                            </AccordionItem>
                          )}
                        </Accordion>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
      </div>
    </div>
  );
}

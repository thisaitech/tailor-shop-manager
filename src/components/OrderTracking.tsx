import { useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { Order } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, MagnifyingGlass, Phone, WhatsappLogo } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { sendWhatsAppMessage } from '@/lib/utils';

interface OrderTrackingProps {
  orders: Order[];
}

export function OrderTracking({ orders }: OrderTrackingProps) {
  const { t } = useLanguage();
  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState<Order[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = () => {
    if (!searchValue.trim()) return;

    const results = orders.filter(
      (order) =>
        order.customerPhone.includes(searchValue.trim()) ||
        order.id.toLowerCase().includes(searchValue.toLowerCase().trim())
    );

    setSearchResults(results);
    setHasSearched(true);
  };

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
    const statusMessages = {
      pending: `Your order ${order.id.slice(0, 8)} is pending. Expected delivery: ${format(order.deliveryDate, 'MMM dd, yyyy')}`,
      'in-progress': `Your order ${order.id.slice(0, 8)} is being stitched by ${order.assignedTailor}. Expected delivery: ${format(order.deliveryDate, 'MMM dd, yyyy')}`,
      ready: `Good news! Your order ${order.id.slice(0, 8)} is ready for pickup. Please collect at your earliest convenience.`,
      delivered: `Thank you! Your order ${order.id.slice(0, 8)} has been delivered. We hope you love it!`,
    };
    return statusMessages[order.status];
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">{t('trackYourOrder')}</h1>
        <p className="text-sm sm:text-base text-muted-foreground">{t('enterPhoneOrOrderId')}</p>
      </div>

      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Input
            placeholder={t('enterPhoneOrOrderId')}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="h-10 sm:h-11"
          />
          <Button onClick={handleSearch} className="h-10 sm:h-11 w-full sm:w-auto">
            <MagnifyingGlass size={18} className="mr-1.5" />
            {t('track')}
          </Button>
        </div>
      </Card>

      {hasSearched && (
          {searchResults.length === 0 ? (
          {searchResults.length === 0 ? (
              <Package size={48} className="sm:size-16 mx-auto text-muted-foreground mb-3 sm:mb-4" />
              <p className="text-base sm:text-lg font-medium mb-2">{t('noOrdersFound')}</p>
              <p className="text-sm sm:text-base text-muted-foreground">{t('checkDetails')}</p>
            </Card>
            </Card>
            searchResults.map((order) => (
              <Card key={order.id} className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0">
                    <div className="flex-1">
                      <h2 className="text-lg sm:text-xl font-semibold mb-1">
                        {order.customerName}
                      </h2>
                        {order.customerName}
                        {t('orderId')}: {order.id.slice(0, 8)}
                      <div className="flex items-center gap-1.5 sm:gap-2 mt-1">
                        {t('orderId')}: {order.id.slice(0, 8)}
                          href={`tel:${order.customerPhone}`}
                        >
                        <a 
                        </a>
                          <a 
                        >
                            className="text-primary hover:text-primary/80 transition-colors"
                        </a>
                          >
                            <Phone size={14} className="sm:size-4" weight="fill" />
                          </a>
                          <button
                            onClick={() => {
                              sendWhatsAppMessage(order.customerPhone, getOrderStatusMessage(order));
                            className="text-green-600 hover:text-green-700 transition-colors"
                          </a>
                          >
                            <WhatsappLogo size={14} className="sm:size-4" weight="fill" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <Badge className={`${getStatusColor(order.status)} flex-shrink-0`}>
                    </Badge>
                          </button>

                  <div className="relative px-2 sm:px-0">
                    <div className="flex justify-between mb-2">
                        { key: 'pending', label: t('pending') },
                      {t(order.status === 'in-progress' ? 'inProgress' : order.status)}
                        { key: 'ready', label: t('ready') },
                        { key: 'delivered', label: t('delivered') },
                      ].map((step, index) => (
                          key={step.key}
                    <div className="flex justify-between mb-2">
                        >
                          <div
                            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold text-sm sm:text-base ${
                              getStatusStep(order.status) >= index
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {index + 1}
                          </div>
                          <p
                              getStatusStep(order.status) >= index
                              getStatusStep(order.status) >= index
                                : 'text-muted-foreground'
                            }`}
                          >
                            {step.label}
                          </p>
                        </div>
                      ))}
                    <div className="absolute top-4 sm:top-5 left-0 right-0 h-0.5 bg-muted -z-10 mx-4 sm:mx-5">
                              getStatusStep(order.status) >= index
                        className="h-full bg-primary transition-all duration-500"
                        style={{
                          width: `${(getStatusStep(order.status) / 3) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-3 sm:pt-4 border-t">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                      <div
                      </p>
                      <p className="font-medium text-sm sm:text-base">{order.assignedTailor}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                        {t('deliveryDate')}
                      </p>
                      <p className="font-medium text-sm sm:text-base">
                      </p>
                    <div>
                    {order.fabricDetails && (
                        {t('tailor')}
                        <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                        </p>
                    </div>
                      </div>
                    {order.designNotes && (
                        {t('deliveryDate')}
                        <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                          {t('designNotes')}
                        </p>
                        <p className="font-medium text-sm sm:text-base">{order.designNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}

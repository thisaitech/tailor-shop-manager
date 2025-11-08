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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('trackYourOrder')}</h1>
        <p className="text-muted-foreground">{t('enterPhoneOrOrderId')}</p>
      </div>

      <Card className="p-6">
        <div className="flex gap-3">
          <Input
            placeholder={t('enterPhoneOrOrderId')}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch}>
            <MagnifyingGlass size={20} className="mr-2" />
            {t('track')}
          </Button>
        </div>
      </Card>

      {hasSearched && (
        <div className="space-y-4">
          {searchResults.length === 0 ? (
            <Card className="p-12 text-center">
              <Package size={64} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">{t('noOrdersFound')}</p>
              <p className="text-muted-foreground">{t('checkDetails')}</p>
            </Card>
          ) : (
            searchResults.map((order) => (
              <Card key={order.id} className="p-6">
                <div className="space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-semibold mb-1">
                        {order.customerName}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {t('orderId')}: {order.id.slice(0, 8)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <a 
                          href={`tel:${order.customerPhone}`}
                          className="text-sm text-muted-foreground hover:text-primary hover:underline transition-colors"
                        >
                          {t('phone')}: {order.customerPhone}
                        </a>
                        <div className="flex items-center gap-1">
                          <a 
                            href={`tel:${order.customerPhone}`}
                            className="text-primary hover:text-primary/80 transition-colors"
                            title={t('call')}
                          >
                            <Phone size={16} weight="fill" />
                          </a>
                          <button
                            onClick={() => {
                              sendWhatsAppMessage(order.customerPhone, getOrderStatusMessage(order));
                            }}
                            className="text-green-600 hover:text-green-700 transition-colors"
                            title={t('whatsapp')}
                          >
                            <WhatsappLogo size={16} weight="fill" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <Badge className={getStatusColor(order.status)}>
                      {t(order.status === 'in-progress' ? 'inProgress' : order.status)}
                    </Badge>
                  </div>

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
                          className="flex flex-col items-center flex-1"
                        >
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                              getStatusStep(order.status) >= index
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {index + 1}
                          </div>
                          <p
                            className={`mt-2 text-xs text-center ${
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
                    <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted -z-10">
                      <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{
                          width: `${(getStatusStep(order.status) / 3) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {t('tailor')}
                      </p>
                      <p className="font-medium">{order.assignedTailor}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {t('deliveryDate')}
                      </p>
                      <p className="font-medium">
                        {format(order.deliveryDate, 'MMM dd, yyyy')}
                      </p>
                    </div>
                    {order.fabricDetails && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {t('fabricDetails')}
                        </p>
                        <p className="font-medium">{order.fabricDetails}</p>
                      </div>
                    )}
                    {order.designNotes && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {t('designNotes')}
                        </p>
                        <p className="font-medium">{order.designNotes}</p>
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

import { useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { Order, Customer, Measurements } from '@/lib/types';
import { useKV } from '@github/spark/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Package, Ruler } from '@phosphor-icons/react';

export function CustomerDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [orders] = useKV<Order[]>('orders', []);
  const [customers] = useKV<Customer[]>('customers', []);

  const customerData = useMemo(() => {
    return (customers || []).find(c => c.id === user?.customerId);
  }, [customers, user?.customerId]);

  const myOrders = useMemo(() => {
    return (orders || []).filter(order => order.customerId === user?.customerId);
  }, [orders, user?.customerId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-500';
      case 'in-progress': return 'bg-blue-500';
      case 'ready': return 'bg-green-500';
      case 'delivered': return 'bg-slate-500';
      default: return 'bg-gray-500';
    }
  };

  const renderMeasurements = (garment: string, data: any) => {
    if (!data) return null;
    
    return (
      <div className="space-y-2">
        <h4 className="font-medium text-sm capitalize">{t(garment as any)}</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="text-muted-foreground capitalize">{t(key as any)}:</span>
              <span className="font-medium">{value as number}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">My Account</h2>
        <p className="text-muted-foreground">Welcome, {customerData?.name || user?.name}</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="measurements">Measurements</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-3 rounded-full">
                  <User size={32} className="text-primary" weight="duotone" />
                </div>
                <div>
                  <CardTitle>{customerData?.name || user?.name}</CardTitle>
                  <CardDescription>{t('customerDetails')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('phone')}</p>
                  <p className="font-medium">{customerData?.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('place')}</p>
                  <p className="font-medium">{customerData?.place || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('gender')}</p>
                  <p className="font-medium capitalize">{customerData?.gender ? t(customerData.gender) : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Customer ID</p>
                  <p className="font-medium">{customerData?.id || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="measurements" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-accent/10 p-3 rounded-full">
                  <Ruler size={32} className="text-accent" weight="duotone" />
                </div>
                <div>
                  <CardTitle>{t('measurements')}</CardTitle>
                  <CardDescription>Your saved measurements</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {!customerData?.measurements || Object.keys(customerData.measurements).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No measurements available</p>
              ) : (
                <>
                  {customerData.measurements.pant && renderMeasurements('pant', customerData.measurements.pant)}
                  {customerData.measurements.shirt && renderMeasurements('shirt', customerData.measurements.shirt)}
                  {customerData.measurements.coat && renderMeasurements('coat', customerData.measurements.coat)}
                  {customerData.measurements.blazer && renderMeasurements('blazer', customerData.measurements.blazer)}
                  {customerData.measurements.jocket && renderMeasurements('jocket', customerData.measurements.jocket)}
                  {customerData.measurements.sudhar && renderMeasurements('sudhar', customerData.measurements.sudhar)}
                  {customerData.measurements.kurta && renderMeasurements('kurta', customerData.measurements.kurta)}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-green-500/10 p-3 rounded-full">
                  <Package size={32} className="text-green-500" weight="duotone" />
                </div>
                <div>
                  <CardTitle>{t('orders')}</CardTitle>
                  <CardDescription>Track your orders</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {myOrders.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{t('noOrders')}</p>
              ) : (
                <div className="space-y-4">
                  {myOrders.map((order) => (
                    <Card key={order.id}>
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{order.id}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge className={getStatusColor(order.status)}>
                              {t(order.status)}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">{t('tailor')}</p>
                              <p className="font-medium">{order.assignedTailor}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">{t('deliveryDate')}</p>
                              <p className="font-medium">
                                {new Date(order.deliveryDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          
                          {order.fabricDetails && (
                            <div>
                              <p className="text-muted-foreground text-sm">{t('fabricDetails')}</p>
                              <p className="text-sm">{order.fabricDetails}</p>
                            </div>
                          )}
                          
                          {order.designNotes && (
                            <div>
                              <p className="text-muted-foreground text-sm">{t('designNotes')}</p>
                              <p className="text-sm">{order.designNotes}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}

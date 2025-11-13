import { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { Order, Customer, Measurements, Tailor } from '@/lib/types';
import { useKV } from '@github/spark/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Package, Ruler, UserCircle, WhatsappLogo, Share } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { sendWhatsAppMessage } from '@/lib/utils';

export function CustomerDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [orders] = useKV<Order[]>('orders', []);
  const [customers] = useKV<Customer[]>('customers', []);
  const [tailors] = useKV<Tailor[]>('tailors', []);

  const customerData = useMemo(() => {
    return (customers || []).find(c => c.id === user?.customerId);
  }, [customers, user?.customerId]);

  const myOrders = useMemo(() => {
    return (orders || []).filter(order => order.customerId === user?.customerId);
  }, [orders, user?.customerId]);

  const myTailors = useMemo(() => {
    const tailorIds = new Set(myOrders.map(order => order.assignedTailor));
    return (tailors || []).filter(tailor => 
      myOrders.some(order => order.assignedTailor === tailor.name)
    );
  }, [myOrders, tailors]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-500';
      case 'in-progress': return 'bg-blue-500';
      case 'ready': return 'bg-green-500';
      case 'delivered': return 'bg-slate-500';
      default: return 'bg-gray-500';
    }
  };

  const handleShareProfile = () => {
    if (!customerData) return;
    
    const profileData = `
*Customer Profile*
Name: ${customerData.name}
Phone: ${customerData.phone}
Place: ${customerData.place}
Gender: ${customerData.gender}

*Measurements:*
${Object.entries(customerData.measurements || {}).map(([garment, measurements]) => 
  `\n${garment.toUpperCase()}:\n${Object.entries(measurements || {}).map(([key, value]) => 
    `  ${key}: ${value}`
  ).join('\n')}`
).join('\n')}
    `.trim();
    
    navigator.clipboard.writeText(profileData);
    toast.success('Profile copied to clipboard! You can now share it.');
  };

  const handleShareProfileWhatsApp = (tailorPhone?: string) => {
    if (!customerData) return;
    
    const profileData = `Hello! Here are my measurements for your reference:\n\nName: ${customerData.name}\nPhone: ${customerData.phone}\n\nMeasurements:\n${Object.entries(customerData.measurements || {}).map(([garment, measurements]) => 
      `${garment.toUpperCase()}:\n${Object.entries(measurements || {}).map(([key, value]) => 
        `  ${key}: ${value}`
      ).join('\n')}`
    ).join('\n\n')}`;
    
    if (tailorPhone) {
      sendWhatsAppMessage(tailorPhone, profileData);
    } else {
      navigator.clipboard.writeText(profileData);
      toast.success('Measurements copied! Open WhatsApp to share.');
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="measurements">Measurements</TabsTrigger>
          <TabsTrigger value="tailors">Tailors</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <User size={32} className="text-primary" weight="duotone" />
                  </div>
                  <div>
                    <CardTitle>{customerData?.name || user?.name}</CardTitle>
                    <CardDescription>{t('customerDetails')}</CardDescription>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleShareProfile}>
                  <Share size={16} className="mr-2" />
                  Share Profile
                </Button>
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-accent/10 p-3 rounded-full">
                    <Ruler size={32} className="text-accent" weight="duotone" />
                  </div>
                  <div>
                    <CardTitle>{t('measurements')}</CardTitle>
                    <CardDescription>Your saved measurements</CardDescription>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleShareProfileWhatsApp()}
                >
                  <WhatsappLogo size={16} className="mr-2" weight="fill" />
                  Share via WhatsApp
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {!customerData?.measurements || Object.keys(customerData.measurements || {}).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No measurements available</p>
              ) : (
                <>
                  {customerData.measurements?.pant && renderMeasurements('pant', customerData.measurements.pant)}
                  {customerData.measurements?.shirt && renderMeasurements('shirt', customerData.measurements.shirt)}
                  {customerData.measurements?.coat && renderMeasurements('coat', customerData.measurements.coat)}
                  {customerData.measurements?.blazer && renderMeasurements('blazer', customerData.measurements.blazer)}
                  {customerData.measurements?.jocket && renderMeasurements('jocket', customerData.measurements.jocket)}
                  {customerData.measurements?.sudhar && renderMeasurements('sudhar', customerData.measurements.sudhar)}
                  {customerData.measurements?.kurta && renderMeasurements('kurta', customerData.measurements.kurta)}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tailors" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-purple-500/10 p-3 rounded-full">
                  <UserCircle size={32} className="text-purple-500" weight="duotone" />
                </div>
                <div>
                  <CardTitle>My Tailors</CardTitle>
                  <CardDescription>Tailors working on your orders</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {myTailors.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No tailors assigned yet</p>
              ) : (
                <div className="space-y-4">
                  {myTailors.map((tailor) => (
                    <Card key={tailor.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg">{tailor.name}</h4>
                            <p className="text-sm text-muted-foreground mb-3">{tailor.phone}</p>
                            <div className="flex flex-wrap gap-1">
                              {tailor.specialization.map((spec, idx) => (
                                <Badge key={idx} variant="secondary">{spec}</Badge>
                              ))}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleShareProfileWhatsApp(tailor.phone)}
                          >
                            <WhatsappLogo size={16} weight="fill" className="mr-2 text-green-600" />
                            Share
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
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

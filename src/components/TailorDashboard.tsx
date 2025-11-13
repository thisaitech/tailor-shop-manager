import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { Order, OrderStatus, Measurements } from '@/lib/types';
import { useStorage } from '@/hooks/use-storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClockCounterClockwise, CheckCircle, Package, TrendUp } from '@phosphor-icons/react';
import { toast } from 'sonner';

export function TailorDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [orders, setOrders] = useStorage<Order[]>('orders', []);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editedMeasurements, setEditedMeasurements] = useState<Measurements>({});

  const myOrders = useMemo(() => {
    return (orders || []).filter(order => order.assignedTailor === user?.name);
  }, [orders, user?.name]);

  const stats = useMemo(() => {
    const pending = myOrders.filter(o => o.status === 'pending').length;
    const inProgress = myOrders.filter(o => o.status === 'in-progress').length;
    const ready = myOrders.filter(o => o.status === 'ready').length;
    const delivered = myOrders.filter(o => o.status === 'delivered').length;
    
    return { pending, inProgress, ready, delivered };
  }, [myOrders]);

  const handleUpdateStatus = (orderId: string, status: OrderStatus) => {
    setOrders((orders || []).map((order) =>
        order.id === orderId
          ? { ...order, status, updatedAt: Date.now() }
          : order
      )
    );
    toast.success('Order status updated');
  };

  const handleUpdateMeasurements = (orderId: string) => {
    setOrders((orders || []).map((order) =>
        order.id === orderId
          ? { ...order, measurements: editedMeasurements, updatedAt: Date.now() }
          : order
      )
    );
    toast.success('Measurements updated successfully');
    setSelectedOrder(null);
    setEditedMeasurements({});
  };

  const openMeasurementDialog = (order: Order) => {
    setSelectedOrder(order);
    setEditedMeasurements(order.measurements || {});
  };

  const updateMeasurementField = (garment: string, field: string, value: string) => {
    setEditedMeasurements(prev => ({
      ...prev,
      [garment]: {
        ...(prev[garment as keyof Measurements] || {}),
        [field]: value ? parseFloat(value) : undefined,
      }
    }));
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'bg-gray-500';
      case 'in-progress': return 'bg-blue-500';
      case 'ready': return 'bg-green-500';
      case 'delivered': return 'bg-slate-500';
      default: return 'bg-gray-500';
    }
  };

  const renderMeasurementInputs = (garment: string, fields: string[]) => {
    const garmentData = editedMeasurements[garment as keyof Measurements] as any || {};
    
    return (
      <div className="space-y-3">
        <h4 className="font-medium text-sm capitalize">{t(garment as any)}</h4>
        <div className="grid grid-cols-2 gap-3">
          {fields.map(field => (
            <div key={field} className="space-y-1">
              <Label htmlFor={`${garment}-${field}`} className="text-xs">{t(field as any)}</Label>
              <Input
                id={`${garment}-${field}`}
                type="number"
                step="0.1"
                value={garmentData[field] || ''}
                onChange={(e) => updateMeasurementField(garment, field, e.target.value)}
                placeholder="0.0"
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">My Dashboard</h2>
        <p className="text-muted-foreground">Welcome back, {user?.name}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">Pending</CardDescription>
            <CardTitle className="text-3xl">{stats.pending}</CardTitle>
          </CardHeader>
          <CardContent>
            <ClockCounterClockwise size={24} className="text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">In Progress</CardDescription>
            <CardTitle className="text-3xl">{stats.inProgress}</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendUp size={24} className="text-blue-500" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">Ready</CardDescription>
            <CardTitle className="text-3xl">{stats.ready}</CardTitle>
          </CardHeader>
          <CardContent>
            <Package size={24} className="text-green-500" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">Delivered</CardDescription>
            <CardTitle className="text-3xl">{stats.delivered}</CardTitle>
          </CardHeader>
          <CardContent>
            <CheckCircle size={24} className="text-slate-500" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Orders</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {myOrders.filter(o => o.status !== 'delivered').length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No active orders</p>
              </CardContent>
            </Card>
          ) : (
            myOrders.filter(o => o.status !== 'delivered').map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{order.customerName}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <span>{order.id}</span>
                        <Badge className={getStatusColor(order.status)}>{t(order.status)}</Badge>
                      </CardDescription>
                    </div>
                    <Select
                      value={order.status}
                      onValueChange={(value) => handleUpdateStatus(order.id, value as OrderStatus)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">{t('pending')}</SelectItem>
                        <SelectItem value="in-progress">{t('inProgress')}</SelectItem>
                        <SelectItem value="ready">{t('ready')}</SelectItem>
                        <SelectItem value="delivered">{t('delivered')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">{t('gender')}</p>
                      <p className="font-medium capitalize">{order.measurements ? 'Available' : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('deliveryDate')}</p>
                      <p className="font-medium">{order?.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'TBD'}</p>
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
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full" onClick={() => openMeasurementDialog(order)}>
                        View & Edit Measurements
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Edit Measurements - {order.customerName}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-6 py-4">
                        {editedMeasurements.pant && renderMeasurementInputs('pant', ['length', 'waist', 'hip', 'thigh', 'bottom'])}
                        {editedMeasurements.shirt && renderMeasurementInputs('shirt', ['length', 'shoulder', 'chest', 'waist', 'sleeve', 'neck'])}
                        {editedMeasurements.coat && renderMeasurementInputs('coat', ['length', 'shoulder', 'chest', 'waist', 'sleeve'])}
                        {editedMeasurements.blazer && renderMeasurementInputs('blazer', ['length', 'shoulder', 'chest', 'waist', 'sleeve'])}
                        {editedMeasurements.jocket && renderMeasurementInputs('jocket', ['length', 'shoulder', 'chest', 'sleeve'])}
                        {editedMeasurements.sudhar && renderMeasurementInputs('sudhar', ['length', 'shoulder', 'chest', 'waist', 'hip', 'sleeve'])}
                        {editedMeasurements.kurta && renderMeasurementInputs('kurta', ['length', 'shoulder', 'chest', 'sleeve'])}
                        
                        <Button className="w-full" onClick={() => handleUpdateMeasurements(order.id)}>
                          {t('save')} {t('measurements')}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {myOrders.filter(o => o.status === 'delivered').length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No completed orders</p>
              </CardContent>
            </Card>
          ) : (
            myOrders.filter(o => o.status === 'delivered').map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{order.customerName}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <span>{order.id}</span>
                        <Badge className="bg-slate-500">{t('delivered')}</Badge>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Delivered on {order?.updatedAt ? new Date(order.updatedAt).toLocaleDateString() : 'N/A'}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}

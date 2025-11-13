import { useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { Customer, Order, OrderStatus, Tailor, InventoryItem, InventoryTransaction } from '@/lib/types';
import { useKV } from '@github/spark/hooks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardStats } from '@/components/DashboardStats';
import { CustomerList } from '@/components/CustomerList';
import { OrderList } from '@/components/OrderList';
import { OrderTracking } from '@/components/OrderTracking';
import { InventoryStats } from '@/components/InventoryStats';
import { InventoryList } from '@/components/InventoryList';
import { TransactionHistory } from '@/components/TransactionHistory';
import { TailorManagement } from '@/components/TailorManagement';
import { toast } from 'sonner';

export function OwnerDashboard() {
  const { t } = useLanguage();
  const [customers, setCustomers] = useKV<Customer[]>('customers', []);
  const [orders, setOrders] = useKV<Order[]>('orders', []);
  const [inventory, setInventory] = useKV<InventoryItem[]>('inventory', []);
  const [transactions, setTransactions] = useKV<InventoryTransaction[]>('transactions', []);
  const [tailors] = useKV<Tailor[]>('tailors', []);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [orderFilter, setOrderFilter] = useState<'all' | 'active' | 'ready' | 'completed'>('all');

  const handleAddCustomer = (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newCustomer: Customer = {
      ...customerData,
      id: `CUS${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setCustomers((prev) => [...(prev || []), newCustomer]);
    toast.success('Customer added successfully');
  };

  const handleUpdateCustomer = (id: string, customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    setCustomers((prev) =>
      (prev || []).map((customer) =>
        customer.id === id
          ? { ...customerData, id, createdAt: customer.createdAt, updatedAt: Date.now() }
          : customer
      )
    );
    toast.success('Customer updated successfully');
  };

  const handleDeleteCustomer = (id: string) => {
    setCustomers((prev) => (prev || []).filter((customer) => customer.id !== id));
    toast.success('Customer deleted successfully');
  };

  const handleAddOrder = (orderData: {
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
  }) => {
    const newOrder: Order = {
      ...orderData,
      id: `ORD${Date.now()}`,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setOrders((prev) => [...(prev || []), newOrder]);

    if (orderData.materialsUsed && orderData.materialsUsed.length > 0) {
      orderData.materialsUsed.forEach((material: any) => {
        setInventory((prev) =>
          (prev || []).map((item) =>
            item.id === material.itemId
              ? { ...item, quantity: item.quantity - material.quantity, updatedAt: Date.now() }
              : item
          )
        );

        const transaction = {
          id: `TXN${Date.now()}_${material.itemId}`,
          itemId: material.itemId,
          itemName: material.itemName,
          type: 'out' as const,
          quantity: material.quantity,
          reason: `Used for order ${newOrder.id.slice(0, 10)}`,
          orderId: newOrder.id,
          tailorName: orderData.assignedTailor,
          createdAt: Date.now(),
        };

        setTransactions((prev) => [...(prev || []), transaction]);
      });
    }

    toast.success('Order created successfully');
  };

  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders((prev) =>
      (prev || []).map((order) =>
        order.id === orderId
          ? { ...order, status, updatedAt: Date.now() }
          : order
      )
    );
    toast.success('Order status updated');
  };

  const handleAddInventoryItem = (itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newItem: InventoryItem = {
      ...itemData,
      id: `INV${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setInventory((prev) => [...(prev || []), newItem]);
    toast.success('Inventory item added successfully');
  };

  const handleStockUpdate = (itemId: string, quantity: number, type: 'in' | 'out', reason: string) => {
    const item = (inventory || []).find(i => i.id === itemId);
    if (!item) return;

    const newQuantity = type === 'in' 
      ? item.quantity + quantity 
      : item.quantity - quantity;

    setInventory((prev) =>
      (prev || []).map((item) =>
        item.id === itemId
          ? { 
              ...item, 
              quantity: newQuantity,
              lastRestocked: type === 'in' ? Date.now() : item.lastRestocked,
              updatedAt: Date.now() 
            }
          : item
      )
    );

    const transaction: InventoryTransaction = {
      id: `TXN${Date.now()}`,
      itemId,
      itemName: item.name,
      type,
      quantity,
      reason,
      createdAt: Date.now(),
    };

    setTransactions((prev) => [...(prev || []), transaction]);
    toast.success(`Stock ${type === 'in' ? 'added' : 'removed'} successfully`);
  };

  const handleStatClick = (filter: 'all' | 'active' | 'ready' | 'completed') => {
    setOrderFilter(filter);
    setActiveTab('track');
  };

  return (
    <main className="container mx-auto px-4 py-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-muted/60 gap-1">
          <TabsTrigger 
            value="dashboard" 
            className="py-2.5 px-1.5 text-[10px] sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap leading-tight"
          >
            {t('dashboard')}
          </TabsTrigger>
          <TabsTrigger 
            value="tailors" 
            className="py-2.5 px-1.5 text-[10px] sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap leading-tight"
          >
            Tailors
          </TabsTrigger>
          <TabsTrigger 
            value="inventory" 
            className="py-2.5 px-1.5 text-[10px] sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap leading-tight"
          >
            {t('inventory')}
          </TabsTrigger>
          <TabsTrigger 
            value="track" 
            className="py-2.5 px-1.5 text-[10px] sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap leading-tight"
          >
            {t('track')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <DashboardStats
            totalCustomers={(customers || []).length}
            orders={orders || []}
            onStatClick={handleStatClick}
          />

          <div className="grid grid-cols-2 gap-3 md:gap-6">
            <div className="space-y-4">
              <h2 className="text-sm md:text-xl font-semibold line-clamp-1">{t('customers')}</h2>
              <CustomerList
                customers={customers || []}
                onAddCustomer={handleAddCustomer}
                onUpdateCustomer={handleUpdateCustomer}
                onDeleteCustomer={handleDeleteCustomer}
              />
            </div>
            <div className="space-y-4">
              <h2 className="text-sm md:text-xl font-semibold line-clamp-1">{t('orders')}</h2>
              <OrderList
                orders={orders || []}
                customers={customers || []}
                tailors={tailors || []}
                inventory={inventory || []}
                onAddOrder={handleAddOrder}
                onUpdateStatus={handleUpdateOrderStatus}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tailors">
          <TailorManagement />
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <InventoryStats items={inventory || []} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <InventoryList
                items={inventory || []}
                onAddItem={handleAddInventoryItem}
                onStockUpdate={handleStockUpdate}
              />
            </div>
            <div>
              <TransactionHistory transactions={transactions || []} limit={15} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="track">
          <OrderTracking orders={orders || []} initialFilter={orderFilter} />
        </TabsContent>
      </Tabs>
    </main>
  );
}

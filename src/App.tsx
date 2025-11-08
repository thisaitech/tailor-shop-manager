import { useState } from 'react';
import { useKV } from '@github/spark/hooks';
import { LanguageProvider, useLanguage } from '@/hooks/use-language';
import { Customer, Order, OrderStatus, Tailor, InventoryItem, InventoryTransaction } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Scissors } from '@phosphor-icons/react';
import { DashboardStats } from '@/components/DashboardStats';
import { CustomerList } from '@/components/CustomerList';
import { OrderList } from '@/components/OrderList';
import { OrderTracking } from '@/components/OrderTracking';
import { InventoryStats } from '@/components/InventoryStats';
import { InventoryList } from '@/components/InventoryList';
import { TransactionHistory } from '@/components/TransactionHistory';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

function AppContent() {
  const { t } = useLanguage();
  const [customers, setCustomers] = useKV<Customer[]>('customers', []);
  const [orders, setOrders] = useKV<Order[]>('orders', []);
  const [inventory, setInventory] = useKV<InventoryItem[]>('inventory', []);
  const [transactions, setTransactions] = useKV<InventoryTransaction[]>('transactions', []);
  const [tailors] = useKV<Tailor[]>('tailors', [
    { id: '1', name: 'Kumar' },
    { id: '2', name: 'Ravi' },
    { id: '3', name: 'Murugan' },
    { id: '4', name: 'Selvi' },
  ]);

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

  const handleAddOrder = (orderData: {
    customerId: string;
    customerName: string;
    customerPhone: string;
    measurements: any;
    fabricDetails: string;
    designNotes: string;
    assignedTailor: string;
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
    const item = inventory?.find(i => i.id === itemId);
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-2.5 rounded-lg">
                <Scissors size={28} className="text-primary-foreground" weight="duotone" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t('appName')}</h1>
                <p className="text-xs text-muted-foreground">Management System</p>
              </div>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="dashboard">{t('dashboard')}</TabsTrigger>
            <TabsTrigger value="orders">{t('orders')}</TabsTrigger>
            <TabsTrigger value="customers">{t('customers')}</TabsTrigger>
            <TabsTrigger value="inventory">{t('inventory')}</TabsTrigger>
            <TabsTrigger value="track">{t('track')}</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <DashboardStats
              totalCustomers={customers?.length || 0}
              orders={orders || []}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">{t('customers')}</h2>
                <CustomerList
                  customers={(customers || []).slice(0, 6)}
                  onAddCustomer={handleAddCustomer}
                />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-4">{t('orders')}</h2>
                <OrderList
                  orders={(orders || []).slice(0, 6)}
                  customers={customers || []}
                  tailors={tailors || []}
                  onAddOrder={handleAddOrder}
                  onUpdateStatus={handleUpdateOrderStatus}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <OrderList
              orders={orders || []}
              customers={customers || []}
              tailors={tailors || []}
              onAddOrder={handleAddOrder}
              onUpdateStatus={handleUpdateOrderStatus}
            />
          </TabsContent>

          <TabsContent value="customers">
            <CustomerList
              customers={customers || []}
              onAddCustomer={handleAddCustomer}
            />
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
            <OrderTracking orders={orders || []} />
          </TabsContent>
        </Tabs>
      </main>

      <Toaster />
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

export default App;
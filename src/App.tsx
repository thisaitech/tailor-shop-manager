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
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-primary p-2 sm:p-2.5 rounded-lg">
                <Scissors size={24} className="sm:size-7 text-primary-foreground" weight="duotone" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-foreground">{t('appName')}</h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Management System</p>
              </div>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <Tabs defaultValue="dashboard" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-muted/60">
            <TabsTrigger value="dashboard" className="text-xs sm:text-sm py-2 sm:py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <span className="hidden sm:inline">{t('dashboard')}</span>
              <span className="sm:hidden">Dash</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="text-xs sm:text-sm py-2 sm:py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <span className="hidden sm:inline">{t('orders')}</span>
              <span className="sm:hidden">Order</span>
            </TabsTrigger>
            <TabsTrigger value="customers" className="text-xs sm:text-sm py-2 sm:py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <span className="hidden sm:inline">{t('customers')}</span>
              <span className="sm:hidden">Cust</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="text-xs sm:text-sm py-2 sm:py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <span className="hidden sm:inline">{t('inventory')}</span>
              <span className="sm:hidden">Stock</span>
            </TabsTrigger>
            <TabsTrigger value="track" className="text-xs sm:text-sm py-2 sm:py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <span className="hidden sm:inline">{t('track')}</span>
              <span className="sm:hidden">Track</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4 sm:space-y-6">
            <DashboardStats
              totalCustomers={customers?.length || 0}
              orders={orders || []}
            />

            <div className="grid grid-cols-2 gap-3 sm:gap-6">
              <div>
                <h2 className="text-sm sm:text-xl font-semibold mb-2 sm:mb-4">{t('customers')}</h2>
                <CustomerList
                  customers={(customers || []).slice(0, 6)}
                  onAddCustomer={handleAddCustomer}
                  onUpdateCustomer={handleUpdateCustomer}
                  onDeleteCustomer={handleDeleteCustomer}
                />
              </div>
              <div>
                <h2 className="text-sm sm:text-xl font-semibold mb-2 sm:mb-4">{t('orders')}</h2>
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
              onUpdateCustomer={handleUpdateCustomer}
              onDeleteCustomer={handleDeleteCustomer}
            />
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4 sm:space-y-6">
            <InventoryStats items={inventory || []} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
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
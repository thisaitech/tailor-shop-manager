import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { Customer, Order, OrderStatus, Tailor, InventoryItem, InventoryTransaction, ServiceOrder, OrderAllotment, Employee, Vendor, AdvancePayment } from '@/lib/types';
import { useStorage } from '@/hooks/use-storage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { DashboardStats } from '@/components/DashboardStats';
import { CustomerList } from '@/components/CustomerList';
import { OrderList } from '@/components/OrderList';
import { OrderTracking } from '@/components/OrderTracking';
import { InventoryStats } from '@/components/InventoryStats';
import { InventoryList } from '@/components/InventoryList';
import { TransactionHistory } from '@/components/TransactionHistory';
import { TailorManagement } from '@/components/TailorManagement';
import { ServiceOrderForm } from '@/components/ServiceOrderForm';
import { CustomerForm } from '@/components/CustomerForm';
import { OrderAllotmentForm } from '@/components/OrderAllotmentForm';
import { RejectedOrdersList } from '@/components/RejectedOrdersList';
import { StitchedOrdersList } from '@/components/StitchedOrdersList';
import { toast } from 'sonner';
import {
  addCustomer,
  getCustomersByCompany,
  updateCustomer,
  deleteCustomer,
} from '@/lib/firestore/customerService';
import {
  addServiceOrder,
  getServiceOrdersByCompany,
} from '@/lib/firestore/serviceOrderService';
import {
  addOrderAllotment,
  getOrderAllotmentsByCompany,
} from '@/lib/firestore/orderAllotmentService';
import {
  getEmployeesByCompany,
} from '@/lib/firestore/employeeService';
import {
  getVendorsByCompany,
} from '@/lib/firestore/vendorService';
import {
  addAdvancePayment,
} from '@/lib/firestore/advancePaymentService';
import { getCompanyProfile } from '@/lib/firestore/companyService';

export function OwnerDashboard() {
  const { t } = useLanguage();
  const { user, employee } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [orderAllotments, setOrderAllotments] = useState<OrderAllotment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [orders, setOrders] = useStorage<Order[]>('orders', []);
  const [inventory, setInventory] = useStorage<InventoryItem[]>('inventory', []);
  const [transactions, setTransactions] = useStorage<InventoryTransaction[]>('transactions', []);
  const [tailors] = useStorage<Tailor[]>('tailors', []);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [orderFilter, setOrderFilter] = useState<'all' | 'active' | 'ready' | 'completed' | 'rejected' | 'stitched'>('all');
  const [showServiceOrderForm, setShowServiceOrderForm] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showOrderAllotmentForm, setShowOrderAllotmentForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string>('');
  const [newlyCreatedCustomerId, setNewlyCreatedCustomerId] = useState<string | undefined>();
  const [reassignOrder, setReassignOrder] = useState<OrderAllotment | null>(null);

  // Get admin ID from logged-in employee or user
  const adminId = employee?.id || user?.id || 'DEFAULT_ADMIN';

  // Load customers, service orders, employees, vendors, and allotments from Firestore
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        if (!user?.id) {
          console.error('[OwnerDashboard] No user ID found');
          setLoading(false);
          return;
        }

        // Get company profile to get the real company ID
        const company = await getCompanyProfile(user.id);
        if (!company) {
          console.error('[OwnerDashboard] No company profile found for user:', user.id);
          setLoading(false);
          return;
        }

        const realCompanyId = employee?.companyId || company.id;
        setCompanyId(realCompanyId);
        console.log('[OwnerDashboard] Loading data for company:', realCompanyId);
        console.log('[OwnerDashboard] Company profile ID:', company.id);

        // Load customers from Firestore
        const customersData = await getCustomersByCompany(realCompanyId);
        setCustomers(customersData);
        console.log('[OwnerDashboard] Loaded customers:', customersData.length);

        // Load service orders from Firestore
        const ordersData = await getServiceOrdersByCompany(realCompanyId);
        setServiceOrders(ordersData);
        console.log('[OwnerDashboard] Loaded service orders:', ordersData.length);

        // Load order allotments from Firestore
        const allotmentsData = await getOrderAllotmentsByCompany(realCompanyId);
        setOrderAllotments(allotmentsData);
        console.log('[OwnerDashboard] Loaded order allotments:', allotmentsData.length);

        // Load employees from Firestore (use user.id for employees/vendors)
        const employeesData = await getEmployeesByCompany(user.id);
        setEmployees(employeesData);
        console.log('[OwnerDashboard] Loaded employees:', employeesData.length);

        // Load vendors from Firestore
        const vendorsData = await getVendorsByCompany(user.id);
        setVendors(vendorsData);
        console.log('[OwnerDashboard] Loaded vendors:', vendorsData.length);

        setLoading(false);
      } catch (error) {
        console.error('[OwnerDashboard] Error loading data:', error);
        toast.error('Failed to load data');
        setLoading(false);
      }
    };

    loadData();
  }, [companyId, user]);

  const handleAddCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      console.log('[OwnerDashboard] Adding customer to Firestore newcustomers collection');
      console.log('[OwnerDashboard] Customer data with measurements:', customerData);
      console.log('[OwnerDashboard] Company ID:', companyId);
      console.log('[OwnerDashboard] Admin ID:', adminId);

      const newCustomer = await addCustomer(customerData, companyId, adminId);
      setCustomers([...(customers || []), newCustomer]);
      toast.success('Account created successfully');
      return newCustomer; // Return the newly created customer
    } catch (error) {
      console.error('[OwnerDashboard] Error adding customer:', error);
      toast.error('Failed to create account');
      throw error; // Re-throw to handle in caller
    }
  };

  const handleUpdateCustomer = async (id: string, customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      console.log('[OwnerDashboard] Updating customer in Firestore:', id);

      await updateCustomer(id, customerData);
      setCustomers((customers || []).map((customer) =>
          customer.id === id
            ? { ...customerData, id, createdAt: customer.createdAt, updatedAt: Date.now() }
            : customer
        )
      );
      toast.success('Account updated successfully');
    } catch (error) {
      console.error('[OwnerDashboard] Error updating customer:', error);
      toast.error('Failed to update account');
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    try {
      console.log('[OwnerDashboard] Deleting customer from Firestore:', id);

      await deleteCustomer(id);
      setCustomers((customers || []).filter((customer) => customer.id !== id));
      toast.success('Account deleted successfully');
    } catch (error) {
      console.error('[OwnerDashboard] Error deleting customer:', error);
      toast.error('Failed to delete account');
    }
  };

  const handleAddOrder = (orderData: {
    customerId: string;
    customerName: string;
    customerPhone: string;
    garmentTypes: string[];
    measurements?: any;
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

    setOrders([...(orders || []), newOrder]);

    if (orderData.materialsUsed && orderData.materialsUsed.length > 0) {
      orderData.materialsUsed.forEach((material: any) => {
        setInventory((inventory || []).map((item) =>
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

        setTransactions([...(transactions || []), transaction]);
      });
    }

    toast.success('Order created successfully');
  };

  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders((orders || []).map((order) =>
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

    setInventory([...(inventory || []), newItem]);
    toast.success('Inventory item added successfully');
  };

  const handleStockUpdate = (itemId: string, quantity: number, type: 'in' | 'out', reason: string) => {
    const item = (inventory || []).find(i => i.id === itemId);
    if (!item) return;

    const newQuantity = type === 'in' 
      ? item.quantity + quantity 
      : item.quantity - quantity;

    setInventory((inventory || []).map((item) =>
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

    setTransactions([...(transactions || []), transaction]);
    toast.success(`Stock ${type === 'in' ? 'added' : 'removed'} successfully`);
  };

  const handleStatClick = (filter: 'all' | 'active' | 'ready' | 'completed' | 'rejected' | 'stitched') => {
    setOrderFilter(filter);
    if (filter === 'rejected' || filter === 'stitched') {
      // Keep on dashboard tab to show the list
      setActiveTab('dashboard');
    } else {
      setActiveTab('track');
    }
  };

  const handleReassignOrder = (order: OrderAllotment) => {
    setReassignOrder(order);
    setShowOrderAllotmentForm(true);
  };

  const handleBackToDashboard = () => {
    setOrderFilter('all');
  };

  const handleAddServiceOrder = async (
    orderData: Omit<ServiceOrder, 'id' | 'createdAt' | 'updatedAt'>,
    advancePaymentData?: Omit<AdvancePayment, 'id' | 'proformaInvoiceNo' | 'invoiceNo' | 'createdAt' | 'updatedAt'>
  ) => {
    try {
      console.log('[OwnerDashboard] Adding service order to Firestore neworders collection');
      console.log('[OwnerDashboard] Service order data:', orderData);
      console.log('[OwnerDashboard] Company ID:', companyId);
      console.log('[OwnerDashboard] Admin ID:', adminId);

      const newServiceOrder = await addServiceOrder(orderData, companyId, adminId);
      setServiceOrders([...(serviceOrders || []), newServiceOrder]);
      toast.success('Service order created successfully');

      // Update customer measurements if provided in the order
      if (orderData.measurements && Object.keys(orderData.measurements).length > 0) {
        try {
          console.log('[OwnerDashboard] Updating customer measurements');
          await updateCustomer(orderData.customerId, {
            measurements: orderData.measurements,
          });
          console.log('[OwnerDashboard] Customer measurements updated successfully');

          // Update local customer state
          setCustomers((prev) =>
            (prev || []).map((c) =>
              c.id === orderData.customerId
                ? { ...c, measurements: orderData.measurements }
                : c
            )
          );
        } catch (measurementError) {
          console.error('[OwnerDashboard] Error updating customer measurements:', measurementError);
          // Don't show error to user as order was created successfully
        }
      }

      // If advance payment data is provided, save it to Firestore
      if (advancePaymentData && advancePaymentData.modeOfPayment !== 'nil') {
        try {
          console.log('[OwnerDashboard] Adding advance payment to Firestore');
          const paymentDataWithOrder = {
            ...advancePaymentData,
            serviceOrderNo: newServiceOrder.id,
          };
          const newAdvancePayment = await addAdvancePayment(paymentDataWithOrder, companyId, adminId);
          console.log('[OwnerDashboard] Advance payment created:', newAdvancePayment.id);
          toast.success(`Advance Payment ${newAdvancePayment.proformaInvoiceNo} recorded`);
        } catch (paymentError) {
          console.error('[OwnerDashboard] Error adding advance payment:', paymentError);
          toast.error('Service order created but failed to save advance payment');
        }
      }
    } catch (error) {
      console.error('[OwnerDashboard] Error adding service order:', error);
      toast.error('Failed to create service order');
    }
  };

  const handleCreateCustomerFromOrder = () => {
    setShowServiceOrderForm(false);
    setShowCustomerForm(true);
  };

  const handleCustomerSaved = () => {
    setShowCustomerForm(false);
    setShowServiceOrderForm(true);
  };

  const handleAddOrderAllotment = async (allotmentData: Omit<OrderAllotment, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      console.log('[OwnerDashboard] Adding order allotment to Firestore orderAllotment collection');
      console.log('[OwnerDashboard] Order allotment data:', allotmentData);
      console.log('[OwnerDashboard] Company ID:', companyId);
      console.log('[OwnerDashboard] Admin ID:', adminId);

      // Add companyId and adminId to allotment data
      const allotmentWithCompany = {
        ...allotmentData,
        companyId,
        adminId,
      };

      const newAllotment = await addOrderAllotment(allotmentWithCompany, companyId, adminId);
      setOrderAllotments([...(orderAllotments || []), newAllotment]);

      // Reload service orders to reflect status change
      const ordersData = await getServiceOrdersByCompany(companyId);
      setServiceOrders(ordersData);

      toast.success('Order allotted successfully');
    } catch (error) {
      console.error('[OwnerDashboard] Error adding order allotment:', error);
      toast.error('Failed to allot order');
    }
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
            {t('tailors')}
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
          {orderFilter === 'rejected' ? (
            <RejectedOrdersList
              orders={orderAllotments || []}
              onBack={handleBackToDashboard}
              onReassign={handleReassignOrder}
            />
          ) : orderFilter === 'stitched' ? (
            <StitchedOrdersList
              orders={orderAllotments || []}
              onBack={handleBackToDashboard}
              onReassign={handleReassignOrder}
            />
          ) : (
            <>
              <DashboardStats
                totalCustomers={(customers || []).length}
                orders={orders || []}
                serviceOrders={serviceOrders || []}
                orderAllotments={orderAllotments || []}
                onStatClick={handleStatClick}
              />

              <div className="grid grid-cols-2 gap-3 md:gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center h-9">
                    <h2 className="text-sm md:text-xl font-semibold line-clamp-1">{t('customers')}</h2>
                  </div>
                  <CustomerList
                    customers={customers || []}
                    onAddCustomer={handleAddCustomer}
                    onUpdateCustomer={handleUpdateCustomer}
                    onDeleteCustomer={handleDeleteCustomer}
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center h-9">
                    <h2 className="text-sm md:text-xl font-semibold line-clamp-1">{t('orders')}</h2>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowOrderAllotmentForm(true)}
                      className="text-xs sm:text-sm"
                    >
                      Job Allotment
                    </Button>
                  </div>
                  <OrderList
                    orders={orders || []}
                    serviceOrders={serviceOrders || []}
                    orderAllotments={orderAllotments || []}
                    customers={customers || []}
                    tailors={tailors || []}
                    inventory={inventory || []}
                    onAddOrder={handleAddOrder}
                    onUpdateStatus={handleUpdateOrderStatus}
                    onAddServiceOrder={handleAddServiceOrder}
                    onCreateCustomer={handleCreateCustomerFromOrder}
                  />
                </div>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="tailors">
          <TailorManagement />
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <InventoryStats items={inventory || []} transactions={transactions || []} />
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

      {/* Service Order Form */}
      <ServiceOrderForm
        open={showServiceOrderForm}
        onOpenChange={(open) => {
          setShowServiceOrderForm(open);
          // Clear newly created customer ID when closing the form
          if (!open) {
            setNewlyCreatedCustomerId(undefined);
          }
        }}
        onSave={handleAddServiceOrder}
        customers={customers || []}
        onCreateCustomer={handleCreateCustomerFromOrder}
        initialCustomerId={newlyCreatedCustomerId}
      />

      {/* Customer Form (for creating customer from order form) */}
      <CustomerForm
        open={showCustomerForm}
        onOpenChange={(open) => {
          setShowCustomerForm(open);
          if (!open) {
            setShowServiceOrderForm(true);
            // Clear the newly created customer ID when closing
            setNewlyCreatedCustomerId(undefined);
          }
        }}
        onSave={async (customerData) => {
          try {
            const newCustomer = await handleAddCustomer(customerData);
            // Store the newly created customer ID
            setNewlyCreatedCustomerId(newCustomer.id);
            console.log('[OwnerDashboard] New customer created, ID:', newCustomer.id);
            handleCustomerSaved();
          } catch (error) {
            console.error('[OwnerDashboard] Failed to create customer:', error);
          }
        }}
      />

      {/* Order Allotment Form */}
      <OrderAllotmentForm
        open={showOrderAllotmentForm}
        onOpenChange={(open) => {
          setShowOrderAllotmentForm(open);
          if (!open) {
            setReassignOrder(null); // Clear reassign order when dialog closes
          }
        }}
        onSave={handleAddOrderAllotment}
        serviceOrders={serviceOrders || []}
        employees={employees || []}
        vendors={vendors || []}
        reassignOrder={reassignOrder}
      />
    </main>
  );
}

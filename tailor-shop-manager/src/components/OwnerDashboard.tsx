import { useState, useEffect, lazy, Suspense } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { Customer, Order, OrderStatus, Tailor, InventoryItem, InventoryTransaction, ServiceOrder, OrderAllotment, Employee, Vendor, AdvancePayment } from '@/lib/types';
import { useStorage } from '@/hooks/use-storage';
import { Tabs, TabsContent, TabsListAnimated, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { DashboardStats } from '@/components/DashboardStats';
import { CustomerList } from '@/components/CustomerList';
import { OrderList } from '@/components/OrderList';

// Lazy load OrderTracking component
const OrderTracking = lazy(() => import('@/components/OrderTracking').then(m => ({ default: m.OrderTracking })));
import { InventoryStats } from '@/components/InventoryStats';
import { InventoryList } from '@/components/InventoryList';
import { TransactionHistory } from '@/components/TransactionHistory';
import { TailorManagement } from '@/components/TailorManagement';
import { ServiceOrderForm } from '@/components/ServiceOrderForm';
import { CustomerForm } from '@/components/CustomerForm';
import { OrderAllotmentForm } from '@/components/OrderAllotmentForm';
import { RejectedOrdersList } from '@/components/RejectedOrdersList';
import { StitchedOrdersList } from '@/components/StitchedOrdersList';
import { CustomerView } from '@/components/CustomerView';
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
  const [customerFormFromOrder, setCustomerFormFromOrder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string>('');
  const [newlyCreatedCustomerId, setNewlyCreatedCustomerId] = useState<string | undefined>();
  const [reassignOrder, setReassignOrder] = useState<OrderAllotment | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

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
    setCustomerFormFromOrder(true);
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
        <TabsListAnimated
          className="grid w-full grid-cols-4 h-auto p-1 bg-muted/60 gap-1"
          activeValue={activeTab}
          tabValues={['dashboard', 'employees', 'customers', 'track']}
        >
          <TabsTrigger
            value="dashboard"
            className="py-2.5 px-1.5 text-[10px] sm:text-sm whitespace-nowrap leading-tight"
          >
            {t('dashboard')}
          </TabsTrigger>
          <TabsTrigger
            value="employees"
            className="py-2.5 px-1.5 text-[10px] sm:text-sm whitespace-nowrap leading-tight"
          >
            {t('employees')}
          </TabsTrigger>
          <TabsTrigger
            value="customers"
            className="py-2.5 px-1.5 text-[10px] sm:text-sm whitespace-nowrap leading-tight"
          >
            {t('customers')}
          </TabsTrigger>
          <TabsTrigger
            value="track"
            className="py-2.5 px-1.5 text-[10px] sm:text-sm whitespace-nowrap leading-tight data-[state=active]:bg-teal-600 data-[state=active]:text-white"
          >
            {t('track')}
          </TabsTrigger>
        </TabsListAnimated>

        <TabsContent value="dashboard" className="space-y-6">
          {selectedCustomer ? (
            <CustomerView
              customer={selectedCustomer}
              serviceOrders={serviceOrders || []}
              onBack={() => setSelectedCustomer(null)}
              onEdit={(customer) => {
                setSelectedCustomer(null);
                setEditingCustomer(customer);
                setShowCustomerForm(true);
              }}
              onDelete={async (customerId) => {
                try {
                  await deleteCustomer(customerId);
                  setSelectedCustomer(null);
                  toast.success('Customer deleted successfully');
                } catch (error) {
                  console.error('Error deleting customer:', error);
                  toast.error('Failed to delete customer');
                }
              }}
            />
          ) : orderFilter === 'rejected' ? (
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

              {/* Quick Action Buttons */}
              <div className="space-y-3 md:space-y-4">
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <button
                    onClick={() => {
                      setCustomerFormFromOrder(false);
                      setShowCustomerForm(true);
                    }}
                    className="group relative flex flex-col items-center justify-center gap-2 p-4 md:p-6 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all duration-200 cursor-pointer animate-on-load animate-fade-slide-up stagger-1"
                  >
                    <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256" className="text-primary">
                        <path d="M228,128a12,12,0,0,1-12,12H140v76a12,12,0,0,1-24,0V140H40a12,12,0,0,1,0-24h76V40a12,12,0,0,1,24,0v76h76A12,12,0,0,1,228,128Z"></path>
                      </svg>
                    </div>
                    <span className="text-sm md:text-base font-semibold text-foreground">{t('addCustomer')}</span>
                    <span className="text-[10px] md:text-xs text-muted-foreground">Register new customer</span>
                  </button>

                  <button
                    onClick={() => setShowServiceOrderForm(true)}
                    className="group relative flex flex-col items-center justify-center gap-2 p-4 md:p-6 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all duration-200 cursor-pointer animate-on-load animate-fade-slide-up stagger-2"
                  >
                    <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256" className="text-primary">
                        <path d="M228,128a12,12,0,0,1-12,12H140v76a12,12,0,0,1-24,0V140H40a12,12,0,0,1,0-24h76V40a12,12,0,0,1,24,0v76h76A12,12,0,0,1,228,128Z"></path>
                      </svg>
                    </div>
                    <span className="text-sm md:text-base font-semibold text-foreground">{t('newOrder')}</span>
                    <span className="text-[10px] md:text-xs text-muted-foreground">Create service order</span>
                  </button>
                </div>

                {/* Job Allotment Box */}
                <button
                  onClick={() => setShowOrderAllotmentForm(true)}
                  className="group relative w-full flex items-center justify-center gap-3 p-3 md:p-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all duration-200 cursor-pointer animate-on-load animate-fade-slide-up stagger-3"
                >
                  <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256" className="text-primary">
                      <path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z"></path>
                    </svg>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm md:text-base font-semibold text-foreground">Job Allotment</span>
                    <span className="text-[10px] md:text-xs text-muted-foreground">Assign orders to tailors</span>
                  </div>
                </button>
              </div>

              {/* Recent Service Orders */}
              <div className="space-y-4 animate-on-load animate-fade-slide-up stagger-4">
                <div className="flex justify-between items-center h-9">
                  <h2 className="text-sm md:text-xl font-semibold line-clamp-1">{t('orders')}</h2>
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
                  hideAddButton
                />
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="employees" className="space-y-4">
          {/* Employee List */}
          <div
            className="flex flex-col gap-4 p-4 sm:p-5 rounded-xl border"
            style={{
              background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 50%, #e0e7ff 100%)',
              borderColor: 'rgba(196, 181, 253, 0.5)',
              boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.1), 0 2px 4px -2px rgba(139, 92, 246, 0.1)'
            }}
          >
            {/* Header Row */}
            <div
              className="grid grid-cols-3 gap-2 px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold text-white"
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #8b5cf6 100%)',
                boxShadow: '0 4px 15px -3px rgba(124, 58, 237, 0.4), 0 2px 6px -2px rgba(124, 58, 237, 0.2)'
              }}
            >
              <div>Name</div>
              <div>Employee ID</div>
              <div>Role</div>
            </div>

            {/* Employee Cards */}
            {(employees || []).length === 0 ? (
              <div
                className="rounded-xl border p-8 flex flex-col items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #faf8ff 100%)',
                  borderColor: 'rgba(167, 139, 250, 0.3)',
                  boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.1), 0 2px 4px -2px rgba(139, 92, 246, 0.1)'
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" viewBox="0 0 256 256" className="text-purple-400 mb-4">
                  <path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z"></path>
                </svg>
                <p className="text-lg font-medium text-gray-900">No employees yet</p>
                <p className="text-sm text-gray-500">Add your first employee to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(employees || []).map((emp, index) => {
                  // Format role for display
                  const roleDisplay = emp.role ? emp.role.charAt(0).toUpperCase() + emp.role.slice(1) : 'Staff';

                  return (
                    <div
                      key={emp.id}
                      className={`grid grid-cols-3 gap-2 px-4 py-4 rounded-xl border-l-4 transition-all hover:scale-[1.01] animate-on-load animate-fade-slide-up stagger-${(index % 6) + 1}`}
                      style={{
                        background: 'linear-gradient(135deg, #ffffff 0%, #faf8ff 100%)',
                        borderLeftColor: emp.isActive ? '#10b981' : '#a855f7',
                        borderTopColor: 'rgba(167, 139, 250, 0.2)',
                        borderRightColor: 'rgba(167, 139, 250, 0.2)',
                        borderBottomColor: 'rgba(167, 139, 250, 0.2)',
                        borderTopWidth: '1px',
                        borderRightWidth: '1px',
                        borderBottomWidth: '1px',
                        boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.15), 0 2px 4px -2px rgba(139, 92, 246, 0.1)'
                      }}
                    >
                      <div className="flex flex-col justify-center">
                        <p className="text-sm sm:text-base font-semibold text-gray-900">{emp.name}</p>
                        {emp.aliasName && (
                          <p className="text-xs text-gray-500">{emp.aliasName}</p>
                        )}
                      </div>
                      <div className="flex items-center">
                        <p className="text-xs sm:text-sm font-medium text-purple-700">{emp.employeeCode || emp.id}</p>
                      </div>
                      <div className="flex items-center">
                        <span
                          className="px-2 py-1 text-xs sm:text-sm font-medium rounded-lg bg-purple-100 text-purple-700"
                          style={{ boxShadow: '0 1px 2px rgba(139, 92, 246, 0.1)' }}
                        >
                          {roleDisplay}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <CustomerList
            customers={customers || []}
            onAddCustomer={handleAddCustomer}
            onUpdateCustomer={handleUpdateCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onSelectCustomer={(customer) => {
              console.log('[OwnerDashboard] Customer selected:', customer.id, customer.name);
              setSelectedCustomer(customer);
              setActiveTab('dashboard');
            }}
          />
        </TabsContent>

        <TabsContent value="track" className="min-h-[calc(100vh-180px)]">
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-muted-foreground font-medium">Loading Jobwork Tailors...</p>
              </div>
            </div>
          }>
            <OrderTracking orders={orders || []} initialFilter={orderFilter} />
          </Suspense>
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

      {/* Customer Form */}
      <CustomerForm
        open={showCustomerForm}
        onOpenChange={(open) => {
          setShowCustomerForm(open);
          if (!open) {
            // Clear editing customer when closing
            setEditingCustomer(null);
            // Only open ServiceOrderForm if customer was created from order flow
            if (customerFormFromOrder) {
              setShowServiceOrderForm(true);
            }
            setCustomerFormFromOrder(false);
            setNewlyCreatedCustomerId(undefined);
          }
        }}
        customer={editingCustomer || undefined}
        onSave={async (customerData) => {
          try {
            if (editingCustomer) {
              // Update existing customer
              await updateCustomer(editingCustomer.id, customerData);

              // Update local customers state with edited data
              setCustomers(prevCustomers =>
                prevCustomers.map(c =>
                  c.id === editingCustomer.id
                    ? { ...c, ...customerData, updatedAt: new Date().toISOString() }
                    : c
                )
              );

              toast.success('Customer updated successfully');
              setShowCustomerForm(false);
              setEditingCustomer(null);
            } else {
              // Create new customer
              const newCustomer = await handleAddCustomer(customerData);
              if (customerFormFromOrder) {
                // Store the newly created customer ID for order flow
                setNewlyCreatedCustomerId(newCustomer.id);
                console.log('[OwnerDashboard] New customer created, ID:', newCustomer.id);
                handleCustomerSaved();
              } else {
                // Just close the form for direct customer creation
                setShowCustomerForm(false);
              }
            }
          } catch (error) {
            console.error('[OwnerDashboard] Failed to save customer:', error);
            toast.error('Failed to save customer');
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

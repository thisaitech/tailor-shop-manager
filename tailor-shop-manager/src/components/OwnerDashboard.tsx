import { useState, useEffect, lazy, Suspense } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { Customer, Order, OrderStatus, Tailor, InventoryItem, InventoryTransaction, ServiceOrder, OrderAllotment, Employee, Vendor, AdvancePayment } from '@/lib/types';
import { useStorage } from '@/hooks/use-storage';
import { Tabs, TabsContent, TabsListAnimated, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { DashboardStats, DashboardFilter } from '@/components/DashboardStats';
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
import { ActiveOrdersList } from '@/components/ActiveOrdersList';
import { ReadyToDeliverList } from '@/components/ReadyToDeliverList';
import { ReceivedNoteList } from '@/components/ReceivedNoteList';
import { WaitingForDCList } from '@/components/WaitingForDCList';
import { ReassignedOrdersList } from '@/components/ReassignedOrdersList';
import { OverDueOrdersList } from '@/components/OverDueOrdersList';
import { JobworkCompletedOrdersList } from '@/components/JobworkCompletedOrdersList';
import { CustomerView } from '@/components/CustomerView';
import { OrderView } from '@/components/OrderView';
import { EmployeeManagementFirestore } from '@/components/EmployeeManagementFirestore';
import { VendorManagementFirestore } from '@/components/VendorManagementFirestore';
import { toast } from 'sonner';
import { Spinner } from '@phosphor-icons/react';
import {
  addCustomer,
  getCustomersByCompany,
  updateCustomer,
  deleteCustomer,
} from '@/lib/firestore/customerService';
import {
  addServiceOrder,
  getServiceOrdersByCompany,
  subscribeToServiceOrders,
  assignOrder,
} from '@/lib/firestore/serviceOrderService';
import {
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

interface OwnerDashboardProps {
  initialTab?: string;
  onEmployeeClick?: () => void;
  onNavigateToDeliveryChallan?: (orderId?: string) => void; // Navigate to DC page with optional pre-selected order
}

export function OwnerDashboard({ initialTab = 'dashboard', onEmployeeClick, onNavigateToDeliveryChallan }: OwnerDashboardProps) {
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
  const [activeTab, setActiveTab] = useState(initialTab);
  const [orderFilter, setOrderFilter] = useState<DashboardFilter>('all');
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
  const [selectedServiceOrder, setSelectedServiceOrder] = useState<ServiceOrder | null>(null);
  const [initialServiceOrderId, setInitialServiceOrderId] = useState<string | undefined>(); // For Job Allotment from Open Orders

  // Get admin ID from logged-in employee or user
  const adminId = employee?.id || user?.id || 'DEFAULT_ADMIN';

  // Load customers, service orders, employees, vendors, and allotments from Firestore
  useEffect(() => {
    let unsubscribeOrders: (() => void) | null = null;

    const loadData = async () => {
      const startTime = Date.now();
      const MIN_LOADING_TIME = 500; // Minimum loading time in ms to show loader

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

        // Subscribe to real-time service orders updates
        unsubscribeOrders = subscribeToServiceOrders(
          realCompanyId,
          (ordersData) => {
            setServiceOrders(ordersData);
            console.log('[OwnerDashboard] Real-time service orders update:', ordersData.length);
          },
          (error) => {
            console.error('[OwnerDashboard] Service orders subscription error:', error);
          }
        );

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

        // Ensure minimum loading time for better UX
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime < MIN_LOADING_TIME) {
          await new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME - elapsedTime));
        }

        setLoading(false);
      } catch (error) {
        console.error('[OwnerDashboard] Error loading data:', error);
        toast.error('Failed to load data');
        setLoading(false);
      }
    };

    loadData();

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribeOrders) {
        console.log('[OwnerDashboard] Unsubscribing from service orders');
        unsubscribeOrders();
      }
    };
  }, [user]);

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

  const handleStatClick = (filter: DashboardFilter) => {
    setOrderFilter(filter);
    // Keep on dashboard tab to show the dedicated list pages
    setActiveTab('dashboard');
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
      console.log('[OwnerDashboard] Assigning order using new unified flow');
      console.log('[OwnerDashboard] Order allotment data:', allotmentData);

      // Determine assignment type (vendor or employee)
      const assignmentType = allotmentData.stitchingAllotment === 'vendor' ? 'vendor' : 'employee';
      
      // Get assignee name
      let assigneeName = '';
      if (assignmentType === 'employee') {
        const emp = employees?.find(e => e.id === allotmentData.assignedTo);
        assigneeName = emp?.name || '';
      } else {
        const vendor = vendors?.find(v => v.id === allotmentData.assignedTo);
        assigneeName = vendor?.tailorName || '';
      }

      // Call the new unified assignOrder function
      // This updates the ServiceOrder in newOrders collection with assignment details
      await assignOrder(
        allotmentData.serviceOrderNo,  // orderId
        assignmentType,
        allotmentData.assignedTo,
        assigneeName,
        adminId,
        'Admin',  // assignedByName
        allotmentData.materialCost,
        allotmentData.jobWorkCost
      );

      // Reload service orders to reflect status change
      const ordersData = await getServiceOrdersByCompany(companyId);
      setServiceOrders(ordersData);

      toast.success(`Order assigned to ${assigneeName}. Status: Awaiting acceptance`);
    } catch (error) {
      console.error('[OwnerDashboard] Error assigning order:', error);
      toast.error('Failed to assign order');
    }
  };

  return (
    <main className="container mx-auto px-4 py-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsListAnimated
          className="grid w-full grid-cols-4 h-auto p-2 gap-2 rounded-xl"
          style={{ backgroundColor: '#E9E0FB' }}
          activeValue={activeTab}
          tabValues={['dashboard', 'employees', 'customers', 'track']}
        >
          <TabsTrigger
            value="dashboard"
            className="py-3 px-2 text-xs sm:text-sm font-medium whitespace-nowrap leading-tight rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md"
            style={{ backgroundColor: activeTab === 'dashboard' ? 'white' : '#DDD1F9', color: '#6A64F2' }}
          >
            {t('dashboard')}
          </TabsTrigger>
          <TabsTrigger
            value="employees"
            className="py-3 px-2 text-xs sm:text-sm font-medium whitespace-nowrap leading-tight rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md"
            style={{ backgroundColor: activeTab === 'employees' ? 'white' : '#DDD1F9', color: '#6A64F2' }}
          >
            {t('employees')}
          </TabsTrigger>
          <TabsTrigger
            value="customers"
            className="py-3 px-2 text-xs sm:text-sm font-medium whitespace-nowrap leading-tight rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md"
            style={{ backgroundColor: activeTab === 'customers' ? 'white' : '#DDD1F9', color: '#6A64F2' }}
          >
            {t('customers')}
          </TabsTrigger>
          <TabsTrigger
            value="track"
            className="py-3 px-2 text-xs sm:text-sm font-medium whitespace-nowrap leading-tight rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md"
            style={{ backgroundColor: activeTab === 'track' ? 'white' : '#DDD1F9', color: '#6A64F2' }}
          >
            Jobwork Tailors
          </TabsTrigger>
        </TabsListAnimated>

        <TabsContent value="dashboard" className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Spinner size={48} className="animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading dashboard...</p>
              </div>
            </div>
          ) : selectedServiceOrder ? (
            <OrderView
              serviceOrder={selectedServiceOrder}
              orderAllotments={orderAllotments || []}
              customer={customers.find(c => c.id === selectedServiceOrder.customerId)}
              onBack={() => setSelectedServiceOrder(null)}
            />
          ) : selectedCustomer ? (
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
          ) : orderFilter === 'overdue' ? (
            <OverDueOrdersList
              serviceOrders={serviceOrders || []}
              orderAllotments={orderAllotments || []}
              onBack={handleBackToDashboard}
            />
          ) : orderFilter === 'jobworkCompleted' ? (
            <JobworkCompletedOrdersList
              serviceOrders={serviceOrders || []}
              orderAllotments={orderAllotments || []}
              onBack={handleBackToDashboard}
              onDataRefresh={async () => {
                // Reload service orders to reflect status change
                const ordersData = await getServiceOrdersByCompany(companyId);
                setServiceOrders(ordersData);
              }}
            />
          ) : orderFilter === 'open' ? (
            <ActiveOrdersList
              serviceOrders={serviceOrders || []}
              orderAllotments={orderAllotments || []}
              onBack={handleBackToDashboard}
              filterType="open"
              onJobAllotment={(serviceOrderId) => {
                setInitialServiceOrderId(serviceOrderId);
                setShowOrderAllotmentForm(true);
              }}
            />
          ) : orderFilter === 'awaiting' ? (
            <ActiveOrdersList
              serviceOrders={serviceOrders || []}
              orderAllotments={orderAllotments || []}
              onBack={handleBackToDashboard}
              filterType="awaiting"
            />
          ) : orderFilter === 'inProgress' ? (
            <ActiveOrdersList
              serviceOrders={serviceOrders || []}
              orderAllotments={orderAllotments || []}
              onBack={handleBackToDashboard}
              filterType="inProgress"
            />
          ) : orderFilter === 'rejected' ? (
            <RejectedOrdersList
              orders={orderAllotments || []}
              onBack={handleBackToDashboard}
              onReassign={handleReassignOrder}
            />
          ) : orderFilter === 'ready' ? (
            <ReadyToDeliverList
              serviceOrders={serviceOrders || []}
              orderAllotments={orderAllotments || []}
              onBack={handleBackToDashboard}
              onOrderDelivered={async () => {
                // Reload service orders and allotments to reflect status change
                const ordersData = await getServiceOrdersByCompany(companyId);
                setServiceOrders(ordersData);
                const allotmentsData = await getOrderAllotmentsByCompany(companyId);
                setOrderAllotments(allotmentsData);
              }}
            />
          ) : orderFilter === 'receivedNote' ? (
            <ReceivedNoteList
              serviceOrders={serviceOrders || []}
              orderAllotments={orderAllotments || []}
              onBack={handleBackToDashboard}
              onDataRefresh={async () => {
                // Reload service orders to reflect status change
                const ordersData = await getServiceOrdersByCompany(companyId);
                setServiceOrders(ordersData);
              }}
            />
          ) : orderFilter === 'waitingForDC' ? (
            <WaitingForDCList
              serviceOrders={serviceOrders || []}
              orderAllotments={orderAllotments || []}
              onBack={handleBackToDashboard}
              onCreateDC={(orderId) => {
                // Navigate to Delivery Challan page with pre-filled order ID
                if (onNavigateToDeliveryChallan) {
                  onNavigateToDeliveryChallan(orderId);
                }
              }}
            />
          ) : (
            <>
              <DashboardStats
                totalCustomers={(customers || []).length}
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
                  onSelectOrder={(order) => setSelectedServiceOrder(order)}
                />
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="employees" className="space-y-6">
          <EmployeeManagementFirestore onBack={() => setActiveTab('dashboard')} />
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Spinner size={48} className="animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading customers...</p>
              </div>
            </div>
          ) : (
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
          )}
        </TabsContent>

        <TabsContent value="track" className="space-y-6">
          <VendorManagementFirestore onBack={() => setActiveTab('dashboard')} />
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
                    ? { ...c, ...customerData, updatedAt: Date.now() }
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
            setInitialServiceOrderId(undefined); // Clear initial service order when dialog closes
          }
        }}
        onSave={handleAddOrderAllotment}
        serviceOrders={serviceOrders || []}
        employees={employees || []}
        vendors={vendors || []}
        reassignOrder={reassignOrder}
        initialServiceOrderId={initialServiceOrderId}
      />
    </main>
  );
}

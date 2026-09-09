import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { ServiceOrder } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { EmployeeOrderDetailsDialog } from '@/components/EmployeeOrderDetailsDialog';
import { TailorProfile } from '@/components/TailorProfile';
import { EmptyState } from '@/components/EmptyState';
import { StatusChangeConfirmDialog, StatusChangeType } from '@/components/StatusChangeConfirmDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Package,
  ClockCounterClockwise,
  CheckCircle,
  ListChecks,
  Check,
  X,
  XCircle,
  ArrowLeft,
  MagnifyingGlass,
  DotsThree,
  Eye,
  User,
  Calendar,
  Spinner,
} from '@phosphor-icons/react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  getOrdersByEmployee,
  subscribeToEmployeeOrders,
  acceptOrder,
  rejectOrder,
  markOrderReady,
  markOrderDelivered,
  ServiceOrderWithCompany,
} from '@/lib/firestore/serviceOrderService';
import { getCustomerById } from '@/lib/firestore/customerService';
import { getCompanyProfile } from '@/lib/firestore/companyService';
import { sendOrderReadyEmail, sendOrderRejectionEmail } from '@/lib/emailService';
import { 
  WhatsAppConfirmationDialog, 
  generateOrderReadyMessage 
} from '@/components/WhatsAppConfirmationDialog';

// Employee orders follow a simpler flow (no DC step):
// awaiting → inprogress → ready → delivered

interface DashboardStats {
  awaitingOrders: number;
  inProgress: number;
  readyToDeliver: number;
  rejectedOrders: number;
  totalOrders: number;
}

type TailorView = 'dashboard' | 'awaiting' | 'inprogress' | 'ready' | 'rejected' | 'all-orders' | 'profile';

const ITEMS_PER_PAGE = 6;

export function TailorDashboardFirestore() {
  const { employee } = useAuth();
  const [currentView, setCurrentView] = useState<TailorView>('dashboard');
  const [stats, setStats] = useState<DashboardStats>({
    awaitingOrders: 0,
    inProgress: 0,
    readyToDeliver: 0,
    rejectedOrders: 0,
    totalOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState<ServiceOrderWithCompany[]>([]);
  const [allOrders, setAllOrders] = useState<ServiceOrderWithCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingOrder, setAcceptingOrder] = useState<string | null>(null);
  const [rejectingOrder, setRejectingOrder] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrderWithCompany | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [markingReady, setMarkingReady] = useState<string | null>(null);
  const [markingDelivered, setMarkingDelivered] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: StatusChangeType;
    order: ServiceOrderWithCompany | null;
  }>({ open: false, type: 'accept', order: null });

  // Rejection dialog state
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    order: ServiceOrderWithCompany | null;
  }>({ open: false, order: null });
  const [rejectionReason, setRejectionReason] = useState('');

  // WhatsApp dialog state for "Ready to Delivery" notification
  const [whatsAppDialog, setWhatsAppDialog] = useState<{
    open: boolean;
    order: ServiceOrderWithCompany | null;
    customerName: string;
    customerPhone: string;
    message: string;
  }>({ open: false, order: null, customerName: '', customerPhone: '', message: '' });
  const [companyName, setCompanyName] = useState<string>('Tailor Shop');

  const openConfirmDialog = (type: StatusChangeType, order: ServiceOrderWithCompany) => {
    if (type === 'reject') {
      // Open rejection dialog instead of confirm dialog
      setRejectDialog({ open: true, order });
      setRejectionReason('');
    } else {
      setConfirmDialog({ open: true, type, order });
    }
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({ open: false, type: 'accept', order: null });
  };

  const closeRejectDialog = () => {
    setRejectDialog({ open: false, order: null });
    setRejectionReason('');
  };

  const handleConfirmAction = async () => {
    if (!confirmDialog.order) return;

    switch (confirmDialog.type) {
      case 'accept':
        await handleAcceptOrder(confirmDialog.order);
        break;
      case 'ready':
        // Show WhatsApp dialog before marking as ready
        await initiateMarkAsReady(confirmDialog.order);
        break;
    }
    closeConfirmDialog();
  };

  useEffect(() => {
    if (!employee) return;

    setLoading(true);

    // Load company name for WhatsApp messages
    const loadCompanyName = async () => {
      if (employee?.companyId) {
        try {
          const company = await getCompanyProfile(employee.companyId);
          if (company) {
            setCompanyName(company.companyName || company.aliasName || 'Tailor Shop');
          }
        } catch {
          // Use default company name
        }
      }
    };
    loadCompanyName();

    // Subscribe to real-time updates for employee orders
    const unsubscribe = subscribeToEmployeeOrders(
      employee.id,
      (employeeOrders) => {
        console.log(`[TailorDashboard] Real-time update: ${employeeOrders.length} orders for employee ${employee.id}`);

        // Store all orders for detailed views
        setAllOrders(employeeOrders);

        // Calculate stats using new status flow
        const awaitingOrders = employeeOrders.filter((o) => o.orderStatus === 'awaiting').length;
        const inProgress = employeeOrders.filter((o) => o.orderStatus === 'inprogress').length;
        const readyToDeliver = employeeOrders.filter((o) => o.orderStatus === 'ready').length;
        const rejectedOrders = employeeOrders.filter((o) => o.orderStatus === 'rejected').length;
        const totalOrders = employeeOrders.length;

        setStats({
          awaitingOrders,
          inProgress,
          readyToDeliver,
          rejectedOrders,
          totalOrders,
        });

        // Get recent orders (last 10, sorted by creation date descending)
        const sortedRecent = [...employeeOrders]
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
          .slice(0, 10);

        setRecentOrders(sortedRecent);
        setLoading(false);
      },
      (error) => {
        console.error('Error in employee orders subscription:', error);
        toast.error('Failed to load dashboard data');
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => {
      console.log('[TailorDashboard] Unsubscribing from employee orders');
      unsubscribe();
    };
  }, [employee]);

  // Handle accept order - for employees, goes directly from 'awaiting' to 'inprogress' (no DC step)
  const handleAcceptOrder = async (order: ServiceOrderWithCompany) => {
    if (!employee) return;
    
    try {
      setAcceptingOrder(order.id);

      // For employees, accepting means going directly to 'inprogress'
      await acceptOrder(order.id, employee.id, employee.name);

      console.log(`[TailorDashboard] Order ${order.id} accepted. Status updated to inprogress.`);
      toast.success('Order accepted and marked as In Progress');
      // Real-time subscription will automatically update the UI
    } catch (error) {
      console.error('Error accepting order:', error);
      toast.error('Failed to accept order');
    } finally {
      setAcceptingOrder(null);
    }
  };

  // Handle reject order using the new unified flow
  const handleRejectOrder = async (order: ServiceOrderWithCompany, reason: string) => {
    if (!employee) return;
    
    try {
      setRejectingOrder(order.id);

      // Reject the order using the new unified function with the reason
      await rejectOrder(order.id, employee.id, employee.name, reason || 'Rejected by employee');

      // Get company profile to send email to admin
      if (employee?.companyDocId) {
        try {
          const companyProfile = await getCompanyProfile(employee.companyDocId);

          if (companyProfile?.email) {
            await sendOrderRejectionEmail({
              to: companyProfile.email,
              adminName: companyProfile.companyName || 'Admin',
              orderNumber: order.id,
              jobWorkNo: order.jobWorkNo || order.id,
              vendorName: employee?.name || 'Tailor',
              vendorPhone: employee?.phone || 'N/A',
              customerName: order.customerName || 'Unknown',
              dressType: order.orderCategory,
              rejectionDate: format(new Date(), 'dd MMM yyyy, hh:mm a'),
              companyName: companyProfile.companyName,
              rejectionReason: reason,
            });
            console.log('[TailorDashboard] Rejection email sent to admin');
          }
        } catch (emailError) {
          console.error('[TailorDashboard] Error sending rejection email:', emailError);
        }
      }

      toast.success('Order rejected successfully. Admin has been notified.');
      closeRejectDialog();
      // Real-time subscription will automatically update the UI
    } catch (error) {
      console.error('Error rejecting order:', error);
      toast.error('Failed to reject order');
    } finally {
      setRejectingOrder(null);
    }
  };

  const handleViewOrderDetails = (order: ServiceOrderWithCompany) => {
    // Delay so DropdownMenu can close first (Radix focus conflict otherwise blocks dialog)
    window.setTimeout(() => {
      setSelectedOrder(order);
      setShowOrderDetails(true);
    }, 50);
  };

  // Initiate "Mark as Ready" - Show WhatsApp dialog first
  const initiateMarkAsReady = async (order: ServiceOrderWithCompany) => {
    if (!employee) return;

    try {
      // Get customer details for WhatsApp dialog
      const customer = await getCustomerById(order.customerId);
      
      if (customer && (customer.whatsappNumber || customer.phone)) {
        // Show WhatsApp dialog
        const customerPhone = customer.whatsappNumber || customer.phone;
        const message = generateOrderReadyMessage(customer.name, order.id, companyName);
        
        setWhatsAppDialog({
          open: true,
          order,
          customerName: customer.name,
          customerPhone,
          message,
        });
      } else {
        // No phone number, mark as ready directly
        await handleMarkAsReady(order);
      }
    } catch (error) {
      console.error('[TailorDashboard] Error preparing WhatsApp dialog:', error);
      // Fallback to direct marking
      await handleMarkAsReady(order);
    }
  };

  // Handle mark as ready after WhatsApp dialog (or directly if no phone)
  const handleMarkAsReady = async (order: ServiceOrderWithCompany) => {
    if (!employee) return;
    
    try {
      setMarkingReady(order.id);

      // Use the new unified markOrderReady function
      await markOrderReady(order.id, employee.id, employee.name);

      console.log(`[TailorDashboard] Order ${order.id} marked as ready.`);

      // Send email notification if available
      try {
        const customer = await getCustomerById(order.customerId);
        if (customer?.email) {
          await sendOrderReadyEmail({
            to: customer.email,
            customerName: customer.name,
            orderNumber: order.id,
            companyName: companyName,
          });
        }
      } catch (emailError) {
        console.error('[TailorDashboard] Error sending email:', emailError);
      }

      toast.success('Order marked as Ready to Deliver!');
      // Real-time subscription will automatically update the UI
    } catch (error) {
      console.error('Error marking order as ready:', error);
      toast.error('Failed to mark order as ready');
    } finally {
      setMarkingReady(null);
    }
  };

  // Handle marking order as delivered using the new unified flow
  const handleMarkDelivered = async (order: ServiceOrderWithCompany) => {
    if (!employee) return;
    
    try {
      setMarkingDelivered(order.id);

      // Use the new unified markOrderDelivered function
      await markOrderDelivered(order.id, employee.id, employee.name);

      toast.success('Order marked as delivered successfully!');
      // Real-time subscription will automatically update the UI
    } catch (error) {
      console.error('Error marking order as delivered:', error);
      toast.error('Failed to mark order as delivered');
    } finally {
      setMarkingDelivered(null);
    }
  };

  // Handle WhatsApp dialog send (opens WhatsApp and marks as ready)
  const handleWhatsAppSend = async () => {
    if (!whatsAppDialog.order) return;
    // Mark order as ready after WhatsApp is opened
    await handleMarkAsReady(whatsAppDialog.order);
    setWhatsAppDialog({ open: false, order: null, customerName: '', customerPhone: '', message: '' });
  };

  // Handle WhatsApp dialog skip (mark as ready without sending WhatsApp)
  const handleWhatsAppSkip = async () => {
    if (!whatsAppDialog.order) return;
    // Mark order as ready without sending WhatsApp
    await handleMarkAsReady(whatsAppDialog.order);
    setWhatsAppDialog({ open: false, order: null, customerName: '', customerPhone: '', message: '' });
  };

  // Filter orders based on current view using the new status flow
  const getFilteredOrders = (): ServiceOrderWithCompany[] => {
    switch (currentView) {
      case 'awaiting':
        return allOrders.filter((o) => o.orderStatus === 'awaiting');
      case 'inprogress':
        return allOrders.filter((o) => o.orderStatus === 'inprogress');
      case 'ready':
        return allOrders.filter((o) => o.orderStatus === 'ready');
      case 'rejected':
        return allOrders.filter((o) => o.orderStatus === 'rejected');
      case 'all-orders':
        return allOrders;
      default:
        return recentOrders;
    }
  };

  const getViewTitle = (): string => {
    switch (currentView) {
      case 'awaiting':
        return 'Awaiting Acceptance';
      case 'inprogress':
        return 'In Progress Orders';
      case 'ready':
        return 'Ready to Deliver Orders';
      case 'rejected':
        return 'Rejected Orders';
      case 'all-orders':
        return 'All Orders';
      default:
        return 'Recent Orders';
    }
  };

  // Get status badge based on new unified status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'awaiting':
        return <Badge className="bg-blue-500 text-white">Awaiting</Badge>;
      case 'inprogress':
        return <Badge className="bg-orange-500 text-white">In Progress</Badge>;
      case 'ready':
        return <Badge className="bg-green-500 text-white">Ready</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500 text-white">Rejected</Badge>;
      case 'delivered':
        return <Badge className="bg-gray-500 text-white">Delivered</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const dashStats = [
    {
      label: 'Awaiting',
      value: stats.awaitingOrders,
      icon: ListChecks,
      gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
      bgGradient: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fed7aa 100%)',
      borderColor: 'rgba(249, 115, 22, 0.5)',
      view: 'awaiting' as TailorView,
    },
    {
      label: 'In Progress',
      value: stats.inProgress,
      icon: ClockCounterClockwise,
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      bgGradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #bfdbfe 100%)',
      borderColor: 'rgba(59, 130, 246, 0.5)',
      view: 'inprogress' as TailorView,
    },
    {
      label: 'Ready to Deliver',
      value: stats.readyToDeliver,
      icon: Package,
      gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
      bgGradient: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)',
      borderColor: 'rgba(34, 197, 94, 0.5)',
      view: 'ready' as TailorView,
    },
    {
      label: 'Rejected',
      value: stats.rejectedOrders,
      icon: XCircle,
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      bgGradient: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 50%, #fecaca 100%)',
      borderColor: 'rgba(239, 68, 68, 0.5)',
      view: 'rejected' as TailorView,
    },
    {
      label: 'Total Orders',
      value: stats.totalOrders,
      icon: CheckCircle,
      gradient: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #6366f1 100%)',
      bgGradient: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 50%, #e0e7ff 100%)',
      borderColor: 'rgba(196, 181, 253, 0.5)',
      view: 'all-orders' as TailorView,
    },
  ];

  // Filter orders based on search
  const getFilteredOrdersWithSearch = (): OrderAllotment[] => {
    const baseOrders = getFilteredOrders();
    if (!search) return baseOrders;

    return baseOrders.filter((order) =>
      order.serviceOrderNo.toLowerCase().includes(search.toLowerCase()) ||
      order.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (order.jobWorkNo?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (order.dressItemName?.toLowerCase().includes(search.toLowerCase()) ?? false)
    );
  };

  // Pagination
  const filteredOrders = getFilteredOrdersWithSearch();
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const showPagination = filteredOrders.length > ITEMS_PER_PAGE;

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, currentView]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!employee) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading employee data...</p>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Spinner size={48} className="animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show Profile view
  if (currentView === 'profile') {
    return (
      <TailorProfile
        vendorId={employee.id}
        onBack={() => setCurrentView('dashboard')}
      />
    );
  }

  return (
    <main className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        {currentView !== 'dashboard' && (
          <Button variant="ghost" size="icon" onClick={() => setCurrentView('dashboard')} className="h-9 w-9">
            <ArrowLeft size={20} />
          </Button>
        )}
        <div>
          <h1 className="text-lg sm:text-xl font-bold">
            {currentView === 'dashboard' ? 'Employee Dashboard' : getViewTitle()}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Welcome back, {employee.name}
          </p>
        </div>
      </div>

      {/* Summary Cards - Only show on dashboard view */}
      {currentView === 'dashboard' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {dashStats.map((stat, index) => (
            <div
              key={index}
              className={`cursor-pointer hover:shadow-lg transition-all rounded-xl border-2 p-4 animate-on-load animate-fade-slide-up stagger-${index + 1}`}
              style={{
                background: stat.bgGradient,
                borderColor: stat.borderColor,
                boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.1), 0 2px 6px -2px rgba(0, 0, 0, 0.08)',
              }}
              onClick={() => setCurrentView(stat.view)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs font-medium text-gray-600 mb-1">
                    {stat.label}
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div
                  className="p-2 sm:p-3 rounded-xl shadow-md"
                  style={{ background: stat.gradient }}
                >
                  <stat.icon size={20} className="text-white sm:w-6 sm:h-6" weight="duotone" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search Bar - Only show when not on dashboard view */}
      {currentView !== 'dashboard' && (
        <div className="relative">
          <MagnifyingGlass
            size={18}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="text"
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 w-full sm:max-w-md"
          />
        </div>
      )}

      {/* Orders Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center h-9">
          <h2 className="text-sm md:text-xl font-semibold line-clamp-1">
            {currentView === 'dashboard' ? 'Recent Orders' : getViewTitle()}
          </h2>
          <span className="text-xs sm:text-sm text-muted-foreground">
            {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
          </span>
        </div>

        {loading ? (
          <div
            className="p-8 rounded-xl border-2 text-center"
            style={{
              background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 50%, #e0e7ff 100%)',
              borderColor: 'rgba(196, 181, 253, 0.5)',
            }}
          >
            <p className="text-muted-foreground">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            icon={Package}
            title={search ? 'No orders found' : 'No orders yet'}
            description={search ? 'Try adjusting your search terms' : 'Orders assigned to you will appear here'}
          />
        ) : (
          <div
            className="p-3 sm:p-4 w-full max-w-full flex flex-col gap-4 overflow-hidden rounded-xl border shadow-md"
            style={{
              background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 50%, #e0e7ff 100%)',
              borderColor: 'rgba(196, 181, 253, 0.5)',
            }}
          >
            {/* Order Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {paginatedOrders.map((order, index) => (
                <div
                  key={order.id}
                  className={`rounded-xl border-2 hover:shadow-lg transition-all p-4 cursor-pointer w-full flex flex-row gap-4 shadow-sm animate-on-load animate-fade-slide-up stagger-${(index % 6) + 1}`}
                  style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #faf8ff 100%)',
                    borderColor: '#6A64F2',
                    boxShadow: '0 4px 12px -2px rgba(106, 100, 242, 0.2), 0 2px 6px -2px rgba(106, 100, 242, 0.15)',
                  }}
                  onClick={() => handleViewOrderDetails(order)}
                >
                  {/* Left side: Avatar */}
                  <div className="flex-shrink-0 flex items-center">
                    <div
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #6366f1 100%)' }}
                    >
                      {getInitials(order.customerName)}
                    </div>
                  </div>

                  {/* Middle: Order details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                        {order.customerName}
                      </p>
                    </div>
                    <p className="text-[10px] sm:text-xs font-bold mb-1" style={{ color: '#6A64F2' }}>
                      {order.jobWorkNo || order.id}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-600 flex-wrap">
                      {order.orderCategory && (
                        <>
                          <span className="font-medium capitalize">{order.orderCategory}</span>
                          <span>•</span>
                        </>
                      )}
                      {getStatusBadge(order.orderStatus)}
                    </div>
                    <p className="text-[9px] sm:text-[10px] text-gray-500 mt-1">
                      <Calendar size={10} className="inline mr-1" />
                      {format(new Date(order.serviceOrderDate || order.createdAt || Date.now()), 'dd MMM yyyy')}
                    </p>
                  </div>

                  {/* Right side: Actions */}
                  <div className="flex-shrink-0 flex flex-col items-end justify-between gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 touch-manipulation">
                          <DotsThree size={20} weight="bold" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            handleViewOrderDetails(order);
                          }}
                          className="font-medium"
                        >
                          <Eye size={18} className="mr-2" weight="bold" />
                          View Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Action buttons based on new status flow */}
                    <div className="flex flex-col gap-1.5">
                      {/* Awaiting status - Show Accept/Reject */}
                      {order.orderStatus === 'awaiting' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openConfirmDialog('accept', order);
                            }}
                            disabled={acceptingOrder === order.id}
                            className="text-[10px] sm:text-xs h-7 px-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                          >
                            <Check size={14} className="mr-1" />
                            {acceptingOrder === order.id ? '...' : 'Accept'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openConfirmDialog('reject', order);
                            }}
                            disabled={rejectingOrder === order.id}
                            className="text-[10px] sm:text-xs h-7 px-2 bg-red-50 hover:bg-red-100 text-red-700 border-red-300"
                          >
                            <X size={14} className="mr-1" />
                            {rejectingOrder === order.id ? '...' : 'Reject'}
                          </Button>
                        </>
                      )}
                      {/* In Progress status - Show Mark Ready */}
                      {order.orderStatus === 'inprogress' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openConfirmDialog('ready', order);
                          }}
                          disabled={markingReady === order.id}
                          className="text-[10px] sm:text-xs h-7 px-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                        >
                          <CheckCircle size={14} className="mr-1" weight="duotone" />
                          {markingReady === order.id ? '...' : 'Ready'}
                        </Button>
                      )}
                      {/* Ready status - Show Mark Delivered */}
                      {order.orderStatus === 'ready' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkDelivered(order);
                          }}
                          disabled={markingDelivered === order.id}
                          className="text-[10px] sm:text-xs h-7 px-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                        >
                          {markingDelivered === order.id ? (
                            <>
                              <Spinner size={14} className="mr-1 animate-spin" />
                              ...
                            </>
                          ) : (
                            <>
                              <CheckCircle size={14} className="mr-1" weight="bold" />
                              Delivered
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {showPagination && (
              <div className="flex items-center justify-between pt-4 border-t border-purple-200">
                <p className="text-xs sm:text-sm text-gray-600">
                  Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredOrders.length)} of {filteredOrders.length}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8 px-3 text-xs"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 px-3 text-xs"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Employee Order Details — no payment/pricing */}
      {selectedOrder && (
        <EmployeeOrderDetailsDialog
          serviceOrder={selectedOrder}
          open={showOrderDetails}
          onClose={() => {
            setShowOrderDetails(false);
            setSelectedOrder(null);
          }}
          onStatusUpdated={(updated) => {
            setSelectedOrder((prev) => (prev ? { ...prev, ...updated } : prev));
          }}
        />
      )}

      {/* Status Change Confirmation Dialog */}
      <StatusChangeConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => !open && closeConfirmDialog()}
        onConfirm={handleConfirmAction}
        type={confirmDialog.type}
        orderInfo={{
          orderNo: confirmDialog.order?.jobWorkNo || confirmDialog.order?.id,
          customerName: confirmDialog.order?.customerName,
        }}
        isLoading={
          acceptingOrder === confirmDialog.order?.id ||
          markingReady === confirmDialog.order?.id
        }
      />

      {/* Rejection Reason Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => !open && closeRejectDialog()}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <XCircle size={24} weight="bold" />
              Reject Order
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Order:</span> {rejectDialog.order?.jobWorkNo || rejectDialog.order?.id}
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-medium">Customer:</span> {rejectDialog.order?.customerName}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rejectionReason" className="text-sm font-medium">
                Reason for Rejection *
              </Label>
              <Textarea
                id="rejectionReason"
                placeholder="Please provide a reason for rejecting this order..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[100px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                This reason will be shared with the admin.
              </p>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={closeRejectDialog}
              disabled={rejectingOrder === rejectDialog.order?.id}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (rejectDialog.order && rejectionReason.trim()) {
                  handleRejectOrder(rejectDialog.order, rejectionReason.trim());
                } else if (!rejectionReason.trim()) {
                  toast.error('Please provide a reason for rejection');
                }
              }}
              disabled={rejectingOrder === rejectDialog.order?.id || !rejectionReason.trim()}
            >
              {rejectingOrder === rejectDialog.order?.id ? (
                <>
                  <Spinner size={16} className="mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Reject Order'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Confirmation Dialog for Ready to Delivery */}
      <WhatsAppConfirmationDialog
        open={whatsAppDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setWhatsAppDialog({ open: false, order: null, customerName: '', customerPhone: '', message: '' });
          }
        }}
        title="Notify Customer - Order Ready"
        description="Send order ready notification to customer via WhatsApp"
        messageData={{
          customerName: whatsAppDialog.customerName,
          customerPhone: whatsAppDialog.customerPhone,
          message: whatsAppDialog.message,
        }}
        onSend={handleWhatsAppSend}
        onSkip={handleWhatsAppSkip}
        sendButtonText="Send & Mark Ready"
        skipButtonText="Skip & Mark Ready"
      />
    </main>
  );
}

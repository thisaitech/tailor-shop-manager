import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { OrderAllotment } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OrderDetailsDialog } from '@/components/OrderDetailsDialog';
import { TailorProfile } from '@/components/TailorProfile';
import { EmptyState } from '@/components/EmptyState';
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
} from '@phosphor-icons/react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  getOrderAllotmentsByTailor,
  updateOrderAllotmentStatus,
  updateOrderAllotmentWithServiceStatus,
  rejectOrderAllotment,
} from '@/lib/firestore/orderAllotmentService';
import {
  updateServiceOrderStatus,
  getServiceOrderById,
} from '@/lib/firestore/serviceOrderService';
import { notifyOrderReady } from '@/lib/notificationService';
import { getCustomerById } from '@/lib/firestore/customerService';
import { getCompanyProfile } from '@/lib/firestore/companyService';
import { sendOrderReadyEmail, sendOrderRejectionEmail } from '@/lib/emailService';

interface DashboardStats {
  assignedOrders: number;
  inProgress: number;
  readyToDeliver: number;
  rejectedOrders: number;
  totalOrders: number;
}

type TailorView = 'dashboard' | 'assigned' | 'in-progress' | 'ready' | 'rejected' | 'all-orders' | 'profile';

const ITEMS_PER_PAGE = 6;

export function TailorDashboardFirestore() {
  const { employee } = useAuth();
  const [currentView, setCurrentView] = useState<TailorView>('dashboard');
  const [stats, setStats] = useState<DashboardStats>({
    assignedOrders: 0,
    inProgress: 0,
    readyToDeliver: 0,
    rejectedOrders: 0,
    totalOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState<OrderAllotment[]>([]);
  const [allOrders, setAllOrders] = useState<OrderAllotment[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingOrder, setAcceptingOrder] = useState<string | null>(null);
  const [rejectingOrder, setRejectingOrder] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderAllotment | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [markingReady, setMarkingReady] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (employee) {
      loadDashboardData();
    }
  }, [employee]);

  const loadDashboardData = async () => {
    if (!employee) return;

    try {
      setLoading(true);

      // Fetch all order allotments for this tailor
      const allotments = await getOrderAllotmentsByTailor(employee.id);

      // Store all orders for detailed views
      setAllOrders(allotments);

      // Calculate stats
      const assignedOrders = allotments.filter(
        (a) => a.orderStatus === 'open'
      ).length;

      const inProgress = allotments.filter(
        (a) => a.orderStatus === 'in-progress'
      ).length;

      // For ready to deliver, we need to check the service orders
      // Count orders that have been marked as ready
      const readyToDeliver = allotments.filter(
        (a) => a.serviceOrderStatus === 'ready'
      ).length;

      // Count rejected orders
      const rejectedOrders = allotments.filter(
        (a) => a.status === 'rejected'
      ).length;

      const totalOrders = allotments.length;

      setStats({
        assignedOrders,
        inProgress,
        readyToDeliver,
        rejectedOrders,
        totalOrders,
      });

      // Get recent orders (last 10, sorted by creation date descending)
      const sortedRecent = [...allotments]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 10);

      setRecentOrders(sortedRecent);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOrder = async (allotment: OrderAllotment) => {
    try {
      setAcceptingOrder(allotment.id);

      // Update order allotment status to "in-progress"
      await updateOrderAllotmentStatus(allotment.id, 'in-progress');

      // Update the service order status to reflect in admin's New Order section
      // The service order status should be updated based on allotment status
      // When tailor accepts, we update to 'job-network' status (work in progress at vendor/employee)
      await updateServiceOrderStatus(allotment.serviceOrderNo, 'job-network');

      console.log(`[TailorDashboard] Order ${allotment.id} accepted. Service order ${allotment.serviceOrderNo} updated to job-network status.`);

      toast.success('Order accepted and marked as In Progress');

      // Reload dashboard data
      await loadDashboardData();
    } catch (error) {
      console.error('Error accepting order:', error);
      toast.error('Failed to accept order');
    } finally {
      setAcceptingOrder(null);
    }
  };

  const handleRejectOrder = async (allotment: OrderAllotment) => {
    try {
      setRejectingOrder(allotment.id);

      // Reject the order in Firestore
      await rejectOrderAllotment(allotment.id, employee?.name);

      // Get company profile to send email to admin
      if (employee?.companyDocId) {
        try {
          const companyProfile = await getCompanyProfile(employee.companyDocId);

          if (companyProfile?.email) {
            // Send email notification to admin
            await sendOrderRejectionEmail({
              to: companyProfile.email,
              adminName: companyProfile.companyName || 'Admin',
              orderNumber: allotment.serviceOrderNo,
              jobWorkNo: allotment.jobWorkNo || allotment.id,
              vendorName: employee?.name || 'Tailor',
              vendorPhone: employee?.phone || 'N/A',
              customerName: allotment.customerName,
              dressType: allotment.dressItemName,
              rejectionDate: format(new Date(), 'dd MMM yyyy, hh:mm a'),
              companyName: companyProfile.companyName,
            });
            console.log('[TailorDashboard] Rejection email sent to admin');
          }
        } catch (emailError) {
          console.error('[TailorDashboard] Error sending rejection email:', emailError);
          // Don't fail the rejection if email fails
        }
      }

      toast.success('Order rejected successfully. Admin has been notified.');

      // Reload dashboard data to update the list
      await loadDashboardData();
    } catch (error) {
      console.error('Error rejecting order:', error);
      toast.error('Failed to reject order');
    } finally {
      setRejectingOrder(null);
    }
  };

  const handleViewOrderDetails = (allotment: OrderAllotment) => {
    setSelectedOrder(allotment);
    setShowOrderDetails(true);
  };

  const handleMarkAsReady = async (allotment: OrderAllotment) => {
    try {
      setMarkingReady(allotment.id);

      // Update order allotment status to "closed" and serviceOrderStatus to "ready"
      await updateOrderAllotmentWithServiceStatus(allotment.id, 'closed', 'ready');

      // Update the service order status to "ready"
      await updateServiceOrderStatus(allotment.serviceOrderNo, 'ready');

      console.log(`[TailorDashboard] Order ${allotment.id} marked as ready. Service order ${allotment.serviceOrderNo} updated to ready status.`);

      // Send WhatsApp/SMS and Email notification to customer
      try {
        // Get customer details
        const customer = await getCustomerById(allotment.customerId);

        if (customer) {
          console.log('[TailorDashboard] Sending notifications to customer:', customer.name);

          // Send WhatsApp/SMS notification if phone available
          if (customer.phone) {
            await notifyOrderReady(
              customer.name,
              customer.phone,
              allotment.serviceOrderNo,
              employee?.companyId
            );
          } else {
            console.warn('[TailorDashboard] Customer phone not available for SMS/WhatsApp notification');
          }

          // Send email notification if email available
          if (customer.email) {
            await sendOrderReadyEmail({
              to: customer.email,
              customerName: customer.name,
              orderNumber: allotment.serviceOrderNo,
              companyName: employee?.companyId,
            });
            console.log('[TailorDashboard] Email notification sent to:', customer.email);
          } else {
            console.warn('[TailorDashboard] Customer email not available for email notification');
          }

          toast.success('Order marked as Ready to Deliver! Customer has been notified.');
        } else {
          toast.success('Order marked as Ready to Deliver!');
          console.warn('[TailorDashboard] Customer details not found');
        }
      } catch (notificationError) {
        console.error('[TailorDashboard] Error sending notification:', notificationError);
        toast.success('Order marked as Ready to Deliver!');
      }

      // Reload dashboard data
      await loadDashboardData();
    } catch (error) {
      console.error('Error marking order as ready:', error);
      toast.error('Failed to mark order as ready');
    } finally {
      setMarkingReady(null);
    }
  };

  const getFilteredOrders = (): OrderAllotment[] => {
    switch (currentView) {
      case 'assigned':
        return allOrders.filter((a) => a.orderStatus === 'open');
      case 'in-progress':
        return allOrders.filter((a) => a.orderStatus === 'in-progress');
      case 'ready':
        return allOrders.filter((a) => a.serviceOrderStatus === 'ready');
      case 'rejected':
        return allOrders.filter((a) => a.status === 'rejected');
      case 'all-orders':
        return allOrders;
      default:
        return recentOrders;
    }
  };

  const getViewTitle = (): string => {
    switch (currentView) {
      case 'assigned':
        return 'Assigned Orders';
      case 'in-progress':
        return 'In Progress Orders';
      case 'ready':
        return 'Ready to Deliver Orders';
      case 'rejected':
        return 'Rejected Orders';
      case 'all-orders':
        return 'All Orders';
      default:
        return 'Recent Assigned Orders';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="secondary">Open</Badge>;
      case 'in-progress':
        return <Badge className="bg-blue-500">In Progress</Badge>;
      case 'closed':
        return <Badge className="bg-green-500">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const dashStats = [
    {
      label: 'Assigned Orders',
      value: stats.assignedOrders,
      icon: ListChecks,
      gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
      bgGradient: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fed7aa 100%)',
      borderColor: 'rgba(249, 115, 22, 0.5)',
      view: 'assigned' as TailorView,
    },
    {
      label: 'In Progress',
      value: stats.inProgress,
      icon: ClockCounterClockwise,
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      bgGradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #bfdbfe 100%)',
      borderColor: 'rgba(59, 130, 246, 0.5)',
      view: 'in-progress' as TailorView,
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
      label: 'Rejected Orders',
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
                      {order.serviceOrderNo}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-600 flex-wrap">
                      {order.dressItemName && (
                        <>
                          <span className="font-medium">{order.dressItemName}</span>
                          <span>•</span>
                        </>
                      )}
                      {getStatusBadge(order.orderStatus)}
                    </div>
                    <p className="text-[9px] sm:text-[10px] text-gray-500 mt-1">
                      <Calendar size={10} className="inline mr-1" />
                      {format(new Date(order.createdAt), 'dd MMM yyyy')}
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
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewOrderDetails(order); }} className="font-medium">
                          <Eye size={18} className="mr-2" weight="bold" />
                          View Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-1.5">
                      {order.orderStatus === 'open' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcceptOrder(order);
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
                              handleRejectOrder(order);
                            }}
                            disabled={rejectingOrder === order.id}
                            className="text-[10px] sm:text-xs h-7 px-2 bg-red-50 hover:bg-red-100 text-red-700 border-red-300"
                          >
                            <X size={14} className="mr-1" />
                            {rejectingOrder === order.id ? '...' : 'Reject'}
                          </Button>
                        </>
                      )}
                      {order.orderStatus === 'in-progress' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsReady(order);
                          }}
                          disabled={markingReady === order.id}
                          className="text-[10px] sm:text-xs h-7 px-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                        >
                          <CheckCircle size={14} className="mr-1" weight="duotone" />
                          {markingReady === order.id ? '...' : 'Ready'}
                        </Button>
                      )}
                      {order.serviceOrderStatus === 'ready' && (
                        <Badge className="text-[10px] bg-green-500 text-white">Completed</Badge>
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

      {/* Order Details Dialog */}
      {selectedOrder && (
        <OrderDetailsDialog
          allotment={selectedOrder}
          open={showOrderDetails}
          onClose={() => {
            setShowOrderDetails(false);
            setSelectedOrder(null);
          }}
        />
      )}
    </main>
  );
}

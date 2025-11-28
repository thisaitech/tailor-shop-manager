import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  XCircle,
  ArrowLeft,
  MagnifyingGlass,
  DotsThree,
  Eye,
  Calendar,
  Check,
  X,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { OrderAllotment } from '@/lib/types';
import {
  getOrderAllotmentsByVendor,
  updateVendorOrderStatus,
} from '@/lib/firestore/orderAllotmentService';
import { getCustomerById } from '@/lib/firestore/customerService';
import { getCompanyProfile } from '@/lib/firestore/companyService';
import { sendOrderRejectionEmail } from '@/lib/emailService';
import { format } from 'date-fns';
import { JobWorkFilteredOrders } from './JobWorkFilteredOrders';
import { JobWorkOrderDetailsDialog } from './JobWorkOrderDetailsDialog';

interface OrderWithCustomer extends OrderAllotment {
  customerName?: string;
}

type DashboardView = 'dashboard' | 'assigned' | 'in_progress' | 'stitched' | 'rejected' | 'all';

const ITEMS_PER_PAGE = 6;

export function JobWorkTailorDashboard() {
  const { vendor } = useAuth();
  const [orders, setOrders] = useState<OrderWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<DashboardView>('dashboard');
  const [selectedOrderNo, setSelectedOrderNo] = useState<string | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [acceptingOrder, setAcceptingOrder] = useState<string | null>(null);
  const [rejectingOrder, setRejectingOrder] = useState<string | null>(null);
  const [markingStitched, setMarkingStitched] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Summary counts
  const assignedOrders = orders.filter(o =>
    o.status !== 'rejected' &&
    o.status !== 'stitched' &&
    o.status !== 'delivered' &&
    (o.status === 'allotted' || o.orderStatus === 'open')
  ).length;
  const inProgressOrders = orders.filter(o => (o.status === 'in_progress' || o.orderStatus === 'in-progress')).length;
  const stitchedOrders = orders.filter(o => o.status === 'stitched').length;
  const rejectedOrders = orders.filter(o => o.status === 'rejected').length;
  const totalOrders = orders.length;

  useEffect(() => {
    loadOrders();
  }, [vendor]);

  const loadOrders = async () => {
    if (!vendor?.tailorCode) return;

    try {
      setLoading(true);
      const allotments = await getOrderAllotmentsByVendor(vendor.tailorCode);

      // Fetch customer names
      const ordersWithCustomers = await Promise.all(
        allotments.map(async (order) => {
          try {
            const customer = await getCustomerById(order.customerId);
            return {
              ...order,
              customerName: customer?.name || 'Unknown',
            };
          } catch {
            return {
              ...order,
              customerName: 'Unknown',
            };
          }
        })
      );

      setOrders(ordersWithCustomers);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (orderId: string) => {
    try {
      setAcceptingOrder(orderId);
      await updateVendorOrderStatus(orderId, 'in_progress');
      setOrders(orders.map(o =>
        o.id === orderId ? { ...o, status: 'in_progress' } : o
      ));
      toast.success('Order accepted! Status updated to In Progress');
    } catch (error) {
      console.error('Error accepting order:', error);
      toast.error('Failed to accept order');
    } finally {
      setAcceptingOrder(null);
    }
  };

  const handleReject = async (orderId: string) => {
    try {
      setRejectingOrder(orderId);
      await updateVendorOrderStatus(orderId, 'rejected');
      const rejectedOrder = orders.find(o => o.id === orderId);

      setOrders(orders.map(o =>
        o.id === orderId ? { ...o, status: 'rejected' } : o
      ));

      toast.success('Order rejected. Admin has been notified.');

      // Send email notification to admin
      if (rejectedOrder && vendor) {
        try {
          const companyProfile = await getCompanyProfile(vendor.companyDocId);

          if (companyProfile?.email) {
            await sendOrderRejectionEmail({
              to: companyProfile.email,
              adminName: 'Admin',
              orderNumber: rejectedOrder.orderNumber,
              jobWorkNo: rejectedOrder.jobWorkNo,
              vendorName: vendor.tailorName,
              vendorPhone: vendor.contactNumber,
              customerName: rejectedOrder.customerName || 'Unknown',
              dressType: rejectedOrder.dressType,
              rejectionDate: format(Date.now(), 'dd MMM yyyy, hh:mm a'),
              companyName: companyProfile?.companyName,
            });
          }
        } catch (emailError) {
          console.error('Failed to send rejection email:', emailError);
        }
      }
    } catch (error) {
      console.error('Error rejecting order:', error);
      toast.error('Failed to reject order');
    } finally {
      setRejectingOrder(null);
    }
  };

  const handleMarkAsStitched = async (orderId: string) => {
    try {
      setMarkingStitched(orderId);
      await updateVendorOrderStatus(orderId, 'stitched');
      setOrders(orders.map(o =>
        o.id === orderId ? { ...o, status: 'stitched' } : o
      ));
      toast.success('Order marked as stitched!');
    } catch (error) {
      console.error('Error marking as stitched:', error);
      toast.error('Failed to mark as stitched');
    } finally {
      setMarkingStitched(null);
    }
  };

  const handleOrderRowClick = (order: OrderWithCustomer) => {
    if (!order.serviceOrderNo) {
      toast.error('Service Order Number not found');
      return;
    }
    setSelectedOrderNo(order.serviceOrderNo);
    setShowOrderDetails(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'assigned': return 'Assigned Orders';
      case 'in_progress': return 'In Progress Orders';
      case 'stitched': return 'Stitched Orders';
      case 'rejected': return 'Rejected Orders';
      case 'all': return 'All Orders';
      default: return 'Job Work Dashboard';
    }
  };

  const getFilteredOrders = (): OrderWithCustomer[] => {
    let filtered = orders;

    switch (currentView) {
      case 'assigned':
        filtered = orders.filter(o =>
          o.status !== 'rejected' &&
          o.status !== 'stitched' &&
          o.status !== 'delivered' &&
          (o.status === 'allotted' || o.orderStatus === 'open')
        );
        break;
      case 'in_progress':
        filtered = orders.filter(o => (o.status === 'in_progress' || o.orderStatus === 'in-progress'));
        break;
      case 'stitched':
        filtered = orders.filter(o => o.status === 'stitched');
        break;
      case 'rejected':
        filtered = orders.filter(o => o.status === 'rejected');
        break;
      case 'all':
        filtered = orders;
        break;
      case 'dashboard':
        // Recent orders (allotted and in_progress only)
        filtered = orders.filter(o =>
          o.status !== 'rejected' &&
          o.status !== 'stitched' &&
          o.status !== 'delivered' &&
          (o.status === 'allotted' || o.status === 'in_progress' || o.orderStatus === 'open' || o.orderStatus === 'in-progress')
        );
        break;
    }

    // Apply search filter
    if (search) {
      filtered = filtered.filter((order) =>
        order.jobWorkNo?.toLowerCase().includes(search.toLowerCase()) ||
        order.customerName?.toLowerCase().includes(search.toLowerCase()) ||
        order.serviceOrderNo?.toLowerCase().includes(search.toLowerCase()) ||
        order.dressType?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) => {
      const aDate = a.assignedDate || a.jobWorkDate || a.createdAt;
      const bDate = b.assignedDate || b.jobWorkDate || b.createdAt;
      return bDate - aDate;
    });
  };

  const getStatusBadge = (order: OrderWithCustomer) => {
    const currentStatus = order.status || (order.orderStatus === 'open' ? 'allotted' : order.orderStatus === 'in-progress' ? 'in_progress' : 'unknown');

    switch (currentStatus) {
      case 'allotted':
        return <Badge className="text-[10px] bg-blue-500 text-white">Assigned</Badge>;
      case 'in_progress':
        return <Badge className="text-[10px] bg-orange-500 text-white">In Progress</Badge>;
      case 'stitched':
        return <Badge className="text-[10px] bg-green-500 text-white">Stitched</Badge>;
      case 'rejected':
        return <Badge className="text-[10px] bg-red-500 text-white">Rejected</Badge>;
      default:
        return <Badge className="text-[10px] bg-gray-500 text-white">{currentStatus}</Badge>;
    }
  };

  // Pagination
  const filteredOrders = getFilteredOrders();
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const showPagination = filteredOrders.length > ITEMS_PER_PAGE;

  // Reset page when search or view changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, currentView]);

  const dashStats = [
    {
      label: 'Assigned Orders',
      value: assignedOrders,
      icon: Package,
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      bgGradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #bfdbfe 100%)',
      borderColor: 'rgba(59, 130, 246, 0.5)',
      view: 'assigned' as DashboardView,
    },
    {
      label: 'In Progress',
      value: inProgressOrders,
      icon: ClockCounterClockwise,
      gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
      bgGradient: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fed7aa 100%)',
      borderColor: 'rgba(249, 115, 22, 0.5)',
      view: 'in_progress' as DashboardView,
    },
    {
      label: 'Stitched',
      value: stitchedOrders,
      icon: CheckCircle,
      gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
      bgGradient: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)',
      borderColor: 'rgba(34, 197, 94, 0.5)',
      view: 'stitched' as DashboardView,
    },
    {
      label: 'Rejected',
      value: rejectedOrders,
      icon: XCircle,
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      bgGradient: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 50%, #fecaca 100%)',
      borderColor: 'rgba(239, 68, 68, 0.5)',
      view: 'rejected' as DashboardView,
    },
    {
      label: 'Total Orders',
      value: totalOrders,
      icon: ListChecks,
      gradient: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #6366f1 100%)',
      bgGradient: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 50%, #e0e7ff 100%)',
      borderColor: 'rgba(196, 181, 253, 0.5)',
      view: 'all' as DashboardView,
    },
  ];

  if (!vendor) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading vendor data...</p>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-6 space-y-6">
      {/* Page Title */}
      <div className="flex items-center gap-3">
        {currentView !== 'dashboard' && (
          <Button variant="outline" size="icon" onClick={() => setCurrentView('dashboard')} className="h-9 w-9">
            <ArrowLeft size={20} />
          </Button>
        )}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">
            {currentView === 'dashboard' ? 'Job Work Dashboard' : getViewTitle()}
          </h1>
          <p className="text-xs text-muted-foreground">
            Welcome, {vendor.tailorName}
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
                {paginatedOrders.map((order, index) => {
                  const currentStatus = order.status || (order.orderStatus === 'open' ? 'allotted' : order.orderStatus === 'in-progress' ? 'in_progress' : 'unknown');
                  const displayDate = order.assignedDate || order.jobWorkDate || order.createdAt;

                  return (
                    <div
                      key={order.id}
                      className={`rounded-xl border-2 hover:shadow-lg transition-all p-4 cursor-pointer w-full flex flex-row gap-4 shadow-sm animate-on-load animate-fade-slide-up stagger-${(index % 6) + 1}`}
                      style={{
                        background: 'linear-gradient(135deg, #ffffff 0%, #faf8ff 100%)',
                        borderColor: '#6A64F2',
                        boxShadow: '0 4px 12px -2px rgba(106, 100, 242, 0.2), 0 2px 6px -2px rgba(106, 100, 242, 0.15)',
                      }}
                      onClick={() => handleOrderRowClick(order)}
                    >
                      {/* Left side: Avatar */}
                      <div className="flex-shrink-0 flex items-center">
                        <div
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white font-bold text-sm"
                          style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #6366f1 100%)' }}
                        >
                          {getInitials(order.customerName || 'UN')}
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
                          {order.dressType && (
                            <>
                              <span className="font-medium">{order.dressType}</span>
                              <span>•</span>
                            </>
                          )}
                          {getStatusBadge(order)}
                        </div>
                        <p className="text-[9px] sm:text-[10px] text-gray-500 mt-1">
                          <Calendar size={10} className="inline mr-1" />
                          {format(displayDate, 'dd MMM yyyy')}
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
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOrderRowClick(order); }} className="font-medium">
                              <Eye size={18} className="mr-2" weight="bold" />
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Action buttons */}
                        <div className="flex flex-col gap-1.5">
                          {currentStatus === 'allotted' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAccept(order.id);
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
                                  handleReject(order.id);
                                }}
                                disabled={rejectingOrder === order.id}
                                className="text-[10px] sm:text-xs h-7 px-2 bg-red-50 hover:bg-red-100 text-red-700 border-red-300"
                              >
                                <X size={14} className="mr-1" />
                                {rejectingOrder === order.id ? '...' : 'Reject'}
                              </Button>
                            </>
                          )}
                          {currentStatus === 'in_progress' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsStitched(order.id);
                              }}
                              disabled={markingStitched === order.id}
                              className="text-[10px] sm:text-xs h-7 px-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                            >
                              <CheckCircle size={14} className="mr-1" weight="duotone" />
                              {markingStitched === order.id ? '...' : 'Stitched'}
                            </Button>
                          )}
                          {currentStatus === 'stitched' && (
                            <Badge className="text-[10px] bg-green-500 text-white">Completed</Badge>
                          )}
                          {currentStatus === 'rejected' && (
                            <Badge className="text-[10px] bg-red-500 text-white">Rejected</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
        {selectedOrderNo && (
          <JobWorkOrderDetailsDialog
            serviceOrderNo={selectedOrderNo}
            open={showOrderDetails}
            onOpenChange={setShowOrderDetails}
            onStatusUpdate={loadOrders}
          />
        )}
    </main>
  );
}

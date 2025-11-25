import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { OrderAllotment } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { OrderDetailsDialog } from '@/components/OrderDetailsDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Package,
  ClockCounterClockwise,
  CheckCircle,
  ListChecks,
  SignOut,
  Check,
  X,
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
  totalOrders: number;
}

type TailorView = 'dashboard' | 'assigned' | 'in-progress' | 'ready' | 'all-orders';

export function TailorDashboardFirestore() {
  const { logout, employee } = useAuth();
  const [currentView, setCurrentView] = useState<TailorView>('dashboard');
  const [stats, setStats] = useState<DashboardStats>({
    assignedOrders: 0,
    inProgress: 0,
    readyToDeliver: 0,
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

      const totalOrders = allotments.length;

      setStats({
        assignedOrders,
        inProgress,
        readyToDeliver,
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
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      view: 'assigned' as TailorView,
    },
    {
      label: 'In Progress',
      value: stats.inProgress,
      icon: ClockCounterClockwise,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      view: 'in-progress' as TailorView,
    },
    {
      label: 'Ready to Deliver',
      value: stats.readyToDeliver,
      icon: Package,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      view: 'ready' as TailorView,
    },
    {
      label: 'Total Orders',
      value: stats.totalOrders,
      icon: CheckCircle,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      view: 'all-orders' as TailorView,
    },
  ];

  if (!employee) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading employee data...</p>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-6">
      {/* Header with Menu Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {currentView !== 'dashboard' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentView('dashboard')}
            >
              ← Back to Dashboard
            </Button>
          )}
          <div>
            <h2 className="text-2xl font-bold">Tailor Dashboard</h2>
            <p className="text-muted-foreground">
              Welcome back, {employee.name}
            </p>
          </div>
        </div>

        <Button variant="outline" onClick={logout}>
          <SignOut size={16} className="mr-2" />
          Logout
        </Button>
      </div>

      {/* Summary Cards - Only show on dashboard view */}
      {currentView === 'dashboard' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {dashStats.map((stat, index) => (
            <Card
              key={index}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setCurrentView(stat.view)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      {stat.label}
                    </p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`${stat.bgColor} ${stat.color} p-3 rounded-lg`}>
                    <stat.icon size={24} weight="duotone" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>{getViewTitle()}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Loading orders...</p>
            </div>
          ) : getFilteredOrders().length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">
                No orders found
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order No</TableHead>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Assigned Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getFilteredOrders().map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        <button
                          onClick={() => handleViewOrderDetails(order)}
                          className="text-primary hover:underline cursor-pointer"
                        >
                          {order.serviceOrderNo}
                        </button>
                      </TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell>
                        {format(new Date(order.createdAt), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>{getStatusBadge(order.orderStatus)}</TableCell>
                      <TableCell>
                        {order.orderStatus === 'open' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAcceptOrder(order)}
                              disabled={acceptingOrder === order.id}
                              className="text-xs bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                            >
                              <Check size={14} className="mr-1" />
                              {acceptingOrder === order.id ? 'Accepting...' : 'Accept'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectOrder(order)}
                              disabled={rejectingOrder === order.id}
                              className="text-xs bg-red-50 hover:bg-red-100 text-red-700 border-red-300"
                            >
                              <X size={14} className="mr-1" />
                              {rejectingOrder === order.id ? 'Rejecting...' : 'Reject'}
                            </Button>
                          </div>
                        )}
                        {order.orderStatus === 'in-progress' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkAsReady(order)}
                            disabled={markingReady === order.id}
                            className="text-xs bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                          >
                            <CheckCircle size={14} className="mr-1" weight="duotone" />
                            {markingReady === order.id ? 'Updating...' : 'Mark as Ready'}
                          </Button>
                        )}
                        {order.serviceOrderStatus === 'ready' && (
                          <span className="text-xs text-green-600 font-medium">Completed</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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

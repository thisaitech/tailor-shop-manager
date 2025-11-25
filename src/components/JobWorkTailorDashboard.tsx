import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ClockCountdown, CheckCircle, ListChecks, XCircle } from '@phosphor-icons/react';
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

export function JobWorkTailorDashboard() {
  const { vendor } = useAuth();
  const [orders, setOrders] = useState<OrderWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterView, setFilterView] = useState<'all' | 'assigned' | 'in_progress' | 'stitched' | 'rejected' | null>(null);
  const [selectedOrderNo, setSelectedOrderNo] = useState<string | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  // Summary counts
  const assignedOrders = orders.filter(o => (o.status === 'allotted' || o.orderStatus === 'open')).length;
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
      await updateVendorOrderStatus(orderId, 'in_progress');
      setOrders(orders.map(o =>
        o.id === orderId ? { ...o, status: 'in_progress' } : o
      ));
      toast.success('Order accepted! Status updated to In Progress');
    } catch (error) {
      console.error('Error accepting order:', error);
      toast.error('Failed to accept order');
    }
  };

  const handleReject = async (orderId: string) => {
    try {
      await updateVendorOrderStatus(orderId, 'rejected');
      const rejectedOrder = orders.find(o => o.id === orderId);

      setOrders(orders.map(o =>
        o.id === orderId ? { ...o, status: 'rejected' } : o
      ));

      toast.success('Order rejected. Admin has been notified.');

      // Send email notification to admin
      if (rejectedOrder && vendor) {
        try {
          // Get company profile to get company name and admin email
          const companyProfile = await getCompanyProfile(vendor.companyDocId);

          // Only send email if company profile has an email configured
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
            console.log('Rejection email sent successfully to:', companyProfile.email);
          } else {
            console.log('No admin email configured in company profile - skipping email notification');
          }
        } catch (emailError) {
          console.error('Failed to send rejection email:', emailError);
          // Don't show error to user - order was rejected successfully
        }
      }
    } catch (error) {
      console.error('Error rejecting order:', error);
      toast.error('Failed to reject order');
    }
  };

  const handleCardClick = (filterType: 'all' | 'assigned' | 'in_progress' | 'stitched' | 'rejected') => {
    setFilterView(filterType);
  };

  const handleOrderRowClick = (order: OrderWithCustomer) => {
    setSelectedOrderNo(order.serviceOrderNo);
    setShowOrderDetails(true);
  };

  // If filter view is active, show filtered orders page
  if (filterView) {
    return (
      <JobWorkFilteredOrders
        orders={orders}
        filterType={filterView}
        onBack={() => setFilterView(null)}
        onOrderUpdate={loadOrders}
      />
    );
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Filter recent orders (only show allotted and in_progress orders, exclude rejected, stitched, and delivered)
  const recentOrders = orders
    .filter(o =>
      o.status !== 'rejected' &&
      o.status !== 'stitched' &&
      o.status !== 'delivered' &&
      (o.status === 'allotted' || o.status === 'in_progress' || o.orderStatus === 'open' || o.orderStatus === 'in-progress')
    )
    .sort((a, b) => {
      const aDate = a.assignedDate || a.jobWorkDate || a.createdAt;
      const bDate = b.assignedDate || b.jobWorkDate || b.createdAt;
      return bDate - aDate;
    })
    .slice(0, 10);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Job Work Dashboard</h1>
        <p className="text-muted-foreground">Welcome, {vendor?.tailorName}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Assigned Orders */}
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleCardClick('assigned')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package size={24} className="text-blue-600" weight="duotone" />
              </div>
              <div>
                <p className="text-2xl font-bold">{assignedOrders}</p>
                <p className="text-xs text-muted-foreground">Assigned</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleCardClick('in_progress')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <ClockCountdown size={24} className="text-orange-600" weight="duotone" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inProgressOrders}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stitched Orders */}
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleCardClick('stitched')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle size={24} className="text-green-600" weight="duotone" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stitchedOrders}</p>
                <p className="text-xs text-muted-foreground">Stitched</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rejected Orders */}
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleCardClick('rejected')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle size={24} className="text-red-600" weight="duotone" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rejectedOrders}</p>
                <p className="text-xs text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Orders */}
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleCardClick('all')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ListChecks size={24} className="text-purple-600" weight="duotone" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalOrders}</p>
                <p className="text-xs text-muted-foreground">Total Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Assigned Orders Table */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Recent Assigned Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package size={48} className="mx-auto mb-3 opacity-30" />
              <p>No orders assigned yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">Order No</th>
                    <th className="text-left p-3 text-sm font-medium">Customer Name</th>
                    <th className="text-left p-3 text-sm font-medium">Assigned Date</th>
                    <th className="text-left p-3 text-sm font-medium">Status</th>
                    <th className="text-left p-3 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentOrders.map((order) => {
                    // Normalize status - handle both old (status) and new (orderStatus) fields
                    const currentStatus = order.status || (order.orderStatus === 'open' ? 'allotted' : order.orderStatus === 'in-progress' ? 'in_progress' : 'unknown');
                    const displayDate = order.assignedDate || order.jobWorkDate || order.createdAt;

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-muted/30"
                      >
                        <td
                          className="p-3 text-sm font-medium cursor-pointer hover:text-primary"
                          onClick={() => handleOrderRowClick(order)}
                        >
                          {order.jobWorkNo || order.id}
                        </td>
                        <td
                          className="p-3 text-sm cursor-pointer"
                          onClick={() => handleOrderRowClick(order)}
                        >
                          {order.customerName}
                        </td>
                        <td
                          className="p-3 text-sm cursor-pointer"
                          onClick={() => handleOrderRowClick(order)}
                        >
                          {format(displayDate, 'dd MMM yyyy')}
                        </td>
                        <td
                          className="p-3 cursor-pointer"
                          onClick={() => handleOrderRowClick(order)}
                        >
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                            currentStatus === 'allotted'
                              ? 'bg-blue-100 text-blue-700'
                              : currentStatus === 'in_progress'
                              ? 'bg-orange-100 text-orange-700'
                              : currentStatus === 'stitched'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {currentStatus === 'allotted' ? 'Assigned' :
                             currentStatus === 'in_progress' ? 'In Progress' :
                             currentStatus === 'stitched' ? 'Stitched' : currentStatus}
                          </span>
                        </td>
                        <td className="p-3">
                          {currentStatus === 'allotted' && (
                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAccept(order.id)}
                                className="text-xs bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(order.id)}
                                className="text-xs bg-red-50 hover:bg-red-100 text-red-700 border-red-300"
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                          {currentStatus === 'in_progress' && (
                            <div onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  try {
                                    await updateVendorOrderStatus(order.id, 'stitched');
                                    toast.success('Order marked as stitched!');
                                    loadOrders();
                                  } catch (error) {
                                    console.error('Error marking as stitched:', error);
                                    toast.error('Failed to mark as stitched');
                                  }
                                }}
                                className="text-xs bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                              >
                                Mark as Stitched
                              </Button>
                            </div>
                          )}
                          {currentStatus === 'stitched' && (
                            <span className="text-xs text-green-600">Completed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      {selectedOrderNo && (
        <JobWorkOrderDetailsDialog
          serviceOrderNo={selectedOrderNo}
          open={showOrderDetails}
          onOpenChange={setShowOrderDetails}
          onStatusUpdate={loadOrders}
        />
      )}
    </div>
  );
}

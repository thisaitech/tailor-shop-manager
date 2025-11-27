import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Package, Check, X } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { updateVendorOrderStatus } from '@/lib/firestore/orderAllotmentService';
import { JobWorkOrderDetailsDialog } from './JobWorkOrderDetailsDialog';

interface OrderWithCustomer {
  id: string;
  jobWorkNo?: string;
  serviceOrderNo: string;
  customerName?: string;
  dressType?: string;
  dressItemName?: string;
  assignedDate?: number;
  jobWorkDate?: number;
  createdAt: number;
  status?: 'allotted' | 'in_progress' | 'stitched' | 'rejected';
  orderStatus?: 'open' | 'in-progress' | 'closed';
}

interface JobWorkFilteredOrdersProps {
  orders: OrderWithCustomer[];
  filterType: 'assigned' | 'in_progress' | 'stitched' | 'rejected' | 'all';
  onBack: () => void;
  onOrderUpdate: () => void;
}

export function JobWorkFilteredOrders({
  orders,
  filterType,
  onBack,
  onOrderUpdate,
}: JobWorkFilteredOrdersProps) {
  const [selectedOrderNo, setSelectedOrderNo] = useState<string | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);

  // Filter orders based on type
  const filteredOrders = orders.filter(order => {
    if (filterType === 'all') return true;
    if (filterType === 'assigned') {
      // Only show allotted/reassigned orders, exclude in_progress, rejected, stitched, and delivered
      return (
        order.status !== 'rejected' &&
        order.status !== 'stitched' &&
        order.status !== 'delivered' &&
        order.status !== 'in_progress' &&
        order.orderStatus !== 'in-progress' &&
        (order.status === 'allotted' || order.status === 'reassigned' || order.orderStatus === 'open')
      );
    }
    if (filterType === 'in_progress') return order.status === 'in_progress' || order.orderStatus === 'in-progress';
    if (filterType === 'stitched') return order.status === 'stitched';
    if (filterType === 'rejected') return order.status === 'rejected';
    return false;
  });

  const getTitle = () => {
    switch (filterType) {
      case 'assigned': return 'Assigned Orders';
      case 'in_progress': return 'In Progress Orders';
      case 'stitched': return 'Job Completed Orders';
      case 'rejected': return 'Rejected Orders';
      case 'all': return 'All Orders';
      default: return 'Orders';
    }
  };

  const handleOrderClick = (order: OrderWithCustomer) => {
    setSelectedOrderNo(order.serviceOrderNo);
    setShowOrderDetails(true);
  };

  const handleAcceptOrder = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setUpdatingOrder(orderId);
      await updateVendorOrderStatus(orderId, 'in_progress');
      toast.success('Order accepted! Status updated to In Progress');
      onOrderUpdate();
    } catch (error) {
      console.error('Error accepting order:', error);
      toast.error('Failed to accept order');
    } finally {
      setUpdatingOrder(null);
    }
  };

  const handleRejectOrder = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setUpdatingOrder(orderId);
      await updateVendorOrderStatus(orderId, 'rejected');
      toast.success('Order rejected');
      onOrderUpdate();
    } catch (error) {
      console.error('Error rejecting order:', error);
      toast.error('Failed to reject order');
    } finally {
      setUpdatingOrder(null);
    }
  };

  const handleMarkAsStitched = async (orderId: string) => {
    try {
      setUpdatingOrder(orderId);
      await updateVendorOrderStatus(orderId, 'stitched');
      toast.success('Order marked as stitched!');
      onOrderUpdate(); // Refresh the parent component
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    } finally {
      setUpdatingOrder(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{getTitle()}</h1>
          <p className="text-sm text-muted-foreground">{filteredOrders.length} orders</p>
        </div>
      </div>

      {/* Orders List */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">{getTitle()}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package size={48} className="mx-auto mb-3 opacity-30" />
              <p>No orders found</p>
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
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredOrders.map((order) => {
                    const currentStatus = order.status || (order.orderStatus === 'open' ? 'allotted' : order.orderStatus === 'in-progress' ? 'in_progress' : 'unknown');
                    const displayDate = order.assignedDate || order.jobWorkDate || order.createdAt;

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-muted/30 cursor-pointer"
                        onClick={() => handleOrderClick(order)}
                      >
                        <td className="p-3 text-sm font-medium">
                          {order.serviceOrderNo || order.jobWorkNo || order.id}
                        </td>
                        <td className="p-3 text-sm">{order.customerName}</td>
                        <td className="p-3 text-sm">{format(displayDate, 'dd MMM yyyy')}</td>
                        <td className="p-3">
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                            currentStatus === 'allotted'
                              ? 'bg-blue-100 text-blue-700'
                              : currentStatus === 'reassigned'
                              ? 'bg-purple-100 text-purple-700'
                              : currentStatus === 'in_progress'
                              ? 'bg-orange-100 text-orange-700'
                              : currentStatus === 'stitched'
                              ? 'bg-green-100 text-green-700'
                              : currentStatus === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {currentStatus === 'allotted' ? 'Assigned' :
                             currentStatus === 'reassigned' ? 'Reassigned' :
                             currentStatus === 'in_progress' ? 'In Progress' :
                             currentStatus === 'stitched' ? 'Job Completed' :
                             currentStatus === 'rejected' ? 'Rejected' : currentStatus}
                          </span>
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
          onStatusUpdate={onOrderUpdate}
        />
      )}
    </div>
  );
}

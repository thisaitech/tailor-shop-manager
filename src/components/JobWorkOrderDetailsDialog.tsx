import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getServiceOrderById } from '@/lib/firestore/serviceOrderService';
import { getOrderAllotmentsByVendor, updateVendorOrderStatus } from '@/lib/firestore/orderAllotmentService';
import type { ServiceOrder, OrderAllotment } from '@/lib/types';
import { format } from 'date-fns';
import { Spinner, CheckCircle, PlayCircle } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { StatusChangeConfirmDialog, StatusChangeType } from '@/components/StatusChangeConfirmDialog';

interface JobWorkOrderDetailsDialogProps {
  serviceOrderNo: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdate?: () => void;
}

export function JobWorkOrderDetailsDialog({
  serviceOrderNo,
  open,
  onOpenChange,
  onStatusUpdate,
}: JobWorkOrderDetailsDialogProps) {
  const { vendor, employee } = useAuth();
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [allotment, setAllotment] = useState<OrderAllotment | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: StatusChangeType;
  }>({ open: false, type: 'accept' });

  const openConfirmDialog = (type: StatusChangeType) => {
    setConfirmDialog({ open: true, type });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({ open: false, type: 'accept' });
  };

  const handleConfirmAction = async () => {
    switch (confirmDialog.type) {
      case 'accept':
        await handleAccept();
        break;
      case 'stitched':
        await handleMarkStitched();
        break;
    }
    closeConfirmDialog();
  };

  useEffect(() => {
    if (open && serviceOrderNo) {
      loadOrderDetails();
    }
  }, [open, serviceOrderNo]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      console.log('[JobWorkOrderDetailsDialog] Loading order details for:', serviceOrderNo);

      const orderData = await getServiceOrderById(serviceOrderNo);
      console.log('[JobWorkOrderDetailsDialog] Order data received:', orderData);
      setOrder(orderData);

      // Get the allotment for this order to check status
      // Support both vendors and employees
      if (vendor?.tailorCode) {
        const allotments = await getOrderAllotmentsByVendor(vendor.tailorCode);
        const matchingAllotment = allotments.find(a => a.serviceOrderNo === serviceOrderNo);
        console.log('[JobWorkOrderDetailsDialog] Matching allotment for vendor:', matchingAllotment);
        setAllotment(matchingAllotment || null);
      } else if (employee?.employeeCode) {
        // For employees, try to get allotments by checking the order data
        // Employees can view order details even without allotment buttons
        console.log('[JobWorkOrderDetailsDialog] Employee viewing order - no allotment actions available');
        setAllotment(null);
      }
    } catch (error) {
      console.error('[JobWorkOrderDetailsDialog] Error loading order details:', error);
      toast.error('Failed to load order details');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!allotment) return;
    try {
      setUpdating(true);
      await updateVendorOrderStatus(allotment.id, 'in_progress');
      toast.success('Order accepted! Status updated to In Progress');
      if (onStatusUpdate) onStatusUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Error accepting order:', error);
      toast.error('Failed to accept order');
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkStitched = async () => {
    if (!allotment) return;
    try {
      setUpdating(true);
      await updateVendorOrderStatus(allotment.id, 'stitched');
      toast.success('Order marked as stitched!');
      if (onStatusUpdate) onStatusUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Error marking order as stitched:', error);
      toast.error('Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Details - {serviceOrderNo}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size={32} className="animate-spin text-muted-foreground" />
          </div>
        ) : !order ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Order not found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Customer Info */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground">Customer Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Customer Name</p>
                  <p className="font-medium">{order.customerName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Order Category</p>
                  <p className="font-medium">
                    {order.orderCategory === 'male' ? 'Men' : order.orderCategory === 'female' ? 'Women' : 'Kids'}
                  </p>
                </div>
              </div>
            </div>

            {/* Order Info */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground">Order Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Order Date</p>
                  <p className="font-medium">{format(order.serviceOrderDate, 'dd MMM yyyy')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expected Delivery</p>
                  <p className="font-medium">{format(order.expectedDeliveryDate, 'dd MMM yyyy')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Order Quantity</p>
                  <p className="font-medium">{order.orderQty} {order.uom}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Cost</p>
                  <p className="font-medium">₹{order.stitchingCost.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Order Status</p>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    order.orderStatus === 'delivered'
                      ? 'bg-green-100 text-green-700'
                      : order.orderStatus === 'ready'
                      ? 'bg-blue-100 text-blue-700'
                      : order.orderStatus === 'job-network'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {order.orderStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Dress Items */}
            {order.dressItems && order.dressItems.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground">Dress Items</h3>
                <div className="space-y-3">
                  {order.dressItems.map((item, index) => (
                    <div key={item.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">Item {index + 1}: {item.dressName}</p>
                        <span className="text-xs bg-muted px-2 py-1 rounded capitalize">
                          {item.dressType}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Quantity</p>
                          <p>{item.quantity}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Stitching Cost</p>
                          <p>₹{item.stitchingCost.toFixed(2)}</p>
                        </div>
                      </div>
                      {item.notes && (
                        <div>
                          <p className="text-xs text-muted-foreground">Notes</p>
                          <p className="text-sm">{item.notes}</p>
                        </div>
                      )}
                      {item.designImages && item.designImages.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Design Images</p>
                          <div className="flex gap-2 flex-wrap">
                            {item.designImages.map((url, imgIndex) => (
                              <img
                                key={imgIndex}
                                src={url}
                                alt={`Design ${imgIndex + 1}`}
                                className="w-20 h-20 object-cover rounded border"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Measurements */}
            {order.measurements && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground">Measurements</h3>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  {Object.entries(order.measurements).map(([key, value]) => {
                    if (value === undefined || value === null || value === '') return null;

                    // Handle object values (nested measurements)
                    if (typeof value === 'object' && value !== null) {
                      return (
                        <div key={key} className="col-span-3">
                          <p className="text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                          <div className="font-medium grid grid-cols-3 gap-2 mt-1">
                            {Object.entries(value).map(([subKey, subValue]) => (
                              <div key={subKey}>
                                <span className="text-xs text-muted-foreground capitalize">{subKey}: </span>
                                <span>{String(subValue)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    // Handle primitive values
                    return (
                      <div key={key}>
                        <p className="text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                        <p className="font-medium">{String(value)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Design Images (Legacy) */}
            {order.designList && order.designList.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground">Design Images</h3>
                <div className="flex gap-2 flex-wrap">
                  {order.designList.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`Design ${index + 1}`}
                      className="w-24 h-24 object-cover rounded border"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Reference Notes */}
            {order.reference && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground">Reference Notes</h3>
                <p className="text-sm">{order.reference}</p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons for Job Work Tailor */}
        {allotment && vendor && (
          <DialogFooter className="border-t pt-4">
            {allotment.status === 'allotted' && (
              <Button
                onClick={() => openConfirmDialog('accept')}
                disabled={updating}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <PlayCircle size={16} className="mr-2" />
                {updating ? 'Updating...' : 'Accept & Start Work'}
              </Button>
            )}
            {allotment.status === 'in_progress' && (
              <Button
                onClick={() => openConfirmDialog('stitched')}
                disabled={updating}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle size={16} className="mr-2" />
                {updating ? 'Updating...' : 'Mark as Stitched'}
              </Button>
            )}
            {allotment.status === 'stitched' && (
              <div className="text-sm text-green-600 font-medium">
                ✓ Order completed and sent to admin
              </div>
            )}
          </DialogFooter>
        )}

        {/* Status Change Confirmation Dialog */}
        <StatusChangeConfirmDialog
          open={confirmDialog.open}
          onOpenChange={(open) => !open && closeConfirmDialog()}
          onConfirm={handleConfirmAction}
          type={confirmDialog.type}
          orderInfo={{
            orderNo: serviceOrderNo,
            customerName: order?.customerName,
          }}
          isLoading={updating}
        />
      </DialogContent>
    </Dialog>
  );
}

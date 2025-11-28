import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getServiceOrderById } from '@/lib/firestore/serviceOrderService';
import type { ServiceOrder, OrderAllotment, OrderAllotmentHistoryEntry } from '@/lib/types';
import { format } from 'date-fns';
import { Spinner, XCircle, User, Calendar, Package, Warning, ArrowCounterClockwise } from '@phosphor-icons/react';

interface RejectedOrderDetailsDialogProps {
  order: OrderAllotment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReassign?: (order: OrderAllotment) => void;
}

export function RejectedOrderDetailsDialog({
  order,
  open,
  onOpenChange,
  onReassign,
}: RejectedOrderDetailsDialogProps) {
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && order?.serviceOrderNo) {
      loadOrderDetails();
    }
  }, [open, order?.serviceOrderNo]);

  const loadOrderDetails = async () => {
    if (!order?.serviceOrderNo) return;

    try {
      setLoading(true);
      const orderData = await getServiceOrderById(order.serviceOrderNo);
      setServiceOrder(orderData);
    } catch (error) {
      console.error('Error loading order details:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get rejection info from history
  const getRejectionInfo = () => {
    if (!order?.history) return null;

    const rejectionEntry = order.history.find(
      (entry: OrderAllotmentHistoryEntry & { rejectedBy?: string }) => entry.action === 'rejected'
    );

    return rejectionEntry as (OrderAllotmentHistoryEntry & { rejectedBy?: string; rejectedDate?: number }) | undefined;
  };

  const rejectionInfo = getRejectionInfo();

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
        {/* Header */}
        <DialogHeader
          className="px-6 pt-6 pb-4 border-b"
          style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
        >
          <DialogTitle className="flex items-center gap-3 text-white">
            <XCircle size={24} weight="bold" />
            <span>Rejected Order Details</span>
          </DialogTitle>
          <DialogDescription className="text-white/80">
            {order.jobWorkNo || order.id} - {order.serviceOrderNo}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size={32} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Rejection Information Card - Prominent */}
            <div
              className="rounded-xl border-2 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                borderColor: '#fca5a5',
              }}
            >
              <div className="flex items-center gap-3 p-4 border-b border-red-200">
                <div
                  className="p-2.5 rounded-xl"
                  style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
                >
                  <Warning size={24} className="text-white" weight="duotone" />
                </div>
                <h3 className="font-semibold text-red-900">Rejection Details</h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] text-red-600 uppercase tracking-wide mb-0.5">Rejected By</p>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
                      >
                        {(rejectionInfo?.rejectedBy || order.assignedName || 'T')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-red-900">
                          {rejectionInfo?.rejectedBy || order.assignedName || 'Unknown Tailor'}
                        </p>
                        <p className="text-xs text-red-600">
                          {order.jobWorkTailorId || order.assignedTo}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] text-red-600 uppercase tracking-wide mb-0.5">Rejection Date</p>
                    <p className="font-semibold text-red-900">
                      {order.rejectedDate
                        ? format(order.rejectedDate, 'dd MMM yyyy, hh:mm a')
                        : rejectionInfo?.rejectedDate
                        ? format(rejectionInfo.rejectedDate, 'dd MMM yyyy, hh:mm a')
                        : 'Not recorded'}
                    </p>
                  </div>
                </div>
                {rejectionInfo?.notes && (
                  <div>
                    <p className="text-[11px] text-red-600 uppercase tracking-wide mb-0.5">Reason / Notes</p>
                    <p className="font-medium text-red-900 bg-white/50 rounded-lg p-3 border border-red-200">
                      {rejectionInfo.notes}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-[11px] text-red-600 uppercase tracking-wide mb-0.5">Status Before Rejection</p>
                  <Badge className="bg-red-100 text-red-700 border-red-200 capitalize">
                    {rejectionInfo?.previousStatus || 'allotted'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Order Information Card */}
            <div
              className="rounded-xl border-2 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 100%)',
                borderColor: 'rgba(196, 181, 253, 0.5)',
              }}
            >
              <div className="flex items-center gap-3 p-4 border-b border-purple-200/50">
                <div
                  className="p-2.5 rounded-xl"
                  style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)' }}
                >
                  <Package size={24} className="text-white" weight="duotone" />
                </div>
                <h3 className="font-semibold text-gray-900">Order Information</h3>
              </div>
              <div className="p-4 bg-white/60 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Job Work No</p>
                    <p className="font-semibold text-purple-600">{order.jobWorkNo || order.id}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Service Order No</p>
                    <p className="font-semibold text-gray-900">{order.serviceOrderNo}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Customer Name</p>
                    <p className="font-semibold text-gray-900">{order.customerName}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Dress Item</p>
                    <p className="font-semibold text-gray-900">{order.dressItemName || 'N/A'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Assigned Date</p>
                    <p className="font-semibold text-gray-900">
                      {order.assignedDate ? format(order.assignedDate, 'dd MMM yyyy') : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Expected Delivery</p>
                    <p className="font-semibold text-gray-900">
                      {order.expectedDeliveryDate ? format(order.expectedDeliveryDate, 'dd MMM yyyy') : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Material Cost</p>
                    <p className="font-semibold text-gray-900">₹{order.materialCost?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Job Work Cost</p>
                    <p className="font-semibold text-gray-900">₹{order.jobWorkCost?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Original Tailor Assignment Card */}
            <div
              className="rounded-xl border-2 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                borderColor: '#fed7aa',
              }}
            >
              <div className="flex items-center gap-3 p-4 border-b border-orange-200">
                <div
                  className="p-2.5 rounded-xl"
                  style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' }}
                >
                  <User size={24} className="text-white" weight="duotone" />
                </div>
                <h3 className="font-semibold text-gray-900">Original Assignment</h3>
              </div>
              <div className="p-4 bg-white/60 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Assigned To</p>
                    <p className="font-semibold text-gray-900">{order.assignedName}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Tailor Code</p>
                    <p className="font-semibold text-orange-600">{order.jobWorkTailorId || order.assignedTo}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Allotment Type</p>
                  <Badge className="bg-orange-100 text-orange-700 border-orange-200 capitalize">
                    {order.stitchingAllotment === 'vendor' ? 'Job Work Tailor' : 'In-house Employee'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Service Order Details (if loaded) */}
            {serviceOrder && (
              <div
                className="rounded-xl border-2 overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                  borderColor: '#bbf7d0',
                }}
              >
                <div className="flex items-center gap-3 p-4 border-b border-green-200">
                  <div
                    className="p-2.5 rounded-xl"
                    style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}
                  >
                    <Calendar size={24} className="text-white" weight="duotone" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Service Order Details</h3>
                </div>
                <div className="p-4 bg-white/60 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Order Category</p>
                      <p className="font-semibold text-gray-900 capitalize">
                        {serviceOrder.orderCategory === 'male' ? 'Men' : serviceOrder.orderCategory === 'female' ? 'Women' : 'Kids'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Order Quantity</p>
                      <p className="font-semibold text-gray-900">{serviceOrder.orderQty} {serviceOrder.uom}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Stitching Cost</p>
                      <p className="font-semibold text-gray-900">₹{serviceOrder.stitchingCost?.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Order Status</p>
                      <Badge className="bg-green-100 text-green-700 border-green-200 capitalize">
                        {serviceOrder.orderStatus}
                      </Badge>
                    </div>
                  </div>
                  {serviceOrder.reference && (
                    <div>
                      <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Reference Notes</p>
                      <p className="font-medium text-gray-900">{serviceOrder.reference}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* History Section */}
            {order.history && order.history.length > 0 && (
              <div className="rounded-xl border-2 overflow-hidden bg-gray-50 border-gray-200">
                <div className="p-4 border-b border-gray-200 bg-gray-100">
                  <h3 className="font-semibold text-gray-900">Order History</h3>
                </div>
                <div className="p-4 space-y-3 max-h-48 overflow-y-auto">
                  {order.history.map((entry, index) => (
                    <div key={index} className="flex items-start gap-3 text-sm">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        entry.action === 'rejected' ? 'bg-red-500' :
                        entry.action === 'created' ? 'bg-green-500' :
                        entry.action === 'reassigned' ? 'bg-orange-500' :
                        'bg-blue-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 capitalize">{entry.action.replace('_', ' ')}</p>
                        {entry.notes && <p className="text-gray-600 text-xs">{entry.notes}</p>}
                        <p className="text-[10px] text-gray-400">
                          {entry.timestamp ? format(entry.timestamp, 'dd MMM yyyy, hh:mm a') : 'Unknown time'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer with Re-assign button */}
        <div
          className="flex justify-between items-center gap-3 px-6 py-4 border-t"
          style={{ background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 100%)' }}
        >
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {onReassign && order && (
            <Button
              onClick={() => {
                onOpenChange(false);
                onReassign(order);
              }}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <ArrowCounterClockwise size={16} className="mr-2" />
              Re-assign Order
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

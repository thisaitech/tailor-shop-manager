import { useState, lazy, Suspense, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Package, ArrowLeft, Eye, CheckCircle, Spinner, Money, DeviceMobile, NoteBlank } from '@phosphor-icons/react';
import { EmptyState } from './EmptyState';
import { format } from 'date-fns';
import { ServiceOrder, OrderAllotment, ModeOfPayment } from '@/lib/types';
import { markOrderDelivered, updateServiceOrder } from '@/lib/firestore/serviceOrderService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Lazy load the dialog
const ServiceOrderDetailsDialog = lazy(() =>
  import('@/components/ServiceOrderDetailsDialog').then(m => ({ default: m.ServiceOrderDetailsDialog }))
);

interface ReadyToDeliverListProps {
  serviceOrders: ServiceOrder[];
  orderAllotments: OrderAllotment[];
  onBack: () => void;
  onOrderDelivered?: () => void; // Callback to refresh data after marking as delivered
  onNavigateToPayment?: (orderId: string) => void; // Callback to navigate to Payment with pre-filled order
}

export function ReadyToDeliverList({ serviceOrders, orderAllotments, onBack, onOrderDelivered, onNavigateToPayment: _onNavigateToPayment }: ReadyToDeliverListProps) {
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [deliveringOrderId, setDeliveringOrderId] = useState<string | null>(null);
  const [orderToDeliver, setOrderToDeliver] = useState<ServiceOrder | null>(null);

  // Payment details form (shown on Delivered click)
  const [finalAmount, setFinalAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState<ModeOfPayment>('cash');
  const [amountReceived, setAmountReceived] = useState(0);

  // Filter ready-to-deliver orders using the new status flow:
  // - 'ready' status: Employee orders that are ready to deliver
  // Note: 'received-note' status orders are shown in the Received Note page, not here
  const readyOrders = serviceOrders.filter(o => o.orderStatus === 'ready');

  const advancePaid = orderToDeliver?.advanceAmount || 0;
  const balanceDue = Math.max(0, (finalAmount || 0) - advancePaid);

  useEffect(() => {
    if (orderToDeliver) {
      const approx = orderToDeliver.finalStitchingCost || orderToDeliver.stitchingCost || 0;
      setFinalAmount(approx);
      setPaymentMode('cash');
      setAmountReceived(Math.max(0, approx - (orderToDeliver.advanceAmount || 0)));
    }
  }, [orderToDeliver]);

  const handleOrderClick = (order: ServiceOrder) => {
    setSelectedOrder(order);
    setShowDetailsDialog(true);
  };

  // Open payment details popup on this page
  const handleDeliveredClick = (order: ServiceOrder) => {
    setOrderToDeliver(order);
  };

  // Save final amount + mark delivered
  const handleConfirmPayment = async () => {
    if (!orderToDeliver) return;

    if (!finalAmount || finalAmount <= 0) {
      toast.error('Please enter the final total amount');
      return;
    }

    try {
      setDeliveringOrderId(orderToDeliver.id);

      const effectiveReceived = paymentMode === 'nil' ? 0 : amountReceived;
      const remainingAfterPayment = Math.max(0, finalAmount - advancePaid - effectiveReceived);
      const paymentStatus: ServiceOrder['paymentStatus'] =
        remainingAfterPayment <= 0 ? 'completed' : (advancePaid + effectiveReceived) > 0 ? 'partial' : 'pending';

      await updateServiceOrder(orderToDeliver.id, {
        finalStitchingCost: finalAmount,
        totalAmount: finalAmount,
        balanceAmount: remainingAfterPayment,
        paymentStatus,
        deliveryPaymentMode: paymentMode,
        amountReceivedAtDelivery: effectiveReceived,
      });

      await markOrderDelivered(orderToDeliver.id, 'ADMIN', 'Admin', paymentStatus);

      toast.success('Payment recorded and order marked as delivered');
      setOrderToDeliver(null);

      if (onOrderDelivered) {
        onOrderDelivered();
      }
    } catch (error) {
      console.error('Error completing delivery payment:', error);
      toast.error('Failed to complete delivery payment');
    } finally {
      setDeliveringOrderId(null);
    }
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 180px)', minHeight: '400px' }}>
      {/* Fixed Header - Never scrolls */}
      <div className="flex items-center gap-3 pb-4 flex-shrink-0 bg-background">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Ready to Deliver</h1>
          <p className="text-sm text-muted-foreground">{readyOrders.length} orders</p>
        </div>
      </div>

      {/* Scrollable Ready Orders List */}
      <Card className="flex-1 min-h-0 overflow-hidden">
        <CardContent className="p-4 h-full overflow-y-auto" style={{ background: '#EADDFD' }}>
          {readyOrders.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No orders ready to deliver"
              description="Completed orders will appear here"
            />
          ) : (
            <div className="space-y-4">
              {readyOrders.map((order, index) => (
                <div
                  key={order.id}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer hover:shadow-lg hover:scale-[1.01] animate-on-load animate-fade-slide-up stagger-${(index % 6) + 1}`}
                  style={{
                    background: '#FAF8FF',
                    borderColor: '#6A64F2',
                    boxShadow: '0 4px 12px -2px rgba(106, 100, 242, 0.2), 0 2px 6px -2px rgba(106, 100, 242, 0.15)',
                  }}
                  onClick={() => handleOrderClick(order)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-mono text-xs" style={{ background: '#EADDFD', color: '#6A64F2', borderColor: '#6A64F2' }}>
                          {order.id}
                        </Badge>
                        <Badge className="bg-indigo-500 text-white text-xs">
                          Ready
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Customer:</span>{' '}
                          <span className="font-medium text-gray-900">{order.customerName}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Category:</span>{' '}
                          <span className="font-medium text-gray-900">
                            {order.orderCategory === 'male' ? 'Men' : order.orderCategory === 'female' ? 'Women' : 'Kids'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Order Date:</span>{' '}
                          <span className="font-medium text-gray-900">
                            {format(new Date(order.serviceOrderDate), 'dd MMM yyyy')}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Delivery Date:</span>{' '}
                          <span className="font-medium text-gray-900">
                            {format(new Date(order.expectedDeliveryDate), 'dd MMM yyyy')}
                          </span>
                        </div>
                        {order.orderQty && (
                          <div>
                            <span className="text-muted-foreground">Quantity:</span>{' '}
                            <span className="font-medium text-gray-900">{order.orderQty} {order.uom}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOrderClick(order);
                        }}
                        className="whitespace-nowrap shadow-sm"
                        style={{ background: '#FAF8FF', color: '#6A64F2', borderColor: '#6A64F2' }}
                      >
                        <Eye size={16} className="mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeliveredClick(order);
                        }}
                        disabled={deliveringOrderId === order.id}
                        className="whitespace-nowrap shadow-sm"
                        style={{ background: '#22c55e', color: 'white' }}
                      >
                        {deliveringOrderId === order.id ? (
                          <>
                            <Spinner size={16} className="mr-1 animate-spin" />
                            Delivering...
                          </>
                        ) : (
                          <>
                            <CheckCircle size={16} className="mr-1" weight="bold" />
                            Delivered
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Order Details Dialog - Lazy Loaded */}
      {selectedOrder && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white p-4 rounded-lg">Loading...</div></div>}>
          <ServiceOrderDetailsDialog
            serviceOrder={selectedOrder}
            orderAllotment={orderAllotments.find(a => a.serviceOrderNo === selectedOrder.id && !a.reassigned)}
            open={showDetailsDialog}
            onClose={() => {
              setShowDetailsDialog(false);
              setSelectedOrder(null);
            }}
          />
        </Suspense>
      )}

      {/* Payment Details popup on Delivered */}
      <Dialog open={!!orderToDeliver} onOpenChange={(open) => !open && setOrderToDeliver(null)}>
        <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-2">
            <DialogTitle className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Payment Details
            </DialogTitle>
          </DialogHeader>

          <div className="px-5 pb-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="final-amount" className="text-sm font-medium">Total Amount (₹)</Label>
              <Input
                id="final-amount"
                type="number"
                min="0"
                step="0.01"
                value={finalAmount || ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  setFinalAmount(value);
                  setAmountReceived(Math.max(0, value - advancePaid));
                }}
                onFocus={(e) => e.target.select()}
                className="h-11 bg-purple-50 border-purple-200"
                placeholder="Enter final stitching cost"
              />
              {orderToDeliver && (
                <p className="text-xs text-muted-foreground">
                  Approximate cost was ₹{(orderToDeliver.stitchingCost || 0).toFixed(2)}
                </p>
              )}
            </div>

            <div className="rounded-xl px-4 py-3 flex justify-between items-center" style={{ backgroundColor: '#dcfce7' }}>
              <span className="text-sm font-medium text-green-800">Advance Paid</span>
              <span className="text-sm font-bold text-green-800">- ₹{advancePaid.toFixed(2)}</span>
            </div>

            <div className="rounded-xl px-4 py-3 flex justify-between items-center" style={{ backgroundColor: '#fef3c7' }}>
              <span className="text-sm font-medium text-amber-800">Balance Due</span>
              <span className="text-sm font-bold text-amber-800">₹{balanceDue.toFixed(2)}</span>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Payment Mode *</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'cash' as const, label: 'Cash', icon: Money, active: 'bg-green-50 border-green-500 text-green-700' },
                  { value: 'qrpay' as const, label: 'QR Pay', icon: DeviceMobile, active: 'bg-purple-50 border-purple-500 text-purple-700' },
                  { value: 'nil' as const, label: 'Nil', icon: NoteBlank, active: 'bg-blue-50 border-blue-500 text-blue-700' },
                ].map((option) => {
                  const Icon = option.icon;
                  const isActive = paymentMode === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setPaymentMode(option.value);
                        if (option.value === 'nil') {
                          setAmountReceived(0);
                        } else if (amountReceived === 0) {
                          setAmountReceived(balanceDue);
                        }
                      }}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-semibold',
                        isActive ? option.active : 'bg-white border-gray-200 text-muted-foreground hover:border-gray-300'
                      )}
                    >
                      <Icon size={22} weight={isActive ? 'fill' : 'regular'} />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount-received" className="text-sm font-medium">Amount Received (₹) *</Label>
              <Input
                id="amount-received"
                type="number"
                min="0"
                step="0.01"
                value={paymentMode === 'nil' ? 0 : amountReceived || ''}
                onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
                onFocus={(e) => e.target.select()}
                className="h-11"
                disabled={paymentMode === 'nil'}
                placeholder="0.00"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOrderToDeliver(null)}
                className="h-11 border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmPayment}
                disabled={!!deliveringOrderId}
                className="h-11 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {deliveringOrderId ? (
                  <>
                    <Spinner size={16} className="mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Confirm Payment'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, lazy, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Package, ArrowLeft, Eye, CheckCircle, Spinner, CheckFat } from '@phosphor-icons/react';
import { EmptyState } from './EmptyState';
import { format } from 'date-fns';
import { ServiceOrder, OrderAllotment } from '@/lib/types';
import { markOrderDelivered } from '@/lib/firestore/serviceOrderService';
import { toast } from 'sonner';

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

export function ReadyToDeliverList({ serviceOrders, orderAllotments, onBack, onOrderDelivered, onNavigateToPayment }: ReadyToDeliverListProps) {
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [deliveringOrderId, setDeliveringOrderId] = useState<string | null>(null);
  const [orderToDeliver, setOrderToDeliver] = useState<ServiceOrder | null>(null); // For confirmation dialog

  // Filter ready-to-deliver orders using the new status flow:
  // - 'ready' status: Employee orders that are ready to deliver
  // Note: 'received-note' status orders are shown in the Received Note page, not here
  const readyOrders = serviceOrders.filter(o => o.orderStatus === 'ready');

  const handleOrderClick = (order: ServiceOrder) => {
    setSelectedOrder(order);
    setShowDetailsDialog(true);
  };

  // Navigate to Payment page with pre-filled order details
  const handleDeliveredClick = (order: ServiceOrder) => {
    if (onNavigateToPayment) {
      // Navigate to Payment page with the order pre-selected
      onNavigateToPayment(order.id);
    } else {
      // Fallback to confirmation dialog if no navigation callback
      setOrderToDeliver(order);
    }
  };

  // Handle marking order as delivered using the new unified flow
  const handleConfirmDelivery = async () => {
    if (!orderToDeliver) return;
    
    try {
      setDeliveringOrderId(orderToDeliver.id);
      setOrderToDeliver(null); // Close dialog

      // Use the new unified markOrderDelivered function
      await markOrderDelivered(orderToDeliver.id, 'ADMIN', 'Admin');

      toast.success('Order marked as delivered successfully!');

      // Call callback to refresh data
      if (onOrderDelivered) {
        onOrderDelivered();
      }
    } catch (error) {
      console.error('Error marking order as delivered:', error);
      toast.error('Failed to mark order as delivered');
    } finally {
      setDeliveringOrderId(null);
    }
  };

  return (
    <div className="flex flex-col pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 flex-shrink-0 bg-background">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Ready to Deliver</h1>
          <p className="text-sm text-muted-foreground">{readyOrders.length} orders</p>
        </div>
      </div>

      {/* Ready Orders List */}
      <Card className="border-0 shadow-none">
        <CardContent className="p-4 rounded-xl" style={{ background: '#EADDFD' }}>
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

      {/* Delivery Confirmation Dialog */}
      <AlertDialog open={!!orderToDeliver} onOpenChange={(open) => !open && setOrderToDeliver(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckFat size={32} weight="fill" className="text-green-600" />
            </div>
            <AlertDialogTitle className="text-center text-xl">
              Confirm Delivery
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-3">
              <p>Are you sure you want to mark this order as delivered?</p>
              {orderToDeliver && (
                <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order ID:</span>
                    <span className="font-semibold text-foreground">{orderToDeliver.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer:</span>
                    <span className="font-semibold text-foreground">{orderToDeliver.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category:</span>
                    <span className="font-semibold text-foreground">
                      {orderToDeliver.orderCategory === 'male' ? 'Men' : orderToDeliver.orderCategory === 'female' ? 'Women' : 'Kids'}
                    </span>
                  </div>
                  {orderToDeliver.orderQty && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quantity:</span>
                      <span className="font-semibold text-foreground">{orderToDeliver.orderQty} {orderToDeliver.uom}</span>
                    </div>
                  )}
                </div>
              )}
              <p className="text-sm text-amber-600 font-medium">
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-3">
            <AlertDialogCancel className="flex-1 sm:flex-none sm:min-w-[120px]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelivery}
              className="flex-1 sm:flex-none sm:min-w-[120px] bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle size={18} className="mr-2" weight="bold" />
              Confirm Delivery
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

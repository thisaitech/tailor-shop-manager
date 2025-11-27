import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, ArrowLeft } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { ServiceOrder, OrderAllotment } from '@/lib/types';
import { ServiceOrderDetailsDialog } from '@/components/ServiceOrderDetailsDialog';

interface ReadyToDeliverListProps {
  serviceOrders: ServiceOrder[];
  orderAllotments: OrderAllotment[];
  onBack: () => void;
}

export function ReadyToDeliverList({ serviceOrders, orderAllotments, onBack }: ReadyToDeliverListProps) {
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Helper function to get display status (matching OrderList and DashboardStats logic)
  const getDisplayStatus = (serviceOrder: ServiceOrder): string => {
    // Find matching order allotment (exclude reassigned orders - matching OrderList logic)
    const allotment = orderAllotments.find(a => a.serviceOrderNo === serviceOrder.id && !a.reassigned);

    // If no allotment exists → Pending
    if (!allotment) {
      return 'pending';
    }

    const allotmentStatus = allotment.status;
    const serviceOrderStatus = allotment.serviceOrderStatus;
    const orderTicketStatus = allotment.orderStatus;

    // If final payment is completed → Completed
    if (serviceOrder.orderStatus === 'delivered') {
      return 'completed';
    }

    // Ready to deliver or ready to dispatch → Delivered (Ready to Deliver)
    if (allotmentStatus === 'stitched' || allotmentStatus === 'delivered' || serviceOrderStatus === 'ready') {
      return 'delivered';
    }

    // In progress
    if (allotmentStatus === 'in_progress' || orderTicketStatus === 'in-progress' || serviceOrder.orderStatus === 'in-progress') {
      return 'in-progress';
    }

    // Allotted but not started → Pending
    if (allotmentStatus === 'allotted' || orderTicketStatus === 'open') {
      return 'pending';
    }

    // Default to pending
    return 'pending';
  };

  // Filter ready-to-deliver orders using display status logic
  const readyOrders = serviceOrders.filter(o => getDisplayStatus(o) === 'delivered');

  const handleOrderClick = (order: ServiceOrder) => {
    setSelectedOrder(order);
    setShowDetailsDialog(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Ready to Deliver</h1>
          <p className="text-sm text-muted-foreground">{readyOrders.length} orders</p>
        </div>
      </div>

      {/* Ready Orders List */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center gap-2">
            <Package size={24} className="text-accent" weight="duotone" />
            <CardTitle>All Ready to Deliver Orders</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {readyOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package size={48} className="mx-auto mb-3 opacity-30" />
              <p>No orders ready to deliver</p>
            </div>
          ) : (
            <div className="divide-y">
              {readyOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleOrderClick(order)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-mono text-xs bg-accent/10 text-accent border-accent/30">
                          {order.id}
                        </Badge>
                        <Badge className="bg-green-500 text-white text-xs">
                          Ready
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Customer:</span>{' '}
                          <span className="font-medium">{order.customerName}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Category:</span>{' '}
                          <span className="font-medium capitalize">{order.orderCategory}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Order Date:</span>{' '}
                          <span className="font-medium">
                            {format(new Date(order.serviceOrderDate), 'dd MMM yyyy')}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Delivery Date:</span>{' '}
                          <span className="font-medium">
                            {format(new Date(order.expectedDeliveryDate), 'dd MMM yyyy')}
                          </span>
                        </div>
                        {order.orderQty && (
                          <div>
                            <span className="text-muted-foreground">Quantity:</span>{' '}
                            <span className="font-medium">{order.orderQty} {order.uom}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOrderClick(order);
                      }}
                      className="whitespace-nowrap"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Order Details Dialog */}
      {selectedOrder && (
        <ServiceOrderDetailsDialog
          serviceOrder={selectedOrder}
          open={showDetailsDialog}
          onClose={() => {
            setShowDetailsDialog(false);
            setSelectedOrder(null);
          }}
        />
      )}
    </div>
  );
}

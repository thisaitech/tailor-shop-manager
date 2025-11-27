import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checks, ArrowLeft, ArrowCounterClockwise, Package } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { OrderAllotment } from '@/lib/types';
import { toast } from 'sonner';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { updateServiceOrderStatus } from '@/lib/firestore/serviceOrderService';

interface StitchedOrdersListProps {
  orders: OrderAllotment[];
  onBack: () => void;
  onReassign: (order: OrderAllotment) => void;
}

export function StitchedOrdersList({ orders, onBack, onReassign }: StitchedOrdersListProps) {
  const [markingReady, setMarkingReady] = useState<string | null>(null);

  // Filter stitched orders: status='stitched' AND not reassigned AND not ready to dispatch
  const stitchedOrders = orders.filter(o => {
    const isStitched = o.status === 'stitched';
    const isNotReassigned = !o.reassigned;
    const isNotReady = o.serviceOrderStatus !== 'ready';

    // Debug logging
    if (isStitched) {
      console.log(`[StitchedOrdersList] Order ${o.id} - status: ${o.status}, reassigned: ${o.reassigned}, serviceOrderStatus: ${o.serviceOrderStatus}`);
    }

    return isStitched && isNotReassigned && isNotReady;
  });

  const handleMarkAsReadyToDispatch = async (order: OrderAllotment) => {
    try {
      setMarkingReady(order.id);

      // Update order allotment: set status to 'delivered' and serviceOrderStatus to 'ready'
      await updateDoc(doc(db, 'orderAllotment', order.id), {
        status: 'delivered', // Set status to delivered to remove from Stitched Orders
        orderStatus: 'closed',
        serviceOrderStatus: 'ready',
        deliveredDate: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update the service order status to 'ready'
      await updateServiceOrderStatus(order.serviceOrderNo, 'ready');

      console.log(`[StitchedOrdersList] Order ${order.id} marked as delivered (ready to dispatch). Service order ${order.serviceOrderNo} updated to ready status.`);

      toast.success('Order marked as Ready to Dispatch!');
    } catch (error) {
      console.error('Error marking order as ready to dispatch:', error);
      toast.error('Failed to mark order as ready to dispatch');
    } finally {
      setMarkingReady(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Job Completed Orders</h1>
          <p className="text-sm text-muted-foreground">{stitchedOrders.length} orders</p>
        </div>
      </div>

      {/* Stitched Orders List */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center gap-2">
            <Checks size={24} className="text-green-600" weight="duotone" />
            <CardTitle>All Job Completed Orders</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {stitchedOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Checks size={48} className="mx-auto mb-3 opacity-30" />
              <p>No job completed orders</p>
            </div>
          ) : (
            <div className="divide-y">
              {stitchedOrders.map((order) => (
                <div key={order.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-mono text-xs bg-green-50 text-green-700 border-green-300">
                          {order.stitchedId || order.jobWorkNo || order.id}
                        </Badge>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm font-medium">{order.serviceOrderNo}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Customer:</span>{' '}
                          <span className="font-medium">{order.customerName}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Stitched by:</span>{' '}
                          <span className="font-medium">{order.assignedName}</span>
                        </div>
                        {order.dressItemName && (
                          <div>
                            <span className="text-muted-foreground">Item:</span>{' '}
                            <span className="font-medium">{order.dressItemName}</span>
                          </div>
                        )}
                        {order.stitchedDate && typeof order.stitchedDate === 'number' && (
                          <div>
                            <span className="text-muted-foreground">Stitched on:</span>{' '}
                            <span className="font-medium">
                              {format(new Date(order.stitchedDate), 'dd MMM yyyy, hh:mm a')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkAsReadyToDispatch(order)}
                        disabled={markingReady === order.id}
                        className="whitespace-nowrap bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                      >
                        <Package size={16} className="mr-1" weight="duotone" />
                        {markingReady === order.id ? 'Processing...' : 'Ready to Deliver'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onReassign(order)}
                        className="whitespace-nowrap bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-300"
                      >
                        <ArrowCounterClockwise size={16} className="mr-1" />
                        Re-assign
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

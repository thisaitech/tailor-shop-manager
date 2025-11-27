import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ArrowCounterClockwise, Package } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { OrderAllotment } from '@/lib/types';
import { updateServiceOrderStatus } from '@/lib/firestore/serviceOrderService';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';

interface StitchedOrdersProps {
  companyId: string;
  onReassign: (order: OrderAllotment) => void;
  onStitchedIdClick?: (stitchedId: string) => void;
}

export function StitchedOrders({ companyId, onReassign, onStitchedIdClick }: StitchedOrdersProps) {
  const [stitchedOrders, setStitchedOrders] = useState<OrderAllotment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;

    // Set up real-time listener for stitched orders
    const allotmentsRef = collection(db, 'orderAllotment');
    const q = query(
      allotmentsRef,
      where('companyId', '==', companyId),
      where('status', '==', 'stitched')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const orders: OrderAllotment[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt,
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : data.updatedAt,
            stitchedDate: data.stitchedDate instanceof Timestamp ? data.stitchedDate.toMillis() : data.stitchedDate,
            jobWorkDate: data.jobWorkDate instanceof Timestamp ? data.jobWorkDate.toMillis() : data.jobWorkDate,
            expectedDeliveryDate: data.expectedDeliveryDate instanceof Timestamp ? data.expectedDeliveryDate.toMillis() : data.expectedDeliveryDate,
          } as OrderAllotment;
        });

        // Filter out reassigned orders and ready-to-dispatch orders
        const activeStitchedOrders = orders.filter(o =>
          !o.reassigned && o.serviceOrderStatus !== 'ready'
        );

        // Sort by stitchedDate (most recent first)
        activeStitchedOrders.sort((a, b) => {
          const aDate = a.stitchedDate || a.updatedAt;
          const bDate = b.stitchedDate || b.updatedAt;
          return bDate - aDate;
        });

        setStitchedOrders(activeStitchedOrders);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to stitched orders:', error);
        toast.error('Failed to load stitched orders');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [companyId]);

  const handleMarkReady = async (order: OrderAllotment) => {
    try {
      setUpdatingOrder(order.id);

      // Update orderAllotment: set status to 'delivered' and serviceOrderStatus to 'ready'
      const allotmentRef = doc(db, 'orderAllotment', order.id);
      await updateDoc(allotmentRef, {
        status: 'delivered', // Set status to delivered to remove from Stitched Orders
        orderStatus: 'closed',
        serviceOrderStatus: 'ready',
        deliveredDate: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update newOrder collection status to 'ready'
      if (order.serviceOrderNo) {
        await updateServiceOrderStatus(order.serviceOrderNo, 'ready');
      }

      console.log(`[StitchedOrders] Order ${order.id} marked as delivered (ready to deliver). Service order ${order.serviceOrderNo} updated to ready status.`);

      toast.success('Order marked as Ready to Deliver!');
    } catch (error) {
      console.error('Error marking order as ready to deliver:', error);
      toast.error('Failed to mark order as ready to deliver');
    } finally {
      setUpdatingOrder(null);
    }
  };

  const handleReassign = (order: OrderAllotment) => {
    onReassign(order);
  };

  if (loading) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Loading stitched orders...</p>
        </CardContent>
      </Card>
    );
  }

  if (stitchedOrders.length === 0) {
    return null; // Don't show the component if there are no stitched orders
  }

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle size={24} className="text-green-600" weight="duotone" />
            <CardTitle className="text-lg">Job Completed Orders</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            {stitchedOrders.length} order{stitchedOrders.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {stitchedOrders.map((order) => (
          <div
            key={order.id}
            className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className="font-mono text-xs cursor-pointer hover:bg-green-100 transition-colors"
                    onClick={() => onStitchedIdClick && order.stitchedId && onStitchedIdClick(order.stitchedId)}
                    title="Click to create Delivery Challan"
                  >
                    {order.stitchedId || order.id}
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
                    <span className="text-muted-foreground">Assigned to:</span>{' '}
                    <span className="font-medium">{order.assignedName}</span>
                  </div>
                  {order.dressItemName && (
                    <div>
                      <span className="text-muted-foreground">Item:</span>{' '}
                      <span className="font-medium">{order.dressItemName}</span>
                    </div>
                  )}
                  {order.stitchedDate && (
                    <div>
                      <span className="text-muted-foreground">Stitched on:</span>{' '}
                      <span className="font-medium">
                        {format(order.stitchedDate, 'dd MMM yyyy, hh:mm a')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  size="sm"
                  onClick={() => handleMarkReady(order)}
                  disabled={updatingOrder === order.id}
                  className="whitespace-nowrap bg-green-600 hover:bg-green-700"
                >
                  <Package size={16} className="mr-1" />
                  {updatingOrder === order.id ? 'Processing...' : 'Ready to Deliver'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReassign(order)}
                  disabled={updatingOrder === order.id}
                  className="whitespace-nowrap bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-300"
                >
                  <ArrowCounterClockwise size={16} className="mr-1" />
                  Re-assign
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

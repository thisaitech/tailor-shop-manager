import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Package, User, Calendar, Ruler, X } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { getServiceOrderById, ServiceOrderWithCompany } from '@/lib/firestore/serviceOrderService';
import { OrderAllotment } from '@/lib/types';
import { toast } from 'sonner';

interface OrderDetailsDialogProps {
  allotment: OrderAllotment;
  open: boolean;
  onClose: () => void;
}

export function OrderDetailsDialog({ allotment, open, onClose }: OrderDetailsDialogProps) {
  const [serviceOrder, setServiceOrder] = useState<ServiceOrderWithCompany | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && allotment) {
      loadServiceOrder();
    }
  }, [open, allotment]);

  const loadServiceOrder = async () => {
    try {
      setLoading(true);
      const order = await getServiceOrderById(allotment.serviceOrderNo);
      setServiceOrder(order);
    } catch (error) {
      console.error('Error loading service order:', error);
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="secondary">Open</Badge>;
      case 'allotment':
        return <Badge className="bg-orange-500">Allotment</Badge>;
      case 'job-network':
        return <Badge className="bg-blue-500">Job Network</Badge>;
      case 'ready':
        return <Badge className="bg-green-500">Ready</Badge>;
      case 'delivered':
        return <Badge className="bg-gray-500">Delivered</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="relative max-w-3xl max-h-[90vh] overflow-y-auto pt-4 pr-12">
        <DialogHeader className="flex flex-col gap-2">
          <div className="flex items-start justify-between pr-8">
            <DialogTitle className="flex items-center gap-2">
              <Package size={24} className="text-primary" />
              Order Details
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X size={20} />
            </Button>
          </div>
          <DialogDescription className="sr-only">
            Complete details for order {allotment.serviceOrderNo}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">Loading order details...</p>
          </div>
        ) : !serviceOrder ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">Order not found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Order Information */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-lg font-semibold">Order Information</h3>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center rounded-md border px-2 py-0.5 font-medium w-fit whitespace-nowrap font-mono text-sm bg-secondary text-secondary-foreground">
                    {serviceOrder?.id || allotment.serviceOrderNo}
                  </span>
                  <Button size="sm" variant="outline">
                    Print
                  </Button>
                  <Button size="sm">
                    Download Invoice
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Order Status</p>
                  <div className="mt-1">{getStatusBadge(serviceOrder.orderStatus)}</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Order Date</p>
                  <p className="font-medium">
                    {format(new Date(serviceOrder.serviceOrderDate), 'dd MMM yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expected Delivery</p>
                  <p className="font-medium">
                    {format(new Date(serviceOrder.expectedDeliveryDate), 'dd MMM yyyy')}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Customer Information */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <User size={20} />
                Customer Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Customer Name</p>
                  <p className="font-medium">{serviceOrder.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Customer ID</p>
                  <p className="font-medium">{serviceOrder.customerId}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Job Work Information */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Calendar size={20} />
                Job Work Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Job Work No</p>
                  <p className="font-medium">{allotment.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Assigned To</p>
                  <p className="font-medium">{allotment.assignedName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Job Work Date</p>
                  <p className="font-medium">
                    {format(new Date(allotment.jobWorkDate), 'dd MMM yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expected Delivery</p>
                  <p className="font-medium">
                    {format(new Date(allotment.expectedDeliveryDate), 'dd MMM yyyy')}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Order Details */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Ruler size={20} />
                Order Details
              </h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Dress Item</p>
                  <p className="font-medium">{allotment.dressItemName || 'Standard Order'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Order Category</p>
                  <p className="font-medium">
                    {serviceOrder.orderCategory === 'male' ? 'Men' : serviceOrder.orderCategory === 'female' ? 'Women' : 'Kids'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Order Quantity</p>
                  <p className="font-medium">
                    {serviceOrder.orderQty} {serviceOrder.uom}
                  </p>
                </div>
                {serviceOrder.reference && (
                  <div>
                    <p className="text-sm text-muted-foreground">Reference/Notes</p>
                    <p className="font-medium">{serviceOrder.reference}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Measurements */}
            {serviceOrder.measurements && Object.keys(serviceOrder.measurements).length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-3">Measurements</h3>
                  <div className="space-y-4">
                    {Object.entries(serviceOrder.measurements).map(([category, categoryMeasurements]) => {
                      // Check if categoryMeasurements is an object with properties
                      if (categoryMeasurements && typeof categoryMeasurements === 'object') {
                        const measurementEntries = Object.entries(categoryMeasurements as Record<string, number | string>);
                        if (measurementEntries.length === 0) return null;
                        
                        return (
                          <div key={category} className="bg-muted p-3 rounded-lg">
                            <h4 className="text-sm font-semibold text-gray-700 capitalize mb-2 border-b pb-1">
                              {category}
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {measurementEntries.map(([measureName, measureValue]) => (
                                measureValue !== undefined && measureValue !== null && measureValue !== '' && (
                                  <div key={measureName} className="bg-white p-2 rounded">
                                    <span className="text-xs text-gray-500 capitalize block">
                                      {measureName.replace(/([A-Z])/g, ' $1').trim()}
                                    </span>
                                    <span className="font-semibold text-gray-900">
                                      {typeof measureValue === 'number' ? `${measureValue}"` : measureValue}
                                    </span>
                                  </div>
                                )
                              ))}
                            </div>
                          </div>
                        );
                      }
                      // If it's a simple value (not nested object)
                      return categoryMeasurements && (
                        <div key={category} className="bg-muted p-2 rounded">
                          <span className="text-xs text-gray-500 capitalize block">{category}</span>
                          <span className="font-semibold text-gray-900">{String(categoryMeasurements)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Design Images */}
            {serviceOrder.designList && serviceOrder.designList.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-3">Design Images</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {serviceOrder.designList.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Design ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

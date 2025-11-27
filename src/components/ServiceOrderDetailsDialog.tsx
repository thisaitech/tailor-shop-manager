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
import { ServiceOrder } from '@/lib/types';

interface ServiceOrderDetailsDialogProps {
  serviceOrder: ServiceOrder;
  open: boolean;
  onClose: () => void;
}

export function ServiceOrderDetailsDialog({ serviceOrder, open, onClose }: ServiceOrderDetailsDialogProps) {
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Package size={24} className="text-primary" />
              Order Details
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X size={20} />
            </Button>
          </div>
          <DialogDescription>
            Complete details for order {serviceOrder.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Order Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Order Number</p>
                <p className="font-medium">{serviceOrder.id}</p>
              </div>
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

          {/* Order Details */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Ruler size={20} />
              Order Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Order Category</p>
                <p className="font-medium capitalize">{serviceOrder.orderCategory}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Order Quantity</p>
                <p className="font-medium">
                  {serviceOrder.orderQty} {serviceOrder.uom}
                </p>
              </div>
              {serviceOrder.reference && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Reference/Notes</p>
                  <p className="font-medium">{serviceOrder.reference}</p>
                </div>
              )}
            </div>
          </div>

          {/* Dress Items */}
          {serviceOrder.dressItems && serviceOrder.dressItems.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-3">Dress Items</h3>
                <div className="space-y-3">
                  {serviceOrder.dressItems.map((item, index) => (
                    <div key={index} className="p-3 bg-muted rounded-lg">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Item:</span>{' '}
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Quantity:</span>{' '}
                          <span className="font-medium">{item.qty}</span>
                        </div>
                        {item.rate && (
                          <div>
                            <span className="text-muted-foreground">Rate:</span>{' '}
                            <span className="font-medium">₹{item.rate}</span>
                          </div>
                        )}
                        {item.amount && (
                          <div>
                            <span className="text-muted-foreground">Amount:</span>{' '}
                            <span className="font-medium">₹{item.amount}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Measurements */}
          {serviceOrder.measurements && Object.keys(serviceOrder.measurements).length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-3">Measurements</h3>
                <div className="bg-muted p-4 rounded-lg">
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    {Object.entries(serviceOrder.measurements).map(([key, value]) => (
                      value && (
                        <div key={key}>
                          <span className="text-muted-foreground capitalize">{key}:</span>{' '}
                          <span className="font-medium">{String(value)}</span>
                        </div>
                      )
                    ))}
                  </div>
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

          {/* Pricing Information */}
          <Separator />
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Calendar size={20} />
              Pricing Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="font-medium text-lg">₹{serviceOrder.totalAmount || 0}</p>
              </div>
              {serviceOrder.advanceAmount && serviceOrder.advanceAmount > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Advance Paid</p>
                  <p className="font-medium text-lg text-green-600">₹{serviceOrder.advanceAmount}</p>
                </div>
              )}
              {serviceOrder.balanceAmount !== undefined && (
                <div>
                  <p className="text-sm text-muted-foreground">Balance</p>
                  <p className="font-medium text-lg text-orange-600">₹{serviceOrder.balanceAmount}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

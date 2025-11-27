import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Package, User, Calendar, Ruler } from '@phosphor-icons/react';
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
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto border-2"
        style={{
          background: '#EADDFD',
          borderColor: '#6A64F2'
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: '#6A64F2' }}>
            <Package size={24} style={{ color: '#6A64F2' }} weight="duotone" />
            Order Details
          </DialogTitle>
          <DialogDescription>
            <Badge
              variant="outline"
              className="font-mono text-sm"
              style={{ background: '#FAF8FF', color: '#6A64F2', borderColor: '#6A64F2' }}
            >
              {serviceOrder.id}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Information */}
          <div
            className="p-4 rounded-xl border-2"
            style={{
              background: '#FAF8FF',
              borderColor: '#6A64F2',
              boxShadow: '0 4px 12px -2px rgba(106, 100, 242, 0.2), 0 2px 6px -2px rgba(106, 100, 242, 0.15)'
            }}
          >
            <h3 className="text-lg font-semibold mb-3" style={{ color: '#6A64F2' }}>Order Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Order Number</p>
                <p className="font-medium text-gray-900">{serviceOrder.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Order Status</p>
                <div className="mt-1">{getStatusBadge(serviceOrder.orderStatus)}</div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Order Date</p>
                <p className="font-medium text-gray-900">
                  {format(new Date(serviceOrder.serviceOrderDate), 'dd MMM yyyy')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expected Delivery</p>
                <p className="font-medium text-gray-900">
                  {format(new Date(serviceOrder.expectedDeliveryDate), 'dd MMM yyyy')}
                </p>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div
            className="p-4 rounded-xl border-2"
            style={{
              background: '#FAF8FF',
              borderColor: '#6A64F2',
              boxShadow: '0 4px 12px -2px rgba(106, 100, 242, 0.2), 0 2px 6px -2px rgba(106, 100, 242, 0.15)'
            }}
          >
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: '#6A64F2' }}>
              <User size={20} weight="duotone" />
              Customer Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Customer Name</p>
                <p className="font-medium text-gray-900">{serviceOrder.customerName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Customer ID</p>
                <p className="font-medium text-gray-900">{serviceOrder.customerId}</p>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div
            className="p-4 rounded-xl border-2"
            style={{
              background: '#FAF8FF',
              borderColor: '#6A64F2',
              boxShadow: '0 4px 12px -2px rgba(106, 100, 242, 0.2), 0 2px 6px -2px rgba(106, 100, 242, 0.15)'
            }}
          >
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: '#6A64F2' }}>
              <Ruler size={20} weight="duotone" />
              Order Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Order Category</p>
                <p className="font-medium text-gray-900 capitalize">{serviceOrder.orderCategory}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Order Quantity</p>
                <p className="font-medium text-gray-900">
                  {serviceOrder.orderQty} {serviceOrder.uom}
                </p>
              </div>
              {serviceOrder.reference && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Reference/Notes</p>
                  <p className="font-medium text-gray-900">{serviceOrder.reference}</p>
                </div>
              )}
            </div>
          </div>

          {/* Dress Items */}
          {serviceOrder.dressItems && serviceOrder.dressItems.length > 0 && (
            <div
              className="p-4 rounded-xl border-2"
              style={{
                background: '#FAF8FF',
                borderColor: '#6A64F2',
                boxShadow: '0 4px 12px -2px rgba(106, 100, 242, 0.2), 0 2px 6px -2px rgba(106, 100, 242, 0.15)'
              }}
            >
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#6A64F2' }}>Dress Items</h3>
              <div className="space-y-3">
                {serviceOrder.dressItems.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg border"
                    style={{ background: '#EADDFD', borderColor: 'rgba(106, 100, 242, 0.3)' }}
                  >
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Item:</span>{' '}
                        <span className="font-medium text-gray-900">{item.name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Quantity:</span>{' '}
                        <span className="font-medium text-gray-900">{item.qty}</span>
                      </div>
                      {item.rate && (
                        <div>
                          <span className="text-muted-foreground">Rate:</span>{' '}
                          <span className="font-medium text-gray-900">₹{item.rate}</span>
                        </div>
                      )}
                      {item.amount && (
                        <div>
                          <span className="text-muted-foreground">Amount:</span>{' '}
                          <span className="font-medium text-gray-900">₹{item.amount}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Measurements */}
          {serviceOrder.measurements && Object.keys(serviceOrder.measurements).length > 0 && (
            <div className="p-4 rounded-xl bg-purple-50/70">
              <h3 className="text-lg font-semibold mb-3 text-purple-700">Measurements</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(serviceOrder.measurements).map(([key, value]) => (
                  value && (
                    <div key={key} className="bg-white rounded-lg p-2.5">
                      <span className="text-xs text-gray-500 capitalize block">{key}</span>
                      <span className="font-semibold text-gray-900">{String(value)}</span>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Design Images */}
          {serviceOrder.designList && serviceOrder.designList.length > 0 && (
            <div
              className="p-4 rounded-xl border-2"
              style={{
                background: '#FAF8FF',
                borderColor: '#6A64F2',
                boxShadow: '0 4px 12px -2px rgba(106, 100, 242, 0.2), 0 2px 6px -2px rgba(106, 100, 242, 0.15)'
              }}
            >
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#6A64F2' }}>Design Images</h3>
              <div className="grid grid-cols-3 gap-4">
                {serviceOrder.designList.map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`Design ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border-2"
                    style={{ borderColor: '#6A64F2' }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Pricing Information */}
          <div
            className="p-4 rounded-xl border-2"
            style={{
              background: '#FAF8FF',
              borderColor: '#6A64F2',
              boxShadow: '0 4px 12px -2px rgba(106, 100, 242, 0.2), 0 2px 6px -2px rgba(106, 100, 242, 0.15)'
            }}
          >
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: '#6A64F2' }}>
              <Calendar size={20} weight="duotone" />
              Pricing Information
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div
                className="p-3 rounded-lg border text-center"
                style={{ background: '#EADDFD', borderColor: 'rgba(106, 100, 242, 0.3)' }}
              >
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="font-bold text-xl" style={{ color: '#6A64F2' }}>₹{serviceOrder.totalAmount || 0}</p>
              </div>
              {serviceOrder.advanceAmount && serviceOrder.advanceAmount > 0 && (
                <div
                  className="p-3 rounded-lg border text-center"
                  style={{ background: '#d1fae5', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                >
                  <p className="text-sm text-muted-foreground">Advance Paid</p>
                  <p className="font-bold text-xl text-green-600">₹{serviceOrder.advanceAmount}</p>
                </div>
              )}
              {serviceOrder.balanceAmount !== undefined && (
                <div
                  className="p-3 rounded-lg border text-center"
                  style={{ background: '#ffedd5', borderColor: 'rgba(249, 115, 22, 0.3)' }}
                >
                  <p className="text-sm text-muted-foreground">Balance</p>
                  <p className="font-bold text-xl text-orange-600">₹{serviceOrder.balanceAmount}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

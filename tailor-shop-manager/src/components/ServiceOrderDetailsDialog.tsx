import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, User, Calendar, Ruler, UserCircle, ClockCounterClockwise, ArrowRight, FilePdf, Printer } from '@phosphor-icons/react';
import { format, isValid, parseISO } from 'date-fns';
import { ServiceOrder, OrderAllotment, DressItem } from '@/lib/types';

// Helper function to safely format dates (accepts string, Date, number timestamp, or null/undefined)
const safeFormatDate = (dateValue: string | Date | number | undefined | null, formatStr: string): string => {
  if (dateValue === undefined || dateValue === null) return '-';
  
  try {
    let date: Date;
    if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === 'number') {
      // Handle timestamp (number)
      date = new Date(dateValue);
    } else if (typeof dateValue === 'string') {
      // Try parsing as ISO string first, then as regular Date
      date = parseISO(dateValue);
      if (!isValid(date)) {
        date = new Date(dateValue);
      }
    } else {
      return '-';
    }
    
    if (!isValid(date)) {
      return '-';
    }
    
    return format(date, formatStr);
  } catch (error) {
    console.error('Error formatting date:', dateValue, error);
    return '-';
  }
};
import {
  ProformaInvoiceData,
  ProformaInvoiceItem,
  downloadProformaInvoicePdf,
  printProformaInvoice,
} from '@/lib/proformaInvoiceTemplate';
import { toast } from 'sonner';

interface ServiceOrderDetailsDialogProps {
  serviceOrder: ServiceOrder;
  orderAllotment?: OrderAllotment; // Allotment for this order (if assigned)
  open: boolean;
  onClose: () => void;
}

export function ServiceOrderDetailsDialog({ serviceOrder, orderAllotment, open, onClose }: ServiceOrderDetailsDialogProps) {
  // Build proforma invoice data from service order
  const buildProformaInvoiceData = (): ProformaInvoiceData => {
    // Build line items from dress items or use total
    const items: ProformaInvoiceItem[] = serviceOrder.dressItems && serviceOrder.dressItems.length > 0
      ? serviceOrder.dressItems.map((item: DressItem) => ({
          name: item.dressName || item.dressType || 'Stitching',
          quantity: item.quantity || 1,
          rate: item.stitchingCost || 0,
          amount: (item.quantity || 1) * (item.stitchingCost || 0),
        }))
      : [{
          name: 'Tailoring Service',
          quantity: serviceOrder.orderQty,
          rate: serviceOrder.stitchingCost,
          amount: serviceOrder.stitchingCost,
        }];

    const totalAmount = serviceOrder.totalAmount || serviceOrder.stitchingCost || 0;
    const advanceAmount = serviceOrder.advanceAmount || 0;
    const balanceDue = serviceOrder.balanceAmount ?? (totalAmount - advanceAmount);

    return {
      proformaInvoiceNo: `PI-${serviceOrder.id}`,
      invoiceDate: serviceOrder.serviceOrderDate,
      serviceOrderNo: serviceOrder.id,
      customerName: serviceOrder.customerName,
      customerId: serviceOrder.customerId,
      orderCategory: serviceOrder.orderCategory,
      expectedDeliveryDate: serviceOrder.expectedDeliveryDate,
      items,
      subtotal: totalAmount,
      advanceAmount,
      balanceDue,
      paymentMode: 'N/A',
    };
  };

  // Handle download proforma invoice
  const handleDownloadInvoice = () => {
    try {
      const invoiceData = buildProformaInvoiceData();
      downloadProformaInvoicePdf(invoiceData);
      toast.success('Proforma Invoice downloaded successfully');
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
    }
  };

  // Handle print proforma invoice
  const handlePrintInvoice = () => {
    try {
      const invoiceData = buildProformaInvoiceData();
      printProformaInvoice(invoiceData);
      toast.success('Proforma Invoice sent to printer');
    } catch (error) {
      console.error('Error printing invoice:', error);
      toast.error('Failed to print invoice');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="secondary">Open</Badge>;
      case 'allotment':
        return <Badge className="bg-orange-500">Allotment</Badge>;
      case 'allotted':
        return <Badge className="bg-amber-500">Awaiting Acceptance</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500">In Progress</Badge>;
      case 'stitched':
        return <Badge className="bg-indigo-500">Stitched</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500">Rejected</Badge>;
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

  const getHistoryActionLabel = (action: string) => {
    switch (action) {
      case 'created':
        return 'Order Assigned';
      case 'reassigned':
        return 'Order Reassigned';
      case 'status_changed':
        return 'Status Changed';
      case 'delivered':
        return 'Delivered';
      default:
        return action;
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
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2" style={{ color: '#6A64F2' }}>
              <Package size={24} style={{ color: '#6A64F2' }} weight="duotone" />
              Order Details
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintInvoice}
                className="flex items-center gap-1.5 border-2 hover:bg-purple-50"
                style={{ borderColor: '#6A64F2', color: '#6A64F2' }}
              >
                <Printer size={16} weight="duotone" />
                Print
              </Button>
              <Button
                size="sm"
                onClick={handleDownloadInvoice}
                className="flex items-center gap-1.5"
                style={{ background: '#6A64F2', color: 'white' }}
              >
                <FilePdf size={16} weight="duotone" />
                Download Invoice
              </Button>
            </div>
          </div>
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
                  {safeFormatDate(serviceOrder.serviceOrderDate, 'dd MMM yyyy')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expected Delivery</p>
                <p className="font-medium text-gray-900">
                  {safeFormatDate(serviceOrder.expectedDeliveryDate, 'dd MMM yyyy')}
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

          {/* Assignment Information */}
          {orderAllotment && (
            <div
              className="p-4 rounded-xl border-2"
              style={{
                background: '#FAF8FF',
                borderColor: '#6A64F2',
                boxShadow: '0 4px 12px -2px rgba(106, 100, 242, 0.2), 0 2px 6px -2px rgba(106, 100, 242, 0.15)'
              }}
            >
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: '#6A64F2' }}>
                <UserCircle size={20} weight="duotone" />
                Assignment Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Allotment Status</p>
                  <div className="mt-1">{getStatusBadge(orderAllotment.status || 'allotted')}</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Assignment Type</p>
                  <Badge variant="outline" className="mt-1">
                    {orderAllotment.stitchingAllotment === 'employee' ? 'In-House (Employee)' : 'Job Work (Vendor)'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Assigned To</p>
                  <p className="font-medium text-gray-900">{orderAllotment.assignedName || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Job Work No</p>
                  <p className="font-medium text-gray-900">{orderAllotment.id || '-'}</p>
                </div>
                {orderAllotment.assignedDate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Assigned Date</p>
                    <p className="font-medium text-gray-900">
                      {safeFormatDate(orderAllotment.assignedDate, 'dd MMM yyyy, hh:mm a')}
                    </p>
                  </div>
                )}
                {orderAllotment.stitchedDate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Stitched Date</p>
                    <p className="font-medium text-gray-900">
                      {safeFormatDate(orderAllotment.stitchedDate, 'dd MMM yyyy, hh:mm a')}
                    </p>
                  </div>
                )}
                {orderAllotment.deliveredDate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Delivered Date</p>
                    <p className="font-medium text-gray-900">
                      {safeFormatDate(orderAllotment.deliveredDate, 'dd MMM yyyy, hh:mm a')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Order History */}
          {orderAllotment?.history && orderAllotment.history.length > 0 && (
            <div
              className="p-4 rounded-xl border-2"
              style={{
                background: '#FAF8FF',
                borderColor: '#6A64F2',
                boxShadow: '0 4px 12px -2px rgba(106, 100, 242, 0.2), 0 2px 6px -2px rgba(106, 100, 242, 0.15)'
              }}
            >
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: '#6A64F2' }}>
                <ClockCounterClockwise size={20} weight="duotone" />
                Order History
              </h3>
              <div className="space-y-3">
                {orderAllotment.history.map((entry, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg border flex items-start gap-3"
                    style={{ background: '#EADDFD', borderColor: 'rgba(106, 100, 242, 0.3)' }}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <span className="text-xs font-bold text-purple-600">{orderAllotment.history!.length - index}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{getHistoryActionLabel(entry.action)}</span>
                        <span className="text-xs text-muted-foreground">
                          {safeFormatDate(entry.timestamp, 'dd MMM yyyy, hh:mm a')}
                        </span>
                      </div>
                      {entry.action === 'status_changed' && entry.previousStatus && entry.newStatus && (
                        <div className="flex items-center gap-2 text-sm">
                          {getStatusBadge(entry.previousStatus)}
                          <ArrowRight size={14} className="text-gray-400" />
                          {getStatusBadge(entry.newStatus)}
                        </div>
                      )}
                      {entry.action === 'reassigned' && (
                        <div className="text-sm text-gray-600">
                          <span>{entry.previousAssignedName || 'Unknown'}</span>
                          <ArrowRight size={14} className="inline mx-1 text-gray-400" />
                          <span>{entry.newAssignedName || 'Unknown'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                <p className="font-medium text-gray-900">
                  {serviceOrder.orderCategory === 'male' ? 'Men' : serviceOrder.orderCategory === 'female' ? 'Women' : 'Kids'}
                </p>
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
                        <span className="font-medium text-gray-900">{item.dressName || item.dressType}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Quantity:</span>{' '}
                        <span className="font-medium text-gray-900">{item.quantity}</span>
                      </div>
                      {item.stitchingCost !== undefined && (
                        <div>
                          <span className="text-muted-foreground">Rate:</span>{' '}
                          <span className="font-medium text-gray-900">₹{item.stitchingCost}</span>
                        </div>
                      )}
                      {item.quantity && item.stitchingCost !== undefined && (
                        <div>
                          <span className="text-muted-foreground">Amount:</span>{' '}
                          <span className="font-medium text-gray-900">₹{item.quantity * item.stitchingCost}</span>
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
                Measurements
              </h3>
              <div className="space-y-4">
                {Object.entries(serviceOrder.measurements).map(([category, categoryMeasurements]) => {
                  // Check if categoryMeasurements is an object with properties
                  if (categoryMeasurements && typeof categoryMeasurements === 'object') {
                    const measurementEntries = Object.entries(categoryMeasurements as Record<string, number | string>);
                    if (measurementEntries.length === 0) return null;
                    
                    return (
                      <div key={category}>
                        <h4 className="text-sm font-semibold text-gray-700 capitalize mb-2 border-b pb-1" style={{ borderColor: 'rgba(106, 100, 242, 0.3)' }}>
                          {category}
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {measurementEntries.map(([measureName, measureValue]) => (
                            measureValue !== undefined && measureValue !== null && measureValue !== '' && (
                              <div
                                key={measureName}
                                className="p-2 rounded-lg"
                                style={{ background: '#EADDFD' }}
                              >
                                <span className="text-xs text-gray-500 capitalize block">{measureName.replace(/([A-Z])/g, ' $1').trim()}</span>
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
                    <div key={category} className="p-2 rounded-lg" style={{ background: '#EADDFD' }}>
                      <span className="text-xs text-gray-500 capitalize block">{category}</span>
                      <span className="font-semibold text-gray-900">{String(categoryMeasurements)}</span>
                    </div>
                  );
                })}
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

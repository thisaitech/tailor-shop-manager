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
import { Package, User, Calendar, Ruler, X, Spinner } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { getServiceOrderById, ServiceOrderWithCompany } from '@/lib/firestore/serviceOrderService';
import { getCustomerById } from '@/lib/firestore/customerService';
import { Measurements, OrderAllotment } from '@/lib/types';
import { toast } from 'sonner';

interface OrderDetailsDialogProps {
  allotment?: OrderAllotment | null;
  serviceOrder?: ServiceOrderWithCompany | null;
  open: boolean;
  onClose: () => void;
}

function formatSafeDate(value?: number | null): string {
  if (!value) return '—';
  try {
    return format(new Date(value), 'dd MMM yyyy');
  } catch {
    return '—';
  }
}

/** True if measurements object has at least one usable value */
function hasMeasurementData(measurements?: Measurements | null | any): boolean {
  if (!measurements) return false;
  if (Array.isArray(measurements)) return measurements.length > 0;
  if (typeof measurements !== 'object') return false;

  return Object.values(measurements).some((category) => {
    if (category === undefined || category === null || category === '') return false;
    if (typeof category !== 'object') return true;
    return Object.entries(category as Record<string, unknown>).some(([key, value]) => {
      if (key === 'specialNote') return false;
      return value !== undefined && value !== null && value !== '';
    });
  });
}

/** Merge dress-item measurements into a single Measurements object */
function measurementsFromDressItems(order?: ServiceOrderWithCompany | null): Measurements | null {
  if (!order?.dressItems?.length) return null;
  const merged: Record<string, any> = {};
  for (const item of order.dressItems) {
    if (item.measurements && hasMeasurementData(item.measurements)) {
      Object.assign(merged, item.measurements);
    } else if (item.dressType && item.measurements) {
      merged[item.dressType] = item.measurements;
    }
  }
  return hasMeasurementData(merged) ? (merged as Measurements) : null;
}

export function OrderDetailsDialog({
  allotment,
  serviceOrder: initialServiceOrder,
  open,
  onClose,
}: OrderDetailsDialogProps) {
  const [serviceOrder, setServiceOrder] = useState<ServiceOrderWithCompany | null>(
    initialServiceOrder || null
  );
  const [displayMeasurements, setDisplayMeasurements] = useState<Measurements | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    if (!allotment && !initialServiceOrder) return;
    loadOrderAndMeasurements();
  }, [open, allotment?.serviceOrderNo, allotment?.id, initialServiceOrder?.id]);

  const resolveMeasurements = async (
    order: ServiceOrderWithCompany
  ): Promise<Measurements | null> => {
    // 1) Order measurements
    if (hasMeasurementData(order.measurements)) {
      return order.measurements as Measurements;
    }
    // 2) Previous measurements snapshot on order
    if (hasMeasurementData(order.previousMeasurements)) {
      return order.previousMeasurements as Measurements;
    }
    // 3) Dress line-item measurements
    const fromItems = measurementsFromDressItems(order);
    if (fromItems) return fromItems;

    // 4) Customer profile measurements (owner often saves here)
    if (order.customerId) {
      try {
        const customer = await getCustomerById(order.customerId);
        if (customer && hasMeasurementData(customer.measurements)) {
          return customer.measurements as Measurements;
        }
      } catch (err) {
        console.warn('[OrderDetailsDialog] Could not load customer measurements:', err);
      }
    }

    return null;
  };

  const loadOrderAndMeasurements = async () => {
    try {
      setLoading(true);

      // Show passed order immediately so dialog is never blank
      if (initialServiceOrder) {
        setServiceOrder(initialServiceOrder);
        setDisplayMeasurements(
          hasMeasurementData(initialServiceOrder.measurements)
            ? (initialServiceOrder.measurements as Measurements)
            : hasMeasurementData(initialServiceOrder.previousMeasurements)
              ? (initialServiceOrder.previousMeasurements as Measurements)
              : measurementsFromDressItems(initialServiceOrder)
        );
      }

      let order: ServiceOrderWithCompany | null = initialServiceOrder || null;

      if (initialServiceOrder?.id) {
        try {
          const fresh = await getServiceOrderById(initialServiceOrder.id);
          if (fresh) order = fresh;
        } catch (err) {
          console.warn('[OrderDetailsDialog] Fresh order fetch failed, using local order:', err);
        }
      } else {
        const orderId = allotment?.serviceOrderNo || allotment?.orderNumber;
        if (!orderId) {
          toast.error('Failed to load order details');
          setServiceOrder(null);
          return;
        }
        order = await getServiceOrderById(orderId);
      }

      if (!order) {
        toast.error('Order not found');
        return;
      }

      setServiceOrder(order);
      const measurements = await resolveMeasurements(order);
      setDisplayMeasurements(measurements);
    } catch (error) {
      console.error('[OrderDetailsDialog] Error loading order details:', error);
      if (initialServiceOrder) {
        setServiceOrder(initialServiceOrder);
        const fallback =
          (hasMeasurementData(initialServiceOrder.measurements) &&
            (initialServiceOrder.measurements as Measurements)) ||
          (hasMeasurementData(initialServiceOrder.previousMeasurements) &&
            (initialServiceOrder.previousMeasurements as Measurements)) ||
          measurementsFromDressItems(initialServiceOrder);
        setDisplayMeasurements(fallback || null);
      } else {
        toast.error('Failed to load order details');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="secondary">Open</Badge>;
      case 'awaiting':
        return <Badge className="bg-blue-500 text-white">Awaiting</Badge>;
      case 'inprogress':
        return <Badge className="bg-orange-500 text-white">In Progress</Badge>;
      case 'ready':
        return <Badge className="bg-green-500 text-white">Ready</Badge>;
      case 'delivered':
        return <Badge className="bg-gray-500 text-white">Delivered</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500 text-white">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const assignedName =
    allotment?.assignedName || serviceOrder?.assignedToName || '—';
  const jobWorkNo =
    allotment?.jobWorkNo || allotment?.id || serviceOrder?.jobWorkNo || '—';
  const dressItemName =
    allotment?.dressItemName ||
    serviceOrder?.dressItems?.[0]?.dressName ||
    'Standard Order';

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
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
            Complete details for order{' '}
            {initialServiceOrder?.id || allotment?.serviceOrderNo || ''}
          </DialogDescription>
        </DialogHeader>

        {loading && !serviceOrder ? (
          <div className="py-12 text-center">
            <Spinner size={32} className="animate-spin mx-auto mb-3 text-primary" />
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
                <span className="inline-flex items-center justify-center rounded-md border px-2 py-0.5 font-medium w-fit whitespace-nowrap font-mono text-sm bg-secondary text-secondary-foreground">
                  {serviceOrder.id}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Order Status</p>
                  <div className="mt-1">{getStatusBadge(serviceOrder.orderStatus)}</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Order Date</p>
                  <p className="font-medium">{formatSafeDate(serviceOrder.serviceOrderDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expected Delivery</p>
                  <p className="font-medium">{formatSafeDate(serviceOrder.expectedDeliveryDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Stitching Cost</p>
                  <p className="font-medium">₹{(serviceOrder.stitchingCost || 0).toFixed(2)}</p>
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

            {/* Assignment */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Calendar size={20} />
                Assignment Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Job Work No</p>
                  <p className="font-medium">{jobWorkNo}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Assigned To</p>
                  <p className="font-medium">{assignedName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Assigned Date</p>
                  <p className="font-medium">
                    {formatSafeDate(
                      allotment?.jobWorkDate ||
                        allotment?.assignedDate ||
                        serviceOrder.assignedDate
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expected Delivery</p>
                  <p className="font-medium">
                    {formatSafeDate(
                      allotment?.expectedDeliveryDate || serviceOrder.expectedDeliveryDate
                    )}
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
                  <p className="font-medium">{dressItemName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Order Category</p>
                  <p className="font-medium capitalize">
                    {serviceOrder.orderCategory === 'male'
                      ? 'Men'
                      : serviceOrder.orderCategory === 'female'
                        ? 'Women'
                        : serviceOrder.orderCategory === 'kids'
                          ? 'Kids'
                          : serviceOrder.orderCategory || '—'}
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

            {/* Measurements — critical for stitching */}
            <Separator />
            <div
              className="p-4 rounded-xl border-2"
              style={{
                background: '#f8f5ff',
                borderColor: '#a78bfa',
              }}
            >
              <h3 className="text-base font-semibold mb-3 flex items-center gap-2" style={{ color: '#6A64F2' }}>
                <Ruler size={20} />
                Customer Measurements
                {loading && (
                  <Spinner size={16} className="animate-spin text-purple-500" />
                )}
              </h3>

              {displayMeasurements && hasMeasurementData(displayMeasurements) ? (
                <div className="space-y-4">
                  {Object.entries(displayMeasurements).map(([category, categoryMeasurements]) => {
                    if (!categoryMeasurements || typeof categoryMeasurements !== 'object') {
                      if (!categoryMeasurements) return null;
                      return (
                        <div key={category} className="p-3 rounded-xl" style={{ background: '#ede9fe' }}>
                          <p className="text-xs text-purple-600 font-medium capitalize mb-1">{category}</p>
                          <p className="text-xl font-bold text-gray-800">{String(categoryMeasurements)}</p>
                        </div>
                      );
                    }

                    const entries = Object.entries(
                      categoryMeasurements as Record<string, unknown>
                    ).filter(([key, value]) => {
                      if (key === 'specialNote') return false;
                      return value !== undefined && value !== null && value !== '';
                    });
                    if (entries.length === 0) return null;

                    return (
                      <div key={category}>
                        <h4 className="text-sm font-semibold text-gray-700 capitalize mb-2">
                          {category.replace(/([A-Z])/g, ' $1').trim()}
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {entries.map(([measureName, measureValue]) => (
                            <div
                              key={measureName}
                              className="p-3 rounded-xl bg-white border border-purple-100"
                            >
                              <p className="text-xs text-purple-600 font-medium capitalize mb-1">
                                {measureName.replace(/([A-Z])/g, ' $1').trim()}
                              </p>
                              <p className="text-lg font-bold text-gray-800">
                                {typeof measureValue === 'number'
                                  ? `${measureValue}"`
                                  : typeof measureValue === 'object'
                                    ? ''
                                    : String(measureValue)}
                              </p>
                            </div>
                          ))}
                        </div>
                        {/* Special note text if present */}
                        {(categoryMeasurements as any).specialNote?.text && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Note: {(categoryMeasurements as any).specialNote.text}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-purple-300 bg-white/80 px-3 py-6 text-center">
                  <p className="text-sm font-medium text-gray-700">No measurements found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ask the owner to add measurements on this order or customer profile.
                  </p>
                </div>
              )}
            </div>

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

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, User, Calendar, Ruler, ClockCounterClockwise, ArrowRight, FilePdf, Printer, CheckCircle, XCircle, ArrowsClockwise, FileText, Truck, Spinner } from '@phosphor-icons/react';
import { format, isValid, parseISO } from 'date-fns';
import { ServiceOrder, OrderAllotment, DressItem, Measurements } from '@/lib/types';
import { getCustomerById } from '@/lib/firestore/customerService';
import { getServiceOrderById } from '@/lib/firestore/serviceOrderService';

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

export function ServiceOrderDetailsDialog({
  serviceOrder: serviceOrderProp,
  orderAllotment,
  open,
  onClose,
}: ServiceOrderDetailsDialogProps) {
  const [resolvedOrder, setResolvedOrder] = useState<ServiceOrder>(serviceOrderProp);
  const [loadingMeasurements, setLoadingMeasurements] = useState(false);

  const hasMeasurementData = (measurements?: Measurements | null | any): boolean => {
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
  };

  // Keep local order in sync and enrich measurements from customer if missing
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const enrich = async () => {
      setResolvedOrder(serviceOrderProp);
      let next: ServiceOrder = { ...serviceOrderProp };

      try {
        const fresh = await getServiceOrderById(serviceOrderProp.id);
        if (fresh && !cancelled) {
          next = { ...next, ...fresh };
        }
      } catch {
        // keep passed order
      }

      if (!hasMeasurementData(next.measurements)) {
        if (hasMeasurementData(next.previousMeasurements)) {
          next = { ...next, measurements: next.previousMeasurements };
        } else if (next.customerId) {
          setLoadingMeasurements(true);
          try {
            const customer = await getCustomerById(next.customerId);
            if (customer && hasMeasurementData(customer.measurements) && !cancelled) {
              next = { ...next, measurements: customer.measurements };
            }
          } catch (err) {
            console.warn('[ServiceOrderDetailsDialog] Failed to load customer measurements:', err);
          } finally {
            if (!cancelled) setLoadingMeasurements(false);
          }
        }
      }

      if (!cancelled) setResolvedOrder(next);
    };

    enrich();
    return () => {
      cancelled = true;
    };
  }, [open, serviceOrderProp.id, serviceOrderProp.customerId]);

  // Always render enriched order (falls back to prop while loading)
  const serviceOrder = resolvedOrder;

  // Build proforma invoice data from service order
  const buildProformaInvoiceData = (): ProformaInvoiceData => {
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
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto border-2"
        style={{
          background: '#EADDFD',
          borderColor: '#6A64F2'
        }}
      >
        <DialogHeader className="space-y-3 pb-2">
          {/* Title Row */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#6A64F2' }}>
              <Package size={22} weight="duotone" className="text-white" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg font-bold" style={{ color: '#6A64F2' }}>
                Order Details
              </DialogTitle>
              <DialogDescription className="mt-0.5">
                <Badge
                  variant="outline"
                  className="font-mono text-xs font-semibold"
                  style={{ background: '#FAF8FF', color: '#6A64F2', borderColor: '#6A64F2' }}
                >
                  {serviceOrder.id}
                </Badge>
              </DialogDescription>
            </div>
          </div>
          
          {/* Action Buttons - Full width on mobile */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintInvoice}
              className="flex-1 h-10 flex items-center justify-center gap-2 border-2 hover:bg-purple-50"
              style={{ borderColor: '#6A64F2', color: '#6A64F2' }}
            >
              <Printer size={18} weight="duotone" />
              <span>Print</span>
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadInvoice}
              className="flex-1 h-10 flex items-center justify-center gap-2"
              style={{ background: '#6A64F2', color: 'white' }}
            >
              <FilePdf size={18} weight="duotone" />
              <span>Invoice</span>
            </Button>
          </div>
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

          {/* Order Timeline */}
          {(() => {
            // Build timeline from ServiceOrder data
            const buildTimeline = () => {
              const stages: Array<{
                id: string;
                stage: string;
                status: string;
                timestamp: number;
                assignedTo?: string;
                assignedBy?: string;
                duration?: string;
                notes?: string;
                icon: React.ReactNode;
                color: string;
              }> = [];
              
              // Calculate duration helper
              const calcDuration = (start: number, end: number): string => {
                const diffMs = end - start;
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMins / 60);
                const diffDays = Math.floor(diffHours / 24);
                if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
                if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
                if (diffMins > 0) return `${diffMins} min${diffMins > 1 ? 's' : ''}`;
                return 'Just now';
              };

              // 1. Order Created
              if (serviceOrder.createdAt) {
                stages.push({
                  id: 'created', stage: 'Order Created', status: 'open',
                  timestamp: serviceOrder.createdAt,
                  assignedBy: serviceOrder.adminId || 'Admin',
                  icon: <Package size={16} className="text-purple-600" weight="fill" />,
                  color: 'bg-purple-100 border-purple-400',
                });
              }

              // 2. Order Assigned
              if (serviceOrder.assignedDate) {
                stages.push({
                  id: 'assigned', stage: 'Order Assigned', status: 'awaiting',
                  timestamp: serviceOrder.assignedDate,
                  assignedTo: serviceOrder.assignedToName || 'Unknown',
                  assignedBy: serviceOrder.adminId || 'Admin',
                  duration: serviceOrder.createdAt ? calcDuration(serviceOrder.createdAt, serviceOrder.assignedDate) : undefined,
                  notes: `Assigned to ${serviceOrder.assignmentType === 'vendor' ? 'Vendor' : 'Employee'}`,
                  icon: <User size={16} className="text-amber-600" weight="fill" />,
                  color: 'bg-amber-100 border-amber-400',
                });
              }

              // 3. Order Accepted
              if (serviceOrder.acceptedDate) {
                stages.push({
                  id: 'accepted', stage: 'Order Accepted', 
                  status: serviceOrder.assignmentType === 'vendor' ? 'waitingForDC' : 'inprogress',
                  timestamp: serviceOrder.acceptedDate,
                  assignedTo: serviceOrder.assignedToName,
                  duration: serviceOrder.assignedDate ? calcDuration(serviceOrder.assignedDate, serviceOrder.acceptedDate) : undefined,
                  icon: <CheckCircle size={16} className="text-green-600" weight="fill" />,
                  color: 'bg-green-100 border-green-400',
                });
              }

              // 4. Order Rejected
              if (serviceOrder.rejectedDate) {
                stages.push({
                  id: 'rejected', stage: 'Order Rejected', status: 'rejected',
                  timestamp: serviceOrder.rejectedDate,
                  assignedTo: serviceOrder.assignedToName,
                  duration: serviceOrder.assignedDate ? calcDuration(serviceOrder.assignedDate, serviceOrder.rejectedDate) : undefined,
                  notes: serviceOrder.rejectionReason,
                  icon: <XCircle size={16} className="text-red-600" weight="fill" />,
                  color: 'bg-red-100 border-red-400',
                });
              }

              // 5. DC Created
              if (serviceOrder.dcDate && serviceOrder.dcNumber) {
                stages.push({
                  id: 'dc_created', stage: 'Delivery Challan Created', status: 'inprogress',
                  timestamp: serviceOrder.dcDate,
                  assignedBy: serviceOrder.adminId || 'Admin',
                  duration: serviceOrder.acceptedDate ? calcDuration(serviceOrder.acceptedDate, serviceOrder.dcDate) : undefined,
                  notes: `DC No: ${serviceOrder.dcNumber}`,
                  icon: <FileText size={16} className="text-teal-600" weight="fill" />,
                  color: 'bg-teal-100 border-teal-400',
                });
              }

              // 6. Work Completed
              if (serviceOrder.completedDate) {
                const prevDate = serviceOrder.dcDate || serviceOrder.acceptedDate;
                stages.push({
                  id: 'completed', 
                  stage: serviceOrder.assignmentType === 'vendor' ? 'Job Work Completed' : 'Work Completed',
                  status: serviceOrder.assignmentType === 'vendor' ? 'job-completed' : 'ready',
                  timestamp: serviceOrder.completedDate,
                  assignedTo: serviceOrder.assignedToName,
                  duration: prevDate ? calcDuration(prevDate, serviceOrder.completedDate) : undefined,
                  icon: <CheckCircle size={16} className="text-indigo-600" weight="fill" />,
                  color: 'bg-indigo-100 border-indigo-400',
                });
              }

              // 7. Goods Received
              if (serviceOrder.goodsReceivedDate && serviceOrder.goodsReceiptNo) {
                stages.push({
                  id: 'goods_received', stage: 'Goods Received', status: 'received-note',
                  timestamp: serviceOrder.goodsReceivedDate,
                  assignedBy: serviceOrder.adminId || 'Admin',
                  duration: serviceOrder.completedDate ? calcDuration(serviceOrder.completedDate, serviceOrder.goodsReceivedDate) : undefined,
                  notes: `GRN No: ${serviceOrder.goodsReceiptNo}`,
                  icon: <Truck size={16} className="text-cyan-600" weight="fill" />,
                  color: 'bg-cyan-100 border-cyan-400',
                });
              }

              // 8. Reassigned
              if (serviceOrder.isReassigned && serviceOrder.reassignedDate) {
                stages.push({
                  id: 'reassigned', stage: 'Order Reassigned', status: 'awaiting',
                  timestamp: serviceOrder.reassignedDate,
                  assignedTo: serviceOrder.assignedToName,
                  assignedBy: serviceOrder.adminId || 'Admin',
                  notes: serviceOrder.previousAssignedToName ? `Previously: ${serviceOrder.previousAssignedToName}` : undefined,
                  icon: <ArrowsClockwise size={16} className="text-orange-600" weight="fill" />,
                  color: 'bg-orange-100 border-orange-400',
                });
              }

              // 9. Delivered
              if (serviceOrder.deliveredDate) {
                const prevDate = serviceOrder.goodsReceivedDate || serviceOrder.completedDate;
                stages.push({
                  id: 'delivered', stage: 'Order Delivered', status: 'delivered',
                  timestamp: serviceOrder.deliveredDate,
                  assignedBy: serviceOrder.adminId || 'Admin',
                  duration: prevDate ? calcDuration(prevDate, serviceOrder.deliveredDate) : undefined,
                  icon: <CheckCircle size={16} className="text-emerald-600" weight="fill" />,
                  color: 'bg-emerald-100 border-emerald-400',
                });
              }

              return stages.sort((a, b) => a.timestamp - b.timestamp);
            };

            const timeline = buildTimeline();
            const totalDuration = serviceOrder.createdAt 
              ? (() => {
                  const start = serviceOrder.createdAt;
                  const end = serviceOrder.deliveredDate || Date.now();
                  const diffMs = end - start;
                  const diffMins = Math.floor(diffMs / 60000);
                  const diffHours = Math.floor(diffMins / 60);
                  const diffDays = Math.floor(diffHours / 24);
                  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
                  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
                  if (diffMins > 0) return `${diffMins} min${diffMins > 1 ? 's' : ''}`;
                  return 'Just now';
                })()
              : '';

            if (timeline.length === 0) return null;

            return (
              <div
                className="p-4 sm:p-5 rounded-xl border-2"
                style={{ background: '#f8f5ff', borderColor: '#a78bfa' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold flex items-center gap-2" style={{ color: '#6A64F2' }}>
                    <ClockCounterClockwise size={20} weight="duotone" />
                    Order Timeline
                  </h3>
                  <Badge className="bg-purple-100 text-purple-700 text-xs">
                    Total: {totalDuration}
                  </Badge>
                </div>

                <div className="relative">
                  {/* Vertical Timeline Line */}
                  <div className="absolute left-[19px] top-6 bottom-6 w-0.5" style={{ backgroundColor: '#c4b5fd' }} />

                  <div className="space-y-4">
                    {timeline.map((stage) => (
                      <div key={stage.id} className="relative flex gap-4">
                        {/* Timeline Node */}
                        <div className="relative z-10 flex-shrink-0">
                          <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center bg-white ${stage.color}`}>
                            {stage.icon}
                          </div>
                        </div>

                        {/* Content Card */}
                        <div className="flex-1 p-3 rounded-xl border" style={{ backgroundColor: 'white', borderColor: '#e9d5ff' }}>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{stage.stage}</p>
                              {getStatusBadge(stage.status)}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs font-medium text-gray-700">
                                {safeFormatDate(stage.timestamp, 'MMM dd, yyyy')}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {safeFormatDate(stage.timestamp, 'hh:mm a')}
                              </p>
                            </div>
                          </div>

                          {/* Stage Details */}
                          <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                            {stage.assignedTo && (
                              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-blue-50">
                                <User size={14} className="text-blue-600" weight="fill" />
                                <div>
                                  <p className="text-[10px] text-blue-600 font-medium">Assigned To</p>
                                  <p className="font-semibold text-gray-800">{stage.assignedTo}</p>
                                </div>
                              </div>
                            )}
                            {stage.assignedBy && (
                              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-purple-50">
                                <User size={14} className="text-purple-600" weight="fill" />
                                <div>
                                  <p className="text-[10px] text-purple-600 font-medium">Assigned By</p>
                                  <p className="font-semibold text-gray-800">{stage.assignedBy}</p>
                                </div>
                              </div>
                            )}
                            {stage.duration && (
                              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-50">
                                <Calendar size={14} className="text-amber-600" weight="fill" />
                                <div>
                                  <p className="text-[10px] text-amber-600 font-medium">Duration</p>
                                  <p className="font-semibold text-gray-800">{stage.duration}</p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Notes */}
                          {stage.notes && (
                            <div className="mt-2 p-2 rounded-lg bg-gray-50">
                              <p className="text-xs text-gray-600">
                                <span className="font-medium">Note:</span> {stage.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Current Status Indicator */}
                  {serviceOrder.orderStatus !== 'delivered' && (
                    <div className="mt-4 p-3 rounded-xl border-2 border-dashed" style={{ borderColor: '#c4b5fd', backgroundColor: '#faf5ff' }}>
                      <div className="flex items-center gap-2">
                        <Spinner size={16} className="animate-spin text-purple-500" />
                        <p className="text-sm font-medium text-purple-700">
                          Current Status: <span className="capitalize">{serviceOrder.orderStatus.replace(/-/g, ' ')}</span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

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
          <div
            className="p-4 sm:p-5 rounded-xl border-2"
            style={{
              background: '#f8f5ff',
              borderColor: '#a78bfa',
              boxShadow: '0 4px 12px -2px rgba(106, 100, 242, 0.15)'
            }}
          >
            <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: '#6A64F2' }}>
              <Ruler size={20} weight="duotone" />
              Measurements
              {loadingMeasurements && <Spinner size={16} className="animate-spin" />}
            </h3>
            {serviceOrder.measurements && hasMeasurementData(serviceOrder.measurements) ? (
              <div className="space-y-5">
                {Object.entries(serviceOrder.measurements).map(([category, categoryMeasurements]) => {
                  // Check if categoryMeasurements is an object with properties
                  if (categoryMeasurements && typeof categoryMeasurements === 'object') {
                    const measurementEntries = Object.entries(categoryMeasurements as Record<string, number | string | object>).filter(
                      ([key, value]) => key !== 'specialNote' && value !== undefined && value !== null && value !== ''
                    );
                    if (measurementEntries.length === 0) return null;
                    
                    return (
                      <div key={category}>
                        {/* Category Title */}
                        <h4 className="text-sm font-semibold text-gray-700 capitalize mb-3">
                          {category.replace(/([A-Z])/g, ' $1').trim()}
                        </h4>
                        {/* Measurement Cards Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {measurementEntries.map(([measureName, measureValue]) => (
                            <div
                              key={measureName}
                              className="p-3 rounded-xl"
                              style={{ background: '#ede9fe' }}
                            >
                              <p className="text-xs text-purple-600 font-medium capitalize mb-1">
                                {measureName.replace(/([A-Z])/g, ' $1').trim()}
                              </p>
                              <p className="text-xl font-bold text-gray-800">
                                {typeof measureValue === 'number' ? measureValue : String(measureValue)}
                                {typeof measureValue === 'number' && <span className="text-base">"</span>}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  // If it's a simple value (not nested object)
                  return categoryMeasurements ? (
                    <div key={category} className="p-3 rounded-xl" style={{ background: '#ede9fe' }}>
                      <p className="text-xs text-purple-600 font-medium capitalize mb-1">{category}</p>
                      <p className="text-xl font-bold text-gray-800">
                        {String(categoryMeasurements)}<span className="text-base">"</span>
                      </p>
                    </div>
                  ) : null;
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-purple-300 bg-white/70 px-3 py-5 text-center">
                <p className="text-sm font-medium text-gray-700">
                  {loadingMeasurements ? 'Loading measurements...' : 'No measurements found'}
                </p>
                {!loadingMeasurements && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Ask the owner to add measurements on this order or customer profile.
                  </p>
                )}
              </div>
            )}
          </div>

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
            <div className="grid grid-cols-3 gap-3">
              {/* Total Amount */}
              <div
                className="p-3 rounded-lg border text-center"
                style={{ background: '#EADDFD', borderColor: 'rgba(106, 100, 242, 0.3)' }}
              >
                <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
                <p className="font-bold text-lg" style={{ color: '#6A64F2' }}>₹{serviceOrder.totalAmount || serviceOrder.stitchingCost || 0}</p>
              </div>
              {/* Advance Payment - Always show */}
              <div
                className="p-3 rounded-lg border text-center"
                style={{ background: '#d1fae5', borderColor: 'rgba(16, 185, 129, 0.3)' }}
              >
                <p className="text-xs text-muted-foreground mb-1">Advance Paid</p>
                <p className="font-bold text-lg text-green-600">₹{serviceOrder.advanceAmount || 0}</p>
              </div>
              {/* Balance - Always show */}
              <div
                className="p-3 rounded-lg border text-center"
                style={{ background: '#ffedd5', borderColor: 'rgba(249, 115, 22, 0.3)' }}
              >
                <p className="text-xs text-muted-foreground mb-1">Balance</p>
                <p className="font-bold text-lg text-orange-600">
                  ₹{serviceOrder.balanceAmount ?? ((serviceOrder.totalAmount || serviceOrder.stitchingCost || 0) - (serviceOrder.advanceAmount || 0))}
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

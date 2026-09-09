import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Printer,
  Package,
  User,
  ClockCounterClockwise,
  Ruler,
  Images,
  NotePencil,
  Play,
  Pause,
  Question,
  ShieldCheck,
  CheckCircle,
  Spinner,
} from '@phosphor-icons/react';
import { format, isValid, parseISO } from 'date-fns';
import { ServiceOrder, Measurements } from '@/lib/types';
import { getCustomerById } from '@/lib/firestore/customerService';
import {
  getServiceOrderById,
  acceptOrder,
  markOrderReady,
  updateServiceOrder,
} from '@/lib/firestore/serviceOrderService';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

interface EmployeeOrderDetailsDialogProps {
  serviceOrder: ServiceOrder;
  open: boolean;
  onClose: () => void;
  /** Called after a successful work-status update so the parent list can refresh */
  onStatusUpdated?: (order: ServiceOrder) => void;
}

const safeFormatDate = (dateValue: string | Date | number | undefined | null, formatStr: string): string => {
  if (dateValue === undefined || dateValue === null) return '-';
  try {
    let date: Date;
    if (dateValue instanceof Date) date = dateValue;
    else if (typeof dateValue === 'number') date = new Date(dateValue);
    else if (typeof dateValue === 'string') {
      date = parseISO(dateValue);
      if (!isValid(date)) date = new Date(dateValue);
    } else return '-';
    if (!isValid(date)) return '-';
    return format(date, formatStr);
  } catch {
    return '-';
  }
};

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

const flattenMeasurements = (measurements?: Measurements | null): Array<{ label: string; value: string }> => {
  if (!measurements || typeof measurements !== 'object') return [];
  const rows: Array<{ label: string; value: string }> = [];
  Object.entries(measurements).forEach(([, category]) => {
    if (!category || typeof category !== 'object') return;
    Object.entries(category as Record<string, unknown>).forEach(([key, value]) => {
      if (key === 'specialNote') return;
      if (value === undefined || value === null || value === '') return;
      if (typeof value === 'object') return;
      rows.push({
        label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim(),
        value: typeof value === 'number' ? `${value}"` : String(value),
      });
    });
  });
  return rows;
};

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    open: 'Open',
    awaiting: 'Awaiting',
    allotted: 'Assigned',
    inprogress: 'In Progress',
    in_progress: 'In Progress',
    ready: 'Ready',
    delivered: 'Delivered',
    rejected: 'Rejected',
  };
  return map[status] || status.replace(/-/g, ' ');
};

type BusyAction = 'start' | 'pause' | 'clarification' | 'qc' | 'completed' | null;

export function EmployeeOrderDetailsDialog({
  serviceOrder: serviceOrderProp,
  open,
  onClose,
  onStatusUpdated,
}: EmployeeOrderDetailsDialogProps) {
  const { employee } = useAuth();
  const [order, setOrder] = useState<ServiceOrder>(serviceOrderProp);
  const [customerPhone, setCustomerPhone] = useState<string>('-');
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setOrder(serviceOrderProp);
      let next: ServiceOrder = { ...serviceOrderProp };

      try {
        const fresh = await getServiceOrderById(serviceOrderProp.id);
        if (fresh && !cancelled) next = { ...next, ...fresh };
      } catch {
        // keep passed order
      }

      if (!hasMeasurementData(next.measurements)) {
        if (hasMeasurementData(next.previousMeasurements)) {
          next = { ...next, measurements: next.previousMeasurements };
        } else if (next.customerId) {
          try {
            const customer = await getCustomerById(next.customerId);
            if (customer && !cancelled) {
              if (hasMeasurementData(customer.measurements)) {
                next = { ...next, measurements: customer.measurements };
              }
              setCustomerPhone(customer.phone || customer.whatsappNumber || '-');
            }
          } catch {
            // ignore
          }
        }
      }

      if (next.customerId) {
        try {
          const customer = await getCustomerById(next.customerId);
          if (customer && !cancelled) {
            setCustomerPhone(customer.phone || customer.whatsappNumber || '-');
          }
        } catch {
          // ignore
        }
      }

      if (!cancelled) {
        setOrder(next);
        setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, serviceOrderProp.id, serviceOrderProp.customerId]);

  const applyLocalUpdate = (patch: Partial<ServiceOrder>) => {
    const updated = { ...order, ...patch };
    setOrder(updated);
    onStatusUpdated?.(updated);
  };

  const handleStartStitching = async () => {
    if (!employee) {
      toast.error('Employee session not found');
      return;
    }
    if (order.orderStatus !== 'awaiting') {
      toast.message('Work already started for this order');
      return;
    }
    try {
      setBusyAction('start');
      await acceptOrder(order.id, employee.id, employee.name);
      applyLocalUpdate({
        orderStatus: 'inprogress',
        acceptedDate: Date.now(),
        employeeWorkProcess: 'active',
      });
      toast.success('Stitching started — order is now In Progress');
    } catch (error) {
      console.error('Start stitching failed:', error);
      toast.error('Failed to start stitching');
    } finally {
      setBusyAction(null);
    }
  };

  const handlePauseWork = async () => {
    if (!employee) {
      toast.error('Employee session not found');
      return;
    }
    if (order.orderStatus !== 'inprogress') {
      toast.error('Pause is only available while stitching is in progress');
      return;
    }
    try {
      setBusyAction('pause');
      await updateServiceOrder(order.id, { employeeWorkProcess: 'paused' });
      applyLocalUpdate({ employeeWorkProcess: 'paused' });
      toast.success('Work paused');
    } catch (error) {
      console.error('Pause work failed:', error);
      toast.error('Failed to pause work');
    } finally {
      setBusyAction(null);
    }
  };

  const handleNeedClarification = async () => {
    if (!employee) {
      toast.error('Employee session not found');
      return;
    }
    if (order.orderStatus !== 'inprogress') {
      toast.error('Clarification is only available while stitching is in progress');
      return;
    }
    try {
      setBusyAction('clarification');
      await updateServiceOrder(order.id, { employeeWorkProcess: 'clarification' });
      applyLocalUpdate({ employeeWorkProcess: 'clarification' });
      toast.success('Marked as Needs Clarification');
    } catch (error) {
      console.error('Clarification update failed:', error);
      toast.error('Failed to update status');
    } finally {
      setBusyAction(null);
    }
  };

  const handleReadyForQc = async () => {
    if (!employee) {
      toast.error('Employee session not found');
      return;
    }
    if (order.orderStatus !== 'inprogress') {
      toast.error('Order must be In Progress to mark Ready for QC');
      return;
    }
    try {
      setBusyAction('qc');
      await markOrderReady(order.id, employee.id, employee.name);
      applyLocalUpdate({
        orderStatus: 'ready',
        completedDate: Date.now(),
        employeeWorkProcess: 'active',
      });
      toast.success('Order marked Ready for QC');
    } catch (error) {
      console.error('Ready for QC failed:', error);
      toast.error('Failed to mark Ready for QC');
    } finally {
      setBusyAction(null);
    }
  };

  const handleCompleted = async () => {
    if (!employee) {
      toast.error('Employee session not found');
      return;
    }
    if (order.orderStatus !== 'inprogress' && order.orderStatus !== 'ready') {
      toast.error('Complete is only available for In Progress or Ready orders');
      return;
    }
    try {
      setBusyAction('completed');
      if (order.orderStatus === 'inprogress') {
        await markOrderReady(order.id, employee.id, employee.name);
      }
      applyLocalUpdate({
        orderStatus: 'ready',
        completedDate: order.completedDate || Date.now(),
        employeeWorkProcess: 'active',
      });
      toast.success('Order marked as Completed (Ready)');
    } catch (error) {
      console.error('Complete order failed:', error);
      toast.error('Failed to mark order completed');
    } finally {
      setBusyAction(null);
    }
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch {
      toast.error('Failed to print');
    }
  };

  const categoryLabel =
    order.orderCategory === 'male' ? 'Men' : order.orderCategory === 'female' ? 'Women' : 'Kids';

  const formatDressTypeLabel = (raw: string): string => {
    const labels: Record<string, string> = {
      shirt: 'Shirt',
      pant: 'Pant',
      coat: 'Coat',
      blouse: 'Blouse',
      trouser: 'Trouser',
      halfTrousers: 'Half Trousers',
      churidar: 'Churidar',
      chuditharTop: 'Chudithar Top',
      chuditharPant: 'Chudithar Pant',
      other: 'Other',
    };
    if (labels[raw]) return labels[raw];
    return raw
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]+/g, ' ')
      .replace(/^./, (c) => c.toUpperCase())
      .trim();
  };

  const typeLabels: string[] = [];
  if (order.dressItems && order.dressItems.length > 0) {
    order.dressItems.forEach((item) => {
      const raw = item.dressType || item.dressName;
      if (!raw) return;
      const label = formatDressTypeLabel(String(raw));
      if (!typeLabels.includes(label)) typeLabels.push(label);
    });
  }
  if (typeLabels.length === 0 && order.measurements && typeof order.measurements === 'object') {
    Object.entries(order.measurements).forEach(([key, category]) => {
      if (key === 'specialNote' || !category || typeof category !== 'object') return;
      const hasValues = Object.entries(category as Record<string, unknown>).some(
        ([k, v]) => k !== 'specialNote' && v !== undefined && v !== null && v !== ''
      );
      if (!hasValues) return;
      const label = formatDressTypeLabel(key);
      if (!typeLabels.includes(label)) typeLabels.push(label);
    });
  }
  const typeLabel = typeLabels.length > 0 ? typeLabels.join(', ') : '-';
  const fabricLabel = order.fabricDetails?.trim() || '-';
  const measurementRows = flattenMeasurements(order.measurements);
  const isBusy = busyAction !== null;
  const canStart = order.orderStatus === 'awaiting' && !isBusy;
  const canWorkActions = order.orderStatus === 'inprogress' && !isBusy;
  const canComplete =
    (order.orderStatus === 'inprogress' || order.orderStatus === 'ready') && !isBusy;

  const stitchingNotes: string[] = [];
  if (order.reference?.trim()) {
    order.reference
      .split(/\n|•|;/)
      .map((n) => n.trim())
      .filter(Boolean)
      .forEach((n) => stitchingNotes.push(n));
  }
  order.dressItems?.forEach((item) => {
    if (item.notes?.trim()) stitchingNotes.push(item.notes.trim());
  });

  const designImages: Array<{ url: string; label: string }> = [];
  const designLabels = ['Front Design', 'Back Design', 'Collar Style', 'Pocket Design', 'Reference Image'];
  if (order.designList?.length) {
    order.designList.forEach((url, i) => {
      designImages.push({ url, label: designLabels[i] || `Design ${i + 1}` });
    });
  } else {
    order.dressItems?.forEach((item) => {
      item.designImages?.forEach((url, i) => {
        designImages.push({
          url,
          label: designLabels[designImages.length] || `${item.dressName || 'Design'} ${i + 1}`,
        });
      });
    });
  }

  const timelineSteps = [
    {
      id: 'assigned',
      label: 'Assigned',
      done: !!order.assignedDate || ['awaiting', 'inprogress', 'ready', 'delivered'].includes(order.orderStatus),
      current: order.orderStatus === 'awaiting',
      time: order.assignedDate,
    },
    {
      id: 'accepted',
      label: 'Accepted',
      done: !!order.acceptedDate || ['inprogress', 'ready', 'delivered'].includes(order.orderStatus),
      current: false,
      time: order.acceptedDate,
    },
    {
      id: 'stitching',
      label: 'Stitching',
      done: ['ready', 'delivered'].includes(order.orderStatus),
      current: order.orderStatus === 'inprogress',
      time: undefined as number | undefined,
    },
    {
      id: 'qc',
      label: 'For QC',
      done: order.orderStatus === 'delivered',
      current: order.orderStatus === 'ready',
      time: order.completedDate,
    },
    {
      id: 'completed',
      label: 'Completed',
      done: order.orderStatus === 'delivered',
      current: false,
      time: order.deliveredDate,
    },
  ];

  const workProcessLabel =
    order.employeeWorkProcess === 'paused'
      ? 'Paused'
      : order.employeeWorkProcess === 'clarification'
        ? 'Needs Clarification'
        : null;

  const cardClass = 'rounded-xl border bg-white p-4 shadow-sm';

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent
        className="max-w-lg w-[95vw] max-h-[92vh] overflow-hidden p-0 border-0 gap-0 [&>button]:hidden"
        style={{ background: '#F3F4F6' }}
      >
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-3 py-3 text-white"
          style={{ background: '#6A64F2' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/15 shrink-0"
              aria-label="Back"
            >
              <ArrowLeft size={22} weight="bold" />
            </button>
            <div className="min-w-0">
              <p className="font-semibold text-base leading-tight">Order Details</p>
              <p className="text-xs text-white/85">Employee View</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            className="p-2 rounded-lg hover:bg-white/15 shrink-0"
            aria-label="Print"
          >
            <Printer size={20} weight="bold" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(92vh-56px)] p-3 space-y-3">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
              <Spinner size={16} className="animate-spin" />
              Loading order details...
            </div>
          )}

          <section className={cardClass}>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#6A64F2' }}>
              <Package size={18} weight="duotone" />
              Order Information
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Order Number</p>
                <p className="font-medium break-all">{order.id}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Order Status</p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  <Badge className="text-white" style={{ background: '#6A64F2' }}>
                    {statusLabel(order.orderStatus)}
                  </Badge>
                  {workProcessLabel && (
                    <Badge variant="outline" className="text-amber-700 border-amber-400 bg-amber-50">
                      {workProcessLabel}
                    </Badge>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Order Date</p>
                <p className="font-medium">{safeFormatDate(order.serviceOrderDate, 'dd MMM yyyy')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expected Delivery</p>
                <p className="font-medium">{safeFormatDate(order.expectedDeliveryDate, 'dd MMM yyyy')}</p>
              </div>
            </div>
          </section>

          <section className={cardClass}>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#6A64F2' }}>
              <User size={18} weight="duotone" />
              Customer Information
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Customer Name</p>
                <p className="font-medium">{order.customerName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Customer ID</p>
                <p className="font-medium">{order.customerId}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Phone Number</p>
                <p className="font-medium">{customerPhone}</p>
              </div>
            </div>
          </section>

          <section className={cardClass}>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: '#6A64F2' }}>
              <ClockCounterClockwise size={18} weight="duotone" />
              Order Timeline
            </h3>
            <div className="overflow-x-auto pb-1">
              <div className="flex items-start min-w-[480px] px-1">
                {timelineSteps.map((step, index) => {
                  const active = step.done || step.current;
                  return (
                    <div key={step.id} className="flex-1 flex flex-col items-center relative">
                      {index < timelineSteps.length - 1 && (
                        <div
                          className="absolute top-3 left-1/2 right-0 h-0.5"
                          style={{
                            width: '100%',
                            background:
                              timelineSteps[index + 1].done ||
                              timelineSteps[index + 1].current ||
                              step.done
                                ? '#6A64F2'
                                : '#D1D5DB',
                          }}
                        />
                      )}
                      <div
                        className="relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                        style={{ background: active ? '#6A64F2' : '#D1D5DB' }}
                      >
                        {step.done ? <CheckCircle size={14} weight="fill" /> : index + 1}
                      </div>
                      <p
                        className={`mt-2 text-[11px] font-medium text-center ${
                          active ? 'text-gray-900' : 'text-gray-400'
                        }`}
                      >
                        {step.label}
                      </p>
                      {step.time ? (
                        <p className="text-[10px] text-muted-foreground text-center mt-0.5 leading-tight">
                          {safeFormatDate(step.time, 'MMM dd, yyyy')}
                          <br />
                          {safeFormatDate(step.time, 'hh:mm a')}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className={cardClass}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: '#6A64F2' }}>
              Order Details
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Category</p>
                <p className="font-medium">{categoryLabel}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Quantity</p>
                <p className="font-medium">
                  {order.orderQty} {order.uom || 'Nos'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fabric</p>
                <p className="font-medium">{fabricLabel}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="font-medium">{typeLabel}</p>
              </div>
            </div>
          </section>

          <section className={cardClass}>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#6A64F2' }}>
              <Ruler size={18} weight="duotone" />
              Measurements (Inches)
            </h3>
            {measurementRows.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {measurementRows.map((row) => (
                  <div key={row.label} className="rounded-lg bg-gray-50 border px-2.5 py-2">
                    <p className="text-[11px] text-muted-foreground">{row.label}</p>
                    <p className="text-base font-bold text-gray-900">{row.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-3">
                {loading ? 'Loading measurements...' : 'No measurements found'}
              </p>
            )}
          </section>

          {designImages.length > 0 && (
            <section className={cardClass}>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#6A64F2' }}>
                <Images size={18} weight="duotone" />
                Design Images
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {designImages.map((img, index) => (
                  <div key={`${img.url}-${index}`} className="shrink-0 w-24 text-center">
                    <img
                      src={img.url}
                      alt={img.label}
                      className="w-24 h-24 object-cover rounded-lg border"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{img.label}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {stitchingNotes.length > 0 && (
            <section className={cardClass}>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#6A64F2' }}>
                <NotePencil size={18} weight="duotone" />
                Stitching Notes
              </h3>
              <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-800">
                {stitchingNotes.map((note, index) => (
                  <li key={index}>{note}</li>
                ))}
              </ul>
            </section>
          )}

          <section className={cardClass}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: '#6A64F2' }}>
              Update Work Status
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-auto py-2.5 flex flex-col gap-1 text-xs"
                disabled={!canStart}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void handleStartStitching();
                }}
              >
                {busyAction === 'start' ? (
                  <Spinner size={18} className="animate-spin" />
                ) : (
                  <Play size={18} weight="fill" style={{ color: '#6A64F2' }} />
                )}
                Start Stitching
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto py-2.5 flex flex-col gap-1 text-xs"
                disabled={!canWorkActions}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void handlePauseWork();
                }}
              >
                {busyAction === 'pause' ? (
                  <Spinner size={18} className="animate-spin" />
                ) : (
                  <Pause size={18} weight="fill" className="text-amber-500" />
                )}
                Pause Work
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto py-2.5 flex flex-col gap-1 text-xs"
                disabled={!canWorkActions}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void handleNeedClarification();
                }}
              >
                {busyAction === 'clarification' ? (
                  <Spinner size={18} className="animate-spin" />
                ) : (
                  <Question size={18} weight="fill" className="text-blue-500" />
                )}
                Need Clarification
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto py-2.5 flex flex-col gap-1 text-xs"
                disabled={!canWorkActions}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void handleReadyForQc();
                }}
              >
                {busyAction === 'qc' ? (
                  <Spinner size={18} className="animate-spin" />
                ) : (
                  <ShieldCheck size={18} weight="fill" className="text-indigo-500" />
                )}
                Ready for QC
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto py-2.5 flex flex-col gap-1 text-xs col-span-2"
                disabled={!canComplete}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void handleCompleted();
                }}
              >
                {busyAction === 'completed' ? (
                  <Spinner size={18} className="animate-spin" />
                ) : (
                  <CheckCircle size={18} weight="fill" className="text-green-600" />
                )}
                Completed
              </Button>
            </div>
            {order.orderStatus === 'awaiting' && (
              <p className="text-[11px] text-muted-foreground mt-2 text-center">
                Tap Start Stitching to begin work on this order.
              </p>
            )}
            {order.orderStatus === 'inprogress' && (
              <p className="text-[11px] text-muted-foreground mt-2 text-center">
                Update progress, then mark Ready for QC or Completed when finished.
              </p>
            )}
          </section>

        </div>
      </DialogContent>
    </Dialog>
  );
}

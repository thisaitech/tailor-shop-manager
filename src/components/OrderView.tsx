import { useState, useEffect } from 'react';
import { ServiceOrder, OrderAllotment, Customer, ServiceOrderStatus } from '@/lib/types';
import { useLanguage } from '@/hooks/use-language';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Phone,
  WhatsappLogo,
  Calendar,
  Ruler,
  Package,
  User,
  CurrencyInr,
  TShirt,
  Image,
  ClipboardText,
  Truck,
  FileText,
  ClockCounterClockwise,
  CheckCircle,
  XCircle,
  ArrowsClockwise,
  Spinner,
} from '@phosphor-icons/react';
import { format, isPast } from 'date-fns';
import { sendWhatsAppMessage } from '@/lib/utils';
import { getOrderHistory, OrderHistoryEntry } from '@/lib/firestore/orderHistoryService';
import { updateServiceOrder, cancelServiceOrder } from '@/lib/firestore/serviceOrderService';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface OrderViewProps {
  serviceOrder: ServiceOrder;
  orderAllotments?: OrderAllotment[];
  customer?: Customer;
  onBack: () => void;
  onOrderUpdated?: (updates: Partial<ServiceOrder>) => void;
}

// Timeline stage interface
interface TimelineStage {
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
}

type ProcessStep = NonNullable<ServiceOrder['orderStitchingSteps']>[number];

type ProcessStatus = 'pending' | 'in_progress' | 'completed';

const PROCESS_STATUS_STYLES: Record<
  ProcessStatus,
  {
    badge: string;
    trigger: string;
    item: string;
    dot: string;
    circle: string;
    label: string;
  }
> = {
  pending: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    trigger:
      'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-50 focus:ring-rose-200/60',
    item: 'text-[11px] text-rose-700 focus:bg-rose-50 focus:text-rose-800',
    dot: 'bg-rose-400',
    circle: 'bg-rose-400',
    label: 'PENDING',
  },
  in_progress: {
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    trigger:
      'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-50 focus:ring-sky-200/60',
    item: 'text-[11px] text-sky-700 focus:bg-sky-50 focus:text-sky-800',
    dot: 'bg-sky-500',
    circle: 'bg-sky-500',
    label: 'IN PROGRESS',
  },
  completed: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    trigger:
      'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-50 focus:ring-emerald-200/60',
    item: 'text-[11px] text-emerald-700 focus:bg-emerald-50 focus:text-emerald-800',
    dot: 'bg-emerald-500',
    circle: 'bg-emerald-500',
    label: 'COMPLETED',
  },
};

const resolveProcessStatus = (
  status: ProcessStep['status'] | undefined,
  forceCompleted = false
): ProcessStatus => {
  if (forceCompleted || status === 'completed') return 'completed';
  if (status === 'in_progress') return 'in_progress';
  return 'pending';
};

const DEFAULT_FINAL_STEPS: ProcessStep[] = [
  { id: 'final_work_completed', name: 'Work Completed', amount: 0, order: 1, status: 'pending' },
  { id: 'final_finished', name: 'Finished', amount: 0, order: 2, status: 'pending' },
];

const mergeFinalSteps = (saved?: ServiceOrder['orderFinalSteps']): ProcessStep[] =>
  DEFAULT_FINAL_STEPS.map((defaultStep, index) => {
    const existing = saved?.find(step => step.id === defaultStep.id);
    return {
      ...defaultStep,
      ...(existing || {}),
      id: defaultStep.id,
      name: defaultStep.name,
      order: index + 1,
      amount: Number(existing?.amount) || 0,
      status: existing?.status || 'pending',
    };
  });

const getStepStatus = (steps: ProcessStep[], id: string) =>
  steps.find(step => step.id === id)?.status || 'pending';

/** Derive overall order status from process + final step statuses */
const deriveOrderStatusFromSteps = (
  process: ProcessStep[],
  final: ProcessStep[],
  current: ServiceOrderStatus
): ServiceOrderStatus => {
  // Keep cancelled / rejected as-is
  if (current === 'cancelled' || current === 'rejected') return current;

  const finished = getStepStatus(final, 'final_finished');
  const workCompleted = getStepStatus(final, 'final_work_completed');

  if (finished === 'completed') return 'finished';
  if (workCompleted === 'completed') return 'inprogress';

  const anyProcessStarted = process.some(step => step.status === 'completed');
  if (anyProcessStarted) return 'inprogress';

  // Don't override assignment / rejection flow when no process work has started
  if (['awaiting', 'waitingForDC', 'rejected', 'job-completed', 'received-note'].includes(current)) {
    return current;
  }

  return current === 'ready' || current === 'finished' || current === 'delivered' || current === 'inprogress'
    ? 'open'
    : current;
};

export function OrderView({ serviceOrder, orderAllotments = [], customer, onBack, onOrderUpdated }: OrderViewProps) {
  const { t } = useLanguage();
  const [orderHistory, setOrderHistory] = useState<OrderHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);
  const [finalSteps, setFinalSteps] = useState<ProcessStep[]>(DEFAULT_FINAL_STEPS);
  const [updatingStepId, setUpdatingStepId] = useState<string | null>(null);
  const [pricing, setPricing] = useState({
    stitchingCost: serviceOrder.stitchingCost || 0,
    totalAmount: serviceOrder.totalAmount || serviceOrder.stitchingCost || 0,
    balanceAmount: serviceOrder.balanceAmount,
  });
  const [orderStatus, setOrderStatus] = useState<ServiceOrderStatus>(serviceOrder.orderStatus);
  const [cancellingOrder, setCancellingOrder] = useState(false);

  // Fetch order history on mount
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoadingHistory(true);
        const history = await getOrderHistory(serviceOrder.id);
        setOrderHistory(history);
      } catch (error) {
        console.error('Error fetching order history:', error);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [serviceOrder.id]);

  useEffect(() => {
    setProcessSteps(
      serviceOrder.orderStitchingSteps && serviceOrder.orderStitchingSteps.length > 0
        ? serviceOrder.orderStitchingSteps
        : [
            {
              id: 'default_stitching_process',
              name: 'Stitching',
              amount: serviceOrder.stitchingCost || 0,
              order: 1,
            },
          ]
    );
  }, [serviceOrder.id, serviceOrder.orderStitchingSteps, serviceOrder.stitchingCost]);

  useEffect(() => {
    setFinalSteps(mergeFinalSteps(serviceOrder.orderFinalSteps));
  }, [serviceOrder.id, serviceOrder.orderFinalSteps]);

  useEffect(() => {
    setPricing({
      stitchingCost: serviceOrder.stitchingCost || 0,
      totalAmount: serviceOrder.totalAmount || serviceOrder.stitchingCost || 0,
      balanceAmount: serviceOrder.balanceAmount,
    });
  }, [
    serviceOrder.id,
    serviceOrder.stitchingCost,
    serviceOrder.totalAmount,
    serviceOrder.balanceAmount,
  ]);

  useEffect(() => {
    setOrderStatus(serviceOrder.orderStatus);
  }, [serviceOrder.id, serviceOrder.orderStatus]);

  const buildPricingUpdate = (nextProcess: ProcessStep[], nextFinal: ProcessStep[]) => {
    const stitchingCost = nextProcess.reduce((sum, step) => sum + (Number(step.amount) || 0), 0);
    const finalTotal = nextFinal.reduce((sum, step) => sum + (Number(step.amount) || 0), 0);
    const totalAmount = stitchingCost + finalTotal;
    const advanceAmount = serviceOrder.advanceAmount || 0;
    const balanceAmount =
      serviceOrder.balanceAmount !== undefined || advanceAmount > 0
        ? Math.max(0, totalAmount - advanceAmount)
        : undefined;

    return { stitchingCost, totalAmount, balanceAmount, advanceAmount };
  };

  const applyStepStatus = (
    steps: ProcessStep[],
    stepId: string,
    status: 'pending' | 'in_progress' | 'completed'
  ): ProcessStep[] => {
    const now = Date.now();
    return steps.map(step => {
      if (step.id !== stepId) return step;
      return {
        ...step,
        status,
        startedAt:
          status === 'in_progress' || status === 'completed'
            ? step.startedAt || now
            : undefined,
        completedAt: status === 'completed' ? now : undefined,
      };
    });
  };

  const handleProcessStatusChange = async (
    stepId: string,
    status: 'pending' | 'in_progress' | 'completed'
  ) => {
    const updatedSteps = applyStepStatus(processSteps, stepId, status);
    const nextOrderStatus = deriveOrderStatusFromSteps(updatedSteps, finalSteps, orderStatus);

    try {
      setUpdatingStepId(stepId);
      const updates: Partial<ServiceOrder> = {
        orderStitchingSteps: updatedSteps,
        ...(nextOrderStatus !== orderStatus
          ? {
              orderStatus: nextOrderStatus,
              ...(nextOrderStatus === 'inprogress' && !serviceOrder.acceptedDate
                ? { acceptedDate: Date.now() }
                : {}),
              ...(nextOrderStatus === 'finished'
                ? { completedDate: Date.now() }
                : {}),
              ...(nextOrderStatus === 'delivered' ? { deliveredDate: Date.now() } : {}),
            }
          : {}),
      };
      await updateServiceOrder(serviceOrder.id, updates);
      setProcessSteps(updatedSteps);
      if (nextOrderStatus !== orderStatus) {
        setOrderStatus(nextOrderStatus);
      }
      onOrderUpdated?.(updates);
      toast.success(
        nextOrderStatus !== orderStatus
          ? `Status updated to ${getStatusLabel(nextOrderStatus)}`
          : 'Process status updated'
      );
    } catch (error) {
      console.error('Failed to update process status:', error);
      toast.error('Failed to update process status');
    } finally {
      setUpdatingStepId(null);
    }
  };

  const handleSubStepStatusChange = async (
    parentStepId: string,
    subStepId: string,
    status: 'pending' | 'in_progress' | 'completed'
  ) => {
    const updatedSteps = processSteps.map(step => {
      if (step.id !== parentStepId) return step;
      return {
        ...step,
        subSteps: (step.subSteps || []).map(sub => {
          if (sub.id !== subStepId) return sub;
          return {
            ...sub,
            status,
          };
        }),
      };
    });

    try {
      setUpdatingStepId(subStepId);
      const updates: Partial<ServiceOrder> = {
        orderStitchingSteps: updatedSteps,
      };
      await updateServiceOrder(serviceOrder.id, updates);
      setProcessSteps(updatedSteps);
      onOrderUpdated?.(updates);
      toast.success('Sub-step status updated');
    } catch (error) {
      console.error('Failed to update sub-step status:', error);
      toast.error('Failed to update sub-step status');
    } finally {
      setUpdatingStepId(null);
    }
  };

  const handleFinalStatusChange = async (
    stepId: string,
    status: 'pending' | 'in_progress' | 'completed'
  ) => {
    const updatedSteps = applyStepStatus(finalSteps, stepId, status);
    const nextOrderStatus = deriveOrderStatusFromSteps(processSteps, updatedSteps, orderStatus);

    try {
      setUpdatingStepId(stepId);
      const updates: Partial<ServiceOrder> = {
        orderFinalSteps: updatedSteps,
        ...(nextOrderStatus !== orderStatus
          ? {
              orderStatus: nextOrderStatus,
              ...(nextOrderStatus === 'inprogress' && !serviceOrder.acceptedDate
                ? { acceptedDate: Date.now() }
                : {}),
              ...(nextOrderStatus === 'finished'
                ? { completedDate: Date.now() }
                : {}),
              ...(nextOrderStatus === 'delivered' ? { deliveredDate: Date.now() } : {}),
            }
          : {}),
      };
      await updateServiceOrder(serviceOrder.id, updates);
      setFinalSteps(updatedSteps);
      if (nextOrderStatus !== orderStatus) {
        setOrderStatus(nextOrderStatus);
      }
      onOrderUpdated?.(updates);
      toast.success(
        nextOrderStatus !== orderStatus
          ? `Status updated to ${getStatusLabel(nextOrderStatus)}`
          : 'Final step status updated'
      );
    } catch (error) {
      console.error('Failed to update final step status:', error);
      toast.error('Failed to update final step status');
    } finally {
      setUpdatingStepId(null);
    }
  };

  const handleFinalAmountChange = async (stepId: string, amount: number) => {
    const updatedSteps = finalSteps.map(step =>
      step.id === stepId ? { ...step, amount: Number.isFinite(amount) ? amount : 0 } : step
    );
    const pricingUpdate = buildPricingUpdate(processSteps, updatedSteps);

    try {
      setUpdatingStepId(stepId);
      const updates: Partial<ServiceOrder> = {
        orderFinalSteps: updatedSteps,
        stitchingCost: pricingUpdate.stitchingCost,
        totalAmount: pricingUpdate.totalAmount,
        ...(pricingUpdate.balanceAmount !== undefined
          ? { balanceAmount: pricingUpdate.balanceAmount }
          : {}),
      };
      await updateServiceOrder(serviceOrder.id, updates);
      setFinalSteps(updatedSteps);
      setPricing({
        stitchingCost: pricingUpdate.stitchingCost,
        totalAmount: pricingUpdate.totalAmount,
        balanceAmount: pricingUpdate.balanceAmount,
      });
      onOrderUpdated?.(updates);
      toast.success('Amount updated');
    } catch (error) {
      console.error('Failed to update final step amount:', error);
      toast.error('Failed to update amount');
    } finally {
      setUpdatingStepId(null);
    }
  };

  const handleProcessAmountChange = async (stepId: string, amount: number) => {
    const updatedSteps = processSteps.map(step =>
      step.id === stepId ? { ...step, amount: Number.isFinite(amount) ? amount : 0 } : step
    );
    const pricingUpdate = buildPricingUpdate(updatedSteps, finalSteps);

    try {
      setUpdatingStepId(stepId);
      const updates: Partial<ServiceOrder> = {
        orderStitchingSteps: updatedSteps,
        stitchingCost: pricingUpdate.stitchingCost,
        totalAmount: pricingUpdate.totalAmount,
        ...(pricingUpdate.balanceAmount !== undefined
          ? { balanceAmount: pricingUpdate.balanceAmount }
          : {}),
      };
      await updateServiceOrder(serviceOrder.id, updates);
      setProcessSteps(updatedSteps);
      setPricing({
        stitchingCost: pricingUpdate.stitchingCost,
        totalAmount: pricingUpdate.totalAmount,
        balanceAmount: pricingUpdate.balanceAmount,
      });
      onOrderUpdated?.(updates);
      toast.success('Amount updated');
    } catch (error) {
      console.error('Failed to update process step amount:', error);
      toast.error('Failed to update amount');
    } finally {
      setUpdatingStepId(null);
    }
  };

  const handleCancelOrder = async () => {
    try {
      setCancellingOrder(true);
      await cancelServiceOrder(serviceOrder.id);
      const updates: Partial<ServiceOrder> = {
        orderStatus: 'cancelled',
        cancelledDate: Date.now(),
      };
      setOrderStatus('cancelled');
      onOrderUpdated?.(updates);
      toast.success('Order cancelled');
    } catch (error) {
      console.error('Failed to cancel order:', error);
      toast.error('Failed to cancel order');
    } finally {
      setCancellingOrder(false);
    }
  };

  // Build timeline from ServiceOrder data
  const buildTimeline = (): TimelineStage[] => {
    const stages: TimelineStage[] = [];
    
    // 1. Order Created
    if (serviceOrder.createdAt) {
      stages.push({
        id: 'created',
        stage: 'Order Created',
        status: 'open',
        timestamp: serviceOrder.createdAt,
        assignedBy: serviceOrder.adminId || 'Admin',
        icon: <Package size={16} className="text-purple-600" weight="fill" />,
        color: 'bg-purple-100 border-purple-400',
      });
    }

    // 2. Order Assigned
    if (serviceOrder.assignedDate) {
      const duration = serviceOrder.createdAt 
        ? calculateDuration(serviceOrder.createdAt, serviceOrder.assignedDate)
        : undefined;
      stages.push({
        id: 'assigned',
        stage: 'Order Assigned',
        status: 'awaiting',
        timestamp: serviceOrder.assignedDate,
        assignedTo: serviceOrder.assignedToName || 'Unknown',
        assignedBy: serviceOrder.adminId || 'Admin',
        duration,
        notes: `Assigned to ${serviceOrder.assignmentType === 'vendor' ? 'Vendor' : 'Employee'}`,
        icon: <User size={16} className="text-amber-600" weight="fill" />,
        color: 'bg-amber-100 border-amber-400',
      });
    }

    // 3. Order Accepted
    if (serviceOrder.acceptedDate) {
      const duration = serviceOrder.assignedDate 
        ? calculateDuration(serviceOrder.assignedDate, serviceOrder.acceptedDate)
        : undefined;
      stages.push({
        id: 'accepted',
        stage: 'Order Accepted',
        status: serviceOrder.assignmentType === 'vendor' ? 'waitingForDC' : 'inprogress',
        timestamp: serviceOrder.acceptedDate,
        assignedTo: serviceOrder.assignedToName,
        duration,
        icon: <CheckCircle size={16} className="text-green-600" weight="fill" />,
        color: 'bg-green-100 border-green-400',
      });
    }

    // 4. Order Rejected (if applicable)
    if (serviceOrder.rejectedDate) {
      const duration = serviceOrder.assignedDate 
        ? calculateDuration(serviceOrder.assignedDate, serviceOrder.rejectedDate)
        : undefined;
      stages.push({
        id: 'rejected',
        stage: 'Order Rejected',
        status: 'rejected',
        timestamp: serviceOrder.rejectedDate,
        assignedTo: serviceOrder.assignedToName,
        duration,
        notes: serviceOrder.rejectionReason,
        icon: <XCircle size={16} className="text-red-600" weight="fill" />,
        color: 'bg-red-100 border-red-400',
      });
    }

    // 5. Delivery Challan Created (for vendors)
    if (serviceOrder.dcDate && serviceOrder.dcNumber) {
      const duration = serviceOrder.acceptedDate 
        ? calculateDuration(serviceOrder.acceptedDate, serviceOrder.dcDate)
        : undefined;
      stages.push({
        id: 'dc_created',
        stage: 'Delivery Challan Created',
        status: 'inprogress',
        timestamp: serviceOrder.dcDate,
        assignedBy: serviceOrder.adminId || 'Admin',
        duration,
        notes: `DC No: ${serviceOrder.dcNumber}`,
        icon: <FileText size={16} className="text-teal-600" weight="fill" />,
        color: 'bg-teal-100 border-teal-400',
      });
    }

    // 6. Work Completed
    if (serviceOrder.completedDate) {
      const prevDate = serviceOrder.dcDate || serviceOrder.acceptedDate;
      const duration = prevDate 
        ? calculateDuration(prevDate, serviceOrder.completedDate)
        : undefined;
      stages.push({
        id: 'completed',
        stage: serviceOrder.assignmentType === 'vendor' ? 'Job Work Completed' : 'Work Completed',
        status: serviceOrder.assignmentType === 'vendor' ? 'job-completed' : 'ready',
        timestamp: serviceOrder.completedDate,
        assignedTo: serviceOrder.assignedToName,
        duration,
        icon: <CheckCircle size={16} className="text-indigo-600" weight="fill" />,
        color: 'bg-indigo-100 border-indigo-400',
      });
    }

    // 7. Goods Received (for vendors)
    if (serviceOrder.goodsReceivedDate && serviceOrder.goodsReceiptNo) {
      const duration = serviceOrder.completedDate 
        ? calculateDuration(serviceOrder.completedDate, serviceOrder.goodsReceivedDate)
        : undefined;
      stages.push({
        id: 'goods_received',
        stage: 'Goods Received',
        status: 'received-note',
        timestamp: serviceOrder.goodsReceivedDate,
        assignedBy: serviceOrder.adminId || 'Admin',
        duration,
        notes: `GRN No: ${serviceOrder.goodsReceiptNo}`,
        icon: <Truck size={16} className="text-cyan-600" weight="fill" />,
        color: 'bg-cyan-100 border-cyan-400',
      });
    }

    // 8. Reassigned (if applicable)
    if (serviceOrder.isReassigned && serviceOrder.reassignedDate) {
      stages.push({
        id: 'reassigned',
        stage: 'Order Reassigned',
        status: 'awaiting',
        timestamp: serviceOrder.reassignedDate,
        assignedTo: serviceOrder.assignedToName,
        assignedBy: serviceOrder.adminId || 'Admin',
        notes: serviceOrder.previousAssignedToName 
          ? `Previously: ${serviceOrder.previousAssignedToName}` 
          : undefined,
        icon: <ArrowsClockwise size={16} className="text-orange-600" weight="fill" />,
        color: 'bg-orange-100 border-orange-400',
      });
    }

    // 9. Delivered
    if (serviceOrder.deliveredDate) {
      const prevDate = serviceOrder.goodsReceivedDate || serviceOrder.completedDate;
      const duration = prevDate 
        ? calculateDuration(prevDate, serviceOrder.deliveredDate)
        : undefined;
      stages.push({
        id: 'delivered',
        stage: 'Order Delivered',
        status: 'delivered',
        timestamp: serviceOrder.deliveredDate,
        assignedBy: serviceOrder.adminId || 'Admin',
        duration,
        icon: <CheckCircle size={16} className="text-emerald-600" weight="fill" />,
        color: 'bg-emerald-100 border-emerald-400',
      });
    }

    // Sort by timestamp
    return stages.sort((a, b) => a.timestamp - b.timestamp);
  };

  // Calculate duration between two timestamps
  const calculateDuration = (start: number, end: number): string => {
    const diffMs = end - start;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else if (diffMins > 0) {
      return `${diffMins} min${diffMins > 1 ? 's' : ''}`;
    }
    return 'Just now';
  };

  // Calculate total duration from order creation to current stage
  const calculateTotalDuration = (): string => {
    const start = serviceOrder.createdAt;
    const end = serviceOrder.deliveredDate || Date.now();
    return calculateDuration(start, end);
  };

  const timeline = buildTimeline();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-purple-600 text-white';
      case 'awaiting':
        return 'bg-amber-500 text-white';
      case 'waitingForDC':
        return 'bg-teal-500 text-white';
      case 'inprogress':
        return 'bg-blue-600 text-white';
      case 'rejected':
        return 'bg-red-600 text-white';
      case 'cancelled':
        return 'bg-rose-700 text-white';
      case 'ready':
        return 'bg-indigo-600 text-white';
      case 'finished':
        return 'bg-emerald-700 text-white';
      case 'job-completed':
        return 'bg-orange-600 text-white';
      case 'received-note':
        return 'bg-cyan-600 text-white';
      case 'delivered':
        return 'bg-green-600 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'open':
        return 'OPEN';
      case 'awaiting':
        return 'AWAITING';
      case 'waitingForDC':
        return 'WAITING DC';
      case 'inprogress':
        return 'IN PROGRESS';
      case 'rejected':
        return 'REJECTED';
      case 'cancelled':
        return 'CANCELLED';
      case 'ready':
        return 'READY';
      case 'finished':
        return 'FINISHED';
      case 'job-completed':
        return 'JOB DONE';
      case 'received-note':
        return 'RECEIVED';
      case 'delivered':
        return 'DELIVERED';
      default:
        return status.toUpperCase();
    }
  };

  const getHistoryActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <Package size={16} className="text-purple-600" weight="fill" />;
      case 'assigned':
        return <User size={16} className="text-blue-600" weight="fill" />;
      case 'accepted':
        return <CheckCircle size={16} className="text-green-600" weight="fill" />;
      case 'rejected':
        return <XCircle size={16} className="text-red-600" weight="fill" />;
      case 'status_changed':
        return <ArrowsClockwise size={16} className="text-amber-600" weight="fill" />;
      case 'reassigned':
        return <ArrowsClockwise size={16} className="text-orange-600" weight="fill" />;
      case 'dc_created':
      case 'dc_approved':
        return <FileText size={16} className="text-teal-600" weight="fill" />;
      case 'goods_received':
        return <Truck size={16} className="text-cyan-600" weight="fill" />;
      case 'delivered':
        return <CheckCircle size={16} className="text-green-600" weight="fill" />;
      case 'payment':
        return <CurrencyInr size={16} className="text-emerald-600" weight="fill" />;
      default:
        return <ClockCounterClockwise size={16} className="text-gray-600" weight="fill" />;
    }
  };

  const getHistoryActionLabel = (action: string): string => {
    switch (action) {
      case 'created': return 'Order Created';
      case 'assigned': return 'Order Assigned';
      case 'accepted': return 'Order Accepted';
      case 'rejected': return 'Order Rejected';
      case 'status_changed': return 'Status Changed';
      case 'reassigned': return 'Order Reassigned';
      case 'dc_created': return 'DC Created';
      case 'dc_approved': return 'DC Approved';
      case 'goods_received': return 'Goods Received';
      case 'delivered': return 'Order Delivered';
      case 'payment': return 'Payment Recorded';
      default: return action;
    }
  };

  const isOverdue = serviceOrder.expectedDeliveryDate &&
    orderStatus !== 'delivered' &&
    orderStatus !== 'finished' &&
    orderStatus !== 'cancelled' &&
    isPast(new Date(serviceOrder.expectedDeliveryDate));

  // Use local order status so badge updates immediately when process status changes
  const displayStatus = orderStatus;
  const canCancelOrder = !['cancelled', 'delivered', 'rejected'].includes(orderStatus);

  // Get allotment info for this order (for backward compatibility)
  const allotment = orderAllotments.find(a => a.serviceOrderNo === serviceOrder.id && !a.reassigned);

  // Measurement sections to display
  const measurementSections = [
    { key: 'shirt', label: 'Shirt' },
    { key: 'pant', label: 'Pant' },
    { key: 'coat', label: 'Coat' },
    { key: 'chuditharTop', label: 'Chudithar Top' },
    { key: 'chuditharPant', label: 'Chudithar Pant' },
    { key: 'blouse', label: 'Blouse' },
    { key: 'trouser', label: 'Trouser' },
  ];

  const hasMeasurements = serviceOrder.measurements && Object.keys(serviceOrder.measurements).length > 0;

  return (
    <div className="space-y-3 animate-on-load animate-fade-slide-up max-w-4xl mx-auto">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={onBack}
            className="h-8 w-8"
            style={{ backgroundColor: 'white' }}
          >
            <ArrowLeft size={18} weight="bold" />
          </Button>
          <h1 className="text-base md:text-lg font-bold">Order Details</h1>
        </div>

        {isOverdue && (
          <Badge variant="destructive" className="text-xs font-bold px-2 py-1">
            OVERDUE
          </Badge>
        )}
      </div>

      {/* Order Info Card */}
      <Card
        className="p-3 sm:p-4"
        style={{ backgroundColor: '#f3e8ff', borderColor: '#6A64F2' }}
      >
        <div className="flex flex-col gap-3">
          {/* Order ID and Status */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Package size={20} weight="duotone" style={{ color: '#6A64F2' }} />
                <p className="text-sm font-bold" style={{ color: '#6A64F2' }}>{serviceOrder.id}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {serviceOrder.orderCategory === 'male' ? 'Men' : serviceOrder.orderCategory === 'female' ? 'Women' : 'Kids'} • {serviceOrder.orderQty} {serviceOrder.uom}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {canCancelOrder && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={cancellingOrder}
                      className="h-7 px-2.5 text-[10px] font-bold border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      {cancellingOrder ? 'Cancelling...' : 'Cancel Order'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will mark order {serviceOrder.id} as cancelled. You can still view it, but work and delivery should stop.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Order</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleCancelOrder}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Yes, Cancel Order
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Badge className={`text-[10px] px-2 py-1 font-bold ${getStatusColor(displayStatus)}`}>
                {getStatusLabel(displayStatus)}
              </Badge>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t" style={{ borderColor: 'rgba(106, 100, 242, 0.3)' }}>
            <div className="flex items-center gap-2">
              <div
                className="p-1.5 rounded-md"
                style={{ backgroundColor: 'rgba(106, 100, 242, 0.2)' }}
              >
                <Calendar size={14} style={{ color: '#6A64F2' }} weight="fill" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">Order Date</p>
                <p className="text-xs font-semibold text-foreground">
                  {format(new Date(serviceOrder.serviceOrderDate), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`p-1.5 rounded-md ${isOverdue ? 'bg-red-100' : ''}`}
                style={{ backgroundColor: isOverdue ? undefined : 'rgba(106, 100, 242, 0.2)' }}
              >
                <Calendar size={14} className={isOverdue ? 'text-red-600' : ''} style={{ color: isOverdue ? undefined : '#6A64F2' }} weight="fill" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">Expected Delivery</p>
                <p className={`text-xs font-semibold ${isOverdue ? 'text-red-600' : 'text-foreground'}`}>
                  {format(new Date(serviceOrder.expectedDeliveryDate), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Customer Info Card */}
      <Card
        className="p-3 sm:p-4"
        style={{ backgroundColor: '#f0f9ff', borderColor: '#7de8f7' }}
      >
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <User size={16} weight="duotone" className="text-primary" />
          Customer Information
        </h3>

        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="text-base font-bold text-foreground">{serviceOrder.customerName}</h4>
            <p className="text-xs text-muted-foreground">{serviceOrder.customerId}</p>
          </div>
        </div>

        {customer && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t" style={{ borderColor: '#7de8f7' }}>
            {/* Phone */}
            <div className="flex items-center gap-2">
              <div
                className="p-1.5 rounded-md"
                style={{ backgroundColor: '#b1f2ff' }}
              >
                <Phone size={14} className="text-primary" weight="fill" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">Phone</p>
                <a
                  href={`tel:${customer.phone}`}
                  className="text-xs font-semibold text-blue-900 hover:underline truncate block"
                >
                  {customer.phone}
                </a>
              </div>
            </div>

            {/* WhatsApp */}
            {customer.whatsappNumber && (
              <div className="flex items-center gap-2">
                <div
                  className="p-1.5 rounded-md"
                  style={{ backgroundColor: '#b1f2ff' }}
                >
                  <WhatsappLogo size={14} className="text-green-600" weight="fill" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">WhatsApp</p>
                  <button
                    onClick={() => sendWhatsAppMessage(customer.whatsappNumber!, `Hello ${customer.name}, regarding your order ${serviceOrder.id}`)}
                    className="text-xs font-semibold text-green-600 hover:underline truncate block"
                  >
                    {customer.whatsappNumber}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Dress Items Card */}
      {serviceOrder.dressItems && serviceOrder.dressItems.length > 0 && (
        <Card
          className="p-3 sm:p-4"
          style={{ backgroundColor: '#f3e8ff', borderColor: '#6A64F2' }}
        >
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TShirt size={16} weight="duotone" style={{ color: '#6A64F2' }} />
            Dress Items ({serviceOrder.dressItems.length})
          </h3>

          <div className="space-y-2">
            {serviceOrder.dressItems.map((item, index) => (
              <div
                key={item.id || index}
                className="p-2 rounded-lg border"
                style={{ backgroundColor: 'white', borderColor: 'rgba(106, 100, 242, 0.3)' }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.dressName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.dressType} • Qty: {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: '#6A64F2' }}>₹{item.stitchingCost}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Measurements Card */}
      {hasMeasurements && (
        <Card
          className="p-4 sm:p-5 border-2 rounded-xl"
          style={{ backgroundColor: '#f8f5ff', borderColor: '#a78bfa' }}
        >
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: '#6A64F2' }}>
            <Ruler size={20} weight="duotone" style={{ color: '#6A64F2' }} />
            Measurements
          </h3>

          <div className="space-y-4">
            {measurementSections.map(({ key, label }) => {
              const measurements = serviceOrder.measurements?.[key as keyof typeof serviceOrder.measurements];
              if (!measurements || typeof measurements !== 'object' || Object.keys(measurements).length === 0) return null;

              return (
                <div key={key}>
                  {/* Category Title */}
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">{label}</h4>
                  
                  {/* Measurement Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(measurements).map(([field, value]) => (
                      value !== undefined && value !== null && value !== '' && (
                        <div
                          key={field}
                          className="p-3 rounded-xl"
                          style={{ backgroundColor: '#ede9fe' }}
                        >
                          <p className="text-xs text-purple-600 font-medium capitalize mb-1">
                            {field.replace(/([A-Z])/g, ' $1').trim()}
                          </p>
                          <p className="text-xl font-bold text-gray-800">
                            {String(value)}<span className="text-base">"</span>
                          </p>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Design preferences chosen at order placement */}
            {(() => {
              const chosenPreferences = (serviceOrder.designPreferences || []).filter(
                preference => preference.value && preference.value.trim() !== ''
              );
              if (chosenPreferences.length === 0) return null;

              return (
                <div className="pt-3 border-t border-violet-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Design Preferences</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {chosenPreferences.map(preference => (
                      <div
                        key={preference.id}
                        className="p-3 rounded-xl bg-white border border-violet-200"
                      >
                        <p className="text-xs text-purple-600 font-medium mb-1">
                          {preference.label}
                        </p>
                        <p className="text-sm font-bold text-gray-800">{preference.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {serviceOrder.designNotes && (
              <div className="pt-3 border-t border-violet-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Design Notes</h4>
                <p className="text-sm text-gray-800 bg-white border border-violet-200 rounded-xl p-3">
                  {serviceOrder.designNotes}
                </p>
              </div>
            )}

            {serviceOrder.fabricDetails && (
              <div className="pt-3 border-t border-violet-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Fabric Details</h4>
                <p className="text-sm text-gray-800 bg-white border border-violet-200 rounded-xl p-3">
                  {serviceOrder.fabricDetails}
                </p>
              </div>
            )}

            {/* Selected design images */}
            {serviceOrder.designList && serviceOrder.designList.length > 0 && (
              <div className="pt-3 border-t border-violet-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Image size={16} weight="duotone" style={{ color: '#6A64F2' }} />
                  Design Images ({serviceOrder.designList.length})
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {serviceOrder.designList.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`Design ${index + 1}`}
                      className="w-full h-24 sm:h-32 object-cover rounded-lg border-2 cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ borderColor: '#6A64F2' }}
                      onClick={() => window.open(url, '_blank')}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Design Images Card — only when no measurements card above */}
      {!hasMeasurements &&
        serviceOrder.designList &&
        serviceOrder.designList.length > 0 && (
        <Card
          className="p-3 sm:p-4"
          style={{ backgroundColor: '#f3e8ff', borderColor: '#6A64F2' }}
        >
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Image size={16} weight="duotone" style={{ color: '#6A64F2' }} />
            Design Images ({serviceOrder.designList.length})
          </h3>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {serviceOrder.designList.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`Design ${index + 1}`}
                className="w-full h-24 sm:h-32 object-cover rounded-lg border-2 cursor-pointer hover:opacity-80 transition-opacity"
                style={{ borderColor: '#6A64F2' }}
                onClick={() => window.open(url, '_blank')}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Preferences when measurements section is missing */}
      {!hasMeasurements &&
        (serviceOrder.designPreferences || []).some(
          preference => preference.value && preference.value.trim() !== ''
        ) && (
        <Card
          className="p-4 sm:p-5 border-2 rounded-xl"
          style={{ backgroundColor: '#f8f5ff', borderColor: '#a78bfa' }}
        >
          <h3 className="text-base font-semibold mb-4" style={{ color: '#6A64F2' }}>
            Design Preferences
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(serviceOrder.designPreferences || [])
              .filter(preference => preference.value && preference.value.trim() !== '')
              .map(preference => (
                <div
                  key={preference.id}
                  className="p-3 rounded-xl bg-white border border-violet-200"
                >
                  <p className="text-xs text-purple-600 font-medium mb-1">{preference.label}</p>
                  <p className="text-sm font-bold text-gray-800">{preference.value}</p>
                </div>
              ))}
          </div>
          {serviceOrder.designNotes && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Design Notes</h4>
              <p className="text-sm text-gray-800 bg-white border border-violet-200 rounded-xl p-3">
                {serviceOrder.designNotes}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Reference/Notes Card */}
      {serviceOrder.reference && (
        <Card
          className="p-3 sm:p-4"
          style={{ backgroundColor: '#fef3c7', borderColor: '#fcd34d' }}
        >
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <ClipboardText size={16} weight="duotone" className="text-amber-600" />
            Reference / Notes
          </h3>
          <p className="text-sm text-foreground">{serviceOrder.reference}</p>
        </Card>
      )}

      {/* Delivery Challan Info Card */}
      {serviceOrder.dcNumber && (
        <Card
          className="p-3 sm:p-4"
          style={{ backgroundColor: '#ccfbf1', borderColor: '#14b8a6' }}
        >
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <FileText size={16} weight="duotone" className="text-teal-600" />
            Delivery Challan
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground">DC Number</p>
              <p className="text-sm font-semibold text-foreground">{serviceOrder.dcNumber}</p>
            </div>
            {serviceOrder.dcDate && (
              <div>
                <p className="text-[10px] text-muted-foreground">DC Date</p>
                <p className="text-sm font-semibold text-foreground">
                  {format(new Date(serviceOrder.dcDate), 'MMM dd, yyyy')}
                </p>
              </div>
            )}
            <div>
              <p className="text-[10px] text-muted-foreground">DC Status</p>
              <Badge className={serviceOrder.dcApproved ? 'bg-green-600' : 'bg-amber-500'}>
                {serviceOrder.dcApproved ? 'Approved' : 'Pending'}
              </Badge>
            </div>
          </div>
        </Card>
      )}

      {/* Goods Receipt Info Card */}
      {serviceOrder.goodsReceiptNo && (
        <Card
          className="p-3 sm:p-4"
          style={{ backgroundColor: '#e0f2fe', borderColor: '#0ea5e9' }}
        >
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Truck size={16} weight="duotone" className="text-sky-600" />
            Goods Receipt
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground">GRN Number</p>
              <p className="text-sm font-semibold text-foreground">{serviceOrder.goodsReceiptNo}</p>
            </div>
            {serviceOrder.goodsReceivedDate && (
              <div>
                <p className="text-[10px] text-muted-foreground">Received Date</p>
                <p className="text-sm font-semibold text-foreground">
                  {format(new Date(serviceOrder.goodsReceivedDate), 'MMM dd, yyyy')}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Completion Dates Card */}
      {(serviceOrder.completedDate || serviceOrder.deliveredDate) && (
        <Card
          className="p-3 sm:p-4"
          style={{ backgroundColor: '#dcfce7', borderColor: '#86efac' }}
        >
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <CheckCircle size={16} weight="duotone" className="text-green-600" />
            Completion Status
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {serviceOrder.completedDate && (
              <div>
                <p className="text-[10px] text-muted-foreground">Work Completed</p>
                <p className="text-sm font-semibold text-foreground">
                  {format(new Date(serviceOrder.completedDate), 'MMM dd, yyyy')}
                </p>
              </div>
            )}
            {serviceOrder.deliveredDate && (
              <div>
                <p className="text-[10px] text-muted-foreground">Delivered Date</p>
                <p className="text-sm font-semibold text-green-600">
                  {format(new Date(serviceOrder.deliveredDate), 'MMM dd, yyyy')}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Re-assignment Info Card */}
      {serviceOrder.isReassigned && (
        <Card
          className="p-3 sm:p-4"
          style={{ backgroundColor: '#fff7ed', borderColor: '#fb923c' }}
        >
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <ArrowsClockwise size={16} weight="duotone" className="text-orange-600" />
            Re-assignment Info
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {serviceOrder.previousAssignedToName && (
              <div>
                <p className="text-[10px] text-muted-foreground">Previously Assigned To</p>
                <p className="text-sm font-semibold text-foreground">{serviceOrder.previousAssignedToName}</p>
              </div>
            )}
            {serviceOrder.reassignedDate && (
              <div>
                <p className="text-[10px] text-muted-foreground">Reassigned On</p>
                <p className="text-sm font-semibold text-foreground">
                  {format(new Date(serviceOrder.reassignedDate), 'MMM dd, yyyy')}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Pricing Card */}
      <Card
        className="p-3 sm:p-4"
        style={{ backgroundColor: '#f3e8ff', borderColor: '#6A64F2' }}
      >
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <CurrencyInr size={16} weight="duotone" style={{ color: '#6A64F2' }} />
          Pricing Information
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div
            className="p-3 rounded-lg border text-center"
            style={{ backgroundColor: 'white', borderColor: 'rgba(106, 100, 242, 0.3)' }}
          >
            <p className="text-[10px] text-muted-foreground">Stitching Cost</p>
            <p className="text-lg font-bold" style={{ color: '#6A64F2' }}>
              ₹{pricing.stitchingCost || 0}
            </p>
          </div>

          <div
            className="p-3 rounded-lg border text-center"
            style={{ backgroundColor: 'white', borderColor: 'rgba(106, 100, 242, 0.3)' }}
          >
            <p className="text-[10px] text-muted-foreground">Total Amount</p>
            <p className="text-lg font-bold" style={{ color: '#6A64F2' }}>
              ₹{pricing.totalAmount || pricing.stitchingCost || 0}
            </p>
          </div>

          {serviceOrder.advanceAmount !== undefined && serviceOrder.advanceAmount > 0 && (
            <div
              className="p-3 rounded-lg border text-center"
              style={{ backgroundColor: '#dcfce7', borderColor: '#86efac' }}
            >
              <p className="text-[10px] text-muted-foreground">Advance Paid</p>
              <p className="text-lg font-bold text-green-600">
                ₹{serviceOrder.advanceAmount}
              </p>
            </div>
          )}

          {pricing.balanceAmount !== undefined && (
            <div
              className="p-3 rounded-lg border text-center"
              style={{ backgroundColor: '#ffedd5', borderColor: '#fdba74' }}
            >
              <p className="text-[10px] text-muted-foreground">Balance</p>
              <p className="text-lg font-bold text-orange-600">
                ₹{pricing.balanceAmount}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Order Timeline */}
      <Card
        className="p-4 sm:p-5 border-2 rounded-xl"
        style={{ backgroundColor: '#f8f5ff', borderColor: '#a78bfa' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold flex items-center gap-2" style={{ color: '#6A64F2' }}>
            <ClockCounterClockwise size={20} weight="duotone" />
            Order Timeline
          </h3>
          <Badge className="bg-purple-100 text-purple-700 text-xs">
            Total Estimated Cost: ₹
            {pricing.totalAmount ||
              [...processSteps, ...finalSteps].reduce(
                (sum, step) => sum + (Number(step.amount) || 0),
                0
              ) ||
              0}
          </Badge>
        </div>

        <div className="space-y-4">
          {/* Order Placed */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-gray-900">Order Placed</p>
                <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-[10px]">
                  COMPLETED
                </Badge>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-medium text-gray-700">
                  {format(new Date(serviceOrder.createdAt || serviceOrder.serviceOrderDate), 'MMM dd, yyyy')}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {format(new Date(serviceOrder.createdAt || serviceOrder.serviceOrderDate), 'hh:mm a')}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="rounded-lg border bg-white/80 p-2.5">
                <p className="text-[10px] text-muted-foreground">Placed On</p>
                <p className="text-xs font-semibold">
                  {format(new Date(serviceOrder.createdAt || serviceOrder.serviceOrderDate), 'MMM dd, yyyy · hh:mm a')}
                </p>
              </div>
              <div className="rounded-lg border bg-white/80 p-2.5">
                <p className="text-[10px] text-muted-foreground">Order Amount</p>
                <p className="text-sm font-bold text-[#6A64F2]">
                  ₹{pricing.totalAmount || pricing.stitchingCost || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Order Accepted */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-gray-900">Order Accepted</p>
                <Badge
                  className={`text-[10px] border ${
                    serviceOrder.acceptedDate
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      : 'bg-amber-100 text-amber-700 border-amber-200'
                  }`}
                >
                  {serviceOrder.acceptedDate ? 'COMPLETED' : 'PENDING'}
                </Badge>
              </div>
              {serviceOrder.acceptedDate && (
                <div className="text-right shrink-0">
                  <p className="text-xs font-medium text-gray-700">
                    {format(new Date(serviceOrder.acceptedDate), 'MMM dd, yyyy')}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(serviceOrder.acceptedDate), 'hh:mm a')}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="rounded-lg border bg-white/80 p-2.5">
                <p className="text-[10px] text-emerald-600">Accepted On</p>
                <p className="text-xs font-semibold">
                  {serviceOrder.acceptedDate
                    ? format(new Date(serviceOrder.acceptedDate), 'MMM dd, yyyy · hh:mm a')
                    : 'Not accepted yet'}
                </p>
              </div>
              <div className="rounded-lg border bg-white/80 p-2.5">
                <p className="text-[10px] text-emerald-600">Accepted By</p>
                <p className="text-xs font-semibold">Admin</p>
              </div>
            </div>
          </div>

          {/* Stitching Process */}
          {(() => {
            const allCompleted = ['ready', 'finished', 'job-completed', 'received-note', 'delivered'].includes(orderStatus);
            const workStarted = orderStatus === 'inprogress';
            const resolvedStatuses = processSteps.map(step =>
              resolveProcessStatus(step.status, allCompleted && !step.status)
            );
            const completedCount = resolvedStatuses.filter(status => status === 'completed').length;
            const hasInProgress = resolvedStatuses.some(status => status === 'in_progress');
            const hasPartialProgress =
              completedCount > 0 && completedCount < processSteps.length;
            const sectionTone = PROCESS_STATUS_STYLES[
              completedCount === processSteps.length && processSteps.length > 0
                ? 'completed'
                : hasInProgress || hasPartialProgress || workStarted
                  ? 'in_progress'
                  : 'pending'
            ];

            return (
              <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-[#6A64F2]">Order Process</p>
                    <Badge className={`border text-[10px] font-semibold ${sectionTone.badge}`}>
                      {sectionTone.label}
                    </Badge>
                  </div>
                  <p className="text-xs font-semibold text-gray-700">
                    <span className="text-emerald-600">{completedCount}</span> / {processSteps.length} Completed
                  </p>
                </div>

                <div className="space-y-2">
                  {processSteps.map((step, index) => {
                    const resolvedStatus = resolvedStatuses[index];
                    const tone = PROCESS_STATUS_STYLES[resolvedStatus];
                    const subSteps = step.subSteps || [];
                    return (
                      <div key={step.id} className="rounded-xl border border-violet-100 bg-white overflow-hidden shadow-sm">
                        <div className="grid grid-cols-[32px_1fr_auto] items-center gap-3 p-3">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${tone.circle}`}
                          >
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{step.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {resolvedStatus === 'completed' ? 'Cost' : 'Estimated Cost'}
                              {subSteps.length > 0 ? ` · ${subSteps.length} sub-steps` : ''}
                            </p>
                          </div>
                          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                            <Input
                              type="number"
                              min={0}
                              value={Number(step.amount) || 0}
                              disabled={updatingStepId === step.id || orderStatus === 'cancelled'}
                              onChange={(e) => {
                                const nextAmount = Number(e.target.value);
                                setProcessSteps(prev =>
                                  prev.map(s =>
                                    s.id === step.id
                                      ? {
                                          ...s,
                                          amount: Number.isFinite(nextAmount) ? nextAmount : 0,
                                        }
                                      : s
                                  )
                                );
                              }}
                              onBlur={(e) => {
                                const nextAmount = Number(e.target.value);
                                handleProcessAmountChange(
                                  step.id,
                                  Number.isFinite(nextAmount) ? nextAmount : 0
                                );
                              }}
                              className="h-7 w-[88px] text-right text-sm font-bold"
                            />
                            <Select
                              value={resolvedStatus}
                              onValueChange={(value) =>
                                handleProcessStatusChange(
                                  step.id,
                                  value as ProcessStatus
                                )
                              }
                              disabled={updatingStepId === step.id || orderStatus === 'cancelled'}
                            >
                              <SelectTrigger
                                className={`h-7 w-[132px] text-[10px] font-semibold shadow-none ${tone.trigger}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending" className={PROCESS_STATUS_STYLES.pending.item}>
                                  <span className="inline-flex items-center gap-1.5">
                                    <span className={`h-1.5 w-1.5 rounded-full ${PROCESS_STATUS_STYLES.pending.dot}`} />
                                    Pending
                                  </span>
                                </SelectItem>
                                <SelectItem value="in_progress" className={PROCESS_STATUS_STYLES.in_progress.item}>
                                  <span className="inline-flex items-center gap-1.5">
                                    <span className={`h-1.5 w-1.5 rounded-full ${PROCESS_STATUS_STYLES.in_progress.dot}`} />
                                    In Progress
                                  </span>
                                </SelectItem>
                                <SelectItem value="completed" className={PROCESS_STATUS_STYLES.completed.item}>
                                  <span className="inline-flex items-center gap-1.5">
                                    <span className={`h-1.5 w-1.5 rounded-full ${PROCESS_STATUS_STYLES.completed.dot}`} />
                                    Completed
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {subSteps.length > 0 && (
                          <div className="border-t border-violet-100 bg-slate-50/80 px-3 py-2 space-y-2">
                            {subSteps.map((sub, subIndex) => {
                              const subStatus = resolveProcessStatus(sub.status);
                              const subTone = PROCESS_STATUS_STYLES[subStatus];
                              return (
                                <div
                                  key={sub.id}
                                  className="grid grid-cols-[32px_1fr_auto] items-center gap-3 rounded-lg border border-slate-100 bg-white px-2 py-2"
                                >
                                  <span className="text-[10px] font-bold text-slate-500 text-center">
                                    {index + 1}.{subIndex + 1}
                                  </span>
                                  <p className="text-xs font-medium text-gray-800 truncate min-w-0">
                                    {sub.name}
                                  </p>
                                  <Select
                                    value={subStatus}
                                    onValueChange={(value) =>
                                      handleSubStepStatusChange(
                                        step.id,
                                        sub.id,
                                        value as ProcessStatus
                                      )
                                    }
                                    disabled={
                                      updatingStepId === sub.id || orderStatus === 'cancelled'
                                    }
                                  >
                                    <SelectTrigger
                                      className={`h-7 w-[132px] text-[10px] font-semibold shadow-none ${subTone.trigger}`}
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pending" className={PROCESS_STATUS_STYLES.pending.item}>
                                        <span className="inline-flex items-center gap-1.5">
                                          <span className={`h-1.5 w-1.5 rounded-full ${PROCESS_STATUS_STYLES.pending.dot}`} />
                                          Pending
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="in_progress" className={PROCESS_STATUS_STYLES.in_progress.item}>
                                        <span className="inline-flex items-center gap-1.5">
                                          <span className={`h-1.5 w-1.5 rounded-full ${PROCESS_STATUS_STYLES.in_progress.dot}`} />
                                          In Progress
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="completed" className={PROCESS_STATUS_STYLES.completed.item}>
                                        <span className="inline-flex items-center gap-1.5">
                                          <span className={`h-1.5 w-1.5 rounded-full ${PROCESS_STATUS_STYLES.completed.dot}`} />
                                          Completed
                                        </span>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Fixed closing steps — colored cards, no numbers */}
          {finalSteps.map(step => {
            const resolvedStatus = resolveProcessStatus(step.status);
            const tone = PROCESS_STATUS_STYLES[resolvedStatus];
            const cardTone =
              step.id === 'final_work_completed'
                ? 'border-sky-200/80 bg-sky-50/50'
                : 'border-indigo-200/80 bg-indigo-50/50';

            return (
              <div key={step.id} className={`rounded-xl border p-3 ${cardTone}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{step.name}</p>
                    <Badge className={`text-[10px] border shrink-0 font-semibold ${tone.badge}`}>
                      {tone.label}
                    </Badge>
                  </div>

                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                    <Input
                      type="number"
                      min={0}
                      value={Number(step.amount) || 0}
                      disabled={updatingStepId === step.id || orderStatus === 'cancelled'}
                      onChange={(e) => {
                        const nextAmount = Number(e.target.value);
                        setFinalSteps(prev =>
                          prev.map(s =>
                            s.id === step.id
                              ? { ...s, amount: Number.isFinite(nextAmount) ? nextAmount : 0 }
                              : s
                          )
                        );
                      }}
                      onBlur={(e) => {
                        const nextAmount = Number(e.target.value);
                        handleFinalAmountChange(
                          step.id,
                          Number.isFinite(nextAmount) ? nextAmount : 0
                        );
                      }}
                      className="h-7 w-[88px] text-right text-sm font-bold bg-white"
                    />
                    <Select
                      value={resolvedStatus === 'completed' ? 'completed' : 'pending'}
                      onValueChange={(value) =>
                        handleFinalStatusChange(
                          step.id,
                          value as 'pending' | 'completed'
                        )
                      }
                      disabled={updatingStepId === step.id || orderStatus === 'cancelled'}
                    >
                      <SelectTrigger
                        className={`h-7 w-[132px] text-[10px] font-semibold shadow-none ${
                          resolvedStatus === 'completed'
                            ? PROCESS_STATUS_STYLES.completed.trigger
                            : PROCESS_STATUS_STYLES.pending.trigger
                        }`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending" className={PROCESS_STATUS_STYLES.pending.item}>
                          <span className="inline-flex items-center gap-1.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${PROCESS_STATUS_STYLES.pending.dot}`} />
                            Pending
                          </span>
                        </SelectItem>
                        <SelectItem value="completed" className={PROCESS_STATUS_STYLES.completed.item}>
                          <span className="inline-flex items-center gap-1.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${PROCESS_STATUS_STYLES.completed.dot}`} />
                            Completed
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

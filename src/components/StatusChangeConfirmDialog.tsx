import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Check, X, Package, Truck, Warning, ArrowsClockwise } from '@phosphor-icons/react';

export type StatusChangeType =
  | 'accept'
  | 'reject'
  | 'ready'
  | 'stitched'
  | 'delivered'
  | 'dispatch'
  | 'reassign';

interface StatusChangeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  type: StatusChangeType;
  orderInfo?: {
    orderNo?: string;
    customerName?: string;
  };
  isLoading?: boolean;
}

const statusConfig: Record<StatusChangeType, {
  title: string;
  description: string;
  confirmText: string;
  confirmColor: string;
  icon: React.ReactNode;
}> = {
  accept: {
    title: 'Accept Order',
    description: 'Are you sure you want to accept this order? This will mark the order as "In Progress" and you will be responsible for completing it.',
    confirmText: 'Accept Order',
    confirmColor: 'bg-green-600 hover:bg-green-700 text-white',
    icon: <Check size={24} weight="bold" className="text-green-600" />,
  },
  reject: {
    title: 'Reject Order',
    description: 'Are you sure you want to reject this order? The admin will be notified and the order will be reassigned to another tailor.',
    confirmText: 'Reject Order',
    confirmColor: 'bg-red-600 hover:bg-red-700 text-white',
    icon: <X size={24} weight="bold" className="text-red-600" />,
  },
  ready: {
    title: 'Mark as Ready',
    description: 'Are you sure you want to mark this order as ready? The customer will be notified that their order is ready for pickup/delivery.',
    confirmText: 'Mark Ready',
    confirmColor: 'bg-blue-600 hover:bg-blue-700 text-white',
    icon: <Package size={24} weight="bold" className="text-blue-600" />,
  },
  stitched: {
    title: 'Mark as Stitched',
    description: 'Are you sure you want to mark this order as stitched? This indicates that the stitching work is complete.',
    confirmText: 'Mark Stitched',
    confirmColor: 'bg-purple-600 hover:bg-purple-700 text-white',
    icon: <Check size={24} weight="bold" className="text-purple-600" />,
  },
  delivered: {
    title: 'Mark as Delivered',
    description: 'Are you sure you want to mark this order as delivered? This will complete the order and record the payment.',
    confirmText: 'Mark Delivered',
    confirmColor: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    icon: <Truck size={24} weight="bold" className="text-emerald-600" />,
  },
  dispatch: {
    title: 'Ready to Dispatch',
    description: 'Are you sure you want to mark this order as ready for dispatch? This will notify that the goods are ready to be sent.',
    confirmText: 'Ready to Dispatch',
    confirmColor: 'bg-orange-600 hover:bg-orange-700 text-white',
    icon: <Truck size={24} weight="bold" className="text-orange-600" />,
  },
  reassign: {
    title: 'Reassign Order',
    description: 'Are you sure you want to reassign this order? The current assignment will be changed and the new assignee will be notified.',
    confirmText: 'Reassign',
    confirmColor: 'bg-amber-600 hover:bg-amber-700 text-white',
    icon: <ArrowsClockwise size={24} weight="bold" className="text-amber-600" />,
  },
};

export function StatusChangeConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  type,
  orderInfo,
  isLoading = false,
}: StatusChangeConfirmDialogProps) {
  const config = statusConfig[type];

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-muted">
              {config.icon}
            </div>
            <AlertDialogTitle className="text-xl">{config.title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            {config.description}
          </AlertDialogDescription>
          {orderInfo && (orderInfo.orderNo || orderInfo.customerName) && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              {orderInfo.orderNo && (
                <p className="text-sm font-medium">
                  Order: <span className="text-primary">{orderInfo.orderNo}</span>
                </p>
              )}
              {orderInfo.customerName && (
                <p className="text-sm text-muted-foreground">
                  Customer: {orderInfo.customerName}
                </p>
              )}
            </div>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={config.confirmColor}
          >
            {isLoading ? 'Processing...' : config.confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

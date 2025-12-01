import { Card } from '@/components/ui/card';
import {
  Scissors,
  Package,
  XCircle,
  ClockCountdown,
  Truck,
  HourglassMedium,
  Spinner,
  FileText,
  ClipboardText
} from '@phosphor-icons/react';
import { ServiceOrder, OrderAllotment } from '@/lib/types';

// Filter types for the dashboard - Now based on unified ServiceOrder.orderStatus
export type DashboardFilter =
  | 'all'
  | 'open'           // 1. Open Orders - not assigned
  | 'awaiting'       // 2. Awaiting Acceptance - assigned but not accepted
  | 'waitingForDC'   // 2.5 Waiting for DC (vendor only) - accepted but no DC yet
  | 'inProgress'     // 3. In-Progress - accepted and working
  | 'rejected'       // 4. Rejected Orders
  | 'ready'          // 5. Ready to Delivery (Employee workflow)
  | 'jobworkCompleted' // 6. Jobwork Completed (Vendor workflow)
  | 'receivedNote'   // 7. Received Note / Goods Receipt
  | 'delivered'      // 8. Delivered Orders
  | 'overdue';       // 9. Overdue Orders

interface DashboardStatsProps {
  totalCustomers: number;
  serviceOrders?: ServiceOrder[];
  orderAllotments?: OrderAllotment[];
  onStatClick?: (filter: DashboardFilter) => void;
}

export function DashboardStats({ serviceOrders, orderAllotments, onStatClick }: DashboardStatsProps) {

  // NEW UNIFIED STATUS FLOW - All status tracking from ServiceOrder.orderStatus directly
  // Status flow: open → awaiting → waitingForDC (vendor) → inprogress → ready/job-completed → received-note → delivered

  // 1. OPEN ORDERS - Order created but NOT assigned
  const openOrders = (serviceOrders || []).filter((o) => o.orderStatus === 'open').length;

  // 2. AWAITING ACCEPTANCE - Order assigned but not accepted yet
  const awaitingAcceptance = (serviceOrders || []).filter((o) => o.orderStatus === 'awaiting').length;

  // 2.5 WAITING FOR DC - Vendor accepted but waiting for Delivery Challan
  const waitingForDC = (serviceOrders || []).filter((o) => o.orderStatus === 'waitingForDC').length;

  // 3. IN-PROGRESS ORDERS - Work is currently being done
  const inProgressOrders = (serviceOrders || []).filter((o) => o.orderStatus === 'inprogress').length;

  // 4. REJECTED ORDERS - Order rejected by Employee or Vendor
  const rejectedOrders = (serviceOrders || []).filter((o) => o.orderStatus === 'rejected').length;

  // 5. READY TO DELIVERY - Employee workflow completed (ready status)
  const readyToDelivery = (serviceOrders || []).filter((o) => o.orderStatus === 'ready').length;

  // 6. JOBWORK COMPLETED - Vendor workflow, work completed but goods not received yet
  const jobworkCompleted = (serviceOrders || []).filter((o) => o.orderStatus === 'job-completed').length;

  // 7. RECEIVED NOTE (Goods Receipt) - Vendor order goods received at shop
  const receivedNote = (serviceOrders || []).filter((o) => o.orderStatus === 'received-note').length;

  // 8. DELIVERED ORDERS - Order completed and handed over to customer
  const deliveredOrders = (serviceOrders || []).filter((o) => o.orderStatus === 'delivered').length;

  // 9. OVERDUE ORDERS - Past due date but not delivered
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueOrders = (serviceOrders || []).filter((o) => {
    if (o.orderStatus === 'delivered' || o.orderStatus === 'ready' || o.orderStatus === 'received-note') return false;
    if (!o.expectedDeliveryDate) return false;
    const deliveryDate = new Date(o.expectedDeliveryDate);
    deliveryDate.setHours(0, 0, 0, 0);
    return deliveryDate < today;
  }).length;

  const stats = [
    {
      label: 'Overdue Orders',
      value: overdueOrders,
      icon: ClockCountdown,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      filter: 'overdue' as const,
    },
    {
      label: 'Open Orders',
      value: openOrders,
      icon: Scissors,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      filter: 'open' as const,
    },
    {
      label: 'Awaiting Acceptance',
      value: awaitingAcceptance,
      icon: HourglassMedium,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
      filter: 'awaiting' as const,
    },
    {
      label: 'In-Progress',
      value: inProgressOrders,
      icon: Spinner,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      filter: 'inProgress' as const,
    },
    {
      label: 'Rejected Orders',
      value: rejectedOrders,
      icon: XCircle,
      color: 'text-rose-600',
      bgColor: 'bg-rose-100',
      filter: 'rejected' as const,
    },
    {
      label: 'Jobwork Completed',
      value: jobworkCompleted,
      icon: Truck,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      filter: 'jobworkCompleted' as const,
    },
    {
      label: 'Received Note',
      value: receivedNote,
      icon: FileText,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100',
      filter: 'receivedNote' as const,
    },
    {
      label: 'Ready to Delivery',
      value: readyToDelivery,
      icon: Package,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      filter: 'ready' as const,
    },
    {
      label: 'Waiting for DC',
      value: waitingForDC,
      icon: ClipboardText,
      color: 'text-teal-600',
      bgColor: 'bg-teal-100',
      filter: 'waitingForDC' as const,
    },
  ];

  return (
    <div className="grid grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2 sm:gap-3">
      {stats.map((stat, index) => (
        <Card
          key={index}
          className={`p-2 sm:p-4 transition-all duration-200 cursor-pointer hover:shadow-xl hover:scale-105 animate-on-load animate-scale-in stagger-${index + 1}`}
          style={{
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(124, 58, 237, 0.15) 50%, rgba(99, 102, 241, 0.15) 100%)',
            borderColor: 'rgba(196, 181, 253, 0.4)',
            backdropFilter: 'blur(10px)'
          }}
          onClick={() => onStatClick && onStatClick(stat.filter)}
        >
          <div className="flex flex-col items-center justify-center text-center gap-1 sm:gap-2">
            <div className={`${stat.bgColor} ${stat.color} p-1.5 sm:p-2 rounded-lg flex-shrink-0 shadow-sm`}>
              <stat.icon size={16} className="sm:size-5" weight="duotone" />
            </div>
            <div className="w-full min-w-0">
              <p className="text-xl sm:text-3xl font-bold text-foreground mb-0.5">
                {stat.value}
              </p>
              <p className="text-[8px] sm:text-[10px] font-medium text-muted-foreground line-clamp-2 leading-tight">
                {stat.label}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

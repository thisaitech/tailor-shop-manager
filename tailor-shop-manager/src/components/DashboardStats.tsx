import { Card } from '@/components/ui/card';
import {
  Scissors,
  Package,
  XCircle,
  ClockCountdown,
  Truck,
  HourglassMedium,
  Spinner,
  CheckCircle,
  FileText
} from '@phosphor-icons/react';
import { ServiceOrder, OrderAllotment } from '@/lib/types';

// Filter types for the dashboard
export type DashboardFilter =
  | 'all'
  | 'open'           // 1. Open Orders - not assigned
  | 'awaiting'       // 2. Awaiting Acceptance - assigned but not accepted
  | 'inProgress'     // 3. In-Progress - accepted and working
  | 'rejected'       // 4. Rejected Orders
  | 'ready'          // 5. Ready to Delivery (Employee only)
  | 'jobworkCompleted' // 6. Jobwork Completed (Vendor only)
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

  // Get set of service order IDs that have active (non-reassigned) allotments
  const ordersWithAllotments = new Set(
    (orderAllotments || [])
      .filter(a => !a.reassigned)
      .map(a => a.serviceOrderNo)
  );

  // 1. OPEN ORDERS - Order created but NOT assigned to any Employee or Vendor
  // ServiceOrders with orderStatus === 'open' AND no active allotment
  const openOrders = (serviceOrders || []).filter((o) =>
    o.orderStatus === 'open' && !ordersWithAllotments.has(o.id)
  ).length;

  // 2. AWAITING ACCEPTANCE - Order assigned but employee/vendor hasn't accepted yet
  // OrderAllotments with status === 'allotted' (waiting for acceptance)
  const awaitingAcceptance = (orderAllotments || []).filter((o) =>
    o.status === 'allotted' && !o.reassigned
  ).length;

  // 3. IN-PROGRESS ORDERS - Order accepted and work is currently being done
  // OrderAllotments with status === 'in_progress'
  const inProgressOrders = (orderAllotments || []).filter((o) =>
    o.status === 'in_progress' && !o.reassigned
  ).length;

  // 4. REJECTED ORDERS - Order rejected by Employee or Vendor (needs reassignment)
  const rejectedOrders = (orderAllotments || []).filter((o) =>
    o.status === 'rejected' && !o.reassigned
  ).length;

  // 5. READY TO DELIVERY (Employee workflow) - Stitching completed by Employee
  // Employee orders that are stitched/delivered and marked ready
  const readyToDelivery = (serviceOrders || []).filter((o) => {
    if (o.orderStatus !== 'ready') return false;
    const hasPendingVendorWork = (orderAllotments || []).some(a => 
      a.serviceOrderNo === o.id && 
      a.stitchingAllotment === 'vendor' && 
      a.status === 'stitched'
    );
    return !hasPendingVendorWork;
  }).length;

  // 6. JOBWORK COMPLETED ORDERS (Vendor workflow) - Stitching completed by Vendor
  // Vendor orders with status === 'stitched' (goods not yet received at shop)
  const jobworkCompleted = (orderAllotments || []).filter((o) =>
    o.stitchingAllotment === 'vendor' &&
    o.status === 'stitched' &&
    !o.reassigned
  ).length;

  // 7. RECEIVED NOTE (Goods Receipt) - Vendor order received at shop
  // Vendor orders with status === 'delivered' but service order not yet 'ready'
  const receivedNote = (orderAllotments || []).filter((o) =>
    o.stitchingAllotment === 'vendor' &&
    o.status === 'delivered' &&
    o.serviceOrderStatus !== 'ready' &&
    !o.reassigned
  ).length;

  // 8. DELIVERED ORDERS - Order completed and handed over to customer
  const deliveredOrders = (serviceOrders || []).filter((o) => o.orderStatus === 'delivered').length;

  // 9. OVERDUE ORDERS - Past due date but not delivered
  // Only count orders that are still "open" (not yet assigned) and overdue
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueOrders = (serviceOrders || []).filter((o) => {
    if (o.orderStatus === 'delivered' || o.orderStatus === 'ready') return false;
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
      label: 'Delivered Orders',
      value: deliveredOrders,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      filter: 'delivered' as const,
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

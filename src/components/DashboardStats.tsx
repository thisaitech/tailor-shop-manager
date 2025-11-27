import { useLanguage } from '@/hooks/use-language';
import { Card } from '@/components/ui/card';
import { Scissors, Package, CheckCircle, XCircle, Checks, ArrowsClockwise } from '@phosphor-icons/react';
import { Order, ServiceOrder, OrderAllotment } from '@/lib/types';

interface DashboardStatsProps {
  totalCustomers: number;
  orders: Order[];
  serviceOrders?: ServiceOrder[];
  orderAllotments?: OrderAllotment[];
  onStatClick?: (filter: 'all' | 'active' | 'ready' | 'completed' | 'rejected' | 'stitched' | 'reassigned') => void;
}

export function DashboardStats({ totalCustomers, orders, serviceOrders, orderAllotments, onStatClick }: DashboardStatsProps) {
  const { t } = useLanguage();

  // Helper function to get display status (matching OrderList logic)
  const getDisplayStatus = (serviceOrder: ServiceOrder): string => {
    // Find matching order allotment (exclude reassigned orders - matching OrderList logic)
    const allotment = (orderAllotments || []).find(a => a.serviceOrderNo === serviceOrder.id && !a.reassigned);

    // If no allotment exists → Pending
    if (!allotment) {
      return 'pending';
    }

    const allotmentStatus = allotment.status;
    const serviceOrderStatus = allotment.serviceOrderStatus;
    const orderTicketStatus = allotment.orderStatus;

    // If final payment is completed → Completed
    if (serviceOrder.orderStatus === 'delivered') {
      return 'completed';
    }

    // Ready to deliver or ready to dispatch → Delivered (Ready to Deliver)
    if (allotmentStatus === 'stitched' || allotmentStatus === 'delivered' || serviceOrderStatus === 'ready') {
      return 'delivered';
    }

    // In progress
    if (allotmentStatus === 'in_progress' || orderTicketStatus === 'in-progress' || serviceOrder.orderStatus === 'in-progress') {
      return 'in-progress';
    }

    // Allotted but not started → Pending
    if (allotmentStatus === 'allotted' || orderTicketStatus === 'open') {
      return 'pending';
    }

    // Default to pending
    return 'pending';
  };

  // Count ready orders using display status logic (matching OrderList)
  const readyOrders = serviceOrders
    ? serviceOrders.filter((o) => getDisplayStatus(o) === 'delivered').length
    : (orders || []).filter((o) => o.status === 'ready').length;

  // Active orders = total orders - ready to deliver orders (orders without final payment)
  const totalOrders = serviceOrders?.length || (orders || []).length;
  const activeOrders = totalOrders - readyOrders;

  const completedOrders = serviceOrders
    ? serviceOrders.filter((o) => getDisplayStatus(o) === 'completed').length
    : (orders || []).filter((o) => o.status === 'delivered').length;

  // Count rejected orders (only first-time rejections, not reassigned ones)
  const rejectedOrders = orderAllotments
    ? orderAllotments.filter((o) => o.status === 'rejected' && !o.reassigned).length
    : 0;

  const stitchedOrders = orderAllotments
    ? orderAllotments.filter((o) =>
        o.status === 'stitched' &&
        !o.reassigned &&
        o.serviceOrderStatus !== 'ready'
      ).length
    : 0;

  // Count only reassigned orders awaiting response (status = 'reassigned')
  // Once status changes to 'in_progress', 'stitched', etc., they are removed from count
  const reassignedOrders = orderAllotments
    ? orderAllotments.filter((o) =>
        o.reassigned === true &&
        o.stitchedId &&
        o.status === 'reassigned'
      ).length
    : 0;

  const stats = [
    {
      label: t('activeOrders'),
      value: activeOrders,
      icon: Scissors,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      filter: 'active' as const,
    },
    {
      label: t('readyForDelivery'),
      value: readyOrders,
      icon: Package,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
      filter: 'ready' as const,
    },
    {
      label: t('completedOrders'),
      value: completedOrders,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      filter: 'completed' as const,
    },
    {
      label: 'Rejected Orders',
      value: rejectedOrders,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      filter: 'rejected' as const,
    },
    {
      label: 'Job Completed Orders',
      value: stitchedOrders,
      icon: Checks,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      filter: 'stitched' as const,
    },
    {
      label: 'Awaiting Acceptance',
      value: reassignedOrders,
      icon: ArrowsClockwise,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      filter: 'reassigned' as const,
    },
  ];

  return (
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
      {stats.map((stat, index) => (
        <Card
          key={index}
          className="p-3 sm:p-6 transition-all duration-200 cursor-pointer hover:shadow-lg hover:scale-105"
          onClick={() => onStatClick && onStatClick(stat.filter)}
        >
          <div className="flex flex-col items-center justify-center text-center gap-2 sm:gap-3">
            <div className={`${stat.bgColor} ${stat.color} p-2 sm:p-3 rounded-lg flex-shrink-0`}>
              <stat.icon size={20} className="sm:size-7" weight="duotone" />
            </div>
            <div className="w-full min-w-0">
              <p className="text-3xl sm:text-5xl font-bold text-foreground mb-1">
                {stat.value}
              </p>
              <p className="text-[9px] sm:text-xs font-medium text-muted-foreground line-clamp-2 leading-tight px-1">
                {stat.label}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

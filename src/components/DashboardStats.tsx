import { useLanguage } from '@/hooks/use-language';
import { Card } from '@/components/ui/card';
import { Users, Scissors, Package, CheckCircle, XCircle, Checks } from '@phosphor-icons/react';
import { Order, ServiceOrder, OrderAllotment } from '@/lib/types';

interface DashboardStatsProps {
  totalCustomers: number;
  orders: Order[];
  serviceOrders?: ServiceOrder[];
  orderAllotments?: OrderAllotment[];
  onStatClick?: (filter: 'all' | 'active' | 'ready' | 'completed' | 'rejected' | 'stitched') => void;
}

export function DashboardStats({ totalCustomers, orders, serviceOrders, orderAllotments, onStatClick }: DashboardStatsProps) {
  const { t } = useLanguage();

  // Use serviceOrders if available, otherwise fall back to old orders array
  const activeOrders = serviceOrders
    ? serviceOrders.filter((o) => o.orderStatus !== 'delivered').length
    : (orders || []).filter((o) => o.status === 'pending' || o.status === 'in-progress').length;

  const readyOrders = serviceOrders
    ? serviceOrders.filter((o) => o.orderStatus === 'ready').length
    : (orders || []).filter((o) => o.status === 'ready').length;

  const completedOrders = serviceOrders
    ? serviceOrders.filter((o) => o.orderStatus === 'delivered').length
    : (orders || []).filter((o) => o.status === 'delivered').length;

  // Count rejected and stitched orders from order allotments
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

  const stats = [
    {
      label: t('totalCustomers'),
      value: totalCustomers,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      filter: 'all' as const,
    },
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
      label: 'Stitched Orders',
      value: stitchedOrders,
      icon: Checks,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      filter: 'stitched' as const,
    },
  ];

  return (
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
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

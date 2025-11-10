import { useLanguage } from '@/hooks/use-language';
import { Card } from '@/components/ui/card';
import { Users, Scissors, Package, CheckCircle } from '@phosphor-icons/react';
import { Order, OrderStatus } from '@/lib/types';

interface DashboardStatsProps {
  totalCustomers: number;
  orders: Order[];
  onStatClick?: (filter: 'all' | 'active' | 'ready' | 'completed') => void;
}

export function DashboardStats({ totalCustomers, orders, onStatClick }: DashboardStatsProps) {
  const { t } = useLanguage();

  const activeOrders = orders.filter(
    (o) => o.status === 'pending' || o.status === 'in-progress'
  ).length;

  const readyOrders = orders.filter((o) => o.status === 'ready').length;
  const completedOrders = orders.filter((o) => o.status === 'delivered').length;

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
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {stats.map((stat, index) => (
        <Card
          key={index}
          className="p-3 sm:p-6 hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-95"
          onClick={() => onStatClick?.(stat.filter)}
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

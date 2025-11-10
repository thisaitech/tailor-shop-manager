import { useLanguage } from '@/hooks/use-language';
import { Card } from '@/components/ui/card';
import { Users, Scissors, Package, CheckCircle } from '@phosphor-icons/react';
import { Order, OrderStatus } from '@/lib/types';

interface DashboardStatsProps {
  totalCustomers: number;
  orders: Order[];
}

export function DashboardStats({ totalCustomers, orders }: DashboardStatsProps) {
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
    },
    {
      label: t('activeOrders'),
      value: activeOrders,
      icon: Scissors,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: t('readyForDelivery'),
      value: readyOrders,
      icon: Package,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      label: t('completedOrders'),
      value: completedOrders,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {stats.map((stat, index) => (
        <Card
          key={index}
          className="p-3 sm:p-6 hover:shadow-lg transition-shadow duration-200"
        >
          <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-2 sm:gap-0">
            <div className="w-full">
              <p className="text-[10px] sm:text-sm font-medium text-muted-foreground mb-0.5 sm:mb-1">
                {stat.label}
              </p>
              <p className="text-xl sm:text-3xl font-bold text-foreground">{stat.value}</p>
            </div>
            <div className={`${stat.bgColor} ${stat.color} p-2 sm:p-3 rounded-lg self-end sm:self-auto`}>
              <stat.icon size={20} className="sm:size-6" weight="duotone" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

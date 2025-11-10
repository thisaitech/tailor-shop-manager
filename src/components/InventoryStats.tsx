import { InventoryItem } from '@/lib/types';
import { useLanguage } from '@/hooks/use-language';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, WarningCircle, CurrencyDollar, Stack } from '@phosphor-icons/react';

interface InventoryStatsProps {
  items: InventoryItem[];
}

export function InventoryStats({ items }: InventoryStatsProps) {
  const { t } = useLanguage();

  const totalItems = items.length;
  const lowStockItems = items.filter(item => item.quantity <= item.minQuantity).length;
  const totalValue = items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  const stats = [
    {
      title: t('totalItems'),
      value: totalItems,
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: t('lowStockItems'),
      value: lowStockItems,
      icon: WarningCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    {
      title: t('totalValue'),
      value: `₹${totalValue.toLocaleString()}`,
      icon: CurrencyDollar,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      title: t('quantity'),
      value: totalQuantity,
      icon: Stack,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={`p-1.5 sm:p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`${stat.color} size-4 sm:size-5`} weight="duotone" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

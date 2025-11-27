import { InventoryItem, InventoryTransaction } from '@/lib/types';
import { useLanguage } from '@/hooks/use-language';
import { Card } from '@/components/ui/card';
import { Package, WarningCircle, CurrencyDollar, ShoppingCart } from '@phosphor-icons/react';

interface InventoryStatsProps {
  items: InventoryItem[];
  transactions?: InventoryTransaction[];
}

export function InventoryStats({ items, transactions = [] }: InventoryStatsProps) {
  const { t } = useLanguage();

  const totalItems = (items || []).length;
  const lowStockItems = (items || []).filter(item => item.quantity <= item.minQuantity).length;
  
  const totalValue = (items || []).reduce((sum, item) => {
    const price = (typeof item?.price === 'number' && !isNaN(item.price)) ? item.price : 0;
    const quantity = (typeof item?.quantity === 'number' && !isNaN(item.quantity)) ? item.quantity : 0;
    const itemValue = price * quantity;
    const result = sum + itemValue;
    return (typeof result === 'number' && !isNaN(result)) ? result : sum;
  }, 0);
  
  const safeTotal = (typeof totalValue === 'number' && !isNaN(totalValue) && isFinite(totalValue)) ? totalValue : 0;
  
  const totalQuantity = (items || []).reduce((sum, item) => {
    const quantity = (typeof item?.quantity === 'number' && !isNaN(item.quantity)) ? item.quantity : 0;
    const result = sum + quantity;
    return (typeof result === 'number' && !isNaN(result)) ? result : sum;
  }, 0);
  
  const safeQuantity = (typeof totalQuantity === 'number' && !isNaN(totalQuantity) && isFinite(totalQuantity)) ? totalQuantity : 0;

  // Estimate spend for 'in' transactions using current item price * quantity
  const priceById = new Map<string, number>((items || []).map(i => [i.id, typeof i.price === 'number' ? i.price : 0]));
  const spent = (transactions || [])
    .filter(tx => tx.type === 'in')
    .reduce((sum, tx) => {
      const unit = priceById.get(tx.itemId) || 0;
      return sum + unit * tx.quantity;
    }, 0);
  const safeSpent = (typeof spent === 'number' && isFinite(spent)) ? spent : 0;

  const stats = [
    {
      label: t('totalItems'),
      value: totalItems,
      icon: Package,
      color: 'text-violet-600',
      bgColor: 'bg-violet-100',
    },
    {
      label: t('lowStockItems'),
      value: lowStockItems,
      icon: WarningCircle,
      color: 'text-rose-600',
      bgColor: 'bg-rose-100',
    },
    {
      label: t('spentOnInventory'),
      value: `₹${safeSpent.toLocaleString('en-IN')}`,
      icon: ShoppingCart,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      label: t('totalValue'),
      value: `₹${safeTotal.toLocaleString('en-IN')}`,
      icon: CurrencyDollar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="p-3 sm:p-6 rounded-xl border shadow-md transition-all hover:shadow-lg"
          style={{
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(124, 58, 237, 0.1) 50%, rgba(99, 102, 241, 0.1) 100%)',
            borderColor: 'rgba(196, 181, 253, 0.4)'
          }}
        >
          <div className="flex flex-col items-center justify-center text-center gap-2 sm:gap-3">
            <div className={`${stat.bgColor} ${stat.color} p-2 sm:p-3 rounded-lg flex-shrink-0 shadow-sm`}>
              <stat.icon size={20} className="sm:size-7" weight="duotone" />
            </div>
            <div className="w-full min-w-0">
              <p className="text-3xl sm:text-5xl font-bold text-gray-900 mb-1">
                {stat.value}
              </p>
              <p className="text-[9px] sm:text-xs font-medium text-gray-500 line-clamp-2 leading-tight px-1">
                {stat.label}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

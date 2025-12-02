import { useState } from 'react';
import { InventoryItem } from '@/lib/types';
import { useLanguage } from '@/hooks/use-language';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InventoryForm } from './InventoryForm';
import { StockUpdateDialog } from './StockUpdateDialog';
import { MagnifyingGlass, Package, WarningCircle } from '@phosphor-icons/react';
import { format } from 'date-fns';

interface InventoryListProps {
  items: InventoryItem[];
  onAddItem: (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onStockUpdate: (itemId: string, quantity: number, type: 'in' | 'out', reason: string) => void;
}

export function InventoryList({ items, onAddItem, onStockUpdate }: InventoryListProps) {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredItems = (items || []).filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.color?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getStockStatus = (item: InventoryItem) => {
    if (item.quantity === 0) return { label: t('outOfStock'), variant: 'destructive' as const };
    if (item.quantity <= item.minQuantity) return { label: t('lowStock'), variant: 'outline' as const };
    return { label: t('inStock'), variant: 'default' as const };
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder={t('searchInventory')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-40 h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="fabric">{t('fabric')}</SelectItem>
              <SelectItem value="thread">{t('thread')}</SelectItem>
              <SelectItem value="button">{t('button')}</SelectItem>
              <SelectItem value="zipper">{t('zipper')}</SelectItem>
              <SelectItem value="accessory">{t('accessory')}</SelectItem>
              <SelectItem value="other">{t('other')}</SelectItem>
            </SelectContent>
          </Select>
          <InventoryForm onAddItem={onAddItem} />
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div
          className="rounded-xl border shadow-md p-8 flex flex-col items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 50%, #e0e7ff 100%)',
            borderColor: 'rgba(196, 181, 253, 0.5)'
          }}
        >
          <Package size={64} className="text-purple-400 mb-4" weight="duotone" />
          <p className="text-base font-medium text-gray-600 mb-2">{t('noItems')}</p>
          <InventoryForm onAddItem={onAddItem} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredItems.map((item) => {
            const status = getStockStatus(item);
            const isLowStock = item.quantity <= item.minQuantity;

            return (
              <div
                key={item.id}
                className={`rounded-xl border shadow-md transition-all hover:shadow-lg ${isLowStock && item.quantity > 0 ? 'border-amber-400' : ''}`}
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #faf8ff 100%)',
                  borderColor: isLowStock && item.quantity > 0 ? undefined : 'rgba(167, 139, 250, 0.3)'
                }}
              >
                <div className="p-4 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 flex items-center gap-2">
                        <span className="truncate">{item.name}</span>
                        {isLowStock && item.quantity > 0 && (
                          <WarningCircle className="text-amber-500 flex-shrink-0 size-4 sm:size-5" weight="fill" />
                        )}
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="secondary" className="text-[10px] sm:text-xs bg-purple-100 text-purple-700">{t(item.category)}</Badge>
                        <Badge variant={status.variant} className="text-[10px] sm:text-xs">{status.label}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-4 pb-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                    <div className="min-w-0">
                      <p className="text-gray-500 line-clamp-1">{t('quantity')}</p>
                      <p className="font-semibold text-gray-900 line-clamp-1">{item.quantity} {t(item.unit)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-gray-500 line-clamp-1">{t('minQuantity')}</p>
                      <p className="font-semibold text-gray-900 line-clamp-1">{item.minQuantity} {t(item.unit)}</p>
                    </div>
                    {item.price && item.price > 0 && (
                      <>
                        <div className="min-w-0">
                          <p className="text-gray-500 line-clamp-1">{t('price')}</p>
                          <p className="font-semibold text-purple-700">₹{item.price}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-gray-500 line-clamp-1">{t('totalValue')}</p>
                          <p className="font-semibold text-purple-700">₹{((item.price || 0) * (item.quantity || 0)).toFixed(2)}</p>
                        </div>
                      </>
                    )}
                    {item.color && (
                      <div className="min-w-0">
                        <p className="text-gray-500 line-clamp-1">{t('color')}</p>
                        <p className="font-semibold text-gray-900 truncate">{item.color}</p>
                      </div>
                    )}
                    {item.supplier && (
                      <div className="min-w-0">
                        <p className="text-gray-500 line-clamp-1">{t('supplier')}</p>
                        <p className="font-semibold text-gray-900 truncate">{item.supplier}</p>
                      </div>
                    )}
                    {item.lastRestocked && (
                      <div className="col-span-2 min-w-0">
                        <p className="text-gray-500 line-clamp-1">{t('lastRestocked')}</p>
                        <p className="font-semibold text-gray-900">{format(item.lastRestocked, 'PPP')}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end pt-2 border-t border-purple-100">
                    <StockUpdateDialog item={item} onStockUpdate={onStockUpdate} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

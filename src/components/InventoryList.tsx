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

  const filteredItems = items.filter((item) => {
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
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder={t('searchInventory')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-40">
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
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package size={64} className="text-muted-foreground mb-4" weight="duotone" />
            <p className="text-lg font-medium text-muted-foreground mb-2">{t('noItems')}</p>
            <InventoryForm onAddItem={onAddItem} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredItems.map((item) => {
            const status = getStockStatus(item);
            const isLowStock = item.quantity <= item.minQuantity;
            
            return (
              <Card key={item.id} className={isLowStock && item.quantity > 0 ? 'border-amber-500/50' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {item.name}
                        {isLowStock && item.quantity > 0 && (
                          <WarningCircle className="text-amber-500" size={20} weight="fill" />
                        )}
                      </CardTitle>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="secondary">{t(item.category)}</Badge>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">{t('quantity')}</p>
                      <p className="font-semibold">{item.quantity} {t(item.unit)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('minQuantity')}</p>
                      <p className="font-semibold">{item.minQuantity} {t(item.unit)}</p>
                    </div>
                    {item.price && item.price > 0 && (
                      <>
                        <div>
                          <p className="text-muted-foreground">{t('price')}</p>
                          <p className="font-semibold">₹{item.price}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t('totalValue')}</p>
                          <p className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      </>
                    )}
                    {item.color && (
                      <div>
                        <p className="text-muted-foreground">{t('color')}</p>
                        <p className="font-semibold">{item.color}</p>
                      </div>
                    )}
                    {item.supplier && (
                      <div>
                        <p className="text-muted-foreground">{t('supplier')}</p>
                        <p className="font-semibold">{item.supplier}</p>
                      </div>
                    )}
                    {item.lastRestocked && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">{t('lastRestocked')}</p>
                        <p className="font-semibold">{format(item.lastRestocked, 'PPP')}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end pt-2">
                    <StockUpdateDialog item={item} onStockUpdate={onStockUpdate} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

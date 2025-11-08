import { useState } from 'react';
import { InventoryItem, InventoryTransaction } from '@/lib/types';
import { useLanguage } from '@/hooks/use-language';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowCircleDown, ArrowCircleUp } from '@phosphor-icons/react';

interface StockUpdateDialogProps {
  item: InventoryItem;
  onStockUpdate: (itemId: string, quantity: number, type: 'in' | 'out', reason: string) => void;
}

export function StockUpdateDialog({ item, onStockUpdate }: StockUpdateDialogProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [stockInAmount, setStockInAmount] = useState(0);
  const [stockOutAmount, setStockOutAmount] = useState(0);
  const [stockInReason, setStockInReason] = useState('');
  const [stockOutReason, setStockOutReason] = useState('');

  const handleStockIn = () => {
    if (stockInAmount > 0) {
      onStockUpdate(item.id, stockInAmount, 'in', stockInReason);
      setStockInAmount(0);
      setStockInReason('');
      setOpen(false);
    }
  };

  const handleStockOut = () => {
    if (stockOutAmount > 0 && stockOutAmount <= item.quantity) {
      onStockUpdate(item.id, stockOutAmount, 'out', stockOutReason);
      setStockOutAmount(0);
      setStockOutReason('');
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {t('updateInventory')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item.name} - {t('updateInventory')}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="in" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="in" className="gap-2">
              <ArrowCircleDown size={18} />
              {t('stockIn')}
            </TabsTrigger>
            <TabsTrigger value="out" className="gap-2">
              <ArrowCircleUp size={18} />
              {t('stockOut')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="in" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stockInAmount">{t('amount')} ({t(item.unit)})</Label>
              <Input
                id="stockInAmount"
                type="number"
                min="0"
                step="0.01"
                value={stockInAmount}
                onChange={(e) => setStockInAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stockInReason">{t('reason')}</Label>
              <Textarea
                id="stockInReason"
                value={stockInReason}
                onChange={(e) => setStockInReason(e.target.value)}
                placeholder="e.g., New purchase, Return from order"
              />
            </div>
            <Button onClick={handleStockIn} className="w-full gap-2">
              <ArrowCircleDown size={18} />
              {t('stockIn')}
            </Button>
          </TabsContent>

          <TabsContent value="out" className="space-y-4">
            <div className="text-sm text-muted-foreground mb-2">
              {t('quantity')}: {item.quantity} {t(item.unit)}
            </div>
            <div className="space-y-2">
              <Label htmlFor="stockOutAmount">{t('amount')} ({t(item.unit)})</Label>
              <Input
                id="stockOutAmount"
                type="number"
                min="0"
                max={item.quantity}
                step="0.01"
                value={stockOutAmount}
                onChange={(e) => setStockOutAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stockOutReason">{t('reason')}</Label>
              <Textarea
                id="stockOutReason"
                value={stockOutReason}
                onChange={(e) => setStockOutReason(e.target.value)}
                placeholder="e.g., Used in order, Damaged"
              />
            </div>
            <Button onClick={handleStockOut} className="w-full gap-2">
              <ArrowCircleUp size={18} />
              {t('stockOut')}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

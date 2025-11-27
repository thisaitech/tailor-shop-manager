import { useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InventoryItem, MaterialUsed } from '@/lib/types';
import { Plus, Trash } from '@phosphor-icons/react';
import { toast } from 'sonner';

interface MaterialSelectorProps {
  inventory: InventoryItem[];
  selectedMaterials: MaterialUsed[];
  onChange: (materials: MaterialUsed[]) => void;
}

export function MaterialSelector({ inventory, selectedMaterials, onChange }: MaterialSelectorProps) {
  const { t } = useLanguage();
  const [currentItemId, setCurrentItemId] = useState('');
  const [currentQuantity, setCurrentQuantity] = useState('');

  const safeInventory = inventory || [];
  const safeMaterials = selectedMaterials || [];

  const availableItems = safeInventory.filter(item => item.quantity > 0);

  const handleAddMaterial = () => {
    if (!currentItemId || !currentQuantity) {
      toast.error('Please select material and quantity');
      return;
    }

    const item = safeInventory.find(i => i.id === currentItemId);
    if (!item) return;

    const quantity = parseFloat(currentQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    if (quantity > item.quantity) {
      toast.error(`Not enough stock. Available: ${item.quantity} ${item.unit}`);
      return;
    }

    if (safeMaterials.find(m => m.itemId === currentItemId)) {
      toast.error('Material already added');
      return;
    }

    const newMaterial: MaterialUsed = {
      itemId: item.id,
      itemName: item.name,
      quantity,
      unit: item.unit,
    };

    onChange([...safeMaterials, newMaterial]);
    setCurrentItemId('');
    setCurrentQuantity('');
  };

  const handleRemoveMaterial = (itemId: string) => {
    onChange(safeMaterials.filter(m => m.itemId !== itemId));
  };

  return (
    <div className="space-y-4">
      <Label>{t('materialsUsed')} (Optional)</Label>
      
      {/* Add Material */}
      <Card className="p-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Select value={currentItemId} onValueChange={setCurrentItemId}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectMaterial')} />
              </SelectTrigger>
              <SelectContent>
                {availableItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} ({item.quantity} {item.unit} available)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-32">
            <Input
              type="number"
              placeholder={t('quantity')}
              value={currentQuantity}
              onChange={(e) => setCurrentQuantity(e.target.value)}
              step="0.1"
              min="0"
            />
          </div>
          <Button type="button" onClick={handleAddMaterial} size="icon">
            <Plus size={18} />
          </Button>
        </div>
      </Card>

      {/* Selected Materials */}
      {safeMaterials.length > 0 && (
        <div className="space-y-2">
          {safeMaterials.map((material) => (
            <div
              key={material.itemId}
              className="flex items-center justify-between p-3 bg-muted rounded-lg"
            >
              <div>
                <p className="font-medium text-sm">{material.itemName}</p>
                <p className="text-xs text-muted-foreground">
                  {material.quantity} {material.unit}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveMaterial(material.itemId)}
              >
                <Trash size={16} className="text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {availableItems.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          {t('noInventoryAvailable')}
        </p>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Customer, Measurements, Tailor, InventoryItem, MaterialUsed } from '@/lib/types';
import { PhotoUpload } from '@/components/PhotoUpload';
import { MaterialSelector } from '@/components/MaterialSelector';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface OrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (order: {
    customerId: string;
    customerName: string;
    customerPhone: string;
    garmentTypes: string[];
    measurements?: Measurements;
    fabricDetails: string;
    designNotes: string;
    fabricPhotos?: string[];
    designPhotos?: string[];
    assignedTailor: string;
    materialsUsed?: MaterialUsed[];
    deliveryDate: number;
  }) => void;
  customers: Customer[];
  tailors: Tailor[];
  inventory: InventoryItem[];
}

export function OrderForm({
  open,
  onOpenChange,
  onSave,
  customers,
  tailors,
  inventory,
}: OrderFormProps) {
  const { t } = useLanguage();
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [garmentTypes, setGarmentTypes] = useState<string[]>([]);
  const [fabricDetails, setFabricDetails] = useState('');
  const [designNotes, setDesignNotes] = useState('');
  const [fabricPhotos, setFabricPhotos] = useState<string[]>([]);
  const [designPhotos, setDesignPhotos] = useState<string[]>([]);
  const [assignedTailor, setAssignedTailor] = useState('');
  const [materialsUsed, setMaterialsUsed] = useState<MaterialUsed[]>([]);
  const [deliveryDate, setDeliveryDate] = useState(
    format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  );

  const safeCustomers = customers || [];
  const safeTailors = tailors || [];
  const safeInventory = inventory || [];

  const selectedCustomer = safeCustomers.find((c) => c.id === selectedCustomerId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomerId || !assignedTailor) {
      toast.error('Please select customer and tailor');
      return;
    }

    if (garmentTypes.length === 0) {
      toast.error('Please select at least one garment type');
      return;
    }

    const customer = safeCustomers.find((c) => c.id === selectedCustomerId);
    if (!customer) return;

    onSave({
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      garmentTypes,
      measurements: customer.measurements || {},
      fabricDetails: fabricDetails.trim(),
      designNotes: designNotes.trim(),
      fabricPhotos: fabricPhotos.length > 0 ? fabricPhotos : undefined,
      designPhotos: designPhotos.length > 0 ? designPhotos : undefined,
      assignedTailor,
      materialsUsed: materialsUsed.length > 0 ? materialsUsed : undefined,
      deliveryDate: new Date(deliveryDate).getTime(),
    });

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedCustomerId('');
    setGarmentTypes([]);
    setFabricDetails('');
    setDesignNotes('');
    setFabricPhotos([]);
    setDesignPhotos([]);
    setAssignedTailor('');
    setMaterialsUsed([]);
    setDeliveryDate(format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl !h-[100dvh] sm:!h-auto sm:!max-h-[90vh] !top-0 !left-0 !right-0 !bottom-0 !translate-x-0 !translate-y-0 sm:!top-[50%] sm:!left-[50%] sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:!bottom-auto sm:!right-auto flex flex-col rounded-none sm:rounded-lg keyboard-aware-container">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{t('createOrder')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-6 overflow-y-auto pr-2 flex-1 pt-[max(1rem,env(safe-area-inset-top,24px))] pb-[max(4rem,env(safe-area-inset-bottom,60px))]">
            <div className="space-y-2">
              <Label htmlFor="customer">{t('customer')} *</Label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger id="customer">
                  <SelectValue placeholder={t('selectCustomer')} />
                </SelectTrigger>
                <SelectContent>
                  {safeCustomers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} - {customer.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCustomer && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <h4 className="font-semibold text-sm">{t('customerDetails')}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('name')}:</span>{' '}
                    {selectedCustomer.name}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('phone')}:</span>{' '}
                    {selectedCustomer.phone}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('place')}:</span>{' '}
                    {selectedCustomer.place}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('gender')}:</span>{' '}
                    {t(selectedCustomer.gender)}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>{t('garmentType')} *</Label>
              <div className="grid grid-cols-2 gap-3 p-4 bg-muted rounded-lg">
                {['pant', 'shirt', 'coat', 'blazer', 'jocket', 'sudhar', 'kurta'].map((type) => (
                  <label key={type} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={garmentTypes.includes(type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setGarmentTypes([...garmentTypes, type]);
                        } else {
                          setGarmentTypes(garmentTypes.filter((t) => t !== type));
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm capitalize">{t(type)}</span>
                  </label>
                ))}
              </div>
              {garmentTypes.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Selected: {garmentTypes.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <PhotoUpload
                label={t('fabricPhotos')}
                photos={fabricPhotos}
                onPhotosChange={setFabricPhotos}
                maxPhotos={5}
              />
              
              <PhotoUpload
                label={t('designPhotos')}
                photos={designPhotos}
                onPhotosChange={setDesignPhotos}
                maxPhotos={5}
              />

              <MaterialSelector
                inventory={safeInventory}
                selectedMaterials={materialsUsed}
                onChange={setMaterialsUsed}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tailor">{t('assignTailor')} *</Label>
                <Select value={assignedTailor} onValueChange={setAssignedTailor}>
                  <SelectTrigger id="tailor">
                    <SelectValue placeholder={t('assignTailor')} />
                  </SelectTrigger>
                  <SelectContent>
                    {safeTailors.map((tailor) => (
                      <SelectItem key={tailor.id} value={tailor.name}>
                        {tailor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryDate">{t('deliveryDate')} *</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t mt-4 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('cancel')}
            </Button>
            <Button type="submit">{t('save')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

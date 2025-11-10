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
import { Customer, Measurements, Tailor } from '@/lib/types';
import { PhotoUpload } from '@/components/PhotoUpload';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface OrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (order: {
    customerId: string;
    customerName: string;
    customerPhone: string;
    measurements: Measurements;
    fabricDetails: string;
    designNotes: string;
    fabricPhotos?: string[];
    designPhotos?: string[];
    assignedTailor: string;
    deliveryDate: number;
  }) => void;
  customers: Customer[];
  tailors: Tailor[];
}

export function OrderForm({
  open,
  onOpenChange,
  onSave,
  customers,
  tailors,
}: OrderFormProps) {
  const { t } = useLanguage();
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [fabricDetails, setFabricDetails] = useState('');
  const [designNotes, setDesignNotes] = useState('');
  const [fabricPhotos, setFabricPhotos] = useState<string[]>([]);
  const [designPhotos, setDesignPhotos] = useState<string[]>([]);
  const [assignedTailor, setAssignedTailor] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(
    format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  );

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomerId || !assignedTailor) {
      toast.error('Please select customer and tailor');
      return;
    }

    const customer = customers.find((c) => c.id === selectedCustomerId);
    if (!customer) return;

    onSave({
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      measurements: customer.measurements,
      fabricDetails: fabricDetails.trim(),
      designNotes: designNotes.trim(),
      fabricPhotos: fabricPhotos.length > 0 ? fabricPhotos : undefined,
      designPhotos: designPhotos.length > 0 ? designPhotos : undefined,
      assignedTailor,
      deliveryDate: new Date(deliveryDate).getTime(),
    });

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedCustomerId('');
    setFabricDetails('');
    setDesignNotes('');
    setFabricPhotos([]);
    setDesignPhotos([]);
    setAssignedTailor('');
    setDeliveryDate(format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('createOrder')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="customer">{t('customer')} *</Label>
            <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
              <SelectTrigger id="customer">
                <SelectValue placeholder={t('selectCustomer')} />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tailor">{t('assignTailor')} *</Label>
              <Select value={assignedTailor} onValueChange={setAssignedTailor}>
                <SelectTrigger id="tailor">
                  <SelectValue placeholder={t('assignTailor')} />
                </SelectTrigger>
                <SelectContent>
                  {tailors.map((tailor) => (
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

          <div className="flex justify-end gap-3">
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

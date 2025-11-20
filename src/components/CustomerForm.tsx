import { useState, useEffect } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Customer, Gender, Measurements } from '@/lib/types';
import { toast } from 'sonner';
import { MeasurementDiagram } from '@/components/MeasurementDiagram';

interface CustomerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => void;
  customer?: Customer;
}

export function CustomerForm({ open, onOpenChange, onSave, customer }: CustomerFormProps) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [place, setPlace] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [measurements, setMeasurements] = useState<Measurements>({});
  const [activeGarmentTab, setActiveGarmentTab] = useState<keyof Measurements>('pant');

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setPhone(customer.phone);
      setPlace(customer.place);
      setGender(customer.gender);
      setMeasurements(customer.measurements || {});
    } else {
      resetForm();
    }
  }, [customer, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }

    onSave({
      name: name.trim(),
      phone: phone.trim(),
      place: place.trim(),
      gender,
      measurements,
    });

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setPlace('');
    setGender('male');
    setMeasurements({});
  };

  const updateMeasurement = (
    category: keyof Measurements,
    field: string,
    value: string
  ) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    setMeasurements((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: numValue,
      },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {customer ? t('editCustomer') : t('createCustomer')}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-6 overflow-y-auto pr-2 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('name')} *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">{t('phone')} *</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="place">{t('place')}</Label>
              <Input
                id="place"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="e.g., T. Nagar"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="gender">{t('gender')}</Label>
              <Select value={gender} onValueChange={(v) => setGender(v as Gender)}>
                <SelectTrigger id="gender">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t('male')}</SelectItem>
                  <SelectItem value="female">{t('female')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-base font-semibold mb-4 block">
              {t('measurements')}
            </Label>
            <Tabs defaultValue="pant" className="w-full" onValueChange={(v) => setActiveGarmentTab(v as keyof Measurements)}>
              <TabsList className="grid grid-cols-4 lg:grid-cols-7 gap-2 h-auto">
                <TabsTrigger value="pant">{t('pant')}</TabsTrigger>
                <TabsTrigger value="shirt">{t('shirt')}</TabsTrigger>
                <TabsTrigger value="coat">{t('coat')}</TabsTrigger>
                <TabsTrigger value="blazer">{t('blazer')}</TabsTrigger>
                <TabsTrigger value="jocket">{t('jocket')}</TabsTrigger>
                <TabsTrigger value="sudhar">{t('sudhar')}</TabsTrigger>
                <TabsTrigger value="kurta">{t('kurta')}</TabsTrigger>
                <TabsTrigger value="body">{t('bodyMeasurements') || 'Body'}</TabsTrigger>
              </TabsList>

              <TabsContent value="pant" className="mt-6">
                <MeasurementDiagram
                  garmentType="pant"
                  gender={gender}
                  measurements={measurements.pant || {}}
                  onMeasurementChange={(field, value) => updateMeasurement('pant', field, value)}
                />
              </TabsContent>

              <TabsContent value="shirt" className="mt-6">
                <MeasurementDiagram
                  garmentType="shirt"
                  gender={gender}
                  measurements={measurements.shirt || {}}
                  onMeasurementChange={(field, value) => updateMeasurement('shirt', field, value)}
                />
              </TabsContent>

              <TabsContent value="coat" className="mt-6">
                <MeasurementDiagram
                  garmentType="coat"
                  gender={gender}
                  measurements={measurements.coat || {}}
                  onMeasurementChange={(field, value) => updateMeasurement('coat', field, value)}
                />
              </TabsContent>

              <TabsContent value="blazer" className="mt-6">
                <MeasurementDiagram
                  garmentType="blazer"
                  gender={gender}
                  measurements={measurements.blazer || {}}
                  onMeasurementChange={(field, value) => updateMeasurement('blazer', field, value)}
                />
              </TabsContent>

              <TabsContent value="jocket" className="mt-6">
                <MeasurementDiagram
                  garmentType="jocket"
                  gender={gender}
                  measurements={measurements.jocket || {}}
                  onMeasurementChange={(field, value) => updateMeasurement('jocket', field, value)}
                />
              </TabsContent>

              <TabsContent value="sudhar" className="mt-6">
                <MeasurementDiagram
                  garmentType="sudhar"
                  gender={gender}
                  measurements={measurements.sudhar || {}}
                  onMeasurementChange={(field, value) => updateMeasurement('sudhar', field, value)}
                />
              </TabsContent>

              <TabsContent value="kurta" className="mt-6">
                <MeasurementDiagram
                  garmentType="kurta"
                  gender={gender}
                  measurements={measurements.kurta || {}}
                  onMeasurementChange={(field, value) => updateMeasurement('kurta', field, value)}
                />
                                                                                                                                                                                  </TabsContent>
              <TabsContent value="body" className="mt-6">
                <MeasurementDiagram
                  garmentType="body"
                  gender={gender}
                  measurements={measurements.body || {}}
                  onMeasurementChange={(field, value) => updateMeasurement('body', field, value)}
                />
              </TabsContent>
            </Tabs>
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

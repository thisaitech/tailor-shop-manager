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

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setPhone(customer.phone);
      setPlace(customer.place);
      setGender(customer.gender);
      setMeasurements(customer.measurements);
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {customer ? t('editCustomer') : t('createCustomer')}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
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
            <Tabs defaultValue="pant" className="w-full">
              <TabsList className="grid grid-cols-4 lg:grid-cols-7 gap-2 h-auto">
                <TabsTrigger value="pant">{t('pant')}</TabsTrigger>
                <TabsTrigger value="shirt">{t('shirt')}</TabsTrigger>
                <TabsTrigger value="coat">{t('coat')}</TabsTrigger>
                <TabsTrigger value="blazer">{t('blazer')}</TabsTrigger>
                <TabsTrigger value="jocket">{t('jocket')}</TabsTrigger>
                <TabsTrigger value="sudhar">{t('sudhar')}</TabsTrigger>
                <TabsTrigger value="kurta">{t('kurta')}</TabsTrigger>
              </TabsList>

              <TabsContent value="pant" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {['length', 'waist', 'hip', 'thigh', 'bottom'].map((field) => (
                    <div key={field} className="space-y-2">
                      <Label htmlFor={`pant-${field}`}>{t(field)}</Label>
                      <Input
                        id={`pant-${field}`}
                        type="number"
                        step="0.1"
                        value={measurements.pant?.[field as keyof typeof measurements.pant] || ''}
                        onChange={(e) =>
                          updateMeasurement('pant', field, e.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="shirt" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {['length', 'shoulder', 'chest', 'waist', 'sleeve', 'neck'].map(
                    (field) => (
                      <div key={field} className="space-y-2">
                        <Label htmlFor={`shirt-${field}`}>{t(field)}</Label>
                        <Input
                          id={`shirt-${field}`}
                          type="number"
                          step="0.1"
                          value={
                            measurements.shirt?.[field as keyof typeof measurements.shirt] || ''
                          }
                          onChange={(e) =>
                            updateMeasurement('shirt', field, e.target.value)
                          }
                        />
                      </div>
                    )
                  )}
                </div>
              </TabsContent>

              <TabsContent value="coat" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {['length', 'shoulder', 'chest', 'waist', 'sleeve'].map((field) => (
                    <div key={field} className="space-y-2">
                      <Label htmlFor={`coat-${field}`}>{t(field)}</Label>
                      <Input
                        id={`coat-${field}`}
                        type="number"
                        step="0.1"
                        value={measurements.coat?.[field as keyof typeof measurements.coat] || ''}
                        onChange={(e) =>
                          updateMeasurement('coat', field, e.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="blazer" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {['length', 'shoulder', 'chest', 'waist', 'sleeve'].map((field) => (
                    <div key={field} className="space-y-2">
                      <Label htmlFor={`blazer-${field}`}>{t(field)}</Label>
                      <Input
                        id={`blazer-${field}`}
                        type="number"
                        step="0.1"
                        value={
                          measurements.blazer?.[field as keyof typeof measurements.blazer] || ''
                        }
                        onChange={(e) =>
                          updateMeasurement('blazer', field, e.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="jocket" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {['length', 'shoulder', 'chest', 'sleeve'].map((field) => (
                    <div key={field} className="space-y-2">
                      <Label htmlFor={`jocket-${field}`}>{t(field)}</Label>
                      <Input
                        id={`jocket-${field}`}
                        type="number"
                        step="0.1"
                        value={
                          measurements.jocket?.[field as keyof typeof measurements.jocket] || ''
                        }
                        onChange={(e) =>
                          updateMeasurement('jocket', field, e.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="sudhar" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {['length', 'shoulder', 'chest', 'waist', 'hip', 'sleeve'].map(
                    (field) => (
                      <div key={field} className="space-y-2">
                        <Label htmlFor={`sudhar-${field}`}>{t(field)}</Label>
                        <Input
                          id={`sudhar-${field}`}
                          type="number"
                          step="0.1"
                          value={
                            measurements.sudhar?.[field as keyof typeof measurements.sudhar] ||
                            ''
                          }
                          onChange={(e) =>
                            updateMeasurement('sudhar', field, e.target.value)
                          }
                        />
                      </div>
                    )
                  )}
                </div>
              </TabsContent>

              <TabsContent value="kurta" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {['length', 'shoulder', 'chest', 'sleeve'].map((field) => (
                    <div key={field} className="space-y-2">
                      <Label htmlFor={`kurta-${field}`}>{t(field)}</Label>
                      <Input
                        id={`kurta-${field}`}
                        type="number"
                        step="0.1"
                        value={
                          measurements.kurta?.[field as keyof typeof measurements.kurta] || ''
                        }
                        onChange={(e) =>
                          updateMeasurement('kurta', field, e.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
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

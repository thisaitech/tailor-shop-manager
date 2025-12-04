import { Info } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface MeasurementGuideProps {
  garmentType: 'upper' | 'lower';
}

const MEASUREMENT_GUIDES = {
  upper: [
    { key: 'shoulder', description: 'Measure from edge of one shoulder to the other across the back' },
    { key: 'chest', description: 'Measure around the fullest part of the chest, keeping tape parallel to floor' },
    { key: 'waist', description: 'Measure around natural waistline, keeping tape comfortably loose' },
    { key: 'length', description: 'Measure from base of neck to desired length of garment' },
    { key: 'sleeve', description: 'Measure from shoulder edge to wrist with arm slightly bent' },
    { key: 'neck', description: 'Measure around base of neck, adding one finger space for comfort' },
  ],
  lower: [
    { key: 'waist', description: 'Measure around natural waistline where pants will sit' },
    { key: 'hip', description: 'Measure around fullest part of hips, about 8 inches below waist' },
    { key: 'thigh', description: 'Measure around fullest part of thigh' },
    { key: 'length', description: 'Measure from waist to desired length (ankle or floor)' },
    { key: 'bottom', description: 'Measure desired width of trouser opening at ankle' },
  ],
};

export function MeasurementGuide({ garmentType }: MeasurementGuideProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const guides = MEASUREMENT_GUIDES[garmentType];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Info className="h-4 w-4" />
          <span className="sr-only">{t('measurementGuide')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('measurementGuide')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            {t('measurementGuideDescription') || 'Follow these tips for accurate measurements:'}
          </p>
          <div className="space-y-3">
            {guides.map((guide) => (
              <div key={guide.key} className="border-l-2 border-primary pl-3">
                <h4 className="font-medium text-sm">{t(guide.key)}</h4>
                <p className="text-xs text-muted-foreground">{guide.description}</p>
              </div>
            ))}
          </div>
          <div className="bg-muted/50 p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-2">{t('tips') || 'Tips'}</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Use a flexible measuring tape</li>
              <li>• Keep tape snug but not tight</li>
              <li>• Measure over undergarments only</li>
              <li>• Stand naturally with arms relaxed</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


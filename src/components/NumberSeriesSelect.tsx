import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from '@phosphor-icons/react';
import { toast } from 'sonner';
import {
  NumberSeries,
  addNumberSeries,
  getNumberSeries,
  previewNextNumber,
} from '@/lib/firestore/numberSeriesService';

interface NumberSeriesSelectProps {
  companyId: string;
  defaultPrefix: string;
  disabled?: boolean;
  onSeriesChange?: (series: NumberSeries, nextNumber: string) => void;
}

export function NumberSeriesSelect({
  companyId,
  defaultPrefix,
  disabled,
  onSeriesChange,
}: NumberSeriesSelectProps) {
  const [seriesList, setSeriesList] = useState<NumberSeries[]>([]);
  const [selectedPrefix, setSelectedPrefix] = useState(defaultPrefix);
  const [nextNumber, setNextNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newPrefix, setNewPrefix] = useState('');
  const [newName, setNewName] = useState('');
  const [newDigits, setNewDigits] = useState(4);
  const [saving, setSaving] = useState(false);

  const loadSeries = async (prefixToSelect?: string) => {
    if (!companyId) return;
    try {
      setLoading(true);
      const list = await getNumberSeries(companyId);
      setSeriesList(list);
      const prefix = prefixToSelect || selectedPrefix || defaultPrefix;
      const current = list.find((item) => item.prefix === prefix) || list[0];
      if (current) {
        setSelectedPrefix(current.prefix);
        const next = await previewNextNumber(companyId, current);
        setNextNumber(next);
        onSeriesChange?.(current, next);
      }
    } catch (error) {
      console.error('[NumberSeriesSelect] Failed to load series:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      loadSeries(defaultPrefix);
    }
  }, [companyId, defaultPrefix]);

  const handleSelect = async (prefix: string) => {
    const current = seriesList.find((item) => item.prefix === prefix);
    if (!current || !companyId) return;
    setSelectedPrefix(prefix);
    setLoading(true);
    try {
      const next = await previewNextNumber(companyId, current);
      setNextNumber(next);
      onSeriesChange?.(current, next);
    } catch (error) {
      console.error('[NumberSeriesSelect] Failed to preview number:', error);
      toast.error('Failed to load next number');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    try {
      setSaving(true);
      const created = await addNumberSeries(companyId, {
        prefix: newPrefix,
        name: newName,
        digits: newDigits,
      });
      toast.success(`Series ${created.prefix} added`);
      setShowAdd(false);
      setNewPrefix('');
      setNewName('');
      setNewDigits(4);
      await loadSeries(created.prefix);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add series');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Number Series</Label>
      <div className="flex gap-2">
        <Select value={selectedPrefix} onValueChange={handleSelect} disabled={disabled || loading}>
          <SelectTrigger className="h-11 flex-1">
            <SelectValue placeholder="Select series" />
          </SelectTrigger>
          <SelectContent>
            {seriesList.map((item) => (
              <SelectItem key={item.id} value={item.prefix}>
                {item.prefix} — {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          className="h-11 px-3"
          disabled={disabled}
          onClick={() => setShowAdd(true)}
        >
          <Plus size={16} className="mr-1" />
          Add
        </Button>
      </div>
      <div className="space-y-1">
        <Label htmlFor="next-number" className="text-[11px] text-muted-foreground">Next number</Label>
        <Input
          id="next-number"
          value={nextNumber}
          disabled={disabled || loading}
          onChange={(e) => {
            const value = e.target.value.toUpperCase().replace(/\s/g, '');
            setNextNumber(value);
            const current = seriesList.find((item) => item.prefix === selectedPrefix);
            if (current) onSeriesChange?.(current, value);
          }}
          className="h-11 font-mono font-bold text-purple-700 bg-purple-50 border-purple-200"
          placeholder="e.g. SO0001"
        />
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Number Series</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Prefix *</Label>
              <Input
                value={newPrefix}
                onChange={(e) => setNewPrefix(e.target.value.toUpperCase())}
                placeholder="e.g. INV"
                maxLength={6}
              />
            </div>
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Invoice"
              />
            </div>
            <div className="space-y-1">
              <Label>Digits</Label>
              <Input
                type="number"
                min={1}
                max={6}
                value={newDigits}
                onChange={(e) => setNewDigits(Number(e.target.value) || 4)}
              />
            </div>
            <Button type="button" className="w-full" onClick={handleAdd} disabled={saving}>
              {saving ? 'Saving...' : 'Save Series'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

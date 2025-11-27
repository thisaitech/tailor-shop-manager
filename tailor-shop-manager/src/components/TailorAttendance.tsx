import { useAuth } from '@/hooks/use-auth';
import { useStorage } from '@/hooks/use-storage';
import { Tailor, AttendanceRecord, AttendanceStatus } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, CalendarX } from '@phosphor-icons/react';
import { toast } from 'sonner';

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function TailorAttendance() {
  const { user } = useAuth();
  const [tailors] = useStorage<Tailor[]>('tailors', []);
  const [attendance, setAttendance] = useStorage<AttendanceRecord[]>('tailor_attendance', []);

  if (!user || user.role !== 'tailor') return null;

  const tailor = (tailors || []).find(t => t.id === user.tailorId || t.phone === user.phone);
  if (!tailor) return null;

  const today = ymd(new Date());
  const recordToday = (attendance || []).find(r => r.tailorId === tailor.id && r.date === today);

  const mark = (status: AttendanceStatus) => {
    const existingIdx = (attendance || []).findIndex(r => r.tailorId === tailor.id && r.date === today);
    let updated: AttendanceRecord[];
    if (existingIdx >= 0) {
      updated = [...(attendance || [])];
      updated[existingIdx] = { ...updated[existingIdx], status };
    } else {
      const rec: AttendanceRecord = {
        id: `ATT_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        tailorId: tailor.id,
        date: today,
        status,
        createdAt: Date.now(),
      };
      updated = [...(attendance || []), rec];
    }
    setAttendance(updated);
    toast.success(`Marked ${status} for today`);
  };

  const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
  const inMonth = (dateStr: string) => { const d = new Date(dateStr); return d >= start && d <= end; };
  const myMonthRecords = (attendance || []).filter(r => r.tailorId === tailor.id && inMonth(r.date));
  const present = myMonthRecords.filter(r => r.status === 'present').length;
  const leave = myMonthRecords.filter(r => r.status === 'leave').length;
  const absent = myMonthRecords.filter(r => r.status === 'absent').length;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Attendance - {tailor.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Today ({today})</p>
          <div className="flex gap-2">
            <Button variant={recordToday?.status === 'present' ? 'default' : 'outline'} size="sm" onClick={() => mark('present')}>
              <CheckCircle size={16} className="mr-1" /> Present
            </Button>
            <Button variant={recordToday?.status === 'absent' ? 'default' : 'outline'} size="sm" onClick={() => mark('absent')}>
              <XCircle size={16} className="mr-1" /> Absent
            </Button>
            <Button variant={recordToday?.status === 'leave' ? 'default' : 'outline'} size="sm" onClick={() => mark('leave')}>
              <CalendarX size={16} className="mr-1" /> Leave
            </Button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Monthly Summary: Present {present} • Leave {leave} • Absent {absent}
        </div>
        <div className="text-xs text-muted-foreground">
          {tailor.salaryType === 'monthly' ? (
            <span>Monthly Salary: ₹{(tailor.salaryAmount + (tailor.bonus || 0)).toLocaleString()}</span>
          ) : (
            <span>Daily Wage: ₹{tailor.salaryAmount.toLocaleString()} • Earned This Month: ₹{(present * tailor.salaryAmount).toLocaleString()}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

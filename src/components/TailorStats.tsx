import { Card } from '@/components/ui/card';
import { useStorage } from '@/hooks/use-storage';
import { useLanguage } from '@/hooks/use-language';
import { Tailor, AttendanceRecord } from '@/lib/types';
import { Users, UserCheck, CheckCircle, CurrencyDollar } from '@phosphor-icons/react';

function formatYMD(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function firstDayOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function lastDayOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function TailorStats() {
  const { t } = useLanguage();
  const [tailors] = useStorage<Tailor[]>('tailors', []);
  const [attendance] = useStorage<AttendanceRecord[]>('tailor_attendance', []);

  const today = new Date();
  const start = firstDayOfMonth(today);
  const end = lastDayOfMonth(today);

  const totalTailors = (tailors || []).length;
  const activeTailors = (tailors || []).filter(t => t.isActive).length;

  const attendanceByTailor = new Map<string, AttendanceRecord[]>();
  (attendance || []).forEach(rec => {
    const arr = attendanceByTailor.get(rec.tailorId) || [];
    arr.push(rec);
    attendanceByTailor.set(rec.tailorId, arr);
  });

  const isInMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    return d >= start && d <= end;
  };

  const presentTodayCount = (attendance || []).filter(r => r.date === formatYMD(today) && r.status === 'present').length;

  const monthlyPayroll = (tailors || []).reduce((sum, t) => {
    if (t.salaryType === 'monthly') {
      return sum + (t.salaryAmount || 0) + (t.bonus || 0);
    } else {
      const records = attendanceByTailor.get(t.id) || [];
      const presentDays = records.filter(r => r.status === 'present' && isInMonth(r.date)).length;
      return sum + presentDays * (t.salaryAmount || 0);
    }
  }, 0);

  const stats = [
    {
      label: `Total ${t('tailors')}`,
      value: totalTailors,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Active',
      value: activeTailors,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: `${t('present')} ${t('today')}`,
      value: presentTodayCount,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      label: 'This Month Payroll',
      value: `₹${monthlyPayroll.toLocaleString()}`,
      icon: CurrencyDollar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {stats.map((stat, index) => (
        <Card key={index} className="p-3 sm:p-6">
          <div className="flex flex-col items-center justify-center text-center gap-2 sm:gap-3">
            <div className={`${stat.bgColor} ${stat.color} p-2 sm:p-3 rounded-lg flex-shrink-0`}>
              <stat.icon size={20} className="sm:size-7" weight="duotone" />
            </div>
            <div className="w-full min-w-0">
              <p className="text-3xl sm:text-5xl font-bold text-foreground mb-1">
                {stat.value}
              </p>
              <p className="text-[9px] sm:text-xs font-medium text-muted-foreground line-clamp-2 leading-tight px-1">
                {stat.label}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

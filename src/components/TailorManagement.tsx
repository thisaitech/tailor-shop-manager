import { useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useStorage } from '@/hooks/use-storage';
import { useAuth } from '@/hooks/use-auth';
import { Tailor, User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, UserCircle, WhatsappLogo, PencilSimple, Trash, CheckCircle, XCircle, CalendarX } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { sendWhatsAppMessage } from '@/lib/utils';
import { TailorStats } from './TailorStats';
import type { AttendanceRecord, AttendanceStatus } from '@/lib/types';

export function TailorManagement() {
  const { t } = useLanguage();
  const { addUser, getAllUsers, updateUser, deleteUser, user } = useAuth();
  const [tailors, setTailors] = useStorage<Tailor[]>('tailors', []);
  const [attendance, setAttendance] = useStorage<AttendanceRecord[]>('tailor_attendance', []);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTailor, setEditingTailor] = useState<Tailor | null>(null);
  
  const users = getAllUsers();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    specialization: [] as string[],
    salaryType: 'monthly' as 'monthly' | 'daily',
    salaryAmount: '',
    bonus: '',
    isActive: true,
  });

  const garmentTypes = ['Pant', 'Shirt', 'Coat', 'Blazer', 'Jocket', 'Sudhar', 'Kurta'];

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      specialization: [],
      salaryType: 'monthly',
      salaryAmount: '',
      bonus: '',
      isActive: true,
    });
    setEditingTailor(null);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.phone || formData.specialization.length === 0 || !formData.salaryAmount) {
      toast.error('Please fill all required fields');
      return;
    }

    const specializationArray = formData.specialization;
    
    if (editingTailor) {
      const updatedTailor: Tailor = {
        ...editingTailor,
        name: formData.name,
        phone: formData.phone,
        specialization: specializationArray,
        salaryType: formData.salaryType,
        salaryAmount: parseFloat(formData.salaryAmount),
        bonus: formData.bonus ? parseFloat(formData.bonus) : undefined,
        isActive: formData.isActive,
        updatedAt: Date.now(),
      };

      setTailors((tailors || []).map(t => t.id === editingTailor.id ? updatedTailor : t));
      
      // Update the user associated with this tailor
      const tailorUser = users.find(u => u.tailorId === editingTailor.id);
      if (tailorUser) {
        updateUser(tailorUser.id, { 
          name: formData.name, 
          phone: formData.phone, 
          username: formData.phone,
          isActive: formData.isActive 
        });
      }

      toast.success('Tailor updated successfully');
    } else {
      const tailorId = `TAILOR${Date.now()}`;
      const newTailor: Tailor = {
        id: tailorId,
        name: formData.name,
        phone: formData.phone,
        specialization: specializationArray,
        salaryType: formData.salaryType,
        salaryAmount: parseFloat(formData.salaryAmount),
        bonus: formData.bonus ? parseFloat(formData.bonus) : undefined,
        isActive: formData.isActive,
        hasSetupPassword: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const newUser: User = {
        id: `USER${Date.now()}`,
        username: formData.phone,
        password: 'password',
        role: 'tailor',
        name: formData.name,
        phone: formData.phone,
        tailorId: tailorId,
        isActive: formData.isActive,
        hasSetupPassword: false,
        createdAt: Date.now(),
      };

      console.log('Creating new tailor user:', newUser);
      
      addUser(newUser);
      setTailors([...(tailors || []), newTailor]);
      
      toast.success('Tailor profile created successfully');
    }

    setShowAddDialog(false);
    resetForm();
  };

  const handleEdit = (tailor: Tailor) => {
    setEditingTailor(tailor);
    setFormData({
      name: tailor.name,
      phone: tailor.phone,
      specialization: tailor.specialization,
      salaryType: tailor.salaryType,
      salaryAmount: tailor.salaryAmount.toString(),
      bonus: tailor.bonus?.toString() || '',
      isActive: tailor.isActive,
    });
    setShowAddDialog(true);
  };

  const handleDelete = (tailorId: string) => {
    setTailors((tailors || []).filter(t => t.id !== tailorId));
    
    // Delete the user associated with this tailor
    const tailorUser = users.find(u => u.tailorId === tailorId);
    if (tailorUser) {
      deleteUser(tailorUser.id);
    }
    
    toast.success('Tailor deleted successfully');
  };

  const handleSendAppLink = (phone: string, name: string) => {
    const appUrl = window.location.origin;
    const message = `Hello ${name}! Welcome to Thisai Technologies Tailor.\n\nYou can now access the app at: ${appUrl}\n\nLogin with:\nPhone: ${phone}\nPassword: password\n\nPlease change your password after first login.`;
    sendWhatsAppMessage(phone, message);
    toast.success('WhatsApp opened with login details');
  };

  const toggleActiveStatus = (tailor: Tailor) => {
    const updatedTailor = { ...tailor, isActive: !tailor.isActive, updatedAt: Date.now() };
    setTailors((tailors || []).map(t => t.id === tailor.id ? updatedTailor : t));
    
    // Update the user associated with this tailor
    const tailorUser = users.find(u => u.tailorId === tailor.id);
    if (tailorUser) {
      updateUser(tailorUser.id, { isActive: !tailor.isActive });
    }
    
    toast.success(`Tailor ${updatedTailor.isActive ? 'activated' : 'deactivated'}`);
  };

  const ymd = (d: Date) => {
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const markAttendance = (tailorId: string, status: AttendanceStatus) => {
    const today = ymd(new Date());
    const existingIdx = (attendance || []).findIndex(r => r.tailorId === tailorId && r.date === today);
    let updated: AttendanceRecord[];
    if (existingIdx >= 0) {
      updated = [...(attendance || [])];
      updated[existingIdx] = { ...updated[existingIdx], status };
    } else {
      const rec: AttendanceRecord = {
        id: `ATT_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        tailorId,
        date: today,
        status,
        createdAt: Date.now(),
      };
      updated = [...(attendance || []), rec];
    }
    setAttendance(updated);
    toast.success(`Marked ${status} for today`);
  };

  const getMonthlyCounts = (tailorId: string) => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const inMonth = (dateStr: string) => {
      const d = new Date(dateStr);
      return d >= start && d <= end;
    };
    const records = (attendance || []).filter(r => r.tailorId === tailorId && inMonth(r.date));
    const present = records.filter(r => r.status === 'present').length;
    const leave = records.filter(r => r.status === 'leave').length;
    const absent = records.filter(r => r.status === 'absent').length;
    return { present, leave, absent };
  };

  const getTodayStatus = (tailorId: string) => {
    const todayStr = ymd(new Date());
    const rec = (attendance || []).find(r => r.tailorId === tailorId && r.date === todayStr);
    return rec?.status as AttendanceStatus | undefined;
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <TailorStats />

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{t('tailors')}</h2>
          <p className="text-sm text-muted-foreground">Manage tailor profiles, specializations, and salaries</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2" size={20} />
              Add Tailor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTailor ? 'Edit Tailor Profile' : 'Add New Tailor'}</DialogTitle>
              <DialogDescription>
                {editingTailor ? 'Update tailor information and settings' : 'Create a new tailor profile with login credentials'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter tailor name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Specialization *</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border rounded-lg">
                  {garmentTypes.map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`spec-${type}`}
                        checked={formData.specialization.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, specialization: [...formData.specialization, type] });
                          } else {
                            setFormData({ ...formData, specialization: formData.specialization.filter(s => s !== type) });
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <label htmlFor={`spec-${type}`} className="text-sm font-medium cursor-pointer">
                        {type}
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Select one or more garment types</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salary-type">Salary Type *</Label>
                  <Select value={formData.salaryType} onValueChange={(value: 'monthly' | 'daily') => setFormData({ ...formData, salaryType: value })}>
                    <SelectTrigger id="salary-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="daily">Daily Wages</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salary-amount">Salary Amount *</Label>
                  <Input
                    id="salary-amount"
                    type="number"
                    value={formData.salaryAmount}
                    onChange={(e) => setFormData({ ...formData, salaryAmount: e.target.value })}
                    placeholder="Enter amount"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bonus">Bonus (Optional)</Label>
                <Input
                  id="bonus"
                  type="number"
                  value={formData.bonus}
                  onChange={(e) => setFormData({ ...formData, bonus: e.target.value })}
                  placeholder="Enter bonus amount"
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="active">Active Status</Label>
                  <p className="text-xs text-muted-foreground">Tailor can login when active</p>
                </div>
                <Switch
                  id="active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {editingTailor ? 'Update Tailor' : 'Create Tailor'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {(tailors || []).length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <UserCircle size={64} className="text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No tailors yet</p>
              <p className="text-sm text-muted-foreground">Add your first tailor to get started</p>
            </CardContent>
          </Card>
        ) : (
          (tailors || []).map((tailor) => (
            <Card key={tailor.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <CardTitle>{tailor.name}</CardTitle>
                      <Badge variant={tailor.isActive ? 'default' : 'secondary'}>
                        {tailor.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {!tailor.hasSetupPassword && (
                        <Badge variant="outline" className="text-amber-600 border-amber-600">
                          Password Not Setup
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="mt-1">
                      {tailor.phone}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleSendAppLink(tailor.phone, tailor.name)}
                    >
                      <WhatsappLogo size={20} weight="fill" className="text-green-600" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(tailor)}
                    >
                      <PencilSimple size={20} />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(tailor.id)}
                    >
                      <Trash size={20} className="text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Specialization */}
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-muted-foreground">Specialization:</p>
                    <div className="flex flex-wrap gap-1">
                      {(tailor.specialization || []).map((spec, idx) => (
                        <Badge key={idx} variant="secondary">{spec}</Badge>
                      ))}
                    </div>
                  </div>

                  {/* Row 1: Salary Type, Salary, Bonus, Month Payable */}
                  <div className="grid grid-cols-4 gap-3 text-sm text-center">
                    <div>
                      <p className="text-muted-foreground mb-1">Salary Type</p>
                      <p className="font-medium capitalize">{tailor.salaryType}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Salary</p>
                      <p className="font-medium">₹{tailor.salaryAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Bonus</p>
                      <p className="font-medium">₹{(tailor.bonus || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Month Payable</p>
                      {(() => {
                        const c = getMonthlyCounts(tailor.id);
                        const payable = tailor.salaryType === 'monthly'
                          ? (tailor.salaryAmount + (tailor.bonus || 0))
                          : c.present * tailor.salaryAmount;
                        return <p className="font-medium">₹{payable.toLocaleString()}</p>;
                      })()}
                    </div>
                  </div>

                  {/* Row 2: Today status + Attendance buttons */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      {(() => {
                        const st = getTodayStatus(tailor.id);
                        const label = st === 'present' ? t('present') : st === 'absent' ? t('absent') : st === 'leave' ? t('leave') : '—';
                        const cls = st === 'present' ? 'bg-green-100 text-green-800' : st === 'absent' ? 'bg-red-100 text-red-800' : st === 'leave' ? 'bg-amber-100 text-amber-800' : 'bg-muted text-muted-foreground';
                        return (
                          <span className={`inline-block text-xs px-2 py-1 rounded ${cls}`}>
                            {t('today')}: {label}
                          </span>
                        );
                      })()}
                      <p className="text-xs text-muted-foreground">Monthly</p>
                    </div>
                    {user?.role === 'owner' ? (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => markAttendance(tailor.id, 'present')}>
                          <CheckCircle className="mr-1" size={16} /> Present
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => markAttendance(tailor.id, 'absent')}>
                          <XCircle className="mr-1" size={16} /> Absent
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => markAttendance(tailor.id, 'leave')}>
                          <CalendarX className="mr-1" size={16} /> Leave
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Login as owner to mark attendance</span>
                    )}
                  </div>

                  {/* Row 3: Monthly counts aligned under buttons */}
                  <div className="flex justify-end gap-2">
                    {(() => {
                      const c = getMonthlyCounts(tailor.id);
                      return (
                        <>
                          <div className="text-center" style={{ width: '94px' }}>
                            <p className="font-bold text-lg text-green-600">{c.present}</p>
                          </div>
                          <div className="text-center" style={{ width: '94px' }}>
                            <p className="font-bold text-lg text-red-600">{c.absent}</p>
                          </div>
                          <div className="text-center" style={{ width: '94px' }}>
                            <p className="font-bold text-lg text-amber-600">{c.leave}</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Created: {new Date(tailor.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`toggle-${tailor.id}`} className="text-sm">
                      {tailor.isActive ? 'Deactivate' : 'Activate'}
                    </Label>
                    <Switch
                      id={`toggle-${tailor.id}`}
                      checked={tailor.isActive}
                      onCheckedChange={() => toggleActiveStatus(tailor)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

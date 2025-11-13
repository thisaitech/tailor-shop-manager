import { useState } from 'react';
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
import { Plus, UserCircle, WhatsappLogo, PencilSimple, Trash } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { sendWhatsAppMessage } from '@/lib/utils';

export function TailorManagement() {
  const { addUser, getAllUsers, updateUser, deleteUser } = useAuth();
  const [tailors, setTailors] = useStorage<Tailor[]>('tailors', []);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTailor, setEditingTailor] = useState<Tailor | null>(null);
  
  const users = getAllUsers();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    specialization: '',
    salaryType: 'monthly' as 'monthly' | 'daily',
    salaryAmount: '',
    bonus: '',
    isActive: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      specialization: '',
      salaryType: 'monthly',
      salaryAmount: '',
      bonus: '',
      isActive: true,
    });
    setEditingTailor(null);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.phone || !formData.specialization || !formData.salaryAmount) {
      toast.error('Please fill all required fields');
      return;
    }

    const specializationArray = formData.specialization.split(',').map(s => s.trim()).filter(s => s);
    
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
      specialization: tailor.specialization.join(', '),
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Tailor Management</h2>
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
                <Label htmlFor="specialization">Specialization *</Label>
                <Input
                  id="specialization"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  placeholder="e.g., Shirts, Pants, Suits (comma separated)"
                />
                <p className="text-xs text-muted-foreground">Enter specializations separated by commas</p>
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
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Specialization</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(tailor.specialization || []).map((spec, idx) => (
                          <Badge key={idx} variant="secondary">{spec}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Salary Type</p>
                      <p className="text-base font-medium capitalize">{tailor.salaryType}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Salary Amount</p>
                      <p className="text-base font-medium">₹{tailor.salaryAmount.toLocaleString()}</p>
                    </div>
                    {tailor.bonus && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Bonus</p>
                        <p className="text-base font-medium">₹{tailor.bonus.toLocaleString()}</p>
                      </div>
                    )}
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

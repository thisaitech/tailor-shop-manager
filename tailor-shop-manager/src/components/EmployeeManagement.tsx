import { useState } from 'react';
import { useStorage } from '@/hooks/use-storage';
import { Employee, EmployeeRole } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Plus, PencilSimple, Trash, CheckSquare } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface EmployeeManagementProps {
  onBack: () => void;
}

export function EmployeeManagement({ onBack }: EmployeeManagementProps) {
  const [employees, setEmployees] = useStorage<Employee[]>('employees', []);
  const [showDialog, setShowDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<Partial<Employee>>({
    name: '',
    email: '',
    contactNumber: '',
    role: 'staff',
    designation: '',
    joiningDate: Date.now(),
    accessPermissions: [],
    isActive: true,
  });

  const availablePermissions = [
    'view_orders',
    'create_orders',
    'edit_orders',
    'delete_orders',
    'manage_inventory',
    'view_reports',
    'manage_customers',
    'manage_tailors',
    'manage_payments',
  ];

  const handleOpenDialog = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData(employee);
    } else {
      setEditingEmployee(null);
      setFormData({
        name: '',
        email: '',
        contactNumber: '',
        role: 'staff',
        designation: '',
        joiningDate: Date.now(),
        accessPermissions: [],
        isActive: true,
      });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingEmployee(null);
  };

  const handleChange = (field: keyof Employee, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const togglePermission = (permission: string) => {
    const currentPermissions = formData.accessPermissions || [];
    const newPermissions = currentPermissions.includes(permission)
      ? currentPermissions.filter(p => p !== permission)
      : [...currentPermissions, permission];
    handleChange('accessPermissions', newPermissions);
  };

  const handleSave = () => {
    // Validation
    if (!formData.name) {
      toast.error('Employee name is required');
      return;
    }

    if (!formData.contactNumber) {
      toast.error('Contact number is required');
      return;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (editingEmployee) {
      // Update existing employee
      const updatedEmployees = employees.map(emp =>
        emp.id === editingEmployee.id
          ? {
              ...emp,
              ...formData,
              updatedAt: Date.now(),
            }
          : emp
      );
      setEmployees(updatedEmployees);
      toast.success('Employee updated successfully!');
    } else {
      // Add new employee
      const newEmployee: Employee = {
        id: `EMP${Date.now()}`,
        name: formData.name!,
        email: formData.email,
        contactNumber: formData.contactNumber!,
        role: formData.role as EmployeeRole,
        designation: formData.designation,
        joiningDate: formData.joiningDate || Date.now(),
        accessPermissions: formData.accessPermissions || [],
        isActive: formData.isActive ?? true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setEmployees([...employees, newEmployee]);
      toast.success('Employee added successfully!');
    }

    handleCloseDialog();
  };

  const handleDelete = (employeeId: string) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      setEmployees(employees.filter(emp => emp.id !== employeeId));
      toast.success('Employee deleted successfully!');
    }
  };

  const toggleActiveStatus = (employee: Employee) => {
    const updatedEmployees = employees.map(emp =>
      emp.id === employee.id
        ? { ...emp, isActive: !emp.isActive, updatedAt: Date.now() }
        : emp
    );
    setEmployees(updatedEmployees);
    toast.success(`Employee ${employee.isActive ? 'deactivated' : 'activated'} successfully!`);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft size={20} />
          Back
        </Button>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus size={20} />
          Add Employee
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee Management</CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No employees added yet.</p>
              <p className="text-sm mt-2">Click "Add Employee" to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {employees.map(employee => (
                <Card key={employee.id} className={!employee.isActive ? 'opacity-60' : ''}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{employee.name}</h3>
                          {!employee.isActive && (
                            <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">ID:</span> {employee.id}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Role:</span>{' '}
                            {employee.role.charAt(0).toUpperCase() + employee.role.slice(1)}
                          </div>
                          {employee.designation && (
                            <div>
                              <span className="text-muted-foreground">Designation:</span> {employee.designation}
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground">Contact:</span> {employee.contactNumber}
                          </div>
                          {employee.email && (
                            <div>
                              <span className="text-muted-foreground">Email:</span> {employee.email}
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground">Joined:</span>{' '}
                            {format(employee.joiningDate, 'dd MMM yyyy')}
                          </div>
                        </div>
                        {employee.accessPermissions.length > 0 && (
                          <div className="mt-2">
                            <span className="text-xs text-muted-foreground">Permissions:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {employee.accessPermissions.map(permission => (
                                <span
                                  key={permission}
                                  className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded"
                                >
                                  {permission.replace(/_/g, ' ')}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleActiveStatus(employee)}
                          title={employee.isActive ? 'Deactivate' : 'Activate'}
                        >
                          <CheckSquare size={16} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(employee)}
                        >
                          <PencilSimple size={16} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(employee.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash size={16} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Employee Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
            <DialogDescription>
              {editingEmployee
                ? 'Update employee information and permissions'
                : 'Enter employee details and assign permissions'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="empName">Employee Name *</Label>
                <Input
                  id="empName"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Enter employee name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="empEmail">Email</Label>
                <Input
                  id="empEmail"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="employee@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="empContact">Contact Number *</Label>
                <Input
                  id="empContact"
                  value={formData.contactNumber}
                  onChange={(e) => handleChange('contactNumber', e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter contact number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="empRole">Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => handleChange('role', value)}
                >
                  <SelectTrigger id="empRole">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="accountant">Accountant</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="empDesignation">Designation</Label>
                <Input
                  id="empDesignation"
                  value={formData.designation}
                  onChange={(e) => handleChange('designation', e.target.value)}
                  placeholder="Enter designation"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="empJoiningDate">Joining Date *</Label>
                <Input
                  id="empJoiningDate"
                  type="date"
                  value={format(formData.joiningDate || Date.now(), 'yyyy-MM-dd')}
                  onChange={(e) => handleChange('joiningDate', new Date(e.target.value).getTime())}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Access Permissions</Label>
              <div className="grid grid-cols-2 gap-2 p-4 border rounded-lg">
                {availablePermissions.map(permission => (
                  <div key={permission} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={permission}
                      checked={(formData.accessPermissions || []).includes(permission)}
                      onChange={() => togglePermission(permission)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <label htmlFor={permission} className="text-sm cursor-pointer">
                      {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive ?? true}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingEmployee ? 'Update' : 'Add'} Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

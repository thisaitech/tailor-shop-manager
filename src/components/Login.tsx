import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useStorage } from '@/hooks/use-storage';
import { User, Customer } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Scissors, Info, UserPlus } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { DebugPanel } from './DebugPanel';
import { ChangePasswordDialog } from './ChangePasswordDialog';

export function Login() {
  const { login, updatePassword, addUser, resetUsers, getAllUsers, employee } = useAuth();
  const [customers, setCustomers] = useStorage<Customer[]>('customers', []);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [showEmployeePasswordSetup, setShowEmployeePasswordSetup] = useState(false);
  const [showCustomerRegistration, setShowCustomerRegistration] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tempEmployee, setTempEmployee] = useState<any>(null); // Temporary employee storage for first login

  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    place: '',
    gender: 'male' as 'male' | 'female',
    password: '',
    confirmPassword: '',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error('Please enter phone number and password');
      return;
    }

    setIsLoading(true);
    const result = await login(username, password);
    setIsLoading(false);

    console.log('[Login] Login result:', result);

    if (result.success) {
      console.log('[Login] Login successful');
      if (result.needsPasswordSetup) {
        console.log('[Login] Password setup needed. isEmployee:', result.isEmployee);
        if (result.isEmployee) {
          console.log('[Login] ✅ Setting showEmployeePasswordSetup to TRUE');
          console.log('[Login] Employee data from login:', result.employeeData);
          setTempEmployee(result.employeeData); // Store employee data temporarily
          setShowEmployeePasswordSetup(true);
        } else {
          console.log('[Login] Setting showPasswordSetup to TRUE (non-employee)');
          setShowPasswordSetup(true);
        }
      } else {
        console.log('[Login] No password setup needed - showing success toast');
        toast.success('Login successful');
      }
    } else {
      console.log('[Login] Login failed:', result.message);
      toast.error(result.message || 'Login failed');
    }
  };

  const handleResetData = () => {
    const defaultUser: User = {
      id: 'USER1',
      username: '9486229273',
      password: 'password',
      role: 'owner',
      name: 'Thisai Technologies Tailor',
      phone: '9486229273',
      isActive: true,
      hasSetupPassword: true,
      createdAt: Date.now(),
    };

    resetUsers([defaultUser]);
    toast.success('Database reset! Use phone: 9486229273, password: password');
  };

  const handleAddTestTailor = () => {
    const testTailor: User = {
      id: 'USER_TEST',
      username: '1234567890',
      password: 'password',
      role: 'tailor',
      name: 'Test Tailor',
      phone: '1234567890',
      isActive: true,
      hasSetupPassword: false,
      createdAt: Date.now(),
    };
    
    addUser(testTailor);
    toast.success('Test tailor added! Login: 1234567890 / password');
  };

  const handlePasswordSetup = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    await updatePassword(newPassword);
    setShowPasswordSetup(false);
    setNewPassword('');
    setConfirmPassword('');
    toast.success('Password setup complete! You can now use your new password.');
  };

  const handleCustomerRegistration = () => {
    if (!customerForm.name || !customerForm.phone || !customerForm.place || !customerForm.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (customerForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (customerForm.password !== customerForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    const existingUser = (getAllUsers() || []).find(u => u.username === customerForm.phone);
    if (existingUser) {
      toast.error('A user with this phone number already exists');
      return;
    }

    const customerId = `CUS${Date.now()}`;
    
    const newCustomer: Customer = {
      id: customerId,
      name: customerForm.name,
      phone: customerForm.phone,
      place: customerForm.place,
      gender: customerForm.gender,
      measurements: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const newUser: User = {
      id: `USER${Date.now()}`,
      username: customerForm.phone,
      password: customerForm.password,
      role: 'customer',
      name: customerForm.name,
      phone: customerForm.phone,
      customerId: customerId,
      isActive: true,
      hasSetupPassword: true,
      createdAt: Date.now(),
    };

    setCustomers([...(customers || []), newCustomer]);
    addUser(newUser);
    
    setShowCustomerRegistration(false);
    setCustomerForm({
      name: '',
      phone: '',
      place: '',
      gender: 'male',
      password: '',
      confirmPassword: '',
    });
    
    toast.success('Registration successful! You can now login.');
  };

  return (
    <>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto bg-primary p-4 rounded-xl w-fit">
              <Scissors size={48} className="text-primary-foreground" weight="duotone" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold">Thisai Technologies Tailor</CardTitle>
              <CardDescription className="text-base mt-2">Management System</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Phone Number</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your phone number"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
            
            <div className="mt-4">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowCustomerRegistration(true)}
              >
                <UserPlus className="mr-2" size={20} />
                New Customer? Register Here
              </Button>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
              <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Password Recovery</p>
                <p className="text-xs text-blue-700">For password reset, please contact your administrator via WhatsApp. WhatsApp is a free messaging service that works best for account recovery.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showPasswordSetup} onOpenChange={setShowPasswordSetup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Setup Your Password</DialogTitle>
            <DialogDescription>
              This is your first login. Please set up a new secure password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handlePasswordSetup} className="w-full">
              Setup Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCustomerRegistration} onOpenChange={setShowCustomerRegistration}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Customer Registration</DialogTitle>
            <DialogDescription>
              Create your account to track your orders and measurements
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customer-name">Full Name *</Label>
              <Input
                id="customer-name"
                placeholder="Enter your name"
                value={customerForm.name}
                onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-phone">Phone Number *</Label>
              <Input
                id="customer-phone"
                placeholder="Enter your phone number"
                value={customerForm.phone}
                onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-place">Place/City *</Label>
              <Input
                id="customer-place"
                placeholder="Enter your city"
                value={customerForm.place}
                onChange={(e) => setCustomerForm({ ...customerForm, place: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-gender">Gender *</Label>
              <Select value={customerForm.gender} onValueChange={(value: 'male' | 'female') => setCustomerForm({ ...customerForm, gender: value })}>
                <SelectTrigger id="customer-gender">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-password">Password *</Label>
              <Input
                id="customer-password"
                type="password"
                placeholder="Enter password (min 6 characters)"
                value={customerForm.password}
                onChange={(e) => setCustomerForm({ ...customerForm, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-confirm-password">Confirm Password *</Label>
              <Input
                id="customer-confirm-password"
                type="password"
                placeholder="Confirm password"
                value={customerForm.confirmPassword}
                onChange={(e) => setCustomerForm({ ...customerForm, confirmPassword: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomerRegistration(false)}>
              Cancel
            </Button>
            <Button onClick={handleCustomerRegistration}>
              Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Employee First Login Password Change */}
      {(() => {
        console.log('[Login] Modal render check - showEmployeePasswordSetup:', showEmployeePasswordSetup);
        console.log('[Login] Modal render check - tempEmployee:', tempEmployee);
        if (showEmployeePasswordSetup && tempEmployee) {
          console.log('[Login] ✅ RENDERING ChangePasswordDialog');
          return (
            <ChangePasswordDialog
              employeeId={tempEmployee.id}
              employeeName={tempEmployee.name}
              onSuccess={() => {
                console.log('[Login] Password change successful - redirecting to dashboard');
                setShowEmployeePasswordSetup(false);
                setTempEmployee(null); // Clear temp storage
                toast.success('Password changed successfully! Redirecting...');
                // Reload the page to trigger login with new password
                window.location.reload();
              }}
            />
          );
        }
        console.log('[Login] ❌ NOT rendering ChangePasswordDialog');
        return null;
      })()}

      {/* Debug Panel - Remove before production */}
      <DebugPanel />
    </>
  );
}

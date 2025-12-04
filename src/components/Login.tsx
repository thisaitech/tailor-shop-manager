import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useStorage } from '@/hooks/use-storage';
import { User, Customer, Vendor } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Scissors, Info, UserPlus, Eye, EyeSlash } from '@phosphor-icons/react';
import { toast } from 'sonner';
// DebugPanel removed for production
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { VendorChangePasswordDialog } from './VendorChangePasswordDialog';
import { decryptPassword } from '@/lib/firestore/vendorService';
import { InlineLoader } from './Loader';
import { addCustomer as addCustomerToFirestore } from '@/lib/firestore/customerService';
import { getCompanyProfile } from '@/lib/firestore/companyService';

export function Login() {
  const { login, updatePassword, addUser, resetUsers, getAllUsers, employee, vendor, setEmployeeAfterPasswordChange, setVendorAfterPasswordChange } = useAuth();
  const [customers, setCustomers] = useStorage<Customer[]>('customers', []);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [showEmployeePasswordSetup, setShowEmployeePasswordSetup] = useState(false);
  const [showVendorPasswordSetup, setShowVendorPasswordSetup] = useState(false);
  const [showCustomerRegistration, setShowCustomerRegistration] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tempEmployee, setTempEmployee] = useState<any>(null); // Temporary employee storage for first login
  const [tempVendor, setTempVendor] = useState<Vendor | null>(null); // Temporary vendor storage for first login

  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    place: '',
    gender: 'male' as 'male' | 'female',
    password: '',
    confirmPassword: '',
  });
  const [showPasswordPreview, setShowPasswordPreview] = useState(false);
  const [showCustomerPassword, setShowCustomerPassword] = useState(false);
  const [showCustomerConfirmPassword, setShowCustomerConfirmPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Trim inputs to remove accidental whitespace
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      toast.error('Please enter phone number and password');
      return;
    }

    setIsLoading(true);
    const result = await login(trimmedUsername, trimmedPassword);
    setIsLoading(false);

    console.log('[Login] Login result:', result);

    if (result.success) {
      console.log('[Login] Login successful');
      if (result.needsPasswordSetup) {
        console.log('[Login] Password setup needed. isEmployee:', result.isEmployee, 'isVendor:', result.isVendor);
        if (result.isEmployee) {
          console.log('[Login] ✅ Setting showEmployeePasswordSetup to TRUE');
          console.log('[Login] Employee data from login:', result.employeeData);
          setTempEmployee(result.employeeData); // Store employee data temporarily
          setShowEmployeePasswordSetup(true);
        } else if (result.isVendor) {
          console.log('[Login] ✅ Setting showVendorPasswordSetup to TRUE');
          console.log('[Login] Vendor data from login:', result.vendorData);
          setTempVendor(result.vendorData || null); // Store vendor data temporarily
          setShowVendorPasswordSetup(true);
        } else {
          console.log('[Login] Setting showPasswordSetup to TRUE (non-employee/non-vendor)');
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

  const handleCustomerRegistration = async () => {
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

    try {
      console.log('[Login] Creating new customer registration...');
      
      const customerId = `CUS${Date.now()}`;
      
      const newCustomer: Customer = {
        id: customerId,
        name: customerForm.name,
        phone: customerForm.phone,
        email: '',
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

      // Save to localStorage for immediate login
      setCustomers([...(customers || []), newCustomer]);
      addUser(newUser);
      
      console.log('[Login] ✅ Customer registered in localStorage');
      console.log('[Login] Customer ID:', customerId);
      console.log('[Login] Phone:', customerForm.phone);
      console.log('[Login] Can now login with phone:', customerForm.phone);
      
      setShowCustomerRegistration(false);
      setCustomerForm({
        name: '',
        phone: '',
        place: '',
        gender: 'male',
        password: '',
        confirmPassword: '',
      });
      
      // Reset password preview states
      setShowCustomerPassword(false);
      setShowCustomerConfirmPassword(false);
      
      toast.success('Registration successful! You can now login.');
    } catch (error) {
      console.error('[Login] ❌ Error during customer registration:', error);
      toast.error('Registration failed. Please try again.');
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 50%, #e0e7ff 100%)' }}>
        <div className="w-full max-w-md animate-on-load animate-scale-in rounded-xl border shadow-xl py-6" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(250,248,255,0.95) 100%)', borderColor: 'rgba(196, 181, 253, 0.4)' }}>
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto p-4 rounded-xl w-fit animate-on-load animate-fade-slide-up stagger-1 shadow-lg" style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #6366f1 100%)' }}>
              <Scissors size={48} className="text-white" weight="duotone" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold text-gray-900">Thisai Technologies Tailor</CardTitle>
              <CardDescription className="text-base mt-2 text-gray-600">Management System</CardDescription>
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
                <div className="relative">
                  <Input
                    id="password"
                    type={showPasswordPreview ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordPreview(!showPasswordPreview)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                    tabIndex={-1}
                  >
                    {showPasswordPreview ? (
                      <EyeSlash size={20} weight="bold" />
                    ) : (
                      <Eye size={20} weight="bold" />
                    )}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <InlineLoader />
                    Logging in...
                  </span>
                ) : (
                  'Login'
                )}
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

            <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg flex gap-3">
              <Info size={20} className="text-purple-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-purple-900">
                <p className="font-medium mb-1">Password Recovery</p>
                <p className="text-xs text-purple-700">For password reset, please contact your administrator via WhatsApp. WhatsApp is a free messaging service that works best for account recovery.</p>
              </div>
            </div>
          </CardContent>
        </div>
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

      <Dialog open={showCustomerRegistration} onOpenChange={(open) => {
        setShowCustomerRegistration(open);
        if (!open) {
          // Reset password preview states when dialog closes
          setShowCustomerPassword(false);
          setShowCustomerConfirmPassword(false);
        }
      }}>
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
              <div className="relative">
                <Input
                  id="customer-password"
                  type={showCustomerPassword ? 'text' : 'password'}
                  placeholder="Enter password (min 6 characters)"
                  value={customerForm.password}
                  onChange={(e) => setCustomerForm({ ...customerForm, password: e.target.value })}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCustomerPassword(!showCustomerPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  tabIndex={-1}
                >
                  {showCustomerPassword ? (
                    <EyeSlash size={20} weight="bold" />
                  ) : (
                    <Eye size={20} weight="bold" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-confirm-password">Confirm Password *</Label>
              <div className="relative">
                <Input
                  id="customer-confirm-password"
                  type={showCustomerConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={customerForm.confirmPassword}
                  onChange={(e) => setCustomerForm({ ...customerForm, confirmPassword: e.target.value })}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCustomerConfirmPassword(!showCustomerConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  tabIndex={-1}
                >
                  {showCustomerConfirmPassword ? (
                    <EyeSlash size={20} weight="bold" />
                  ) : (
                    <Eye size={20} weight="bold" />
                  )}
                </button>
              </div>
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
              currentPassword={tempEmployee.password}
              onSuccess={() => {
                console.log('[Login] Password change successful - redirecting to dashboard');
                setShowEmployeePasswordSetup(false);
                // Set the employee in auth context to redirect to dashboard
                setEmployeeAfterPasswordChange({ ...tempEmployee, firstLogin: false });
                setTempEmployee(null); // Clear temp storage
                toast.success('Password changed successfully! Welcome to your dashboard.');
              }}
            />
          );
        }
        console.log('[Login] ❌ NOT rendering ChangePasswordDialog');
        return null;
      })()}

      {/* Vendor First Login Password Change */}
      {(() => {
        console.log('[Login] Modal render check - showVendorPasswordSetup:', showVendorPasswordSetup);
        console.log('[Login] Modal render check - tempVendor:', tempVendor);
        if (showVendorPasswordSetup && tempVendor) {
          console.log('[Login] ✅ RENDERING VendorChangePasswordDialog');
          const currentPassword = decryptPassword(tempVendor.password) || '';
          return (
            <VendorChangePasswordDialog
              vendorId={tempVendor.tailorCode}
              vendorName={tempVendor.tailorName}
              currentPassword={currentPassword}
              onSuccess={() => {
                console.log('[Login] Vendor password change successful - redirecting to dashboard');
                setShowVendorPasswordSetup(false);
                // Set the vendor in auth context to redirect to dashboard
                setVendorAfterPasswordChange({ ...tempVendor, isFirstLogin: false });
                setTempVendor(null); // Clear temp storage
                toast.success('Password changed successfully! Welcome to your dashboard.');
              }}
            />
          );
        }
        console.log('[Login] ❌ NOT rendering VendorChangePasswordDialog');
        return null;
      })()}

      {/* Debug Panel removed for production - can be re-enabled in development if needed */}
      {process.env.NODE_ENV === 'development' && false && (
        <div>
          {/* <DebugPanel /> */}
        </div>
      )}
    </>
  );
}

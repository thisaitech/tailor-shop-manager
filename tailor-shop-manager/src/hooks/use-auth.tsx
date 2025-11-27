import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useStorage } from './use-storage';
import { User, UserRole, Vendor } from '@/lib/types';
import { verifyEmployeeCredentials } from '@/lib/firestore/employeeService';
import { authenticateVendor } from '@/lib/firestore/vendorService';
import type { EmployeeWithCompany } from '@/lib/firestore/employeeService';

interface AuthContextType {
  user: User | null;
  employee: EmployeeWithCompany | null;
  vendor: Vendor | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; needsPasswordSetup?: boolean; isEmployee?: boolean; isVendor?: boolean; employeeData?: EmployeeWithCompany; vendorData?: Vendor; message?: string }>;
  logout: () => void;
  updatePassword: (newPassword: string) => Promise<void>;
  addUser: (user: User) => void;
  resetUsers: (users: User[]) => void;
  getAllUsers: () => User[];
  updateUser: (userId: string, updatedData: Partial<User>) => void;
  deleteUser: (userId: string) => void;
  setEmployeeAfterPasswordChange: (employee: EmployeeWithCompany) => void;
  setVendorAfterPasswordChange: (vendor: Vendor) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useStorage<User[]>('auth_users', []);
  const [currentUser, setCurrentUser] = useStorage<User | null>('current_user', null);
  const [currentEmployee, setCurrentEmployee] = useStorage<EmployeeWithCompany | null>('current_employee', null);
  const [currentVendor, setCurrentVendor] = useStorage<Vendor | null>('current_vendor', null);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate initial loading state for app initialization
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000); // Show loader for 1 second on app load
    return () => clearTimeout(timer);
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; needsPasswordSetup?: boolean; isEmployee?: boolean; isVendor?: boolean; employeeData?: EmployeeWithCompany; vendorData?: Vendor; message?: string }> => {
    // Trim whitespace from credentials to avoid false "invalid credentials" errors
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    console.log('=== LOGIN ATTEMPT ===');
    console.log('Username:', trimmedUsername);
    console.log('Password:', trimmedPassword);

    // First, check if this is an employee login (Firestore)
    console.log('Checking Firestore for employee credentials...');
    const employee = await verifyEmployeeCredentials(trimmedUsername, trimmedPassword);

    if (employee) {
      console.log('[Auth] Found employee:', employee);
      console.log('[Auth] Employee firstLogin status:', employee.firstLogin);
      console.log('[Auth] Employee isActive status:', employee.isActive);

      if (!employee.isActive) {
        console.log('[Auth] Employee account is not active');
        return { success: false, message: 'Your account is not active. Please contact the administrator.' };
      }

      if (employee.firstLogin) {
        console.log('[Auth] ✅ FIRST LOGIN DETECTED - NOT setting employee in storage yet');
        console.log('[Auth] Will set employee after password change');
        // DON'T set employee in storage yet - wait for password change
        // This prevents premature redirect to dashboard
        // Return employee data so Login component can show the modal
        return { success: true, needsPasswordSetup: true, isEmployee: true, employeeData: employee };
      }

      console.log('[Auth] Setting current employee in storage');
      setCurrentEmployee(employee);
      setCurrentUser(null); // Clear any existing user session
      setCurrentVendor(null); // Clear any existing vendor session

      console.log('[Auth] Not first login - proceeding to dashboard');
      return { success: true, isEmployee: true };
    }

    // Second, check if this is a vendor/job work tailor login (Firestore)
    console.log('Checking Firestore for vendor credentials...');
    const vendor = await authenticateVendor(trimmedUsername, trimmedPassword);

    if (vendor) {
      console.log('[Auth] Found vendor:', vendor);
      console.log('[Auth] Vendor isFirstLogin status:', vendor.isFirstLogin);

      if (vendor.isFirstLogin) {
        console.log('[Auth] ✅ FIRST LOGIN DETECTED FOR VENDOR - NOT setting vendor in storage yet');
        console.log('[Auth] Will set vendor after password change');
        // DON'T set vendor in storage yet - wait for password change
        return { success: true, needsPasswordSetup: true, isVendor: true, vendorData: vendor };
      }

      console.log('[Auth] Setting current vendor in storage');
      setCurrentVendor(vendor);
      setCurrentUser(null); // Clear any existing user session
      setCurrentEmployee(null); // Clear any existing employee session

      console.log('[Auth] Not first login - proceeding to vendor dashboard');
      return { success: true, isVendor: true };
    }

    // If not an employee, check localStorage users (owner, tailor, customer)
    console.log('Total users in storage:', (users || []).length);
    console.log('All users:', (users || []).map(u => ({
      id: u.id,
      username: u.username,
      password: u.password,
      role: u.role,
      name: u.name
    })));

    const user = (users || []).find(u => {
      console.log(`Checking user ${u.username}: username match=${u.username === trimmedUsername}, password match=${u.password === trimmedPassword}`);
      return u.username === trimmedUsername && u.password === trimmedPassword;
    });

    console.log('Found user:', user);

    if (!user) {
      return { success: false, message: 'Invalid username or password' };
    }

    if (user.role !== 'customer' && !user.isActive) {
      return { success: false, message: 'Your account is not active. Please contact the administrator.' };
    }

    setCurrentUser(user);
    setCurrentEmployee(null); // Clear any existing employee session

    if (!user.hasSetupPassword) {
      return { success: true, needsPasswordSetup: true, isEmployee: false };
    }

    return { success: true, isEmployee: false };
  };

  const updatePassword = async (newPassword: string) => {
    if (!currentUser) return;
    
    const updatedUser = {
      ...currentUser,
      password: newPassword,
      hasSetupPassword: true,
    };
    
    const updatedUsers = (users || []).map(u => u.id === currentUser.id ? updatedUser : u);
    setUsers(updatedUsers);
    setCurrentUser(updatedUser);
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentEmployee(null);
    setCurrentVendor(null);
  };

  const addUser = (user: User) => {
    console.log('[AuthContext] Adding user:', user);
    const updatedUsers = [...(users || []), user];
    setUsers(updatedUsers);
    console.log('[AuthContext] Users after add:', updatedUsers);
  };

  const resetUsers = (newUsers: User[]) => {
    console.log('[AuthContext] Resetting users to:', newUsers);
    setUsers(newUsers);
  };

  const getAllUsers = () => {
    return users || [];
  };

  const updateUser = (userId: string, updatedData: Partial<User>) => {
    console.log('[AuthContext] Updating user:', userId, updatedData);
    const updatedUsers = (users || []).map(u => 
      u.id === userId ? { ...u, ...updatedData } : u
    );
    setUsers(updatedUsers);
    console.log('[AuthContext] Users after update:', updatedUsers);
  };

  const deleteUser = (userId: string) => {
    console.log('[AuthContext] Deleting user:', userId);
    const updatedUsers = (users || []).filter(u => u.id !== userId);
    setUsers(updatedUsers);
    console.log('[AuthContext] Users after delete:', updatedUsers);
  };

  // Set employee directly after first login password change (for auto-login)
  const setEmployeeAfterPasswordChange = (employee: EmployeeWithCompany) => {
    console.log('[AuthContext] Setting employee after password change:', employee.name);
    // Update the employee with firstLogin = false since password was just changed
    const updatedEmployee = { ...employee, firstLogin: false };
    setCurrentEmployee(updatedEmployee);
    setCurrentUser(null);
    setCurrentVendor(null);
  };

  // Set vendor directly after first login password change (for auto-login)
  const setVendorAfterPasswordChange = (vendor: Vendor) => {
    console.log('[AuthContext] Setting vendor after password change:', vendor.tailorName);
    // Update the vendor with isFirstLogin = false since password was just changed
    const updatedVendor = { ...vendor, isFirstLogin: false };
    setCurrentVendor(updatedVendor);
    setCurrentUser(null);
    setCurrentEmployee(null);
  };

  const isAuthenticated = (currentUser !== null && currentUser !== undefined) || (currentEmployee !== null && currentEmployee !== undefined) || (currentVendor !== null && currentVendor !== undefined);

  return (
    <AuthContext.Provider value={{ user: currentUser ?? null, employee: currentEmployee ?? null, vendor: currentVendor ?? null, isAuthenticated, isLoading, login, logout, updatePassword, addUser, resetUsers, getAllUsers, updateUser, deleteUser, setEmployeeAfterPasswordChange, setVendorAfterPasswordChange }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

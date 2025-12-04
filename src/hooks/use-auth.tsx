import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useStorage } from './use-storage';
import { User, UserRole, Vendor } from '@/lib/types';
import { verifyEmployeeCredentials } from '@/lib/firestore/employeeService';
import { authenticateVendor } from '@/lib/firestore/vendorService';
import { waitForFirebase } from '@/lib/firebase';
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

  // Wait for storage to be ready before allowing login
  useEffect(() => {
    // Initialize both storage and Firebase
    const initializeAuth = async () => {
      console.log('[Auth] Initializing auth system...');
      console.log('[Auth] Storage users ready:', users?.length || 0);
      
      // Wait for Firebase to be fully initialized
      console.log('[Auth] Waiting for Firebase to be ready...');
      const firebaseReady = await waitForFirebase(10000); // 10 second timeout
      
      if (firebaseReady) {
        console.log('[Auth] ✅ Firebase is ready');
      } else {
        console.warn('[Auth] ⚠️ Firebase initialization timeout - will retry on demand');
      }
      
      console.log('[Auth] ✅ Auth system ready for login');
      setIsLoading(false);
    };
    
    // Small delay to ensure localStorage is fully read
    const timer = setTimeout(initializeAuth, 500);
    
    return () => clearTimeout(timer);
  }, [users]);

  const login = async (username: string, password: string): Promise<{ success: boolean; needsPasswordSetup?: boolean; isEmployee?: boolean; isVendor?: boolean; employeeData?: EmployeeWithCompany; vendorData?: Vendor; message?: string }> => {
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Username:', username);

    // Trim inputs to handle accidental whitespace
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    // First, check localStorage for admin users (FAST, no network delay)
    // This ensures admin can login immediately without waiting for Firestore
    console.log('[Auth] Checking localStorage for admin users...');
    console.log('[Auth] Total users in storage:', (users || []).length);
    
    const localUser = (users || []).find(u => {
      const storedUsername = u.username?.trim() || '';
      const storedPassword = u.password?.trim() || '';
      return storedUsername === trimmedUsername && storedPassword === trimmedPassword;
    });

    if (localUser && localUser.role === 'owner') {
      console.log('[Auth] ✅ Found admin user in localStorage:', localUser.name);
      
      if (!localUser.isActive) {
        return { success: false, message: 'Your account is not active.' };
      }

      setCurrentUser(localUser);
      setCurrentEmployee(null);
      setCurrentVendor(null);

      if (!localUser.hasSetupPassword) {
        return { success: true, needsPasswordSetup: true, isEmployee: false };
      }

      return { success: true, isEmployee: false };
    }

    // Second, check Firestore for employees (only if not admin)
    console.log('[Auth] Not an admin, checking Firestore for employee credentials...');
    
    // Ensure Firebase is ready before querying
    const firebaseReady = await waitForFirebase(5000);
    if (!firebaseReady) {
      console.error('[Auth] ⚠️ Firebase not ready, cannot check employee/vendor credentials');
      return { success: false, message: 'System is initializing. Please try again in a moment.' };
    }
    
    try {
      const employeeResult = await verifyEmployeeCredentials(trimmedUsername, trimmedPassword);

      if (employeeResult.success && employeeResult.employee) {
        const employee = employeeResult.employee;
        console.log('[Auth] Found employee:', employee);

        if (employee.firstLogin) {
          console.log('[Auth] ✅ FIRST LOGIN DETECTED - NOT setting employee in storage yet');
          return { success: true, needsPasswordSetup: true, isEmployee: true, employeeData: employee };
        }

        setCurrentEmployee(employee);
        setCurrentUser(null);
        setCurrentVendor(null);
        return { success: true, isEmployee: true };
      }

      // If employee auth failed with specific error (not just "not found"), return that error
      if (!employeeResult.success && employeeResult.error !== 'not_found') {
        console.log('[Auth] Employee auth failed:', employeeResult.message);
        return { success: false, message: employeeResult.message };
      }
    } catch (error) {
      console.error('[Auth] Employee auth error (continuing to vendor check):', error);
      // Continue to vendor check even if employee check fails
    }

    // Third, check Firestore for vendors
    console.log('[Auth] Checking Firestore for vendor credentials...');
    try {
      const vendorResult = await authenticateVendor(trimmedUsername, trimmedPassword);

      if (vendorResult.success && vendorResult.vendor) {
        const vendor = vendorResult.vendor;
        console.log('[Auth] Found vendor:', vendor);

        if (vendor.isFirstLogin) {
          console.log('[Auth] ✅ FIRST LOGIN DETECTED FOR VENDOR');
          return { success: true, needsPasswordSetup: true, isVendor: true, vendorData: vendor };
        }

        setCurrentVendor(vendor);
        setCurrentUser(null);
        setCurrentEmployee(null);
        return { success: true, isVendor: true };
      }

      // If vendor auth failed with specific error, return that error
      if (!vendorResult.success && vendorResult.error !== 'not_found') {
        console.log('[Auth] Vendor auth failed:', vendorResult.message);
        return { success: false, message: vendorResult.message };
      }
    } catch (error) {
      console.error('[Auth] Vendor auth error (continuing to customer check):', error);
      // Continue to customer check
    }

    // Final check: Other localStorage users (tailor, customer) - already checked admin above
    console.log('[Auth] Checking for other users (tailor/customer) in localStorage...');
    
    if (localUser) {
      // localUser was already found in first check but might not be owner
      console.log('[Auth] Found user in localStorage:', localUser.name, 'Role:', localUser.role);
      
      if (localUser.role !== 'customer' && !localUser.isActive) {
        return { success: false, message: 'Your account is not active. Please contact the administrator.' };
      }

      setCurrentUser(localUser);
      setCurrentEmployee(null);
      setCurrentVendor(null);

      if (!localUser.hasSetupPassword) {
        return { success: true, needsPasswordSetup: true, isEmployee: false };
      }

      return { success: true, isEmployee: false };
    }

    // No match found anywhere
    console.log('[Auth] ❌ No matching credentials found');
    return { success: false, message: 'Invalid username or password' };
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

  const setEmployeeAfterPasswordChange = (employee: EmployeeWithCompany) => {
    console.log('[AuthContext] Setting employee after password change:', employee);
    setCurrentEmployee(employee);
    setCurrentUser(null);
    setCurrentVendor(null);
  };

  const setVendorAfterPasswordChange = (vendor: Vendor) => {
    console.log('[AuthContext] Setting vendor after password change:', vendor);
    setCurrentVendor(vendor);
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
    // During hot reload, context might be temporarily undefined
    // Return a safe default state instead of throwing
    console.warn('[useAuth] Context undefined - returning default state (likely hot reload)');
    return {
      user: null,
      employee: null,
      vendor: null,
      isAuthenticated: false,
      isLoading: true,
      login: async () => ({ success: false, message: 'Auth not ready' }),
      logout: () => {},
      updatePassword: async () => {},
      addUser: () => {},
      resetUsers: () => {},
      getAllUsers: () => [],
      updateUser: () => {},
      deleteUser: () => {},
      setEmployeeAfterPasswordChange: () => {},
      setVendorAfterPasswordChange: () => {},
    } as AuthContextType;
  }
  return context;
}

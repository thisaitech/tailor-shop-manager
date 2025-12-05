import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { useStorage } from './use-storage';
import { User, UserRole, Vendor } from '@/lib/types';
import { verifyEmployeeCredentials } from '@/lib/firestore/employeeService';
import { authenticateVendor } from '@/lib/firestore/vendorService';
import type { EmployeeWithCompany } from '@/lib/firestore/employeeService';
import { encryptPassword, decryptPassword, isEncrypted } from '@/lib/crypto';
import { waitForFirebase, isFirebaseReady } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  employee: EmployeeWithCompany | null;
  vendor: Vendor | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; needsPasswordSetup?: boolean; isEmployee?: boolean; isVendor?: boolean; employeeData?: EmployeeWithCompany; vendorData?: Vendor; message?: string }>;
  logout: () => void;
  updatePassword: (newPassword: string) => Promise<void>;
  addUser: (user: User) => Promise<void>;
  resetUsers: (users: User[]) => void;
  getAllUsers: () => User[];
  updateUser: (userId: string, updatedData: Partial<User>) => Promise<void>;
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

  // Wait for Firebase to be ready before allowing authentication
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Wait for Firebase to be fully initialized
        await waitForFirebase();
        console.log('✅ [Auth] Firebase is ready, auth can proceed');
      } catch (error) {
        console.error('❌ [Auth] Firebase initialization failed:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; needsPasswordSetup?: boolean; isEmployee?: boolean; isVendor?: boolean; employeeData?: EmployeeWithCompany; vendorData?: Vendor; message?: string }> => {
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Username:', username);

    // Ensure Firebase is ready before attempting login
    if (!isFirebaseReady()) {
      console.log('[Auth] Firebase not ready, waiting...');
      try {
        await waitForFirebase();
        console.log('[Auth] Firebase now ready, proceeding with login');
      } catch (error) {
        console.error('[Auth] Firebase initialization failed:', error);
        return { success: false, message: 'Service is initializing. Please try again.' };
      }
    }

    // Trim inputs to handle accidental whitespace
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    // First, check if this is an employee login (Firestore)
    console.log('Checking Firestore for employee credentials...');
    const employeeResult = await verifyEmployeeCredentials(trimmedUsername, trimmedPassword);

    if (employeeResult.success && employeeResult.employee) {
      const employee = employeeResult.employee;
      console.log('[Auth] Found employee:', employee);
      console.log('[Auth] Employee firstLogin status:', employee.firstLogin);

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

    // If employee auth failed with a specific error (not just "not found"), return that error
    if (!employeeResult.success && employeeResult.error !== 'not_found') {
      console.log('[Auth] Employee auth failed:', employeeResult.message);
      return { success: false, message: employeeResult.message };
    }

    // Second, check if this is a vendor/job work tailor login (Firestore)
    console.log('Checking Firestore for vendor credentials...');
    const vendorResult = await authenticateVendor(trimmedUsername, trimmedPassword);

    if (vendorResult.success && vendorResult.vendor) {
      const vendor = vendorResult.vendor;
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

    // If vendor auth failed with a specific error (not just "not found"), return that error
    if (!vendorResult.success && vendorResult.error !== 'not_found') {
      console.log('[Auth] Vendor auth failed:', vendorResult.message);
      return { success: false, message: vendorResult.message };
    }

    // If not an employee or vendor, check localStorage users (owner, tailor, customer)
    console.log('Total users in storage:', (users || []).length);
    console.log('All users:', (users || []).map(u => ({
      id: u.id,
      username: u.username,
      role: u.role,
      name: u.name
    })));

    // Find user by username first, then verify password
    let foundUser: User | undefined;
    for (const u of (users || [])) {
      const storedUsername = u.username?.trim() || '';
      if (storedUsername === trimmedUsername) {
        // Check password - support both encrypted and legacy plain text
        let passwordMatches = false;
        if (u.password) {
          if (isEncrypted(u.password)) {
            // New encrypted password
            const decrypted = await decryptPassword(u.password);
            passwordMatches = decrypted === trimmedPassword;
          } else {
            // Legacy plain text password
            passwordMatches = u.password.trim() === trimmedPassword;
          }
        }
        if (passwordMatches) {
          foundUser = u;
          break;
        }
      }
    }

    console.log('Found user:', foundUser);

    if (!foundUser) {
      return { success: false, message: 'Invalid username or password' };
    }

    const user = foundUser;

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

    // Encrypt the new password before storing
    const encryptedPassword = await encryptPassword(newPassword);

    const updatedUser = {
      ...currentUser,
      password: encryptedPassword,
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

  const addUser = async (user: User) => {
    console.log('[AuthContext] Adding user:', user);

    // Encrypt password if provided
    let userToAdd = user;
    if (user.password && !isEncrypted(user.password)) {
      const encryptedPassword = await encryptPassword(user.password);
      userToAdd = { ...user, password: encryptedPassword };
    }

    const updatedUsers = [...(users || []), userToAdd];
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

  const updateUser = async (userId: string, updatedData: Partial<User>) => {
    console.log('[AuthContext] Updating user:', userId, updatedData);

    // Encrypt password if being updated and not already encrypted
    let dataToUpdate = updatedData;
    if (updatedData.password && !isEncrypted(updatedData.password)) {
      const encryptedPassword = await encryptPassword(updatedData.password);
      dataToUpdate = { ...updatedData, password: encryptedPassword };
    }

    const updatedUsers = (users || []).map(u =>
      u.id === userId ? { ...u, ...dataToUpdate } : u
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
      addUser: async () => {},
      resetUsers: () => {},
      getAllUsers: () => [],
      updateUser: async () => {},
      deleteUser: () => {},
      setEmployeeAfterPasswordChange: () => {},
      setVendorAfterPasswordChange: () => {},
    } as AuthContextType;
  }
  return context;
}

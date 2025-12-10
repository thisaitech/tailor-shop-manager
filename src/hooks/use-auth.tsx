import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { useStorage } from './use-storage';
import { User, UserRole, Vendor, Admin } from '@/lib/types';
import { verifyEmployeeCredentials } from '@/lib/firestore/employeeService';
import { authenticateVendor } from '@/lib/firestore/vendorService';
import { verifyAdminCredentials } from '@/lib/firestore/adminService';
import type { EmployeeWithCompany } from '@/lib/firestore/employeeService';
import type { AdminWithCompany } from '@/lib/firestore/adminService';
import { encryptPassword, decryptPassword, isEncrypted } from '@/lib/crypto';
import { waitForFirebase, isFirebaseReady, ensureConnectionReady } from '@/lib/firebase';
import { DEFAULT_AUTH_USERS } from '@/lib/defaultAuthUsers';

interface AuthContextType {
  user: User | null;
  employee: EmployeeWithCompany | null;
  vendor: Vendor | null;
  admin: AdminWithCompany | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isStorageReady: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; needsPasswordSetup?: boolean; isEmployee?: boolean; isVendor?: boolean; isAdmin?: boolean; employeeData?: EmployeeWithCompany; vendorData?: Vendor; adminData?: AdminWithCompany; message?: string }>;
  logout: () => void;
  updatePassword: (newPassword: string) => Promise<void>;
  addUser: (user: User) => Promise<void>;
  resetUsers: (users: User[]) => void;
  getAllUsers: () => User[];
  updateUser: (userId: string, updatedData: Partial<User>) => Promise<void>;
  deleteUser: (userId: string) => void;
  setEmployeeAfterPasswordChange: (employee: EmployeeWithCompany) => void;
  setVendorAfterPasswordChange: (vendor: Vendor) => void;
  setAdminAfterPasswordChange: (admin: AdminWithCompany) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useStorage<User[]>('auth_users', []);
  const [currentUser, setCurrentUser] = useStorage<User | null>('current_user', null);
  const [currentEmployee, setCurrentEmployee] = useStorage<EmployeeWithCompany | null>('current_employee', null);
  const [currentVendor, setCurrentVendor] = useStorage<Vendor | null>('current_vendor', null);
  const [currentAdmin, setCurrentAdmin] = useStorage<AdminWithCompany | null>('current_admin', null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStorageReady, setIsStorageReady] = useState(false);

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

  useEffect(() => {
    const storedUsers = users || [];
    const existingUsernames = new Set(storedUsers.map(u => u.username));
    const missingDefaults = DEFAULT_AUTH_USERS.filter(defaultUser => !existingUsernames.has(defaultUser.username));

    if (missingDefaults.length === 0) {
      if (!isStorageReady) {
        console.log('[Auth] Default local users already seeded');
        setIsStorageReady(true);
      }
      return;
    }

    if (isStorageReady) {
      setIsStorageReady(false);
    }

    console.log('[Auth] Seeding default local users:', missingDefaults.map(u => u.username));
    setUsers([
      ...storedUsers,
      ...missingDefaults.map(user => ({ ...user })),
    ]);
  }, [users, isStorageReady, setUsers]);

  const login = async (username: string, password: string): Promise<{ success: boolean; needsPasswordSetup?: boolean; isEmployee?: boolean; isVendor?: boolean; isAdmin?: boolean; employeeData?: EmployeeWithCompany; vendorData?: Vendor; adminData?: AdminWithCompany; message?: string }> => {
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Username:', username);

    // Ensure Firebase is ready AND connection is warmed up before attempting login
    // This is critical for first login after fresh install
    try {
      console.log('[Auth] Ensuring Firebase connection is ready...');
      const connectionReady = await ensureConnectionReady();
      if (!connectionReady) {
        console.warn('[Auth] Firebase connection warmup failed, but proceeding with login attempt');
      }
      console.log('[Auth] Firebase connection ready, proceeding with login');
    } catch (error) {
      console.error('[Auth] Firebase initialization failed:', error);
      return { success: false, message: 'Service is initializing. Please try again.' };
    }

    // Trim inputs to handle accidental whitespace
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    // First, check if this is an admin login (Firestore)
    console.log('Checking Firestore for admin credentials...');
    let adminResult = await verifyAdminCredentials(trimmedUsername, trimmedPassword);

    // If we got a system error OR not_found on first try, retry after a delay
    if (adminResult.error === 'system_error' || adminResult.error === 'not_found') {
      console.warn(`[Auth] First admin auth attempt result: ${adminResult.error}, retrying after delay...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      const retryResult = await verifyAdminCredentials(trimmedUsername, trimmedPassword);
      if (retryResult.success || retryResult.error !== 'not_found') {
        adminResult = retryResult;
        console.log('[Auth] Admin retry result:', adminResult.error || 'success');
      }
    }

    if (adminResult.success && adminResult.admin) {
      const admin = adminResult.admin;
      console.log('[Auth] Found admin:', admin);
      console.log('[Auth] Admin isFirstLogin status:', admin.isFirstLogin);

      if (admin.isFirstLogin) {
        console.log('[Auth] ✅ FIRST LOGIN DETECTED FOR ADMIN - NOT setting admin in storage yet');
        return { success: true, needsPasswordSetup: true, isAdmin: true, adminData: admin };
      }

      console.log('[Auth] Setting current admin in storage');
      setCurrentAdmin(admin);
      setCurrentUser(null);
      setCurrentEmployee(null);
      setCurrentVendor(null);

      console.log('[Auth] Not first login - proceeding to admin dashboard');
      return { success: true, isAdmin: true };
    }

    // If admin auth failed with a specific error (not just "not found"), return that error
    if (!adminResult.success && adminResult.error !== 'not_found') {
      console.log('[Auth] Admin auth failed:', adminResult.message);
      return { success: false, message: adminResult.message };
    }

    // Second, check if this is an employee login (Firestore)
    // On cold start, first query might fail - implement retry logic
    console.log('Checking Firestore for employee credentials...');
    let employeeResult = await verifyEmployeeCredentials(trimmedUsername, trimmedPassword);

    // If we got a system error OR not_found on first try (likely cold start issue), retry after a delay
    // The "not_found" case is critical - on cold start the query might return empty even if user exists
    if (employeeResult.error === 'system_error' || employeeResult.error === 'not_found') {
      console.warn(`[Auth] First employee auth attempt result: ${employeeResult.error}, retrying after delay...`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay for cold start recovery
      const retryResult = await verifyEmployeeCredentials(trimmedUsername, trimmedPassword);
      // Only use retry result if it's better than original (found user or different error)
      if (retryResult.success || retryResult.error !== 'not_found') {
        employeeResult = retryResult;
        console.log('[Auth] Retry result:', employeeResult.error || 'success');
      }
    }

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
      setCurrentAdmin(null); // Clear any existing admin session

      console.log('[Auth] Not first login - proceeding to dashboard');
      return { success: true, isEmployee: true };
    }

    // If employee auth failed with a specific error (not just "not found"), return that error
    if (!employeeResult.success && employeeResult.error !== 'not_found') {
      console.log('[Auth] Employee auth failed:', employeeResult.message);
      return { success: false, message: employeeResult.message };
    }

    // Second, check if this is a vendor/job work tailor login (Firestore)
    // On cold start, first query might fail - implement retry logic
    console.log('Checking Firestore for vendor credentials...');
    let vendorResult = await authenticateVendor(trimmedUsername, trimmedPassword);

    // If we got a system error OR not_found on first try (likely cold start issue), retry after a delay
    // The "not_found" case is critical - on cold start the query might return empty even if user exists
    if (vendorResult.error === 'system_error' || vendorResult.error === 'not_found') {
      console.warn(`[Auth] First vendor auth attempt result: ${vendorResult.error}, retrying after delay...`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay for cold start recovery
      const retryResult = await authenticateVendor(trimmedUsername, trimmedPassword);
      // Only use retry result if it's better than original (found user or different error)
      if (retryResult.success || retryResult.error !== 'not_found') {
        vendorResult = retryResult;
        console.log('[Auth] Vendor retry result:', vendorResult.error || 'success');
      }
    }

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
      setCurrentAdmin(null); // Clear any existing admin session

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
    setCurrentVendor(null); // Clear any existing vendor session
    setCurrentAdmin(null); // Clear any existing admin session

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
    setCurrentAdmin(null);
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
    setCurrentAdmin(null);
  };

  const setAdminAfterPasswordChange = (admin: AdminWithCompany) => {
    console.log('[AuthContext] Setting admin after password change:', admin);
    setCurrentAdmin(admin);
    setCurrentUser(null);
    setCurrentEmployee(null);
    setCurrentVendor(null);
  };

  const isAuthenticated = (currentUser !== null && currentUser !== undefined) || (currentEmployee !== null && currentEmployee !== undefined) || (currentVendor !== null && currentVendor !== undefined) || (currentAdmin !== null && currentAdmin !== undefined);

  return (
    <AuthContext.Provider value={{ user: currentUser ?? null, employee: currentEmployee ?? null, vendor: currentVendor ?? null, admin: currentAdmin ?? null, isAuthenticated, isLoading, isStorageReady, login, logout, updatePassword, addUser, resetUsers, getAllUsers, updateUser, deleteUser, setEmployeeAfterPasswordChange, setVendorAfterPasswordChange, setAdminAfterPasswordChange }}>
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
      admin: null,
      isAuthenticated: false,
      isLoading: true,
      isStorageReady: false,
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
      setAdminAfterPasswordChange: () => {},
    } as AuthContextType;
  }
  return context;
}

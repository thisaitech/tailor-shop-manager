import { createContext, useContext, ReactNode } from 'react';
import { useStorage } from './use-storage';
import { User, UserRole } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; needsPasswordSetup?: boolean; message?: string }>;
  logout: () => void;
  updatePassword: (newPassword: string) => Promise<void>;
  addUser: (user: User) => void;
  resetUsers: (users: User[]) => void;
  getAllUsers: () => User[];
  updateUser: (userId: string, updatedData: Partial<User>) => void;
  deleteUser: (userId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useStorage<User[]>('auth_users', []);
  const [currentUser, setCurrentUser] = useStorage<User | null>('current_user', null);

  const login = async (username: string, password: string): Promise<{ success: boolean; needsPasswordSetup?: boolean; message?: string }> => {
    console.log('Login attempt:', { username, password });
    console.log('Available users:', users);
    
    const user = (users || []).find(u => u.username === username && u.password === password);
    
    console.log('Found user:', user);
    
    if (!user) {
      return { success: false, message: 'Invalid username or password' };
    }

    if (user.role !== 'customer' && !user.isActive) {
      return { success: false, message: 'Your account is not active. Please contact the administrator.' };
    }
    
    setCurrentUser(user);
    
    if (!user.hasSetupPassword) {
      return { success: true, needsPasswordSetup: true };
    }
    
    return { success: true };
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

  const isAuthenticated = currentUser !== null && currentUser !== undefined;

  return (
    <AuthContext.Provider value={{ user: currentUser ?? null, isAuthenticated, login, logout, updatePassword, addUser, resetUsers, getAllUsers, updateUser, deleteUser }}>
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

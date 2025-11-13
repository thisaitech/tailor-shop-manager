import { createContext, useContext, ReactNode } from 'react';
import { useKV } from '@github/spark/hooks';
import { User, UserRole } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; needsPasswordSetup?: boolean; message?: string }>;
  logout: () => void;
  updatePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useKV<User[]>('auth_users', []);
  const [currentUser, setCurrentUser] = useKV<User | null>('current_user', null);

  const login = async (username: string, password: string): Promise<{ success: boolean; needsPasswordSetup?: boolean; message?: string }> => {
    const user = (users || []).find(u => u.username === username && u.password === password);
    
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

  const updatePassword = async (newPassword: string): Promise<void> => {
    if (!currentUser) return;
    
    const updatedUser = {
      ...currentUser,
      password: newPassword,
      hasSetupPassword: true,
    };
    
    setUsers((prevUsers) => 
      (prevUsers || []).map(u => u.id === currentUser.id ? updatedUser : u)
    );
    setCurrentUser(updatedUser);
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const isAuthenticated = currentUser !== null && currentUser !== undefined;

  return (
    <AuthContext.Provider value={{ user: currentUser ?? null, isAuthenticated, login, logout, updatePassword }}>
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

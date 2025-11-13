import { createContext, useContext, ReactNode } from 'react';
import { useKV } from '@github/spark/hooks';
import { User, UserRole } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (userData: Omit<User, 'id' | 'createdAt'>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useKV<User | null>('auth_current_user', null);
  const [users, setUsers] = useKV<User[]>('auth_users', []);

  const login = async (username: string, password: string): Promise<boolean> => {
    const user = (users || []).find(u => u.username === username && u.password === password);
    
    if (user) {
      setCurrentUser(user);
      return true;
    }
    
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const register = async (userData: Omit<User, 'id' | 'createdAt'>): Promise<boolean> => {
    const existingUser = (users || []).find(u => u.username === userData.username);
    
    if (existingUser) {
      return false;
    }

    const newUser: User = {
      ...userData,
      id: `USER${Date.now()}`,
      createdAt: Date.now(),
    };

    setUsers(prev => [...(prev || []), newUser]);
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user: currentUser || null,
        isAuthenticated: !!currentUser,
        login,
        logout,
        register,
      }}
    >
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

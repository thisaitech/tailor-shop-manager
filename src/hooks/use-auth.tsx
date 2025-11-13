import { createContext, useContext, ReactNode } from 'react';
import { useKV } from '@github/spark/hooks';
import { User, UserRole } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useKV<User[]>('auth_users', []);
  const [currentUser, setCurrentUser] = useKV<User | null>('current_user', null);

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

  const isAuthenticated = currentUser !== null && currentUser !== undefined;

  return (
    <AuthContext.Provider value={{ user: currentUser ?? null, isAuthenticated, login, logout }}>
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

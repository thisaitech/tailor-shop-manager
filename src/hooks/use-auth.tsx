import { createContext, useContext, ReactNode } from 'react';
import { User, UserRole } from '@/lib/types'
import { User, UserRole } from '@/lib/types';

  isAuthenticated: boolean;
  logout: () => void
}
const AuthContext = createContext<AuthContextType | undefined>(und
export function AuthP
  const [users, setUsers] = useKV<User[]>('auth_users', []);
 

      setCurrentUser(user);

    return false;

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

  };
  return (
    
        isAuthenticated
        logout,
     

  );

  const context = useContext(A
    throw new Error('useAuth
  retu





















  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

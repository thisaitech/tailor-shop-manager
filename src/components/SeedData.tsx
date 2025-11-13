import { useEffect } from 'react';
import { useStorage } from '@/hooks/use-storage';
import { User } from '@/lib/types';

export function SeedData() {
  const [users, setUsers] = useStorage<User[]>('auth_users', []);

  useEffect(() => {
    console.log('=== SEED DATA DEBUG ===');
    console.log('Current users in storage:', users);
    console.log('Users count:', users?.length || 0);
    
    const currentUsers = users || [];

    // Always reset to default for testing
    const defaultUsers: User[] = [
      {
        id: 'USER1',
        username: '9486229273',
        password: 'admin123',
        role: 'owner',
        name: 'Thisai Technologies Tailor',
        phone: '9486229273',
        isActive: true,
        hasSetupPassword: true,
        createdAt: Date.now(),
      },
    ];

    if (currentUsers.length === 0) {
      console.log('Setting default users...');
      setUsers(defaultUsers);
      console.log('Default user created with password: admin123');
    } else {
      console.log('Users already exist:', currentUsers.map(u => ({ username: u.username, password: u.password, role: u.role })));
    }
  }, []);

  return null;
}

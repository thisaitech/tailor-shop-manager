import { useEffect } from 'react';
import { useKV } from '@github/spark/hooks';
import { User } from '@/lib/types';

export function SeedData() {
  const [users, setUsers] = useKV<User[]>('auth_users', []);

  useEffect(() => {
    const currentUsers = users || [];

    if (currentUsers.length === 0) {
      const defaultUsers: User[] = [
        {
          id: 'USER1',
          username: '9486229273',
          password: 'password',
          role: 'owner',
          name: 'Thisai Technologies Tailor',
          phone: '9486229273',
          isActive: true,
          hasSetupPassword: false,
          createdAt: Date.now(),
        },
      ];

      setUsers(defaultUsers);
    }
  }, []);

  return null;
}

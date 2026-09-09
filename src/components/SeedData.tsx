import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { User } from '@/lib/types';

// Default admin users for the app
const DEFAULT_USERS: User[] = [
  {
    id: 'OWNER_SANDRA',
    username: '7373333273',
    password: 'sandra123',
    role: 'owner',
    name: 'Sandra Tailor Shop',
    phone: '7373333273',
    isActive: true,
    hasSetupPassword: true,
    createdAt: Date.now(),
  },
  {
    id: 'OWNER_THISAI',
    username: '9486229273',
    password: 'password',
    role: 'owner',
    name: 'Thisai Technologies Tailor',
    phone: '9486229273',
    isActive: true,
    hasSetupPassword: true,
    createdAt: Date.now(),
  },
];

export function SeedData() {
  const { getAllUsers, resetUsers } = useAuth();
  const hasSeeded = useRef(false);

  useEffect(() => {
    // Only seed once per app session
    if (hasSeeded.current) {
      return;
    }

    const users = getAllUsers() || [];
    console.log('[SeedData] Checking if seeding is needed...');
    console.log('[SeedData] Current users count:', users.length);

    // Check if default users already exist
    const hasDefaultUsers = DEFAULT_USERS.every(defaultUser =>
      users.some(u => u.username === defaultUser.username)
    );

    if (hasDefaultUsers && users.length > 0) {
      console.log('[SeedData] Default users already exist, skipping seed');
      hasSeeded.current = true;
      return;
    }

    console.log('[SeedData] Seeding default admin users...');

    // Merge default users with existing users (avoid duplicates)
    const existingUsernames = new Set(users.map(u => u.username));
    const newDefaultUsers = DEFAULT_USERS.filter(u => !existingUsernames.has(u.username));
    const mergedUsers = [...users, ...newDefaultUsers];

    // Use Auth context so login reads the same user list
    resetUsers(mergedUsers);
    hasSeeded.current = true;

    console.log('[SeedData] ✅ Seed complete! Available logins:');
    console.log('  1. Sandra - Phone: 7373333273, Password: sandra123');
    console.log('  2. Thisai - Phone: 9486229273, Password: password');
  }, [getAllUsers, resetUsers]);

  return null;
}

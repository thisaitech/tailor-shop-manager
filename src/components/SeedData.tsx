import { useEffect, useRef, useState } from 'react';
import { useStorage } from '@/hooks/use-storage';
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
  const [users, setUsers] = useStorage<User[]>('auth_users', []);
  const hasSeeded = useRef(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Only seed once per app session
    if (hasSeeded.current) {
      return;
    }

    console.log('[SeedData] 🌱 Checking if seeding is needed...');
    console.log('[SeedData] Current users count:', users?.length || 0);
    console.log('[SeedData] Current users:', users?.map(u => ({ username: u.username, role: u.role })));

    // Check if default users already exist
    const hasDefaultUsers = DEFAULT_USERS.every(defaultUser => 
      (users || []).some(u => u.username === defaultUser.username)
    );

    if (hasDefaultUsers && (users || []).length > 0) {
      console.log('[SeedData] ✅ Default users already exist, skipping seed');
      console.log('[SeedData] Available users:', users.map(u => `${u.name} (${u.username})`).join(', '));
      hasSeeded.current = true;
      setIsReady(true);
      return;
    }

    console.log('[SeedData] 🌱 Seeding default admin users...');

    // Merge default users with existing users (avoid duplicates)
    const existingUsernames = new Set((users || []).map(u => u.username));
    const newDefaultUsers = DEFAULT_USERS.filter(u => !existingUsernames.has(u.username));
    
    if (newDefaultUsers.length > 0) {
      const mergedUsers = [...(users || []), ...newDefaultUsers];
      console.log('[SeedData] Adding', newDefaultUsers.length, 'new admin users');
      setUsers(mergedUsers);
    }

    hasSeeded.current = true;
    setIsReady(true);

    console.log('[SeedData] ✅ Seed complete! Available admin logins:');
    console.log('  1. Sandra - Phone: 7373333273, Password: sandra123');
    console.log('  2. Thisai - Phone: 9486229273, Password: password');
    console.log('[SeedData] Total users now:', (users?.length || 0) + newDefaultUsers.length);
  }, [users, setUsers]);

  // Show loading indicator until seeding is done
  if (!isReady) {
    return null; // Could show a small loader if needed
  }

  return null;
}

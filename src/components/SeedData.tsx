import { useEffect, useRef } from 'react';
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

  useEffect(() => {
    // Only seed once per app session
    if (hasSeeded.current) {
      return;
    }

    console.log('[SeedData] Checking if seeding is needed...');
    console.log('[SeedData] Current users count:', users?.length || 0);

    // Check if default users already exist
    const hasDefaultUsers = DEFAULT_USERS.every(defaultUser => 
      (users || []).some(u => u.username === defaultUser.username)
    );

    if (hasDefaultUsers && (users || []).length > 0) {
      console.log('[SeedData] Default users already exist, skipping seed');
      hasSeeded.current = true;
      return;
    }

    console.log('[SeedData] Seeding default admin users...');

    // Merge default users with existing users (avoid duplicates)
    const existingUsernames = new Set((users || []).map(u => u.username));
    const newDefaultUsers = DEFAULT_USERS.filter(u => !existingUsernames.has(u.username));
    const mergedUsers = [...(users || []), ...newDefaultUsers];

    setUsers(mergedUsers);
    hasSeeded.current = true;

    // Also write directly to localStorage to ensure immediate availability
    // This helps with the state synchronization issue between components
    try {
      localStorage.setItem('auth_users', JSON.stringify(mergedUsers));
      console.log('[SeedData] ✅ Users saved directly to localStorage');
      
      // Dispatch a custom storage event to notify other components
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'auth_users',
        newValue: JSON.stringify(mergedUsers),
      }));
    } catch (e) {
      console.error('[SeedData] Error saving to localStorage:', e);
    }

    console.log('[SeedData] ✅ Seed complete! Available logins:');
    console.log('  1. Sandra - Phone: 7373333273, Password: sandra123');
    console.log('  2. Thisai - Phone: 9486229273, Password: password');
  }, [users, setUsers]);

  return null;
}

import { User } from '@/lib/types';

// Default owner accounts that should exist after a fresh install.
// These credentials are intentionally stable so installers always know what to use.
export const DEFAULT_AUTH_USERS: User[] = [
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

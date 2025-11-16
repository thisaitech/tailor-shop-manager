                                                                                                  import { useEffect } from 'react';
import { useStorage } from '@/hooks/use-storage';
import { User } from '@/lib/types';

export function SeedData() {
  const [users, setUsers] = useStorage<User[]>('auth_users', []);

  useEffect(() => {
    console.log('=== SEED DATA - MULTI COMPANY SETUP ===');
    console.log('Current users in storage:', users);
    console.log('Users count:', users?.length || 0);
    
    // Create two company owner accounts
    const company1: User = {
      id: 'OWNER_SANDRA',
      username: '7373333273',
      password: 'sandra123',
      role: 'owner',
      name: 'Sandra Tailor Shop',
      phone: '7373333273',
      isActive: true,
      hasSetupPassword: true,
      createdAt: Date.now(),
    };

    const company2: User = {
      id: 'OWNER_THISAI',
      username: '9486229273',
      password: 'password',
      role: 'owner',
      name: 'Thisai Technologies Tailor',
      phone: '9486229273',
      isActive: true,
      hasSetupPassword: true,
      createdAt: Date.now(),
    };

    console.log('Creating company owners:');
    console.log('1. Sandra - Phone: 7373333273, Password: sandra123');
    console.log('2. Thisai - Phone: 9486229273, Password: password');

    // Keep other users but replace company owners
    const otherUsers = (users || []).filter(
      u => u.username !== '7373333273' && u.username !== '9486229273'
    );
    const newUsers = [company1, company2, ...otherUsers];
    
    setUsers(newUsers);
    
    // Verify after setting
    setTimeout(() => {
      const stored = JSON.parse(localStorage.getItem('auth_users') || '[]');
      console.log('VERIFICATION - Stored users after seed:', stored);
      console.log('VERIFICATION - Sandra password:', stored.find((u: User) => u.username === '7373333273')?.password);
      console.log('VERIFICATION - Thisai password:', stored.find((u: User) => u.username === '9486229273')?.password);
    }, 100);
    
    console.log('Company setup complete!');
    console.log('Default password for tailors/customers: password123');
  }, []);

  return null;
}

import { useEffect } from 'react';
import { useKV } from '@github/spark/hooks';
import { User, Customer } from '@/lib/types';

export function SeedData() {
  const [users, setUsers] = useKV<User[]>('auth_users', []);
  const [customers, setCustomers] = useKV<Customer[]>('customers', []);

  useEffect(() => {
    const currentUsers = users || [];
    const currentCustomers = customers || [];

    if (currentUsers.length === 0) {
      const defaultUsers: User[] = [
        {
          id: 'USER1',
          username: 'admin',
          password: 'admin123',
          role: 'owner',
          name: 'Shop Owner',
          createdAt: Date.now(),
        },
        {
          id: 'USER2',
          username: 'tailor1',
          password: 'tailor123',
          role: 'tailor',
          name: 'Kumar',
          tailorId: '1',
          createdAt: Date.now(),
        },
        {
          id: 'USER3',
          username: 'customer1',
          password: 'customer123',
          role: 'customer',
          name: 'John Doe',
          phone: '9876543210',
          customerId: 'CUS1',
          createdAt: Date.now(),
        },
      ];

      setUsers(defaultUsers);
    }

    if (currentCustomers.length === 0) {
      const demoCustomer: Customer = {
        id: 'CUS1',
        name: 'John Doe',
        phone: '9876543210',
        place: 'Chennai',
        gender: 'male',
        measurements: {
          shirt: {
            length: 75,
            shoulder: 45,
            chest: 40,
            waist: 38,
            sleeve: 60,
            neck: 15,
          },
          pant: {
            length: 100,
            waist: 32,
            hip: 38,
            thigh: 24,
            bottom: 18,
          },
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setCustomers([demoCustomer]);
    }
  }, []);

  return null;
}

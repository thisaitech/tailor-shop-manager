import { useStorage } from '@/hooks/use-storage';
import { useAuth } from '@/hooks/use-auth';
import { User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function DebugPanel() {
  const [users, setUsers] = useStorage<User[]>('auth_users', []);
  const { addUser, resetUsers } = useAuth();

  const handleClearAll = () => {
    localStorage.clear();
    toast.success('All data cleared! Please refresh the page.');
  };

  const handleResetToDefaults = () => {
    const defaultUsers: User[] = [
      {
        id: 'USER1',
        username: '9486229273',
        password: 'password123',
        role: 'owner',
        name: 'Admin',
        phone: '9486229273',
        isActive: true,
        hasSetupPassword: true,
        createdAt: Date.now(),
      },
      {
        id: 'USER2',
        username: '9486229274',
        password: 'password',
        role: 'tailor',
        name: 'Test Tailor',
        phone: '9486229274',
        isActive: true,
        hasSetupPassword: false,
        createdAt: Date.now(),
      },
    ];
    
    resetUsers(defaultUsers);
    toast.success('Default users created!');
  };

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle>🔧 Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-bold mb-2">Current Users in Storage:</h3>
          <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
            {JSON.stringify(users, null, 2)}
          </pre>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleResetToDefaults} variant="default">
            Reset to Default Users
          </Button>
          <Button onClick={handleClearAll} variant="destructive">
            Clear All Data
          </Button>
        </div>

        <div className="bg-blue-50 p-4 rounded">
          <h4 className="font-bold mb-2">Login Credentials:</h4>
          <div className="space-y-2 text-sm">
            <div>
              <strong>Admin:</strong> 9486229273 / password123
            </div>
            <div>
              <strong>Tailor:</strong> 9486229274 / password
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

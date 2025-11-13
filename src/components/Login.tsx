import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Scissors } from '@phosphor-icons/react';
import { toast } from 'sonner';

export function Login() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error('Please enter username and password');
      return;
    }

    setIsLoading(true);
    const success = await login(username, password);
    setIsLoading(false);

    if (success) {
      toast.success('Login successful');
    } else {
      toast.error('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto bg-primary p-4 rounded-xl w-fit">
            <Scissors size={48} className="text-primary-foreground" weight="duotone" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold">{t('appName')}</CardTitle>
            <CardDescription className="text-base mt-2">Management System</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-2 font-medium">Default Credentials:</p>
            <div className="space-y-1 text-xs">
              <p><strong>Owner:</strong> admin / admin123</p>
              <p><strong>Tailor:</strong> tailor1 / tailor123</p>
              <p><strong>Customer:</strong> customer1 / customer123</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

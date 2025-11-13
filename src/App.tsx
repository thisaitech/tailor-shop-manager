import { LanguageProvider } from '@/hooks/use-language';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { Login } from '@/components/Login';
import { Header } from '@/components/Header';
import { OwnerDashboard } from '@/components/OwnerDashboard';
import { TailorDashboard } from '@/components/TailorDashboard';
import { CustomerDashboard } from '@/components/CustomerDashboard';
import { InstallPrompt } from '@/components/InstallPrompt';
import { SeedData } from '@/components/SeedData';
import { Toaster } from '@/components/ui/sonner';

function AppContent() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <Header />
      {user.role === 'owner' && <OwnerDashboard />}
      {user.role === 'tailor' && <TailorDashboard />}
      {user.role === 'customer' && <CustomerDashboard />}
      <InstallPrompt />
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <SeedData />
        <AppContent />
        <Toaster />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
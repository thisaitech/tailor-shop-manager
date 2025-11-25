import { useState } from 'react';
import { LanguageProvider } from '@/hooks/use-language';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { Login } from '@/components/Login';
import { Header } from '@/components/Header';
import { OwnerDashboard } from '@/components/OwnerDashboard';
import { TailorDashboard } from '@/components/TailorDashboard';
import { TailorDashboardFirestore } from '@/components/TailorDashboardFirestore';
import { CustomerDashboard } from '@/components/CustomerDashboard';
import { JobWorkTailorDashboard } from '@/components/JobWorkTailorDashboard';
import { InstallPrompt } from '@/components/InstallPrompt';
import { SeedData } from '@/components/SeedData';
import { CompanyProfileFirestore as CompanyProfile } from '@/components/CompanyProfileFirestore';
import { EmployeeManagementFirestore as EmployeeManagement } from '@/components/EmployeeManagementFirestore';
import { VendorManagementFirestore as VendorManagement } from '@/components/VendorManagementFirestore';
import { EmployeeProfile } from '@/components/EmployeeProfile';
import { DesignManagement } from '@/components/DesignManagement';
import { DeliveryChallan } from '@/components/DeliveryChallan';
import { GoodsReceipt } from '@/components/GoodsReceipt';
import { Payment } from '@/components/Payment';
import { Toaster } from '@/components/ui/sonner';

type AdminView = 'dashboard' | 'profile' | 'employees' | 'vendors' | 'designs' | 'payment' | 'delivery-challan' | 'goods-receipt';
type EmployeeView = 'dashboard' | 'profile';
type VendorView = 'dashboard' | 'profile';

function AppContent() {
  const { user, employee, vendor, isAuthenticated } = useAuth();
  const [adminView, setAdminView] = useState<AdminView>('dashboard');
  const [employeeView, setEmployeeView] = useState<EmployeeView>('dashboard');
  const [vendorView, setVendorView] = useState<VendorView>('dashboard');

  if (!isAuthenticated || (!user && !employee && !vendor)) {
    return <Login />;
  }

  const handleProfileClick = () => {
    setAdminView('profile');
  };

  const handleEmployeeClick = () => {
    setAdminView('employees');
  };

  const handleVendorClick = () => {
    setAdminView('vendors');
  };

  const handleDesignClick = () => {
    setAdminView('designs');
  };

  const handlePaymentClick = () => {
    setAdminView('payment');
  };

  const handleDeliveryChallanClick = () => {
    setAdminView('delivery-challan');
  };

  const handleGoodsReceiptClick = () => {
    setAdminView('goods-receipt');
  };

  const handleBackToDashboard = () => {
    setAdminView('dashboard');
  };

  const handleEmployeeProfileClick = () => {
    setEmployeeView('profile');
  };

  const handleEmployeeBackToDashboard = () => {
    setEmployeeView('dashboard');
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <Header
        onProfileClick={user?.role === 'owner' ? handleProfileClick : undefined}
        onEmployeeClick={user?.role === 'owner' ? handleEmployeeClick : undefined}
        onVendorClick={user?.role === 'owner' ? handleVendorClick : undefined}
        onDesignClick={user?.role === 'owner' ? handleDesignClick : undefined}
        onPaymentClick={user?.role === 'owner' ? handlePaymentClick : undefined}
        onDeliveryChallanClick={user?.role === 'owner' ? handleDeliveryChallanClick : undefined}
        onGoodsReceiptClick={user?.role === 'owner' ? handleGoodsReceiptClick : undefined}
        onEmployeeProfileClick={employee ? handleEmployeeProfileClick : undefined}
      />
      {user?.role === 'owner' && adminView === 'dashboard' && <OwnerDashboard />}
      {user?.role === 'owner' && adminView === 'profile' && <CompanyProfile onBack={handleBackToDashboard} />}
      {user?.role === 'owner' && adminView === 'employees' && <EmployeeManagement onBack={handleBackToDashboard} />}
      {user?.role === 'owner' && adminView === 'vendors' && <VendorManagement onBack={handleBackToDashboard} />}
      {user?.role === 'owner' && adminView === 'designs' && <DesignManagement onBack={handleBackToDashboard} />}
      {user?.role === 'owner' && adminView === 'payment' && (
        <Payment onBack={handleBackToDashboard} />
      )}
      {user?.role === 'owner' && adminView === 'delivery-challan' && (
        <DeliveryChallan onBack={handleBackToDashboard} />
      )}
      {user?.role === 'owner' && adminView === 'goods-receipt' && (
        <GoodsReceipt onBack={handleBackToDashboard} />
      )}
      {user?.role === 'tailor' && <TailorDashboard />}
      {user?.role === 'customer' && <CustomerDashboard />}
      {employee && employeeView === 'dashboard' && employee.role === 'tailor' && <TailorDashboardFirestore />}
      {employee && employeeView === 'dashboard' && employee.role !== 'tailor' && <OwnerDashboard />}
      {employee && employeeView === 'profile' && <EmployeeProfile onBack={handleEmployeeBackToDashboard} />}
      {vendor && vendorView === 'dashboard' && <JobWorkTailorDashboard />}
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
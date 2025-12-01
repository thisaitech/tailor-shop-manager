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
import { EmployeeDashboard } from '@/components/EmployeeDashboard';
import { TailorProfile } from '@/components/TailorProfile';
import { DesignManagement } from '@/components/DesignManagement';
import { DeliveryChallan } from '@/components/DeliveryChallan';
import { GoodsReceipt } from '@/components/GoodsReceipt';
import { Payment } from '@/components/Payment';
import { NotificationsPage } from '@/components/NotificationsPage';
import { Toaster } from '@/components/ui/sonner';
import { AppLoader } from '@/components/Loader';

type AdminView = 'dashboard' | 'profile' | 'employees' | 'vendors' | 'designs' | 'payment' | 'delivery-challan' | 'goods-receipt' | 'notifications';
type EmployeeView = 'dashboard' | 'profile' | 'notifications';
type VendorView = 'dashboard' | 'profile' | 'notifications';

function AppContent() {
  const { user, employee, vendor, isAuthenticated, isLoading } = useAuth();
  const [adminView, setAdminView] = useState<AdminView>('dashboard');
  const [dashboardTab, setDashboardTab] = useState<string>('dashboard');
  const [dashboardKey, setDashboardKey] = useState(0); // Key to force remount and reset dashboard state
  const [employeeView, setEmployeeView] = useState<EmployeeView>('dashboard');
  const [vendorView, setVendorView] = useState<VendorView>('dashboard');

  // Show loader during initial app loading
  if (isLoading) {
    return <AppLoader />;
  }

  if (!isAuthenticated || (!user && !employee && !vendor)) {
    return <Login />;
  }

  const handleDashboardClick = () => {
    setAdminView('dashboard');
    setDashboardTab('dashboard');
    setDashboardKey(prev => prev + 1); // Force remount to reset all internal state
  };

  const handleCustomersClick = () => {
    setAdminView('dashboard');
    setDashboardTab('customers');
    setDashboardKey(prev => prev + 1); // Force remount to show customers tab with loader
  };

  const handleProfileClick = () => {
    setAdminView('profile');
  };

  const handleEmployeeClick = () => {
    setAdminView('employees');
  };

  const handleVendorClick = () => {
    // Navigate to Job Work Tailors page
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



  const handleVendorProfileClick = () => {
    setVendorView('profile');
  };

  const handleEmployeeProfileClick = () => {
    setEmployeeView('profile');
  };

  const handleEmployeeBackToDashboard = () => {
    setEmployeeView('dashboard');
  };

  const handleVendorBackToDashboard = () => {
    setVendorView('dashboard');
  };

  // Notification handlers for all user types
  const handleNotificationsClick = () => {
    if (user?.role === 'owner') {
      setAdminView('notifications');
    } else if (employee) {
      setEmployeeView('notifications');
    } else if (vendor) {
      setVendorView('notifications');
    }
  };

  const handleNotificationsBack = () => {
    if (user?.role === 'owner') {
      setAdminView('dashboard');
    } else if (employee) {
      setEmployeeView('dashboard');
    } else if (vendor) {
      setVendorView('dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <Header
        onDashboardClick={user?.role === 'owner' ? handleDashboardClick : undefined}
        onCustomersClick={user?.role === 'owner' ? handleCustomersClick : undefined}
        onProfileClick={user?.role === 'owner' ? handleProfileClick : undefined}
        onEmployeeClick={user?.role === 'owner' ? handleEmployeeClick : undefined}
        onVendorClick={user?.role === 'owner' ? handleVendorClick : undefined}
        onDesignClick={user?.role === 'owner' ? handleDesignClick : undefined}
        onPaymentClick={user?.role === 'owner' ? handlePaymentClick : undefined}
        onDeliveryChallanClick={user?.role === 'owner' ? handleDeliveryChallanClick : undefined}
        onGoodsReceiptClick={user?.role === 'owner' ? handleGoodsReceiptClick : undefined}
        onEmployeeProfileClick={employee ? handleEmployeeProfileClick : undefined}
        onVendorProfileClick={vendor ? handleVendorProfileClick : undefined}
        onNotificationsClick={handleNotificationsClick}
      />
      {user?.role === 'owner' && adminView === 'dashboard' && <OwnerDashboard key={dashboardKey} initialTab={dashboardTab} />}
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
      {user?.role === 'owner' && adminView === 'notifications' && (
        <NotificationsPage onBack={handleNotificationsBack} />
      )}
      {user?.role === 'tailor' && <TailorDashboard />}
      {user?.role === 'customer' && <CustomerDashboard />}
      {employee && employeeView === 'dashboard' && employee.role === 'tailor' && <TailorDashboardFirestore />}
      {employee && employeeView === 'dashboard' && employee.role !== 'tailor' && <EmployeeDashboard />}
      {employee && employeeView === 'profile' && <EmployeeProfile onBack={handleEmployeeBackToDashboard} />}
      {employee && employeeView === 'notifications' && <NotificationsPage onBack={handleNotificationsBack} />}
      {vendor && vendorView === 'dashboard' && <JobWorkTailorDashboard />}
      {vendor && vendorView === 'profile' && <TailorProfile vendorId={vendor.tailorCode} onBack={handleVendorBackToDashboard} />}
      {vendor && vendorView === 'notifications' && <NotificationsPage onBack={handleNotificationsBack} />}
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

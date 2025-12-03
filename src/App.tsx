import { useState, useCallback, lazy, Suspense } from 'react';
import { LanguageProvider } from '@/hooks/use-language';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { Login } from '@/components/Login';
import { Header } from '@/components/Header';
import { NetworkStatus } from '@/components/NetworkStatus';
import { Toaster } from '@/components/ui/sonner';
import { AppLoader } from '@/components/Loader';
import { useHardwareBackButton, usePreventDefaultTouchBehaviors } from '@/hooks/use-mobile-app';

// Lazy load heavy components for better initial load performance
const OwnerDashboard = lazy(() => import('@/components/OwnerDashboard').then(m => ({ default: m.OwnerDashboard })));
const TailorDashboard = lazy(() => import('@/components/TailorDashboard').then(m => ({ default: m.TailorDashboard })));
const TailorDashboardFirestore = lazy(() => import('@/components/TailorDashboardFirestore').then(m => ({ default: m.TailorDashboardFirestore })));
const CustomerDashboard = lazy(() => import('@/components/CustomerDashboard').then(m => ({ default: m.CustomerDashboard })));
const JobWorkTailorDashboard = lazy(() => import('@/components/JobWorkTailorDashboard').then(m => ({ default: m.JobWorkTailorDashboard })));
const InstallPrompt = lazy(() => import('@/components/InstallPrompt').then(m => ({ default: m.InstallPrompt })));
const SeedData = lazy(() => import('@/components/SeedData').then(m => ({ default: m.SeedData })));
const CompanyProfile = lazy(() => import('@/components/CompanyProfileFirestore').then(m => ({ default: m.CompanyProfileFirestore })));
const EmployeeManagement = lazy(() => import('@/components/EmployeeManagementFirestore').then(m => ({ default: m.EmployeeManagementFirestore })));
const VendorManagement = lazy(() => import('@/components/VendorManagementFirestore').then(m => ({ default: m.VendorManagementFirestore })));
const EmployeeProfile = lazy(() => import('@/components/EmployeeProfile').then(m => ({ default: m.EmployeeProfile })));
const EmployeeDashboard = lazy(() => import('@/components/EmployeeDashboard').then(m => ({ default: m.EmployeeDashboard })));
const TailorProfile = lazy(() => import('@/components/TailorProfile').then(m => ({ default: m.TailorProfile })));
const DesignManagement = lazy(() => import('@/components/DesignManagement').then(m => ({ default: m.DesignManagement })));
const DeliveryChallan = lazy(() => import('@/components/DeliveryChallan').then(m => ({ default: m.DeliveryChallan })));
const GoodsReceipt = lazy(() => import('@/components/GoodsReceipt').then(m => ({ default: m.GoodsReceipt })));
const Payment = lazy(() => import('@/components/Payment').then(m => ({ default: m.Payment })));
const NotificationsPage = lazy(() => import('@/components/NotificationsPage').then(m => ({ default: m.NotificationsPage })));

// DevKeyboard is ONLY for development testing on desktop browsers
// It is completely excluded from production/mobile builds
const isDev = import.meta.env.DEV && !((window as any).Capacitor);
const DevKeyboard = isDev 
  ? lazy(() => import('@/components/DevKeyboard').then(m => ({ default: m.DevKeyboard })))
  : () => null;

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
  const [selectedOrderForDC, setSelectedOrderForDC] = useState<string | undefined>(); // Pre-selected order for Delivery Challan

  // Mobile app features
  usePreventDefaultTouchBehaviors();

  // Handle hardware back button (Android)
  const handleHardwareBack = useCallback(() => {
    // Return true if we handled the back press, false to allow default behavior
    
    // For admin users
    if (user?.role === 'owner') {
      if (adminView !== 'dashboard') {
        setAdminView('dashboard');
        setSelectedOrderForDC(undefined);
        return true;
      }
    }
    
    // For employee users
    if (employee) {
      if (employeeView !== 'dashboard') {
        setEmployeeView('dashboard');
        return true;
      }
    }
    
    // For vendor users
    if (vendor) {
      if (vendorView !== 'dashboard') {
        setVendorView('dashboard');
        return true;
      }
    }
    
    // Not handled - allow default back behavior (exit app or go to previous page)
    return false;
  }, [user, employee, vendor, adminView, employeeView, vendorView]);

  useHardwareBackButton(handleHardwareBack);

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
    <div className="min-h-screen bg-background pb-20 md:pb-6 native-scroll">
      {/* Network status banner */}
      <NetworkStatus />
      
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
      
      {/* Wrap lazy-loaded components with Suspense for better loading UX */}
      <Suspense fallback={<AppLoader />}>
        {user?.role === 'owner' && adminView === 'dashboard' && (
          <OwnerDashboard 
            key={dashboardKey} 
            initialTab={dashboardTab}
            onNavigateToDeliveryChallan={(orderId) => {
              setSelectedOrderForDC(orderId);
              setAdminView('delivery-challan');
            }}
          />
        )}
        {user?.role === 'owner' && adminView === 'profile' && <CompanyProfile onBack={handleBackToDashboard} />}
        {user?.role === 'owner' && adminView === 'employees' && <EmployeeManagement onBack={handleBackToDashboard} />}
        {user?.role === 'owner' && adminView === 'vendors' && <VendorManagement onBack={handleBackToDashboard} />}
        {user?.role === 'owner' && adminView === 'designs' && <DesignManagement onBack={handleBackToDashboard} />}
        {user?.role === 'owner' && adminView === 'payment' && (
          <Payment onBack={handleBackToDashboard} />
        )}
        {user?.role === 'owner' && adminView === 'delivery-challan' && (
          <DeliveryChallan 
            onBack={() => {
              setSelectedOrderForDC(undefined); // Clear the selected order on back
              handleBackToDashboard();
            }} 
            initialOrderId={selectedOrderForDC}
          />
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
      </Suspense>
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Suspense fallback={null}>
          <SeedData />
        </Suspense>
        <AppContent />
        <Toaster />
        {/* 🔧 DEV ONLY: Fake mobile keyboard for testing keyboard responsiveness */}
        {/* Automatically excluded on Capacitor/mobile builds */}
        {isDev && (
          <Suspense fallback={null}>
            <DevKeyboard />
          </Suspense>
        )}
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;

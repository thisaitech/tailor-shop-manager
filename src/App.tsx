import { useState, useCallback, useRef, lazy, Suspense } from 'react';
import { LanguageProvider } from '@/hooks/use-language';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { Login } from '@/components/Login';
import { Header } from '@/components/Header';
import { NetworkStatus } from '@/components/NetworkStatus';
import { Toaster } from '@/components/ui/sonner';
import { AppLoader } from '@/components/Loader';
import { useHardwareBackButton, usePreventDefaultTouchBehaviors } from '@/hooks/use-mobile-app';
import { DashboardFilter } from '@/components/DashboardStats';
import type { EmployeeDashboardView } from '@/components/EmployeeDashboard';
import type { VendorDashboardView } from '@/components/JobWorkTailorDashboard';

// Lazy load heavy components for better initial load performance
const OwnerDashboard = lazy(() => import('@/components/OwnerDashboard').then(m => ({ default: m.OwnerDashboard })));
const TailorDashboard = lazy(() => import('@/components/TailorDashboard').then(m => ({ default: m.TailorDashboard })));
const TailorDashboardFirestore = lazy(() => import('@/components/TailorDashboardFirestore').then(m => ({ default: m.TailorDashboardFirestore })));
const CustomerDashboard = lazy(() => import('@/components/CustomerDashboard').then(m => ({ default: m.CustomerDashboard })));
const JobWorkTailorDashboard = lazy(() => import('@/components/JobWorkTailorDashboard').then(m => ({ default: m.JobWorkTailorDashboard })));
const InstallPrompt = lazy(() => import('@/components/InstallPrompt').then(m => ({ default: m.InstallPrompt })));
const CompanyProfile = lazy(() => import('@/components/CompanyProfileFirestore').then(m => ({ default: m.CompanyProfileFirestore })));
const EmployeeManagement = lazy(() => import('@/components/EmployeeManagementFirestore').then(m => ({ default: m.EmployeeManagementFirestore })));
const VendorManagement = lazy(() => import('@/components/VendorManagementFirestore').then(m => ({ default: m.VendorManagementFirestore })));
const AdminManagement = lazy(() => import('@/components/AdminManagement').then(m => ({ default: m.AdminManagement })));
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

type AdminView = 'dashboard' | 'profile' | 'employees' | 'vendors' | 'admins' | 'designs' | 'payment' | 'delivery-challan' | 'goods-receipt' | 'notifications';
type EmployeeView = 'dashboard' | 'profile' | 'notifications';
type VendorView = 'dashboard' | 'profile' | 'notifications';

// Navigation history entry type for tracking navigation state
type NavigationEntry = {
  adminView?: AdminView;
  dashboardTab?: string;
  dashboardFilter?: DashboardFilter;
  employeeView?: EmployeeView;
  vendorView?: VendorView;
};

function AppContent() {
  const { user, employee, vendor, admin, isAuthenticated, isLoading, isStorageReady } = useAuth();
  const [adminView, setAdminView] = useState<AdminView>('dashboard');
  const [dashboardTab, setDashboardTab] = useState<string>('dashboard');
  const [dashboardKey, setDashboardKey] = useState(0); // Key to force remount and reset dashboard state
  const [employeeView, setEmployeeView] = useState<EmployeeView>('dashboard');
  const [vendorView, setVendorView] = useState<VendorView>('dashboard');
  const [selectedOrderForDC, setSelectedOrderForDC] = useState<string | undefined>(); // Pre-selected order for Delivery Challan
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<string | undefined>(); // Pre-selected order for Payment

  // Dashboard filter state (for owner dashboard internal navigation)
  const [dashboardFilter, setDashboardFilter] = useState<DashboardFilter>('all');

  // Internal view state for Employee Dashboard
  const [employeeInternalView, setEmployeeInternalView] = useState<EmployeeDashboardView>('dashboard');

  // Internal view state for Vendor Dashboard
  const [vendorInternalView, setVendorInternalView] = useState<VendorDashboardView>('dashboard');

  // Track if OwnerDashboard has an internal detail view open (customer/order view)
  const [hasOwnerInternalView, setHasOwnerInternalView] = useState(false);
  const [closeOwnerInternalView, setCloseOwnerInternalView] = useState(false);

  // Track if admin view components (employees, vendors, payment, etc.) have internal dialogs open
  const [hasAdminViewInternalDialog, setHasAdminViewInternalDialog] = useState(false);
  const [closeAdminViewInternalDialog, setCloseAdminViewInternalDialog] = useState(false);

  // Navigation history stack for proper back button behavior
  const navigationHistory = useRef<NavigationEntry[]>([]);

  // Mobile app features
  usePreventDefaultTouchBehaviors();

  // Check if current user is an admin (from admins collection or owner role)
  const isAdminUser = user?.role === 'owner' || admin !== null;

  // Root user phone number - only this user can create new admins/shops
  const ROOT_USER_PHONE = '9486229273';
  const isRootUser = user?.phone === ROOT_USER_PHONE || user?.username === ROOT_USER_PHONE;

  // Push current state to navigation history
  const pushNavigationHistory = useCallback(() => {
    const currentState: NavigationEntry = {};

    if (isAdminUser) {
      currentState.adminView = adminView;
      currentState.dashboardTab = dashboardTab;
      currentState.dashboardFilter = dashboardFilter;
    } else if (employee) {
      currentState.employeeView = employeeView;
    } else if (vendor) {
      currentState.vendorView = vendorView;
    }

    navigationHistory.current.push(currentState);
    console.log('[Navigation] Pushed state:', currentState, 'History length:', navigationHistory.current.length);
  }, [isAdminUser, employee, vendor, adminView, dashboardTab, dashboardFilter, employeeView, vendorView]);

  // Handle hardware back button (Android)
  const handleHardwareBack = useCallback(() => {
    // Return true if we handled the back press, false to allow default behavior (minimize app)
    console.log('[BackButton] Handler called. History length:', navigationHistory.current.length);

    // For admin users (both owner role and admin from admins collection)
    if (isAdminUser) {
      // First check if there's an internal detail view open (customer view, order view)
      if (adminView === 'dashboard' && hasOwnerInternalView) {
        console.log('[BackButton] Going back from owner internal detail view');
        setCloseOwnerInternalView(true);
        return true;
      }

      // Check if we're on a non-dashboard filter view (e.g., New Orders, Ready to Deliver, etc.)
      if (adminView === 'dashboard' && dashboardFilter !== 'all') {
        console.log('[BackButton] Going back from dashboard filter view to main dashboard');
        setDashboardFilter('all');
        return true;
      }

      // Check if we're on a non-dashboard tab
      if (adminView === 'dashboard' && dashboardTab !== 'dashboard') {
        console.log('[BackButton] Going back from tab to dashboard tab');
        setDashboardTab('dashboard');
        setDashboardKey(prev => prev + 1);
        return true;
      }

      // If on a different admin view (profile, employees, etc.)
      if (adminView !== 'dashboard') {
        // First check if there's an internal dialog open in the admin view component
        if (hasAdminViewInternalDialog) {
          console.log('[BackButton] Closing internal dialog in admin view component');
          setCloseAdminViewInternalDialog(true);
          return true;
        }
        // No internal dialog, go back to dashboard
        console.log('[BackButton] Going back from admin view to dashboard');
        setAdminView('dashboard');
        setSelectedOrderForDC(undefined);
        setSelectedOrderForPayment(undefined);
        return true;
      }

      // At the root dashboard - allow app to minimize/exit
      console.log('[BackButton] At root dashboard, allowing default behavior');
      return false;
    }

    // For employee users
    if (employee) {
      // First check internal view of EmployeeDashboard
      if (employeeView === 'dashboard' && employeeInternalView !== 'dashboard') {
        console.log('[BackButton] Going back from employee internal view to dashboard');
        setEmployeeInternalView('dashboard');
        return true;
      }
      // Then check top-level employee view
      if (employeeView !== 'dashboard') {
        console.log('[BackButton] Going back from employee view to dashboard');
        setEmployeeView('dashboard');
        return true;
      }
      // At employee dashboard root - allow app to minimize/exit
      return false;
    }

    // For vendor users
    if (vendor) {
      // First check internal view of JobWorkTailorDashboard
      if (vendorView === 'dashboard' && vendorInternalView !== 'dashboard') {
        console.log('[BackButton] Going back from vendor internal view to dashboard');
        setVendorInternalView('dashboard');
        return true;
      }
      // Then check top-level vendor view
      if (vendorView !== 'dashboard') {
        console.log('[BackButton] Going back from vendor view to dashboard');
        setVendorView('dashboard');
        return true;
      }
      // At vendor dashboard root - allow app to minimize/exit
      return false;
    }

    // Not handled - allow default back behavior (exit app or go to previous page)
    return false;
  }, [isAdminUser, employee, vendor, adminView, dashboardTab, dashboardFilter, hasOwnerInternalView, hasAdminViewInternalDialog, employeeView, employeeInternalView, vendorView, vendorInternalView]);

  useHardwareBackButton(handleHardwareBack);

  // Show loader during initial app loading
  if (isLoading || !isStorageReady) {
    return <AppLoader />;
  }

  if (!isAuthenticated || (!user && !employee && !vendor && !admin)) {
    return <Login />;
  }

  const handleDashboardClick = () => {
    // Reset ALL state to go to the main dashboard view
    setAdminView('dashboard');
    setDashboardTab('dashboard');
    setDashboardFilter('all'); // Reset filter to show main dashboard with cards
    setDashboardKey(prev => prev + 1); // Force remount to reset all internal state
    setSelectedOrderForDC(undefined);
    setSelectedOrderForPayment(undefined);
    // Reset internal view tracking states
    setHasOwnerInternalView(false);
    setCloseOwnerInternalView(false);
    setHasAdminViewInternalDialog(false);
    setCloseAdminViewInternalDialog(false);
    // Clear navigation history when explicitly going to dashboard
    navigationHistory.current = [];
  };

  const handleCustomersClick = () => {
    setAdminView('dashboard');
    setDashboardTab('customers');
    setDashboardFilter('all');
    setDashboardKey(prev => prev + 1); // Force remount to show customers tab with loader
    // Reset internal view tracking states
    setHasOwnerInternalView(false);
    setCloseOwnerInternalView(false);
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

  const handleAdminClick = () => {
    setAdminView('admins');
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
    if (isAdminUser) {
      setAdminView('notifications');
    } else if (employee) {
      setEmployeeView('notifications');
    } else if (vendor) {
      setVendorView('notifications');
    }
  };

  const handleNotificationsBack = () => {
    if (isAdminUser) {
      setAdminView('dashboard');
    } else if (employee) {
      setEmployeeView('dashboard');
    } else if (vendor) {
      setVendorView('dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      {/* Status bar area above header - matches header gradient */}
      <div 
        className="fixed top-0 left-0 right-0 z-[-1] pointer-events-none"
        style={{ 
          height: 'env(safe-area-inset-top, 24px)',
          minHeight: '24px',
          background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #8b5cf6 100%)'
        }}
      />
      
      {/* Network status banner */}
      <NetworkStatus />
      
      <Header
        onDashboardClick={isAdminUser ? handleDashboardClick : undefined}
        onCustomersClick={isAdminUser ? handleCustomersClick : undefined}
        onProfileClick={isAdminUser ? handleProfileClick : undefined}
        onEmployeeClick={isAdminUser ? handleEmployeeClick : undefined}
        onVendorClick={isAdminUser ? handleVendorClick : undefined}
        onAdminClick={isRootUser ? handleAdminClick : undefined}
        onDesignClick={isAdminUser ? handleDesignClick : undefined}
        onPaymentClick={isAdminUser ? handlePaymentClick : undefined}
        onDeliveryChallanClick={isAdminUser ? handleDeliveryChallanClick : undefined}
        onGoodsReceiptClick={isAdminUser ? handleGoodsReceiptClick : undefined}
        onEmployeeProfileClick={employee ? handleEmployeeProfileClick : undefined}
        onVendorProfileClick={vendor ? handleVendorProfileClick : undefined}
        onNotificationsClick={handleNotificationsClick}
        showBackButton={
          // Show back button if on any non-root view
          (isAdminUser && (adminView !== 'dashboard' || dashboardTab !== 'dashboard' || dashboardFilter !== 'all' || hasOwnerInternalView)) ||
          (!!employee && (employeeView !== 'dashboard' || employeeInternalView !== 'dashboard')) ||
          (!!vendor && (vendorView !== 'dashboard' || vendorInternalView !== 'dashboard'))
        }
        onBackClick={handleHardwareBack}
      />
      
      {/* Wrap lazy-loaded components with Suspense for better loading UX */}
      <Suspense fallback={<AppLoader />}>
        {isAdminUser && adminView === 'dashboard' && (
          <OwnerDashboard
            key={dashboardKey}
            initialTab={dashboardTab}
            initialFilter={dashboardFilter}
            onFilterChange={setDashboardFilter}
            onTabChange={setDashboardTab}
            onInternalViewChange={setHasOwnerInternalView}
            closeInternalView={closeOwnerInternalView}
            onCloseInternalViewHandled={() => {
              setCloseOwnerInternalView(false);
              setHasOwnerInternalView(false);
            }}
            onNavigateToDeliveryChallan={(orderId) => {
              setSelectedOrderForDC(orderId);
              setAdminView('delivery-challan');
            }}
            onNavigateToPayment={(orderId) => {
              setSelectedOrderForPayment(orderId);
              setAdminView('payment');
            }}
          />
        )}
        {isAdminUser && adminView === 'profile' && (
          <CompanyProfile
            onBack={handleBackToDashboard}
            closeInternalView={closeAdminViewInternalDialog}
            onCloseInternalViewHandled={() => {
              setCloseAdminViewInternalDialog(false);
              setHasAdminViewInternalDialog(false);
            }}
            onInternalViewChange={setHasAdminViewInternalDialog}
          />
        )}
        {isAdminUser && adminView === 'employees' && (
          <EmployeeManagement
            onBack={handleBackToDashboard}
            closeInternalView={closeAdminViewInternalDialog}
            onCloseInternalViewHandled={() => {
              setCloseAdminViewInternalDialog(false);
              setHasAdminViewInternalDialog(false);
            }}
            onInternalViewChange={setHasAdminViewInternalDialog}
          />
        )}
        {isAdminUser && adminView === 'vendors' && (
          <VendorManagement
            onBack={handleBackToDashboard}
            closeInternalView={closeAdminViewInternalDialog}
            onCloseInternalViewHandled={() => {
              setCloseAdminViewInternalDialog(false);
              setHasAdminViewInternalDialog(false);
            }}
            onInternalViewChange={setHasAdminViewInternalDialog}
          />
        )}
        {isRootUser && adminView === 'admins' && (
          <AdminManagement onBack={handleBackToDashboard} />
        )}
        {isAdminUser && adminView === 'designs' && (
          <DesignManagement
            onBack={handleBackToDashboard}
            closeInternalView={closeAdminViewInternalDialog}
            onCloseInternalViewHandled={() => {
              setCloseAdminViewInternalDialog(false);
              setHasAdminViewInternalDialog(false);
            }}
            onInternalViewChange={setHasAdminViewInternalDialog}
          />
        )}
        {isAdminUser && adminView === 'payment' && (
          <Payment
            onBack={() => {
              setSelectedOrderForPayment(undefined); // Clear the selected order on back
              handleBackToDashboard();
            }}
            initialOrderId={selectedOrderForPayment}
            closeInternalView={closeAdminViewInternalDialog}
            onCloseInternalViewHandled={() => {
              setCloseAdminViewInternalDialog(false);
              setHasAdminViewInternalDialog(false);
            }}
            onInternalViewChange={setHasAdminViewInternalDialog}
          />
        )}
        {isAdminUser && adminView === 'delivery-challan' && (
          <DeliveryChallan
            onBack={() => {
              setSelectedOrderForDC(undefined); // Clear the selected order on back
              handleBackToDashboard();
            }}
            initialOrderId={selectedOrderForDC}
            closeInternalView={closeAdminViewInternalDialog}
            onCloseInternalViewHandled={() => {
              setCloseAdminViewInternalDialog(false);
              setHasAdminViewInternalDialog(false);
            }}
            onInternalViewChange={setHasAdminViewInternalDialog}
          />
        )}
        {isAdminUser && adminView === 'goods-receipt' && (
          <GoodsReceipt
            onBack={handleBackToDashboard}
            closeInternalView={closeAdminViewInternalDialog}
            onCloseInternalViewHandled={() => {
              setCloseAdminViewInternalDialog(false);
              setHasAdminViewInternalDialog(false);
            }}
            onInternalViewChange={setHasAdminViewInternalDialog}
          />
        )}
        {isAdminUser && adminView === 'notifications' && (
          <NotificationsPage onBack={handleNotificationsBack} />
        )}
        {user?.role === 'tailor' && <TailorDashboard />}
        {user?.role === 'customer' && <CustomerDashboard />}
        {employee && employeeView === 'dashboard' && employee.role === 'tailor' && <TailorDashboardFirestore />}
        {employee && employeeView === 'dashboard' && employee.role !== 'tailor' && (
          <EmployeeDashboard
            initialView={employeeInternalView}
            onViewChange={setEmployeeInternalView}
          />
        )}
        {employee && employeeView === 'profile' && <EmployeeProfile onBack={handleEmployeeBackToDashboard} />}
        {employee && employeeView === 'notifications' && <NotificationsPage onBack={handleNotificationsBack} />}
        {vendor && vendorView === 'dashboard' && (
          <JobWorkTailorDashboard
            initialView={vendorInternalView}
            onViewChange={setVendorInternalView}
          />
        )}
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
        {/* Seed data is handled by the auth provider to guarantee it is ready before login */}
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

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/EmptyState';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Package,
  ClockCounterClockwise,
  CheckCircle,
  ListChecks,
  ArrowLeft,
  MagnifyingGlass,
  DotsThree,
  Eye,
  Calendar,
  Spinner,
  User,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { OrderAllotment } from '@/lib/types';
import { getOrderAllotmentsByEmployee } from '@/lib/firestore/orderAllotmentService';
import { getCustomerById } from '@/lib/firestore/customerService';
import { format } from 'date-fns';
import { JobWorkOrderDetailsDialog } from './JobWorkOrderDetailsDialog';
import { EmployeeProfile } from './EmployeeProfile';

interface OrderWithCustomer extends OrderAllotment {
  customerName?: string;
}

export type EmployeeDashboardView = 'dashboard' | 'assigned' | 'in_progress' | 'completed' | 'all' | 'profile';
type DashboardView = EmployeeDashboardView;

const ITEMS_PER_PAGE = 6;

interface EmployeeDashboardProps {
  initialView?: DashboardView;
  onViewChange?: (view: DashboardView) => void;
}

export function EmployeeDashboard({ initialView = 'dashboard', onViewChange }: EmployeeDashboardProps = {}) {
  const { employee } = useAuth();
  const [orders, setOrders] = useState<OrderWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentViewInternal, setCurrentViewInternal] = useState<DashboardView>(initialView);

  // Use internal state for reading
  const currentView = currentViewInternal;

  // Wrapper to sync view changes with parent
  const setCurrentView = (view: DashboardView) => {
    setCurrentViewInternal(view);
    onViewChange?.(view);
  };

  // Sync view when initialView prop changes (e.g., from back button press)
  useEffect(() => {
    setCurrentViewInternal(initialView);
  }, [initialView]);

  const [selectedOrderNo, setSelectedOrderNo] = useState<string | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const assignedOrders = orders.filter(o => o.status === 'allotted' || o.orderStatus === 'open').length;
  const inProgressOrders = orders.filter(o => o.status === 'in_progress' || o.orderStatus === 'in-progress').length;
  const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'delivered').length;
  const totalOrders = orders.length;

  useEffect(() => {
    loadOrders();
  }, [employee]);

  const loadOrders = async () => {
    if (!employee?.employeeCode) return;

    try {
      setLoading(true);
      const allotments = await getOrderAllotmentsByEmployee(employee.employeeCode);

      const ordersWithCustomers = await Promise.all(
        allotments.map(async (order) => {
          try {
            const customer = await getCustomerById(order.customerId);
            return {
              ...order,
              customerName: customer?.name || 'Unknown',
            };
          } catch {
            return {
              ...order,
              customerName: 'Unknown',
            };
          }
        })
      );

      setOrders(ordersWithCustomers);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderRowClick = (order: OrderWithCustomer) => {
    if (!order.serviceOrderNo) {
      toast.error('Service Order Number not found');
      return;
    }
    setSelectedOrderNo(order.serviceOrderNo);
    setShowOrderDetails(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'assigned': return 'Assigned Orders';
      case 'in_progress': return 'In Progress Orders';
      case 'completed': return 'Completed Orders';
      case 'all': return 'All Orders';
      case 'profile': return 'My Profile';
      default: return 'Employee Dashboard';
    }
  };

  const getFilteredOrders = (): OrderWithCustomer[] => {
    let filtered = orders;

    switch (currentView) {
      case 'assigned':
        filtered = orders.filter(o => o.status === 'allotted' || o.orderStatus === 'open');
        break;
      case 'in_progress':
        filtered = orders.filter(o => o.status === 'in_progress' || o.orderStatus === 'in-progress');
        break;
      case 'completed':
        filtered = orders.filter(o => o.status === 'completed' || o.status === 'delivered');
        break;
      case 'all':
        filtered = orders;
        break;
      case 'dashboard':
        filtered = orders.filter(o =>
          o.status !== 'completed' &&
          o.status !== 'delivered' &&
          (o.status === 'allotted' || o.status === 'in_progress' || o.orderStatus === 'open' || o.orderStatus === 'in-progress')
        );
        break;
    }

    if (search) {
      filtered = filtered.filter((order) =>
        order.jobWorkNo?.toLowerCase().includes(search.toLowerCase()) ||
        order.customerName?.toLowerCase().includes(search.toLowerCase()) ||
        order.serviceOrderNo?.toLowerCase().includes(search.toLowerCase()) ||
        order.dressType?.toLowerCase().includes(search.toLowerCase())
      );
    }

    return filtered.sort((a, b) => {
      const aDate = a.assignedDate || a.jobWorkDate || a.createdAt;
      const bDate = b.assignedDate || b.jobWorkDate || b.createdAt;
      return bDate - aDate;
    });
  };

  const getStatusBadge = (order: OrderWithCustomer) => {
    const currentStatus = order.status || (order.orderStatus === 'open' ? 'allotted' : order.orderStatus === 'in-progress' ? 'in_progress' : 'unknown');

    switch (currentStatus) {
      case 'allotted':
        return <Badge className="text-[10px] bg-blue-500 text-white">Assigned</Badge>;
      case 'in_progress':
        return <Badge className="text-[10px] bg-orange-500 text-white">In Progress</Badge>;
      case 'completed':
      case 'delivered':
        return <Badge className="text-[10px] bg-green-500 text-white">Completed</Badge>;
      default:
        return <Badge className="text-[10px] bg-gray-500 text-white">{currentStatus}</Badge>;
    }
  };

  const filteredOrders = getFilteredOrders();
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const showPagination = filteredOrders.length > ITEMS_PER_PAGE;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, currentView]);

  const dashStats = [
    {
      label: 'Assigned Orders',
      value: assignedOrders,
      icon: Package,
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      bgGradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #bfdbfe 100%)',
      borderColor: 'rgba(59, 130, 246, 0.5)',
      view: 'assigned' as DashboardView,
    },
    {
      label: 'In Progress',
      value: inProgressOrders,
      icon: ClockCounterClockwise,
      gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
      bgGradient: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fed7aa 100%)',
      borderColor: 'rgba(249, 115, 22, 0.5)',
      view: 'in_progress' as DashboardView,
    },
    {
      label: 'Completed',
      value: completedOrders,
      icon: CheckCircle,
      gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
      bgGradient: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)',
      borderColor: 'rgba(34, 197, 94, 0.5)',
      view: 'completed' as DashboardView,
    },
    {
      label: 'Total Orders',
      value: totalOrders,
      icon: ListChecks,
      gradient: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #6366f1 100%)',
      bgGradient: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 50%, #e0e7ff 100%)',
      borderColor: 'rgba(196, 181, 253, 0.5)',
      view: 'all' as DashboardView,
    },
    {
      label: 'My Profile',
      value: '',
      icon: User,
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      bgGradient: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 50%, #ede9fe 100%)',
      borderColor: 'rgba(139, 92, 246, 0.5)',
      view: 'profile' as DashboardView,
    },
  ];

  if (!employee) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading employee data...</p>
      </div>
    );
  }

  if (currentView === 'profile') {
    return <EmployeeProfile onBack={() => setCurrentView('dashboard')} />;
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Spinner size={48} className="animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        {currentView !== 'dashboard' && (
          <Button variant="outline" size="icon" onClick={() => setCurrentView('dashboard')} className="h-9 w-9">
            <ArrowLeft size={20} />
          </Button>
        )}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">
            {currentView === 'dashboard' ? 'Employee Dashboard' : getViewTitle()}
          </h1>
          <p className="text-xs text-muted-foreground">
            Welcome, {employee.name}
          </p>
        </div>
      </div>

      {currentView === 'dashboard' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {dashStats.map((stat, index) => (
            <div
              key={index}
              className={`cursor-pointer hover:shadow-lg transition-all rounded-xl border-2 p-4 animate-on-load animate-fade-slide-up stagger-${index + 1}`}
              style={{
                background: stat.bgGradient,
                borderColor: stat.borderColor,
                boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.1), 0 2px 6px -2px rgba(0, 0, 0, 0.08)',
              }}
              onClick={() => setCurrentView(stat.view)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs font-medium text-gray-600 mb-1">
                    {stat.label}
                  </p>
                  {stat.value !== '' && (
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stat.value}</p>
                  )}
                </div>
                <div
                  className="p-2 sm:p-3 rounded-xl shadow-md"
                  style={{ background: stat.gradient }}
                >
                  <stat.icon size={20} className="text-white sm:w-6 sm:h-6" weight="duotone" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {currentView !== 'dashboard' && (
        <div className="relative">
          <MagnifyingGlass
            size={18}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="text"
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 w-full sm:max-w-md"
          />
        </div>
      )}

      <div className="space-y-4">
        <div className="flex justify-between items-center h-9">
          <h2 className="text-sm md:text-xl font-semibold line-clamp-1">
            {currentView === 'dashboard' ? 'Recent Orders' : getViewTitle()}
          </h2>
          <span className="text-xs sm:text-sm text-muted-foreground">
            {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
          </span>
        </div>

        {filteredOrders.length === 0 ? (
          <EmptyState
            icon={Package}
            title={search ? 'No orders found' : 'No orders yet'}
            description={search ? 'Try adjusting your search terms' : 'Orders assigned to you will appear here'}
          />
        ) : (
          <div
            className="p-3 sm:p-4 w-full max-w-full flex flex-col gap-4 overflow-hidden rounded-xl border shadow-md"
            style={{
              background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 50%, #e0e7ff 100%)',
              borderColor: 'rgba(196, 181, 253, 0.5)',
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {paginatedOrders.map((order, index) => {
                const displayDate = order.assignedDate || order.jobWorkDate || order.createdAt;

                return (
                  <div
                    key={order.id}
                    className={`rounded-xl border-2 hover:shadow-lg transition-all p-4 cursor-pointer w-full flex flex-row gap-4 shadow-sm animate-on-load animate-fade-slide-up stagger-${(index % 6) + 1}`}
                    style={{
                      background: 'linear-gradient(135deg, #ffffff 0%, #faf8ff 100%)',
                      borderColor: '#6A64F2',
                      boxShadow: '0 4px 12px -2px rgba(106, 100, 242, 0.2), 0 2px 6px -2px rgba(106, 100, 242, 0.15)',
                    }}
                    onClick={() => handleOrderRowClick(order)}
                  >
                    <div className="flex-shrink-0 flex items-center">
                      <div
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white font-bold text-sm"
                        style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #6366f1 100%)' }}
                      >
                        {getInitials(order.customerName || 'UN')}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                          {order.customerName}
                        </p>
                      </div>
                      <p className="text-[10px] sm:text-xs font-bold mb-1" style={{ color: '#6A64F2' }}>
                        {order.jobWorkNo || order.id}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-600 flex-wrap">
                        {order.dressType && (
                          <>
                            <span className="font-medium">{order.dressType}</span>
                            <span>•</span>
                          </>
                        )}
                        {getStatusBadge(order)}
                      </div>
                      <p className="text-[9px] sm:text-[10px] text-gray-500 mt-1">
                        <Calendar size={10} className="inline mr-1" />
                        {format(displayDate, 'dd MMM yyyy')}
                      </p>
                    </div>

                    <div className="flex-shrink-0 flex flex-col items-end justify-between gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 touch-manipulation">
                            <DotsThree size={20} weight="bold" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOrderRowClick(order); }} className="font-medium">
                            <Eye size={18} className="mr-2" weight="bold" />
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>

            {showPagination && (
              <div className="flex items-center justify-between pt-4 border-t border-purple-200">
                <p className="text-xs sm:text-sm text-gray-600">
                  Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredOrders.length)} of {filteredOrders.length}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8 px-3 text-xs"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 px-3 text-xs"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedOrderNo && (
        <JobWorkOrderDetailsDialog
          serviceOrderNo={selectedOrderNo}
          open={showOrderDetails}
          onOpenChange={setShowOrderDetails}
          onStatusUpdate={loadOrders}
        />
      )}
    </main>
  );
}

import { useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { Order, OrderStatus, InventoryItem, ServiceOrder, AdvancePayment, OrderAllotment } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MagnifyingGlass, Scissors, Plus, Warning, Phone, WhatsappLogo, CaretDown, CaretUp, Funnel } from '@phosphor-icons/react';
import { format, isPast, isToday, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { ServiceOrderForm } from './ServiceOrderForm';
import { PhotoGallery } from './PhotoGallery';
import { Customer, Tailor } from '@/lib/types';
import { sendWhatsAppMessage } from '@/lib/utils';

// Display status type for combined status from both collections
type DisplayStatus = 'pending' | 'in-progress' | 'delivered' | 'completed';
type ServiceOrderFilter = 'all' | 'in-progress' | 'pending' | 'delivered' | 'completed' | 'overdue';
type DateFilter = 'all' | 'exact' | 'range';

const ITEMS_PER_PAGE = 6;

interface OrderListProps {
  orders: Order[];
  serviceOrders?: ServiceOrder[];
  orderAllotments?: OrderAllotment[];
  customers: Customer[];
  tailors: Tailor[];
  inventory: InventoryItem[];
  onAddOrder: (order: {
    customerId: string;
    customerName: string;
    customerPhone: string;
    garmentTypes: string[];
    measurements?: any;
    fabricDetails: string;
    designNotes: string;
    fabricPhotos?: string[];
    designPhotos?: string[];
    assignedTailor: string;
    materialsUsed?: any[];
    deliveryDate: number;
  }) => void;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onAddServiceOrder: (
    order: Omit<ServiceOrder, 'id' | 'createdAt' | 'updatedAt'>,
    advancePayment?: Omit<AdvancePayment, 'id' | 'proformaInvoiceNo' | 'invoiceNo' | 'createdAt' | 'updatedAt'>
  ) => void;
  onCreateCustomer: () => void;
  hideAddButton?: boolean;
}

export function OrderList({
  orders,
  serviceOrders = [],
  orderAllotments = [],
  customers,
  tailors,
  inventory,
  onAddOrder,
  onUpdateStatus,
  onAddServiceOrder,
  onCreateCustomer,
  hideAddButton = false,
}: OrderListProps) {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [serviceOrderFilter, setServiceOrderFilter] = useState<ServiceOrderFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [exactDate, setExactDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  /**
   * Get the display status for a service order based on allotment status
   * Status logic:
   * - Not assigned → 'Pending'
   * - In progress → 'In Progress'
   * - Ready to deliver / Ready to dispatch → 'Delivered'
   * - Reassigned → 'Pending'
   * - Final payment completed → 'Completed'
   */
  const getDisplayStatus = (serviceOrder: ServiceOrder): DisplayStatus => {
    // Find the allotment for this service order (exclude reassigned orders)
    const allotment = orderAllotments.find(a => a.serviceOrderNo === serviceOrder.id && !a.reassigned);

    // If no allotment exists or order is reassigned → Pending
    if (!allotment) {
      return 'pending';
    }

    // Check allotment status fields
    // - status: used by job work tailors (vendors) - values: 'allotted', 'in_progress', 'stitched', 'rejected', 'delivered'
    // - orderStatus: used by employee tailors - values: 'open', 'in-progress', 'closed'
    // - serviceOrderStatus: status synced to service order - values: 'pending', 'in-progress', 'ready', 'delivered'
    const allotmentStatus = allotment.status; // Job work tailor status
    const orderTicketStatus = allotment.orderStatus; // Employee tailor status
    const serviceOrderStatus = allotment.serviceOrderStatus;

    // If final payment is completed → Completed
    // Check if serviceOrder.orderStatus is 'delivered' and payment is complete
    if (serviceOrder.orderStatus === 'delivered') {
      return 'completed';
    }

    // Ready to deliver or ready to dispatch → Delivered
    // Job work: status='stitched' or 'delivered'
    // Employee: serviceOrderStatus='ready'
    if (allotmentStatus === 'stitched' || allotmentStatus === 'delivered' || serviceOrderStatus === 'ready') {
      return 'delivered';
    }

    // In progress
    // Job work: status='in_progress'
    // Employee: orderStatus='in-progress'
    if (allotmentStatus === 'in_progress' || orderTicketStatus === 'in-progress') {
      return 'in-progress';
    }

    // Allotted but not started → Pending
    // Job work: status='allotted'
    // Employee: orderStatus='open'
    if (allotmentStatus === 'allotted' || orderTicketStatus === 'open') {
      return 'pending';
    }

    // Default to pending
    return 'pending';
  };

  const filteredOrders = (orders || []).filter((o) => {
    const matchesSearch =
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.customerPhone.includes(search) ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.assignedTailor.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Measurement category keywords for search
  const measurementCategories = ['shirt', 'pant', 'coat', 'chudithar', 'blouse', 'trouser', 'kurta', 'blazer'];

  // Check if order has measurements matching search term
  const hasMeasurementMatch = (measurements: any, searchTerm: string): boolean => {
    if (!measurements) return false;
    const searchLower = searchTerm.toLowerCase();

    // Check if search matches any measurement category name
    return Object.keys(measurements).some((category) => {
      const categoryLower = category.toLowerCase();
      // Match category name (e.g., "shirt", "pant", "chuditharTop" -> "chudithar")
      if (categoryLower.includes(searchLower) || searchLower.includes(categoryLower)) {
        // Only match if that category has actual data
        const categoryData = measurements[category];
        return categoryData && Object.values(categoryData).some((v) => v !== undefined && v !== null && v !== '');
      }
      return false;
    });
  };

  // Date filter logic
  const getDateRange = (filter: DateFilter): { start: Date; end: Date } | null => {
    switch (filter) {
      case 'exact':
        if (!exactDate) return null;
        const exact = new Date(exactDate);
        return { start: startOfDay(exact), end: endOfDay(exact) };
      case 'range':
        if (!startDate || !endDate) return null;
        return { start: startOfDay(new Date(startDate)), end: endOfDay(new Date(endDate)) };
      default:
        return null;
    }
  };

  // Check if service order is overdue
  const isServiceOrderOverdue = (order: ServiceOrder): boolean => {
    return !!(order.expectedDeliveryDate &&
           order.orderStatus !== 'delivered' &&
           isPast(new Date(order.expectedDeliveryDate)));
  };

  // Filter service orders based on search, status, and date
  const filteredServiceOrders = (serviceOrders || []).filter((o) => {
    // Search filter
    const searchLower = search.toLowerCase();
    const matchesSearch = !search.trim() ||
      o.customerName.toLowerCase().includes(searchLower) ||
      o.customerId.toLowerCase().includes(searchLower) ||
      o.id.toLowerCase().includes(searchLower) ||
      o.orderCategory.toLowerCase().includes(searchLower) ||
      hasMeasurementMatch(o.measurements, searchLower);

    // Status filter using display status
    let matchesStatus = true;
    if (serviceOrderFilter !== 'all') {
      if (serviceOrderFilter === 'overdue') {
        matchesStatus = isServiceOrderOverdue(o);
      } else {
        // Use getDisplayStatus for filtering
        matchesStatus = getDisplayStatus(o) === serviceOrderFilter;
      }
    }

    // Date filter
    const dateRange = getDateRange(dateFilter);
    const matchesDate = !dateRange || (o.createdAt && isWithinInterval(new Date(o.createdAt), dateRange));

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Get count for each filter based on display status
  const getServiceOrderFilterCount = (filter: ServiceOrderFilter) => {
    if (filter === 'all') return (serviceOrders || []).length;
    if (filter === 'overdue') {
      return (serviceOrders || []).filter(o => isServiceOrderOverdue(o)).length;
    }
    // Use getDisplayStatus for filtering counts
    return (serviceOrders || []).filter(o => getDisplayStatus(o) === filter).length;
  };

  const serviceOrderFilterOptions: { value: ServiceOrderFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'completed', label: 'Completed' },
    { value: 'overdue', label: 'Overdue' },
  ];

  const dateFilterOptions: { value: DateFilter; label: string }[] = [
    { value: 'all', label: 'All Orders' },
    { value: 'exact', label: 'Exact Date' },
    { value: 'range', label: 'Date Range' },
  ];

  const FilterButtons = ({ inModal = false }: { inModal?: boolean }) => (
    <div className="space-y-3">
      {/* Status Filter */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Filter by Status</label>
        <div className={`flex gap-1.5 ${inModal ? 'flex-wrap' : 'overflow-x-auto pb-1 scrollbar-hide'}`}>
          {serviceOrderFilterOptions.map((option) => (
            <Button
              key={option.value}
              variant={serviceOrderFilter === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                handleFilterChange(option.value);
              }}
              className={`text-xs font-semibold whitespace-nowrap touch-manipulation h-8 px-2.5 ${
                option.value === 'overdue' && getServiceOrderFilterCount('overdue') > 0
                  ? 'border-destructive text-destructive'
                  : ''
              }`}
            >
              {option.label} ({getServiceOrderFilterCount(option.value)})
            </Button>
          ))}
        </div>
      </div>

      {/* Date Filter */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Filter by Date</label>
        {/* Date Filter Type Selection */}
        <div className={`flex gap-1.5 mb-3 ${inModal ? 'flex-wrap' : 'overflow-x-auto pb-1 scrollbar-hide'}`}>
          {dateFilterOptions.map((option) => (
            <Button
              key={option.value}
              variant={dateFilter === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                handleDateFilterChange(option.value);
              }}
              className="text-xs font-semibold whitespace-nowrap touch-manipulation h-8 px-3"
            >
              {option.label}
            </Button>
          ))}
        </div>

        {/* Exact Date Picker */}
        {dateFilter === 'exact' && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Select Date</label>
            <Input
              type="date"
              value={exactDate}
              onChange={(e) => setExactDate(e.target.value)}
              className={`h-10 text-sm ${inModal ? 'w-full' : ''}`}
              placeholder="Select date"
            />
            {exactDate && (
              <p className="text-xs text-muted-foreground">
                Showing {filteredServiceOrders.length} order(s) on {format(new Date(exactDate), 'MMM dd, yyyy')}
              </p>
            )}

            {/* Apply Filter Button - Mobile */}
            {inModal && exactDate && (
              <Button
                onClick={() => setShowFilterModal(false)}
                className="w-full h-10 font-semibold text-sm"
              >
                Apply Filter
              </Button>
            )}

            {/* Reset Filter Button - Mobile */}
            {inModal && exactDate && (
              <Button
                variant="outline"
                onClick={() => {
                  setExactDate('');
                  handleDateFilterChange('all');
                }}
                className="w-full h-10 font-semibold text-sm"
              >
                Reset Filter
              </Button>
            )}
          </div>
        )}

        {/* Date Range Picker */}
        {dateFilter === 'range' && (
          <div className="space-y-3">
            <label className="text-xs font-medium text-foreground">Date Range Filter</label>

            {/* From Date - Full width on mobile */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">From Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 text-sm w-full"
                placeholder="Select start date"
              />
            </div>

            {/* To Date - Full width on mobile */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">To Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="h-10 text-sm w-full"
                placeholder="Select end date"
              />
            </div>

            {startDate && endDate && (
              <p className="text-xs text-muted-foreground">
                Showing {filteredServiceOrders.length} order(s) from {format(new Date(startDate), 'MMM dd')} to {format(new Date(endDate), 'MMM dd, yyyy')}
              </p>
            )}

            {/* Apply Filter Button - Mobile */}
            {inModal && startDate && endDate && (
              <Button
                onClick={() => setShowFilterModal(false)}
                className="w-full h-10 font-semibold text-sm"
              >
                Apply Filter
              </Button>
            )}

            {/* Reset Filter Button - Mobile */}
            {inModal && (startDate || endDate) && (
              <Button
                variant="outline"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  handleDateFilterChange('all');
                }}
                className="w-full h-10 font-semibold text-sm"
              >
                Reset Filter
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Pagination component
  const Pagination = () => (
    <div className="flex items-center justify-center gap-2 pt-3">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
        disabled={currentPage === 1}
        className="h-8 px-2 text-xs"
      >
        Prev
      </Button>
      <span className="text-xs text-muted-foreground">
        {currentPage} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        disabled={currentPage === totalPages}
        className="h-8 px-2 text-xs"
      >
        Next
      </Button>
    </div>
  );

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'delivered':
        return 'bg-slate-100 text-slate-800';
    }
  };

  const isOverdue = (order: Order) => {
    return order?.deliveryDate && order.status !== 'delivered' && isPast(order.deliveryDate);
  };

  const toggleExpanded = (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedOrders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const getOrderStatusMessage = (order: Order) => {
    const deliveryDateStr = order?.deliveryDate ? format(order.deliveryDate, 'MMM dd, yyyy') : 'TBD';
    const statusMessages = {
      pending: `Your order ${order.id.slice(0, 8)} is pending. Expected delivery: ${deliveryDateStr}`,
      'in-progress': `Your order ${order.id.slice(0, 8)} is being stitched by ${order.assignedTailor}. Expected delivery: ${deliveryDateStr}`,
      ready: `Good news! Your order ${order.id.slice(0, 8)} is ready for pickup. Please collect at your earliest convenience.`,
      delivered: `Thank you! Your order ${order.id.slice(0, 8)} has been delivered. We hope you love it!`,
    };
    return statusMessages[order.status];
  };

  // Pagination logic for service orders
  const totalPages = Math.ceil(filteredServiceOrders.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const showPagination = filteredServiceOrders.length > ITEMS_PER_PAGE;

  // Get paginated service orders (filtered and sorted)
  const recentServiceOrders = filteredServiceOrders
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  const handleFilterChange = (filter: ServiceOrderFilter) => {
    setServiceOrderFilter(filter);
    setCurrentPage(1);
  };

  const handleDateFilterChange = (filter: DateFilter) => {
    setDateFilter(filter);
    setCurrentPage(1);
  };

  const getServiceOrderStatusColor = (status: string) => {
    switch (status) {
      case 'in-progress':
        return 'bg-blue-600 text-white dark:bg-blue-700';
      case 'pending':
        return 'bg-amber-500 text-white dark:bg-amber-600';
      case 'delivered':
        return 'bg-green-600 text-white dark:bg-green-700';
      case 'completed':
        return 'bg-purple-600 text-white dark:bg-purple-700';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  // Get display status label for UI
  const getDisplayStatusLabel = (status: DisplayStatus): string => {
    switch (status) {
      case 'pending':
        return 'PENDING';
      case 'in-progress':
        return 'IN PROGRESS';
      case 'delivered':
        return 'DELIVERED';
      case 'completed':
        return 'COMPLETED';
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-2 sm:gap-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <MagnifyingGlass
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={20}
            />
            <Input
              placeholder={t('searchOrders')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 touch-manipulation"
            />
          </div>
          {!hideAddButton && (
            <Button onClick={() => setShowForm(true)} className="h-10 font-semibold touch-manipulation px-4 text-xs sm:text-sm whitespace-nowrap min-w-[100px] sm:min-w-[120px]">
              <Plus size={18} className="mr-1.5" weight="bold" />
              {t('newOrder')}
            </Button>
          )}
        </div>

        {/* Mobile: Filter button that opens modal */}
        <div className="sm:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilterModal(true)}
            className="text-xs font-semibold touch-manipulation h-8 px-3 w-full justify-between"
          >
            <span className="flex items-center gap-1.5">
              <Funnel size={14} weight="bold" />
              {serviceOrderFilter !== 'all' || dateFilter !== 'all'
                ? `Filters Active`
                : 'Filter Orders'}
            </span>
            <Badge variant="secondary" className="text-[10px]">{filteredServiceOrders.length}</Badge>
          </Button>
        </div>

        {/* Desktop: Inline filter buttons */}
        <div className="hidden sm:block">
          <FilterButtons />
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        recentServiceOrders.length === 0 ? (
          // Show "No orders yet" or "No results" based on search
          <Card className="p-8 sm:p-12 text-center">
            <Scissors size={64} className="mx-auto text-muted-foreground mb-4" weight="duotone" />
            <p className="text-base text-muted-foreground mb-4 font-medium">
              {search ? `No orders found for "${search}"` : 'No orders yet'}
            </p>
            {!search && (
              <Button onClick={() => setShowForm(true)} className="h-10 touch-manipulation text-xs sm:text-sm">
                <Plus size={18} className="mr-1.5" weight="bold" />
                {t('newOrder')}
              </Button>
            )}
          </Card>
        ) : (
          // Show Recent Service Orders when count > 0
          <div
            className="p-3 sm:p-4 w-full max-w-full flex flex-col gap-4 overflow-hidden rounded-xl border shadow-md"
            style={{
              background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 50%, #e0e7ff 100%)',
              borderColor: 'rgba(196, 181, 253, 0.5)'
            }}
          >
            <h3 className="text-base font-semibold text-gray-800">
              {search ? `Search Results (${recentServiceOrders.length})` : `Recent Service Orders (${recentServiceOrders.length})`}
            </h3>
            {/* 6 cards per page: 2 cols × 3 rows on mobile */}
            <div className="grid grid-cols-2 gap-3">
              {recentServiceOrders.map((serviceOrder, index) => (
                <div
                  key={serviceOrder.id}
                  className={`rounded-lg border hover:shadow-lg transition-all p-4 cursor-pointer flex-shrink-0 w-full h-[180px] flex flex-col justify-between shadow-sm animate-on-load animate-fade-slide-up stagger-${index + 1}`}
                  style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #faf8ff 100%)',
                    borderColor: 'rgba(167, 139, 250, 0.3)'
                  }}
                >
                  {/* Order details */}
                  <div className="flex-1 min-h-0 flex flex-col">
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-[10px] sm:text-xs font-bold text-purple-700">{serviceOrder.id}</p>
                      <Badge variant="outline" className={`text-[8px] sm:text-[10px] px-1.5 py-0.5 font-extrabold border-transparent ${getServiceOrderStatusColor(getDisplayStatus(serviceOrder))}`}>
                        {getDisplayStatusLabel(getDisplayStatus(serviceOrder))}
                      </Badge>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate mb-2">{serviceOrder.customerName}</p>
                    <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-gray-600 mb-2 flex-wrap">
                      <span className="capitalize truncate">{serviceOrder.orderCategory}</span>
                      <span>•</span>
                      <span>{serviceOrder.orderQty} {serviceOrder.uom}</span>
                      <span>•</span>
                      <span className="font-bold text-purple-700">₹{serviceOrder.stitchingCost.toFixed(2)}</span>
                    </div>

                    {/* Design Images */}
                    {serviceOrder.designList && serviceOrder.designList.length > 0 && (
                      <div className="flex gap-1 mb-2">
                        {serviceOrder.designList.slice(0, 3).map((image, imgIndex) => (
                          <img
                            key={imgIndex}
                            src={image}
                            alt={`Design ${imgIndex + 1}`}
                            className="w-8 h-8 rounded object-cover border border-purple-200"
                          />
                        ))}
                        {serviceOrder.designList.length > 3 && (
                          <div className="w-8 h-8 rounded bg-purple-100 flex items-center justify-center text-[10px] font-bold text-purple-700 border border-purple-200">
                            +{serviceOrder.designList.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bottom row: Delivery Date */}
                  <div className="flex items-center justify-between pt-2 border-t border-purple-200">
                    <div className="text-left">
                      <p className="text-[8px] sm:text-[10px] text-gray-500 leading-tight">Delivery</p>
                      <p className="text-[10px] sm:text-xs font-semibold text-gray-800">{format(new Date(serviceOrder.expectedDeliveryDate), 'MMM dd')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {showPagination && <Pagination />}
          </div>
        )
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {filteredOrders.map((order) => {
            const isExpanded = expandedOrders.has(order.id);
            return (
              <Card
                key={order.id}
                className={`p-4 sm:p-4 hover:shadow-lg transition-all duration-200 ${
                  isOverdue(order) ? 'border-destructive border-2' : ''
                }`}
              >
                <div className="flex flex-col gap-3 sm:gap-4">
                  <div className="flex-1 space-y-2 sm:space-y-2 min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-sm text-foreground break-words leading-tight flex-1 line-clamp-1">
                            {order.customerName}
                          </h3>
                          {isOverdue(order) && (
                            <Warning size={18} className="text-destructive flex-shrink-0" weight="fill" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-medium break-words">
                          {t('orderId')}: {order.id.slice(0, 10)}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <a 
                            href={`tel:${order.customerPhone}`}
                            className="text-xs text-muted-foreground hover:text-primary hover:underline transition-colors font-medium break-all"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {order.customerPhone}
                          </a>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <a 
                              href={`tel:${order.customerPhone}`}
                              className="text-primary hover:text-primary/80 transition-colors p-1 touch-manipulation"
                              onClick={(e) => e.stopPropagation()}
                              title={t('call')}
                            >
                              <Phone size={14} weight="fill" />
                            </a>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                sendWhatsAppMessage(order.customerPhone, getOrderStatusMessage(order));
                              }}
                              className="text-green-600 hover:text-green-700 transition-colors p-1 touch-manipulation"
                              title={t('whatsapp')}
                            >
                              <WhatsappLogo size={14} weight="fill" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-sm">
                      {order.garmentTypes && order.garmentTypes.length > 0 && (
                        <Badge variant="secondary" className="text-[10px] font-semibold">
                          {order.garmentTypes.map(type => type.charAt(0).toUpperCase() + type.slice(1)).join(', ')}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] font-semibold line-clamp-1">
                        {t('tailor')}: {order.assignedTailor}
                      </Badge>
                      <Badge
                        variant={
                          isOverdue(order)
                            ? 'destructive'
                            : order?.deliveryDate && isToday(order.deliveryDate)
                            ? 'default'
                            : 'outline'
                        }
                        className="text-[10px] font-semibold"
                      >
                        {isOverdue(order)
                          ? t('overdue')
                          : order?.deliveryDate && isToday(order.deliveryDate)
                          ? t('dueToday')
                          : order?.deliveryDate 
                          ? format(order.deliveryDate, 'MMM dd, yyyy')
                          : 'TBD'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={order.status}
                      onValueChange={(value) => {
                        onUpdateStatus(order.id, value as OrderStatus);
                      }}
                    >
                      <SelectTrigger
                        className="w-full sm:flex-1 h-10 font-semibold touch-manipulation"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">
                          <span className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${getStatusColor('pending')}`}
                            />
                            {t('pending')}
                          </span>
                        </SelectItem>
                        <SelectItem value="in-progress">
                          <span className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${getStatusColor(
                                'in-progress'
                              )}`}
                            />
                            {t('inProgress')}
                          </span>
                        </SelectItem>
                        <SelectItem value="ready">
                          <span className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${getStatusColor('ready')}`}
                            />
                            {t('ready')}
                          </span>
                        </SelectItem>
                        <SelectItem value="delivered">
                          <span className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${getStatusColor(
                                'delivered'
                              )}`}
                            />
                            {t('delivered')}
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {(order.fabricPhotos?.length || order.designPhotos?.length) ? (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 flex-shrink-0 touch-manipulation"
                        onClick={(e) => toggleExpanded(order.id, e)}
                      >
                        {isExpanded ? (
                          <CaretUp size={20} weight="bold" />
                        ) : (
                          <CaretDown size={20} weight="bold" />
                        )}
                      </Button>
                    ) : null}
                  </div>
                </div>

                {isExpanded && (order.fabricPhotos?.length || order.designPhotos?.length) && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    {order.fabricPhotos && order.fabricPhotos.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-foreground">
                          {t('fabricPhotos')} ({order.fabricPhotos.length})
                        </p>
                        <PhotoGallery photos={order.fabricPhotos} minimized={true} />
                      </div>
                    )}
                    {order.designPhotos && order.designPhotos.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-foreground">
                          {t('designPhotos')} ({order.designPhotos.length})
                        </p>
                        <PhotoGallery photos={order.designPhotos} minimized={true} />
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <ServiceOrderForm
        open={showForm}
        onOpenChange={setShowForm}
        onSave={onAddServiceOrder}
        customers={customers}
        onCreateCustomer={onCreateCustomer}
      />

      {/* Mobile Filter Modal */}
      <Dialog open={showFilterModal} onOpenChange={setShowFilterModal}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Filter Orders</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <FilterButtons inModal />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

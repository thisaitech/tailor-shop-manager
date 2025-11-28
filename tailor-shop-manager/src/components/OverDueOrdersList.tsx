import { useState, useEffect, lazy, Suspense } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ClockCountdown, ArrowLeft, MagnifyingGlass, Funnel, DotsThree, Eye } from '@phosphor-icons/react';
import { EmptyState } from './EmptyState';
import { format, differenceInDays } from 'date-fns';
import { ServiceOrder } from '@/lib/types';

// Lazy load the dialog
const ServiceOrderDetailsDialog = lazy(() =>
  import('@/components/ServiceOrderDetailsDialog').then(m => ({ default: m.ServiceOrderDetailsDialog }))
);

type DateFilter = 'all' | 'exact' | 'range';
const ITEMS_PER_PAGE = 6;

interface OverDueOrdersListProps {
  serviceOrders: ServiceOrder[];
  onBack: () => void;
}

export function OverDueOrdersList({ serviceOrders, onBack }: OverDueOrdersListProps) {
  // State for details dialog
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Filter overdue orders - orders past their expected delivery date and not delivered
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueOrders = serviceOrders.filter((o) => {
    if (o.orderStatus === 'delivered') return false;
    if (!o.expectedDeliveryDate) return false;
    const deliveryDate = new Date(o.expectedDeliveryDate);
    deliveryDate.setHours(0, 0, 0, 0);
    return deliveryDate < today;
  });

  // Search, filter, and pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [exactDate, setExactDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter orders
  const filteredOrders = overdueOrders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  // Sort by how overdue (most overdue first)
  const sortedOrders = filteredOrders.sort((a, b) => {
    const dateA = a.expectedDeliveryDate || 0;
    const dateB = b.expectedDeliveryDate || 0;
    return dateA - dateB; // Oldest delivery date first (most overdue)
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedOrders.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedOrders = sortedOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const showPagination = sortedOrders.length > ITEMS_PER_PAGE;

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFilter, exactDate, startDate, endDate]);

  const clearFilters = () => {
    setSearchTerm('');
    setDateFilter('all');
    setExactDate('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm || dateFilter !== 'all';

  // Calculate days overdue
  const getDaysOverdue = (deliveryDate: number) => {
    const delivery = new Date(deliveryDate);
    delivery.setHours(0, 0, 0, 0);
    return differenceInDays(today, delivery);
  };

  // Handle view details
  const handleViewDetails = (order: ServiceOrder) => {
    setSelectedOrder(order);
    setShowDetailsDialog(true);
  };

  // Pagination component
  const Pagination = () => {
    if (!showPagination) return null;
    return (
      <div className="flex items-center justify-between pt-4 border-t border-red-200">
        <p className="text-xs sm:text-sm text-gray-600">
          Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, sortedOrders.length)} of {sortedOrders.length}
        </p>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="h-8 px-2 sm:px-3 text-xs"
          >
            Prev
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((page) => {
              if (totalPages <= 5) return true;
              if (page === 1 || page === totalPages) return true;
              if (Math.abs(page - currentPage) <= 1) return true;
              return false;
            })
            .map((page, index, array) => {
              const showEllipsis = index > 0 && page - array[index - 1] > 1;
              return (
                <span key={page} className="flex items-center">
                  {showEllipsis && <span className="px-1 text-gray-400 text-xs">...</span>}
                  <Button
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={`h-8 w-8 p-0 text-xs ${currentPage === page ? 'bg-red-600 hover:bg-red-700' : ''}`}
                  >
                    {page}
                  </Button>
                </span>
              );
            })}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="h-8 px-2 sm:px-3 text-xs"
          >
            Next
          </Button>
        </div>
      </div>
    );
  };

  // Filter buttons component
  const FilterButtons = () => (
    <div className="flex flex-wrap gap-2 mb-4">
      <Button
        variant={dateFilter === 'all' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setDateFilter('all')}
        className={dateFilter === 'all' ? 'bg-red-600 hover:bg-red-700' : ''}
      >
        All
      </Button>
      <Button
        variant={dateFilter === 'exact' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setDateFilter('exact')}
        className={dateFilter === 'exact' ? 'bg-red-600 hover:bg-red-700' : ''}
      >
        Exact Date
      </Button>
      <Button
        variant={dateFilter === 'range' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setDateFilter('range')}
        className={dateFilter === 'range' ? 'bg-red-600 hover:bg-red-700' : ''}
      >
        Date Range
      </Button>
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-red-500 hover:text-red-600"
        >
          Clear
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Over Due Orders</h1>
            <p className="text-sm text-muted-foreground">{overdueOrders.length} total orders</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by order no, customer name, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 border-red-300 focus:border-red-500 focus:ring-red-500"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-red-100 border-red-500' : 'border-red-300'}
          >
            <Funnel size={18} />
          </Button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="p-4 rounded-lg border border-red-200" style={{ background: '#FEF2F2' }}>
            <FilterButtons />
            {dateFilter === 'exact' && (
              <div className="mt-3">
                <label className="text-sm font-medium">Select Date</label>
                <Input
                  type="date"
                  value={exactDate}
                  onChange={(e) => setExactDate(e.target.value)}
                  className="mt-1 max-w-xs"
                />
              </div>
            )}
            {dateFilter === 'range' && (
              <div className="mt-3 flex gap-4 flex-wrap">
                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Orders Grid */}
      {sortedOrders.length === 0 ? (
        <EmptyState
          icon={ClockCountdown}
          title="No overdue orders found"
          description={hasActiveFilters ? 'Try a different search term or filter' : 'All orders are on track!'}
        />
      ) : (
        <div
          className="rounded-xl border-2 p-4 space-y-3"
          style={{
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 50%, #fecaca 100%)',
            borderColor: 'rgba(239, 68, 68, 0.4)',
          }}
        >
          <h3 className="text-base font-semibold text-gray-800">
            {hasActiveFilters ? `Search Results (${sortedOrders.length})` : `Over Due Orders (${sortedOrders.length})`}
          </h3>
          {/* Rectangle cards: 1 col mobile, 2 cols tablet, 3 cols desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {paginatedOrders.map((order, index) => {
              const daysOverdue = order.expectedDeliveryDate ? getDaysOverdue(order.expectedDeliveryDate) : 0;

              return (
                <div
                  key={order.id}
                  className={`rounded-xl border-2 hover:shadow-lg transition-all p-4 cursor-pointer w-full flex flex-row gap-4 shadow-sm animate-on-load animate-fade-slide-up stagger-${(index % 6) + 1}`}
                  style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #fef2f2 100%)',
                    borderColor: '#ef4444',
                    boxShadow: '0 4px 12px -2px rgba(239, 68, 68, 0.2), 0 2px 6px -2px rgba(239, 68, 68, 0.15)',
                  }}
                  onClick={() => handleViewDetails(order)}
                >
                  {/* Left side: Avatar/Icon */}
                  <div className="flex-shrink-0 flex items-center">
                    <div
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white font-bold text-lg"
                      style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
                    >
                      <ClockCountdown size={24} weight="bold" />
                    </div>
                  </div>

                  {/* Middle: Order details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                        {order.customerName}
                      </p>
                    </div>
                    <p className="text-[10px] sm:text-xs font-bold text-red-600 mb-1">
                      {order.id}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-600 flex-wrap">
                      <Badge variant="outline" className="text-[8px] sm:text-[10px] px-1.5 py-0.5 font-semibold bg-red-100 text-red-700 border-red-200">
                        {daysOverdue} days overdue
                      </Badge>
                    </div>
                    <p className="text-[9px] sm:text-[10px] text-gray-500 mt-1">
                      Due: {order.expectedDeliveryDate ? format(new Date(order.expectedDeliveryDate), 'dd MMM yyyy') : 'N/A'}
                    </p>
                  </div>

                  {/* Right side: Actions */}
                  <div className="flex-shrink-0 flex flex-col items-end justify-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 touch-manipulation">
                          <DotsThree size={20} weight="bold" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(order);
                          }}
                          className="font-medium"
                        >
                          <Eye size={18} className="mr-2" weight="bold" />
                          View Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* View Details button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(order);
                      }}
                      className="text-[10px] sm:text-xs h-7 px-2 bg-red-50 hover:bg-red-100 text-red-700 border-red-300 mt-2"
                    >
                      <Eye size={14} className="mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination />
        </div>
      )}

      {/* Service Order Details Dialog - Lazy Loaded */}
      {selectedOrder && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white p-4 rounded-lg">Loading...</div></div>}>
          <ServiceOrderDetailsDialog
            serviceOrder={selectedOrder}
            open={showDetailsDialog}
            onClose={() => {
              setShowDetailsDialog(false);
              setSelectedOrder(null);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}

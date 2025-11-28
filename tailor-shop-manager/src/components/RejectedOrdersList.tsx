import { useState, useEffect } from 'react';
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
import { XCircle, ArrowLeft, ArrowCounterClockwise, MagnifyingGlass, Funnel, DotsThree, Eye } from '@phosphor-icons/react';
import { EmptyState } from './EmptyState';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { OrderAllotment } from '@/lib/types';

type DateFilter = 'all' | 'exact' | 'range';
const ITEMS_PER_PAGE = 6;

interface RejectedOrdersListProps {
  orders: OrderAllotment[];
  onBack: () => void;
  onReassign: (order: OrderAllotment) => void;
}

export function RejectedOrdersList({ orders, onBack, onReassign }: RejectedOrdersListProps) {
  // Filter rejected orders: status='rejected' AND not reassigned
  const rejectedOrders = orders.filter(o => o.status === 'rejected' && !o.reassigned);

  // Search, filter, and pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [exactDate, setExactDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

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

  // Filter orders
  const filteredOrders = rejectedOrders.filter((order) => {
    const matchesSearch =
      (order.jobWorkNo?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      order.serviceOrderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.assignedName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (order.dressItemName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    const dateRange = getDateRange(dateFilter);
    const matchesDate = !dateRange || (order.assignedDate && isWithinInterval(new Date(order.assignedDate), dateRange));

    return matchesSearch && matchesDate;
  });

  // Sort by assigned date (newest first)
  const sortedOrders = filteredOrders.sort((a, b) => (b.assignedDate || 0) - (a.assignedDate || 0));

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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Pagination component
  const Pagination = () => {
    if (!showPagination) return null;
    return (
      <div className="flex items-center justify-between pt-4 border-t border-purple-200">
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
                    className="h-8 w-8 p-0 text-xs"
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
        className={dateFilter === 'all' ? 'bg-[#6A64F2] hover:bg-[#5b55e0]' : ''}
      >
        All
      </Button>
      <Button
        variant={dateFilter === 'exact' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setDateFilter('exact')}
        className={dateFilter === 'exact' ? 'bg-[#6A64F2] hover:bg-[#5b55e0]' : ''}
      >
        Exact Date
      </Button>
      <Button
        variant={dateFilter === 'range' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setDateFilter('range')}
        className={dateFilter === 'range' ? 'bg-[#6A64F2] hover:bg-[#5b55e0]' : ''}
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
            <h1 className="text-xl font-bold">Rejected Orders</h1>
            <p className="text-sm text-muted-foreground">{rejectedOrders.length} total orders</p>
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
              placeholder="Search by job work no, service order, customer, tailor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 border-purple-300 focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-[#EADDFD] border-[#6A64F2]' : 'border-purple-300'}
          >
            <Funnel size={18} />
          </Button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="p-4 rounded-lg border" style={{ background: '#FAF8FF' }}>
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

      {/* Rejected Orders Grid */}
      {sortedOrders.length === 0 ? (
        <EmptyState
          icon={XCircle}
          title="No rejected orders found"
          description={hasActiveFilters ? 'Try a different search term or filter' : 'All orders are in good standing'}
        />
      ) : (
        <div
          className="rounded-xl border-2 p-4 space-y-3"
          style={{
            background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 50%, #e0e7ff 100%)',
            borderColor: 'rgba(196, 181, 253, 0.5)',
          }}
        >
          <h3 className="text-base font-semibold text-gray-800">
            {hasActiveFilters ? `Search Results (${sortedOrders.length})` : `Rejected Orders (${sortedOrders.length})`}
          </h3>
          {/* Rectangle cards: 1 col mobile, 2 cols tablet, 3 cols desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {paginatedOrders.map((order, index) => (
              <div
                key={order.id}
                className={`rounded-xl border-2 hover:shadow-lg transition-all p-4 cursor-pointer w-full flex flex-row gap-4 shadow-sm animate-on-load animate-fade-slide-up stagger-${(index % 6) + 1}`}
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #faf8ff 100%)',
                  borderColor: '#ef4444',
                  boxShadow: '0 4px 12px -2px rgba(239, 68, 68, 0.2), 0 2px 6px -2px rgba(239, 68, 68, 0.15)',
                }}
              >
                {/* Left side: Avatar/Icon */}
                <div className="flex-shrink-0 flex items-center">
                  <div
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
                  >
                    <XCircle size={24} weight="bold" />
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
                    {order.jobWorkNo || order.id.slice(0, 12)}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-600 flex-wrap">
                    <span className="font-medium">{order.serviceOrderNo}</span>
                    <span>•</span>
                    <Badge variant="outline" className="text-[8px] sm:text-[10px] px-1.5 py-0.5 font-semibold bg-red-100 text-red-700 border-red-200">
                      Rejected
                    </Badge>
                  </div>
                  {order.dressItemName && (
                    <p className="text-[9px] sm:text-[10px] text-gray-500 mt-1 truncate">
                      Item: {order.dressItemName}
                    </p>
                  )}
                  <p className="text-[9px] sm:text-[10px] text-gray-500">
                    Was: {order.assignedName}
                    {order.assignedDate && ` • ${format(order.assignedDate, 'dd MMM yyyy')}`}
                  </p>
                </div>

                {/* Right side: Actions */}
                <div className="flex-shrink-0 flex flex-col items-end justify-between">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 touch-manipulation">
                        <DotsThree size={20} weight="bold" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onReassign(order)} className="font-medium">
                        <ArrowCounterClockwise size={18} className="mr-2" weight="bold" />
                        Re-assign
                      </DropdownMenuItem>
                      <DropdownMenuItem className="font-medium">
                        <Eye size={18} className="mr-2" weight="bold" />
                        View Details
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Re-assign button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReassign(order);
                    }}
                    className="text-[10px] sm:text-xs h-7 px-2 bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-300"
                  >
                    <ArrowCounterClockwise size={14} className="mr-1" />
                    Re-assign
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Pagination />
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checks, ArrowLeft, ArrowCounterClockwise, Package, MagnifyingGlass, Funnel, DotsThree, Eye } from '@phosphor-icons/react';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { OrderAllotment } from '@/lib/types';
import { toast } from 'sonner';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { updateServiceOrderStatus } from '@/lib/firestore/serviceOrderService';

type DateFilter = 'all' | 'exact' | 'range';
const ITEMS_PER_PAGE = 6;

interface StitchedOrdersListProps {
  orders: OrderAllotment[];
  onBack: () => void;
  onReassign: (order: OrderAllotment) => void;
}

export function StitchedOrdersList({ orders, onBack, onReassign }: StitchedOrdersListProps) {
  const [markingReady, setMarkingReady] = useState<string | null>(null);

  // Filter stitched orders: status='stitched' AND not reassigned AND not ready to dispatch
  const stitchedOrders = orders.filter(o =>
    o.status === 'stitched' &&
    !o.reassigned &&
    o.serviceOrderStatus !== 'ready'
  );

  // Search, filter, and pagination states
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [exactDate, setExactDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
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
  const filteredOrders = stitchedOrders.filter((order) => {
    const matchesSearch =
      (order.jobWorkNo?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (order.stitchedId?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      order.serviceOrderNo.toLowerCase().includes(search.toLowerCase()) ||
      order.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (order.assignedName?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (order.dressItemName?.toLowerCase().includes(search.toLowerCase()) ?? false);

    const dateRange = getDateRange(dateFilter);
    const matchesDate = !dateRange || (order.stitchedDate && isWithinInterval(new Date(order.stitchedDate), dateRange));

    return matchesSearch && matchesDate;
  });

  // Sort by stitched date (newest first)
  const sortedOrders = filteredOrders.sort((a, b) => (b.stitchedDate || 0) - (a.stitchedDate || 0));

  // Pagination logic
  const totalPages = Math.ceil(sortedOrders.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedOrders = sortedOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const showPagination = sortedOrders.length > ITEMS_PER_PAGE;

  // Reset to page 1 when filters change
  const handleFilterChange = (filter: DateFilter) => {
    setDateFilter(filter);
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const handleMarkAsReadyToDispatch = async (order: OrderAllotment) => {
    try {
      setMarkingReady(order.id);

      // Update order allotment: set status to 'delivered' and serviceOrderStatus to 'ready'
      await updateDoc(doc(db, 'orderAllotment', order.id), {
        status: 'delivered', // Set status to delivered to remove from Stitched Orders
        orderStatus: 'closed',
        serviceOrderStatus: 'ready',
        deliveredDate: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update the service order status to 'ready'
      await updateServiceOrderStatus(order.serviceOrderNo, 'ready');

      console.log(`[StitchedOrdersList] Order ${order.id} marked as delivered (ready to dispatch). Service order ${order.serviceOrderNo} updated to ready status.`);

      toast.success('Order marked as Ready to Dispatch!');
    } catch (error) {
      console.error('Error marking order as ready to dispatch:', error);
      toast.error('Failed to mark order as ready to dispatch');
    } finally {
      setMarkingReady(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const dateFilterOptions: { value: DateFilter; label: string }[] = [
    { value: 'all', label: 'All Orders' },
    { value: 'exact', label: 'Exact Date' },
    { value: 'range', label: 'Date Range' },
  ];

  // Filter buttons component
  const FilterButtons = ({ inModal = false }: { inModal?: boolean }) => (
    <div className="space-y-3">
      {/* Filter Type Selection */}
      <div className={`flex gap-1.5 ${inModal ? 'flex-wrap' : 'overflow-x-auto pb-1 scrollbar-hide'}`}>
        {dateFilterOptions.map((option) => (
          <Button
            key={option.value}
            variant={dateFilter === option.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              handleFilterChange(option.value);
              if (inModal && option.value === 'all') setShowFilterModal(false);
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
              Showing {filteredOrders.length} order(s) on {format(new Date(exactDate), 'MMM dd, yyyy')}
            </p>
          )}

          {inModal && exactDate && (
            <Button
              onClick={() => setShowFilterModal(false)}
              className="w-full h-10 font-semibold text-sm"
            >
              Apply Filter
            </Button>
          )}

          {inModal && exactDate && (
            <Button
              variant="outline"
              onClick={() => {
                setExactDate('');
                handleFilterChange('all');
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
              Showing {filteredOrders.length} order(s) from {format(new Date(startDate), 'MMM dd')} to {format(new Date(endDate), 'MMM dd, yyyy')}
            </p>
          )}

          {inModal && startDate && endDate && (
            <Button
              onClick={() => setShowFilterModal(false)}
              className="w-full h-10 font-semibold text-sm"
            >
              Apply Filter
            </Button>
          )}

          {inModal && (startDate || endDate) && (
            <Button
              variant="outline"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                handleFilterChange('all');
              }}
              className="w-full h-10 font-semibold text-sm"
            >
              Reset Filter
            </Button>
          )}
        </div>
      )}
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
        className="h-8 px-3 text-xs font-semibold"
      >
        Previous
      </Button>
      <span className="text-xs text-muted-foreground font-medium">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        disabled={currentPage === totalPages}
        className="h-8 px-3 text-xs font-semibold"
      >
        Next
      </Button>
    </div>
  );

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9">
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-lg sm:text-xl font-bold">Await Acceptance</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{stitchedOrders.length} orders awaiting acceptance</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-2 sm:gap-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <MagnifyingGlass
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={20}
            />
            <Input
              placeholder="Search by job work no, customer, tailor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 touch-manipulation"
            />
          </div>
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
              Filter: {dateFilterOptions.find(o => o.value === dateFilter)?.label}
            </span>
            <Badge variant="secondary" className="text-[10px]">{filteredOrders.length}</Badge>
          </Button>
        </div>

        {/* Desktop: Inline filter buttons */}
        <div className="hidden sm:block">
          <FilterButtons />
        </div>
      </div>

      {/* Await Acceptance Grid */}
      {filteredOrders.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center">
          <Checks size={64} className="mx-auto text-muted-foreground mb-4" weight="duotone" />
          <p className="text-base text-muted-foreground mb-4 font-medium">
            {search ? 'No orders found matching your search.' : 'No orders awaiting acceptance.'}
          </p>
        </Card>
      ) : (
        <div
          className="p-3 sm:p-4 w-full max-w-full flex flex-col gap-4 overflow-hidden rounded-xl border shadow-md"
          style={{
            background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #a7f3d0 100%)',
            borderColor: 'rgba(16, 185, 129, 0.5)'
          }}
        >
          <h3 className="text-base font-semibold text-gray-800">
            {search ? `Search Results (${sortedOrders.length})` : `Await Acceptance (${sortedOrders.length})`}
          </h3>
          {/* Rectangle cards: 1 col mobile, 2 cols tablet, 3 cols desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {paginatedOrders.map((order, index) => (
              <div
                key={order.id}
                className={`rounded-xl border-2 hover:shadow-lg transition-all p-4 cursor-pointer w-full flex flex-row gap-4 shadow-sm animate-on-load animate-fade-slide-up stagger-${(index % 6) + 1}`}
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
                  borderColor: '#10b981',
                  boxShadow: '0 4px 12px -2px rgba(16, 185, 129, 0.2), 0 2px 6px -2px rgba(16, 185, 129, 0.15)',
                }}
              >
                {/* Left side: Avatar/Icon */}
                <div className="flex-shrink-0 flex items-center">
                  <div
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                  >
                    {getInitials(order.customerName)}
                  </div>
                </div>

                {/* Middle: Order details */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                      {order.customerName}
                    </p>
                  </div>
                  <p className="text-[10px] sm:text-xs font-bold text-emerald-600 mb-1">
                    {order.stitchedId || order.jobWorkNo || order.id.slice(0, 12)}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-600 flex-wrap">
                    <span className="font-medium">{order.serviceOrderNo}</span>
                    <span>•</span>
                    <Badge variant="outline" className="text-[8px] sm:text-[10px] px-1.5 py-0.5 font-semibold bg-emerald-100 text-emerald-700 border-emerald-200">
                      Completed
                    </Badge>
                  </div>
                  {order.dressItemName && (
                    <p className="text-[9px] sm:text-[10px] text-gray-500 mt-1 truncate">
                      Item: {order.dressItemName}
                    </p>
                  )}
                  <p className="text-[9px] sm:text-[10px] text-gray-500">
                    By: {order.assignedName}
                    {order.stitchedDate && typeof order.stitchedDate === 'number' && ` • ${format(new Date(order.stitchedDate), 'dd MMM yyyy')}`}
                  </p>
                </div>

                {/* Right side: Actions */}
                <div className="flex-shrink-0 flex flex-col items-end justify-between gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 touch-manipulation">
                        <DotsThree size={20} weight="bold" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleMarkAsReadyToDispatch(order)}
                        disabled={markingReady === order.id}
                        className="font-medium"
                      >
                        <Package size={18} className="mr-2" weight="bold" />
                        {markingReady === order.id ? 'Processing...' : 'Ready to Delivery'}
                      </DropdownMenuItem>
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

                  {/* Action buttons */}
                  <div className="flex flex-col gap-1.5">
                    {/* Ready to Delivery button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsReadyToDispatch(order);
                      }}
                      disabled={markingReady === order.id}
                      className="text-[10px] sm:text-xs h-7 px-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                    >
                      <Package size={14} className="mr-1" />
                      {markingReady === order.id ? 'Processing...' : 'Ready to Delivery'}
                    </Button>
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
              </div>
            ))}
          </div>
          {showPagination && <Pagination />}
        </div>
      )}

      {/* Mobile Filter Modal */}
      <Dialog open={showFilterModal} onOpenChange={setShowFilterModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Filter by Date</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <FilterButtons inModal />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

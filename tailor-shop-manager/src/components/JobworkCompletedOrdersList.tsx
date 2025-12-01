import { useState, useEffect, lazy, Suspense } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Truck, ArrowLeft, Package, MagnifyingGlass, Funnel, DotsThree, Eye, Spinner, CheckCircle } from '@phosphor-icons/react';
import { EmptyState } from './EmptyState';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { ServiceOrder, OrderAllotment } from '@/lib/types';
import { recordGoodsReceipt } from '@/lib/firestore/serviceOrderService';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';

// Lazy load the dialog
const ServiceOrderDetailsDialog = lazy(() =>
  import('@/components/ServiceOrderDetailsDialog').then(m => ({ default: m.ServiceOrderDetailsDialog }))
);

type DateFilter = 'all' | 'exact' | 'range';
type ShipmentType = 'direct' | 'courier';
const ITEMS_PER_PAGE = 6;

interface JobworkCompletedOrdersListProps {
  serviceOrders: ServiceOrder[];
  orderAllotments?: OrderAllotment[]; // Keep for backward compatibility
  onBack: () => void;
  onDataRefresh?: () => void;
}

export function JobworkCompletedOrdersList({ serviceOrders, orderAllotments, onBack, onDataRefresh }: JobworkCompletedOrdersListProps) {
  const { user } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

  // Goods Receipt Dialog state
  const [showGoodsReceiptDialog, setShowGoodsReceiptDialog] = useState(false);
  const [goodsReceiptOrder, setGoodsReceiptOrder] = useState<ServiceOrder | null>(null);
  const [shipmentType, setShipmentType] = useState<ShipmentType>('direct');
  const [consignmentNo, setConsignmentNo] = useState('');
  const [saving, setSaving] = useState(false);

  // Filter jobwork completed orders using new unified status: orderStatus === 'job-completed'
  // These are vendor orders where work is complete but goods not yet received at shop
  const jobworkCompletedOrders = serviceOrders.filter(o => o.orderStatus === 'job-completed');

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
  const filteredOrders = jobworkCompletedOrders.filter((order) => {
    const matchesSearch =
      (order.jobWorkNo?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (order.assignedToName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (order.orderCategory?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    const dateRange = getDateRange(dateFilter);
    const orderDate = order.completedDate || order.serviceOrderDate;
    const matchesDate = !dateRange || (orderDate && isWithinInterval(new Date(orderDate), dateRange));

    return matchesSearch && matchesDate;
  });

  // Sort by job completed date (newest first)
  const sortedOrders = filteredOrders.sort((a, b) => (b.completedDate || b.serviceOrderDate || 0) - (a.completedDate || a.serviceOrderDate || 0));

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

  const handleViewDetails = (order: ServiceOrder) => {
    setSelectedOrder(order);
    setShowDetailsDialog(true);
  };

  // Open Goods Receipt Dialog
  const openGoodsReceiptDialog = (order: ServiceOrder) => {
    setGoodsReceiptOrder(order);
    setShipmentType('direct');
    setConsignmentNo('');
    setShowGoodsReceiptDialog(true);
  };

  // Close Goods Receipt Dialog
  const closeGoodsReceiptDialog = () => {
    setShowGoodsReceiptDialog(false);
    setGoodsReceiptOrder(null);
    setShipmentType('direct');
    setConsignmentNo('');
  };

  // Generate GRN number
  const generateGRNNumber = () => {
    const timestamp = Date.now();
    return `GRN${timestamp.toString().slice(-8)}`;
  };

  // Handle Goods Receipt submission
  const handleGoodsReceiptSubmit = async () => {
    if (!goodsReceiptOrder || !user) {
      toast.error('Missing order or user information');
      return;
    }

    try {
      setSaving(true);

      // Generate GRN number
      const grnNo = generateGRNNumber();

      // Record goods receipt - moves order from 'job-completed' to 'received-note'
      await recordGoodsReceipt(
        goodsReceiptOrder.id,
        grnNo,
        user.id || 'ADMIN',
        user.name || 'Admin'
      );

      toast.success(`Goods Receipt ${grnNo} recorded successfully! Order moved to Received Note.`);
      closeGoodsReceiptDialog();

      // Refresh data
      if (onDataRefresh) {
        onDataRefresh();
      }
    } catch (error) {
      console.error('Error recording goods receipt:', error);
      toast.error('Failed to record goods receipt');
    } finally {
      setSaving(false);
    }
  };

  // Pagination component
  const Pagination = () => {
    if (!showPagination) return null;
    return (
      <div className="flex items-center justify-between pt-4 border-t border-orange-200">
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
                    className={`h-8 w-8 p-0 text-xs ${currentPage === page ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
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
        className={dateFilter === 'all' ? 'bg-orange-500 hover:bg-orange-600' : ''}
      >
        All
      </Button>
      <Button
        variant={dateFilter === 'exact' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setDateFilter('exact')}
        className={dateFilter === 'exact' ? 'bg-orange-500 hover:bg-orange-600' : ''}
      >
        Exact Date
      </Button>
      <Button
        variant={dateFilter === 'range' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setDateFilter('range')}
        className={dateFilter === 'range' ? 'bg-orange-500 hover:bg-orange-600' : ''}
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
            <h1 className="text-xl font-bold">Jobwork Completed Orders</h1>
            <p className="text-sm text-muted-foreground">{jobworkCompletedOrders.length} orders pending goods receipt</p>
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
              className="pl-10 h-10 border-orange-300 focus:border-orange-500 focus:ring-orange-500"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-orange-100 border-orange-500' : 'border-orange-300'}
          >
            <Funnel size={18} />
          </Button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="p-4 rounded-lg border" style={{ background: '#FFF7ED' }}>
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

      {/* Jobwork Completed Orders Grid */}
      {sortedOrders.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No jobwork completed orders"
          description={hasActiveFilters ? 'Try a different search term or filter' : 'No orders from vendors pending goods receipt'}
        />
      ) : (
        <div
          className="rounded-xl border-2 p-4 space-y-3"
          style={{
            background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fed7aa 100%)',
            borderColor: 'rgba(251, 146, 60, 0.5)',
          }}
        >
          <h3 className="text-base font-semibold text-gray-800">
            {hasActiveFilters ? `Search Results (${sortedOrders.length})` : `Pending Goods Receipt (${sortedOrders.length})`}
          </h3>
          {/* Rectangle cards: 1 col mobile, 2 cols tablet, 3 cols desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {paginatedOrders.map((order, index) => (
              <div
                key={order.id}
                className={`rounded-xl border-2 hover:shadow-lg transition-all p-4 cursor-pointer w-full shadow-sm animate-on-load animate-fade-slide-up stagger-${(index % 6) + 1}`}
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #fffbf5 100%)',
                  borderColor: '#f97316',
                  boxShadow: '0 4px 12px -2px rgba(249, 115, 22, 0.2), 0 2px 6px -2px rgba(249, 115, 22, 0.15)',
                }}
                onClick={() => handleViewDetails(order)}
              >
                {/* Top Row: Icon, Details, Menu */}
                <div className="flex flex-row gap-4">
                  {/* Left side: Avatar/Icon */}
                  <div className="flex-shrink-0 flex items-center">
                    <div
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white font-bold text-lg"
                      style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' }}
                    >
                      <Truck size={24} weight="bold" />
                    </div>
                  </div>

                  {/* Middle: Order details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                        {order.customerName}
                      </p>
                    </div>
                    <p className="text-[10px] sm:text-xs font-bold text-orange-600 mb-1">
                      {order.jobWorkNo || order.id}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-600 flex-wrap">
                      <span className="font-medium capitalize">{order.orderCategory}</span>
                      <span>•</span>
                      <Badge variant="outline" className="text-[8px] sm:text-[10px] px-1.5 py-0.5 font-semibold bg-orange-100 text-orange-700 border-orange-200">
                        Job Completed
                      </Badge>
                    </div>
                    <p className="text-[9px] sm:text-[10px] text-gray-500 mt-1">
                      By: {order.assignedToName}
                    </p>
                  </div>

                  {/* Right side: Dropdown Menu */}
                  <div className="flex-shrink-0 flex items-start">
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
                            openGoodsReceiptDialog(order);
                          }}
                          className="font-medium"
                        >
                          <Package size={18} className="mr-2" weight="bold" />
                          Goods Receipt
                        </DropdownMenuItem>
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
                  </div>
                </div>
                
                {/* Action Buttons Row - Always visible below the card content */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-orange-200">
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      openGoodsReceiptDialog(order);
                    }}
                    disabled={processingOrderId === order.id}
                    className="flex-1 text-xs h-8 bg-green-500 hover:bg-green-600 text-white"
                  >
                    <Package size={16} className="mr-1" />
                    Goods Receipt
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewDetails(order);
                    }}
                    className="flex-1 text-xs h-8 border-orange-300 text-orange-600 hover:bg-orange-50"
                  >
                    <Eye size={16} className="mr-1" />
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Pagination />
        </div>
      )}

      {/* Order Details Dialog */}
      {selectedOrder && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded-lg">
              <Spinner size={32} className="animate-spin text-orange-500" />
            </div>
          </div>
        }>
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

      {/* Goods Receipt Dialog */}
      <Dialog open={showGoodsReceiptDialog} onOpenChange={(open) => !open && closeGoodsReceiptDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Goods Receipt</DialogTitle>
          </DialogHeader>
          
          {goodsReceiptOrder && (
            <div className="space-y-4 py-4">
              {/* Order Info */}
              <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                <p className="text-sm font-medium text-orange-800">
                  Order: {goodsReceiptOrder.jobWorkNo || goodsReceiptOrder.id}
                </p>
                <p className="text-xs text-orange-600">
                  Customer: {goodsReceiptOrder.customerName}
                </p>
                <p className="text-xs text-orange-600">
                  Vendor: {goodsReceiptOrder.assignedToName}
                </p>
              </div>

              {/* GRN Date - Auto */}
              <div className="space-y-2">
                <Label>GRN Date</Label>
                <Input
                  value={format(new Date(), 'dd MMM yyyy')}
                  disabled
                  className="bg-muted"
                />
              </div>

              {/* Shipment Type */}
              <div className="space-y-2">
                <Label htmlFor="shipmentType">Shipment Type *</Label>
                <Select value={shipmentType} onValueChange={(val) => setShipmentType(val as ShipmentType)}>
                  <SelectTrigger id="shipmentType">
                    <SelectValue placeholder="Select shipment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct">Direct</SelectItem>
                    <SelectItem value="courier">Courier</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Consignment No (optional) */}
              <div className="space-y-2">
                <Label htmlFor="consignmentNo">Consignment No (Optional)</Label>
                <Input
                  id="consignmentNo"
                  value={consignmentNo}
                  onChange={(e) => setConsignmentNo(e.target.value.slice(0, 20))}
                  placeholder="Enter consignment number"
                  maxLength={20}
                />
                <p className="text-xs text-muted-foreground">
                  {consignmentNo.length}/20 characters
                </p>
              </div>

              {/* Info */}
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-xs text-blue-700">
                  Recording goods receipt will move this order to "Received Note" status.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeGoodsReceiptDialog} disabled={saving}>
              Cancel
            </Button>
            <Button 
              onClick={handleGoodsReceiptSubmit} 
              disabled={saving}
              className="bg-green-500 hover:bg-green-600"
            >
              {saving ? (
                <>
                  <Spinner size={16} className="mr-1 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <CheckCircle size={16} className="mr-1" weight="bold" />
                  Record Goods Receipt
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

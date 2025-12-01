import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { toast } from 'sonner';
import { ArrowLeft, Plus, Truck, MagnifyingGlass, Funnel, DotsThree, CaretLeft, CaretRight, X, Eye, Spinner } from '@phosphor-icons/react';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import {
  DeliveryChallan as DeliveryChallanType,
  ShipmentType,
  createDeliveryChallan as createDCRecord,
  getDeliveryChallansByCompany,
} from '@/lib/firestore/deliveryChallanService';
import { getCompanyProfile } from '@/lib/firestore/companyService';
import { ServiceOrder } from '@/lib/types';
import { 
  getOrdersWaitingForDC, 
  createDeliveryChallan as updateOrderWithDC,
  ServiceOrderWithCompany 
} from '@/lib/firestore/serviceOrderService';

interface DeliveryChallanProps {
  onBack: () => void;
  initialOrderId?: string; // Pre-select this order and open dialog
}

export function DeliveryChallan({ onBack, initialOrderId }: DeliveryChallanProps) {
  const { user } = useAuth();
  const [challans, setChallans] = useState<DeliveryChallanType[]>([]);
  const [ordersWaitingForDC, setOrdersWaitingForDC] = useState<ServiceOrderWithCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string>('');

  // Form state
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [jobWorkNo, setJobWorkNo] = useState('');
  const [shipmentType, setShipmentType] = useState<ShipmentType | ''>('');
  const [consignmentNo, setConsignmentNo] = useState('');

  // Search, Filter, Pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'exact' | 'range'>('all');
  const [exactDate, setExactDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  // Load data
  useEffect(() => {
    loadData();
  }, [user]);

  // Auto-open dialog with pre-selected order if initialOrderId is provided
  useEffect(() => {
    if (initialOrderId && ordersWaitingForDC.length > 0 && !loading) {
      // Find the order by ID or jobWorkNo
      const order = ordersWaitingForDC.find(o => o.id === initialOrderId || o.jobWorkNo === initialOrderId);
      if (order) {
        // Use order.id as the value since SelectItem uses order.id as value
        setJobWorkNo(order.id);
        setShipmentType('');
        setConsignmentNo('');
        setShowDialog(true);
      }
    }
  }, [initialOrderId, ordersWaitingForDC, loading]);

  const loadData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      // Get company profile
      const company = await getCompanyProfile(user.id);
      if (company) {
        setCompanyId(company.id);
        // Load delivery challans
        const dcList = await getDeliveryChallansByCompany(company.id);
        setChallans(dcList);
        // Load orders waiting for DC (vendor orders with status='waitingForDC')
        // These are orders that vendors have accepted but don't have a DC yet
        const waitingOrders = await getOrdersWaitingForDC(company.id);
        setOrdersWaitingForDC(waitingOrders);
        console.log(`[DeliveryChallan] Found ${waitingOrders.length} orders waiting for DC`);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setJobWorkNo('');
    setShipmentType('');
    setConsignmentNo('');
    setShowDialog(true);
  };

  // Filter and Pagination Logic
  const filteredChallans = challans.filter(dc => {
    // Search filter
    const matchesSearch = searchTerm === '' ||
      dc.dcNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dc.jobWorkNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (dc.jobWorkTailorName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (dc.consignmentNo?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    // Date filter
    let matchesDate = true;
    if (dateFilter === 'exact' && exactDate) {
      const dcDate = startOfDay(new Date(dc.dcDate));
      const filterDate = startOfDay(new Date(exactDate));
      matchesDate = dcDate.getTime() === filterDate.getTime();
    } else if (dateFilter === 'range' && startDate && endDate) {
      const dcDate = new Date(dc.dcDate);
      matchesDate = isWithinInterval(dcDate, {
        start: startOfDay(new Date(startDate)),
        end: endOfDay(new Date(endDate)),
      });
    }

    return matchesSearch && matchesDate;
  });

  const totalPages = Math.ceil(filteredChallans.length / ITEMS_PER_PAGE);
  const paginatedChallans = filteredChallans.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

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

  const handleSave = async () => {
    if (!jobWorkNo) {
      toast.error('Please select an Order');
      return;
    }

    if (!shipmentType) {
      toast.error('Please select the shipment type');
      return;
    }

    if (!companyId || !user?.id) {
      toast.error('Company profile not found');
      return;
    }

    setSaving(true);
    try {
      const selectedOrder = ordersWaitingForDC.find(o => o.id === jobWorkNo);
      
      if (!selectedOrder) {
        toast.error('Selected order not found');
        return;
      }

      // Create DC record in deliveryChallan collection
      const newDC = await createDCRecord(
        {
          jobWorkNo: selectedOrder.jobWorkNo || selectedOrder.id, // Use job work no or order ID
          jobWorkTailorName: selectedOrder.assignedToName,
          shipmentType: shipmentType as ShipmentType,
          consignmentNo: consignmentNo.trim(),
        },
        companyId,
        user.id
      );

      // Update the service order: move from 'waitingForDC' to 'inprogress'
      await updateOrderWithDC(
        selectedOrder.id,
        newDC.dcNo,
        user.id,
        user.name || 'Admin'
      );

      setChallans(prev => [newDC, ...prev]);
      // Remove the order from waiting list since DC is now created
      setOrdersWaitingForDC(prev => prev.filter(o => o.id !== jobWorkNo));
      setShowDialog(false);
      toast.success(`Delivery Challan ${newDC.dcNo} created successfully. Order moved to In Progress.`);
    } catch (error) {
      console.error('Error creating delivery challan:', error);
      toast.error('Failed to create delivery challan');
    } finally {
      setSaving(false);
    }
  };

  // Pagination Component
  const Pagination = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-between mt-4 px-2">
        <p className="text-sm text-muted-foreground">
          Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredChallans.length)} of {filteredChallans.length}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0"
          >
            <CaretLeft size={16} />
          </Button>
          <span className="text-sm font-medium px-2">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="h-8 w-8 p-0"
          >
            <CaretRight size={16} />
          </Button>
        </div>
      </div>
    );
  };

  // Filter Buttons Component
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
          <X size={14} className="mr-1" />
          Clear
        </Button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Spinner size={48} className="animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading delivery challans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Delivery Challan</h1>
            <p className="text-sm text-muted-foreground">{challans.length} total challans</p>
          </div>
        </div>
        <Button onClick={handleOpenDialog} className="bg-[#6A64F2] hover:bg-[#5b55e0]">
          <Plus size={18} className="mr-1" />
          New DC
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by DC no, job work no, tailor, or consignment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-[#EADDFD] border-[#6A64F2]' : ''}
          >
            <Funnel size={18} />
          </Button>
        </div>

        {/* Filter Options - Desktop */}
        {showFilters && (
          <div className="hidden sm:block p-4 rounded-lg border" style={{ background: '#FAF8FF' }}>
            <FilterButtons />
            {dateFilter === 'exact' && (
              <div className="mt-3">
                <Label htmlFor="exactDate" className="text-sm">Select Date</Label>
                <Input
                  id="exactDate"
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
                  <Label htmlFor="startDate" className="text-sm">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate" className="text-sm">End Date</Label>
                  <Input
                    id="endDate"
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

      {/* Delivery Challans Grid - Rectangle Cards */}
      {paginatedChallans.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground rounded-lg border" style={{ background: '#FAF8FF' }}>
          <Truck size={48} className="mx-auto mb-3 opacity-30" />
          <p>{hasActiveFilters ? 'No challans match your search' : 'No delivery challans yet'}</p>
          {!hasActiveFilters && <p className="text-sm mt-1">Click "New DC" to create one</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedChallans.map((dc, index) => (
            <div
              key={dc.id}
              className={`rounded-xl border-2 hover:shadow-lg transition-all p-4 cursor-pointer w-full flex flex-row gap-4 shadow-sm animate-on-load animate-fade-slide-up stagger-${(index % 6) + 1}`}
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #faf8ff 100%)',
                borderColor: '#6A64F2',
                boxShadow: '0 4px 12px -2px rgba(106, 100, 242, 0.2), 0 2px 6px -2px rgba(106, 100, 242, 0.15)',
              }}
            >
              {/* Left: Truck Icon */}
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white flex-shrink-0 text-lg font-bold"
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)' }}
              >
                <Truck size={24} weight="bold" />
              </div>

              {/* Middle: Details */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm truncate" style={{ color: '#6A64F2' }}>
                    {dc.dcNo}
                  </span>
                  <Badge
                    className={`text-[10px] px-1.5 py-0 ${
                      dc.shipmentType === 'courier'
                        ? 'bg-blue-100 text-blue-700 border-blue-300'
                        : 'bg-green-100 text-green-700 border-green-300'
                    }`}
                    variant="outline"
                  >
                    {dc.shipmentType === 'courier' ? 'Courier' : 'Direct'}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-gray-900 truncate">
                  Job: {dc.jobWorkNo}
                </p>
                {dc.jobWorkTailorName && (
                  <p className="text-xs text-muted-foreground truncate">
                    Tailor: {dc.jobWorkTailorName}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {format(new Date(dc.dcDate), 'dd MMM yyyy')}
                </p>
                {dc.consignmentNo && (
                  <p className="text-xs text-muted-foreground">
                    CN: {dc.consignmentNo}
                  </p>
                )}
              </div>

              {/* Right: Actions */}
              <div className="flex flex-col items-end justify-between flex-shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <DotsThree size={20} weight="bold" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye size={16} className="mr-2" />
                      View Details
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <Pagination />

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>New Delivery Challan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* DC Date - Auto */}
            <div className="space-y-2">
              <Label>DC Date</Label>
              <Input
                value={format(new Date(), 'dd MMM yyyy')}
                disabled
                className="bg-muted"
              />
            </div>

            {/* Order ID (Vendor orders waiting for DC) */}
            <div className="space-y-2">
              <Label htmlFor="jobWorkNo">Order ID *</Label>
              <Select value={jobWorkNo} onValueChange={setJobWorkNo}>
                <SelectTrigger id="jobWorkNo">
                  <SelectValue placeholder="Select Order" />
                </SelectTrigger>
                <SelectContent>
                  {ordersWaitingForDC.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No orders waiting for DC
                    </div>
                  ) : (
                    ordersWaitingForDC.map(order => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.jobWorkNo || order.id} - {order.customerName} ({order.assignedToName})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Only vendor orders that have been accepted will appear here
              </p>
            </div>

            {/* Shipment Type */}
            <div className="space-y-2">
              <Label htmlFor="shipmentType">Shipment Type *</Label>
              <Select value={shipmentType} onValueChange={(value) => setShipmentType(value as ShipmentType | '')}>
                <SelectTrigger id="shipmentType">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Direct</SelectItem>
                  <SelectItem value="courier">Courier</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Consignment No */}
            <div className="space-y-2">
              <Label htmlFor="consignmentNo">Consignment No</Label>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Creating...' : 'Create DC'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

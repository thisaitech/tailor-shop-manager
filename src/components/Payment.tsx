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
import { Plus, CurrencyInr, FilePdf, Printer, MagnifyingGlass, Funnel, DotsThree, ArrowLeft, CaretLeft, CaretRight, X, Spinner } from '@phosphor-icons/react';
import { StatusChangeConfirmDialog } from '@/components/StatusChangeConfirmDialog';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import {
  Payment as PaymentType,
  PaymentMode,
  OrderCategory,
  createPayment,
  getPaymentsByCompany,
} from '@/lib/firestore/paymentService';
import { getServiceOrdersByCompany, updateServiceOrderStatus } from '@/lib/firestore/serviceOrderService';
import { getAdvancePaymentsByCompany } from '@/lib/firestore/advancePaymentService';
import { getOrderAllotmentsByCompany } from '@/lib/firestore/orderAllotmentService';
import { getCompanyProfile } from '@/lib/firestore/companyService';
import { ServiceOrder, AdvancePayment, OrderAllotment } from '@/lib/types';
import jsPDF from 'jspdf';
import { savePdfMobile, openPdfForPrint } from '@/lib/mobilePdfUtils';

interface PaymentProps {
  onBack: () => void;
}

export function Payment({ onBack }: PaymentProps) {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentType[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [orderAllotments, setOrderAllotments] = useState<OrderAllotment[]>([]);
  const [availableOrders, setAvailableOrders] = useState<ServiceOrder[]>([]);
  const [advancePayments, setAdvancePayments] = useState<AdvancePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string>('');

  // Form state
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [orderCategory, setOrderCategory] = useState<OrderCategory>('male');
  const [orderQty, setOrderQty] = useState<number>(0);
  const [stitchingCost, setStitchingCost] = useState<number>(0);
  const [modeOfPayment, setModeOfPayment] = useState<PaymentMode>('cash');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [balanceAmount, setBalanceAmount] = useState<number>(0);

  // Search, Filter, Pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'exact' | 'range'>('all');
  const [exactDate, setExactDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Load data
  useEffect(() => {
    loadData();
  }, [user]);

  /**
   * Check if a service order has 'Delivered' status based on its allotment
   * Delivered status means:
   * - Job work tailor: status='stitched' or 'delivered' or serviceOrderStatus='ready'
   * - Employee tailor: serviceOrderStatus='ready'
   */
  const isDeliveredStatus = (serviceOrder: ServiceOrder, allotments: OrderAllotment[]): boolean => {
    // Find the allotment for this service order (exclude reassigned)
    const allotment = allotments.find(a => a.serviceOrderNo === serviceOrder.id && !a.reassigned);

    if (!allotment) {
      return false; // No allotment means not assigned yet
    }

    const allotmentStatus = allotment.status;
    const serviceOrderStatus = allotment.serviceOrderStatus;

    // Ready to deliver or ready to dispatch → Delivered
    // Job work: status='stitched' or 'delivered'
    // Employee: serviceOrderStatus='ready'
    return allotmentStatus === 'stitched' || allotmentStatus === 'delivered' || serviceOrderStatus === 'ready';
  };

  const loadData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const company = await getCompanyProfile(user.id);
      if (company) {
        setCompanyId(company.id);
        // Load payments using company.id
        const paymentList = await getPaymentsByCompany(company.id);
        setPayments(paymentList);
        // Load service orders using company.id (from newOrder collection)
        const orders = await getServiceOrdersByCompany(company.id);
        setServiceOrders(orders);
        console.log('[Payment] Loaded service orders:', orders.length);
        // Load order allotments to check delivery status
        const allotments = await getOrderAllotmentsByCompany(company.id);
        setOrderAllotments(allotments);
        console.log('[Payment] Loaded order allotments:', allotments.length);
        // Load advance payments using company.id
        const advances = await getAdvancePaymentsByCompany(company.id);
        setAdvancePayments(advances);
        console.log('[Payment] Loaded advance payments:', advances.length);
        // Filter available orders:
        // 1. Exclude orders that already have a payment
        // 2. Only include orders with 'Delivered' status (stitched/ready to dispatch)
        const paidOrderIds = paymentList.map(p => p.serviceOrderNo);
        const available = orders.filter(o =>
          !paidOrderIds.includes(o.id) && // Not yet paid
          o.orderStatus !== 'delivered' && // Not already completed
          isDeliveredStatus(o, allotments) // Has 'Delivered' status
        );
        setAvailableOrders(available);
        console.log('[Payment] Available orders for payment (Delivered status only):', available.length);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate advance payment for selected order
  const calculateAdvanceForOrder = (orderId: string): number => {
    console.log('[Payment] Calculating advance for order:', orderId);
    console.log('[Payment] Total advance payments loaded:', advancePayments.length);
    console.log('[Payment] All advance payments:', advancePayments);

    const advances = advancePayments.filter(ap => ap.serviceOrderNo === orderId);
    console.log('[Payment] Matching advance payments:', advances);

    const total = advances.reduce((sum, ap) => sum + (ap.amount || 0), 0);
    console.log('[Payment] Total advance amount:', total);

    return total;
  };

  // Handle order selection
  const handleOrderSelect = (orderId: string) => {
    setSelectedOrderId(orderId);
    const order = availableOrders.find(o => o.id === orderId);
    if (order) {
      setSelectedOrder(order);
      setOrderCategory(order.orderCategory);
      setOrderQty(order.orderQty);
      setStitchingCost(order.stitchingCost);

      // Calculate advance paid for this order
      const advance = calculateAdvanceForOrder(orderId);
      setAdvanceAmount(advance);

      // Calculate balance
      const balance = order.stitchingCost - advance;
      setBalanceAmount(balance > 0 ? balance : 0);
      setAmountPaid(balance > 0 ? balance : 0);
    }
  };

  const handleOpenDialog = () => {
    setSelectedOrderId('');
    setSelectedOrder(null);
    setOrderCategory('male');
    setOrderQty(0);
    setStitchingCost(0);
    setModeOfPayment('cash');
    setAmountPaid(0);
    setAdvanceAmount(0);
    setBalanceAmount(0);
    setShowDialog(true);
  };

  // Filter and Pagination Logic
  const filteredPayments = payments.filter(payment => {
    // Search filter
    const matchesSearch = searchTerm === '' ||
      payment.paymentNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.serviceOrderNo.toLowerCase().includes(searchTerm.toLowerCase());

    // Date filter
    let matchesDate = true;
    if (dateFilter === 'exact' && exactDate) {
      const paymentDate = startOfDay(new Date(payment.deliveredDate));
      const filterDate = startOfDay(new Date(exactDate));
      matchesDate = paymentDate.getTime() === filterDate.getTime();
    } else if (dateFilter === 'range' && startDate && endDate) {
      const paymentDate = new Date(payment.deliveredDate);
      matchesDate = isWithinInterval(paymentDate, {
        start: startOfDay(new Date(startDate)),
        end: endOfDay(new Date(endDate)),
      });
    }

    return matchesSearch && matchesDate;
  });

  const totalPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE);
  const paginatedPayments = filteredPayments.slice(
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

  // Generate Service Invoice PDF
  const generateServiceInvoicePDF = (payment: PaymentType, company: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    // Helper function to add text
    const addText = (text: string, x: number, y: number, options?: any) => {
      const { fontSize = 10, fontStyle = 'normal', align = 'left' } = options || {};
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', fontStyle);

      let xPos = x;
      if (align === 'center') xPos = pageWidth / 2;
      else if (align === 'right') xPos = pageWidth - margin;

      doc.text(text, xPos, y, { align });
    };

    // Header
    doc.setFillColor(220, 53, 69);
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setTextColor(255, 255, 255);
    addText(company?.name || 'Tailor Shop', pageWidth / 2, 15, { fontSize: 20, fontStyle: 'bold', align: 'center' });
    if (company?.phone) {
      addText(`Tel: ${company.phone}`, pageWidth / 2, 25, { fontSize: 9, align: 'center' });
    }

    // Title
    yPos = 45;
    doc.setFillColor(255, 193, 7);
    doc.rect(margin, yPos - 5, pageWidth - margin * 2, 12, 'F');
    doc.setTextColor(33, 37, 41);
    addText('SERVICE INVOICE', pageWidth / 2, yPos + 2, { fontSize: 14, fontStyle: 'bold', align: 'center' });

    yPos += 20;
    doc.setTextColor(0, 0, 0);

    // Invoice Details
    addText(`Invoice No: ${payment.paymentNo}`, margin, yPos, { fontStyle: 'bold' });
    addText(`Date: ${format(payment.deliveredDate, 'dd-MMM-yyyy')}`, pageWidth - margin - 60, yPos, { align: 'right' });
    yPos += 8;
    addText(`Service Order: ${payment.serviceOrderNo}`, margin, yPos);
    addText(`Order Date: ${format(payment.serviceOrderDate, 'dd-MMM-yyyy')}`, pageWidth - margin - 60, yPos, { align: 'right' });

    yPos += 15;

    // Customer Info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO:', margin, yPos);
    yPos += 6;
    doc.setDrawColor(220, 53, 69);
    doc.rect(margin, yPos - 3, pageWidth - margin * 2, 18, 'S');
    doc.setFont('helvetica', 'normal');
    addText(payment.customerName, margin + 3, yPos + 3, { fontSize: 11, fontStyle: 'bold' });
    if (payment.customerId) {
      addText(`Customer ID: ${payment.customerId}`, margin + 3, yPos + 10, { fontSize: 9 });
    }

    yPos += 25;

    // Order Details Table
    doc.setFont('helvetica', 'bold');
    doc.text('ORDER DETAILS', margin, yPos);
    yPos += 8;

    // Table Header
    doc.setFillColor(33, 37, 41);
    doc.rect(margin, yPos - 3, pageWidth - margin * 2, 10, 'F');
    doc.setTextColor(255, 255, 255);
    addText('Description', margin + 3, yPos + 3, { fontSize: 9, fontStyle: 'bold' });
    addText('Qty', margin + 100, yPos + 3, { fontSize: 9, fontStyle: 'bold' });
    addText('UOM', margin + 120, yPos + 3, { fontSize: 9, fontStyle: 'bold' });
    addText('Amount', pageWidth - margin - 25, yPos + 3, { fontSize: 9, fontStyle: 'bold', align: 'right' });

    yPos += 12;
    doc.setTextColor(0, 0, 0);

    // Table Row
    doc.setFillColor(248, 249, 250);
    doc.rect(margin, yPos - 3, pageWidth - margin * 2, 8, 'F');
    addText(`Stitching - ${payment.orderCategory}`, margin + 3, yPos + 1, { fontSize: 9 });
    addText(payment.orderQty.toString(), margin + 100, yPos + 1, { fontSize: 9 });
    addText(payment.uom, margin + 120, yPos + 1, { fontSize: 9 });
    addText(payment.stitchingCost.toFixed(2), pageWidth - margin - 25, yPos + 1, { fontSize: 9, align: 'right' });

    yPos += 15;

    // Payment Summary
    const summaryX = pageWidth - margin - 85;
    const summaryValueX = pageWidth - margin - 5;

    addText('Total Amount:', summaryX, yPos, { fontSize: 10 });
    addText(payment.stitchingCost.toFixed(2), summaryValueX, yPos, { fontSize: 10, align: 'right' });
    yPos += 7;

    if (payment.advancePayment > 0) {
      doc.setTextColor(40, 167, 69);
      addText('Advance Paid:', summaryX, yPos, { fontSize: 10 });
      addText(`-${payment.advancePayment.toFixed(2)}`, summaryValueX, yPos, { fontSize: 10, align: 'right' });
      yPos += 5;
      addText(`(${payment.modeOfPayment.toUpperCase()})`, summaryX + 35, yPos, { fontSize: 8 });
      yPos += 7;
    }

    doc.setTextColor(0, 0, 0);
    addText('Amount Paid:', summaryX, yPos, { fontSize: 10 });
    addText(payment.amountPaid.toFixed(2), summaryValueX, yPos, { fontSize: 10, align: 'right' });
    yPos += 7;

    // Balance Due (highlighted)
    doc.setFillColor(255, 193, 7);
    doc.rect(summaryX - 5, yPos - 4, 90, 12, 'F');
    doc.setFont('helvetica', 'bold');
    addText('BALANCE DUE:', summaryX, yPos + 3, { fontSize: 11, fontStyle: 'bold' });
    addText(payment.balanceAmount.toFixed(2), summaryValueX, yPos + 3, { fontSize: 12, fontStyle: 'bold', align: 'right' });

    yPos += 25;

    // Payment Mode
    doc.setFont('helvetica', 'normal');
    addText(`Payment Mode: ${payment.modeOfPayment.toUpperCase()}`, margin, yPos, { fontSize: 10 });

    yPos += 15;

    // Terms
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Conditions:', margin, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    const terms = [
      '1. Thank you for your business.',
      '2. Please verify the items before leaving.',
      '3. No refunds or exchanges after delivery.',
    ];
    terms.forEach(term => {
      doc.text(term, margin, yPos);
      yPos += 5;
    });

    // Footer
    doc.setFillColor(33, 37, 41);
    doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
    doc.setTextColor(255, 255, 255);
    addText('Thank you for your business!', pageWidth / 2, pageHeight - 12, { fontSize: 10, fontStyle: 'italic', align: 'center' });

    return doc;
  };

  const handleDownloadInvoice = async (payment: PaymentType) => {
    try {
      const company = await getCompanyProfile(user!.id);
      const doc = generateServiceInvoicePDF(payment, company);
      const filename = `Service_Invoice_${payment.paymentNo}_${payment.customerName.replace(/\s+/g, '_')}.pdf`;
      await savePdfMobile(doc, filename);
      toast.success('Invoice downloaded successfully');
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
    }
  };

  const handlePrintInvoice = async (payment: PaymentType) => {
    try {
      const company = await getCompanyProfile(user!.id);
      const doc = generateServiceInvoicePDF(payment, company);
      const filename = `Service_Invoice_${payment.paymentNo}_${payment.customerName.replace(/\s+/g, '_')}.pdf`;
      await openPdfForPrint(doc, filename);
      toast.success('Opening invoice for printing');
    } catch (error) {
      console.error('Error printing invoice:', error);
      toast.error('Failed to print invoice');
    }
  };

  const handleConfirmPayment = () => {
    if (!selectedOrderId || !selectedOrder) {
      toast.error('Please select a Service Order');
      return;
    }

    if (!companyId || !user?.id) {
      toast.error('Company profile not found');
      return;
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const handleSave = async () => {
    setShowConfirmDialog(false);

    if (!selectedOrderId || !selectedOrder) {
      toast.error('Please select a Service Order');
      return;
    }

    if (!companyId || !user?.id) {
      toast.error('Company profile not found');
      return;
    }

    setSaving(true);
    try {
      const newPayment = await createPayment(
        {
          serviceOrderNo: selectedOrderId,
          serviceOrderDate: selectedOrder.serviceOrderDate,
          customerName: selectedOrder.customerName,
          customerId: selectedOrder.customerId,
          orderCategory,
          orderQty,
          stitchingCost,
          modeOfPayment,
          advancePayment: advanceAmount,
          amountPaid,
        },
        companyId,
        user.id
      );

      // Update service order status to 'delivered' after payment (marks as Completed)
      await updateServiceOrderStatus(selectedOrderId, 'delivered');
      console.log(`[Payment] Updated service order ${selectedOrderId} status to 'delivered' (Completed)`);

      setPayments(prev => [newPayment, ...prev]);
      // Remove paid order from available orders
      setAvailableOrders(prev => prev.filter(o => o.id !== selectedOrderId));
      // Update local service orders state
      setServiceOrders(prev => prev.map(o =>
        o.id === selectedOrderId ? { ...o, orderStatus: 'delivered' as const } : o
      ));
      setShowDialog(false);
      toast.success(`Payment ${newPayment.paymentNo} created successfully. Order marked as Completed.`);
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error('Failed to create payment');
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
          Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredPayments.length)} of {filteredPayments.length}
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
          <p className="text-muted-foreground">Loading payments...</p>
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
            <h1 className="text-xl font-bold">Payment</h1>
            <p className="text-sm text-muted-foreground">{payments.length} total payments</p>
          </div>
        </div>
        <Button onClick={handleOpenDialog} className="bg-[#6A64F2] hover:bg-[#5b55e0]">
          <Plus size={18} className="mr-1" />
          New Payment
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by payment no, customer, or service order..."
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

      {/* Payments Grid - Rectangle Cards */}
      {paginatedPayments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground rounded-lg border" style={{ background: '#FAF8FF' }}>
          <CurrencyInr size={48} className="mx-auto mb-3 opacity-30" />
          <p>{hasActiveFilters ? 'No payments match your search' : 'No payments yet'}</p>
          {!hasActiveFilters && <p className="text-sm mt-1">Click "New Payment" to create one</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedPayments.map((payment, index) => (
            <div
              key={payment.id}
              className={`rounded-xl border-2 hover:shadow-lg transition-all p-4 cursor-pointer w-full flex flex-row gap-4 shadow-sm animate-on-load animate-fade-slide-up stagger-${(index % 6) + 1}`}
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #faf8ff 100%)',
                borderColor: '#6A64F2',
                boxShadow: '0 4px 12px -2px rgba(106, 100, 242, 0.2), 0 2px 6px -2px rgba(106, 100, 242, 0.15)',
              }}
            >
              {/* Left: Currency Icon */}
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white flex-shrink-0 text-lg font-bold"
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)' }}
              >
                <CurrencyInr size={24} weight="bold" />
              </div>

              {/* Middle: Details */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm truncate" style={{ color: '#6A64F2' }}>
                    {payment.paymentNo}
                  </span>
                  <Badge
                    className={`text-[10px] px-1.5 py-0 ${
                      payment.modeOfPayment === 'cash'
                        ? 'bg-green-100 text-green-700 border-green-300'
                        : payment.modeOfPayment === 'qr_pay'
                        ? 'bg-blue-100 text-blue-700 border-blue-300'
                        : 'bg-gray-100 text-gray-700 border-gray-300'
                    }`}
                    variant="outline"
                  >
                    {payment.modeOfPayment === 'cash' ? 'Cash' : payment.modeOfPayment === 'qr_pay' ? 'QR Pay' : 'Nil'}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-gray-900 truncate">{payment.customerName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  SO: {payment.serviceOrderNo} • {payment.orderCategory}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(payment.deliveredDate), 'dd MMM yyyy')}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-green-600">₹{payment.amountPaid.toLocaleString()}</span>
                  {payment.balanceAmount > 0 && (
                    <span className="text-xs text-red-500">Bal: ₹{payment.balanceAmount.toLocaleString()}</span>
                  )}
                </div>
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
                    <DropdownMenuItem onClick={() => handleDownloadInvoice(payment)}>
                      <FilePdf size={16} className="mr-2" />
                      Download PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handlePrintInvoice(payment)}>
                      <Printer size={16} className="mr-2" />
                      Print Invoice
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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>New Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Service Order No */}
            <div className="space-y-2">
              <Label htmlFor="serviceOrderNo">Service Order No *</Label>
              <Select value={selectedOrderId} onValueChange={handleOrderSelect}>
                <SelectTrigger id="serviceOrderNo">
                  <SelectValue placeholder="Select Service Order" />
                </SelectTrigger>
                <SelectContent>
                  {availableOrders.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No new orders available
                    </div>
                  ) : (
                    availableOrders.map(order => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.id} - {order.customerName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Service Order Date - Auto */}
            <div className="space-y-2">
              <Label>Service Order Date</Label>
              <Input
                value={selectedOrder ? format(selectedOrder.serviceOrderDate, 'dd MMM yyyy') : format(new Date(), 'dd MMM yyyy')}
                disabled
                className="bg-muted"
              />
            </div>

            {/* Customer Name - Auto from order */}
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input
                value={selectedOrder?.customerName || ''}
                disabled
                className="bg-muted"
              />
            </div>

            {/* Order Category */}
            <div className="space-y-2">
              <Label htmlFor="orderCategory">Order Category *</Label>
              <Select value={orderCategory} onValueChange={(v) => setOrderCategory(v as OrderCategory)}>
                <SelectTrigger id="orderCategory">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Men</SelectItem>
                  <SelectItem value="female">Women</SelectItem>
                  <SelectItem value="kids">Kids</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Order Qty */}
            <div className="space-y-2">
              <Label htmlFor="orderQty">Order Qty</Label>
              <Input
                id="orderQty"
                type="number"
                value={orderQty}
                onChange={(e) => setOrderQty(Number(e.target.value))}
                min={0}
              />
            </div>

            {/* UOM - Fixed */}
            <div className="space-y-2">
              <Label>UOM</Label>
              <Input
                value="Nos"
                disabled
                className="bg-muted"
              />
            </div>

            {/* Stitching Cost */}
            <div className="space-y-2">
              <Label htmlFor="stitchingCost">Stitching Cost (₹)</Label>
              <Input
                id="stitchingCost"
                type="number"
                value={stitchingCost}
                onChange={(e) => {
                  const cost = Number(e.target.value);
                  setStitchingCost(cost);
                  const balance = cost - advanceAmount;
                  setBalanceAmount(balance > 0 ? balance : 0);
                }}
                min={0}
              />
            </div>

            {/* Delivered Date - Auto */}
            <div className="space-y-2">
              <Label>Delivered Date</Label>
              <Input
                value={format(new Date(), 'dd MMM yyyy')}
                disabled
                className="bg-muted"
              />
            </div>

            {/* Mode of Payment */}
            <div className="space-y-2">
              <Label htmlFor="modeOfPayment">Mode of Payment *</Label>
              <Select value={modeOfPayment} onValueChange={(v) => setModeOfPayment(v as PaymentMode)}>
                <SelectTrigger id="modeOfPayment">
                  <SelectValue placeholder="Select payment mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="qr_pay">QR Pay</SelectItem>
                  <SelectItem value="nil">Nil</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Advance Payment Info */}
            {advanceAmount > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700">
                  <strong>Advance Paid:</strong> ₹{advanceAmount.toLocaleString()}
                </p>
                <p className="text-sm text-blue-700">
                  <strong>Balance Due:</strong> ₹{balanceAmount.toLocaleString()}
                </p>
              </div>
            )}

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amountPaid">Amount (₹) *</Label>
              <Input
                id="amountPaid"
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(Number(e.target.value))}
                min={0}
              />
              {advanceAmount > 0 && (
                <p className="text-xs text-muted-foreground">
                  Remaining after advance deduction: ₹{balanceAmount.toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPayment} disabled={saving}>
              {saving ? 'Creating...' : 'Create Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Confirmation Dialog */}
      <StatusChangeConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        onConfirm={handleSave}
        type="delivered"
        orderInfo={{
          orderNo: selectedOrderId,
          customerName: selectedOrder?.customerName,
        }}
        isLoading={saving}
      />
    </div>
  );
}

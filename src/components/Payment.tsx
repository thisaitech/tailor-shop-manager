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
  initialOrderId?: string; // Pre-select an order when navigating from Ready to Deliver
  closeInternalView?: boolean;
  onCloseInternalViewHandled?: () => void;
  onInternalViewChange?: (hasInternalView: boolean) => void;
}

export function Payment({ onBack, initialOrderId, closeInternalView, onCloseInternalViewHandled, onInternalViewChange }: PaymentProps) {
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

  // Track if any dialog is open and notify parent
  useEffect(() => {
    const hasOpenDialog = showDialog || showConfirmDialog || showFilters;
    onInternalViewChange?.(hasOpenDialog);
  }, [showDialog, showConfirmDialog, showFilters, onInternalViewChange]);

  // Handle close internal view signal from parent (back button)
  useEffect(() => {
    if (closeInternalView) {
      // Close dialogs in priority order
      if (showConfirmDialog) {
        setShowConfirmDialog(false);
        onCloseInternalViewHandled?.();
      } else if (showDialog) {
        setShowDialog(false);
        onCloseInternalViewHandled?.();
      } else if (showFilters) {
        setShowFilters(false);
        onCloseInternalViewHandled?.();
      } else {
        // No dialogs open, signal handled
        onCloseInternalViewHandled?.();
      }
    }
  }, [closeInternalView, showDialog, showConfirmDialog, showFilters, onCloseInternalViewHandled]);

  // Load data
  useEffect(() => {
    loadData();
  }, [user]);

  // Auto-open dialog with initial order when navigating from Ready to Deliver
  useEffect(() => {
    if (initialOrderId && !loading && serviceOrders.length > 0) {
      // Find the order in service orders
      const order = serviceOrders.find(o => o.id === initialOrderId);
      if (order) {
        // Check if it's in available orders
        const isAvailable = availableOrders.some(o => o.id === initialOrderId);
        
        if (!isAvailable) {
          // Add to available orders if not already there
          setAvailableOrders(prev => [order, ...prev.filter(o => o.id !== initialOrderId)]);
        }
        
        // Open dialog and pre-fill order details directly
        setShowDialog(true);
        setSelectedOrderId(initialOrderId);
        setSelectedOrder(order);
        setOrderCategory(order.orderCategory);
        setOrderQty(order.orderQty);
        setStitchingCost(order.stitchingCost);
        
        // Calculate advance paid for this order
        const advances = advancePayments.filter(ap => ap.serviceOrderNo === initialOrderId);
        const advance = advances.reduce((sum, ap) => sum + (ap.amount || 0), 0);
        setAdvanceAmount(advance);
        
        // Calculate balance
        const balance = order.stitchingCost - advance;
        setBalanceAmount(balance > 0 ? balance : 0);
        setAmountPaid(balance > 0 ? balance : 0);
      }
    }
  }, [initialOrderId, loading, serviceOrders.length, advancePayments.length]);

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

  // Calculate stats
  const totalCollected = payments.reduce((sum, p) => sum + p.amountPaid, 0);
  const totalPending = payments.reduce((sum, p) => sum + p.balanceAmount, 0);
  const todayPayments = payments.filter(p => {
    const today = startOfDay(new Date());
    const paymentDate = startOfDay(new Date(p.deliveredDate));
    return paymentDate.getTime() === today.getTime();
  });
  const todayTotal = todayPayments.reduce((sum, p) => sum + p.amountPaid, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #faf8ff 0%, #f3e8ff 100%)' }}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)' }}>
            <Spinner size={32} className="animate-spin text-white" />
          </div>
          <p className="text-muted-foreground font-medium">Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: 'linear-gradient(135deg, #faf8ff 0%, #f3e8ff 100%)' }}>
      {/* Premium Header */}
      <div 
        className="relative overflow-hidden px-4 pt-4 pb-6"
        style={{ 
          background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #8b5cf6 100%)',
        }}
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }} />
        
        {/* Header Content */}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onBack}
                className="text-white hover:bg-white/20 rounded-full"
              >
                <ArrowLeft size={22} weight="bold" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-white">Payments</h1>
                <p className="text-white/70 text-sm">{payments.length} transactions</p>
              </div>
            </div>
            <Button 
              onClick={handleOpenDialog} 
              className="bg-white text-purple-700 hover:bg-white/90 font-semibold shadow-lg"
            >
              <Plus size={18} weight="bold" className="mr-1" />
              New
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 border border-white/20">
              <p className="text-white/70 text-[10px] font-medium uppercase tracking-wide">Today</p>
              <p className="text-white text-lg font-bold mt-0.5">₹{todayTotal.toLocaleString()}</p>
              <p className="text-white/60 text-[10px]">{todayPayments.length} payments</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 border border-white/20">
              <p className="text-white/70 text-[10px] font-medium uppercase tracking-wide">Collected</p>
              <p className="text-emerald-300 text-lg font-bold mt-0.5">₹{totalCollected.toLocaleString()}</p>
              <p className="text-white/60 text-[10px]">Total received</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 border border-white/20">
              <p className="text-white/70 text-[10px] font-medium uppercase tracking-wide">Pending</p>
              <p className="text-amber-300 text-lg font-bold mt-0.5">₹{totalPending.toLocaleString()}</p>
              <p className="text-white/60 text-[10px]">Balance due</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 -mt-2 relative z-10">
        {/* Search and Filters Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-purple-100 p-4 mb-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
              <Input
                placeholder="Search payments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-purple-200 focus:border-purple-400 focus:ring-purple-400 bg-purple-50/50"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className={`border-purple-200 ${showFilters ? 'bg-purple-100 border-purple-400 text-purple-700' : 'text-purple-500'}`}
            >
              <Funnel size={18} weight={showFilters ? 'fill' : 'regular'} />
            </Button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-purple-100">
              <FilterButtons />
              {dateFilter === 'exact' && (
                <div className="mt-3">
                  <Label htmlFor="exactDate" className="text-sm text-purple-700">Select Date</Label>
                  <Input
                    id="exactDate"
                    type="date"
                    value={exactDate}
                    onChange={(e) => setExactDate(e.target.value)}
                    className="mt-1 max-w-xs border-purple-200"
                  />
                </div>
              )}
              {dateFilter === 'range' && (
                <div className="mt-3 flex gap-4 flex-wrap">
                  <div>
                    <Label htmlFor="startDate" className="text-sm text-purple-700">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="mt-1 border-purple-200"
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate" className="text-sm text-purple-700">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="mt-1 border-purple-200"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results Count */}
        {hasActiveFilters && filteredPayments.length > 0 && (
          <p className="text-sm text-purple-600 font-medium mb-3 px-1">
            Found {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''}
          </p>
        )}

        {/* Payments List */}
        {paginatedPayments.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-purple-100 p-8 text-center">
            <div 
              className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)' }}
            >
              <CurrencyInr size={40} weight="duotone" className="text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">
              {hasActiveFilters ? 'No Results Found' : 'No Payments Yet'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {hasActiveFilters 
                ? 'Try adjusting your search or filters' 
                : 'Create your first payment to get started'}
            </p>
            {!hasActiveFilters && (
              <Button onClick={handleOpenDialog} className="bg-purple-600 hover:bg-purple-700">
                <Plus size={18} className="mr-1" />
                Create Payment
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedPayments.map((payment, index) => (
              <div
                key={payment.id}
                className={`bg-white rounded-xl shadow-md border border-purple-100 p-4 transition-all hover:shadow-lg hover:border-purple-300 animate-on-load animate-fade-slide-up stagger-${(index % 6) + 1}`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ 
                      background: payment.balanceAmount > 0 
                        ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
                        : 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                    }}
                  >
                    <CurrencyInr size={24} weight="bold" className="text-white" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-purple-700 text-sm">{payment.paymentNo}</span>
                      <Badge
                        className={`text-[10px] px-2 py-0.5 font-semibold ${
                          payment.modeOfPayment === 'cash'
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                            : payment.modeOfPayment === 'qr_pay'
                            ? 'bg-blue-100 text-blue-700 border-blue-300'
                            : 'bg-gray-100 text-gray-600 border-gray-300'
                        }`}
                        variant="outline"
                      >
                        {payment.modeOfPayment === 'cash' ? '💵 Cash' : payment.modeOfPayment === 'qr_pay' ? '📱 QR Pay' : 'Nil'}
                      </Badge>
                    </div>
                    
                    <p className="font-semibold text-gray-800 truncate">{payment.customerName}</p>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <span className="bg-purple-50 px-2 py-0.5 rounded-full text-purple-600 font-medium">
                        {payment.serviceOrderNo}
                      </span>
                      <span>•</span>
                      <span className="capitalize">{payment.orderCategory}</span>
                      <span>•</span>
                      <span>{format(new Date(payment.deliveredDate), 'dd MMM')}</span>
                    </div>

                    {/* Amount Row */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase font-medium">Paid</p>
                          <p className="text-lg font-bold text-emerald-600">₹{payment.amountPaid.toLocaleString()}</p>
                        </div>
                        {payment.balanceAmount > 0 && (
                          <div className="pl-3 border-l border-gray-200">
                            <p className="text-[10px] text-gray-400 uppercase font-medium">Balance</p>
                            <p className="text-lg font-bold text-amber-600">₹{payment.balanceAmount.toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-purple-100">
                            <DotsThree size={22} weight="bold" className="text-purple-600" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => handleDownloadInvoice(payment)} className="gap-2">
                            <FilePdf size={18} weight="duotone" className="text-red-500" />
                            Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePrintInvoice(payment)} className="gap-2">
                            <Printer size={18} weight="duotone" className="text-blue-500" />
                            Print Invoice
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        <Pagination />
      </div>

      {/* Create Dialog - Premium Styled */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-hidden p-0" aria-describedby={undefined}>
          {/* Dialog Header with Gradient */}
          <div 
            className="px-6 py-4"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)' }}
          >
            <DialogHeader>
              <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
                <CurrencyInr size={24} weight="bold" />
                New Payment
              </DialogTitle>
            </DialogHeader>
          </div>
          
          {/* Dialog Content */}
          <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Service Order Selection */}
            <div className="space-y-2">
              <Label htmlFor="serviceOrderNo" className="text-sm font-semibold text-purple-700">
                Service Order *
              </Label>
              <Select value={selectedOrderId} onValueChange={handleOrderSelect}>
                <SelectTrigger id="serviceOrderNo" className="border-purple-200 focus:ring-purple-400">
                  <SelectValue placeholder="Select a delivered order" />
                </SelectTrigger>
                <SelectContent>
                  {availableOrders.length === 0 ? (
                    <div className="p-4 text-sm text-center">
                      <p className="text-muted-foreground">No orders ready for payment</p>
                      <p className="text-xs text-purple-500 mt-1">Orders must be delivered first</p>
                    </div>
                  ) : (
                    availableOrders.map(order => (
                      <SelectItem key={order.id} value={order.id} className="py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold">{order.id}</span>
                          <span className="text-xs text-muted-foreground">{order.customerName}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Order Details Card - Only show when order selected */}
            {selectedOrder && (
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200">
                <h4 className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-3">Order Details</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase">Customer</p>
                    <p className="font-semibold text-gray-800 text-sm truncate">{selectedOrder.customerName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase">Order Date</p>
                    <p className="font-semibold text-gray-800 text-sm">{format(selectedOrder.serviceOrderDate, 'dd MMM yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase">Category</p>
                    <p className="font-semibold text-gray-800 text-sm capitalize">{selectedOrder.orderCategory}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase">Quantity</p>
                    <p className="font-semibold text-gray-800 text-sm">{selectedOrder.orderQty} Nos</p>
                  </div>
                </div>
              </div>
            )}

            {/* Amount Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
              <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Payment Details</h4>
              
              {/* Stitching Cost */}
              <div className="space-y-1">
                <Label htmlFor="stitchingCost" className="text-sm">Total Amount (₹)</Label>
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
                  className="text-lg font-bold border-purple-200"
                />
              </div>

              {/* Advance Payment Info */}
              {advanceAmount > 0 && (
                <div className="flex items-center justify-between py-2 px-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="text-sm text-emerald-700">Advance Paid</span>
                  <span className="font-bold text-emerald-700">- ₹{advanceAmount.toLocaleString()}</span>
                </div>
              )}

              {/* Balance Due */}
              {advanceAmount > 0 && (
                <div className="flex items-center justify-between py-2 px-3 bg-amber-50 rounded-lg border border-amber-200">
                  <span className="text-sm text-amber-700 font-medium">Balance Due</span>
                  <span className="font-bold text-amber-700 text-lg">₹{balanceAmount.toLocaleString()}</span>
                </div>
              )}

              {/* Mode of Payment */}
              <div className="space-y-2">
                <Label className="text-sm">Payment Mode *</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'cash', label: '💵 Cash', color: 'emerald' },
                    { value: 'qr_pay', label: '📱 QR Pay', color: 'blue' },
                    { value: 'nil', label: '⏸️ Nil', color: 'gray' },
                  ].map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => setModeOfPayment(mode.value as PaymentMode)}
                      className={`py-3 px-2 rounded-lg border-2 text-sm font-semibold transition-all ${
                        modeOfPayment === mode.value
                          ? mode.color === 'emerald' 
                            ? 'bg-emerald-100 border-emerald-500 text-emerald-700'
                            : mode.color === 'blue'
                            ? 'bg-blue-100 border-blue-500 text-blue-700'
                            : 'bg-gray-100 border-gray-500 text-gray-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Paid */}
              <div className="space-y-1">
                <Label htmlFor="amountPaid" className="text-sm">Amount Received (₹) *</Label>
                <Input
                  id="amountPaid"
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                  min={0}
                  className="text-xl font-bold text-emerald-600 border-emerald-300 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Dialog Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowDialog(false)} 
              disabled={saving}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmPayment} 
              disabled={saving || !selectedOrderId}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {saving ? (
                <>
                  <Spinner size={16} className="animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                'Confirm Payment'
              )}
            </Button>
          </div>
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

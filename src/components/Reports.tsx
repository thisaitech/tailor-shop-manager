import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { toast } from 'sonner';
import {
  ArrowLeft,
  ChartBar,
  FilePdf,
  Printer,
  MagnifyingGlass,
  Funnel,
  X,
  CaretLeft,
  CaretRight,
  Spinner,
  Package,
  CurrencyInr,
  User,
  Eye,
} from '@phosphor-icons/react';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import jsPDF from 'jspdf';
import { savePdfMobile, openPdfForPrint } from '@/lib/mobilePdfUtils';
import { getPaymentsByCompany, Payment as PaymentType } from '@/lib/firestore/paymentService';
import { getServiceOrdersByCompany } from '@/lib/firestore/serviceOrderService';
import { getAdvancePaymentsByCompany } from '@/lib/firestore/advancePaymentService';
import { getCompanyProfile } from '@/lib/firestore/companyService';
import { getCustomerById } from '@/lib/firestore/customerService';
import { AdvancePayment, Customer, ServiceOrder } from '@/lib/types';

interface ReportsProps {
  onBack: () => void;
}

type ReportType = 'summary' | 'orders' | 'payments';
type DateFilter = 'all' | 'exact' | 'range';
type PaymentLineType = 'advance' | 'delivery' | 'payment';

interface ReportPaymentLine {
  id: string;
  type: PaymentLineType;
  referenceNo: string;
  serviceOrderNo: string;
  customerName: string;
  date: number;
  amount: number;
  balanceAmount?: number;
  modeOfPayment: string;
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  awaiting: 'Awaiting',
  waitingForDC: 'Waiting for DC',
  inprogress: 'In Progress',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  ready: 'Ready to Deliver',
  finished: 'Finished',
  'job-completed': 'Job Completed',
  'received-note': 'Received Note',
  delivered: 'Delivered',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-gray-100 text-gray-700',
  awaiting: 'bg-amber-100 text-amber-700',
  waitingForDC: 'bg-orange-100 text-orange-700',
  inprogress: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-700',
  ready: 'bg-emerald-100 text-emerald-700',
  finished: 'bg-indigo-100 text-indigo-700',
  'job-completed': 'bg-violet-100 text-violet-700',
  'received-note': 'bg-cyan-100 text-cyan-700',
  delivered: 'bg-purple-100 text-purple-700',
};

function matchesDateFilter(
  timestamp: number | undefined,
  dateFilter: DateFilter,
  exactDate: string,
  startDate: string,
  endDate: string
): boolean {
  if (dateFilter === 'all') return true;
  if (!timestamp) return false;
  if (dateFilter === 'exact') {
    if (!exactDate) return true;
    return startOfDay(new Date(timestamp)).getTime() === startOfDay(new Date(exactDate)).getTime();
  }
  if (dateFilter === 'range') {
    if (!startDate || !endDate) return true;
    return isWithinInterval(new Date(timestamp), {
      start: startOfDay(new Date(startDate)),
      end: endOfDay(new Date(endDate)),
    });
  }
  return true;
}

function formatPaymentMode(mode: string | undefined): string {
  if (mode === 'cash') return 'Cash';
  if (mode === 'qr_pay' || mode === 'qrpay') return 'QR Pay';
  if (mode === 'nil') return 'Nil';
  return mode || '—';
}

function buildPaymentLines(
  serviceOrders: ServiceOrder[],
  payments: PaymentType[],
  advances: AdvancePayment[]
): ReportPaymentLine[] {
  const paymentByOrder = new Map(payments.map(p => [p.serviceOrderNo, p]));
  const lines: ReportPaymentLine[] = [];

  advances.forEach(advance => {
    if ((advance.amount || 0) <= 0) return;
    lines.push({
      id: `advance-${advance.id}`,
      type: 'advance',
      referenceNo: advance.proformaInvoiceNo || advance.id,
      serviceOrderNo: advance.serviceOrderNo,
      customerName: advance.customerName,
      date: advance.proformaInvoiceDate || advance.createdAt,
      amount: advance.amount,
      modeOfPayment: formatPaymentMode(advance.modeOfPayment),
    });
  });

  payments.forEach(payment => {
    if ((payment.amountPaid || 0) <= 0) return;
    lines.push({
      id: `payment-${payment.id}`,
      type: 'payment',
      referenceNo: payment.paymentNo,
      serviceOrderNo: payment.serviceOrderNo,
      customerName: payment.customerName,
      date: payment.deliveredDate || payment.createdAt,
      amount: payment.amountPaid,
      balanceAmount: payment.balanceAmount,
      modeOfPayment: formatPaymentMode(payment.modeOfPayment),
    });
  });

  serviceOrders.forEach(order => {
    if (order.orderStatus !== 'delivered') return;
    if ((order.amountReceivedAtDelivery || 0) <= 0) return;
    if (paymentByOrder.has(order.id)) return;

    lines.push({
      id: `delivery-${order.id}`,
      type: 'delivery',
      referenceNo: order.id,
      serviceOrderNo: order.id,
      customerName: order.customerName,
      date: order.deliveredDate || order.updatedAt,
      amount: order.amountReceivedAtDelivery || 0,
      balanceAmount: order.balanceAmount,
      modeOfPayment: formatPaymentMode(order.deliveryPaymentMode),
    });
  });

  return lines.sort((a, b) => b.date - a.date);
}

function generateCustomerReportPDF(
  companyName: string,
  customer: Customer | null,
  customerName: string,
  customerId: string,
  orders: ServiceOrder[],
  paymentLines: ReportPaymentLine[]
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  const addLine = (text: string, opts?: { bold?: boolean; size?: number }) => {
    doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
    doc.setFontSize(opts?.size || 10);
    doc.text(text, margin, y);
    y += opts?.size && opts.size > 10 ? 8 : 6;
  };

  const totalOrderValue = orders.reduce(
    (sum, o) => sum + (o.totalAmount || o.stitchingCost || 0),
    0
  );
  const collected = paymentLines.reduce((sum, line) => sum + line.amount, 0);
  const pendingBalance = orders.reduce((sum, o) => sum + Math.max(0, o.balanceAmount ?? 0), 0);

  doc.setFillColor(106, 100, 242);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Customer Report', margin, 14);
  doc.setFontSize(9);
  doc.text(companyName, margin, 22);
  doc.setTextColor(33, 37, 41);
  y = 38;

  addLine(`Customer: ${customerName}`, { bold: true, size: 12 });
  addLine(`Customer ID: ${customerId}`);
  if (customer?.phone) addLine(`Phone: ${customer.phone}`);
  addLine(`Generated: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`);
  y += 4;

  addLine('Summary', { bold: true, size: 12 });
  addLine(`Total Orders: ${orders.length}`);
  addLine(`Order Value: Rs.${totalOrderValue.toLocaleString('en-IN')}`);
  addLine(`Total Collected: Rs.${collected.toLocaleString('en-IN')}`);
  addLine(`Pending Balance: Rs.${pendingBalance.toLocaleString('en-IN')}`);
  y += 4;

  if (orders.length > 0) {
    addLine('Orders', { bold: true, size: 12 });
    orders.forEach(order => {
      if (y > 270) {
        doc.addPage();
        y = margin;
      }
      const amount = order.totalAmount || order.stitchingCost || 0;
      addLine(
        `${order.id} | ${STATUS_LABELS[order.orderStatus] || order.orderStatus} | ${format(new Date(order.createdAt || order.serviceOrderDate), 'dd/MM/yy')} | Rs.${amount}`
      );
    });
    y += 4;
  }

  if (paymentLines.length > 0) {
    addLine('Payments', { bold: true, size: 12 });
    paymentLines.forEach(line => {
      if (y > 270) {
        doc.addPage();
        y = margin;
      }
      const typeLabel =
        line.type === 'advance' ? 'Advance' : line.type === 'delivery' ? 'Delivery' : 'Payment';
      addLine(
        `${typeLabel} | ${line.referenceNo} | ${line.serviceOrderNo} | Rs.${line.amount} | ${format(new Date(line.date), 'dd/MM/yy')}`
      );
    });
  }

  return doc;
}

export function Reports({ onBack }: ReportsProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState('');
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [payments, setPayments] = useState<PaymentType[]>([]);
  const [advancePayments, setAdvancePayments] = useState<AdvancePayment[]>([]);

  const [reportType, setReportType] = useState<ReportType>('summary');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [exactDate, setExactDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const [customerProfile, setCustomerProfile] = useState<Customer | null>(null);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [showCustomerDetail, setShowCustomerDetail] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const company = await getCompanyProfile(user.id);
      if (!company) return;
      setCompanyName(company.companyName || 'Tailor Shop');
      const [orders, paymentList, advances] = await Promise.all([
        getServiceOrdersByCompany(company.id),
        getPaymentsByCompany(company.id),
        getAdvancePaymentsByCompany(company.id),
      ]);
      setServiceOrders(orders);
      setPayments(paymentList);
      setAdvancePayments(advances);
    } catch (error) {
      console.error('Error loading report data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const orderMatchesSearch = (order: ServiceOrder, term: string): boolean => {
    if (!term) return true;
    const q = term.toLowerCase().trim();
    const status = order.orderStatus || 'open';
    const statusLabel = (STATUS_LABELS[status] || status).toLowerCase();
    return (
      order.id.toLowerCase().includes(q) ||
      (order.customerName || '').toLowerCase().includes(q) ||
      (order.customerId || '').toLowerCase().includes(q) ||
      status.toLowerCase().includes(q) ||
      statusLabel.includes(q)
    );
  };

  const filteredOrders = useMemo(() => {
    const searching = searchTerm.trim().length > 0;
    return serviceOrders.filter(order => {
      const matchesSearch = orderMatchesSearch(order, searchTerm);
      const matchesStatus =
        searching || statusFilter === 'all' || order.orderStatus === statusFilter;
      const orderDate = order.createdAt || order.serviceOrderDate;
      const matchesDate = matchesDateFilter(orderDate, dateFilter, exactDate, startDate, endDate);
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [serviceOrders, searchTerm, statusFilter, dateFilter, exactDate, startDate, endDate]);

  const allPaymentLines = useMemo(
    () => buildPaymentLines(serviceOrders, payments, advancePayments),
    [serviceOrders, payments, advancePayments]
  );

  const filteredPaymentLines = useMemo(() => {
    return allPaymentLines.filter(line => {
      const matchesSearch =
        searchTerm === '' ||
        line.referenceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        line.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        line.serviceOrderNo.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = matchesDateFilter(line.date, dateFilter, exactDate, startDate, endDate);
      return matchesSearch && matchesDate;
    });
  }, [allPaymentLines, searchTerm, dateFilter, exactDate, startDate, endDate]);

  const orderStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredOrders.forEach(order => {
      const status = order.orderStatus || 'open';
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }, [filteredOrders]);

  const summaryStats = useMemo(() => {
    const totalOrderValue = filteredOrders.reduce(
      (sum, o) => sum + (o.totalAmount || o.stitchingCost || 0),
      0
    );
    const collected = filteredPaymentLines.reduce((sum, line) => sum + (line.amount || 0), 0);
    const advanceCollected = filteredPaymentLines
      .filter(line => line.type === 'advance')
      .reduce((sum, line) => sum + line.amount, 0);
    const deliveryCollected = filteredPaymentLines
      .filter(line => line.type === 'delivery' || line.type === 'payment')
      .reduce((sum, line) => sum + line.amount, 0);
    const pendingBalance = filteredOrders.reduce(
      (sum, o) => sum + Math.max(0, o.balanceAmount ?? 0),
      0
    );
    const deliveredCount = filteredOrders.filter(o => o.orderStatus === 'delivered').length;
    const inProgressCount = filteredOrders.filter(o => o.orderStatus === 'inprogress').length;
    return {
      totalOrders: filteredOrders.length,
      deliveredCount,
      inProgressCount,
      totalOrderValue,
      collected,
      advanceCollected,
      deliveryCollected,
      pendingBalance,
      paymentCount: filteredPaymentLines.length,
    };
  }, [filteredOrders, filteredPaymentLines]);

  const customerOrders = useMemo(() => {
    if (!selectedCustomerId) return [];
    return serviceOrders
      .filter(order => order.customerId === selectedCustomerId)
      .sort((a, b) => (b.createdAt || b.serviceOrderDate) - (a.createdAt || a.serviceOrderDate));
  }, [serviceOrders, selectedCustomerId]);

  const customerPaymentLines = useMemo(() => {
    if (!selectedCustomerId) return [];
    const orderIds = new Set(customerOrders.map(order => order.id));
    return allPaymentLines.filter(line => orderIds.has(line.serviceOrderNo));
  }, [allPaymentLines, customerOrders, selectedCustomerId]);

  const customerReportStats = useMemo(() => {
    const totalOrderValue = customerOrders.reduce(
      (sum, o) => sum + (o.totalAmount || o.stitchingCost || 0),
      0
    );
    const collected = customerPaymentLines.reduce((sum, line) => sum + line.amount, 0);
    const pendingBalance = customerOrders.reduce(
      (sum, o) => sum + Math.max(0, o.balanceAmount ?? 0),
      0
    );
    return {
      totalOrders: customerOrders.length,
      totalOrderValue,
      collected,
      pendingBalance,
    };
  }, [customerOrders, customerPaymentLines]);

  const openCustomerDetail = async (order: ServiceOrder) => {
    setSelectedCustomerId(order.customerId);
    setSelectedCustomerName(order.customerName);
    setShowCustomerDetail(true);
    setCustomerProfile(null);
    setLoadingCustomer(true);
    try {
      const customer = await getCustomerById(order.customerId);
      setCustomerProfile(customer);
    } catch (error) {
      console.error('Error loading customer:', error);
    } finally {
      setLoadingCustomer(false);
    }
  };

  const closeCustomerDetail = () => {
    setShowCustomerDetail(false);
    setSelectedCustomerId(null);
    setSelectedCustomerName('');
    setCustomerProfile(null);
  };

  const handleCustomerDownloadPDF = async () => {
    if (!selectedCustomerId) return;
    try {
      const doc = generateCustomerReportPDF(
        companyName,
        customerProfile,
        selectedCustomerName,
        selectedCustomerId,
        customerOrders,
        customerPaymentLines
      );
      const safeName = selectedCustomerName.replace(/\s+/g, '_').slice(0, 30);
      const filename = `Customer_Report_${safeName}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
      await savePdfMobile(doc, filename);
      toast.success('Customer report downloaded');
    } catch (error) {
      console.error('Error downloading customer report:', error);
      toast.error('Failed to download customer report');
    }
  };

  const handleCustomerPrint = async () => {
    if (!selectedCustomerId) return;
    try {
      const doc = generateCustomerReportPDF(
        companyName,
        customerProfile,
        selectedCustomerName,
        selectedCustomerId,
        customerOrders,
        customerPaymentLines
      );
      const safeName = selectedCustomerName.replace(/\s+/g, '_').slice(0, 30);
      const filename = `Customer_Report_${safeName}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
      await openPdfForPrint(doc, filename);
      toast.success('Opening customer report for printing');
    } catch (error) {
      console.error('Error printing customer report:', error);
      toast.error('Failed to print customer report');
    }
  };

  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const paginatedPayments = filteredPaymentLines.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const listLength = reportType === 'payments' ? filteredPaymentLines.length : filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(listLength / ITEMS_PER_PAGE));

  useEffect(() => {
    setCurrentPage(1);
  }, [reportType, searchTerm, statusFilter, dateFilter, exactDate, startDate, endDate]);

  const hasActiveFilters =
    searchTerm !== '' || statusFilter !== 'all' || dateFilter !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFilter('all');
    setExactDate('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const getDateRangeLabel = () => {
    if (dateFilter === 'exact' && exactDate) {
      return format(new Date(exactDate), 'dd MMM yyyy');
    }
    if (dateFilter === 'range' && startDate && endDate) {
      return `${format(new Date(startDate), 'dd MMM yyyy')} – ${format(new Date(endDate), 'dd MMM yyyy')}`;
    }
    return 'All Time';
  };

  const generateReportPDF = (): jsPDF => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = margin;

    const addLine = (text: string, opts?: { bold?: boolean; size?: number }) => {
      doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
      doc.setFontSize(opts?.size || 10);
      doc.text(text, margin, y);
      y += opts?.size && opts.size > 10 ? 8 : 6;
    };

    doc.setFillColor(106, 100, 242);
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Business Report', margin, 14);
    doc.setFontSize(9);
    doc.text(companyName, margin, 22);
    doc.setTextColor(33, 37, 41);
    y = 38;

    addLine(`Report Type: ${reportType === 'summary' ? 'Summary' : reportType === 'orders' ? 'Orders' : 'Payments'}`, { bold: true });
    addLine(`Period: ${getDateRangeLabel()}`);
    addLine(`Generated: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`);
    y += 4;

    if (reportType === 'summary' || reportType === 'orders') {
      addLine('Order Summary', { bold: true, size: 12 });
      addLine(`Total Orders: ${summaryStats.totalOrders}`);
      addLine(`In Progress: ${summaryStats.inProgressCount}`);
      addLine(`Delivered: ${summaryStats.deliveredCount}`);
      addLine(`Total Order Value: Rs.${summaryStats.totalOrderValue.toLocaleString('en-IN')}`);
      y += 2;

      if (Object.keys(orderStatusCounts).length > 0) {
        addLine('Status Breakdown', { bold: true, size: 11 });
        Object.entries(orderStatusCounts)
          .sort((a, b) => b[1] - a[1])
          .forEach(([status, count]) => {
            addLine(`  ${STATUS_LABELS[status] || status}: ${count}`);
          });
        y += 2;
      }
    }

    if (reportType === 'summary' || reportType === 'payments') {
      addLine('Payment Summary', { bold: true, size: 12 });
      addLine(`Transactions in Period: ${filteredPaymentLines.length}`);
      addLine(`Total Collected: Rs.${summaryStats.collected.toLocaleString('en-IN')}`);
      addLine(`  Advance: Rs.${summaryStats.advanceCollected.toLocaleString('en-IN')}`);
      addLine(`  Delivery / Final: Rs.${summaryStats.deliveryCollected.toLocaleString('en-IN')}`);
      addLine(`Pending Balance (orders): Rs.${summaryStats.pendingBalance.toLocaleString('en-IN')}`);
      y += 4;
    }

    if (reportType === 'orders' && filteredOrders.length > 0) {
      addLine('Order List', { bold: true, size: 12 });
      filteredOrders.slice(0, 50).forEach(order => {
        if (y > 270) {
          doc.addPage();
          y = margin;
        }
        const amount = order.totalAmount || order.stitchingCost || 0;
        addLine(
          `${order.id} | ${order.customerName} | ${STATUS_LABELS[order.orderStatus] || order.orderStatus} | Rs.${amount}`
        );
      });
      if (filteredOrders.length > 50) {
        addLine(`... and ${filteredOrders.length - 50} more orders`);
      }
    }

    if (reportType === 'payments' && filteredPaymentLines.length > 0) {
      addLine('Payment List', { bold: true, size: 12 });
      filteredPaymentLines.slice(0, 50).forEach(line => {
        if (y > 270) {
          doc.addPage();
          y = margin;
        }
        const typeLabel =
          line.type === 'advance' ? 'Advance' : line.type === 'delivery' ? 'Delivery' : 'Payment';
        addLine(
          `${typeLabel} | ${line.referenceNo} | ${line.serviceOrderNo} | ${line.customerName} | Rs.${line.amount} | ${format(new Date(line.date), 'dd/MM/yy')}`
        );
      });
      if (filteredPaymentLines.length > 50) {
        addLine(`... and ${filteredPaymentLines.length - 50} more transactions`);
      }
    }

    return doc;
  };

  const handleDownloadPDF = async () => {
    try {
      const doc = generateReportPDF();
      const filename = `Report_${reportType}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
      await savePdfMobile(doc, filename);
      toast.success('Report downloaded');
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Failed to download report');
    }
  };

  const handlePrint = async () => {
    try {
      const doc = generateReportPDF();
      const filename = `Report_${reportType}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
      await openPdfForPrint(doc, filename);
      toast.success('Opening report for printing');
    } catch (error) {
      console.error('Error printing report:', error);
      toast.error('Failed to print report');
    }
  };

  const Pagination = () => {
    if (reportType === 'summary' || totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-purple-100">
        <p className="text-xs text-muted-foreground">
          Page {currentPage} of {totalPages} ({listLength} records)
        </p>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0"
          >
            <CaretLeft size={16} />
          </Button>
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

  const renderOrderRow = (order: ServiceOrder, showViewDetails = false) => (
    <div
      key={order.id}
      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-purple-100 hover:border-purple-200 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm text-purple-700">{order.id}</span>
          <Badge
            className={`${STATUS_COLORS[order.orderStatus] || 'bg-gray-100'} border-0 text-[10px]`}
          >
            {STATUS_LABELS[order.orderStatus] || order.orderStatus}
          </Badge>
        </div>
        <p className="text-sm font-medium text-gray-800 truncate">{order.customerName}</p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(order.createdAt || order.serviceOrderDate), 'dd MMM yyyy')}
          {' · '}
          <span className="capitalize">{order.orderCategory}</span>
          {' · '}
          Qty {order.orderQty}
        </p>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <p className="font-bold text-purple-700">
          ₹{(order.totalAmount || order.stitchingCost || 0).toLocaleString('en-IN')}
        </p>
        {showViewDetails && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs border-purple-200 text-purple-700 hover:bg-purple-50"
            onClick={() => openCustomerDetail(order)}
          >
            <Eye size={14} className="mr-1" />
            View Details
          </Button>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size={32} className="animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="pb-8">
      {/* Header */}
      <div
        className="px-4 pt-4 pb-8 rounded-b-3xl relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #8b5cf6 100%)' }}
      >
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
                <h1 className="text-xl font-bold text-white">Reports</h1>
                <p className="text-white/70 text-sm">{getDateRangeLabel()}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                <Printer size={16} className="mr-1" />
                <span className="hidden sm:inline">Print</span>
              </Button>
              <Button
                size="sm"
                onClick={handleDownloadPDF}
                className="bg-white text-purple-700 hover:bg-white/90 font-semibold"
              >
                <FilePdf size={16} className="mr-1" />
                <span className="hidden sm:inline">PDF</span>
              </Button>
            </div>
          </div>

          {/* Report type tabs */}
          <div className="flex gap-2 mt-2">
            {([
              { id: 'summary' as ReportType, label: 'Summary', icon: ChartBar },
              { id: 'orders' as ReportType, label: 'Orders', icon: Package },
              { id: 'payments' as ReportType, label: 'Payments', icon: CurrencyInr },
            ]).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setReportType(id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  reportType === id
                    ? 'bg-white text-purple-700 shadow-md'
                    : 'bg-white/15 text-white border border-white/20 hover:bg-white/25'
                }`}
              >
                <Icon size={16} weight={reportType === id ? 'fill' : 'regular'} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-2 relative z-10 space-y-4">
        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-purple-100 p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MagnifyingGlass
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400"
              />
              <Input
                placeholder={reportType === 'payments' ? 'Search payments...' : 'Search orders...'}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 border-purple-200 focus:border-purple-400 bg-purple-50/50"
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

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-purple-100 space-y-3">
              <div className="flex flex-wrap gap-2">
                {(['all', 'exact', 'range'] as DateFilter[]).map(filter => (
                  <Button
                    key={filter}
                    variant={dateFilter === filter ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDateFilter(filter)}
                    className={dateFilter === filter ? 'bg-[#6A64F2] hover:bg-[#5b55e0]' : ''}
                  >
                    {filter === 'all' ? 'All Dates' : filter === 'exact' ? 'Exact Date' : 'Date Range'}
                  </Button>
                ))}
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-500">
                    <X size={14} className="mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              {dateFilter === 'exact' && (
                <div>
                  <Label className="text-sm text-purple-700">Select Date</Label>
                  <Input
                    type="date"
                    value={exactDate}
                    onChange={e => setExactDate(e.target.value)}
                    className="mt-1 border-purple-200"
                  />
                </div>
              )}

              {dateFilter === 'range' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm text-purple-700">Start Date</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="mt-1 border-purple-200"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-purple-700">End Date</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="mt-1 border-purple-200"
                    />
                  </div>
                </div>
              )}

              {reportType !== 'payments' && (
                <div>
                  <Label className="text-sm text-purple-700">Order Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="mt-1 border-purple-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Summary tab */}
        {reportType === 'summary' && (
          <>
            <div className="grid grid-cols-9 gap-1.5 sm:gap-2 w-full">
              {[
                {
                  label: 'Total Orders',
                  value: summaryStats.totalOrders,
                  bg: 'bg-violet-100 border-violet-200',
                  labelColor: 'text-violet-700',
                  valueColor: 'text-violet-900',
                },
                {
                  label: 'In Progress',
                  value: summaryStats.inProgressCount,
                  bg: 'bg-blue-100 border-blue-200',
                  labelColor: 'text-blue-700',
                  valueColor: 'text-blue-900',
                },
                {
                  label: 'Delivered',
                  value: summaryStats.deliveredCount,
                  bg: 'bg-emerald-100 border-emerald-200',
                  labelColor: 'text-emerald-700',
                  valueColor: 'text-emerald-900',
                },
                {
                  label: 'Order Value',
                  value: `₹${summaryStats.totalOrderValue.toLocaleString('en-IN')}`,
                  bg: 'bg-indigo-100 border-indigo-200',
                  labelColor: 'text-indigo-700',
                  valueColor: 'text-indigo-900',
                },
                {
                  label: 'Total Collected',
                  value: `₹${summaryStats.collected.toLocaleString('en-IN')}`,
                  bg: 'bg-green-100 border-green-200',
                  labelColor: 'text-green-700',
                  valueColor: 'text-green-900',
                },
                {
                  label: 'Advance',
                  value: `₹${summaryStats.advanceCollected.toLocaleString('en-IN')}`,
                  bg: 'bg-teal-100 border-teal-200',
                  labelColor: 'text-teal-700',
                  valueColor: 'text-teal-900',
                },
                {
                  label: 'Delivery',
                  value: `₹${summaryStats.deliveryCollected.toLocaleString('en-IN')}`,
                  bg: 'bg-cyan-100 border-cyan-200',
                  labelColor: 'text-cyan-700',
                  valueColor: 'text-cyan-900',
                },
                {
                  label: 'Pending',
                  value: `₹${summaryStats.pendingBalance.toLocaleString('en-IN')}`,
                  bg: 'bg-amber-100 border-amber-200',
                  labelColor: 'text-amber-700',
                  valueColor: 'text-amber-900',
                },
                {
                  label: 'Transactions',
                  value: summaryStats.paymentCount,
                  bg: 'bg-fuchsia-100 border-fuchsia-200',
                  labelColor: 'text-fuchsia-700',
                  valueColor: 'text-fuchsia-900',
                },
              ].map(stat => (
                <div
                  key={stat.label}
                  className={`w-full min-w-0 rounded-xl border shadow-sm flex flex-col items-center justify-center gap-1 px-1 py-2.5 sm:py-3 min-h-[64px] sm:min-h-[72px] ${stat.bg}`}
                >
                  <p
                    className={`text-[7px] sm:text-[9px] uppercase tracking-wide font-semibold leading-tight text-center line-clamp-2 w-full ${stat.labelColor}`}
                  >
                    {stat.label}
                  </p>
                  <p className={`text-xs sm:text-sm font-bold leading-none text-center truncate max-w-full ${stat.valueColor}`}>
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-purple-100 p-4">
              <h3 className="text-sm font-semibold text-purple-800 mb-3">Orders by Status</h3>
              {Object.keys(orderStatusCounts).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {searchTerm.trim()
                    ? `No orders found for "${searchTerm.trim()}"`
                    : 'No orders in this period'}
                </p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(orderStatusCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([status, count]) => (
                      <div
                        key={status}
                        className="flex items-center justify-between py-2 px-3 rounded-lg bg-purple-50/50"
                      >
                        <Badge className={`${STATUS_COLORS[status] || 'bg-gray-100'} border-0 text-xs`}>
                          {STATUS_LABELS[status] || status}
                        </Badge>
                        <span className="font-bold text-purple-700">{count}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Orders tab */}
        {reportType === 'orders' && (
          <div className="bg-white rounded-2xl shadow-lg border border-purple-100 p-4">
            <h3 className="text-sm font-semibold text-purple-800 mb-3">
              Orders ({filteredOrders.length})
            </h3>
            {paginatedOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {searchTerm.trim()
                  ? `No orders found for "${searchTerm.trim()}"`
                  : statusFilter !== 'all'
                  ? `No orders with status "${STATUS_LABELS[statusFilter] || statusFilter}"`
                  : 'No orders found'}
                {(statusFilter !== 'all' || dateFilter !== 'all') && (
                  <span className="block mt-2 text-xs">
                    Try clearing filters with the Clear button
                  </span>
                )}
              </p>
            ) : (
              <div className="space-y-2">{paginatedOrders.map(order => renderOrderRow(order, true))}</div>
            )}
            <Pagination />
          </div>
        )}

        {/* Payments tab */}
        {reportType === 'payments' && (
          <div className="bg-white rounded-2xl shadow-lg border border-purple-100 p-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-purple-800">
                Transactions ({filteredPaymentLines.length})
              </h3>
              <div className="text-right text-xs">
                <p className="font-bold text-emerald-600">
                  Total: ₹{summaryStats.collected.toLocaleString('en-IN')}
                </p>
                <p className="text-muted-foreground">
                  Advance ₹{summaryStats.advanceCollected.toLocaleString('en-IN')} · Delivery ₹
                  {summaryStats.deliveryCollected.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
            {paginatedPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No transactions found</p>
            ) : (
              <div className="space-y-2">
                {paginatedPayments.map(line => (
                  <div
                    key={line.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-purple-100"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          className={`border-0 text-[10px] ${
                            line.type === 'advance'
                              ? 'bg-teal-100 text-teal-700'
                              : line.type === 'delivery'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {line.type === 'advance'
                            ? 'Advance'
                            : line.type === 'delivery'
                            ? 'Delivery'
                            : 'Payment'}
                        </Badge>
                        <span className="font-bold text-sm text-purple-700">{line.referenceNo}</span>
                        <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                          {line.serviceOrderNo}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-800 truncate">{line.customerName}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(line.date), 'dd MMM yyyy')}
                        {' · '}
                        {line.modeOfPayment}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-emerald-600">
                        ₹{line.amount.toLocaleString('en-IN')}
                      </p>
                      {(line.balanceAmount ?? 0) > 0 && (
                        <p className="text-xs text-amber-600">
                          Bal ₹{line.balanceAmount!.toLocaleString('en-IN')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Pagination />
          </div>
        )}
      </div>

      <Dialog open={showCustomerDetail} onOpenChange={open => !open && closeCustomerDetail()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0">
          <div
            className="px-4 pt-4 pb-3 rounded-t-lg"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)' }}
          >
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <User size={20} weight="duotone" />
                Customer Report
              </DialogTitle>
            </DialogHeader>
            <div className="mt-2 text-white">
              <p className="text-lg font-bold">{selectedCustomerName}</p>
              {loadingCustomer ? (
                <p className="text-white/70 text-sm flex items-center gap-2 mt-1">
                  <Spinner size={14} className="animate-spin" />
                  Loading details...
                </p>
              ) : (
                <div className="text-white/80 text-sm mt-1 space-y-0.5">
                  <p>ID: {selectedCustomerId}</p>
                  {customerProfile?.phone && <p>Phone: {customerProfile.phone}</p>}
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCustomerPrint}
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                <Printer size={16} className="mr-1" />
                Print
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleCustomerDownloadPDF}
                className="bg-white text-purple-700 hover:bg-white/90 font-semibold"
              >
                <FilePdf size={16} className="mr-1" />
                Download PDF
              </Button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Orders', value: customerReportStats.totalOrders },
                {
                  label: 'Order Value',
                  value: `₹${customerReportStats.totalOrderValue.toLocaleString('en-IN')}`,
                },
                {
                  label: 'Collected',
                  value: `₹${customerReportStats.collected.toLocaleString('en-IN')}`,
                },
                {
                  label: 'Pending',
                  value: `₹${customerReportStats.pendingBalance.toLocaleString('en-IN')}`,
                },
              ].map(stat => (
                <div
                  key={stat.label}
                  className="rounded-lg border border-purple-100 bg-purple-50/40 p-2.5 text-center"
                >
                  <p className="text-[10px] uppercase text-muted-foreground">{stat.label}</p>
                  <p className="text-sm font-bold text-purple-700">{stat.value}</p>
                </div>
              ))}
            </div>

            <div>
              <h4 className="text-sm font-semibold text-purple-800 mb-2">
                Orders ({customerOrders.length})
              </h4>
              {customerOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No orders</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {customerOrders.map(order => renderOrderRow(order))}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-sm font-semibold text-purple-800 mb-2">
                Payments ({customerPaymentLines.length})
              </h4>
              {customerPaymentLines.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No payments</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {customerPaymentLines.map(line => (
                    <div
                      key={line.id}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-purple-100 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge
                            className={`border-0 text-[10px] ${
                              line.type === 'advance'
                                ? 'bg-teal-100 text-teal-700'
                                : line.type === 'delivery'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {line.type === 'advance'
                              ? 'Advance'
                              : line.type === 'delivery'
                              ? 'Delivery'
                              : 'Payment'}
                          </Badge>
                          <span className="font-medium text-purple-700">{line.serviceOrderNo}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(line.date), 'dd MMM yyyy')} · {line.modeOfPayment}
                        </p>
                      </div>
                      <p className="font-bold text-emerald-600 shrink-0">
                        ₹{line.amount.toLocaleString('en-IN')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

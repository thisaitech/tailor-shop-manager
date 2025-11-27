import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { toast } from 'sonner';
import { ArrowLeft, Plus, CurrencyInr, FilePdf, Printer } from '@phosphor-icons/react';
import { format } from 'date-fns';
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
      doc.save(`Service_Invoice_${payment.paymentNo}_${payment.customerName.replace(/\s+/g, '_')}.pdf`);
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
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);

      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
      toast.success('Opening invoice for printing');
    } catch (error) {
      console.error('Error printing invoice:', error);
      toast.error('Failed to print invoice');
    }
  };

  const handleSave = async () => {
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

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-xl font-bold">Payment</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
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
          <h1 className="text-xl font-bold">Payment</h1>
        </div>
        <Button onClick={handleOpenDialog}>
          <Plus size={18} className="mr-1" />
          New Payment
        </Button>
      </div>

      {/* Payments List */}
      <Card>
        <CardHeader className="py-3 px-4 border-b">
          <CardTitle className="text-sm font-medium">
            Payments ({payments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CurrencyInr size={48} className="mx-auto mb-3 opacity-30" />
              <p>No payments yet</p>
              <p className="text-sm mt-1">Click "New Payment" to create one</p>
            </div>
          ) : (
            <div className="divide-y">
              {payments.map(payment => (
                <div key={payment.id} className="p-4 hover:bg-muted/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium">{payment.paymentNo}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(payment.deliveredDate, 'dd MMM yyyy')} • SO: {payment.serviceOrderNo}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {payment.customerName} • {payment.orderCategory}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-600">
                        ₹{payment.amountPaid.toLocaleString()}
                      </p>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                        payment.modeOfPayment === 'cash'
                          ? 'bg-green-100 text-green-700'
                          : payment.modeOfPayment === 'qr_pay'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {payment.modeOfPayment === 'cash' ? 'Cash' :
                         payment.modeOfPayment === 'qr_pay' ? 'QR Pay' : 'Nil'}
                      </span>
                      {payment.balanceAmount > 0 && (
                        <p className="text-xs text-red-500 mt-1">
                          Balance: ₹{payment.balanceAmount.toLocaleString()}
                        </p>
                      )}
                      {/* PDF Actions */}
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadInvoice(payment)}
                          className="h-7 text-xs"
                        >
                          <FilePdf size={14} className="mr-1" />
                          PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePrintInvoice(payment)}
                          className="h-7 text-xs"
                        >
                          <Printer size={14} className="mr-1" />
                          Print
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
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
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Creating...' : 'Create Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

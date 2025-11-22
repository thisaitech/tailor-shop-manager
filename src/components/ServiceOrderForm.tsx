import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { Button } from '@/components/ui/button';
import { generateServiceOrderId } from '@/lib/firestore/serviceOrderService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ServiceOrder, OrderCategory, Customer, Measurements, UOM, ModeOfPayment, AdvancePayment, DressItem, DressType } from '@/lib/types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, X, Image as ImageIcon, MagnifyingGlass, TShirt, Pants, Hoodie, Dress, Check, FilePdf, Printer, CaretDown, Camera, Upload } from '@phosphor-icons/react';
import { uploadPhoto } from '@/lib/storage';
import { generateProformaInvoiceId } from '@/lib/firestore/advancePaymentService';
import { useAuth } from '@/hooks/use-auth';
import {
  DesignCategory,
  DesignImage,
  getDesignCategoriesByCompany,
} from '@/lib/firestore/designCategoryService';
import { getCompanyProfile } from '@/lib/firestore/companyService';

// Measurement categories configuration
const MEASUREMENT_CATEGORIES = {
  shirt: { label: 'Shirt', icon: TShirt, fields: ['chest', 'waist', 'length', 'shoulder'] },
  pant: { label: 'Pant', icon: Pants, fields: ['waist', 'inseam', 'outseam', 'rise', 'thigh', 'hips', 'legOpening'] },
  coat: { label: 'Coat', icon: Hoodie, fields: ['standardSize', 'chest', 'waist', 'length', 'shoulder'] },
  chuditharTop: { label: 'Chudithar Top', icon: Dress, fields: ['shoulder', 'bust', 'waist', 'hip', 'length'] },
  chuditharPant: { label: 'Chudithar Pant', icon: Pants, fields: ['waist', 'hip', 'inseam', 'fullLength'] },
  blouse: { label: 'Blouse', icon: TShirt, fields: ['shoulder', 'chest', 'neckDepthFront', 'neckDepthBack', 'armhole', 'halfSleeve', 'fullSleeve'] },
  trouser: { label: 'Trouser', icon: Pants, fields: ['waist', 'inseam', 'outseam', 'rise', 'thigh', 'hips', 'legOpening'] },
};

type MeasurementCategoryKey = keyof typeof MEASUREMENT_CATEGORIES;

// Dress type options for line items
const DRESS_TYPE_OPTIONS: { value: DressType; label: string }[] = [
  { value: 'shirt', label: 'Shirt' },
  { value: 'pant', label: 'Pant' },
  { value: 'coat', label: 'Coat' },
  { value: 'chuditharTop', label: 'Chudithar Top' },
  { value: 'chuditharPant', label: 'Chudithar Pant' },
  { value: 'blouse', label: 'Blouse' },
  { value: 'trouser', label: 'Trouser' },
  { value: 'other', label: 'Other' },
];

// UOM conversion constants
const INCHES_TO_CM = 2.54;

// Convert inches to cm
const convertToCm = (inches: number): number => Math.round(inches * INCHES_TO_CM * 100) / 100;

// Convert cm to inches
const convertToInches = (cm: number): number => Math.round((cm / INCHES_TO_CM) * 100) / 100;

interface ServiceOrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    order: Omit<ServiceOrder, 'id' | 'createdAt' | 'updatedAt'>,
    advancePayment?: Omit<AdvancePayment, 'id' | 'proformaInvoiceNo' | 'invoiceNo' | 'createdAt' | 'updatedAt'>
  ) => void;
  customers: Customer[];
  onCreateCustomer?: () => void;
  order?: ServiceOrder;
}

export function ServiceOrderForm({
  open,
  onOpenChange,
  onSave,
  customers,
  onCreateCustomer,
  order,
}: ServiceOrderFormProps) {
  const { t } = useLanguage();
  const { user, employee } = useAuth();
  const companyId = employee?.companyId || user?.id || '';

  // Two-step form state
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [createdOrderData, setCreatedOrderData] = useState<Omit<ServiceOrder, 'id' | 'createdAt' | 'updatedAt'> | null>(null);

  // Order fields
  const [serviceOrderNo, setServiceOrderNo] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [orderCategory, setOrderCategory] = useState<OrderCategory>('male');
  const [measurements, setMeasurements] = useState<Measurements>({});
  const [previousMeasurements, setPreviousMeasurements] = useState<Measurements>({}); // Store customer's original measurements
  const [orderQty, setOrderQty] = useState(1);
  const [uom, setUom] = useState<UOM>('Nos');
  const [displayUom, setDisplayUom] = useState<'Inches' | 'Cms'>('Inches');
  const [designList, setDesignList] = useState<string[]>([]);
  const [stitchingCost, setStitchingCost] = useState(0);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [reference, setReference] = useState('');
  const [selectedMeasurementCategories, setSelectedMeasurementCategories] = useState<MeasurementCategoryKey[]>([]);
  const [activeDressType, setActiveDressType] = useState<MeasurementCategoryKey | null>(null); // Currently viewing dress type

  // Dress Items (multiple dresses per order)
  const [dressItems, setDressItems] = useState<DressItem[]>([]);

  // Advance Payment fields (Step 2)
  const [modeOfPayment, setModeOfPayment] = useState<ModeOfPayment>('cash');
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [proformaInvoiceNo, setProformaInvoiceNo] = useState('');

  // Design category selection
  const [designCategories, setDesignCategories] = useState<DesignCategory[]>([]);
  const [selectedDesignCategory, setSelectedDesignCategory] = useState<string>('');
  const [showDesignModal, setShowDesignModal] = useState(false);
  const [selectedDesigns, setSelectedDesigns] = useState<DesignImage[]>([]);
  const [nextServiceOrderId, setNextServiceOrderId] = useState<string>('');

  // Load design categories and next service order ID on mount
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;
      try {
        // Get company profile to get the correct companyId
        const company = await getCompanyProfile(user.id);
        if (company) {
          // Load design categories
          const categories = await getDesignCategoriesByCompany(company.id);
          setDesignCategories(categories);
          console.log(`[ServiceOrderForm] Loaded ${categories.length} design categories`);

          // Generate next service order ID for new orders (use company.id for proper scoping)
          if (open && !order) {
            const nextId = await generateServiceOrderId(company.id);
            setNextServiceOrderId(nextId);
            setServiceOrderNo(nextId); // Also set to serviceOrderNo state
            console.log(`[ServiceOrderForm] Next service order ID: ${nextId}`);
          } else if (!open) {
            // Reset when form closes
            setNextServiceOrderId('');
            setServiceOrderNo('');
          }
        }
      } catch (error) {
        console.error('[ServiceOrderForm] Error loading data:', error);
        toast.error('Failed to generate service order number');
      }
    };
    loadData();
  }, [user, open, order]);

  // Get images for selected category
  const categoryImages = useMemo(() => {
    if (!selectedDesignCategory) return [];
    const category = designCategories.find(c => c.id === selectedDesignCategory);
    return category?.images || [];
  }, [designCategories, selectedDesignCategory]);

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const search = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(search) ||
        c.phone.includes(search) ||
        c.id.toLowerCase().includes(search)
    );
  }, [customers, customerSearch]);

  // Get selected customer
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === customerId);
  }, [customers, customerId]);

  // Get measurement value with UOM conversion for display
  const getDisplayValue = (value: number | undefined): string => {
    if (value === undefined || value === null) return '-';
    if (displayUom === 'Cms') {
      return `${convertToCm(value)} cm`;
    }
    return `${value}"`;
  };

  // Check if a measurement category has data
  const hasMeasurementData = (category: MeasurementCategoryKey): boolean => {
    const data = measurements[category];
    if (!data) return false;
    return Object.values(data).some((v) => v !== undefined && v !== null);
  };

  // Get available measurement categories from customer
  const availableMeasurementCategories = useMemo(() => {
    return (Object.keys(MEASUREMENT_CATEGORIES) as MeasurementCategoryKey[]).filter(
      (cat) => hasMeasurementData(cat)
    );
  }, [measurements]);

  useEffect(() => {
    if (order) {
      setCustomerId(order.customerId);
      setOrderCategory(order.orderCategory);
      setMeasurements(order.measurements || {});
      setOrderQty(order.orderQty);
      setUom(order.uom);
      setDesignList(order.designList);
      setStitchingCost(order.stitchingCost);
      setExpectedDeliveryDate(
        format(new Date(order.expectedDeliveryDate), 'yyyy-MM-dd')
      );
      setReference(order.reference || '');
    } else {
      resetForm();
    }
  }, [order, open]);

  const resetForm = () => {
    setCurrentStep(1);
    setCreatedOrderData(null);
    setServiceOrderNo('');
    setCustomerId('');
    setCustomerSearch('');
    setOrderCategory('male');
    setMeasurements({});
    setPreviousMeasurements({});
    setOrderQty(1);
    setUom('Nos');
    setDisplayUom('Inches');
    setDesignList([]);
    setStitchingCost(0);
    setExpectedDeliveryDate('');
    setReference('');
    setSelectedMeasurementCategories([]);
    setActiveDressType(null);
    setDressItems([]);
    // Reset advance payment fields
    setModeOfPayment('cash');
    setAdvanceAmount(0);
    setProformaInvoiceNo('');
    // Reset design selection
    setSelectedDesignCategory('');
    setSelectedDesigns([]);
  };

  // Loading state for PI number generation
  const [isLoadingPiNumber, setIsLoadingPiNumber] = useState(false);

  // Dress item management functions
  const addDressItem = () => {
    const newItem: DressItem = {
      id: `ITEM-${Date.now()}`,
      dressType: 'shirt',
      dressName: '',
      quantity: 1,
      stitchingCost: 0,
      notes: '',
    };
    setDressItems([...dressItems, newItem]);
  };

  const updateDressItem = (itemId: string, field: keyof DressItem, value: any) => {
    setDressItems(items =>
      items.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    );
  };

  const removeDressItem = (itemId: string) => {
    setDressItems(items => items.filter(item => item.id !== itemId));
  };

  // Calculate totals from dress items
  const totalDressQty = dressItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalDressCost = dressItems.reduce((sum, item) => sum + item.stitchingCost, 0);

  // Step 1: Create Order - proceeds to Step 2
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId) {
      toast.error('Please select a customer');
      return;
    }

    if (!expectedDeliveryDate) {
      toast.error('Please select expected delivery date');
      return;
    }

    if (orderQty <= 0) {
      toast.error('Order quantity must be greater than 0');
      return;
    }

    const customer = customers.find((c) => c.id === customerId);
    if (!customer) {
      toast.error('Selected customer not found');
      return;
    }

    // Use dress items totals if available, otherwise use legacy single values
    const finalOrderQty = dressItems.length > 0 ? totalDressQty : orderQty;
    const finalStitchingCost = dressItems.length > 0 ? totalDressCost : stitchingCost;

    // Combine uploaded designs and selected designs from categories
    const allDesigns = [
      ...designList,
      ...selectedDesigns.map(d => d.url)
    ];

    const orderData: Omit<ServiceOrder, 'id' | 'createdAt' | 'updatedAt'> = {
      serviceOrderDate: Date.now(),
      customerId,
      customerName: customer.name,
      orderCategory,
      measurements, // Current/new measurements (will be saved to customer profile)
      previousMeasurements, // Historical measurements (customer's measurements at order creation time)
      dressItems: dressItems.length > 0 ? dressItems : undefined,
      orderQty: finalOrderQty,
      uom,
      designList: allDesigns,
      stitchingCost: finalStitchingCost,
      expectedDeliveryDate: new Date(expectedDeliveryDate).getTime(),
      reference: reference.trim() || undefined,
      orderStatus: 'open',
    };

    // Store order data and proceed to Step 2 (Advance Payment)
    setCreatedOrderData(orderData);

    // Fetch next PI number from Firestore
    setIsLoadingPiNumber(true);
    try {
      const piNo = await generateProformaInvoiceId(companyId || '');
      setProformaInvoiceNo(piNo);
    } catch (error) {
      console.error('Error generating PI number:', error);
      // Fallback to timestamp-based PI if Firestore fails
      setProformaInvoiceNo(`PI${Date.now().toString().slice(-4)}`);
    } finally {
      setIsLoadingPiNumber(false);
    }

    setCurrentStep(2);
    toast.success('Order details saved. Please complete the advance payment.');
  };

  // Step 2: Save with Advance Payment
  const handleStep2Submit = () => {
    if (!createdOrderData) {
      toast.error('Order data not found');
      return;
    }

    // Create advance payment data
    const advancePaymentData: Omit<AdvancePayment, 'id' | 'proformaInvoiceNo' | 'invoiceNo' | 'createdAt' | 'updatedAt'> = {
      proformaInvoiceDate: Date.now(),
      serviceOrderNo: '', // Will be set after order creation
      jobWorkNo: '', // No job work yet
      customerId: createdOrderData.customerId,
      customerName: createdOrderData.customerName,
      modeOfPayment,
      amount: advanceAmount,
      totalJobCost: createdOrderData.stitchingCost,
      remainingAmount: createdOrderData.stitchingCost - advanceAmount,
      companyId: '', // Will be set by the parent component
      adminId: '', // Will be set by the parent component
    };

    onSave(createdOrderData, advancePaymentData);
    onOpenChange(false);
    resetForm();
  };

  // Skip advance payment and save order only
  const handleSkipAdvancePayment = () => {
    if (!createdOrderData) {
      toast.error('Order data not found');
      return;
    }

    onSave(createdOrderData);
    onOpenChange(false);
    resetForm();
  };

  // Generate measurements HTML for invoice
  const getMeasurementsHtml = () => {
    if (!createdOrderData?.measurements) return '';

    const measurementSections: string[] = [];
    const categories = Object.keys(MEASUREMENT_CATEGORIES) as MeasurementCategoryKey[];

    categories.forEach(category => {
      const data = createdOrderData.measurements?.[category] as Record<string, unknown> | undefined;
      if (!data) return;

      const values = Object.entries(data)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([key, value]) => {
          const label = key.replace(/([A-Z])/g, ' $1').trim();
          const displayVal = typeof value === 'number' ? `${value}"` : String(value);
          return `<td style="padding: 6px 10px; border: 1px solid #e0e0e0; font-size: 12px;"><strong>${label}:</strong> ${displayVal}</td>`;
        });

      if (values.length === 0) return;

      // Group into rows of 4 columns
      const rows: string[] = [];
      for (let i = 0; i < values.length; i += 4) {
        const rowCells = values.slice(i, i + 4);
        while (rowCells.length < 4) rowCells.push('<td style="padding: 6px 10px; border: 1px solid #e0e0e0;"></td>');
        rows.push(`<tr>${rowCells.join('')}</tr>`);
      }

      measurementSections.push(`
        <div style="margin-bottom: 10px;">
          <h4 style="font-size: 12px; color: #1a5f7a; margin-bottom: 5px; text-transform: uppercase;">${MEASUREMENT_CATEGORIES[category].label}</h4>
          <table style="width: 100%; border-collapse: collapse;">
            ${rows.join('')}
          </table>
        </div>
      `);
    });

    return measurementSections.length > 0 ? measurementSections.join('') : '<p style="color: #666; font-size: 12px;">No measurements recorded</p>';
  };

  // Generate invoice HTML content
  const getInvoiceHtml = () => {
    if (!createdOrderData) return '';

    const customer = customers.find((c) => c.id === createdOrderData.customerId);
    const paymentMode = modeOfPayment === 'cash' ? 'Cash' : modeOfPayment === 'qrpay' ? 'QR Pay' : 'Nil';
    const effectiveAdvance = modeOfPayment === 'nil' ? 0 : advanceAmount;
    const balanceDue = createdOrderData.stitchingCost - effectiveAdvance;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Proforma Invoice - ${proformaInvoiceNo}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; background: #fff; color: #333; }

            /* Header / Company Branding */
            .company-header { text-align: center; padding-bottom: 20px; border-bottom: 3px solid #1a5f7a; margin-bottom: 20px; }
            .company-name { font-size: 28px; font-weight: bold; color: #1a5f7a; margin-bottom: 5px; letter-spacing: 1px; }
            .company-tagline { font-size: 12px; color: #666; margin-bottom: 10px; }
            .company-contact { font-size: 11px; color: #888; }

            /* Invoice Title */
            .invoice-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; padding: 15px; background: linear-gradient(135deg, #1a5f7a 0%, #2d8fba 100%); border-radius: 8px; }
            .invoice-title h1 { font-size: 22px; color: #fff; letter-spacing: 2px; }
            .invoice-meta { text-align: right; color: #fff; }
            .invoice-meta .pi-no { font-size: 18px; font-weight: bold; }
            .invoice-meta .pi-date { font-size: 12px; opacity: 0.9; }

            /* Section Styling */
            .section { margin-bottom: 20px; }
            .section-header { font-size: 13px; font-weight: 600; color: #1a5f7a; text-transform: uppercase; letter-spacing: 1px; padding: 8px 12px; background: #f0f7fa; border-left: 4px solid #1a5f7a; margin-bottom: 12px; }

            /* Two Column Layout */
            .two-col { display: flex; gap: 20px; margin-bottom: 20px; }
            .col { flex: 1; }

            /* Customer & Invoice Info Boxes */
            .info-box { background: #fafafa; border: 1px solid #e0e0e0; border-radius: 6px; padding: 15px; height: 100%; }
            .info-box h3 { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
            .info-box .name { font-size: 16px; font-weight: 600; color: #333; margin-bottom: 4px; }
            .info-box .detail { font-size: 12px; color: #666; line-height: 1.6; }

            /* Table Styling */
            .data-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            .data-table th { background: #1a5f7a; color: #fff; padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase; }
            .data-table td { padding: 10px 12px; border-bottom: 1px solid #e0e0e0; font-size: 13px; }
            .data-table tr:nth-child(even) { background: #f9f9f9; }
            .data-table .text-right { text-align: right; }
            .data-table .text-center { text-align: center; }

            /* Totals Section */
            .totals-section { background: linear-gradient(135deg, #f0f9f4 0%, #e8f5e9 100%); border: 2px solid #4caf50; border-radius: 8px; padding: 20px; margin-top: 20px; }
            .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
            .totals-row.subtotal { color: #666; }
            .totals-row.advance { color: #1a5f7a; }
            .totals-row.balance { font-size: 18px; font-weight: bold; color: #2e7d32; border-top: 2px dashed #4caf50; padding-top: 12px; margin-top: 8px; }
            .totals-row .amount { font-weight: 600; }

            /* Signature Section */
            .signature-section { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; }
            .signature-box { width: 45%; text-align: center; }
            .signature-line { border-top: 1px solid #333; margin-top: 50px; padding-top: 8px; font-size: 12px; color: #666; }

            /* Footer */
            .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #e0e0e0; }
            .footer p { font-size: 11px; color: #888; margin-bottom: 3px; }
            .footer .thank-you { font-size: 14px; color: #1a5f7a; font-weight: 600; margin-bottom: 8px; }

            /* Print Styles */
            @media print {
              body { padding: 15px; }
              .no-print { display: none; }
              .invoice-title { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .data-table th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .totals-section { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }

            /* Mobile Responsive */
            @media (max-width: 800px) {
              body { padding: 10px; }
              .two-col { flex-direction: column; gap: 10px; }
              .invoice-title { flex-direction: column; text-align: center; gap: 10px; }
              .invoice-meta { text-align: center; }
              .signature-section { flex-direction: column; gap: 30px; }
              .signature-box { width: 100%; }
            }
          </style>
        </head>
        <body>
          <!-- Company Header / Branding -->
          <div class="company-header">
            <div class="company-name">TAILOR SHOP</div>
            <div class="company-tagline">Quality Tailoring Services</div>
            <div class="company-contact">Contact: support@tailorshop.com</div>
          </div>

          <!-- Invoice Title Bar -->
          <div class="invoice-title">
            <h1>PROFORMA INVOICE</h1>
            <div class="invoice-meta">
              <div class="pi-no">${proformaInvoiceNo}</div>
              <div class="pi-date">${format(new Date(), 'dd MMM yyyy')}</div>
            </div>
          </div>

          <!-- Customer & Invoice Details -->
          <div class="two-col">
            <div class="col">
              <div class="section-header">Customer Details</div>
              <div class="info-box">
                <h3>Bill To</h3>
                <div class="name">${createdOrderData.customerName}</div>
                <div class="detail">
                  ${customer?.phone ? `Phone: ${customer.phone}<br>` : ''}
                  ${customer?.whatsappNumber ? `WhatsApp: ${customer.whatsappNumber}<br>` : ''}
                  ${customer?.address1 ? `${customer.address1}<br>` : ''}
                  ${customer?.address2 ? `${customer.address2}<br>` : ''}
                  ${customer?.place ? `${customer.place}` : ''}${customer?.pincode ? ` - ${customer.pincode}` : ''}
                </div>
              </div>
            </div>
            <div class="col">
              <div class="section-header">Invoice Details</div>
              <div class="info-box">
                <table style="width: 100%; font-size: 12px;">
                  <tr>
                    <td style="color: #888; padding: 4px 0;">PI Number:</td>
                    <td style="font-weight: 600; text-align: right;">${proformaInvoiceNo}</td>
                  </tr>
                  <tr>
                    <td style="color: #888; padding: 4px 0;">Invoice Date:</td>
                    <td style="font-weight: 600; text-align: right;">${format(new Date(), 'dd MMM yyyy')}</td>
                  </tr>
                  <tr>
                    <td style="color: #888; padding: 4px 0;">Customer ID:</td>
                    <td style="font-weight: 600; text-align: right;">${createdOrderData.customerId}</td>
                  </tr>
                  <tr>
                    <td style="color: #888; padding: 4px 0;">Delivery Date:</td>
                    <td style="font-weight: 600; text-align: right;">${format(new Date(createdOrderData.expectedDeliveryDate), 'dd MMM yyyy')}</td>
                  </tr>
                </table>
              </div>
            </div>
          </div>

          <!-- Order Details Table -->
          <div class="section">
            <div class="section-header">Order Details</div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th class="text-center">Category</th>
                  <th class="text-center">Qty</th>
                  <th class="text-center">UOM</th>
                  <th class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Tailoring / Stitching Services</td>
                  <td class="text-center" style="text-transform: capitalize;">${createdOrderData.orderCategory}</td>
                  <td class="text-center">${createdOrderData.orderQty}</td>
                  <td class="text-center">${createdOrderData.uom}</td>
                  <td class="text-right">₹${createdOrderData.stitchingCost.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Measurements Section -->
          <div class="section">
            <div class="section-header">Measurements</div>
            <div style="padding: 10px; background: #fafafa; border-radius: 6px;">
              ${getMeasurementsHtml()}
            </div>
          </div>

          <!-- Payment Details -->
          <div class="section">
            <div class="section-header">Payment Details</div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Payment Mode</th>
                  <th class="text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${paymentMode}</td>
                  <td class="text-right">₹${effectiveAdvance.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Totals Section -->
          <div class="totals-section">
            <div class="totals-row subtotal">
              <span>Subtotal (Stitching Cost)</span>
              <span class="amount">₹${createdOrderData.stitchingCost.toFixed(2)}</span>
            </div>
            <div class="totals-row advance">
              <span>Advance Paid</span>
              <span class="amount">- ₹${effectiveAdvance.toFixed(2)}</span>
            </div>
            <div class="totals-row balance">
              <span>BALANCE DUE</span>
              <span class="amount">₹${balanceDue.toFixed(2)}</span>
            </div>
          </div>

          <!-- Signature Section -->
          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-line">Customer Signature</div>
            </div>
            <div class="signature-box">
              <div class="signature-line">Authorized Signature</div>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p class="thank-you">Thank you for your business!</p>
            <p>This is a computer-generated proforma invoice.</p>
            <p>Terms: Payment due upon delivery unless otherwise agreed.</p>
          </div>
        </body>
      </html>
    `;
  };

  // Print Proforma Invoice
  const handlePrintInvoice = () => {
    if (!createdOrderData) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(getInvoiceHtml());
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }

    toast.success('Proforma Invoice sent to printer');
  };

  // Download as PDF (downloads HTML file directly)
  const handleDownloadPdf = () => {
    if (!createdOrderData) return;

    const htmlContent = getInvoiceHtml();
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Proforma_Invoice_${proformaInvoiceNo}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Proforma Invoice ${proformaInvoiceNo} downloaded.`);
  };

  const handleCustomerChange = (value: string) => {
    if (value === 'create-new') {
      onCreateCustomer?.();
      return;
    }

    setCustomerId(value);
    setCustomerSearch('');
    const customer = customers.find((c) => c.id === value);

    console.log('[ServiceOrderForm] Customer selected:', customer?.name);

    if (customer && customer.measurements) {
      console.log('[ServiceOrderForm] Loading measurements from customer profile:', customer.measurements);

      // Store the customer's current measurements as previous measurements (history)
      setPreviousMeasurements({ ...customer.measurements });

      // Load current measurements for editing
      setMeasurements({ ...customer.measurements });

      toast.success(`Customer selected: ${customer.name}. Select a dress type to add measurements.`);
    } else {
      console.log('[ServiceOrderForm] No measurements found for customer');
      setPreviousMeasurements({});
      setMeasurements({});

      toast.info('Customer selected. Select a dress type to add measurements.');
    }

    // Reset selected dress types - user will choose which ones to add
    setSelectedMeasurementCategories([]);
    setActiveDressType(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(value);
  };

  const getTodayDate = () => {
    return format(new Date(), 'yyyy-MM-dd');
  };

  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    console.log('[ServiceOrderForm] Uploading images:', files.length);

    setIsUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large. Maximum size is 5MB.`);
          continue;
        }

        // Upload to Firebase Storage
        const downloadURL = await uploadPhoto(file, `orders/designs/${companyId}`);
        uploadedUrls.push(downloadURL);
        console.log('[ServiceOrderForm] Image uploaded:', downloadURL);
      }

      // Add all uploaded URLs to design list
      setDesignList((prev) => [...prev, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} image(s) uploaded successfully`);
    } catch (error) {
      console.error('[ServiceOrderForm] Upload error:', error);
      toast.error('Failed to upload images. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    console.log('[ServiceOrderForm] Camera capture:', files.length);

    setIsUploading(true);

    try {
      const file = files[0]; // Camera only captures one image at a time

      if (file.size > 5 * 1024 * 1024) {
        toast.error('Photo is too large. Maximum size is 5MB.');
        return;
      }

      // Upload to Firebase Storage
      const downloadURL = await uploadPhoto(file, `orders/designs/${companyId}`);
      setDesignList((prev) => [...prev, downloadURL]);
      console.log('[ServiceOrderForm] Camera photo uploaded:', downloadURL);
      toast.success('Photo captured and uploaded successfully');
    } catch (error) {
      console.error('[ServiceOrderForm] Camera capture error:', error);
      toast.error('Failed to capture photo. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setDesignList((prev) => prev.filter((_, i) => i !== index));
    toast.info('Image removed');
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {order ? 'Edit Service Order' : currentStep === 1 ? 'New Service Order' : 'Advance Payment'}
          </DialogTitle>
          <DialogDescription>
            {currentStep === 1
              ? 'Create a new service order with customer details and measurements.'
              : 'Record advance payment for the service order.'}
          </DialogDescription>
          {/* Step Indicator */}
          {!order && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                currentStep === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                <span>1</span>
                <span>Order Details</span>
              </div>
              <div className="w-8 h-0.5 bg-muted" />
              <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                currentStep === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                <span>2</span>
                <span>Advance Payment</span>
              </div>
            </div>
          )}
        </DialogHeader>

        {/* Step 1: Order Form */}
        {currentStep === 1 && (
        <form onSubmit={handleStep1Submit} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-6 overflow-y-auto pr-2 flex-1">
            {/* Order Info Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
              <div>
                <Label className="text-sm text-muted-foreground">
                  Service Order No
                </Label>
                <p className="text-lg font-semibold">{order?.id || nextServiceOrderId || 'Loading...'}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">
                  Service Order Date
                </Label>
                <p className="text-lg font-semibold">
                  {format(new Date(), 'dd MMM yyyy')}
                </p>
              </div>
            </div>

            {/* Customer Selection */}
            <div className="space-y-2">
              <Label htmlFor="customer">Customer Name *</Label>
              <Select value={customerId} onValueChange={handleCustomerChange}>
                <SelectTrigger id="customer">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  <SelectItem value="create-new">
                    <div className="flex items-center gap-2 text-primary font-medium">
                      <Plus size={16} weight="bold" />
                      Create new customer
                    </div>
                  </SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} - {customer.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Selected Customer Info */}
              {selectedCustomer && (
                <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Check size={16} className="text-green-600" weight="bold" />
                    <span className="text-sm font-semibold text-green-800 dark:text-green-200">
                      {selectedCustomer.name}
                    </span>
                  </div>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    {selectedCustomer.id} • {selectedCustomer.phone} • {selectedCustomer.place}
                  </p>
                </div>
              )}

              {customers.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No customers yet.{' '}
                  <button
                    type="button"
                    onClick={onCreateCustomer}
                    className="text-primary hover:underline font-medium"
                  >
                    Create a new customer
                  </button>
                </p>
              )}
            </div>

            {/* Order Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orderCategory">Order Category *</Label>
                <Select
                  value={orderCategory}
                  onValueChange={(v) => setOrderCategory(v as OrderCategory)}
                >
                  <SelectTrigger id="orderCategory">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="kids">Kids</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="orderQty">Order Qty *</Label>
                <Input
                  id="orderQty"
                  type="number"
                  min="1"
                  value={orderQty}
                  onChange={(e) => setOrderQty(parseInt(e.target.value) || 1)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="uom">UOM (Unit of Measurement) *</Label>
                <Input
                  id="uom"
                  value="Nos"
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stitchingCost">Stitching Cost (INR) *</Label>
                <Input
                  id="stitchingCost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={stitchingCost}
                  onChange={(e) =>
                    setStitchingCost(parseFloat(e.target.value) || 0)
                  }
                  placeholder="0.00"
                  required
                />
                {stitchingCost > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(stitchingCost)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="expectedDeliveryDate">
                  Expected Delivery Date *
                </Label>
                <Input
                  id="expectedDeliveryDate"
                  type="date"
                  min={getTodayDate()}
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Measurements Display - Professional Card Layout */}
            {availableMeasurementCategories.length > 0 && (
              <Card>
                <CardHeader className="py-3 px-4 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                      Customer Measurements
                    </CardTitle>
                    {/* UOM Toggle */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Display:</span>
                      <div className="flex bg-muted rounded-md p-0.5">
                        <button
                          type="button"
                          onClick={() => setDisplayUom('Inches')}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            displayUom === 'Inches'
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Inches
                        </button>
                        <button
                          type="button"
                          onClick={() => setDisplayUom('Cms')}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            displayUom === 'Cms'
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Cms
                        </button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {/* Dress Type Selector Dropdown */}
                  <div className="mb-4 space-y-3">
                    <Label className="text-sm font-semibold">Add Dress Type Measurements</Label>
                    <Select
                      value={activeDressType || ''}
                      onValueChange={(value) => {
                        const category = value as MeasurementCategoryKey;
                        setActiveDressType(category);
                        // Add to selected categories if not already present
                        if (!selectedMeasurementCategories.includes(category)) {
                          setSelectedMeasurementCategories([...selectedMeasurementCategories, category]);
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a dress type to add measurements" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shirt">
                          <div className="flex items-center gap-2">
                            <TShirt size={16} />
                            <span>Shirt</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="pant">
                          <div className="flex items-center gap-2">
                            <Pants size={16} />
                            <span>Pant</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="coat">
                          <div className="flex items-center gap-2">
                            <Hoodie size={16} />
                            <span>Coat</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="chuditharTop">
                          <div className="flex items-center gap-2">
                            <Dress size={16} />
                            <span>Chudithar Top</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="chuditharPant">
                          <div className="flex items-center gap-2">
                            <Pants size={16} />
                            <span>Chudithar Pant</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="blouse">
                          <div className="flex items-center gap-2">
                            <TShirt size={16} />
                            <span>Blouse</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="trouser">
                          <div className="flex items-center gap-2">
                            <Pants size={16} />
                            <span>Trouser</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Show selected dress types as badges */}
                    {selectedMeasurementCategories.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <p className="text-xs text-muted-foreground w-full">Selected dress types:</p>
                        {selectedMeasurementCategories.map((category) => {
                          const config = MEASUREMENT_CATEGORIES[category];
                          const Icon = config.icon;
                          const isActive = activeDressType === category;
                          const categoryData = measurements[category] as Record<string, unknown> | undefined;
                          const hasData = categoryData && Object.values(categoryData).some((v) => v !== undefined && v !== null);

                          return (
                            <button
                              key={category}
                              type="button"
                              onClick={() => setActiveDressType(category)}
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all border ${
                                isActive
                                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                  : hasData
                                  ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                                  : 'bg-muted text-muted-foreground border-border'
                              }`}
                            >
                              <Icon size={14} />
                              <span>{config.label}</span>
                              {hasData && <Check size={12} className="text-green-600" />}
                              <X
                                size={12}
                                className="ml-1 hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Remove from selected categories
                                  setSelectedMeasurementCategories(
                                    selectedMeasurementCategories.filter(c => c !== category)
                                  );
                                  // Clear measurements for this category
                                  const updatedMeasurements = { ...measurements };
                                  delete updatedMeasurements[category];
                                  setMeasurements(updatedMeasurements);
                                  // If this was active, clear active state
                                  if (activeDressType === category) {
                                    setActiveDressType(null);
                                  }
                                }}
                              />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Measurement Fields - Show only for active dress type */}
                  {activeDressType && (
                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-green-200 dark:border-green-800">
                        {(() => {
                          const Icon = MEASUREMENT_CATEGORIES[activeDressType].icon;
                          const categoryData = measurements[activeDressType] as Record<string, unknown> | undefined;
                          const hasExistingData = categoryData && Object.values(categoryData).some((v) => v !== undefined && v !== null);

                          return (
                            <>
                              <Icon size={20} weight="duotone" className="text-green-600" />
                              <h4 className="font-semibold text-base text-green-800 dark:text-green-200">
                                {MEASUREMENT_CATEGORIES[activeDressType].label} Measurements
                              </h4>
                              {!hasExistingData && (
                                <span className="ml-auto text-xs text-amber-600 dark:text-amber-400 font-medium px-2 py-1 bg-amber-50 dark:bg-amber-950/20 rounded">
                                  New - Enter measurements
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {MEASUREMENT_CATEGORIES[activeDressType].fields.map((field) => {
                          const categoryData = measurements[activeDressType] as Record<string, unknown> | undefined;
                          const value = categoryData?.[field];
                          return (
                            <div key={field} className="space-y-1">
                              <label className="text-[10px] text-green-600 dark:text-green-400 uppercase tracking-wide font-medium">
                                {field.replace(/([A-Z])/g, ' $1').trim()}
                              </label>
                              <Input
                                type="number"
                                step="0.1"
                                value={typeof value === 'number' ? value : ''}
                                onChange={(e) => {
                                  const newValue = e.target.value === '' ? undefined : parseFloat(e.target.value) || 0;
                                  setMeasurements({
                                    ...measurements,
                                    [activeDressType]: {
                                      ...(measurements[activeDressType] || {}),
                                      [field]: newValue,
                                    },
                                  });
                                }}
                                placeholder="0.0"
                                className="h-9 text-sm bg-white dark:bg-green-900/30 border-green-200 dark:border-green-800 focus:ring-green-500"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Design Selection from Categories */}
            <div className="space-y-2">
              <Label>Select Design from Category</Label>
              <div className="space-y-3">
                {/* Category Dropdown */}
                <Select value={selectedDesignCategory} onValueChange={(value) => {
                  setSelectedDesignCategory(value);
                  setShowDesignModal(true);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a design category" />
                  </SelectTrigger>
                  <SelectContent>
                    {designCategories.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        No design categories available
                      </div>
                    ) : (
                      designCategories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name} ({category.images.length} designs)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                {/* Browse Designs Button */}
                {selectedDesignCategory && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDesignModal(true)}
                    className="w-full"
                  >
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Browse Designs ({categoryImages.length} available)
                  </Button>
                )}

                {/* Selected Designs Preview */}
                {selectedDesigns.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Selected Designs ({selectedDesigns.length})</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedDesigns.map((design) => (
                        <div
                          key={design.id}
                          className="relative group aspect-square border rounded-lg overflow-hidden"
                        >
                          <img
                            src={design.url}
                            alt={design.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
                            {design.designCode}
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedDesigns(prev => prev.filter(d => d.id !== design.id))}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Manual Design Image Upload */}
            <div className="space-y-2">
              <Label>Upload Design Images</Label>
              <div className="space-y-2">
                {/* Gallery Upload and Camera Capture */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Gallery Upload */}
                  <div>
                    <Input
                      id="designUpload"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('designUpload')?.click()}
                      className="w-full h-auto py-3"
                      disabled={isUploading}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Upload size={20} weight="bold" />
                        <span className="text-xs font-semibold">Upload from Gallery</span>
                      </div>
                    </Button>
                  </div>

                  {/* Camera Capture */}
                  <div>
                    <Input
                      id="cameraCapture"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleCameraCapture}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('cameraCapture')?.click()}
                      className="w-full h-auto py-3"
                      disabled={isUploading}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Camera size={20} weight="bold" />
                        <span className="text-xs font-semibold">Capture Photo</span>
                      </div>
                    </Button>
                  </div>
                </div>

                {/* Uploading indicator */}
                {isUploading && (
                  <div className="text-center py-2">
                    <div className="inline-flex items-center gap-2 text-sm text-primary">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                      <span className="font-medium">Uploading...</span>
                    </div>
                  </div>
                )}

                {/* Preview Thumbnails */}
                {designList.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {designList.map((imageUrl, index) => (
                      <div
                        key={index}
                        className="relative group aspect-square border rounded-lg overflow-hidden"
                      >
                        <img
                          src={imageUrl}
                          alt={`Design ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Reference */}
            <div className="space-y-2">
              <Label htmlFor="reference">Reference / Notes</Label>
              <Textarea
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Cloth details, customer instructions, special design requests..."
                rows={4}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t mt-4 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('cancel')}
            </Button>
            <Button type="submit">
              {order ? t('save') : 'Next: Advance Payment'}
            </Button>
          </div>
        </form>
        )}

        {/* Step 2: Advance Payment */}
        {currentStep === 2 && createdOrderData && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="space-y-4 overflow-y-auto pr-2 flex-1">
              {/* Order Summary */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="font-semibold text-sm text-blue-800 dark:text-blue-200 mb-2">Order Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p className="text-blue-700 dark:text-blue-300">Customer:</p>
                  <p className="font-medium">{createdOrderData.customerName}</p>
                  <p className="text-blue-700 dark:text-blue-300">Category:</p>
                  <p className="font-medium capitalize">{createdOrderData.orderCategory}</p>
                  <p className="text-blue-700 dark:text-blue-300">Quantity:</p>
                  <p className="font-medium">{createdOrderData.orderQty} {createdOrderData.uom}</p>
                  <p className="text-blue-700 dark:text-blue-300">Stitching Cost:</p>
                  <p className="font-medium">₹{createdOrderData.stitchingCost.toFixed(2)}</p>
                </div>
              </div>

              {/* Proforma Invoice Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
                <div>
                  <Label className="text-sm text-muted-foreground">Proforma Invoice No</Label>
                  <p className="text-lg font-semibold text-primary">{proformaInvoiceNo}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Proforma Invoice Date</Label>
                  <p className="text-lg font-semibold">{format(new Date(), 'dd MMM yyyy')}</p>
                </div>
              </div>

              {/* Mode of Payment */}
              <div className="space-y-2">
                <Label>Mode of Payment *</Label>
                <RadioGroup
                  value={modeOfPayment}
                  onValueChange={(value) => setModeOfPayment(value as ModeOfPayment)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash" className="font-normal cursor-pointer">Cash</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="qrpay" id="qrpay" />
                    <Label htmlFor="qrpay" className="font-normal cursor-pointer">QR Pay</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="nil" id="nil" />
                    <Label htmlFor="nil" className="font-normal cursor-pointer">Nil</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="advanceAmount">Advance Amount (INR) *</Label>
                <Input
                  id="advanceAmount"
                  type="number"
                  min="0"
                  max={createdOrderData.stitchingCost}
                  step="0.01"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  disabled={modeOfPayment === 'nil'}
                />
                {modeOfPayment === 'nil' && (
                  <p className="text-xs text-muted-foreground">No advance payment selected</p>
                )}
              </div>

              {/* Payment Summary */}
              <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-md border border-green-200 dark:border-green-800">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-700 dark:text-green-300">Total Stitching Cost:</span>
                    <span className="font-medium">₹{createdOrderData.stitchingCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-700 dark:text-green-300">Advance Amount:</span>
                    <span className="font-medium">₹{(modeOfPayment === 'nil' ? 0 : advanceAmount).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-green-200 dark:border-green-800 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold text-green-800 dark:text-green-200">Remaining Amount:</span>
                      <span className="font-bold text-green-800 dark:text-green-200">
                        ₹{(createdOrderData.stitchingCost - (modeOfPayment === 'nil' ? 0 : advanceAmount)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Actions */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrintInvoice}
                  className="flex-1"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print Invoice
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownloadPdf}
                  className="flex-1"
                >
                  <FilePdf className="mr-2 h-4 w-4" />
                  Save as PDF
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between gap-3 pt-4 border-t mt-4 flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(1)}
              >
                Back
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSkipAdvancePayment}
                >
                  Skip Payment
                </Button>
                <Button
                  type="button"
                  onClick={handleStep2Submit}
                >
                  Save Order
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Design Selection Modal */}
    <Dialog open={showDesignModal} onOpenChange={setShowDesignModal}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Select Designs - {designCategories.find(c => c.id === selectedDesignCategory)?.name}
          </DialogTitle>
          <DialogDescription>
            Click on designs to select/deselect them. Selected designs will be added to your order.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4">
          {categoryImages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ImageIcon size={48} className="mx-auto mb-3 opacity-30" />
              <p>No designs in this category</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {categoryImages.map((image) => {
                const isSelected = selectedDesigns.some(d => d.id === image.id);
                return (
                  <div
                    key={image.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedDesigns(prev => prev.filter(d => d.id !== image.id));
                      } else {
                        setSelectedDesigns(prev => [...prev, image]);
                      }
                    }}
                    className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                      isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="aspect-square">
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1">
                      <p className="font-medium">{image.designCode}</p>
                      <p className="truncate opacity-80">{image.name}</p>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                        <Check size={14} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {selectedDesigns.length} design(s) selected
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowDesignModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowDesignModal(false)}>
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

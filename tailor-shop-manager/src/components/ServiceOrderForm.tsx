import { useState, useEffect, useMemo, useRef } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { Button } from '@/components/ui/button';
import { generateServiceOrderId } from '@/lib/firestore/serviceOrderService';
import {
  ProformaInvoiceData,
  ProformaInvoiceItem,
  generateProformaInvoiceHtml,
  generateProformaInvoicePdf,
  downloadProformaInvoicePdf,
  printProformaInvoice,
} from '@/lib/proformaInvoiceTemplate';
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
import { Calendar } from '@/components/ui/calendar';
import { ServiceOrder, OrderCategory, Customer, Measurements, UOM, ModeOfPayment, AdvancePayment, DressItem, DressType } from '@/lib/types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, X, Image as ImageIcon, MagnifyingGlass, TShirt, Pants, Hoodie, Dress, Check, FilePdf, Printer, CaretDown, Camera, Upload, UserCircle, Baby, CalendarBlank } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { uploadPhoto } from '@/lib/storage';
import { generateProformaInvoiceId } from '@/lib/firestore/advancePaymentService';
import { useAuth } from '@/hooks/use-auth';
import {
  DesignCategory,
  DesignImage,
  getDesignCategoriesByCompany,
} from '@/lib/firestore/designCategoryService';
import { getCompanyProfile } from '@/lib/firestore/companyService';
import { getRecentCustomers, searchCustomers, addCustomer } from '@/lib/firestore/customerService';

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
  initialCustomerId?: string;
}

export function ServiceOrderForm({
  open,
  onOpenChange,
  onSave,
  customers,
  onCreateCustomer,
  order,
  initialCustomerId,
}: ServiceOrderFormProps) {
  const { t } = useLanguage();
  const { user, employee } = useAuth();
  const companyId = employee?.companyId || user?.id || '';
  const [actualCompanyId, setActualCompanyId] = useState<string>('');

  // Two-step form state
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [createdOrderData, setCreatedOrderData] = useState<Omit<ServiceOrder, 'id' | 'createdAt' | 'updatedAt'> | null>(null);

  // Order fields
  const [serviceOrderNo, setServiceOrderNo] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [orderCategory, setOrderCategory] = useState<OrderCategory | ''>('');
  const [measurements, setMeasurements] = useState<Measurements>({});
  const [previousMeasurements, setPreviousMeasurements] = useState<Measurements>({}); // Store customer's original measurements
  const [orderQty, setOrderQty] = useState(1);
  const [uom, setUom] = useState<UOM>('Nos');
  const [displayUom, setDisplayUom] = useState<'Inches' | 'Cms'>('Inches');
  const [designList, setDesignList] = useState<string[]>([]);
  const [stitchingCost, setStitchingCost] = useState(0);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
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

  // Upload Designs Modal (unified camera + gallery)
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMode, setUploadMode] = useState<'camera' | 'gallery'>('camera');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableMeasurementCategories = useMemo<MeasurementCategoryKey[]>(() => {
    if (orderCategory === 'male') return ['shirt', 'pant', 'coat'];
    if (orderCategory === 'female') return ['blouse', 'chuditharTop', 'coat'];
    if (orderCategory === 'kids') return ['shirt', 'pant', 'coat', 'blouse', 'chuditharTop'];
    return ['shirt', 'pant', 'coat', 'blouse', 'chuditharTop'];
  }, [orderCategory]);

  useEffect(() => {
    // Keep selected measurement categories aligned with available ones
    setSelectedMeasurementCategories((prev) => {
      const filtered = prev.filter((c) => availableMeasurementCategories.includes(c));
      if (filtered.length === 0 && availableMeasurementCategories.length > 0) {
        return [availableMeasurementCategories[0]];
      }
      return filtered;
    });

    setActiveDressType((prev) => {
      if (prev && availableMeasurementCategories.includes(prev)) return prev;
      return availableMeasurementCategories[0] || null;
    });
  }, [availableMeasurementCategories]);

  // Load design categories, recent customers, and next service order ID on mount
  useEffect(() => {
    const loadData = async () => {
      if (!companyId) return;
      try {
        // Get company profile to get the correct companyId
        const company = await getCompanyProfile(user?.id || companyId);
        const actualCompanyId = company?.id || companyId;

        if (actualCompanyId) {
          // Store the actual company ID for use in search
          setActualCompanyId(actualCompanyId);

          // Load design categories
          const categories = await getDesignCategoriesByCompany(actualCompanyId);
          setDesignCategories(categories);
          console.log(`[ServiceOrderForm] Loaded ${categories.length} design categories`);

          // Load 15 most recent customers - refresh whenever customers prop changes
          if (open && !order) {
            const recent = await getRecentCustomers(actualCompanyId);
            setRecentCustomers(recent);
            console.log(`[ServiceOrderForm] Loaded ${recent.length} recent customers`);
          }

          // Generate next service order ID for new orders
          if (open && !order) {
            const nextId = await generateServiceOrderId(actualCompanyId);
            setNextServiceOrderId(nextId);
            setServiceOrderNo(nextId);
            console.log(`[ServiceOrderForm] Next service order ID: ${nextId}`);
          } else if (!open) {
            // Reset when form closes
            setNextServiceOrderId('');
            setServiceOrderNo('');
          }
        }
      } catch (error) {
        console.error('[ServiceOrderForm] Error loading data:', error);
        toast.error('Failed to load form data');
      }
    };
    loadData();
  }, [user, companyId, open, order, customers]);

  // Handle customer search with debouncing
  useEffect(() => {
    const searchCustomersDebounced = async () => {
      if (!customerSearch.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      console.log('[ServiceOrderForm] Searching for:', customerSearch);
      console.log('[ServiceOrderForm] Using companyId:', actualCompanyId || companyId);
      try {
        const results = await searchCustomers(actualCompanyId || companyId, customerSearch);
        console.log('[ServiceOrderForm] Search results:', results.length, 'customers found');
        setSearchResults(results);
      } catch (error) {
        console.error('[ServiceOrderForm] Error searching customers:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(searchCustomersDebounced, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, companyId, actualCompanyId]);

  // Auto-select newly created customer
  useEffect(() => {
    if (initialCustomerId && open && !order) {
      console.log('[ServiceOrderForm] Auto-selecting newly created customer:', initialCustomerId);
      handleCustomerChange(initialCustomerId);
      toast.success('Customer selected! Continue with your order.');
    }
  }, [initialCustomerId, open, order]);

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
    setOrderCategory('');
    setMeasurements({});
    setPreviousMeasurements({});
    setOrderQty(1);
    setUom('Nos');
    setDisplayUom('Inches');
    setDesignList([]);
    setStitchingCost(0);
    setExpectedDeliveryDate('');
    setShowCalendar(false);
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

    if (!orderCategory) {
      toast.error('Please select the order category');
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

    // Fetch next PI number from Firestore using actualCompanyId
    setIsLoadingPiNumber(true);
    try {
      const companyIdToUse = actualCompanyId || companyId || '';
      console.log(`[ServiceOrderForm] Generating PI number with companyId: ${companyIdToUse}`);
      const piNo = await generateProformaInvoiceId(companyIdToUse);
      setProformaInvoiceNo(piNo);
      console.log(`[ServiceOrderForm] Generated PI: ${piNo}`);
    } catch (error) {
      console.error('Error generating PI number:', error);
      // Fallback to timestamp-based number if Firestore fails
      const timestamp = Date.now().toString().slice(-4);
      setProformaInvoiceNo(`PI${timestamp}`);
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

  // Build proforma invoice data for the new template
  const buildProformaInvoiceData = (): ProformaInvoiceData | null => {
    if (!createdOrderData) return null;

    const customer = customers.find((c) => c.id === createdOrderData.customerId);
    const paymentMode = modeOfPayment === 'qrpay' ? 'QR Pay' : 'Cash';
    const effectiveAdvance = advanceAmount;
    const balanceDue = createdOrderData.stitchingCost - effectiveAdvance;

    // Build line items
    const items: ProformaInvoiceItem[] = createdOrderData.dressItems && createdOrderData.dressItems.length > 0
      ? createdOrderData.dressItems.map((item: DressItem) => ({
          name: item.name || item.dressName || 'Stitching',
          quantity: item.qty || item.quantity || 1,
          rate: item.rate || item.stitchingCost || 0,
          amount: item.amount || (item.qty || item.quantity || 1) * (item.rate || item.stitchingCost || 0),
        }))
      : [{
          name: 'Tailoring Service',
          quantity: createdOrderData.orderQty,
          rate: createdOrderData.stitchingCost,
          amount: createdOrderData.stitchingCost,
        }];

    return {
      proformaInvoiceNo,
      invoiceDate: new Date(),
      serviceOrderNo: nextServiceOrderId || undefined,
      customerName: createdOrderData.customerName,
      customerId: createdOrderData.customerId,
      customerPhone: customer?.phone,
      customerAddress: customer?.address1,
      orderCategory: createdOrderData.orderCategory,
      expectedDeliveryDate: createdOrderData.expectedDeliveryDate,
      items,
      subtotal: createdOrderData.stitchingCost,
      advanceAmount: effectiveAdvance,
      balanceDue,
      paymentMode,
    };
  };

  // Print Proforma Invoice - Opens print preview only
  const handlePrintInvoice = () => {
    const invoiceData = buildProformaInvoiceData();
    if (!invoiceData) {
      toast.error('Unable to generate invoice');
      return;
    }

    printProformaInvoice(invoiceData);
    toast.success('Proforma Invoice sent to printer');
  };

  // Download as PDF using new template
  const handleDownloadPdf = () => {
    const invoiceData = buildProformaInvoiceData();
    if (!invoiceData) {
      toast.error('Unable to generate invoice');
      return;
    }

    downloadProformaInvoicePdf(invoiceData);
    toast.success(`Proforma Invoice ${proformaInvoiceNo} downloaded as PDF.`);
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

  // Start camera stream
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraStream(stream);
      console.log('[ServiceOrderForm] Camera started');
    } catch (error) {
      console.error('[ServiceOrderForm] Camera error:', error);
      toast.error('Could not access camera. Please check permissions.');
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      console.log('[ServiceOrderForm] Camera stopped');
    }
  };

  // Capture photo from video stream
  const capturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
          setCapturedImage(file);
          console.log('[ServiceOrderForm] Photo captured');
        }
      }, 'image/jpeg', 0.9);
    }
  };

  // Handle file selection from gallery
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    setSelectedFiles(fileArray);
    console.log('[ServiceOrderForm] Files selected:', fileArray.length);
  };

  // Upload all selected/captured images
  const handleUploadAll = async () => {
    const filesToUpload = capturedImage ? [capturedImage] : selectedFiles;

    if (filesToUpload.length === 0) {
      toast.error('No images selected');
      return;
    }

    setIsUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of filesToUpload) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large. Maximum size is 5MB.`);
          continue;
        }

        // Upload to Firebase Storage
        const downloadURL = await uploadPhoto(file, `orders/designs/${companyId}`);
        uploadedUrls.push(downloadURL);
        setUploadProgress(Math.round((uploadedUrls.length / filesToUpload.length) * 100));
        console.log('[ServiceOrderForm] Image uploaded:', downloadURL);
      }

      // Add all uploaded URLs to design list
      setDesignList((prev) => [...prev, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} image(s) uploaded successfully`);

      // Close modal and reset
      setShowUploadModal(false);
      setCapturedImage(null);
      setSelectedFiles([]);
      setUploadProgress(0);
    } catch (error) {
      console.error('[ServiceOrderForm] Upload error:', error);
      toast.error('Failed to upload images. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle modal close
  const handleCloseUploadModal = () => {
    stopCamera();
    setShowUploadModal(false);
    setCapturedImage(null);
    setSelectedFiles([]);
    setUploadProgress(0);
    setUploadMode('camera');
  };

  // Start camera when modal opens in camera mode
  useEffect(() => {
    if (showUploadModal && uploadMode === 'camera') {
      startCamera();
    }
    return () => {
      if (uploadMode === 'camera') {
        stopCamera();
      }
    };
  }, [showUploadModal, uploadMode]);

  const handleRemoveImage = (index: number) => {
    setDesignList((prev) => prev.filter((_, i) => i !== index));
    toast.info('Image removed');
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl h-[85vh] flex flex-col p-0 overflow-hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #8b5cf6 100%)', borderColor: 'rgba(196, 181, 253, 0.3)' }}>
          <DialogTitle className="flex items-center gap-3 text-white">
            <span>{order ? 'Edit Service Order' : currentStep === 1 ? 'New Service Order' : 'Advance Payment'}</span>
            <span className="text-sm font-normal text-white/80 bg-white/20 px-2 py-1 rounded">
              {order?.id || nextServiceOrderId || 'Loading...'}
            </span>
          </DialogTitle>
          {/* Step Indicator */}
          {!order && (
            <div className="flex items-center gap-3 mt-3">
              <button
                type="button"
                onClick={() => currentStep === 2 && setCurrentStep(1)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                  currentStep === 1
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'bg-white/20 text-white hover:bg-white/30'
                )}
              >
                <span className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs',
                  currentStep === 1 ? 'bg-purple-100 text-purple-700' : 'bg-white/20 text-white'
                )}>1</span>
                <span>Order Details</span>
              </button>
              <div className="w-8 h-0.5 bg-white/30" />
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 1) {
                    // Validate mandatory fields before moving to step 2
                    if (!customerId) {
                      toast.error('Please select a customer');
                      return;
                    }
                    if (!orderCategory) {
                      toast.error('Please select a category');
                      return;
                    }
                    if (!orderQty || orderQty < 1) {
                      toast.error('Please enter order quantity');
                      return;
                    }
                    if (!stitchingCost || stitchingCost <= 0) {
                      toast.error('Please enter stitching cost');
                      return;
                    }
                    if (!expectedDeliveryDate) {
                      toast.error('Please select delivery date');
                      return;
                    }
                    // Trigger form submission
                    const form = document.querySelector('form');
                    if (form) {
                      form.requestSubmit();
                    }
                  }
                }}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                  currentStep === 2
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'bg-white/20 text-white hover:bg-white/30'
                )}
              >
                <span className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs',
                  currentStep === 2 ? 'bg-purple-100 text-purple-700' : 'bg-white/20 text-white'
                )}>2</span>
                <span>Payment</span>
              </button>
            </div>
          )}
        </DialogHeader>

        {/* Step 1: Order Form */}
        {currentStep === 1 && (
        <form onSubmit={handleStep1Submit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

            {/* Customer Selection with Search */}
            <div className="space-y-3">
              <Label htmlFor="customer-search" className="text-sm font-medium">Customer Name *</Label>

              {/* Search Input */}
              <div className="relative">
                <MagnifyingGlass
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="customer-search"
                  placeholder="Search by name or phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onBlur={() => {
                    // Delay closing to allow clicking dropdown items
                    setTimeout(() => setShowCustomerDropdown(false), 200);
                  }}
                  className="pl-10 h-11"
                  autoFocus={false}
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                )}
              </div>

              {/* Customer List - Recent or Search Results */}
              {showCustomerDropdown && (customerSearch.trim() || recentCustomers.length > 0) && (
                <div className="border rounded-lg max-h-[280px] overflow-y-auto">
                  {/* Create New Customer Button - Always at TOP */}
                  <div className="p-2 border-b bg-muted sticky top-0 z-10">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onCreateCustomer?.()}
                      className="w-full justify-start text-primary hover:text-primary hover:bg-muted-foreground/10 font-medium"
                    >
                      <Plus size={16} weight="bold" className="mr-2" />
                      Create New Customer
                    </Button>
                  </div>

                  {/* Show search results if searching */}
                  {customerSearch.trim() && searchResults.length > 0 && (
                    <div className="p-2 space-y-1">
                      <p className="text-xs text-muted-foreground px-2 py-1">Search Results ({searchResults.length})</p>
                      {searchResults.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => {
                            setCustomerId(customer.id);
                            setCustomerSearch('');
                            handleCustomerChange(customer.id);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors ${
                            customerId === customer.id ? 'bg-green-50 dark:bg-green-950/20 border border-green-200' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{customer.name}</p>
                              <p className="text-xs text-muted-foreground">{customer.phone} • {customer.place}</p>
                            </div>
                            {customerId === customer.id && (
                              <Check size={16} className="text-green-600" weight="bold" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Show "no results" if search returned nothing */}
                  {customerSearch.trim() && !isSearching && searchResults.length === 0 && (
                    <div className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">No customers found for "{customerSearch}"</p>
                    </div>
                  )}

                  {/* Show recent customers when not searching */}
                  {!customerSearch.trim() && recentCustomers.length > 0 && (
                    <div className="p-2 space-y-1">
                      <p className="text-xs text-muted-foreground px-2 py-1">Recent Customers</p>
                      {recentCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => {
                            setCustomerId(customer.id);
                            handleCustomerChange(customer.id);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors ${
                            customerId === customer.id ? 'bg-green-50 dark:bg-green-950/20 border border-green-200' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{customer.name}</p>
                              <p className="text-xs text-muted-foreground">{customer.phone} • {customer.place}</p>
                            </div>
                            {customerId === customer.id && (
                              <Check size={16} className="text-green-600" weight="bold" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Selected Customer Info */}
              {selectedCustomer && (
                <div className="p-3 rounded-lg" style={{ backgroundColor: '#dcfce7', border: '1px solid #86efac' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Check size={16} style={{ color: '#047857' }} weight="bold" />
                    <span className="text-sm font-bold" style={{ color: '#111827' }}>
                      {selectedCustomer.name}
                    </span>
                  </div>
                  <p className="text-xs font-semibold" style={{ color: '#374151' }}>
                    {selectedCustomer.id} • {selectedCustomer.phone} • {selectedCustomer.place}
                  </p>
                </div>
              )}
            </div>

            {/* Order Category - Simple Buttons */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Order Category *</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'male', label: 'Men', icon: UserCircle },
                  { value: 'female', label: 'Women', icon: UserCircle },
                  { value: 'kids', label: 'Kids', icon: Baby },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = orderCategory === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setOrderCategory(item.value as OrderCategory)}
                      className={cn(
                        'relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all',
                        isActive
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-transparent bg-muted/50 hover:bg-muted hover:border-muted-foreground/20'
                      )}
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center',
                        isActive ? 'bg-primary text-primary-foreground' : 'bg-background'
                      )}>
                        <Icon size={22} weight={isActive ? 'fill' : 'bold'} />
                      </div>
                      <span className={cn(
                        'text-xs font-semibold',
                        isActive ? 'text-primary' : 'text-muted-foreground'
                      )}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Order Details Grid */}
            <div className="bg-muted/30 rounded-xl p-5 border space-y-5">
              <h3 className="text-sm font-semibold text-muted-foreground">Order Details</h3>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="orderQty" className="text-sm font-medium">Order Qty *</Label>
                  <Input
                    id="orderQty"
                    type="number"
                    min="1"
                    value={orderQty || ''}
                    onChange={(e) => setOrderQty(parseInt(e.target.value) || 0)}
                    onFocus={(e) => e.target.select()}
                    placeholder="1"
                    className="h-12 text-base bg-background"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stitchingCost" className="text-sm font-medium">Stitching Cost (₹) *</Label>
                  <Input
                    id="stitchingCost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={stitchingCost || ''}
                    onChange={(e) =>
                      setStitchingCost(parseFloat(e.target.value) || 0)
                    }
                    onWheel={(e) => e.currentTarget.blur()}
                    onFocus={(e) => e.target.select()}
                    placeholder="0.00"
                    className="h-12 text-base bg-background"
                    required
                  />
                  {stitchingCost > 0 && (
                    <p className="text-xs text-green-600 font-semibold">
                      {formatCurrency(stitchingCost)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expectedDeliveryDate" className="text-sm font-medium">Delivery Date *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCalendar(true)}
                    className={cn(
                      "w-full h-12 justify-start text-left font-normal text-base bg-background",
                      !expectedDeliveryDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarBlank size={18} className="mr-2 flex-shrink-0" />
                    {expectedDeliveryDate ? format(new Date(expectedDeliveryDate), 'dd MMM yyyy') : 'Select date'}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Order Date</Label>
                  <div className="h-12 px-4 flex items-center bg-background rounded-md border text-base font-medium">
                    {format(new Date(), 'dd MMM yyyy')}
                  </div>
                </div>
              </div>
            </div>

            {/* Measurements Section - Category Icon Selection */}
            {availableMeasurementCategories.length > 0 && (
              <div className="space-y-4">
                {/* Header with Select Category and UOM Toggle */}
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Select Category</Label>
                  <div className="flex rounded-md border-2 border-blue-500 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setDisplayUom('Inches')}
                      className={`px-4 py-1.5 text-xs font-semibold transition-colors ${
                        displayUom === 'Inches'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      Inches
                    </button>
                    <button
                      type="button"
                      onClick={() => setDisplayUom('Cms')}
                      className={`px-4 py-1.5 text-xs font-semibold transition-colors ${
                        displayUom === 'Cms'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      Cms
                    </button>
                  </div>
                </div>

                {/* Category Icons Row */}
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                  {availableMeasurementCategories.map((key) => {
                    const config = MEASUREMENT_CATEGORIES[key];
                    const isActive = activeDressType === key;
                    const categoryData = measurements[key] as Record<string, unknown> | undefined;
                    const filledFieldsCount = categoryData
                      ? Object.values(categoryData).filter((v) => v !== undefined && v !== null && v !== 0).length
                      : 0;
                    const Icon = config.icon;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setActiveDressType(key);
                          if (!selectedMeasurementCategories.includes(key)) {
                            setSelectedMeasurementCategories([...selectedMeasurementCategories, key]);
                          }
                        }}
                        className={`relative flex flex-col items-center gap-1 min-w-[60px] p-3 rounded-xl transition-all ${
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {filledFieldsCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-[10px] font-bold bg-primary text-primary-foreground rounded-full border-2 border-background">
                            {filledFieldsCount}
                          </span>
                        )}
                        <Icon size={24} weight={isActive ? 'fill' : 'regular'} />
                        <span className="text-[10px] font-medium">{config.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Measurement Fields - Show only for active dress type */}
                {activeDressType && (
                  <div className="space-y-4">
                    {/* Category Title */}
                    <div className="flex items-center gap-2">
                      {(() => {
                        const Icon = MEASUREMENT_CATEGORIES[activeDressType].icon;
                        return (
                          <>
                            <Icon size={20} weight="duotone" className="text-primary" />
                            <h4 className="font-semibold text-sm">
                              {MEASUREMENT_CATEGORIES[activeDressType].label} Measurements
                            </h4>
                          </>
                        );
                      })()}
                    </div>

                    {/* Measurement Input Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      {MEASUREMENT_CATEGORIES[activeDressType].fields.map((field) => {
                        const categoryData = measurements[activeDressType] as Record<string, unknown> | undefined;
                        const value = categoryData?.[field];
                        const fieldLabel = field.replace(/([A-Z])/g, ' $1').trim();
                        const capitalizedLabel = fieldLabel.charAt(0).toUpperCase() + fieldLabel.slice(1);

                        return (
                          <div key={field} className="space-y-1.5">
                            <label className="text-xs text-muted-foreground font-medium">
                              {capitalizedLabel}
                            </label>
                            <div className="relative">
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
                                placeholder="0"
                                className="h-11 text-base pr-10 border-purple-200 dark:border-purple-800 focus:border-primary focus:ring-primary"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                {displayUom === 'Inches' ? 'in' : 'cm'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Measurements Added Summary */}
                {selectedMeasurementCategories.length > 0 && (
                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      Measurements Added ({selectedMeasurementCategories.length} total)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedMeasurementCategories.map((category) => {
                        const config = MEASUREMENT_CATEGORIES[category];
                        const categoryData = measurements[category] as Record<string, unknown> | undefined;
                        const filledFieldsCount = categoryData
                          ? Object.values(categoryData).filter((v) => v !== undefined && v !== null && v !== 0).length
                          : 0;

                        return (
                          <div
                            key={category}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-white text-xs font-medium"
                          >
                            <span>{config.label}: {filledFieldsCount}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMeasurementCategories(
                                  selectedMeasurementCategories.filter(c => c !== category)
                                );
                                const updatedMeasurements = { ...measurements };
                                delete updatedMeasurements[category];
                                setMeasurements(updatedMeasurements);
                                if (activeDressType === category) {
                                  setActiveDressType(null);
                                }
                              }}
                              className="ml-1 hover:text-red-200"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
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
                {/* Single Upload Designs Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowUploadModal(true)}
                  className="w-full h-auto py-4"
                  disabled={isUploading}
                >
                  <div className="flex flex-col items-center gap-2">
                    <ImageIcon size={24} weight="bold" />
                    <span className="text-sm font-semibold">Upload Sample Cloth Image</span>
                    <span className="text-xs text-muted-foreground">Camera or Gallery</span>
                  </div>
                </Button>

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

          {/* Footer with action buttons */}
          <div className="flex justify-between items-center gap-3 px-6 py-4 border-t flex-shrink-0" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #8b5cf6 100%)', borderColor: 'rgba(196, 181, 253, 0.3)' }}>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-white hover:text-white/80 hover:bg-white/10">
              {t('cancel')}
            </Button>
            <Button type="submit" className="min-w-[140px] bg-white text-purple-700 hover:bg-white/90">
              {order ? t('save') : 'Next'}
            </Button>
          </div>
        </form>
        )}

        {/* Step 2: Advance Payment */}
        {currentStep === 2 && createdOrderData && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {/* Order Summary Card */}
              <div className="bg-muted/30 rounded-xl p-5 border space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground">Order Summary</h3>
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Customer</Label>
                    <div className="h-12 px-4 flex items-center bg-background rounded-md border text-base font-medium">
                      {createdOrderData.customerName}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Category</Label>
                    <div className="h-12 px-4 flex items-center bg-background rounded-md border text-base font-medium">
                      {createdOrderData.orderCategory === 'male' ? 'Men' : createdOrderData.orderCategory === 'female' ? 'Women' : 'Kids'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Quantity</Label>
                    <div className="h-12 px-4 flex items-center bg-background rounded-md border text-base font-medium">
                      {createdOrderData.orderQty} {createdOrderData.uom}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Stitching Cost</Label>
                    <div className="h-12 px-4 flex items-center bg-background rounded-md border text-base font-bold text-primary">
                      ₹{createdOrderData.stitchingCost.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Info */}
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Proforma Invoice No</Label>
                  <div className="h-12 px-4 flex items-center bg-background rounded-md border text-base font-bold text-primary">
                    {proformaInvoiceNo}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Invoice Date</Label>
                  <div className="h-12 px-4 flex items-center bg-background rounded-md border text-base font-medium">
                    {format(new Date(), 'dd MMM yyyy')}
                  </div>
                </div>
              </div>

              {/* Mode of Payment - Visual Buttons */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Mode of Payment *</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'cash', label: 'Cash' },
                    { value: 'qrpay', label: 'QR Pay' },
                  ].map((option) => {
                    const isActive = modeOfPayment === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setModeOfPayment(option.value as ModeOfPayment)}
                        className={cn(
                          'relative flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all font-semibold text-sm',
                          isActive
                            ? 'border-primary bg-primary/5 text-primary shadow-sm'
                            : 'border-transparent bg-muted/50 hover:bg-muted hover:border-muted-foreground/20 text-muted-foreground'
                        )}
                      >
                        {isActive && (
                          <Check size={16} weight="bold" className="absolute top-2 right-2" />
                        )}
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="advanceAmount" className="text-sm font-medium">Advance Amount (₹) *</Label>
                <Input
                  id="advanceAmount"
                  type="number"
                  min="0"
                  max={createdOrderData.stitchingCost}
                  step="0.01"
                  value={advanceAmount || ''}
                  onChange={(e) => setAdvanceAmount(parseFloat(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  placeholder="0.00"
                  className="h-12 text-base bg-background"
                />
              </div>

              {/* Payment Summary */}
              <div className="bg-muted/30 rounded-xl p-5 border space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground">Payment Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Stitching Cost</span>
                    <span className="text-base font-semibold">₹{createdOrderData.stitchingCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Advance Paid</span>
                    <span className="text-base font-semibold text-primary">- ₹{advanceAmount.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold">Balance Due</span>
                      <span className="text-xl font-bold text-primary">
                        ₹{(createdOrderData.stitchingCost - advanceAmount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Actions */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrintInvoice}
                  className="h-12 text-base"
                >
                  <Printer className="mr-2" size={18} />
                  Print Invoice
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownloadPdf}
                  className="h-12 text-base"
                >
                  <FilePdf className="mr-2" size={18} />
                  Save as PDF
                </Button>
              </div>
            </div>

            {/* Footer with action buttons */}
            <div className="flex justify-between items-center gap-3 px-6 py-4 border-t flex-shrink-0" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #8b5cf6 100%)', borderColor: 'rgba(196, 181, 253, 0.3)' }}>
              <Button
                type="button"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentStep(1);
                }}
                className="text-white hover:text-white/80 hover:bg-white/10"
              >
                Back
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSkipAdvancePayment}
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  Skip Payment
                </Button>
                <Button
                  type="button"
                  onClick={handleStep2Submit}
                  className="min-w-[120px] bg-white text-purple-700 hover:bg-white/90"
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

    {/* Upload Sample Cloth Image Modal */}
    <Dialog open={showUploadModal} onOpenChange={handleCloseUploadModal}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Upload Sample Cloth Image</DialogTitle>
          <DialogDescription>
            Capture a photo with your camera or select from your gallery
          </DialogDescription>
        </DialogHeader>

        {/* Mode Selector */}
        <div className="flex gap-2 border-b pb-3">
          <Button
            type="button"
            variant={uploadMode === 'camera' ? 'default' : 'outline'}
            onClick={() => {
              setUploadMode('camera');
              setCapturedImage(null);
              setSelectedFiles([]);
            }}
            className="flex-1"
          >
            <Camera className="mr-2" size={18} weight="bold" />
            Camera
          </Button>
          <Button
            type="button"
            variant={uploadMode === 'gallery' ? 'default' : 'outline'}
            onClick={() => {
              setUploadMode('gallery');
              stopCamera();
              setCapturedImage(null);
            }}
            className="flex-1"
          >
            <Upload className="mr-2" size={18} weight="bold" />
            Gallery
          </Button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto py-4">
          {uploadMode === 'camera' ? (
            <div className="space-y-4">
              {/* Camera Preview */}
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Capture Button */}
              {!capturedImage && cameraStream && (
                <Button
                  type="button"
                  onClick={capturePhoto}
                  className="w-full"
                  size="lg"
                >
                  <Camera className="mr-2" size={20} weight="bold" />
                  Capture Photo
                </Button>
              )}

              {/* Captured Image Preview */}
              {capturedImage && (
                <div className="space-y-3">
                  <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                    <img
                      src={URL.createObjectURL(capturedImage)}
                      alt="Captured"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCapturedImage(null)}
                      className="flex-1"
                    >
                      Retake
                    </Button>
                    <Button
                      type="button"
                      onClick={handleUploadAll}
                      className="flex-1"
                      disabled={isUploading}
                    >
                      {isUploading ? `Uploading... ${uploadProgress}%` : 'Upload Photo'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Select Files Button */}
              {selectedFiles.length === 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32"
                >
                  <div className="flex flex-col items-center gap-2">
                    <ImageIcon size={32} weight="duotone" />
                    <span className="text-sm font-semibold">Select Images from Gallery</span>
                    <span className="text-xs text-muted-foreground">Multiple selection allowed</span>
                  </div>
                </Button>
              )}

              {/* Selected Files Preview */}
              {selectedFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{selectedFiles.length} file(s) selected</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Change
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    onClick={handleUploadAll}
                    className="w-full"
                    disabled={isUploading}
                  >
                    {isUploading ? `Uploading... ${uploadProgress}%` : `Upload ${selectedFiles.length} Image(s)`}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleCloseUploadModal}
            disabled={isUploading}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Calendar Date Picker Dialog */}
    <Dialog open={showCalendar} onOpenChange={setShowCalendar}>
      <DialogContent className="sm:max-w-[400px] p-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-center text-lg">Select Delivery Date</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center px-2 pb-5">
          <Calendar
            mode="single"
            selected={expectedDeliveryDate ? new Date(expectedDeliveryDate) : undefined}
            onSelect={(date) => {
              if (date) {
                setExpectedDeliveryDate(format(date, 'yyyy-MM-dd'));
                setShowCalendar(false);
              }
            }}
            disabled={(date) => date < new Date(getTodayDate())}
            defaultMonth={expectedDeliveryDate ? new Date(expectedDeliveryDate) : new Date()}
            className="rounded-md"
          />
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

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
import { Plus, X, Image as ImageIcon, MagnifyingGlass, TShirt, Pants, Hoodie, Dress, Check, FilePdf, Printer, CaretDown, Camera, Upload, UserCircle, Baby, CalendarBlank, Microphone, Stop, Play, Trash, ArrowLeft } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { uploadPhoto } from '@/lib/storage';
import { dataUrlToFile } from '@/lib/storage';
import { generateProformaInvoiceId } from '@/lib/firestore/advancePaymentService';
import { useAuth } from '@/hooks/use-auth';
import {
  DesignCategory,
  DesignImage,
  getDesignCategoriesByCompany,
} from '@/lib/firestore/designCategoryService';
import { getCompanyProfile } from '@/lib/firestore/companyService';
import { getRecentCustomers, searchCustomers, addCustomer } from '@/lib/firestore/customerService';
import { 
  WhatsAppConfirmationDialog, 
  generateOrderConfirmationMessage,
  OrderConfirmationMessageData,
  MeasurementData
} from '@/components/WhatsAppConfirmationDialog';

// Garment types by category (Men/Women/Kids)
const GARMENT_TYPES_BY_CATEGORY = {
  male: [
    { key: 'shirt', label: 'Shirt', icon: TShirt },
    { key: 'pant', label: 'Pant', icon: Pants },
    { key: 'coat', label: 'Coat', icon: Hoodie },
  ],
  female: [
    { key: 'blouse', label: 'Blouse', icon: TShirt },
    { key: 'churidar', label: 'Churidar', icon: Dress },
  ],
  kids: [
    { key: 'shirt', label: 'Shirt', icon: TShirt },
    { key: 'pant', label: 'Pant', icon: Pants },
    { key: 'halfTrousers', label: 'Half Trousers', icon: Pants },
  ],
} as const;

// Measurement field configurations for each garment type
const MEASUREMENT_CATEGORIES = {
  shirt: {
    label: 'Shirt',
    icon: TShirt,
    fields: [
      { key: 'length', label: 'Length', type: 'number' },
      { key: 'shoulder', label: 'Shoulder', type: 'number' },
      { key: 'sleeveType', label: 'Sleeve Type', type: 'select', options: ['half', 'full'] },
      { key: 'sleeveLength', label: 'Sleeve Length', type: 'number' },
      { key: 'sleeveLoose', label: 'Sleeve Loose', type: 'number' },
      { key: 'body', label: 'Body', type: 'number' },
      { key: 'waist', label: 'Voiure (Waist)', type: 'number' },
      { key: 'neck', label: 'Neck', type: 'number' },
      { key: 'bodyLooseFront', label: 'Body Loose Front', type: 'number' },
      { key: 'bodyLooseBack', label: 'Body Loose Back', type: 'number' },
      { key: 'pocket', label: 'Pocket', type: 'number' },
      { key: 'bottomCut', label: 'Bottom Cut', type: 'number' },
    ],
  },
  pant: {
    label: 'Pant',
    icon: Pants,
    fields: [
      { key: 'kneeLength', label: 'Knee Length', type: 'number' },
      { key: 'length', label: 'Length', type: 'number' },
      { key: 'waist', label: 'Waist', type: 'number' },
      { key: 'seat', label: 'Seat', type: 'number' },
      { key: 'fly', label: 'Fly (Zip)', type: 'number' },
      { key: 'fork', label: 'Fork', type: 'number' },
      { key: 'thighLoose', label: 'Thigh Loose', type: 'number' },
      { key: 'kneeLoose', label: 'Knee Loose', type: 'number' },
      { key: 'bottom', label: 'Bottom', type: 'number' },
      { key: 'options', label: 'Options', type: 'multiselect', options: ['withFlit', 'withoutFlit', 'packet', 'backPacket'] },
    ],
  },
  coat: {
    label: 'Coat',
    icon: Hoodie,
    fields: [
      { key: 'standardSize', label: 'Standard Size', type: 'text' },
      { key: 'chest', label: 'Chest', type: 'number' },
      { key: 'waist', label: 'Waist', type: 'number' },
      { key: 'length', label: 'Length', type: 'number' },
      { key: 'shoulder', label: 'Shoulder', type: 'number' },
    ],
  },
  blouse: {
    label: 'Blouse',
    icon: TShirt,
    fields: [
      { key: 'shoulder', label: 'Shoulder', type: 'number' },
      { key: 'chest', label: 'Chest', type: 'number' },
      { key: 'waist', label: 'Waist', type: 'number' },
      { key: 'length', label: 'Length', type: 'number' },
      { key: 'neckDepthFront', label: 'Neck Depth Front', type: 'number' },
      { key: 'neckDepthBack', label: 'Neck Depth Back', type: 'number' },
      { key: 'armhole', label: 'Armhole', type: 'number' },
      { key: 'halfSleeve', label: 'Half Sleeve', type: 'number' },
      { key: 'fullSleeve', label: 'Full Sleeve', type: 'number' },
    ],
  },
  churidar: {
    label: 'Churidar',
    icon: Dress,
    fields: [
      { key: 'shoulder', label: 'Shoulder', type: 'number' },
      { key: 'bust', label: 'Bust', type: 'number' },
      { key: 'waist', label: 'Waist', type: 'number' },
      { key: 'hip', label: 'Hip', type: 'number' },
      { key: 'length', label: 'Length', type: 'number' },
      { key: 'sleeveLength', label: 'Sleeve Length', type: 'number' },
    ],
  },
  halfTrousers: {
    label: 'Half Trousers',
    icon: Pants,
    fields: [
      { key: 'waist', label: 'Waist', type: 'number' },
      { key: 'length', label: 'Length', type: 'number' },
      { key: 'thighLoose', label: 'Thigh Loose', type: 'number' },
      { key: 'bottom', label: 'Bottom', type: 'number' },
    ],
  },
  // Legacy types for backward compatibility
  chuditharTop: {
    label: 'Chudithar Top',
    icon: Dress,
    fields: [
      { key: 'shoulder', label: 'Shoulder', type: 'number' },
      { key: 'bust', label: 'Bust', type: 'number' },
      { key: 'waist', label: 'Waist', type: 'number' },
      { key: 'hip', label: 'Hip', type: 'number' },
      { key: 'length', label: 'Length', type: 'number' },
    ],
  },
  chuditharPant: {
    label: 'Chudithar Pant',
    icon: Pants,
    fields: [
      { key: 'waist', label: 'Waist', type: 'number' },
      { key: 'hip', label: 'Hip', type: 'number' },
      { key: 'inseam', label: 'Inseam', type: 'number' },
      { key: 'fullLength', label: 'Full Length', type: 'number' },
    ],
  },
  trouser: {
    label: 'Trouser',
    icon: Pants,
    fields: [
      { key: 'waist', label: 'Waist', type: 'number' },
      { key: 'inseam', label: 'Inseam', type: 'number' },
      { key: 'outseam', label: 'Outseam', type: 'number' },
      { key: 'rise', label: 'Rise', type: 'number' },
      { key: 'thigh', label: 'Thigh', type: 'number' },
      { key: 'hips', label: 'Hips', type: 'number' },
      { key: 'legOpening', label: 'Leg Opening', type: 'number' },
    ],
  },
};

type MeasurementCategoryKey = keyof typeof MEASUREMENT_CATEGORIES;

// Pant options labels
const PANT_OPTIONS_LABELS: Record<string, string> = {
  withFlit: 'With Flit',
  withoutFlit: 'Without Flit',
  packet: 'Packet',
  backPacket: 'Back Packet',
};

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
  
  // Native camera using Capacitor
  const isNative = !!(
    typeof window !== 'undefined' &&
    (window as any).Capacitor &&
    (window as any).Capacitor.isNativePlatform &&
    (window as any).Capacitor.isNativePlatform()
  );
  
  // Take photo using Capacitor Camera plugin
  const takeNativePhoto = async (): Promise<string | null> => {
    try {
      // Dynamically import Capacitor Camera
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      
      const image = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        direction: 'REAR' as any, // Use back camera
        correctOrientation: true,
        width: 1920,
        height: 1080,
      });
      
      if (image.dataUrl) {
        console.log('[Camera] Photo captured successfully');
        return image.dataUrl;
      }
      return null;
    } catch (error: any) {
      console.error('[Camera] Error capturing photo:', error);
      // User cancelled or permission denied
      if (error?.message?.includes('cancelled') || error?.message?.includes('User cancelled')) {
        console.log('[Camera] User cancelled photo capture');
        return null;
      }
      throw error;
    }
  };
  
  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Selected garment types for the current order
  const [selectedGarmentTypes, setSelectedGarmentTypes] = useState<string[]>([]);
  
  // Special note text for pant options
  const [specialNoteText, setSpecialNoteText] = useState('');

  // WhatsApp confirmation dialog state
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [pendingAdvancePaymentData, setPendingAdvancePaymentData] = useState<Omit<AdvancePayment, 'id' | 'proformaInvoiceNo' | 'invoiceNo' | 'createdAt' | 'updatedAt'> | null>(null);
  const [companyName, setCompanyName] = useState<string>('Tailor Shop');

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
          
          // Store company name for WhatsApp messages
          if (company) {
            setCompanyName(company.companyName || company.aliasName || 'Tailor Shop');
          }

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
    // Reset garment types and audio
    setSelectedGarmentTypes([]);
    setIsRecording(false);
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlayingAudio(false);
    setSpecialNoteText('');
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

    // Validate garment types and measurements (mandatory)
    if (!validateMeasurements()) {
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

    // Upload audio note if exists
    let audioNoteUrl: string | null = null;
    if (audioBlob && needsSpecialNote) {
      audioNoteUrl = await uploadAudioNote();
    }

    // Add special note to pant measurements if applicable
    if (needsSpecialNote) {
      const pantMeasurements = measurements.pant || {};
      setMeasurements({
        ...measurements,
        pant: {
          ...pantMeasurements,
          specialNote: {
            text: specialNoteText || undefined,
            audioUrl: audioNoteUrl || undefined,
            createdAt: Date.now(),
          },
        },
      });
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

  // Step 2: Save with Advance Payment - Show WhatsApp dialog first
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

    // Check if customer has WhatsApp/phone number
    if (selectedCustomer && (selectedCustomer.whatsappNumber || selectedCustomer.phone)) {
      // Store payment data and show WhatsApp dialog
      setPendingAdvancePaymentData(advancePaymentData);
      setShowWhatsAppDialog(true);
    } else {
      // No phone number, save directly
      onSave(createdOrderData, advancePaymentData);
      onOpenChange(false);
      resetForm();
    }
  };

  // Complete save after WhatsApp dialog (send or skip)
  const completeOrderSave = () => {
    if (!createdOrderData) return;
    
    onSave(createdOrderData, pendingAdvancePaymentData || undefined);
    onOpenChange(false);
    setShowWhatsAppDialog(false);
    setPendingAdvancePaymentData(null);
    resetForm();
  };

  // Generate WhatsApp message for order confirmation
  const getWhatsAppMessageData = () => {
    if (!createdOrderData || !selectedCustomer) {
      return {
        customerName: '',
        customerPhone: '',
        message: '',
      };
    }

    const orderDate = new Date(createdOrderData.serviceOrderDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const deliveryDate = new Date(createdOrderData.expectedDeliveryDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    // Build measurements data for WhatsApp message
    const measurementsData: MeasurementData[] = [];
    if (createdOrderData.measurements) {
      const measurementCategories = Object.keys(createdOrderData.measurements) as Array<keyof typeof createdOrderData.measurements>;
      measurementCategories.forEach(category => {
        const categoryMeasurements = createdOrderData.measurements?.[category];
        if (categoryMeasurements && typeof categoryMeasurements === 'object') {
          const hasValues = Object.values(categoryMeasurements).some(v => v !== undefined && v !== null && v !== '' && v !== 0);
          if (hasValues) {
            // Get display label for garment type
            const garmentLabel = MEASUREMENT_CATEGORIES[category as MeasurementCategoryKey]?.label || category;
            measurementsData.push({
              garmentType: garmentLabel,
              measurements: categoryMeasurements as Record<string, number | string | undefined>,
            });
          }
        }
      });
    }

    // Get garment type labels
    const garmentTypeLabels = selectedGarmentTypes.map(gt => {
      const config = MEASUREMENT_CATEGORIES[gt as MeasurementCategoryKey];
      return config?.label || gt;
    });

    const messageData: OrderConfirmationMessageData = {
      customerName: createdOrderData.customerName,
      orderNumber: nextServiceOrderId || serviceOrderNo,
      orderDate,
      deliveryDate,
      totalAmount: createdOrderData.stitchingCost,
      advanceAmount: advanceAmount,
      balanceAmount: createdOrderData.stitchingCost - advanceAmount,
      dressItems: createdOrderData.dressItems?.map(item => ({
        dressName: item.dressName || item.dressType,
        quantity: item.quantity
      })),
      garmentTypes: garmentTypeLabels.length > 0 ? garmentTypeLabels : undefined,
      measurements: measurementsData.length > 0 ? measurementsData : undefined,
      companyName,
      orderCategory: createdOrderData.orderCategory,
    };

    return {
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.whatsappNumber || selectedCustomer.phone,
      message: generateOrderConfirmationMessage(messageData),
    };
  };

  // Skip advance payment and save order only - Show WhatsApp dialog first
  const handleSkipAdvancePayment = () => {
    if (!createdOrderData) {
      toast.error('Order data not found');
      return;
    }

    // Check if customer has WhatsApp/phone number
    if (selectedCustomer && (selectedCustomer.whatsappNumber || selectedCustomer.phone)) {
      // Show WhatsApp dialog without advance payment data
      setPendingAdvancePaymentData(null);
      setShowWhatsAppDialog(true);
    } else {
      // No phone number, save directly
      onSave(createdOrderData);
      onOpenChange(false);
      resetForm();
    }
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
    const paymentMode = modeOfPayment === 'cash' ? 'Cash' : modeOfPayment === 'qrpay' ? 'QR Pay' : 'Nil';
    const effectiveAdvance = modeOfPayment === 'nil' ? 0 : advanceAmount;
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

  // Audio recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info('Recording started...');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success('Recording saved');
    }
  };

  const playAudio = () => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlayingAudio(false);
    }
  };

  const deleteAudio = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlayingAudio(false);
    toast.info('Audio note deleted');
  };

  // Upload audio to storage
  const uploadAudioNote = async (): Promise<string | null> => {
    if (!audioBlob) return null;
    try {
      const file = new File([audioBlob], `audio_note_${Date.now()}.webm`, { type: 'audio/webm' });
      const downloadURL = await uploadPhoto(file, `orders/audio_notes/${companyId}`);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading audio:', error);
      return null;
    }
  };

  // Check if any pant option requires special note (packet or backPacket)
  const needsSpecialNote = useMemo(() => {
    const pantData = measurements.pant as { options?: string[] } | undefined;
    if (!pantData?.options) return false;
    return pantData.options.includes('packet') || pantData.options.includes('backPacket');
  }, [measurements]);

  // Get garment types available for the selected category
  const availableGarmentTypes = useMemo(() => {
    if (!orderCategory) return [];
    return GARMENT_TYPES_BY_CATEGORY[orderCategory] || [];
  }, [orderCategory]);

  // Validate measurements are filled for selected garment types
  const validateMeasurements = (): boolean => {
    if (selectedGarmentTypes.length === 0) {
      toast.error('Please select at least one garment type');
      return false;
    }

    for (const garmentType of selectedGarmentTypes) {
      const config = MEASUREMENT_CATEGORIES[garmentType as MeasurementCategoryKey];
      if (!config) continue;

      const garmentMeasurements = measurements[garmentType as keyof typeof measurements] as Record<string, unknown> | undefined;
      if (!garmentMeasurements) {
        toast.error(`Please fill measurements for ${config.label}`);
        return false;
      }

      // Check if at least some measurements are filled
      const filledFields = config.fields.filter(field => {
        const value = garmentMeasurements[field.key];
        return value !== undefined && value !== null && value !== '' && value !== 0;
      });

      if (filledFields.length === 0) {
        toast.error(`Please fill at least one measurement for ${config.label}`);
        return false;
      }
    }

    return true;
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl !h-[100dvh] sm:!h-[95vh] !top-0 !left-0 !right-0 !bottom-0 !translate-x-0 !translate-y-0 sm:!top-[50%] sm:!left-[50%] sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:!bottom-auto sm:!right-auto flex flex-col p-0 overflow-hidden rounded-none sm:rounded-lg keyboard-aware-container"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-3 py-2 border-b flex-shrink-0" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #8b5cf6 100%)', borderColor: 'rgba(196, 181, 253, 0.3)' }}>
          <DialogTitle className="flex items-center gap-2.5 text-white text-base">
            {/* Back/Close Button */}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0"
            >
              <ArrowLeft size={18} weight="bold" />
            </button>
            <span className="leading-tight">{order ? 'Edit Service Order' : currentStep === 1 ? 'New Service Order' : 'Advance Payment'}</span>
            <span className="text-xs font-normal text-white/80 bg-white/20 px-2 py-0.5 rounded leading-tight">
              {order?.id || nextServiceOrderId || 'Loading...'}
            </span>
          </DialogTitle>
          {/* Step Indicator */}
          {!order && (
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => currentStep === 2 && setCurrentStep(1)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all',
                  currentStep === 1
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'bg-white/20 text-white hover:bg-white/30'
                )}
              >
                <span className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px]',
                  currentStep === 1 ? 'bg-purple-100 text-purple-700' : 'bg-white/20 text-white'
                )}>1</span>
                <span>Order Details</span>
              </button>
              <div className="w-6 h-0.5 bg-white/30" />
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
                    // Validate garment types and measurements
                    if (!validateMeasurements()) {
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
                  'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all',
                  currentStep === 2
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'bg-white/20 text-white hover:bg-white/30'
                )}
              >
                <span className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px]',
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
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-background">

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
              <Label className="text-sm font-medium">Select Category *</Label>
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
            <div className="bg-muted/30 rounded-xl p-4 border space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Order Details</h3>
              <div className="grid grid-cols-2 gap-3">
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

            {/* Measurements Section - Mandatory, based on category */}
            {orderCategory && (
              <div 
                className="space-y-4 rounded-xl p-5 border border-purple-200"
                style={{ background: 'linear-gradient(to bottom right, rgb(250, 245, 255), rgb(238, 242, 255))' }}
              >
                {/* Header with UOM Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-semibold text-purple-700">Select Garment Type *</Label>
                    <p className="text-xs text-gray-500 mt-0.5">Measurements are mandatory for order</p>
                  </div>
                  <div className="flex rounded-md border-2 border-purple-500 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setDisplayUom('Inches')}
                      className={`px-4 py-1.5 text-xs font-semibold transition-colors ${
                        displayUom === 'Inches'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-purple-600 hover:bg-purple-50'
                      }`}
                    >
                      Inches
                    </button>
                    <button
                      type="button"
                      onClick={() => setDisplayUom('Cms')}
                      className={`px-4 py-1.5 text-xs font-semibold transition-colors ${
                        displayUom === 'Cms'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-purple-600 hover:bg-purple-50'
                      }`}
                    >
                      Cms
                    </button>
                  </div>
                </div>

                {/* Garment Type Selection - Based on Category */}
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                  {availableGarmentTypes.map((garment) => {
                    const isSelected = selectedGarmentTypes.includes(garment.key);
                    const isActive = activeDressType === garment.key;
                    const garmentMeasurements = measurements[garment.key as keyof typeof measurements] as Record<string, unknown> | undefined;
                    const filledFieldsCount = garmentMeasurements
                      ? Object.values(garmentMeasurements).filter((v) => v !== undefined && v !== null && v !== 0 && v !== '').length
                      : 0;
                    const Icon = garment.icon;

                    return (
                      <button
                        key={garment.key}
                        type="button"
                        onClick={() => {
                          // Toggle selection
                          if (isSelected) {
                            setSelectedGarmentTypes(selectedGarmentTypes.filter(g => g !== garment.key));
                            if (activeDressType === garment.key) {
                              setActiveDressType(null);
                            }
                          } else {
                            setSelectedGarmentTypes([...selectedGarmentTypes, garment.key]);
                          }
                          setActiveDressType(garment.key as MeasurementCategoryKey);
                        }}
                        className={cn(
                          'relative flex flex-col items-center gap-1 min-w-[70px] p-3 rounded-xl transition-all border-2',
                          isActive
                            ? 'bg-purple-600 text-white border-purple-600 shadow-lg'
                            : isSelected
                            ? 'bg-purple-100 text-purple-700 border-purple-300'
                            : 'bg-white text-gray-500 border-transparent hover:border-purple-200 hover:bg-purple-50'
                        )}
                      >
                        {isSelected && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center">
                            <Check size={14} weight="bold" className={isActive ? 'text-white' : 'text-purple-600'} />
                          </span>
                        )}
                        {filledFieldsCount > 0 && (
                          <span className="absolute -bottom-1 -right-1 w-5 h-5 flex items-center justify-center text-[10px] font-bold bg-green-500 text-white rounded-full border-2 border-background">
                            {filledFieldsCount}
                          </span>
                        )}
                        <Icon size={26} weight={isActive || isSelected ? 'fill' : 'regular'} />
                        <span className="text-[11px] font-semibold">{garment.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Measurement Fields - Show for active garment type */}
                {activeDressType && MEASUREMENT_CATEGORIES[activeDressType] && (
                  <div className="space-y-4 pt-3 border-t border-purple-200">
                    {/* Garment Title */}
                    <div className="flex items-center gap-2">
                      {(() => {
                        const config = MEASUREMENT_CATEGORIES[activeDressType];
                        const Icon = config.icon;
                        return (
                          <>
                            <Icon size={20} weight="duotone" className="text-purple-600" />
                            <h4 className="font-semibold text-sm text-purple-700">
                              {config.label} Measurements
                            </h4>
                          </>
                        );
                      })()}
                    </div>

                    {/* Measurement Input Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {MEASUREMENT_CATEGORIES[activeDressType].fields.map((field) => {
                        const garmentData = measurements[activeDressType as keyof typeof measurements] as Record<string, unknown> | undefined;
                        const value = garmentData?.[field.key];

                        // Handle different field types
                        if (field.type === 'select') {
                          return (
                            <div key={field.key} className="space-y-1.5">
                              <label className="text-xs text-muted-foreground font-medium">
                                {field.label}
                              </label>
                              <Select
                                value={typeof value === 'string' ? value : ''}
                                onValueChange={(newValue) => {
                                  setMeasurements({
                                    ...measurements,
                                    [activeDressType]: {
                                      ...(measurements[activeDressType as keyof typeof measurements] || {}),
                                      [field.key]: newValue,
                                    },
                                  });
                                }}
                              >
                                <SelectTrigger className="h-11 bg-white">
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {field.options?.map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {option.charAt(0).toUpperCase() + option.slice(1)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        }

                        if (field.type === 'multiselect') {
                          const selectedOptions = (Array.isArray(value) ? value : []) as string[];
                          return (
                            <div key={field.key} className="space-y-1.5 col-span-2">
                              <label className="text-xs text-muted-foreground font-medium">
                                {field.label}
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {field.options?.map((option) => {
                                  const isSelected = selectedOptions.includes(option);
                                  return (
                                    <button
                                      key={option}
                                      type="button"
                                      onClick={() => {
                                        const newOptions = isSelected
                                          ? selectedOptions.filter(o => o !== option)
                                          : [...selectedOptions, option];
                                        setMeasurements({
                                          ...measurements,
                                          [activeDressType]: {
                                            ...(measurements[activeDressType as keyof typeof measurements] || {}),
                                            [field.key]: newOptions,
                                          },
                                        });
                                      }}
                                      className={cn(
                                        'px-3 py-2 rounded-lg text-sm font-medium transition-all border',
                                        isSelected
                                          ? 'bg-purple-600 text-white border-purple-600'
                                          : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400'
                                      )}
                                    >
                                      {PANT_OPTIONS_LABELS[option] || option}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }

                        if (field.type === 'text') {
                          return (
                            <div key={field.key} className="space-y-1.5">
                              <label className="text-xs text-muted-foreground font-medium">
                                {field.label}
                              </label>
                              <Input
                                type="text"
                                value={typeof value === 'string' ? value : ''}
                                onChange={(e) => {
                                  setMeasurements({
                                    ...measurements,
                                    [activeDressType]: {
                                      ...(measurements[activeDressType as keyof typeof measurements] || {}),
                                      [field.key]: e.target.value,
                                    },
                                  });
                                }}
                                placeholder="Enter..."
                                className="h-11 text-base bg-white"
                              />
                            </div>
                          );
                        }

                        // Default: number input
                        return (
                          <div key={field.key} className="space-y-1.5">
                            <label className="text-xs text-muted-foreground font-medium">
                              {field.label}
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
                                      ...(measurements[activeDressType as keyof typeof measurements] || {}),
                                      [field.key]: newValue,
                                    },
                                  });
                                }}
                                placeholder="0"
                                className="h-11 text-base pr-10 bg-white border-purple-200 focus:border-purple-500 focus:ring-purple-500"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                {displayUom === 'Inches' ? 'in' : 'cm'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Special Note Section - Appears when packet/backPacket is selected */}
                    {activeDressType === 'pant' && needsSpecialNote && (
                      <div className="space-y-3 pt-3 border-t border-purple-200">
                        <div className="flex items-center gap-2">
                          <Microphone size={18} className="text-purple-600" />
                          <label className="text-sm font-semibold text-purple-700">
                            Special Instructions (Packet Details)
                          </label>
                        </div>
                        
                        {/* Text Input */}
                        <Textarea
                          value={specialNoteText}
                          onChange={(e) => setSpecialNoteText(e.target.value)}
                          placeholder="Enter special instructions for pocket/packet..."
                          rows={2}
                          className="bg-white"
                        />

                        {/* Audio Recorder */}
                        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                          {!audioUrl ? (
                            <>
                              <Button
                                type="button"
                                variant={isRecording ? 'destructive' : 'outline'}
                                size="sm"
                                onClick={isRecording ? stopRecording : startRecording}
                                className="gap-2"
                              >
                                {isRecording ? (
                                  <>
                                    <Stop size={16} weight="fill" />
                                    Stop Recording
                                  </>
                                ) : (
                                  <>
                                    <Microphone size={16} weight="fill" />
                                    Record Audio Note
                                  </>
                                )}
                              </Button>
                              {isRecording && (
                                <span className="flex items-center gap-2 text-sm text-red-500">
                                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                  Recording...
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlayingAudio(false)} className="hidden" />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={isPlayingAudio ? stopAudio : playAudio}
                                className="gap-2"
                              >
                                {isPlayingAudio ? <Stop size={16} /> : <Play size={16} />}
                                {isPlayingAudio ? 'Stop' : 'Play'}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={deleteAudio}
                                className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash size={16} />
                                Delete
                              </Button>
                              <span className="text-sm text-green-600 font-medium">✓ Audio recorded</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Garments Summary */}
                {selectedGarmentTypes.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-purple-200">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                      Selected ({selectedGarmentTypes.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedGarmentTypes.map((garmentKey) => {
                        const config = MEASUREMENT_CATEGORIES[garmentKey as MeasurementCategoryKey];
                        if (!config) return null;
                        const garmentData = measurements[garmentKey as keyof typeof measurements] as Record<string, unknown> | undefined;
                        const filledFieldsCount = garmentData
                          ? Object.values(garmentData).filter((v) => v !== undefined && v !== null && v !== 0 && v !== '').length
                          : 0;

                        return (
                          <div
                            key={garmentKey}
                            onClick={() => setActiveDressType(garmentKey as MeasurementCategoryKey)}
                            className={cn(
                              'flex items-center gap-0.5 px-2 py-px rounded-full text-[10px] font-medium cursor-pointer transition-all',
                              activeDressType === garmentKey
                                ? 'bg-purple-600 text-white shadow-sm'
                                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                            )}
                          >
                            <span>{config.label}</span>
                            {filledFieldsCount > 0 && (
                              <span className="w-3.5 h-3.5 flex items-center justify-center bg-green-500 text-white rounded-full text-[8px] font-bold">
                                {filledFieldsCount}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedGarmentTypes(selectedGarmentTypes.filter(g => g !== garmentKey));
                                const updatedMeasurements = { ...measurements };
                                delete updatedMeasurements[garmentKey as keyof typeof measurements];
                                setMeasurements(updatedMeasurements);
                                if (activeDressType === garmentKey) {
                                  setActiveDressType(null);
                                }
                              }}
                              className="ml-0.5 hover:text-red-300"
                            >
                              <X size={10} />
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

            {/* Attach Sample Cloths */}
            <div className="space-y-2">
              <Label>Attach Sample Cloths</Label>
              
              {/* Hidden Camera Input for direct capture - Back Camera (fallback for web) */}
              <input
                id="sample-cloth-camera"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      setIsUploading(true);
                      const downloadURL = await uploadPhoto(file, `designs/${Date.now()}_${file.name}`);
                      setDesignList((prev) => [...prev, downloadURL]);
                      toast.success('Photo uploaded successfully');
                    } catch (error) {
                      console.error('Upload error:', error);
                      toast.error('Failed to upload photo');
                    } finally {
                      setIsUploading(false);
                      e.target.value = ''; // Reset input
                    }
                  }
                }}
                className="hidden"
              />
              
              <div className="space-y-2">
                {/* Camera Button - Uses native camera on mobile, HTML input on web */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    if (isNative) {
                      // Use native camera (back camera)
                      try {
                        setIsUploading(true);
                        const photoDataUrl = await takeNativePhoto();
                        if (photoDataUrl) {
                          const file = dataUrlToFile(photoDataUrl, `capture_${Date.now()}.jpg`);
                          const downloadURL = await uploadPhoto(file, `designs/${Date.now()}_capture.jpg`);
                          setDesignList((prev) => [...prev, downloadURL]);
                          toast.success('Photo captured and uploaded!');
                        }
                      } catch (error) {
                        console.error('Native camera error:', error);
                        toast.error('Failed to capture photo');
                      } finally {
                        setIsUploading(false);
                      }
                    } else {
                      // Fallback to HTML file input for web
                      document.getElementById('sample-cloth-camera')?.click();
                    }
                  }}
                  className="w-full h-auto py-4 flex items-center justify-center gap-3 border-2 border-dashed hover:border-primary hover:bg-primary/5"
                  disabled={isUploading}
                >
                  <Camera size={24} weight="bold" className="text-primary" />
                  <div className="text-left">
                    <span className="text-sm font-semibold block">
                      {isUploading ? 'Uploading...' : 'Take Photo'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {isNative ? 'Opens back camera' : 'Capture sample cloth image'}
                    </span>
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
                          alt={`Sample ${index + 1}`}
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
          <div className="flex justify-between items-center gap-3 px-4 py-2 border-t flex-shrink-0" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #8b5cf6 100%)', borderColor: 'rgba(196, 181, 253, 0.3)' }}>
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-white hover:text-white/80 hover:bg-white/10">
              {t('cancel')}
            </Button>
            <Button type="submit" size="sm" className="min-w-[100px] bg-white text-purple-700 hover:bg-white/90">
              {order ? t('save') : 'Next'}
            </Button>
          </div>
        </form>
        )}

        {/* Step 2: Advance Payment */}
        {currentStep === 2 && createdOrderData && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
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
                    { value: 'nil', label: 'Nil' },
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
                  disabled={modeOfPayment === 'nil'}
                />
                {modeOfPayment === 'nil' && (
                  <p className="text-xs text-muted-foreground">No advance payment selected</p>
                )}
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
                    <span className="text-base font-semibold text-primary">- ₹{(modeOfPayment === 'nil' ? 0 : advanceAmount).toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold">Balance Due</span>
                      <span className="text-xl font-bold text-primary">
                        ₹{(createdOrderData.stitchingCost - (modeOfPayment === 'nil' ? 0 : advanceAmount)).toFixed(2)}
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
            <div className="flex justify-between items-center gap-3 px-4 py-2 border-t flex-shrink-0" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #8b5cf6 100%)', borderColor: 'rgba(196, 181, 253, 0.3)' }}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
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
                  variant="ghost"
                  size="sm"
                  onClick={handleSkipAdvancePayment}
                  className="border border-white/30 text-white hover:text-white hover:bg-white/10 bg-transparent"
                >
                  Skip Payment
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleStep2Submit}
                  className="min-w-[100px] bg-white text-purple-700 hover:bg-white/90"
                >
                  Save Order
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* WhatsApp Confirmation Dialog */}
    <WhatsAppConfirmationDialog
      open={showWhatsAppDialog}
      onOpenChange={setShowWhatsAppDialog}
      title="Send Order Confirmation"
      description="Send order details to customer via WhatsApp"
      messageData={getWhatsAppMessageData()}
      onSend={completeOrderSave}
      onSkip={completeOrderSave}
      sendButtonText="Send & Save Order"
      skipButtonText="Skip & Save Order"
    />

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

    {/* Upload Designs Modal - Instagram Style */}
    <Dialog open={showUploadModal} onOpenChange={handleCloseUploadModal}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Upload Designs</DialogTitle>
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
              {/* Hidden File Inputs */}
              {/* Gallery Input - for selecting existing images */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              {/* Camera Input - for direct camera capture on mobile */}
              <input
                id="camera-input"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Select Files Buttons */}
              {selectedFiles.length === 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {/* Camera Button - Opens back camera directly */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('camera-input')?.click()}
                    className="h-32 flex flex-col items-center justify-center gap-2 border-2 border-dashed hover:border-primary hover:bg-primary/5"
                  >
                    <Camera size={32} weight="duotone" className="text-primary" />
                    <span className="text-sm font-semibold">Take Photo</span>
                    <span className="text-xs text-muted-foreground">Back Camera</span>
                  </Button>
                  
                  {/* Gallery Button */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-32 flex flex-col items-center justify-center gap-2 border-2 border-dashed hover:border-primary hover:bg-primary/5"
                  >
                    <ImageIcon size={32} weight="duotone" className="text-primary" />
                    <span className="text-sm font-semibold">From Gallery</span>
                    <span className="text-xs text-muted-foreground">Multiple allowed</span>
                  </Button>
                </div>
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

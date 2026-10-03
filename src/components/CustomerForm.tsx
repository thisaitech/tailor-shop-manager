import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// Removed Tabs components - using custom tab buttons for better keyboard handling
import { Customer, Gender, Measurements } from '@/lib/types';
import { toast } from 'sonner';
import { User, Ruler, MapPin, Check, UserCircle, ArrowLeft, Plus, Trash, PencilSimple } from '@phosphor-icons/react';
import { generateCustomerId } from '@/lib/firestore/customerService';
import { getCompanyProfile } from '@/lib/firestore/companyService';
import { NumberSeriesSelect } from '@/components/NumberSeriesSelect';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import {
  CUSTOMER_BUILTIN_CATEGORIES,
  DEFAULT_CUSTOM_MEASUREMENT_FIELDS,
  GARMENT_ICON_OPTIONS,
  type CustomGarmentType,
  type CustomMeasurementFieldsMap,
  type GarmentFieldConfig,
  type GarmentIconKey,
  type SheetOverrides,
  applyCategoryLabel,
  applyFieldLabels,
  getGarmentIcon,
  guessGarmentIconKey,
  isBuiltInCategory,
  isCategoryHidden,
  loadCustomGarmentTypes,
  loadCustomMeasurementFields,
  loadSheetOverrides,
  mergeFieldsWithCustom,
  resolveGarmentIconKey,
  saveCustomGarmentTypes,
  saveCustomMeasurementFields,
  saveSheetOverrides,
  slugifyKey,
} from '@/lib/measurementSheets';

// State to Cities/Districts mapping
const STATE_CITIES: Record<string, string[]> = {
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Rajahmundry', 'Tirupati', 'Kakinada', 'Kadapa', 'Anantapur', 'Eluru', 'Ongole', 'Srikakulam', 'Chittoor', 'Proddatur'],
  'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat', 'Tawang', 'Ziro', 'Bomdila', 'Aalo', 'Tezu', 'Roing', 'Changlang'],
  'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur', 'Bongaigaon', 'Dhubri', 'Diphu', 'Goalpara', 'Sivasagar'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga', 'Purnia', 'Ara', 'Begusarai', 'Katihar', 'Munger', 'Chapra', 'Sasaram', 'Hajipur', 'Samastipur'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Rajnandgaon', 'Jagdalpur', 'Raigarh', 'Ambikapur', 'Dhamtari'],
  'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda', 'Bicholim', 'Curchorem', 'Sanquelim', 'Canacona', 'Quepem'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Gandhinagar', 'Anand', 'Nadiad', 'Morbi', 'Mehsana', 'Bharuch', 'Vapi', 'Navsari', 'Veraval', 'Porbandar', 'Godhra', 'Palanpur'],
  'Haryana': ['Faridabad', 'Gurgaon', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar', 'Karnal', 'Sonipat', 'Panchkula', 'Bhiwani', 'Sirsa', 'Bahadurgarh', 'Jind', 'Thanesar', 'Kaithal', 'Rewari', 'Palwal'],
  'Himachal Pradesh': ['Shimla', 'Mandi', 'Dharamshala', 'Solan', 'Nahan', 'Bilaspur', 'Chamba', 'Una', 'Kullu', 'Hamirpur', 'Kangra', 'Palampur', 'Baddi', 'Sundernagar'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar', 'Hazaribagh', 'Giridih', 'Ramgarh', 'Medininagar', 'Chaibasa'],
  'Karnataka': ['Bangalore', 'Mysore', 'Mangalore', 'Hubli', 'Belgaum', 'Gulbarga', 'Davangere', 'Bellary', 'Bijapur', 'Shimoga', 'Tumkur', 'Raichur', 'Bidar', 'Hospet', 'Hassan', 'Udupi', 'Chitradurga', 'Kolar', 'Mandya'],
  'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Palakkad', 'Alappuzha', 'Kannur', 'Kottayam', 'Malappuram', 'Kasaragod', 'Pathanamthitta', 'Idukki', 'Wayanad'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam', 'Rewa', 'Murwara', 'Singrauli', 'Burhanpur', 'Khandwa', 'Bhind', 'Chhindwara', 'Guna', 'Shivpuri', 'Vidisha', 'Damoh'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad', 'Solapur', 'Kolhapur', 'Amravati', 'Navi Mumbai', 'Sangli', 'Malegaon', 'Jalgaon', 'Akola', 'Latur', 'Dhule', 'Ahmednagar', 'Chandrapur', 'Parbhani', 'Ichalkaranji', 'Jalna', 'Ambarnath', 'Bhiwandi', 'Panvel', 'Satara', 'Beed', 'Yavatmal', 'Wardha', 'Osmanabad', 'Gondia'],
  'Manipur': ['Imphal', 'Thoubal', 'Bishnupur', 'Churachandpur', 'Kakching', 'Senapati', 'Ukhrul', 'Chandel', 'Tamenglong'],
  'Meghalaya': ['Shillong', 'Tura', 'Nongstoin', 'Jowai', 'Baghmara', 'Williamnagar', 'Resubelpara', 'Ampati', 'Mairang'],
  'Mizoram': ['Aizawl', 'Lunglei', 'Saiha', 'Champhai', 'Serchhip', 'Kolasib', 'Lawngtlai', 'Mamit'],
  'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung', 'Tuensang', 'Wokha', 'Zunheboto', 'Mon', 'Phek', 'Kiphire'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Brahmapur', 'Sambalpur', 'Puri', 'Balasore', 'Bhadrak', 'Baripada', 'Jharsuguda', 'Jeypore', 'Angul', 'Dhenkanal', 'Kendrapara'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Pathankot', 'Hoshiarpur', 'Batala', 'Moga', 'Abohar', 'Malerkotla', 'Khanna', 'Phagwara', 'Muktsar', 'Barnala', 'Rajpura', 'Firozpur', 'Kapurthala'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur', 'Bhilwara', 'Alwar', 'Bharatpur', 'Sikar', 'Pali', 'Sri Ganganagar', 'Kishangarh', 'Beawar', 'Hanumangarh', 'Dhaulpur', 'Gangapur City', 'Sawai Madhopur', 'Churu', 'Jhunjhunu', 'Banswara', 'Chittorgarh', 'Tonk', 'Baran', 'Nagaur', 'Bundi'],
  'Sikkim': ['Gangtok', 'Namchi', 'Gyalshing', 'Mangan', 'Rangpo', 'Singtam', 'Jorethang'],
  'Tamil Nadu': ['Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri', 'Dindigul', 'Erode', 'Kallakurichi', 'Kancheepuram', 'Kanniyakumari', 'Karur', 'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi', 'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli', 'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore', 'Viluppuram', 'Virudhunagar'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Ramagundam', 'Khammam', 'Mahbubnagar', 'Nalgonda', 'Adilabad', 'Suryapet', 'Miryalaguda', 'Siddipet', 'Jagtial', 'Mancherial'],
  'Tripura': ['Agartala', 'Udaipur', 'Dharmanagar', 'Kailashahar', 'Belonia', 'Kamalpur', 'Ambassa', 'Khowai', 'Teliamura', 'Sabroom'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut', 'Allahabad', 'Bareilly', 'Aligarh', 'Moradabad', 'Saharanpur', 'Gorakhpur', 'Noida', 'Firozabad', 'Jhansi', 'Muzaffarnagar', 'Mathura', 'Budaun', 'Rampur', 'Shahjahanpur', 'Farrukhabad', 'Mau', 'Hapur', 'Etawah', 'Mirzapur', 'Bulandshahr', 'Sambhal', 'Amroha', 'Hardoi', 'Fatehpur', 'Raebareli', 'Orai', 'Sitapur', 'Bahraich', 'Modinagar', 'Unnao', 'Jaunpur', 'Lakhimpur', 'Hathras', 'Banda', 'Pilibhit', 'Barabanki', 'Khurja', 'Gonda', 'Mainpuri', 'Lalitpur', 'Etah', 'Deoria', 'Ghazipur'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur', 'Kashipur', 'Rishikesh', 'Nainital', 'Almora', 'Pithoragarh', 'Mussoorie', 'Kotdwar', 'Ramnagar', 'Manglaur', 'Jaspur'],
  'West Bengal': ['Kolkata', 'Howrah', 'Asansol', 'Siliguri', 'Durgapur', 'Bardhaman', 'Malda', 'Baharampur', 'Habra', 'Kharagpur', 'Shantipur', 'Dankuni', 'Dhulian', 'Ranaghat', 'Haldia', 'Raiganj', 'Krishnanagar', 'Nabadwip', 'Medinipur', 'Jalpaiguri', 'Balurghat', 'Basirhat', 'Bankura', 'Chakdaha', 'Darjeeling', 'Alipurduar', 'Purulia', 'Jangipur', 'Bolpur', 'Bangaon'],
  'Andaman and Nicobar Islands': ['Port Blair', 'Diglipur', 'Rangat', 'Mayabunder', 'Bamboo Flat', 'Garacharma', 'Prothrapur'],
  'Chandigarh': ['Chandigarh'],
  'Dadra and Nagar Haveli and Daman and Diu': ['Silvassa', 'Daman', 'Diu', 'Amli', 'Vapi'],
  'Delhi': ['New Delhi', 'Delhi', 'Dwarka', 'Rohini', 'Pitampura', 'Janakpuri', 'Saket', 'Karol Bagh', 'Lajpat Nagar', 'Rajouri Garden', 'Vasant Kunj', 'Mayur Vihar', 'Shahdara', 'Preet Vihar', 'Chandni Chowk'],
  'Jammu and Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Sopore', 'Kathua', 'Udhampur', 'Pulwama', 'Kupwara', 'Rajouri', 'Poonch', 'Kulgam', 'Bandipore', 'Ganderbal', 'Samba', 'Kishtwar'],
  'Ladakh': ['Leh', 'Kargil', 'Diskit', 'Padum', 'Nubra', 'Drass'],
  'Lakshadweep': ['Kavaratti', 'Agatti', 'Amini', 'Andrott', 'Minicoy', 'Kalpeni', 'Kiltan', 'Chetlat', 'Kadmat', 'Bitra'],
  'Puducherry': ['Puducherry', 'Karaikal', 'Mahe', 'Yanam', 'Ozhukarai', 'Villianur']
};

const INDIAN_STATES = Object.keys(STATE_CITIES).sort();
const DEFAULT_STATE = 'Tamil Nadu';
const DEFAULT_CITY = 'Tirunelveli';

type CategoryOption = {
  key: string;
  label: string;
  icon: ReturnType<typeof getGarmentIcon>;
  iconKey: GarmentIconKey;
  fields: GarmentFieldConfig[];
};

function getBuiltInCategoryList(): CategoryOption[] {
  return Object.entries(CUSTOMER_BUILTIN_CATEGORIES).map(([key, config]) => ({
    key,
    label: config.label,
    icon: config.icon,
    iconKey: config.iconKey,
    fields: config.fields,
  }));
}

function resolveCategoryConfig(
  key: string,
  customGarmentTypes: CustomGarmentType[],
  overrides: SheetOverrides
): CategoryOption | undefined {
  const builtin = CUSTOMER_BUILTIN_CATEGORIES[key];
  const custom = customGarmentTypes.find((g) => g.key === key);
  const label = applyCategoryLabel(key, custom?.label || builtin?.label || key, overrides);
  const iconKey = resolveGarmentIconKey({
    key,
    label,
    storedIconKey: custom?.iconKey,
    overrideIconKey: overrides.categoryIcons[key],
  });

  if (builtin) {
    return {
      key,
      label,
      icon: getGarmentIcon(iconKey),
      iconKey,
      fields: builtin.fields,
    };
  }
  if (custom) {
    return {
      key: custom.key,
      label,
      icon: getGarmentIcon(iconKey),
      iconKey,
      fields: DEFAULT_CUSTOM_MEASUREMENT_FIELDS,
    };
  }
  return undefined;
}

interface CustomerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => void | Promise<void>;
  customer?: Customer;
}

export function CustomerForm({ open, onOpenChange, onSave, customer }: CustomerFormProps) {
  const { t } = useLanguage();
  const { user } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState('basic');

  // Basic details
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [phoneError, setPhoneError] = useState('');
  const [nextCustomerId, setNextCustomerId] = useState<string>('');
  const [companyId, setCompanyId] = useState('');

  // Address details
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [state, setState] = useState(DEFAULT_STATE);
  const [place, setPlace] = useState(DEFAULT_CITY);
  const [pincode, setPincode] = useState('');

  // Measurements
  const [measurements, setMeasurements] = useState<Measurements>({});
  const [activeCategory, setActiveCategory] = useState<string>('shirt');
  const [measurementUnit, setMeasurementUnit] = useState<'Inches' | 'Cms'>('Inches');
  const [isSaving, setIsSaving] = useState(false);
  const [customGarmentTypes, setCustomGarmentTypes] = useState<CustomGarmentType[]>(() =>
    loadCustomGarmentTypes()
  );
  const [customMeasurementFields, setCustomMeasurementFields] = useState<CustomMeasurementFieldsMap>(() =>
    loadCustomMeasurementFields()
  );
  const [sheetOverrides, setSheetOverrides] = useState<SheetOverrides>(() => loadSheetOverrides());
  const [showAddMeasurementFieldDialog, setShowAddMeasurementFieldDialog] = useState(false);
  const [newMeasurementFieldName, setNewMeasurementFieldName] = useState('');
  const [showAddGarmentDialog, setShowAddGarmentDialog] = useState(false);
  const [newGarmentName, setNewGarmentName] = useState('');
  const [renameGarmentKey, setRenameGarmentKey] = useState<string | null>(null);
  const [renameGarmentLabel, setRenameGarmentLabel] = useState('');
  const [renameGarmentIcon, setRenameGarmentIcon] = useState<GarmentIconKey>('hanger');
  const [newGarmentIcon, setNewGarmentIcon] = useState<GarmentIconKey>('hanger');
  const [renameFieldKey, setRenameFieldKey] = useState<string | null>(null);
  const [renameFieldLabel, setRenameFieldLabel] = useState('');

  // Keep custom types/fields in sync when form opens
  useEffect(() => {
    if (open) {
      setCustomGarmentTypes(loadCustomGarmentTypes());
      setCustomMeasurementFields(loadCustomMeasurementFields());
      setSheetOverrides(loadSheetOverrides());
    }
  }, [open]);

  const categoryOptions: CategoryOption[] = [
    ...getBuiltInCategoryList()
      .filter((c) => !isCategoryHidden(c.key, sheetOverrides))
      .map((c) => resolveCategoryConfig(c.key, customGarmentTypes, sheetOverrides)!)
      .filter(Boolean),
    ...customGarmentTypes
      .filter((g) => !isBuiltInCategory(g.key) && !isCategoryHidden(g.key, sheetOverrides))
      .map((g) => resolveCategoryConfig(g.key, customGarmentTypes, sheetOverrides)!)
      .filter(Boolean),
  ];

  const activeCategoryConfig =
    resolveCategoryConfig(activeCategory, customGarmentTypes, sheetOverrides) || categoryOptions[0];

  const activeFields = applyFieldLabels(
    activeCategory,
    mergeFieldsWithCustom(
      activeCategoryConfig?.fields || [],
      activeCategory,
      customMeasurementFields
    ),
    sheetOverrides
  );

  // Fetch next customer ID
  useEffect(() => {
    const fetchNextId = async () => {
      if (open && !customer && user?.id) {
        try {
          const company = await getCompanyProfile(user.id);
          if (company) {
            setCompanyId(company.id);
            const nextId = await generateCustomerId(company.id);
            setNextCustomerId(nextId);
          }
        } catch (error) {
          console.error('Error generating customer ID:', error);
          setNextCustomerId('TBD');
        }
      } else if (!open) {
        setNextCustomerId('');
      }
    };
    fetchNextId();
  }, [open, customer, user]);

  // Phone number helpers
  const extractDigits = (phoneStr: string): string => {
    const digits = phoneStr.replace(/\D/g, '');
    if (digits.startsWith('91') && digits.length === 12) {
      return digits.substring(2);
    }
    return digits.length === 10 ? digits : '';
  };

  const formatDisplay = (digits: string): string => {
    return digits.length === 10 ? `+91 ${digits}` : '';
  };

  const normalize = (digits: string): string => {
    return digits.length === 10 ? `+91${digits}` : '';
  };

  // Check if email exists
  const checkEmailExists = async (emailToCheck: string, currentCustomerId?: string): Promise<{ exists: boolean; customerName?: string }> => {
    try {
      const customersRef = collection(db, 'newcustomers');
      const q = query(customersRef, where('email', '==', emailToCheck));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return { exists: false };
      }
      if (currentCustomerId) {
        const otherCustomer = snapshot.docs.find(doc => doc.id !== currentCustomerId);
        if (otherCustomer) {
          return { exists: true, customerName: otherCustomer.data().name };
        }
        return { exists: false };
      }
      return { exists: true, customerName: snapshot.docs[0].data().name };
    } catch (error) {
      console.error('[CustomerForm] Error checking email:', error);
      return { exists: false };
    }
  };

  // Load customer data when editing
  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setPhone(extractDigits(customer.phone));
      setEmail(customer.email || '');
      setGender(customer.gender);
      setAddress1(customer.address1 || '');
      setAddress2(customer.address2 || '');
      const resolvedState = customer.state || DEFAULT_STATE;
      setState(resolvedState);
      setPlace(customer.place || (resolvedState === DEFAULT_STATE ? DEFAULT_CITY : ''));
      setPincode(customer.pincode || '');
      setMeasurements(customer.measurements || {});
      setPhoneError('');
    } else {
      resetForm();
    }
  }, [customer, open]);

  const resetForm = () => {
    setActiveTab('basic');
    setName('');
    setPhone('');
    setEmail('');
    setGender('');
    setPhoneError('');
    setAddress1('');
    setAddress2('');
    setState(DEFAULT_STATE);
    setPlace(DEFAULT_CITY);
    setPincode('');
    setMeasurements({});
    setActiveCategory('shirt');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setPhoneError('');

    // Validate required fields
    if (!name.trim()) {
      toast.error('Customer name is required');
      setActiveTab('basic');
      return;
    }

    if (!gender) {
      toast.error('Please select gender');
      setActiveTab('basic');
      return;
    }

    const phoneRaw = phone.trim();
    if (!/^\d{10}$/.test(phoneRaw)) {
      setPhoneError('Enter valid 10-digit number');
      toast.error('Enter valid 10-digit phone number');
      setActiveTab('basic');
      return;
    }

    // Validate email format if provided
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error('Please enter a valid email address');
      setActiveTab('basic');
      return;
    }

    // Phone numbers are intentionally not unique (family members can share one number)
    const phoneNorm = normalize(phoneRaw);

    // Validate email uniqueness if provided
    if (email.trim()) {
      const emailCheck = await checkEmailExists(email.trim(), customer?.id);
      if (emailCheck.exists) {
        toast.error(`Email already used by ${emailCheck.customerName || 'another customer'}`);
        setActiveTab('basic');
        return;
      }
    }

    // Validate pincode if provided
    if (pincode.trim() && !/^\d{6}$/.test(pincode.trim())) {
      toast.error('Pincode must be 6 digits');
      setActiveTab('address');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        phone: formatDisplay(phoneRaw),
        phoneNormalized: phoneNorm as any,
        email: email.trim() || undefined,
        gender,
        place: place.trim() || 'Not specified',
        address1: address1.trim() || undefined,
        address2: address2.trim() || undefined,
        state: state.trim() || undefined,
        pincode: pincode.trim() || undefined,
        country: 'India',
        measurements,
        preferredId: customer ? undefined : nextCustomerId,
      } as Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>);

      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('[CustomerForm] Save failed:', error);
      // Keep form open so user can retry
    } finally {
      setIsSaving(false);
    }
  };

  const updateMeasurement = (category: string, field: string, value: string) => {
    setMeasurements((prev) => ({
      ...prev,
      [category]: {
        ...(prev[category] || {}),
        [field]: value === '' ? undefined : value,
      },
    }));
  };

  const getMeasurementValue = (category: string, field: string): string => {
    const categoryMeasurements = measurements[category];
    if (!categoryMeasurements) return '';
    const value = (categoryMeasurements as Record<string, unknown>)[field];
    return value !== undefined && value !== null ? String(value) : '';
  };

  const getCategoryMeasurementCount = (category: string): number => {
    const categoryMeasurements = measurements[category];
    if (!categoryMeasurements) return 0;
    return Object.values(categoryMeasurements).filter((v) => v !== undefined && v !== null && v !== '').length;
  };

  const getTotalMeasurements = (): number => {
    return categoryOptions.reduce((sum, cat) => sum + getCategoryMeasurementCount(cat.key), 0);
  };

  const handleAddCustomGarment = () => {
    const label = newGarmentName.trim();
    if (!label) {
      toast.error('Please enter a dress type name');
      return;
    }
    let key = slugifyKey(label);
    const existingKeys = new Set([
      ...Object.keys(CUSTOMER_BUILTIN_CATEGORIES),
      ...customGarmentTypes.map((g) => g.key),
    ]);
    if (existingKeys.has(key)) {
      key = key + '_' + Date.now().toString().slice(-4);
    }
    const iconKey = newGarmentIcon || guessGarmentIconKey(label, key);
    const next = [...customGarmentTypes, { key, label, category: 'female' as const, iconKey }];
    setCustomGarmentTypes(next);
    saveCustomGarmentTypes(next);
    const nextOverrides: SheetOverrides = {
      ...sheetOverrides,
      categoryIcons: { ...sheetOverrides.categoryIcons, [key]: iconKey },
    };
    setSheetOverrides(nextOverrides);
    saveSheetOverrides(nextOverrides);
    setActiveCategory(key);
    setNewGarmentName('');
    setNewGarmentIcon('hanger');
    setShowAddGarmentDialog(false);
    toast.success(label + ' dress type added');
  };

  const handleDeleteDressType = (key: string, label: string) => {
    if (!window.confirm(`Permanently delete dress type "${label}"?`)) return;

    if (isBuiltInCategory(key)) {
      const nextOverrides: SheetOverrides = {
        ...sheetOverrides,
        hiddenCategories: [...new Set([...sheetOverrides.hiddenCategories, key])],
      };
      setSheetOverrides(nextOverrides);
      saveSheetOverrides(nextOverrides);
    } else {
      const next = customGarmentTypes.filter((g) => g.key !== key);
      setCustomGarmentTypes(next);
      saveCustomGarmentTypes(next);
      const nextFields = { ...customMeasurementFields };
      delete nextFields[key];
      setCustomMeasurementFields(nextFields);
      saveCustomMeasurementFields(nextFields);
    }

    if (activeCategory === key) {
      const remaining = categoryOptions.filter((c) => c.key !== key);
      setActiveCategory(remaining[0]?.key || 'shirt');
    }
    toast.success(label + ' dress type deleted');
  };

  const handleSaveRenameDressType = () => {
    const label = renameGarmentLabel.trim();
    if (!label || !renameGarmentKey) {
      toast.error('Please enter a name');
      return;
    }
    const key = renameGarmentKey;
    const iconKey = renameGarmentIcon;

    if (!isBuiltInCategory(key)) {
      const next = customGarmentTypes.map((g) =>
        g.key === key ? { ...g, label, iconKey } : g
      );
      setCustomGarmentTypes(next);
      saveCustomGarmentTypes(next);
    }

    const nextOverrides: SheetOverrides = {
      ...sheetOverrides,
      categoryLabels: { ...sheetOverrides.categoryLabels, [key]: label },
      categoryIcons: { ...sheetOverrides.categoryIcons, [key]: iconKey },
    };
    setSheetOverrides(nextOverrides);
    saveSheetOverrides(nextOverrides);
    setRenameGarmentKey(null);
    setRenameGarmentLabel('');
    setRenameGarmentIcon('hanger');
    toast.success('Dress type updated');
  };

  const handleAddMeasurementField = () => {
    const label = newMeasurementFieldName.trim();
    if (!label) {
      toast.error('Please enter a measurement name');
      return;
    }

    let key = slugifyKey(label);
    const existingKeys = new Set(activeFields.map((f) => f.key));
    if (existingKeys.has(key)) {
      key = key + '_' + Date.now().toString().slice(-4);
    }

    const newField: GarmentFieldConfig = { key, label, type: 'number' };
    const next = {
      ...customMeasurementFields,
      [activeCategory]: [...(customMeasurementFields[activeCategory] || []), newField],
    };
    setCustomMeasurementFields(next);
    saveCustomMeasurementFields(next);
    setNewMeasurementFieldName('');
    setShowAddMeasurementFieldDialog(false);
    toast.success(label + ' added to size sheet');
  };

  const handleDeleteMeasurementField = (fieldKey: string, fieldLabel: string) => {
    if (!window.confirm(`Permanently delete field "${fieldLabel}" from this dress type?`)) return;

    const customList = customMeasurementFields[activeCategory] || [];
    const isCustomOnly = customList.some((f) => f.key === fieldKey);

    if (isCustomOnly) {
      const next = {
        ...customMeasurementFields,
        [activeCategory]: customList.filter((f) => f.key !== fieldKey),
      };
      setCustomMeasurementFields(next);
      saveCustomMeasurementFields(next);
    } else {
      const nextOverrides: SheetOverrides = {
        ...sheetOverrides,
        hiddenFields: {
          ...sheetOverrides.hiddenFields,
          [activeCategory]: [
            ...new Set([...(sheetOverrides.hiddenFields[activeCategory] || []), fieldKey]),
          ],
        },
      };
      setSheetOverrides(nextOverrides);
      saveSheetOverrides(nextOverrides);
    }
    toast.success(fieldLabel + ' removed from size sheet');
  };

  const handleSaveRenameField = () => {
    const label = renameFieldLabel.trim();
    if (!label || !renameFieldKey) {
      toast.error('Please enter a name');
      return;
    }
    const fieldKey = renameFieldKey;
    const customList = customMeasurementFields[activeCategory] || [];
    const isCustom = customList.some((f) => f.key === fieldKey);

    if (isCustom) {
      const next = {
        ...customMeasurementFields,
        [activeCategory]: customList.map((f) => (f.key === fieldKey ? { ...f, label } : f)),
      };
      setCustomMeasurementFields(next);
      saveCustomMeasurementFields(next);
    }

    const nextOverrides: SheetOverrides = {
      ...sheetOverrides,
      fieldLabels: {
        ...sheetOverrides.fieldLabels,
        [activeCategory]: {
          ...(sheetOverrides.fieldLabels[activeCategory] || {}),
          [fieldKey]: label,
        },
      },
    };
    setSheetOverrides(nextOverrides);
    saveSheetOverrides(nextOverrides);
    setRenameFieldKey(null);
    setRenameFieldLabel('');
    toast.success('Field renamed');
  };

  // Tab completion indicators
  const isBasicComplete = name.trim() && phone.length === 10 && gender;
  const hasMeasurements = getTotalMeasurements() > 0;
  const hasAddress = state || place || address1;

  // Keep a customer's previously saved city selectable even if it is not in the current list.
  const baseCities = STATE_CITIES[state] || [];
  const cityOptions =
    place && place !== 'Not specified' && !baseCities.includes(place)
      ? [place, ...baseCities]
      : baseCities;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl w-full !h-[100dvh] sm:!h-[95vh] !top-0 !left-0 !right-0 !bottom-0 !translate-x-0 !translate-y-0 sm:!top-[50%] sm:!left-[50%] sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:!bottom-auto sm:!right-auto flex flex-col p-0 overflow-hidden rounded-none sm:rounded-lg keyboard-aware-container"
        style={{ maxHeight: 'calc(100dvh - var(--keyboard-height, 0px))' }}
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* Header - Fixed at top */}
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
            <span className="leading-tight">{customer ? t('editCustomer') : t('createCustomer')}</span>
            <span className="text-xs font-normal text-white/80 bg-white/20 px-2 py-0.5 rounded leading-tight">
              {customer?.id || nextCustomerId || 'Loading...'}
            </span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Tab Navigation - Compact when keyboard open */}
          <div className="px-3 py-2 border-b bg-muted/30 flex-shrink-0">
            <div className="grid grid-cols-3 w-full h-auto p-1 gap-1 bg-muted rounded-xl" style={{ backgroundColor: 'rgb(243, 240, 255)' }}>
              <button
                type="button"
                onClick={() => setActiveTab('basic')}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-lg transition-all duration-200",
                  activeTab === 'basic'
                    ? "bg-white shadow-md text-purple-700"
                    : "text-gray-600 hover:bg-white/50"
                )}
              >
                <User size={16} weight="bold" />
                <span className="hidden xs:inline">Basic</span>
                {isBasicComplete && <Check size={14} className="text-green-600" weight="bold" />}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('measurements')}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-lg transition-all duration-200",
                  activeTab === 'measurements'
                    ? "bg-white shadow-md text-purple-700"
                    : "text-gray-600 hover:bg-white/50"
                )}
              >
                <Ruler size={16} weight="bold" />
                <span className="hidden xs:inline">Measure</span>
                {hasMeasurements && (
                  <span className="text-[9px] bg-purple-600 text-white px-1.5 py-0.5 rounded-full font-bold min-w-[18px]">
                    {getTotalMeasurements()}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('address')}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-lg transition-all duration-200",
                  activeTab === 'address'
                    ? "bg-white shadow-md text-purple-700"
                    : "text-gray-600 hover:bg-white/50"
                )}
              >
                <MapPin size={16} weight="bold" />
                <span className="hidden xs:inline">Address</span>
                {hasAddress && <Check size={14} className="text-green-600" weight="bold" />}
              </button>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 pb-4 keyboard-aware-scroll">
              {/* Basic Details Tab */}
              {activeTab === 'basic' && (
                <div className="space-y-6">
                  {!customer && companyId && (
                    <NumberSeriesSelect
                      companyId={companyId}
                      defaultPrefix="CUST"
                      onSeriesChange={(_series, nextNumber) => setNextCustomerId(nextNumber)}
                    />
                  )}
                  {/* Customer Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">Customer Name *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={40}
                      placeholder="Enter customer name"
                      className="h-12 text-base"
                      autoFocus
                    />
                  </div>

                  {/* Gender Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Gender *</Label>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setGender('male')}
                        className={cn(
                          'relative flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-all',
                          gender === 'male'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                            : 'border-muted hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/10'
                        )}
                      >
                        {gender === 'male' && (
                          <Check size={16} weight="bold" className="text-blue-600 absolute top-2 right-2" />
                        )}
                        <UserCircle
                          size={44}
                          weight={gender === 'male' ? 'fill' : 'regular'}
                          className={gender === 'male' ? 'text-blue-500' : 'text-muted-foreground'}
                        />
                        <span className={cn(
                          'font-semibold',
                          gender === 'male' ? 'text-blue-600' : 'text-muted-foreground'
                        )}>
                          Male
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setGender('female')}
                        className={cn(
                          'relative flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-all',
                          gender === 'female'
                            ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/30'
                            : 'border-muted hover:border-pink-300 hover:bg-pink-50/50 dark:hover:bg-pink-950/10'
                        )}
                      >
                        {gender === 'female' && (
                          <Check size={16} weight="bold" className="text-pink-600 absolute top-2 right-2" />
                        )}
                        <UserCircle
                          size={44}
                          weight={gender === 'female' ? 'fill' : 'regular'}
                          className={gender === 'female' ? 'text-pink-500' : 'text-muted-foreground'}
                        />
                        <span className={cn(
                          'font-semibold',
                          gender === 'female' ? 'text-pink-600' : 'text-muted-foreground'
                        )}>
                          Female
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="bg-muted/30 rounded-xl p-5 border space-y-5">
                    <h3 className="text-sm font-semibold text-muted-foreground">Contact Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-medium">Contact Number *</Label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                            +91
                          </div>
                          <Input
                            id="phone"
                            value={phone}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              setPhone(value);
                              if (phoneError) setPhoneError('');
                            }}
                            maxLength={10}
                            placeholder="10-digit number"
                            className={cn('pl-12 h-11 bg-background', phoneError && 'border-red-500')}
                          />
                        </div>
                        {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
                        {phone.length === 10 && !phoneError && (
                          <p className="text-xs text-green-600 mt-1">Valid number</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium">
                          Email <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="customer@example.com"
                          className="h-11 bg-background"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Measurements Tab */}
              {activeTab === 'measurements' && (
                <div className="space-y-5">
                  {/* Header: title + Add dress type + unit toggle */}
                  <div className="flex items-center justify-between gap-2 min-w-0 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="text-sm font-medium text-muted-foreground shrink-0">Select Category</h3>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        title="Add new dress type"
                        onClick={() => {
                          setNewGarmentName('');
                          setShowAddGarmentDialog(true);
                        }}
                        className="h-8 gap-1 px-2.5 border-purple-400 text-purple-700 bg-purple-50 hover:bg-purple-100 hover:border-purple-600 shrink-0"
                      >
                        <Plus size={14} weight="bold" />
                        Dress
                      </Button>
                    </div>
                    <div
                      className="inline-flex rounded-full border border-primary p-0.5 bg-white shrink-0"
                      role="group"
                      aria-label="Measurement unit"
                    >
                      <button
                        type="button"
                        onClick={() => setMeasurementUnit('Inches')}
                        className={cn(
                          'px-3.5 py-1.5 text-xs font-semibold rounded-full transition-colors',
                          measurementUnit === 'Inches'
                            ? 'bg-primary text-white'
                            : 'bg-transparent text-primary'
                        )}
                      >
                        Inches
                      </button>
                      <button
                        type="button"
                        onClick={() => setMeasurementUnit('Cms')}
                        className={cn(
                          'px-3.5 py-1.5 text-xs font-semibold rounded-full transition-colors',
                          measurementUnit === 'Cms'
                            ? 'bg-primary text-white'
                            : 'bg-transparent text-primary'
                        )}
                      >
                        Cms
                      </button>
                    </div>
                  </div>

                  {/* Full-width Add Dress Type — always visible, cannot be clipped */}
                  <button
                    type="button"
                    onClick={() => {
                      setNewGarmentName('');
                      setShowAddGarmentDialog(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border-2 border-dashed border-purple-500 bg-purple-50 text-purple-800 font-semibold text-sm hover:bg-purple-100 hover:border-purple-700"
                  >
                    <Plus size={18} weight="bold" />
                    Add New Dress Type
                  </button>

                  {/* Category grid — wraps so nothing is clipped */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 w-full">
                    {categoryOptions.map((config) => {
                      const count = getCategoryMeasurementCount(config.key);
                      const Icon = config.icon;
                      const isActive = activeCategory === config.key;
                      return (
                        <div key={config.key} className="relative min-w-0 group">
                          <button
                            type="button"
                            title={config.label}
                            onClick={() => setActiveCategory(config.key)}
                            className={cn(
                              'relative flex flex-col items-center gap-1 p-2 w-full rounded-xl border-2 transition-all',
                              isActive
                                ? 'border-primary bg-primary/5 shadow-sm'
                                : 'border-transparent bg-muted/50 hover:bg-muted hover:border-muted-foreground/20'
                            )}
                          >
                            <div className={cn(
                              'w-9 h-9 rounded-full flex items-center justify-center',
                              isActive ? 'bg-primary text-primary-foreground' : 'bg-background'
                            )}>
                              <Icon size={20} weight={isActive ? 'fill' : 'bold'} />
                            </div>
                            <span
                              className={cn(
                                'text-[10px] font-semibold w-full text-center truncate leading-tight',
                                isActive ? 'text-primary' : 'text-muted-foreground'
                              )}
                            >
                              {config.label}
                            </span>
                            {count > 0 && (
                              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center bg-green-500 text-white text-[9px] font-bold rounded-full">
                                {count}
                              </span>
                            )}
                          </button>
                          <div className="absolute -top-1 -left-1 flex gap-0.5 z-10">
                            <button
                              type="button"
                              tabIndex={-1}
                              title="Edit name"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenameGarmentKey(config.key);
                                setRenameGarmentLabel(config.label);
                                setRenameGarmentIcon(config.iconKey);
                              }}
                              className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center hover:bg-purple-700 shadow"
                            >
                              <PencilSimple size={10} weight="bold" />
                            </button>
                            <button
                              type="button"
                              tabIndex={-1}
                              title="Delete dress type"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDressType(config.key, config.label);
                              }}
                              className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow"
                            >
                              <Trash size={10} weight="bold" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      title="Add new dress type"
                      onClick={() => {
                        setNewGarmentName('');
                        setShowAddGarmentDialog(true);
                      }}
                      className="flex flex-col items-center gap-1 p-2 w-full rounded-xl border-2 border-dashed border-purple-400 bg-purple-50 text-purple-700 hover:border-purple-600 hover:bg-purple-100 min-w-0"
                    >
                      <div className="w-9 h-9 rounded-full flex items-center justify-center bg-purple-200">
                        <Plus size={18} weight="bold" />
                      </div>
                      <span className="text-[10px] font-semibold leading-tight">Add</span>
                    </button>
                  </div>

                  {/* Measurement inputs */}
                  <div className="bg-muted/30 rounded-xl p-5 border">
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <div className="flex items-center gap-2">
                        {activeCategoryConfig && (() => {
                          const Icon = activeCategoryConfig.icon;
                          return <Icon size={20} weight="bold" className="text-primary" />;
                        })()}
                        <h4 className="font-semibold text-sm">
                          {applyCategoryLabel(
                            activeCategory,
                            activeCategoryConfig?.label || 'Dress',
                            sheetOverrides
                          )}{' '}
                          Measurements
                        </h4>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setNewMeasurementFieldName('');
                          setShowAddMeasurementFieldDialog(true);
                        }}
                        className="gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50"
                      >
                        <Plus size={14} weight="bold" />
                        Add
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {activeFields.map((field) => (
                        <div key={field.key} className="space-y-1.5">
                          <div className="flex items-center justify-between gap-1">
                            <Label className="text-xs font-medium text-muted-foreground truncate">
                              {field.label}
                            </Label>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                tabIndex={-1}
                                title="Edit field name"
                                onClick={() => {
                                  setRenameFieldKey(field.key);
                                  setRenameFieldLabel(field.label);
                                }}
                                className="text-purple-600 hover:text-purple-800 p-0.5"
                              >
                                <PencilSimple size={12} weight="bold" />
                              </button>
                              <button
                                type="button"
                                tabIndex={-1}
                                title="Delete field"
                                onClick={() => handleDeleteMeasurementField(field.key, field.label)}
                                className="text-red-500 hover:text-red-700 p-0.5"
                              >
                                <Trash size={12} weight="bold" />
                              </button>
                            </div>
                          </div>
                          {field.type === 'select' ? (
                            <Select
                              value={getMeasurementValue(activeCategory, field.key)}
                              onValueChange={(val) => updateMeasurement(activeCategory, field.key, val)}
                            >
                              <SelectTrigger className="h-11 bg-white">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                {(field.options || []).map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="relative">
                              <Input
                                type="text"
                                value={getMeasurementValue(activeCategory, field.key)}
                                onChange={(e) => updateMeasurement(activeCategory, field.key, e.target.value)}
                                placeholder="Enter value"
                                className="h-11 pr-12 text-base"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                {measurementUnit === 'Inches' ? 'in' : 'cm'}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Measurement summary */}
                  {getTotalMeasurements() > 0 && (
                    <div className="p-4 rounded-xl border" style={{ background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 50%, #e0e7ff 100%)', borderColor: 'rgba(167, 139, 250, 0.4)' }}>
                      <p className="text-xs font-semibold text-purple-800 dark:text-purple-200 mb-3">
                        Measurements Added ({getTotalMeasurements()} total)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {categoryOptions.map((config) => {
                          const count = getCategoryMeasurementCount(config.key);
                          if (count === 0) return null;
                          return (
                            <span
                              key={config.key}
                              className="px-3 py-1.5 bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-semibold"
                            >
                              {config.label}: {count}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Address Tab */}
              {activeTab === 'address' && (
                <div className="space-y-5">
                  {/* Shop/Flat Number */}
                  <div className="space-y-2">
                    <Label htmlFor="address1" className="text-sm font-medium">
                      Shop No / Flat No
                    </Label>
                    <Input
                      id="address1"
                      value={address1}
                      onChange={(e) => setAddress1(e.target.value)}
                      maxLength={40}
                      placeholder="e.g., Shop 12, Flat 4B, Door No. 25"
                      className="h-11"
                    />
                  </div>

                  {/* Street / Area / Landmark + Pincode */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="address2" className="text-sm font-medium">
                        Street / Area / Landmark
                      </Label>
                      <Input
                        id="address2"
                        value={address2}
                        onChange={(e) => setAddress2(e.target.value)}
                        maxLength={40}
                        placeholder="e.g., Main Road, Near Bus Stand"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pincode" className="text-sm font-medium">Pincode</Label>
                      <Input
                        id="pincode"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                        maxLength={6}
                        placeholder="e.g., 600001"
                        className="h-11"
                      />
                    </div>
                  </div>

                  {/* State and City in same row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="state" className="text-sm font-medium">State</Label>
                      <Select value={state} onValueChange={(value) => {
                        setState(value);
                        setPlace('');
                      }}>
                        <SelectTrigger id="state" className="h-11">
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {INDIAN_STATES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="place" className="text-sm font-medium">City</Label>
                      <Select value={place} onValueChange={setPlace} disabled={!state}>
                        <SelectTrigger id="place" className="h-11">
                          <SelectValue placeholder={state ? "Select city" : "Select state first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {cityOptions.map((city) => (
                            <SelectItem key={city} value={city}>{city}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                </div>

              )}
            </div>

          {/* Footer with action buttons */}
          <div className="flex justify-between items-center gap-3 px-4 py-2 border-t flex-shrink-0" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #8b5cf6 100%)', borderColor: 'rgba(196, 181, 253, 0.3)' }}>
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-white hover:text-white/80 hover:bg-white/10">
              {t('cancel')}
            </Button>
            <div className="flex items-center gap-2">
              {activeTab !== 'basic' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab(activeTab === 'address' ? 'measurements' : 'basic')}
                  className="border border-white/30 text-white hover:text-white hover:bg-white/10 bg-transparent"
                >
                  Back
                </Button>
              )}
              {activeTab !== 'address' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab(activeTab === 'basic' ? 'measurements' : 'address')}
                  className="border border-white/30 text-white hover:text-white hover:bg-white/10 bg-transparent"
                >
                  Next
                </Button>
              )}
              <Button type="submit" size="sm" disabled={isSaving} className="min-w-[100px] bg-white text-purple-700 hover:bg-white/90">
                {isSaving ? 'Saving...' : customer ? t('save') : 'Create'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {/* Add Dress Type Dialog */}
    <Dialog open={showAddGarmentDialog} onOpenChange={setShowAddGarmentDialog}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add Dress Type</DialogTitle>
          <DialogDescription>
            Create a custom dress type. You can add or remove measurement fields after creating it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="customer-new-garment-name">Dress Type Name *</Label>
            <Input
              id="customer-new-garment-name"
              value={newGarmentName}
              onChange={(e) => {
                const value = e.target.value;
                setNewGarmentName(value);
                setNewGarmentIcon(guessGarmentIconKey(value));
              }}
              placeholder="e.g., Custom Dress, Blouse Special"
              className="h-11"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomGarment();
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="grid grid-cols-4 gap-2">
              {GARMENT_ICON_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const selected = newGarmentIcon === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    title={opt.label}
                    onClick={() => setNewGarmentIcon(opt.key)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all',
                      selected
                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                        : 'border-transparent bg-muted/60 text-muted-foreground hover:border-purple-300'
                    )}
                  >
                    <Icon size={22} weight={selected ? 'fill' : 'bold'} />
                    <span className="text-[9px] font-medium truncate w-full text-center">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setShowAddGarmentDialog(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleAddCustomGarment} className="gap-2">
            <Plus size={16} weight="bold" />
            Add Category
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Add Measurement Field Dialog */}
    <Dialog open={showAddMeasurementFieldDialog} onOpenChange={setShowAddMeasurementFieldDialog}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add Size Sheet Field</DialogTitle>
          <DialogDescription>
            Add a measurement field for {activeCategoryConfig?.label || activeCategory}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="customer-new-measurement-field">Measurement Name *</Label>
            <Input
              id="customer-new-measurement-field"
              value={newMeasurementFieldName}
              onChange={(e) => setNewMeasurementFieldName(e.target.value)}
              placeholder="e.g., Sleeve Length, Waist Length"
              className="h-11"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddMeasurementField();
                }
              }}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setShowAddMeasurementFieldDialog(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleAddMeasurementField} className="gap-2">
            <Plus size={16} weight="bold" />
            Add Field
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    {/* Rename Dress Type Dialog */}
    <Dialog
      open={!!renameGarmentKey}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setRenameGarmentKey(null);
          setRenameGarmentLabel('');
        }
      }}
    >
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Edit Dress Type</DialogTitle>
          <DialogDescription>Change the display name for this dress type.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="rename-garment">Dress Type Name *</Label>
            <Input
              id="rename-garment"
              value={renameGarmentLabel}
              onChange={(e) => setRenameGarmentLabel(e.target.value)}
              className="h-11"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveRenameDressType();
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="grid grid-cols-4 gap-2">
              {GARMENT_ICON_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const selected = renameGarmentIcon === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    title={opt.label}
                    onClick={() => setRenameGarmentIcon(opt.key)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all',
                      selected
                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                        : 'border-transparent bg-muted/60 text-muted-foreground hover:border-purple-300'
                    )}
                  >
                    <Icon size={22} weight={selected ? 'fill' : 'bold'} />
                    <span className="text-[9px] font-medium truncate w-full text-center">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setRenameGarmentKey(null)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSaveRenameDressType}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Rename Measurement Field Dialog */}
    <Dialog
      open={!!renameFieldKey}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setRenameFieldKey(null);
          setRenameFieldLabel('');
        }
      }}
    >
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Edit Measurement Field</DialogTitle>
          <DialogDescription>Change the label for this measurement field.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="rename-field">Field Name *</Label>
            <Input
              id="rename-field"
              value={renameFieldLabel}
              onChange={(e) => setRenameFieldLabel(e.target.value)}
              className="h-11"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveRenameField();
                }
              }}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setRenameFieldKey(null)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSaveRenameField}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

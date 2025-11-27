import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Customer, Gender, Measurements } from '@/lib/types';
import { toast } from 'sonner';
import { TShirt, Pants, Hoodie, Dress, User, Ruler, MapPin, Check, UserCircle } from '@phosphor-icons/react';
import { generateCustomerId } from '@/lib/firestore/customerService';
import { getCompanyProfile } from '@/lib/firestore/companyService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';

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
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Tiruppur', 'Erode', 'Vellore', 'Thoothukudi', 'Dindigul', 'Thanjavur', 'Ranipet', 'Sivakasi', 'Karur', 'Udhagamandalam', 'Hosur', 'Nagercoil', 'Kanchipuram', 'Kumarapalayam', 'Karaikkudi', 'Neyveli', 'Cuddalore', 'Kumbakonam', 'Tiruvannamalai', 'Pollachi', 'Rajapalayam', 'Gudiyatham', 'Pudukkottai', 'Vaniyambadi', 'Ambur', 'Nagapattinam'],
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

// Measurement field definitions
const MEASUREMENT_FIELDS = {
  shirt: {
    label: 'Shirt',
    icon: TShirt,
    fields: [
      { key: 'chest', label: 'Chest' },
      { key: 'waist', label: 'Waist' },
      { key: 'length', label: 'Length' },
      { key: 'shoulder', label: 'Shoulder' },
    ],
  },
  pant: {
    label: 'Pant',
    icon: Pants,
    fields: [
      { key: 'waist', label: 'Waist' },
      { key: 'inseam', label: 'Inseam' },
      { key: 'outseam', label: 'Outseam' },
      { key: 'thigh', label: 'Thigh' },
      { key: 'hips', label: 'Hips' },
      { key: 'legOpening', label: 'Leg Opening' },
    ],
  },
  coat: {
    label: 'Coat',
    icon: Hoodie,
    fields: [
      { key: 'chest', label: 'Chest' },
      { key: 'waist', label: 'Waist' },
      { key: 'length', label: 'Length' },
      { key: 'shoulder', label: 'Shoulder' },
    ],
  },
  blouse: {
    label: 'Blouse',
    icon: Dress,
    fields: [
      { key: 'shoulder', label: 'Shoulder' },
      { key: 'chest', label: 'Chest' },
      { key: 'armhole', label: 'Armhole' },
      { key: 'halfSleeve', label: 'Half Sleeve' },
      { key: 'fullSleeve', label: 'Full Sleeve' },
    ],
  },
  chudithar: {
    label: 'Chudithar',
    icon: Dress,
    fields: [
      { key: 'shoulder', label: 'Shoulder' },
      { key: 'bust', label: 'Bust' },
      { key: 'waist', label: 'Waist' },
      { key: 'hip', label: 'Hip' },
      { key: 'length', label: 'Length' },
    ],
  },
};

type MeasurementCategory = keyof typeof MEASUREMENT_FIELDS;

interface CustomerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => void;
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

  // Address details
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [state, setState] = useState('');
  const [place, setPlace] = useState('');
  const [pincode, setPincode] = useState('');

  // Measurements
  const [measurements, setMeasurements] = useState<Measurements>({});
  const [activeCategory, setActiveCategory] = useState<MeasurementCategory>('shirt');
  const [measurementUnit, setMeasurementUnit] = useState<'Inches' | 'Cms'>('Inches');

  // Fetch next customer ID
  useEffect(() => {
    const fetchNextId = async () => {
      if (open && !customer && user?.id) {
        try {
          const company = await getCompanyProfile(user.id);
          if (company) {
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

  // Check if phone number exists
  const checkPhoneExists = async (normalizedPhone: string, currentCustomerId?: string): Promise<boolean> => {
    try {
      const customersRef = collection(db, 'newcustomers');
      const q = query(customersRef, where('phoneNormalized', '==', normalizedPhone));
      const snapshot = await getDocs(q);
      if (currentCustomerId) {
        return snapshot.docs.some(doc => doc.id !== currentCustomerId);
      }
      return !snapshot.empty;
    } catch (error) {
      console.error('[CustomerForm] Error checking phone:', error);
      return false;
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
      setState(customer.state || '');
      setPlace(customer.place);
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
    setState('');
    setPlace('');
    setPincode('');
    setMeasurements({});
    setActiveCategory('shirt');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

    // Check phone uniqueness
    const phoneNorm = normalize(phoneRaw);
    const phoneExists = await checkPhoneExists(phoneNorm, customer?.id);
    if (phoneExists) {
      setPhoneError('This number is already registered');
      toast.error('This phone number is already registered');
      setActiveTab('basic');
      return;
    }

    // Validate pincode if provided
    if (pincode.trim() && !/^\d{6}$/.test(pincode.trim())) {
      toast.error('Pincode must be 6 digits');
      setActiveTab('address');
      return;
    }

    onSave({
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
    });

    onOpenChange(false);
    resetForm();
  };

  const updateMeasurement = (category: keyof Measurements, field: string, value: string) => {
    const parsedValue = value === '' ? undefined : parseFloat(value);
    setMeasurements((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: parsedValue,
      },
    }));
  };

  const getMeasurementValue = (category: keyof Measurements, field: string): string => {
    const categoryMeasurements = measurements[category];
    if (!categoryMeasurements) return '';
    const value = (categoryMeasurements as Record<string, unknown>)[field];
    return value !== undefined && value !== null ? String(value) : '';
  };

  const getCategoryMeasurementCount = (category: MeasurementCategory): number => {
    const categoryMeasurements = measurements[category];
    if (!categoryMeasurements) return 0;
    return Object.values(categoryMeasurements).filter(v => v !== undefined && v !== null && v !== '').length;
  };

  const getTotalMeasurements = (): number => {
    return (Object.keys(MEASUREMENT_FIELDS) as MeasurementCategory[])
      .reduce((sum, cat) => sum + getCategoryMeasurementCount(cat), 0);
  };

  // Tab completion indicators
  const isBasicComplete = name.trim() && phone.length === 10 && gender;
  const hasMeasurements = getTotalMeasurements() > 0;
  const hasAddress = state || place || address1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl h-[85vh] flex flex-col p-0 overflow-hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #8b5cf6 100%)', borderColor: 'rgba(196, 181, 253, 0.3)' }}>
          <DialogTitle className="flex items-center gap-3 text-white">
            <span>{customer ? t('editCustomer') : t('createCustomer')}</span>
            <span className="text-sm font-normal text-white/80 bg-white/20 px-2 py-1 rounded">
              {customer?.id || nextCustomerId || 'Loading...'}
            </span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
            <div className="px-4 pt-3 pb-2 border-b bg-muted/30 flex-shrink-0">
              <TabsList className="grid grid-cols-3 w-full h-11 p-1 bg-muted rounded-lg">
                <TabsTrigger
                  value="basic"
                  className="flex items-center justify-center gap-1.5 h-9 text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
                >
                  <User size={20} weight="bold" />
                  <span>Basic</span>
                  {isBasicComplete && <Check size={16} className="text-green-600" weight="bold" />}
                </TabsTrigger>
                <TabsTrigger
                  value="measurements"
                  className="flex items-center justify-center gap-1.5 h-9 text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
                >
                  <Ruler size={20} weight="bold" />
                  <span>Measure</span>
                  {hasMeasurements && (
                    <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-bold min-w-[18px]">
                      {getTotalMeasurements()}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="address"
                  className="flex items-center justify-center gap-1.5 h-9 text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
                >
                  <MapPin size={20} weight="bold" />
                  <span>Address</span>
                  {hasAddress && <Check size={16} className="text-green-600" weight="bold" />}
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 min-h-[400px]">
              {/* Basic Details Tab */}
              <TabsContent value="basic" className="mt-0 space-y-6 h-full">
                <div className="space-y-6">
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
              </TabsContent>

              {/* Measurements Tab */}
              <TabsContent value="measurements" className="mt-0 h-full">
                <div className="space-y-5">
                  {/* Header with Unit selector on right */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted-foreground">Select Category</h3>
                    <Select value={measurementUnit} onValueChange={(v) => setMeasurementUnit(v as 'Inches' | 'Cms')}>
                      <SelectTrigger className="w-28 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inches">Inches</SelectItem>
                        <SelectItem value="Cms">Cms</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Category selector - Grid layout */}
                  <div className="grid grid-cols-5 gap-2">
                    {(Object.keys(MEASUREMENT_FIELDS) as MeasurementCategory[]).map((category) => {
                      const config = MEASUREMENT_FIELDS[category];
                      const count = getCategoryMeasurementCount(category);
                      const Icon = config.icon;
                      const isActive = activeCategory === category;
                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => setActiveCategory(category)}
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
                            {config.label}
                          </span>
                          {count > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-green-500 text-white text-[10px] font-bold rounded-full">
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Measurement inputs */}
                  <div className="bg-muted/30 rounded-xl p-5 border">
                    <div className="flex items-center gap-2 mb-4">
                      {(() => {
                        const Icon = MEASUREMENT_FIELDS[activeCategory].icon;
                        return <Icon size={20} weight="bold" className="text-primary" />;
                      })()}
                      <h4 className="font-semibold text-sm">
                        {MEASUREMENT_FIELDS[activeCategory].label} Measurements
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {MEASUREMENT_FIELDS[activeCategory].fields.map((field) => (
                        <div key={field.key} className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">
                            {field.label}
                          </Label>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              value={getMeasurementValue(activeCategory, field.key)}
                              onChange={(e) => updateMeasurement(activeCategory, field.key, e.target.value)}
                              placeholder="0"
                              className="h-11 pr-12 text-base"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {measurementUnit === 'Inches' ? 'in' : 'cm'}
                            </span>
                          </div>
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
                        {(Object.keys(MEASUREMENT_FIELDS) as MeasurementCategory[]).map((category) => {
                          const count = getCategoryMeasurementCount(category);
                          if (count === 0) return null;
                          return (
                            <span
                              key={category}
                              className="px-3 py-1.5 bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-semibold"
                            >
                              {MEASUREMENT_FIELDS[category].label}: {count}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Address Tab */}
              <TabsContent value="address" className="mt-0 h-full">
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

                  {/* Street / Area / Landmark */}
                  <div className="space-y-2">
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
                          {(STATE_CITIES[state] || []).map((city) => (
                            <SelectItem key={city} value={city}>{city}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Pincode */}
                  <div className="space-y-2 max-w-[200px]">
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

              </TabsContent>
            </div>
          </Tabs>

          {/* Footer with action buttons */}
          <div className="flex justify-between items-center gap-3 px-6 py-4 border-t" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #8b5cf6 100%)', borderColor: 'rgba(196, 181, 253, 0.3)' }}>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-white hover:text-white/80 hover:bg-white/10">
              {t('cancel')}
            </Button>
            <div className="flex items-center gap-2">
              {activeTab !== 'basic' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab(activeTab === 'address' ? 'measurements' : 'basic')}
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  Back
                </Button>
              )}
              {activeTab !== 'address' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab(activeTab === 'basic' ? 'measurements' : 'address')}
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  Next
                </Button>
              )}
              <Button type="submit" className="min-w-[120px] bg-white text-purple-700 hover:bg-white/90">
                {customer ? t('save') : 'Create'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

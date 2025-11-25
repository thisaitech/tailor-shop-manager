import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Customer, Gender, Measurements } from '@/lib/types';
import { toast } from 'sonner';
import { TShirt, Pants, Hoodie, Dress } from '@phosphor-icons/react';
import { generateCustomerId } from '@/lib/firestore/customerService';
import { getCompanyProfile } from '@/lib/firestore/companyService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

// Get all states (sorted)
const INDIAN_STATES = Object.keys(STATE_CITIES).sort();

// Measurement field definitions with labels
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
      { key: 'rise', label: 'Rise' },
      { key: 'thigh', label: 'Thigh' },
      { key: 'hips', label: 'Hips' },
      { key: 'legOpening', label: 'Leg Opening' },
    ],
  },
  coat: {
    label: 'Coat',
    icon: Hoodie,
    fields: [
      { key: 'standardSize', label: 'Standard Size', type: 'text' },
      { key: 'chest', label: 'Chest' },
      { key: 'waist', label: 'Waist' },
      { key: 'length', label: 'Length' },
      { key: 'shoulder', label: 'Shoulder' },
    ],
  },
  chuditharTop: {
    label: 'Chudithar Top',
    icon: Dress,
    fields: [
      { key: 'shoulder', label: 'Shoulder' },
      { key: 'bust', label: 'Bust' },
      { key: 'waist', label: 'Waist' },
      { key: 'hip', label: 'Hip' },
      { key: 'length', label: 'Length' },
    ],
  },
  chuditharPant: {
    label: 'Chudithar Pant',
    icon: Pants,
    fields: [
      { key: 'waist', label: 'Waist' },
      { key: 'hip', label: 'Hip' },
      { key: 'inseam', label: 'In Seam' },
      { key: 'fullLength', label: 'Full Length' },
    ],
  },
  blouse: {
    label: 'Blouse',
    icon: TShirt,
    fields: [
      { key: 'shoulder', label: 'Shoulder' },
      { key: 'chest', label: 'Chest' },
      { key: 'neckDepthFront', label: 'Neck Depth Front' },
      { key: 'neckDepthBack', label: 'Neck Depth Back' },
      { key: 'armhole', label: 'Armhole' },
      { key: 'halfSleeve', label: 'Half Sleeve' },
      { key: 'fullSleeve', label: 'Full Sleeve' },
    ],
  },
  trouser: {
    label: 'Trouser',
    icon: Pants,
    fields: [
      { key: 'waist', label: 'Waist' },
      { key: 'inseam', label: 'Inseam' },
      { key: 'outseam', label: 'Outseam' },
      { key: 'rise', label: 'Rise' },
      { key: 'thigh', label: 'Thigh' },
      { key: 'hips', label: 'Hips' },
      { key: 'legOpening', label: 'Leg Opening' },
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
  const [name, setName] = useState('');
  const [aliasName, setAliasName] = useState('');
  const [phone, setPhone] = useState(''); // Only the 10 digits
  const [email, setEmail] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState(''); // Only the 10 digits
  const [phoneError, setPhoneError] = useState('');
  const [whatsappError, setWhatsappError] = useState('');
  const [place, setPlace] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [pincode, setPincode] = useState('');
  const [region, setRegion] = useState('NaN');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [gender, setGender] = useState<Gender | ''>('');
  const [measurements, setMeasurements] = useState<Measurements>({});
  const [activeCategory, setActiveCategory] = useState<MeasurementCategory>('shirt');
  const [nextCustomerId, setNextCustomerId] = useState<string>('');

  // Fetch next customer ID when opening form for new customer
  useEffect(() => {
    const fetchNextId = async () => {
      if (open && !customer && user?.id) {
        try {
          const company = await getCompanyProfile(user.id);
          if (company) {
            const nextId = await generateCustomerId(company.id);
            setNextCustomerId(nextId);
            console.log('[CustomerForm] Generated next customer ID:', nextId);
          }
        } catch (error) {
          console.error('Error generating customer ID:', error);
          setNextCustomerId('TBD');
        }
      } else if (!open) {
        // Reset when form closes
        setNextCustomerId('');
      }
    };
    fetchNextId();
  }, [open, customer, user]);

  // Helper functions for phone number formatting
  const extractDigits = (phoneStr: string): string => {
    // Extract 10 digits from formats like "+91 9876543210" or "+919876543210"
    const digits = phoneStr.replace(/\D/g, '');
    // If it starts with 91, remove it
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

  const onlyDigits = (str: string): boolean => {
    return /^\d+$/.test(str);
  };

  // Check if phone number exists in Firestore
  const checkPhoneExists = async (normalizedPhone: string, currentCustomerId?: string): Promise<boolean> => {
    try {
      const customersRef = collection(db, 'newcustomers');
      const q = query(customersRef, where('phoneNormalized', '==', normalizedPhone));
      const snapshot = await getDocs(q);

      // If editing, exclude the current customer from the check
      if (currentCustomerId) {
        return snapshot.docs.some(doc => doc.id !== currentCustomerId);
      }

      return !snapshot.empty;
    } catch (error) {
      console.error('[CustomerForm] Error checking phone existence:', error);
      return false;
    }
  };

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setAliasName(customer.aliasName || '');
      // Extract 10 digits from stored phone numbers
      setPhone(extractDigits(customer.phone));
      setEmail(customer.email || '');
      setWhatsappNumber(customer.whatsappNumber ? extractDigits(customer.whatsappNumber) : '');
      setPlace(customer.place);
      setAddress1(customer.address1 || '');
      setAddress2(customer.address2 || '');
      setPincode(customer.pincode || '');
      setRegion(customer.region || '');
      setState(customer.state || '');
      setCountry(customer.country || '');
      setGender(customer.gender);
      setMeasurements(customer.measurements || {});
      setPhoneError('');
      setWhatsappError('');
    } else {
      resetForm();
    }
  }, [customer, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setPhoneError('');
    setWhatsappError('');

    // Basic validations
    if (!name.trim() || !phone.trim() || !place.trim() || !state.trim()) {
      toast.error('Customer Name, Contact Number, State, and City are required');
      return;
    }

    // Email validation
    if (!email.trim()) {
      toast.error('Email address is required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Gender validation
    if (!gender) {
      toast.error('Please select the gender');
      return;
    }

    if (name.trim().length > 40) {
      toast.error('Customer Name must be max 40 characters');
      return;
    }

    if (aliasName.trim().length > 40) {
      toast.error('Alias Name must be max 40 characters');
      return;
    }

    // Phone number validation
    const phoneRaw = phone.trim();
    if (!onlyDigits(phoneRaw) || phoneRaw.length !== 10) {
      setPhoneError('Enter correct number');
      toast.error('Phone Number: Enter correct number');
      return;
    }

    // WhatsApp number validation (optional but if provided must be valid)
    const whatsappRaw = whatsappNumber.trim();
    if (whatsappRaw && (!onlyDigits(whatsappRaw) || whatsappRaw.length !== 10)) {
      setWhatsappError('Enter correct number');
      toast.error('WhatsApp Number: Enter correct number');
      return;
    }

    // Format for storage
    const phoneNorm = normalize(phoneRaw);
    const whatsappNorm = whatsappRaw ? normalize(whatsappRaw) : '';

    // Check uniqueness
    const phoneExists = await checkPhoneExists(phoneNorm, customer?.id);
    if (phoneExists) {
      setPhoneError('This number is already registered');
      toast.error('This number is already registered. Phone/WhatsApp number must be unique.');
      return;
    }

    if (whatsappNorm) {
      const whatsappExists = await checkPhoneExists(whatsappNorm, customer?.id);
      if (whatsappExists) {
        setWhatsappError('This number is already registered');
        toast.error('This number is already registered. Phone/WhatsApp number must be unique.');
        return;
      }
    }

    if (pincode.trim() && !/^\d{6}$/.test(pincode.trim())) {
      toast.error('Pincode must be exactly 6 digits');
      return;
    }

    if (address1.trim().length > 40) {
      toast.error('Address 1 must be max 40 characters');
      return;
    }

    if (address2.trim().length > 40) {
      toast.error('Address 2 must be max 40 characters');
      return;
    }

    // Save with formatted phone numbers
    onSave({
      name: name.trim(),
      aliasName: aliasName.trim() || undefined,
      phone: formatDisplay(phoneRaw), // Store as "+91 9876543210"
      phoneNormalized: phoneNorm as any, // Store as "+919876543210" for queries
      email: email.trim(),
      whatsappNumber: whatsappRaw ? formatDisplay(whatsappRaw) : undefined,
      whatsappNormalized: whatsappNorm || undefined as any,
      place: place.trim(),
      address1: address1.trim() || undefined,
      address2: address2.trim() || undefined,
      pincode: pincode.trim() || undefined,
      region: region.trim() || undefined,
      state: state.trim() || undefined,
      country: country.trim() || undefined,
      gender,
      measurements,
    });

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setAliasName('');
    setPhone('');
    setEmail('');
    setWhatsappNumber('');
    setPhoneError('');
    setWhatsappError('');
    setPlace('');
    setAddress1('');
    setAddress2('');
    setPincode('');
    setRegion('none');
    setState('');
    setCountry('India');
    setGender('');
    setMeasurements({});
    setActiveCategory('shirt');
  };

  const updateMeasurement = (
    category: keyof Measurements,
    field: string,
    value: string,
    isText?: boolean
  ) => {
    const parsedValue = isText ? value : (value === '' ? undefined : parseFloat(value));
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {customer ? t('editCustomer') : t('createCustomer')}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-6 overflow-y-auto pr-2 flex-1">
          <div className="space-y-4">
            {/* Customer Code Display */}
            <div className="p-3 bg-muted rounded-lg">
              <Label className="text-sm text-muted-foreground">Customer Code No</Label>
              <p className="text-lg font-semibold">{customer?.id || nextCustomerId || 'Loading...'}</p>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Customer Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={40}
                  placeholder="Enter customer name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="aliasName">Alias Name</Label>
                <Input
                  id="aliasName"
                  value={aliasName}
                  onChange={(e) => setAliasName(e.target.value)}
                  maxLength={40}
                  placeholder="Optional alias name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select value={gender} onValueChange={(v) => setGender(v as Gender)}>
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Contact Number *</Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground pointer-events-none">
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
                    placeholder="Enter a Number"
                    className={`pl-12 ${phoneError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    required
                  />
                </div>
                {phoneError && (
                  <p className="text-xs text-red-500 font-medium">{phoneError}</p>
                )}
                {phone && !phoneError && phone.length === 10 && (
                  <p className="text-xs text-green-600 font-medium">✓ Valid number</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground pointer-events-none">
                    +91
                  </div>
                  <Input
                    id="whatsappNumber"
                    value={whatsappNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setWhatsappNumber(value);
                      if (whatsappError) setWhatsappError('');
                    }}
                    maxLength={10}
                    placeholder="Enter a Number"
                    className={`pl-12 ${whatsappError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                </div>
                {whatsappError && (
                  <p className="text-xs text-red-500 font-medium">{whatsappError}</p>
                )}
                {whatsappNumber && !whatsappError && whatsappNumber.length === 10 && (
                  <p className="text-xs text-green-600 font-medium">✓ Valid number</p>
                )}
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4 pt-4 border-t">
              <Label className="text-base font-semibold">Address Information</Label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address1">Address 1</Label>
                  <Input
                    id="address1"
                    value={address1}
                    onChange={(e) => setAddress1(e.target.value)}
                    maxLength={40}
                    placeholder="Street address"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address2">Address 2</Label>
                  <Input
                    id="address2"
                    value={address2}
                    onChange={(e) => setAddress2(e.target.value)}
                    maxLength={40}
                    placeholder="Apartment, suite, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Select value={state} onValueChange={(value) => {
                    setState(value);
                    setPlace(''); // Clear city when state changes
                  }}>
                    <SelectTrigger id="state">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="place">City *</Label>
                  <Select value={place} onValueChange={setPlace} disabled={!state}>
                    <SelectTrigger id="place">
                      <SelectValue placeholder={state ? "Select city" : "Select state first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(STATE_CITIES[state] || []).map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!state && (
                    <p className="text-xs text-muted-foreground">Please select a state first</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                    maxLength={6}
                    placeholder="6-digit pincode"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="region">Region</Label>
                  <Input
                    id="region"
                    value={region}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={country}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Measurements Card - Professional UI */}
          <Card>
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>Standard Measurements</span>
                <Select defaultValue="Inches">
                  <SelectTrigger className="w-24 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nos">Nos</SelectItem>
                    <SelectItem value="Cms">Cms</SelectItem>
                    <SelectItem value="Inches">Inches</SelectItem>
                  </SelectContent>
                </Select>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {/* Category Tabs - Clean pill design */}
              <div className="flex flex-wrap gap-1.5 mb-4 p-1.5 bg-muted/50 rounded-lg">
                {(Object.keys(MEASUREMENT_FIELDS) as MeasurementCategory[]).map((category) => {
                  const config = MEASUREMENT_FIELDS[category];
                  const count = getCategoryMeasurementCount(category);
                  const Icon = config.icon;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setActiveCategory(category)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                        activeCategory === category
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'hover:bg-background/80 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon size={14} weight={activeCategory === category ? 'fill' : 'regular'} />
                      <span className="hidden sm:inline">{config.label}</span>
                      {count > 0 && (
                        <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                          activeCategory === category
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : 'bg-primary/10 text-primary'
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Active Category Fields - Clean grid layout */}
              <div className="bg-muted/30 rounded-lg p-4 border">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                  {(() => {
                    const Icon = MEASUREMENT_FIELDS[activeCategory].icon;
                    return <Icon size={20} weight="duotone" className="text-primary" />;
                  })()}
                  <h4 className="font-semibold text-sm">
                    {MEASUREMENT_FIELDS[activeCategory].label} Measurements
                  </h4>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {MEASUREMENT_FIELDS[activeCategory].fields.map((field) => (
                    <div key={field.key} className="space-y-1.5">
                      <Label
                        htmlFor={`${activeCategory}-${field.key}`}
                        className="text-xs font-medium text-muted-foreground"
                      >
                        {field.label}
                      </Label>
                      <div className="relative">
                        <Input
                          id={`${activeCategory}-${field.key}`}
                          type={field.type === 'text' ? 'text' : 'number'}
                          step="0.1"
                          min="0"
                          value={getMeasurementValue(activeCategory, field.key)}
                          onChange={(e) =>
                            updateMeasurement(activeCategory, field.key, e.target.value, field.type === 'text')
                          }
                          placeholder="0"
                          className="h-9 pr-8 text-sm"
                        />
                        {field.type !== 'text' && (
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                            in
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Measurement Summary - Shows what's been entered */}
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-xs font-semibold text-green-800 dark:text-green-200 mb-2">
                  Total Measurements
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(MEASUREMENT_FIELDS) as MeasurementCategory[]).map((category) => {
                    const count = getCategoryMeasurementCount(category);
                    if (count === 0) return null;
                    return (
                      <span
                        key={category}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs font-medium"
                      >
                        {MEASUREMENT_FIELDS[category].label}: {count}
                      </span>
                    );
                  })}
                  {Object.values(MEASUREMENT_FIELDS).every((_, i) =>
                    getCategoryMeasurementCount(Object.keys(MEASUREMENT_FIELDS)[i] as MeasurementCategory) === 0
                  ) && (
                    <span className="text-xs text-muted-foreground italic">No measurements entered yet</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t mt-4 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('cancel')}
            </Button>
            <Button type="submit">{t('save')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

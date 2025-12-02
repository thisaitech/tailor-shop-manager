import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, PencilSimple, Trash, UserCircle, MagnifyingGlass, Funnel, DotsThree, Phone, WhatsappLogo, ArrowLeft, User, MapPin, Check, Copy, Spinner } from '@phosphor-icons/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { EmptyState } from './EmptyState';
import { toast } from 'sonner';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { sendWhatsAppMessage } from '@/lib/utils';
import { Vendor, VendorGender, VendorBusinessType } from '@/lib/types';
import {
  addVendor,
  updateVendor,
  deleteVendor,
  getVendorsByCompany,
  findVendorByContactNumber,
  findVendorByEmail,
} from '@/lib/firestore/vendorService';
import { getCompanyProfile } from '@/lib/firestore/companyService';

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

type DateFilter = 'all' | 'exact' | 'range';
const ITEMS_PER_PAGE = 6;

interface VendorManagementProps {
  onBack: () => void;
}

export function VendorManagementFirestore({ onBack }: VendorManagementProps) {
  const { user } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [companyId, setCompanyId] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string>('');
  const [newVendorInfo, setNewVendorInfo] = useState<{ name: string; phone: string }>({ name: '', phone: '' });
  const [deleteVendorId, setDeleteVendorId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [phoneError, setPhoneError] = useState('');

  // Search, filter, and pagination states
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [exactDate, setExactDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [formData, setFormData] = useState<Partial<Vendor>>({
    tailorName: '',
    aliasName: '',
    gender: '' as VendorGender | '',
    businessType: 'stitching',
    email: '',
    address1: '',
    address2: '',
    city: '',
    pincode: '',
    region: '',
    state: '',
    country: 'India',
    contactNumber: '',
    whatsappNumber: '',
  });

  useEffect(() => {
    loadVendors();
  }, [user]);

  const loadVendors = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Get company profile to fetch company ID
      const companyProfile = await getCompanyProfile(user.id);
      if (companyProfile) {
        setCompanyId(companyProfile.id);
        setCompanyName(companyProfile.companyName || 'Tailor Shop');
      }

      // Load vendors
      const fetchedVendors = await getVendorsByCompany(user.id);
      setVendors(fetchedVendors);
    } catch (error) {
      console.error('Error loading vendors:', error);
      toast.error('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  // Date filter logic
  const getDateRange = (filter: DateFilter): { start: Date; end: Date } | null => {
    switch (filter) {
      case 'exact':
        if (!exactDate) return null;
        const exact = new Date(exactDate);
        return { start: startOfDay(exact), end: endOfDay(exact) };
      case 'range':
        if (!startDate || !endDate) return null;
        return { start: startOfDay(new Date(startDate)), end: endOfDay(new Date(endDate)) };
      default:
        return null;
    }
  };

  const filteredVendors = (vendors || []).filter((v) => {
    const matchesSearch =
      v.tailorName.toLowerCase().includes(search.toLowerCase()) ||
      v.contactNumber.includes(search) ||
      (v.city && v.city.toLowerCase().includes(search.toLowerCase())) ||
      (v.tailorCode && v.tailorCode.toLowerCase().includes(search.toLowerCase())) ||
      v.businessType.toLowerCase().includes(search.toLowerCase());

    const dateRange = getDateRange(dateFilter);
    const matchesDate = !dateRange || (v.createdAt && isWithinInterval(new Date(v.createdAt), dateRange));

    return matchesSearch && matchesDate;
  });

  // Sort vendors by creation date (newest first)
  const sortedVendors = filteredVendors.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  // Pagination logic
  const totalPages = Math.ceil(sortedVendors.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedVendors = sortedVendors.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const showPagination = sortedVendors.length > ITEMS_PER_PAGE;

  // Reset to page 1 when filters change
  const handleFilterChange = (filter: DateFilter) => {
    setDateFilter(filter);
    setCurrentPage(1);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const dateFilterOptions: { value: DateFilter; label: string }[] = [
    { value: 'all', label: 'All Tailors' },
    { value: 'exact', label: 'Exact Date' },
    { value: 'range', label: 'Date Range' },
  ];

  const handleAddNew = () => {
    setEditingVendor(null);
    setFormData({
      tailorName: '',
      aliasName: '',
      gender: '' as VendorGender | '',
      businessType: 'stitching',
      email: '',
      address1: '',
      address2: '',
      city: '',
      pincode: '',
      region: '',
      state: '',
      country: 'India',
      contactNumber: '',
      whatsappNumber: '',
    });
    setActiveTab('basic');
    setPhoneError('');
    setShowDialog(true);
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData(vendor);
    setActiveTab('basic');
    setPhoneError('');
    setShowDialog(true);
  };

  const handleDeleteClick = (vendorId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteVendorId(vendorId);
  };

  const confirmDelete = async () => {
    if (!deleteVendorId) return;

    try {
      await deleteVendor(deleteVendorId);
      setVendors(vendors.filter(v => v.id !== deleteVendorId));
      toast.success('Vendor deleted successfully');
      setDeleteVendorId(null);
    } catch (error) {
      console.error('Error deleting vendor:', error);
      toast.error('Failed to delete vendor');
    }
  };

  const handleSave = async () => {
    if (!user?.id || !companyId) {
      toast.error('Company profile not found. Please create a profile first.');
      return;
    }

    // Reset errors
    setPhoneError('');

    // Validation - Basic Tab
    if (!formData.tailorName || !formData.tailorName.trim()) {
      toast.error('Tailor name is required');
      setActiveTab('basic');
      return;
    }

    if (!formData.gender || formData.gender === '') {
      toast.error('Please select the gender');
      setActiveTab('basic');
      return;
    }

    if (!formData.contactNumber) {
      toast.error('Contact number is required');
      setActiveTab('basic');
      return;
    }

    // Validate contact number (exactly 10 digits)
    if (!/^\d{10}$/.test(formData.contactNumber)) {
      setPhoneError('Enter correct number');
      toast.error('Phone Number: Enter correct 10-digit number');
      setActiveTab('basic');
      return;
    }

    // Email validation - mandatory
    if (!formData.email || !formData.email.trim()) {
      toast.error('Email address is required');
      setActiveTab('basic');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Please enter a valid email address');
      setActiveTab('basic');
      return;
    }

    // Address validation - mandatory fields
    if (!formData.address1 || !formData.address1.trim()) {
      toast.error('Address (Shop No / Flat No) is required');
      setActiveTab('address');
      return;
    }

    if (!formData.address2 || !formData.address2.trim()) {
      toast.error('Street / Area / Landmark is required');
      setActiveTab('address');
      return;
    }

    if (!formData.state) {
      toast.error('State is required');
      setActiveTab('address');
      return;
    }

    if (!formData.city) {
      toast.error('City is required');
      setActiveTab('address');
      return;
    }

    // Validate pincode if provided (6 digits)
    if (formData.pincode && !/^\d{6}$/.test(formData.pincode)) {
      toast.error('Pincode must be exactly 6 digits');
      setActiveTab('address');
      return;
    }

    try {
      // Check for duplicate contact number
      const existingByContact = await findVendorByContactNumber(
        formData.contactNumber!,
        user.id,
        editingVendor?.id
      );
      if (existingByContact) {
        toast.error(`Contact number already exists for vendor: ${existingByContact.tailorName}`);
        return;
      }

      // Check for duplicate email
      const existingByEmail = await findVendorByEmail(
        formData.email!,
        user.id,
        editingVendor?.id
      );
      if (existingByEmail) {
        toast.error(`Email address already exists for vendor: ${existingByEmail.tailorName}`);
        return;
      }

      if (editingVendor) {
        // Update existing vendor
        await updateVendor(editingVendor.id, formData);
        setVendors(vendors.map(v => v.id === editingVendor.id ? { ...v, ...formData, updatedAt: Date.now() } : v));
        toast.success('Vendor updated successfully');
      } else {
        // Add new vendor
        const result = await addVendor(
          user.id,
          companyId,
          user.id, // createdBy
          formData as Omit<Vendor, 'id' | 'tailorCode' | 'companyId' | 'companyDocId' | 'createdBy' | 'createdAt' | 'updatedAt' | 'password' | 'passwordHistory' | 'isFirstLogin' | 'lastPasswordChange'>,
          companyName
        );
        setVendors([...vendors, result.vendor]);

        // Show password dialog
        setGeneratedPassword(result.plainPassword);
        setNewVendorInfo({
          name: result.vendor.tailorName,
          phone: result.vendor.contactNumber
        });
        setShowPasswordDialog(true);
      }
      setShowDialog(false);
    } catch (error) {
      console.error('Error saving vendor:', error);
      toast.error('Failed to save vendor');
    }
  };

  // Pagination component
  const Pagination = () => (
    <div className="flex items-center justify-between pt-4 border-t border-purple-200">
      <p className="text-xs sm:text-sm text-gray-600">
        Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, sortedVendors.length)} of {sortedVendors.length}
      </p>
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="h-8 px-2 sm:px-3 text-xs"
        >
          Prev
        </Button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((page) => {
            if (totalPages <= 5) return true;
            if (page === 1 || page === totalPages) return true;
            if (Math.abs(page - currentPage) <= 1) return true;
            return false;
          })
          .map((page, index, array) => {
            const showEllipsis = index > 0 && page - array[index - 1] > 1;
            return (
              <span key={page} className="flex items-center">
                {showEllipsis && <span className="px-1 text-gray-400 text-xs">...</span>}
                <Button
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="h-8 w-8 p-0 text-xs"
                >
                  {page}
                </Button>
              </span>
            );
          })}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="h-8 px-2 sm:px-3 text-xs"
        >
          Next
        </Button>
      </div>
    </div>
  );

  // Filter buttons component
  const FilterButtons = ({ inModal = false }: { inModal?: boolean }) => (
    <div className={`flex flex-wrap gap-2 ${inModal ? '' : 'hidden sm:flex'}`}>
      {dateFilterOptions.map((option) => (
        <Button
          key={option.value}
          variant={dateFilter === option.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleFilterChange(option.value)}
          className={`text-xs ${
            dateFilter === option.value
              ? 'bg-purple-600 hover:bg-purple-700 text-white'
              : 'border-purple-300 text-purple-700 hover:bg-purple-50'
          }`}
        >
          {option.label}
        </Button>
      ))}
      {dateFilter === 'exact' && (
        <Input
          type="date"
          value={exactDate}
          onChange={(e) => {
            setExactDate(e.target.value);
            setCurrentPage(1);
          }}
          className="h-8 w-32 text-xs border-purple-300"
        />
      )}
      {dateFilter === 'range' && (
        <div className="flex gap-1 items-center">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setCurrentPage(1);
            }}
            className="h-8 w-32 text-xs border-purple-300"
          />
          <span className="text-gray-500 text-xs">to</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setCurrentPage(1);
            }}
            className="h-8 w-32 text-xs border-purple-300"
          />
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Spinner size={48} className="animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading job work tailors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl space-y-4">
      {/* Header with Back Button and Title */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Job Work Tailors</h1>
            <p className="text-sm text-muted-foreground">{vendors.length} total tailors</p>
          </div>
        </div>
{vendors.length > 0 && (
          <Button onClick={handleAddNew} className="bg-[#6A64F2] hover:bg-[#5b55e0]">
            <Plus size={18} className="mr-1" />
            Add Tailor
          </Button>
        )}
      </div>

      {/* Search and Filter Row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass
            size={18}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <Input
            type="text"
            placeholder="Search by name, phone, city, code..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 pr-4 h-10 border-purple-300 focus:border-purple-500 focus:ring-purple-500"
          />
        </div>
        {/* Mobile filter button */}
        <Button
          variant="outline"
          size="icon"
          className="sm:hidden border-purple-300"
          onClick={() => setShowFilterModal(true)}
        >
          <Funnel size={18} />
        </Button>
      </div>

      {/* Desktop Filter Buttons */}
      <FilterButtons />

      {/* Vendors List */}
      {sortedVendors.length === 0 ? (
        <EmptyState
          icon={UserCircle}
          title={search ? 'No tailors found' : 'No jobwork tailors added yet'}
          description={search ? 'Try adjusting your search terms' : 'Get started by adding your first jobwork tailor'}
          actionLabel={!search ? 'Add Tailor' : undefined}
          onAction={!search ? handleAddNew : undefined}
        />
      ) : (
        <div
          className="rounded-xl border-2 p-4 space-y-3"
          style={{
            background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 50%, #e0e7ff 100%)',
            borderColor: 'rgba(196, 181, 253, 0.5)',
          }}
        >
          <h3 className="text-base font-semibold text-gray-800">
            {search ? `Search Results (${sortedVendors.length})` : `Job Work Tailors (${sortedVendors.length})`}
          </h3>
          {/* Rectangle cards: 1 col mobile, 2 cols tablet, 3 cols desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {paginatedVendors.map((vendor, index) => (
              <div
                key={vendor.id}
                className={`rounded-xl border-2 hover:shadow-lg transition-all p-4 cursor-pointer w-full flex flex-row gap-4 shadow-sm animate-on-load animate-fade-slide-up stagger-${index + 1}`}
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #faf8ff 100%)',
                  borderColor: '#6A64F2',
                  boxShadow: '0 4px 12px -2px rgba(106, 100, 242, 0.2), 0 2px 6px -2px rgba(106, 100, 242, 0.15)',
                }}
                onClick={() => handleEdit(vendor)}
              >
                {/* Left side: Avatar/Icon */}
                <div className="flex-shrink-0 flex items-center">
                  <div
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)' }}
                  >
                    {getInitials(vendor.tailorName)}
                  </div>
                </div>

                {/* Middle: Vendor details */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm sm:text-base font-semibold text-gray-900 truncate">{vendor.tailorName}</p>
                  </div>
                  <p className="text-[10px] sm:text-xs font-bold text-purple-700 mb-1">{vendor.tailorCode}</p>
                  <div className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-600 flex-wrap">
                    <span className="font-bold text-purple-700">{vendor.contactNumber}</span>
                    <span>•</span>
                    <Badge variant="outline" className="text-[8px] sm:text-[10px] px-1.5 py-0.5 font-semibold bg-purple-100 text-purple-700 border-purple-200 capitalize">
                      {vendor.businessType.replace('_', ' ')}
                    </Badge>
                  </div>
                  {vendor.city && (
                    <p className="text-[9px] sm:text-[10px] text-gray-500 mt-1">
                      {vendor.city}, {vendor.state}
                    </p>
                  )}
                </div>

                {/* Right side: Actions */}
                <div className="flex-shrink-0 flex flex-col items-end justify-between">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 touch-manipulation">
                        <DotsThree size={20} weight="bold" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(vendor); }} className="font-medium">
                        <PencilSimple size={18} className="mr-2" weight="bold" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => handleDeleteClick(vendor.id, e)}
                        className="text-destructive focus:text-destructive font-medium"
                      >
                        <Trash size={18} className="mr-2" weight="bold" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1">
                    <a
                      href={`tel:${vendor.contactNumber}`}
                      className="text-primary hover:text-primary/80 transition-colors p-1.5 touch-manipulation rounded-full hover:bg-purple-100"
                      onClick={(e) => e.stopPropagation()}
                      title="Call"
                    >
                      <Phone size={16} weight="fill" />
                    </a>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        sendWhatsAppMessage(vendor.whatsappNumber || vendor.contactNumber, `Hello ${vendor.tailorName},`);
                      }}
                      className="text-green-600 hover:text-green-700 transition-colors p-1.5 touch-manipulation rounded-full hover:bg-green-100"
                      title="WhatsApp"
                    >
                      <WhatsappLogo size={16} weight="fill" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {showPagination && <Pagination />}
        </div>
      )}

      {/* Mobile Filter Modal */}
      <Dialog open={showFilterModal} onOpenChange={setShowFilterModal}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Filter Tailors</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <FilterButtons inModal />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteVendorId} onOpenChange={() => setDeleteVendorId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tailor?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the tailor from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent
          className="max-w-[95vw] sm:max-w-2xl h-[85vh] flex flex-col p-0 overflow-hidden"
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="px-6 pt-6 pb-4 border-b" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #8b5cf6 100%)', borderColor: 'rgba(196, 181, 253, 0.3)' }}>
            <DialogTitle className="flex items-center gap-3 text-white">
              <span>{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</span>
              {editingVendor && (
                <span className="text-sm font-normal text-white/80 bg-white/20 px-2 py-1 rounded">
                  {editingVendor.tailorCode || editingVendor.id}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
            <div className="px-4 pt-3 pb-2 border-b bg-muted/30 flex-shrink-0">
              <TabsList className="grid grid-cols-2 w-full h-11 p-1 bg-muted rounded-lg">
                <TabsTrigger
                  value="basic"
                  className="flex items-center justify-center gap-1.5 h-9 text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
                >
                  <User size={20} weight="bold" />
                  <span>Basic</span>
                  {formData.tailorName && formData.gender && formData.contactNumber?.length === 10 && formData.businessType && (
                    <Check size={16} className="text-green-600" weight="bold" />
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="address"
                  className="flex items-center justify-center gap-1.5 h-9 text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
                >
                  <MapPin size={20} weight="bold" />
                  <span>Address</span>
                  {formData.address1 && formData.address2 && formData.state && formData.city && (
                    <Check size={16} className="text-green-600" weight="bold" />
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-4 min-h-0">
              {/* Basic Details Tab */}
              <TabsContent value="basic" className="mt-0 space-y-6 h-full">
                <div className="space-y-6">
                  {/* Tailor Name */}
                  <div className="space-y-2">
                    <Label htmlFor="tailorName" className="text-sm font-medium">Tailor Name *</Label>
                    <Input
                      id="tailorName"
                      maxLength={40}
                      value={formData.tailorName}
                      onChange={(e) => setFormData({ ...formData, tailorName: e.target.value })}
                      placeholder="Enter tailor name"
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
                        onClick={() => setFormData({ ...formData, gender: 'male' })}
                        className={cn(
                          'relative flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-all',
                          formData.gender === 'male'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                            : 'border-muted hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/10'
                        )}
                      >
                        {formData.gender === 'male' && (
                          <Check size={16} weight="bold" className="text-blue-600 absolute top-2 right-2" />
                        )}
                        <UserCircle
                          size={44}
                          weight={formData.gender === 'male' ? 'fill' : 'regular'}
                          className={formData.gender === 'male' ? 'text-blue-500' : 'text-muted-foreground'}
                        />
                        <span className={cn(
                          'font-semibold',
                          formData.gender === 'male' ? 'text-blue-600' : 'text-muted-foreground'
                        )}>
                          Male
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, gender: 'female' })}
                        className={cn(
                          'relative flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-all',
                          formData.gender === 'female'
                            ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/30'
                            : 'border-muted hover:border-pink-300 hover:bg-pink-50/50 dark:hover:bg-pink-950/10'
                        )}
                      >
                        {formData.gender === 'female' && (
                          <Check size={16} weight="bold" className="text-pink-600 absolute top-2 right-2" />
                        )}
                        <UserCircle
                          size={44}
                          weight={formData.gender === 'female' ? 'fill' : 'regular'}
                          className={formData.gender === 'female' ? 'text-pink-500' : 'text-muted-foreground'}
                        />
                        <span className={cn(
                          'font-semibold',
                          formData.gender === 'female' ? 'text-pink-600' : 'text-muted-foreground'
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
                        <Label htmlFor="vendorContact" className="text-sm font-medium">Contact Number (Login ID) *</Label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                            +91
                          </div>
                          <Input
                            id="vendorContact"
                            maxLength={10}
                            value={formData.contactNumber}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              setFormData({ ...formData, contactNumber: value });
                              if (phoneError) setPhoneError('');
                            }}
                            placeholder="10-digit number"
                            className={cn('pl-12 h-11 bg-background', phoneError && 'border-red-500')}
                          />
                        </div>
                        {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
                        {formData.contactNumber?.length === 10 && !phoneError && (
                          <p className="text-xs text-green-600 mt-1">Valid number</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="vendorEmail" className="text-sm font-medium">Email *</Label>
                        <Input
                          id="vendorEmail"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="vendor@example.com"
                          className="h-11 bg-background"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Work Information */}
                  <div className="bg-muted/30 rounded-xl p-5 border space-y-5">
                    <h3 className="text-sm font-semibold text-muted-foreground">Work Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {/* Business Type */}
                      <div className="space-y-2">
                        <Label htmlFor="businessType" className="text-sm font-medium">Business Type *</Label>
                        <Select value={formData.businessType} onValueChange={(value: VendorBusinessType) => setFormData({ ...formData, businessType: value })}>
                          <SelectTrigger id="businessType" className="h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="stitching">Stitching</SelectItem>
                            <SelectItem value="aari_work">Aari Work</SelectItem>
                            <SelectItem value="stitching_aari_work">Stitching & Aari Work</SelectItem>
                            <SelectItem value="others">Others</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Address Tab */}
              <TabsContent value="address" className="mt-0 h-full">
                <div className="space-y-5">
                  {/* Shop/Flat Number */}
                  <div className="space-y-2">
                    <Label htmlFor="vendorAddress1" className="text-sm font-medium">
                      Shop No / Flat No *
                    </Label>
                    <Input
                      id="vendorAddress1"
                      maxLength={40}
                      value={formData.address1}
                      onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
                      placeholder="e.g., Shop 12, Flat 4B, Door No. 25"
                      className="h-11"
                    />
                  </div>

                  {/* Street / Area / Landmark */}
                  <div className="space-y-2">
                    <Label htmlFor="vendorAddress2" className="text-sm font-medium">
                      Street / Area / Landmark *
                    </Label>
                    <Input
                      id="vendorAddress2"
                      maxLength={40}
                      value={formData.address2}
                      onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
                      placeholder="e.g., Main Road, Near Bus Stand"
                      className="h-11"
                    />
                  </div>

                  {/* State and City in same row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vendorState" className="text-sm font-medium">State *</Label>
                      <Select
                        value={formData.state}
                        onValueChange={(value) => setFormData({ ...formData, state: value, city: '' })}
                      >
                        <SelectTrigger id="vendorState" className="h-11">
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {INDIAN_STATES.map((state) => (
                            <SelectItem key={state} value={state}>{state}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vendorCity" className="text-sm font-medium">City *</Label>
                      <Select
                        value={formData.city}
                        onValueChange={(value) => setFormData({ ...formData, city: value })}
                        disabled={!formData.state}
                      >
                        <SelectTrigger id="vendorCity" className="h-11">
                          <SelectValue placeholder={formData.state ? "Select city" : "Select state first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {(STATE_CITIES[formData.state || ''] || []).map((city) => (
                            <SelectItem key={city} value={city}>{city}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Pincode */}
                  <div className="space-y-2 max-w-[200px]">
                    <Label htmlFor="vendorPincode" className="text-sm font-medium">Pincode</Label>
                    <Input
                      id="vendorPincode"
                      maxLength={6}
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '') })}
                      placeholder="e.g., 600001"
                      className="h-11"
                    />
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          {/* Footer with action buttons */}
          <div className="flex justify-between items-center gap-3 px-4 sm:px-6 py-4 border-t flex-shrink-0" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #8b5cf6 100%)', borderColor: 'rgba(196, 181, 253, 0.3)' }}>
            <Button type="button" variant="ghost" onClick={() => setShowDialog(false)} className="text-white hover:text-white/80 hover:bg-white/10">
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              {activeTab === 'address' && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setActiveTab('basic')}
                  className="border border-white/30 text-white hover:text-white hover:bg-white/10 bg-transparent"
                >
                  Back
                </Button>
              )}
              {activeTab === 'basic' && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setActiveTab('address')}
                  className="border border-white/30 text-white hover:text-white hover:bg-white/10 bg-transparent"
                >
                  Next
                </Button>
              )}
              <Button onClick={handleSave} className="min-w-[120px] bg-white text-purple-700 hover:bg-white/90">
                {editingVendor ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Display Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tailor Password</DialogTitle>
            <DialogDescription>
              Save this password securely. The tailor will use this to log in.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">Auto-generated Password:</p>
              <code className="text-2xl font-mono font-bold text-blue-900 bg-white px-4 py-2 rounded border-2 border-blue-300">
                {generatedPassword}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(generatedPassword);
                  toast.success('Password copied!');
                }}
                className="mt-4 gap-2"
              >
                <Copy size={16} />
                Copy Password
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Make sure to save this password. You can reset it later if needed.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowPasswordDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

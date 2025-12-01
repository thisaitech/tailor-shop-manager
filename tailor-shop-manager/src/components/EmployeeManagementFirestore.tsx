import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { EmployeeRole, EmployeeGender } from '@/lib/types';
import {
  addEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeesByCompany,
  toggleEmployeeStatus,
  resetEmployeePassword,
  generateEmployeePassword,
  EmployeeWithCompany,
  findEmployeeByContactNumber,
  findEmployeeByEmail,
} from '@/lib/firestore/employeeService';
import { getCompanyProfile } from '@/lib/firestore/companyService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
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
import { ArrowLeft, Plus, PencilSimple, Trash, CheckSquare, Key, Copy, MagnifyingGlass, Funnel, DotsThree, Phone, WhatsappLogo, UserCircle, User, MapPin, Check, Spinner } from '@phosphor-icons/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { EmptyState } from './EmptyState';
import { toast } from 'sonner';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { sendWhatsAppMessage } from '@/lib/utils';

type DateFilter = 'all' | 'exact' | 'range';
const ITEMS_PER_PAGE = 6;

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

interface EmployeeManagementFirestoreProps {
  onBack: () => void;
}

export function EmployeeManagementFirestore({ onBack }: EmployeeManagementFirestoreProps) {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<EmployeeWithCompany[]>([]);
  const [companyId, setCompanyId] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newEmployeePassword, setNewEmployeePassword] = useState('');
  const [editingEmployee, setEditingEmployee] = useState<EmployeeWithCompany | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateEmployee, setDuplicateEmployee] = useState<EmployeeWithCompany | null>(null);
  const [phoneError, setPhoneError] = useState('');
  const [deleteEmployeeId, setDeleteEmployeeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('basic');

  // Search, filter, and pagination states
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [exactDate, setExactDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [formData, setFormData] = useState({
    name: '',
    aliasName: '',
    gender: '' as EmployeeGender | '',
    profilePicture: '',
    email: '',
    contactNumber: '',
    whatsappNumber: '',
    address1: '',
    address2: '',
    city: '',
    pincode: '',
    state: '',
    role: 'staff' as EmployeeRole,
    designation: '',
    joiningDate: Date.now(),
    isActive: true,
  });


  // Load company ID and employees
  useEffect(() => {
    async function loadData() {
      if (!user?.id) return;

      setLoading(true);
      try {
        // Get company profile to get company ID and name
        const profile = await getCompanyProfile(user.id);
        if (profile) {
          setCompanyId(profile.id);
          setCompanyName(profile.companyName || '');
        }

        // Load employees
        const employeesList = await getEmployeesByCompany(user.id);
        setEmployees(employeesList);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load employees');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user?.id]);

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

  const filteredEmployees = (employees || []).filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.contactNumber.includes(search) ||
      (e.email && e.email.toLowerCase().includes(search.toLowerCase())) ||
      e.role.toLowerCase().includes(search.toLowerCase());

    const dateRange = getDateRange(dateFilter);
    const matchesDate = !dateRange || (e.createdAt && isWithinInterval(new Date(e.createdAt), dateRange));

    return matchesSearch && matchesDate;
  });

  // Sort employees by creation date (newest first)
  const sortedEmployees = filteredEmployees.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  // Pagination logic
  const totalPages = Math.ceil(sortedEmployees.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedEmployees = sortedEmployees.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const showPagination = sortedEmployees.length > ITEMS_PER_PAGE;

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
    { value: 'all', label: 'All Employees' },
    { value: 'exact', label: 'Exact Date' },
    { value: 'range', label: 'Date Range' },
  ];

  const handleOpenDialog = (employee?: EmployeeWithCompany) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        name: employee.name,
        aliasName: employee.aliasName || '',
        gender: employee.gender,
        profilePicture: employee.profilePicture || '',
        email: employee.email || '',
        contactNumber: employee.contactNumber,
        whatsappNumber: employee.whatsappNumber || '',
        address1: employee.address1 || '',
        address2: employee.address2 || '',
        city: employee.city || '',
        pincode: employee.pincode || '',
        state: employee.state || '',
        role: employee.role,
        designation: employee.designation || '',
        joiningDate: employee.joiningDate,
        isActive: employee.isActive,
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        name: '',
        aliasName: '',
        gender: '',
        profilePicture: '',
        email: '',
        contactNumber: '',
        whatsappNumber: '',
        address1: '',
        address2: '',
        city: '',
        pincode: '',
        state: '',
        role: 'staff',
        designation: '',
        joiningDate: Date.now(),
        isActive: true,
      });
    }
    setActiveTab('basic');
    setPhoneError('');
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingEmployee(null);
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };


  const handleSave = async () => {
    if (!user?.id || !companyId) {
      toast.error('Company profile not found. Please create a profile first.');
      return;
    }

    // Reset errors
    setPhoneError('');

    // Validation
    if (!formData.name) {
      toast.error('Employee name is required');
      return;
    }

    if (!formData.gender || formData.gender === '') {
      toast.error('Please select the gender');
      return;
    }

    if (!formData.contactNumber) {
      toast.error('Contact number is required');
      return;
    }

    // Validate contact number (exactly 10 digits)
    if (!/^\d{10}$/.test(formData.contactNumber)) {
      setPhoneError('Enter correct number');
      toast.error('Phone Number: Enter correct number');
      return;
    }

    // Validate pincode (6 digits)
    if (formData.pincode && !/^\d{6}$/.test(formData.pincode)) {
      toast.error('Pincode must be exactly 6 digits');
      return;
    }

    // Email validation - mandatory
    if (!formData.email || !formData.email.trim()) {
      toast.error('Email address is required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Please enter a valid email address');
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

    try {
      // Check for duplicate contact number
      const existingByContact = await findEmployeeByContactNumber(
        formData.contactNumber,
        user.id,
        editingEmployee?.id
      );
      if (existingByContact) {
        setPhoneError('This number already exists');
        toast.error(`Contact number already exists for: ${existingByContact.name}`);
        return;
      }

      // Check for duplicate email
      const existingByEmail = await findEmployeeByEmail(
        formData.email!,
        user.id,
        editingEmployee?.id
      );
      if (existingByEmail) {
        toast.error(`Email address already exists for: ${existingByEmail.name}`);
        return;
      }

      if (editingEmployee) {
        // Update existing employee
        await updateEmployee(editingEmployee.id, formData);

        const updatedEmployees = employees.map(emp =>
          emp.id === editingEmployee.id
            ? { ...emp, ...formData, updatedAt: Date.now() }
            : emp
        );
        setEmployees(updatedEmployees);
        toast.success('Employee updated successfully!');
        handleCloseDialog();
      } else {
        // Add new employee
        const newEmployee = await addEmployee(user.id, companyId, user.id, formData as any, companyName);
        setEmployees([...employees, newEmployee]);

        // Show password dialog
        setNewEmployeePassword(newEmployee.password);
        setShowPasswordDialog(true);

        // Show success message with email notification status
        if (formData.role === 'tailor' && formData.email) {
          toast.success('Tailor added successfully! Login credentials sent to email.');
        } else {
          toast.success('Employee added successfully!');
        }
        handleCloseDialog();
      }
    } catch (error: any) {
      console.error('Error saving employee:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      toast.error(`Failed to save employee: ${errorMessage}`);
    }
  };

  const handleUpdateExisting = async () => {
    if (!duplicateEmployee) return;

    try {
      await updateEmployee(duplicateEmployee.id, formData);

      const updatedEmployees = employees.map(emp =>
        emp.id === duplicateEmployee.id
          ? { ...emp, ...formData, updatedAt: Date.now() }
          : emp
      );
      setEmployees(updatedEmployees);
      toast.success('Employee updated successfully!');
      setShowDuplicateDialog(false);
      setDuplicateEmployee(null);
      handleCloseDialog();
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error('Failed to update employee. Please try again.');
    }
  };

  const handleCreateNew = async () => {
    if (!user?.id || !companyId) return;

    try {
      // Force create new employee even with duplicate contact number
      const newEmployee = await addEmployee(user.id, companyId, user.id, formData);
      setEmployees([...employees, newEmployee]);

      // Show password dialog
      setNewEmployeePassword(newEmployee.password);
      setShowPasswordDialog(true);
      toast.success('Employee added successfully!');
      setShowDuplicateDialog(false);
      setDuplicateEmployee(null);
      handleCloseDialog();
    } catch (error) {
      console.error('Error creating employee:', error);
      toast.error('Failed to create employee. Please try again.');
    }
  };

  const handleDeleteClick = (employeeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteEmployeeId(employeeId);
  };

  const confirmDelete = async () => {
    if (!deleteEmployeeId) return;

    try {
      await deleteEmployee(deleteEmployeeId);
      setEmployees(employees.filter(emp => emp.id !== deleteEmployeeId));
      toast.success('Employee deleted successfully!');
      setDeleteEmployeeId(null);
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('Failed to delete employee');
    }
  };

  const handleToggleStatus = async (employee: EmployeeWithCompany) => {
    try {
      await toggleEmployeeStatus(employee.id, !employee.isActive);

      const updatedEmployees = employees.map(emp =>
        emp.id === employee.id
          ? { ...emp, isActive: !emp.isActive, updatedAt: Date.now() }
          : emp
      );
      setEmployees(updatedEmployees);
      toast.success(`Employee ${employee.isActive ? 'deactivated' : 'activated'} successfully!`);
    } catch (error) {
      console.error('Error toggling employee status:', error);
      toast.error('Failed to update employee status');
    }
  };

  const handleResetPassword = async (employeeId: string) => {
    if (!window.confirm('Are you sure you want to reset this employee\'s password?')) {
      return;
    }

    try {
      const newPassword = await resetEmployeePassword(employeeId);
      setNewEmployeePassword(newPassword);
      setShowPasswordDialog(true);
      toast.success('Password reset successfully!');
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Failed to reset password');
    }
  };

  const copyPasswordToClipboard = () => {
    navigator.clipboard.writeText(newEmployeePassword);
    toast.success('Password copied to clipboard!');
  };

  // Filter buttons component
  const FilterButtons = ({ inModal = false }: { inModal?: boolean }) => (
    <div className="space-y-3">
      {/* Filter Type Selection */}
      <div className={`flex gap-1.5 ${inModal ? 'flex-wrap' : 'overflow-x-auto pb-1 scrollbar-hide'}`}>
        {dateFilterOptions.map((option) => (
          <Button
            key={option.value}
            variant={dateFilter === option.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              handleFilterChange(option.value);
              if (inModal && option.value === 'all') setShowFilterModal(false);
            }}
            className="text-xs font-semibold whitespace-nowrap touch-manipulation h-8 px-3"
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Exact Date Picker */}
      {dateFilter === 'exact' && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">Select Date</label>
          <Input
            type="date"
            value={exactDate}
            onChange={(e) => setExactDate(e.target.value)}
            className={`h-10 text-sm ${inModal ? 'w-full' : ''}`}
            placeholder="Select date"
          />
          {exactDate && (
            <p className="text-xs text-muted-foreground">
              Showing {filteredEmployees.length} employee(s) on {format(new Date(exactDate), 'MMM dd, yyyy')}
            </p>
          )}

          {inModal && exactDate && (
            <Button
              onClick={() => setShowFilterModal(false)}
              className="w-full h-10 font-semibold text-sm"
            >
              Apply Filter
            </Button>
          )}

          {inModal && exactDate && (
            <Button
              variant="outline"
              onClick={() => {
                setExactDate('');
                handleFilterChange('all');
              }}
              className="w-full h-10 font-semibold text-sm"
            >
              Reset Filter
            </Button>
          )}
        </div>
      )}

      {/* Date Range Picker */}
      {dateFilter === 'range' && (
        <div className="space-y-3">
          <label className="text-xs font-medium text-foreground">Date Range Filter</label>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">From Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 text-sm w-full"
              placeholder="Select start date"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">To Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="h-10 text-sm w-full"
              placeholder="Select end date"
            />
          </div>

          {startDate && endDate && (
            <p className="text-xs text-muted-foreground">
              Showing {filteredEmployees.length} employee(s) from {format(new Date(startDate), 'MMM dd')} to {format(new Date(endDate), 'MMM dd, yyyy')}
            </p>
          )}

          {inModal && startDate && endDate && (
            <Button
              onClick={() => setShowFilterModal(false)}
              className="w-full h-10 font-semibold text-sm"
            >
              Apply Filter
            </Button>
          )}

          {inModal && (startDate || endDate) && (
            <Button
              variant="outline"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                handleFilterChange('all');
              }}
              className="w-full h-10 font-semibold text-sm"
            >
              Reset Filter
            </Button>
          )}
        </div>
      )}
    </div>
  );

  // Pagination component
  const Pagination = () => (
    <div className="flex items-center justify-center gap-2 pt-3">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
        disabled={currentPage === 1}
        className="h-8 px-3 text-xs font-semibold"
      >
        Previous
      </Button>
      <span className="text-xs text-muted-foreground font-medium">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        disabled={currentPage === totalPages}
        className="h-8 px-3 text-xs font-semibold"
      >
        Next
      </Button>
    </div>
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Spinner size={48} className="animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading employees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header with Back Button */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9">
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-lg sm:text-xl font-bold">Employee Management</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{employees.length} employees</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:gap-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <MagnifyingGlass
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={20}
            />
            <Input
              placeholder="Search employees by name, phone, email or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 touch-manipulation"
            />
          </div>
          <Button onClick={() => handleOpenDialog()} className="h-10 font-semibold touch-manipulation px-4 text-xs sm:text-sm whitespace-nowrap min-w-[100px] sm:min-w-[120px]">
            <Plus size={18} className="mr-1.5" weight="bold" />
            Add Employee
          </Button>
        </div>

        {/* Mobile: Filter button that opens modal */}
        <div className="sm:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilterModal(true)}
            className="text-xs font-semibold touch-manipulation h-8 px-3 w-full justify-between"
          >
            <span className="flex items-center gap-1.5">
              <Funnel size={14} weight="bold" />
              Filter: {dateFilterOptions.find(o => o.value === dateFilter)?.label}
            </span>
            <Badge variant="secondary" className="text-[10px]">{filteredEmployees.length}</Badge>
          </Button>
        </div>

        {/* Desktop: Inline filter buttons */}
        <div className="hidden sm:block">
          <FilterButtons />
        </div>
      </div>

      {filteredEmployees.length === 0 ? (
        <EmptyState
          icon={UserCircle}
          title={search ? 'No employees found' : 'No employees added yet'}
          description={search ? 'Try adjusting your search terms' : 'Get started by adding your first employee'}
          actionLabel={!search ? 'Add Employee' : undefined}
          onAction={!search ? () => handleOpenDialog() : undefined}
        />
      ) : (
        <div
          className="p-3 sm:p-4 w-full max-w-full flex flex-col gap-4 overflow-hidden rounded-xl border shadow-md"
          style={{
            background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 50%, #e0e7ff 100%)',
            borderColor: 'rgba(196, 181, 253, 0.5)'
          }}
        >
          <h3 className="text-base font-semibold text-gray-800">
            {search ? `Search Results (${sortedEmployees.length})` : `Employees (${sortedEmployees.length})`}
          </h3>
          {/* Rectangle cards: 1 col mobile, 2 cols tablet, 3 cols desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {paginatedEmployees.map((employee, index) => (
              <div
                key={employee.id}
                className={`rounded-xl border-2 hover:shadow-lg transition-all p-4 cursor-pointer w-full flex flex-row gap-4 shadow-sm animate-on-load animate-fade-slide-up stagger-${index + 1} ${!employee.isActive ? 'opacity-60' : ''}`}
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #faf8ff 100%)',
                  borderColor: '#6A64F2',
                  boxShadow: '0 4px 12px -2px rgba(106, 100, 242, 0.2), 0 2px 6px -2px rgba(106, 100, 242, 0.15)'
                }}
                onClick={() => handleOpenDialog(employee)}
              >
                {/* Left side: Avatar/Icon */}
                <div className="flex-shrink-0 flex items-center">
                  <div
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)' }}
                  >
                    {getInitials(employee.name)}
                  </div>
                </div>

                {/* Middle: Employee details */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm sm:text-base font-semibold text-gray-900 truncate">{employee.name}</p>
                    {!employee.isActive && (
                      <Badge variant="outline" className="text-[8px] px-1.5 py-0.5 font-semibold bg-red-100 text-red-700 border-red-200">
                        INACTIVE
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-xs font-bold text-purple-700 mb-1">{employee.employeeCode || employee.id}</p>
                  <div className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-600 flex-wrap">
                    <span className="font-bold text-purple-700">{employee.contactNumber}</span>
                    <span>•</span>
                    <Badge variant="outline" className="text-[8px] sm:text-[10px] px-1.5 py-0.5 font-semibold bg-purple-100 text-purple-700 border-purple-200 capitalize">
                      {employee.role}
                    </Badge>
                  </div>
                  {employee.joiningDate && (
                    <p className="text-[9px] sm:text-[10px] text-gray-500 mt-1">
                      Joined: {format(new Date(employee.joiningDate), 'MMM dd, yyyy')}
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
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenDialog(employee); }} className="font-medium">
                        <PencilSimple size={18} className="mr-2" weight="bold" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleResetPassword(employee.id); }} className="font-medium">
                        <Key size={18} className="mr-2" weight="bold" />
                        Reset Password
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleToggleStatus(employee); }} className="font-medium">
                        <CheckSquare size={18} className="mr-2" weight="bold" />
                        {employee.isActive ? 'Deactivate' : 'Activate'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => handleDeleteClick(employee.id, e)}
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
                      href={`tel:${employee.contactNumber}`}
                      className="text-primary hover:text-primary/80 transition-colors p-1.5 touch-manipulation rounded-full hover:bg-purple-100"
                      onClick={(e) => e.stopPropagation()}
                      title="Call"
                    >
                      <Phone size={16} weight="fill" />
                    </a>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        sendWhatsAppMessage(employee.whatsappNumber || employee.contactNumber, `Hello ${employee.name},`);
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteEmployeeId !== null} onOpenChange={() => setDeleteEmployeeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this employee? This action cannot be undone.
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

      {/* Mobile Filter Modal */}
      <Dialog open={showFilterModal} onOpenChange={setShowFilterModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Filter by Date</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <FilterButtons inModal />
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Employee Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent
          className="max-w-2xl h-[85vh] flex flex-col p-0 overflow-hidden"
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="px-6 pt-6 pb-4 border-b" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #8b5cf6 100%)', borderColor: 'rgba(196, 181, 253, 0.3)' }}>
            <DialogTitle className="flex items-center gap-3 text-white">
              <span>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</span>
              {editingEmployee && (
                <span className="text-sm font-normal text-white/80 bg-white/20 px-2 py-1 rounded">
                  {editingEmployee.employeeCode || editingEmployee.id}
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
                  {formData.name && formData.gender && formData.contactNumber.length === 10 && formData.role && (
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

            <div className="flex-1 overflow-y-auto px-6 py-4 min-h-[400px]">
              {/* Basic Details Tab */}
              <TabsContent value="basic" className="mt-0 space-y-6 h-full">
                <div className="space-y-6">
                  {/* Employee Name */}
                  <div className="space-y-2">
                    <Label htmlFor="empName" className="text-sm font-medium">Employee Name *</Label>
                    <Input
                      id="empName"
                      maxLength={40}
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="Enter employee name"
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
                        onClick={() => handleChange('gender', 'male')}
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
                        onClick={() => handleChange('gender', 'female')}
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
                        <Label htmlFor="empContact" className="text-sm font-medium">Contact Number (Login ID) *</Label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                            +91
                          </div>
                          <Input
                            id="empContact"
                            maxLength={10}
                            value={formData.contactNumber}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              handleChange('contactNumber', value);
                              if (phoneError) setPhoneError('');
                            }}
                            placeholder="10-digit number"
                            className={cn('pl-12 h-11 bg-background', phoneError && 'border-red-500')}
                          />
                        </div>
                        {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
                        {formData.contactNumber.length === 10 && !phoneError && (
                          <p className="text-xs text-green-600 mt-1">Valid number</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="empEmail" className="text-sm font-medium">Email *</Label>
                        <Input
                          id="empEmail"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleChange('email', e.target.value)}
                          placeholder="employee@example.com"
                          className="h-11 bg-background"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Work Information */}
                  <div className="bg-muted/30 rounded-xl p-5 border space-y-5">
                    <h3 className="text-sm font-semibold text-muted-foreground">Work Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {/* Role */}
                      <div className="space-y-2">
                        <Label htmlFor="empRole" className="text-sm font-medium">Role *</Label>
                        <Select
                          value={formData.role}
                          onValueChange={(value) => handleChange('role', value)}
                        >
                          <SelectTrigger id="empRole" className="h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="accountant">Accountant</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="tailor">Tailor</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Designation */}
                      <div className="space-y-2">
                        <Label htmlFor="empDesignation" className="text-sm font-medium">Designation</Label>
                        <Input
                          id="empDesignation"
                          value={formData.designation}
                          onChange={(e) => handleChange('designation', e.target.value)}
                          placeholder="Enter designation"
                          className="h-11"
                        />
                      </div>

                      {/* Joining Date */}
                      <div className="space-y-2">
                        <Label htmlFor="empJoiningDate" className="text-sm font-medium">Joining Date *</Label>
                        <Input
                          id="empJoiningDate"
                          type="date"
                          value={format(formData.joiningDate || Date.now(), 'yyyy-MM-dd')}
                          onChange={(e) => handleChange('joiningDate', new Date(e.target.value).getTime())}
                          className="h-11"
                        />
                      </div>

                      {/* Active Status */}
                      <div className="space-y-2 flex items-end">
                        <div className="flex items-center gap-3 h-11">
                          <input
                            type="checkbox"
                            id="isActive"
                            checked={formData.isActive ?? true}
                            onChange={(e) => handleChange('isActive', e.target.checked)}
                            className="w-5 h-5 rounded border-gray-300"
                          />
                          <Label htmlFor="isActive" className="cursor-pointer font-medium">Active Employee</Label>
                        </div>
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
                    <Label htmlFor="empAddress1" className="text-sm font-medium">
                      Shop No / Flat No *
                    </Label>
                    <Input
                      id="empAddress1"
                      maxLength={40}
                      value={formData.address1}
                      onChange={(e) => handleChange('address1', e.target.value)}
                      placeholder="e.g., Shop 12, Flat 4B, Door No. 25"
                      className="h-11"
                    />
                  </div>

                  {/* Street / Area / Landmark */}
                  <div className="space-y-2">
                    <Label htmlFor="empAddress2" className="text-sm font-medium">
                      Street / Area / Landmark *
                    </Label>
                    <Input
                      id="empAddress2"
                      maxLength={40}
                      value={formData.address2}
                      onChange={(e) => handleChange('address2', e.target.value)}
                      placeholder="e.g., Main Road, Near Bus Stand"
                      className="h-11"
                    />
                  </div>

                  {/* State and City in same row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="empState" className="text-sm font-medium">State *</Label>
                      <Select
                        value={formData.state}
                        onValueChange={(value) => {
                          handleChange('state', value);
                          handleChange('city', '');
                        }}
                      >
                        <SelectTrigger id="empState" className="h-11">
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
                      <Label htmlFor="empCity" className="text-sm font-medium">City *</Label>
                      <Select
                        value={formData.city}
                        onValueChange={(value) => handleChange('city', value)}
                        disabled={!formData.state}
                      >
                        <SelectTrigger id="empCity" className="h-11">
                          <SelectValue placeholder={formData.state ? "Select city" : "Select state first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {(STATE_CITIES[formData.state] || []).map((city) => (
                            <SelectItem key={city} value={city}>{city}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Pincode */}
                  <div className="space-y-2 max-w-[200px]">
                    <Label htmlFor="empPincode" className="text-sm font-medium">Pincode</Label>
                    <Input
                      id="empPincode"
                      maxLength={6}
                      value={formData.pincode}
                      onChange={(e) => handleChange('pincode', e.target.value.replace(/\D/g, ''))}
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
            <Button type="button" variant="ghost" onClick={handleCloseDialog} className="text-white hover:text-white/80 hover:bg-white/10">
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              {activeTab === 'address' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab('basic')}
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  Back
                </Button>
              )}
              {activeTab === 'basic' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab('address')}
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  Next
                </Button>
              )}
              <Button onClick={handleSave} className="min-w-[120px] bg-white text-purple-700 hover:bg-white/90">
                {editingEmployee ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Display Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Employee Password</DialogTitle>
            <DialogDescription>
              Save this password securely. The employee will use this to log in.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">Auto-generated Password:</p>
              <code className="text-2xl font-mono font-bold text-blue-900 bg-white px-4 py-2 rounded border-2 border-blue-300">
                {newEmployeePassword}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={copyPasswordToClipboard}
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

      {/* Duplicate Employee Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Employee Already Exists</DialogTitle>
            <DialogDescription>
              An employee with this contact number already exists. What would you like to do?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium mb-2">Existing Employee:</p>
              {duplicateEmployee && (
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">Employee Code:</span> {duplicateEmployee.employeeCode}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Name:</span> {duplicateEmployee.name}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Contact:</span> {duplicateEmployee.contactNumber}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Role:</span>{' '}
                    {duplicateEmployee.role.charAt(0).toUpperCase() + duplicateEmployee.role.slice(1)}
                  </div>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              You can update the existing employee record with the new information, or create a new employee with the same contact number.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDuplicateDialog(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handleCreateNew}>
              Create New
            </Button>
            <Button onClick={handleUpdateExisting}>
              Update Existing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

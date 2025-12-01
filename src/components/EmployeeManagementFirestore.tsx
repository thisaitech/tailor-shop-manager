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
  findEmployeeByWhatsAppNumber,
} from '@/lib/firestore/employeeService';
import { getCompanyProfile } from '@/lib/firestore/companyService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Plus, PencilSimple, Trash, CheckSquare, Eye, EyeSlash, Key, Copy, Spinner } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { format } from 'date-fns';

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
const DEFAULT_STATE = 'Tamil Nadu';
const DEFAULT_CITY = 'Tirunelveli';

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
  const [whatsappError, setWhatsappError] = useState('');
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
    city: DEFAULT_CITY,
    pincode: '',
    region: 'none',
    state: DEFAULT_STATE,
    country: 'India',
    role: 'tailor' as EmployeeRole,
    designation: '',
    joiningDate: Date.now(),
    accessPermissions: [] as string[],
    accessPermissionEnabled: true,
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
        city: employee.city || (employee.state === DEFAULT_STATE ? DEFAULT_CITY : ''),
        pincode: employee.pincode || '',
        region: employee.region || '',
        state: employee.state || DEFAULT_STATE,
        country: employee.country || 'India',
        role: employee.role,
        designation: employee.designation || '',
        joiningDate: employee.joiningDate,
        accessPermissions: employee.accessPermissions,
        accessPermissionEnabled: employee.accessPermissionEnabled,
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
        city: DEFAULT_CITY,
        pincode: '',
        region: 'none',
        state: DEFAULT_STATE,
        country: 'India',
        role: 'tailor',
        designation: '',
        joiningDate: Date.now(),
        accessPermissions: [],
        accessPermissionEnabled: true,
        isActive: true,
      });
    }
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
    setWhatsappError('');

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

    // Validate whatsapp number (exactly 10 digits if provided)
    if (formData.whatsappNumber && !/^\d{10}$/.test(formData.whatsappNumber)) {
      setWhatsappError('Enter correct number');
      toast.error('WhatsApp Number: Enter correct number');
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

    try {
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
        // Check for duplicate contact number
        const existingEmployee = await findEmployeeByContactNumber(formData.contactNumber, user.id);

        if (existingEmployee) {
          setPhoneError('This number already exists');
          toast.error('Phone Number: This number already exists');
          return;
        }

        // Check for duplicate WhatsApp number (if provided)
        if (formData.whatsappNumber) {
          const existingWhatsAppEmployee = await findEmployeeByWhatsAppNumber(formData.whatsappNumber, user.id);

          if (existingWhatsAppEmployee) {
            setWhatsappError('This number already exists');
            toast.error('WhatsApp Number: This number already exists');
            return;
          }
        }

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
    } catch (error) {
      console.error('Error saving employee:', error);
      toast.error('Failed to save employee. Please try again.');
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

  const handleDelete = async (employeeId: string) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) {
      return;
    }

    try {
      await deleteEmployee(employeeId);
      setEmployees(employees.filter(emp => emp.id !== employeeId));
      toast.success('Employee deleted successfully!');
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
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft size={20} />
          Back
        </Button>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus size={20} />
          Add Employee
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee List</CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No employees added yet.</p>
              <p className="text-sm mt-2">Click "Add Employee" to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {employees.map(employee => (
                <Card key={employee.id} className={!employee.isActive ? 'opacity-60' : ''}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{employee.name}</h3>
                          {!employee.isActive && (
                            <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Employee ID:</span> {employee.id}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Company ID:</span> {employee.companyId}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Role:</span>{' '}
                            {employee.role.charAt(0).toUpperCase() + employee.role.slice(1)}
                          </div>
                          {employee.designation && (
                            <div>
                              <span className="text-muted-foreground">Designation:</span> {employee.designation}
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground">Contact:</span> {employee.contactNumber}
                          </div>
                          {employee.email && (
                            <div>
                              <span className="text-muted-foreground">Email:</span> {employee.email}
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground">Joined:</span>{' '}
                            {format(employee.joiningDate, 'dd MMM yyyy')}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Password:</span>{' '}
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs">{employee.password}</code>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResetPassword(employee.id)}
                          title="Reset Password"
                        >
                          <Key size={16} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(employee)}
                          title={employee.isActive ? 'Deactivate' : 'Activate'}
                        >
                          <CheckSquare size={16} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(employee)}
                        >
                          <PencilSimple size={16} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(employee.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash size={16} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Employee Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
            <DialogDescription>
              {editingEmployee
                ? 'Update employee information and permissions'
                : 'Enter employee details and assign permissions (Password will be auto-generated)'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Employee Name */}
              <div className="space-y-2">
                <Label htmlFor="empName">Employee Name *</Label>
                <Input
                  id="empName"
                  maxLength={40}
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Enter employee name"
                />
              </div>

              {/* Alias Name */}
              <div className="space-y-2">
                <Label htmlFor="empAliasName">Alias Name</Label>
                <Input
                  id="empAliasName"
                  maxLength={40}
                  value={formData.aliasName}
                  onChange={(e) => handleChange('aliasName', e.target.value)}
                  placeholder="Enter alias name"
                />
              </div>

              {/* Gender */}
              <div className="space-y-2">
                <Label htmlFor="empGender">Gender *</Label>
                <Select
                  value={formData.gender || undefined}
                  onValueChange={(value: EmployeeGender) => handleChange('gender', value)}
                >
                  <SelectTrigger id="empGender">
                    <SelectValue placeholder="Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Contact Number */}
              <div className="space-y-2">
                <Label htmlFor="empContact">Contact Number (Login ID) *</Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground pointer-events-none">
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
                    placeholder="Enter a Number"
                    className={`pl-12 ${phoneError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                </div>
                {phoneError && (
                  <p className="text-xs text-red-500 font-medium">{phoneError}</p>
                )}
                {formData.contactNumber && !phoneError && formData.contactNumber.length === 10 && (
                  <p className="text-xs text-green-600 font-medium">✓ Valid number</p>
                )}
              </div>

              {/* WhatsApp Number */}
              <div className="space-y-2">
                <Label htmlFor="empWhatsapp">WhatsApp Number</Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground pointer-events-none">
                    +91
                  </div>
                  <Input
                    id="empWhatsapp"
                    maxLength={10}
                    value={formData.whatsappNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      handleChange('whatsappNumber', value);
                      if (whatsappError) setWhatsappError('');
                    }}
                    placeholder="Enter a Number"
                    className={`pl-12 ${whatsappError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                </div>
                {whatsappError && (
                  <p className="text-xs text-red-500 font-medium">{whatsappError}</p>
                )}
                {formData.whatsappNumber && !whatsappError && formData.whatsappNumber.length === 10 && (
                  <p className="text-xs text-green-600 font-medium">✓ Valid number</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="empEmail">Email *</Label>
                <Input
                  id="empEmail"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="employee@example.com"
                  required
                />
              </div>

              {/* Address 1 */}
              <div className="space-y-2">
                <Label htmlFor="empAddress1">Address Line 1</Label>
                <Input
                  id="empAddress1"
                  maxLength={40}
                  value={formData.address1}
                  onChange={(e) => handleChange('address1', e.target.value)}
                  placeholder="Enter address"
                />
              </div>

              {/* Address 2 + Pincode */}
              <div className="md:col-span-2 grid grid-cols-3 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="empAddress2">Address Line 2</Label>
                  <Input
                    id="empAddress2"
                    maxLength={40}
                    value={formData.address2}
                    onChange={(e) => handleChange('address2', e.target.value)}
                    placeholder="Enter address"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="empPincode">Pincode</Label>
                  <Input
                    id="empPincode"
                    maxLength={6}
                    value={formData.pincode}
                    onChange={(e) => handleChange('pincode', e.target.value.replace(/\D/g, ''))}
                    placeholder="6 digits"
                  />
                </div>
              </div>

              {/* State */}
              <div className="space-y-2">
                <Label htmlFor="empState">State</Label>
                <Select
                  value={formData.state}
                  onValueChange={(value) => {
                    handleChange('state', value);
                    handleChange('city', ''); // Clear city when state changes
                  }}
                >
                  <SelectTrigger id="empState">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map((state) => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* City */}
              <div className="space-y-2">
                <Label htmlFor="empCity">City</Label>
                <Select
                  value={formData.city}
                  onValueChange={(value) => handleChange('city', value)}
                  disabled={!formData.state}
                >
                  <SelectTrigger id="empCity">
                    <SelectValue placeholder={formData.state ? "Select city" : "Select state first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(STATE_CITIES[formData.state] || []).map((city) => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Country */}
              <div className="space-y-2">
                <Label htmlFor="empCountry">Country</Label>
                <Input
                  id="empCountry"
                  value={formData.country}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Role */}
                <div className="space-y-2">
                  <Label htmlFor="empRole">Role *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => handleChange('role', value)}
                  >
                    <SelectTrigger id="empRole">
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

                {/* Joining Date beside Role */}
                <div className="space-y-2">
                  <Label htmlFor="empJoiningDate">Joining Date *</Label>
                  <Input
                    id="empJoiningDate"
                    type="date"
                    value={format(formData.joiningDate || Date.now(), 'yyyy-MM-dd')}
                    onChange={(e) =>
                      handleChange('joiningDate', new Date(e.target.value).getTime())
                    }
                    className="w-36"
                  />
                </div>

                {/* Designation on new row */}
                <div className="space-y-2 col-span-3">
                  <Label htmlFor="empDesignation">Designation</Label>
                  <Input
                    id="empDesignation"
                    value={formData.designation}
                    onChange={(e) => handleChange('designation', e.target.value)}
                    placeholder="Enter designation"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive ?? true}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingEmployee ? 'Update' : 'Add'} Employee
            </Button>
          </DialogFooter>
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

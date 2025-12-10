import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { AdminRole } from '@/lib/types';
import {
  updateAdmin,
  deleteAdmin,
  getAllAdmins,
  toggleAdminStatus,
  resetAdminPassword,
  AdminWithCompany,
  findAdminByContactNumber,
  findAdminByEmail,
  createAdminWithCompany,
} from '@/lib/firestore/adminService';
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
import { ArrowLeft, Plus, PencilSimple, Trash, CheckSquare, Key, Copy, MagnifyingGlass, DotsThree, Phone, WhatsappLogo, UserCircle, User, MapPin, Check, Spinner, ShieldCheck } from '@phosphor-icons/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { EmptyState } from './EmptyState';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { sendWhatsAppMessage } from '@/lib/utils';

const ITEMS_PER_PAGE = 6;

// State to Cities mapping
const STATE_CITIES: Record<string, string[]> = {
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Rajahmundry', 'Tirupati'],
  'Karnataka': ['Bangalore', 'Mysore', 'Mangalore', 'Hubli', 'Belgaum', 'Gulbarga', 'Davangere'],
  'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Palakkad', 'Alappuzha'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Tiruppur', 'Erode', 'Vellore'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Ramagundam', 'Khammam'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad', 'Solapur'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur'],
  'Delhi': ['New Delhi', 'Delhi'],
};

const INDIAN_STATES = Object.keys(STATE_CITIES).sort();
const DEFAULT_STATE = 'Tamil Nadu';
const DEFAULT_CITY = 'Tirunelveli';

interface AdminManagementProps {
  onBack: () => void;
}

export function AdminManagement({ onBack }: AdminManagementProps) {
  const { user, admin } = useAuth();
  const [admins, setAdmins] = useState<AdminWithCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [editingAdmin, setEditingAdmin] = useState<AdminWithCompany | null>(null);
  const [phoneError, setPhoneError] = useState('');
  const [deleteAdminId, setDeleteAdminId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [formData, setFormData] = useState<{
    shopName: string; // Shop/Company name for new admin
    name: string;
    aliasName: string;
    gender: 'male' | 'female' | '';
    profilePicture: string;
    email: string;
    contactNumber: string;
    whatsappNumber: string;
    address1: string;
    address2: string;
    city: string;
    pincode: string;
    state: string;
    role: AdminRole;
    isActive: boolean;
  }>({
    shopName: '',
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
    state: DEFAULT_STATE,
    role: 'admin',
    isActive: true,
  });

  // Get current user's ID (root user)
  const currentUserId = user?.id || '';

  // Load all admins (for root user)
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Load all admins across all companies (for root user view)
        const adminsList = await getAllAdmins();
        setAdmins(adminsList);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load admins');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const filteredAdmins = (admins || []).filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.contactNumber.includes(search) ||
      (a.email && a.email.toLowerCase().includes(search.toLowerCase())) ||
      a.role.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const sortedAdmins = filteredAdmins.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const totalPages = Math.ceil(sortedAdmins.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedAdmins = sortedAdmins.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const showPagination = sortedAdmins.length > ITEMS_PER_PAGE;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleOpenDialog = (adminItem?: AdminWithCompany) => {
    if (adminItem) {
      setEditingAdmin(adminItem);
      setFormData({
        shopName: '', // Not editable for existing admins
        name: adminItem.name,
        aliasName: adminItem.aliasName || '',
        gender: adminItem.gender,
        profilePicture: adminItem.profilePicture || '',
        email: adminItem.email || '',
        contactNumber: adminItem.contactNumber,
        whatsappNumber: adminItem.whatsappNumber || '',
        address1: adminItem.address1 || '',
        address2: adminItem.address2 || '',
        city: adminItem.city || DEFAULT_CITY,
        pincode: adminItem.pincode || '',
        state: adminItem.state || DEFAULT_STATE,
        role: adminItem.role,
        isActive: adminItem.isActive,
      });
    } else {
      setEditingAdmin(null);
      setFormData({
        shopName: '',
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
        state: DEFAULT_STATE,
        role: 'admin',
        isActive: true,
      });
    }
    setActiveTab('basic');
    setPhoneError('');
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingAdmin(null);
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setPhoneError('');

    // Validate shop name for new admins
    if (!editingAdmin && !formData.shopName?.trim()) {
      toast.error('Shop/Company name is required');
      return;
    }

    if (!formData.name) {
      toast.error('Admin name is required');
      return;
    }

    if (!formData.gender) {
      toast.error('Please select the gender');
      return;
    }

    if (!formData.contactNumber) {
      toast.error('Contact number is required');
      return;
    }

    if (!/^\d{10}$/.test(formData.contactNumber)) {
      setPhoneError('Enter correct number');
      toast.error('Phone Number: Enter correct number');
      return;
    }

    if (formData.pincode && !/^\d{6}$/.test(formData.pincode)) {
      toast.error('Pincode must be exactly 6 digits');
      return;
    }

    if (!formData.email || !formData.email.trim()) {
      toast.error('Email address is required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      // Check globally for duplicate contact number
      const existingByContact = await findAdminByContactNumber(
        formData.contactNumber,
        undefined,
        editingAdmin?.id
      );
      if (existingByContact) {
        setPhoneError('This number already exists');
        toast.error(`Contact number already exists for: ${existingByContact.name}`);
        return;
      }

      // Check globally for duplicate email
      const existingByEmail = await findAdminByEmail(
        formData.email!,
        undefined,
        editingAdmin?.id
      );
      if (existingByEmail) {
        toast.error(`Email address already exists for: ${existingByEmail.name}`);
        return;
      }

      if (editingAdmin) {
        // Update existing admin (without shopName)
        const { shopName, ...updateData } = formData;
        await updateAdmin(editingAdmin.id, {
          ...updateData,
          gender: formData.gender as 'male' | 'female',
        });
        const updatedAdmins = admins.map(a =>
          a.id === editingAdmin.id
            ? { ...a, ...updateData, gender: formData.gender as 'male' | 'female', updatedAt: Date.now() }
            : a
        );
        setAdmins(updatedAdmins);
        toast.success('Admin updated successfully!');
        handleCloseDialog();
      } else {
        // Create new admin with new company/shop
        const result = await createAdminWithCompany(
          currentUserId,
          {
            name: formData.name,
            aliasName: formData.aliasName,
            gender: formData.gender as 'male' | 'female',
            email: formData.email,
            contactNumber: formData.contactNumber,
            whatsappNumber: formData.whatsappNumber,
            address1: formData.address1,
            address2: formData.address2,
            city: formData.city,
            pincode: formData.pincode,
            state: formData.state,
            role: formData.role,
            isActive: formData.isActive,
          },
          {
            shopName: formData.shopName,
          }
        );
        setAdmins([...admins, result]);
        setNewAdminPassword(result.plainPassword);
        setShowPasswordDialog(true);
        toast.success('Admin and shop created successfully! Login credentials sent to email.');
        handleCloseDialog();
      }
    } catch (error: any) {
      console.error('Error saving admin:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      toast.error(`Failed to save admin: ${errorMessage}`);
    }
  };

  const handleDeleteClick = (adminId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Prevent deleting the current logged-in admin
    if (adminId === admin?.id) {
      toast.error('You cannot delete your own account');
      return;
    }
    setDeleteAdminId(adminId);
  };

  const confirmDelete = async () => {
    if (!deleteAdminId) return;

    try {
      await deleteAdmin(deleteAdminId);
      setAdmins(admins.filter(a => a.id !== deleteAdminId));
      toast.success('Admin deleted successfully!');
      setDeleteAdminId(null);
    } catch (error) {
      console.error('Error deleting admin:', error);
      toast.error('Failed to delete admin');
    }
  };

  const handleToggleStatus = async (adminItem: AdminWithCompany) => {
    // Prevent deactivating own account
    if (adminItem.id === admin?.id) {
      toast.error('You cannot deactivate your own account');
      return;
    }

    try {
      await toggleAdminStatus(adminItem.id, !adminItem.isActive);
      const updatedAdmins = admins.map(a =>
        a.id === adminItem.id
          ? { ...a, isActive: !a.isActive, updatedAt: Date.now() }
          : a
      );
      setAdmins(updatedAdmins);
      toast.success(`Admin ${adminItem.isActive ? 'deactivated' : 'activated'} successfully!`);
    } catch (error) {
      console.error('Error toggling admin status:', error);
      toast.error('Failed to update admin status');
    }
  };

  const handleResetPassword = async (adminId: string) => {
    if (!window.confirm('Are you sure you want to reset this admin\'s password?')) {
      return;
    }

    try {
      const newPassword = await resetAdminPassword(adminId);
      setNewAdminPassword(newPassword);
      setShowPasswordDialog(true);
      toast.success('Password reset successfully!');
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Failed to reset password');
    }
  };

  const copyPasswordToClipboard = () => {
    navigator.clipboard.writeText(newAdminPassword);
    toast.success('Password copied to clipboard!');
  };

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
          <p className="text-muted-foreground">Loading admins...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9">
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-lg sm:text-xl font-bold">Admin Management</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{admins.length} admin(s)</p>
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
              placeholder="Search admins by name, phone, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 touch-manipulation"
            />
          </div>
          <Button onClick={() => handleOpenDialog()} className="h-10 font-semibold touch-manipulation px-4 text-xs sm:text-sm whitespace-nowrap min-w-[100px] sm:min-w-[120px]">
            <Plus size={18} className="mr-1.5" weight="bold" />
            Add Admin
          </Button>
        </div>
      </div>

      {filteredAdmins.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={search ? 'No admins found' : 'No admins added yet'}
          description={search ? 'Try adjusting your search terms' : 'Get started by adding your first admin user'}
          actionLabel={!search ? 'Add Admin' : undefined}
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
            {search ? `Search Results (${sortedAdmins.length})` : `Admins (${sortedAdmins.length})`}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {paginatedAdmins.map((adminItem, index) => (
              <div
                key={adminItem.id}
                className={`rounded-xl border-2 hover:shadow-lg transition-all p-4 cursor-pointer w-full flex flex-row gap-4 shadow-sm animate-on-load animate-fade-slide-up stagger-${index + 1} ${!adminItem.isActive ? 'opacity-60' : ''}`}
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #faf8ff 100%)',
                  borderColor: adminItem.role === 'super_admin' ? '#f59e0b' : '#6A64F2',
                  boxShadow: '0 4px 12px -2px rgba(106, 100, 242, 0.2), 0 2px 6px -2px rgba(106, 100, 242, 0.15)'
                }}
                onClick={() => handleOpenDialog(adminItem)}
              >
                {/* Avatar */}
                <div className="flex-shrink-0 flex items-center">
                  <div
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{ background: adminItem.role === 'super_admin' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)' }}
                  >
                    {getInitials(adminItem.name)}
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm sm:text-base font-semibold text-gray-900 truncate">{adminItem.name}</p>
                    {!adminItem.isActive && (
                      <Badge variant="outline" className="text-[8px] px-1.5 py-0.5 font-semibold bg-red-100 text-red-700 border-red-200">
                        INACTIVE
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-xs font-bold text-purple-700 mb-1">{adminItem.adminCode || adminItem.id}</p>
                  <div className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-600 flex-wrap">
                    <span className="font-bold text-purple-700">{adminItem.contactNumber}</span>
                    <span>&#8226;</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[8px] sm:text-[10px] px-1.5 py-0.5 font-semibold capitalize",
                        adminItem.role === 'super_admin'
                          ? 'bg-amber-100 text-amber-700 border-amber-200'
                          : 'bg-purple-100 text-purple-700 border-purple-200'
                      )}
                    >
                      {adminItem.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </Badge>
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-blue-600 font-medium mt-0.5">
                    Shop: {adminItem.companyId}
                  </p>
                  {adminItem.createdAt && (
                    <p className="text-[9px] sm:text-[10px] text-gray-500 mt-0.5">
                      Created: {format(new Date(adminItem.createdAt), 'MMM dd, yyyy')}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 flex flex-col items-end justify-between">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 touch-manipulation">
                        <DotsThree size={20} weight="bold" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenDialog(adminItem); }} className="font-medium">
                        <PencilSimple size={18} className="mr-2" weight="bold" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleResetPassword(adminItem.id); }} className="font-medium">
                        <Key size={18} className="mr-2" weight="bold" />
                        Reset Password
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); handleToggleStatus(adminItem); }}
                        className="font-medium"
                        disabled={adminItem.id === admin?.id}
                      >
                        <CheckSquare size={18} className="mr-2" weight="bold" />
                        {adminItem.isActive ? 'Deactivate' : 'Activate'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => handleDeleteClick(adminItem.id, e)}
                        className="text-destructive focus:text-destructive font-medium"
                        disabled={adminItem.id === admin?.id}
                      >
                        <Trash size={18} className="mr-2" weight="bold" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="flex items-center gap-1">
                    <a
                      href={`tel:${adminItem.contactNumber}`}
                      className="text-primary hover:text-primary/80 transition-colors p-1.5 touch-manipulation rounded-full hover:bg-purple-100"
                      onClick={(e) => e.stopPropagation()}
                      title="Call"
                    >
                      <Phone size={16} weight="fill" />
                    </a>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        sendWhatsAppMessage(adminItem.whatsappNumber || adminItem.contactNumber, `Hello ${adminItem.name},`);
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
      <AlertDialog open={deleteAdminId !== null} onOpenChange={() => setDeleteAdminId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Admin</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this admin? This action cannot be undone.
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

      {/* Add/Edit Admin Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent
          className="max-w-[100vw] w-full h-[100dvh] sm:max-w-2xl sm:h-[95vh] flex flex-col p-0 overflow-hidden rounded-none sm:rounded-lg"
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="px-3 py-2 border-b flex-shrink-0" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #8b5cf6 100%)', borderColor: 'rgba(196, 181, 253, 0.3)' }}>
            <DialogTitle className="flex items-center gap-2.5 text-white text-base pr-10">
              <button
                type="button"
                onClick={handleCloseDialog}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0"
              >
                <ArrowLeft size={18} weight="bold" />
              </button>
              <span className="leading-tight">{editingAdmin ? 'Edit Admin' : 'Add New Shop Admin'}</span>
              {editingAdmin && (
                <span className="text-xs font-normal text-white/80 bg-white/20 px-2 py-0.5 rounded leading-tight">
                  {editingAdmin.adminCode || editingAdmin.id}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
            <div className="px-3 py-2 border-b bg-muted/30 flex-shrink-0">
              <TabsList className="grid grid-cols-2 w-full h-9 p-0.5 bg-muted rounded-lg">
                <TabsTrigger
                  value="basic"
                  className="flex items-center justify-center gap-1 h-8 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
                >
                  <User size={16} weight="bold" />
                  <span>Basic</span>
                  {formData.name && formData.gender && formData.contactNumber.length === 10 && (
                    <Check size={14} className="text-green-600" weight="bold" />
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="address"
                  className="flex items-center justify-center gap-1 h-8 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
                >
                  <MapPin size={16} weight="bold" />
                  <span>Address</span>
                  {formData.address1 && formData.state && formData.city && (
                    <Check size={14} className="text-green-600" weight="bold" />
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 min-h-0 pt-[max(1rem,env(safe-area-inset-top,24px))] pb-[max(4rem,env(safe-area-inset-bottom,60px))]">
              {/* Basic Tab */}
              <TabsContent value="basic" className="mt-0 space-y-6 h-full">
                <div className="space-y-6">
                  {/* Shop/Company Name - Only for new admins */}
                  {!editingAdmin && (
                    <div className="space-y-2">
                      <Label htmlFor="shopName" className="text-sm font-medium">Shop/Company Name *</Label>
                      <Input
                        id="shopName"
                        maxLength={60}
                        value={formData.shopName}
                        onChange={(e) => handleChange('shopName', e.target.value)}
                        placeholder="Enter shop or company name"
                        className="h-12 text-base"
                        autoFocus
                      />
                      <p className="text-xs text-muted-foreground">Each admin gets their own shop. This name will be used for the new shop.</p>
                    </div>
                  )}

                  {/* Admin Name */}
                  <div className="space-y-2">
                    <Label htmlFor="adminName" className="text-sm font-medium">Admin Name *</Label>
                    <Input
                      id="adminName"
                      maxLength={40}
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="Enter admin name"
                      className="h-12 text-base"
                      autoFocus={!!editingAdmin}
                    />
                  </div>

                  {/* Gender */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Gender *</Label>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => handleChange('gender', 'male')}
                        className={cn(
                          'relative flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-all',
                          formData.gender === 'male'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-muted hover:border-blue-300 hover:bg-blue-50/50'
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
                        <span className={cn('font-semibold', formData.gender === 'male' ? 'text-blue-600' : 'text-muted-foreground')}>
                          Male
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleChange('gender', 'female')}
                        className={cn(
                          'relative flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-all',
                          formData.gender === 'female'
                            ? 'border-pink-500 bg-pink-50'
                            : 'border-muted hover:border-pink-300 hover:bg-pink-50/50'
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
                        <span className={cn('font-semibold', formData.gender === 'female' ? 'text-pink-600' : 'text-muted-foreground')}>
                          Female
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="bg-muted/30 rounded-xl p-5 border space-y-5">
                    <h3 className="text-sm font-semibold text-muted-foreground">Contact Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="adminContact" className="text-sm font-medium">Contact Number (Login ID) *</Label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">+91</div>
                          <Input
                            id="adminContact"
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
                        <Label htmlFor="adminEmail" className="text-sm font-medium">Email *</Label>
                        <Input
                          id="adminEmail"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleChange('email', e.target.value)}
                          placeholder="admin@example.com"
                          className="h-11 bg-background"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Role */}
                  <div className="bg-muted/30 rounded-xl p-5 border space-y-5">
                    <h3 className="text-sm font-semibold text-muted-foreground">Admin Settings</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="adminRole" className="text-sm font-medium">Role *</Label>
                        <Select
                          value={formData.role}
                          onValueChange={(value) => handleChange('role', value)}
                        >
                          <SelectTrigger id="adminRole" className="h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 flex items-end">
                        <div className="flex items-center gap-3 h-11">
                          <input
                            type="checkbox"
                            id="isActive"
                            checked={formData.isActive ?? true}
                            onChange={(e) => handleChange('isActive', e.target.checked)}
                            className="w-5 h-5 rounded border-gray-300"
                          />
                          <Label htmlFor="isActive" className="cursor-pointer font-medium">Active Admin</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Address Tab */}
              <TabsContent value="address" className="mt-0 h-full">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="adminAddress1" className="text-sm font-medium">Shop No / Flat No</Label>
                    <Input
                      id="adminAddress1"
                      maxLength={40}
                      value={formData.address1}
                      onChange={(e) => handleChange('address1', e.target.value)}
                      placeholder="e.g., Shop 12, Flat 4B"
                      className="h-11"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="adminAddress2" className="text-sm font-medium">Street / Area / Landmark</Label>
                      <Input
                        id="adminAddress2"
                        maxLength={40}
                        value={formData.address2}
                        onChange={(e) => handleChange('address2', e.target.value)}
                        placeholder="e.g., Main Road, Near Bus Stand"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adminPincode" className="text-sm font-medium">Pincode</Label>
                      <Input
                        id="adminPincode"
                        maxLength={6}
                        value={formData.pincode}
                        onChange={(e) => handleChange('pincode', e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g., 600001"
                        className="h-11"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="adminState" className="text-sm font-medium">State</Label>
                      <Select
                        value={formData.state}
                        onValueChange={(value) => {
                          handleChange('state', value);
                          handleChange('city', '');
                        }}
                      >
                        <SelectTrigger id="adminState" className="h-11">
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
                      <Label htmlFor="adminCity" className="text-sm font-medium">City</Label>
                      <Select
                        value={formData.city}
                        onValueChange={(value) => handleChange('city', value)}
                        disabled={!formData.state}
                      >
                        <SelectTrigger id="adminCity" className="h-11">
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
                </div>
              </TabsContent>
            </div>
          </Tabs>

          {/* Footer */}
          <div className="fixed bottom-0 left-0 right-0 sm:relative sm:bottom-auto flex justify-between items-center gap-3 px-4 sm:px-6 py-3 border-t z-50" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #8b5cf6 100%)', borderColor: 'rgba(196, 181, 253, 0.3)' }}>
            <Button type="button" variant="ghost" size="sm" onClick={handleCloseDialog} className="text-white hover:text-white/80 hover:bg-white/10">
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              {activeTab === 'address' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
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
                  size="sm"
                  onClick={() => setActiveTab('address')}
                  className="border border-white/30 text-white hover:text-white hover:bg-white/10 bg-transparent"
                >
                  Next
                </Button>
              )}
              <Button size="sm" onClick={handleSave} className="min-w-[100px] bg-white text-purple-700 hover:bg-white/90">
                {editingAdmin ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
          <div className="h-14 sm:hidden flex-shrink-0" />
        </DialogContent>
      </Dialog>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin Password</DialogTitle>
            <DialogDescription>
              Save this password securely. The admin will use this to log in.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">Auto-generated Password:</p>
              <code className="text-2xl font-mono font-bold text-blue-900 bg-white px-4 py-2 rounded border-2 border-blue-300">
                {newAdminPassword}
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
            <Button onClick={() => setShowPasswordDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

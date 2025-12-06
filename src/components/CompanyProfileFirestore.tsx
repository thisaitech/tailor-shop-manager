import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { CompanyProfile, BusinessType } from '@/lib/types';
import { saveCompanyProfile, getCompanyProfile } from '@/lib/firestore/companyService';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Pencil, Buildings, MapPin, Phone, Bank, IdentificationCard, Spinner } from '@phosphor-icons/react';
import { toast } from 'sonner';

interface CompanyProfileFirestoreProps {
  onBack: () => void;
  closeInternalView?: boolean;
  onCloseInternalViewHandled?: () => void;
  onInternalViewChange?: (hasInternalView: boolean) => void;
}

// Validation functions
const validateGSTIN = (gstin: string): boolean => {
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin);
};

const validatePAN = (pan: string): boolean => {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(pan);
};

const validatePincode = (pincode: string): boolean => {
  return /^[0-9]{6}$/.test(pincode);
};

const validateIFSC = (ifsc: string): boolean => {
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  return ifscRegex.test(ifsc);
};

const indianCities = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune',
  'Ahmedabad', 'Jaipur', 'Surat', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore',
  'Thane', 'Bhopal', 'Visakhapatnam', 'Pimpri-Chinchwad', 'Patna', 'Vadodara',
  'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot',
  'Coimbatore', 'Madurai', 'Trichy', 'Salem', 'Erode', 'Tirunelveli'
];

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

const indianRegions = ['North', 'South', 'East', 'West', 'Central', 'Northeast'];

export function CompanyProfileFirestore({ onBack, closeInternalView, onCloseInternalViewHandled, onInternalViewChange }: CompanyProfileFirestoreProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Track if any dialog is open and notify parent
  useEffect(() => {
    onInternalViewChange?.(showEditDialog);
  }, [showEditDialog, onInternalViewChange]);

  // Handle close internal view signal from parent (back button)
  useEffect(() => {
    if (closeInternalView) {
      if (showEditDialog) {
        setShowEditDialog(false);
        onCloseInternalViewHandled?.();
      } else {
        // No dialogs open, signal handled
        onCloseInternalViewHandled?.();
      }
    }
  }, [closeInternalView, showEditDialog, onCloseInternalViewHandled]);
  const [editSection, setEditSection] = useState<'company' | 'address' | 'bank'>('company');
  const [companyData, setCompanyData] = useState<CompanyProfile | null>(null);
  const [formData, setFormData] = useState<Partial<CompanyProfile>>({
    companyName: '',
    aliasName: '',
    businessType: 'service',
    productCategory: 'Readymades',
    address1: '',
    address2: '',
    city: '',
    pincode: '',
    region: '',
    state: '',
    country: 'India',
    contactNumber: '',
    email: '',
    panNumber: '',
    udhyamMsmeNo: '',
    gstinNumber: '',
    bankName: '',
    accountNumber: '',
    accountHolderName: '',
    branchName: '',
    ifscCode: '',
    bankContactNumber: '',
  });

  // Load existing profile from Firestore
  useEffect(() => {
    async function loadProfile() {
      if (!user?.id) return;

      setLoading(true);
      try {
        const profile = await getCompanyProfile(user.id);
        if (profile) {
          setCompanyData(profile);
          setFormData(profile);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [user?.id]);

  const handleChange = (field: keyof CompanyProfile, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEditProfile = (section: 'company' | 'address' | 'bank') => {
    setEditSection(section);
    // Reset form data to current company data
    if (companyData) {
      setFormData(companyData);
    }
    setShowEditDialog(true);
  };

  const handleSave = async () => {
    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    // Validation based on section
    if (editSection === 'company') {
      if (!formData.companyName || formData.companyName.length > 40) {
        toast.error('Company name is required (max 40 characters)');
        return;
      }
      if (formData.aliasName && formData.aliasName.length > 40) {
        toast.error('Alias name must be max 40 characters');
        return;
      }
      if (!formData.businessType) {
        toast.error('Business type is required');
        return;
      }
      if (!formData.contactNumber || formData.contactNumber.length > 20) {
        toast.error('Contact number is required (max 20 digits)');
        return;
      }
      if (formData.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          toast.error('Please enter a valid email address');
          return;
        }
      }
      if (formData.panNumber && !validatePAN(formData.panNumber.toUpperCase())) {
        toast.error('Please enter a valid PAN number (e.g., ABCDE1234F)');
        return;
      }
      if (formData.gstinNumber && !validateGSTIN(formData.gstinNumber.toUpperCase())) {
        toast.error('Please enter a valid GSTIN (15 characters)');
        return;
      }
    }

    if (editSection === 'address') {
      if (!formData.address1 || formData.address1.length > 40) {
        toast.error('Address 1 is required (max 40 characters)');
        return;
      }
      if (formData.address2 && formData.address2.length > 40) {
        toast.error('Address 2 must be max 40 characters');
        return;
      }
      if (!formData.city) {
        toast.error('City is required');
        return;
      }
      if (!formData.pincode || !validatePincode(formData.pincode)) {
        toast.error('Please enter a valid 6-digit pincode');
        return;
      }
      if (!formData.region) {
        toast.error('Region is required');
        return;
      }
      if (!formData.state) {
        toast.error('State is required');
        return;
      }
    }

    if (editSection === 'bank') {
      if (!formData.bankName) {
        toast.error('Bank name is required');
        return;
      }
      if (!formData.accountNumber) {
        toast.error('Account number is required');
        return;
      }
      if (!formData.accountHolderName) {
        toast.error('Account holder name is required');
        return;
      }
      if (!formData.ifscCode || !validateIFSC(formData.ifscCode.toUpperCase())) {
        toast.error('Please enter a valid IFSC code (e.g., SBIN0001234)');
        return;
      }
    }

    setSaving(true);
    try {
      const savedProfile = await saveCompanyProfile(user.id, {
        ...formData,
        panNumber: formData.panNumber?.toUpperCase(),
        gstinNumber: formData.gstinNumber?.toUpperCase(),
        ifscCode: formData.ifscCode?.toUpperCase(),
      });
      setCompanyData(savedProfile);
      setFormData(savedProfile);
      setShowEditDialog(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getBusinessTypeLabel = (type: string) => {
    switch (type) {
      case 'service': return 'Service';
      case 'sales': return 'Sales';
      case 'sales_and_services': return 'Sales & Services';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Spinner size={48} className="animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft size={20} />
        </Button>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold">Company Profile</h2>
        <p className="text-muted-foreground">Welcome, {companyData?.companyName || 'Admin'}</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="address">Address</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          {/* Company Information Card */}
          <div
            className="rounded-xl border-2 shadow-md overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 50%, #e0e7ff 100%)',
              borderColor: 'rgba(196, 181, 253, 0.5)',
            }}
          >
            {/* Header with icon and edit button */}
            <div className="flex items-center justify-between p-4 border-b border-purple-200/50">
              <div className="flex items-center gap-3">
                <div
                  className="p-2.5 rounded-xl"
                  style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #6366f1 100%)' }}
                >
                  <Buildings size={24} className="text-white" weight="duotone" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Company Information</h3>
                </div>
              </div>
              <Button
                onClick={() => handleEditProfile('company')}
                size="sm"
                variant="ghost"
                className="gap-1.5 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
              >
                <Pencil size={16} />
                Edit
              </Button>
            </div>

            {/* Company Avatar and Name */}
            <div className="p-4 border-b border-purple-200/50">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl border-2 border-white shadow-md"
                  style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #6366f1 100%)' }}
                >
                  {companyData?.companyName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'CO'}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{companyData?.companyName || 'Company Name'}</h3>
                  <p className="text-sm text-gray-600">{getBusinessTypeLabel(companyData?.businessType || 'service')}</p>
                </div>
              </div>
            </div>

            {/* Details Section */}
            <div className="p-4 bg-white/60 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Company Name</p>
                  <p className="font-semibold text-gray-900">{companyData?.companyName || '-'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Alias Name</p>
                  <p className="font-semibold text-gray-900">{companyData?.aliasName || '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Business Type</p>
                  <p className="font-semibold text-gray-900">{getBusinessTypeLabel(companyData?.businessType || '-')}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Product Category</p>
                  <p className="font-semibold text-gray-900">{companyData?.productCategory || '-'}</p>
                </div>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Company ID</p>
                <p className="font-semibold text-purple-600">{companyData?.id || 'Auto-generated'}</p>
              </div>
            </div>
          </div>

          {/* Contact Information Card */}
          <div
            className="rounded-xl border-2 shadow-md overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 50%, #e0e7ff 100%)',
              borderColor: 'rgba(196, 181, 253, 0.5)',
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-purple-200/50">
              <div
                className="p-2.5 rounded-xl"
                style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}
              >
                <Phone size={24} className="text-white" weight="duotone" />
              </div>
              <h3 className="font-semibold text-gray-900">Contact Information</h3>
            </div>

            {/* Details Section */}
            <div className="p-4 bg-white/60 space-y-4">
              <div>
                <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Phone</p>
                <p className="font-semibold text-gray-900">{companyData?.contactNumber ? `+91 ${companyData.contactNumber}` : '-'}</p>
              </div>
              {companyData?.email && (
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Email</p>
                  <p className="font-semibold text-gray-900">{companyData.email}</p>
                </div>
              )}
            </div>
          </div>

          {/* Tax Information Card */}
          <div
            className="rounded-xl border-2 shadow-md overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 50%, #e0e7ff 100%)',
              borderColor: 'rgba(196, 181, 253, 0.5)',
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-purple-200/50">
              <div
                className="p-2.5 rounded-xl"
                style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
              >
                <IdentificationCard size={24} className="text-white" weight="duotone" />
              </div>
              <h3 className="font-semibold text-gray-900">Tax Information</h3>
            </div>

            {/* Details Section */}
            <div className="p-4 bg-white/60 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">PAN Number</p>
                  <p className="font-semibold text-gray-900">{companyData?.panNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">GSTIN Number</p>
                  <p className="font-semibold text-gray-900">{companyData?.gstinNumber || '-'}</p>
                </div>
              </div>
              {companyData?.udhyamMsmeNo && (
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">UDHYAM/MSME No</p>
                  <p className="font-semibold text-gray-900">{companyData.udhyamMsmeNo}</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Address Tab */}
        <TabsContent value="address" className="space-y-4">
          <div
            className="rounded-xl border-2 shadow-md overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 50%, #e0e7ff 100%)',
              borderColor: 'rgba(196, 181, 253, 0.5)',
            }}
          >
            {/* Header with edit button */}
            <div className="flex items-center justify-between p-4 border-b border-purple-200/50">
              <div className="flex items-center gap-3">
                <div
                  className="p-2.5 rounded-xl"
                  style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}
                >
                  <MapPin size={24} className="text-white" weight="duotone" />
                </div>
                <h3 className="font-semibold text-gray-900">Address Information</h3>
              </div>
              <Button
                onClick={() => handleEditProfile('address')}
                size="sm"
                variant="ghost"
                className="gap-1.5 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
              >
                <Pencil size={16} />
                Edit
              </Button>
            </div>

            {/* Details Section */}
            <div className="p-4 bg-white/60 space-y-4">
              {companyData?.address1 && (
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Address Line 1</p>
                  <p className="font-semibold text-gray-900">{companyData.address1}</p>
                </div>
              )}
              {companyData?.address2 && (
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Address Line 2</p>
                  <p className="font-semibold text-gray-900">{companyData.address2}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">City</p>
                  <p className="font-semibold text-gray-900">{companyData?.city || '-'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">State</p>
                  <p className="font-semibold text-gray-900">{companyData?.state || '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Pincode</p>
                  <p className="font-semibold text-gray-900">{companyData?.pincode || '-'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Region</p>
                  <p className="font-semibold text-gray-900">{companyData?.region || '-'}</p>
                </div>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Country</p>
                <p className="font-semibold text-gray-900">{companyData?.country || 'India'}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-4">
          <div
            className="rounded-xl border-2 shadow-md overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 50%, #e0e7ff 100%)',
              borderColor: 'rgba(196, 181, 253, 0.5)',
            }}
          >
            {/* Header with edit button */}
            <div className="flex items-center justify-between p-4 border-b border-purple-200/50">
              <div className="flex items-center gap-3">
                <div
                  className="p-2.5 rounded-xl"
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                >
                  <Bank size={24} className="text-white" weight="duotone" />
                </div>
                <h3 className="font-semibold text-gray-900">Bank Account Details</h3>
              </div>
              <Button
                onClick={() => handleEditProfile('bank')}
                size="sm"
                variant="ghost"
                className="gap-1.5 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
              >
                <Pencil size={16} />
                Edit
              </Button>
            </div>

            {/* Details Section */}
            <div className="p-4 bg-white/60 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Bank Name</p>
                  <p className="font-semibold text-gray-900">{companyData?.bankName || '-'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Branch Name</p>
                  <p className="font-semibold text-gray-900">{companyData?.branchName || '-'}</p>
                </div>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Account Holder Name</p>
                <p className="font-semibold text-gray-900">{companyData?.accountHolderName || '-'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Account Number</p>
                  <p className="font-semibold text-gray-900">{companyData?.accountNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">IFSC Code</p>
                  <p className="font-semibold text-gray-900">{companyData?.ifscCode || '-'}</p>
                </div>
              </div>
              {companyData?.bankContactNumber && (
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Bank Contact Number</p>
                  <p className="font-semibold text-gray-900">{companyData.bankContactNumber}</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editSection === 'company' && 'Edit Company Information'}
              {editSection === 'address' && 'Edit Address Information'}
              {editSection === 'bank' && 'Edit Bank Account Details'}
            </DialogTitle>
            <DialogDescription>
              Update your {editSection === 'company' ? 'company' : editSection === 'address' ? 'address' : 'bank account'} details below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Company Information Fields */}
            {editSection === 'company' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    maxLength={40}
                    value={formData.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    placeholder="Enter company name"
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aliasName">Alias Name</Label>
                  <Input
                    id="aliasName"
                    maxLength={40}
                    value={formData.aliasName}
                    onChange={(e) => handleChange('aliasName', e.target.value)}
                    placeholder="Enter alias name"
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessType">Business Type *</Label>
                  <Select
                    value={formData.businessType}
                    onValueChange={(value) => handleChange('businessType', value)}
                    disabled={saving}
                  >
                    <SelectTrigger id="businessType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="sales_and_services">Sales & Services</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="productCategory">Product Category</Label>
                  <Input
                    id="productCategory"
                    value={formData.productCategory}
                    onChange={(e) => handleChange('productCategory', e.target.value)}
                    placeholder="e.g., Readymades"
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactNumber">Contact Number *</Label>
                  <Input
                    id="contactNumber"
                    maxLength={20}
                    value={formData.contactNumber}
                    onChange={(e) => handleChange('contactNumber', e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter contact number"
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="company@example.com"
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="panNumber">PAN Number</Label>
                  <Input
                    id="panNumber"
                    maxLength={10}
                    value={formData.panNumber}
                    onChange={(e) => handleChange('panNumber', e.target.value.toUpperCase())}
                    placeholder="ABCDE1234F"
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gstinNumber">GSTIN Number</Label>
                  <Input
                    id="gstinNumber"
                    maxLength={15}
                    value={formData.gstinNumber}
                    onChange={(e) => handleChange('gstinNumber', e.target.value.toUpperCase())}
                    placeholder="22ABCDE1234F1Z5"
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="udhyamMsmeNo">UDHYAM/MSME No</Label>
                  <Input
                    id="udhyamMsmeNo"
                    maxLength={15}
                    value={formData.udhyamMsmeNo}
                    onChange={(e) => handleChange('udhyamMsmeNo', e.target.value)}
                    placeholder="Enter UDHYAM/MSME number"
                    disabled={saving}
                  />
                </div>
              </div>
            )}

            {/* Address Information Fields */}
            {editSection === 'address' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address1">Address Line 1 *</Label>
                  <Input
                    id="address1"
                    maxLength={40}
                    value={formData.address1}
                    onChange={(e) => handleChange('address1', e.target.value)}
                    placeholder="Enter address line 1"
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address2">Address Line 2</Label>
                  <Input
                    id="address2"
                    maxLength={40}
                    value={formData.address2}
                    onChange={(e) => handleChange('address2', e.target.value)}
                    placeholder="Enter address line 2"
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Select
                    value={formData.city}
                    onValueChange={(value) => handleChange('city', value)}
                    disabled={saving}
                  >
                    <SelectTrigger id="city">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {indianCities.map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode *</Label>
                  <Input
                    id="pincode"
                    maxLength={6}
                    value={formData.pincode}
                    onChange={(e) => handleChange('pincode', e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit pincode"
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">Region *</Label>
                  <Select
                    value={formData.region}
                    onValueChange={(value) => handleChange('region', value)}
                    disabled={saving}
                  >
                    <SelectTrigger id="region">
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      {indianRegions.map(region => (
                        <SelectItem key={region} value={region}>{region}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(value) => handleChange('state', value)}
                    disabled={saving}
                  >
                    <SelectTrigger id="state">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {indianStates.map(state => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
            )}

            {/* Bank Account Fields */}
            {editSection === 'bank' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name *</Label>
                  <Input
                    id="bankName"
                    value={formData.bankName}
                    onChange={(e) => handleChange('bankName', e.target.value)}
                    placeholder="Enter bank name"
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branchName">Branch Name</Label>
                  <Input
                    id="branchName"
                    value={formData.branchName}
                    onChange={(e) => handleChange('branchName', e.target.value)}
                    placeholder="Enter branch name"
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountHolderName">Account Holder Name *</Label>
                  <Input
                    id="accountHolderName"
                    value={formData.accountHolderName}
                    onChange={(e) => handleChange('accountHolderName', e.target.value)}
                    placeholder="Enter account holder name"
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number *</Label>
                  <Input
                    id="accountNumber"
                    value={formData.accountNumber}
                    onChange={(e) => handleChange('accountNumber', e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter account number"
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ifscCode">IFSC Code *</Label>
                  <Input
                    id="ifscCode"
                    maxLength={11}
                    value={formData.ifscCode}
                    onChange={(e) => handleChange('ifscCode', e.target.value.toUpperCase())}
                    placeholder="SBIN0001234"
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankContactNumber">Bank Contact Number</Label>
                  <Input
                    id="bankContactNumber"
                    value={formData.bankContactNumber}
                    onChange={(e) => handleChange('bankContactNumber', e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter bank contact number"
                    disabled={saving}
                  />
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> Company ID cannot be changed. All changes will be saved to Firestore.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

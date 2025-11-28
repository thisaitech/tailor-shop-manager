import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { CompanyProfile, BusinessType } from '@/lib/types';
import { saveCompanyProfile, getCompanyProfile } from '@/lib/firestore/companyService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, FloppyDisk, Spinner, Buildings, MapPin, Phone, EnvelopeSimple, IdentificationCard, Bank, CheckCircle } from '@phosphor-icons/react';
import { toast } from 'sonner';

interface CompanyProfileFirestoreProps {
  onBack: () => void;
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

export function CompanyProfileFirestore({ onBack }: CompanyProfileFirestoreProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  const handleSave = async () => {
    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    // Validation
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

    if (!formData.contactNumber || formData.contactNumber.length > 20) {
      toast.error('Contact number is required (max 20 digits)');
      return;
    }

    if (!formData.email) {
      toast.error('Email is required');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!formData.panNumber || !validatePAN(formData.panNumber.toUpperCase())) {
      toast.error('Please enter a valid PAN number (e.g., ABCDE1234F)');
      return;
    }

    if (!formData.gstinNumber || !validateGSTIN(formData.gstinNumber.toUpperCase())) {
      toast.error('Please enter a valid GSTIN (15 characters)');
      return;
    }

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

    setSaving(true);
    try {
      const savedProfile = await saveCompanyProfile(user.id, formData);
      setFormData(savedProfile);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
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
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-4 pb-6">
      {/* Header Section */}
      <div
        className="rounded-xl border-2 p-4 sm:p-6 shadow-lg"
        style={{
          background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #8b5cf6 100%)',
          borderColor: 'rgba(196, 181, 253, 0.3)'
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(10px)' }}
          >
            <Buildings size={32} className="text-white" weight="duotone" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              {formData.companyName || 'Company Profile'}
            </h1>
            <p className="text-purple-100 text-sm">
              {formData.id ? `ID: ${formData.id}` : 'Complete your business profile'}
            </p>
          </div>
          {formData.id && (
            <Badge className="bg-white/20 text-white border-white/30 hidden sm:flex">
              <CheckCircle size={14} className="mr-1" weight="fill" />
              Registered
            </Badge>
          )}
        </div>
      </div>

      {/* Company Information Section */}
      <div
        className="rounded-xl border shadow-md overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 50%, #e0e7ff 100%)',
          borderColor: 'rgba(196, 181, 253, 0.5)'
        }}
      >
        <div className="p-4 border-b border-purple-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center">
            <Buildings size={20} className="text-white" weight="fill" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">Business Details</h2>
            <p className="text-xs text-gray-500">Company name, type and category</p>
          </div>
        </div>
        <div className="p-4 bg-white/80">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="companyId" className="text-xs font-semibold text-gray-600">Company ID</Label>
              <Input
                id="companyId"
                value={formData.id || 'Auto-generated'}
                disabled
                className="bg-gray-100 border-gray-300 h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="companyName" className="text-xs font-semibold text-gray-600">Company Name *</Label>
              <Input
                id="companyName"
                maxLength={40}
                value={formData.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                placeholder="Enter company name"
                disabled={saving}
                className="h-11 border-gray-400 focus:border-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="aliasName" className="text-xs font-semibold text-gray-600">Alias Name</Label>
              <Input
                id="aliasName"
                maxLength={40}
                value={formData.aliasName}
                onChange={(e) => handleChange('aliasName', e.target.value)}
                placeholder="Enter alias name"
                disabled={saving}
                className="h-11 border-gray-400 focus:border-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="businessType" className="text-xs font-semibold text-gray-600">Business Type *</Label>
              <Select
                value={formData.businessType}
                onValueChange={(value) => handleChange('businessType', value)}
                disabled={saving}
              >
                <SelectTrigger id="businessType" className="h-11 border-gray-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="sales_and_services">Sales & Services</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="productCategory" className="text-xs font-semibold text-gray-600">Product Category</Label>
              <Input
                id="productCategory"
                value={formData.productCategory}
                onChange={(e) => handleChange('productCategory', e.target.value)}
                placeholder="e.g., Readymades"
                disabled={saving}
                className="h-11 border-gray-400 focus:border-purple-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Address Section */}
      <div
        className="rounded-xl border shadow-md overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 50%, #e0e7ff 100%)',
          borderColor: 'rgba(196, 181, 253, 0.5)'
        }}
      >
        <div className="p-4 border-b border-purple-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center">
            <MapPin size={20} className="text-white" weight="fill" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">Address Information</h2>
            <p className="text-xs text-gray-500">Business location details</p>
          </div>
        </div>
        <div className="p-4 bg-white/80">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="address1" className="text-xs font-semibold text-gray-600">Address Line 1 *</Label>
              <Input
                id="address1"
                maxLength={40}
                value={formData.address1}
                onChange={(e) => handleChange('address1', e.target.value)}
                placeholder="Enter address line 1"
                disabled={saving}
                className="h-11 border-gray-400 focus:border-purple-500"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="address2" className="text-xs font-semibold text-gray-600">Address Line 2</Label>
              <Input
                id="address2"
                maxLength={40}
                value={formData.address2}
                onChange={(e) => handleChange('address2', e.target.value)}
                placeholder="Enter address line 2"
                disabled={saving}
                className="h-11 border-gray-400 focus:border-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="state" className="text-xs font-semibold text-gray-600">State *</Label>
              <Select
                value={formData.state}
                onValueChange={(value) => handleChange('state', value)}
                disabled={saving}
              >
                <SelectTrigger id="state" className="h-11 border-gray-400">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {indianStates.map(state => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="city" className="text-xs font-semibold text-gray-600">City *</Label>
              <Select
                value={formData.city}
                onValueChange={(value) => handleChange('city', value)}
                disabled={saving}
              >
                <SelectTrigger id="city" className="h-11 border-gray-400">
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {indianCities.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pincode" className="text-xs font-semibold text-gray-600">Pincode *</Label>
              <Input
                id="pincode"
                maxLength={6}
                value={formData.pincode}
                onChange={(e) => handleChange('pincode', e.target.value.replace(/\D/g, ''))}
                placeholder="6-digit pincode"
                disabled={saving}
                className="h-11 border-gray-400 focus:border-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="region" className="text-xs font-semibold text-gray-600">Region *</Label>
              <Select
                value={formData.region}
                onValueChange={(value) => handleChange('region', value)}
                disabled={saving}
              >
                <SelectTrigger id="region" className="h-11 border-gray-400">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {indianRegions.map(region => (
                    <SelectItem key={region} value={region}>{region}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="country" className="text-xs font-semibold text-gray-600">Country</Label>
              <Input
                id="country"
                value={formData.country}
                disabled
                className="h-11 bg-gray-100 border-gray-300"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div
        className="rounded-xl border shadow-md overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 50%, #e0e7ff 100%)',
          borderColor: 'rgba(196, 181, 253, 0.5)'
        }}
      >
        <div className="p-4 border-b border-purple-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-600 flex items-center justify-center">
            <Phone size={20} className="text-white" weight="fill" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">Contact Information</h2>
            <p className="text-xs text-gray-500">Phone and email details</p>
          </div>
        </div>
        <div className="p-4 bg-white/80">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="contactNumber" className="text-xs font-semibold text-gray-600">Contact Number *</Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">+91</div>
                <Input
                  id="contactNumber"
                  maxLength={10}
                  value={formData.contactNumber}
                  onChange={(e) => handleChange('contactNumber', e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter number"
                  disabled={saving}
                  className="h-11 pl-12 border-gray-400 focus:border-purple-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-gray-600">Email Address *</Label>
              <div className="relative">
                <EnvelopeSimple className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="company@example.com"
                  disabled={saving}
                  className="h-11 pl-10 border-gray-400 focus:border-purple-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tax & Legal Section */}
      <div
        className="rounded-xl border shadow-md overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 50%, #e0e7ff 100%)',
          borderColor: 'rgba(196, 181, 253, 0.5)'
        }}
      >
        <div className="p-4 border-b border-purple-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-fuchsia-600 flex items-center justify-center">
            <IdentificationCard size={20} className="text-white" weight="fill" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">Tax & Legal Information</h2>
            <p className="text-xs text-gray-500">PAN, GSTIN and registration details</p>
          </div>
        </div>
        <div className="p-4 bg-white/80">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="panNumber" className="text-xs font-semibold text-gray-600">PAN Number *</Label>
              <Input
                id="panNumber"
                maxLength={10}
                value={formData.panNumber}
                onChange={(e) => handleChange('panNumber', e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                disabled={saving}
                className="h-11 border-gray-400 focus:border-purple-500 uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gstinNumber" className="text-xs font-semibold text-gray-600">GSTIN Number *</Label>
              <Input
                id="gstinNumber"
                maxLength={15}
                value={formData.gstinNumber}
                onChange={(e) => handleChange('gstinNumber', e.target.value.toUpperCase())}
                placeholder="22ABCDE1234F1Z5"
                disabled={saving}
                className="h-11 border-gray-400 focus:border-purple-500 uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="udhyamMsmeNo" className="text-xs font-semibold text-gray-600">UDHYAM/MSME No</Label>
              <Input
                id="udhyamMsmeNo"
                maxLength={15}
                value={formData.udhyamMsmeNo}
                onChange={(e) => handleChange('udhyamMsmeNo', e.target.value)}
                placeholder="Enter UDHYAM/MSME number"
                disabled={saving}
                className="h-11 border-gray-400 focus:border-purple-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bank Account Section */}
      <div
        className="rounded-xl border shadow-md overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 50%, #e0e7ff 100%)',
          borderColor: 'rgba(196, 181, 253, 0.5)'
        }}
      >
        <div className="p-4 border-b border-purple-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center">
            <Bank size={20} className="text-white" weight="fill" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">Bank Account Details</h2>
            <p className="text-xs text-gray-500">For receiving customer payments</p>
          </div>
        </div>
        <div className="p-4 bg-white/80">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="bankName" className="text-xs font-semibold text-gray-600">Bank Name *</Label>
              <Input
                id="bankName"
                value={formData.bankName}
                onChange={(e) => handleChange('bankName', e.target.value)}
                placeholder="Enter bank name"
                disabled={saving}
                className="h-11 border-gray-400 focus:border-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="branchName" className="text-xs font-semibold text-gray-600">Branch Name</Label>
              <Input
                id="branchName"
                value={formData.branchName}
                onChange={(e) => handleChange('branchName', e.target.value)}
                placeholder="Enter branch name"
                disabled={saving}
                className="h-11 border-gray-400 focus:border-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="accountNumber" className="text-xs font-semibold text-gray-600">Account Number *</Label>
              <Input
                id="accountNumber"
                value={formData.accountNumber}
                onChange={(e) => handleChange('accountNumber', e.target.value.replace(/\D/g, ''))}
                placeholder="Enter account number"
                disabled={saving}
                className="h-11 border-gray-400 focus:border-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="accountHolderName" className="text-xs font-semibold text-gray-600">Account Holder Name *</Label>
              <Input
                id="accountHolderName"
                value={formData.accountHolderName}
                onChange={(e) => handleChange('accountHolderName', e.target.value)}
                placeholder="Enter account holder name"
                disabled={saving}
                className="h-11 border-gray-400 focus:border-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ifscCode" className="text-xs font-semibold text-gray-600">IFSC Code *</Label>
              <Input
                id="ifscCode"
                maxLength={11}
                value={formData.ifscCode}
                onChange={(e) => handleChange('ifscCode', e.target.value.toUpperCase())}
                placeholder="SBIN0001234"
                disabled={saving}
                className="h-11 border-gray-400 focus:border-purple-500 uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bankContactNumber" className="text-xs font-semibold text-gray-600">Bank Contact Number</Label>
              <Input
                id="bankContactNumber"
                value={formData.bankContactNumber}
                onChange={(e) => handleChange('bankContactNumber', e.target.value.replace(/\D/g, ''))}
                placeholder="Enter bank contact number"
                disabled={saving}
                className="h-11 border-gray-400 focus:border-purple-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons - Sticky at bottom */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm py-4 -mx-3 sm:-mx-4 px-3 sm:px-4 border-t">
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onBack} disabled={saving} className="h-11 px-6">
            Cancel
          </Button>
          <Button onClick={handleSave} className="gap-2 h-11 px-6" disabled={saving}>
            {saving ? (
              <>
                <Spinner size={20} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <FloppyDisk size={20} weight="fill" />
                Save Profile
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

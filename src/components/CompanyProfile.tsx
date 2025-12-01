import { useState, useEffect } from 'react';
import { useStorage } from '@/hooks/use-storage';
import { CompanyProfile, BusinessType } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, FloppyDisk } from '@phosphor-icons/react';
import { toast } from 'sonner';

interface CompanyProfileProps {
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

export function CompanyProfile({ onBack }: CompanyProfileProps) {
  const [companyProfile, setCompanyProfile] = useStorage<CompanyProfile | null>('company_profile', null);
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

  useEffect(() => {
    if (companyProfile) {
      setFormData(companyProfile);
    }
  }, [companyProfile]);

  const handleChange = (field: keyof CompanyProfile, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
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

    if (!formData.state) {
      toast.error('State is required');
      return;
    }

    if (!formData.contactNumber || formData.contactNumber.length > 20) {
      toast.error('Contact number is required (max 20 digits)');
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

    // Generate ID if new profile
    const profileData: CompanyProfile = {
      id: companyProfile?.id || `COMP${Date.now()}`,
      companyName: formData.companyName,
      aliasName: formData.aliasName,
      businessType: formData.businessType as BusinessType,
      productCategory: formData.productCategory || 'Readymades',
      address1: formData.address1,
      address2: formData.address2,
      city: formData.city,
      pincode: formData.pincode,
      region: formData.region,
      state: formData.state,
      country: formData.country || 'India',
      contactNumber: formData.contactNumber,
      panNumber: formData.panNumber.toUpperCase(),
      udhyamMsmeNo: formData.udhyamMsmeNo,
      gstinNumber: formData.gstinNumber.toUpperCase(),
      bankName: formData.bankName,
      accountNumber: formData.accountNumber,
      accountHolderName: formData.accountHolderName,
      branchName: formData.branchName || '',
      ifscCode: formData.ifscCode.toUpperCase(),
      bankContactNumber: formData.bankContactNumber || '',
      createdAt: companyProfile?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    setCompanyProfile(profileData);
    toast.success('Profile updated successfully!');
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft size={20} />
          Back
        </Button>
      </div>

      <div className="space-y-6">
        {/* Company Information Section */}
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>Edit your company details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyId">Company ID / Tech No</Label>
                <Input
                  id="companyId"
                  value={companyProfile?.id || 'Auto-generated'}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  maxLength={40}
                  value={formData.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  placeholder="Enter company name"
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessType">Business Type *</Label>
                <Select
                  value={formData.businessType}
                  onValueChange={(value) => handleChange('businessType', value)}
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address1">Address 1 *</Label>
                <Input
                  id="address1"
                  maxLength={40}
                  value={formData.address1}
                  onChange={(e) => handleChange('address1', e.target.value)}
                  placeholder="Enter address line 1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address2">Address 2</Label>
                <Input
                  id="address2"
                  maxLength={40}
                  value={formData.address2}
                  onChange={(e) => handleChange('address2', e.target.value)}
                  placeholder="Enter address line 2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Select
                  value={formData.city}
                  onValueChange={(value) => handleChange('city', value)}
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Select
                  value={formData.state}
                  onValueChange={(value) => handleChange('state', value)}
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
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  value={formData.country}
                  disabled
                  className="bg-muted"
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="panNumber">PAN Number *</Label>
                <Input
                  id="panNumber"
                  maxLength={10}
                  value={formData.panNumber}
                  onChange={(e) => handleChange('panNumber', e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gstinNumber">GSTIN Number *</Label>
                <Input
                  id="gstinNumber"
                  maxLength={15}
                  value={formData.gstinNumber}
                  onChange={(e) => handleChange('gstinNumber', e.target.value.toUpperCase())}
                  placeholder="22ABCDE1234F1Z5"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Details Section */}
        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
            <CardDescription>Bank account for customer payments (Net Banking, UPI, Cards)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name *</Label>
                <Input
                  id="bankName"
                  value={formData.bankName}
                  onChange={(e) => handleChange('bankName', e.target.value)}
                  placeholder="Enter bank name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number *</Label>
                <Input
                  id="accountNumber"
                  value={formData.accountNumber}
                  onChange={(e) => handleChange('accountNumber', e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter account number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountHolderName">Account Holder Name *</Label>
                <Input
                  id="accountHolderName"
                  value={formData.accountHolderName}
                  onChange={(e) => handleChange('accountHolderName', e.target.value)}
                  placeholder="Enter account holder name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="branchName">Branch Name</Label>
                <Input
                  id="branchName"
                  value={formData.branchName}
                  onChange={(e) => handleChange('branchName', e.target.value)}
                  placeholder="Enter branch name"
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bankContactNumber">Bank Contact Number</Label>
                <Input
                  id="bankContactNumber"
                  value={formData.bankContactNumber}
                  onChange={(e) => handleChange('bankContactNumber', e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter bank contact number"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <Button variant="outline" onClick={onBack}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <FloppyDisk size={20} />
            Save Profile
          </Button>
        </div>
      </div>
    </div>
  );
}

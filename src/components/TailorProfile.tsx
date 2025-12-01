import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, ArrowLeft, FloppyDisk } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Vendor } from '@/lib/types';
import { getVendor, updateVendor } from '@/lib/firestore/vendorService';

interface TailorProfileProps {
  vendorId: string;
  onBack: () => void;
}

export function TailorProfile({ vendorId, onBack }: TailorProfileProps) {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    tailorName: '',
    aliasName: '',
    gender: 'male' as 'male' | 'female' | 'other',
    businessType: 'individual' as 'individual' | 'company',
    email: '',
    address1: '',
    address2: '',
    city: '',
    pincode: '',
    region: '',
    state: '',
    country: '',
    contactNumber: '',
    whatsappNumber: '',
  });

  useEffect(() => {
    loadVendorData();
  }, [vendorId]);

  const loadVendorData = async () => {
    try {
      setLoading(true);
      const vendorData = await getVendor(vendorId);

      if (vendorData) {
        setVendor(vendorData);
        setFormData({
          tailorName: vendorData.tailorName,
          aliasName: vendorData.aliasName || '',
          gender: vendorData.gender,
          businessType: vendorData.businessType,
          email: vendorData.email,
          address1: vendorData.address1,
          address2: vendorData.address2 || '',
          city: vendorData.city,
          pincode: vendorData.pincode,
          region: vendorData.region,
          state: vendorData.state,
          country: vendorData.country,
          contactNumber: vendorData.contactNumber,
          whatsappNumber: vendorData.whatsappNumber,
        });
      } else {
        toast.error('Vendor profile not found');
        onBack();
      }
    } catch (error) {
      console.error('Error loading vendor data:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      // Validation
      if (!formData.tailorName.trim()) {
        toast.error('Tailor name is required');
        return;
      }

      if (!formData.email.trim() || !formData.email.includes('@')) {
        toast.error('Valid email is required');
        return;
      }

      if (!formData.contactNumber.trim() || formData.contactNumber.length < 10) {
        toast.error('Valid contact number is required (min 10 digits)');
        return;
      }

      if (!formData.whatsappNumber.trim() || formData.whatsappNumber.length < 10) {
        toast.error('Valid WhatsApp number is required (min 10 digits)');
        return;
      }

      if (!formData.pincode.trim() || formData.pincode.length !== 6) {
        toast.error('Valid 6-digit pincode is required');
        return;
      }

      if (formData.tailorName.length > 40) {
        toast.error('Tailor name must be maximum 40 characters');
        return;
      }

      if (formData.aliasName && formData.aliasName.length > 40) {
        toast.error('Alias name must be maximum 40 characters');
        return;
      }

      if (formData.address1.length > 40) {
        toast.error('Address line 1 must be maximum 40 characters');
        return;
      }

      if (formData.address2 && formData.address2.length > 40) {
        toast.error('Address line 2 must be maximum 40 characters');
        return;
      }

      setSaving(true);

      // Update vendor profile
      await updateVendor(vendorId, {
        tailorName: formData.tailorName,
        aliasName: formData.aliasName || undefined,
        gender: formData.gender,
        businessType: formData.businessType,
        email: formData.email,
        address1: formData.address1,
        address2: formData.address2 || undefined,
        city: formData.city,
        pincode: formData.pincode,
        region: formData.region,
        state: formData.state,
        country: formData.country,
        contactNumber: formData.contactNumber,
        whatsappNumber: formData.whatsappNumber,
      });

      toast.success('Profile updated successfully');

      // Reload vendor data
      await loadVendorData();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">My Profile</h1>
          <p className="text-sm text-muted-foreground">
            Tailor Code: {vendor.tailorCode}
          </p>
        </div>
      </div>

      {/* Profile Form */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center gap-2">
            <User size={24} className="text-primary" weight="duotone" />
            <CardTitle>Profile Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tailorName">
                  Tailor Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="tailorName"
                  value={formData.tailorName}
                  onChange={(e) => handleInputChange('tailorName', e.target.value)}
                  placeholder="Enter tailor name"
                  maxLength={40}
                />
              </div>

              <div>
                <Label htmlFor="aliasName">Alias Name</Label>
                <Input
                  id="aliasName"
                  value={formData.aliasName}
                  onChange={(e) => handleInputChange('aliasName', e.target.value)}
                  placeholder="Enter alias name"
                  maxLength={40}
                />
              </div>

              <div>
                <Label htmlFor="gender">
                  Gender <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => handleInputChange('gender', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="businessType">
                  Business Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.businessType}
                  onValueChange={(value) => handleInputChange('businessType', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Contact Information */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Enter email"
                  />
                </div>

                <div>
                  <Label htmlFor="contactNumber">
                    Contact Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="contactNumber"
                    value={formData.contactNumber}
                    onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                    placeholder="Enter contact number"
                    maxLength={15}
                  />
                </div>

                <div>
                  <Label htmlFor="whatsappNumber">
                    WhatsApp Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="whatsappNumber"
                    value={formData.whatsappNumber}
                    onChange={(e) => handleInputChange('whatsappNumber', e.target.value)}
                    placeholder="Enter WhatsApp number"
                    maxLength={15}
                  />
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">Address Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="address1">
                    Address Line 1 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="address1"
                    value={formData.address1}
                    onChange={(e) => handleInputChange('address1', e.target.value)}
                    placeholder="Enter address line 1"
                    maxLength={40}
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="address2">Address Line 2</Label>
                  <Input
                    id="address2"
                    value={formData.address2}
                    onChange={(e) => handleInputChange('address2', e.target.value)}
                    placeholder="Enter address line 2"
                    maxLength={40}
                  />
                </div>

                <div>
                  <Label htmlFor="city">
                    City <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="Enter city"
                  />
                </div>

                <div>
                  <Label htmlFor="pincode">
                    Pincode <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="pincode"
                    value={formData.pincode}
                    onChange={(e) => handleInputChange('pincode', e.target.value)}
                    placeholder="Enter 6-digit pincode"
                    maxLength={6}
                  />
                </div>

                <div>
                  <Label htmlFor="state">
                    State <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    placeholder="Enter state"
                  />
                </div>

                <div>
                  <Label htmlFor="country">
                    Country <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    placeholder="Enter country"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onBack}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <FloppyDisk size={16} className="mr-2" weight="duotone" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

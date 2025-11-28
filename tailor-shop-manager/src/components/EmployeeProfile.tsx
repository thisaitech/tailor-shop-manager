import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, ArrowLeft, User, Phone, MapPin, Briefcase } from '@phosphor-icons/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { updateEmployee, getEmployee, EmployeeWithCompany } from '@/lib/firestore/employeeService';

interface EmployeeProfileProps {
  onBack?: () => void;
}

export function EmployeeProfile({ onBack }: EmployeeProfileProps) {
  const { employee } = useAuth();
  const [employeeData, setEmployeeData] = useState<EmployeeWithCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editFormData, setEditFormData] = useState({
    address1: '',
    address2: '',
    city: '',
    pincode: '',
    region: '',
    state: '',
    country: '',
    whatsappNumber: '',
    profilePicture: '',
  });

  useEffect(() => {
    loadEmployeeData();
  }, [employee?.id]);

  const loadEmployeeData = async () => {
    if (!employee?.id) return;

    try {
      setLoading(true);
      const data = await getEmployee(employee.id);
      if (data) {
        setEmployeeData(data);
        setEditFormData({
          address1: data.address1 || '',
          address2: data.address2 || '',
          city: data.city || '',
          pincode: data.pincode || '',
          region: data.region || '',
          state: data.state || '',
          country: data.country || '',
          whatsappNumber: data.whatsappNumber || '',
          profilePicture: data.profilePicture || '',
        });
      }
    } catch (error) {
      console.error('Error loading employee data:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    setShowEditDialog(true);
  };

  const handleSaveChanges = async () => {
    if (!employee?.id) return;

    // Validate pincode (6 digits)
    if (editFormData.pincode && !/^\d{6}$/.test(editFormData.pincode)) {
      toast.error('Pincode must be exactly 6 digits');
      return;
    }

    // Validate whatsapp number (up to 15 digits)
    if (editFormData.whatsappNumber && !/^\d{1,15}$/.test(editFormData.whatsappNumber)) {
      toast.error('WhatsApp number must be up to 15 digits');
      return;
    }

    try {
      await updateEmployee(employee.id, editFormData);

      // Reload employee data
      await loadEmployeeData();

      setShowEditDialog(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!employeeData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Profile data not found</p>
        </div>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-6">
      {onBack && (
        <div className="mb-6">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft size={20} />
          </Button>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-2xl font-bold">My Profile</h2>
        <p className="text-muted-foreground">Welcome, {employeeData.name}</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="address">Address</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          {/* Personal Information Card */}
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
                  <User size={24} className="text-white" weight="duotone" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Personal Information</h3>
                </div>
              </div>
              <Button
                onClick={handleEditProfile}
                size="sm"
                variant="ghost"
                className="gap-1.5 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
              >
                <Pencil size={16} />
                Edit
              </Button>
            </div>

            {/* Profile Avatar and Name */}
            <div className="p-4 border-b border-purple-200/50">
              <div className="flex items-center gap-4">
                {employeeData.profilePicture ? (
                  <img
                    src={employeeData.profilePicture}
                    alt={employeeData.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md"
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl border-2 border-white shadow-md"
                    style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #6366f1 100%)' }}
                  >
                    {employeeData.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{employeeData.name}</h3>
                  <p className="text-sm text-gray-600">{employeeData.role ? employeeData.role.charAt(0).toUpperCase() + employeeData.role.slice(1) : 'Employee'}</p>
                </div>
              </div>
            </div>

            {/* Details Section */}
            <div className="p-4 bg-white/60 space-y-4">
              <div>
                <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Employee Name</p>
                <p className="font-semibold text-gray-900">{employeeData.name}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Gender</p>
                <p className="font-semibold text-gray-900 capitalize">{employeeData.gender || '-'}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Employee Code</p>
                <p className="font-semibold text-purple-600">{employeeData.employeeCode}</p>
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
                <p className="font-semibold text-gray-900">+91 {employeeData.contactNumber}</p>
              </div>
              {employeeData.whatsappNumber && (
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">WhatsApp</p>
                  <p className="font-semibold text-gray-900">+91 {employeeData.whatsappNumber}</p>
                </div>
              )}
              {employeeData.email && (
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Email</p>
                  <p className="font-semibold text-gray-900">{employeeData.email}</p>
                </div>
              )}
            </div>
          </div>

          {/* Work Information Card */}
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
                style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #6366f1 100%)' }}
              >
                <Briefcase size={24} className="text-white" weight="duotone" />
              </div>
              <h3 className="font-semibold text-gray-900">Work Information</h3>
            </div>

            {/* Details Section */}
            <div className="p-4 bg-white/60 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Role</p>
                  <p className="font-semibold text-gray-900 capitalize">{employeeData.role}</p>
                </div>
                {employeeData.designation && (
                  <div>
                    <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Designation</p>
                    <p className="font-semibold text-gray-900">{employeeData.designation}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Joining Date</p>
                <p className="font-semibold text-gray-900">
                  {new Date(employeeData.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
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
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-purple-200/50">
              <div
                className="p-2.5 rounded-xl"
                style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}
              >
                <MapPin size={24} className="text-white" weight="duotone" />
              </div>
              <h3 className="font-semibold text-gray-900">Address Information</h3>
            </div>

            {/* Details Section */}
            <div className="p-4 bg-white/60 space-y-4">
              {employeeData.address1 && (
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Address Line 1</p>
                  <p className="font-semibold text-gray-900">{employeeData.address1}</p>
                </div>
              )}
              {employeeData.address2 && (
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Address Line 2</p>
                  <p className="font-semibold text-gray-900">{employeeData.address2}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                {employeeData.city && (
                  <div>
                    <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">City</p>
                    <p className="font-semibold text-gray-900">{employeeData.city}</p>
                  </div>
                )}
                {employeeData.state && (
                  <div>
                    <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">State</p>
                    <p className="font-semibold text-gray-900">{employeeData.state}</p>
                  </div>
                )}
              </div>
              {employeeData.pincode && (
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Pincode</p>
                  <p className="font-semibold text-gray-900">{employeeData.pincode}</p>
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
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your contact information and address details. Sensitive fields cannot be edited.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* WhatsApp Number */}
              <div className="space-y-2">
                <Label htmlFor="editWhatsapp">WhatsApp Number</Label>
                <Input
                  id="editWhatsapp"
                  maxLength={15}
                  value={editFormData.whatsappNumber}
                  onChange={(e) => setEditFormData({ ...editFormData, whatsappNumber: e.target.value.replace(/\D/g, '') })}
                  placeholder="Up to 15 digits"
                />
              </div>

              {/* Address 1 */}
              <div className="space-y-2">
                <Label htmlFor="editAddress1">Address Line 1</Label>
                <Input
                  id="editAddress1"
                  maxLength={40}
                  value={editFormData.address1}
                  onChange={(e) => setEditFormData({ ...editFormData, address1: e.target.value })}
                  placeholder="Enter address"
                />
              </div>

              {/* Address 2 */}
              <div className="space-y-2">
                <Label htmlFor="editAddress2">Address Line 2</Label>
                <Input
                  id="editAddress2"
                  maxLength={40}
                  value={editFormData.address2}
                  onChange={(e) => setEditFormData({ ...editFormData, address2: e.target.value })}
                  placeholder="Enter address"
                />
              </div>

              {/* City */}
              <div className="space-y-2">
                <Label htmlFor="editCity">City</Label>
                <Input
                  id="editCity"
                  value={editFormData.city}
                  onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                  placeholder="Enter city"
                />
              </div>

              {/* Pincode */}
              <div className="space-y-2">
                <Label htmlFor="editPincode">Pincode</Label>
                <Input
                  id="editPincode"
                  maxLength={6}
                  value={editFormData.pincode}
                  onChange={(e) => setEditFormData({ ...editFormData, pincode: e.target.value.replace(/\D/g, '') })}
                  placeholder="6 digits"
                />
              </div>

              {/* Region */}
              <div className="space-y-2">
                <Label htmlFor="editRegion">Region</Label>
                <Input
                  id="editRegion"
                  value={editFormData.region}
                  onChange={(e) => setEditFormData({ ...editFormData, region: e.target.value })}
                  placeholder="Enter region"
                />
              </div>

              {/* State */}
              <div className="space-y-2">
                <Label htmlFor="editState">State</Label>
                <Input
                  id="editState"
                  value={editFormData.state}
                  onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                  placeholder="Enter state"
                />
              </div>

              {/* Country */}
              <div className="space-y-2">
                <Label htmlFor="editCountry">Country</Label>
                <Input
                  id="editCountry"
                  value={editFormData.country}
                  onChange={(e) => setEditFormData({ ...editFormData, country: e.target.value })}
                  placeholder="Enter country"
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> Employee Code, Name, Gender, Role, and Access Permissions cannot be edited.
                Please contact your administrator to change these details.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveChanges}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserCircle, Pencil, ArrowLeft } from '@phosphor-icons/react';
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
    <div className="container mx-auto p-4 max-w-4xl">
      {onBack && (
        <div className="mb-6">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft size={20} />
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {employeeData.profilePicture ? (
                <img
                  src={employeeData.profilePicture}
                  alt={employeeData.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCircle size={48} className="text-primary" />
                </div>
              )}
              <div>
                <CardTitle className="text-2xl">{employeeData.name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Employee Code: {employeeData.employeeCode}
                </p>
              </div>
            </div>
            <Button onClick={handleEditProfile} className="gap-2">
              <Pencil size={18} />
              Edit Profile
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Employee Name</Label>
                  <p className="font-medium">{employeeData.name}</p>
                </div>
                {employeeData.aliasName && (
                  <div>
                    <Label className="text-muted-foreground">Alias Name</Label>
                    <p className="font-medium">{employeeData.aliasName}</p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">Gender</Label>
                  <p className="font-medium capitalize">{employeeData.gender}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Employee Code</Label>
                  <p className="font-medium">{employeeData.employeeCode}</p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Contact Number</Label>
                  <p className="font-medium">{employeeData.contactNumber}</p>
                </div>
                {employeeData.whatsappNumber && (
                  <div>
                    <Label className="text-muted-foreground">WhatsApp Number</Label>
                    <p className="font-medium">{employeeData.whatsappNumber}</p>
                  </div>
                )}
                {employeeData.email && (
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{employeeData.email}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Address Information */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Address Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {employeeData.address1 && (
                  <div>
                    <Label className="text-muted-foreground">Address Line 1</Label>
                    <p className="font-medium">{employeeData.address1}</p>
                  </div>
                )}
                {employeeData.address2 && (
                  <div>
                    <Label className="text-muted-foreground">Address Line 2</Label>
                    <p className="font-medium">{employeeData.address2}</p>
                  </div>
                )}
                {employeeData.city && (
                  <div>
                    <Label className="text-muted-foreground">City</Label>
                    <p className="font-medium">{employeeData.city}</p>
                  </div>
                )}
                {employeeData.pincode && (
                  <div>
                    <Label className="text-muted-foreground">Pincode</Label>
                    <p className="font-medium">{employeeData.pincode}</p>
                  </div>
                )}
                {employeeData.state && (
                  <div>
                    <Label className="text-muted-foreground">State</Label>
                    <p className="font-medium">{employeeData.state}</p>
                  </div>
                )}
                {employeeData.country && (
                  <div>
                    <Label className="text-muted-foreground">Country</Label>
                    <p className="font-medium">{employeeData.country}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Work Information */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Work Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Role</Label>
                  <p className="font-medium capitalize">{employeeData.role}</p>
                </div>
                {employeeData.designation && (
                  <div>
                    <Label className="text-muted-foreground">Designation</Label>
                    <p className="font-medium">{employeeData.designation}</p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">Joining Date</Label>
                  <p className="font-medium">
                    {new Date(employeeData.joiningDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
}

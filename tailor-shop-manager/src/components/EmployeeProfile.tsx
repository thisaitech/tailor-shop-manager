import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserCircle, Pencil, ArrowLeft, User, Phone, MapPin, Briefcase } from '@phosphor-icons/react';
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="address">Address</TabsTrigger>
          <TabsTrigger value="work">Work Info</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <User size={32} className="text-primary" weight="duotone" />
                  </div>
                  <div>
                    <CardTitle>Personal Information</CardTitle>
                    <p className="text-sm text-muted-foreground">Your basic profile details</p>
                  </div>
                </div>
                <Button onClick={handleEditProfile} size="sm" className="gap-2">
                  <Pencil size={16} />
                  Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                {employeeData.profilePicture ? (
                  <img
                    src={employeeData.profilePicture}
                    alt={employeeData.name}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserCircle size={56} className="text-primary" />
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-semibold">{employeeData.name}</h3>
                  <p className="text-sm text-muted-foreground">Employee Code: {employeeData.employeeCode}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Employee Name</p>
                  <p className="font-medium">{employeeData.name}</p>
                </div>
                {employeeData.aliasName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Alias Name</p>
                    <p className="font-medium">{employeeData.aliasName}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Gender</p>
                  <p className="font-medium capitalize">{employeeData.gender}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Employee Code</p>
                  <p className="font-medium">{employeeData.employeeCode}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-green-500/10 p-3 rounded-full">
                  <Phone size={32} className="text-green-500" weight="duotone" />
                </div>
                <div>
                  <CardTitle>Contact Information</CardTitle>
                  <p className="text-sm text-muted-foreground">Your contact details</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Contact Number</p>
                  <p className="font-medium">{employeeData.contactNumber}</p>
                </div>
                {employeeData.whatsappNumber && (
                  <div>
                    <p className="text-sm text-muted-foreground">WhatsApp Number</p>
                    <p className="font-medium">{employeeData.whatsappNumber}</p>
                  </div>
                )}
                {employeeData.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{employeeData.email}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Address Tab */}
        <TabsContent value="address" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/10 p-3 rounded-full">
                  <MapPin size={32} className="text-blue-500" weight="duotone" />
                </div>
                <div>
                  <CardTitle>Address Information</CardTitle>
                  <p className="text-sm text-muted-foreground">Your residential address</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {employeeData.address1 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Address Line 1</p>
                    <p className="font-medium">{employeeData.address1}</p>
                  </div>
                )}
                {employeeData.address2 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Address Line 2</p>
                    <p className="font-medium">{employeeData.address2}</p>
                  </div>
                )}
                {employeeData.city && (
                  <div>
                    <p className="text-sm text-muted-foreground">City</p>
                    <p className="font-medium">{employeeData.city}</p>
                  </div>
                )}
                {employeeData.pincode && (
                  <div>
                    <p className="text-sm text-muted-foreground">Pincode</p>
                    <p className="font-medium">{employeeData.pincode}</p>
                  </div>
                )}
                {employeeData.region && (
                  <div>
                    <p className="text-sm text-muted-foreground">Region</p>
                    <p className="font-medium">{employeeData.region}</p>
                  </div>
                )}
                {employeeData.state && (
                  <div>
                    <p className="text-sm text-muted-foreground">State</p>
                    <p className="font-medium">{employeeData.state}</p>
                  </div>
                )}
                {employeeData.country && (
                  <div>
                    <p className="text-sm text-muted-foreground">Country</p>
                    <p className="font-medium">{employeeData.country}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Work Info Tab */}
        <TabsContent value="work" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-purple-500/10 p-3 rounded-full">
                  <Briefcase size={32} className="text-purple-500" weight="duotone" />
                </div>
                <div>
                  <CardTitle>Work Information</CardTitle>
                  <p className="text-sm text-muted-foreground">Your employment details</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <p className="font-medium capitalize">{employeeData.role}</p>
                </div>
                {employeeData.designation && (
                  <div>
                    <p className="text-sm text-muted-foreground">Designation</p>
                    <p className="font-medium">{employeeData.designation}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Joining Date</p>
                  <p className="font-medium">
                    {new Date(employeeData.joiningDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Employee Code</p>
                  <p className="font-medium">{employeeData.employeeCode}</p>
                </div>
              </div>
            </CardContent>
          </Card>
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

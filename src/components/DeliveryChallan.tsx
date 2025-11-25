import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Truck, Camera, Trash } from '@phosphor-icons/react';
import { format } from 'date-fns';
import {
  DeliveryChallan as DeliveryChallanType,
  ShipmentType,
  createDeliveryChallan,
  getDeliveryChallansByCompany,
} from '@/lib/firestore/deliveryChallanService';
import { getVendorsByCompany, Vendor } from '@/lib/firestore/vendorService';
import { getCompanyProfile } from '@/lib/firestore/companyService';
import { WebcamCapture } from '@/components/WebcamCapture';
import { uploadImageToStorage } from '@/lib/firebase/storageService';

interface DeliveryChallanProps {
  onBack: () => void;
}

export function DeliveryChallan({ onBack }: DeliveryChallanProps) {
  const { user } = useAuth();
  const [challans, setChallans] = useState<DeliveryChallanType[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string>('');

  // Form state
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [jobWorkNo, setJobWorkNo] = useState('');
  const [shipmentType, setShipmentType] = useState<ShipmentType | ''>('');
  const [consignmentNo, setConsignmentNo] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showWebcam, setShowWebcam] = useState(false);

  // Load data
  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      // Get company profile
      const company = await getCompanyProfile(user.id);
      if (company) {
        setCompanyId(company.id);
        // Load delivery challans
        const dcList = await getDeliveryChallansByCompany(company.id);
        setChallans(dcList);
        // Load vendors (Job Work Tailors) for dropdown - use user.id as companyDocId
        const vendorList = await getVendorsByCompany(user.id);
        setVendors(vendorList);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setJobWorkNo('');
    setShipmentType('');
    setConsignmentNo('');
    setCapturedImage(null);
    setShowDialog(true);
  };

  const handleCaptureImage = (imageDataUrl: string) => {
    setCapturedImage(imageDataUrl);
    setShowWebcam(false);
  };

  const handleRemoveImage = () => {
    setCapturedImage(null);
  };

  const handleSave = async () => {
    if (!jobWorkNo) {
      toast.error('Please select a Job Work No');
      return;
    }

    if (!shipmentType) {
      toast.error('Please select the shipment type');
      return;
    }

    if (!companyId || !user?.id) {
      toast.error('Company profile not found');
      return;
    }

    setSaving(true);
    try {
      const selectedVendor = vendors.find(v => v.tailorCode === jobWorkNo);

      // Upload image if captured
      let imageUrl: string | undefined;
      if (capturedImage) {
        try {
          const imagePath = `delivery-challans/${companyId}/${Date.now()}.jpg`;
          imageUrl = await uploadImageToStorage(capturedImage, imagePath);
          console.log('Image uploaded successfully:', imageUrl);
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          toast.error('Failed to upload image. Creating DC without image.');
        }
      }

      const newDC = await createDeliveryChallan(
        {
          jobWorkNo: jobWorkNo, // This is now the tailorCode (TAL0001, etc.)
          jobWorkTailorName: selectedVendor?.tailorName,
          shipmentType: shipmentType as ShipmentType,
          consignmentNo: consignmentNo.trim(),
          imageUrl,
        },
        companyId,
        user.id
      );

      setChallans(prev => [newDC, ...prev]);
      setShowDialog(false);
      toast.success(`Delivery Challan ${newDC.dcNo} created successfully`);
    } catch (error) {
      console.error('Error creating delivery challan:', error);
      toast.error('Failed to create delivery challan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-xl font-bold">Delivery Challan</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-xl font-bold">Delivery Challan</h1>
        </div>
        <Button onClick={handleOpenDialog}>
          <Plus size={18} className="mr-1" />
          New DC
        </Button>
      </div>

      {/* Delivery Challans List */}
      <Card>
        <CardHeader className="py-3 px-4 border-b">
          <CardTitle className="text-sm font-medium">
            Delivery Challans ({challans.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {challans.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Truck size={48} className="mx-auto mb-3 opacity-30" />
              <p>No delivery challans yet</p>
              <p className="text-sm mt-1">Click "New DC" to create one</p>
            </div>
          ) : (
            <div className="divide-y">
              {challans.map(dc => (
                <div key={dc.id} className="p-4 hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{dc.dcNo}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(dc.dcDate, 'dd MMM yyyy')} • Job: {dc.jobWorkNo}
                      </p>
                      {dc.jobWorkTailorName && (
                        <p className="text-sm text-muted-foreground">
                          Tailor: {dc.jobWorkTailorName}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                        dc.shipmentType === 'courier'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {dc.shipmentType === 'courier' ? 'Courier' : 'Direct'}
                      </span>
                      {dc.consignmentNo && (
                        <p className="text-xs text-muted-foreground mt-1">
                          CN: {dc.consignmentNo}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>New Delivery Challan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* DC Date - Auto */}
            <div className="space-y-2">
              <Label>DC Date</Label>
              <Input
                value={format(new Date(), 'dd MMM yyyy')}
                disabled
                className="bg-muted"
              />
            </div>

            {/* Job Work No */}
            <div className="space-y-2">
              <Label htmlFor="jobWorkNo">Job Work No *</Label>
              <Select value={jobWorkNo} onValueChange={setJobWorkNo}>
                <SelectTrigger id="jobWorkNo">
                  <SelectValue placeholder="Select Job Work No" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No Job Work Tailors available
                    </div>
                  ) : (
                    vendors.map(vendor => (
                      <SelectItem key={vendor.id} value={vendor.tailorCode}>
                        {vendor.tailorCode} - {vendor.tailorName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Shipment Type */}
            <div className="space-y-2">
              <Label htmlFor="shipmentType">Shipment Type *</Label>
              <Select value={shipmentType} onValueChange={setShipmentType}>
                <SelectTrigger id="shipmentType">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Direct</SelectItem>
                  <SelectItem value="courier">Courier</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Consignment No */}
            <div className="space-y-2">
              <Label htmlFor="consignmentNo">Consignment No</Label>
              <Input
                id="consignmentNo"
                value={consignmentNo}
                onChange={(e) => setConsignmentNo(e.target.value.slice(0, 20))}
                placeholder="Enter consignment number"
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground">
                {consignmentNo.length}/20 characters
              </p>
            </div>

            {/* Image Capture */}
            <div className="space-y-2">
              <Label>Capture Image (Optional)</Label>
              {!capturedImage ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowWebcam(true)}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Camera size={20} weight="duotone" />
                  Capture Image
                </Button>
              ) : (
                <div className="relative">
                  <img
                    src={capturedImage}
                    alt="Captured"
                    className="w-full h-40 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2"
                  >
                    <Trash size={16} />
                  </Button>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Creating...' : 'Create DC'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Webcam Capture Modal */}
      {showWebcam && (
        <WebcamCapture
          onCapture={handleCaptureImage}
          onClose={() => setShowWebcam(false)}
        />
      )}
    </div>
  );
}

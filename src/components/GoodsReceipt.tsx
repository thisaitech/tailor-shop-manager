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
import { ArrowLeft, Plus, Package, Camera, Trash } from '@phosphor-icons/react';
import { format } from 'date-fns';
import {
  GoodsReceipt as GoodsReceiptType,
  ShipmentType,
  GoodsReceiptStatus,
  createGoodsReceipt,
  getGoodsReceiptsByCompany,
  getUsedDCNumbers,
} from '@/lib/firestore/goodsReceiptService';
import {
  DeliveryChallan,
  getDeliveryChallansByCompany,
} from '@/lib/firestore/deliveryChallanService';
import { getCompanyProfile } from '@/lib/firestore/companyService';
import { WebcamCapture } from '@/components/WebcamCapture';
import { uploadImageToStorage } from '@/lib/firebase/storageService';

interface GoodsReceiptProps {
  onBack: () => void;
}

export function GoodsReceipt({ onBack }: GoodsReceiptProps) {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<GoodsReceiptType[]>([]);
  const [deliveryChallans, setDeliveryChallans] = useState<DeliveryChallan[]>([]);
  const [availableDCs, setAvailableDCs] = useState<DeliveryChallan[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string>('');

  // Form state
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dcNo, setDcNo] = useState('');
  const [shipmentType, setShipmentType] = useState<ShipmentType | ''>('');
  const [consignmentNo, setConsignmentNo] = useState('');
  const [status, setStatus] = useState<GoodsReceiptStatus | ''>('');
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
        // Load goods receipts
        const grnList = await getGoodsReceiptsByCompany(company.id);
        setReceipts(grnList);
        // Load delivery challans
        const dcList = await getDeliveryChallansByCompany(company.id);
        setDeliveryChallans(dcList);
        // Get used DC numbers to filter available DCs
        const usedDCs = await getUsedDCNumbers(company.id);
        const available = dcList.filter(dc => !usedDCs.includes(dc.dcNo));
        setAvailableDCs(available);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setDcNo('');
    setShipmentType('');
    setConsignmentNo('');
    setStatus('');
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
    if (!dcNo) {
      toast.error('Please select a DC No');
      return;
    }

    if (!shipmentType) {
      toast.error('Please select the shipment type');
      return;
    }

    if (!status) {
      toast.error('Please select the status');
      return;
    }

    if (!companyId || !user?.id) {
      toast.error('Company profile not found');
      return;
    }

    setSaving(true);
    try {
      // Upload image if captured
      let imageUrl: string | undefined;
      if (capturedImage) {
        try {
          const imagePath = `goods-receipts/${companyId}/${Date.now()}.jpg`;
          imageUrl = await uploadImageToStorage(capturedImage, imagePath);
          console.log('Image uploaded successfully:', imageUrl);
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          toast.error('Failed to upload image. Creating GRN without image.');
        }
      }

      const newGRN = await createGoodsReceipt(
        {
          dcNo,
          shipmentType: shipmentType as ShipmentType,
          consignmentNo: consignmentNo.trim(),
          status: status as GoodsReceiptStatus,
          imageUrl,
        },
        companyId,
        user.id
      );

      setReceipts(prev => [newGRN, ...prev]);
      // Remove used DC from available list
      setAvailableDCs(prev => prev.filter(dc => dc.dcNo !== dcNo));
      setShowDialog(false);
      toast.success(`Goods Receipt ${newGRN.grnNo} created successfully`);
    } catch (error) {
      console.error('Error creating goods receipt:', error);
      toast.error('Failed to create goods receipt');
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
          <h1 className="text-xl font-bold">Goods Receipt</h1>
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
          <h1 className="text-xl font-bold">Goods Receipt</h1>
        </div>
        <Button onClick={handleOpenDialog}>
          <Plus size={18} className="mr-1" />
          New GRN
        </Button>
      </div>

      {/* Goods Receipts List */}
      <Card>
        <CardHeader className="py-3 px-4 border-b">
          <CardTitle className="text-sm font-medium">
            Goods Receipts ({receipts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {receipts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package size={48} className="mx-auto mb-3 opacity-30" />
              <p>No goods receipts yet</p>
              <p className="text-sm mt-1">Click "New GRN" to create one</p>
            </div>
          ) : (
            <div className="divide-y">
              {receipts.map(grn => (
                <div key={grn.id} className="p-4 hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{grn.grnNo}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(grn.grnDate, 'dd MMM yyyy')} • DC: {grn.dcNo}
                      </p>
                      <div className="mt-2">
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          grn.status === 'ready_to_dispatch'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {grn.status === 'ready_to_dispatch' ? 'Ready to Dispatch' : 'Move to Stitching'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                        grn.shipmentType === 'courier'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {grn.shipmentType === 'courier' ? 'Courier' : 'Direct'}
                      </span>
                      {grn.consignmentNo && (
                        <p className="text-xs text-muted-foreground mt-1">
                          CN: {grn.consignmentNo}
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
            <DialogTitle>New Goods Receipt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* GRN Date - Auto */}
            <div className="space-y-2">
              <Label>GRN Date</Label>
              <Input
                value={format(new Date(), 'dd MMM yyyy')}
                disabled
                className="bg-muted"
              />
            </div>

            {/* DC No */}
            <div className="space-y-2">
              <Label htmlFor="dcNo">DC No *</Label>
              <Select value={dcNo} onValueChange={setDcNo}>
                <SelectTrigger id="dcNo">
                  <SelectValue placeholder="Select DC No" />
                </SelectTrigger>
                <SelectContent>
                  {availableDCs.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No Delivery Challans available
                    </div>
                  ) : (
                    availableDCs.map(dc => (
                      <SelectItem key={dc.id} value={dc.dcNo}>
                        {dc.dcNo} - {dc.jobWorkTailorName || dc.jobWorkNo}
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
                  <SelectValue placeholder="Status" />
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

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="move_to_stitching">Move to Stitching</SelectItem>
                  <SelectItem value="ready_to_dispatch">Ready to Dispatch</SelectItem>
                </SelectContent>
              </Select>
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
              {saving ? 'Creating...' : 'Create GRN'}
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

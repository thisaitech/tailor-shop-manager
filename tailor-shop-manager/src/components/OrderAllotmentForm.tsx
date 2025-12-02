import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// Radio buttons replaced with touch-friendly button toggles
import { OrderAllotment, ServiceOrder, StitchingAllotmentType, Employee, Vendor, DressItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { reassignStitchedOrder } from '@/lib/firestore/orderAllotmentService';
import { User, Buildings, Scissors, CalendarBlank, Check } from '@phosphor-icons/react';

// Per-item assignment state
interface DressItemAssignment {
  dressItemId: string;
  dressItemName: string;
  quantity: number;
  stitchingCost: number;
  stitchingAllotment: StitchingAllotmentType;
  assignedTo: string;
  materialCost: number;
  jobWorkCost: number;
}

interface OrderAllotmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (allotment: Omit<OrderAllotment, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onSaveMultiple?: (allotments: Omit<OrderAllotment, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
  serviceOrders: ServiceOrder[];
  employees: Employee[];
  vendors: Vendor[];
  reassignOrder?: OrderAllotment | null; // Order to reassign (pre-populate form)
  initialServiceOrderId?: string; // Pre-select a service order (for Job Allotment from Open Orders)
}

export function OrderAllotmentForm({
  open,
  onOpenChange,
  onSave,
  onSaveMultiple,
  serviceOrders,
  employees,
  vendors,
  reassignOrder,
  initialServiceOrderId,
}: OrderAllotmentFormProps) {
  const { t } = useLanguage();

  // Order Allotment fields
  const [serviceOrderNo, setServiceOrderNo] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');

  // Per-dress-item assignments (for orders with multiple dresses)
  const [dressItemAssignments, setDressItemAssignments] = useState<DressItemAssignment[]>([]);

  // Legacy single assignment (for orders without dress items)
  const [stitchingAllotment, setStitchingAllotment] = useState<StitchingAllotmentType>('employee');
  const [assignedTo, setAssignedTo] = useState('');
  const [materialCost, setMaterialCost] = useState(0);
  const [jobWorkCost, setJobWorkCost] = useState(0);

  // Get eligible service orders (status: 'open' or 'allotment' - not yet fully allotted)
  const eligibleOrders = serviceOrders.filter(
    (order) => order.orderStatus === 'open' || order.orderStatus === 'allotment'
  );

  // Debug logging
  console.log('[OrderAllotmentForm] Total service orders:', serviceOrders.length);
  console.log('[OrderAllotmentForm] Service orders:', serviceOrders.map(o => ({ id: o.id, status: o.orderStatus })));
  console.log('[OrderAllotmentForm] Eligible orders:', eligibleOrders.length);

  // Get selected service order details
  const selectedOrder = serviceOrders.find((order) => order.id === serviceOrderNo);

  // Check if order has dress items
  const hasDressItems = selectedOrder?.dressItems && selectedOrder.dressItems.length > 0;

  // Get unallotted dress items only
  const unallottedDressItems = selectedOrder?.dressItems?.filter(item => !item.isAllotted) || [];

  // Get list of employees (filtered to tailors only) or vendors based on stitching allotment type
  const tailorEmployees = employees.filter((emp) => emp.role === 'tailor');

  // Calculate total job cost (legacy)
  const totalJobCost = materialCost + jobWorkCost;

  // Calculate total for dress item assignments
  const totalDressItemsCost = dressItemAssignments.reduce(
    (sum, item) => sum + item.materialCost + item.jobWorkCost,
    0
  );

  // Get assigned name based on selection
  const getAssignedName = (allotmentType: StitchingAllotmentType, assigneeId: string): string => {
    if (!assigneeId) return '';

    if (allotmentType === 'employee') {
      const employee = employees.find((emp) => emp.id === assigneeId);
      return employee?.name || '';
    } else {
      const vendor = vendors.find((v) => v.id === assigneeId);
      return vendor?.tailorName || '';
    }
  };

  // Initialize dress item assignments when order is selected
  useEffect(() => {
    if (selectedOrder?.dressItems && selectedOrder.dressItems.length > 0) {
      const unallotted = selectedOrder.dressItems.filter(item => !item.isAllotted);
      setDressItemAssignments(
        unallotted.map(item => ({
          dressItemId: item.id,
          dressItemName: item.dressName || item.dressType,
          quantity: item.quantity,
          stitchingCost: item.stitchingCost,
          stitchingAllotment: 'employee',
          assignedTo: '',
          materialCost: 0,
          jobWorkCost: 0,
        }))
      );
    } else {
      setDressItemAssignments([]);
    }
  }, [serviceOrderNo, selectedOrder]);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  // Pre-populate form when reassigning a stitched order
  useEffect(() => {
    if (reassignOrder && open) {
      setServiceOrderNo(reassignOrder.serviceOrderNo);
      setExpectedDeliveryDate(
        reassignOrder.expectedDeliveryDate
          ? format(reassignOrder.expectedDeliveryDate, 'yyyy-MM-dd')
          : ''
      );

      // Pre-populate legacy fields if dressItemId is not present
      if (!reassignOrder.dressItemId) {
        setStitchingAllotment(reassignOrder.stitchingAllotment);
        setAssignedTo(reassignOrder.assignedTo);
        setMaterialCost(reassignOrder.materialCost);
        setJobWorkCost(reassignOrder.jobWorkCost);
      }
    }
  }, [reassignOrder, open]);

  // Pre-select service order when initialServiceOrderId is provided (from Open Orders Job Allotment)
  useEffect(() => {
    if (initialServiceOrderId && open && !reassignOrder) {
      setServiceOrderNo(initialServiceOrderId);
      // Also set expected delivery date from the service order
      const order = serviceOrders.find(o => o.id === initialServiceOrderId);
      if (order?.expectedDeliveryDate) {
        setExpectedDeliveryDate(format(order.expectedDeliveryDate, 'yyyy-MM-dd'));
      }
    }
  }, [initialServiceOrderId, open, reassignOrder, serviceOrders]);

  // Reset assigned to when switching between employee/vendor (legacy)
  useEffect(() => {
    setAssignedTo('');
  }, [stitchingAllotment]);

  const resetForm = () => {
    setServiceOrderNo('');
    setStitchingAllotment('employee');
    setAssignedTo('');
    setMaterialCost(0);
    setJobWorkCost(0);
    setExpectedDeliveryDate('');
    setDressItemAssignments([]);
  };

  // Update a dress item assignment
  const updateDressItemAssignment = (
    dressItemId: string,
    field: keyof DressItemAssignment,
    value: any
  ) => {
    setDressItemAssignments(items =>
      items.map(item => {
        if (item.dressItemId === dressItemId) {
          const updated = { ...item, [field]: value };
          // Reset assignedTo when changing allotment type
          if (field === 'stitchingAllotment') {
            updated.assignedTo = '';
          }
          return updated;
        }
        return item;
      })
    );
  };

  const validateForm = (): boolean => {
    if (!serviceOrderNo) {
      toast.error('Please select a service order');
      return false;
    }

    if (!expectedDeliveryDate) {
      toast.error('Please select expected delivery date');
      return false;
    }

    const deliveryDateMs = new Date(expectedDeliveryDate).getTime();
    if (deliveryDateMs <= Date.now()) {
      toast.error('Expected delivery date must be a future date');
      return false;
    }

    if (!selectedOrder) {
      toast.error('Selected service order not found');
      return false;
    }

    // Validate based on whether order has dress items
    if (hasDressItems) {
      // Check that at least one dress item is assigned
      const assignedItems = dressItemAssignments.filter(item => item.assignedTo);
      if (assignedItems.length === 0) {
        toast.error('Please assign at least one dress item to a tailor');
        return false;
      }

      // Check for negative costs
      for (const item of dressItemAssignments) {
        if (item.assignedTo && (item.materialCost < 0 || item.jobWorkCost < 0)) {
          toast.error(`Costs cannot be negative for ${item.dressItemName}`);
          return false;
        }
      }
    } else {
      // Legacy validation
      if (!assignedTo) {
        toast.error(`Please select ${stitchingAllotment === 'employee' ? 'a tailor' : 'a job work tailor'}`);
        return false;
      }

      // Only validate material cost and job work cost for vendors (Job Work Tailor)
      if (stitchingAllotment === 'vendor') {
        if (materialCost < 0) {
          toast.error('Material cost cannot be negative');
          return false;
        }

        if (jobWorkCost < 0) {
          toast.error('Job work cost cannot be negative');
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const deliveryDateMs = new Date(expectedDeliveryDate).getTime();

    // Handle reassignment of stitched order
    if (reassignOrder) {
      try {
        await reassignStitchedOrder(reassignOrder.id, {
          stitchingAllotment,
          assignedTo,
          assignedName: getAssignedName(stitchingAllotment, assignedTo),
          materialCost,
          jobWorkCost,
          expectedDeliveryDate: deliveryDateMs,
        });
        toast.success('Stitched order reassigned successfully!');
        onOpenChange(false);
        return;
      } catch (error) {
        console.error('[OrderAllotmentForm] Error reassigning order:', error);
        toast.error('Failed to reassign order');
        return;
      }
    }

    if (hasDressItems && onSaveMultiple) {
      // Submit multiple allotments (one per assigned dress item)
      const assignedItems = dressItemAssignments.filter(item => item.assignedTo);

      const allotments = assignedItems.map(item => ({
        jobWorkDate: Date.now(),
        serviceOrderNo,
        dressItemId: item.dressItemId,
        dressItemName: item.dressItemName,
        customerName: selectedOrder!.customerName,
        customerId: selectedOrder!.customerId,
        stitchingAllotment: item.stitchingAllotment,
        assignedTo: item.assignedTo,
        assignedName: getAssignedName(item.stitchingAllotment, item.assignedTo),
        materialCost: item.materialCost,
        jobWorkCost: item.jobWorkCost,
        expectedDeliveryDate: deliveryDateMs,
        orderStatus: 'open' as const,
        // Set status based on assignment type: 'allotment' for employee, 'job-network' for vendor
        serviceOrderStatus: (item.stitchingAllotment === 'employee' ? 'allotment' : 'job-network') as const,
        companyId: '',
        adminId: '',
      }));

      console.log('[OrderAllotmentForm] Submitting multiple allotments:', allotments);
      onSaveMultiple(allotments);
    } else {
      // Legacy single allotment
      const allotmentData: Omit<OrderAllotment, 'id' | 'createdAt' | 'updatedAt'> = {
        jobWorkDate: Date.now(),
        serviceOrderNo,
        customerName: selectedOrder!.customerName,
        customerId: selectedOrder!.customerId,
        stitchingAllotment,
        assignedTo,
        assignedName: getAssignedName(stitchingAllotment, assignedTo),
        materialCost,
        jobWorkCost,
        expectedDeliveryDate: deliveryDateMs,
        orderStatus: 'open',
        // Set status based on assignment type: 'allotment' for employee, 'job-network' for vendor
        serviceOrderStatus: stitchingAllotment === 'employee' ? 'allotment' : 'job-network',
        companyId: '',
        adminId: '',
      };

      console.log('[OrderAllotmentForm] Submitting allotment:', allotmentData);
      onSave(allotmentData);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b px-5 py-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-bold text-gray-900">
              {reassignOrder ? 'Re-assign Order' : 'Job Allotment'}
            </DialogTitle>
            {reassignOrder ? (
              <p className="text-sm text-orange-600 font-medium">
                Re-assigning: {reassignOrder.stitchedId || reassignOrder.jobWorkNo}
              </p>
            ) : (
              <p className="text-sm text-gray-500">Assign work to tailor or job work</p>
            )}
          </DialogHeader>
        </div>

        <div className="px-5 space-y-4 py-4">
          {/* Service Order Selection - Hide when opened from specific order */}
          {!initialServiceOrderId && !reassignOrder && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Select Service Order *</Label>
              <Select value={serviceOrderNo} onValueChange={setServiceOrderNo}>
                <SelectTrigger className="h-12 text-base" style={{ borderColor: '#6A64F2', borderWidth: '2px' }}>
                  <SelectValue placeholder="Tap to select order" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleOrders.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                      No eligible service orders available.
                      <br />
                      <span className="text-xs">Orders must have status: Open or Allotment</span>
                    </div>
                  ) : (
                    eligibleOrders.map((order) => (
                      <SelectItem key={order.id} value={order.id} className="py-3">
                        <span className="font-mono font-semibold">{order.id}</span>
                        <span className="mx-2">•</span>
                        <span>{order.customerName}</span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Order Information Card - Compact & Clean */}
          {selectedOrder && (
            <div className="rounded-xl overflow-hidden border-2 shadow-sm" style={{ borderColor: '#6A64F2' }}>
              {/* Header */}
              <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: '#6A64F2' }}>
                <span className="text-white font-semibold text-sm">Order Details</span>
                <span className="text-white/90 text-xs font-mono bg-white/20 px-2 py-0.5 rounded">
                  {selectedOrder.id}
                </span>
              </div>
              
              {/* Content */}
              <div className="p-4 space-y-3" style={{ backgroundColor: '#FAFAFF' }}>
                {/* Customer & Category Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                      <span className="text-sm">👤</span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Customer</p>
                      <p className="font-semibold text-gray-900 text-sm">{selectedOrder.customerName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Category</p>
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: selectedOrder.orderCategory === 'male' ? '#DBEAFE' : 
                                        selectedOrder.orderCategory === 'female' ? '#FCE7F3' : '#FEF3C7',
                        color: selectedOrder.orderCategory === 'male' ? '#1E40AF' : 
                               selectedOrder.orderCategory === 'female' ? '#BE185D' : '#B45309'
                      }}>
                      {selectedOrder.orderCategory === 'male' ? 'Men' : selectedOrder.orderCategory === 'female' ? 'Women' : 'Kids'}
                    </span>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200"></div>

                {/* Quantity, Cost, Delivery Row */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white rounded-lg py-2 px-1 border border-gray-100">
                    <p className="text-xs text-gray-500 mb-0.5">Quantity</p>
                    <p className="font-bold text-gray-900 text-sm">{selectedOrder.orderQty} <span className="text-xs font-normal text-gray-500">{selectedOrder.uom}</span></p>
                  </div>
                  <div className="bg-white rounded-lg py-2 px-1 border border-gray-100">
                    <p className="text-xs text-gray-500 mb-0.5">Cost</p>
                    <p className="font-bold text-green-600 text-sm">₹{selectedOrder.stitchingCost.toFixed(0)}</p>
                  </div>
                  <div className="bg-white rounded-lg py-2 px-1 border border-gray-100">
                    <p className="text-xs text-gray-500 mb-0.5">Delivery</p>
                    <p className="font-bold text-gray-900 text-sm">{format(new Date(selectedOrder.expectedDeliveryDate), 'dd MMM')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DRESS ITEMS ASSIGNMENT - shown when order has dress items */}
          {hasDressItems && dressItemAssignments.length > 0 && (
            <div className="space-y-4">
              {/* Section Header */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
                  <span className="text-white text-sm">👗</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Assign Dress Items</p>
                  <p className="text-xs text-gray-500">
                    {dressItemAssignments.length} item{dressItemAssignments.length > 1 ? 's' : ''} to assign
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {dressItemAssignments.map((item, index) => {
                  const assigneeList = item.stitchingAllotment === 'employee' ? tailorEmployees : vendors;

                  return (
                    <Card key={item.dressItemId} className="overflow-hidden border-2" style={{ borderColor: item.assignedTo ? '#22C55E' : '#E5E7EB' }}>
                      {/* Item Header */}
                      <div className="px-4 py-3 flex items-center justify-between" 
                        style={{ backgroundColor: item.assignedTo ? '#F0FDF4' : '#F9FAFB' }}>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </span>
                          <span className="font-semibold text-gray-900 text-sm">{item.dressItemName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded">Qty: {item.quantity}</span>
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-semibold">₹{item.stitchingCost}</span>
                        </div>
                      </div>

                      <CardContent className="p-4 space-y-4">
                        {/* Allotment Type - Touch-friendly buttons */}
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Assign to</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => updateDressItemAssignment(item.dressItemId, 'stitchingAllotment', 'employee')}
                              className={`py-3 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 border-2 ${
                                item.stitchingAllotment === 'employee'
                                  ? 'bg-violet-600 text-white border-violet-600'
                                  : 'bg-white text-gray-700 border-gray-200 hover:border-violet-300'
                              }`}
                            >
                              <span>👤</span> Employee
                            </button>
                            <button
                              type="button"
                              onClick={() => updateDressItemAssignment(item.dressItemId, 'stitchingAllotment', 'vendor')}
                              className={`py-3 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 border-2 ${
                                item.stitchingAllotment === 'vendor'
                                  ? 'bg-orange-500 text-white border-orange-500'
                                  : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300'
                              }`}
                            >
                              <span>🏢</span> Job Work
                            </button>
                          </div>
                        </div>

                        {/* Assignee Selection */}
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            {item.stitchingAllotment === 'employee' ? 'Select Tailor' : 'Select Job Work Tailor'} *
                          </Label>
                          <Select
                            value={item.assignedTo}
                            onValueChange={(value) =>
                              updateDressItemAssignment(item.dressItemId, 'assignedTo', value)
                            }
                          >
                            <SelectTrigger className="h-12 text-sm" style={{ borderColor: '#6A64F2', borderWidth: '2px' }}>
                              <SelectValue placeholder="Tap to select" />
                            </SelectTrigger>
                            <SelectContent>
                              {assigneeList.length === 0 ? (
                                <div className="p-4 text-sm text-muted-foreground text-center">
                                  No {item.stitchingAllotment === 'employee' ? 'tailors' : 'job work tailors'} available
                                </div>
                              ) : (
                                assigneeList.map((assignee) => {
                                  const displayName = item.stitchingAllotment === 'employee'
                                    ? (assignee as Employee).name
                                    : (assignee as Vendor).tailorName;
                                  return (
                                    <SelectItem key={assignee.id} value={assignee.id} className="py-3">
                                      <span className="font-medium">{displayName}</span>
                                    </SelectItem>
                                  );
                                })
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Costs - Compact grid */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold text-gray-600">Material ₹</Label>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={item.materialCost}
                              onChange={(e) =>
                                updateDressItemAssignment(item.dressItemId, 'materialCost', parseFloat(e.target.value) || 0)
                              }
                              onFocus={(e) => e.target.select()}
                              className="h-11 text-center font-semibold"
                              style={{ borderColor: '#6A64F2', borderWidth: '2px' }}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold text-gray-600">Job Cost ₹</Label>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={item.jobWorkCost}
                              onChange={(e) =>
                                updateDressItemAssignment(item.dressItemId, 'jobWorkCost', parseFloat(e.target.value) || 0)
                              }
                              onFocus={(e) => e.target.select()}
                              className="h-11 text-center font-semibold"
                              style={{ borderColor: '#6A64F2', borderWidth: '2px' }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Total Summary - Sticky feel */}
              <div className="rounded-xl p-4 flex items-center justify-between" style={{ backgroundColor: '#ECFDF5', border: '2px solid #22C55E' }}>
                <div>
                  <p className="text-xs text-green-700 font-medium">Total Job Cost</p>
                  <p className="text-xl font-bold text-green-800">₹{totalDressItemsCost.toFixed(0)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-green-700 font-medium">Items Assigned</p>
                  <p className="text-lg font-bold text-green-800">
                    {dressItemAssignments.filter(i => i.assignedTo).length}/{dressItemAssignments.length}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* LEGACY SINGLE ASSIGNMENT - shown when order has no dress items */}
          {!hasDressItems && selectedOrder && (
            <div className="space-y-4">
              {/* Assignment Type - Compact buttons */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Assign To *</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStitchingAllotment('employee')}
                    className={`relative py-3 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 border-2 ${
                      stitchingAllotment === 'employee'
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300'
                    }`}
                  >
                    {stitchingAllotment === 'employee' && (
                      <Check size={14} weight="bold" className="absolute top-1 right-1" />
                    )}
                    <User size={18} weight={stitchingAllotment === 'employee' ? 'fill' : 'regular'} />
                    <span>Employee</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStitchingAllotment('vendor')}
                    className={`relative py-3 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 border-2 ${
                      stitchingAllotment === 'vendor'
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    {stitchingAllotment === 'vendor' && (
                      <Check size={14} weight="bold" className="absolute top-1 right-1" />
                    )}
                    <Buildings size={18} weight={stitchingAllotment === 'vendor' ? 'fill' : 'regular'} />
                    <span>Job Work</span>
                  </button>
                </div>
              </div>

              {/* Select Tailor & Delivery Date - In one row */}
              <div className="grid grid-cols-2 gap-3">
                {/* Select Tailor */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                    <Scissors size={12} weight="bold" />
                    {stitchingAllotment === 'employee' ? 'Tailor' : 'Vendor'} *
                  </Label>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger 
                      className="h-11 text-sm" 
                      style={{ 
                        borderColor: assignedTo ? '#22C55E' : '#6A64F2', 
                        borderWidth: '2px',
                        backgroundColor: assignedTo ? '#F0FDF4' : 'white'
                      }}
                    >
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {(stitchingAllotment === 'employee' ? tailorEmployees : vendors).length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground text-center">
                          No {stitchingAllotment === 'employee' ? 'tailors' : 'vendors'} available
                        </div>
                      ) : (
                        (stitchingAllotment === 'employee' ? tailorEmployees : vendors).map((assignee) => {
                          const displayName = stitchingAllotment === 'employee'
                            ? (assignee as Employee).name
                            : (assignee as Vendor).tailorName;
                          return (
                            <SelectItem key={assignee.id} value={assignee.id} className="py-2">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-semibold text-xs">
                                  {displayName.charAt(0).toUpperCase()}
                                </span>
                                <span className="font-medium text-sm">{displayName}</span>
                              </div>
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Delivery Date */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                    <CalendarBlank size={12} weight="bold" />
                    Delivery *
                  </Label>
                  <Input
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="h-11 text-sm"
                    style={{ 
                      borderColor: expectedDeliveryDate ? '#22C55E' : '#6A64F2', 
                      borderWidth: '2px',
                      backgroundColor: expectedDeliveryDate ? '#F0FDF4' : 'white'
                    }}
                  />
                </div>
              </div>

              {/* Costs - Only for Job Work Tailor */}
              {stitchingAllotment === 'vendor' && (
                <div className="space-y-3 pt-2">
                  <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Cost Details</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Material ₹</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={materialCost}
                        onChange={(e) => setMaterialCost(parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                        className="h-11 text-center text-lg font-semibold"
                        style={{ borderColor: '#6A64F2', borderWidth: '2px' }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Job Work ₹</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={jobWorkCost}
                        onChange={(e) => setJobWorkCost(parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                        className="h-11 text-center text-lg font-semibold"
                        style={{ borderColor: '#6A64F2', borderWidth: '2px' }}
                      />
                    </div>
                  </div>

                  {/* Total Cost Display */}
                  <div className="rounded-lg p-3 flex items-center justify-between" style={{ backgroundColor: '#ECFDF5', border: '2px solid #22C55E' }}>
                    <div>
                      <p className="text-xs text-green-700 font-medium">Total Cost</p>
                      <p className="text-xl font-bold text-green-800">₹{totalJobCost.toFixed(0)}</p>
                    </div>
                    <div className="text-right text-xs text-green-600">
                      <p>Material: ₹{materialCost.toFixed(0)}</p>
                      <p>Job Work: ₹{jobWorkCost.toFixed(0)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}



        </div>

        {/* Sticky Action Buttons */}
        <div className="sticky bottom-0 bg-white border-t px-5 py-4 flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-12 text-base font-semibold"
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleSubmit}
            className="flex-1 h-12 text-base font-semibold"
            style={{ backgroundColor: '#6A64F2' }}
          >
            {reassignOrder
              ? 'Re-assign'
              : hasDressItems
                ? `Allot ${dressItemAssignments.filter(i => i.assignedTo).length} Item${dressItemAssignments.filter(i => i.assignedTo).length !== 1 ? 's' : ''}`
                : 'Create Allotment'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

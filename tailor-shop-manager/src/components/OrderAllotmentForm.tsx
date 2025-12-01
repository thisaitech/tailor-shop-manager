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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { OrderAllotment, ServiceOrder, StitchingAllotmentType, Employee, Vendor, DressItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { reassignStitchedOrder } from '@/lib/firestore/orderAllotmentService';

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {reassignOrder ? 'Re-assign Stitched Order' : 'Job Allotment'}
          </DialogTitle>
          {reassignOrder && (
            <p className="text-sm text-orange-600">
              Re-assigning: {reassignOrder.stitchedId || reassignOrder.jobWorkNo}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Job Work Date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Job Work Date</Label>
            <Input
              type="text"
              value={format(new Date(), 'dd/MM/yyyy')}
              disabled
              className="h-11 bg-muted"
            />
            <p className="text-xs text-muted-foreground">Auto-set to today's date</p>
          </div>

          {/* Service Order Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Service Order *</Label>
            <Select value={serviceOrderNo} onValueChange={setServiceOrderNo}>
              <SelectTrigger className="h-11" style={{ borderColor: '#6A64F2' }}>
                <SelectValue placeholder="Select service order" />
              </SelectTrigger>
              <SelectContent>
                {eligibleOrders.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    No eligible service orders available.
                    <br />
                    <span className="text-xs">Orders must have status: Open or Allotment</span>
                  </div>
                ) : (
                  eligibleOrders.map((order) => (
                    <SelectItem key={order.id} value={order.id}>
                      {order.id} - {order.customerName} ({order.orderCategory === 'male' ? 'Men' : order.orderCategory === 'female' ? 'Women' : 'Kids'})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {/* Order Details Box */}
            {selectedOrder && (
              <div className="p-4 rounded-lg border-2" style={{ backgroundColor: '#f3e8ff', borderColor: '#6A64F2' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">📋</span>
                  <p className="font-bold text-base" style={{ color: '#6A64F2' }}>Order Information</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white bg-opacity-60 p-2 rounded">
                    <p className="text-xs text-gray-600 font-semibold">👤 Customer</p>
                    <p className="font-medium text-gray-900">{selectedOrder.customerName}</p>
                  </div>
                  <div className="bg-white bg-opacity-60 p-2 rounded">
                    <p className="text-xs text-gray-600 font-semibold">📂 Category</p>
                    <p className="font-medium text-gray-900">{selectedOrder.orderCategory}</p>
                  </div>
                  <div className="bg-white bg-opacity-60 p-2 rounded">
                    <p className="text-xs text-gray-600 font-semibold">📦 Quantity</p>
                    <p className="font-medium text-gray-900">{selectedOrder.orderQty} {selectedOrder.uom}</p>
                  </div>
                  <div className="bg-white bg-opacity-60 p-2 rounded">
                    <p className="text-xs text-gray-600 font-semibold">💰 Cost</p>
                    <p className="font-bold text-green-700">₹{selectedOrder.stitchingCost.toFixed(2)}</p>
                  </div>
                  <div className="col-span-2 bg-white bg-opacity-60 p-2 rounded">
                    <p className="text-xs text-gray-600 font-semibold">📅 Expected Delivery</p>
                    <p className="font-medium text-gray-900">{format(new Date(selectedOrder.expectedDeliveryDate), 'dd MMM yyyy')}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* DRESS ITEMS ASSIGNMENT - shown when order has dress items */}
          {hasDressItems && dressItemAssignments.length > 0 && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Dress Items Assignment</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Assign each dress item to a tailor
                </p>
              </div>

              <div className="space-y-3">
                {dressItemAssignments.map((item, index) => {
                  const assigneeList = item.stitchingAllotment === 'employee' ? tailorEmployees : vendors;

                  return (
                    <Card key={item.dressItemId} className="border" style={{ borderColor: '#6A64F2' }}>
                      <CardHeader className="py-3 px-4" style={{ backgroundColor: '#f3e8ff' }}>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </span>
                          <span className="font-semibold">{item.dressItemName}</span>
                          <span className="text-muted-foreground font-normal text-xs">
                            (Qty: {item.quantity}, ₹{item.stitchingCost})
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-3 px-4 space-y-4">
                        {/* Allotment Type */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Assign to</Label>
                          <RadioGroup
                            value={item.stitchingAllotment}
                            onValueChange={(value) =>
                              updateDressItemAssignment(item.dressItemId, 'stitchingAllotment', value)
                            }
                            className="flex gap-6"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="employee" id={`emp-${item.dressItemId}`} />
                              <Label htmlFor={`emp-${item.dressItemId}`} className="text-sm font-normal cursor-pointer">
                                Employee
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="vendor" id={`vendor-${item.dressItemId}`} />
                              <Label htmlFor={`vendor-${item.dressItemId}`} className="text-sm font-normal cursor-pointer">
                                Job Work Tailor
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>

                        {/* Assignee Selection */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            {item.stitchingAllotment === 'employee' ? 'Tailor Name' : 'Job Work Tailor Name'} *
                          </Label>
                          <Select
                            value={item.assignedTo}
                            onValueChange={(value) =>
                              updateDressItemAssignment(item.dressItemId, 'assignedTo', value)
                            }
                          >
                            <SelectTrigger className="h-11" style={{ borderColor: '#6A64F2' }}>
                              <SelectValue placeholder="Select assignee" />
                            </SelectTrigger>
                            <SelectContent>
                              {assigneeList.length === 0 ? (
                                <div className="p-3 text-sm text-muted-foreground text-center">
                                  No {item.stitchingAllotment === 'employee' ? 'tailors' : 'job work tailors'} available
                                </div>
                              ) : (
                                assigneeList.map((assignee) => {
                                  const displayName = item.stitchingAllotment === 'employee'
                                    ? (assignee as Employee).name
                                    : (assignee as Vendor).tailorName;
                                  return (
                                    <SelectItem key={assignee.id} value={assignee.id}>
                                      {assignee.id} - {displayName}
                                    </SelectItem>
                                  );
                                })
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Costs */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Material Cost (₹)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.materialCost}
                              onChange={(e) =>
                                updateDressItemAssignment(item.dressItemId, 'materialCost', parseFloat(e.target.value) || 0)
                              }
                              className="h-11"
                              style={{ borderColor: '#6A64F2' }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Job Work Cost (₹)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.jobWorkCost}
                              onChange={(e) =>
                                updateDressItemAssignment(item.dressItemId, 'jobWorkCost', parseFloat(e.target.value) || 0)
                              }
                              className="h-11"
                              style={{ borderColor: '#6A64F2' }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Total for all dress items */}
              <div className="p-3 rounded-lg" style={{ backgroundColor: '#dcfce7', border: '1px solid #86efac' }}>
                <p className="text-sm font-semibold text-green-800">
                  Total Job Cost: ₹{totalDressItemsCost.toFixed(2)}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {dressItemAssignments.filter(i => i.assignedTo).length} of {dressItemAssignments.length} items assigned
                </p>
              </div>
            </div>
          )}

          {/* LEGACY SINGLE ASSIGNMENT - shown when order has no dress items */}
          {!hasDressItems && selectedOrder && (
            <>
              {/* Stitching Allotment Type - Highlighted */}
              <div className="p-5 rounded-xl border-2 border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">⚙</div>
                  <Label className="text-base font-bold text-blue-900">Select Stitching Allotment Type *</Label>
                </div>
                <RadioGroup
                  value={stitchingAllotment}
                  onValueChange={(value) => setStitchingAllotment(value as StitchingAllotmentType)}
                  className="flex gap-8 pt-2"
                >
                  <div className="flex items-center space-x-3 bg-white px-4 py-3 rounded-lg border-2 border-transparent hover:border-blue-300 cursor-pointer transition"
                    onClick={() => setStitchingAllotment('employee')}>
                    <RadioGroupItem value="employee" id="employee" className="w-5 h-5" />
                    <Label htmlFor="employee" className="font-semibold cursor-pointer text-gray-700 text-sm">
                      👤 Employee
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 bg-white px-4 py-3 rounded-lg border-2 border-transparent hover:border-orange-300 cursor-pointer transition"
                    onClick={() => setStitchingAllotment('vendor')}>
                    <RadioGroupItem value="vendor" id="vendor" className="w-5 h-5" />
                    <Label htmlFor="vendor" className="font-semibold cursor-pointer text-gray-700 text-sm">
                      🏢 Job Work Tailor
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Expected Delivery Date & Tailor Selection - Same Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Expected Delivery Date */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <span className="text-blue-600">📅</span>Expected Delivery Date *
                  </Label>
                  <Input
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="h-11 font-medium"
                    style={{ borderColor: '#6A64F2' }}
                  />
                  <p className="text-xs text-blue-600 font-medium">Future date required</p>
                </div>

                {/* Employee/Job Work Tailor Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <span>{stitchingAllotment === 'employee' ? '👤' : '🏢'}</span>
                    {stitchingAllotment === 'employee' ? 'Tailor Name' : 'Job Work Tailor Name'} *
                  </Label>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger className="h-11" style={{ borderColor: '#6A64F2' }}>
                    <SelectValue
                      placeholder={`Select ${stitchingAllotment === 'employee' ? 'tailor' : 'job work tailor'}`}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(stitchingAllotment === 'employee' ? tailorEmployees : vendors).length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        No {stitchingAllotment === 'employee' ? 'tailors' : 'job work tailors'} available
                      </div>
                    ) : (
                      (stitchingAllotment === 'employee' ? tailorEmployees : vendors).map((assignee) => {
                        const displayName = stitchingAllotment === 'employee'
                          ? (assignee as Employee).name
                          : (assignee as Vendor).tailorName;
                        return (
                          <SelectItem key={assignee.id} value={assignee.id}>
                            {assignee.id} - {displayName}
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
                </div>
              </div>

              {/* Material Cost and Job Work Cost - Only for Job Work Tailor */}
              {stitchingAllotment === 'vendor' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Material Cost */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Material Cost (₹)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={materialCost}
                        onChange={(e) => setMaterialCost(parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0.00"
                        className="h-11"
                        style={{ borderColor: '#6A64F2' }}
                      />
                    </div>

                    {/* Job Work Cost */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Job Work Cost (₹)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={jobWorkCost}
                        onChange={(e) => setJobWorkCost(parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0.00"
                        className="h-11"
                        style={{ borderColor: '#6A64F2' }}
                      />
                    </div>
                  </div>

                  {/* Total Cost Display */}
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#dcfce7', border: '1px solid #86efac' }}>
                    <p className="text-sm font-semibold text-green-800">
                      Total Cost: ₹{totalJobCost.toFixed(2)}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Material (₹{materialCost.toFixed(2)}) + Job Work (₹{jobWorkCost.toFixed(2)})
                    </p>
                  </div>
                </>
              )}
            </>
          )}



          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit}>
              {reassignOrder
                ? 'Re-assign Order'
                : hasDressItems
                  ? `Create ${dressItemAssignments.filter(i => i.assignedTo).length} Allotment(s)`
                  : 'Create Allotment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

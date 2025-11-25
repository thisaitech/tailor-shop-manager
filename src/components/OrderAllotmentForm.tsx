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
}

export function OrderAllotmentForm({
  open,
  onOpenChange,
  onSave,
  onSaveMultiple,
  serviceOrders,
  employees,
  vendors,
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

  const handleSubmit = () => {
    if (!validateForm()) return;

    const deliveryDateMs = new Date(expectedDeliveryDate).getTime();

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
          <DialogTitle>Job Allotment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Job Work Date - Read-only */}
          <div className="space-y-2">
            <Label>Job Work Date</Label>
            <Input
              type="text"
              value={format(new Date(), 'MMM dd, yyyy')}
              disabled
              className="bg-muted"
            />
            <p className="text-sm text-muted-foreground">Auto-set to today's date</p>
          </div>

          {/* Service Order Selection */}
          <div className="space-y-2">
            <Label htmlFor="serviceOrderNo">Service Order *</Label>
            <Select value={serviceOrderNo} onValueChange={setServiceOrderNo}>
              <SelectTrigger id="serviceOrderNo">
                <SelectValue placeholder="Select service order" />
              </SelectTrigger>
              <SelectContent>
                {eligibleOrders.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No eligible service orders available.
                    <br />
                    <span className="text-xs">Orders must have status: Open or Allotment</span>
                  </div>
                ) : (
                  eligibleOrders.map((order) => (
                    <SelectItem key={order.id} value={order.id}>
                      {order.id} - {order.customerName} ({order.orderCategory})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedOrder && (
              <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                <p className="font-semibold text-base mb-1">Order Details:</p>
                <p>Customer: {selectedOrder.customerName}</p>
                <p>Category: {selectedOrder.orderCategory}</p>
                <p>Quantity: {selectedOrder.orderQty} {selectedOrder.uom}</p>
                <p>Stitching Cost: ₹{selectedOrder.stitchingCost.toFixed(2)}</p>
                <p>Expected Date: {format(new Date(selectedOrder.expectedDeliveryDate), 'dd MMM yyyy')}</p>
              </div>
            )}
          </div>

          {/* DRESS ITEMS ASSIGNMENT - shown when order has dress items */}
          {hasDressItems && dressItemAssignments.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Dress Items Assignment</Label>
              <p className="text-sm text-muted-foreground">
                Assign each dress item to a tailor. You can assign different items to different tailors.
              </p>

              {dressItemAssignments.map((item, index) => {
                const assigneeList = item.stitchingAllotment === 'employee' ? tailorEmployees : vendors;

                return (
                  <Card key={item.dressItemId} className="border-l-4 border-l-blue-500">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex justify-between items-center">
                        <span>
                          {index + 1}. {item.dressItemName}
                          <span className="ml-2 text-muted-foreground font-normal">
                            (Qty: {item.quantity}, Cost: ₹{item.stitchingCost})
                          </span>
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2 space-y-3">
                      {/* Allotment Type */}
                      <div className="flex items-center gap-4">
                        <Label className="text-sm w-24">Assign to:</Label>
                        <RadioGroup
                          value={item.stitchingAllotment}
                          onValueChange={(value) =>
                            updateDressItemAssignment(item.dressItemId, 'stitchingAllotment', value)
                          }
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-1">
                            <RadioGroupItem value="employee" id={`emp-${item.dressItemId}`} />
                            <Label htmlFor={`emp-${item.dressItemId}`} className="text-sm font-normal cursor-pointer">
                              Employee
                            </Label>
                          </div>
                          <div className="flex items-center space-x-1">
                            <RadioGroupItem value="vendor" id={`vendor-${item.dressItemId}`} />
                            <Label htmlFor={`vendor-${item.dressItemId}`} className="text-sm font-normal cursor-pointer">
                              Job Work Tailor
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {/* Assignee Selection */}
                      <div className="flex items-center gap-4">
                        <Label className="text-sm w-24">
                          {item.stitchingAllotment === 'employee' ? 'Tailor:' : 'Job Work:'}
                        </Label>
                        <Select
                          value={item.assignedTo}
                          onValueChange={(value) =>
                            updateDressItemAssignment(item.dressItemId, 'assignedTo', value)
                          }
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select assignee" />
                          </SelectTrigger>
                          <SelectContent>
                            {assigneeList.length === 0 ? (
                              <div className="p-2 text-sm text-muted-foreground text-center">
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
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm whitespace-nowrap">Material (₹):</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.materialCost}
                            onChange={(e) =>
                              updateDressItemAssignment(item.dressItemId, 'materialCost', parseFloat(e.target.value) || 0)
                            }
                            className="h-8"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm whitespace-nowrap">Job Work (₹):</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.jobWorkCost}
                            onChange={(e) =>
                              updateDressItemAssignment(item.dressItemId, 'jobWorkCost', parseFloat(e.target.value) || 0)
                            }
                            className="h-8"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Total for all dress items */}
              <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-md border border-green-200 dark:border-green-800">
                <p className="text-base font-semibold text-green-800 dark:text-green-300">
                  Total Job Cost: ₹{totalDressItemsCost.toFixed(2)}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  {dressItemAssignments.filter(i => i.assignedTo).length} of {dressItemAssignments.length} items assigned
                </p>
              </div>
            </div>
          )}

          {/* LEGACY SINGLE ASSIGNMENT - shown when order has no dress items */}
          {!hasDressItems && selectedOrder && (
            <>
              {/* Stitching Allotment Type */}
              <div className="space-y-2">
                <Label>Stitching Allotment *</Label>
                <RadioGroup
                  value={stitchingAllotment}
                  onValueChange={(value) => setStitchingAllotment(value as StitchingAllotmentType)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="employee" id="employee" />
                    <Label htmlFor="employee" className="font-normal cursor-pointer">
                      Employee
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="vendor" id="vendor" />
                    <Label htmlFor="vendor" className="font-normal cursor-pointer">
                      Job Work Tailor
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Employee/Job Work Tailor Selection */}
              <div className="space-y-2">
                <Label htmlFor="assignedTo">
                  {stitchingAllotment === 'employee' ? 'Tailor' : 'Job Work Tailor'} Name *
                </Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger id="assignedTo">
                    <SelectValue
                      placeholder={`Select ${stitchingAllotment === 'employee' ? 'tailor' : 'job work tailor'}`}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(stitchingAllotment === 'employee' ? tailorEmployees : vendors).length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
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

              {/* Material Cost and Job Work Cost - Only for Job Work Tailor */}
              {stitchingAllotment === 'vendor' && (
                <>
                  {/* Material Cost */}
                  <div className="space-y-2">
                    <Label htmlFor="materialCost">Material Cost (₹) *</Label>
                    <Input
                      id="materialCost"
                      type="number"
                      min="0"
                      step="0.01"
                      value={materialCost}
                      onChange={(e) => setMaterialCost(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>

                  {/* Job Work Cost */}
                  <div className="space-y-2">
                    <Label htmlFor="jobWorkCost">Job Work Cost (₹) *</Label>
                    <Input
                      id="jobWorkCost"
                      type="number"
                      min="0"
                      step="0.01"
                      value={jobWorkCost}
                      onChange={(e) => setJobWorkCost(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>

                  {/* Total Cost Display */}
                  <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-md border border-green-200 dark:border-green-800">
                    <p className="text-base font-semibold text-green-800 dark:text-green-300">
                      Total Cost: ₹{totalJobCost.toFixed(2)}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                      Material (₹{materialCost.toFixed(2)}) + Job Work (₹{jobWorkCost.toFixed(2)})
                    </p>
                  </div>
                </>
              )}
            </>
          )}

          {/* Expected Delivery Date */}
          <div className="space-y-2">
            <Label htmlFor="expectedDeliveryDate">Expected Delivery Date *</Label>
            <Input
              id="expectedDeliveryDate"
              type="date"
              value={expectedDeliveryDate}
              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
            />
            <p className="text-sm text-muted-foreground">Must be a future date</p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit}>
              {hasDressItems
                ? `Create ${dressItemAssignments.filter(i => i.assignedTo).length} Allotment(s)`
                : 'Create Allotment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

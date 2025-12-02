import { useState, useEffect, lazy, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Package, ArrowLeft, Eye, CheckCircle, Spinner, ArrowsClockwise } from '@phosphor-icons/react';
import { EmptyState } from './EmptyState';
import { format } from 'date-fns';
import { ServiceOrder, OrderAllotment, Employee, Vendor, StitchingAllotmentType } from '@/lib/types';
import { markOrderReady, reassignOrder } from '@/lib/firestore/serviceOrderService';
import { getEmployeesByCompany } from '@/lib/firestore/employeeService';
import { getVendorsByCompany } from '@/lib/firestore/vendorService';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';

// Lazy load the dialog
const ServiceOrderDetailsDialog = lazy(() =>
  import('@/components/ServiceOrderDetailsDialog').then(m => ({ default: m.ServiceOrderDetailsDialog }))
);

interface ReceivedNoteListProps {
  serviceOrders: ServiceOrder[];
  orderAllotments: OrderAllotment[];
  onBack: () => void;
  onDataRefresh?: () => void;
}

export function ReceivedNoteList({ serviceOrders, orderAllotments, onBack, onDataRefresh }: ReceivedNoteListProps) {
  const { user } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

  // Re-assign dialog state
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [reassignOrder_target, setReassignOrder_target] = useState<ServiceOrder | null>(null);
  const [reassigning, setReassigning] = useState(false);
  const [assignmentType, setAssignmentType] = useState<StitchingAllotmentType>('vendor');
  const [assignedTo, setAssignedTo] = useState('');
  const [materialCost, setMaterialCost] = useState(0);
  const [jobWorkCost, setJobWorkCost] = useState(0);

  // Employees and vendors for re-assign
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loadingAssignees, setLoadingAssignees] = useState(false);

  // Filter orders with 'received-note' status - vendor orders where goods have been received
  const receivedNoteOrders = serviceOrders.filter(o => o.orderStatus === 'received-note');

  // Load employees and vendors when re-assign dialog opens
  useEffect(() => {
    if (showReassignDialog && reassignOrder_target) {
      loadAssignees();
    }
  }, [showReassignDialog, reassignOrder_target]);

  const loadAssignees = async () => {
    // Use adminId as the companyDocId for querying employees and vendors
    // Fallback to user.id if adminId is not available on the order
    const companyDocId = reassignOrder_target?.adminId || user?.id;
    if (!companyDocId) {
      console.error('No adminId found on order and no user logged in');
      toast.error('Unable to load assignees - please try again');
      return;
    }

    try {
      setLoadingAssignees(true);
      const [emps, vends] = await Promise.all([
        getEmployeesByCompany(companyDocId),
        getVendorsByCompany(companyDocId),
      ]);
      // Filter to only active tailors for employees
      const activeTailors = emps.filter(e => e.role === 'tailor' && e.isActive !== false);
      setEmployees(activeTailors);
      setVendors(vends);
      console.log('Loaded assignees:', { employees: activeTailors.length, vendors: vends.length });
    } catch (error) {
      console.error('Error loading assignees:', error);
      toast.error('Failed to load employees/vendors');
    } finally {
      setLoadingAssignees(false);
    }
  };

  const handleOrderClick = (order: ServiceOrder) => {
    setSelectedOrder(order);
    setShowDetailsDialog(true);
  };

  // Handle marking order as ready to deliver
  const handleMarkReady = async (order: ServiceOrder) => {
    try {
      setProcessingOrderId(order.id);

      // Use the unified markOrderReady function - moves from 'received-note' to 'ready'
      await markOrderReady(order.id, 'ADMIN', 'Admin');

      toast.success('Order marked as Ready to Deliver!');

      // Refresh data
      if (onDataRefresh) {
        onDataRefresh();
      }
    } catch (error) {
      console.error('Error marking order as ready:', error);
      toast.error('Failed to mark order as ready');
    } finally {
      setProcessingOrderId(null);
    }
  };

  // Open re-assign dialog
  const openReassignDialog = (order: ServiceOrder) => {
    setReassignOrder_target(order);
    setAssignmentType('vendor');
    setAssignedTo('');
    setMaterialCost(order.materialCost || 0);
    setJobWorkCost(order.jobWorkCost || 0);
    setShowReassignDialog(true);
  };

  // Close re-assign dialog
  const closeReassignDialog = () => {
    setShowReassignDialog(false);
    setReassignOrder_target(null);
    setAssignedTo('');
  };

  // Get assignee name based on selection
  const getAssigneeName = (): string => {
    if (!assignedTo) return '';
    if (assignmentType === 'employee') {
      const emp = employees.find(e => e.id === assignedTo);
      return emp?.name || '';
    } else {
      const vendor = vendors.find(v => v.id === assignedTo);
      return vendor?.tailorName || '';
    }
  };

  // Handle re-assign submission
  const handleReassignSubmit = async () => {
    if (!reassignOrder_target || !assignedTo) {
      toast.error('Please select an assignee');
      return;
    }

    const assigneeName = getAssigneeName();
    if (!assigneeName) {
      toast.error('Could not find assignee details');
      return;
    }

    try {
      setReassigning(true);

      await reassignOrder(
        reassignOrder_target.id,
        assignmentType,
        assignedTo,
        assigneeName,
        user?.id || 'ADMIN',
        user?.name || 'Admin',
        materialCost,
        jobWorkCost
      );

      toast.success(`Order re-assigned to ${assigneeName}. Status: Awaiting acceptance`);
      closeReassignDialog();

      // Refresh data
      if (onDataRefresh) {
        onDataRefresh();
      }
    } catch (error) {
      console.error('Error re-assigning order:', error);
      toast.error('Failed to re-assign order');
    } finally {
      setReassigning(false);
    }
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 180px)', minHeight: '400px' }}>
      {/* Fixed Header */}
      <div className="flex items-center gap-3 pb-4 flex-shrink-0 bg-background">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Received Note</h1>
          <p className="text-sm text-muted-foreground">{receivedNoteOrders.length} orders - Goods received from vendor</p>
        </div>
      </div>

      {/* Scrollable Orders List */}
      <Card className="flex-1 min-h-0 overflow-hidden">
        <CardContent className="p-4 h-full overflow-y-auto" style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #a7f3d0 100%)' }}>
          {receivedNoteOrders.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No received notes"
              description="Vendor orders with goods received will appear here"
            />
          ) : (
            <div className="space-y-4">
              {receivedNoteOrders.map((order, index) => (
                <div
                  key={order.id}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer hover:shadow-lg hover:scale-[1.01] animate-on-load animate-fade-slide-up stagger-${(index % 6) + 1}`}
                  style={{
                    background: '#ffffff',
                    borderColor: '#10b981',
                    boxShadow: '0 4px 12px -2px rgba(16, 185, 129, 0.2), 0 2px 6px -2px rgba(16, 185, 129, 0.15)',
                  }}
                  onClick={() => handleOrderClick(order)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-mono text-xs" style={{ background: '#ecfdf5', color: '#059669', borderColor: '#10b981' }}>
                          {order.jobWorkNo || order.id}
                        </Badge>
                        <Badge className="bg-teal-500 text-white text-xs">
                          Goods Received
                        </Badge>
                        {order.isReassigned && (
                          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300">
                            Re-assigned
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Customer:</span>{' '}
                          <span className="font-medium text-gray-900">{order.customerName}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Vendor:</span>{' '}
                          <span className="font-medium text-gray-900">{order.assignedToName || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Category:</span>{' '}
                          <span className="font-medium text-gray-900 capitalize">{order.orderCategory}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Delivery Date:</span>{' '}
                          <span className="font-medium text-gray-900">
                            {format(new Date(order.expectedDeliveryDate), 'dd MMM yyyy')}
                          </span>
                        </div>
                        {order.goodsReceiptNo && (
                          <div>
                            <span className="text-muted-foreground">GRN:</span>{' '}
                            <span className="font-medium text-gray-900">{order.goodsReceiptNo}</span>
                          </div>
                        )}
                        {order.dcNumber && (
                          <div>
                            <span className="text-muted-foreground">DC:</span>{' '}
                            <span className="font-medium text-gray-900">{order.dcNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOrderClick(order);
                        }}
                        className="whitespace-nowrap shadow-sm"
                        style={{ background: '#ecfdf5', color: '#059669', borderColor: '#10b981' }}
                      >
                        <Eye size={16} className="mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkReady(order);
                        }}
                        disabled={processingOrderId === order.id}
                        className="whitespace-nowrap shadow-sm"
                        style={{ background: '#22c55e', color: 'white' }}
                      >
                        {processingOrderId === order.id ? (
                          <>
                            <Spinner size={16} className="mr-1 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle size={16} className="mr-1" weight="bold" />
                            Ready to Deliver
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openReassignDialog(order);
                        }}
                        disabled={processingOrderId === order.id}
                        className="whitespace-nowrap shadow-sm"
                        style={{ background: '#fef3c7', color: '#d97706', borderColor: '#f59e0b' }}
                      >
                        <ArrowsClockwise size={16} className="mr-1" />
                        Re-assign
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Order Details Dialog - Lazy Loaded */}
      {selectedOrder && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white p-4 rounded-lg">Loading...</div></div>}>
          <ServiceOrderDetailsDialog
            serviceOrder={selectedOrder}
            orderAllotment={orderAllotments.find(a => a.serviceOrderNo === selectedOrder.id && !a.reassigned)}
            open={showDetailsDialog}
            onClose={() => {
              setShowDetailsDialog(false);
              setSelectedOrder(null);
            }}
          />
        </Suspense>
      )}

      {/* Re-assign Dialog */}
      <Dialog open={showReassignDialog} onOpenChange={(open) => !open && closeReassignDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Re-assign Order</DialogTitle>
          </DialogHeader>
          
          {reassignOrder_target && (
            <div className="space-y-4 py-4">
              {/* Order Info */}
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-sm font-medium text-amber-800">
                  Re-assigning: {reassignOrder_target.jobWorkNo || reassignOrder_target.id}
                </p>
                <p className="text-xs text-amber-600">
                  Customer: {reassignOrder_target.customerName}
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  The order will go back to "Awaiting Acceptance" status.
                </p>
              </div>

              {/* Assignment Type */}
              <div className="space-y-2">
                <Label>Assign To</Label>
                <RadioGroup
                  value={assignmentType}
                  onValueChange={(value) => {
                    setAssignmentType(value as StitchingAllotmentType);
                    setAssignedTo('');
                  }}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="vendor" id="vendor" />
                    <Label htmlFor="vendor" className="cursor-pointer">Vendor</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="employee" id="employee" />
                    <Label htmlFor="employee" className="cursor-pointer">Employee</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Assignee Select */}
              <div className="space-y-2">
                <Label>{assignmentType === 'vendor' ? 'Select Vendor' : 'Select Employee'} *</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo} disabled={loadingAssignees}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingAssignees ? 'Loading...' : `Select ${assignmentType}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {assignmentType === 'vendor' ? (
                      vendors.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">No vendors available</div>
                      ) : (
                        vendors.map(v => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.tailorName} ({v.tailorCode})
                          </SelectItem>
                        ))
                      )
                    ) : (
                      employees.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">No employees available</div>
                      ) : (
                        employees.map(e => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.name}
                          </SelectItem>
                        ))
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Material Cost */}
              <div className="space-y-2">
                <Label htmlFor="materialCost">Material Cost</Label>
                <Input
                  id="materialCost"
                  type="number"
                  min={0}
                  value={materialCost}
                  onChange={(e) => setMaterialCost(Number(e.target.value))}
                  placeholder="Enter material cost"
                />
              </div>

              {/* Job Work Cost */}
              <div className="space-y-2">
                <Label htmlFor="jobWorkCost">Job Work Cost</Label>
                <Input
                  id="jobWorkCost"
                  type="number"
                  min={0}
                  value={jobWorkCost}
                  onChange={(e) => setJobWorkCost(Number(e.target.value))}
                  placeholder="Enter job work cost"
                />
              </div>

              {/* Total Cost */}
              <div className="p-3 rounded-lg bg-gray-50 border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Job Cost:</span>
                  <span className="font-semibold">₹{materialCost + jobWorkCost}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeReassignDialog} disabled={reassigning}>
              Cancel
            </Button>
            <Button 
              onClick={handleReassignSubmit} 
              disabled={reassigning || !assignedTo}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {reassigning ? (
                <>
                  <Spinner size={16} className="mr-1 animate-spin" />
                  Re-assigning...
                </>
              ) : (
                <>
                  <ArrowsClockwise size={16} className="mr-1" />
                  Re-assign Order
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { ServiceOrder, OrderAllotment, Customer } from '@/lib/types';
import { useLanguage } from '@/hooks/use-language';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Phone,
  WhatsappLogo,
  Calendar,
  Ruler,
  Package,
  User,
  CurrencyInr,
  TShirt,
  Image,
  ClipboardText,
  Truck,
  FileText,
  ClockCounterClockwise,
  CheckCircle,
  XCircle,
  ArrowsClockwise,
  Spinner,
} from '@phosphor-icons/react';
import { format, isPast } from 'date-fns';
import { sendWhatsAppMessage } from '@/lib/utils';
import { getOrderHistory, OrderHistoryEntry } from '@/lib/firestore/orderHistoryService';

interface OrderViewProps {
  serviceOrder: ServiceOrder;
  orderAllotments?: OrderAllotment[];
  customer?: Customer;
  onBack: () => void;
}

export function OrderView({ serviceOrder, orderAllotments = [], customer, onBack }: OrderViewProps) {
  const { t } = useLanguage();
  const [orderHistory, setOrderHistory] = useState<OrderHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Fetch order history on mount
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoadingHistory(true);
        const history = await getOrderHistory(serviceOrder.id);
        setOrderHistory(history);
      } catch (error) {
        console.error('Error fetching order history:', error);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [serviceOrder.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-purple-600 text-white';
      case 'awaiting':
        return 'bg-amber-500 text-white';
      case 'waitingForDC':
        return 'bg-teal-500 text-white';
      case 'inprogress':
        return 'bg-blue-600 text-white';
      case 'rejected':
        return 'bg-red-600 text-white';
      case 'ready':
        return 'bg-indigo-600 text-white';
      case 'job-completed':
        return 'bg-orange-600 text-white';
      case 'received-note':
        return 'bg-cyan-600 text-white';
      case 'delivered':
        return 'bg-green-600 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'open':
        return 'OPEN';
      case 'awaiting':
        return 'AWAITING';
      case 'waitingForDC':
        return 'WAITING DC';
      case 'inprogress':
        return 'IN PROGRESS';
      case 'rejected':
        return 'REJECTED';
      case 'ready':
        return 'READY';
      case 'job-completed':
        return 'JOB DONE';
      case 'received-note':
        return 'RECEIVED';
      case 'delivered':
        return 'DELIVERED';
      default:
        return status.toUpperCase();
    }
  };

  const getHistoryActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <Package size={16} className="text-purple-600" weight="fill" />;
      case 'assigned':
        return <User size={16} className="text-blue-600" weight="fill" />;
      case 'accepted':
        return <CheckCircle size={16} className="text-green-600" weight="fill" />;
      case 'rejected':
        return <XCircle size={16} className="text-red-600" weight="fill" />;
      case 'status_changed':
        return <ArrowsClockwise size={16} className="text-amber-600" weight="fill" />;
      case 'reassigned':
        return <ArrowsClockwise size={16} className="text-orange-600" weight="fill" />;
      case 'dc_created':
      case 'dc_approved':
        return <FileText size={16} className="text-teal-600" weight="fill" />;
      case 'goods_received':
        return <Truck size={16} className="text-cyan-600" weight="fill" />;
      case 'delivered':
        return <CheckCircle size={16} className="text-green-600" weight="fill" />;
      case 'payment':
        return <CurrencyInr size={16} className="text-emerald-600" weight="fill" />;
      default:
        return <ClockCounterClockwise size={16} className="text-gray-600" weight="fill" />;
    }
  };

  const getHistoryActionLabel = (action: string): string => {
    switch (action) {
      case 'created': return 'Order Created';
      case 'assigned': return 'Order Assigned';
      case 'accepted': return 'Order Accepted';
      case 'rejected': return 'Order Rejected';
      case 'status_changed': return 'Status Changed';
      case 'reassigned': return 'Order Reassigned';
      case 'dc_created': return 'DC Created';
      case 'dc_approved': return 'DC Approved';
      case 'goods_received': return 'Goods Received';
      case 'delivered': return 'Order Delivered';
      case 'payment': return 'Payment Recorded';
      default: return action;
    }
  };

  const isOverdue = serviceOrder.expectedDeliveryDate &&
    serviceOrder.orderStatus !== 'delivered' &&
    isPast(new Date(serviceOrder.expectedDeliveryDate));

  // Use unified orderStatus directly
  const displayStatus = serviceOrder.orderStatus;

  // Get allotment info for this order (for backward compatibility)
  const allotment = orderAllotments.find(a => a.serviceOrderNo === serviceOrder.id && !a.reassigned);

  // Measurement sections to display
  const measurementSections = [
    { key: 'shirt', label: 'Shirt' },
    { key: 'pant', label: 'Pant' },
    { key: 'coat', label: 'Coat' },
    { key: 'chuditharTop', label: 'Chudithar Top' },
    { key: 'chuditharPant', label: 'Chudithar Pant' },
    { key: 'blouse', label: 'Blouse' },
    { key: 'trouser', label: 'Trouser' },
  ];

  const hasMeasurements = serviceOrder.measurements && Object.keys(serviceOrder.measurements).length > 0;

  return (
    <div className="space-y-3 animate-on-load animate-fade-slide-up max-w-4xl mx-auto">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={onBack}
            className="h-8 w-8"
            style={{ backgroundColor: 'white' }}
          >
            <ArrowLeft size={18} weight="bold" />
          </Button>
          <h1 className="text-base md:text-lg font-bold">Order Details</h1>
        </div>

        {isOverdue && (
          <Badge variant="destructive" className="text-xs font-bold px-2 py-1">
            OVERDUE
          </Badge>
        )}
      </div>

      {/* Order Info Card */}
      <Card
        className="p-3 sm:p-4"
        style={{ backgroundColor: '#f3e8ff', borderColor: '#6A64F2' }}
      >
        <div className="flex flex-col gap-3">
          {/* Order ID and Status */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Package size={20} weight="duotone" style={{ color: '#6A64F2' }} />
                <p className="text-sm font-bold" style={{ color: '#6A64F2' }}>{serviceOrder.id}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {serviceOrder.orderCategory === 'male' ? 'Men' : serviceOrder.orderCategory === 'female' ? 'Women' : 'Kids'} • {serviceOrder.orderQty} {serviceOrder.uom}
              </p>
            </div>
            <Badge className={`text-[10px] px-2 py-1 font-bold ${getStatusColor(displayStatus)}`}>
              {getStatusLabel(displayStatus)}
            </Badge>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t" style={{ borderColor: 'rgba(106, 100, 242, 0.3)' }}>
            <div className="flex items-center gap-2">
              <div
                className="p-1.5 rounded-md"
                style={{ backgroundColor: 'rgba(106, 100, 242, 0.2)' }}
              >
                <Calendar size={14} style={{ color: '#6A64F2' }} weight="fill" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">Order Date</p>
                <p className="text-xs font-semibold text-foreground">
                  {format(new Date(serviceOrder.serviceOrderDate), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`p-1.5 rounded-md ${isOverdue ? 'bg-red-100' : ''}`}
                style={{ backgroundColor: isOverdue ? undefined : 'rgba(106, 100, 242, 0.2)' }}
              >
                <Calendar size={14} className={isOverdue ? 'text-red-600' : ''} style={{ color: isOverdue ? undefined : '#6A64F2' }} weight="fill" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">Expected Delivery</p>
                <p className={`text-xs font-semibold ${isOverdue ? 'text-red-600' : 'text-foreground'}`}>
                  {format(new Date(serviceOrder.expectedDeliveryDate), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Customer Info Card */}
      <Card
        className="p-3 sm:p-4"
        style={{ backgroundColor: '#f0f9ff', borderColor: '#7de8f7' }}
      >
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <User size={16} weight="duotone" className="text-primary" />
          Customer Information
        </h3>

        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="text-base font-bold text-foreground">{serviceOrder.customerName}</h4>
            <p className="text-xs text-muted-foreground">{serviceOrder.customerId}</p>
          </div>
        </div>

        {customer && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t" style={{ borderColor: '#7de8f7' }}>
            {/* Phone */}
            <div className="flex items-center gap-2">
              <div
                className="p-1.5 rounded-md"
                style={{ backgroundColor: '#b1f2ff' }}
              >
                <Phone size={14} className="text-primary" weight="fill" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">Phone</p>
                <a
                  href={`tel:${customer.phone}`}
                  className="text-xs font-semibold text-blue-900 hover:underline truncate block"
                >
                  {customer.phone}
                </a>
              </div>
            </div>

            {/* WhatsApp */}
            {customer.whatsappNumber && (
              <div className="flex items-center gap-2">
                <div
                  className="p-1.5 rounded-md"
                  style={{ backgroundColor: '#b1f2ff' }}
                >
                  <WhatsappLogo size={14} className="text-green-600" weight="fill" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">WhatsApp</p>
                  <button
                    onClick={() => sendWhatsAppMessage(customer.whatsappNumber!, `Hello ${customer.name}, regarding your order ${serviceOrder.id}`)}
                    className="text-xs font-semibold text-green-600 hover:underline truncate block"
                  >
                    {customer.whatsappNumber}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Dress Items Card */}
      {serviceOrder.dressItems && serviceOrder.dressItems.length > 0 && (
        <Card
          className="p-3 sm:p-4"
          style={{ backgroundColor: '#f3e8ff', borderColor: '#6A64F2' }}
        >
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TShirt size={16} weight="duotone" style={{ color: '#6A64F2' }} />
            Dress Items ({serviceOrder.dressItems.length})
          </h3>

          <div className="space-y-2">
            {serviceOrder.dressItems.map((item, index) => (
              <div
                key={item.id || index}
                className="p-2 rounded-lg border"
                style={{ backgroundColor: 'white', borderColor: 'rgba(106, 100, 242, 0.3)' }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.dressName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.dressType} • Qty: {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: '#6A64F2' }}>₹{item.stitchingCost}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Measurements Card */}
      {hasMeasurements && (
        <Card
          className="p-4 sm:p-5 border-2 rounded-xl"
          style={{ backgroundColor: '#f8f5ff', borderColor: '#a78bfa' }}
        >
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: '#6A64F2' }}>
            <Ruler size={20} weight="duotone" style={{ color: '#6A64F2' }} />
            Measurements
          </h3>

          <div className="space-y-4">
            {measurementSections.map(({ key, label }) => {
              const measurements = serviceOrder.measurements?.[key as keyof typeof serviceOrder.measurements];
              if (!measurements || typeof measurements !== 'object' || Object.keys(measurements).length === 0) return null;

              return (
                <div key={key}>
                  {/* Category Title */}
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">{label}</h4>
                  
                  {/* Measurement Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(measurements).map(([field, value]) => (
                      value !== undefined && value !== null && value !== '' && (
                        <div
                          key={field}
                          className="p-3 rounded-xl"
                          style={{ backgroundColor: '#ede9fe' }}
                        >
                          <p className="text-xs text-purple-600 font-medium capitalize mb-1">
                            {field.replace(/([A-Z])/g, ' $1').trim()}
                          </p>
                          <p className="text-xl font-bold text-gray-800">
                            {String(value)}<span className="text-base">"</span>
                          </p>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Design Images Card */}
      {serviceOrder.designList && serviceOrder.designList.length > 0 && (
        <Card
          className="p-3 sm:p-4"
          style={{ backgroundColor: '#f3e8ff', borderColor: '#6A64F2' }}
        >
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Image size={16} weight="duotone" style={{ color: '#6A64F2' }} />
            Design Images ({serviceOrder.designList.length})
          </h3>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {serviceOrder.designList.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`Design ${index + 1}`}
                className="w-full h-24 sm:h-32 object-cover rounded-lg border-2 cursor-pointer hover:opacity-80 transition-opacity"
                style={{ borderColor: '#6A64F2' }}
                onClick={() => window.open(url, '_blank')}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Reference/Notes Card */}
      {serviceOrder.reference && (
        <Card
          className="p-3 sm:p-4"
          style={{ backgroundColor: '#fef3c7', borderColor: '#fcd34d' }}
        >
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <ClipboardText size={16} weight="duotone" className="text-amber-600" />
            Reference / Notes
          </h3>
          <p className="text-sm text-foreground">{serviceOrder.reference}</p>
        </Card>
      )}

      {/* Assignment Info Card */}
      {(serviceOrder.assignedTo || allotment) && (
        <Card
          className="p-3 sm:p-4"
          style={{ backgroundColor: '#ecfdf5', borderColor: '#86efac' }}
        >
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <User size={16} weight="duotone" className="text-green-600" />
            Assignment Information
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground">Assigned To</p>
              <p className="text-sm font-semibold text-foreground">
                {serviceOrder.assignedToName || allotment?.assignedName || 'Not Assigned'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Assignment Type</p>
              <p className="text-sm font-semibold text-foreground capitalize">
                {serviceOrder.assignmentType || allotment?.stitchingAllotment || '-'}
              </p>
            </div>
            {(serviceOrder.assignedDate || allotment?.assignedDate) && (
              <div>
                <p className="text-[10px] text-muted-foreground">Assigned Date</p>
                <p className="text-sm font-semibold text-foreground">
                  {format(new Date(serviceOrder.assignedDate || allotment!.assignedDate!), 'MMM dd, yyyy')}
                </p>
              </div>
            )}
            {serviceOrder.acceptedDate && (
              <div>
                <p className="text-[10px] text-muted-foreground">Accepted Date</p>
                <p className="text-sm font-semibold text-green-600">
                  {format(new Date(serviceOrder.acceptedDate), 'MMM dd, yyyy')}
                </p>
              </div>
            )}
            {serviceOrder.jobWorkNo && (
              <div>
                <p className="text-[10px] text-muted-foreground">Job Work No</p>
                <p className="text-sm font-semibold text-foreground">{serviceOrder.jobWorkNo}</p>
              </div>
            )}
            {(serviceOrder.materialCost !== undefined && serviceOrder.materialCost > 0) && (
              <div>
                <p className="text-[10px] text-muted-foreground">Material Cost</p>
                <p className="text-sm font-bold text-green-600">₹{serviceOrder.materialCost}</p>
              </div>
            )}
            {(serviceOrder.jobWorkCost !== undefined && serviceOrder.jobWorkCost > 0) && (
              <div>
                <p className="text-[10px] text-muted-foreground">Job Work Cost</p>
                <p className="text-sm font-bold text-green-600">₹{serviceOrder.jobWorkCost}</p>
              </div>
            )}
            {serviceOrder.rejectedDate && (
              <div className="col-span-2">
                <p className="text-[10px] text-muted-foreground">Rejected On</p>
                <p className="text-sm font-semibold text-red-600">
                  {format(new Date(serviceOrder.rejectedDate), 'MMM dd, yyyy')}
                  {serviceOrder.rejectionReason && ` - ${serviceOrder.rejectionReason}`}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Delivery Challan Info Card */}
      {serviceOrder.dcNumber && (
        <Card
          className="p-3 sm:p-4"
          style={{ backgroundColor: '#ccfbf1', borderColor: '#14b8a6' }}
        >
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <FileText size={16} weight="duotone" className="text-teal-600" />
            Delivery Challan
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground">DC Number</p>
              <p className="text-sm font-semibold text-foreground">{serviceOrder.dcNumber}</p>
            </div>
            {serviceOrder.dcDate && (
              <div>
                <p className="text-[10px] text-muted-foreground">DC Date</p>
                <p className="text-sm font-semibold text-foreground">
                  {format(new Date(serviceOrder.dcDate), 'MMM dd, yyyy')}
                </p>
              </div>
            )}
            <div>
              <p className="text-[10px] text-muted-foreground">DC Status</p>
              <Badge className={serviceOrder.dcApproved ? 'bg-green-600' : 'bg-amber-500'}>
                {serviceOrder.dcApproved ? 'Approved' : 'Pending'}
              </Badge>
            </div>
          </div>
        </Card>
      )}

      {/* Goods Receipt Info Card */}
      {serviceOrder.goodsReceiptNo && (
        <Card
          className="p-3 sm:p-4"
          style={{ backgroundColor: '#e0f2fe', borderColor: '#0ea5e9' }}
        >
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Truck size={16} weight="duotone" className="text-sky-600" />
            Goods Receipt
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground">GRN Number</p>
              <p className="text-sm font-semibold text-foreground">{serviceOrder.goodsReceiptNo}</p>
            </div>
            {serviceOrder.goodsReceivedDate && (
              <div>
                <p className="text-[10px] text-muted-foreground">Received Date</p>
                <p className="text-sm font-semibold text-foreground">
                  {format(new Date(serviceOrder.goodsReceivedDate), 'MMM dd, yyyy')}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Completion Dates Card */}
      {(serviceOrder.completedDate || serviceOrder.deliveredDate) && (
        <Card
          className="p-3 sm:p-4"
          style={{ backgroundColor: '#dcfce7', borderColor: '#86efac' }}
        >
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <CheckCircle size={16} weight="duotone" className="text-green-600" />
            Completion Status
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {serviceOrder.completedDate && (
              <div>
                <p className="text-[10px] text-muted-foreground">Work Completed</p>
                <p className="text-sm font-semibold text-foreground">
                  {format(new Date(serviceOrder.completedDate), 'MMM dd, yyyy')}
                </p>
              </div>
            )}
            {serviceOrder.deliveredDate && (
              <div>
                <p className="text-[10px] text-muted-foreground">Delivered Date</p>
                <p className="text-sm font-semibold text-green-600">
                  {format(new Date(serviceOrder.deliveredDate), 'MMM dd, yyyy')}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Re-assignment Info Card */}
      {serviceOrder.isReassigned && (
        <Card
          className="p-3 sm:p-4"
          style={{ backgroundColor: '#fff7ed', borderColor: '#fb923c' }}
        >
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <ArrowsClockwise size={16} weight="duotone" className="text-orange-600" />
            Re-assignment Info
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {serviceOrder.previousAssignedToName && (
              <div>
                <p className="text-[10px] text-muted-foreground">Previously Assigned To</p>
                <p className="text-sm font-semibold text-foreground">{serviceOrder.previousAssignedToName}</p>
              </div>
            )}
            {serviceOrder.reassignedDate && (
              <div>
                <p className="text-[10px] text-muted-foreground">Reassigned On</p>
                <p className="text-sm font-semibold text-foreground">
                  {format(new Date(serviceOrder.reassignedDate), 'MMM dd, yyyy')}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Pricing Card */}
      <Card
        className="p-3 sm:p-4"
        style={{ backgroundColor: '#f3e8ff', borderColor: '#6A64F2' }}
      >
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <CurrencyInr size={16} weight="duotone" style={{ color: '#6A64F2' }} />
          Pricing Information
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div
            className="p-3 rounded-lg border text-center"
            style={{ backgroundColor: 'white', borderColor: 'rgba(106, 100, 242, 0.3)' }}
          >
            <p className="text-[10px] text-muted-foreground">Stitching Cost</p>
            <p className="text-lg font-bold" style={{ color: '#6A64F2' }}>
              ₹{serviceOrder.stitchingCost || 0}
            </p>
          </div>

          <div
            className="p-3 rounded-lg border text-center"
            style={{ backgroundColor: 'white', borderColor: 'rgba(106, 100, 242, 0.3)' }}
          >
            <p className="text-[10px] text-muted-foreground">Total Amount</p>
            <p className="text-lg font-bold" style={{ color: '#6A64F2' }}>
              ₹{serviceOrder.totalAmount || serviceOrder.stitchingCost || 0}
            </p>
          </div>

          {serviceOrder.advanceAmount !== undefined && serviceOrder.advanceAmount > 0 && (
            <div
              className="p-3 rounded-lg border text-center"
              style={{ backgroundColor: '#dcfce7', borderColor: '#86efac' }}
            >
              <p className="text-[10px] text-muted-foreground">Advance Paid</p>
              <p className="text-lg font-bold text-green-600">
                ₹{serviceOrder.advanceAmount}
              </p>
            </div>
          )}

          {serviceOrder.balanceAmount !== undefined && (
            <div
              className="p-3 rounded-lg border text-center"
              style={{ backgroundColor: '#ffedd5', borderColor: '#fdba74' }}
            >
              <p className="text-[10px] text-muted-foreground">Balance</p>
              <p className="text-lg font-bold text-orange-600">
                ₹{serviceOrder.balanceAmount}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Order History Card */}
      <Card
        className="p-3 sm:p-4"
        style={{ backgroundColor: '#f8fafc', borderColor: '#94a3b8' }}
      >
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <ClockCounterClockwise size={16} weight="duotone" className="text-slate-600" />
          Order History
        </h3>

        {loadingHistory ? (
          <div className="flex items-center justify-center py-6">
            <Spinner size={24} className="animate-spin text-slate-500" />
            <span className="ml-2 text-sm text-muted-foreground">Loading history...</span>
          </div>
        ) : orderHistory.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No history available for this order
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-200" />

            <div className="space-y-3">
              {orderHistory.map((entry, index) => {
                // Extract metadata fields if available
                const meta = entry.metadata || {};
                return (
                  <div key={entry.id || index} className="relative flex gap-3 pl-1">
                    {/* Timeline dot */}
                    <div className="relative z-10 flex-shrink-0 w-5 h-5 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center">
                      {getHistoryActionIcon(entry.action)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {getHistoryActionLabel(entry.action)}
                          </p>
                          {meta.notes && (
                            <p className="text-xs text-muted-foreground mt-0.5">{meta.notes}</p>
                          )}
                          {meta.newStatus && meta.previousStatus && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Status: <span className="capitalize">{meta.previousStatus}</span> → <span className="capitalize font-medium">{meta.newStatus}</span>
                            </p>
                          )}
                          {meta.newAssignedToName && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Assigned to: <span className="font-medium">{meta.newAssignedToName}</span>
                              {meta.assignmentType && <span className="capitalize"> ({meta.assignmentType})</span>}
                            </p>
                          )}
                          {meta.dcNumber && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              DC Number: <span className="font-medium">{meta.dcNumber}</span>
                            </p>
                          )}
                          {meta.goodsReceiptNo && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              GRN: <span className="font-medium">{meta.goodsReceiptNo}</span>
                            </p>
                          )}
                          {meta.paymentAmount !== undefined && meta.paymentAmount > 0 && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Payment: <span className="font-medium text-green-600">₹{meta.paymentAmount}</span>
                            </p>
                          )}
                          {/* Show current status */}
                          <Badge className={`mt-1 text-[10px] ${getStatusColor(entry.status)}`}>
                            {entry.status.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[10px] text-muted-foreground">
                            {format(new Date(entry.timestamp), 'MMM dd, yyyy')}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {format(new Date(entry.timestamp), 'hh:mm a')}
                          </p>
                        </div>
                      </div>
                      {entry.performedBy?.userName && (
                        <p className="text-[10px] text-slate-400 mt-1">
                          by {entry.performedBy.userName}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

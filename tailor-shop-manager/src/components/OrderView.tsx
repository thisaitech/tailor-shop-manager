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
} from '@phosphor-icons/react';
import { format, isPast } from 'date-fns';
import { sendWhatsAppMessage } from '@/lib/utils';

interface OrderViewProps {
  serviceOrder: ServiceOrder;
  orderAllotments?: OrderAllotment[];
  customer?: Customer;
  onBack: () => void;
}

// Display status type for combined status from both collections
type DisplayStatus = 'pending' | 'in-progress' | 'delivered' | 'completed';

export function OrderView({ serviceOrder, orderAllotments = [], customer, onBack }: OrderViewProps) {
  const { t } = useLanguage();

  /**
   * Get the display status for a service order based on allotment status
   */
  const getDisplayStatus = (order: ServiceOrder): DisplayStatus => {
    const allotment = orderAllotments.find(a => a.serviceOrderNo === order.id && !a.reassigned);

    if (!allotment) {
      return 'pending';
    }

    const allotmentStatus = allotment.status;
    const orderTicketStatus = allotment.orderStatus;
    const serviceOrderStatus = allotment.serviceOrderStatus;

    if (order.orderStatus === 'delivered') {
      return 'completed';
    }

    if (allotmentStatus === 'stitched' || allotmentStatus === 'delivered' || serviceOrderStatus === 'ready') {
      return 'delivered';
    }

    if (allotmentStatus === 'in_progress' || orderTicketStatus === 'in-progress') {
      return 'in-progress';
    }

    if (allotmentStatus === 'allotted' || orderTicketStatus === 'open') {
      return 'pending';
    }

    return 'pending';
  };

  const getStatusColor = (status: DisplayStatus) => {
    switch (status) {
      case 'in-progress':
        return 'bg-blue-600 text-white';
      case 'pending':
        return 'bg-amber-500 text-white';
      case 'delivered':
        return 'bg-green-600 text-white';
      case 'completed':
        return 'bg-purple-600 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusLabel = (status: DisplayStatus): string => {
    switch (status) {
      case 'pending':
        return 'PENDING';
      case 'in-progress':
        return 'IN PROGRESS';
      case 'delivered':
        return 'DELIVERED';
      case 'completed':
        return 'COMPLETED';
    }
  };

  const isOverdue = serviceOrder.expectedDeliveryDate &&
    serviceOrder.orderStatus !== 'delivered' &&
    isPast(new Date(serviceOrder.expectedDeliveryDate));

  const displayStatus = getDisplayStatus(serviceOrder);

  // Get allotment info for this order
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
                {serviceOrder.orderCategory.charAt(0).toUpperCase() + serviceOrder.orderCategory.slice(1)} • {serviceOrder.orderQty} {serviceOrder.uom}
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
                key={index}
                className="p-2 rounded-lg border"
                style={{ backgroundColor: 'white', borderColor: 'rgba(106, 100, 242, 0.3)' }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.qty}</p>
                  </div>
                  <div className="text-right">
                    {item.rate && (
                      <p className="text-xs text-muted-foreground">Rate: ₹{item.rate}</p>
                    )}
                    {item.amount && (
                      <p className="text-sm font-bold" style={{ color: '#6A64F2' }}>₹{item.amount}</p>
                    )}
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
          className="p-3 sm:p-4"
          style={{ backgroundColor: '#f3e8ff', borderColor: '#6A64F2' }}
        >
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Ruler size={16} weight="duotone" style={{ color: '#6A64F2' }} />
            Measurements
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {measurementSections.map(({ key, label }) => {
              const measurements = serviceOrder.measurements?.[key as keyof typeof serviceOrder.measurements];
              if (!measurements || typeof measurements !== 'object' || Object.keys(measurements).length === 0) return null;

              return (
                <div
                  key={key}
                  className="p-2 rounded-lg border"
                  style={{ backgroundColor: 'white', borderColor: 'rgba(106, 100, 242, 0.3)' }}
                >
                  <h4 className="text-xs font-semibold text-foreground mb-1.5">{label}</h4>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
                    {Object.entries(measurements).map(([field, value]) => (
                      value !== undefined && value !== null && value !== '' && (
                        <div key={field} className="flex justify-between">
                          <span className="text-muted-foreground capitalize truncate">
                            {field.replace(/([A-Z])/g, ' $1').trim()}:
                          </span>
                          <span className="font-semibold">{String(value)}"</span>
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

      {/* Allotment Info Card */}
      {allotment && (
        <Card
          className="p-3 sm:p-4"
          style={{ backgroundColor: '#ecfdf5', borderColor: '#86efac' }}
        >
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <User size={16} weight="duotone" className="text-green-600" />
            Allotment Information
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground">Assigned To</p>
              <p className="text-sm font-semibold text-foreground">
                {allotment.employeeName || allotment.vendorName || 'Not Assigned'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Tailor Type</p>
              <p className="text-sm font-semibold text-foreground capitalize">
                {allotment.tailorType || '-'}
              </p>
            </div>
            {allotment.allotmentDate && (
              <div>
                <p className="text-[10px] text-muted-foreground">Allotment Date</p>
                <p className="text-sm font-semibold text-foreground">
                  {format(new Date(allotment.allotmentDate), 'MMM dd, yyyy')}
                </p>
              </div>
            )}
            {allotment.tailorCost !== undefined && (
              <div>
                <p className="text-[10px] text-muted-foreground">Tailor Cost</p>
                <p className="text-sm font-bold text-green-600">₹{allotment.tailorCost}</p>
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
    </div>
  );
}

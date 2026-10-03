import { Customer, ServiceOrder } from '@/lib/types';
import { useLanguage } from '@/hooks/use-language';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  ArrowLeft,
  Phone,
  WhatsappLogo,
  EnvelopeSimple,
  MapPin,
  Calendar,
  PencilSimple,
  Trash,
  Ruler,
  ShoppingBag,
} from '@phosphor-icons/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';
import { format } from 'date-fns';
import { sendWhatsAppMessage } from '@/lib/utils';

interface CustomerViewProps {
  customer: Customer;
  serviceOrders?: ServiceOrder[];
  onBack: () => void;
  onEdit?: (customer: Customer) => void;
  onDelete?: (customerId: string) => void | Promise<void>;
}

export function CustomerView({ customer, serviceOrders = [], onBack, onEdit, onDelete }: CustomerViewProps) {
  const { t } = useLanguage();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!onDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete(customer.id);
      setShowDeleteConfirm(false);
    } catch {
      // Parent already reported the error; keep the dialog open so the user can retry.
    } finally {
      setIsDeleting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get customer's service orders
  const customerOrders = serviceOrders.filter((order) => order.customerId === customer.id);

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

  const hasMeasurements = customer.measurements && Object.keys(customer.measurements).length > 0;

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
          <h1 className="text-base md:text-lg font-bold">Customer Details</h1>
        </div>

        {/* Action Buttons - Desktop */}
        {(onEdit || onDelete) && (
          <div className="hidden sm:flex gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(customer)}
                className="gap-2"
                style={{ backgroundColor: 'white' }}
              >
                <PencilSimple size={16} weight="bold" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
                className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                style={{ backgroundColor: 'white' }}
              >
                <Trash size={16} weight="bold" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Customer Profile Card */}
      <Card
        className="p-3 sm:p-4"
        style={{ backgroundColor: '#f0f9ff', borderColor: '#7de8f7' }}
      >
        <div className="flex flex-col gap-3">
          {/* Avatar and Basic Info */}
          <div className="flex items-start gap-3">
            <Avatar className="h-14 w-14 sm:h-16 sm:w-16 border-2 flex-shrink-0" style={{ borderColor: '#7de8f7' }}>
              <AvatarFallback
                className="text-base sm:text-lg font-bold"
                style={{ backgroundColor: '#b1f2ff' }}
              >
                {getInitials(customer.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-foreground">
                  {customer.name}
                </h2>
                <Badge variant="outline" className="text-[10px] font-semibold px-1.5 py-0.5">
                  {t(customer.gender).toUpperCase()}
                </Badge>
              </div>
              {customer.aliasName && (
                <p className="text-xs text-muted-foreground">aka {customer.aliasName}</p>
              )}
              <p className="text-xs font-bold text-primary mt-0.5">{customer.id}</p>
            </div>
          </div>

          {/* Action Buttons - Mobile */}
          {(onEdit || onDelete) && (
            <div className="flex sm:hidden gap-2 pt-2 border-t" style={{ borderColor: '#7de8f7' }}>
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(customer)}
                  className="gap-2"
                  style={{ backgroundColor: 'white' }}
                >
                  <PencilSimple size={16} weight="bold" />
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                  className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  style={{ backgroundColor: 'white' }}
                >
                  <Trash size={16} weight="bold" />
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Contact Info */}
        <div className="mt-3 pt-3 border-t" style={{ borderColor: '#7de8f7' }}>
          <h3 className="text-xs font-semibold mb-2 text-muted-foreground">Contact Information</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                    onClick={() => sendWhatsAppMessage(customer.whatsappNumber!, `Hello ${customer.name},`)}
                    className="text-xs font-semibold text-green-600 hover:underline truncate block"
                  >
                    {customer.whatsappNumber}
                  </button>
                </div>
              </div>
            )}

            {/* Email */}
            {customer.email && (
              <div className="flex items-center gap-2">
                <div
                  className="p-1.5 rounded-md"
                  style={{ backgroundColor: '#b1f2ff' }}
                >
                  <EnvelopeSimple size={14} className="text-primary" weight="fill" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">Email</p>
                  <a
                    href={`mailto:${customer.email}`}
                    className="text-xs font-semibold text-foreground hover:underline truncate block max-w-[150px]"
                  >
                    {customer.email}
                  </a>
                </div>
              </div>
            )}

            {/* Created Date */}
            <div className="flex items-center gap-2">
              <div
                className="p-1.5 rounded-md"
                style={{ backgroundColor: '#b1f2ff' }}
              >
                <Calendar size={14} className="text-primary" weight="fill" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">Since</p>
                <p className="text-xs font-semibold text-foreground">
                  {format(new Date(customer.createdAt), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Address */}
        {(customer.place || customer.address1 || customer.address2) && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: '#7de8f7' }}>
            <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-muted-foreground">
              <MapPin size={14} weight="fill" className="text-primary" />
              Address
            </h3>
            <div className="text-xs text-foreground space-y-0.5">
              {customer.address1 && <p>{customer.address1}</p>}
              {customer.address2 && <p>{customer.address2}</p>}
              <p>
                {[customer.place, customer.region, customer.state].filter(Boolean).join(', ')}
                {customer.pincode && ` - ${customer.pincode}`}
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Measurements Card */}
      <Card
        className="p-3 sm:p-4"
        style={{ backgroundColor: '#f0f9ff', borderColor: '#7de8f7' }}
      >
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Ruler size={16} weight="duotone" className="text-primary" />
          Measurements
        </h3>

        {hasMeasurements ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {measurementSections.map(({ key, label }) => {
              const measurements = customer.measurements?.[key as keyof typeof customer.measurements];
              if (!measurements || Object.keys(measurements).length === 0) return null;

              return (
                <div
                  key={key}
                  className="p-2 rounded-lg border"
                  style={{ backgroundColor: '#b1f2ff', borderColor: '#7de8f7' }}
                >
                  <h4 className="text-xs font-semibold text-foreground mb-1.5">{label}</h4>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
                    {Object.entries(measurements).map(([field, value]) => (
                      value !== undefined && value !== null && (
                        <div key={field} className="flex justify-between">
                          <span className="text-muted-foreground capitalize truncate">
                            {field.replace(/([A-Z])/g, ' $1').trim()}:
                          </span>
                          <span className="font-semibold">{value}"</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-3">
            No measurements recorded yet
          </p>
        )}
      </Card>

      {/* Orders History Card */}
      <Card
        className="p-3 sm:p-4"
        style={{ backgroundColor: '#f0f9ff', borderColor: '#7de8f7' }}
      >
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <ShoppingBag size={16} weight="duotone" className="text-primary" />
          Order History ({customerOrders.length})
        </h3>

        {customerOrders.length > 0 ? (
          <div className="space-y-2">
            {customerOrders.slice(0, 5).map((order) => (
              <div
                key={order.id}
                className="p-2 rounded-lg border flex items-center justify-between"
                style={{ backgroundColor: '#b1f2ff', borderColor: '#7de8f7' }}
              >
                <div>
                  <p className="text-xs font-bold text-primary">{order.id}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(order.serviceOrderDate), 'MMM dd, yyyy')}
                  </p>
                </div>
                <div className="text-right">
                  <Badge
                    variant={
                      order.orderStatus === 'delivered'
                        ? 'default'
                        : order.orderStatus === 'ready'
                        ? 'secondary'
                        : 'outline'
                    }
                    className="text-[10px] px-1.5 py-0.5"
                  >
                    {order.orderStatus.toUpperCase()}
                  </Badge>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {order.orderQty} item(s)
                  </p>
                </div>
              </div>
            ))}
            {customerOrders.length > 5 && (
              <p className="text-[10px] text-center text-muted-foreground pt-1">
                +{customerOrders.length - 5} more orders
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-3">
            No orders yet
          </p>
        )}
      </Card>

      {onDelete && (
        <AlertDialog
          open={showDeleteConfirm}
          onOpenChange={(isOpen) => {
            if (!isDeleting) setShowDeleteConfirm(isOpen);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Customer</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{customer.name}</strong>? This action cannot be undone and will remove all customer data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

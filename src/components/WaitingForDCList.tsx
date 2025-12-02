import { useState, lazy, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  ClipboardText,
  ArrowLeft,
  Eye,
  MagnifyingGlass,
  Spinner,
  FileText,
} from '@phosphor-icons/react';
import { EmptyState } from './EmptyState';
import { format } from 'date-fns';
import { ServiceOrder, OrderAllotment } from '@/lib/types';

// Lazy load the dialog
const ServiceOrderDetailsDialog = lazy(() =>
  import('@/components/ServiceOrderDetailsDialog').then(m => ({ default: m.ServiceOrderDetailsDialog }))
);

interface WaitingForDCListProps {
  serviceOrders: ServiceOrder[];
  orderAllotments: OrderAllotment[];
  onBack: () => void;
  onCreateDC?: (orderId: string) => void; // Callback to navigate to DC form with order ID
}

export function WaitingForDCList({ serviceOrders, orderAllotments, onBack, onCreateDC }: WaitingForDCListProps) {
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter orders with 'waitingForDC' status - vendor accepted but DC not yet created
  const waitingForDCOrders = serviceOrders.filter(o => o.orderStatus === 'waitingForDC');

  // Apply search filter
  const filteredOrders = waitingForDCOrders.filter((order) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      order.id.toLowerCase().includes(search) ||
      order.customerName?.toLowerCase().includes(search) ||
      order.assignedToName?.toLowerCase().includes(search) ||
      order.jobWorkNo?.toLowerCase().includes(search)
    );
  });

  // Sort by accepted date (newest first)
  const sortedOrders = [...filteredOrders].sort((a, b) => 
    (b.acceptedDate || b.assignedDate || 0) - (a.acceptedDate || a.assignedDate || 0)
  );

  const handleOrderClick = (order: ServiceOrder) => {
    setSelectedOrder(order);
    setShowDetailsDialog(true);
  };

  const handleCreateDC = (order: ServiceOrder, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCreateDC) {
      onCreateDC(order.id);
    }
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 180px)', minHeight: '400px' }}>
      {/* Fixed Header */}
      <div className="flex items-center justify-between gap-3 pb-4 flex-shrink-0 bg-background">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardText size={28} weight="duotone" className="text-teal-600" />
              Waiting for DC
            </h1>
            <p className="text-sm text-muted-foreground">
              {waitingForDCOrders.length} orders accepted by vendors, pending Delivery Challan
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="pb-4 flex-shrink-0">
        <div className="relative max-w-md">
          <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by order ID, customer, vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 border-teal-300 focus:border-teal-500 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Scrollable Orders List */}
      <Card className="flex-1 min-h-0 overflow-hidden">
        <CardContent className="p-4 h-full overflow-y-auto" style={{ background: 'linear-gradient(135deg, #ccfbf1 0%, #99f6e4 50%, #5eead4 100%)' }}>
          {sortedOrders.length === 0 ? (
            <EmptyState
              icon={ClipboardText}
              title={searchTerm ? "No matching orders" : "No orders waiting for DC"}
              description={searchTerm ? "Try a different search term" : "Vendor accepted orders waiting for Delivery Challan will appear here"}
            />
          ) : (
            <div className="space-y-4">
              {sortedOrders.map((order, index) => (
                <div
                  key={order.id}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer hover:shadow-lg hover:scale-[1.01] animate-on-load animate-fade-slide-up stagger-${(index % 6) + 1}`}
                  style={{
                    background: '#ffffff',
                    borderColor: '#14b8a6',
                    boxShadow: '0 4px 12px -2px rgba(20, 184, 166, 0.2), 0 2px 6px -2px rgba(20, 184, 166, 0.15)',
                  }}
                  onClick={() => handleOrderClick(order)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-mono text-xs" style={{ background: '#ccfbf1', color: '#0d9488', borderColor: '#14b8a6' }}>
                          {order.jobWorkNo || order.id}
                        </Badge>
                        <Badge className="bg-teal-500 text-white text-xs">
                          Waiting for DC
                        </Badge>
                        {order.assignmentType === 'vendor' && (
                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-600 border-purple-300">
                            Job Work
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
                        {order.acceptedDate && (
                          <div>
                            <span className="text-muted-foreground">Accepted On:</span>{' '}
                            <span className="font-medium text-gray-900">
                              {format(new Date(order.acceptedDate), 'dd MMM yyyy')}
                            </span>
                          </div>
                        )}
                        {order.orderQty && (
                          <div>
                            <span className="text-muted-foreground">Quantity:</span>{' '}
                            <span className="font-medium text-gray-900">{order.orderQty} {order.uom}</span>
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
                        style={{ background: '#ccfbf1', color: '#0d9488', borderColor: '#14b8a6' }}
                      >
                        <Eye size={16} className="mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        onClick={(e) => handleCreateDC(order, e)}
                        className="whitespace-nowrap shadow-sm"
                        style={{ background: '#14b8a6', color: 'white' }}
                      >
                        <FileText size={16} className="mr-1" weight="bold" />
                        Create DC
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
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white p-4 rounded-lg"><Spinner size={32} className="animate-spin text-teal-500" /></div></div>}>
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
    </div>
  );
}


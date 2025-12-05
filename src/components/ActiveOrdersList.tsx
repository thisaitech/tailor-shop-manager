import { useState, lazy, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Scissors, ArrowLeft, Spinner, FileText, UserPlus } from '@phosphor-icons/react';
import { EmptyState } from './EmptyState';
import { format } from 'date-fns';
import { ServiceOrder, OrderAllotment } from '@/lib/types';

// Lazy load the dialog
const ServiceOrderDetailsDialog = lazy(() =>
  import('@/components/ServiceOrderDetailsDialog').then(m => ({ default: m.ServiceOrderDetailsDialog }))
);

// Filter types for different views
type FilterType = 'open' | 'awaiting' | 'inProgress' | 'receivedNote';

interface ActiveOrdersListProps {
  serviceOrders: ServiceOrder[];
  orderAllotments: OrderAllotment[];
  onBack: () => void;
  filterType?: FilterType;
  onJobAllotment?: (serviceOrderId: string) => void; // Callback for Job Allotment (Open Orders only)
}

export function ActiveOrdersList({ serviceOrders, orderAllotments, onBack, filterType = 'open', onJobAllotment }: ActiveOrdersListProps) {
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Get title and icon based on filter type
  const getViewConfig = () => {
    switch (filterType) {
      case 'open':
        return {
          title: 'New Orders',
          subtitle: 'Orders not yet assigned',
          icon: Scissors,
          color: '#9333ea', // purple
          bgColor: '#f3e8ff',
          emptyMessage: 'No open orders',
        };
      case 'awaiting':
        return {
          title: 'Awaiting Acceptance',
          subtitle: 'Orders assigned but not yet accepted',
          icon: UserPlus,
          color: '#d97706', // amber
          bgColor: '#fef3c7',
          emptyMessage: 'No orders awaiting acceptance',
        };
      case 'inProgress':
        return {
          title: 'In-Progress Orders',
          subtitle: 'Orders currently being worked on',
          icon: Spinner,
          color: '#2563eb', // blue
          bgColor: '#dbeafe',
          emptyMessage: 'No in-progress orders',
        };
      case 'receivedNote':
        return {
          title: 'Received Note',
          subtitle: 'Vendor goods received at shop',
          icon: FileText,
          color: '#0891b2', // cyan
          bgColor: '#cffafe',
          emptyMessage: 'No received notes',
        };
      default:
        return {
          title: 'Orders',
          subtitle: '',
          icon: Scissors,
          color: '#9333ea',
          bgColor: '#f3e8ff',
          emptyMessage: 'No orders found',
        };
    }
  };

  const viewConfig = getViewConfig();
  const ViewIcon = viewConfig.icon;

  // Filter orders based on filterType
  const getFilteredOrders = (): ServiceOrder[] => {
    switch (filterType) {
      case 'open':
        // Open orders - service orders with orderStatus === 'open' (not assigned yet)
        return serviceOrders.filter(o => o.orderStatus === 'open');

      case 'awaiting':
        // Awaiting acceptance - orders assigned but not yet accepted (status === 'awaiting')
        return serviceOrders.filter(o => o.orderStatus === 'awaiting');

      case 'inProgress':
        // In-progress orders - using new unified status
        return serviceOrders.filter(o => o.orderStatus === 'inprogress');

      case 'receivedNote':
        // Received Note - vendor orders where goods have been received (status === 'received-note')
        return serviceOrders.filter(o => o.orderStatus === 'received-note');

      default:
        return serviceOrders;
    }
  };

  const filteredOrders = getFilteredOrders();

  const handleOrderClick = (order: ServiceOrder) => {
    setSelectedOrder(order);
    setShowDetailsDialog(true);
  };

  // Get allotment info for an order
  const getOrderAllotment = (orderId: string) => {
    return orderAllotments.find(a => a.serviceOrderNo === orderId && !a.reassigned);
  };

  return (
    <div className="flex flex-col pb-4">
      {/* Fixed Header - Never scrolls */}
      <div className="flex items-center gap-3 pb-4 flex-shrink-0 bg-background">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{viewConfig.title}</h1>
          <p className="text-sm text-muted-foreground">{filteredOrders.length} orders</p>
        </div>
      </div>

      {/* Orders List */}
      <Card className="border-0 shadow-none bg-transparent">
        <CardContent className="p-0">
          {filteredOrders.length === 0 ? (
            <EmptyState
              icon={ViewIcon}
              title={viewConfig.emptyMessage}
              description="Orders will appear here when available"
            />
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order, index) => {
                const allotment = getOrderAllotment(order.id);
                return (
                  <div
                    key={order.id}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer hover:shadow-lg hover:scale-[1.01] animate-on-load animate-fade-slide-up stagger-${(index % 6) + 1}`}
                    style={{
                      background: '#ffffff',
                      borderColor: viewConfig.color,
                      boxShadow: `0 4px 12px -2px ${viewConfig.color}33, 0 2px 6px -2px ${viewConfig.color}26`,
                    }}
                    onClick={() => handleOrderClick(order)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="font-mono text-xs" style={{ background: viewConfig.bgColor, color: viewConfig.color, borderColor: viewConfig.color }}>
                            {order.id}
                          </Badge>
                          {allotment && (
                            <Badge className="text-xs" style={{ background: viewConfig.color, color: '#ffffff' }}>
                              {allotment.stitchingAllotment === 'vendor' ? 'Vendor' : 'Employee'}
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Customer:</span>{' '}
                            <span className="font-medium text-gray-900">{order.customerName}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Category:</span>{' '}
                            <span className="font-medium text-gray-900">
                              {order.orderCategory === 'male' ? 'Men' : order.orderCategory === 'female' ? 'Women' : 'Kids'}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Order Date:</span>{' '}
                            <span className="font-medium text-gray-900">
                              {format(new Date(order.serviceOrderDate), 'dd MMM yyyy')}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Delivery Date:</span>{' '}
                            <span className="font-medium text-gray-900">
                              {format(new Date(order.expectedDeliveryDate), 'dd MMM yyyy')}
                            </span>
                          </div>
                          {order.orderQty && (
                            <div>
                              <span className="text-muted-foreground">Quantity:</span>{' '}
                              <span className="font-medium text-gray-900">{order.orderQty} {order.uom}</span>
                            </div>
                          )}
                          {allotment?.allottedToName && (
                            <div>
                              <span className="text-muted-foreground">Assigned to:</span>{' '}
                              <span className="font-medium text-gray-900">{allotment.allottedToName}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-3">
                        {/* Job Allotment button - only for Open Orders */}
                        {filterType === 'open' && onJobAllotment && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onJobAllotment(order.id);
                            }}
                            className="whitespace-nowrap shadow-sm py-2"
                            style={{ background: viewConfig.color }}
                          >
                            <UserPlus size={16} className="mr-1.5" weight="bold" />
                            Job Allotment
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOrderClick(order);
                          }}
                          className="whitespace-nowrap shadow-sm py-2"
                          style={{ background: '#ffffff', color: viewConfig.color, borderColor: viewConfig.color }}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
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
    </div>
  );
}

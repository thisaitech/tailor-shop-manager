import { useState, lazy, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, Eye } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { OrderAllotment, ServiceOrder } from '@/lib/types';
import { getServiceOrderById } from '@/lib/firestore/serviceOrderService';

// Lazy load the dialog
const ServiceOrderDetailsDialog = lazy(() =>
  import('@/components/ServiceOrderDetailsDialog').then(m => ({ default: m.ServiceOrderDetailsDialog }))
);

interface AwaitingAcceptanceListProps {
  orders: OrderAllotment[];
  onBack: () => void;
}

export function ReassignedOrdersList({ orders, onBack }: AwaitingAcceptanceListProps) {
  const [selectedServiceOrder, setSelectedServiceOrder] = useState<ServiceOrder | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState<string | null>(null);

  // Filter orders awaiting acceptance from employee or job-work tailor
  // status='allotted' means newly allotted, reassigned=true means it was reassigned
  const awaitingAcceptanceOrders = orders.filter(o =>
    o.status === 'allotted' || (o.reassigned === true && o.status !== 'delivered' && o.status !== 'stitched')
  );

  const handleViewDetails = async (order: OrderAllotment) => {
    try {
      setLoadingOrder(order.id);
      const serviceOrder = await getServiceOrderById(order.serviceOrderNo);
      if (serviceOrder) {
        setSelectedServiceOrder(serviceOrder);
        setShowDetailsDialog(true);
      }
    } catch (error) {
      console.error('Error loading service order:', error);
    } finally {
      setLoadingOrder(null);
    }
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 180px)', minHeight: '400px' }}>
      {/* Fixed Header - Never scrolls */}
      <div className="flex items-center gap-3 pb-4 flex-shrink-0 bg-background">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Awaiting Acceptance</h1>
          <p className="text-sm text-muted-foreground">{awaitingAcceptanceOrders.length} orders</p>
        </div>
      </div>

      {/* Scrollable Awaiting Acceptance Orders List */}
      <Card className="flex-1 min-h-0 overflow-hidden">
        <CardContent className="p-4 h-full overflow-y-auto" style={{ background: '#EADDFD' }}>
          {awaitingAcceptanceOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock size={48} className="mx-auto mb-3 opacity-30" />
              <p>No orders awaiting acceptance</p>
            </div>
          ) : (
            <div className="space-y-4">
              {awaitingAcceptanceOrders.map((order, index) => {
                // Check if this is a reassigned order or newly allotted
                const isReassigned = order.reassigned === true;

                // Determine the current status display
                const currentStatus = isReassigned ? 'Reassigned' :
                  order.status === 'allotted' ? 'Newly Allotted' :
                  order.status === 'in_progress' ? 'In Progress' :
                  order.status === 'stitched' ? 'Job Completed' :
                  order.status === 'rejected' ? 'Rejected' :
                  order.status || 'Unknown';

                return (
                  <div
                    key={order.id}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer hover:shadow-lg hover:scale-[1.01] animate-on-load animate-fade-slide-up stagger-${(index % 6) + 1}`}
                    style={{
                      background: '#FAF8FF',
                      borderColor: '#6A64F2',
                      boxShadow: '0 4px 12px -2px rgba(106, 100, 242, 0.2), 0 2px 6px -2px rgba(106, 100, 242, 0.15)',
                    }}
                    onClick={() => handleViewDetails(order)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="font-mono text-xs" style={{ background: '#EADDFD', color: '#6A64F2', borderColor: '#6A64F2' }}>
                            {order.jobWorkNo || order.id}
                          </Badge>
                          <span className="text-sm text-muted-foreground">•</span>
                          <span className="text-sm font-medium" style={{ color: '#6A64F2' }}>{order.serviceOrderNo}</span>
                          <Badge className={`text-xs ${
                            isReassigned ? 'bg-purple-500' :
                            order.status === 'allotted' ? 'bg-orange-500' :
                            order.status === 'in_progress' ? 'bg-blue-500' :
                            order.status === 'stitched' ? 'bg-green-500' :
                            order.status === 'rejected' ? 'bg-red-500' :
                            'bg-gray-500'
                          } text-white`}>
                            {currentStatus}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Customer:</span>{' '}
                            <span className="font-medium text-gray-900">{order.customerName}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Currently assigned to:</span>{' '}
                            <span className="font-medium text-gray-900">{order.assignedName}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Assignment Type:</span>{' '}
                            <span className="font-medium text-gray-900 capitalize">{order.stitchingAllotment}</span>
                          </div>
                          {order.dressItemName && (
                            <div>
                              <span className="text-muted-foreground">Item:</span>{' '}
                              <span className="font-medium text-gray-900">{order.dressItemName}</span>
                            </div>
                          )}
                          {/* Show assigned date for newly allotted orders */}
                          {!isReassigned && order.assignedDate && typeof order.assignedDate === 'number' && (
                            <div>
                              <span className="text-muted-foreground">Allotted on:</span>{' '}
                              <span className="font-medium text-gray-900">
                                {format(new Date(order.assignedDate), 'dd MMM yyyy, hh:mm a')}
                              </span>
                            </div>
                          )}
                          {/* Show reassigned date for reassigned orders */}
                          {isReassigned && order.reassignedDate && typeof order.reassignedDate === 'number' && (
                            <div>
                              <span className="text-muted-foreground">Reassigned on:</span>{' '}
                              <span className="font-medium text-gray-900">
                                {format(new Date(order.reassignedDate), 'dd MMM yyyy, hh:mm a')}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Show history summary if available */}
                        {order.history && order.history.length > 0 && (
                          <div className="mt-2 text-xs p-2 rounded" style={{ background: '#EADDFD', color: '#6A64F2' }}>
                            <span className="font-medium">History:</span> {order.history.length} actions recorded
                          </div>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(order);
                        }}
                        disabled={loadingOrder === order.id}
                        className="whitespace-nowrap shadow-sm"
                        style={{ background: '#FAF8FF', color: '#6A64F2', borderColor: '#6A64F2' }}
                      >
                        <Eye size={16} className="mr-1" />
                        {loadingOrder === order.id ? 'Loading...' : 'View Details'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Order Details Dialog - Lazy Loaded */}
      {selectedServiceOrder && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white p-4 rounded-lg">Loading...</div></div>}>
          <ServiceOrderDetailsDialog
            serviceOrder={selectedServiceOrder}
            open={showDetailsDialog}
            onClose={() => {
              setShowDetailsDialog(false);
              setSelectedServiceOrder(null);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}

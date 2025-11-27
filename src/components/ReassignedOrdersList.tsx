import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowsClockwise, ArrowLeft, Clock } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { OrderAllotment } from '@/lib/types';

interface AwaitingAcceptanceListProps {
  orders: OrderAllotment[];
  onBack: () => void;
}

export function ReassignedOrdersList({ orders, onBack }: AwaitingAcceptanceListProps) {
  // Filter orders awaiting acceptance from employee or job-work tailor
  // This includes:
  // 1. Newly allotted orders (status = 'allotted') - waiting for tailor to accept
  // 2. Reassigned orders (status = 'reassigned') - previously completed orders reassigned to new tailor
  // Once status changes to 'in_progress', 'stitched', 'rejected', etc., they are removed from this list
  const awaitingAcceptanceOrders = orders.filter(o =>
    o.status === 'allotted' || o.status === 'reassigned'
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Awaiting Acceptance</h1>
          <p className="text-sm text-muted-foreground">{awaitingAcceptanceOrders.length} orders</p>
        </div>
      </div>

      {/* Awaiting Acceptance Orders List */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center gap-2">
            <Clock size={24} className="text-orange-600" weight="duotone" />
            <CardTitle>Orders Awaiting Response</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {awaitingAcceptanceOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock size={48} className="mx-auto mb-3 opacity-30" />
              <p>No orders awaiting acceptance</p>
            </div>
          ) : (
            <div className="divide-y">
              {awaitingAcceptanceOrders.map((order) => {
                // Determine the current status
                const currentStatus = order.status === 'allotted' ? 'Newly Allotted' :
                  order.status === 'reassigned' ? 'Reassigned' :
                  order.status === 'in_progress' ? 'In Progress' :
                  order.status === 'stitched' ? 'Job Completed' :
                  order.status === 'rejected' ? 'Rejected' :
                  order.status || 'Unknown';

                // Check if this is a reassigned order or newly allotted
                const isReassigned = order.reassigned === true;

                return (
                  <div key={order.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="font-mono text-xs bg-orange-50 text-orange-700 border-orange-300">
                            {order.jobWorkNo || order.id}
                          </Badge>
                          <span className="text-sm text-muted-foreground">•</span>
                          <span className="text-sm font-medium">{order.serviceOrderNo}</span>
                          <Badge className={`text-xs ${
                            order.status === 'allotted' ? 'bg-orange-500' :
                            order.status === 'reassigned' ? 'bg-purple-500' :
                            order.status === 'in_progress' ? 'bg-blue-500' :
                            order.status === 'stitched' ? 'bg-green-500' :
                            order.status === 'rejected' ? 'bg-red-500' :
                            'bg-gray-500'
                          }`}>
                            {currentStatus}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Customer:</span>{' '}
                            <span className="font-medium">{order.customerName}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Currently assigned to:</span>{' '}
                            <span className="font-medium">{order.assignedName}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Assignment Type:</span>{' '}
                            <span className="font-medium capitalize">{order.stitchingAllotment}</span>
                          </div>
                          {order.dressItemName && (
                            <div>
                              <span className="text-muted-foreground">Item:</span>{' '}
                              <span className="font-medium">{order.dressItemName}</span>
                            </div>
                          )}
                          {/* Show assigned date for newly allotted orders */}
                          {!isReassigned && order.assignedDate && typeof order.assignedDate === 'number' && (
                            <div>
                              <span className="text-muted-foreground">Allotted on:</span>{' '}
                              <span className="font-medium">
                                {format(new Date(order.assignedDate), 'dd MMM yyyy, hh:mm a')}
                              </span>
                            </div>
                          )}
                          {/* Show reassigned date for reassigned orders */}
                          {isReassigned && order.reassignedDate && typeof order.reassignedDate === 'number' && (
                            <div>
                              <span className="text-muted-foreground">Reassigned on:</span>{' '}
                              <span className="font-medium">
                                {format(new Date(order.reassignedDate), 'dd MMM yyyy, hh:mm a')}
                              </span>
                            </div>
                          )}
                          {/* Show previous stitched ID only for reassigned orders */}
                          {isReassigned && order.stitchedId && (
                            <div>
                              <span className="text-muted-foreground">Previous Stitched ID:</span>{' '}
                              <span className="font-medium">{order.stitchedId}</span>
                            </div>
                          )}
                        </div>

                        {/* Show history summary if available */}
                        {order.history && order.history.length > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                            <span className="font-medium">History:</span> {order.history.length} actions recorded
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

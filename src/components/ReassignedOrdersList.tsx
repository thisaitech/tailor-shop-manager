import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowsClockwise, ArrowLeft } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { OrderAllotment } from '@/lib/types';

interface ReassignedOrdersListProps {
  orders: OrderAllotment[];
  onBack: () => void;
}

export function ReassignedOrdersList({ orders, onBack }: ReassignedOrdersListProps) {
  // Filter reassigned orders - only those awaiting response (status = 'reassigned')
  // Once status changes to 'in_progress', 'stitched', etc., they are removed from this list
  const reassignedOrders = orders.filter(o =>
    o.reassigned === true &&
    o.stitchedId &&
    o.status === 'reassigned'
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Reassigned Orders</h1>
          <p className="text-sm text-muted-foreground">{reassignedOrders.length} orders</p>
        </div>
      </div>

      {/* Reassigned Orders List */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center gap-2">
            <ArrowsClockwise size={24} className="text-orange-600" weight="duotone" />
            <CardTitle>All Reassigned Orders</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {reassignedOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ArrowsClockwise size={48} className="mx-auto mb-3 opacity-30" />
              <p>No reassigned orders</p>
            </div>
          ) : (
            <div className="divide-y">
              {reassignedOrders.map((order) => {
                // Determine the current status after reassignment
                const currentStatus = order.status === 'reassigned' ? 'Awaiting Acceptance' :
                  order.status === 'in_progress' ? 'In Progress' :
                  order.status === 'stitched' ? 'Job Completed' :
                  order.status === 'rejected' ? 'Rejected Again' :
                  order.status || 'Unknown';

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
                          {order.reassignedDate && typeof order.reassignedDate === 'number' && (
                            <div>
                              <span className="text-muted-foreground">Reassigned on:</span>{' '}
                              <span className="font-medium">
                                {format(new Date(order.reassignedDate), 'dd MMM yyyy, hh:mm a')}
                              </span>
                            </div>
                          )}
                          {order.stitchedId && (
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

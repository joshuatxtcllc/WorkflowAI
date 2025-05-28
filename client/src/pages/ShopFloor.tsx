import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Scissors, Layers, Timer, CheckCircle, Package, 
  Search, Clock, User, Phone, DollarSign 
} from 'lucide-react';
import type { OrderWithDetails } from '@shared/schema';

const SHOP_ACTIONS = [
  { status: 'FRAME_CUT', label: 'Frame Cut Done', icon: Scissors, color: 'bg-purple-500' },
  { status: 'MAT_CUT', label: 'Mat Cut Done', icon: Layers, color: 'bg-indigo-500' },
  { status: 'PREPPED', label: 'Prep Complete', icon: Timer, color: 'bg-orange-500' },
  { status: 'COMPLETED', label: 'Assembly Done', icon: CheckCircle, color: 'bg-green-500' },
];

export default function ShopFloor() {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders = [] } = useQuery<OrderWithDetails[]>({
    queryKey: ['/api/orders'],
  });

  const updateStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      return apiRequest(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        body: { status },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Status Updated",
        description: "Order status updated successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update order status.",
        variant: "destructive",
      });
    },
  });

  // Filter active orders (not picked up)
  const activeOrders = orders.filter(order => 
    order.status !== 'PICKED_UP' && 
    (searchTerm === '' || 
     order.trackingId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     order.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Group orders by current status
  const ordersByStatus = activeOrders.reduce((acc, order) => {
    const status = order.status || 'OTHER';
    if (!acc[status]) acc[status] = [];
    acc[status].push(order);
    return acc;
  }, {} as Record<string, OrderWithDetails[]>);

  const handleStatusUpdate = (orderId: string, newStatus: string) => {
    updateStatus.mutate({ orderId, status: newStatus });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Shop Floor</h1>
          <p className="text-muted-foreground">Quick production updates</p>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order # or customer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-lg h-12"
              />
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 gap-4">
          {SHOP_ACTIONS.map((action) => {
            const eligibleOrders = activeOrders.filter(order => {
              // Define which orders are eligible for each action
              switch (action.status) {
                case 'FRAME_CUT':
                  return order.status === 'MATERIALS_ARRIVED';
                case 'MAT_CUT':
                  return order.status === 'FRAME_CUT';
                case 'PREPPED':
                  return order.status === 'MAT_CUT';
                case 'COMPLETED':
                  return order.status === 'PREPPED';
                default:
                  return false;
              }
            });

            const Icon = action.icon;

            return (
              <Card key={action.status} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader className="text-center pb-2">
                  <div className={`w-16 h-16 rounded-full ${action.color} flex items-center justify-center mx-auto mb-2`}>
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-lg">{action.label}</CardTitle>
                  <Badge variant="secondary">{eligibleOrders.length} orders</Badge>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        {/* Order List by Status */}
        <div className="space-y-6">
          {['MATERIALS_ARRIVED', 'FRAME_CUT', 'MAT_CUT', 'PREPPED', 'COMPLETED'].map((status) => {
            const statusOrders = ordersByStatus[status] || [];
            if (statusOrders.length === 0) return null;

            const statusLabels: Record<string, string> = {
              'MATERIALS_ARRIVED': 'Ready for Frame Cutting',
              'FRAME_CUT': 'Ready for Mat Cutting',
              'MAT_CUT': 'Ready for Prep',
              'PREPPED': 'Ready for Assembly',
              'COMPLETED': 'Ready for Pickup'
            };

            return (
              <Card key={status}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{statusLabels[status]}</span>
                    <Badge variant="outline">{statusOrders.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {statusOrders.map((order) => (
                      <Card key={order.id} className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="font-medium text-lg">#{order.trackingId}</div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <User className="h-4 w-4" />
                              {order.customer?.name}
                            </div>
                            {order.customer?.phone && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="h-4 w-4" />
                                {order.customer.phone}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            {order.totalPrice && (
                              <div className="flex items-center gap-1 text-sm font-medium">
                                <DollarSign className="h-4 w-4" />
                                ${order.totalPrice.toFixed(2)}
                              </div>
                            )}
                            {order.estimatedHours && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                {order.estimatedHours}h
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mb-3">
                          <p className="text-sm text-muted-foreground">{order.description}</p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          {status === 'MATERIALS_ARRIVED' && (
                            <Button 
                              onClick={() => handleStatusUpdate(order.id, 'FRAME_CUT')}
                              disabled={updateStatus.isPending}
                              className="flex-1"
                            >
                              <Scissors className="h-4 w-4 mr-2" />
                              Frame Cut Done
                            </Button>
                          )}
                          {status === 'FRAME_CUT' && (
                            <Button 
                              onClick={() => handleStatusUpdate(order.id, 'MAT_CUT')}
                              disabled={updateStatus.isPending}
                              className="flex-1"
                            >
                              <Layers className="h-4 w-4 mr-2" />
                              Mat Cut Done
                            </Button>
                          )}
                          {status === 'MAT_CUT' && (
                            <Button 
                              onClick={() => handleStatusUpdate(order.id, 'PREPPED')}
                              disabled={updateStatus.isPending}
                              className="flex-1"
                            >
                              <Timer className="h-4 w-4 mr-2" />
                              Prep Complete
                            </Button>
                          )}
                          {status === 'PREPPED' && (
                            <Button 
                              onClick={() => handleStatusUpdate(order.id, 'COMPLETED')}
                              disabled={updateStatus.isPending}
                              className="flex-1"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Assembly Done
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {activeOrders.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Active Orders</h3>
              <p className="text-muted-foreground">All orders are completed or picked up!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
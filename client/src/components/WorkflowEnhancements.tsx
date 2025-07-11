import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { apiRequest } from '../lib/queryClient';
import { useToast } from '../hooks/use-toast';
import { ChevronRight, Package, Truck, CheckCircle, Scissors, Layers, Timer } from 'lucide-react';
import type { OrderWithDetails } from '@shared/schema';

interface WorkflowEnhancementsProps {
  orders: OrderWithDetails[];
}

const QUICK_ACTIONS = [
  {
    label: 'Materials Arrived',
    from: 'MATERIALS_ORDERED',
    to: 'MATERIALS_ARRIVED',
    icon: Truck,
    color: 'bg-blue-500'
  },
  {
    label: 'Frame Cut Complete',
    from: 'MATERIALS_ARRIVED',
    to: 'FRAME_CUT',
    icon: Scissors,
    color: 'bg-purple-500'
  },
  {
    label: 'Mat Cut Complete',
    from: 'FRAME_CUT',
    to: 'MAT_CUT',
    icon: Layers,
    color: 'bg-indigo-500'
  },
  {
    label: 'Prep Complete',
    from: 'MAT_CUT',
    to: 'PREPPED',
    icon: Timer,
    color: 'bg-orange-500'
  },
  {
    label: 'Assembly Complete',
    from: 'PREPPED',
    to: 'COMPLETED',
    icon: CheckCircle,
    color: 'bg-green-500'
  }
];

export default function WorkflowEnhancements({ orders }: WorkflowEnhancementsProps) {
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const batchUpdateStatus = useMutation({
    mutationFn: async ({ orderIds, status }: { orderIds: string[]; status: string }) => {
      return apiRequest('/api/orders/batch-status', {
        method: 'PATCH',
        body: { orderIds, status },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      setSelectedOrders([]);
      setBulkStatus('');
      toast({
        title: "Batch Update Complete",
        description: `Updated ${variables.orderIds.length} orders successfully.`,
      });
    },
    onError: (error) => {
      console.error('Failed to batch update orders:', error);
      toast({
        title: "Batch Update Failed",
        description: "Failed to update orders. Please try again.",
        variant: "destructive",
      });
    },
  });

  const quickAction = useMutation({
    mutationFn: async ({ orderIds, status }: { orderIds: string[]; status: string }) => {
      return apiRequest('/api/orders/batch-status', {
        method: 'PATCH',
        body: { orderIds, status },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Quick Action Complete",
        description: `Updated ${variables.orderIds.length} orders successfully.`,
      });
    },
    onError: (error) => {
      console.error('Quick action failed:', error);
      toast({
        title: "Action Failed",
        description: "Failed to update orders. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const selectAllInStatus = (status: string) => {
    const statusOrders = orders.filter(order => order.status === status);
    const statusOrderIds = statusOrders.map(order => order.id);
    setSelectedOrders(prev => [...new Set([...prev, ...statusOrderIds])]);
  };

  const handleQuickAction = (action: typeof QUICK_ACTIONS[0]) => {
    const eligibleOrders = orders.filter(order => order.status === action.from);
    if (eligibleOrders.length === 0) {
      toast({
        title: "No Eligible Orders",
        description: `No orders found in ${action.from.replace('_', ' ')} status.`,
        variant: "destructive",
      });
      return;
    }

    quickAction.mutate({
      orderIds: eligibleOrders.map(order => order.id),
      status: action.to
    });
  };

  const handleBulkUpdate = () => {
    if (selectedOrders.length === 0 || !bulkStatus) {
      toast({
        title: "Selection Required",
        description: "Please select orders and choose a status.",
        variant: "destructive",
      });
      return;
    }

    batchUpdateStatus.mutate({
      orderIds: selectedOrders,
      status: bulkStatus
    });
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChevronRight className="h-5 w-5" />
            Quick Workflow Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {QUICK_ACTIONS.map((action) => {
              const eligibleCount = orders.filter(order => order.status === action.from).length;
              const Icon = action.icon;
              
              return (
                <Button
                  key={action.label}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  onClick={() => handleQuickAction(action)}
                  disabled={eligibleCount === 0 || quickAction.isPending}
                >
                  <div className={`p-2 rounded-full ${action.color}`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-sm">{action.label}</div>
                    <Badge variant="secondary" className="text-xs">
                      {eligibleCount} orders
                    </Badge>
                  </div>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Operations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Bulk Operations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Shortcuts */}
          <div className="flex flex-wrap gap-2">
            {['ORDER_PROCESSED', 'MATERIALS_ORDERED', 'MATERIALS_ARRIVED', 'FRAME_CUT', 'MAT_CUT', 'PREPPED', 'COMPLETED'].map((status) => {
              const count = orders.filter(order => order.status === status).length;
              return (
                <Button
                  key={status}
                  variant="ghost"
                  size="sm"
                  onClick={() => selectAllInStatus(status)}
                  disabled={count === 0}
                >
                  Select {status.replace('_', ' ')} ({count})
                </Button>
              );
            })}
          </div>

          {/* Selected Orders */}
          {selectedOrders.length > 0 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selectedOrders.length} orders selected
                </span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedOrders([])}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          {/* Bulk Status Update */}
          <div className="flex gap-3">
            <Select value={bulkStatus} onValueChange={setBulkStatus}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ORDER_PROCESSED">Order Processed</SelectItem>
                <SelectItem value="MATERIALS_ORDERED">Materials Ordered</SelectItem>
                <SelectItem value="MATERIALS_ARRIVED">Materials Arrived</SelectItem>
                <SelectItem value="FRAME_CUT">Frame Cut</SelectItem>
                <SelectItem value="MAT_CUT">Mat Cut</SelectItem>
                <SelectItem value="PREPPED">Prepped</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="DELAYED">Delayed</SelectItem>
                <SelectItem value="PICKED_UP">Picked Up</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={handleBulkUpdate}
              disabled={selectedOrders.length === 0 || !bulkStatus || batchUpdateStatus.isPending}
            >
              Update {selectedOrders.length} Orders
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Order Selection List */}
      {orders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Orders for Bulk Operations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {orders.map((order) => (
                <div key={order.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                  <Checkbox
                    checked={selectedOrders.includes(order.id)}
                    onCheckedChange={() => toggleOrderSelection(order.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">#{order.trackingId}</span>
                      <Badge variant="outline" className="text-xs">
                        {order.status?.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {order.customer?.name} - {order.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
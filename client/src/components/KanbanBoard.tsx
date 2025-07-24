import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import OrderCard from './OrderCard';
// Type the order data based on the database schema
interface OrderData {
  id: string;
  trackingId: string;
  customerId: string;
  assignedToId?: string;
  status: string;
  description?: string;
  orderType: string;
  priority: string;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

const STATUSES = [
  { id: 'ORDER_PROCESSED', name: 'Order Processed', color: 'bg-blue-500' },
  { id: 'MATERIALS_ORDERED', name: 'Materials Ordered', color: 'bg-yellow-500' },
  { id: 'MATERIALS_ARRIVED', name: 'Materials Arrived', color: 'bg-orange-500' },
  { id: 'FRAME_CUT', name: 'Frame Cut', color: 'bg-purple-500' },
  { id: 'MAT_CUT', name: 'Mat Cut', color: 'bg-pink-500' },
  { id: 'PREPPED', name: 'Prepped', color: 'bg-indigo-500' },
  { id: 'COMPLETED', name: 'Completed', color: 'bg-green-500' },
  { id: 'PICKED_UP', name: 'Picked Up', color: 'bg-gray-500' },
];

export default function KanbanBoard() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Direct fetch function
  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log("Fetching orders directly...");
      
      const response = await fetch('/api/orders', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log("Response status:", response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Orders received:", data.length);
      setOrders(data);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  };

  // Load orders on mount and set up interval
  React.useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchOrders();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const getOrdersByStatus = (status: string) => {
    return orders.filter((order: OrderData) => order.status === status) || [];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-jade-400 animate-spin mx-auto mb-2" />
          <p className="text-gray-400">Loading your frame shop...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-auto overflow-y-auto space-y-6 p-4">
      {/* Controls */}
      <div className="flex items-center justify-between sticky top-0 bg-gray-950 z-10 pb-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Production Board</h2>
          <p className="text-gray-400">Track your custom frame orders through each stage</p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            className="text-jade-400 border-jade-500/50 hover:bg-jade-500/10"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button className="bg-jade-600 hover:bg-jade-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            New Order
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 min-w-max pb-6">
        {STATUSES.map((status) => {
          const statusOrders = getOrdersByStatus(status.id);
          
          return (
            <motion.div
              key={status.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-80 flex-shrink-0"
            >
              <Card className="bg-gray-800 border-gray-700 h-full min-h-[500px]">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${status.color}`}></div>
                      <span className="text-white font-medium">{status.name}</span>
                    </div>
                    <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded-full text-xs">
                      {statusOrders.length}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 overflow-y-auto max-h-[600px] pr-2">
                  {statusOrders.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">No orders in this stage</p>
                    </div>
                  ) : (
                    statusOrders.map((order: any) => (
                      <OrderCard key={order.id} order={order} />
                    ))
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Debug Info */}
      <div className="bg-gray-800 border border-gray-700 rounded p-4 mb-4">
        <h3 className="text-white font-bold mb-2">🔍 TROUBLESHOOTING DATA FLOW:</h3>
        <p className="text-green-400">✓ Total Orders Loaded: {orders.length}</p>
        <p className="text-blue-400">✓ Order Processed: {getOrdersByStatus('ORDER_PROCESSED').length}</p>
        <p className="text-yellow-400">✓ Materials Arrived: {getOrdersByStatus('MATERIALS_ARRIVED').length}</p>
        <p className="text-orange-400">✓ Frame Cut: {getOrdersByStatus('FRAME_CUT').length}</p>
        <p className="text-gray-400">✓ Picked Up: {getOrdersByStatus('PICKED_UP').length}</p>
        {orders.length > 0 && (
          <div className="mt-2 p-2 bg-gray-700 rounded">
            <p className="text-white text-sm">Sample Order Data:</p>
            <pre className="text-xs text-green-300">{JSON.stringify(orders[0], null, 2)}</pre>
          </div>
        )}
        {orders.length === 0 && !isLoading && (
          <div className="mt-2 p-2 bg-red-900 border border-red-600 rounded">
            <p className="text-red-400">❌ NO DATA RECEIVED FROM API</p>
            {error && <p className="text-red-300 text-sm">Error: {error.message}</p>}
            <p className="text-gray-400 text-xs">Check browser console for network errors</p>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-jade-400">{orders.length}</div>
              <div className="text-sm text-gray-400">Total Orders</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {getOrdersByStatus('ORDER_PROCESSED').length}
              </div>
              <div className="text-sm text-gray-400">New Orders</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {orders.filter((o: any) => ['FRAME_CUT', 'MAT_CUT', 'PREPPED'].includes(o.status)).length}
              </div>
              <div className="text-sm text-gray-400">In Production</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {getOrdersByStatus('COMPLETED').length}
              </div>
              <div className="text-sm text-gray-400">Completed</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
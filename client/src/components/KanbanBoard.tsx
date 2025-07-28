
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, RefreshCw, Sparkles, Zap, Clock, CheckCircle2, Package, Scissors, Paintbrush, Wrench, Truck, Star } from 'lucide-react';
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
  { 
    id: 'ORDER_PROCESSED', 
    name: 'Order Processed', 
    color: 'from-jade-500 to-jade-600',
    bgColor: 'bg-gradient-to-br from-jade-500/10 to-jade-600/5',
    borderColor: 'border-jade-500/30',
    icon: Sparkles,
    description: 'Fresh orders ready to start'
  },
  { 
    id: 'MATERIALS_ORDERED', 
    name: 'Materials Ordered', 
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-gradient-to-br from-blue-500/10 to-blue-600/5',
    borderColor: 'border-blue-500/30',
    icon: Package,
    description: 'Awaiting material delivery'
  },
  { 
    id: 'MATERIALS_ARRIVED', 
    name: 'Materials Arrived', 
    color: 'from-emerald-500 to-emerald-600',
    bgColor: 'bg-gradient-to-br from-emerald-500/10 to-emerald-600/5',
    borderColor: 'border-emerald-500/30',
    icon: Truck,
    description: 'Ready for production'
  },
  { 
    id: 'FRAME_CUT', 
    name: 'Frame Cut', 
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-gradient-to-br from-purple-500/10 to-purple-600/5',
    borderColor: 'border-purple-500/30',
    icon: Scissors,
    description: 'Precision frame cutting'
  },
  { 
    id: 'MAT_CUT', 
    name: 'Mat Cut', 
    color: 'from-pink-500 to-pink-600',
    bgColor: 'bg-gradient-to-br from-pink-500/10 to-pink-600/5',
    borderColor: 'border-pink-500/30',
    icon: Paintbrush,
    description: 'Custom mat preparation'
  },
  { 
    id: 'PREPPED', 
    name: 'Assembly Ready', 
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-gradient-to-br from-orange-500/10 to-orange-600/5',
    borderColor: 'border-orange-500/30',
    icon: Wrench,
    description: 'Ready for final assembly'
  },
  { 
    id: 'COMPLETED', 
    name: 'Completed', 
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-gradient-to-br from-green-500/10 to-green-600/5',
    borderColor: 'border-green-500/30',
    icon: CheckCircle2,
    description: 'Masterpiece complete'
  },
  { 
    id: 'PICKED_UP', 
    name: 'Delivered', 
    color: 'from-gray-500 to-gray-600',
    bgColor: 'bg-gradient-to-br from-gray-500/10 to-gray-600/5',
    borderColor: 'border-gray-500/30',
    icon: Star,
    description: 'Happy customer!'
  },
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
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const getOrdersByStatus = (status: string) => {
    return orders.filter((order: OrderData) => order.status === status) || [];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="mx-auto w-16 h-16 rounded-full bg-gradient-to-r from-jade-400 to-jade-600 p-4"
          >
            <Sparkles className="w-8 h-8 text-white" />
          </motion.div>
          <div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-jade-400 to-jade-600 bg-clip-text text-transparent">
              Loading Your Studio
            </h3>
            <p className="text-gray-400 mt-2">Preparing your custom frame workshop...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  const activeOrders = orders.filter(o => !['PICKED_UP', 'MYSTERY_UNCLAIMED'].includes(o.status));
  const completedToday = orders.filter(o => o.status === 'COMPLETED').length;
  const inProgress = orders.filter(o => ['FRAME_CUT', 'MAT_CUT', 'PREPPED'].includes(o.status)).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      {/* Animated Background Pattern */}
      <div className="fixed inset-0 opacity-30 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-jade-500/5 to-transparent" />
        <motion.div 
          animate={{ 
            backgroundPosition: ['0% 0%', '100% 100%'],
          }}
          transition={{ 
            duration: 20, 
            repeat: Infinity, 
            repeatType: 'reverse',
            ease: 'linear'
          }}
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 25% 25%, rgba(0, 166, 147, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 75% 75%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)
            `,
            backgroundSize: '200% 200%'
          }}
        />
      </div>

      <div className="relative z-10 p-4 space-y-8">
        {/* Hero Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6"
        >
          <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-jade-500/20 to-jade-600/20 backdrop-blur-xl rounded-full px-6 py-3 border border-jade-500/30">
            <Sparkles className="w-5 h-5 text-jade-400" />
            <span className="text-jade-400 font-medium">Live Production Board</span>
          </div>
          
          <div>
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent mb-4">
              Jay's Frames Studio
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Crafting custom masterpieces with precision and artistry
            </p>
          </div>

          {/* Stats Row */}
          <div className="flex flex-wrap justify-center gap-6 mt-8">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="bg-gradient-to-r from-jade-500/10 to-jade-600/10 backdrop-blur-xl rounded-2xl p-6 border border-jade-500/30 min-w-[140px]"
            >
              <div className="text-3xl font-bold text-jade-400">{activeOrders.length}</div>
              <div className="text-sm text-gray-400">Active Orders</div>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 backdrop-blur-xl rounded-2xl p-6 border border-emerald-500/30 min-w-[140px]"
            >
              <div className="text-3xl font-bold text-emerald-400">{completedToday}</div>
              <div className="text-sm text-gray-400">Completed</div>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 backdrop-blur-xl rounded-2xl p-6 border border-orange-500/30 min-w-[140px]"
            >
              <div className="text-3xl font-bold text-orange-400">{inProgress}</div>
              <div className="text-sm text-gray-400">In Production</div>
            </motion.div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-gradient-to-r from-jade-500 to-jade-600 hover:from-jade-400 hover:to-jade-500 text-black font-semibold px-8 py-3 rounded-full transition-all duration-300 shadow-lg hover:shadow-jade-500/25"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Syncing...' : 'Refresh'}
            </Button>
            <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-semibold px-8 py-3 rounded-full transition-all duration-300 shadow-lg hover:shadow-blue-500/25">
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Button>
          </div>
        </motion.div>

        {/* Kanban Board */}
        <div className="kanban-scroll-container overflow-x-auto pb-8">
          <div className="flex gap-6 min-w-max px-4">
            <AnimatePresence>
              {STATUSES.map((status, index) => {
                const statusOrders = getOrdersByStatus(status.id);
                const IconComponent = status.icon;
                
                return (
                  <motion.div
                    key={status.id}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ 
                      duration: 0.6, 
                      delay: index * 0.1,
                      type: "spring",
                      stiffness: 100
                    }}
                    className="kanban-column flex-shrink-0 w-80"
                  >
                    <div className={`${status.bgColor} backdrop-blur-xl rounded-3xl border ${status.borderColor} overflow-hidden shadow-2xl`}>
                      {/* Column Header */}
                      <div className="relative p-6 pb-4">
                        <div className={`absolute inset-0 bg-gradient-to-r ${status.color} opacity-10`} />
                        <div className="relative">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className={`p-2 rounded-xl bg-gradient-to-r ${status.color} shadow-lg`}>
                                <IconComponent className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <h3 className="font-bold text-white text-lg">{status.name}</h3>
                                <p className="text-xs text-gray-400">{status.description}</p>
                              </div>
                            </div>
                            <motion.div 
                              whileHover={{ scale: 1.1 }}
                              className={`px-3 py-1 rounded-full bg-gradient-to-r ${status.color} text-white font-semibold text-sm shadow-lg`}
                            >
                              {statusOrders.length}
                            </motion.div>
                          </div>
                        </div>
                      </div>

                      {/* Column Content */}
                      <div className="px-4 pb-4 space-y-3 max-h-[600px] overflow-y-auto">
                        <AnimatePresence>
                          {statusOrders.length === 0 ? (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="text-center py-12"
                            >
                              <div className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-r ${status.color} opacity-20 flex items-center justify-center mb-4`}>
                                <IconComponent className="w-8 h-8 text-gray-500" />
                              </div>
                              <p className="text-gray-500 text-sm font-medium">No orders in this stage</p>
                              <p className="text-gray-600 text-xs mt-1">Ready for new work</p>
                            </motion.div>
                          ) : (
                            statusOrders.map((order: any, orderIndex: number) => (
                              <motion.div
                                key={order.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ 
                                  duration: 0.3, 
                                  delay: orderIndex * 0.05 
                                }}
                                whileHover={{ 
                                  scale: 1.02,
                                  y: -4
                                }}
                                className="transform transition-all duration-200"
                              >
                                <OrderCard order={order} />
                              </motion.div>
                            ))
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Enhanced Bottom Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12"
        >
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 shadow-2xl">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-xl bg-gradient-to-r from-jade-500 to-jade-600">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-3xl font-bold text-jade-400">{orders.length}</div>
                <div className="text-sm text-gray-400">Total Orders</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 shadow-2xl">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-400">
                  {getOrdersByStatus('ORDER_PROCESSED').length}
                </div>
                <div className="text-sm text-gray-400">New Orders</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 shadow-2xl">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-3xl font-bold text-orange-400">{inProgress}</div>
                <div className="text-sm text-gray-400">In Production</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 shadow-2xl">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-3xl font-bold text-green-400">
                  {getOrdersByStatus('COMPLETED').length}
                </div>
                <div className="text-sm text-gray-400">Completed</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

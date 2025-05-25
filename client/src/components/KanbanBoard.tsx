import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { motion, AnimatePresence } from 'framer-motion';
import { apiRequest } from '@/lib/queryClient';
import { useWebSocket } from '@/hooks/useWebSocket';
import OrderCard from './OrderCard';
import { KANBAN_COLUMNS } from '@/lib/constants';
import type { OrderWithDetails } from '@shared/schema';
import { Package, Truck, CheckCircle, Scissors, Layers, Timer, AlertTriangle, User } from 'lucide-react';

const columnIcons = {
  'ORDER_PROCESSED': Package,
  'MATERIALS_ORDERED': Truck,
  'MATERIALS_ARRIVED': CheckCircle,
  'FRAME_CUT': Scissors,
  'MAT_CUT': Layers,
  'PREPPED': Timer,
  'COMPLETED': CheckCircle,
  'DELAYED': AlertTriangle,
  'PICKED_UP': User,
};

interface KanbanColumnProps {
  title: string;
  status: string;
  orders: OrderWithDetails[];
  onDropOrder: (orderId: string, newStatus: string) => void;
}

function KanbanColumn({ title, status, orders, onDropOrder }: KanbanColumnProps) {
  const [{ isOver }, drop] = useDrop({
    accept: 'order',
    drop: (item: { id: string }) => {
      onDropOrder(item.id, status);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const Icon = columnIcons[status as keyof typeof columnIcons] || Package;
  const totalHours = orders.reduce((sum, order) => sum + order.estimatedHours, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-400';
      case 'DELAYED': return 'text-red-400';
      case 'PICKED_UP': return 'text-blue-400';
      default: return 'text-jade-400';
    }
  };

  return (
    <div
      ref={drop}
      className={`flex-shrink-0 w-80 bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800 transition-all duration-200 ${
        isOver ? 'ring-2 ring-jade-500/50 bg-jade-500/5' : ''
      }`}
    >
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${getStatusColor(status)}`} />
            <h3 className="font-semibold text-white">{title}</h3>
          </div>
          <span className="bg-jade-500/20 text-jade-300 px-2 py-1 rounded-full text-xs font-semibold">
            {orders.length}
          </span>
        </div>
        <div className="text-xs text-gray-500 flex items-center gap-1">
          <Timer className="w-3 h-3" />
          <span>{totalHours.toFixed(1)}h total</span>
        </div>
      </div>
      
      <div className="p-4 space-y-3 min-h-[300px]">
        <AnimatePresence>
          {orders.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No orders in this stage</p>
            </div>
          ) : (
            orders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                layout
              >
                <OrderCard order={order} />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function KanbanBoard() {
  const queryClient = useQueryClient();
  const { sendMessage, lastMessage } = useWebSocket();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const { data: orders = [], isLoading } = useQuery<OrderWithDetails[]>({
    queryKey: ["/api/orders"],
    refetchInterval: 30000,
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const response = await apiRequest('PATCH', `/api/orders/${orderId}/status`, { status });
      return response.json();
    },
    onSuccess: (updatedOrder) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/workload"] });
      
      // Send WebSocket update
      sendMessage({
        type: 'order-status-update',
        data: updatedOrder
      });
    },
  });

  const handleDropOrder = (orderId: string, newStatus: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order && order.status !== newStatus) {
      updateOrderStatusMutation.mutate({ orderId, status: newStatus });
    }
  };

  // Only update slider when not dragging
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!isDragging) {
      const container = e.currentTarget;
      const maxScroll = container.scrollWidth - container.clientWidth;
      const scrollPercent = maxScroll > 0 ? (container.scrollLeft / maxScroll) * 100 : 0;
      setScrollPosition(Math.round(scrollPercent));
    }
  }, [isDragging]);

  // Handle slider input with immediate response
  const handleSliderInput = useCallback((value: number) => {
    setScrollPosition(value);
    if (scrollContainerRef.current) {
      const maxScroll = scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth;
      const newScrollLeft = (value / 100) * maxScroll;
      scrollContainerRef.current.scrollLeft = newScrollLeft;
    }
  }, []);

  // Handle slider drag start/end
  const handleSliderMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleSliderMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle WebSocket messages
  if (lastMessage?.type === 'order-updated') {
    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-jade-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading orders...</p>
        </div>
      </div>
    );
  }

  // Group orders by status
  const ordersByStatus = orders.reduce((acc, order) => {
    if (!acc[order.status]) {
      acc[order.status] = [];
    }
    acc[order.status].push(order);
    return acc;
  }, {} as Record<string, OrderWithDetails[]>);

  return (
    <DndProvider backend={HTML5Backend}>
      <main className="relative z-10 p-6">
        <div className="max-w-[1920px] mx-auto">
          <div 
            ref={scrollContainerRef}
            className="flex gap-6 overflow-x-auto pb-6 min-h-[calc(100vh-200px)] scroll-smooth"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#4ade80 #1f2937'
            }}
            onScroll={handleScroll}
          >
            {KANBAN_COLUMNS.map((column) => (
              <KanbanColumn
                key={column.status}
                title={column.title}
                status={column.status}
                orders={ordersByStatus[column.status] || []}
                onDropOrder={handleDropOrder}
              />
            ))}
          </div>
        </div>
      </main>
      
      {/* Fixed horizontal navigation slider */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-800 rounded-lg px-6 py-3 shadow-lg min-w-[300px]">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-gray-400 text-xs">
              <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-jade-500/40 rotate-[-90deg]"></div>
              <span>Navigate Production Stages</span>
              <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-jade-500/40 rotate-90"></div>
            </div>
            <div className="w-full flex items-center gap-3">
              <span className="text-xs text-gray-500">Start</span>
              <div className="flex-1 relative">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={scrollPosition}
                  onInput={(e) => handleSliderInput(Number((e.target as HTMLInputElement).value))}
                  onMouseDown={handleSliderMouseDown}
                  onMouseUp={handleSliderMouseUp}
                  onTouchStart={handleSliderMouseDown}
                  onTouchEnd={handleSliderMouseUp}
                  className="w-full navigation-slider cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #10b981 0%, #10b981 ${scrollPosition}%, #374151 ${scrollPosition}%, #374151 100%)`
                  }}
                />

              </div>
              <span className="text-xs text-gray-500">End</span>
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  );
}

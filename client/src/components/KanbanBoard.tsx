import { useState, useRef, useCallback, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';

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
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'order',
    drop: (item: { id: string }) => {
      onDropOrder(item.id, status);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
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
    <motion.div
      ref={drop}
      className={`kanban-column flex-shrink-0 w-72 sm:w-80 glass-strong rounded-xl transition-all duration-300 shadow-glow ${
        isOver ? 'ring-2 ring-jade-500/50 bg-jade-500/5 scale-105 shadow-jade-500/20' : 'shadow-glow-hover hover:border-gray-600/50'
      }`}
      animate={{
        scale: isOver ? 1.02 : 1,
        borderColor: isOver ? '#10b981' : '#1f2937',
      }}
      transition={{ duration: 0.2 }}
    >
      <div className="p-3 sm:p-4 border-b border-gray-800">
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

      <div className="p-2 sm:p-3 space-y-2 sm:space-y-3 min-h-[300px] max-h-[calc(100vh-400px)] overflow-y-auto">
        <AnimatePresence>
          {orders.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No orders in this stage</p>
            </div>
          ) : (
            orders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ 
                  opacity: 1, 
                  y: 0, 
                  scale: 1,
                  transition: {
                    delay: index * 0.05,
                    duration: 0.3,
                    ease: "easeOut"
                  }
                }}
                exit={{ 
                  opacity: 0, 
                  y: -20, 
                  scale: 0.9,
                  transition: { duration: 0.2 }
                }}
                layout
                whileHover={{ scale: 1.02 }}
                className="relative"
              >
                {/* Drop zone visual feedback */}
                <motion.div
                  className="absolute inset-0 bg-jade-500/10 rounded-lg border-2 border-jade-500/30 opacity-0 pointer-events-none"
                  animate={{ 
                    opacity: isOver && canDrop ? 0.8 : 0,
                    scale: isOver && canDrop ? 1.02 : 1
                  }}
                  transition={{ duration: 0.2 }}
                />
                <OrderCard order={order} />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function KanbanBoard() {
  const queryClient = useQueryClient();
  const { sendMessage, lastMessage } = useWebSocket();
  const { toast } = useToast();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: orders = [], isLoading } = useQuery<OrderWithDetails[]>({
    queryKey: ["/api/orders"],
    refetchInterval: 30000,
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const response = await apiRequest('PATCH', `/api/orders/${orderId}/status`, { status });
      return response.json();
    },
    onSuccess: (updatedOrder, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/workload"] });

      // Find the order and show success notification
      const order = orders.find(o => o.id === variables.orderId);
      if (order) {
        const statusNames: Record<string, string> = {
          'ORDER_PROCESSED': 'Order Processed',
          'MATERIALS_ORDERED': 'Materials Ordered',
          'MATERIALS_ARRIVED': 'Materials Arrived',
          'FRAME_CUT': 'Frame Cut',
          'MAT_CUT': 'Mat Cut',
          'ASSEMBLY_COMPLETE': 'Assembly Complete',
          'READY_FOR_PICKUP': 'Ready for Pickup',
          'PICKED_UP': 'Picked Up'
        };

        toast({
          title: "Order Status Updated! 🎉",
          description: `${order.customer.name}'s order moved to: ${statusNames[variables.status] || variables.status}`,
          duration: 3000,
        });
      }

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

  // Auto-scroll functionality for drag operations
  const startAutoScroll = useCallback((direction: 'left' | 'right', speed: number = 2) => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
    }

    autoScrollIntervalRef.current = setInterval(() => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const scrollAmount = direction === 'left' ? -speed : speed;
        const newScrollLeft = container.scrollLeft + scrollAmount;

        // Check boundaries
        if (newScrollLeft >= 0 && newScrollLeft <= container.scrollWidth - container.clientWidth) {
          container.scrollLeft = newScrollLeft;

          // Update scroll position for slider
          const maxScroll = container.scrollWidth - container.clientWidth;
          const scrollPercent = maxScroll > 0 ? (newScrollLeft / maxScroll) * 100 : 0;
          setScrollPosition(Math.round(scrollPercent));
        }
      }
    }, 16); // ~60fps
  }, []);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
  }, []);

  // Handle mouse move for auto-scroll detection
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const rect = container.getBoundingClientRect();
    const scrollZone = 100; // Distance from edge to trigger scroll
    const mouseX = e.clientX - rect.left;

    // Check if mouse is near left or right edge
    if (mouseX < scrollZone && container.scrollLeft > 0) {
      // Near left edge, scroll left
      const speed = Math.max(2, (scrollZone - mouseX) / 10);
      startAutoScroll('left', speed);
    } else if (mouseX > rect.width - scrollZone && container.scrollLeft < container.scrollWidth - container.clientWidth) {
      // Near right edge, scroll right
      const speed = Math.max(2, (mouseX - (rect.width - scrollZone)) / 10);
      startAutoScroll('right', speed);
    } else {
      // Not near edges, stop scrolling
      stopAutoScroll();
    }
  }, [startAutoScroll, stopAutoScroll]);

  // Set up global drag event listeners
  useEffect(() => {
    const handleDragStart = (e: DragEvent) => {
      // Only handle if it's an order card being dragged
      if (e.target && (e.target as HTMLElement).closest('[data-draggable="order"]')) {
        document.addEventListener('mousemove', handleMouseMove);
      }
    };

    const handleDragEnd = (e: DragEvent) => {
      document.removeEventListener('mousemove', handleMouseMove);
      stopAutoScroll();
    };

    // Listen for native drag events on the document
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('drop', handleDragEnd);

    return () => {
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragend', handleDragEnd);
      document.removeEventListener('drop', handleDragEnd);
      document.removeEventListener('mousemove', handleMouseMove);
      stopAutoScroll();
    };
  }, [handleMouseMove, stopAutoScroll]);

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
      <main className="relative z-10 p-3 sm:p-6 h-full">
        <div className="w-full h-full">
          <div 
            ref={scrollContainerRef}
            className="kanban-scroll flex gap-3 sm:gap-6 overflow-x-auto pb-4 sm:pb-6 h-full scroll-smooth"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#10b981 #1f2937',
              minHeight: 'calc(100vh - 280px)'
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
      <div className="fixed bottom-3 sm:bottom-6 left-1/2 transform -translate-x-1/2 z-30">
        <div className="bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-lg px-3 sm:px-6 py-2 sm:py-3 shadow-xl min-w-[280px] sm:min-w-[300px]">
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
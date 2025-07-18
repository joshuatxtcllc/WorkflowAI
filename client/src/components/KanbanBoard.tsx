import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { motion, AnimatePresence } from 'framer-motion';
import { apiRequest } from '../lib/queryClient';
import { useWebSocket } from '../hooks/useWebSocket';
import OrderCard from './OrderCard';
import WorkloadAlertBanner from './WorkloadAlertBanner';
import { ConfettiBurst } from './ConfettiBurst';
import { useConfettiStore } from '../store/useConfettiStore';
import { useStatsStore } from '../store/useStatsStore';
import { KANBAN_COLUMNS } from '../lib/constants';
import type { OrderWithDetails } from '@shared/schema';
import { Package, Truck, CheckCircle, Scissors, Layers, Timer, AlertTriangle, User, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import AIAssistant from './AIAssistant';

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
  'MYSTERY_UNCLAIMED': AlertTriangle,
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
    drop: (item: { id: string }, monitor) => {
      try {
        if (monitor.didDrop()) {
          console.log('Drop already handled by nested target');
          return;
        }

        if (!item?.id) {
          console.warn('Invalid drop item:', item);
          return;
        }

        console.log('Dropping order:', item.id, 'into column:', status);
        onDropOrder(item.id, status);
      } catch (error) {
        console.error('Error in drop handler:', error);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const Icon = columnIcons[status as keyof typeof columnIcons] || Package;
  const totalHours = orders.reduce((sum, order) => sum + order.estimatedHours, 0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-400';
      case 'DELAYED': return 'text-red-400';
      case 'PICKED_UP': return 'text-blue-400';
      case 'MYSTERY_UNCLAIMED': return 'text-yellow-400';
      default: return 'text-jade-400';
    }
  };

  return (
    <motion.div
      ref={drop}
      className={`kanban-column flex-shrink-0 glass-strong rounded-xl transition-all duration-300 shadow-glow ${
        isOver ? 'ring-2 ring-jade-500/50 bg-jade-500/5 scale-105 shadow-jade-500/20' : 'shadow-glow-hover hover:border-gray-600/50'
      }`}
      style={{
        width: isMobile ? '240px' : '320px',
        minWidth: isMobile ? '240px' : '320px',
        maxWidth: isMobile ? '240px' : '320px',
        height: 'fit-content'
      }}
      animate={{
        scale: isOver ? 1.02 : 1,
        borderColor: isOver ? '#10b981' : '#1f2937',
      }}
      transition={{ duration: 0.2 }}
    >
      <div className={`${isMobile ? 'p-2' : 'p-3 sm:p-4'} border-b border-gray-800`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} ${getStatusColor(status)}`} />
            <h3 className={`font-semibold text-white ${isMobile ? 'text-sm' : 'text-base'}`}>
              {isMobile ? title.split(' ').slice(0, 2).join(' ') : title}
            </h3>
          </div>
          <span className={`bg-jade-500/20 text-jade-300 px-2 py-1 rounded-full font-semibold ${isMobile ? 'text-xs' : 'text-xs'}`}>
            {orders.length}
          </span>
        </div>
        <div className={`text-gray-500 flex items-center gap-1 ${isMobile ? 'text-xs' : 'text-xs'}`}>
          <Timer className={`${isMobile ? 'w-3 h-3' : 'w-3 h-3'}`} />
          <span>{totalHours.toFixed(1)}h total</span>
        </div>
      </div>

      <div className={`${isMobile ? 'p-2' : 'p-2 sm:p-3'} space-y-2 min-h-[200px] max-h-[calc(100vh-400px)] overflow-y-auto`}>
        <AnimatePresence>
          {orders.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <Package className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} mx-auto mb-2 opacity-50`} />
              <p className={`${isMobile ? 'text-xs' : 'text-sm'}`}>No orders</p>
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
                whileHover={{ scale: isMobile ? 1.01 : 1.02 }}
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
  console.log('KanbanBoard: Component mounting...');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { triggerConfetti, originX, originY, burst, reset } = useConfettiStore();
  const { incrementCompletion, getStats } = useStatsStore();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const columns = KANBAN_COLUMNS
  const [isMobile, setIsMobile] = useState(false);

  // Check URL parameters for filters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const priorityParam = urlParams.get('priority');
    const statusParam = urlParams.get('status');

    if (priorityParam) {
      setPriorityFilter(priorityParam);
    }
    if (statusParam) {
      if (statusParam === 'ready_for_work') {
        setStatusFilter('ready_for_work');
      } else {
        setStatusFilter(statusParam);
      }
    }
  }, []);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const { data: orders = [], isLoading, error, refetch } = useQuery<OrderWithDetails[]>({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      console.log('KanbanBoard: Fetching orders...');
      try {
        const response = await apiRequest("/api/orders", {
          method: 'GET'
        });
        console.log('KanbanBoard: Orders fetched successfully:', response?.length || 0);
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error('KanbanBoard: Error fetching orders:', error);
        throw error;
      }
    },
    refetchInterval: 30000,
    staleTime: 10000,
    gcTime: 10 * 60 * 1000,
    retry: (failureCount, error) => {
      console.log(`KanbanBoard: Retry attempt ${failureCount + 1}`, error);
      // Don't retry on 4xx errors (client errors)
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as any).status;
        if (status >= 400 && status < 500) {
          return false;
        }
      }
      return failureCount < 3; // Increased retry count
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: true,
    networkMode: 'online',
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      try {
        const response = await apiRequest(`/api/orders/${orderId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        });
        return response;
      } catch (error) {
        console.error('Drop status update failed:', error);
        throw error;
      }
    },
    onMutate: async ({ orderId, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/orders"] });

      // Snapshot previous value
      const previousOrders = queryClient.getQueryData(["/api/orders"]);

      // Optimistically update
      queryClient.setQueryData(["/api/orders"], (old: OrderWithDetails[] | undefined) => {
        if (!old) return old;
        return old.map(order => 
          order.id === orderId ? { ...order, status } : order
        );
      });

      return { previousOrders, orderId };
    },
    onSuccess: (updatedOrder, variables) => {
      // Update the specific order in cache without full refetch
      queryClient.setQueryData(["/api/orders"], (oldData: OrderWithDetails[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(order => 
          order.id === variables.orderId 
            ? { ...order, status: variables.status, updatedAt: new Date().toISOString() }
            : order
        );
      });

      // Only invalidate analytics, not the main orders query
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
          'PREPPED': 'Assembly Complete',
          'COMPLETED': 'Completed',
          'PICKED_UP': 'Picked Up'
        };

        // Trigger confetti for completed orders
        if (variables.status === 'COMPLETED' || variables.status === 'PICKED_UP') {
          incrementCompletion();
          const stats = getStats();

          burst(75, 40);
          setTimeout(() => burst(25, 60), 500);
          setTimeout(() => burst(85, 30), 1000);

          const completionMessages = [
            "Outstanding craftsmanship!",
            "Another masterpiece complete!",
            "Excellent work team!",
            "Beautiful frame ready for pickup!",
            "Quality work delivered!"
          ];

          const randomMessage = completionMessages[Math.floor(Math.random() * completionMessages.length)];
          const performanceSummary = `${randomMessage} Daily: ${stats.daily} | Total: ${stats.total} | Streak: ${stats.streak} days`;

          toast({
            title: variables.status === 'PICKED_UP' ? "🎉 Order Picked Up! 🎉" : "🎉 Order Completed! 🎉",
            description: `${order.customer?.name || 'Customer'}'s order is ${variables.status === 'PICKED_UP' ? 'picked up' : 'ready'}! ${performanceSummary}`,
            duration: 5000,
          });

          if (stats.daily === 10 || stats.total % 50 === 0 || stats.streak === 7) {
            setTimeout(() => {
              toast({
                title: "🏆 Milestone Achievement! 🏆",
                description: stats.daily === 10 ? "10 orders completed today!" : 
                           stats.total % 50 === 0 ? `${stats.total} total completions!` :
                           "7-day completion streak!",
                duration: 6000,
              });
            }, 1500);
          }
        } else {
          toast({
            title: "Order Status Updated!",
            description: `${order.customer?.name || 'Order'} moved to: ${statusNames[variables.status] || variables.status}`,
            duration: 3000,
          });
        }
      }

      // Send WebSocket update with error handling
      try {
        if (sendMessage) {
          sendMessage({
            type: 'order-status-update',
            data: updatedOrder
          });
        }
      } catch (wsError) {
        console.warn('WebSocket message failed:', wsError);
        // Don't fail the operation if WebSocket fails
      }
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousOrders) {
        queryClient.setQueryData(["/api/orders"], context.previousOrders);
      }

      toast({
        title: "Update Failed",
        description: "Failed to update order status. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    },
    onSettled: () => {
      // Reset mutation state after completion to allow subsequent operations
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
  });

  const handleDropOrder = useCallback((orderId: string, newStatus: string) => {
    try {
      if (!orderId || !newStatus) {
        console.warn('Invalid drop parameters:', { orderId, newStatus });
        return;
      }

      const order = orders.find(o => o.id === orderId);
      if (!order) {
        console.warn('Order not found for drop:', orderId);
        toast({
          title: "Drop Failed",
          description: "Order not found. Please refresh and try again.",
          variant: "destructive",
        });
        return;
      }

      if (order.status === newStatus) {
        console.log('No status change needed:', { current: order.status, new: newStatus });
        return;
      }

      console.log('Attempting to update order status:', { orderId, from: order.status, to: newStatus });

      // Use a timeout to ensure the drag operation completes before mutation
      setTimeout(() => {
        updateOrderStatusMutation.mutate({ orderId, status: newStatus });
      }, 50);

    } catch (error) {
      console.error('Error in handleDropOrder:', error);
      toast({
        title: "Drop Failed",
        description: "An error occurred while updating the order. Please try again.",
        variant: "destructive",
      });
    }
  }, [orders, updateOrderStatusMutation, toast]);

  // Scroll navigation functions
  const scrollLeft = useCallback(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollBy({ left: -400, behavior: 'smooth' });
    }
  }, []);

  const scrollRight = useCallback(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollBy({ left: 400, behavior: 'smooth' });
    }
  }, []);

  // Only update slider when not dragging
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!isDragging) {
      const container = e.currentTarget;
      const maxScroll = container.scrollWidth - container.clientWidth;
      const scrollPercent = maxScroll > 0 ? (container.scrollLeft / maxScroll) * 100 : 0;
      setScrollPosition(Math.round(scrollPercent));

      // Update scroll button states
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(container.scrollLeft < maxScroll);
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
  const startAutoScroll = useCallback((direction: 'left' | 'right', speed: number = 3) => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
    }

    autoScrollIntervalRef.current = setInterval(() => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const scrollAmount = direction === 'left' ? -speed * 4 : speed * 4; // Increased scroll speed
        const newScrollLeft = Math.max(0, Math.min(
          container.scrollLeft + scrollAmount,
          container.scrollWidth - container.clientWidth
        ));

        if (container.scrollLeft !== newScrollLeft) {
          container.scrollLeft = newScrollLeft;

          // Update scroll position for slider
          const maxScroll = container.scrollWidth - container.clientWidth;
          const scrollPercent = maxScroll > 0 ? (newScrollLeft / maxScroll) * 100 : 0;
          setScrollPosition(Math.round(scrollPercent));
        } else {
          // Stop scrolling if we've reached the edge
          stopAutoScroll();
        }
      }
    }, 16); // Smoother 60fps scrolling
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
    const scrollZone = 100; // Reduced for better trigger area
    const mouseX = e.clientX - rect.left;

    // Check if mouse is near left or right edge and container can scroll
    const canScrollLeft = container.scrollLeft > 0;
    const canScrollRight = container.scrollLeft < container.scrollWidth - container.clientWidth;

    if (mouseX < scrollZone && canScrollLeft) {
      // Near left edge, scroll left
      const speed = Math.max(2, (scrollZone - mouseX) / 10);
      startAutoScroll('left', speed);
    } else if (mouseX > rect.width - scrollZone && canScrollRight) {
      // Near right edge, scroll right
      const speed = Math.max(2, (mouseX - (rect.width - scrollZone)) / 10);
      startAutoScroll('right', speed);
    } else {
      // Not near edges, stop scrolling
      stopAutoScroll();
    }
  }, [startAutoScroll, stopAutoScroll]);

  // Initialize scroll button states
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const maxScroll = container.scrollWidth - container.clientWidth;
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(container.scrollLeft < maxScroll);
    }
  }, [orders]);

  // Set up global drag event listeners
  useEffect(() => {
    let isDragging = false;

    const handleDragStart = (e: DragEvent) => {
      // Only handle if it's an order card being dragged
      if (e.target && (e.target as HTMLElement).closest('[data-draggable="order"]')) {
        isDragging = true;
        console.log('Drag started - enabling auto-scroll');
      }
    };

    const handleDragEnd = (e: DragEvent) => {
      if (isDragging) {
        console.log('Drag ended - disabling auto-scroll');
        isDragging = false;
        stopAutoScroll();
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault(); // Allow drop
      if (isDragging) {
        handleMouseMove(e as any);
      }
    };

    // Listen for native drag events on the document
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDragEnd);

    return () => {
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragend', handleDragEnd);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDragEnd);
      stopAutoScroll();
    };
  }, [handleMouseMove, stopAutoScroll]);

  const { sendMessage, lastMessage } = useWebSocket() || { sendMessage: null, lastMessage: null };

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage?.type === 'order-updated' || lastMessage?.type === 'order-created') {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.refetchQueries({ queryKey: ["/api/orders"] });
    }
  }, [lastMessage, queryClient]);

    useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768); // Define your mobile breakpoint
    };

    // Set initial value
    handleResize();

    // Listen for window resize events
    window.addEventListener('resize', handleResize);

    // Clean up the event listener
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  if (isLoading && !orders.length) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-jade-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading orders...</p>
          <p className="text-xs text-gray-500 mt-2">If this takes too long, try refreshing the page</p>
        </div>
      </div>
    );
  }

  if (error && !orders.length) {
    console.error('Orders loading error:', error);
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center max-w-md">
          <div className="text-red-400 mb-4">Unable to load orders</div>
          <p className="text-gray-400 mb-4">
            {error instanceof Error ? error.message : 'Please check your connection and try again.'}
          </p>
          <div className="text-xs text-gray-500 mb-4 p-2 bg-gray-800 rounded">
            <strong>Debug Info:</strong><br/>
            Status: {(error as any)?.status || 'Unknown'}<br/>
            Network: {navigator.onLine ? 'Online' : 'Offline'}<br/>
            URL: {window.location.href}
          </div>
          <div className="flex gap-2 justify-center">
            <Button 
              onClick={() => refetch()} 
              className="bg-jade-600 hover:bg-jade-700"
            >
              Retry
            </Button>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
            >
              Refresh Page
            </Button>
          </div>
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

  // Filter orders based on search and filters
  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.trackingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPriority = priorityFilter === 'all' || order.priority === priorityFilter;

    let matchesStatus = true;
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        matchesStatus = !['PICKED_UP', 'CANCELLED'].includes(order.status || '');
      } else if (statusFilter === 'completed') {
        matchesStatus = ['PICKED_UP', 'COMPLETED'].includes(order.status || '');
      } else if (statusFilter === 'ready_for_work') {
        matchesStatus = ['MATERIALS_ARRIVED', 'FRAME_CUT', 'MAT_CUT'].includes(order.status || '');
      } else {
        matchesStatus = order.status === statusFilter;
      }
    }

    return matchesSearch && matchesPriority && matchesStatus;
  });

  return (
    <DndProvider backend={HTML5Backend}>
      <main className="relative z-10 h-full">
        <div className="w-full h-full">
          {/* AI Workload Alert Banner */}
          <div className="px-3 sm:px-6 pt-3 sm:pt-6">
            <WorkloadAlertBanner orders={orders} />
          </div>

          {/* Search and Filter Bar - Mobile optimized */}
          <div className="px-3 sm:px-6 mb-4">
            <Card className="glass-strong">
              <CardContent className="p-3 sm:p-4">
                <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:gap-4 sm:items-center">
                  <div className="flex-1 min-w-0">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search orders..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder-gray-400 text-base"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 sm:gap-4">
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className="flex-1 sm:w-40 bg-gray-800/50 border-gray-700 text-white text-base">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="HIGH">High Priority</SelectItem>
                        <SelectItem value="MEDIUM">Medium Priority</SelectItem>
                        <SelectItem value="LOW">Low Priority</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="flex-1 sm:w-48 bg-gray-800/50 border-gray-700 text-white text-base">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="active">Active Orders</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="ready_for_work">Ready for Work</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(searchTerm || priorityFilter !== 'all' || statusFilter !== 'all') && (
                    <div className="text-sm text-gray-400 text-center sm:text-left">
                      {filteredOrders.length} of {orders.length} orders
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mobile optimized Kanban Board */}
          <div className="relative">
            {/* Desktop scroll arrows */}
            <div className="hidden sm:flex absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 gap-3">
              <Button
                variant="outline"
                size="icon"
                className={`bg-gray-800/90 border-gray-600 hover:bg-gray-700 transition-all duration-200 ${
                  !canScrollLeft ? 'opacity-50 cursor-not-allowed' : 'opacity-100 hover:scale-110'
                }`}
                onClick={scrollLeft}
                disabled={!canScrollLeft}
              >
                <ChevronLeft className="h-4 w-4 text-white" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                className={`bg-gray-800/90 border-gray-600 hover:bg-gray-700 transition-all duration-200 ${
                  !canScrollRight ? 'opacity-50 cursor-not-allowed' : 'opacity-100 hover:scale-110'
                }`}
                onClick={scrollRight}
                disabled={!canScrollRight}
              >
                <ChevronRight className="h-4 w-4 text-white" />
              </Button>
            </div>

            {/* Mobile swipe hint */}
            <div className="sm:hidden absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-jade-500/20 text-jade-30 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
              ← Swipe to see more →
            </div>

            <div 
              ref={scrollContainerRef}
              className="kanban-scroll-container"
              style={{
                overflowX: 'scroll',
                overflowY: 'hidden',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'auto',
                scrollbarColor: '#10b981 #1f2937',
                height: isMobile ? 'calc(100vh - 280px)' : 'calc(100vh - 320px)',
                position: 'relative',
                width: '100%',
                maxWidth: '100vw',
                paddingBottom: '20px',
                scrollBehavior: 'smooth',
                touchAction: 'pan-x',
              }}
              onScroll={handleScroll}
            >
              <div 
                className="kanban-scroll"
                style={{
                  display: 'flex',
                  flexWrap: 'nowrap',
                  gap: isMobile ? '12px' : '24px',
                  width: isMobile ? `${KANBAN_COLUMNS.length * 260}px` : `${KANBAN_COLUMNS.length * 344}px`,
                  minWidth: isMobile ? `${KANBAN_COLUMNS.length * 260}px` : `${KANBAN_COLUMNS.length * 344}px`,
                  height: '100%',
                  paddingLeft: isMobile ? '12px' : '24px',
                  paddingRight: isMobile ? '12px' : '24px',
                }}
              >
                {KANBAN_COLUMNS.map((column) => (
                  <div 
                    key={column.status} 
                    className="kanban-column flex-shrink-0" 
                    style={{ 
                      width: isMobile ? '240px' : '320px',
                      minWidth: isMobile ? '240px' : '320px',
                      maxWidth: isMobile ? '240px' : '320px'
                    }}
                  >
                    <KanbanColumn
                      title={column.title}
                      status={column.status}
                      orders={filteredOrders.filter(order => order.status === column.status)}
                      onDropOrder={handleDropOrder}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Confetti Burst Animation */}
      <ConfettiBurst
        trigger={triggerConfetti}
        originX={originX}
        originY={originY}
        onComplete={reset}
      />

      {/* AI Assistant Chat */}
      <AIAssistant 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)}
      />
    </DndProvider>
  );
}
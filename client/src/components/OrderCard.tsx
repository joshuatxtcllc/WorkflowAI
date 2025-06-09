
import { useDrag } from 'react-dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, DollarSign, MessageSquare, Zap, CheckCircle, ArrowRight, ChevronDown, Edit } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { OrderWithDetails } from '@shared/schema';

interface OrderCardProps {
  order: OrderWithDetails;
}

import { useOrderStore } from '@/store/useOrderStore';

// Status progression map
const STATUS_PROGRESSION = {
  'ORDER_PROCESSED': 'MATERIALS_ORDERED',
  'MATERIALS_ORDERED': 'MATERIALS_ARRIVED', 
  'MATERIALS_ARRIVED': 'FRAME_CUT',
  'FRAME_CUT': 'MAT_CUT',
  'MAT_CUT': 'PREPPED',
  'PREPPED': 'COMPLETED',
  'COMPLETED': 'PICKED_UP'
};

const STATUS_LABELS = {
  'ORDER_PROCESSED': 'Order Materials',
  'MATERIALS_ORDERED': 'Mark Materials Arrived',
  'MATERIALS_ARRIVED': 'Cut Frame',
  'FRAME_CUT': 'Cut Mat',
  'MAT_CUT': 'Prep for Assembly',
  'PREPPED': 'Complete Order',
  'COMPLETED': 'Mark Picked Up'
};

export default function OrderCard({ order }: OrderCardProps) {
  // Add safety check for order data
  if (!order || !order.id) {
    return null;
  }

  const { setUI, setSelectedOrderId } = useOrderStore();
  const [statusChanged, setStatusChanged] = useState(false);
  const [previousStatus, setPreviousStatus] = useState(order.status);
  const [showStatusAnimation, setShowStatusAnimation] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Track status changes for animations
  useEffect(() => {
    if (previousStatus !== order.status) {
      setStatusChanged(true);
      setShowStatusAnimation(true);
      setPreviousStatus(order.status);

      // Reset animation after delay
      const timer = setTimeout(() => {
        setStatusChanged(false);
        setShowStatusAnimation(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [order.status, previousStatus]);

  const [{ isDragging }, drag] = useDrag({
    type: 'order',
    item: () => ({ id: order.id, status: order.status }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const response = await apiRequest('PATCH', `/api/orders/${order.id}/status`, { status: newStatus });
      return response.json();
    },
    onSuccess: (updatedOrder) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Status Updated! 🎉",
        description: `Order moved to: ${STATUS_LABELS[updatedOrder.status as keyof typeof STATUS_LABELS] || updatedOrder.status}`,
        duration: 3000,
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update order status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't open details if clicking on buttons/dropdowns
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('[role="menuitem"]')) {
      return;
    }
    setSelectedOrderId(order.id);
    setUI({ isOrderDetailsOpen: true });
  };

  const handleStatusUpdate = (newStatus: string) => {
    updateStatusMutation.mutate(newStatus);
  };

  const handleDragStart = () => {
    document.dispatchEvent(new CustomEvent('dragstart'));
  };

  const handleDragEnd = () => {
    document.dispatchEvent(new CustomEvent('dragend'));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'border-red-500/50 bg-red-500/10';
      case 'HIGH': return 'border-orange-500/50 bg-orange-500/10';
      case 'MEDIUM': return 'border-yellow-500/50 bg-yellow-500/10';
      default: return 'border-jade-500/50 bg-jade-500/10';
    }
  };

  const getPriorityIconColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      default: return 'bg-jade-500';
    }
  };

  const getOrderTypeEmoji = (type: string) => {
    switch (type) {
      case 'SHADOWBOX': return '🎨';
      case 'MAT': return '🖼️';
      case 'FRAME': return '🪟';
      default: return '🖼️';
    }
  };

  const getDueInDays = (dueDate: string | Date) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} days`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    return `Due in ${diffDays} days`;
  };

  const getDueDateColor = (dueDate: string | Date) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'text-red-400';
    if (diffDays <= 1) return 'text-red-400';
    if (diffDays <= 3) return 'text-orange-400';
    return 'text-gray-400';
  };

  const getMaterialsProgress = () => {
    const materials = order.materials;
    if (!materials || !Array.isArray(materials) || materials.length === 0) return [];

    return materials.map((material, index) => {
      if (!material || typeof material !== 'object') return null;
      
      let color = 'bg-gray-600'; // Not ordered
      let title = `${material.type || 'Material'} - Not ordered`;

      if (material.arrived) {
        color = 'bg-green-500';
        title = `${material.type || 'Material'} - Arrived`;
      } else if (material.ordered) {
        color = 'bg-yellow-500';
        title = `${material.type || 'Material'} - Ordered`;
      }

      return (
        <div
          key={`material-${order.id}-${index}`}
          className={`w-2 h-2 rounded-full ${color}`}
          title={title}
        />
      );
    }).filter(Boolean);
  };

  // Determine what the order needs next
  const getNextAction = () => {
    const currentStatus = order.status;
    
    switch (currentStatus) {
      case 'ORDER_PROCESSED':
        return 'Needs materials ordered';
      case 'MATERIALS_ORDERED':
        return 'Waiting for materials';
      case 'MATERIALS_ARRIVED':
        return 'Needs frame cut';
      case 'FRAME_CUT':
        // Check if order has mat materials
        const hasMat = order.materials?.some(m => m.type?.toLowerCase().includes('mat'));
        return hasMat ? 'Needs mat cut' : 'Ready for prep';
      case 'MAT_CUT':
        return 'Ready for prep';
      case 'PREPPED':
        return 'Ready for completion';
      case 'COMPLETED':
        return 'Ready for pickup';
      case 'PICKED_UP':
        return 'Order complete';
      default:
        return 'Status unknown';
    }
  };

  const getNextActionColor = () => {
    const currentStatus = order.status;
    
    switch (currentStatus) {
      case 'ORDER_PROCESSED':
      case 'MATERIALS_ORDERED':
        return 'text-blue-400';
      case 'MATERIALS_ARRIVED':
      case 'FRAME_CUT':
      case 'MAT_CUT':
        return 'text-orange-400';
      case 'PREPPED':
        return 'text-green-400';
      case 'COMPLETED':
        return 'text-purple-400';
      case 'PICKED_UP':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  // Get available status transitions
  const getAvailableTransitions = () => {
    const currentStatus = order.status;
    const transitions = [];
    
    // Always allow moving to the next status
    const nextStatus = STATUS_PROGRESSION[currentStatus as keyof typeof STATUS_PROGRESSION];
    if (nextStatus) {
      transitions.push({
        status: nextStatus,
        label: STATUS_LABELS[nextStatus as keyof typeof STATUS_LABELS] || nextStatus
      });
    }
    
    // Allow marking as delayed from any status
    if (currentStatus !== 'DELAYED' && currentStatus !== 'PICKED_UP') {
      transitions.push({
        status: 'DELAYED',
        label: 'Mark as Delayed'
      });
    }
    
    // Allow moving back to previous status (except from first status)
    if (currentStatus !== 'ORDER_PROCESSED') {
      const statusOrder = Object.keys(STATUS_PROGRESSION);
      const currentIndex = statusOrder.indexOf(currentStatus);
      if (currentIndex > 0) {
        const prevStatus = statusOrder[currentIndex - 1];
        transitions.push({
          status: prevStatus,
          label: `Back to ${STATUS_LABELS[prevStatus as keyof typeof STATUS_LABELS] || prevStatus}`
        });
      }
    }
    
    return transitions;
  };

  return (
    <motion.div
      ref={drag}
      onClick={handleCardClick}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      data-draggable="order"
      className={`
        relative p-3 rounded-lg border cursor-move transition-all duration-200 mb-2 min-h-[120px]
        ${getPriorityColor(order.priority || 'LOW')}
        ${isDragging ? 'opacity-50 rotate-1 scale-105 z-50' : 'hover:scale-[1.01] hover:shadow-lg'}
        ${order.priority === 'URGENT' ? 'ring-1 ring-amber-400/50' : ''}
        ${statusChanged ? 'ring-2 ring-green-400 ring-opacity-75' : ''}
        bg-gray-900/50 backdrop-blur-sm border-gray-700/50 hover:border-gray-600/50 shadow-sm hover:shadow-md
      `}
      whileHover={{ y: -1 }}
      whileDrag={{ scale: 1.02, rotate: 1, zIndex: 50 }}
      animate={{
        scale: statusChanged ? [1, 1.01, 1] : 1,
        borderColor: statusChanged ? ['#10b981', '#34d399', '#10b981'] : undefined,
      }}
      transition={{ 
        duration: statusChanged ? 0.6 : 0.2,
        ease: "easeInOut"
      }}
    >
      {/* Status Change Animation Overlay */}
      <AnimatePresence>
        {showStatusAnimation && (
          <motion.div
            key={`status-animation-${order.id}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 bg-green-500/20 rounded-lg border-2 border-green-400 flex items-center justify-center pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="bg-green-500 rounded-full p-2"
            >
              <CheckCircle className="w-6 h-6 text-white" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Progress Indicator */}
      <AnimatePresence>
        {statusChanged && (
          <motion.div
            key={`status-progress-${order.id}`}
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute top-2 right-2 flex items-center gap-1 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium"
          >
            <ArrowRight className="w-3 h-3" />
            Status Updated
          </motion.div>
        )}
      </AnimatePresence>

      {/* Priority Badge */}
      <div className={`absolute -top-2 -right-2 w-8 h-8 ${getPriorityIconColor(order.priority || 'LOW')} rounded-full flex items-center justify-center z-10`}>
        <Zap className="w-4 h-4 text-white" />
      </div>

      {/* Status Update Dropdown */}
      <div className="absolute top-2 right-2 z-20">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0 bg-gray-800/80 hover:bg-gray-700/80 text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
            {getAvailableTransitions().map((transition) => (
              <DropdownMenuItem
                key={`transition-${order.id}-${transition.status}`}
                onClick={() => handleStatusUpdate(transition.status)}
                className="text-white hover:bg-gray-700 cursor-pointer"
              >
                {transition.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-2">
        {/* Header */}
        <div>
          <h4 className="font-medium text-white text-sm flex items-center gap-1">
            <span className="text-sm">{getOrderTypeEmoji(order.orderType || 'MYSTERY')}</span>
            <span className="truncate">{order.customer?.name || order.description || 'Mystery Item'}</span>
          </h4>
          <p className="text-xs text-gray-400 font-mono truncate mt-0.5">{order.trackingId}</p>
        </div>

        {/* Description */}
        {order.description && (
          <div className="text-xs text-gray-300 leading-relaxed">
            <p className="line-clamp-2 break-words">
              {order.description}
            </p>
          </div>
        )}

        {/* Next Action */}
        <div className={`text-xs font-medium ${getNextActionColor()}`}>
          {getNextAction()}
        </div>

        {/* Order Type & Time */}
        <div className="flex items-center justify-between text-xs">
          <span className="px-1 py-0.5 bg-jade-500/20 text-jade-300 rounded text-xs font-medium">
            {order.orderType || 'MYSTERY'}
          </span>
          <span className="text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{order.estimatedHours || 0}h</span>
          </span>
        </div>

        {/* Due Date */}
        {order.dueDate && (
          <div className={`flex items-center gap-1 text-xs ${getDueDateColor(order.dueDate)}`}>
            <Calendar className="w-3 h-3" />
            <span className="font-medium truncate">{getDueInDays(order.dueDate)}</span>
          </div>
        )}

        {/* Materials Status */}
        <div className="flex gap-1 items-center">
          {getMaterialsProgress()}
          {(!order.materials || order.materials.length === 0) && (
            <div className="text-xs text-gray-500">No materials</div>
          )}
        </div>

        {/* Price & Notes */}
        <div className="flex items-center justify-between">
          {order.price && (
            <span className="text-jade-400 font-medium flex items-center gap-1 text-xs">
              <DollarSign className="w-3 h-3" />
              <span>${order.price}</span>
            </span>
          )}
          <div className="flex items-center gap-1">
            {order.notes && (
              <MessageSquare className="w-3 h-3 text-gray-500" />
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 text-gray-500 hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedOrderId(order.id);
                setUI({ isOrderDetailsOpen: true });
              }}
            >
              <Edit className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

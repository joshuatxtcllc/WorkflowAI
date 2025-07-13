import { useState, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  User, 
  DollarSign, 
  MessageSquare, 
  Edit, 
  AlertTriangle,
  Package,
  Zap
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { useOrderStore } from '../store/useOrderStore';
import { useToast } from '../hooks/use-toast';
import { apiRequest } from '../lib/queryClient';
import type { OrderWithDetails } from '@shared/schema';

interface OrderCardProps {
  order: OrderWithDetails;
}

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
  // Enhanced safety checks for order data
  if (!order || !order.id || typeof order.id !== 'string') {
    console.warn('OrderCard: Invalid order data received', order);
    return null;
  }

  const { setUI, setSelectedOrderId } = useOrderStore();
  const [statusChanged, setStatusChanged] = useState(false);
  const [previousStatus, setPreviousStatus] = useState(order.status || '');
  const [showStatusAnimation, setShowStatusAnimation] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Track status changes for animations with better error handling
  useEffect(() => {
    if (order.status && previousStatus && previousStatus !== order.status) {
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

  // Drag and drop setup
  const [{ isDragging }, drag] = useDrag({
    type: 'order',
    item: () => {
      console.log('Starting drag for order:', order.id);
      setIsDragActive(true);
      return { id: order.id };
    },
    end: (item, monitor) => {
      // Reset drag state when drag ends
      setIsDragActive(false);
      console.log('Drag ended for order:', order.id);
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: () => {
      return Boolean(order?.id) && !isUpdating;
    },
  });

  // Quick status update mutation
  const quickUpdateMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return apiRequest(`/api/orders/${order.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
    },
    onMutate: () => {
      setIsUpdating(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Status Updated",
        description: `Order moved to ${STATUS_LABELS[STATUS_PROGRESSION[order.status as keyof typeof STATUS_PROGRESSION] as keyof typeof STATUS_LABELS] || 'next stage'}`,
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update order status",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUpdating(false);
    },
  });

  const handleQuickStatusUpdate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus = STATUS_PROGRESSION[order.status as keyof typeof STATUS_PROGRESSION];
    if (nextStatus && !isUpdating) {
      quickUpdateMutation.mutate(nextStatus);
    }
  };

  const handleOpenDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOrderId(order.id);
    setUI({ isOrderDetailsOpen: true });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'HIGH': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'MEDIUM': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'LOW': return 'bg-green-500/20 text-green-300 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const isOverdue = new Date(order.dueDate) < new Date() && !['COMPLETED', 'PICKED_UP'].includes(order.status);
  const nextStatus = STATUS_PROGRESSION[order.status as keyof typeof STATUS_PROGRESSION];

  return (
    <div ref={drag}>
      <motion.div
        className={`order-card cursor-pointer transition-all duration-200 ${
          isDragging || isDragActive ? 'opacity-50 scale-95 rotate-2' : 'hover:scale-102'
        } ${statusChanged ? 'ring-2 ring-jade-500/50 shadow-jade-500/20' : ''}`}
        animate={{
          scale: showStatusAnimation ? [1, 1.05, 1] : 1,
          borderColor: showStatusAnimation ? ['#1f2937', '#10b981', '#1f2937'] : '#1f2937',
        }}
        transition={{ duration: 0.5 }}
        whileHover={{ y: -2 }}
        onClick={handleOpenDetails}
      >
        <Card className="h-full bg-gray-800/50 border-gray-700 hover:border-gray-600">
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="text-sm font-mono text-jade-400 mb-1">
                  #{order.trackingId}
                </div>
                <div className="flex items-center gap-2 text-white">
                  <User className="h-4 w-4" />
                  {order.customer?.name || 'Unknown'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getPriorityColor(order.priority)}>
                  {order.priority}
                </Badge>
                {isOverdue && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Overdue
                  </Badge>
                )}
              </div>
            </div>

            {/* Description */}
            {order.description && (
              <p className="text-sm text-gray-300 mb-3 line-clamp-2">
                {order.description}
              </p>
            )}

            {/* Key Details */}
            <div className="flex justify-between items-center mb-3 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>
                  {new Date(order.dueDate).toLocaleDateString(undefined, { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  {order.estimatedHours}h
                </span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex justify-between items-center">
              {/* Price */}
              {order.price && (
                <div className="flex items-center gap-1 text-green-400 text-sm">
                  <DollarSign className="h-3 w-3" />
                  <span>${order.price}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                {/* Notes Indicator */}
                {order.notes && (
                  <MessageSquare className="h-4 w-4 text-blue-400" />
                )}

                {/* Quick Action Button */}
                {nextStatus && (
                  <Button size="sm" variant="outline" onClick={handleQuickStatusUpdate} disabled={isUpdating}>
                    {isUpdating ? (
                      <div className="animate-spin h-3 w-3 border-2 border-gray-400 border-t-transparent rounded-full" />
                    ) : (
                      <Zap className="h-3 w-3" />
                    )}
                  </Button>
                )}

                {/* Details Button */}
                <Button size="sm" variant="ghost" onClick={handleOpenDetails}>
                  <Edit className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
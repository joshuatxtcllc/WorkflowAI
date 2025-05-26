import { useDrag } from 'react-dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, DollarSign, MessageSquare, Zap, CheckCircle, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { OrderWithDetails } from '@shared/schema';

interface OrderCardProps {
  order: OrderWithDetails;
}

import { useOrderStore } from '@/store/useOrderStore';

export default function OrderCard({ order }: OrderCardProps) {
  const { setUI, setSelectedOrderId } = useOrderStore();
  const [statusChanged, setStatusChanged] = useState(false);
  const [previousStatus, setPreviousStatus] = useState(order.status);
  const [showStatusAnimation, setShowStatusAnimation] = useState(false);

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

  const handleCardClick = () => {
    setSelectedOrderId(order.id);
    setUI({ isOrderDetailsOpen: true });
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
    if (!materials || materials.length === 0) return [];

    return materials.map((material, index) => {
      let color = 'bg-gray-600'; // Not ordered
      let title = `${material.type} - Not ordered`;

      if (material.arrived) {
        color = 'bg-green-500';
        title = `${material.type} - Arrived`;
      } else if (material.ordered) {
        color = 'bg-yellow-500';
        title = `${material.type} - Ordered`;
      }

      return (
        <div
          key={index}
          className={`w-2 h-2 rounded-full ${color}`}
          title={title}
        />
      );
    });
  };

  return (
    <motion.div
      ref={drag}
      onClick={handleCardClick}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      data-draggable="order"
      className={`
        relative p-4 rounded-lg border cursor-move transition-all duration-200 mb-3 min-h-[100px]
        ${getPriorityColor(order.priority)}
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
      <div className={`absolute -top-2 -right-2 w-8 h-8 ${getPriorityIconColor(order.priority)} rounded-full flex items-center justify-center`}>
        <Zap className="w-4 h-4 text-white" />
      </div>

      <div className="space-y-3">
        {/* Header - Customer name only */}
        <div>
          <h4 className="font-medium text-white text-base truncate">
            {order.customer.name}
          </h4>
          <p className="text-xs text-gray-500 font-mono mt-1">{order.trackingId}</p>
        </div>

        {/* Simplified bottom row - just due date and price */}
        <div className="flex items-center justify-between">
          <div className={`text-xs ${getDueDateColor(order.dueDate)}`}>
            {getDueInDays(order.dueDate)}
          </div>
          <div className="text-jade-400 font-medium text-sm">
            ${order.price}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
import { useDrag } from 'react-dnd';
import { motion } from 'framer-motion';
import { Calendar, Clock, DollarSign, MessageSquare, Zap } from 'lucide-react';
import type { OrderWithDetails } from '@shared/schema';

interface OrderCardProps {
  order: OrderWithDetails;
}

export default function OrderCard({ order }: OrderCardProps) {
  const [{ isDragging }, drag] = useDrag({
    type: 'order',
    item: { id: order.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

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
      className={`
        relative p-4 rounded-lg border-2 cursor-move transition-all duration-200
        ${getPriorityColor(order.priority)}
        ${isDragging ? 'opacity-50 rotate-3 scale-105' : 'hover:scale-102'}
        ${order.priority === 'URGENT' ? 'animate-pulse' : ''}
      `}
      whileHover={{ y: -2 }}
      whileDrag={{ scale: 1.05, rotate: 3 }}
    >
      {/* Priority Badge */}
      <div className={`absolute -top-2 -right-2 w-8 h-8 ${getPriorityIconColor(order.priority)} rounded-full flex items-center justify-center`}>
        <Zap className="w-4 h-4 text-white" />
      </div>
      
      <div className="space-y-3">
        {/* Header */}
        <div>
          <h4 className="font-semibold text-white flex items-center gap-2">
            <span className="text-xl">{getOrderTypeEmoji(order.orderType)}</span>
            <span>{order.customer.name}</span>
          </h4>
          <p className="text-xs text-gray-400 font-mono">{order.trackingId}</p>
        </div>
        
        {/* Order Type & Time */}
        <div className="flex items-center justify-between text-sm">
          <span className="px-2 py-1 bg-jade-500/20 text-jade-300 rounded-md font-medium">
            {order.orderType}
          </span>
          <span className="text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{order.estimatedHours}h</span>
          </span>
        </div>
        
        {/* Due Date */}
        <div className={`flex items-center gap-2 text-sm ${getDueDateColor(order.dueDate)}`}>
          <Calendar className="w-3 h-3" />
          <span className="font-medium">{getDueInDays(order.dueDate)}</span>
        </div>
        
        {/* Materials Status */}
        <div className="flex gap-1">
          {getMaterialsProgress()}
          {order.materials.length === 0 && (
            <div className="text-xs text-gray-500">No materials added</div>
          )}
        </div>
        
        {/* Price & Notes */}
        <div className="flex items-center justify-between">
          <span className="text-jade-400 font-semibold flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            <span>{order.price}</span>
          </span>
          {order.notes && (
            <MessageSquare className="w-4 h-4 text-gray-500" title={order.notes} />
          )}
        </div>
      </div>
    </motion.div>
  );
}


import React from 'react';
import { motion } from 'framer-motion';
import { Clock, User, AlertTriangle, Calendar, Package2, Star, Zap } from 'lucide-react';
import { Badge } from './ui/badge';

interface OrderCardProps {
  order: {
    id: string;
    trackingId: string;
    status: string;
    priority: string;
    orderType: string;
    description?: string;
    dueDate?: string;
    customer?: {
      name?: string;
      phone?: string;
    };
    estimatedHours?: number;
    price?: number;
  };
}

const priorityConfig = {
  URGENT: { 
    color: 'from-red-500 to-red-600', 
    bg: 'bg-red-500/10', 
    border: 'border-red-500/30',
    icon: AlertTriangle,
    pulse: true
  },
  HIGH: { 
    color: 'from-orange-500 to-orange-600', 
    bg: 'bg-orange-500/10', 
    border: 'border-orange-500/30',
    icon: Zap,
    pulse: false
  },
  MEDIUM: { 
    color: 'from-blue-500 to-blue-600', 
    bg: 'bg-blue-500/10', 
    border: 'border-blue-500/30',
    icon: Clock,
    pulse: false
  },
  LOW: { 
    color: 'from-gray-500 to-gray-600', 
    bg: 'bg-gray-500/10', 
    border: 'border-gray-500/30',
    icon: Package2,
    pulse: false
  },
};

const formatPrice = (price?: number) => {
  if (!price) return 'Quote Pending';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

const formatDueDate = (dueDate?: string) => {
  if (!dueDate) return null;
  const date = new Date(dueDate);
  const today = new Date();
  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'Overdue';
  if (diffDays === 0) return 'Due Today';
  if (diffDays === 1) return 'Due Tomorrow';
  return `${diffDays} days`;
};

export default function OrderCard({ order }: OrderCardProps) {
  const priority = priorityConfig[order.priority as keyof typeof priorityConfig] || priorityConfig.MEDIUM;
  const PriorityIcon = priority.icon;
  const dueInfo = formatDueDate(order.dueDate);
  const isOverdue = dueInfo === 'Overdue';
  const isDueToday = dueInfo === 'Due Today';

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`
        order-card relative overflow-hidden rounded-2xl border transition-all duration-300 cursor-pointer
        bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl
        border-gray-700/50 hover:border-gray-600/50
        shadow-lg hover:shadow-2xl hover:shadow-gray-900/50
        ${priority.pulse ? 'animate-pulse' : ''}
      `}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50" />
      
      {/* Priority Indicator */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${priority.color}`} />
      
      <div className="relative p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <div className={`p-1.5 rounded-lg bg-gradient-to-r ${priority.color} shadow-lg`}>
              <PriorityIcon className="w-3 h-3 text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">{order.trackingId}</p>
              <p className="text-xs text-gray-400">{order.orderType}</p>
            </div>
          </div>
          
          {order.price && (
            <div className="text-right">
              <p className="font-bold text-jade-400 text-sm">{formatPrice(order.price)}</p>
              {order.estimatedHours && (
                <p className="text-xs text-gray-500">{order.estimatedHours}h est.</p>
              )}
            </div>
          )}
        </div>

        {/* Customer Info */}
        {order.customer?.name && (
          <div className="flex items-center space-x-2 text-xs">
            <User className="w-3 h-3 text-gray-500" />
            <span className="text-gray-300 font-medium">{order.customer.name}</span>
            {order.customer.phone && (
              <span className="text-gray-500">• {order.customer.phone}</span>
            )}
          </div>
        )}

        {/* Description */}
        {order.description && (
          <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
            {order.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
          <div className="flex items-center space-x-2">
            <Badge 
              variant="outline" 
              className={`
                text-xs px-2 py-0.5 font-medium border
                ${priority.bg} ${priority.border}
                ${priority.color.includes('red') ? 'text-red-400' : 
                  priority.color.includes('orange') ? 'text-orange-400' :
                  priority.color.includes('blue') ? 'text-blue-400' : 'text-gray-400'}
              `}
            >
              {order.priority}
            </Badge>
          </div>
          
          {dueInfo && (
            <div className={`
              flex items-center space-x-1 text-xs font-medium
              ${isOverdue ? 'text-red-400' : isDueToday ? 'text-yellow-400' : 'text-gray-500'}
            `}>
              <Calendar className="w-3 h-3" />
              <span>{dueInfo}</span>
            </div>
          )}
        </div>
      </div>

      {/* Hover Effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-jade-500/0 to-jade-500/0 opacity-0 rounded-2xl"
        whileHover={{
          background: 'linear-gradient(to right, rgba(0, 166, 147, 0.05), rgba(0, 166, 147, 0.1))',
          opacity: 1
        }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );
}

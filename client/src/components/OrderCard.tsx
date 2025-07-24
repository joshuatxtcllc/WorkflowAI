
import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, User, Phone, Package, AlertCircle, Eye, FileText } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useOrderStore } from '../store/useOrderStore';
import type { OrderWithDetails } from '@shared/schema';

interface OrderCardProps {
  order: OrderWithDetails;
  onInvoice?: (orderId: string) => void;
}

const priorityColors = {
  LOW: 'bg-green-100 text-green-800 border-green-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  URGENT: 'bg-red-100 text-red-800 border-red-200',
};

const typeColors = {
  FRAME: 'bg-blue-100 text-blue-800',
  MAT: 'bg-purple-100 text-purple-800',
  SHADOWBOX: 'bg-indigo-100 text-indigo-800',
};

export default function OrderCard({ order, onInvoice }: OrderCardProps) {
  const { setUI, setSelectedOrderId } = useOrderStore();
  
  const priorityColor = priorityColors[order.priority as keyof typeof priorityColors] || priorityColors.MEDIUM;
  const typeColor = typeColors[order.orderType as keyof typeof typeColors] || typeColors.FRAME;

  const handleViewDetails = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedOrderId(order.id);
    setUI({ isOrderDetailsOpen: true });
  };

  const handleInvoice = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onInvoice) {
      onInvoice(order.id);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="bg-gray-900 border-gray-600 hover:border-jade-500 transition-colors">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-medium text-white text-sm">#{order.trackingId}</h4>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <User className="h-3 w-3" />
                {order.customer?.name || 'Unknown Customer'}
              </p>
            </div>
            <div className="flex flex-col items-end space-y-1">
              <Badge className={`text-xs px-2 py-1 ${priorityColor}`}>
                {order.priority || 'MEDIUM'}
              </Badge>
              <Badge className={`text-xs px-2 py-1 ${typeColor}`}>
                {order.orderType || 'FRAME'}
              </Badge>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center text-xs text-gray-400">
              <Package className="h-3 w-3 mr-2" />
              <span className="truncate">{order.description || 'No description'}</span>
            </div>

            {order.customer?.phone && (
              <div className="flex items-center text-xs text-gray-400">
                <Phone className="h-3 w-3 mr-2" />
                <span>{order.customer.phone}</span>
              </div>
            )}

            <div className="flex items-center text-xs text-gray-400">
              <Calendar className="h-3 w-3 mr-2" />
              <span>Due: {new Date(order.dueDate).toLocaleDateString()}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Price: ${order.price}</span>
              <span className="text-gray-500">Est: {order.estimatedHours}h</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-jade-400 border-jade-500/50 hover:bg-jade-500/10"
              onClick={handleViewDetails}
            >
              <Eye className="h-3 w-3 mr-1" />
              View
            </Button>
            {onInvoice && (
              <Button
                onClick={handleInvoice}
                variant="outline"
                size="sm"
                className="bg-blue-500 hover:bg-blue-400 text-white border-blue-500"
              >
                <FileText className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Complexity Indicator */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center space-x-1">
              {order.priority === 'URGENT' && (
                <AlertCircle className="h-3 w-3 text-red-500" />
              )}
            </div>
            
            <div className="flex items-center space-x-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1 h-1 rounded-full ${
                    i < Math.ceil((order.estimatedHours || 3) / 2) ? 'bg-jade-400' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

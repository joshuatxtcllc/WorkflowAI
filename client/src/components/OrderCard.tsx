import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, User, Phone, Package, AlertCircle } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';

interface Order {
  id: string;
  trackingId: string;
  customerName: string;
  customerPhone?: string;
  status: string;
  priority: string;
  orderType: string;
  frameDetails: string;
  matDetails?: string;
  quantity: number;
  dueDate: string;
  estimatedCompletion?: string;
  complexity: number;
}

interface OrderCardProps {
  order: Order;
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

export default function OrderCard({ order }: OrderCardProps) {
  const priorityColor = priorityColors[order.priority as keyof typeof priorityColors] || priorityColors.MEDIUM;
  const typeColor = typeColors[order.orderType as keyof typeof typeColors] || typeColors.FRAME;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="bg-gray-900 border-gray-600 hover:border-jade-500 transition-colors cursor-pointer">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-medium text-white text-sm">#{order.trackingId}</h4>
              <p className="text-xs text-gray-400 mt-1">{order.customerName}</p>
            </div>
            <div className="flex flex-col items-end space-y-1">
              <Badge className={`text-xs px-2 py-1 ${priorityColor}`}>
                {order.priority}
              </Badge>
              <Badge className={`text-xs px-2 py-1 ${typeColor}`}>
                {order.orderType}
              </Badge>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center text-xs text-gray-400">
              <Package className="h-3 w-3 mr-2" />
              <span className="truncate">{order.frameDetails}</span>
            </div>
            
            {order.matDetails && (
              <div className="flex items-center text-xs text-gray-400">
                <Package className="h-3 w-3 mr-2" />
                <span className="truncate">{order.matDetails}</span>
              </div>
            )}

            {order.customerPhone && (
              <div className="flex items-center text-xs text-gray-400">
                <Phone className="h-3 w-3 mr-2" />
                <span>{order.customerPhone}</span>
              </div>
            )}

            <div className="flex items-center text-xs text-gray-400">
              <Calendar className="h-3 w-3 mr-2" />
              <span>Due: {new Date(order.dueDate).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">Qty: {order.quantity}</span>
              {order.complexity > 7 && (
                <AlertCircle className="h-3 w-3 text-yellow-500" />
              )}
            </div>
            
            <div className="flex items-center space-x-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1 h-1 rounded-full ${
                    i < Math.ceil(order.complexity / 2) ? 'bg-jade-400' : 'bg-gray-600'
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
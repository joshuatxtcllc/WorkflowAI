
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  Calendar,
  User,
  Phone,
  DollarSign,
  Clock,
  Package,
  X
} from 'lucide-react';
import { Order } from '../types/invoice';

interface MobileOrderModalProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange?: (orderId: string, newStatus: string) => void;
}

export function MobileOrderModal({ 
  order, 
  open, 
  onOpenChange, 
  onStatusChange 
}: MobileOrderModalProps) {
  if (!order) return null;

  const getStatusColor = (status: string) => {
    const colors = {
      'order-processed': 'bg-blue-500',
      'materials-ordered': 'bg-orange-500',
      'materials-arrived': 'bg-yellow-500',
      'frame-cut': 'bg-purple-500',
      'mat-cut': 'bg-indigo-500',
      'prepped': 'bg-green-500',
      'completed': 'bg-emerald-500',
      'picked-up': 'bg-gray-500',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500';
  };

  const statusOptions = [
    'order-processed',
    'materials-ordered', 
    'materials-arrived',
    'frame-cut',
    'mat-cut',
    'prepped',
    'completed',
    'picked-up'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mobile-modal max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="text-lg font-semibold">
            Order #{order.id.slice(-8)}
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-400">Status</span>
            <Badge className={`${getStatusColor(order.status)} text-white`}>
              {order.status.replace('-', ' ').toUpperCase()}
            </Badge>
          </div>

          <Separator />

          {/* Customer Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-gray-400" />
              <div>
                <p className="font-medium">{order.customerName}</p>
                <p className="text-sm text-gray-400">Customer</p>
              </div>
            </div>

            {order.customerPhone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="font-medium">{order.customerPhone}</p>
                  <p className="text-sm text-gray-400">Phone</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Order Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Package className="h-4 w-4 text-gray-400" />
              <div>
                <p className="font-medium">{order.description}</p>
                <p className="text-sm text-gray-400">Description</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <div>
                <p className="font-medium">${order.total}</p>
                <p className="text-sm text-gray-400">Total</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-gray-400" />
              <div>
                <p className="font-medium">
                  {new Date(order.dueDate).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-400">Due Date</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-gray-400" />
              <div>
                <p className="font-medium">
                  {new Date(order.orderDate).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-400">Order Date</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Status Change */}
          {onStatusChange && (
            <div className="space-y-3">
              <p className="font-medium text-gray-300">Update Status</p>
              <div className="grid grid-cols-2 gap-2">
                {statusOptions.map((status) => (
                  <Button
                    key={status}
                    variant={order.status === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => onStatusChange(order.id, status)}
                    className="mobile-button text-xs"
                  >
                    {status.replace('-', ' ').toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDrag } from 'react-dnd';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, isAfter, format } from 'date-fns';
import { 
  Calendar, Clock, DollarSign, Package, User, Phone, MapPin, FileText, Image, 
  ChevronRight, MessageSquare, CreditCard, AlertTriangle, CheckCircle, 
  Truck, Scissors, Layers, Timer, MoreVertical
} from 'lucide-react';
import type { OrderWithDetails } from '@shared/schema';

interface EnhancedOrderCardProps {
  order: OrderWithDetails;
  onViewDetails: (order: OrderWithDetails) => void;
}

const STATUS_TRANSITIONS = {
  'ORDER_PROCESSED': { next: 'MATERIALS_ORDERED', label: 'Order Materials', icon: Truck },
  'MATERIALS_ORDERED': { next: 'MATERIALS_ARRIVED', label: 'Mark Arrived', icon: CheckCircle },
  'MATERIALS_ARRIVED': { next: 'FRAME_CUT', label: 'Cut Frame', icon: Scissors },
  'FRAME_CUT': { next: 'MAT_CUT', label: 'Cut Mat', icon: Layers },
  'MAT_CUT': { next: 'PREPPED', label: 'Prep Complete', icon: Timer },
  'PREPPED': { next: 'COMPLETED', label: 'Complete', icon: CheckCircle },
  'COMPLETED': { next: 'PICKED_UP', label: 'Mark Picked Up', icon: User },
};

const PAYMENT_STATUS = ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE'];

export default function EnhancedOrderCard({ order, onViewDetails }: EnhancedOrderCardProps) {
  const [paymentStatus, setPaymentStatus] = useState<string>(
    order.totalPrice && order.totalPrice > 0 ? 'PENDING' : 'PAID'
  );
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [{ isDragging }, drag] = useDrag({
    type: 'order',
    item: { id: order.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      return apiRequest(`/api/orders/${order.id}/status`, {
        method: 'PATCH',
        body: { status: newStatus },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Status Updated",
        description: "Order status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update order status.",
        variant: "destructive",
      });
    },
  });

  const sendNotification = useMutation({
    mutationFn: async (message: string) => {
      return apiRequest('/api/integrations/sms/send', {
        method: 'POST',
        body: {
          orderId: order.id,
          message,
          phoneNumber: order.customer?.phone,
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Notification Sent",
        description: "Customer has been notified successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Notification Failed",
        description: "Failed to send customer notification.",
        variant: "destructive",
      });
    },
  });

  // Check if order is overdue
  const isOverdue = order.dueDate && isAfter(new Date(), new Date(order.dueDate));
  const daysOverdue = isOverdue ? 
    Math.ceil((new Date().getTime() - new Date(order.dueDate!).getTime()) / (1000 * 3600 * 24)) : 0;

  // Get next status transition
  const nextTransition = STATUS_TRANSITIONS[order.status as keyof typeof STATUS_TRANSITIONS];
  const NextIcon = nextTransition?.icon || ChevronRight;

  // Payment status color
  const getPaymentColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'PARTIAL': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'OVERDUE': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const handleQuickNotification = () => {
    const messages = {
      'COMPLETED': `Hi ${order.customer?.name}, your custom frame order #${order.trackingId} is ready for pickup! Please call us to arrange pickup. Thank you!`,
      'DELAYED': `Hi ${order.customer?.name}, your frame order #${order.trackingId} is experiencing a slight delay. We'll have it ready soon and will notify you. Thank you for your patience!`,
      'PICKED_UP': `Thank you ${order.customer?.name} for choosing us for your framing needs! We hope you love your completed order #${order.trackingId}.`
    };

    const message = messages[order.status as keyof typeof messages] || 
      `Update on your frame order #${order.trackingId}: Status changed to ${order.status?.replace('_', ' ')}`;
    
    sendNotification.mutate(message);
  };

  return (
    <Card 
      ref={drag}
      className={`cursor-move transition-all duration-200 hover:shadow-lg ${
        isDragging ? 'opacity-50' : ''
      } ${isOverdue ? 'border-red-500 border-2' : ''}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              #{order.trackingId}
            </Badge>
            {isOverdue && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {daysOverdue}d overdue
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {/* Payment Status */}
            <Badge className={`text-xs ${getPaymentColor(paymentStatus)}`}>
              <CreditCard className="h-3 w-3 mr-1" />
              {paymentStatus}
            </Badge>
            
            {/* Quick Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {order.customer?.phone && (
                  <DropdownMenuItem onClick={handleQuickNotification}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Notify Customer
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onViewDetails(order)}>
                  <FileText className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                {PAYMENT_STATUS.map((status) => (
                  <DropdownMenuItem 
                    key={status}
                    onClick={() => setPaymentStatus(status)}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Mark {status}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <User className="h-4 w-4" />
            {order.customer?.name}
          </div>
          {order.customer?.phone && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              {order.customer.phone}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Order Description */}
          <p className="text-sm text-muted-foreground line-clamp-2">
            {order.description}
          </p>

          {/* Order Details */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {order.dueDate && (
              <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 dark:text-red-400' : ''}`}>
                <Calendar className="h-3 w-3" />
                <span>{format(new Date(order.dueDate), 'MMM d')}</span>
              </div>
            )}
            {order.estimatedHours && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{order.estimatedHours}h</span>
              </div>
            )}
            {order.totalPrice && (
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                <span>${order.totalPrice.toFixed(2)}</span>
              </div>
            )}
            {order.orderType && (
              <div className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                <span>{order.orderType}</span>
              </div>
            )}
          </div>

          {/* Status Transition Button */}
          {nextTransition && (
            <Button
              size="sm"
              className="w-full"
              onClick={() => updateStatus.mutate(nextTransition.next)}
              disabled={updateStatus.isPending}
            >
              <NextIcon className="h-4 w-4 mr-2" />
              {nextTransition.label}
            </Button>
          )}

          {/* Artwork Status */}
          {order.artworkImages && order.artworkImages.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <Image className="h-3 w-3" />
              Artwork received
            </div>
          )}

          {/* Location if available */}
          {order.artworkLocation && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              Location: {order.artworkLocation}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
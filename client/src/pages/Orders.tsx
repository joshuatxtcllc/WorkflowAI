import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import OrderDetails from '@/components/OrderDetails';
import { SystemAlerts } from '@/components/SystemAlerts';
import { Navigation } from '@/components/Navigation';
import { useOrderStore } from '@/store/useOrderStore';
import { Search, Filter, Eye, Calendar, User, Package, DollarSign, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import type { OrderWithDetails } from '@shared/schema';
import { useLocation } from 'wouter';
import { format } from 'date-fns';

const statusColors = {
  'ORDER_PROCESSED': 'bg-blue-100 text-blue-800',
  'MATERIALS_ORDERED': 'bg-yellow-100 text-yellow-800',
  'MATERIALS_ARRIVED': 'bg-green-100 text-green-800',
  'FRAME_CUT': 'bg-purple-100 text-purple-800',
  'MAT_CUT': 'bg-indigo-100 text-indigo-800',
  'ASSEMBLY_COMPLETE': 'bg-orange-100 text-orange-800',
  'READY_FOR_PICKUP': 'bg-emerald-100 text-emerald-800',
  'PICKED_UP': 'bg-gray-100 text-gray-800'
};

const statusLabels = {
  'ORDER_PROCESSED': 'Order Processed',
  'MATERIALS_ORDERED': 'Materials Ordered',
  'MATERIALS_ARRIVED': 'Materials Arrived',
  'FRAME_CUT': 'Frame Cut',
  'MAT_CUT': 'Mat Cut',
  'ASSEMBLY_COMPLETE': 'Assembly Complete',
  'READY_FOR_PICKUP': 'Ready for Pickup',
  'PICKED_UP': 'Picked Up'
};



export default function Orders() {
  const [searchTerm, setSearchTerm] = useState('');
  const { setSelectedOrderId, setUI } = useOrderStore();
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('dueDate');
  const [location] = useLocation();

  // Get status from URL params
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const urlStatus = urlParams.get('status');

  const { data: orders = [], isLoading } = useQuery<OrderWithDetails[]>({
    queryKey: ["/api/orders"],
  });

  // Filter orders based on search and status
  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.trackingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.description?.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesStatus = true;
    if (urlStatus) {
      switch (urlStatus) {
        case 'pending':
          matchesStatus = ['ORDER_PROCESSED', 'MATERIALS_ORDERED'].includes(order.status || '');
          break;
        case 'in-progress':
          matchesStatus = ['MATERIALS_ARRIVED', 'FRAME_CUT', 'MAT_CUT', 'ASSEMBLY_COMPLETE'].includes(order.status || '');
          break;
        case 'ready':
          matchesStatus = order.status === 'READY_FOR_PICKUP';
          break;
        case 'completed':
          matchesStatus = order.status === 'PICKED_UP';
          break;
      }
    } else if (statusFilter !== 'all') {
      matchesStatus = order.status === statusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  // Sort orders
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    switch (sortBy) {
      case 'dueDate':
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      case 'price':
        return b.price - a.price;
      case 'customer':
        return (a.customer?.name || '').localeCompare(b.customer?.name || '');
      case 'status':
        return (a.status || '').localeCompare(b.status || '');
      default:
        return 0;
    }
  });

  const getStatusLabel = (status: string) => statusLabels[status as keyof typeof statusLabels] || status;
  const getStatusColor = (status: string) => statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';

  if (isLoading) {
    return (
      <div className="p-6">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading orders...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Navigation />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Orders Management</h1>
          <p className="text-muted-foreground">
            {urlStatus ? `Showing ${urlStatus} orders` : 'Manage and track all your frame orders'}
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredOrders.length} of {orders.length} orders
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by tracking ID, customer, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ORDER_PROCESSED">Order Processed</SelectItem>
                <SelectItem value="MATERIALS_ORDERED">Materials Ordered</SelectItem>
                <SelectItem value="MATERIALS_ARRIVED">Materials Arrived</SelectItem>
                <SelectItem value="FRAME_CUT">Frame Cut</SelectItem>
                <SelectItem value="MAT_CUT">Mat Cut</SelectItem>
                <SelectItem value="ASSEMBLY_COMPLETE">Assembly Complete</SelectItem>
                <SelectItem value="READY_FOR_PICKUP">Ready for Pickup</SelectItem>
                <SelectItem value="PICKED_UP">Picked Up</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dueDate">Due Date</SelectItem>
                <SelectItem value="price">Price</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {sortedOrders.map((order) => (
          <Card key={order.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">#{order.trackingId}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <User className="h-4 w-4" />
                    {order.customer?.name || 'Unknown Customer'}
                  </div>
                </div>
                <Badge className={getStatusColor(order.status || '')}>
                  {getStatusLabel(order.status || '')}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground line-clamp-2">
                {order.description || 'No description available'}
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Due: {format(new Date(order.dueDate), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-1 font-semibold">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span>${order.price.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-4 w-4" />
                <span>{order.orderType} • {order.estimatedHours}h estimated</span>
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-4"
                onClick={() => {
                    setSelectedOrderId(order.id);
                    setUI({ isOrderDetailsOpen: true });
                  }}
              >
                View Details
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No orders found</h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your filters to see more results.'
                : 'No orders have been created yet.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Order Details Modal */}
      <OrderDetails />
    </div>
  );
}
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { SidebarProvider, SidebarInset } from "../components/ui/sidebar";
import { AppSidebar } from "../components/AppSidebar";
import Header from '../components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import OrderDetails from '../components/OrderDetails';
import InvoiceModal from '../components/InvoiceModal';
import { SystemAlerts } from '../components/SystemAlerts';
import { useIsMobile } from '../hooks/use-mobile';

import { useOrderStore } from '../store/useOrderStore';
import { Search, Filter, Eye, Calendar, User, Package, DollarSign, Clock, AlertTriangle, ArrowRight, FileText } from 'lucide-react';
import type { OrderWithDetails } from '@shared/schema';
import { useLocation } from 'wouter';
import KanbanBoard from '../components/KanbanBoard';
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
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [invoiceOrderId, setInvoiceOrderId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('dueDate');
  const [location] = useLocation();
  const { isMobile } = useIsMobile();
  const { setUI, setSelectedOrderId: setStoreSelectedOrderId } = useOrderStore();

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
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading orders...</div>
        </div>
      </div>
    );
  }

  // Show kanban board by default for better user experience
  const showKanban = true;

  if (showKanban) {
    return <KanbanBoard />;
  }

  return (
    <div className="w-full h-full overflow-auto">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Orders Management</h1>
            <p className="text-gray-400">
              {urlStatus ? `Showing ${urlStatus} orders` : 'Manage and track all your frame orders'}
            </p>
          </div>
          <div className="text-sm text-gray-400">
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

      {/* Orders Display */}
      {isMobile ? (
        /* Mobile Card Layout */
        <div className="space-y-4">
          {sortedOrders.map((order) => (
            <Card key={order.id} className="mobile-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">#{order.trackingId}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <User className="h-4 w-4" />
                      {order.customer?.name || 'Unknown Customer'}
                    </div>
                  </div>
                  <Badge className={getStatusColor(order.status || '')}>
                    {getStatusLabel(order.status || '')}
                  </Badge>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="text-sm text-muted-foreground line-clamp-2">
                    {order.description || 'No description available'}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Due: {format(new Date(order.dueDate), 'MMM d')}</span>
                    </div>
                    <div className="flex items-center gap-1 font-semibold">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span>${order.price.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Package className="h-4 w-4" />
                    <span>{order.orderType} • {order.estimatedHours}h</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 mobile-button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setStoreSelectedOrderId(order.id);
                      setUI({ isOrderDetailsOpen: true });
                    }}
                  >
                    View Details
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button
                    onClick={() => setInvoiceOrderId(order.id)}
                    variant="outline"
                    size="sm"
                    className="bg-blue-500 hover:bg-blue-400 text-white mobile-button"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Desktop Table Layout */
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">#{order.trackingId}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {order.customer?.name || 'Unknown Customer'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(order.status || '')}>
                        {getStatusLabel(order.status || '')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(order.dueDate), 'MMM d, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 font-semibold">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        ${order.price.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        {order.orderType}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setStoreSelectedOrderId(order.id);
                            setUI({ isOrderDetailsOpen: true });
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => setInvoiceOrderId(order.id)}
                          variant="outline"
                          size="sm"
                          className="bg-blue-500 hover:bg-blue-400 text-white"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

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

      {/* Invoice Modal */}
      {invoiceOrderId && (() => {
        const order = orders?.find(o => o.id === invoiceOrderId);
        return order ? (
          <InvoiceModal
            isOpen={!!invoiceOrderId}
            onClose={() => setInvoiceOrderId(null)}
            prefilledCustomer={{
              name: order.customer.name,
              email: order.customer.email,
              phone: order.customer.phone || '',
              address: order.customer.address || ''
            }}
            prefilledItems={[{
              description: order.description,
              quantity: 1,
              price: order.price
            }]}
          />
        ) : null;
      })()}
      </div>
    </div>
  );
}
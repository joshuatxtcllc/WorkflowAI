
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Navigation } from '@/components/Navigation';
import SimpleInvoice from '@/components/SimpleInvoice';
import { Search, Receipt, Eye, Calendar, DollarSign, User } from 'lucide-react';
import { format } from 'date-fns';
import type { OrderWithDetails } from '@shared/schema';

export default function Invoices() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);

  const { data: orders = [], isLoading } = useQuery<OrderWithDetails[]>({
    queryKey: ["/api/orders"],
  });

  // Filter orders that have been completed or are ready for pickup (invoiceable)
  const invoiceableOrders = orders.filter(order => 
    ['READY_FOR_PICKUP', 'PICKED_UP'].includes(order.status || '')
  );

  const filteredOrders = invoiceableOrders.filter(order => {
    if (!searchTerm) return true;
    return (
      order.trackingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const totalInvoiceAmount = filteredOrders.reduce((sum, order) => sum + order.price, 0);

  if (isLoading) {
    return (
      <div className="p-6">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading invoices...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Navigation />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="h-8 w-8" />
            Invoices
          </h1>
          <p className="text-muted-foreground">
            Manage customer invoices and billing
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-600">
            ${totalInvoiceAmount.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground">
            Total Invoice Value
          </div>
        </div>
      </div>

      {/* Search and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-2">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by tracking ID, customer, or invoice number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{filteredOrders.length}</div>
                <div className="text-sm text-muted-foreground">Total Invoices</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  ${Math.round(totalInvoiceAmount / filteredOrders.length || 0)}
                </div>
                <div className="text-sm text-muted-foreground">Avg Invoice</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredOrders.map((order) => (
          <Card key={order.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">
                    Invoice #{order.invoiceNumber || order.trackingId}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <User className="h-4 w-4" />
                    {order.customer?.name || 'Unknown Customer'}
                  </div>
                </div>
                <Badge variant={order.status === 'PICKED_UP' ? 'default' : 'secondary'}>
                  {order.status === 'PICKED_UP' ? 'Paid' : 'Pending'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Order: {order.trackingId} • {order.orderType}
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Due: {format(new Date(order.dueDate), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-1 font-semibold text-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <span>${order.price.toLocaleString()}</span>
                </div>
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-4"
                onClick={() => setSelectedOrder(order)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Invoice
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Receipt className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No invoices found</h3>
            <p className="text-muted-foreground">
              {searchTerm 
                ? 'Try adjusting your search terms.'
                : 'No completed orders ready for invoicing yet.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Invoice Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <SimpleInvoice 
              order={selectedOrder} 
              onClose={() => setSelectedOrder(null)} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

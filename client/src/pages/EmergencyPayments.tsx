
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { apiRequest } from '../lib/queryClient';
import { useToast } from '../hooks/use-toast';
import { DollarSign, CreditCard, AlertTriangle, CheckCircle } from 'lucide-react';

export default function EmergencyPayments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const { data: orders = [] } = useQuery({
    queryKey: ['/api/orders'],
    queryFn: () => apiRequest('/api/orders'),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['/api/invoices'],
    queryFn: () => apiRequest('/api/invoices'),
  });

  const { data: stripeStatus } = useQuery({
    queryKey: ['/api/stripe/status'],
    queryFn: () => apiRequest('/api/stripe/status'),
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async (data: { orderId: string; amount: number; method: string }) => {
      // First create invoice if none exists
      const existingInvoices = await apiRequest(`/api/orders/${data.orderId}/invoices`);
      let invoiceId;
      
      if (existingInvoices.length === 0) {
        const invoice = await apiRequest(`/api/orders/${data.orderId}/generate-invoice`, 'POST');
        invoiceId = invoice.id;
      } else {
        invoiceId = existingInvoices[0].id;
      }

      // Record payment
      return apiRequest(`/api/invoices/${invoiceId}/payment`, 'POST', {
        amount: data.amount,
        method: data.method,
        transactionId: `MANUAL_${Date.now()}`,
        notes: 'Emergency manual payment collection'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({ title: "💰 Payment Recorded", description: "Payment successfully recorded!" });
      setSelectedOrderId('');
      setPaymentAmount('');
    },
    onError: (error) => {
      toast({ title: "❌ Payment Failed", description: error.message, variant: "destructive" });
    },
  });

  const generateInvoiceMutation = useMutation({
    mutationFn: (orderId: string) => apiRequest(`/api/orders/${orderId}/generate-invoice`, 'POST'),
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({ title: "📄 Invoice Created", description: `Invoice ${invoice.invoiceNumber} generated` });
    },
  });

  const unpaidOrders = orders.filter(order => 
    !invoices.some(invoice => invoice.orderId === order.id && invoice.status === 'paid')
  );

  const overdueOrders = orders.filter(order => 
    new Date(order.dueDate) < new Date() && 
    !['COMPLETED', 'PICKED_UP'].includes(order.status)
  );

  const handleRecordPayment = () => {
    if (!selectedOrderId || !paymentAmount) {
      toast({ title: "Missing Information", description: "Please select order and amount", variant: "destructive" });
      return;
    }

    recordPaymentMutation.mutate({
      orderId: selectedOrderId,
      amount: parseFloat(paymentAmount),
      method: paymentMethod
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-red-600">🚨 Emergency Revenue Collection</h1>
          {stripeStatus && (
            <Badge variant={stripeStatus.ready ? "default" : "secondary"} className="text-sm">
              {stripeStatus.ready ? "💳 Stripe Ready" : "⚠️ Stripe Setup Needed"}
            </Badge>
          )}
        </div>
        <Badge variant="destructive" className="text-lg px-4 py-2">
          {unpaidOrders.length} Unpaid Orders
        </Badge>
      </div>

      {/* Critical Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Overdue Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueOrders.length}</div>
            <p className="text-sm text-red-500">Immediate attention needed</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-yellow-600 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Unpaid Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              ${unpaidOrders.reduce((sum, order) => sum + (order.price || 0), 0).toFixed(2)}
            </div>
            <p className="text-sm text-yellow-500">Collectible immediately</p>
          </CardContent>
        </Card>

        <Card className="border-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-600 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Ready for Pickup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {orders.filter(o => o.status === 'COMPLETED').length}
            </div>
            <p className="text-sm text-green-500">Collect payment now</p>
          </CardContent>
        </Card>
      </div>

      {/* Emergency Payment Collection */}
      <Card className="border-2 border-green-500">
        <CardHeader>
          <CardTitle className="text-green-600">💰 Immediate Payment Collection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
              <SelectTrigger>
                <SelectValue placeholder="Select Order" />
              </SelectTrigger>
              <SelectContent>
                {unpaidOrders.map(order => (
                  <SelectItem key={order.id} value={order.id}>
                    {order.trackingId} - {order.customer?.name} - ${order.price}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="number"
              placeholder="Amount"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
            />

            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="card">Credit Card</SelectItem>
                <SelectItem value="venmo">Venmo</SelectItem>
                <SelectItem value="zelle">Zelle</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              onClick={handleRecordPayment}
              disabled={recordPaymentMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Unpaid Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Unpaid Orders - Collect Immediately</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {unpaidOrders.map(order => (
              <div key={order.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <span className="font-semibold">{order.trackingId}</span>
                  <span className="mx-2">-</span>
                  <span>{order.customer?.name}</span>
                  <span className="mx-2">-</span>
                  <span>{order.description}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={order.status === 'COMPLETED' ? 'default' : 'secondary'}>
                    {order.status}
                  </Badge>
                  <span className="font-bold text-green-600">${order.price}</span>
                  <Button
                    size="sm"
                    onClick={() => generateInvoiceMutation.mutate(order.id)}
                    variant="outline"
                  >
                    Generate Invoice
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

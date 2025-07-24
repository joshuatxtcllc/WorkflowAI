
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { apiRequest } from '../lib/queryClient';
import { useToast } from '../hooks/use-toast';
import { CheckCircle, XCircle, AlertCircle, DollarSign, User, Package } from 'lucide-react';

export default function SystemTest() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Test customer creation
  const [testCustomer, setTestCustomer] = useState({
    name: 'Test Customer',
    email: 'test@customer.com',
    phone: '555-123-4567'
  });

  // Test order creation
  const [testOrder, setTestOrder] = useState({
    description: 'Test Frame Order',
    price: 275,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const { data: customers } = useQuery({
    queryKey: ['/api/customers'],
    queryFn: () => apiRequest('/api/customers'),
  });

  const { data: orders } = useQuery({
    queryKey: ['/api/orders'],
    queryFn: () => apiRequest('/api/orders'),
  });

  const createCustomerMutation = useMutation({
    mutationFn: (customerData: any) => apiRequest('/api/customers', 'POST', customerData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({ title: "✅ Customer Created", description: "Test customer created successfully" });
    },
    onError: (error) => {
      toast({ title: "❌ Customer Creation Failed", description: error.message, variant: "destructive" });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: (orderData: any) => apiRequest('/api/orders', 'POST', orderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({ title: "✅ Order Created", description: "Test order created successfully" });
    },
    onError: (error) => {
      toast({ title: "❌ Order Creation Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateTestCustomer = () => {
    createCustomerMutation.mutate(testCustomer);
  };

  const handleCreateTestOrder = () => {
    if (!customers?.length) {
      toast({ title: "No Customers", description: "Create a customer first", variant: "destructive" });
      return;
    }
    
    const orderData = {
      ...testOrder,
      customerId: customers[0].id,
      orderType: 'FRAME',
      status: 'ORDER_PROCESSED',
      priority: 'MEDIUM',
      estimatedHours: 3,
      dueDate: new Date(testOrder.dueDate)
    };
    
    createOrderMutation.mutate(orderData);
  };

  const systemHealth = {
    database: orders !== undefined,
    customers: customers !== undefined,
    authentication: true, // If we're here, auth is working
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">System Functionality Test</h1>
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline"
        >
          Refresh Tests
        </Button>
      </div>

      {/* System Health Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database</CardTitle>
            {systemHealth.database ? 
              <CheckCircle className="h-4 w-4 text-green-500" /> : 
              <XCircle className="h-4 w-4 text-red-500" />
            }
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemHealth.database ? 'Connected' : 'Failed'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Authentication</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Working</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            {orders ? 
              <CheckCircle className="h-4 w-4 text-green-500" /> : 
              <XCircle className="h-4 w-4 text-red-500" />
            }
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Creation Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input 
              placeholder="Customer Name"
              value={testCustomer.name}
              onChange={(e) => setTestCustomer({...testCustomer, name: e.target.value})}
            />
            <Input 
              placeholder="Email"
              value={testCustomer.email}
              onChange={(e) => setTestCustomer({...testCustomer, email: e.target.value})}
            />
            <Input 
              placeholder="Phone"
              value={testCustomer.phone}
              onChange={(e) => setTestCustomer({...testCustomer, phone: e.target.value})}
            />
          </div>
          <Button 
            onClick={handleCreateTestCustomer}
            disabled={createCustomerMutation.isPending}
            className="w-full"
          >
            {createCustomerMutation.isPending ? 'Creating...' : 'Create Test Customer'}
          </Button>
          <p className="text-sm text-muted-foreground">
            Current customers: {customers?.length || 0}
          </p>
        </CardContent>
      </Card>

      {/* Order Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order Creation Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input 
              placeholder="Order Description"
              value={testOrder.description}
              onChange={(e) => setTestOrder({...testOrder, description: e.target.value})}
            />
            <Input 
              type="number"
              placeholder="Price"
              value={testOrder.price}
              onChange={(e) => setTestOrder({...testOrder, price: parseFloat(e.target.value)})}
            />
            <Input 
              type="date"
              value={testOrder.dueDate}
              onChange={(e) => setTestOrder({...testOrder, dueDate: e.target.value})}
            />
          </div>
          <Button 
            onClick={handleCreateTestOrder}
            disabled={createOrderMutation.isPending || !customers?.length}
            className="w-full"
          >
            {createOrderMutation.isPending ? 'Creating...' : 'Create Test Order'}
          </Button>
          <p className="text-sm text-muted-foreground">
            Current orders: {orders?.length || 0}
          </p>
        </CardContent>
      </Card>

      {/* Stripe Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StripeTest />
        </CardContent>
      </Card>
    </div>
  );
}

function StripeTest() {
  const { data: stripeStatus, isLoading } = useQuery({
    queryKey: ['/api/stripe/test'],
    queryFn: () => apiRequest('/api/stripe/test'),
    retry: 2,
    refetchInterval: 30000
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-yellow-500 animate-spin" />
        <span>Testing Stripe connection...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {stripeStatus ? (
        stripeStatus.connected ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="font-semibold text-green-700">Stripe Connected & Ready</span>
            </div>
            <div className="ml-6 text-sm text-gray-600 space-y-1">
              <div>Business: {stripeStatus.businessName || 'Not set'}</div>
              <div>Country: {stripeStatus.country?.toUpperCase()}</div>
              <div>Currency: {stripeStatus.currency?.toUpperCase()}</div>
              <div>Charges: {stripeStatus.chargesEnabled ? '✅ Enabled' : '❌ Disabled'}</div>
              <div>Payouts: {stripeStatus.payoutsEnabled ? '✅ Enabled' : '❌ Disabled'}</div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="font-semibold text-red-700">Stripe Not Connected</span>
            </div>
            <div className="ml-6 text-sm text-red-600">
              {stripeStatus.error}
            </div>
            {stripeStatus.hint && (
              <div className="ml-6 text-sm text-blue-600 bg-blue-50 p-2 rounded">
                💡 {stripeStatus.hint}
              </div>
            )}
          </div>
        )
      ) : (
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <span>Unable to check Stripe status</span>
        </div>
      )}
    </div>
  );
}

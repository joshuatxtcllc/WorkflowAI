
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useOrderStore } from '@/store/useOrderStore';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Customer } from '@shared/schema';

interface NewOrderData {
  customerId: string;
  orderType: 'FRAME' | 'MAT' | 'SHADOWBOX';
  description: string;
  dueDate: string;
  estimatedHours: number;
  price: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  notes?: string;
}

export default function NewOrderModal() {
  const { ui, toggleNewOrderModal } = useOrderStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<NewOrderData>({
    customerId: '',
    orderType: 'FRAME',
    description: '',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 weeks from now
    estimatedHours: 3,
    price: 275,
    priority: 'MEDIUM',
    notes: ''
  });

  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  const [showNewCustomer, setShowNewCustomer] = useState(false);

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: NewOrderData) => {
      return apiRequest('/api/orders', {
        method: 'POST',
        body: JSON.stringify(orderData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/workload'] });
      toast({
        title: 'Order Created',
        description: 'New order has been created successfully.',
      });
      toggleNewOrderModal();
      resetForm();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create order. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (customerData: typeof newCustomer) => {
      return apiRequest('/api/customers', {
        method: 'POST',
        body: JSON.stringify(customerData),
      });
    },
    onSuccess: (customer) => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      setFormData(prev => ({ ...prev, customerId: customer.id }));
      setShowNewCustomer(false);
      toast({
        title: 'Customer Created',
        description: 'New customer has been added successfully.',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      customerId: '',
      orderType: 'FRAME',
      description: '',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      estimatedHours: 3,
      price: 275,
      priority: 'MEDIUM',
      notes: ''
    });
    setNewCustomer({ name: '', email: '', phone: '', address: '' });
    setShowNewCustomer(false);
  };

  const handleOrderTypeChange = (orderType: 'FRAME' | 'MAT' | 'SHADOWBOX') => {
    const defaults = {
      FRAME: { hours: 3, price: 275 },
      MAT: { hours: 1.5, price: 150 },
      SHADOWBOX: { hours: 4.5, price: 450 }
    };
    
    setFormData(prev => ({
      ...prev,
      orderType,
      estimatedHours: defaults[orderType].hours,
      price: defaults[orderType].price
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerId || !formData.description) {
      toast({
        title: 'Missing Information',
        description: 'Please select a customer and enter a description.',
        variant: 'destructive',
      });
      return;
    }

    createOrderMutation.mutate(formData);
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCustomer.name || !newCustomer.email) {
      toast({
        title: 'Missing Information',
        description: 'Please enter customer name and email.',
        variant: 'destructive',
      });
      return;
    }

    createCustomerMutation.mutate(newCustomer);
  };

  return (
    <Dialog open={ui.isNewOrderModalOpen} onOpenChange={toggleNewOrderModal}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Selection */}
          <div className="space-y-2">
            <Label htmlFor="customer">Customer</Label>
            <div className="flex gap-2">
              <Select
                value={formData.customerId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, customerId: value }))}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} ({customer.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewCustomer(!showNewCustomer)}
              >
                {showNewCustomer ? 'Cancel' : 'New Customer'}
              </Button>
            </div>
          </div>

          {/* New Customer Form */}
          {showNewCustomer && (
            <div className="p-4 border rounded-lg space-y-4">
              <h3 className="font-medium">Add New Customer</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Name *</Label>
                  <Input
                    id="customerName"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Customer name"
                  />
                </div>
                <div>
                  <Label htmlFor="customerEmail">Email *</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="customer@email.com"
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Phone</Label>
                  <Input
                    id="customerPhone"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="customerAddress">Address</Label>
                  <Input
                    id="customerAddress"
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Address"
                  />
                </div>
              </div>
              <Button
                type="button"
                onClick={handleCreateCustomer}
                disabled={createCustomerMutation.isPending}
                className="w-full"
              >
                {createCustomerMutation.isPending ? 'Creating...' : 'Create Customer'}
              </Button>
            </div>
          )}

          {/* Order Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="orderType">Order Type</Label>
              <Select
                value={formData.orderType}
                onValueChange={handleOrderTypeChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FRAME">Frame</SelectItem>
                  <SelectItem value="MAT">Mat</SelectItem>
                  <SelectItem value="SHADOWBOX">Shadowbox</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') => 
                  setFormData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the framing job..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="estimatedHours">Est. Hours</Label>
              <Input
                id="estimatedHours"
                type="number"
                step="0.5"
                min="0.5"
                value={formData.estimatedHours}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedHours: parseFloat(e.target.value) }))}
              />
            </div>

            <div>
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={toggleNewOrderModal}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createOrderMutation.isPending}
              className="bg-jade-500 hover:bg-jade-400 text-black"
            >
              {createOrderMutation.isPending ? 'Creating...' : 'Create Order'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

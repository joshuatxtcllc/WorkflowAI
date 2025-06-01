
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Navigation } from '@/components/Navigation';
import { ArtworkManager } from '@/components/ArtworkManager';
import { 
  Plus, 
  Edit, 
  Save, 
  X, 
  Image, 
  Ruler, 
  Palette, 
  Clock, 
  DollarSign, 
  Package,
  Sync,
  Database,
  Settings
} from 'lucide-react';

interface DetailedOrder {
  id: string;
  trackingId: string;
  customerId: string;
  customer?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  orderType: 'FRAME' | 'MAT' | 'SHADOWBOX';
  status: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate: string;
  estimatedHours?: number;
  actualHours?: number;
  price?: number;
  totalPrice?: number;
  laborCost?: number;
  materialCost?: number;
  taxAmount?: number;
  description?: string;
  notes?: string;
  internalNotes?: string;
  invoiceNumber?: string;
  // Artwork details
  artworkType?: string;
  artworkDescription?: string;
  artworkImages?: string[];
  artworkLocation?: string;
  artworkReceived?: boolean;
  // Frame specifications
  frameSize?: string;
  outerSize?: string;
  glassType?: string;
  spacers?: boolean;
  shadowboxWalls?: string;
  isFloat?: boolean;
  laborHours?: number;
  specialInstructions?: string;
  // Integration tracking
  posOrderId?: string;
  lastSyncedToPOS?: string;
  lastSyncedToHub?: string;
}

const ARTWORK_TYPES = [
  'Print/Poster',
  'Original Artwork',
  'Photograph',
  'Certificate/Diploma',
  'Sports Memorabilia',
  'Needlework',
  'Canvas',
  'Mixed Media',
  'Document',
  'Other'
];

const GLASS_TYPES = [
  'Regular Glass',
  'Non-Glare Glass',
  'UV Protection Glass',
  'Museum Glass',
  'Acrylic',
  'UV Acrylic',
  'Anti-Reflective Acrylic'
];

const LABOR_PRESETS = [
  { label: '30 Minutes', value: 0.5 },
  { label: '1 Hour', value: 1 },
  { label: '2 Hours', value: 2 },
  { label: '4 Hours', value: 4 },
  { label: '8 Hours', value: 8 }
];

export default function AdminPortal() {
  const [selectedOrder, setSelectedOrder] = useState<DetailedOrder | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<DetailedOrder>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['/api/orders'],
    queryFn: async () => {
      const response = await fetch('/api/orders');
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    }
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['/api/customers'],
    queryFn: async () => {
      const response = await fetch('/api/customers');
      if (!response.ok) throw new Error('Failed to fetch customers');
      return response.json();
    }
  });

  const updateOrderMutation = useMutation({
    mutationFn: async (orderData: Partial<DetailedOrder>) => {
      const response = await fetch(`/api/orders/${selectedOrder?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      if (!response.ok) throw new Error('Failed to update order');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      setIsEditing(false);
      toast({
        title: "Order Updated",
        description: "Order details have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const syncToPOSMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/integrations/pos/sync/${orderId}`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('POS sync failed');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "POS Sync Successful",
        description: "Order has been synced to POS system.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    },
    onError: (error: any) => {
      toast({
        title: "POS Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const syncToHubMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch('/api/integrations/dashboard/order-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          updateType: 'manual_sync',
          details: { reason: 'Admin portal manual sync' }
        })
      });
      if (!response.ok) throw new Error('Hub sync failed');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Hub Sync Successful",
        description: "Order has been synced to Central Hub.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hub Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (selectedOrder) {
      updateOrderMutation.mutate(formData);
    }
  };

  const startEditing = (order: DetailedOrder) => {
    setSelectedOrder(order);
    setFormData(order);
    setIsEditing(true);
  };

  const calculateTotalPrice = () => {
    const base = Number(formData.price) || 0;
    const labor = Number(formData.laborCost) || 0;
    const material = Number(formData.materialCost) || 0;
    const tax = Number(formData.taxAmount) || 0;
    return base + labor + material + tax;
  };

  useEffect(() => {
    if (formData.price || formData.laborCost || formData.materialCost) {
      setFormData(prev => ({ ...prev, totalPrice: calculateTotalPrice() }));
    }
  }, [formData.price, formData.laborCost, formData.materialCost, formData.taxAmount]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Portal</h1>
            <p className="text-muted-foreground">
              Advanced order management with detailed specifications
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => syncToHubMutation.mutate('all')}>
              <Sync className="h-4 w-4 mr-2" />
              Sync All to Hub
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Orders List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Orders ({orders.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                {isLoading ? (
                  <div>Loading orders...</div>
                ) : (
                  orders.map((order: DetailedOrder) => (
                    <div
                      key={order.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedOrder?.id === order.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedOrder(order)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{order.trackingId}</span>
                        <Badge variant={order.priority === 'URGENT' ? 'destructive' : 'secondary'}>
                          {order.priority}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {order.customer?.name || 'Unknown Customer'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {order.orderType} - {order.status}
                      </div>
                      {order.totalPrice && (
                        <div className="text-sm font-medium text-green-600">
                          ${order.totalPrice.toFixed(2)}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Details */}
          <div className="lg:col-span-2">
            {selectedOrder ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Edit className="h-5 w-5" />
                      Order Details - {selectedOrder.trackingId}
                    </CardTitle>
                    <div className="flex gap-2">
                      {!isEditing ? (
                        <Button onClick={() => startEditing(selectedOrder)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button onClick={handleSave} disabled={updateOrderMutation.isPending}>
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </Button>
                          <Button variant="outline" onClick={() => setIsEditing(false)}>
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      )}
                      <Button 
                        variant="outline" 
                        onClick={() => syncToPOSMutation.mutate(selectedOrder.id)}
                        disabled={syncToPOSMutation.isPending}
                      >
                        <Database className="h-4 w-4 mr-2" />
                        Sync to POS
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-5">
                      <TabsTrigger value="basic">Basic</TabsTrigger>
                      <TabsTrigger value="artwork">Artwork</TabsTrigger>
                      <TabsTrigger value="specs">Specifications</TabsTrigger>
                      <TabsTrigger value="pricing">Pricing</TabsTrigger>
                      <TabsTrigger value="sync">Sync Status</TabsTrigger>
                    </TabsList>

                    <TabsContent value="basic" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="orderType">Order Type</Label>
                          {isEditing ? (
                            <Select 
                              value={formData.orderType} 
                              onValueChange={(value) => handleInputChange('orderType', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="FRAME">Frame Only</SelectItem>
                                <SelectItem value="MAT">Mat Only</SelectItem>
                                <SelectItem value="SHADOWBOX">Shadow Box</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="p-2 bg-gray-50 rounded">{selectedOrder.orderType}</div>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="priority">Priority</Label>
                          {isEditing ? (
                            <Select 
                              value={formData.priority} 
                              onValueChange={(value) => handleInputChange('priority', value)}
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
                          ) : (
                            <div className="p-2 bg-gray-50 rounded">{selectedOrder.priority}</div>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="dueDate">Due Date</Label>
                          {isEditing ? (
                            <Input 
                              type="date"
                              value={formData.dueDate ? new Date(formData.dueDate).toISOString().split('T')[0] : ''}
                              onChange={(e) => handleInputChange('dueDate', e.target.value)}
                            />
                          ) : (
                            <div className="p-2 bg-gray-50 rounded">
                              {new Date(selectedOrder.dueDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="invoiceNumber">Invoice Number</Label>
                          {isEditing ? (
                            <Input 
                              value={formData.invoiceNumber || ''}
                              onChange={(e) => handleInputChange('invoiceNumber', e.target.value)}
                            />
                          ) : (
                            <div className="p-2 bg-gray-50 rounded">{selectedOrder.invoiceNumber || 'N/A'}</div>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="description">Description</Label>
                        {isEditing ? (
                          <Textarea 
                            value={formData.description || ''}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            rows={3}
                          />
                        ) : (
                          <div className="p-2 bg-gray-50 rounded min-h-[80px]">
                            {selectedOrder.description || 'No description'}
                          </div>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="notes">Customer Notes</Label>
                        {isEditing ? (
                          <Textarea 
                            value={formData.notes || ''}
                            onChange={(e) => handleInputChange('notes', e.target.value)}
                            rows={2}
                          />
                        ) : (
                          <div className="p-2 bg-gray-50 rounded min-h-[60px]">
                            {selectedOrder.notes || 'No notes'}
                          </div>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="internalNotes">Internal Notes</Label>
                        {isEditing ? (
                          <Textarea 
                            value={formData.internalNotes || ''}
                            onChange={(e) => handleInputChange('internalNotes', e.target.value)}
                            rows={2}
                          />
                        ) : (
                          <div className="p-2 bg-gray-50 rounded min-h-[60px]">
                            {selectedOrder.internalNotes || 'No internal notes'}
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="artwork" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="artworkType">Artwork Type</Label>
                          {isEditing ? (
                            <Select 
                              value={formData.artworkType} 
                              onValueChange={(value) => handleInputChange('artworkType', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select artwork type" />
                              </SelectTrigger>
                              <SelectContent>
                                {ARTWORK_TYPES.map(type => (
                                  <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="p-2 bg-gray-50 rounded">{selectedOrder.artworkType || 'Not specified'}</div>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="artworkLocation">Artwork Location</Label>
                          {isEditing ? (
                            <Input 
                              value={formData.artworkLocation || ''}
                              onChange={(e) => handleInputChange('artworkLocation', e.target.value)}
                              placeholder="e.g., Shelf A-3, Bin 2"
                            />
                          ) : (
                            <div className="p-2 bg-gray-50 rounded">{selectedOrder.artworkLocation || 'Not specified'}</div>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="artworkDescription">Artwork Description</Label>
                        {isEditing ? (
                          <Textarea 
                            value={formData.artworkDescription || ''}
                            onChange={(e) => handleInputChange('artworkDescription', e.target.value)}
                            rows={3}
                            placeholder="Detailed description of the artwork"
                          />
                        ) : (
                          <div className="p-2 bg-gray-50 rounded min-h-[80px]">
                            {selectedOrder.artworkDescription || 'No description'}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {isEditing ? (
                          <Checkbox 
                            checked={formData.artworkReceived || false}
                            onCheckedChange={(checked) => handleInputChange('artworkReceived', checked)}
                          />
                        ) : (
                          <div className="w-4 h-4 border rounded flex items-center justify-center">
                            {selectedOrder.artworkReceived && '✓'}
                          </div>
                        )}
                        <Label>Artwork Received</Label>
                      </div>

                      {/* Artwork Images */}
                      <div>
                        <Label>Artwork Images</Label>
                        <ArtworkManager orderId={selectedOrder.id} />
                      </div>
                    </TabsContent>

                    <TabsContent value="specs" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="frameSize">Frame Size</Label>
                          {isEditing ? (
                            <Input 
                              value={formData.frameSize || ''}
                              onChange={(e) => handleInputChange('frameSize', e.target.value)}
                              placeholder="e.g., 16x20, 11x14"
                            />
                          ) : (
                            <div className="p-2 bg-gray-50 rounded">{selectedOrder.frameSize || 'Not specified'}</div>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="outerSize">Outer Size</Label>
                          {isEditing ? (
                            <Input 
                              value={formData.outerSize || ''}
                              onChange={(e) => handleInputChange('outerSize', e.target.value)}
                              placeholder="e.g., 18x22, 13x16"
                            />
                          ) : (
                            <div className="p-2 bg-gray-50 rounded">{selectedOrder.outerSize || 'Not specified'}</div>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="glassType">Glass Type</Label>
                          {isEditing ? (
                            <Select 
                              value={formData.glassType} 
                              onValueChange={(value) => handleInputChange('glassType', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select glass type" />
                              </SelectTrigger>
                              <SelectContent>
                                {GLASS_TYPES.map(type => (
                                  <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="p-2 bg-gray-50 rounded">{selectedOrder.glassType || 'Not specified'}</div>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="shadowboxWalls">Shadowbox Walls</Label>
                          {isEditing ? (
                            <Input 
                              value={formData.shadowboxWalls || ''}
                              onChange={(e) => handleInputChange('shadowboxWalls', e.target.value)}
                              placeholder="e.g., 1 inch, 2 inch"
                            />
                          ) : (
                            <div className="p-2 bg-gray-50 rounded">{selectedOrder.shadowboxWalls || 'N/A'}</div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          {isEditing ? (
                            <Checkbox 
                              checked={formData.spacers || false}
                              onCheckedChange={(checked) => handleInputChange('spacers', checked)}
                            />
                          ) : (
                            <div className="w-4 h-4 border rounded flex items-center justify-center">
                              {selectedOrder.spacers && '✓'}
                            </div>
                          )}
                          <Label>Spacers Required</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          {isEditing ? (
                            <Checkbox 
                              checked={formData.isFloat || false}
                              onCheckedChange={(checked) => handleInputChange('isFloat', checked)}
                            />
                          ) : (
                            <div className="w-4 h-4 border rounded flex items-center justify-center">
                              {selectedOrder.isFloat && '✓'}
                            </div>
                          )}
                          <Label>Float Mount</Label>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="specialInstructions">Special Instructions</Label>
                        {isEditing ? (
                          <Textarea 
                            value={formData.specialInstructions || ''}
                            onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
                            rows={3}
                            placeholder="Any special handling or construction notes"
                          />
                        ) : (
                          <div className="p-2 bg-gray-50 rounded min-h-[80px]">
                            {selectedOrder.specialInstructions || 'No special instructions'}
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="pricing" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="price">Base Price</Label>
                          {isEditing ? (
                            <Input 
                              type="number"
                              step="0.01"
                              value={formData.price || ''}
                              onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                            />
                          ) : (
                            <div className="p-2 bg-gray-50 rounded">
                              ${selectedOrder.price?.toFixed(2) || '0.00'}
                            </div>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="laborCost">Labor Cost</Label>
                          {isEditing ? (
                            <Input 
                              type="number"
                              step="0.01"
                              value={formData.laborCost || ''}
                              onChange={(e) => handleInputChange('laborCost', parseFloat(e.target.value) || 0)}
                            />
                          ) : (
                            <div className="p-2 bg-gray-50 rounded">
                              ${selectedOrder.laborCost?.toFixed(2) || '0.00'}
                            </div>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="materialCost">Material Cost</Label>
                          {isEditing ? (
                            <Input 
                              type="number"
                              step="0.01"
                              value={formData.materialCost || ''}
                              onChange={(e) => handleInputChange('materialCost', parseFloat(e.target.value) || 0)}
                            />
                          ) : (
                            <div className="p-2 bg-gray-50 rounded">
                              ${selectedOrder.materialCost?.toFixed(2) || '0.00'}
                            </div>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="taxAmount">Tax Amount</Label>
                          {isEditing ? (
                            <Input 
                              type="number"
                              step="0.01"
                              value={formData.taxAmount || ''}
                              onChange={(e) => handleInputChange('taxAmount', parseFloat(e.target.value) || 0)}
                            />
                          ) : (
                            <div className="p-2 bg-gray-50 rounded">
                              ${selectedOrder.taxAmount?.toFixed(2) || '0.00'}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <div className="flex justify-between items-center text-lg font-bold">
                          <span>Total Price:</span>
                          <span className="text-green-600">
                            ${isEditing ? calculateTotalPrice().toFixed(2) : (selectedOrder.totalPrice?.toFixed(2) || '0.00')}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="estimatedHours">Estimated Hours</Label>
                          {isEditing ? (
                            <Input 
                              type="number"
                              step="0.5"
                              value={formData.estimatedHours || ''}
                              onChange={(e) => handleInputChange('estimatedHours', parseFloat(e.target.value) || 0)}
                            />
                          ) : (
                            <div className="p-2 bg-gray-50 rounded">
                              {selectedOrder.estimatedHours || 0} hours
                            </div>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="actualHours">Actual Hours</Label>
                          {isEditing ? (
                            <Input 
                              type="number"
                              step="0.5"
                              value={formData.actualHours || ''}
                              onChange={(e) => handleInputChange('actualHours', parseFloat(e.target.value) || 0)}
                            />
                          ) : (
                            <div className="p-2 bg-gray-50 rounded">
                              {selectedOrder.actualHours || 0} hours
                            </div>
                          )}
                        </div>
                      </div>

                      {isEditing && (
                        <div>
                          <Label>Labor Hour Presets</Label>
                          <div className="flex gap-2 mt-1">
                            {LABOR_PRESETS.map(preset => (
                              <Button
                                key={preset.value}
                                variant="outline"
                                size="sm"
                                onClick={() => handleInputChange('estimatedHours', preset.value)}
                              >
                                {preset.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="sync" className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">POS Integration Status</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span>POS Order ID:</span>
                                <span className="font-mono text-sm">
                                  {selectedOrder.posOrderId || 'Not synced'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Last Synced:</span>
                                <span className="text-sm">
                                  {selectedOrder.lastSyncedToPOS 
                                    ? new Date(selectedOrder.lastSyncedToPOS).toLocaleString()
                                    : 'Never'
                                  }
                                </span>
                              </div>
                              <Button 
                                size="sm" 
                                onClick={() => syncToPOSMutation.mutate(selectedOrder.id)}
                                disabled={syncToPOSMutation.isPending}
                              >
                                {syncToPOSMutation.isPending ? 'Syncing...' : 'Sync to POS'}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Central Hub Status</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span>Last Synced:</span>
                                <span className="text-sm">
                                  {selectedOrder.lastSyncedToHub 
                                    ? new Date(selectedOrder.lastSyncedToHub).toLocaleString()
                                    : 'Never'
                                  }
                                </span>
                              </div>
                              <Button 
                                size="sm" 
                                onClick={() => syncToHubMutation.mutate(selectedOrder.id)}
                                disabled={syncToHubMutation.isPending}
                              >
                                {syncToHubMutation.isPending ? 'Syncing...' : 'Sync to Hub'}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <Settings className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Select an Order
                    </h3>
                    <p className="text-gray-500">
                      Choose an order from the list to view and edit detailed specifications
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

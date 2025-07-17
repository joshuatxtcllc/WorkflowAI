import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { CheckCircle, Clock, Package, Download, RefreshCw } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "../lib/queryClient";

import { SystemAlerts } from '../components/SystemAlerts';

interface MaterialItem {
  vendor: string;
  itemNumber: string;
  description: string;
  price: number;
  frameSize?: string;
  orderId: string;
  customerName: string;
}

interface VendorPurchaseOrder {
  vendor: string;
  items: MaterialItem[];
  totalAmount: number;
  estimatedDelivery: string;
}

export default function VendorOrders() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  const { data: vendorOrders, isLoading } = useQuery({
    queryKey: ['/api/vendor/orders'],
    refetchInterval: 30000
  });

  const markOrderedMutation = useMutation({
    mutationFn: (orderIds: string[]) => 
      apiRequest('/api/vendor/mark-ordered', {
        method: 'POST',
        body: { orderIds }
      }),
    onSuccess: () => {
      toast({
        title: "Orders Updated",
        description: "Materials have been marked as ordered"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      setSelectedOrders([]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update orders",
        variant: "destructive"
      });
    }
  });

  const generatePurchaseOrder = (vendorOrder: VendorPurchaseOrder) => {
    const poText = `
PURCHASE ORDER - ${vendorOrder.vendor}
=====================================

Order Date: ${new Date().toLocaleDateString()}
Expected Delivery: ${vendorOrder.estimatedDelivery}

ITEMS NEEDED:
${vendorOrder.items.map(item => 
  `• ${item.itemNumber} - ${item.description} - $${item.price.toFixed(2)}
    For: Order ${item.orderId} (${item.customerName})`
).join('\n')}

TOTAL AMOUNT: $${vendorOrder.totalAmount.toFixed(2)}

Ship to: Jay's Frames
[Your Business Address]

Notes: Please mark all items with order numbers for easy identification.
    `;

    const blob = new Blob([poText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PO-${vendorOrder.vendor.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getVendorIcon = (vendor: string) => {
    if (vendor.includes('Roma')) return '🏛️';
    if (vendor.includes('Larson')) return '🖼️';
    if (vendor.includes('Bella')) return '✨';
    if (vendor.includes('Crescent')) return '🎨';
    if (vendor.includes('Guardian') || vendor.includes('Glass')) return '🔍';
    if (vendor.includes('Franks')) return '🧵';
    return '📦';
  };

  const getVendorColor = (vendor: string) => {
    if (vendor.includes('Roma')) return 'bg-blue-50 border-blue-200';
    if (vendor.includes('Larson')) return 'bg-green-50 border-green-200';
    if (vendor.includes('Bella')) return 'bg-purple-50 border-purple-200';
    if (vendor.includes('Crescent')) return 'bg-orange-50 border-orange-200';
    if (vendor.includes('Guardian') || vendor.includes('Glass')) return 'bg-cyan-50 border-cyan-200';
    if (vendor.includes('Franks')) return 'bg-pink-50 border-pink-200';
    return 'bg-gray-50 border-gray-200';
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-lg">Generating vendor orders...</span>
        </div>
      </div>
    );
  }

  const totalOrderValue = vendorOrders?.reduce((sum: number, order: VendorPurchaseOrder) => sum + order.totalAmount, 0) || 0;
  const totalItems = vendorOrders?.reduce((sum: number, order: VendorPurchaseOrder) => sum + order.items.length, 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <SystemAlerts />
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Vendor Orders</h1>
            <p className="text-gray-800">Manage material orders and vendor relationships</p>
          </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-700">Vendors</p>
                <p className="text-2xl font-bold">{vendorOrders?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-gray-700">Total Items</p>
                <p className="text-2xl font-bold">{totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-700">Total Value</p>
                <p className="text-2xl font-bold">${totalOrderValue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vendor Purchase Orders */}
      <div className="space-y-4">
        {vendorOrders?.map((vendorOrder: VendorPurchaseOrder, index: number) => (
          <Card key={index} className={`${getVendorColor(vendorOrder.vendor)}`}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getVendorIcon(vendorOrder.vendor)}</span>
                  <div>
                    <CardTitle className="text-xl">{vendorOrder.vendor}</CardTitle>
                    <p className="text-sm text-gray-700">
                      {vendorOrder.items.length} items • Delivery: {vendorOrder.estimatedDelivery}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    ${vendorOrder.totalAmount.toLocaleString()}
                  </Badge>
                  <Button 
                    onClick={() => generatePurchaseOrder(vendorOrder)}
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PO
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                {vendorOrder.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex items-center justify-between py-2 px-3 bg-white/50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {item.itemNumber}
                        </Badge>
                        <span className="font-medium">{item.description}</span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">
                        Order {item.orderId} • {item.customerName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${item.price.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const orderIds = vendorOrder.items.map(item => item.orderId);
                    setSelectedOrders(prev => 
                      prev.includes(orderIds[0]) 
                        ? prev.filter(id => !orderIds.includes(id))
                        : [...prev, ...orderIds]
                    );
                  }}
                >
                  {vendorOrder.items.some(item => selectedOrders.includes(item.orderId)) 
                    ? 'Deselect Orders' 
                    : 'Select for Ordering'
                  }
                </Button>

                <div className="text-sm text-gray-700">
                  {vendorOrder.items.length} order{vendorOrder.items.length !== 1 ? 's' : ''} ready for materials
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mark as Ordered Action */}
      {selectedOrders.length > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Mark Materials as Ordered</p>
                <p className="text-sm text-gray-700">
                  {selectedOrders.length} order{selectedOrders.length !== 1 ? 's' : ''} selected
                </p>
              </div>
              <Button 
                onClick={() => markOrderedMutation.mutate(selectedOrders)}
                disabled={markOrderedMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {markOrderedMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Mark as Ordered
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {vendorOrders?.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Ready for Materials</h3>
              <p className="text-gray-700">
                All processed orders either have materials ordered or are in later production stages.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
        </div>
      </div>
    </div>
  );
}
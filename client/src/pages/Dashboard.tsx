import { useState, useEffect, useRef } from 'react';
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { Card, CardContent } from '@/components/ui/card';
import { Package, Truck, CheckCircle, Clock, Scissors, Layers, Timer, AlertTriangle, User, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';


// Simple kanban board with working order management
function SimpleKanbanColumn({ title, status, icon: Icon, orders = [] }: { title: string; status: string; icon: any; orders?: any[] }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 min-h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-jade-400" />
          <h3 className="font-semibold text-white">{title}</h3>
          <Badge variant="secondary" className="bg-gray-700 text-gray-300">
            {orders.length}
          </Badge>
        </div>
      </div>
      
      <div className="space-y-3 flex-1">
        {orders.map((order, index) => (
          <Card key={order.id || index} className="bg-gray-700 border-gray-600 hover:bg-gray-650 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-white">{order.customer?.name || 'Unknown Customer'}</h4>
                <span className="text-xs text-gray-400">{order.tracking_id}</span>
              </div>
              <p className="text-sm text-gray-300 mb-2">{order.description}</p>
              <div className="flex justify-between items-center text-xs text-gray-400">
                <span>Due: {new Date(order.due_date).toLocaleDateString()}</span>
                <span>${order.price}</span>
              </div>
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">
                  {order.order_type}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {orders.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <p>No orders in this stage</p>
          </div>
        )}
      </div>
      
      <Button variant="outline" className="mt-4 border-gray-600 text-gray-300 hover:bg-gray-700">
        <Plus className="h-4 w-4 mr-2" />
        Add Order
      </Button>
    </div>
  );
}

export default function Dashboard() {
  // Fetch real orders from your database
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['/api/orders'],
    enabled: true
  });

  // Group orders by status for kanban columns
  const groupedOrders = {
    processing: orders.filter((order: any) => order.status === 'ORDER_PROCESSED'),
    materialsOrdered: orders.filter((order: any) => order.status === 'MATERIALS_ORDERED'),
    materialsArrived: orders.filter((order: any) => order.status === 'MATERIALS_ARRIVED'),
    framesCut: orders.filter((order: any) => order.status === 'FRAME_CUT'),
    completed: orders.filter((order: any) => order.status === 'COMPLETED')
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-jade-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-950 text-white flex" style={{ backgroundColor: '#0A0A0B' }}>
        {/* Background Pattern */}
        <div className="fixed inset-0 opacity-30 pointer-events-none">
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0, 166, 147, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 166, 147, 0.03) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px'
            }}
          />
        </div>

        {/* Main content area */}
        <div className="flex-1 p-6">
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-jade-400 mb-2">Jay's Frames</h1>
            <p className="text-gray-400">Professional Order Management System</p>
          </header>

          {/* Kanban Board */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <SimpleKanbanColumn 
              title="Order Processing" 
              status="processing" 
              icon={Package} 
              orders={groupedOrders.processing}
            />
            <SimpleKanbanColumn 
              title="Materials Ordered" 
              status="materials" 
              icon={Truck} 
              orders={groupedOrders.materialsOrdered}
            />
            <SimpleKanbanColumn 
              title="Materials Arrived" 
              status="arrived" 
              icon={CheckCircle} 
              orders={groupedOrders.materialsArrived}
            />
            <SimpleKanbanColumn 
              title="Frames Cut" 
              status="frames" 
              icon={Scissors} 
              orders={groupedOrders.framesCut}
            />
            <SimpleKanbanColumn 
              title="Completed" 
              status="completed" 
              icon={CheckCircle} 
              orders={groupedOrders.completed}
            />
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
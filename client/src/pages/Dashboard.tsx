import { useState } from 'react';
import { SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent } from '@/components/ui/card';
import { Package, Truck, CheckCircle, Clock } from 'lucide-react';


// Simple dashboard component
function OrderStatusCard({ status, count, icon: Icon }: { status: string; count: number; icon: any }) {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">{status}</p>
            <p className="text-2xl font-bold text-white">{count}</p>
          </div>
          <Icon className="h-8 w-8 text-jade-400" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
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
        <div className="flex-1 p-8">
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-jade-400 mb-2">Jay's Frames</h1>
            <p className="text-gray-400">Order Management System</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <OrderStatusCard status="Processing" count={12} icon={Package} />
            <OrderStatusCard status="Materials Ordered" count={8} icon={Truck} />
            <OrderStatusCard status="Completed" count={24} icon={CheckCircle} />
            <OrderStatusCard status="Due Today" count={3} icon={Clock} />
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Order Tracking Dashboard</h2>
            <p className="text-gray-300">Your complete order management system is ready.</p>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
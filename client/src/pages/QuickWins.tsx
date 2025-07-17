import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Clock, Zap, TrendingUp, Target, DollarSign, Calendar, Coffee, LogOut } from "lucide-react";
import { OrderWithDetails } from "@shared/schema";
import { Link } from "wouter";

interface QuickWin {
  id: string;
  title: string;
  description: string;
  estimatedTime: number;
  revenue: number;
  priority: "HIGH" | "MEDIUM" | "LOW";
  category: "QUICK_COMPLETION" | "HIGH_VALUE" | "OVERDUE" | "BATCH_READY";
  orders: OrderWithDetails[];
}

export default function QuickWins() {
  const { data: orders, isLoading } = useQuery<OrderWithDetails[]>({
    queryKey: ["/api/orders"],
  });

  const [timeFilter, setTimeFilter] = useState<string>("all");

  const filterOrdersByTime = (orders: OrderWithDetails[], maxHours: number): OrderWithDetails[] => {
    return orders.filter(
      order => order.estimatedHours <= maxHours && 
      !["PICKED_UP", "COMPLETED"].includes(order.status || "") &&
      isOrderReadyForWork(order)
    );
  };

  const isOrderReadyForWork = (order: OrderWithDetails): boolean => {
    const status = order.status;
    const readyStatuses = [
      "MATERIALS_ARRIVED",
      "FRAME_CUT",
      "MAT_CUT",
      "PREPPED"
    ];
    return readyStatuses.includes(status || "");
  };

  const generateQuickWins = (orders: OrderWithDetails[]): QuickWin[] => {
    const quickWins: QuickWin[] = [];

    // Get all workable orders (not picked up, cancelled, or completed)
    const workableOrders = orders.filter(order => 
      !["PICKED_UP", "COMPLETED", "CANCELLED"].includes(order.status || "") &&
      isOrderReadyForWork(order)
    );

    // Sort by priority: overdue first, then by due date, then by revenue
    const prioritizedOrders = workableOrders.sort((a, b) => {
      const now = new Date();
      const aDue = new Date(a.dueDate);
      const bDue = new Date(b.dueDate);
      
      // Overdue orders first
      const aOverdue = aDue < now;
      const bOverdue = bDue < now;
      
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      
      // Then by due date (earliest first)
      if (aDue.getTime() !== bDue.getTime()) {
        return aDue.getTime() - bDue.getTime();
      }
      
      // Finally by revenue (highest first)
      return b.price - a.price;
    });

    // Select exactly 15 orders that total approximately 8 hours
    const targetHours = 8;
    const selectedOrders: OrderWithDetails[] = [];
    let totalHours = 0;

    for (const order of prioritizedOrders) {
      const orderHours = order.estimatedHours || 1;
      
      // Add order if we haven't reached 15 orders and total hours won't exceed 10
      if (selectedOrders.length < 15 && (totalHours + orderHours) <= 10) {
        selectedOrders.push(order);
        totalHours += orderHours;
      }
      
      // If we have 15 orders or are close to 8 hours, stop
      if (selectedOrders.length >= 15 || totalHours >= targetHours) {
        break;
      }
    }

    // If we don't have enough hours but have room for more orders, add smaller ones
    if (totalHours < 6 && selectedOrders.length < 15) {
      const remainingOrders = prioritizedOrders.filter(order => 
        !selectedOrders.includes(order) && order.estimatedHours <= 2
      );
      
      for (const order of remainingOrders) {
        if (selectedOrders.length >= 15) break;
        if (totalHours + order.estimatedHours <= 10) {
          selectedOrders.push(order);
          totalHours += order.estimatedHours;
        }
      }
    }

    // Create the primary Quick Wins category
    if (selectedOrders.length > 0) {
      const overdueCount = selectedOrders.filter(order => 
        new Date(order.dueDate) < new Date()
      ).length;

      quickWins.push({
        id: "priority-queue",
        title: "Priority Production Queue",
        description: `15 orders totaling ${totalHours.toFixed(1)} hours${overdueCount > 0 ? ` (${overdueCount} overdue)` : ''}`,
        estimatedTime: totalHours,
        revenue: selectedOrders.reduce((sum, order) => sum + order.price, 0),
        priority: "HIGH",
        category: "QUICK_COMPLETION",
        orders: selectedOrders
      });
    }

    // Next 15 orders for material preparation
    const nextOrders = prioritizedOrders
      .filter(order => !selectedOrders.includes(order))
      .slice(0, 15);

    if (nextOrders.length > 0) {
      const materialsNeeded = nextOrders.filter(order => 
        ["ORDER_PLACED", "MATERIALS_ORDERED"].includes(order.status || "")
      );

      quickWins.push({
        id: "next-queue",
        title: "Next Production Queue",
        description: `Next 15 orders (${materialsNeeded.length} need materials)`,
        estimatedTime: nextOrders.reduce((sum, order) => sum + order.estimatedHours, 0),
        revenue: nextOrders.reduce((sum, order) => sum + order.price, 0),
        priority: materialsNeeded.length > 5 ? "HIGH" : "MEDIUM",
        category: materialsNeeded.length > 5 ? "OVERDUE" : "BATCH_READY",
        orders: nextOrders
      });
    }

    return quickWins;
  };

  const quickWins = orders ? generateQuickWins(orders) : [];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "QUICK_COMPLETION": return <Zap className="h-4 w-4" />;
      case "HIGH_VALUE": return <DollarSign className="h-4 w-4" />;
      case "OVERDUE": return <Clock className="h-4 w-4" />;
      case "BATCH_READY": return <Target className="h-4 w-4" />;
      default: return <TrendingUp className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "QUICK_COMPLETION": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "HIGH_VALUE": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "OVERDUE": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "BATCH_READY": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center space-x-2">
          <Zap className="h-6 w-6 text-green-600" />
          <h1 className="text-2xl font-bold">Quick Wins Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Zap className="h-6 w-6 text-green-600" />
          <h1 className="text-2xl font-bold">Quick Wins Dashboard</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <Coffee className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter by time:</span>
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All orders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All orders</SelectItem>
              <SelectItem value="1">Under 1 hour</SelectItem>
              <SelectItem value="2">Under 2 hours</SelectItem>
              <SelectItem value="4">Under 4 hours</SelectItem>
              <SelectItem value="8">Under 8 hours</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Find the highest-impact work you can complete right now to maximize efficiency and revenue.
      </div>

      {quickWins.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Quick Wins Available</h3>
            <p className="text-muted-foreground">
              All ready orders require significant time investment. Consider checking materials status or working on order processing.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickWins.map((win) => (
            <Card key={win.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center space-x-2">
                    {getCategoryIcon(win.category)}
                    <span>{win.title}</span>
                  </CardTitle>
                  <Badge className={getCategoryColor(win.category)}>
                    {win.priority}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{win.description}</p>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">{win.estimatedTime.toFixed(1)}h</div>
                      <div className="text-xs text-muted-foreground">Est. Time</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">${win.revenue.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Revenue</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">
                    {win.id === "priority-queue" ? "Production Queue (15 Orders):" : "Orders:"}
                  </h4>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {win.orders.map((order) => {
                      const isOverdue = new Date(order.dueDate) < new Date();
                      const daysUntilDue = Math.ceil((new Date(order.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      
                      return (
                        <div key={order.id} className={`flex items-center justify-between p-2 rounded text-sm ${
                          isOverdue ? 'bg-red-100 border border-red-300' : 
                          daysUntilDue <= 2 ? 'bg-yellow-100 border border-yellow-300' : 
                          'bg-muted'
                        }`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900">{order.trackingId}</span>
                              <span className="text-gray-700 truncate">{order.customer.name}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-gray-600">
                              <span>Due: {new Date(order.dueDate).toLocaleDateString()}</span>
                              <span>•</span>
                              <span>{order.estimatedHours}h</span>
                              <span>•</span>
                              <Badge variant="outline" className="text-xs">
                                {order.status?.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              {order.orderType}
                            </Badge>
                            <span className="text-xs font-medium text-gray-900">${order.price}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Link href="/">
                  <Button className="w-full" size="sm">
                    View in Kanban Board
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
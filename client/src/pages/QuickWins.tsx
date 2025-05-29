import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigation } from '@/components/Navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

    let quickOrders = orders.filter(order => 
      order.estimatedHours <= 2 && 
      !["PICKED_UP", "COMPLETED"].includes(order.status || "") &&
      isOrderReadyForWork(order)
    );

    if (timeFilter !== "all") {
      const maxHours = parseFloat(timeFilter);
      quickOrders = filterOrdersByTime(orders, maxHours);
    }

    if (quickOrders.length > 0) {
      quickWins.push({
        id: "quick-completion",
        title: "Quick Completions",
        description: `${quickOrders.length} orders under 2 hours`,
        estimatedTime: quickOrders.reduce((sum, order) => sum + order.estimatedHours, 0),
        revenue: quickOrders.reduce((sum, order) => sum + order.price, 0),
        priority: "HIGH",
        category: "QUICK_COMPLETION",
        orders: quickOrders.slice(0, 5)
      });
    }

    let highValueOrders = orders.filter(order => 
      order.price >= 300 && 
      !["PICKED_UP", "COMPLETED"].includes(order.status || "") &&
      isOrderReadyForWork(order)
    );

    if (timeFilter !== "all") {
      const maxHours = parseFloat(timeFilter);
      highValueOrders = highValueOrders.filter(order => order.estimatedHours <= maxHours);
    }

    if (highValueOrders.length > 0) {
      quickWins.push({
        id: "high-value",
        title: "High Value Orders",
        description: `${highValueOrders.length} orders worth $300+ each`,
        estimatedTime: highValueOrders.reduce((sum, order) => sum + order.estimatedHours, 0),
        revenue: highValueOrders.reduce((sum, order) => sum + order.price, 0),
        priority: "HIGH",
        category: "HIGH_VALUE",
        orders: highValueOrders.slice(0, 5)
      });
    }

    const now = new Date();
    const overdueOrders = orders.filter(
      order => new Date(order.dueDate) < now && 
      !["PICKED_UP", "COMPLETED"].includes(order.status || "")
    ).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    if (overdueOrders.length > 0) {
      quickWins.push({
        id: "overdue",
        title: "Overdue Orders",
        description: `${overdueOrders.length} orders past their due date`,
        estimatedTime: overdueOrders.reduce((sum, order) => sum + order.estimatedHours, 0),
        revenue: overdueOrders.reduce((sum, order) => sum + order.price, 0),
        priority: "HIGH",
        category: "OVERDUE",
        orders: overdueOrders.slice(0, 5)
      });
    }

    const frameOrders = orders.filter(
      order => order.orderType === "FRAME" && 
      order.status === "MATERIALS_ARRIVED"
    );

    if (frameOrders.length >= 3) {
      quickWins.push({
        id: "batch-frames",
        title: "Batch Frame Processing",
        description: `${frameOrders.length} frames ready for cutting`,
        estimatedTime: frameOrders.reduce((sum, order) => sum + order.estimatedHours, 0) * 0.8,
        revenue: frameOrders.reduce((sum, order) => sum + order.price, 0),
        priority: "MEDIUM",
        category: "BATCH_READY",
        orders: frameOrders.slice(0, 5)
      });
    }

    return quickWins.sort((a, b) => {
      if (a.priority === "HIGH" && b.priority !== "HIGH") return -1;
      if (b.priority === "HIGH" && a.priority !== "HIGH") return 1;
      return b.revenue - a.revenue;
    });
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
      <Navigation />
      
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
                  <h4 className="font-medium text-sm">Sample Orders:</h4>
                  {win.orders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                      <div>
                        <span className="font-medium">{order.trackingId}</span>
                        <span className="text-muted-foreground ml-2">{order.customer.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {order.orderType}
                        </Badge>
                        <span className="text-xs">${order.price}</span>
                      </div>
                    </div>
                  ))}
                  {win.orders.length < 5 && (
                    <p className="text-xs text-muted-foreground">
                      +{Math.max(0, (orders?.length || 0) - win.orders.length)} more orders
                    </p>
                  )}
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
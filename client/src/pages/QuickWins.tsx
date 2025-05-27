import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Zap, TrendingUp, Target, DollarSign, Calendar } from "lucide-react";
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

  const generateQuickWins = (orders: OrderWithDetails[]): QuickWin[] => {
    const quickWins: QuickWin[] = [];

    // Quick Completion Orders (≤ 2 hours)
    const quickOrders = orders.filter(
      order => order.estimatedHours <= 2 && 
      !["PICKED_UP", "COMPLETED"].includes(order.status || "")
    );
    
    if (quickOrders.length > 0) {
      quickWins.push({
        id: "quick-completion",
        title: "Quick Completion Orders",
        description: `${quickOrders.length} orders that can be finished in 2 hours or less`,
        estimatedTime: quickOrders.reduce((sum, order) => sum + order.estimatedHours, 0),
        revenue: quickOrders.reduce((sum, order) => sum + order.price, 0),
        priority: "HIGH",
        category: "QUICK_COMPLETION",
        orders: quickOrders.slice(0, 5)
      });
    }

    // High Value Orders (≥ $300)
    const highValueOrders = orders.filter(
      order => order.price >= 300 && 
      !["PICKED_UP", "COMPLETED"].includes(order.status || "")
    );
    
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

    // Overdue Orders
    const now = new Date();
    const overdueOrders = orders.filter(
      order => new Date(order.dueDate) < now && 
      !["PICKED_UP", "COMPLETED"].includes(order.status || "")
    );
    
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

    // Batch Ready Orders (same type, similar requirements)
    const frameOrders = orders.filter(
      order => order.orderType === "FRAME" && 
      order.status === "MATERIALS_ARRIVED"
    );
    
    if (frameOrders.length >= 3) {
      quickWins.push({
        id: "batch-frames",
        title: "Batch Frame Processing",
        description: `${frameOrders.length} frames ready for cutting`,
        estimatedTime: frameOrders.reduce((sum, order) => sum + order.estimatedHours, 0) * 0.8, // 20% efficiency gain
        revenue: frameOrders.reduce((sum, order) => sum + order.price, 0),
        priority: "MEDIUM",
        category: "BATCH_READY",
        orders: frameOrders.slice(0, 5)
      });
    }

    return quickWins.sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
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
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const totalPotentialRevenue = quickWins.reduce((sum, win) => sum + win.revenue, 0);
  const totalEstimatedTime = quickWins.reduce((sum, win) => sum + win.estimatedTime, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Zap className="h-6 w-6 text-green-600" />
          <h1 className="text-2xl font-bold">Quick Wins Dashboard</h1>
        </div>
        <Link href="/">
          <Button variant="outline">Back to Board</Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Quick Win Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quickWins.length}</div>
            <p className="text-xs text-muted-foreground">Active opportunities</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Potential Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPotentialRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From quick wins</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Estimated Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(totalEstimatedTime)}h</div>
            <p className="text-xs text-muted-foreground">Total time needed</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Wins */}
      {quickWins.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Quick Wins Available</h3>
              <p>All current orders are either completed or require more complex processing.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {quickWins.map((win) => (
            <Card key={win.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getCategoryIcon(win.category)}
                    <CardTitle className="text-lg">{win.title}</CardTitle>
                  </div>
                  <Badge variant="secondary" className={getCategoryColor(win.category)}>
                    {win.priority}
                  </Badge>
                </div>
                <CardDescription>{win.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{Math.round(win.estimatedTime)}h total</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>${win.revenue.toLocaleString()}</span>
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
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Button } from '../components/ui/button';
import { OrderWithDetails } from '@shared/schema';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  DollarSign, 
  Package, 
  Target,
  Activity,
  RefreshCw
} from 'lucide-react';

export default function Analytics() {
  const [refreshKey, setRefreshKey] = useState(0);

  // Manual refresh only - no auto refresh
  const { data: orders = [], isLoading, refetch } = useQuery<OrderWithDetails[]>({
    queryKey: ["/api/orders", refreshKey],
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: false, // Disable auto refresh
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  // Simplified analytics calculation
  const calculateAnalytics = () => {
    const validOrders = orders.filter(order => order && order.id);

    const activeOrders = validOrders.filter(order => 
      !['PICKED_UP', 'COMPLETED'].includes(order.status || '')
    );

    const completedOrders = validOrders.filter(order => 
      ['PICKED_UP', 'COMPLETED'].includes(order.status || '')
    );

    const now = new Date();
    const overdueOrders = activeOrders.filter(order => {
      try {
        return order.dueDate && new Date(order.dueDate) < now;
      } catch (e) {
        return false;
      }
    });

    const totalRevenue = completedOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    const averageOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

    // Status distribution
    const statusCounts = validOrders.reduce((acc, order) => {
      const status = order.status || 'UNKNOWN';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalHours = validOrders.reduce((sum, order) => sum + (order.estimatedHours || 0), 0);
    const completionRate = validOrders.length > 0 ? (completedOrders.length / validOrders.length) * 100 : 0;

    return {
      totalOrders: validOrders.length,
      activeOrders: activeOrders.length,
      completedOrders: completedOrders.length,
      overdueOrders: overdueOrders.length,
      totalRevenue,
      averageOrderValue,
      completionRate,
      statusCounts,
      totalHours,
      averageHours: validOrders.length > 0 ? totalHours / validOrders.length : 0
    };
  };

  const analytics = calculateAnalytics();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground mt-2">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Performance insights and business metrics</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{analytics.totalOrders}</div>
                <div className="text-sm text-muted-foreground">Total Orders</div>
                <div className="text-xs text-blue-400 mt-1">
                  {analytics.activeOrders} active
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">${analytics.totalRevenue.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Revenue</div>
                <div className="text-xs text-green-400 mt-1">
                  ${analytics.averageOrderValue.toFixed(0)} avg
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{analytics.totalHours.toFixed(1)}h</div>
                <div className="text-sm text-muted-foreground">Total Workload</div>
                <div className="text-xs text-purple-400 mt-1">
                  {analytics.averageHours.toFixed(1)}h avg
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{analytics.completionRate.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Completion Rate</div>
                <div className="text-xs text-orange-400 mt-1">
                  {analytics.completedOrders} completed
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Order Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(analytics.statusCounts).map(([status, count]) => {
                const percentage = (count / analytics.totalOrders) * 100;
                const statusLabels: Record<string, string> = {
                  'ORDER_PROCESSED': 'Order Processed',
                  'MATERIALS_ORDERED': 'Materials Ordered',
                  'MATERIALS_ARRIVED': 'Materials Arrived',
                  'FRAME_CUT': 'Frame Cut',
                  'MAT_CUT': 'Mat Cut',
                  'PREPPED': 'Prepped',
                  'COMPLETED': 'Completed',
                  'PICKED_UP': 'Picked Up'
                };

                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">{statusLabels[status] || status}</span>
                      <span className="text-sm font-medium">{count} ({percentage.toFixed(1)}%)</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Current Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Active Orders</span>
              <Badge variant="secondary">{analytics.activeOrders}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Completed Orders</span>
              <Badge className="bg-green-100 text-green-800">{analytics.completedOrders}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Overdue Orders</span>
              <Badge variant={analytics.overdueOrders > 0 ? "destructive" : "secondary"}>
                {analytics.overdueOrders}
              </Badge>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Completion Progress</span>
                <span className="text-sm font-medium">{analytics.completionRate.toFixed(1)}%</span>
              </div>
              <Progress value={analytics.completionRate} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
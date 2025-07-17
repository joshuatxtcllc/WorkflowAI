import { useQuery } from '@tanstack/react-query';

import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { OrderWithDetails } from '@shared/schema';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  DollarSign, 
  Package, 
  Users, 
  Calendar,
  Target,
  Activity
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface WorkloadMetrics {
  totalOrders: number;
  totalHours: number;
  averageOrderValue: number;
  completionRate: number;
  pendingOrders: number;
  overdueOrders: number;
}

export default function Analytics() {
  const { data: orders = [] } = useQuery<OrderWithDetails[]>({
    queryKey: ["/api/orders"],
  });

  const { data: workloadMetrics } = useQuery<WorkloadMetrics>({
    queryKey: ["/api/analytics/workload"],
  });

  // Calculate analytics from order data
  const calculateAnalytics = () => {
    const now = new Date();
    const last30Days = subDays(now, 30);
    const last7Days = subDays(now, 7);

    const recentOrders = orders.filter(order => 
      new Date(order.createdAt) >= last30Days
    );

    const weeklyOrders = orders.filter(order => 
      new Date(order.createdAt) >= last7Days
    );

    const completedOrders = orders.filter(order => 
      order.status === 'PICKED_UP'
    );

    const overdueOrders = orders.filter(order => 
      new Date(order.dueDate) < now && order.status !== 'PICKED_UP'
    );

    const totalRevenue = completedOrders.reduce((sum, order) => sum + order.price, 0);
    const averageOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

    // Status distribution
    const statusCounts = orders.reduce((acc, order) => {
      const status = order.status || 'UNKNOWN';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Order type distribution
    const typeCounts = orders.reduce((acc, order) => {
      acc[order.orderType] = (acc[order.orderType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalOrders: orders.length,
      recentOrders: recentOrders.length,
      weeklyOrders: weeklyOrders.length,
      completedOrders: completedOrders.length,
      overdueOrders: overdueOrders.length,
      totalRevenue,
      averageOrderValue,
      completionRate: orders.length > 0 ? (completedOrders.length / orders.length) * 100 : 0,
      statusCounts,
      typeCounts,
      averageHours: orders.length > 0 ? orders.reduce((sum, order) => sum + order.estimatedHours, 0) / orders.length : 0
    };
  };

  const analytics = calculateAnalytics();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Performance insights and business metrics</p>
        </div>
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
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">${analytics.averageOrderValue.toFixed(0)}</div>
                <div className="text-sm text-muted-foreground">Avg Order Value</div>
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
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Orders This Week</span>
              <Badge variant="secondary">{analytics.weeklyOrders}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Orders This Month</span>
              <Badge variant="secondary">{analytics.recentOrders}</Badge>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Workload Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Average Hours per Order</span>
                <span className="text-sm font-medium">{analytics.averageHours.toFixed(1)}h</span>
              </div>
              <Progress value={(analytics.averageHours / 10) * 100} className="h-2" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Completion Progress</span>
                <span className="text-sm font-medium">{analytics.completionRate.toFixed(1)}%</span>
              </div>
              <Progress value={analytics.completionRate} className="h-2" />
            </div>

            {workloadMetrics && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Total Estimated Hours</span>
                  <span className="text-sm font-medium">{workloadMetrics.totalHours}h</span>
                </div>
                <Progress value={(workloadMetrics.totalHours / 500) * 100} className="h-2" />
              </div>
            )}
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
              <Package className="h-5 w-5" />
              Order Type Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(analytics.typeCounts).map(([type, count]) => {
                const percentage = (count / analytics.totalOrders) * 100;
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">{type}</span>
                      <span className="text-sm font-medium">{count} ({percentage.toFixed(1)}%)</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Button } from '../components/ui/button';
import { 
  Activity, 
  AlertTriangle, 
  BarChart3, 
  Clock, 
  DollarSign, 
  Package, 
  TrendingUp, 
  Users,
  RefreshCw
} from 'lucide-react';

interface ComprehensiveMetrics {
  overview: {
    totalOrders: number;
    activeOrders: number;
    completedOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    totalCustomers: number;
  };
  performance: {
    onTimePercentage: number;
    overdueOrders: number;
    onTimeOrders: number;
  };
  production: {
    totalHours: number;
    averageHours: number;
    materialsWaiting: number;
    urgentOrders: number;
  };
  workflow: {
    statusCounts: Record<string, number>;
  };
  trends: {
    weeklyOrders: number;
    monthlyOrders: number;
  };
  alerts: Array<{
    id: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    content: string;
  }>;
  timestamp: string;
}

export default function ComprehensiveAnalytics() {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: metrics, isLoading, refetch } = useQuery<ComprehensiveMetrics>({
    queryKey: ['/api/analytics/comprehensive', refreshKey],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: false, // Manual refresh only
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground mt-2">Loading comprehensive analytics...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-6">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-warning mx-auto" />
          <p className="text-muted-foreground mt-2">Unable to load analytics data</p>
          <Button onClick={handleRefresh} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Comprehensive Analytics</h1>
          <p className="text-muted-foreground">Complete business intelligence dashboard</p>
        </div>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Alerts Section */}
      {metrics.alerts.length > 0 && (
        <Card className="border-l-4 border-l-red-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.alerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">{alert.title}</h4>
                    <p className="text-sm text-muted-foreground">{alert.content}</p>
                  </div>
                  <Badge variant={getSeverityColor(alert.severity)}>
                    {alert.severity.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{metrics.overview.totalOrders}</div>
                <div className="text-sm text-muted-foreground">Total Orders</div>
                <div className="text-xs text-blue-400">{metrics.overview.activeOrders} active</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">${metrics.overview.totalRevenue.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Revenue</div>
                <div className="text-xs text-green-400">${metrics.overview.averageOrderValue.toFixed(0)} avg</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{metrics.overview.totalCustomers}</div>
                <div className="text-sm text-muted-foreground">Total Customers</div>
                <div className="text-xs text-purple-400">Active base</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{metrics.performance.onTimePercentage.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">On-Time Rate</div>
                <div className="text-xs text-orange-400">{metrics.performance.onTimeOrders} on time</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance and Production */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Completed Orders</span>
              <Badge className="bg-green-100 text-green-800">{metrics.overview.completedOrders}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Overdue Orders</span>
              <Badge variant={metrics.performance.overdueOrders > 0 ? "destructive" : "secondary"}>
                {metrics.performance.overdueOrders}
              </Badge>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">On-Time Performance</span>
                <span className="text-sm font-medium">{metrics.performance.onTimePercentage.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.performance.onTimePercentage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Production Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Workload Hours</span>
              <Badge variant="secondary">{metrics.production.totalHours.toFixed(1)}h</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Materials Waiting</span>
              <Badge variant={metrics.production.materialsWaiting > 5 ? "destructive" : "secondary"}>
                {metrics.production.materialsWaiting}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Urgent Orders</span>
              <Badge variant={metrics.production.urgentOrders > 3 ? "destructive" : "secondary"}>
                {metrics.production.urgentOrders}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Workflow Status Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(metrics.workflow.statusCounts).map(([status, count]) => {
              const percentage = (count / metrics.overview.totalOrders) * 100;
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
                <div key={status} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{statusLabels[status] || status}</span>
                    <span className="text-sm text-muted-foreground">{count} ({percentage.toFixed(1)}%)</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">This Week</h4>
              <div className="text-2xl font-bold text-blue-600">{metrics.trends.weeklyOrders}</div>
              <p className="text-sm text-muted-foreground">New orders</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">This Month</h4>
              <div className="text-2xl font-bold text-green-600">{metrics.trends.monthlyOrders}</div>
              <p className="text-sm text-muted-foreground">New orders</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data timestamp */}
      <div className="text-center text-sm text-muted-foreground">
        Last updated: {new Date(metrics.timestamp).toLocaleString()}
      </div>
    </div>
  );
}
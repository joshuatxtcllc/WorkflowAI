import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Package,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Calendar,
  Zap
} from 'lucide-react';
import { 
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface ComprehensiveMetrics {
  overview: {
    totalOrders: number;
    activeOrders: number;
    completedOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    totalCustomers: number;
    newCustomersThisMonth: number;
    repeatCustomers: number;
  };
  performance: {
    onTimePercentage: number;
    overdueOrders: number;
    averageCompletionDays: number;
    onTimeOrders: number;
    delayedOrders: number;
  };
  production: {
    totalHours: number;
    averageHours: number;
    averageComplexity: number;
    materialsWaiting: number;
    readyToStart: number;
    inProduction: number;
    urgentOrders: number;
    highPriorityOrders: number;
  };
  revenue: {
    total: number;
    weekly: number;
    monthly: number;
    yearly: number;
    averagePerOrder: number;
    averagePerCustomer: number;
  };
  trends: {
    weeklyOrders: number;
    monthlyOrders: number;
    dailyCompletions: Array<{ date: string; count: number }>;
    weeklyTrends: Array<{ week: string; orders: number; revenue: number }>;
    growthRate: number;
  };
  workflow: {
    statusCounts: Record<string, number>;
    bottlenecks: Array<{
      stage: string;
      count: number;
      percentage: number;
      severity: 'low' | 'medium' | 'high' | 'critical';
      impact: string;
    }>;
    efficiency: number;
    stageAverages: Record<string, { averageDays: number; count: number }>;
  };
  alerts: Array<{
    id: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    content: string;
    timestamp: Date;
    metadata: any;
  }>;
  timestamp: string;
}

const COLORS = {
  primary: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4'
};

const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];

export default function ComprehensiveAnalytics() {
  const { data: metrics, isLoading } = useQuery<ComprehensiveMetrics>({
    queryKey: ['/api/analytics/comprehensive'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

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
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive insights into your frame shop operations</p>
        </div>
        <div className="text-sm text-muted-foreground">
          Last updated: {new Date(metrics.timestamp).toLocaleString()}
        </div>
      </div>

      {/* Alerts Banner */}
      {metrics.alerts.length > 0 && (
        <div className="grid gap-4">
          {metrics.alerts.slice(0, 3).map((alert) => (
            <Card key={alert.id} className="border-l-4 border-l-destructive">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-destructive">{alert.title}</h4>
                      <p className="text-sm text-muted-foreground">{alert.content}</p>
                    </div>
                  </div>
                  <Badge variant={getSeverityColor(alert.severity)}>{alert.severity}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Key Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.revenue.total.toLocaleString()}</div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              {metrics.trends.growthRate >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span>{Math.abs(metrics.trends.growthRate).toFixed(1)}% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.overview.activeOrders}</div>
            <div className="text-xs text-muted-foreground">
              {metrics.production.urgentOrders} urgent, {metrics.production.materialsWaiting} waiting materials
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On-Time Performance</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.performance.onTimePercentage.toFixed(1)}%</div>
            <Progress value={metrics.performance.onTimePercentage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.overview.totalCustomers}</div>
            <div className="text-xs text-muted-foreground">
              {metrics.overview.newCustomersThisMonth} new this month
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="production">Production</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Completion Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">On-Time Deliveries</span>
                    <span className="text-sm font-medium">{metrics.performance.onTimeOrders}</span>
                  </div>
                  <Progress value={(metrics.performance.onTimeOrders / metrics.overview.completedOrders) * 100} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Average Completion</span>
                    <span className="text-sm font-medium">{metrics.performance.averageCompletionDays.toFixed(1)} days</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Overdue Orders</span>
                    <span className="text-sm font-medium text-destructive">{metrics.performance.overdueOrders}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Daily Completions (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={metrics.trends.dailyCompletions}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(date) => new Date(date).getMonth() + 1 + '/' + new Date(date).getDate()} />
                    <YAxis />
                    <Tooltip labelFormatter={(date) => new Date(date).toLocaleDateString()} />
                    <Area type="monotone" dataKey="count" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Weekly</span>
                  <span className="font-medium">${metrics.revenue.weekly.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Monthly</span>
                  <span className="font-medium">${metrics.revenue.monthly.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Yearly</span>
                  <span className="font-medium">${metrics.revenue.yearly.toLocaleString()}</span>
                </div>
                <hr />
                <div className="flex items-center justify-between">
                  <span>Average per Order</span>
                  <span className="font-medium">${metrics.revenue.averagePerOrder.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Average per Customer</span>
                  <span className="font-medium">${metrics.revenue.averagePerCustomer.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Weekly Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={metrics.trends.weeklyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                    <Line type="monotone" dataKey="revenue" stroke={COLORS.success} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workflow" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Order Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={Object.entries(metrics.workflow.statusCounts).map(([status, count]) => ({
                        name: status.replace('_', ' '),
                        value: count
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.entries(metrics.workflow.statusCounts).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Workflow Bottlenecks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {metrics.workflow.bottlenecks.length > 0 ? (
                  metrics.workflow.bottlenecks.map((bottleneck, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium capitalize">{bottleneck.stage}</span>
                        <Badge variant={getSeverityColor(bottleneck.severity)}>{bottleneck.severity}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{bottleneck.impact}</p>
                      <div className="flex items-center justify-between mt-2 text-xs">
                        <span>{bottleneck.count} orders</span>
                        <span>{bottleneck.percentage.toFixed(1)}% of active</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No significant bottlenecks detected</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Order & Revenue Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.trends.weeklyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="orders" fill={COLORS.primary} name="Orders" />
                    <Bar yAxisId="right" dataKey="revenue" fill={COLORS.success} name="Revenue ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="production" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Production Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Total Hours</span>
                    <span className="text-sm font-medium">{metrics.production.totalHours}h</span>
                  </div>
                  <Progress value={(metrics.production.totalHours / 500) * 100} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Average Hours/Order</span>
                    <span className="text-sm font-medium">{metrics.production.averageHours.toFixed(1)}h</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Average Complexity</span>
                    <span className="text-sm font-medium">{metrics.production.averageComplexity.toFixed(1)}/10</span>
                  </div>
                  <Progress value={metrics.production.averageComplexity * 10} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Production Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Ready to Start</span>
                  <Badge variant="default">{metrics.production.readyToStart}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">In Production</span>
                  <Badge variant="default">{metrics.production.inProduction}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Materials Waiting</span>
                  <Badge variant="secondary">{metrics.production.materialsWaiting}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Priority Orders
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Urgent Priority</span>
                  <Badge variant="destructive">{metrics.production.urgentOrders}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">High Priority</span>
                  <Badge variant="default">{metrics.production.highPriorityOrders}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Workflow Efficiency</span>
                  <span className="text-sm font-medium">{metrics.workflow.efficiency.toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
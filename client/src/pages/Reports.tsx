import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigation } from '../components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { OrderWithDetails } from '@shared/schema';
import { 
  FileText, 
  Download, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Package, 
  Clock,
  Users,
  BarChart3
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay, subDays, subWeeks, subMonths } from 'date-fns';

export default function Reports() {
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data: orders = [] } = useQuery<OrderWithDetails[]>({
    queryKey: ["/api/orders"],
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
  });

  const getDateRange = () => {
    switch (reportType) {
      case 'daily':
        return {
          start: startOfDay(selectedDate),
          end: endOfDay(selectedDate)
        };
      case 'weekly':
        return {
          start: startOfWeek(selectedDate),
          end: endOfWeek(selectedDate)
        };
      case 'monthly':
        return {
          start: startOfMonth(selectedDate),
          end: endOfMonth(selectedDate)
        };
    }
  };

  const generateReport = () => {
    const { start, end } = getDateRange();
    
    const periodOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= start && orderDate <= end;
    });

    const completedOrders = periodOrders.filter(order => order.status === 'PICKED_UP');
    const totalRevenue = completedOrders.reduce((sum, order) => sum + order.price, 0);
    const averageOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;
    
    // Order type breakdown
    const typeBreakdown = periodOrders.reduce((acc, order) => {
      acc[order.orderType] = (acc[order.orderType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Status breakdown
    const statusBreakdown = periodOrders.reduce((acc, order) => {
      const status = order.status || 'UNKNOWN';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Performance metrics
    const onTimeOrders = completedOrders.filter(order => 
      new Date(order.pickedUpAt || order.updatedAt || order.createdAt) <= new Date(order.dueDate)
    );
    const onTimeRate = completedOrders.length > 0 ? (onTimeOrders.length / completedOrders.length) * 100 : 0;

    return {
      period: `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`,
      totalOrders: periodOrders.length,
      completedOrders: completedOrders.length,
      totalRevenue,
      averageOrderValue,
      onTimeRate,
      typeBreakdown,
      statusBreakdown,
      orders: periodOrders
    };
  };

  const report = generateReport();

  const compareWithPrevious = () => {
    let previousStart, previousEnd;
    
    switch (reportType) {
      case 'daily':
        previousStart = startOfDay(subDays(selectedDate, 1));
        previousEnd = endOfDay(subDays(selectedDate, 1));
        break;
      case 'weekly':
        previousStart = startOfWeek(subWeeks(selectedDate, 1));
        previousEnd = endOfWeek(subWeeks(selectedDate, 1));
        break;
      case 'monthly':
        previousStart = startOfMonth(subMonths(selectedDate, 1));
        previousEnd = endOfMonth(subMonths(selectedDate, 1));
        break;
    }

    const previousOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= previousStart && orderDate <= previousEnd;
    });

    const previousCompleted = previousOrders.filter(order => order.status === 'PICKED_UP');
    const previousRevenue = previousCompleted.reduce((sum, order) => sum + order.price, 0);

    return {
      orders: previousOrders.length,
      completed: previousCompleted.length,
      revenue: previousRevenue
    };
  };

  const previous = compareWithPrevious();

  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const exportReport = () => {
    const reportData = {
      reportType,
      period: report.period,
      summary: {
        totalOrders: report.totalOrders,
        completedOrders: report.completedOrders,
        totalRevenue: report.totalRevenue,
        averageOrderValue: report.averageOrderValue,
        onTimeRate: report.onTimeRate
      },
      breakdown: {
        orderTypes: report.typeBreakdown,
        statuses: report.statusBreakdown
      },
      orders: report.orders.map(order => ({
        trackingId: order.trackingId,
        customer: order.customer?.name,
        type: order.orderType,
        status: order.status,
        price: order.price,
        dueDate: order.dueDate,
        createdAt: order.createdAt
      }))
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}-report-${format(selectedDate, 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <Navigation />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Business Reports</h1>
          <p className="text-muted-foreground">Generate detailed performance and financial reports</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={reportType} onValueChange={(value: 'daily' | 'weekly' | 'monthly') => setReportType(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily Report</SelectItem>
              <SelectItem value="weekly">Weekly Report</SelectItem>
              <SelectItem value="monthly">Monthly Report</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={exportReport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Report Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report
          </CardTitle>
          <p className="text-muted-foreground">{report.period}</p>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{report.totalOrders}</div>
                <div className="text-sm text-muted-foreground">Total Orders</div>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
            <div className="mt-2 flex items-center gap-1">
              <Badge variant={getPercentageChange(report.totalOrders, previous.orders) >= 0 ? "default" : "destructive"}>
                {getPercentageChange(report.totalOrders, previous.orders) >= 0 ? '+' : ''}
                {getPercentageChange(report.totalOrders, previous.orders).toFixed(1)}%
              </Badge>
              <span className="text-xs text-muted-foreground">vs previous {reportType}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">${report.totalRevenue.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Revenue</div>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
            <div className="mt-2 flex items-center gap-1">
              <Badge variant={getPercentageChange(report.totalRevenue, previous.revenue) >= 0 ? "default" : "destructive"}>
                {getPercentageChange(report.totalRevenue, previous.revenue) >= 0 ? '+' : ''}
                {getPercentageChange(report.totalRevenue, previous.revenue).toFixed(1)}%
              </Badge>
              <span className="text-xs text-muted-foreground">vs previous {reportType}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">${report.averageOrderValue.toFixed(0)}</div>
                <div className="text-sm text-muted-foreground">Avg Order Value</div>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
            <div className="mt-2">
              <Badge variant="secondary">
                {report.completedOrders} completed
              </Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{report.onTimeRate.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">On-Time Rate</div>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
            <div className="mt-2">
              <Badge variant={report.onTimeRate >= 90 ? "default" : report.onTimeRate >= 75 ? "secondary" : "destructive"}>
                {report.onTimeRate >= 90 ? 'Excellent' : report.onTimeRate >= 75 ? 'Good' : 'Needs Improvement'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Order Type Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(report.typeBreakdown).map(([type, count]) => {
                const percentage = (count / report.totalOrders) * 100;
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{type}</span>
                      <span className="text-sm text-muted-foreground">
                        {count} orders ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
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
              Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(report.statusBreakdown).map(([status, count]) => {
                const percentage = (count / report.totalOrders) * 100;
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
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{statusLabels[status] || status}</span>
                      <span className="text-sm text-muted-foreground">
                        {count} orders ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Orders in This Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          {report.orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No orders found for this period
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Order ID</th>
                    <th className="text-left py-2">Customer</th>
                    <th className="text-left py-2">Type</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-right py-2">Price</th>
                    <th className="text-left py-2">Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {report.orders.slice(0, 10).map(order => (
                    <tr key={order.id} className="border-b">
                      <td className="py-2">#{order.trackingId}</td>
                      <td className="py-2">{order.customer?.name || 'Unknown'}</td>
                      <td className="py-2">{order.orderType}</td>
                      <td className="py-2">
                        <Badge variant="secondary">{order.status}</Badge>
                      </td>
                      <td className="py-2 text-right">${order.price.toLocaleString()}</td>
                      <td className="py-2">{format(new Date(order.dueDate), 'MMM d, yyyy')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {report.orders.length > 10 && (
                <div className="text-center py-4 text-muted-foreground">
                  Showing 10 of {report.orders.length} orders
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
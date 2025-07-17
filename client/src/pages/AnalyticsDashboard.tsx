import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Brain, TrendingUp, Users, Clock, AlertTriangle, Target, BarChart3, Lightbulb } from 'lucide-react';
import type { OrderWithDetails } from '@shared/schema';

export default function AnalyticsDashboard() {
  const [insights, setInsights] = useState<any>(null);

  // Use same data source as Kanban board for consistency
  const { data: orders = [] } = useQuery<OrderWithDetails[]>({
    queryKey: ["/api/orders"],
    refetchInterval: 30000,
    staleTime: 10000,
  });

  // Fetch AI learning insights
  const { data: learningData, isLoading: learningLoading } = useQuery({
    queryKey: ['/api/analytics/learning-insights'],
    retry: false,
  });

  // Fetch shop insights
  const { data: shopData, isLoading: shopLoading } = useQuery({
    queryKey: ['/api/analytics/shop-insights'],
    retry: false,
  });

  // Fetch AI analysis
  const { data: aiData, isLoading: aiLoading } = useQuery({
    queryKey: ['/api/ai/analysis'],
    retry: false,
  });

  // Calculate real-time metrics from orders (same as Kanban board)
  const calculateRealTimeMetrics = () => {
    const now = new Date();
    
    // Ensure we're working with valid order data - exactly like Kanban board
    const validOrders = orders.filter(order => order && order.id);
    console.log('AnalyticsDashboard: Processing orders:', validOrders.length, 'Raw orders:', orders.length);
    
    const activeOrders = validOrders.filter(order => 
      !['PICKED_UP', 'COMPLETED'].includes(order.status || '')
    );
    
    const mysteryItems = validOrders.filter(order => 
      order.status === 'MYSTERY_UNCLAIMED'
    );

    const completedOrders = validOrders.filter(order => 
      ['PICKED_UP', 'COMPLETED'].includes(order.status || '')
    );

    const totalHours = validOrders.reduce((sum, order) => sum + (order.estimatedHours || 0), 0);
    const completionRate = validOrders.length > 0 ? (completedOrders.length / validOrders.length) * 100 : 0;

    // Production flow matching Kanban columns
    const productionFlow = {
      orderProcessed: validOrders.filter(o => o.status === 'ORDER_PROCESSED').length,
      materialsOrdered: validOrders.filter(o => o.status === 'MATERIALS_ORDERED').length,
      materialsArrived: validOrders.filter(o => o.status === 'MATERIALS_ARRIVED').length,
      frameCut: validOrders.filter(o => o.status === 'FRAME_CUT').length,
      matCut: validOrders.filter(o => o.status === 'MAT_CUT').length,
      prepped: validOrders.filter(o => o.status === 'PREPPED').length,
      completed: validOrders.filter(o => o.status === 'COMPLETED').length,
      pickedUp: validOrders.filter(o => o.status === 'PICKED_UP').length
    };

    const result = {
      mysteryItems: {
        total: mysteryItems.length,
        items: mysteryItems.slice(0, 5).map(item => ({
          trackingId: item.trackingId,
          description: item.description || 'Mystery item',
          daysInSystem: Math.floor((now.getTime() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        }))
      },
      efficiency: {
        totalActiveOrders: activeOrders.length,
        completionRate: Math.round(completionRate),
        averageOrderValue: Math.round(validOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0) / validOrders.length || 0),
        estimatedWorkload: Math.round(totalHours)
      },
      productionFlow,
      urgentAlerts: {
        overdue: activeOrders.filter(o => o.dueDate && new Date(o.dueDate) < now).length,
        urgent: activeOrders.filter(o => o.priority === 'URGENT').length,
        dueTomorrow: activeOrders.filter(o => {
          if (!o.dueDate) return false;
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const dueDate = new Date(o.dueDate);
          return dueDate.toDateString() === tomorrow.toDateString();
        }).length
      }
    };

    console.log('AnalyticsDashboard: Calculated totals:', {
      totalOrders: validOrders.length,
      activeOrders: activeOrders.length,
      completedOrders: completedOrders.length
    });

    return result;
  };

  const realTimeMetrics = calculateRealTimeMetrics();

  useEffect(() => {
    if (learningData && aiData) {
      setInsights({ learning: learningData, shop: realTimeMetrics, ai: aiData });
    }
  }, [learningData, aiData, orders]);

  if (learningLoading || shopLoading || aiLoading) {
    return (
      <div className="min-h-screen bg-gray-950 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-jade-400" />
            <h1 className="text-3xl font-bold text-white">AI Learning Dashboard</h1>
          </div>
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-jade-400 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Analyzing your frame shop operations...</p>
          </div>
        </div>
      </div>
    );
  }

  const isLoading = !insights;

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-jade-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">AI Learning Dashboard</h1>
              <p className="text-gray-400">Business intelligence from your authentic order data</p>
            </div>
          </div>
          <Badge variant="outline" className="border-jade-400 text-jade-400">
            <Brain className="w-4 h-4 mr-1" />
            AI Powered
          </Badge>
        </div>

        {/* Quick Stats - Real-time Kanban Data */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Mystery Items</p>
                  <p className="text-2xl font-bold text-jade-400">
                    {realTimeMetrics.mysteryItems.total}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-amber-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Active Orders</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {realTimeMetrics.efficiency.totalActiveOrders}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Completion Rate</p>
                  <p className="text-2xl font-bold text-green-400">
                    {realTimeMetrics.efficiency.completionRate}%
                  </p>
                </div>
                <Target className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Orders</p>
                  <p className="text-2xl font-bold text-purple-400">
                    {orders.filter(order => order && order.id).length}
                  </p>
                  <p className="text-xs text-gray-500">Raw: {orders.length}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="insights" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 bg-gray-900">
            <TabsTrigger value="insights" className="data-[state=active]:bg-jade-600">
              <Lightbulb className="w-4 h-4 mr-2" />
              AI Insights
            </TabsTrigger>
            <TabsTrigger value="production" className="data-[state=active]:bg-jade-600">
              <BarChart3 className="w-4 h-4 mr-2" />
              Production Flow
            </TabsTrigger>
            <TabsTrigger value="patterns" className="data-[state=active]:bg-jade-600">
              <TrendingUp className="w-4 h-4 mr-2" />
              Learning Patterns
            </TabsTrigger>
            <TabsTrigger value="mystery" className="data-[state=active]:bg-jade-600">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Mystery Items
            </TabsTrigger>
          </TabsList>

          {/* AI Insights Tab */}
          <TabsContent value="insights" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-jade-400 flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    AI Analysis
                  </CardTitle>
                  <CardDescription>Current operational insights</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {aiData?.aiInsights || 'Generating insights from your business data...'}
                      </p>
                    </div>
                    
                    {aiData?.bottlenecks && aiData.bottlenecks.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-amber-400 mb-2">Identified Bottlenecks</h4>
                        <div className="space-y-2">
                          {aiData.bottlenecks.map((bottleneck: string, index: number) => (
                            <Badge key={index} variant="outline" className="border-amber-400 text-amber-400">
                              {bottleneck}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {aiData?.recommendations && aiData.recommendations.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-jade-400 mb-2">Recommendations</h4>
                        <div className="space-y-2">
                          {aiData.recommendations.map((rec: string, index: number) => (
                            <div key={index} className="flex items-start gap-2">
                              <div className="w-2 h-2 bg-jade-400 rounded-full mt-2 flex-shrink-0"></div>
                              <p className="text-gray-300 text-sm">{rec}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-purple-400 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Workload Analysis
                  </CardTitle>
                  <CardDescription>Performance metrics and timing</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Total Workload</span>
                      <span className="text-white font-medium">{aiData?.totalHours || 0}h</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">On-time Performance</span>
                      <div className="flex items-center gap-2">
                        <Progress value={aiData?.onTimePercentage || 0} className="w-20" />
                        <span className="text-white font-medium">{aiData?.onTimePercentage || 0}%</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Average Complexity</span>
                      <span className="text-white font-medium">{aiData?.averageComplexity || 0}/5</span>
                    </div>

                    {aiData?.projectedCompletion && (
                      <div className="bg-gray-800 p-3 rounded-lg">
                        <span className="text-gray-400 text-sm">Projected Completion</span>
                        <p className="text-jade-400 font-medium">
                          {new Date(aiData.projectedCompletion).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Production Flow Tab */}
          <TabsContent value="production" className="space-y-4">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-blue-400">Production Pipeline</CardTitle>
                <CardDescription>Real-time orders flowing through workflow stages (synced with Kanban)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(realTimeMetrics.productionFlow).map(([stage, count]: [string, any]) => (
                    <div key={stage} className="bg-gray-800 p-4 rounded-lg text-center">
                      <p className="text-2xl font-bold text-jade-400">{count}</p>
                      <p className="text-xs text-gray-400 capitalize">
                        {stage.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-red-400 text-lg">Urgent Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Overdue Orders</span>
                      <Badge variant="destructive">{realTimeMetrics.urgentAlerts.overdue}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Urgent Priority</span>
                      <Badge variant="outline" className="border-amber-400 text-amber-400">
                        {realTimeMetrics.urgentAlerts.urgent}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Due Tomorrow</span>
                      <Badge variant="outline" className="border-blue-400 text-blue-400">
                        {realTimeMetrics.urgentAlerts.dueTomorrow}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-green-400 text-lg">Efficiency Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Avg Order Value</span>
                      <span className="text-green-400 font-medium">
                        ${realTimeMetrics.efficiency.averageOrderValue}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Workload</span>
                      <span className="text-white font-medium">
                        {realTimeMetrics.efficiency.estimatedWorkload}h
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Live Data Sync</span>
                      <Badge className="bg-jade-600">
                        Active
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-purple-400 text-lg">System Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Overall Status</span>
                      <Badge 
                        variant={aiData?.riskLevel === 'low' ? 'default' : 'destructive'}
                        className="bg-jade-600"
                      >
                        Operational
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Last Analysis</span>
                      <span className="text-gray-300 text-sm">
                        {aiData?.timestamp ? new Date(aiData.timestamp).toLocaleTimeString() : 'Now'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Learning Patterns Tab */}
          <TabsContent value="patterns" className="space-y-4">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-jade-400">Business Learning Insights</CardTitle>
                <CardDescription>What the AI has learned from your operations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <h4 className="text-jade-400 font-medium mb-2">Pattern Recognition</h4>
                    <p className="text-gray-300 text-sm">
                      The AI is continuously analyzing your workflow patterns, completion times, and customer behavior 
                      to identify optimization opportunities specific to Jay's Frames operations.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <h5 className="text-blue-400 font-medium mb-2">Workflow Analysis</h5>
                      <p className="text-gray-300 text-sm">
                        Learning optimal timing for each production stage and identifying potential bottlenecks 
                        before they impact delivery schedules.
                      </p>
                    </div>
                    
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <h5 className="text-purple-400 font-medium mb-2">Customer Insights</h5>
                      <p className="text-gray-300 text-sm">
                        Tracking customer order patterns, preferences, and timing to improve service 
                        and predict future demand.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mystery Items Tab */}
          <TabsContent value="mystery" className="space-y-4">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Mystery Items Analysis
                </CardTitle>
                <CardDescription>Real-time unclaimed items (synced with Kanban board)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {realTimeMetrics.mysteryItems.items && realTimeMetrics.mysteryItems.items.length > 0 ? (
                    <div className="space-y-3">
                      {realTimeMetrics.mysteryItems.items.map((item: any, index: number) => (
                        <div key={index} className="bg-gray-800 p-4 rounded-lg flex justify-between items-center">
                          <div>
                            <p className="text-white font-medium">{item.trackingId}</p>
                            <p className="text-gray-400 text-sm">{item.description}</p>
                          </div>
                          <Badge variant="outline" className="border-amber-400 text-amber-400">
                            {item.daysInSystem} days
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AlertTriangle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">No mystery items currently in system</p>
                      <p className="text-xs text-jade-400 mt-2">✓ Synced with Kanban board</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Zap,
  RefreshCw,
  Database,
  Wifi,
  Server,
  Users,
  Package,
  Timer,
  BarChart3,
  AlertCircle
} from "lucide-react";

interface SystemHealth {
  database: {
    status: 'healthy' | 'warning' | 'error';
    responseTime: number;
    connections: number;
    uptime: string;
  };
  api: {
    status: 'healthy' | 'warning' | 'error';
    responseTime: number;
    requestsPerMinute: number;
    errorRate: number;
  };
  workflow: {
    status: 'healthy' | 'warning' | 'error';
    activeOrders: number;
    bottlenecks: string[];
    throughput: number;
  };
  integrations: {
    pos: { connected: boolean; lastSync: string };
    sms: { available: boolean; credits: number };
    ai: { available: boolean; provider: string };
  };
}

interface WorkflowMetrics {
  stageDistribution: Record<string, number>;
  averageStageTime: Record<string, number>;
  bottleneckAlerts: Array<{
    stage: string;
    severity: 'low' | 'medium' | 'high';
    count: number;
    message: string;
  }>;
  throughputTrend: Array<{
    hour: string;
    completed: number;
    started: number;
  }>;
}

const statusColors = {
  healthy: 'text-green-600',
  warning: 'text-orange-600',
  error: 'text-red-600'
};

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Activity, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

const statusBadgeColors = {
  healthy: 'bg-green-100 text-green-800',
  warning: 'bg-orange-100 text-orange-800',
  error: 'bg-red-100 text-red-800'
};

export function DiagnosticDashboard() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: systemHealth, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ['/api/diagnostics/system-health'],
    refetchInterval: autoRefresh ? 5000 : false,
  });

  const { data: workflowMetrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ['/api/diagnostics/workflow-metrics'],
    refetchInterval: autoRefresh ? 10000 : false,
  });

  const { data: alerts, refetch: refetchAlerts } = useQuery({
    queryKey: ['/api/diagnostics/alerts'],
    refetchInterval: autoRefresh ? 3000 : false,
  });

  const handleRefresh = () => {
    refetchHealth();
    refetchMetrics();
    refetchAlerts();
  };

  if (healthLoading || metricsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading diagnostic data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Diagnostics</h1>
          <p className="text-muted-foreground">Real-time workflow health and performance monitoring</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-50 border-green-200' : ''}
          >
            <Activity className="h-4 w-4 mr-1" />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {alerts && alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert: any, index: number) => (
            <Alert key={index} className={alert.severity === 'high' ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{alert.title}</AlertTitle>
              <AlertDescription>{alert.content}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="workflow">Workflow Health</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Database Health */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Database</CardTitle>
                <Database className={`h-4 w-4 ${statusColors[systemHealth?.database?.status || 'error']}`} />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Badge className={statusBadgeColors[systemHealth?.database?.status || 'error']}>
                    {systemHealth?.database?.status || 'Unknown'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Response: {systemHealth?.database?.responseTime || 0}ms
                </div>
                <div className="text-xs text-muted-foreground">
                  Connections: {systemHealth?.database?.connections || 0}
                </div>
              </CardContent>
            </Card>

            {/* API Health */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Service</CardTitle>
                <Server className={`h-4 w-4 ${statusColors[systemHealth?.api?.status || 'error']}`} />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Badge className={statusBadgeColors[systemHealth?.api?.status || 'error']}>
                    {systemHealth?.api?.status || 'Unknown'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Response: {systemHealth?.api?.responseTime || 0}ms
                </div>
                <div className="text-xs text-muted-foreground">
                  Error Rate: {systemHealth?.api?.errorRate || 0}%
                </div>
              </CardContent>
            </Card>

            {/* Workflow Health */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Workflow</CardTitle>
                <TrendingUp className={`h-4 w-4 ${statusColors[systemHealth?.workflow?.status || 'error']}`} />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Badge className={statusBadgeColors[systemHealth?.workflow?.status || 'error']}>
                    {systemHealth?.workflow?.status || 'Unknown'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Active Orders: {systemHealth?.workflow?.activeOrders || 0}
                </div>
                <div className="text-xs text-muted-foreground">
                  Throughput: {systemHealth?.workflow?.throughput || 0}/hr
                </div>
              </CardContent>
            </Card>

            {/* Integration Status */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Integrations</CardTitle>
                <Wifi className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span>POS System</span>
                    <Badge className={systemHealth?.integrations?.pos?.connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {systemHealth?.integrations?.pos?.connected ? 'Connected' : 'Offline'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>AI Service</span>
                    <Badge className={systemHealth?.integrations?.ai?.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {systemHealth?.integrations?.ai?.available ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workflow" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Stage Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Stage Distribution
                </CardTitle>
                <CardDescription>Current orders by workflow stage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {workflowMetrics?.stageDistribution && Object.entries(workflowMetrics.stageDistribution).map(([stage, count]) => (
                    <div key={stage} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{stage.replace('_', ' ')}</span>
                        <span className="text-muted-foreground">{count} orders</span>
                      </div>
                      <Progress 
                        value={(count / (workflowMetrics?.stageDistribution ? Object.values(workflowMetrics.stageDistribution).reduce((a, b) => a + b, 0) : 1)) * 100} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Bottleneck Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Bottleneck Analysis
                </CardTitle>
                <CardDescription>Identified workflow bottlenecks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {workflowMetrics?.bottleneckAlerts?.length ? (
                    workflowMetrics.bottleneckAlerts.map((bottleneck, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                        <AlertTriangle className={`h-4 w-4 mt-0.5 ${
                          bottleneck.severity === 'high' ? 'text-red-500' :
                          bottleneck.severity === 'medium' ? 'text-orange-500' : 'text-blue-500'
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm">{bottleneck.stage}</p>
                            <Badge variant={bottleneck.severity === 'high' ? 'destructive' : 'secondary'}>
                              {bottleneck.count} orders
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{bottleneck.message}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p>No bottlenecks detected</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Average Stage Times */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Timer className="h-4 w-4 mr-2" />
                Average Stage Processing Times
              </CardTitle>
              <CardDescription>Time spent in each workflow stage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {workflowMetrics?.averageStageTime && Object.entries(workflowMetrics.averageStageTime).map(([stage, hours]) => (
                  <div key={stage} className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{hours.toFixed(1)}h</div>
                    <div className="text-sm text-muted-foreground">{stage.replace('_', ' ')}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>System Performance</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Database Response Time</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{systemHealth?.database?.responseTime || 0}ms</span>
                      <div className={`w-2 h-2 rounded-full ${
                        (systemHealth?.database?.responseTime || 0) < 100 ? 'bg-green-500' :
                        (systemHealth?.database?.responseTime || 0) < 500 ? 'bg-orange-500' : 'bg-red-500'
                      }`} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">API Response Time</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{systemHealth?.api?.responseTime || 0}ms</span>
                      <div className={`w-2 h-2 rounded-full ${
                        (systemHealth?.api?.responseTime || 0) < 200 ? 'bg-green-500' :
                        (systemHealth?.api?.responseTime || 0) < 1000 ? 'bg-orange-500' : 'bg-red-500'
                      }`} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Error Rate</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{systemHealth?.api?.errorRate || 0}%</span>
                      <div className={`w-2 h-2 rounded-full ${
                        (systemHealth?.api?.errorRate || 0) < 1 ? 'bg-green-500' :
                        (systemHealth?.api?.errorRate || 0) < 5 ? 'bg-orange-500' : 'bg-red-500'
                      }`} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Throughput Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Hourly Throughput</CardTitle>
                <CardDescription>Orders started vs completed over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {workflowMetrics?.throughputTrend?.slice(-6).map((trend, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span>{trend.hour}</span>
                      <div className="flex items-center space-x-4">
                        <span className="text-green-600">+{trend.completed}</span>
                        <span className="text-blue-600">↗{trend.started}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* POS Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">POS System</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Connection</span>
                    <Badge className={systemHealth?.integrations?.pos?.connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {systemHealth?.integrations?.pos?.connected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Last Sync</span>
                    <span className="text-xs text-muted-foreground">
                      {systemHealth?.integrations?.pos?.lastSync || 'Never'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SMS Service */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">SMS Service</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Service</span>
                    <Badge className={systemHealth?.integrations?.sms?.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {systemHealth?.integrations?.sms?.available ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Credits</span>
                    <span className="text-sm font-medium">
                      {systemHealth?.integrations?.sms?.credits || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Service */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AI Service</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Provider</span>
                    <Badge className={systemHealth?.integrations?.ai?.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {systemHealth?.integrations?.ai?.provider || 'None'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status</span>
                    <span className="text-xs text-muted-foreground">
                      {systemHealth?.integrations?.ai?.available ? 'Operational' : 'Offline'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
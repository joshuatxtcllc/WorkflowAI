import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Database,
  Wifi,
  Server,
  BarChart3,
  AlertCircle
} from "lucide-react";

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <Badge className={`${getStatusColor(status)} text-white flex items-center gap-1`}>
      {getStatusIcon(status)}
      {status || 'Unknown'}
    </Badge>
  );
};

export function SimpleDiagnosticDashboard() {
  const { data: systemHealth, isLoading: healthLoading, error: healthError, refetch: refetchHealth } = useQuery({
    queryKey: ["/api/diagnostics/system-health"],
    refetchInterval: 5000,
    retry: false,
  });

  const { data: workflowMetrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ["/api/diagnostics/workflow-metrics"],
    refetchInterval: 5000,
    retry: false,
  });

  const { data: alerts, isLoading: alertsLoading, refetch: refetchAlerts } = useQuery({
    queryKey: ["/api/diagnostics/alerts"],
    refetchInterval: 10000,
    retry: false,
  });

  const handleRefreshAll = () => {
    refetchHealth();
    refetchMetrics();
    refetchAlerts();
  };

  return (
    <div className="p-6 space-y-6 bg-gray-950 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">System Diagnostics</h1>
          <p className="text-gray-400">Real-time monitoring and health checks</p>
        </div>
        <Button 
          onClick={handleRefreshAll}
          variant="outline" 
          className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh All
        </Button>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-400" />
              Database
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthLoading ? (
              <div className="text-gray-400">Loading...</div>
            ) : healthError ? (
              <StatusBadge status="error" />
            ) : (
              <StatusBadge status={systemHealth?.database?.status || 'unknown'} />
            )}
            {systemHealth?.database && (
              <div className="mt-2 text-sm text-gray-400">
                Response: {systemHealth.database.responseTime || 'N/A'}ms
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-green-400" />
              API
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthLoading ? (
              <div className="text-gray-400">Loading...</div>
            ) : healthError ? (
              <StatusBadge status="error" />
            ) : (
              <StatusBadge status={systemHealth?.api?.status || 'unknown'} />
            )}
            {systemHealth?.api && (
              <div className="mt-2 text-sm text-gray-400">
                Response: {systemHealth.api.responseTime || 'N/A'}ms
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              Workflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthLoading ? (
              <div className="text-gray-400">Loading...</div>
            ) : healthError ? (
              <StatusBadge status="error" />
            ) : (
              <StatusBadge status={systemHealth?.workflow?.status || 'unknown'} />
            )}
            {systemHealth?.workflow && (
              <div className="mt-2 text-sm text-gray-400">
                Active: {systemHealth.workflow.activeOrders || 0} orders
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white flex items-center gap-2">
              <Wifi className="w-5 h-5 text-yellow-400" />
              Integrations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthLoading ? (
              <div className="text-gray-400">Loading...</div>
            ) : healthError ? (
              <StatusBadge status="error" />
            ) : (
              <StatusBadge status={systemHealth?.integrations?.pos?.connected ? 'healthy' : 'warning'} />
            )}
            {systemHealth?.integrations && (
              <div className="mt-2 text-sm text-gray-400">
                POS: {systemHealth.integrations.pos?.connected ? 'Connected' : 'Disconnected'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Workflow Metrics */}
      {workflowMetrics && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Workflow Distribution</CardTitle>
            <CardDescription className="text-gray-400">
              Current order distribution across workflow stages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {workflowMetrics.stageDistribution && Object.entries(workflowMetrics.stageDistribution).map(([stage, count]) => (
                <div key={stage} className="text-center">
                  <div className="text-2xl font-bold text-white">{count as number}</div>
                  <div className="text-sm text-gray-400">{stage.replace('_', ' ')}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {alerts && Array.isArray(alerts) && alerts.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">System Alerts</CardTitle>
            <CardDescription className="text-gray-400">
              Current system notifications and warnings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert: any, index: number) => {
                const getAlertStyle = (severity: string) => {
                  switch (severity) {
                    case 'high': return 'bg-red-900/20 border-red-800';
                    case 'medium': return 'bg-yellow-900/20 border-yellow-800';
                    case 'low': return 'bg-blue-900/20 border-blue-800';
                    default: return 'bg-gray-800 border-gray-700';
                  }
                };

                const getAlertIcon = (type: string, severity: string) => {
                  if (severity === 'high') return <AlertCircle className="h-4 w-4 text-red-400" />;
                  if (type === 'overdue') return <Clock className="h-4 w-4 text-yellow-400" />;
                  return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
                };

                return (
                  <Alert key={index} className={getAlertStyle(alert.severity)}>
                    {getAlertIcon(alert.type, alert.severity)}
                    <AlertDescription className="text-gray-200">
                      <div className="font-medium text-white mb-1">
                        {alert.title || alert.type || 'System Alert'}
                      </div>
                      {alert.content || alert.message || alert.description || 'No details available'}
                    </AlertDescription>
                  </Alert>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error States */}
      {(healthError || alertsLoading) && (
        <Alert className="bg-red-900/20 border-red-800">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-gray-200">
            Some diagnostic data could not be loaded. This may be due to missing API endpoints or server configuration issues.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
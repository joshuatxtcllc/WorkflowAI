
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Wifi, Database, Server, ExternalLink, Clock } from 'lucide-react';

interface SystemAlert {
  id: string;
  type: 'critical' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  component: string;
  action?: string;
}

export function SystemAlerts() {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);

  // Check hub connection status
  const { data: hubStatus, error: hubError } = useQuery({
    queryKey: ['hub-status'],
    queryFn: async () => {
      const response = await fetch('/api/test/auth', {
        headers: { 'X-API-Key': 'kanban_admin_key_2025_full_access' }
      });
      if (!response.ok) throw new Error(`Hub connection failed: ${response.status}`);
      return response.json();
    },
    refetchInterval: 30000, // Check every 30 seconds
    retry: false
  });

  // Check sync status
  const { data: syncStatus, error: syncError } = useQuery({
    queryKey: ['sync-status'],
    queryFn: async () => {
      const response = await fetch('/api/integrations/dashboard/status');
      if (!response.ok) throw new Error(`Sync status check failed: ${response.status}`);
      return response.json();
    },
    refetchInterval: 60000, // Check every minute
    retry: false,
    enabled: false // Temporarily disable until endpoint is confirmed working
  });

  // Check database connectivity
  const { data: dbStatus, error: dbError } = useQuery({
    queryKey: ['db-status'],
    queryFn: async () => {
      const response = await fetch('/api/system/health');
      if (!response.ok) throw new Error(`Database health check failed: ${response.status}`);
      return response.json();
    },
    refetchInterval: 45000, // Check every 45 seconds
    retry: false,
    enabled: false // Temporarily disable until we verify this endpoint
  });

  useEffect(() => {
    const newAlerts: SystemAlert[] = [];

    // Hub Connection Alerts
    if (hubError) {
      newAlerts.push({
        id: 'hub-connection-failed',
        type: 'critical',
        title: 'CENTRAL HUB CONNECTION FAILED',
        message: `Hub authentication failed: ${hubError.message}. Business data sync is down.`,
        timestamp: new Date().toISOString(),
        component: 'Central Hub',
        action: 'Check API credentials and network connectivity'
      });
    }

    // Sync Status Alerts
    if (syncError) {
      newAlerts.push({
        id: 'sync-failure',
        type: 'critical',
        title: 'DATA SYNCHRONIZATION FAILURE',
        message: `Dashboard sync is failing: ${syncError.message}. Business metrics not updating.`,
        timestamp: new Date().toISOString(),
        component: 'Data Sync',
        action: 'Verify dashboard endpoint and credentials'
      });
    }

    // Database Alerts
    if (dbError) {
      newAlerts.push({
        id: 'database-error',
        type: 'critical',
        title: 'DATABASE CONNECTION ERROR',
        message: `Database health check failed: ${dbError.message}. Order data may be at risk.`,
        timestamp: new Date().toISOString(),
        component: 'Database',
        action: 'Check database server status immediately'
      });
    }

    // Performance Alerts
    if (hubStatus && hubStatus.responseTime > 5000) {
      newAlerts.push({
        id: 'slow-hub-response',
        type: 'warning',
        title: 'SLOW HUB RESPONSE TIME',
        message: `Hub response time is ${hubStatus.responseTime}ms. Performance degraded.`,
        timestamp: new Date().toISOString(),
        component: 'Performance',
        action: 'Monitor network conditions and server load'
      });
    }

    setAlerts(newAlerts);
  }, [hubError, syncError, dbError, hubStatus]);

  if (alerts.length === 0) {
    return (
      <div className="mb-2">
        <div className="flex items-center gap-2 text-green-600 bg-green-50 border-l-4 border-green-500 rounded-sm px-3 py-1">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs font-medium">All Systems Operational</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-3 space-y-2">
      {alerts.map((alert) => (
        <Alert 
          key={alert.id} 
          variant="destructive" 
          className={`border-l-4 border-r-0 border-t-0 border-b-0 py-2 px-3 ${
            alert.type === 'critical' 
              ? 'border-red-600 bg-red-50 shadow-sm' 
              : 'border-orange-500 bg-orange-50'
          }`}
        >
          <AlertTriangle className={`h-5 w-5 ${
            alert.type === 'critical' ? 'text-red-600' : 'text-orange-500'
          }`} />
          <AlertTitle className={`text-sm font-semibold ${
            alert.type === 'critical' ? 'text-red-800' : 'text-orange-800'
          }`}>
            🚨 {alert.title}
          </AlertTitle>
          <AlertDescription className="space-y-1">
            <p className={`text-sm ${
              alert.type === 'critical' ? 'text-red-700' : 'text-orange-700'
            }`}>
              {alert.message}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {alert.component}
                </Badge>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </span>
              </div>
              {alert.action && (
                <span className="text-xs font-medium text-blue-600">
                  Action: {alert.action}
                </span>
              )}
            </div>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}

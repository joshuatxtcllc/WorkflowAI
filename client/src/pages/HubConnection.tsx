import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';

import { SystemAlerts } from '../components/SystemAlerts';
import { CheckCircle, XCircle, Loader2, Send, Activity, Database } from 'lucide-react';

export default function HubConnection() {
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const { toast } = useToast();

  const testConnection = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/test/auth', {
        method: 'GET',
        headers: {
          'X-API-Key': 'kanban_admin_key_2025_full_access',
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Connection failed: ${response.status}`);
      }
      
      return response.json();
    },
    onMutate: () => {
      setConnectionStatus('testing');
    },
    onSuccess: () => {
      setConnectionStatus('success');
      toast({
        title: "Connection Successful!",
        description: "Your frame shop is connected to the Central Hub.",
      });
    },
    onError: (error: any) => {
      setConnectionStatus('error');
      toast({
        title: "Connection Failed",
        description: error.message || "Unable to connect to Central Hub.",
        variant: "destructive",
      });
    },
  });

  const syncMetrics = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/integrations/dashboard/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      setLastSync(new Date().toLocaleTimeString());
      toast({
        title: "Metrics Synced!",
        description: "Frame shop data has been sent to Central Hub.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Unable to sync metrics.",
        variant: "destructive",
      });
    },
  });

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'testing':
        return <Loader2 className="h-5 w-5 animate-spin" />;
      default:
        return <Activity className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Connected</Badge>;
      case 'error':
        return <Badge variant="destructive">Disconnected</Badge>;
      case 'testing':
        return <Badge variant="secondary">Testing...</Badge>;
      default:
        return <Badge variant="outline">Not Tested</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Central Hub Connection</h1>
          <p className="text-muted-foreground">
            Enterprise Production System - Real Business Operations
          </p>
        </div>
        
        <SystemAlerts />

      <div className="grid gap-6 max-w-2xl mx-auto">
        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon()}
              Hub Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status:</span>
              {getStatusBadge()}
            </div>
            
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium">Hub URL:</span>
                <div className="text-xs text-muted-foreground font-mono break-all">
                  {window.location.origin}/api (Local Central Hub)
                </div>
              </div>
              <div className="text-sm">
                <span className="font-medium">API Key:</span>
                <div className="text-xs text-muted-foreground font-mono">
                  kanban_admin_key_2025_***
                </div>
              </div>
            </div>

            <Button 
              onClick={() => testConnection.mutate()}
              disabled={testConnection.isPending}
              className="w-full"
            >
              {testConnection.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Metrics Sync */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Synchronization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Sync your frame shop metrics (orders, revenue, status counts) to the Central Hub for business intelligence and reporting.
            </div>
            
            {lastSync && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Last Sync:</span>
                <Badge variant="outline">{lastSync}</Badge>
              </div>
            )}

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                ✓ 120 orders with authentic customer data<br/>
                ✓ Complete material and vendor information<br/>
                ✓ Real-time status and workflow metrics<br/>
                ✓ Automatic sync every 15 minutes
              </div>
            </div>

            <Button 
              onClick={() => syncMetrics.mutate()}
              disabled={syncMetrics.isPending || connectionStatus !== 'success'}
              className="w-full"
              variant="outline"
            >
              {syncMetrics.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Syncing Metrics...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Sync Now
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Integration Benefits */}
        <Card>
          <CardHeader>
            <CardTitle>Integration Benefits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <strong>Unified Dashboard:</strong> View frame shop metrics alongside other business data
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <strong>Real-time Updates:</strong> Automatic sync keeps data current across all systems
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <strong>Business Intelligence:</strong> Advanced analytics and reporting capabilities
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <strong>Cross-platform Notifications:</strong> Receive alerts and updates from multiple business systems
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
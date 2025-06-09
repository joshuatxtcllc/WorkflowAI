import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Zap, 
  ExternalLink,
  Monitor,
  RotateCcw
} from "lucide-react";

interface POSStatus {
  success: boolean;
  connected?: boolean;
  needsApiKey?: boolean;
  authenticated?: boolean;
  authError?: boolean;
  orders?: any[];
  error?: string;
}

export default function POSIntegration() {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: posStatus, isLoading, refetch } = useQuery<POSStatus>({
    queryKey: ["/api/pos/status"],
    refetchInterval: 300000, // Check status every 5 minutes
  });

  const startSyncMutation = useMutation({
    mutationFn: () => apiRequest("/api/pos/start-sync", "POST"),
    onSuccess: () => {
      toast({
        title: "Sync Started",
        description: "Real-time POS synchronization has been activated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pos/status"] });
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const syncOrderMutation = useMutation({
    mutationFn: (orderId: string) => 
      apiRequest(`/api/pos/sync/${orderId}`, "POST"),
    onSuccess: () => {
      toast({
        title: "Order Synced",
        description: "Order has been synchronized with POS system",
      });
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRefresh = () => {
    setIsSyncing(true);
    refetch().finally(() => setIsSyncing(false));
  };

  const getStatusColor = () => {
    if (isLoading) return "bg-gray-500";
    if (!posStatus) return "bg-gray-500";
    if (posStatus.success && posStatus.connected && posStatus.authenticated) return "bg-green-500";
    if (posStatus.success && posStatus.connected) return "bg-yellow-500";
    if (posStatus.success && posStatus.needsApiKey) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStatusText = () => {
    if (isLoading) return "Checking...";
    if (!posStatus) return "Unknown";
    if (posStatus.success && posStatus.connected && posStatus.authenticated) return "Connected & Syncing";
    if (posStatus.success && posStatus.connected && posStatus.authError) return "Auth Error";
    if (posStatus.success && posStatus.connected) return "Connected";
    if (posStatus.success && posStatus.needsApiKey) return "API Key Needed";
    return "Disconnected";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">POS Integration</h1>
          <p className="text-muted-foreground">
            Real-time synchronization with your Kanban API system
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isSyncing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Connection Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connection Status</CardTitle>
            <div className={`h-3 w-3 rounded-full ${getStatusColor()}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getStatusText()}</div>
            <p className="text-xs text-muted-foreground">
              {posStatus?.success && posStatus?.connected ? 'Kanban API responsive' : 'Check connection'}
            </p>
          </CardContent>
        </Card>

        {/* API Endpoint */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Endpoint</CardTitle>
            <ExternalLink className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-xs font-mono bg-muted p-2 rounded">
              https://2ebd6ffd-874c-4bb9-9272-bd3ef5c6dd5f-00-8rjpxe4l5qml.kirk.replit.dev
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Kanban API integration endpoint
            </p>
          </CardContent>
        </Card>

        {/* Sync Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Real-time Sync</CardTitle>
            <RotateCcw className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge variant={posStatus?.success ? "default" : "secondary"}>
                {posStatus?.success ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              5-minute interval polling
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Integration Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Integration Details
          </CardTitle>
          <CardDescription>
            Monitor and manage your POS system integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Information */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Current Status</h4>
            <div className="flex items-center gap-2">
              {posStatus?.success ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">
                {posStatus?.error || "System operational"}
              </span>
            </div>
          </div>

          <Separator />

          {/* Integration Features */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Available Features</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Activity className="h-3 w-3 text-blue-500" />
                Real-time order sync
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-3 w-3 text-yellow-500" />
                Webhook notifications
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw className="h-3 w-3 text-green-500" />
                Bidirectional updates
              </div>
              <div className="flex items-center gap-2">
                <Monitor className="h-3 w-3 text-purple-500" />
                Status monitoring
              </div>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={() => startSyncMutation.mutate()}
              disabled={startSyncMutation.isPending}
              size="sm"
            >
              {startSyncMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Start Real-time Sync
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://2ebd6ffd-874c-4bb9-9272-bd3ef5c6dd5f-00-8rjpxe4l5qml.kirk.replit.dev', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Kanban Hub
            </Button>
          </div>

          {/* Connection Help */}
          {posStatus && !posStatus.success && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <h5 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Service Status
              </h5>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                {posStatus.error?.includes('502') || posStatus.error?.includes('503') 
                  ? 'Kanban API service is temporarily unavailable. The system will automatically reconnect when service is restored.'
                  : posStatus.error || 'Unable to connect to POS system. Check your network connection and API credentials.'}
              </p>
            </div>
          )}

          {/* API Key Status */}
          {posStatus?.needsApiKey && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h5 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                API Key Configuration
              </h5>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Your POS system is connected but requires an API key for full synchronization.
                The key has been configured in your secrets.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
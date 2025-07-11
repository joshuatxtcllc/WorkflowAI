
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Input } from "../components/ui/input";
import { Navigation } from "../components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { useToast } from "../hooks/use-toast";
import { apiRequest, queryClient } from "../lib/queryClient";
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Zap, 
  ExternalLink,
  Monitor,
  RotateCcw,
  Settings,
  Users,
  Link,
  Webhook
} from "lucide-react";

interface FramersAssistantStatus {
  connected: boolean;
  authenticated: boolean;
  error?: string;
  status?: string;
  appInfo?: any;
}

export default function FramersAssistantIntegration() {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [testUrl, setTestUrl] = useState("");
  const [testApiKey, setTestApiKey] = useState("");

  const { data: status, isLoading, refetch } = useQuery<FramersAssistantStatus>({
    queryKey: ["/api/framers-assistant/status"],
    refetchInterval: 300000, // Check status every 5 minutes
  });

  const testConnectionMutation = useMutation({
    mutationFn: (connectionData: { testUrl: string; testApiKey: string }) => 
      apiRequest("/api/framers-assistant/test-connection", "POST", connectionData),
    onSuccess: (data) => {
      toast({
        title: data.success ? "Connection Successful" : "Connection Failed",
        description: data.error || "Successfully connected to Framers Assistant",
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (error) => {
      toast({
        title: "Connection Test Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const syncAllOrdersMutation = useMutation({
    mutationFn: () => apiRequest("/api/framers-assistant/sync-all", "POST"),
    onSuccess: (data) => {
      toast({
        title: "Sync Complete",
        description: `Successfully synced ${data.totalOrders} orders to Framers Assistant`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
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

  const handleTestConnection = () => {
    if (!testUrl.trim() || !testApiKey.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both URL and API key",
        variant: "destructive",
      });
      return;
    }
    
    testConnectionMutation.mutate({
      testUrl: testUrl.trim(),
      testApiKey: testApiKey.trim()
    });
  };

  const getStatusColor = () => {
    if (isLoading) return "bg-gray-500";
    if (!status) return "bg-gray-500";
    if (status.connected && status.authenticated) return "bg-green-500";
    if (status.connected) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStatusText = () => {
    if (isLoading) return "Checking...";
    if (!status) return "Unknown";
    if (status.connected && status.authenticated) return "Connected";
    if (status.connected) return "Connected (Auth Issues)";
    return "Disconnected";
  };

  return (
    <div className="p-6 space-y-6">
      <Navigation />

      <div className="container mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Framers Assistant Integration</h1>
            <p className="text-muted-foreground">
              Connect to "The Framers Assistant" app for seamless order synchronization
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
                {status?.error || "Connect to share orders between apps"}
              </p>
            </CardContent>
          </Card>

          {/* App Information */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">App Information</CardTitle>
              <Users className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                {status?.appInfo?.name || "The Framers Assistant"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {status?.appInfo?.version || "External framing application"}
              </p>
            </CardContent>
          </Card>

          {/* Sync Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
              <RotateCcw className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Badge variant={status?.connected ? "default" : "secondary"}>
                  {status?.connected ? "Ready" : "Not Connected"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Real-time order synchronization
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Integration Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Integration Details
            </CardTitle>
            <CardDescription>
              Monitor and manage your Framers Assistant integration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status Information */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Current Status</h4>
              <div className="flex items-center gap-2">
                {status?.connected && status?.authenticated ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">
                  {status?.error || "Ready for order synchronization"}
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
                  Bi-directional order sync
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-3 w-3 text-yellow-500" />
                  Real-time status updates
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-3 w-3 text-green-500" />
                  Customer data sharing
                </div>
                <div className="flex items-center gap-2">
                  <Webhook className="h-3 w-3 text-purple-500" />
                  Webhook notifications
                </div>
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={() => syncAllOrdersMutation.mutate()}
                disabled={syncAllOrdersMutation.isPending || !status?.connected}
                size="sm"
              >
                {syncAllOrdersMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-2" />
                )}
                Sync All Orders
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                disabled={!status?.connected}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Framers Assistant
              </Button>
            </div>

            {/* Connection Help */}
            {status && !status.connected && (
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <h5 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Connection Required
                </h5>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  Configure your Framers Assistant API credentials in Secrets to enable order synchronization.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Connection Testing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Test API Connection
            </CardTitle>
            <CardDescription>
              Test your Framers Assistant API credentials before saving them to Secrets
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Framers Assistant API URL</label>
              <Input
                type="url"
                placeholder="https://your-framers-assistant.replit.app"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">API Key</label>
              <Input
                type="password"
                placeholder="Your Framers Assistant API key"
                value={testApiKey}
                onChange={(e) => setTestApiKey(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleTestConnection}
              disabled={testConnectionMutation.isPending}
              className="w-full"
              variant="outline"
            >
              {testConnectionMutation.isPending ? 'Testing...' : 'Test Connection'}
            </Button>
            <div className="text-xs text-muted-foreground">
              If the test is successful, add FRAMERS_ASSISTANT_API_URL and FRAMERS_ASSISTANT_API_KEY to your Secrets
            </div>
          </CardContent>
        </Card>

        {/* Webhook Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Webhook Configuration
            </CardTitle>
            <CardDescription>
              Configure webhooks in Framers Assistant to receive real-time updates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Webhook URL</label>
              <div className="flex items-center gap-2">
                <Input
                  value={`${window.location.origin}/api/webhooks/framers-assistant`}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/framers-assistant`);
                    toast({
                      title: "Copied!",
                      description: "Webhook URL copied to clipboard",
                    });
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Add this URL to your Framers Assistant webhook settings</p>
              <p>• Set Content-Type to application/json</p>
              <p>• Optionally configure FRAMERS_ASSISTANT_WEBHOOK_SECRET for security</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

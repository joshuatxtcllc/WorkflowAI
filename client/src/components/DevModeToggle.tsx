
import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';
import { Settings, Pause, Play, RefreshCw } from 'lucide-react';

interface DevModeToggleProps {
  isPollingEnabled: boolean;
  onTogglePolling: (enabled: boolean) => void;
  onForceRefresh: () => void;
  connectionStatus?: 'connected' | 'disconnected' | 'reconnecting';
}

export function DevModeToggle({ 
  isPollingEnabled, 
  onTogglePolling, 
  onForceRefresh,
  connectionStatus = 'disconnected'
}: DevModeToggleProps) {
  const isDev = process.env.NODE_ENV === 'development';
  
  if (!isDev) return null;

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-64 glass-strong border-gray-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Dev Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Auto-refresh</span>
          <div className="flex items-center gap-2">
            {isPollingEnabled ? (
              <Play className="h-3 w-3 text-green-400" />
            ) : (
              <Pause className="h-3 w-3 text-yellow-400" />
            )}
            <Switch
              checked={isPollingEnabled}
              onCheckedChange={onTogglePolling}
              size="sm"
            />
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">WebSocket</span>
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-400' :
            connectionStatus === 'reconnecting' ? 'bg-yellow-400' :
            'bg-red-400'
          }`} />
        </div>

        <Button
          onClick={onForceRefresh}
          size="sm"
          variant="outline"
          className="w-full text-xs"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Force Refresh
        </Button>
      </CardContent>
    </Card>
  );
}

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { AlertTriangle, Wifi, Database, Server, ExternalLink, Clock } from 'lucide-react';

interface SystemAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  content: string;
}

export function SystemAlerts() {
  const { data: alerts, isLoading } = useQuery({
    queryKey: ['diagnostic-alerts'],
    queryFn: async () => {
      const response = await fetch('/api/diagnostics/alerts');
      if (!response.ok) throw new Error('Failed to fetch alerts');
      return response.json();
    },
    refetchInterval: 30000
  });

  if (isLoading) {
    return <div className="text-gray-400">Loading alerts...</div>;
  }

  if (!alerts || alerts.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center space-x-2 text-green-400">
          <Wifi className="h-5 w-5" />
          <span className="font-medium">All Systems Operational</span>
        </div>
        <p className="text-gray-400 text-sm mt-1">
          No alerts detected. All services are running normally.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {alerts.map((alert: SystemAlert) => (
        <Alert key={alert.id} className="bg-gray-800 border-gray-700">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-white">{alert.title}</AlertTitle>
          <AlertDescription className="text-gray-300">
            {alert.content}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
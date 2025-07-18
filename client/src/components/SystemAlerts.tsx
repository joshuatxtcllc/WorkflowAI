import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { AlertTriangle, Wifi, Database, Server, ExternalLink, Clock } from 'lucide-react';

interface SystemAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  title?: string;
  content?: string;
  message?: string; // Alternative field name
}

export function SystemAlerts() {
  console.log('SystemAlerts: Component mounting...');
  const { data: alerts, isLoading, error } = useQuery({
    queryKey: ['diagnostic-alerts'],
    queryFn: async () => {
      console.log('SystemAlerts: Fetching alerts...');
      try {
        const response = await fetch('/api/diagnostics/alerts');
        if (!response.ok) throw new Error('Failed to fetch alerts');
        const data = await response.json();
        console.log('SystemAlerts: Alerts fetched successfully:', data);
        // Handle both direct array and object with alerts property
        return Array.isArray(data) ? data : (data.alerts || []);
      } catch (error) {
        console.error('SystemAlerts: Error fetching alerts:', error);
        throw error;
      }
    },
    refetchInterval: 30000,
    retry: 2
  });

  if (isLoading) {
    return <div className="text-gray-400">Loading alerts...</div>;
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center space-x-2 text-yellow-400">
          <Wifi className="h-5 w-5" />
          <span className="font-medium">Alert System Unavailable</span>
        </div>
        <p className="text-gray-400 text-sm mt-1">
          Unable to load system alerts. Please check your connection.
        </p>
      </div>
    );
  }

  if (!alerts || !Array.isArray(alerts) || alerts.length === 0) {
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
      {alerts.map((alert: SystemAlert, index: number) => (
        <Alert key={alert.id || `alert-${index}`} className="bg-gray-800 border-gray-700">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-white">
            {alert.title || alert.type || 'System Alert'}
          </AlertTitle>
          <AlertDescription className="text-gray-300">
            {alert.content || alert.message || 'No details available'}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
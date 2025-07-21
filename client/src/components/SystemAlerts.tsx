import React, { useState, useEffect, memo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { apiRequest } from '../lib/queryClient';
import { AlertTriangle, CheckCircle, Clock, X, Bell } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useToast } from '../hooks/use-toast';
import type { AIMessage } from '@shared/schema';

export default memo(function SystemAlerts() {
  const mountedRef = useRef(false);
  const [alertPollingEnabled, setAlertPollingEnabled] = useState(true);

  // Prevent re-mounting logs
  useEffect(() => {
    if (!mountedRef.current) {
      console.log('SystemAlerts: Component mounting...');
      mountedRef.current = true;
    }
  }, []);

  // Listen for global polling control
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'dev_polling_enabled') {
        setAlertPollingEnabled(e.newValue === 'true');
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Check initial state
    const initialState = localStorage.getItem('dev_polling_enabled');
    if (initialState !== null) {
      setAlertPollingEnabled(initialState === 'true');
    }

    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Stable query key to prevent re-mounting
  const stableQueryKey = useRef(["/api/analytics/alerts"]).current;

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: stableQueryKey,
    queryFn: async () => {
      if (!mountedRef.current) return []; // Skip if not properly mounted
      console.log('SystemAlerts: Fetching alerts...');
      const response = await apiRequest("/api/analytics/alerts");
      console.log('SystemAlerts: Alerts fetched successfully:', response || []);
      return response || [];
    },
    refetchInterval: alertPollingEnabled ? 30000 : false,
    staleTime: 15000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false, // Prevent automatic refetch on mount
  });

// Component is simplified to prevent re-mounting issues
  // Return null for now - alerts functionality can be re-enabled later
  return null;
});
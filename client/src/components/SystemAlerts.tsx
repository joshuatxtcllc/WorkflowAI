import React, { useState, useEffect, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { apiRequest } from '../lib/queryClient';
import { AlertTriangle, CheckCircle, Clock, X, Bell } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import type { AIMessage } from '@shared/schema';

export default memo(function SystemAlerts() {
  const { toast } = useToast();
  const [alertPollingEnabled, setAlertPollingEnabled] = useState(true);

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

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["/api/analytics/alerts"],
    queryFn: async () => {
      console.log('SystemAlerts: Fetching alerts...');
      const response = await apiRequest("/api/analytics/alerts");
      console.log('SystemAlerts: Alerts fetched successfully:', response || []);
      return response || [];
    },
    refetchInterval: alertPollingEnabled ? 30000 : false,
    staleTime: 15000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

</div>
    );
  }

  return null;
});
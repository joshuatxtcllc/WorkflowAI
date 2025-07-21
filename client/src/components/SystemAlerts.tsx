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
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

const { data: alerts = [], isLoading, error } = useQuery<AIMessage[]>({
    queryKey: ['/api/analytics/alerts'],
    queryFn: async () => {
      const response = await apiRequest('/api/analytics/alerts');
      return Array.isArray(response) ? response : [];
    },
    refetchInterval: 2 * 60 * 1000, // Reduced from 30s to 2 minutes
    staleTime: 60000, // Increased stale time
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

</div>
    );
  }

  return null;
});
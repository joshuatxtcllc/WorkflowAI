import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useSidebar } from "../components/ui/sidebar";

import KanbanBoard from "../components/KanbanBoard";
import OrderDetails from "../components/OrderDetails";
import AIAssistant from '../components/AIAssistant';

import { useOrderStore } from '../store/useOrderStore';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { TrendingUp, Clock, BarChart3, Upload, CheckCircle, ChevronUp } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { apiRequest } from '../lib/queryClient';
import type { WorkloadAnalysis } from '@shared/schema';
import { SystemAlerts } from '../components/SystemAlerts';
import NewOrderModal from '../components/NewOrderModal';


// Component to handle scroll detection
function ScrollHandler() {
  const { setOpen, open } = useSidebar();
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastScrollLeft = useRef(0);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const currentScrollLeft = target.scrollLeft;

      // If user scrolls to the right and sidebar is open, close it
      if (currentScrollLeft > lastScrollLeft.current && currentScrollLeft > 50 && open) {
        setOpen(false);
      }

      lastScrollLeft.current = currentScrollLeft;
    };

    // Add scroll listener to the main content area
    const mainContent = document.querySelector('[data-scroll-container]');
    if (mainContent) {
      mainContent.addEventListener('scroll', handleScroll);
      return () => mainContent.removeEventListener('scroll', handleScroll);
    }
  }, [setOpen, open]);

  return null;
}

export default function Dashboard() {
  const { ui, setUI } = useOrderStore();

  return (
    <>
      <ScrollHandler />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <SystemAlerts />
        <KanbanBoard />
      </div>
      <AIAssistant />
      <NewOrderModal />

      {ui.isOrderDetailsOpen && (
        <OrderDetails />
      )}
    </>
  );
}
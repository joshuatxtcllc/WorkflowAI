import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Header from "@/components/Header";
import KanbanBoard from "@/components/KanbanBoard";
import OrderDetails from "@/components/OrderDetails";
import AIAssistant from '@/components/AIAssistant';
import { SidebarInset } from '@/components/ui/sidebar';
import { useOrderStore } from '@/store/useOrderStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Clock, BarChart3, Upload, CheckCircle, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { WorkloadAnalysis } from '@shared/schema';
import { SystemAlerts } from '@/components/SystemAlerts';
import NewOrderModal from '@/components/NewOrderModal';


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
    <SidebarProvider>
      <ScrollHandler />
      <div className="min-h-screen bg-gray-950 text-white relative dark flex" style={{ backgroundColor: '#0A0A0B' }}>
        {/* Background Pattern */}
        <div className="fixed inset-0 opacity-30 pointer-events-none">
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0, 166, 147, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 166, 147, 0.03) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px'
            }}
          />
        </div>

        <AppSidebar />

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0" data-scroll-container>
          <Header />
          <main className="flex-1 p-4 space-y-6 overflow-hidden">
            <SystemAlerts />
            <KanbanBoard />
          </main>
          <AIAssistant />
          <NewOrderModal />

          {ui.isOrderDetailsOpen && (
            <OrderDetails />
          )}
        </div>
      </div>
    </SidebarProvider>
  );
}
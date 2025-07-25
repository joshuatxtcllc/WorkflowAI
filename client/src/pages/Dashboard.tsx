import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, memo } from 'react';
import { SidebarProvider, useSidebar } from "../components/ui/sidebar";
import { AppSidebar } from "../components/AppSidebar";
import Header from "../components/Header";
import KanbanBoard from "../components/KanbanBoard";
import OrderDetails from "../components/OrderDetails";
import AIAssistant from '../components/AIAssistant';
import { SidebarInset } from '../components/ui/sidebar';
import { useOrderStore } from '../store/useOrderStore';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Switch } from '../components/ui/switch';
import { TrendingUp, Clock, BarChart3, Upload, CheckCircle, ChevronUp } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { apiRequest } from '../lib/queryClient';
import type { WorkloadAnalysis, OrderWithDetails } from '@shared/schema';
// SystemAlerts removed for performance
import NewOrderModal from '../components/NewOrderModal';
import { useIsMobile } from '../hooks/use-mobile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"

// Gamified features removed for performance optimization

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

const Dashboard = memo(() => {
  const { isMobile } = useIsMobile();
  const [showAI, setShowAI] = useState(false);

  return (
    <div className="flex-1 flex flex-col bg-gray-950 relative" style={{ backgroundColor: '#0A0A0B' }}>
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

      <SidebarInset>
        <Header />
        <ScrollHandler />
        
        {/* Main Dashboard Content */}
        <div className="flex-1 p-4 space-y-6" data-scroll-container>
          <KanbanBoard />
        </div>
      </SidebarInset>

      {/* AI Assistant Button for Mobile */}
      {isMobile && (
        <button
          onClick={() => setShowAI(!showAI)}
          className="fixed bottom-24 right-4 bg-jade-600 hover:bg-jade-700 text-white rounded-full p-4 shadow-lg z-50 touch-manipulation"
          style={{ minWidth: '56px', minHeight: '56px' }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}
    </div>
  );
});

export default Dashboard;
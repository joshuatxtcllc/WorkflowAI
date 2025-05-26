import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import Header from '@/components/Header';
import KanbanBoard from '@/components/KanbanBoard';
import OrderDetails from '@/components/OrderDetails';
import AIAssistant from '@/components/AIAssistant';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useOrderStore } from '@/store/useOrderStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Clock, BarChart3, Upload, CheckCircle, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { WorkloadAnalysis } from '@shared/schema';

function ImportSection() {
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const content = await file.text();

      const response = await fetch('/api/import/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileContent: content })
      });

      const result = await response.json();

      toast({
        title: "Import Successful!",
        description: `Imported ${result.ordersCreated} orders, ${result.customersCreated} customers, and ${result.materialsCreated} materials`,
      });

      // Refresh all data
      queryClient.invalidateQueries();
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Please check your file format and try again.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700 mb-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Import Production Data</h3>
            <p className="text-gray-400">Upload your TSV file to populate the system with real orders</p>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".tsv,.csv"
              onChange={handleFileUpload}
              disabled={isImporting}
              className="hidden"
              id="file-upload"
            />
            <Button
              asChild
              disabled={isImporting}
              className="bg-blue-600 hover:bg-blue-700 mr-3"
            >
              <label htmlFor="file-upload" className="cursor-pointer">
                {isImporting ? (
                  <>Processing...</>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import Orders
                  </>
                )}
              </label>
            </Button>
            <Button
              onClick={async () => {
                try {
                  const response = await fetch('/api/add-production-orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                  });
                  const result = await response.json();
                  toast({
                    title: "Production Orders Added!",
                    description: `Added ${result.customersCreated} customers and ${result.ordersCreated} orders`,
                  });
                  queryClient.invalidateQueries();
                } catch (error) {
                  toast({
                    title: "Failed to Add Orders",
                    description: "Could not populate production data",
                    variant: "destructive",
                  });
                }
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Add Production Orders
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TimeEstimationDashboard() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { data: analysis } = useQuery<WorkloadAnalysis>({
    queryKey: ["/api/ai/analysis"],
    refetchInterval: 30000,
  });

  const { data: metrics } = useQuery({
    queryKey: ["/api/analytics/workload"],
    refetchInterval: 30000,
  });

  const getEfficiencyColor = (percentage: number) => {
    if (percentage >= 85) return 'text-green-400';
    if (percentage >= 70) return 'text-orange-400';
    return 'text-red-400';
  };

  const dailyProgress = metrics ? (metrics.totalHours / 8) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-20 left-6 bg-gray-900/90 backdrop-blur-sm border border-gray-800 rounded-xl max-w-sm z-20 overflow-hidden"
    >
      {/* Header with collapse button */}
      <div className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-jade-400" />
          <h3 className="font-semibold text-white">Time Estimation</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 h-6 w-6 hover:bg-gray-800 rounded text-gray-400 hover:text-white"
        >
          <motion.div
            animate={{ rotate: isCollapsed ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronUp className="w-4 h-4" />
          </motion.div>
        </Button>
      </div>

      <motion.div
        initial={false}
        animate={{ 
          height: isCollapsed ? 0 : 'auto',
          opacity: isCollapsed ? 0 : 1
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="overflow-hidden"
      >
        <div className="px-4 pb-4 space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Total Remaining:</span>
            <span className="text-white font-semibold">{analysis?.totalHours || 0}h</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Projected Completion:</span>
            <span className="text-jade-400 font-semibold">
              {analysis?.projectedCompletion 
                ? new Date(analysis.projectedCompletion).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                : 'TBD'
              }
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">On-Time Rate:</span>
            <span className={`font-semibold ${getEfficiencyColor(analysis?.onTimePercentage || 0)}`}>
              {analysis?.onTimePercentage || 0}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Daily Progress</span>
              <span>{Math.min(dailyProgress, 100).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div 
                className="bg-jade-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${Math.min(dailyProgress, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AIAlertBar() {
  const { data: analysis } = useQuery<WorkloadAnalysis>({
    queryKey: ["/api/ai/analysis"],
    refetchInterval: 30000,
  });

  if (!analysis?.recommendations || analysis.recommendations.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-10 bg-gradient-to-r from-orange-900/50 to-red-900/50 border-b border-orange-800/50"
    >
      <div className="max-w-[1920px] mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BarChart3 className="w-5 h-5 text-orange-400 animate-pulse" />
            <div className="text-sm">
              <span className="text-orange-400 font-semibold">AI Recommendation:</span>
              <span className="text-white ml-2">{analysis.recommendations[0]}</span>
              {analysis.recommendations.length > 1 && (
                <>
                  <span className="text-gray-300 mx-2">•</span>
                  <span className="text-white">{analysis.recommendations[1]}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const [showTimeEstimator, setShowTimeEstimator] = useState(true);
  const selectedOrder = useOrderStore((state) => state.selectedOrder);
  const setSelectedOrder = useOrderStore((state) => state.setSelectedOrder);

  return (
    <SidebarProvider>
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
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <AIAlertBar />
          <main className="flex-1 p-4 space-y-6 overflow-hidden">
            <ImportSection />
            <KanbanBoard />
          </main>
          
          <div data-section="analytics">
            <TimeEstimationDashboard />
          </div>
          <AIAssistant />

          {selectedOrder && (
            <OrderDetails 
              order={selectedOrder} 
              onClose={() => setSelectedOrder(null)} 
            />
          )}
        </div>
      </div>
    </SidebarProvider>
  );
}
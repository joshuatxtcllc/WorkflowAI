import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useState } from 'react';
import Header from '@/components/Header';
import KanbanBoard from '@/components/KanbanBoard';
import AIAssistant from '@/components/AIAssistant';
import OrderDetails from '@/components/OrderDetails';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Clock, BarChart3, Upload, CheckCircle } from 'lucide-react';
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
                  const response = await fetch('/api/add-real-customer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                  });
                  const result = await response.json();
                  toast({
                    title: "Test Customer Added!",
                    description: `Added ${result.customer} with tracking ${result.orderTracking}`,
                  });
                  queryClient.invalidateQueries();
                } catch (error) {
                  toast({
                    title: "Test Failed",
                    description: "Could not add test customer",
                    variant: "destructive",
                  });
                }
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Add Test Customer
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TimeEstimationDashboard() {
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
      className="fixed bottom-6 left-6 bg-gray-900/90 backdrop-blur-sm border border-gray-800 rounded-xl p-4 max-w-sm z-40"
    >
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-5 h-5 text-jade-400" />
        <h3 className="font-semibold text-white">Time Estimation</h3>
      </div>
      
      <div className="space-y-3 text-sm">
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
  return (
    <div className="min-h-screen bg-gray-950 text-white relative">
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

      <Header />
      <AIAlertBar />
      <div className="container mx-auto px-4 py-6">
        <ImportSection />
      </div>
      <KanbanBoard />
      <TimeEstimationDashboard />
      <AIAssistant />
      <OrderDetails />
    </div>
  );
}

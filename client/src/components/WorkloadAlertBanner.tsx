import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'wouter';
import { 
  AlertTriangle, Clock, TrendingUp, Zap, X, ChevronDown, ChevronUp,
  Target, Users, Timer, BarChart3, Brain, Lightbulb 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { WorkloadAnalysis, OrderWithDetails } from '@shared/schema';

interface WorkloadAlertBannerProps {
  orders: OrderWithDetails[];
}

export default function WorkloadAlertBanner({ orders }: WorkloadAlertBannerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  // Fetch AI workload analysis
  const { data: analysis } = useQuery<WorkloadAnalysis>({
    queryKey: ["/api/ai/analysis"],
    refetchInterval: 15000, // Aggressive refresh every 15 seconds
  });

  // Calculate real-time workload metrics
  const workloadMetrics = {
    totalActiveOrders: orders.filter(o => !['PICKED_UP', 'CANCELLED'].includes(o.status)).length,
    overdueOrders: orders.filter(o => {
      if (!o.dueDate) return false;
      return new Date(o.dueDate) < new Date() && !['PICKED_UP', 'COMPLETED'].includes(o.status);
    }).length,
    urgentOrders: orders.filter(o => o.priority === 'URGENT' && !['PICKED_UP', 'COMPLETED'].includes(o.status)).length,
    materialWaiting: orders.filter(o => o.status === 'MATERIALS_ORDERED').length,
    readyForWork: orders.filter(o => ['MATERIALS_ARRIVED', 'FRAME_CUT', 'MAT_CUT'].includes(o.status)).length,
    completedToday: orders.filter(o => {
      if (o.status !== 'COMPLETED') return false;
      const today = new Date().toDateString();
      return new Date(o.updatedAt).toDateString() === today;
    }).length
  };

  const getSeverityLevel = () => {
    if (workloadMetrics.overdueOrders > 3) return 'critical';
    if (workloadMetrics.urgentOrders > 5 || analysis?.riskLevel === 'HIGH') return 'high';
    if (workloadMetrics.materialWaiting > 8) return 'medium';
    return 'low';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'from-red-600 to-red-500';
      case 'high': return 'from-orange-600 to-orange-500';
      case 'medium': return 'from-yellow-600 to-yellow-500';
      default: return 'from-jade-600 to-jade-500';
    }
  };

  const getActionableRecommendations = () => {
    const recommendations = [];

    if (workloadMetrics.overdueOrders > 0) {
      recommendations.push({
        icon: AlertTriangle,
        text: `${workloadMetrics.overdueOrders} orders overdue`,
        action: 'Priority handling needed',
        severity: 'critical',
        filterUrl: '/orders?status=overdue',
        orderCount: workloadMetrics.overdueOrders
      });
    }

    if (workloadMetrics.urgentOrders > 3) {
      recommendations.push({
        icon: Zap,
        text: `${workloadMetrics.urgentOrders} urgent orders`,
        action: 'Redistribute workload',
        severity: 'high',
        filterUrl: '/?priority=urgent',
        orderCount: workloadMetrics.urgentOrders
      });
    }

    if (workloadMetrics.materialWaiting > 5) {
      recommendations.push({
        icon: Clock,
        text: `${workloadMetrics.materialWaiting} awaiting materials`,
        action: 'Contact suppliers',
        severity: 'medium',
        filterUrl: '/?status=MATERIALS_ORDERED',
        orderCount: workloadMetrics.materialWaiting
      });
    }

    if (workloadMetrics.readyForWork > 0) {
      recommendations.push({
        icon: Target,
        text: `${workloadMetrics.readyForWork} ready to start`,
        action: 'Begin production',
        severity: 'low',
        filterUrl: '/?status=ready_for_work',
        orderCount: workloadMetrics.readyForWork
      });
    }

    if (analysis?.totalHours && analysis.totalHours > 300) {
      recommendations.push({
        icon: BarChart3,
        text: `High workload: ${analysis.totalHours}h`,
        action: 'Consider extra help',
        severity: 'medium',
        filterUrl: '/orders',
        orderCount: workloadMetrics.totalActiveOrders
      });
    }

    return recommendations;
  };

  const severity = getSeverityLevel();
  const recommendations = getActionableRecommendations();

  if (isDismissed || recommendations.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className={`mb-4 rounded-lg bg-gradient-to-r ${getSeverityColor(severity)} text-white shadow-lg border-l-4 border-white/30`}
      >
        {/* Main Alert Header */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="w-6 h-6 animate-pulse" />
              <div>
                <h3 className="font-semibold text-base flex items-center gap-2">
                  AI Manager
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs">
                    {severity.toUpperCase()}
                  </Badge>
                </h3>
                <p className="text-white/80 text-xs">
                  Real-time analysis & recommendations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-white hover:bg-white/20"
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDismissed(true)}
                className="text-white hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-1 mt-2">
            <div className="bg-white/10 rounded p-1 text-center">
              <div className="text-sm font-bold">{workloadMetrics.totalActiveOrders}</div>
              <div className="text-xs text-white/70">Active</div>
            </div>
            <div className="bg-white/10 rounded p-1 text-center">
              <div className="text-sm font-bold text-red-200">{workloadMetrics.overdueOrders}</div>
              <div className="text-xs text-white/70">Late</div>
            </div>
            <div className="bg-white/10 rounded p-1 text-center">
              <div className="text-sm font-bold text-orange-200">{workloadMetrics.urgentOrders}</div>
              <div className="text-xs text-white/70">Rush</div>
            </div>
            <div className="bg-white/10 rounded p-1 text-center">
              <div className="text-sm font-bold text-blue-200">{workloadMetrics.materialWaiting}</div>
              <div className="text-xs text-white/70">Waiting</div>
            </div>
            <div className="bg-white/10 rounded p-1 text-center">
              <div className="text-sm font-bold text-green-200">{workloadMetrics.readyForWork}</div>
              <div className="text-xs text-white/70">Ready</div>
            </div>
            <div className="bg-white/10 rounded p-1 text-center">
              <div className="text-sm font-bold text-jade-200">{workloadMetrics.completedToday}</div>
              <div className="text-xs text-white/70">Done</div>
            </div>
          </div>

          {/* Progress Bar */}
          {analysis && (
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span>On-Time</span>
                <span>{analysis.onTimePercentage}%</span>
              </div>
              <Progress 
                value={analysis.onTimePercentage} 
                className="h-1 bg-white/20"
              />
            </div>
          )}
        </div>

        {/* Expanded Recommendations */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-white/20 bg-black/10"
            >
              <div className="p-2">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4" />
                  <h4 className="font-medium text-sm">IMMEDIATE ACTION ITEMS</h4>
                </div>

                <div className="space-y-2">
                  {recommendations.map((rec, index) => {
                    const Icon = rec.icon;
                    return (
                      <motion.div
                        key={`alert_${rec.id || `${rec.type}_${index}_${Date.now()}`}`}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Link href={rec.filterUrl || '/orders'}>
                          <div className="flex items-center gap-2 bg-white/10 rounded p-2 hover:bg-white/20 transition-colors cursor-pointer group">
                            <Icon className="w-4 h-4 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs group-hover:text-white/90 truncate">{rec.text}</p>
                              <p className="text-xs text-white/70 group-hover:text-white/60">
                                {rec.action}
                              </p>
                            </div>
                            {rec.orderCount && (
                              <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-medium shrink-0">
                                {rec.orderCount}
                              </span>
                            )}
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>

                {/* AI Insights */}
                {analysis?.aiInsights && (
                  <div className="mt-2 bg-white/10 rounded p-2">
                    <div className="flex items-center gap-1 mb-1">
                      <Brain className="w-3 h-3" />
                      <span className="text-xs font-medium">AI Insights</span>
                    </div>
                    <p className="text-xs text-white/80 line-clamp-3">
                      {analysis.aiInsights.slice(0, 150)}...
                    </p>
                  </div>
                )}

                {/* Bottlenecks */}
                {analysis?.bottlenecks && analysis.bottlenecks.length > 0 && (
                  <div className="mt-2 bg-white/10 rounded p-2">
                    <div className="flex items-center gap-1 mb-1">
                      <TrendingUp className="w-3 h-3" />
                      <span className="text-xs font-medium">Bottlenecks</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {analysis.bottlenecks.slice(0, 3).map((bottleneck, index) => (
                        <Badge key={index} variant="secondary" className="bg-red-500/20 text-red-200 text-xs px-1 py-0">
                          {bottleneck}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
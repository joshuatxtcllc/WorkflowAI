import { storage } from './storage';
import { logger } from './logger';
import { dbWrapper } from './database-wrapper';
import type { OrderWithDetails, WorkloadAnalysis, AIMessage } from '@shared/schema';

export class AnalyticsEngine {
  async generateComprehensiveMetrics(): Promise<any> {
    return dbWrapper.executeQuery(async () => {
      const orders = await storage.getOrders();
      const customers = await storage.getCustomers();
      
      const now = new Date();
      const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      // Core order metrics
      const totalOrders = orders.length;
      const activeOrders = orders.filter(o => !['PICKED_UP', 'COMPLETED'].includes(o.status));
      const completedOrders = orders.filter(o => ['PICKED_UP', 'COMPLETED'].includes(o.status));
      
      // Time-based metrics
      const weeklyOrders = orders.filter(o => new Date(o.createdAt) >= startOfWeek);
      const monthlyOrders = orders.filter(o => new Date(o.createdAt) >= startOfMonth);
      const yearlyOrders = orders.filter(o => new Date(o.createdAt) >= startOfYear);

      // Revenue calculations
      const totalRevenue = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
      const weeklyRevenue = weeklyOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
      const monthlyRevenue = monthlyOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
      const averageOrderValue = totalRevenue / totalOrders || 0;

      // Performance metrics
      const overdueOrders = activeOrders.filter(o => 
        o.dueDate && new Date(o.dueDate) < now
      );
      
      const onTimeOrders = completedOrders.filter(o => {
        if (!o.dueDate || !o.completedAt) return false;
        return new Date(o.completedAt) <= new Date(o.dueDate);
      });
      
      const onTimePercentage = completedOrders.length > 0 
        ? (onTimeOrders.length / completedOrders.length) * 100 
        : 100;

      // Production metrics
      const totalHours = orders.reduce((sum, o) => sum + (o.estimatedHours || 0), 0);
      const averageHours = totalHours / totalOrders || 0;
      const averageComplexity = orders.reduce((sum, o) => sum + (o.complexity || 5), 0) / totalOrders || 5;

      // Status distribution
      const statusCounts = this.calculateStatusDistribution(orders);
      const workflowBottlenecks = this.identifyWorkflowBottlenecks(statusCounts, activeOrders.length);

      // Customer metrics
      const newCustomersThisMonth = customers.filter(c => 
        new Date(c.createdAt) >= startOfMonth
      ).length;
      
      const repeatCustomers = customers.filter(c => {
        const customerOrders = orders.filter(o => o.customerId === c.id);
        return customerOrders.length > 1;
      }).length;

      // Material and inventory insights
      const materialsWaiting = activeOrders.filter(o => o.status === 'MATERIALS_ORDERED').length;
      const readyToStart = activeOrders.filter(o => o.status === 'MATERIALS_ARRIVED').length;
      const inProduction = activeOrders.filter(o => 
        ['FRAME_CUT', 'MAT_CUT', 'PREPPED'].includes(o.status)
      ).length;

      // Priority breakdown
      const urgentOrders = activeOrders.filter(o => o.priority === 'URGENT').length;
      const highPriorityOrders = activeOrders.filter(o => o.priority === 'HIGH').length;

      // Productivity trends
      const dailyCompletions = this.calculateDailyCompletions(completedOrders);
      const weeklyTrends = this.calculateWeeklyTrends(orders);

      logger.info('Analytics metrics generated', { 
        totalOrders, 
        activeOrders: activeOrders.length,
        totalRevenue,
        onTimePercentage: onTimePercentage.toFixed(1)
      });

      return {
        overview: {
          totalOrders,
          activeOrders: activeOrders.length,
          completedOrders: completedOrders.length,
          totalRevenue,
          averageOrderValue,
          totalCustomers: customers.length,
          newCustomersThisMonth,
          repeatCustomers
        },
        performance: {
          onTimePercentage,
          overdueOrders: overdueOrders.length,
          averageCompletionDays: this.calculateAverageCompletionDays(completedOrders),
          onTimeOrders: onTimeOrders.length,
          delayedOrders: completedOrders.length - onTimeOrders.length
        },
        production: {
          totalHours,
          averageHours,
          averageComplexity,
          materialsWaiting,
          readyToStart,
          inProduction,
          urgentOrders,
          highPriorityOrders
        },
        revenue: {
          total: totalRevenue,
          weekly: weeklyRevenue,
          monthly: monthlyRevenue,
          yearly: yearlyOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0),
          averagePerOrder: averageOrderValue,
          averagePerCustomer: totalRevenue / customers.length || 0
        },
        trends: {
          weeklyOrders: weeklyOrders.length,
          monthlyOrders: monthlyOrders.length,
          dailyCompletions,
          weeklyTrends,
          growthRate: this.calculateGrowthRate(orders)
        },
        workflow: {
          statusCounts,
          bottlenecks: workflowBottlenecks,
          efficiency: this.calculateWorkflowEfficiency(orders),
          stageAverages: this.calculateStageAverages(orders)
        },
        alerts: this.generatePerformanceAlerts(orders, {
          overdueCount: overdueOrders.length,
          materialsWaiting,
          urgentOrders,
          onTimePercentage
        }),
        timestamp: now.toISOString()
      };
    }, 'analytics_comprehensive_metrics');
  }

  private calculateStatusDistribution(orders: OrderWithDetails[]): Record<string, number> {
    const statusCounts: Record<string, number> = {};
    orders.forEach(order => {
      const status = order.status || 'UNKNOWN';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    return statusCounts;
  }

  private identifyWorkflowBottlenecks(statusCounts: Record<string, number>, totalActive: number): Array<{
    stage: string;
    count: number;
    percentage: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    impact: string;
  }> {
    const bottlenecks = [];
    const thresholds = {
      ORDER_PROCESSED: { medium: 8, high: 15, critical: 25 },
      MATERIALS_ORDERED: { medium: 10, high: 20, critical: 30 },
      FRAME_CUT: { medium: 6, high: 12, critical: 20 },
      MAT_CUT: { medium: 5, high: 10, critical: 15 }
    };

    Object.entries(statusCounts).forEach(([status, count]) => {
      if (thresholds[status as keyof typeof thresholds]) {
        const threshold = thresholds[status as keyof typeof thresholds];
        const percentage = totalActive > 0 ? (count / totalActive) * 100 : 0;
        
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
        let impact = '';

        if (count >= threshold.critical) {
          severity = 'critical';
          impact = `Severe bottleneck affecting ${percentage.toFixed(1)}% of active orders`;
        } else if (count >= threshold.high) {
          severity = 'high';
          impact = `Significant backlog requiring immediate attention`;
        } else if (count >= threshold.medium) {
          severity = 'medium';
          impact = `Moderate delay risk in workflow`;
        }

        if (severity !== 'low') {
          bottlenecks.push({
            stage: status.replace('_', ' ').toLowerCase(),
            count,
            percentage,
            severity,
            impact
          });
        }
      }
    });

    return bottlenecks.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  private calculateAverageCompletionDays(completedOrders: OrderWithDetails[]): number {
    if (completedOrders.length === 0) return 0;
    
    const completionTimes = completedOrders
      .filter(o => o.completedAt && o.createdAt)
      .map(o => {
        const start = new Date(o.createdAt);
        const end = new Date(o.completedAt!);
        return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      });

    return completionTimes.length > 0 
      ? completionTimes.reduce((sum, days) => sum + days, 0) / completionTimes.length 
      : 0;
  }

  private calculateDailyCompletions(completedOrders: OrderWithDetails[]): Array<{ date: string; count: number }> {
    const last7Days = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const count = completedOrders.filter(o => {
        if (!o.completedAt) return false;
        return new Date(o.completedAt).toISOString().split('T')[0] === dateStr;
      }).length;
      
      last7Days.push({ date: dateStr, count });
    }
    
    return last7Days;
  }

  private calculateWeeklyTrends(orders: OrderWithDetails[]): Array<{ week: string; orders: number; revenue: number }> {
    const weeks = [];
    const now = new Date();
    
    for (let i = 4; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const weekOrders = orders.filter(o => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= weekStart && orderDate < weekEnd;
      });
      
      weeks.push({
        week: `Week of ${weekStart.toLocaleDateString()}`,
        orders: weekOrders.length,
        revenue: weekOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0)
      });
    }
    
    return weeks;
  }

  private calculateGrowthRate(orders: OrderWithDetails[]): number {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const lastMonthOrders = orders.filter(o => {
      const orderDate = new Date(o.createdAt);
      return orderDate >= lastMonth && orderDate < thisMonth;
    }).length;
    
    const thisMonthOrders = orders.filter(o => {
      const orderDate = new Date(o.createdAt);
      return orderDate >= thisMonth;
    }).length;
    
    if (lastMonthOrders === 0) return thisMonthOrders > 0 ? 100 : 0;
    return ((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 100;
  }

  private calculateWorkflowEfficiency(orders: OrderWithDetails[]): number {
    const completedOrders = orders.filter(o => ['PICKED_UP', 'COMPLETED'].includes(o.status));
    if (completedOrders.length === 0) return 100;
    
    const onTimeOrders = completedOrders.filter(o => {
      if (!o.dueDate || !o.completedAt) return false;
      return new Date(o.completedAt) <= new Date(o.dueDate);
    });
    
    return (onTimeOrders.length / completedOrders.length) * 100;
  }

  private calculateStageAverages(orders: OrderWithDetails[]): Record<string, { averageDays: number; count: number }> {
    const stageData: Record<string, { totalDays: number; count: number }> = {};
    
    orders.forEach(order => {
      if (!order.statusHistory || order.statusHistory.length === 0) return;
      
      for (let i = 1; i < order.statusHistory.length; i++) {
        const current = order.statusHistory[i];
        const previous = order.statusHistory[i - 1];
        
        const days = (new Date(current.changedAt).getTime() - new Date(previous.changedAt).getTime()) 
          / (1000 * 60 * 60 * 24);
        
        if (!stageData[current.toStatus]) {
          stageData[current.toStatus] = { totalDays: 0, count: 0 };
        }
        
        stageData[current.toStatus].totalDays += days;
        stageData[current.toStatus].count += 1;
      }
    });
    
    const stageAverages: Record<string, { averageDays: number; count: number }> = {};
    Object.entries(stageData).forEach(([stage, data]) => {
      stageAverages[stage] = {
        averageDays: data.count > 0 ? data.totalDays / data.count : 0,
        count: data.count
      };
    });
    
    return stageAverages;
  }

  private generatePerformanceAlerts(orders: OrderWithDetails[], metrics: any): AIMessage[] {
    const alerts: AIMessage[] = [];
    const now = new Date();
    
    // Overdue orders alert
    if (metrics.overdueCount > 0) {
      alerts.push({
        id: `overdue_${Date.now()}`,
        type: 'overdue',
        severity: metrics.overdueCount > 5 ? 'critical' : metrics.overdueCount > 2 ? 'high' : 'medium',
        title: 'Overdue Orders Alert',
        content: `${metrics.overdueCount} orders are past their due date and require immediate attention`,
        timestamp: now,
        metadata: { count: metrics.overdueCount, actionRequired: true }
      });
    }
    
    // Material bottleneck alert
    if (metrics.materialsWaiting > 8) {
      alerts.push({
        id: `materials_${Date.now()}`,
        type: 'materials',
        severity: metrics.materialsWaiting > 15 ? 'high' : 'medium',
        title: 'Material Bottleneck',
        content: `${metrics.materialsWaiting} orders waiting for materials - contact suppliers`,
        timestamp: now,
        metadata: { count: metrics.materialsWaiting, stage: 'MATERIALS_ORDERED' }
      });
    }
    
    // Urgent orders alert
    if (metrics.urgentOrders > 3) {
      alerts.push({
        id: `urgent_${Date.now()}`,
        type: 'urgent',
        severity: 'high',
        title: 'High Priority Workload',
        content: `${metrics.urgentOrders} urgent orders need prioritized handling`,
        timestamp: now,
        metadata: { count: metrics.urgentOrders, priority: 'URGENT' }
      });
    }
    
    // Performance alert
    if (metrics.onTimePercentage < 85) {
      alerts.push({
        id: `performance_${Date.now()}`,
        type: 'performance',
        severity: metrics.onTimePercentage < 70 ? 'high' : 'medium',
        title: 'Performance Issue',
        content: `On-time delivery rate is ${metrics.onTimePercentage.toFixed(1)}% - below target`,
        timestamp: now,
        metadata: { onTimePercentage: metrics.onTimePercentage, target: 90 }
      });
    }
    
    return alerts;
  }
}

export const analyticsEngine = new AnalyticsEngine();
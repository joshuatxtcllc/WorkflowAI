import { storage } from './storage';
import { logger } from './logger';
import { dbWrapper } from './database-wrapper';
import type { OrderWithDetails, WorkloadAnalysis, AIMessage } from '@shared/schema';

export class AnalyticsEngine {
  private lastMetrics: any = null;
  private lastUpdate: Date = new Date(0);
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  async generateComprehensiveMetrics(): Promise<any> {
    // Return cached metrics if still fresh
    const now = new Date();
    if (this.lastMetrics && (now.getTime() - this.lastUpdate.getTime()) < this.CACHE_DURATION) {
      return this.lastMetrics;
    }

    return dbWrapper.executeQuery(async () => {
      const orders = await storage.getOrders();
      const customers = await storage.getCustomers();

      const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Core metrics
      const totalOrders = orders.length;
      const activeOrders = orders.filter(o => !['PICKED_UP', 'COMPLETED'].includes(o.status));
      const completedOrders = orders.filter(o => ['PICKED_UP', 'COMPLETED'].includes(o.status));

      const weeklyOrders = orders.filter(o => new Date(o.createdAt) >= startOfWeek);
      const monthlyOrders = orders.filter(o => new Date(o.createdAt) >= startOfMonth);

      // Revenue calculations
      const totalRevenue = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
      const averageOrderValue = totalRevenue / totalOrders || 0;

      // Performance metrics
      const overdueOrders = activeOrders.filter(o => 
        o.dueDate && new Date(o.dueDate) < now
      );

      const onTimePercentage = completedOrders.length > 0 
        ? (completedOrders.filter(o => {
            if (!o.dueDate || !o.completedAt) return true;
            return new Date(o.completedAt) <= new Date(o.dueDate);
          }).length / completedOrders.length) * 100 
        : 100;

      // Production metrics
      const totalHours = orders.reduce((sum, o) => sum + (o.estimatedHours || 0), 0);
      const materialsWaiting = activeOrders.filter(o => o.status === 'MATERIALS_ORDERED').length;
      const urgentOrders = activeOrders.filter(o => o.priority === 'URGENT').length;

      // Status distribution
      const statusCounts = this.calculateStatusDistribution(orders);

      const metrics = {
        overview: {
          totalOrders,
          activeOrders: activeOrders.length,
          completedOrders: completedOrders.length,
          totalRevenue,
          averageOrderValue,
          totalCustomers: customers.length
        },
        performance: {
          onTimePercentage,
          overdueOrders: overdueOrders.length,
          onTimeOrders: completedOrders.length - overdueOrders.length
        },
        production: {
          totalHours,
          averageHours: totalHours / totalOrders || 0,
          materialsWaiting,
          urgentOrders
        },
        workflow: {
          statusCounts
        },
        trends: {
          weeklyOrders: weeklyOrders.length,
          monthlyOrders: monthlyOrders.length
        },
        alerts: this.generateBasicAlerts(overdueOrders.length, materialsWaiting, urgentOrders),
        timestamp: now.toISOString()
      };

      // Cache the results
      this.lastMetrics = metrics;
      this.lastUpdate = now;

      logger.info('Simplified analytics generated', { 
        totalOrders, 
        activeOrders: activeOrders.length,
        onTimePercentage: onTimePercentage.toFixed(1)
      });

      return metrics;
    }, 'analytics_simplified_metrics');
  }

  private calculateStatusDistribution(orders: OrderWithDetails[]): Record<string, number> {
    const statusCounts: Record<string, number> = {};
    orders.forEach(order => {
      const status = order.status || 'UNKNOWN';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    return statusCounts;
  }

  private generateBasicAlerts(overdueCount: number, materialsWaiting: number, urgentOrders: number): AIMessage[] {
    const alerts: AIMessage[] = [];
    const now = new Date();

    if (overdueCount > 0) {
      alerts.push({
        id: `overdue_${Date.now()}`,
        type: 'overdue',
        severity: overdueCount > 5 ? 'critical' : 'high',
        title: 'Overdue Orders Alert',
        content: `${overdueCount} orders are past their due date`,
        timestamp: now,
        metadata: { count: overdueCount }
      });
    }

    if (materialsWaiting > 8) {
      alerts.push({
        id: `materials_${Date.now()}`,
        type: 'materials',
        severity: 'medium',
        title: 'Material Bottleneck',
        content: `${materialsWaiting} orders waiting for materials`,
        timestamp: now,
        metadata: { count: materialsWaiting }
      });
    }

    if (urgentOrders > 3) {
      alerts.push({
        id: `urgent_${Date.now()}`,
        type: 'urgent',
        severity: 'high',
        title: 'High Priority Workload',
        content: `${urgentOrders} urgent orders need attention`,
        timestamp: now,
        metadata: { count: urgentOrders }
      });
    }

    return alerts;
  }
}

export const analyticsEngine = new AnalyticsEngine();
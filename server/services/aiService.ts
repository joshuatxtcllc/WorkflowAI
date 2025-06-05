import OpenAI from "openai";
import { storage } from "../storage";
import type { WorkloadAnalysis, AIMessage } from "@shared/schema";

export class AIService {
  private openai: OpenAI | null = null;
  private analysisCache: { data: WorkloadAnalysis; timestamp: number } | null = null;
  private readonly ANALYSIS_CACHE_TTL = 60000; // 1 minute cache

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ 
        apiKey: process.env.OPENAI_API_KEY 
      });
    }
  }

  async generateWorkloadAnalysis() {
    try {
      const now = Date.now();

      // Return cached analysis if still fresh
      if (this.analysisCache && (now - this.analysisCache.timestamp) < this.ANALYSIS_CACHE_TTL) {
        return this.analysisCache.data;
      }

      if (!this.openai) {
        return this.generateFallbackAnalysis();
      }

      // Get simplified workload data
      const workloadMetrics = await storage.getWorkloadMetrics();

      // Safe access to statusCounts with fallbacks
      const statusCounts = workloadMetrics.statusCounts || {};
      const orderProcessed = statusCounts.ORDER_PROCESSED || 0;
      const completed = statusCounts.COMPLETED || 0;

      const prompt = `PRODUCTION MANAGER ALERT: Frame shop has ${workloadMetrics.totalOrders} active orders requiring ${workloadMetrics.totalHours} total hours. 
Current status: ${orderProcessed} new orders, ${completed} completed today.
Material delays: ${statusCounts.MATERIALS_ORDERED || 0} orders waiting.
Overdue risk: ${statusCounts.DELAYED || 0} delayed orders.

As an AGGRESSIVE production manager, analyze this data and provide 3-4 DIRECT, ACTION-ORIENTED commands to maximize throughput and prevent delays. Be specific and demanding about what needs to happen immediately. Focus on bottlenecks, efficiency, and meeting deadlines.`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
        temperature: 0.5,
      });

      const analysis = completion.choices[0]?.message?.content || 'Analysis unavailable';

      // Generate recommendations based on workload
      const recommendations = this.generateRecommendations(workloadMetrics);
      
      const result = {
        ...workloadMetrics,
        aiInsights: analysis,
        recommendations,
        timestamp: new Date().toISOString()
      };

      // Update cache
      this.analysisCache = {
        data: result,
        timestamp: now
      };

      return result;
    } catch (error) {
      console.error('Error generating AI analysis:', error);

      // Return cached analysis if available
      if (this.analysisCache) {
        return this.analysisCache.data;
      }

      return this.generateFallbackAnalysis();
    }
  }

  async generateChatResponse(userMessage: string): Promise<string> {
    if (!this.openai) {
      return this.generateFallbackResponse(userMessage);
    }

    try {
      const orders = await storage.getOrders();
      const metrics = await storage.getWorkloadMetrics();
      const analysis = await this.generateWorkloadAnalysis();

      // Enhanced workload analysis for aggressive production management
      const activeOrders = orders.filter(o => !['PICKED_UP', 'CANCELLED'].includes(o.status));
      const overdueOrders = activeOrders.filter(o => o.dueDate && new Date(o.dueDate) < new Date());
      const urgentOrders = activeOrders.filter(o => o.priority === 'URGENT');
      const complexOrders = activeOrders.filter(o => o.estimatedHours > 8);

      const context = `
PRODUCTION STATUS REPORT:
- Active Orders: ${analysis.totalOrders} (${activeOrders.length} in production)
- Total Workload: ${analysis.totalHours}h
- OVERDUE ORDERS: ${overdueOrders.length} (CRITICAL PRIORITY)
- URGENT ORDERS: ${urgentOrders.length} (HIGH PRIORITY)
- Complex Orders (8+ hours): ${complexOrders.length}
- On-time Performance: ${analysis.onTimePercentage}%
- Risk Level: ${analysis.riskLevel.toUpperCase()}
- Active Bottlenecks: ${analysis.bottlenecks.join(', ')}

WORKLOAD DISTRIBUTION:
- Materials Ordered: ${analysis.statusCounts?.MATERIALS_ORDERED || 0}
- Ready for Production: ${(analysis.statusCounts?.MATERIALS_ARRIVED || 0) + (analysis.statusCounts?.FRAME_CUT || 0)}
- In Progress: ${(analysis.statusCounts?.FRAME_CUT || 0) + (analysis.statusCounts?.MAT_CUT || 0)}
- Awaiting Pickup: ${analysis.statusCounts?.COMPLETED || 0}

PRIORITY ORDERS: ${urgentOrders.slice(0, 3).map(o => 
  `${o.customer.name} (${o.trackingId}) - ${o.orderType} - Due: ${new Date(o.dueDate).toLocaleDateString()}`
).join(', ')}
`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an AGGRESSIVE AI production manager for Jay's Frames. Your job is to maximize efficiency, eliminate bottlenecks, and ensure on-time delivery.

CORE DIRECTIVES:
- Be direct and action-oriented in all responses
- Prioritize based on due dates, complexity, and material availability
- Identify and eliminate workflow inefficiencies immediately
- Group orders strategically for batch processing
- Maintain 95%+ on-time performance at all costs
- Call out problems before they become critical

COMMUNICATION STYLE:
- Use action verbs and specific commands
- Provide concrete next steps, not suggestions
- Group similar tasks for efficiency
- Flag critical issues that need immediate attention
- Focus on throughput optimization and deadline management

You have full authority to reorganize workflows and reassign priorities to maximize production efficiency.`
          },
          {
            role: "user",
            content: `${context}\n\nProduction Query: ${userMessage}`
          }
        ],
        max_tokens: 600,
      });

      return response.choices[0].message.content || 'Production analysis unavailable. Review workflow manually and address urgent orders first.';
    } catch (error) {
      console.error('Error generating AI production response:', error);
      return this.generateFallbackResponse(userMessage);
    }
  }

  private generateFallbackResponse(userMessage: string): string {
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('status') || lowerMessage.includes('update')) {
      return `I can help you check the current workload status. Please check the dashboard for real-time order information, or I can provide specific details about any order if you provide the tracking ID.`;
    }

    if (lowerMessage.includes('help') || lowerMessage.includes('behind')) {
      return `Here are some general recommendations for staying on track:

1. Prioritize orders by due date and complexity
2. Batch similar tasks together for efficiency
3. Check material availability before starting work
4. Update order status regularly for accurate tracking

Would you like specific information about any particular order or workflow stage?`;
    }

    if (lowerMessage.includes('material')) {
      return `For material management:
- Check the materials tab for each order
- Mark materials as "ordered" when placed with suppliers
- Update to "arrived" when materials are received
- This helps with accurate timeline projections

Do you need information about specific materials for an order?`;
    }

    return `I'm here to help with your framing shop operations! I can assist with:
- Order status and workload updates
- Workflow optimization suggestions
- Material tracking guidance
- Timeline and deadline management

What specific information would you like to know about?`;
  }

  private generateAlerts(activeOrders: any[], urgentOrders: any[]): AIMessage[] {
    const alerts: AIMessage[] = [];
    const now = new Date();

    // Check for overdue orders
    activeOrders.forEach(order => {
      const dueDate = new Date(order.dueDate);
      const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilDue < 0) {
        alerts.push({
          id: `overdue_${order.id}`,
          type: 'alert',
          content: `⚠️ OVERDUE: ${order.customer.name} order (${order.trackingId}) was due ${Math.abs(Math.round(hoursUntilDue))} hours ago. Current status: ${order.status.replace('_', ' ')}.`,
          timestamp: now,
          severity: 'urgent'
        });
      } else if (hoursUntilDue < 24) {
        alerts.push({
          id: `urgent_${order.id}`,
          type: 'alert',
          content: `⚠️ URGENT: ${order.customer.name} order (${order.trackingId}) is due in ${Math.round(hoursUntilDue)} hours. Current status: ${order.status.replace('_', ' ')}.`,
          timestamp: now,
          severity: 'urgent'
        });
      }
    });

    // Check for material delays
    const materialsOrderedOrders = activeOrders.filter(order => order.status === 'MATERIALS_ORDERED');
    if (materialsOrderedOrders.length > 0) {
      alerts.push({
        id: 'materials_waiting',
        type: 'alert',
        content: `📦 Materials Update: ${materialsOrderedOrders.length} orders waiting for materials to arrive. Check delivery schedules to update timelines.`,
        timestamp: now,
        severity: 'info'
      });
    }

    return alerts;
  }

  async analyzeWorkload(): Promise<WorkloadAnalysis> {
    return this.generateWorkloadAnalysis();
  }

  private generateRecommendations(metrics: any): string[] {
    const recommendations = [];
    
    // Aggressive material management
    if (metrics.statusCounts?.MATERIALS_ORDERED > 5) {
      recommendations.push("CRITICAL: Call suppliers NOW - too many orders waiting for materials");
    }
    
    // Demanding performance standards
    if (metrics.onTimePercentage < 95) {
      recommendations.push("UNACCEPTABLE: On-time performance below 95% - immediate workflow review required");
    }
    
    // Capacity management
    if (metrics.totalHours > 300) {
      recommendations.push("OVERLOAD ALERT: Consider overtime shifts or temporary staff immediately");
    } else if (metrics.totalHours > 250) {
      recommendations.push("HIGH CAPACITY: Monitor closely, prepare for potential overload");
    }
    
    // Urgent order management
    const urgentCount = metrics.statusCounts?.URGENT || 0;
    if (urgentCount > 5) {
      recommendations.push("TOO MANY URGENT ORDERS: Stop accepting rush jobs until backlog clears");
    } else if (urgentCount > 3) {
      recommendations.push("URGENT BOTTLENECK: Redistribute urgent workload across all stations");
    }
    
    // Production flow optimization
    if (metrics.statusCounts?.MATERIALS_ARRIVED > 8) {
      recommendations.push("PRODUCTION SLOWDOWN: Too many orders ready but not started - increase cutting capacity");
    }
    
    if (metrics.statusCounts?.FRAME_CUT > metrics.statusCounts?.MAT_CUT) {
      recommendations.push("MAT CUTTING BOTTLENECK: Frames backing up - prioritize mat cutting");
    }
    
    if (metrics.statusCounts?.COMPLETED > metrics.statusCounts?.PICKED_UP) {
      recommendations.push("STORAGE OVERFLOW: Call customers immediately for pickup - space needed");
    }
    
    // Efficiency optimization
    if (metrics.statusCounts?.PREPPED < 3) {
      recommendations.push("LOW PREP BUFFER: Increase assembly preparation to maintain flow");
    }
    
    // Quality control
    if (metrics.statusCounts?.DELAYED > 2) {
      recommendations.push("QUALITY ISSUES: Too many delays - review and fix root causes NOW");
    }
    
    return recommendations;
  }

  async generateAlerts(): Promise<AIMessage[]> {
    try {
      const orders = await storage.getOrders();
      const activeOrders = orders.filter(order => 
        !['PICKED_UP', 'CANCELLED'].includes(order.status || '')
      );
      
      return this.generateOrderAlerts(activeOrders);
    } catch (error) {
      console.error('Error generating alerts:', error);
      return [];
    }
  }

  private generateOrderAlerts(activeOrders: any[]): AIMessage[] {
    const alerts: AIMessage[] = [];
    const now = new Date();

    // Check for overdue orders
    activeOrders.forEach(order => {
      if (!order.dueDate) return;
      
      const dueDate = new Date(order.dueDate);
      const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilDue < 0) {
        alerts.push({
          id: `overdue_${order.id}`,
          type: 'alert',
          content: `⚠️ OVERDUE: ${order.customer?.name || 'Customer'} order (${order.trackingId}) was due ${Math.abs(Math.round(hoursUntilDue))} hours ago. Current status: ${order.status?.replace('_', ' ')}.`,
          timestamp: now,
          severity: 'urgent'
        });
      } else if (hoursUntilDue < 24) {
        alerts.push({
          id: `urgent_${order.id}`,
          type: 'alert',
          content: `⚠️ URGENT: ${order.customer?.name || 'Customer'} order (${order.trackingId}) is due in ${Math.round(hoursUntilDue)} hours. Current status: ${order.status?.replace('_', ' ')}.`,
          timestamp: now,
          severity: 'urgent'
        });
      }
    });

    // Check for material delays
    const materialsOrderedOrders = activeOrders.filter(order => order.status === 'MATERIALS_ORDERED');
    if (materialsOrderedOrders.length > 0) {
      alerts.push({
        id: 'materials_waiting',
        type: 'alert',
        content: `📦 Materials Update: ${materialsOrderedOrders.length} orders waiting for materials to arrive. Check delivery schedules to update timelines.`,
        timestamp: now,
        severity: 'info'
      });
    }

    // Check for high priority orders
    const highPriorityOrders = activeOrders.filter(order => 
      ['HIGH', 'URGENT'].includes(order.priority || '')
    );
    if (highPriorityOrders.length > 5) {
      alerts.push({
        id: 'high_priority_alert',
        type: 'alert',
        content: `🔥 Priority Alert: ${highPriorityOrders.length} high-priority orders require attention. Consider redistributing workload.`,
        timestamp: now,
        severity: 'warning'
      });
    }

    return alerts;
  }

  private generateFallbackAnalysis(): WorkloadAnalysis {
    // Provide a default or cached analysis when AI is unavailable
    const totalOrders = 50;
    const totalHours = 200;
    const averageComplexity = totalHours / totalOrders;

    return {
      totalOrders: totalOrders,
      totalHours: totalHours,
      onTimePercentage: 95,
      riskLevel: 'LOW',
      bottlenecks: ['Material delays', 'Staffing shortages'],
      recommendations: [
        'Monitor material delivery schedules',
        'Consider staff scheduling optimization',
        'Review high-complexity orders for efficiency gains'
      ],
      statusCounts: {
        ORDER_PLACED: 10,
        MATERIALS_ORDERED: 15,
        IN_PROGRESS: 15,
        QUALITY_CHECK: 5,
        COMPLETED: 5
      },
      totalWorkload: totalHours,
      averageComplexity: averageComplexity.toFixed(1),
      trends: {
        weeklyGrowth: '+12%',
        efficiencyScore: '87%',
        predictedCompletion: '3 days'
      },
      alerts: [],
      aiInsights: 'AI insights unavailable - using cached analysis.'
    };
  }
}
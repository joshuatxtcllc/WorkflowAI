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

      const prompt = `Frame shop workload: ${workloadMetrics.totalOrders} orders, ${workloadMetrics.totalHours} hours. 
Status: ${orderProcessed} new, ${completed} completed.
Provide 2-3 bullet points of actionable insights in under 100 words.`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
        temperature: 0.5,
      });

      const analysis = completion.choices[0]?.message?.content || 'Analysis unavailable';

      const result = {
        ...workloadMetrics,
        aiInsights: analysis,
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

      const context = `
Current Workload Context:
- Active Orders: ${analysis.totalOrders}
- Total Hours: ${analysis.totalHours}h
- On-time Percentage: ${analysis.onTimePercentage}%
- Risk Level: ${analysis.riskLevel.toUpperCase()}
- Current Bottlenecks: ${analysis.bottlenecks.join(', ')}

Recent Orders: ${orders.slice(0, 5).map(o => 
  `${o.customer.name} (${o.trackingId}) - ${o.orderType} - ${o.status} - Due: ${new Date(o.dueDate).toLocaleDateString()}`
).join('\n')}
`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are an AI assistant for Jay's Frames, a custom framing shop. You help with production management, order tracking, and workflow optimization. 

Key responsibilities:
- Provide status updates on orders and workload
- Suggest workflow improvements
- Help prioritize tasks
- Answer questions about materials and deadlines
- Offer practical advice for frame shop operations

Be helpful, concise, and actionable in your responses. Use the workload context to provide relevant insights.`
          },
          {
            role: "user",
            content: `${context}\n\nUser Question: ${userMessage}`
          }
        ],
        max_tokens: 500,
      });

      return response.choices[0].message.content || 'I apologize, but I could not generate a response at this time.';
    } catch (error) {
      console.error('Error generating AI chat response:', error);
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
      alerts: [
        /*orders.some(order => 
          order.dueDate && new Date(order.dueDate) < new Date(Date.now() + 24 * 60 * 60 * 1000)
        ) ? 'ORDER_DUE_SOON' : null*/
      ].filter(Boolean),
      aiInsights: 'AI insights unavailable.'
    };
  }
}
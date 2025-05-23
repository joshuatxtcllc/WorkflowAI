import OpenAI from "openai";
import { storage } from "../storage";
import type { WorkloadAnalysis, AIMessage } from "@shared/schema";

export class AIService {
  private openai: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ 
        apiKey: process.env.OPENAI_API_KEY 
      });
    }
  }

  async generateWorkloadAnalysis(): Promise<WorkloadAnalysis> {
    try {
      const orders = await storage.getOrders();
      const metrics = await storage.getWorkloadMetrics();
      
      const activeOrders = orders.filter(order => 
        !['COMPLETED', 'PICKED_UP'].includes(order.status)
      );

      // Calculate basic metrics
      const totalHours = activeOrders.reduce((sum, order) => sum + order.estimatedHours, 0);
      const urgentOrders = activeOrders.filter(order => 
        order.priority === 'URGENT' || 
        new Date(order.dueDate) <= new Date(Date.now() + 24 * 60 * 60 * 1000)
      );

      // Identify bottlenecks
      const statusCounts = activeOrders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const bottlenecks: string[] = [];
      Object.entries(statusCounts).forEach(([status, count]) => {
        if (count > 3) {
          bottlenecks.push(`${status.replace('_', ' ').toLowerCase()} station backed up (${count} orders)`);
        }
      });

      // Generate AI recommendations if OpenAI is available
      let recommendations: string[] = [
        'Consider batching similar order types together',
        'Review material ordering timeline',
        'Monitor due dates for priority adjustments'
      ];

      if (this.openai && activeOrders.length > 0) {
        try {
          const prompt = `Analyze this framing shop workload and provide 3-5 specific actionable recommendations:

Active Orders: ${activeOrders.length}
Total Hours: ${totalHours}h
Urgent Orders: ${urgentOrders.length}
Status Distribution: ${JSON.stringify(statusCounts)}
Current Bottlenecks: ${bottlenecks.join(', ')}

Provide recommendations in JSON format as an array of strings.`;

          const response = await this.openai.chat.completions.create({
            model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            messages: [
              {
                role: "system",
                content: "You are an AI assistant for a custom framing shop. Provide practical, actionable recommendations for workflow optimization. Respond with JSON only."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            response_format: { type: "json_object" },
          });

          const aiResponse = JSON.parse(response.choices[0].message.content || '{}');
          if (aiResponse.recommendations && Array.isArray(aiResponse.recommendations)) {
            recommendations = aiResponse.recommendations;
          }
        } catch (error) {
          console.error('Error generating AI recommendations:', error);
        }
      }

      // Determine risk level
      let riskLevel: WorkloadAnalysis['riskLevel'] = 'low';
      if (urgentOrders.length > 0 || totalHours > 40) riskLevel = 'medium';
      if (urgentOrders.length > 2 || totalHours > 60) riskLevel = 'high';
      if (urgentOrders.length > 5 || totalHours > 80) riskLevel = 'critical';

      // Calculate projected completion
      const workingHoursPerDay = 8;
      const daysToComplete = Math.ceil(totalHours / workingHoursPerDay);
      const projectedCompletion = new Date();
      projectedCompletion.setDate(projectedCompletion.getDate() + daysToComplete);

      const analysis: WorkloadAnalysis = {
        totalOrders: activeOrders.length,
        totalHours: Math.round(totalHours * 10) / 10,
        averageComplexity: Math.round(metrics.averageComplexity * 10) / 10,
        onTimePercentage: metrics.onTimePercentage,
        bottlenecks,
        recommendations,
        projectedCompletion,
        riskLevel
      };

      // Save analysis to database
      await storage.saveAIAnalysis({
        metrics: analysis,
        alerts: this.generateAlerts(activeOrders, urgentOrders)
      });

      return analysis;
    } catch (error) {
      console.error('Error generating workload analysis:', error);
      throw new Error('Failed to generate workload analysis');
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
}

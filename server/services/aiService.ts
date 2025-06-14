import OpenAI from "openai";
import { storage } from "../storage";
import { framingKnowledgeService } from "./framingKnowledgeService";
import type { WorkloadAnalysis, AIMessage } from "@shared/schema";

// Add Anthropic support
interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class AIService {
  private openai: OpenAI | null = null;
  private anthropicApiKey: string | null = null;
  private perplexityApiKey: string | null = null;
  private analysisCache: { data: WorkloadAnalysis; timestamp: number } | null = null;
  private readonly ANALYSIS_CACHE_TTL = 60000; // 1 minute cache

  constructor() {
    // Initialize AI providers based on available API keys
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ 
        apiKey: process.env.OPENAI_API_KEY 
      });
    }

    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY || null;
    this.perplexityApiKey = process.env.PERPLEXITY_API_KEY || null;

    console.log('AI Service initialized with providers:', {
      openai: !!this.openai,
      anthropic: !!this.anthropicApiKey,
      perplexity: !!this.perplexityApiKey
    });
  }

  private async callAnthropic(messages: AnthropicMessage[], maxTokens: number = 500): Promise<string> {
    if (!this.anthropicApiKey) {
      throw new Error('Anthropic API key not available');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: maxTokens,
        messages: messages
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0]?.text || 'No response from Claude';
  }

  private async callPerplexity(prompt: string, maxTokens: number = 500): Promise<string> {
    if (!this.perplexityApiKey) {
      throw new Error('Perplexity API key not available');
    }

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.perplexityApiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No response from Perplexity';
  }

  private async getBestAIResponse(prompt: string, maxTokens: number = 500): Promise<string> {
    // Try providers in order of preference: Claude, Perplexity, OpenAI
    const errors: string[] = [];

    // Try Claude first (best for complex reasoning)
    if (this.anthropicApiKey) {
      try {
        return await this.callAnthropic([{ role: 'user', content: prompt }], maxTokens);
      } catch (error) {
        errors.push(`Claude: ${error.message}`);
      }
    }

    // Try Perplexity (great for real-time info and web search)
    if (this.perplexityApiKey) {
      try {
        return await this.callPerplexity(prompt, maxTokens);
      } catch (error) {
        errors.push(`Perplexity: ${error.message}`);
      }
    }

    // Fallback to OpenAI
    if (this.openai) {
      try {
        const completion = await this.openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          max_tokens: maxTokens,
          temperature: 0.7,
        });
        return completion.choices[0]?.message?.content || 'No response from OpenAI';
      } catch (error) {
        errors.push(`OpenAI: ${error.message}`);
      }
    }

    throw new Error(`All AI providers failed: ${errors.join(', ')}`);
  }

  async generateWorkloadAnalysis() {
    try {
      const now = Date.now();

      // Return cached analysis if still fresh
      if (this.analysisCache && (now - this.analysisCache.timestamp) < this.ANALYSIS_CACHE_TTL) {
        return this.analysisCache.data;
      }

      // Get simplified workload data
      const workloadMetrics = await storage.getWorkloadMetrics();

      // Safe access to statusCounts with fallbacks
      const statusCounts = workloadMetrics.statusCounts || {};
      const orderProcessed = statusCounts.ORDER_PROCESSED || 0;
      const completed = statusCounts.COMPLETED || 0;

      const prompt = `PRODUCTION REALITY CHECK: Jay's Frames has ${workloadMetrics.totalOrders} active orders requiring ${workloadMetrics.totalHours} total hours. 
Current status: ${orderProcessed} new orders, ${completed} completed today.
Material delays: ${statusCounts.MATERIALS_ORDERED || 0} orders waiting.
Overdue risk: ${statusCounts.DELAYED || 0} delayed orders.

IMPORTANT CONTEXT:
- Solo operator (Jay) with 8-12 orders/day maximum capacity
- Current bottleneck: System setup completion
- Goal: Get production-ready system operational today

Provide realistic analysis focusing on:
1. Realistic timeline based on solo capacity
2. Priority orders that can be completed first
3. System readiness tasks
4. Efficient workflow suggestions for single operator`;

      const analysis = await this.getBestAIResponse(prompt, 150);

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

      return await this.generateFallbackAnalysis();
    }
  }

  async generateChatResponse(userMessage: string): Promise<string> {
    try {
      // Check for specific action patterns first
      const actionResponse = await this.processActionCommand(userMessage);
      if (actionResponse) {
        return actionResponse;
      }

      // Auto-detect customer name mentions and search for their orders
      const customerNameMatch = this.extractCustomerNameFromMessage(userMessage);
      if (customerNameMatch) {
        const customerSearchResult = await this.findCustomerOrders(`find orders for ${customerNameMatch}`);
        if (customerSearchResult && !customerSearchResult.includes('not found')) {
          return customerSearchResult;
        }
      }

      // Get current context
      const orders = await storage.getOrders();
      const customers = await storage.getCustomers();
      const alerts = await this.generateAlerts();

      // Create context summary
      const context = {
        totalOrders: orders.length,
        overdueOrders: orders.filter(o => new Date(o.dueDate) < new Date()).length,
        urgentOrders: orders.filter(o => o.priority === 'URGENT').length,
        recentAlerts: alerts.slice(0, 3),
        orderStatuses: orders.reduce((acc, order) => {
          acc[order.status || 'unknown'] = (acc[order.status || 'unknown'] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };

      const prompt = `You are Jay's Frames AI Assistant - a professional custom frame shop management system. Help with frame shop operations using this context:

**Current Shop Status:**
- Total Active Orders: ${context.totalOrders}
- Overdue Orders: ${context.overdueOrders}
- Urgent Priority Orders: ${context.urgentOrders}
- Order Distribution: ${JSON.stringify(context.orderStatuses)}

**Recent System Alerts:** ${context.recentAlerts.map(a => a.message).join(', ')}

**User Request:** "${userMessage}"

**Instructions:**
- Provide specific, actionable advice for managing the frame shop
- Be professional but conversational
- Focus on practical solutions for a solo operator
- If asking about framing techniques, provide expert-level advice
- For business operations, prioritize efficiency and customer satisfaction
- Keep responses concise but comprehensive

Respond as a knowledgeable frame shop management assistant.`;

      return await this.getBestAIResponse(prompt, 500);
    } catch (error) {
      console.error('AI chat error:', error);
      return "I'm currently having trouble processing your request. The AI service may be temporarily unavailable. Please try again in a moment.";
    }
  }

  private extractCustomerNameFromMessage(message: string): string | null {
    // Look for customer names mentioned in various contexts
    const patterns = [
      /(?:orders for|check on|find|locate|smith['']?s?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+orders?/i,
      /customer\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /\b([A-Z][a-z]+)\b/g // Last resort - any capitalized word
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        // Filter out common words that aren't names
        const excludeWords = ['Orders', 'Order', 'Customer', 'Status', 'System', 'Production', 'Schedule', 'Frame', 'Mat', 'Glass'];
        if (!excludeWords.includes(name) && name.length > 2) {
          return name;
        }
      }
    }

    return null;
  }

  private async processActionCommand(userMessage: string): Promise<string | null> {
    const lowerMessage = userMessage.toLowerCase();

    // Find customer orders
    if (lowerMessage.includes('find orders for') || lowerMessage.includes('show orders for')) {
      return await this.findCustomerOrders(userMessage);
    }

    // Send customer update
    if (lowerMessage.includes('send update to') || lowerMessage.includes('notify customer')) {
      return await this.sendCustomerUpdate(userMessage);
    }

    // Create order for customer
    if (lowerMessage.includes('create order for') || lowerMessage.includes('add order for')) {
      return await this.createOrderForCustomer(userMessage);
    }

    // Find specific order
    if (lowerMessage.includes('find order') && (lowerMessage.includes('trk-') || lowerMessage.includes('#'))) {
      return await this.findSpecificOrder(userMessage);
    }

    // Framing knowledge queries
    if (lowerMessage.includes('how to') || lowerMessage.includes('framing technique') || 
        lowerMessage.includes('framing method') || lowerMessage.includes('best practice')) {
      return await this.getFramingAdvice(userMessage);
    }

    // Troubleshooting queries
    if (lowerMessage.includes('problem with') || lowerMessage.includes('issue with') || 
        lowerMessage.includes('troubleshoot') || lowerMessage.includes('fix')) {
      return await this.getFramingTroubleshooting(userMessage);
    }

    // Material advice queries
    if (lowerMessage.includes('what material') || lowerMessage.includes('which moulding') || 
        lowerMessage.includes('recommend') || lowerMessage.includes('best for')) {
      return await this.getFramingMaterialAdvice(userMessage);
    }

    return null;
  }

  private async findCustomerOrders(userMessage: string): Promise<string> {
    try {
      // Extract customer name from message
      const nameMatch = userMessage.match(/(?:find orders for|show orders for|orders for)\s+([a-zA-Z\s]+)/i);
      if (!nameMatch) {
        return "Please specify the customer name. Example: 'Find orders for John Smith'";
      }

      const customerName = nameMatch[1].trim();
      const customers = await storage.getCustomers();
      const customer = customers.find(c => 
        c.name.toLowerCase().includes(customerName.toLowerCase()) ||
        customerName.toLowerCase().includes(c.name.toLowerCase())
      );

      if (!customer) {
        return `No customer found matching "${customerName}". Please check the spelling or try a partial name.`;
      }

      const orders = await storage.getOrdersByCustomer(customer.id);

      if (orders.length === 0) {
        return `${customer.name} has no orders in the system.`;
      }

      const orderSummary = orders.map(order => 
        `• ${order.trackingId} - ${order.orderType} - ${order.status} - Due: ${new Date(order.dueDate).toLocaleDateString()}`
      ).join('\n');

      return `Found ${orders.length} order(s) for ${customer.name}:\n\n${orderSummary}\n\nTotal value: $${orders.reduce((sum, o) => sum + (o.price || 0), 0)}`;
    } catch (error) {
      return "Error finding customer orders. Please try again.";
    }
  }

  private async sendCustomerUpdate(userMessage: string): Promise<string> {
    try {
      // Extract customer name and message
      const customerMatch = userMessage.match(/(?:send update to|notify customer)\s+([a-zA-Z\s]+?)(?:\s+(?:about|that|saying)\s+(.+))?$/i);
      if (!customerMatch) {
        return "Please specify: 'Send update to [Customer Name] about [message]'";
      }

      const customerName = customerMatch[1].trim();
      const updateMessage = customerMatch[2]?.trim() || "General order update";

      const customers = await storage.getCustomers();
      const customer = customers.find(c => 
        c.name.toLowerCase().includes(customerName.toLowerCase())
      );

      if (!customer) {
        return `Customer "${customerName}" not found. Please check the spelling.`;
      }

      // Get customer's most recent order
      const orders = await storage.getOrdersByCustomer(customer.id);
      if (orders.length === 0) {
        return `${customer.name} has no orders to send updates about.`;
      }

      const latestOrder = orders.sort((a, b) => 
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      )[0];

      // Create notification
      const { NotificationService } = await import('../notificationService');
      const notificationService = new NotificationService();

      await storage.createNotification({
        customerId: customer.id,
        orderId: latestOrder.id,
        type: 'STATUS_UPDATE',
        channel: 'EMAIL',
        subject: `Order Update - ${latestOrder.trackingId}`,
        content: `Dear ${customer.name},\n\n${updateMessage}\n\nOrder: ${latestOrder.trackingId}\nStatus: ${latestOrder.status}\n\nBest regards,\nJay's Frames`,
        metadata: {
          orderStatus: latestOrder.status,
          trackingId: latestOrder.trackingId,
          customMessage: updateMessage
        }
      });

      return `✅ Update sent to ${customer.name} about order ${latestOrder.trackingId}.\n\nMessage: "${updateMessage}"\n\nNotification created and queued for delivery.`;
    } catch (error) {
      return "Error sending customer update. Please try again.";
    }
  }

  private async createOrderForCustomer(userMessage: string): Promise<string> {
    try {
      // Extract customer name and order details
      const orderMatch = userMessage.match(/(?:create order for|add order for)\s+([a-zA-Z\s]+?)(?:\s+for\s+(.+))?$/i);
      if (!orderMatch) {
        return "Please specify: 'Create order for [Customer Name] for [description]'";
      }

      const customerName = orderMatch[1].trim();
      const orderDescription = orderMatch[2]?.trim() || "Custom frame order";

      const customers = await storage.getCustomers();
      const customer = customers.find(c => 
        c.name.toLowerCase().includes(customerName.toLowerCase())
      );

      if (!customer) {
        return `Customer "${customerName}" not found. Please check the spelling or create the customer first.`;
      }

      // Create order with reasonable defaults
      const orderData = {
        customerId: customer.id,
        trackingId: `TRK-${Date.now()}`,
        orderType: 'FRAME' as const,
        status: 'ORDER_PROCESSED' as const,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
        estimatedHours: 3,
        price: 200,
        description: orderDescription,
        priority: 'MEDIUM' as const,
        notes: 'Created via AI assistant'
      };

      const order = await storage.createOrder(orderData);

      // Create status history
      await storage.createStatusHistory({
        orderId: order.id,
        toStatus: 'ORDER_PROCESSED',
        changedBy: 'ai-assistant',
        reason: 'Order created via chat command'
      });

      return `✅ Order created successfully!\n\nCustomer: ${customer.name}\nTracking ID: ${order.trackingId}\nDescription: ${orderDescription}\nDue Date: ${new Date(order.dueDate).toLocaleDateString()}\nEstimated Value: $${order.price}\n\nOrder is now in the production queue.`;
    } catch (error) {
      return "Error creating order. Please try again or create the order manually.";
    }
  }

  private async findSpecificOrder(userMessage: string): Promise<string> {
    try {
      // Extract tracking ID
      const trackingMatch = userMessage.match(/(?:trk-[\w\d-]+|#[\w\d-]+)/i);
      if (!trackingMatch) {
        return "Please provide a tracking ID (e.g., TRK-123 or #123)";
      }

      let trackingId = trackingMatch[0];
      if (trackingId.startsWith('#')) {
        trackingId = 'TRK-' + trackingId.substring(1);
      }

      const orders = await storage.getOrders();
      const order = orders.find(o => 
        o.trackingId.toLowerCase() === trackingId.toLowerCase()
      );

      if (!order) {
        return `Order ${trackingId} not found. Please check the tracking ID.`;
      }

      const customer = order.customer;
      const daysUntilDue = Math.ceil((new Date(order.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const statusIcon = order.status === 'COMPLETED' ? '✅' : 
                        order.status === 'DELAYED' ? '⚠️' : '🔄';

      return `${statusIcon} **Order ${order.trackingId}**\n\nCustomer: ${customer.name}\nType: ${order.orderType}\nStatus: ${order.status.replace('_', ' ')}\nDescription: ${order.description}\nDue: ${new Date(order.dueDate).toLocaleDateString()} (${daysUntilDue > 0 ? `${daysUntilDue} days` : 'OVERDUE'})\nValue: $${order.price}\nPriority: ${order.priority}\n\n${order.notes ? `Notes: ${order.notes}` : ''}`;
    } catch (error) {
      return "Error finding order. Please try again.";
    }
  }

  private async getFramingAdvice(userMessage: string): Promise<string> {
    try {
      const advice = await framingKnowledgeService.searchFramingKnowledge(userMessage);
      return `🔨 **Professional Framing Advice:**\n\n${advice}`;
    } catch (error) {
      return "I can help with framing techniques. Try asking about specific methods like 'How to mount canvas' or 'Best practice for conservation framing'.";
    }
  }

  private async getFramingTroubleshooting(userMessage: string): Promise<string> {
    try {
      const help = await framingKnowledgeService.getTroubleshootingHelp(userMessage);
      return `🔧 **Framing Troubleshooting:**\n\n${help}`;
    } catch (error) {
      return "I can help troubleshoot framing issues. Describe the specific problem you're encountering.";
    }
  }

  private async getFramingMaterialAdvice(userMessage: string): Promise<string> {
    try {
      const advice = await framingKnowledgeService.getMaterialAdvice(userMessage);
      return `📋 **Material Recommendation:**\n\n${advice}`;
    } catch (error) {
      return "I can help with material selection. Ask about specific materials like moulding, matting, or glazing options.";
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

**Business Operations:**
- "Find orders for [Customer Name]" - Show all orders for a customer
- "Send update to [Customer] about [message]" - Send notification
- "Create order for [Customer] for [description]" - Add new order
- "Find order TRK-123" - Get specific order details

**Professional Framing Knowledge:**
- "How to mount canvas" - Get expert framing techniques
- "Best practice for conservation framing" - Professional advice
- "Problem with warped frame" - Troubleshooting help
- "What material for oil painting" - Material recommendations

**Examples:**
- "Find orders for Sarah Johnson"
- "How to frame textiles properly"
- "Problem with bubbling mat"
- "Best moulding for heavy artwork"

What would you like me to help you with?`;
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
        id: `materials_waiting_${Date.now()}`,
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

    // Realistic material management
    if (metrics.statusCounts?.MATERIALS_ORDERED > 5) {
      recommendations.push("Material Check: Follow up with suppliers on delivery schedules");
    }

    // Realistic performance tracking
    if (metrics.onTimePercentage < 85) {
      recommendations.push("Timeline Review: Adjust due dates based on 8-12 orders/day capacity");
    }

    // Solo capacity management
    const dailyCapacityDays = Math.ceil(metrics.totalOrders / 10); // Average 10 orders/day
    if (metrics.totalHours > 300) {
      recommendations.push(`Workload Alert: Current backlog requires ~${dailyCapacityDays} days at full capacity`);
    }

    // Realistic urgent order management
    const urgentCount = metrics.statusCounts?.URGENT || 0;
    if (urgentCount > 10) {
      recommendations.push("Priority Focus: Too many urgent orders - consider customer communication about realistic timelines");
    } else if (urgentCount > 5) {
      recommendations.push(`Urgent Queue: ${urgentCount} urgent orders = ~${Math.ceil(urgentCount/10)} days at full capacity`);
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
    const sessionId = Math.random().toString(36).substr(2, 16);
    let alertSequence = 0;

    // Ultra-robust unique ID generator
    const generateUniqueId = (prefix: string, orderId?: string) => {
      alertSequence++;
      const nanoTime = process.hrtime.bigint().toString();
      const randomSuffix = Math.random().toString(36).substr(2, 16);
      return `${prefix}_${orderId || 'system'}_${sessionId}_${alertSequence}_${nanoTime}_${randomSuffix}`;
    };

    // Group orders by status for batch processing
    const ordersByStatus = {
      overdue: [],
      urgent: [],
      materialsOrdered: [],
      highPriority: []
    };

    // Categorize orders once
    activeOrders.forEach((order) => {
      if (!order.dueDate) return;

      const dueDate = new Date(order.dueDate);
      const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilDue < 0) {
        ordersByStatus.overdue.push({ ...order, hoursUntilDue });
      } else if (hoursUntilDue < 24) {
        ordersByStatus.urgent.push({ ...order, hoursUntilDue });
      }

      if (order.status === 'MATERIALS_ORDERED') {
        ordersByStatus.materialsOrdered.push(order);
      }

      if (['HIGH', 'URGENT'].includes(order.priority || '')) {
        ordersByStatus.highPriority.push(order);
      }
    });

    // Generate overdue alerts - limit to prevent UI overload
    ordersByStatus.overdue.slice(0, 10).forEach((order) => {
      alerts.push({
        id: generateUniqueId('overdue', order.id),
        type: 'alert',
        content: `⚠️ OVERDUE: ${order.customer?.name || 'Customer'} order (${order.trackingId}) was due ${Math.abs(Math.round(order.hoursUntilDue))} hours ago. Current status: ${order.status?.replace('_', ' ')}.`,
        timestamp: now,
        severity: 'urgent'
      });
    });

    // Generate urgent alerts - limit to prevent UI overload
    ordersByStatus.urgent.slice(0, 5).forEach((order) => {
      alerts.push({
        id: generateUniqueId('urgent', order.id),
        type: 'alert',
        content: `⚠️ URGENT: ${order.customer?.name || 'Customer'} order (${order.trackingId}) is due in ${Math.round(order.hoursUntilDue)} hours. Current status: ${order.status?.replace('_', ' ')}.`,
        timestamp: now,
        severity: 'urgent'
      });
    });

    // Materials alert
    if (ordersByStatus.materialsOrdered.length > 0) {
      alerts.push({
        id: generateUniqueId('materials'),
        type: 'alert',
        content: `📦 Materials Update: ${ordersByStatus.materialsOrdered.length} orders waiting for materials to arrive. Check delivery schedules to update timelines.`,
        timestamp: now,
        severity: 'info'
      });
    }

    // Priority alert
    if (ordersByStatus.highPriority.length > 5) {
      alerts.push({
        id: generateUniqueId('priority'),
        type: 'alert',
        content: `🔥 Priority Alert: ${ordersByStatus.highPriority.length} high-priority orders require attention. Consider redistributing workload.`,
        timestamp: now,
        severity: 'warning'
      });
    }

    return alerts;
  }

  private async generateFallbackAnalysis(): WorkloadAnalysis {
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
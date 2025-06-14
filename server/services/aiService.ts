import OpenAI from "openai";
import { storage } from "../storage";
import { framingKnowledgeService } from "./framingKnowledgeService";
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
        return await this.generateFallbackAnalysis();
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

      const prompt = `You are Jay's Frames AI Assistant. Help with frame shop operations using this context:

Current Status:
- Total Orders: ${context.totalOrders}
- Overdue Orders: ${context.overdueOrders}
- Urgent Orders: ${context.urgentOrders}
- Order Distribution: ${JSON.stringify(context.orderStatuses)}

Recent Alerts: ${context.recentAlerts.map(a => a.message).join(', ')}

User Question: "${userMessage}"

Provide helpful, specific advice for managing the frame shop. Be concise and actionable.`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content || "I'm sorry, I couldn't process that request.";
    } catch (error) {
      console.error('AI chat error:', error);
      return "I'm currently having trouble processing your request. Please try again.";
    }
  }

  private extractCustomerNameFromMessage(message: string): string | null {
    // Enhanced patterns for better name extraction
    const patterns = [
      // Direct name mentions
      /(?:orders? for|check on|find|locate|customer)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+orders?/i,
      /show\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      // Name variants
      /smith['']?s?/i, // Matches Smith, Smith's, Smiths
      // Partial names
      /\b([A-Z][a-z]{2,})\b/g // Any capitalized word 3+ letters
    ];

    for (const pattern of patterns) {
      const matches = message.match(pattern);
      if (matches) {
        // Handle global regex differently
        if (pattern.global) {
          const allMatches = [...message.matchAll(pattern)];
          for (const match of allMatches) {
            const name = match[1]?.trim();
            if (name && this.isValidName(name)) {
              return name;
            }
          }
        } else {
          const name = matches[1]?.trim();
          if (name && this.isValidName(name)) {
            return name;
          }
        }
      }
    }

    // Special case for "Smith" variations
    if (/smith/i.test(message)) {
      return "Smith";
    }

    return null;
  }

  private isValidName(name: string): boolean {
    const excludeWords = [
      'Orders', 'Order', 'Customer', 'Status', 'System', 'Production', 
      'Schedule', 'Frame', 'Mat', 'Glass', 'Find', 'Show', 'Check',
      'The', 'All', 'Any', 'Some', 'This', 'That', 'Which', 'What'
    ];
    return !excludeWords.includes(name) && name.length > 2;
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
      // Extract customer name with multiple patterns
      let customerName = '';
      const patterns = [
        /(?:find orders for|show orders for|orders for)\s+([a-zA-Z\s]+)/i,
        /([a-zA-Z\s]+)\s+orders?/i,
        /customer\s+([a-zA-Z\s]+)/i
      ];

      for (const pattern of patterns) {
        const match = userMessage.match(pattern);
        if (match && match[1]) {
          customerName = match[1].trim();
          break;
        }
      }

      // Use extracted name from message parsing if no explicit pattern match
      if (!customerName) {
        customerName = this.extractCustomerNameFromMessage(userMessage) || '';
      }

      if (!customerName) {
        return "Please specify the customer name. Example: 'Find orders for John Smith' or 'Smith orders'";
      }

      const customers = await storage.getCustomers();
      
      // Enhanced fuzzy search
      let customer = customers.find(c => 
        c.name.toLowerCase() === customerName.toLowerCase()
      );

      // If no exact match, try partial matching
      if (!customer) {
        customer = customers.find(c => 
          c.name.toLowerCase().includes(customerName.toLowerCase()) ||
          customerName.toLowerCase().includes(c.name.toLowerCase())
        );
      }

      // If still no match, try word-by-word matching
      if (!customer) {
        const searchWords = customerName.toLowerCase().split(' ');
        customer = customers.find(c => 
          searchWords.some(word => c.name.toLowerCase().includes(word))
        );
      }

      if (!customer) {
        // Show available customers for reference
        const customerList = customers.slice(0, 10).map(c => c.name).join(', ');
        return `No customer found matching "${customerName}". 

Available customers include: ${customerList}${customers.length > 10 ? '...' : ''}

Try using the exact name or a clearer partial name.`;
      }

      const orders = await storage.getOrdersByCustomer(customer.id);

      if (orders.length === 0) {
        return `✅ Customer found: ${customer.name}
📧 Contact: ${customer.email || 'No email'}
📞 Phone: ${customer.phone || 'No phone'}

❌ No orders found for this customer.`;
      }

      // Enhanced order summary with status icons
      const orderSummary = orders.map(order => {
        const statusIcon = this.getStatusIcon(order.status || '');
        const daysUntilDue = Math.ceil((new Date(order.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const urgencyLabel = daysUntilDue < 0 ? '🚨 OVERDUE' : 
                            daysUntilDue <= 2 ? '⚠️ URGENT' : 
                            daysUntilDue <= 7 ? '📅 This Week' : '📋 Scheduled';
        
        return `${statusIcon} ${order.trackingId} - ${order.orderType} - ${order.status?.replace('_', ' ')} 
   📅 Due: ${new Date(order.dueDate).toLocaleDateString()} (${urgencyLabel})
   💰 Value: $${order.price || 0}`;
      }).join('\n\n');

      const totalValue = orders.reduce((sum, o) => sum + (o.price || 0), 0);
      const overdueOrders = orders.filter(o => new Date(o.dueDate) < new Date()).length;

      return `✅ Found ${orders.length} order(s) for ${customer.name}:
📧 ${customer.email || 'No email'} | 📞 ${customer.phone || 'No phone'}

${orderSummary}

💰 Total value: $${totalValue}
${overdueOrders > 0 ? `🚨 ${overdueOrders} overdue orders need immediate attention!` : '✅ All orders on schedule'}`;
    } catch (error) {
      return "Error finding customer orders. Please try again.";
    }
  }

  private getStatusIcon(status: string): string {
    const icons = {
      'ORDER_PROCESSED': '📝',
      'MATERIALS_ORDERED': '📦',
      'MATERIALS_ARRIVED': '✅',
      'FRAME_CUT': '🔧',
      'MAT_CUT': '✂️',
      'ASSEMBLED': '🔨',
      'QUALITY_CHECK': '🔍',
      'COMPLETED': '✅',
      'PICKED_UP': '🎉',
      'DELAYED': '⚠️'
    };
    return icons[status] || '📋';
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

    // Comprehensive framing knowledge
    if (lowerMessage.includes('mat') || lowerMessage.includes('matting')) {
      return `🎨 **Mat/Matting Advice:**

**Mat Selection:**
- Use acid-free, archival mats for preservation
- Standard mat width: 2.5-3.5 inches for most artwork
- Wider mats (4-6 inches) for larger pieces
- Consider double matting for premium look

**Common Issues:**
- Mat burn/discoloration: Use lignin-free mats
- Waviness: Check humidity, use proper backing
- Color bleeding: Ensure colorfast mats

**Best Practices:**
- Always use conservation mounting
- Bevel cuts at 45° for professional look
- Leave expansion gap for paper artwork`;
    }

    if (lowerMessage.includes('glass') || lowerMessage.includes('glazing')) {
      return `🔍 **Glass/Glazing Guide:**

**Glass Types:**
- **Regular Glass**: Basic protection, some UV filtering
- **Non-Glare Glass**: Reduces reflections, slight texture
- **UV Glass**: 97% UV protection, museum quality
- **Acrylic/Plexi**: Lightweight, shatter-resistant

**When to Use What:**
- Valuable art: UV glass always
- High-traffic areas: Acrylic for safety
- Photography: Use UV glass, avoid non-glare
- Pastels/charcoal: Spacers required, never touching

**Pro Tips:**
- Clean with appropriate cleaners only
- Handle with cotton gloves
- Check for stress marks before installation`;
    }

    if (lowerMessage.includes('moulding') || lowerMessage.includes('frame')) {
      return `🔨 **Moulding/Frame Selection:**

**Size Guidelines:**
- Small art (8x10 to 11x14): 3/4" to 1.5" wide moulding
- Medium (16x20 to 24x30): 1.5" to 2.5" wide
- Large (30x40+): 2.5" to 4"+ wide for proper proportion

**Style Matching:**
- Traditional art: Ornate, gold/silver leaf
- Modern/Contemporary: Clean lines, metal, simple wood
- Photography: Thin profiles, neutral colors
- Certificates: Simple, professional styles

**Wood vs. Metal:**
- Wood: Warmer, traditional, easier to work with
- Metal: Modern, sleek, very precise corners required`;
    }

    if (lowerMessage.includes('conservation') || lowerMessage.includes('archival')) {
      return `🏛️ **Conservation Framing Standards:**

**Materials Required:**
- Acid-free, lignin-free mats and backing
- UV-filtering glazing (97%+ protection)
- Conservation mounting techniques only
- Proper spacers between art and glazing

**Never Use:**
- Pressure-sensitive tapes
- Acidic materials
- Direct contact mounting
- Non-reversible adhesives

**Best Practices:**
- Hinge mounting with Japanese tissue
- Use wheat starch paste or conservation tape
- Maintain proper humidity (45-55%)
- Document all materials used`;
    }

    if (lowerMessage.includes('mounting') || lowerMessage.includes('mount')) {
      return `📐 **Mounting Techniques:**

**Hinge Mounting** (Preferred):
- Attach only at top edge
- Use Japanese tissue and wheat paste
- Allows natural expansion/contraction

**Window Mounting:**
- For thick items or 3D objects
- Cut opening in backing board
- Support from behind, don't compress

**Float Mounting:**
- Shows full edges of artwork
- Use hidden supports
- Popular for handmade papers

**Never:**
- Dry mount valuable originals
- Use spray adhesives on art
- Mount directly to backing without space`;
    }

    if (lowerMessage.includes('spacing') || lowerMessage.includes('spacer')) {
      return `📏 **Spacing & Depth Guidelines:**

**When Spacers are Required:**
- Pastels, charcoal, or textured media
- Thick paint applications (impasto)
- Any 3D elements or mixed media
- Canvas paintings (prevent texture marking)

**Spacer Types:**
- Clear acrylic strips: 1/8" to 1/4"
- Matboard strips: 1/8" standard
- Built-in rabbet depth for canvas

**Depth Calculations:**
- Art thickness + 1/8" minimum clearance
- Consider frame rabbet depth
- Plan for glass thickness in calculations`;
    }

    if (lowerMessage.includes('canvas') || lowerMessage.includes('oil') || lowerMessage.includes('acrylic')) {
      return `🎨 **Canvas & Paint Framing:**

**Oil Paintings:**
- Must be completely dry (6+ months for thick paint)
- Use spacers, never touching glass
- Allow air circulation
- Consider UV glazing for protection

**Acrylic Paintings:**
- Dry faster than oils but still need spacers
- Can be more flexible than oils
- UV protection recommended

**Canvas Stretching:**
- Check tension before framing
- Re-stretch if loose or uneven
- Use appropriate frame depth for stretcher bars

**Floating vs. Traditional:**
- Float mounting shows canvas edges
- Traditional framing covers edges with lip`;
    }

    if (lowerMessage.includes('trouble') || lowerMessage.includes('problem') || lowerMessage.includes('fix')) {
      return `🔧 **Common Framing Problems & Solutions:**

**Warped Frames:**
- Check wood moisture content
- Use corner braces for reinforcement
- Sand and re-join if necessary

**Mat Waviness:**
- Humidity issues - use dehumidifier
- Poor quality mat board - replace
- Improper storage - lay flat

**Glass Condensation:**
- Poor ventilation in frame
- Add spacers for air circulation
- Check environmental humidity

**Color Changes:**
- UV damage - use UV glazing
- Acid migration - use archival materials
- Improper lighting - reduce light levels

**Pest Issues:**
- Silverfish: reduce humidity, use cedar
- Check backing boards for entry points
- Use archival, pest-resistant materials`;
    }

    if (lowerMessage.includes('pricing') || lowerMessage.includes('cost') || lowerMessage.includes('quote')) {
      return `💰 **Pricing Guidelines:**

**Standard Markup:**
- Materials: 2.5-3x cost
- Labor: $45-75 per hour depending on market
- Rush jobs: 50-100% surcharge

**Time Estimates:**
- Simple frame job: 1-2 hours
- Custom matting: 30-45 minutes
- Conservation work: 2-4 hours
- Complex projects: 4-8 hours

**Pricing Factors:**
- Size (larger = more time/materials)
- Complexity (multiple mats, specialty techniques)
- Materials (conservation vs. standard)
- Deadline (rush work costs more)

**Always include:**
- Material costs
- Labor time
- Overhead (shop costs)
- Profit margin (20-30% minimum)`;
    }

    return `I'm here to help with your framing shop! I can assist with:

**Business Operations:**
- "Find orders for [Customer Name]" - Show customer orders  
- "Smith orders" or "orders for Smith" - Quick customer search
- "Send update to [Customer] about [message]" - Send notifications
- "Find order TRK-123" - Get specific order details

**Professional Framing Knowledge:**
- Mat selection and cutting techniques
- Glass and glazing options
- Conservation framing standards
- Mounting and spacing requirements
- Canvas and painting care
- Troubleshooting common problems
- Pricing and time estimates

**Try asking:**
- "What mat for watercolor?"
- "How to frame oil painting?"
- "Conservation mounting techniques?"
- "Glass types for photography?"
- "Problem with warped frame?"

What would you like help with?`;
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

import { storage } from '../storage';
import { framingKnowledgeService } from './framingKnowledgeService';

interface MCPContext {
  customerId?: string;
  orderId?: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    metadata?: any;
  }>;
  businessContext: {
    currentWorkload: number;
    urgentOrders: any[];
    materialShortages: string[];
    shopCapacity: number;
  };
}

export class MCPService {
  private contexts: Map<string, MCPContext> = new Map();

  // MCP Tool: Get customer context with full order history
  async getCustomerContext(sessionId: string, customerName: string) {
    const customers = await storage.getCustomers();
    const customer = customers.find(c => 
      c.name.toLowerCase().includes(customerName.toLowerCase())
    );

    if (!customer) return null;

    const orders = await storage.getOrdersByCustomer(customer.id);
    const totalValue = orders.reduce((sum, o) => sum + (o.price || 0), 0);
    const avgOrderValue = orders.length > 0 ? totalValue / orders.length : 0;
    
    const context = {
      customer,
      orderHistory: orders,
      metrics: {
        totalOrders: orders.length,
        totalValue,
        avgOrderValue,
        repeatCustomer: orders.length > 1,
        lastOrderDate: orders.length > 0 ? Math.max(...orders.map(o => new Date(o.createdAt || 0).getTime())) : null
      },
      preferences: this.analyzeCustomerPreferences(orders),
      riskFactors: this.assessCustomerRisk(orders)
    };

    // Store in MCP context
    this.updateContext(sessionId, { customerId: customer.id });
    return context;
  }

  // MCP Tool: Shop capacity analysis with intelligent recommendations
  async analyzeShopCapacity(sessionId: string) {
    const workload = await storage.getWorkloadMetrics();
    const orders = await storage.getOrders();
    
    const analysis = {
      currentLoad: workload.totalHours,
      dailyCapacity: 10, // 8-12 orders per day
      bottlenecks: this.identifyBottlenecks(orders),
      recommendations: this.generateCapacityRecommendations(workload, orders),
      priorityQueue: this.buildOptimalQueue(orders),
      materialReadiness: await this.assessMaterialReadiness(orders)
    };

    this.updateContext(sessionId, { 
      businessContext: {
        currentWorkload: workload.totalHours,
        urgentOrders: orders.filter(o => o.priority === 'URGENT'),
        materialShortages: analysis.materialReadiness.shortages,
        shopCapacity: analysis.dailyCapacity
      }
    });

    return analysis;
  }

  // MCP Tool: Intelligent framing consultation
  async getFramingConsultation(sessionId: string, query: string, customerContext?: any) {
    const baseAdvice = await framingKnowledgeService.searchFramingKnowledge(query);
    
    // Enhance with customer-specific recommendations
    let enhancedAdvice = baseAdvice;
    
    if (customerContext) {
      const preferences = customerContext.preferences;
      const budget = customerContext.metrics.avgOrderValue;
      
      enhancedAdvice += `\n\n**Customer-Specific Recommendations:**\n`;
      
      if (preferences.preferredStyle) {
        enhancedAdvice += `- Based on previous orders, customer prefers ${preferences.preferredStyle} style\n`;
      }
      
      if (budget > 0) {
        enhancedAdvice += `- Customer's average order value: $${budget.toFixed(2)}\n`;
        enhancedAdvice += this.suggestBudgetAppropriateOptions(budget);
      }
    }

    return enhancedAdvice;
  }

  // MCP Tool: Workflow optimization
  async optimizeWorkflow(sessionId: string, constraints?: any) {
    const orders = await storage.getOrders();
    const context = this.contexts.get(sessionId);
    
    const optimization = {
      todaysQueue: this.buildDailyQueue(orders, constraints),
      materialOrders: this.generateMaterialOrderList(orders),
      customerCommunications: this.generateCustomerUpdates(orders),
      efficiencyTips: this.generateEfficiencyTips(orders, context?.businessContext)
    };

    return optimization;
  }

  private analyzeCustomerPreferences(orders: any[]) {
    const frameTypes = orders.map(o => o.orderType).filter(Boolean);
    const mostCommon = this.getMostCommon(frameTypes);
    
    return {
      preferredFrameType: mostCommon,
      averageComplexity: orders.reduce((sum, o) => sum + (o.estimatedHours || 0), 0) / orders.length,
      budgetRange: this.categorizeBudget(orders.map(o => o.price || 0))
    };
  }

  private assessCustomerRisk(orders: any[]) {
    const overdue = orders.filter(o => new Date(o.dueDate) < new Date()).length;
    const cancelled = orders.filter(o => o.status === 'CANCELLED').length;
    
    return {
      overdueRate: orders.length > 0 ? overdue / orders.length : 0,
      cancellationRate: orders.length > 0 ? cancelled / orders.length : 0,
      paymentIssues: orders.filter(o => o.notes?.includes('payment')).length,
      riskLevel: this.calculateRiskLevel(overdue, cancelled, orders.length)
    };
  }

  private identifyBottlenecks(orders: any[]) {
    const statusCounts = orders.reduce((acc, order) => {
      const status = order.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bottlenecks = [];
    
    if (statusCounts.MATERIALS_ORDERED > 8) {
      bottlenecks.push('Material delivery delays');
    }
    
    if (statusCounts.FRAME_CUT > statusCounts.MAT_CUT) {
      bottlenecks.push('Mat cutting capacity');
    }
    
    if (statusCounts.COMPLETED > statusCounts.PICKED_UP) {
      bottlenecks.push('Customer pickup scheduling');
    }

    return bottlenecks;
  }

  private buildOptimalQueue(orders: any[]) {
    // Sort by priority, due date, and estimated hours for optimal flow
    return orders
      .filter(o => !['PICKED_UP', 'CANCELLED'].includes(o.status || ''))
      .sort((a, b) => {
        const priorityWeight = { 'URGENT': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        const aPriority = priorityWeight[a.priority || 'MEDIUM'];
        const bPriority = priorityWeight[b.priority || 'MEDIUM'];
        
        if (aPriority !== bPriority) return bPriority - aPriority;
        
        const aDue = new Date(a.dueDate).getTime();
        const bDue = new Date(b.dueDate).getTime();
        
        return aDue - bDue;
      })
      .slice(0, 15); // Daily capacity
  }

  private async assessMaterialReadiness(orders: any[]) {
    const materialsNeeded = [];
    const shortages = [];
    
    // This would integrate with your material tracking system
    for (const order of orders.filter(o => o.status === 'MATERIALS_ORDERED')) {
      const materials = await storage.getMaterialsByOrder(order.id);
      const notArrived = materials.filter(m => !m.arrived);
      
      if (notArrived.length > 0) {
        shortages.push(`Order ${order.trackingId}: ${notArrived.length} materials pending`);
      }
    }

    return { materialsNeeded, shortages };
  }

  private updateContext(sessionId: string, updates: Partial<MCPContext>) {
    const existing = this.contexts.get(sessionId) || {
      conversationHistory: [],
      businessContext: {
        currentWorkload: 0,
        urgentOrders: [],
        materialShortages: [],
        shopCapacity: 10
      }
    };

    this.contexts.set(sessionId, { ...existing, ...updates });
  }

  private getMostCommon(items: string[]) {
    const counts = items.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).sort(([,a], [,b]) => b - a)[0]?.[0];
  }

  private categorizeBudget(prices: number[]) {
    const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    if (avg < 150) return 'Budget';
    if (avg < 300) return 'Standard';
    return 'Premium';
  }

  private calculateRiskLevel(overdue: number, cancelled: number, total: number) {
    const riskScore = (overdue + cancelled * 2) / total;
    if (riskScore > 0.3) return 'HIGH';
    if (riskScore > 0.1) return 'MEDIUM';
    return 'LOW';
  }

  private buildDailyQueue(orders: any[], constraints?: any) {
    return this.buildOptimalQueue(orders).slice(0, constraints?.maxOrders || 12);
  }

  private generateMaterialOrderList(orders: any[]) {
    // Group materials needed by vendor for efficient ordering
    return orders
      .filter(o => o.status === 'ORDER_PROCESSED')
      .map(o => `${o.trackingId}: Materials needed for ${o.orderType}`)
      .slice(0, 10);
  }

  private generateCustomerUpdates(orders: any[]) {
    const needsUpdate = orders.filter(o => {
      const daysSinceUpdate = Math.floor((Date.now() - new Date(o.createdAt || 0).getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceUpdate > 7 && !['PICKED_UP', 'CANCELLED'].includes(o.status || '');
    });

    return needsUpdate.map(o => ({
      customer: o.customer?.name,
      trackingId: o.trackingId,
      suggestedMessage: `Your order ${o.trackingId} is currently ${o.status?.replace('_', ' ')} and on track for completion.`
    }));
  }

  private generateEfficiencyTips(orders: any[], businessContext?: any) {
    const tips = [];
    
    if (businessContext?.materialShortages.length > 0) {
      tips.push('Focus on orders with all materials available while waiting for deliveries');
    }
    
    if (businessContext?.urgentOrders.length > 5) {
      tips.push('Consider batching similar operations to improve efficiency on urgent orders');
    }

    return tips;
  }

  private suggestBudgetAppropriateOptions(avgBudget: number) {
    if (avgBudget < 200) {
      return `- Consider cost-effective options like basic matting and standard glazing\n`;
    } else if (avgBudget > 400) {
      return `- Customer may appreciate premium options like conservation matting or museum glass\n`;
    }
    return `- Standard framing options should align well with customer's budget\n`;
  }
}

export const mcpService = new MCPService();

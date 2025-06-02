import { storage } from "../storage";
import { AIService } from "./aiService";

export class BusinessLearningService {
  private aiService: AIService;
  private patterns: Map<string, any> = new Map();
  
  constructor() {
    this.aiService = new AIService();
  }

  async analyzeBusinessPatterns() {
    const orders = await storage.getOrders();
    const statusChanges = await storage.getStatusChanges();
    
    // Learn completion time patterns
    const completionPatterns = this.analyzeCompletionTimes(orders);
    
    // Learn bottleneck patterns
    const bottleneckPatterns = this.analyzeBottlenecks(statusChanges);
    
    // Learn customer behavior patterns
    const customerPatterns = this.analyzeCustomerBehavior(orders);
    
    // Learn mystery item processing patterns
    const mysteryPatterns = this.analyzeMysteryItems(orders);
    
    return {
      completionTimes: completionPatterns,
      bottlenecks: bottleneckPatterns,
      customerBehavior: customerPatterns,
      mysteryItems: mysteryPatterns,
      insights: await this.generateLearningInsights(orders, statusChanges)
    };
  }

  private analyzeCompletionTimes(orders: any[]) {
    const completedOrders = orders.filter(o => o.status === 'COMPLETED' || o.status === 'PICKED_UP');
    
    const patterns = {
      frameOrders: completedOrders.filter(o => o.orderType === 'FRAME'),
      matOrders: completedOrders.filter(o => o.orderType === 'MAT'),
      shadowboxOrders: completedOrders.filter(o => o.orderType === 'SHADOWBOX'),
      averageByType: {},
      seasonalTrends: this.analyzeSeasonalTrends(completedOrders)
    };
    
    // Calculate average completion times by order type
    ['FRAME', 'MAT', 'SHADOWBOX'].forEach(type => {
      const typeOrders = completedOrders.filter(o => o.orderType === type);
      if (typeOrders.length > 0) {
        patterns.averageByType[type] = {
          avgHours: typeOrders.reduce((sum, o) => sum + (o.estimatedHours || 0), 0) / typeOrders.length,
          avgDays: typeOrders.reduce((sum, o) => {
            const created = new Date(o.createdAt);
            const completed = new Date(o.updatedAt);
            return sum + Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          }, 0) / typeOrders.length
        };
      }
    });
    
    return patterns;
  }

  private analyzeBottlenecks(statusChanges: any[]) {
    // Group status changes by stage to identify where orders get stuck
    const stageDelays = {};
    
    statusChanges.forEach(change => {
      const stage = change.toStatus;
      if (!stageDelays[stage]) {
        stageDelays[stage] = [];
      }
      // Calculate time spent in previous stage
      stageDelays[stage].push(change.timestamp);
    });
    
    return {
      commonDelays: this.identifyCommonDelays(stageDelays),
      timeInStages: this.calculateAverageTimeInStages(stageDelays),
      recommendations: this.generateBottleneckRecommendations(stageDelays)
    };
  }

  private analyzeCustomerBehavior(orders: any[]) {
    const customerData = {};
    
    orders.forEach(order => {
      const customerName = order.customer?.name || 'Unknown';
      if (!customerData[customerName]) {
        customerData[customerName] = {
          orderCount: 0,
          preferredTypes: [],
          averageValue: 0,
          urgentOrders: 0,
          onTimePickup: 0
        };
      }
      
      customerData[customerName].orderCount++;
      customerData[customerName].preferredTypes.push(order.orderType);
      customerData[customerName].averageValue += order.price || 0;
      
      if (order.priority === 'URGENT') {
        customerData[customerName].urgentOrders++;
      }
    });
    
    return {
      repeatCustomers: Object.entries(customerData).filter(([_, data]: [string, any]) => data.orderCount > 1),
      highValueCustomers: Object.entries(customerData).filter(([_, data]: [string, any]) => data.averageValue > 200),
      insights: this.generateCustomerInsights(customerData)
    };
  }

  private analyzeMysteryItems(orders: any[]) {
    const mysteryOrders = orders.filter(o => o.status === 'MYSTERY_UNCLAIMED');
    
    return {
      totalMysteryItems: mysteryOrders.length,
      averageDaysInSystem: mysteryOrders.reduce((sum, o) => {
        const days = Math.floor((Date.now() - new Date(o.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0) / (mysteryOrders.length || 1),
      oldestItem: mysteryOrders.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0],
      processingRecommendations: this.generateMysteryProcessingTips(mysteryOrders)
    };
  }

  private async generateLearningInsights(orders: any[], statusChanges: any[]) {
    const prompt = `Based on Jay's Frames business data analysis:

Orders: ${orders.length} total, ${orders.filter(o => o.status === 'MYSTERY_UNCLAIMED').length} mystery items
Recent patterns: ${statusChanges.slice(-10).map(c => c.toStatus).join(', ')}
Completion rate: ${Math.round((orders.filter(o => ['COMPLETED', 'PICKED_UP'].includes(o.status)).length / orders.length) * 100)}%

As a frame shop operations expert, analyze these patterns and provide 3-4 specific learning insights about workflow optimization, customer service improvements, and operational efficiency. Focus on actionable intelligence that improves business performance.`;

    try {
      const analysis = await this.aiService.generateChatResponse(prompt);
      return analysis;
    } catch (error) {
      return "Continue monitoring business patterns for optimization opportunities.";
    }
  }

  private analyzeSeasonalTrends(orders: any[]) {
    const monthlyData = {};
    orders.forEach(order => {
      const month = new Date(order.createdAt).getMonth();
      monthlyData[month] = (monthlyData[month] || 0) + 1;
    });
    return monthlyData;
  }

  private identifyCommonDelays(stageDelays: any) {
    return Object.keys(stageDelays).filter(stage => stageDelays[stage].length > 5);
  }

  private calculateAverageTimeInStages(stageDelays: any) {
    const averages = {};
    Object.keys(stageDelays).forEach(stage => {
      averages[stage] = stageDelays[stage].length;
    });
    return averages;
  }

  private generateBottleneckRecommendations(stageDelays: any) {
    const recommendations = [];
    if (stageDelays.MATERIALS_ORDERED > stageDelays.MATERIALS_ARRIVED) {
      recommendations.push("Consider establishing relationships with additional material suppliers");
    }
    if (stageDelays.FRAME_CUT && stageDelays.FRAME_CUT.length > 10) {
      recommendations.push("Frame cutting appears to be a bottleneck - consider additional equipment or staff");
    }
    return recommendations;
  }

  private generateCustomerInsights(customerData: any) {
    const insights = [];
    const repeatRate = Object.values(customerData).filter((data: any) => data.orderCount > 1).length;
    insights.push(`Customer retention: ${Math.round((repeatRate / Object.keys(customerData).length) * 100)}% repeat customers`);
    return insights;
  }

  private generateMysteryProcessingTips(mysteryOrders: any[]) {
    const tips = [];
    if (mysteryOrders.length > 5) {
      tips.push("Schedule dedicated mystery item processing sessions");
    }
    if (mysteryOrders.some(o => Math.floor((Date.now() - new Date(o.createdAt).getTime()) / (1000 * 60 * 60 * 24)) > 30)) {
      tips.push("Prioritize oldest mystery items to prevent customer service issues");
    }
    return tips;
  }
}

export const learningService = new BusinessLearningService();
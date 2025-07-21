import { storage } from "../storage";
import { AIService } from "./aiService";

// Minimal learning service stub for performance optimization
export class BusinessLearningService {
  constructor() {
    console.log('Business Learning Service: Disabled for performance optimization');
  }

  async analyzeBusinessPatterns() {
    return {
      completionTimes: {},
      bottlenecks: {},
      customerBehavior: {},
      mysteryItems: { totalMysteryItems: 0, averageDaysInSystem: 0 },
      insights: "Learning analysis disabled for performance optimization"
    };
  }

  async generateBusinessInsights(): Promise<any> {
    return { 
      insights: "Learning service disabled for performance optimization", 
      patterns: [] 
    };
  }
}

export const learningService = new BusinessLearningService();
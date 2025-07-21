import OpenAI from 'openai';
import { logger } from './logger';
import { circuitBreakers } from './circuit-breaker';
import { retryStrategies } from './retry-logic';

export class AIServiceWrapper {
  private openai: OpenAI | null = null;
  private fallbackResponses = {
    analysis: {
      totalOrders: 0,
      averageCompletionTime: 0,
      bottlenecks: [],
      recommendations: ['AI service temporarily unavailable - using manual operations'],
      workloadDistribution: {},
      alerts: []
    },
    recommendation: 'AI recommendations temporarily unavailable. Please review order manually.',
    pricing: null
  };

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }

  async generateRecommendation(orderId: string, context: any): Promise<string> {
    if (!this.openai) {
      logger.warn('OpenAI not configured, using fallback recommendation', { orderId });
      return this.fallbackResponses.recommendation;
    }

    return circuitBreakers.openai.execute(
      async () => {
        return retryStrategies.ai(async () => {
          logger.debug('Generating AI recommendation', { orderId });
          
          const completion = await this.openai!.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: 'You are an expert frame shop assistant. Provide concise, actionable recommendations for order processing.'
              },
              {
                role: 'user',
                content: `Analyze this order and provide recommendations: ${JSON.stringify(context)}`
              }
            ],
            max_tokens: 200,
            temperature: 0.7
          });

          const recommendation = completion.choices[0]?.message?.content || this.fallbackResponses.recommendation;
          logger.info('AI recommendation generated successfully', { orderId, length: recommendation.length });
          return recommendation;
        }, `AI_recommendation_${orderId}`);
      },
      async () => {
        logger.warn('AI service unavailable, using fallback recommendation', { orderId });
        return this.fallbackResponses.recommendation;
      }
    );
  }

  async generateWorkloadAnalysis(orders: any[]): Promise<any> {
    if (!this.openai) {
      logger.warn('OpenAI not configured, using fallback analysis');
      return this.fallbackResponses.analysis;
    }

    return circuitBreakers.openai.execute(
      async () => {
        return retryStrategies.ai(async () => {
          logger.debug('Generating workload analysis', { orderCount: orders.length });
          
          const completion = await this.openai!.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: 'Analyze frame shop workload data and provide insights in JSON format.'
              },
              {
                role: 'user',
                content: `Analyze this workload data: ${JSON.stringify(orders.slice(0, 10))}` // Limit context size
              }
            ],
            max_tokens: 500,
            temperature: 0.3
          });

          try {
            const analysis = JSON.parse(completion.choices[0]?.message?.content || '{}');
            logger.info('Workload analysis generated successfully', { orderCount: orders.length });
            return { ...this.fallbackResponses.analysis, ...analysis };
          } catch (parseError) {
            logger.warn('Failed to parse AI analysis, using fallback', { parseError });
            return this.fallbackResponses.analysis;
          }
        }, 'AI_workload_analysis');
      },
      async () => {
        logger.warn('AI service unavailable, using fallback analysis');
        return this.fallbackResponses.analysis;
      }
    );
  }
}

export class SMSServiceWrapper {
  private twilio: any = null;

  constructor() {
    try {
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        const twilio = require('twilio');
        this.twilio = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      }
    } catch (error) {
      logger.warn('Twilio not configured or error initializing', { error });
    }
  }

  async sendOrderNotification(orderId: string, phoneNumber: string, message: string): Promise<boolean> {
    if (!this.twilio) {
      logger.warn('SMS service not configured', { orderId, phoneNumber });
      return false;
    }

    return circuitBreakers.sms.execute(
      async () => {
        return retryStrategies.api(async () => {
          logger.debug('Sending SMS notification', { orderId, phoneNumber: phoneNumber.slice(-4) });
          
          const result = await this.twilio.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber
          });

          logger.info('SMS sent successfully', { 
            orderId, 
            phoneNumber: phoneNumber.slice(-4),
            messageId: result.sid 
          });
          return true;
        }, `SMS_${orderId}`);
      },
      async () => {
        logger.warn('SMS service unavailable, notification not sent', { orderId, phoneNumber: phoneNumber.slice(-4) });
        return false;
      }
    );
  }

  async sendBulkNotifications(notifications: Array<{ orderId: string; phoneNumber: string; message: string }>): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    // Process in batches to avoid overwhelming the SMS service
    const batchSize = 5;
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      
      const results = await Promise.allSettled(
        batch.map(notification => 
          this.sendOrderNotification(notification.orderId, notification.phoneNumber, notification.message)
        )
      );

      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          success++;
        } else {
          failed++;
        }
      });

      // Small delay between batches
      if (i + batchSize < notifications.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    logger.info('Bulk SMS notifications completed', { success, failed, total: notifications.length });
    return { success, failed };
  }
}

export class POSServiceWrapper {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.POS_API_URL || '';
    this.apiKey = process.env.POS_API_KEY || '';
  }

  async syncOrder(orderId: string, orderData: any): Promise<boolean> {
    if (!this.baseUrl || !this.apiKey) {
      logger.warn('POS service not configured', { orderId });
      return false;
    }

    return circuitBreakers.pos.execute(
      async () => {
        return retryStrategies.api(async () => {
          logger.debug('Syncing order to POS', { orderId });
          
          const response = await fetch(`${this.baseUrl}/orders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(orderData),
            signal: AbortSignal.timeout(10000) // 10 second timeout
          });

          if (!response.ok) {
            throw new Error(`POS sync failed: ${response.status} ${response.statusText}`);
          }

          logger.info('Order synced to POS successfully', { orderId });
          return true;
        }, `POS_sync_${orderId}`);
      },
      async () => {
        logger.warn('POS service unavailable, order not synced', { orderId });
        return false;
      }
    );
  }

  async fetchNewOrders(): Promise<any[]> {
    if (!this.baseUrl || !this.apiKey) {
      logger.debug('POS service not configured for order fetching');
      return [];
    }

    // Simplified - no circuit breakers for performance
    try {
      console.log('POS integration disabled for performance optimization');
      return [];
    } catch (error) {
      console.log('POS service unavailable');
      return [];
    }
  }
}

// Export singleton instances
export const aiService = new AIServiceWrapper();
export const smsService = new SMSServiceWrapper();
export const posService = new POSServiceWrapper();
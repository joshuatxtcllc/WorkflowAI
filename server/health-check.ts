import { Request, Response } from 'express';
import { db } from './db';
import { logger } from './logger';
import { circuitBreakers } from './circuit-breaker';
import OpenAI from 'openai';

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  details?: any;
  error?: string;
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: HealthCheckResult[];
  circuitBreakers: Record<string, any>;
}

export class HealthChecker {
  private openai: OpenAI | null = null;

  constructor() {
    try {
      if (process.env.OPENAI_API_KEY) {
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      }
    } catch (error) {
      logger.warn('OpenAI client not initialized for health checks');
    }
  }

  async checkDatabase(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      // Simple query to test database connectivity
      await db.execute('SELECT 1 as health_check');
      return {
        service: 'database',
        status: 'healthy',
        responseTime: Date.now() - start,
        details: { connection: 'active' }
      };
    } catch (error) {
      return {
        service: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async checkOpenAI(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      if (!this.openai) {
        return {
          service: 'openai',
          status: 'degraded',
          responseTime: 0,
          details: { reason: 'API key not configured' }
        };
      }

      // Simple API test
      await this.openai.models.list();
      return {
        service: 'openai',
        status: 'healthy',
        responseTime: Date.now() - start,
        details: { connection: 'active' }
      };
    } catch (error: any) {
      const status = error.status === 429 ? 'degraded' : 'unhealthy';
      return {
        service: 'openai',
        status,
        responseTime: Date.now() - start,
        error: error.message || 'API connection failed'
      };
    }
  }

  async checkSMS(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const hasCredentials = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
      
      if (!hasCredentials) {
        return {
          service: 'sms',
          status: 'degraded',
          responseTime: Date.now() - start,
          details: { reason: 'Credentials not configured' }
        };
      }

      // For SMS, we'll just check if credentials exist rather than making API calls
      return {
        service: 'sms',
        status: 'healthy',
        responseTime: Date.now() - start,
        details: { configured: true }
      };
    } catch (error) {
      return {
        service: 'sms',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async checkPOS(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const hasConfig = !!(process.env.POS_API_URL && process.env.POS_API_KEY);
      
      if (!hasConfig) {
        return {
          service: 'pos',
          status: 'degraded',
          responseTime: Date.now() - start,
          details: { reason: 'POS integration not configured' }
        };
      }

      return {
        service: 'pos',
        status: 'healthy',
        responseTime: Date.now() - start,
        details: { configured: true }
      };
    } catch (error) {
      return {
        service: 'pos',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async performHealthCheck(): Promise<SystemHealth> {
    logger.info('Starting comprehensive health check');

    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkOpenAI(),
      this.checkSMS(),
      this.checkPOS()
    ]);

    const services: HealthCheckResult[] = checks.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        const serviceNames = ['database', 'openai', 'sms', 'pos'];
        return {
          service: serviceNames[index],
          status: 'unhealthy' as const,
          responseTime: 0,
          error: 'Health check failed to execute'
        };
      }
    });

    // Determine overall health
    const unhealthyServices = services.filter(s => s.status === 'unhealthy');
    const degradedServices = services.filter(s => s.status === 'degraded');
    
    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyServices.length > 0) {
      overall = 'unhealthy';
    } else if (degradedServices.length > 0) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }

    // Get circuit breaker states
    const breakerStates = Object.entries(circuitBreakers).reduce((acc, [name, breaker]) => {
      acc[name] = breaker.getMetrics();
      return acc;
    }, {} as Record<string, any>);

    const result: SystemHealth = {
      overall,
      timestamp: new Date().toISOString(),
      services,
      circuitBreakers: breakerStates
    };

    logger.info('Health check completed', { 
      overall, 
      unhealthyCount: unhealthyServices.length,
      degradedCount: degradedServices.length 
    });

    return result;
  }
}

export const healthChecker = new HealthChecker();

export async function healthCheckEndpoint(req: Request, res: Response) {
  try {
    const health = await healthChecker.performHealthCheck();
    
    // Set appropriate HTTP status based on overall health
    let statusCode = 200;
    if (health.overall === 'degraded') {
      statusCode = 200; // Still operational but with warnings
    } else if (health.overall === 'unhealthy') {
      statusCode = 503; // Service unavailable
    }
    
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check endpoint failed', { error });
    res.status(500).json({
      overall: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check system failure'
    });
  }
}
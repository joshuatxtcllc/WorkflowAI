import { logger } from './logger';

interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryCondition?: (error: any) => boolean;
}

const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryCondition: (error) => {
    // Retry on network errors, timeouts, and 5xx server errors
    return error.code === 'ECONNRESET' || 
           error.code === 'ETIMEDOUT' || 
           error.code === 'ENOTFOUND' ||
           (error.status >= 500 && error.status < 600) ||
           error.message?.includes('timeout');
  }
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {},
  operationName = 'unknown'
): Promise<T> {
  const opts = { ...defaultRetryOptions, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(
          opts.baseDelay * Math.pow(opts.backoffMultiplier, attempt - 1),
          opts.maxDelay
        );
        logger.info(`Retrying ${operationName} (attempt ${attempt}/${opts.maxRetries}) after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const result = await operation();
      
      if (attempt > 0) {
        logger.info(`${operationName} succeeded on attempt ${attempt + 1}`);
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      logger.warn(`${operationName} failed on attempt ${attempt + 1}`, {
        error: error.message,
        code: error.code,
        status: error.status
      });

      // Don't retry if we've exceeded max retries
      if (attempt >= opts.maxRetries) {
        break;
      }

      // Don't retry if the error doesn't meet retry condition
      if (opts.retryCondition && !opts.retryCondition(error)) {
        logger.info(`${operationName} failed with non-retryable error`, { error: error.message });
        break;
      }
    }
  }

  logger.error(`${operationName} failed after ${opts.maxRetries + 1} attempts`, {
    finalError: lastError.message
  });
  throw lastError;
}

// Specialized retry functions for different service types
export const retryStrategies = {
  database: (operation: () => Promise<any>, operationName: string) =>
    withRetry(operation, {
      maxRetries: 5,
      baseDelay: 500,
      maxDelay: 5000,
      retryCondition: (error) => 
        error.code === 'ECONNRESET' || 
        error.code === 'ETIMEDOUT' ||
        error.message?.includes('connection') ||
        error.message?.includes('timeout')
    }, operationName),

  api: (operation: () => Promise<any>, operationName: string) =>
    withRetry(operation, {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      retryCondition: (error) =>
        error.status >= 500 ||
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT' ||
        error.message?.includes('rate limit')
    }, operationName),

  ai: (operation: () => Promise<any>, operationName: string) =>
    withRetry(operation, {
      maxRetries: 2,
      baseDelay: 2000,
      maxDelay: 15000,
      retryCondition: (error) =>
        error.status === 429 || // Rate limit
        error.status >= 500 ||
        error.message?.includes('timeout')
    }, operationName),

  webhook: (operation: () => Promise<any>, operationName: string) =>
    withRetry(operation, {
      maxRetries: 3,
      baseDelay: 1500,
      maxDelay: 8000,
      retryCondition: (error) =>
        error.status >= 500 ||
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT'
    }, operationName)
};
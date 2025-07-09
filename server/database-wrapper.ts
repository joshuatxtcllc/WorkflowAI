import { db } from './db';
import { logger } from './logger';
import { circuitBreakers } from './circuit-breaker';
import { retryStrategies } from './retry-logic';

export class DatabaseWrapper {
  async executeWithTransaction<T>(
    operation: (tx: any) => Promise<T>,
    operationName = 'database_transaction'
  ): Promise<T> {
    return circuitBreakers.database.execute(
      async () => {
        return retryStrategies.database(async () => {
          logger.debug(`Starting transaction: ${operationName}`);
          
          return await db.transaction(async (tx) => {
            try {
              const result = await operation(tx);
              logger.debug(`Transaction completed successfully: ${operationName}`);
              return result;
            } catch (error) {
              logger.error(`Transaction failed: ${operationName}`, { error });
              throw error;
            }
          });
        }, operationName);
      },
      async () => {
        logger.warn(`Database circuit breaker open, operation ${operationName} skipped`);
        throw new Error(`Database temporarily unavailable for ${operationName}`);
      }
    );
  }

  async executeQuery<T>(
    query: () => Promise<T>,
    operationName = 'database_query'
  ): Promise<T> {
    return circuitBreakers.database.execute(
      async () => {
        return retryStrategies.database(async () => {
          logger.debug(`Executing query: ${operationName}`);
          const start = Date.now();
          
          try {
            const result = await query();
            const duration = Date.now() - start;
            logger.debug(`Query completed: ${operationName}`, { duration });
            return result;
          } catch (error) {
            const duration = Date.now() - start;
            logger.error(`Query failed: ${operationName}`, { error, duration });
            throw error;
          }
        }, operationName);
      },
      async () => {
        logger.warn(`Database circuit breaker open, query ${operationName} using fallback`);
        // Return cached data or minimal response
        throw new Error(`Database temporarily unavailable for ${operationName}`);
      }
    );
  }

  async batchExecute<T>(
    operations: Array<() => Promise<T>>,
    operationName = 'batch_operation',
    batchSize = 10
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      logger.debug(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(operations.length / batchSize)}`, {
        operationName,
        batchSize: batch.length
      });
      
      const batchResults = await Promise.allSettled(
        batch.map(operation => this.executeQuery(operation, `${operationName}_batch_${i}`))
      );
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          logger.error(`Batch operation failed: ${operationName}`, { error: result.reason });
          throw result.reason;
        }
      }
      
      // Small delay between batches to prevent overwhelming the database
      if (i + batchSize < operations.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }
}

export const dbWrapper = new DatabaseWrapper();
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';

interface LogLevel {
  INFO: 'info';
  WARN: 'warn';
  ERROR: 'error';
  DEBUG: 'debug';
}

const LOG_LEVELS: LogLevel = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  DEBUG: 'debug'
};

class Logger {
  private logStream: any;
  private isProduction = process.env.NODE_ENV === 'production';

  constructor() {
    this.initializeLogStream();
  }

  private async initializeLogStream() {
    if (this.isProduction) {
      try {
        await mkdir('logs', { recursive: true });
        const logFile = path.join('logs', `app-${new Date().toISOString().split('T')[0]}.log`);
        this.logStream = createWriteStream(logFile, { flags: 'a' });
      } catch (error) {
        console.warn('Failed to initialize log file, using console only');
      }
    }
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaString = meta ? ` | ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level.toUpperCase()}] ${message}${metaString}`;
  }

  private writeLog(level: string, message: string, meta?: any) {
    const formattedMessage = this.formatMessage(level, message, meta);
    
    // Always log to console
    console.log(formattedMessage);
    
    // Log to file in production
    if (this.logStream && this.isProduction) {
      this.logStream.write(formattedMessage + '\n');
    }
  }

  info(message: string, meta?: any) {
    this.writeLog(LOG_LEVELS.INFO, message, meta);
  }

  warn(message: string, meta?: any) {
    this.writeLog(LOG_LEVELS.WARN, message, meta);
  }

  error(message: string, meta?: any) {
    this.writeLog(LOG_LEVELS.ERROR, message, meta);
  }

  debug(message: string, meta?: any) {
    if (!this.isProduction) {
      this.writeLog(LOG_LEVELS.DEBUG, message, meta);
    }
  }
}

export const logger = new Logger();
export { LOG_LEVELS };
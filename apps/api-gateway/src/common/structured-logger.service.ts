import { LoggerService, Logger } from '@nestjs/common';

interface LogContext {
  requestId?: string;
  userId?: string;
  companyId?: string;
  action?: string;
  module?: string;
}

interface StructuredLogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: LogContext;
  meta?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export class StructuredLogger implements LoggerService {
  private readonly logger: Logger;
  private readonly context: string;

  constructor(context: string) {
    this.context = context;
    this.logger = new Logger(context);
  }

  log(message: string, context?: LogContext, meta?: Record<string, unknown>): void {
    this.writeLog('log', message, context, meta);
  }

  error(message: string, trace?: string, context?: LogContext): void {
    this.writeLog('error', message, context, { trace });
  }

  warn(message: string, context?: LogContext, meta?: Record<string, unknown>): void {
    this.writeLog('warn', message, context, meta);
  }

  debug(message: string, context?: LogContext, meta?: Record<string, unknown>): void {
    this.writeLog('debug', message, context, meta);
  }

  verbose(message: string, context?: LogContext, meta?: Record<string, unknown>): void {
    this.writeLog('verbose', message, context, meta);
  }

  private writeLog(
    level: string,
    message: string,
    context?: LogContext,
    meta?: Record<string, unknown>,
  ): void {
    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...context, module: this.context },
      meta,
    };

    const logString = JSON.stringify(entry);

    switch (level) {
      case 'error':
        this.logger.error(logString);
        break;
      case 'warn':
        this.logger.warn(logString);
        break;
      case 'debug':
        this.logger.debug(logString);
        break;
      default:
        this.logger.log(logString);
    }
  }

  child(context: string): StructuredLogger {
    return new StructuredLogger(`${this.context}:${context}`);
  }
}

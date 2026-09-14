import { Injectable, LoggerService } from '@nestjs/common';

export interface LogContext {
  requestId?: string;
  userId?: string;
  companyId?: string;
  action?: string;
  duration?: number;
  [key: string]: any;
}

@Injectable()
export class StructuredLogger implements LoggerService {
  private context: string = 'App';

  setContext(context: string) {
    this.context = context;
  }

  log(message: string, context?: LogContext) {
    this.write('info', message, context);
  }

  error(message: string, trace?: string, context?: LogContext) {
    this.write('error', message, { ...context, trace });
  }

  warn(message: string, context?: LogContext) {
    this.write('warn', message, context);
  }

  debug(message: string, context?: LogContext) {
    this.write('debug', message, context);
  }

  verbose(message: string, context?: LogContext) {
    this.write('verbose', message, context);
  }

  private write(level: string, message: string, context?: LogContext) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.context,
      message,
      ...context,
    };

    if (level === 'error') {
      console.error(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }

  logRequest(requestId: string, method: string, path: string, statusCode: number, duration: number, userId?: string) {
    this.log('HTTP Request', {
      requestId,
      method,
      path,
      statusCode,
      duration,
      userId,
      action: 'http_request',
    });
  }

  logDatabaseQuery(query: string, duration: number, requestId?: string) {
    this.debug('Database Query', {
      requestId,
      query: query.slice(0, 200),
      duration,
      action: 'db_query',
    });
  }

  logExternalCall(service: string, method: string, url: string, statusCode: number, duration: number) {
    this.log('External Call', {
      service,
      method,
      url,
      statusCode,
      duration,
      action: 'external_call',
    });
  }
}

export const structuredLogger = new StructuredLogger();

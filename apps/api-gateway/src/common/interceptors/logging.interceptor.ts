import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(private readonly metrics?: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const requestId = request.id || request.headers['x-request-id'] || '-';
    const userId = request.user?.id || '-';
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode;
          const log = {
            requestId,
            method,
            url,
            statusCode,
            duration: `${duration}ms`,
            userId,
          };
          if (this.metrics) {
            this.metrics.incrementCounter('http_requests_total', {
              method,
              status: String(statusCode),
            });
            this.metrics.recordHistogram('http_request_duration_ms', duration);
          }
          if (statusCode >= 500) {
            this.logger.error(JSON.stringify(log));
          } else if (statusCode >= 400) {
            this.logger.warn(JSON.stringify(log));
          } else {
            this.logger.log(JSON.stringify(log));
          }
        },
        error: (err) => {
          const duration = Date.now() - start;
          const response = context.switchToHttp().getResponse();
          const statusCode = response?.statusCode || 500;
          if (this.metrics) {
            this.metrics.incrementCounter('http_requests_total', {
              method,
              status: String(statusCode),
            });
            this.metrics.recordHistogram('http_request_duration_ms', duration);
          }
          this.logger.error(JSON.stringify({
            requestId,
            method,
            url,
            statusCode,
            duration: `${duration}ms`,
            userId,
            error: err?.message,
          }));
        },
      }),
    );
  }
}

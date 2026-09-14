import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { StructuredLogger } from '../structured-logger.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly logger: StructuredLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - startTime;
          const statusCode = context.switchToHttp().getResponse().statusCode;
          const isError = statusCode >= 400;

          this.logger.log(
            `${method} ${url} ${statusCode} ${durationMs}ms`,
            {
              requestId: request.headers['x-request-id'],
              userId: request.user?.id,
              companyId: request.user?.companyId,
            },
            {
              method,
              url,
              statusCode,
              durationMs,
              isError,
            },
          );
        },
        error: (error) => {
          const durationMs = Date.now() - startTime;
          const statusCode = context.switchToHttp().getResponse().statusCode;

          this.logger.error(
            `${method} ${url} ${statusCode || 500} ${durationMs}ms - ${error.message}`,
            error.stack,
            {
              requestId: request.headers['x-request-id'],
              userId: request.user?.id,
              companyId: request.user?.companyId,
              action: `${method} ${url}`,
            },
          );
        },
      }),
    );
  }
}

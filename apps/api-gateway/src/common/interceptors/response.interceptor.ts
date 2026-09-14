import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  timestamp: string;
  requestId?: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        const request = context.switchToHttp().getRequest();
        const requestId = (request as any).id || request.headers['x-request-id'];

        // If the response is already in the standard format, pass through
        if (data && typeof data === 'object' && 'success' in data) {
          return {
            ...data,
            timestamp: new Date().toISOString(),
            requestId,
          };
        }

        // If data has pagination metadata (from service layer)
        if (data && typeof data === 'object' && 'pagination' in data) {
          const { pagination, ...rest } = data;
          return {
            success: true,
            data: rest.data || rest,
            meta: pagination,
            timestamp: new Date().toISOString(),
            requestId,
          };
        }

        // If data has a nested "data" array with pagination fields (total, page, limit, pages)
        // Unwrap so frontend gets { success, data: [...], meta: { total, page, ... } }
        if (data && typeof data === 'object' && Array.isArray((data as any).data) && ('total' in data || 'page' in data || 'pages' in data)) {
          const { data: items, total, page, limit, pages, ...rest } = data as any;
          return {
            success: true,
            data: items,
            meta: { total, page, limit, pages, ...rest },
            timestamp: new Date().toISOString(),
            requestId,
          };
        }

        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
          requestId,
        };
      }),
    );
  }
}

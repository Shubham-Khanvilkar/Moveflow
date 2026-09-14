import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma.service';

@Injectable()
export class UsageMeteringInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.companyId || !this.prisma.isConnected()) return next.handle();
    if (user.securityDomain === 'NAVIRA_INTERNAL') return next.handle();

    const url = request.url;
    const method = request.method;

    return next.handle().pipe(
      tap(() => {
        this.recordUsage(user.companyId, url, method).catch(() => {});
      }),
    );
  }

  private async recordUsage(companyId: string, url: string, method: string) {
    try {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Determine metric based on URL pattern
      let metric = 'api_calls';
      let quantity = 1;

      if (url.includes('/trips') && method === 'POST') {
        metric = 'trips';
      } else if (url.includes('/intelligence/') || url.includes('/analytics/')) {
        metric = 'ai_requests';
      }

      // Upsert usage for current period
      await (this.prisma as any).subscriptionUsage.upsert({
        where: {
          subscriptionId_metricCode_periodStart: {
            subscriptionId: (await this.getSubscriptionId(companyId)) || '',
            metricCode: metric,
            periodStart,
          },
        },
        update: { quantity: { increment: quantity } },
        create: {
          subscriptionId: (await this.getSubscriptionId(companyId)) || '',
          companyId,
          metricCode: metric,
          quantity,
          periodStart,
          periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        },
      }).catch(() => {});
    } catch (e: any) { /* best effort */ }
  }

  private async getSubscriptionId(companyId: string): Promise<string | null> {
    try {
      const sub = await (this.prisma as any).subscription.findFirst({
        where: { companyId, status: { in: ['ACTIVE', 'TRIAL'] } },
        select: { id: true },
      });
      return sub?.id || null;
    } catch (e) {
      return null;
    }
  }
}

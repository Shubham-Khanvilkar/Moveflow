import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../prisma.service';

const FEATURE_MAP: Record<string, string> = {
  '/intelligence/': 'AI',
  '/analytics/': 'ANALYTICS',
  '/vendor/': 'VENDOR',
  '/finance/': 'EXPENSE',
  '/dispatch/': 'DISPATCH',
  '/tracking/': 'GPS',
  '/pricing/': 'BILLING',
};

const PLAN_FEATURES: Record<string, string[]> = {
  FREE_TRIAL: ['BOOKING', 'DISPATCH', 'GPS', 'ANALYTICS_BASIC'],
  STARTER: ['BOOKING', 'DISPATCH', 'GPS', 'ANALYTICS', 'VENDOR', 'EXPENSE'],
  PROFESSIONAL: ['BOOKING', 'DISPATCH', 'GPS', 'ANALYTICS', 'VENDOR', 'EXPENSE', 'AI', 'BILLING', 'API'],
  ENTERPRISE: ['ALL'],
};

@Injectable()
export class FeatureGateInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.companyId) return next.handle();
    if (user.securityDomain === 'NAVIRA_INTERNAL') return next.handle();
    if (!this.prisma.isConnected()) return next.handle();

    const url = request.url;

    for (const [pattern, feature] of Object.entries(FEATURE_MAP)) {
      if (!url.includes(pattern)) continue;

      try {
        const subscription = await (this.prisma as any).subscription.findFirst({
          where: { companyId: user.companyId, status: { in: ['ACTIVE', 'TRIAL'] } },
          include: { plan: true },
        });

        if (!subscription) continue;

        const plan = subscription.plan;
        if (!plan) continue;

        const planKey = plan.name as string;
        const allowedFeatures = PLAN_FEATURES[planKey] || PLAN_FEATURES['FREE_TRIAL'];

        if (allowedFeatures.includes('ALL')) continue;

        if (!allowedFeatures.includes(feature)) {
          throw new HttpException({
            statusCode: 403,
            error: 'Feature Not Available',
            message: `The ${feature} feature requires a higher plan. Current plan: ${plan.displayName || planKey}.`,
            code: 'FEATURE_NOT_AVAILABLE',
            feature,
            currentPlan: planKey,
          }, 403);
        }
      } catch (err) {
        if (err instanceof HttpException) throw err;
        // Fail-open on DB errors
      }
    }

    return next.handle();
  }
}

import { Injectable, CanActivate, ExecutionContext, HttpException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

/**
 * SubscriptionGuard — Enforces subscription status on every API request.
 *
 * - SUSPENDED / CANCELLED → 402 Payment Required
 * - TRIAL with trialEndsAt < now → 402 Trial Expired
 * - ACTIVE / TRIAL (valid) → allow
 * - No subscription record → allow (legacy/demo companies)
 * - Platform admin (NAVIRA_INTERNAL securityDomain) → bypass
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // No user context — let JwtAuthGuard handle it
    if (!user) return true;

    // Platform admins bypass subscription checks
    if (user.securityDomain === 'NAVIRA_INTERNAL') return true;

    // No company context — nothing to check
    if (!user.companyId) return true;

    // If Prisma is not connected, skip (dev mode)
    if (!this.prisma.isConnected()) return true;

    try {
      const subscription = await this.prisma.subscription.findFirst({
        where: {
          companyId: user.companyId,
          status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE', 'SUSPENDED', 'CANCELLED'] },
        },
        include: { plan: true },
      });

      // No subscription found — legacy company, allow
      if (!subscription) return true;

      // Attach subscription to request for downstream use
      request.subscription = subscription;

      if (subscription.status === 'SUSPENDED') {
        throw new HttpException({
          statusCode: 402,
          error: 'Payment Required',
          message: 'Your subscription has been suspended. Please contact support to reactivate.',
          code: 'SUBSCRIPTION_SUSPENDED',
        }, 402);
      }

      if (subscription.status === 'CANCELLED') {
        throw new HttpException({
          statusCode: 402,
          error: 'Payment Required',
          message: 'Your subscription has been cancelled. Please contact support.',
          code: 'SUBSCRIPTION_CANCELLED',
        }, 402);
      }

      if (subscription.status === 'TRIAL' && subscription.trialEndsAt && subscription.trialEndsAt < new Date()) {
        throw new HttpException({
          statusCode: 402,
          error: 'Trial Expired',
          message: 'Your 14-day trial has expired. Please subscribe to continue using the platform.',
          code: 'TRIAL_EXPIRED',
        }, 402);
      }

      return true;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      // On DB error, allow the request (fail-open for availability)
      return true;
    }
  }
}

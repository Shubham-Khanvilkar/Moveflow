import { Injectable, CanActivate, ExecutionContext, HttpException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

/**
 * PlanLimitsGuard — Enforces plan resource limits on create/mutate operations.
 *
 * Checks employee, driver, vehicle counts against the company's subscription plan limits.
 * Returns 403 PLAN_LIMIT_EXCEEDED when a limit is breached.
 */
@Injectable()
export class PlanLimitsGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.companyId) return true;
    if (!['POST', 'PATCH', 'PUT'].includes(request.method)) return true;
    if (!this.prisma.isConnected()) return true;

    // Platform admins bypass limits
    if (user.securityDomain === 'NAVIRA_INTERNAL') return true;

    const url = request.url;
    const resourceMap: Record<string, string> = {
      '/employees': 'employees',
      '/drivers': 'drivers',
      '/vehicles': 'vehicles',
    };

    for (const [path, resource] of Object.entries(resourceMap)) {
      if (!url.includes(path)) continue;

      try {
        const subscription = await this.prisma.subscription.findFirst({
          where: { companyId: user.companyId, status: { in: ['ACTIVE', 'TRIAL'] } },
          include: { plan: true },
        });

        if (!subscription || !subscription.plan) continue;

        const plan = subscription.plan as any;
        let limit = -1;
        let current = 0;

        switch (resource) {
          case 'employees':
            limit = plan.maxEmployees ?? -1;
            current = await this.prisma.user.count({ where: { companyId: user.companyId, status: 'ACTIVE' } });
            break;
          case 'drivers':
            limit = plan.maxDrivers ?? -1;
            current = await this.prisma.driverProfile.count({ where: { companyId: user.companyId, status: 'ACTIVE' } });
            break;
          case 'vehicles':
            limit = plan.maxVehicles ?? -1;
            current = await this.prisma.vehicle.count({ where: { companyId: user.companyId } });
            break;
        }

        // -1 means unlimited
        if (limit === -1 || limit === 0) continue;

        if (current >= limit) {
          throw new HttpException({
            statusCode: 403,
            error: 'Plan Limit Exceeded',
            message: `Your ${plan.displayName || plan.name} plan allows max ${limit} ${resource}. Currently at ${current}. Please upgrade your plan.`,
            code: 'PLAN_LIMIT_EXCEEDED',
            resource,
            current,
            limit,
            plan: plan.name,
          }, 403);
        }
      } catch (err) {
        if (err instanceof HttpException) throw err;
        // On DB error, allow (fail-open)
      }
    }

    return true;
  }
}

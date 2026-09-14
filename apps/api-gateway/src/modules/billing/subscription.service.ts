import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async listPlans() {
    return this.prisma.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { monthlyPrice: 'asc' } });
  }

  async getPlan(planId: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async createPlan(data: any) {
    return this.prisma.subscriptionPlan.create({ data });
  }

  async updatePlan(planId: string, data: any) {
    return this.prisma.subscriptionPlan.update({ where: { id: planId }, data });
  }

  async getCompanySubscription(companyId: string) {
    return this.prisma.subscription.findFirst({
      where: { companyId, status: { in: ['ACTIVE', 'TRIAL'] } },
      include: { plan: true },
    });
  }

  async createSubscription(companyId: string, planId: string, billingCycle: string = 'MONTHLY') {
    const existing = await this.getCompanySubscription(companyId);
    if (existing) throw new BadRequestException('Company already has an active subscription');

    const plan = await this.getPlan(planId);
    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === 'ANNUAL') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    return this.prisma.subscription.create({
      data: {
        companyId,
        planId,
        billingCycle,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      include: { plan: true },
    });
  }

  async startTrial(companyId: string, planId: string, days: number = 14) {
    const plan = await this.getPlan(planId);
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + days);

    return this.prisma.subscription.create({
      data: {
        companyId,
        planId,
        billingCycle: 'MONTHLY',
        status: 'TRIAL',
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
        trialEndsAt: trialEnd,
      },
      include: { plan: true },
    });
  }

  async changePlan(subscriptionId: string, newPlanId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { id: subscriptionId } });
    if (!sub) throw new NotFoundException('Subscription not found');

    const newPlan = await this.getPlan(newPlanId);
    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { planId: newPlanId },
      include: { plan: true },
    });
  }

  async cancelSubscription(subscriptionId: string, reason?: string) {
    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: 'CANCELLED', cancelledAt: new Date(), suspensionReason: reason },
    });
  }

  async suspendSubscription(subscriptionId: string, reason: string) {
    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: 'SUSPENDED', suspensionReason: reason },
    });
  }

  async reactivateSubscription(subscriptionId: string) {
    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: 'ACTIVE', suspensionReason: null },
    });
  }

  async recordUsage(subscriptionId: string, metricCode: string, quantity: number) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const existing = await this.prisma.subscriptionUsage.findFirst({
      where: { subscriptionId, metricCode, periodStart, periodEnd },
    });

    if (existing) {
      return this.prisma.subscriptionUsage.update({
        where: { id: existing.id },
        data: { quantity: { increment: quantity } },
      });
    }

    return this.prisma.subscriptionUsage.create({
      data: { subscriptionId, metricCode, quantity, periodStart, periodEnd },
    });
  }

  async checkFeatureAccess(companyId: string, featureCode: string): Promise<boolean> {
    const sub = await this.getCompanySubscription(companyId);
    if (!sub) return false;
    if (sub.status === 'SUSPENDED') return false;

    const features = sub.plan.features as any;
    return features?.[featureCode] === true;
  }

  async checkLimits(companyId: string) {
    const sub = await this.getCompanySubscription(companyId);
    if (!sub) return { exceeded: true, reason: 'No subscription' };

    const plan = sub.plan;
    const [employeeCount, vehicleCount, driverCount, siteCount] = await Promise.all([
      this.prisma.user.count({ where: { companyId, status: 'ACTIVE' } }),
      this.prisma.vehicle.count({ where: { companyId } }),
      this.prisma.driverProfile.count({ where: { companyId } }),
      this.prisma.companySite.count({ where: { companyId } }),
    ]);

    return {
      employees: { current: employeeCount, limit: plan.maxEmployees, exceeded: employeeCount > plan.maxEmployees },
      vehicles: { current: vehicleCount, limit: plan.maxVehicles, exceeded: vehicleCount > plan.maxVehicles },
      drivers: { current: driverCount, limit: plan.maxDrivers, exceeded: driverCount > plan.maxDrivers },
      sites: { current: siteCount, limit: plan.maxSites, exceeded: siteCount > plan.maxSites },
    };
  }
}

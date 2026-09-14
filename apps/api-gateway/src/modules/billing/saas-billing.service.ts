import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { randomBytes, createHash } from 'crypto';

export enum SubscriptionStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  GRACE_PERIOD = 'GRACE_PERIOD',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export interface PlanLimits {
  maxEmployees: number;
  maxDrivers: number;
  maxVehicles: number;
  maxTripsPerMonth: number;
  maxAIRequests: number;
  maxStorageGB: number;
  maxAPICallsPerMonth: number;
  maxGPSDevices: number;
  maxNotifications: number;
  features: string[];
}

const PLAN_CONFIGS: Record<string, PlanLimits> = {
  FREE_TRIAL: {
    maxEmployees: 50,
    maxDrivers: 10,
    maxVehicles: 10,
    maxTripsPerMonth: 500,
    maxAIRequests: 100,
    maxStorageGB: 1,
    maxAPICallsPerMonth: 10000,
    maxGPSDevices: 5,
    maxNotifications: 1000,
    features: ['BOOKING', 'DISPATCH', 'GPS', 'ANALYTICS_BASIC'],
  },
  STARTER: {
    maxEmployees: 500,
    maxDrivers: 50,
    maxVehicles: 50,
    maxTripsPerMonth: 5000,
    maxAIRequests: 1000,
    maxStorageGB: 10,
    maxAPICallsPerMonth: 100000,
    maxGPSDevices: 50,
    maxNotifications: 10000,
    features: ['BOOKING', 'DISPATCH', 'GPS', 'ANALYTICS', 'VENDOR', 'EXPENSE'],
  },
  BUSINESS: {
    maxEmployees: 5000,
    maxDrivers: 500,
    maxVehicles: 500,
    maxTripsPerMonth: 50000,
    maxAIRequests: 10000,
    maxStorageGB: 100,
    maxAPICallsPerMonth: 1000000,
    maxGPSDevices: 500,
    maxNotifications: 100000,
    features: ['BOOKING', 'DISPATCH', 'GPS', 'ANALYTICS', 'VENDOR', 'EXPENSE', 'AI', 'BILLING', 'API'],
  },
  ENTERPRISE: {
    maxEmployees: -1,    // Unlimited
    maxDrivers: -1,
    maxVehicles: -1,
    maxTripsPerMonth: -1,
    maxAIRequests: -1,
    maxStorageGB: -1,
    maxAPICallsPerMonth: -1,
    maxGPSDevices: -1,
    maxNotifications: -1,
    features: ['ALL'],
  },
};

@Injectable()
export class SaaSBillingService {
  private readonly logger = new Logger(SaaSBillingService.name);

  constructor(private prisma: PrismaService) {}

  // ============================================================
  // 1. SUBSCRIPTION MANAGEMENT
  // ============================================================
  async createSubscription(companyId: string, planKey: string, billingCycle: 'MONTHLY' | 'YEARLY') {
    const plan = PLAN_CONFIGS[planKey];
    if (!plan) throw new BadRequestException(`Unknown plan: ${planKey}`);

    const subscription = await (this.prisma as any).subscription.upsert({
      where: { companyId },
      create: {
        companyId,
        planKey,
        status: 'ACTIVE',
        billingCycle,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + (billingCycle === 'YEARLY' ? 365 : 30) * 86400000),
        createdAt: new Date(),
      },
      update: {
        planKey,
        billingCycle,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + (billingCycle === 'YEARLY' ? 365 : 30) * 86400000),
      },
    });

    await this.createAuditLog(companyId, 'SYSTEM', 'SUBSCRIPTION_CREATED', {
      planKey,
      billingCycle,
    });

    return subscription;
  }

  async checkPlanLimits(companyId: string, resource: string): Promise<{ allowed: boolean; current: number; limit: number; plan: string }> {
    const subscription = await (this.prisma as any).subscription.findUnique({
      where: { companyId },
    });

    const planKey = subscription?.planKey || 'FREE_TRIAL';
    const limits = PLAN_CONFIGS[planKey] || PLAN_CONFIGS.FREE_TRIAL;

    const limitMap: Record<string, { limit: number; countFn: () => Promise<number> }> = {
      employees: {
        limit: limits.maxEmployees,
        countFn: () => this.prisma.user.count({ where: { companyId } }),
      },
      drivers: {
        limit: limits.maxDrivers,
        countFn: () => this.prisma.driverProfile.count({ where: { companyId } }),
      },
      vehicles: {
        limit: limits.maxVehicles,
        countFn: () => this.prisma.vehicle.count({ where: { companyId } }),
      },
    };

    const config = limitMap[resource];
    if (!config) return { allowed: true, current: 0, limit: -1, plan: planKey };

    const current = await config.countFn();
    const allowed = config.limit === -1 || current < config.limit;

    return { allowed, current, limit: config.limit, plan: planKey };
  }

  // ============================================================
  // 2. USAGE METERING
  // ============================================================
  async recordUsage(companyId: string, metric: string, quantity: number) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    await (this.prisma as any).subscriptionUsage.upsert({
      where: {
        companyId_metric_periodStart: {
          companyId,
          metric,
          periodStart,
        },
      },
      create: {
        companyId,
        metric,
        quantity,
        periodStart,
        periodEnd,
        createdAt: now,
      },
      update: {
        quantity: { increment: quantity },
      },
    });

    // Check limits
    const subscription = await (this.prisma as any).subscription.findUnique({
      where: { companyId },
    });
    const limits = PLAN_CONFIGS[subscription?.planKey || 'FREE_TRIAL'];

    const usageLimitMap: Record<string, number> = {
      trips: limits.maxTripsPerMonth,
      ai_requests: limits.maxAIRequests,
      api_calls: limits.maxAPICallsPerMonth,
      notifications: limits.maxNotifications,
    };

    const limit = usageLimitMap[metric];
    if (limit && limit > 0) {
      const totalUsage = await (this.prisma as any).subscriptionUsage.aggregate({
        where: { companyId, metric, periodStart: { gte: periodStart } },
        _sum: { quantity: true },
      });

      if ((totalUsage._sum.quantity || 0) >= limit) {
        this.logger.warn(`Usage limit reached for ${metric}: ${totalUsage._sum.quantity}/${limit}`);
      }
    }
  }

  // ============================================================
  // 3. API KEY MANAGEMENT
  // ============================================================
  async createAPIKey(companyId: string, data: {
    name: string;
    environment: 'SANDBOX' | 'PRODUCTION';
    permissions?: string[];
    expiresAt?: Date;
  }) {
    const rawKey = randomBytes(32).toString('hex');
    const prefix = data.environment === 'SANDBOX' ? 'ms_sandbox' : 'ms_prod';
    const apiKey = `${prefix}_${rawKey}`;
    const keyHash = createHash('sha256').update(apiKey).digest('hex');

    const record = await (this.prisma as any).aPIKey.create({
      data: {
        companyId,
        name: data.name,
        keyHash,
        keyPrefix: apiKey.substring(0, 12) + '...',
        environment: data.environment,
        permissions: JSON.stringify(data.permissions || []),
        expiresAt: data.expiresAt || null,
        status: 'ACTIVE',
        createdAt: new Date(),
      },
    });

    await this.createAuditLog(companyId, 'SYSTEM', 'API_KEY_CREATED', {
      keyId: (record as any).id,
      name: data.name,
      environment: data.environment,
    });

    // Return the raw key ONCE — it cannot be retrieved again
    return { ...record, apiKey };
  }

  async validateAPIKey(apiKey: string): Promise<{ valid: boolean; companyId?: string; permissions?: string[] }> {
    const keyHash = createHash('sha256').update(apiKey).digest('hex');

    const record = await (this.prisma as any).aPIKey.findFirst({
      where: { keyHash, status: 'ACTIVE' },
    });

    if (!record) return { valid: false };

    if (record.expiresAt && record.expiresAt < new Date()) {
      return { valid: false };
    }

    return {
      valid: true,
      companyId: record.companyId,
      permissions: JSON.parse(record.permissions || '[]'),
    };
  }

  async revokeAPIKey(keyId: string, companyId: string) {
    await (this.prisma as any).aPIKey.update({
      where: { id: keyId },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });

    await this.createAuditLog(companyId, 'SYSTEM', 'API_KEY_REVOKED', { keyId });
    return { revoked: true };
  }

  // ============================================================
  // 4. WEBHOOK MANAGEMENT
  // ============================================================
  async createWebhook(companyId: string, data: {
    url: string;
    events: string[];
    secret?: string;
  }) {
    const webhookSecret = data.secret || randomBytes(32).toString('hex');

    const webhook = await (this.prisma as any).webhook.create({
      data: {
        companyId,
        url: data.url,
        events: JSON.stringify(data.events),
        secret: createHash('sha256').update(webhookSecret).digest('hex'),
        status: 'ACTIVE',
        createdAt: new Date(),
      },
    });

    return { ...webhook, secret: webhookSecret };
  }

  async triggerWebhook(companyId: string, event: string, payload: any) {
    const webhooks = await (this.prisma as any).webhook.findMany({
      where: { companyId, status: 'ACTIVE' },
    });

    for (const webhook of webhooks) {
      const events = JSON.parse(webhook.events || '[]');
      if (!events.includes(event)) continue;

      try {
        // In production: use fetch/axios with HMAC signature
        this.logger.log(`Webhook triggered: ${event} -> ${webhook.url}`);
        await (this.prisma as any).webhookDelivery.create({
          data: {
            webhookId: webhook.id,
            event,
            payload: JSON.stringify(payload),
            status: 'DELIVERED',
            deliveredAt: new Date(),
            createdAt: new Date(),
          },
        });
      } catch (error: any) {
        this.logger.error(`Webhook delivery failed: ${error.message}`);
        await (this.prisma as any).webhookDelivery.create({
          data: {
            webhookId: webhook.id,
            event,
            payload: JSON.stringify(payload),
            status: 'FAILED',
            error: error.message,
            createdAt: new Date(),
          },
        });
      }
    }
  }

  // ============================================================
  // 5. WHITE-LABEL CONFIGURATION
  // ============================================================
  async configureWhiteLabel(companyId: string, config: {
    companyName?: string;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    customDomain?: string;
    emailBranding?: string;
  }) {
    await (this.prisma as any).company.update({
      where: { id: companyId },
      data: {
        ...config as any,
      },
    });

    return { configured: true, ...config };
  }

  // ============================================================
  // HELPERS
  // ============================================================
  private async createAuditLog(companyId: string, userId: string, action: string, details: any) {
    try {
      await (this.prisma as any).auditLog.create({
        data: {
          companyId,
          userId,
          action,
          resourceType: 'SAAS_BILLING',
          resourceId: companyId,
          details: JSON.stringify(details),
          createdAt: new Date(),
        },
      });
    } catch (e: any) {
      this.logger.error(`Audit log failed: ${e.message}`);
    }
  }
}

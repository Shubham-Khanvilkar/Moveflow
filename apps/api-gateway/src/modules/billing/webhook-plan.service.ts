import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import * as crypto from 'crypto';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async createWebhook(companyId: string, data: { url: string; events: string[]; secret?: string }) {
    const secret = data.secret || crypto.randomBytes(32).toString('hex');
    const webhook = await (this.prisma as any).webhook.create({
      data: {
        companyId,
        url: data.url,
        events: data.events,
        secret,
        status: 'ACTIVE',
      },
    });
    return { id: webhook.id, url: data.url, events: data.events, secret, status: 'ACTIVE' };
  }

  async listWebhooks(companyId: string) {
    return (this.prisma as any).webhook.findMany({ where: { companyId } });
  }

  async deleteWebhook(companyId: string, webhookId: string) {
    await (this.prisma as any).webhook.deleteMany({ where: { id: webhookId, companyId } });
    return { deleted: true };
  }

  async triggerWebhook(companyId: string, event: string, payload: any) {
    const webhooks = await (this.prisma as any).webhook.findMany({
      where: { companyId, status: 'ACTIVE' },
    });

    const matching = webhooks.filter((w: any) => w.events.includes(event) || w.events.includes('*'));

    const results = [];
    for (const webhook of matching) {
      try {
        const signature = crypto.createHmac('sha256', webhook.secret).update(JSON.stringify(payload)).digest('hex');
        results.push({ webhookId: webhook.id, url: webhook.url, status: 'sent', signature });
      } catch (err: any) {
        results.push({ webhookId: webhook.id, status: 'failed', error: err.message });
      }
    }

    return { triggered: results.length, results };
  }
}

@Injectable()
export class PlanLimitsService {
  constructor(private prisma: PrismaService) {}

  private plans: Record<string, any> = {
    FREE: { maxEmployees: 50, maxVehicles: 10, maxTripsPerMonth: 500, maxApiCalls: 10000 },
    STARTER: { maxEmployees: 500, maxVehicles: 100, maxTripsPerMonth: 5000, maxApiCalls: 100000 },
    PROFESSIONAL: { maxEmployees: 5000, maxVehicles: 500, maxTripsPerMonth: 50000, maxApiCalls: 1000000 },
    ENTERPRISE: { maxEmployees: Infinity, maxVehicles: Infinity, maxTripsPerMonth: Infinity, maxApiCalls: Infinity },
  };

  async getPlanLimits(companyId: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const plan = (company as any).plan || 'FREE';
    return { plan, limits: this.plans[plan] || this.plans.FREE };
  }

  async checkLimit(companyId: string, resource: string, currentUsage: number) {
    const limits = await this.getPlanLimits(companyId);
    const limit = (limits.limits as any)[resource];
    if (limit === undefined) return { withinLimit: true };
    return { withinLimit: currentUsage < limit, current: currentUsage, limit, plan: limits.plan };
  }
}

@Injectable()
export class WhiteLabelService {
  constructor(private prisma: PrismaService) {}

  async getBranding(companyId: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    return {
      companyName: company?.name || 'NAVIRA',
      logo: null,
      primaryColor: '#1a73e8',
      secondaryColor: '#34a853',
      customDomain: null,
      favicon: null,
    };
  }

  async updateBranding(companyId: string, data: any) {
    return { updated: true, companyId, branding: data };
  }
}

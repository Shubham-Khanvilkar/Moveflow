import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class WebhookDispatcherService {
  private readonly logger = new Logger(WebhookDispatcherService.name);

  constructor(private prisma: PrismaService) {}

  async dispatch(companyId: string, event: string, payload: any) {
    const webhooks = await this.prisma.webhookConfig.findMany({
      where: { companyId, status: 'ACTIVE', events: { has: event } },
    });

    for (const webhook of webhooks) {
      try {
        const signature = this.signPayload(payload, webhook.secret);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': event,
          },
          body: JSON.stringify({ event, payload, timestamp: new Date().toISOString() }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        await this.prisma.webhookLog.create({
          data: {
            webhookId: webhook.id,
            event,
            payload,
            responseStatus: response.status,
            responseBody: await response.text().catch(() => ''),
            success: response.ok,
          },
        });

        if (!response.ok) {
          await this.handleFailure(webhook.id);
        } else {
          await this.prisma.webhookConfig.update({
            where: { id: webhook.id },
            data: { failureCount: 0, lastTriggeredAt: new Date() },
          });
        }
      } catch (error: any) {
        this.logger.error(`Webhook delivery failed: ${error.message}`);
        await this.prisma.webhookLog.create({
          data: {
            webhookId: webhook.id,
            event,
            payload,
            responseBody: error.message,
            success: false,
          },
        });
        await this.handleFailure(webhook.id);
      }
    }
  }

  private async handleFailure(webhookId: string) {
    const webhook = await this.prisma.webhookConfig.findUnique({ where: { id: webhookId } });
    if (!webhook) return;

    const newCount = webhook.failureCount + 1;
    if (newCount >= 3) {
      await this.prisma.webhookConfig.update({
        where: { id: webhookId },
        data: { status: 'FAILED', failureCount: newCount },
      });
    } else {
      await this.prisma.webhookConfig.update({
        where: { id: webhookId },
        data: { failureCount: newCount },
      });
    }
  }

  private signPayload(payload: any, secret: string): string {
    return crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
  }

  async createWebhook(companyId: string, data: { url: string; events: string[] }) {
    const secret = crypto.randomBytes(32).toString('hex');
    return this.prisma.webhookConfig.create({
      data: { companyId, url: data.url, secret, events: data.events },
    });
  }

  async listWebhooks(companyId: string) {
    return this.prisma.webhookConfig.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' } });
  }

  async deleteWebhook(webhookId: string) {
    return this.prisma.webhookConfig.delete({ where: { id: webhookId } });
  }

  async getDeliveryLogs(webhookId: string, limit: number = 50) {
    return this.prisma.webhookLog.findMany({
      where: { webhookId },
      orderBy: { deliveredAt: 'desc' },
      take: limit,
    });
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { TemplateEngine, TemplateContext } from '../../common/template-engine';
import { TwilioSmsProvider } from '../../common/sms-provider';
import { NotificationChannelsService, NotificationPayload } from './notification-channels.service';

export interface BulkNotificationRequest {
  companyId: string;
  channel: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH';
  templateKey: string;
  recipientIds: string[];
  context: TemplateContext;
  scheduleAt?: Date;
}

export interface BulkNotificationResult {
  total: number;
  sent: number;
  failed: number;
  scheduled: number;
  errors: Array<{ recipientId: string; error: string }>;
}

@Injectable()
export class BulkNotificationService {
  private readonly logger = new Logger(BulkNotificationService.name);

  constructor(
    private prisma: PrismaService,
    private templateEngine: TemplateEngine,
    private smsProvider: TwilioSmsProvider,
    private notificationChannels: NotificationChannelsService
  ) {}

  async sendBulk(request: BulkNotificationRequest): Promise<BulkNotificationResult> {
    const result: BulkNotificationResult = { total: request.recipientIds.length, sent: 0, failed: 0, scheduled: 0, errors: [] };
    const recipients = await this.getRecipients(request.recipientIds, request.companyId);

    for (const recipient of recipients) {
      try {
        const context = {
          ...request.context,
          recipientName: recipient.name,
          recipientEmail: recipient.email,
        };

        const template = await this.getTemplate(request.companyId, request.templateKey, request.channel);
        const rendered = this.templateEngine.render(template, context);

        if (request.scheduleAt) {
          await this.scheduleNotification(request, recipient, rendered, request.scheduleAt);
          result.scheduled++;
          continue;
        }

        const payload: NotificationPayload = {
          companyId: request.companyId,
          userId: recipient.id,
          channel: request.channel === 'EMAIL' ? 'EMAIL' : request.channel === 'SMS' ? 'SMS' : request.channel,
          eventType: request.templateKey,
          title: request.templateKey.replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          body: rendered,
          recipientEmail: recipient.email,
          recipientPhone: recipient.phone || undefined,
        };

        await this.notificationChannels.send(payload);
        result.sent++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({ recipientId: recipient.id, error: error.message });
      }
    }

    await this.logBulkOperation(request, result);
    return result;
  }

  private async scheduleNotification(request: BulkNotificationRequest, recipient: any, content: string, scheduleAt: Date) {
    await (this.prisma as any).notification.create({
      data: {
        companyId: request.companyId,
        userId: recipient.id,
        type: request.channel,
        title: request.templateKey,
        body: content,
        status: 'PENDING',
        scheduledAt: scheduleAt,
      },
    });
  }

  private async getRecipients(ids: string[], companyId: string) {
    return this.prisma.user.findMany({
      where: { id: { in: ids }, companyId },
      select: { id: true, name: true, email: true, phone: true },
    });
  }

  private async getTemplate(companyId: string, key: string, channel: string): Promise<string> {
    const record = await (this.prisma as any).notificationTemplate?.findFirst({
      where: { companyId, key, isActive: true },
    });
    if (record) {
      const content = record.content as any;
      return content?.[channel.toLowerCase()] || content?.default || `Template: ${key}`;
    }
    return this.getDefaultTemplate(key);
  }

  private getDefaultTemplate(key: string): string {
    const templates: Record<string, string> = {
      'trip.assigned': 'Your trip has been assigned. Trip ID: {{tripId}}',
      'trip.started': 'Your trip has started. Driver: {{driverName}}',
      'trip.completed': 'Your trip has been completed.',
      'booking.confirmed': 'Your booking is confirmed for {{date}}.',
      'booking.cancelled': 'Your booking has been cancelled.',
      'announcement': '{{title}}\n\n{{body}}',
    };
    return templates[key] || `Notification: ${key}`;
  }

  private async logBulkOperation(request: BulkNotificationRequest, result: BulkNotificationResult) {
    this.logger.log(
      `Bulk ${request.channel}: ${result.sent}/${result.total} sent, ${result.failed} failed, ${result.scheduled} scheduled`
    );
  }
}

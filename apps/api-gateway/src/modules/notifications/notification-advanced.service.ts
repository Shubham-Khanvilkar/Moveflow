import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class NotificationTemplateService {
  private readonly logger = new Logger(NotificationTemplateService.name);

  private templates: Record<string, { subject: string; body: string; channels: string[] }> = {
    SOS_ALERT: {
      subject: 'SOS Alert - Emergency',
      body: 'Emergency SOS triggered by {{userName}} at {{location}}. Immediate action required.',
      channels: ['PUSH', 'SMS', 'EMAIL'],
    },
    BOOKING_APPROVED: {
      subject: 'Booking Approved',
      body: 'Your booking for {{date}} has been approved by {{approverName}}.',
      channels: ['PUSH', 'IN_APP'],
    },
    BOOKING_REJECTED: {
      subject: 'Booking Rejected',
      body: 'Your booking for {{date}} has been rejected. Reason: {{reason}}',
      channels: ['PUSH', 'IN_APP'],
    },
    TRIP_STARTED: {
      subject: 'Trip Started',
      body: 'Your trip has started. Driver: {{driverName}}, Vehicle: {{vehicleNumber}}',
      channels: ['PUSH', 'IN_APP'],
    },
    DRIVER_ARRIVING: {
      subject: 'Driver Arriving',
      body: 'Your driver {{driverName}} is arriving in {{eta}} minutes.',
      channels: ['PUSH', 'IN_APP', 'SMS'],
    },
    NO_SHOW_WARNING: {
      subject: 'No-Show Warning',
      body: 'You have a pending booking. Please be ready by {{pickupTime}}.',
      channels: ['PUSH', 'SMS'],
    },
    COMPLIANCE_EXPIRY: {
      subject: 'Compliance Document Expiring',
      body: 'Your {{docType}} expires on {{expiryDate}}. Please renew immediately.',
      channels: ['PUSH', 'EMAIL'],
    },
    EXPENSE_APPROVED: {
      subject: 'Expense Approved',
      body: 'Your expense of {{amount}} has been approved.',
      channels: ['PUSH', 'IN_APP'],
    },
    INVOICE_GENERATED: {
      subject: 'Monthly Invoice',
      body: 'Invoice {{invoiceNumber}} for {{amount}} has been generated.',
      channels: ['EMAIL'],
    },
    BAN_IMPOSED: {
      subject: 'Transport Ban',
      body: 'You have been banned from transport services. Reason: {{reason}}.',
      channels: ['PUSH', 'EMAIL', 'SMS'],
    },
  };

  constructor(private prisma: PrismaService) {}

  async getTemplate(templateKey: string) {
    return this.templates[templateKey] || null;
  }

  async renderTemplate(templateKey: string, variables: Record<string, string>) {
    const template = this.templates[templateKey];
    if (!template) return null;

    let body = template.body;
    for (const [key, value] of Object.entries(variables)) {
      body = body.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    return { subject: template.subject, body, channels: template.channels };
  }

  async listTemplates() {
    return Object.entries(this.templates).map(([key, t]) => ({
      key, subject: t.subject, channels: t.channels,
      preview: t.body.substring(0, 80) + '...',
    }));
  }

  async createTemplate(key: string, data: { subject: string; body: string; channels: string[] }) {
    this.templates[key] = data;
    return { key, created: true };
  }
}

@Injectable()
export class NotificationBatchingService {
  private batchQueue = new Map<string, any[]>();
  private readonly batchSize = 50;
  private readonly batchWindowMs = 30000;

  constructor(private prisma: PrismaService) {
    setInterval(() => this.flushBatches(), this.batchWindowMs);
  }

  async addToBatch(notification: any) {
    const key = notification.type || 'default';
    if (!this.batchQueue.has(key)) this.batchQueue.set(key, []);
    this.batchQueue.get(key)!.push(notification);

    if (this.batchQueue.get(key)!.length >= this.batchSize) {
      await this.flushBatch(key);
    }
  }

  async flushBatches() {
    const keys = Array.from(this.batchQueue.keys());
    for (const key of keys) {
      if (this.batchQueue.get(key)!.length > 0) {
        await this.flushBatch(key);
      }
    }
  }

  private async flushBatch(key: string) {
    const batch = this.batchQueue.get(key) || [];
    if (batch.length === 0) return;

    this.batchQueue.set(key, []);

    await this.prisma.notification.createMany({
      data: batch.map(n => ({
        userId: n.userId,
        companyId: n.companyId,
        title: n.title,
        message: n.message,
        type: n.type,
        priority: n.priority || 'NORMAL',
      })),
      skipDuplicates: true,
    });
  }

  getStats() {
    return {
      queueSize: Array.from(this.batchQueue.values()).reduce((sum, q) => sum + q.length, 0),
      batchTypes: Array.from(this.batchQueue.keys()),
    };
  }
}

@Injectable()
export class NotificationRetryService {
  private readonly logger = new Logger(NotificationRetryService.name);
  private retryQueue = new Map<string, { attempt: number; nextRetryAt: number; notification: any }>();
  private readonly maxRetries = 3;
  private readonly retryDelays = [5000, 30000, 120000];

  constructor(private prisma: PrismaService) {}

  async scheduleRetry(notification: any, attempt: number = 0) {
    if (attempt >= this.maxRetries) {
      this.logger.warn(`Max retries reached for notification ${notification.id}`);
      return { failed: true, reason: 'Max retries exceeded' };
    }

    const nextRetryAt = Date.now() + this.retryDelays[attempt];
    this.retryQueue.set(notification.id, { attempt, nextRetryAt, notification });

    return { scheduled: true, attempt: attempt + 1, nextRetryAt: new Date(nextRetryAt) };
  }

  async processRetries() {
    const now = Date.now();
    const ready = Array.from(this.retryQueue.entries())
      .filter(([_, r]) => r.nextRetryAt <= now);

    for (const [id, retry] of ready) {
      this.retryQueue.delete(id);
      this.logger.log(`Retrying notification ${id} (attempt ${retry.attempt + 1})`);
    }

    return { processed: ready.length };
  }

  getStats() {
    return { queueSize: this.retryQueue.size, maxRetries: this.maxRetries };
  }
}

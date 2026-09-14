import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

export type NotificationChannel = 'PUSH' | 'EMAIL' | 'SMS' | 'WHATSAPP' | 'IN_APP';
export type NotificationPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';

export interface NotificationPayload {
  companyId: string;
  userId: string;
  templateKey: string;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  variables: Record<string, string>;
  actionUrl?: string;
  groupId?: string;
}

export interface NotificationTemplate {
  priority?: string;
  key: string;
  title: string;
  body: string;
  emailSubject?: string;
  emailBody?: string;
  smsTemplate?: string;
  whatsappTemplate?: string;
  pushTitle?: string;
  pushBody?: string;
  channels: NotificationChannel[];
}

const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  BOOKING_CREATED: {
    key: 'BOOKING_CREATED',
    title: 'Booking Created',
    body: 'Your transport booking for {{date}} has been created.',
    channels: ['IN_APP', 'PUSH'],
  },
  BOOKING_APPROVED: {
    key: 'BOOKING_APPROVED',
    title: 'Booking Approved',
    body: 'Your booking for {{date}} has been approved by {{approver}}.',
    channels: ['IN_APP', 'PUSH', 'EMAIL'],
  },
  BOOKING_REJECTED: {
    key: 'BOOKING_REJECTED',
    title: 'Booking Rejected',
    body: 'Your booking for {{date}} was rejected. Reason: {{reason}}',
    channels: ['IN_APP', 'PUSH', 'EMAIL'],
  },
  DRIVER_ASSIGNED: {
    key: 'DRIVER_ASSIGNED',
    title: 'Driver Assigned',
    body: 'Driver {{driverName}} has been assigned. Vehicle: {{vehicleNumber}}',
    channels: ['IN_APP', 'PUSH'],
  },
  DRIVER_ARRIVED: {
    key: 'DRIVER_ARRIVED',
    title: 'Driver Arrived',
    body: 'Driver {{driverName}} has arrived at pickup.',
    channels: ['IN_APP', 'PUSH', 'SMS', 'WHATSAPP'],
  },
  TRIP_STARTED: {
    key: 'TRIP_STARTED',
    title: 'Trip Started',
    body: 'Your trip has started. ETA: {{eta}}',
    channels: ['IN_APP', 'PUSH'],
  },
  TRIP_COMPLETED: {
    key: 'TRIP_COMPLETED',
    title: 'Trip Completed',
    body: 'Your trip has been completed. Thank you!',
    channels: ['IN_APP', 'PUSH'],
  },
  NO_SHOW_MARKED: {
    key: 'NO_SHOW_MARKED',
    title: 'No-Show Recorded',
    body: 'A no-show has been recorded for your booking on {{date}}. You can appeal within 48 hours.',
    channels: ['IN_APP', 'PUSH', 'EMAIL'],
  },
  NO_SHOW_APPEAL: {
    key: 'NO_SHOW_APPEAL',
    title: 'No-Show Appeal Submitted',
    body: 'Your appeal for no-show on {{date}} has been submitted.',
    channels: ['IN_APP', 'PUSH', 'EMAIL'],
  },
  APPEAL_DECISION: {
    key: 'APPEAL_DECISION',
    title: 'Appeal Decision',
    body: 'Your no-show appeal has been {{decision}}.',
    channels: ['IN_APP', 'PUSH', 'EMAIL'],
  },
  BREAKDOWN_REPORTED: {
    key: 'BREAKDOWN_REPORTED',
    title: 'Vehicle Breakdown',
    body: 'Vehicle {{vehicleNumber}} has reported a breakdown. Replacement search initiated.',
    channels: ['IN_APP', 'PUSH', 'EMAIL'],
    priority: 'HIGH' as NotificationPriority,
  },
  SOS_ALERT: {
    key: 'SOS_ALERT',
    title: 'SOS ALERT',
    body: 'Emergency SOS triggered by {{userName}} at {{location}}',
    channels: ['IN_APP', 'PUSH', 'EMAIL', 'SMS', 'WHATSAPP'],
    priority: 'CRITICAL' as NotificationPriority,
  },
  SAFETY_ALERT: {
    key: 'SAFETY_ALERT',
    title: 'Safety Alert',
    body: '{{alertType}}: {{message}}',
    channels: ['IN_APP', 'PUSH'],
    priority: 'HIGH' as NotificationPriority,
  },
  COMPLIANCE_EXPIRY: {
    key: 'COMPLIANCE_EXPIRY',
    title: 'Document Expiring',
    body: '{{documentType}} expires in {{daysLeft}} days. Please renew immediately.',
    channels: ['IN_APP', 'PUSH', 'EMAIL'],
  },
  EXPENSE_APPROVED: {
    key: 'EXPENSE_APPROVED',
    title: 'Expense Approved',
    body: 'Your expense of ₹{{amount}} for {{description}} has been approved.',
    channels: ['IN_APP', 'PUSH'],
  },
  EXPENSE_REJECTED: {
    key: 'EXPENSE_REJECTED',
    title: 'Expense Rejected',
    body: 'Your expense of ₹{{amount}} was rejected. Reason: {{reason}}',
    channels: ['IN_APP', 'PUSH', 'EMAIL'],
  },
  BAN_IMPOSED: {
    key: 'BAN_IMPOSED',
    title: 'Transport Ban',
    body: 'A transport ban ({{banType}}) has been imposed on your account.',
    channels: ['IN_APP', 'PUSH', 'EMAIL'],
    priority: 'HIGH' as NotificationPriority,
  },
  SUPERVISOR_CALL_REQUEST: {
    key: 'SUPERVISOR_CALL_REQUEST',
    title: 'Supervisor Call Request',
    body: 'Driver {{driverName}} requests supervisor call for {{passengerName}}. Reason: {{reason}}',
    channels: ['IN_APP', 'PUSH', 'SMS'],
    priority: 'HIGH' as NotificationPriority,
  },
  ROUTE_DEVIATION: {
    key: 'ROUTE_DEVIATION',
    title: 'Route Deviation',
    body: 'Vehicle {{vehicleNumber}} has deviated {{distance}}m from planned route.',
    channels: ['IN_APP', 'PUSH'],
    priority: 'HIGH' as NotificationPriority,
  },
  MAINTENANCE_DUE: {
    key: 'MAINTENANCE_DUE',
    title: 'Vehicle Maintenance Due',
    body: 'Vehicle {{vehicleNumber}} is due for {{maintenanceType}}. Odometer: {{odometer}}',
    channels: ['IN_APP', 'PUSH', 'EMAIL'],
  },
};

@Injectable()
export class NotificationMultiChannelService {
  private readonly logger = new Logger(NotificationMultiChannelService.name);
  private retryQueue: Array<{ payload: NotificationPayload; attempt: number; nextRetryAt: Date }> = [];
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = [5000, 15000, 60000]; // 5s, 15s, 60s

  constructor(private prisma: PrismaService) {
    // Process retry queue every 10 seconds
    setInterval(() => this.processRetryQueue(), 10000);
  }

  // ============================================================
  // SEND NOTIFICATION
  // ============================================================
  async send(payload: NotificationPayload): Promise<{ id: string; channels: string[] }> {
    const template = NOTIFICATION_TEMPLATES[payload.templateKey];
    if (!template) {
      this.logger.warn(`Unknown template: ${payload.templateKey}`);
      return { id: '', channels: [] };
    }

    // Get user preferences
    const userPrefs = await this.getUserPreferences(payload.userId, payload.companyId);
    const enabledChannels = payload.channels.filter(ch => {
      if (ch === 'IN_APP') return true; // Always enabled
      return (userPrefs as any)?.push ? [ "PUSH", "EMAIL", "SMS" ] : [];
    });

    // Filter by priority
    if (payload.priority === 'CRITICAL') {
      // CRITICAL bypasses preferences - always send on all channels
    } else if (payload.priority === 'LOW') {
      // LOW only sends in-app
      const filtered = enabledChannels.filter(ch => ch === 'IN_APP');
      enabledChannels.length = 0;
      enabledChannels.push(...filtered);
    }

    // Resolve variables
    const resolvedTitle = this.resolveVariables(template.title, payload.variables);
    const resolvedBody = this.resolveVariables(template.body, payload.variables);

    // Create in-app notification
    const notification = await (this.prisma as any).notification.create({
      data: {
        companyId: payload.companyId,
        userId: payload.userId,
        title: resolvedTitle,
        body: resolvedBody,
        type: payload.templateKey,
        priority: payload.priority,
        actionUrl: payload.actionUrl || null,
        groupId: payload.groupId || null,
        read: false,
        createdAt: new Date(),
      },
    });

    const deliveredChannels: string[] = ['IN_APP'];

    // Send on other channels (async, fire-and-forget for speed)
    for (const channel of enabledChannels) {
      if (channel === 'IN_APP') continue;
      try {
        await this.sendOnChannel(channel, payload.userId, payload.companyId, {
          title: resolvedTitle,
          body: resolvedBody,
          actionUrl: payload.actionUrl,
          priority: payload.priority,
        });
        deliveredChannels.push(channel);
      } catch (error: any) {
        this.logger.error(`Failed to send ${channel} notification: ${error.message}`);
        this.addToRetryQueue({ ...payload, channels: [channel] });
      }
    }

    return {
      id: (notification as any).id,
      channels: deliveredChannels,
    };
  }

  // ============================================================
  // CHANNEL SENDERS
  // ============================================================
  private async sendOnChannel(
    channel: NotificationChannel,
    userId: string,
    companyId: string,
    data: { title: string; body: string; actionUrl?: string; priority: string },
  ): Promise<void> {
    const user = await (this.prisma as any).user.findUnique({ where: { id: userId } });
    if (!user) return;

    switch (channel) {
      case 'PUSH':
        await this.sendPushNotification(user, data);
        break;
      case 'EMAIL':
        await this.sendEmail(user, companyId, data);
        break;
      case 'SMS':
        await this.sendSMS(user, data);
        break;
      case 'WHATSAPP':
        await this.sendWhatsApp(user, data);
        break;
    }

    // Log communication
    await (this.prisma as any).communicationLog.create({
      data: {
        companyId,
        userId,
        channel,
        subject: data.title,
        body: data.body,
        status: 'SENT',
        priority: data.priority,
        sentAt: new Date(),
        createdAt: new Date(),
      },
    });
  }

  private async sendPushNotification(user: any, data: { title: string; body: string; actionUrl?: string }) {
    // FCM push notification - stub for now
    this.logger.log(`[PUSH] To ${user.id}: ${data.title}`);
    // In production: use firebase-admin to send FCM message
    // await admin.messaging().send({ token: user.fcmToken, notification: { title: data.title, body: data.body } });
  }

  private async sendEmail(user: any, companyId: string, data: { title: string; body: string }) {
    // Email via SES/SMTP - stub
    this.logger.log(`[EMAIL] To ${user.email}: ${data.title}`);
    // In production: use AWS SES or SMTP
  }

  private async sendSMS(user: any, data: { title: string; body: string }) {
    // SMS via Twilio - stub
    this.logger.log(`[SMS] To ${user.mobile}: ${data.body}`);
    // In production: use Twilio
  }

  private async sendWhatsApp(user: any, data: { title: string; body: string }) {
    // WhatsApp via Business API - stub
    this.logger.log(`[WHATSAPP] To ${user.mobile}: ${data.body}`);
    // In production: use WhatsApp Business API
  }

  // ============================================================
  // BATCH NOTIFICATIONS
  // ============================================================
  async sendBatch(payloads: NotificationPayload[]): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    // Group by user to avoid duplicate in-app notifications
    const byUser = new Map<string, NotificationPayload[]>();
    for (const p of payloads) {
      const existing = byUser.get(p.userId) || [];
      existing.push(p);
      byUser.set(p.userId, existing);
    }

    for (const [userId, userPayloads] of byUser) {
      for (const payload of userPayloads) {
        try {
          await this.send(payload);
          sent++;
        } catch (error: any) {
          this.logger.error(`Batch notification failed for user ${userId}: ${error.message}`);
          failed++;
        }
      }
    }

    return { sent, failed };
  }

  // ============================================================
  // DIGEST NOTIFICATIONS (daily/weekly summary)
  // ============================================================
  async sendDigest(companyId: string, frequency: 'DAILY' | 'WEEKLY') {
    const users = await (this.prisma as any).user.findMany({
      where: { companyId, status: 'ACTIVE' },
    });

    for (const user of users) {
      const since = frequency === 'DAILY'
        ? new Date(Date.now() - 24 * 60 * 60 * 1000)
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const unreadCount = await (this.prisma as any).notification.count({
        where: { userId: user.id, read: false, createdAt: { gte: since } },
      });

      if (unreadCount > 0) {
        await this.send({
          companyId,
          userId: user.id,
          templateKey: 'DIGEST',
          channels: ['EMAIL'],
          priority: 'LOW',
          variables: {
            count: unreadCount.toString(),
            frequency: frequency.toLowerCase(),
          },
        });
      }
    }
  }

  // ============================================================
  // RETRY QUEUE
  // ============================================================
  private addToRetryQueue(payload: NotificationPayload) {
    this.retryQueue.push({
      payload,
      attempt: 0,
      nextRetryAt: new Date(Date.now() + this.RETRY_DELAY_MS[0]),
    });
  }

  private async processRetryQueue() {
    const now = new Date();
    const ready = this.retryQueue.filter(item => item.nextRetryAt <= now);
    this.retryQueue = this.retryQueue.filter(item => item.nextRetryAt > now);

    for (const item of ready) {
      item.attempt++;
      if (item.attempt > this.MAX_RETRIES) {
        this.logger.error(`Max retries reached for notification: ${item.payload.templateKey}`);
        continue;
      }

      try {
        for (const channel of item.payload.channels) {
          const template = NOTIFICATION_TEMPLATES[item.payload.templateKey];
          if (!template) continue;
          const resolved = {
            title: this.resolveVariables(template.title, item.payload.variables),
            body: this.resolveVariables(template.body, item.payload.variables),
          };
          await this.sendOnChannel(channel, item.payload.userId, item.payload.companyId, {
            ...resolved,
            priority: item.payload.priority,
          });
        }
      } catch (error: any) {
        const delay = this.RETRY_DELAY_MS[Math.min(item.attempt, this.RETRY_DELAY_MS.length - 1)];
        item.nextRetryAt = new Date(Date.now() + delay);
        this.retryQueue.push(item);
      }
    }
  }

  // ============================================================
  // HELPERS
  // ============================================================
  private async getUserPreferences(userId: string, companyId: string) {
    return this.prisma.communicationPreference.findFirst({
      where: { userId, companyId },
    });
  }

  private resolveVariables(template: string, variables: Record<string, string>): string {
    let resolved = template;
    for (const [key, value] of Object.entries(variables)) {
      resolved = resolved.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return resolved;
  }
}

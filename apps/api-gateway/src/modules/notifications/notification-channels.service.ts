import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

export interface NotificationPayload {
  companyId: string;
  userId?: string;
  channel: 'PUSH' | 'SMS' | 'EMAIL' | 'WHATSAPP' | 'IN_APP';
  eventType: string; // booking.confirmed, trip.started, safety.sos, etc.
  title: string;
  body: string;
  data?: Record<string, any>;
  recipientPhone?: string;
  recipientEmail?: string;
}

export interface NotificationPreference {
  userId: string;
  companyId: string;
  push: boolean;
  sms: boolean;
  email: boolean;
  whatsapp: boolean;
  quietHoursStart?: string; // "22:00"
  quietHoursEnd?: string;   // "07:00"
}

/**
 * NotificationChannelsService handles multi-channel notification delivery.
 *
 * Channels:
 * - PUSH (Firebase Cloud Messaging)
 * - SMS (Twilio / AWS SNS / MSG91)
 * - EMAIL (SendGrid / AWS SES)
 * - WHATSAPP (Optional)
 * - IN_APP (Database record)
 */
@Injectable()
export class NotificationChannelsService {
  private readonly logger = new Logger(NotificationChannelsService.name);

  private sgMail: any = null;
  private readonly emailFrom: string;

  constructor(private prisma: PrismaService) {
    this.emailFrom = process.env.EMAIL_FROM || 'noreply@navira.app';
    const apiKey = process.env.SENDGRID_API_KEY;
    if (apiKey && apiKey !== 'your-sendgrid-api-key') {
      try {
        this.sgMail = require('@sendgrid/mail');
        this.sgMail.setApiKey(apiKey);
        this.logger.log('SendGrid email provider initialized');
      } catch {
        this.logger.warn('SendGrid package not installed, email channel disabled');
      }
    } else {
      this.logger.warn('SENDGRID_API_KEY not configured, email channel disabled');
    }
  }

  /**
   * Send a notification through the appropriate channel(s).
   */
  async send(payload: NotificationPayload): Promise<{ sent: string[]; failed: string[] }> {
    const sent: string[] = [];
    const failed: string[] = [];

    // Get user preferences
    const preferences = await this.getUserPreferences(payload.userId, payload.companyId);

    // Check quiet hours (except for safety notifications)
    if (this.isQuietHours(preferences) && !payload.eventType.startsWith('safety.')) {
      this.logger.log(`Notification skipped: quiet hours for user ${payload.userId}`);
      return { sent: [], failed: [] };
    }

    // Always send IN_APP notification
    try {
      await this.sendInApp(payload);
      sent.push('IN_APP');
    } catch (err: any) {
      this.logger.error(`IN_APP notification failed: ${err.message}`);
      failed.push('IN_APP');
    }

    // Send through enabled channels
    const channels: Array<{ enabled: boolean; channel: string; sender: () => Promise<void> }> = [
      { enabled: preferences?.push !== false, channel: 'PUSH', sender: () => this.sendPush(payload) },
      { enabled: preferences?.sms !== false, channel: 'SMS', sender: () => this.sendSMS(payload) },
      { enabled: preferences?.email !== false, channel: 'EMAIL', sender: () => this.sendEmail(payload) },
      { enabled: preferences?.whatsapp !== false, channel: 'WHATSAPP', sender: () => this.sendWhatsApp(payload) },
    ];

    for (const { enabled, channel, sender } of channels) {
      if (!enabled) continue;
      try {
        await sender();
        sent.push(channel);
      } catch (err: any) {
        this.logger.error(`${channel} notification failed: ${err.message}`);
        failed.push(channel);
      }
    }

    // Log communication
    await this.prisma.communicationLog.create({
      data: {
        companyId: payload.companyId,
        channel: payload.channel,
        recipientId: payload.userId,
        recipientPhone: payload.recipientPhone,
        recipientEmail: payload.recipientEmail,
        messageType: payload.eventType,
        content: payload.body,
        status: failed.length === 0 ? 'SENT' : 'PARTIAL',
      },
    });

    return { sent, failed };
  }

  /**
   * Send push notification via FCM.
   * Gracefully degrades when FCM is not configured.
   */
  private async sendPush(payload: NotificationPayload): Promise<void> {
    this.logger.warn(`Push notification not sent (FCM not configured): ${payload.title}`);
  }

  /**
   * Send SMS notification.
   * Gracefully degrades when SMS provider is not configured.
   */
  private async sendSMS(payload: NotificationPayload): Promise<void> {
    this.logger.warn(`SMS not sent (provider not configured): ${payload.title}`);
  }

  /**
   * Send email notification via SendGrid.
   * Gracefully degrades when SendGrid is not configured.
   */
  private async sendEmail(payload: NotificationPayload): Promise<void> {
    if (!this.sgMail) {
      this.logger.warn(`Email not sent (SendGrid not configured): ${payload.title}`);
      return;
    }

    if (!payload.recipientEmail) {
      this.logger.warn(`Email not sent: no recipient email for user ${payload.userId}`);
      return;
    }

    await this.sgMail.send({
      to: payload.recipientEmail,
      from: this.emailFrom,
      subject: payload.title,
      html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #2563EB;">${payload.title}</h2>
        <p>${payload.body}</p>
        ${payload.data ? `<pre style="background: #f5f5f5; padding: 10px; border-radius: 4px;">${JSON.stringify(payload.data, null, 2)}</pre>` : ''}
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #888; font-size: 12px;">NAVIRA Transportation Platform</p>
      </div>`,
    });

    this.logger.log(`Email sent to ${payload.recipientEmail}: ${payload.title}`);
  }

  /**
   * Send WhatsApp notification.
   * Gracefully degrades when WhatsApp provider is not configured.
   */
  private async sendWhatsApp(payload: NotificationPayload): Promise<void> {
    this.logger.warn(`WhatsApp not sent (provider not configured): ${payload.title}`);
  }

  /**
   * Send in-app notification (database record).
   */
  private async sendInApp(payload: NotificationPayload): Promise<void> {
    await (this.prisma as any).notification.create({
      data: {
        userId: payload.userId || 'system',
        type: this.mapEventTypeToNotificationType(payload.eventType),
        title: payload.title,
        message: payload.body,
        data: payload.data || {},
        read: false,
      },
    });
  }

  private mapEventTypeToNotificationType(eventType: string): string {
    const mapping: Record<string, string> = {
      'booking.confirmed': 'BOOKING_CONFIRMED',
      'booking.approved': 'BOOKING_APPROVED',
      'booking.rejected': 'BOOKING_REJECTED',
      'driver.assigned': 'DRIVER_ASSIGNED',
      'vehicle.approaching': 'VEHICLE_APPROACHING',
      'vehicle.arrived': 'VEHICLE_ARRIVED',
      'trip.delayed': 'TRIP_DELAYED',
      'trip.started': 'TRIP_COMPLETED',
      'booking.cancelled': 'BOOKING_CANCELLED',
      'safety.sos': 'SOS_ALERT',
    };
    return mapping[eventType] || 'SYSTEM';
  }

  /**
   * Get user notification preferences.
   */
  private async getUserPreferences(userId?: string, companyId?: string): Promise<NotificationPreference | null> {
    if (!userId || !companyId) return null;

    const pref = await this.prisma.communicationPreference.findUnique({
      where: { companyId_userId: { companyId, userId } },
    });

    return pref as unknown as NotificationPreference | null;
  }

  /**
   * Check if current time is within quiet hours.
   */
  private isQuietHours(preferences: NotificationPreference | null): boolean {
    if (!preferences?.quietHoursStart || !preferences?.quietHoursEnd) return false;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const [startHour, startMin] = preferences.quietHoursStart.split(':').map(Number);
    const [endHour, endMin] = preferences.quietHoursEnd.split(':').map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    // Handle overnight quiet hours (e.g., 22:00 to 07:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime < endTime;
    } else {
      return currentTime >= startTime && currentTime < endTime;
    }
  }

  /**
   * Bulk send notifications to multiple users.
   */
  async sendBulk(userIds: string[], payload: Omit<NotificationPayload, 'userId'>): Promise<{ total: number; sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        await this.send({ ...payload, userId });
        sent++;
      } catch {
        failed++;
      }
    }

    return { total: userIds.length, sent, failed };
  }
}

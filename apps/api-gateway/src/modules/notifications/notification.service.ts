import { Injectable, Logger, NotFoundException, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { SendNotificationDto } from './dto/send-notification.dto';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async send(userId: string, companyId: string, dto: SendNotificationDto) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found in this company');

    const notification = await this.prisma.notification.create({
      data: {
        userId,
        title: dto.title,
        message: dto.message,
        type: dto.type,
        channel: dto.channel,
        data: dto.data || undefined,
      },
    });

    await this.audit.log({
      companyId,
      userId,
      action: 'NOTIFICATION_SENT',
      entity: 'Notification',
      entityId: notification.id,
      newValue: { title: dto.title, type: dto.type, channel: dto.channel },
    });

    return notification;
  }

  async sendBulk(userIds: string[], companyId: string, dto: SendNotificationDto) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, companyId },
      select: { id: true },
    });

    const validUserIds = users.map((u) => u.id);
    if (validUserIds.length === 0) {
      throw new NotFoundException('No valid users found in this company');
    }

    const notifications = await this.prisma.notification.createMany({
      data: validUserIds.map((uid) => ({
        userId: uid,
        title: dto.title,
        message: dto.message,
        type: dto.type,
        channel: dto.channel,
        data: dto.data || undefined,
      })),
      skipDuplicates: true,
    });

    await this.audit.log({
      companyId,
      userId: validUserIds[0],
      action: 'NOTIFICATION_BULK_SENT',
      entity: 'Notification',
      newValue: {
        title: dto.title,
        type: dto.type,
        channel: dto.channel,
        recipientCount: notifications.count,
      },
    });

    return {
      sent: notifications.count,
      requested: userIds.length,
      validUsers: validUserIds.length,
    };
  }

  async getByUser(userId: string, params: { page?: number; limit?: number; unreadOnly?: boolean }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (params.unreadOnly) {
      where.read = false;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.read) {
      return notification;
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });

    return updated;
  }

  async markAllAsRead(userId: string, companyId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found in this company');

    const result = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    await this.audit.log({
      companyId,
      userId,
      action: 'NOTIFICATION_MARK_ALL_READ',
      entity: 'Notification',
      newValue: { count: result.count },
    });

    return {
      marked: result.count,
    };
  }

  async getUnreadCount(userId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const count = await this.prisma.notification.count({
      where: { userId, read: false },
    });

    return { count };
  }

  async deleteNotification(notificationId: string, userId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    return { deleted: true, id: notificationId };
  }

  // ============================================================
  // DEMO DATA (fallback when DB unavailable)
  // ============================================================

  private _demoSingleNotification(userId: string, dto: SendNotificationDto) {
    return {
      id: `notif-${Date.now()}`,
      userId,
      title: dto.title,
      message: dto.message,
      type: dto.type,
      channel: dto.channel,
      data: dto.data || null,
      read: false,
      createdAt: new Date().toISOString(),
    };
  }

  private _demoBulkResponse(userIds: string[], dto: SendNotificationDto) {
    return {
      sent: userIds.length,
      requested: userIds.length,
      validUsers: userIds.length,
    };
  }

  private _demoListResponse(userId: string) {
    return {
      data: [
        {
          id: 'notif-001',
          userId,
          title: 'Booking Confirmed',
          message: 'Your booking BK-2026-001 has been confirmed.',
          type: 'BOOKING_CONFIRMED',
          channel: 'IN_APP',
          data: { bookingId: 'bk-001' },
          read: false,
          createdAt: '2026-08-30T10:30:00Z',
        },
        {
          id: 'notif-002',
          userId,
          title: 'Vehicle Approaching',
          message: 'Your assigned vehicle is 5 minutes away.',
          type: 'VEHICLE_APPROACHING',
          channel: 'PUSH',
          data: { tripId: 'trip-001' },
          read: false,
          createdAt: '2026-08-30T09:15:00Z',
        },
        {
          id: 'notif-003',
          userId,
          title: 'System Maintenance',
          message: 'Scheduled maintenance on Sept 2, 2026 from 2:00-4:00 AM IST.',
          type: 'SYSTEM',
          channel: 'EMAIL',
          data: null,
          read: true,
          createdAt: '2026-08-29T14:00:00Z',
        },
      ],
      pagination: { page: 1, limit: 20, total: 3, totalPages: 1 },
    };
  }
}

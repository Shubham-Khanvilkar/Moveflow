import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

export class CreateNotificationDto {
  type: string;
  title: string;
  message: string;
  userId: string;
  data?: any;
  channel?: string;
}

export class NotificationQueryDto {
  type?: string;
  read?: boolean;
  page?: number;
  limit?: number;
}

@Injectable()
export class NotificationCenterService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type as any,
        title: dto.title,
        message: dto.message,
        data: dto.data,
        read: false,
        channel: (dto.channel as any) || 'IN_APP',
      },
    });

    return notification;
  }

  async findAll(userId: string, query: NotificationQueryDto) {
    const { type, read, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      userId,
    };
    if (type) where.type = type as any;
    if (read !== undefined) where.read = read;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: { read: true },
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
    return { count };
  }

  async delete(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    return this.prisma.notification.delete({ where: { id: notificationId } });
  }

  async getNotificationsByType(userId: string, type: string) {
    return this.prisma.notification.findMany({
      where: { userId, type: type as any },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}

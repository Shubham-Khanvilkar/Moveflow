import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

export type ChannelType = 'WHATSAPP' | 'SMS' | 'EMAIL' | 'PUSH' | 'IN_APP';

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);
  constructor(private prisma: PrismaService) {}

  async getPreferences(companyId: string, userId: string) {
    if (!this.prisma.isConnected()) return this.defaultPreferences();

    let prefs = await this.prisma.communicationPreference.findFirst({ where: { companyId, userId } });
    if (!prefs) {
      prefs = await this.prisma.communicationPreference.create({
        data: { companyId, userId },
      });
    }
    return prefs;
  }

  async updatePreferences(companyId: string, userId: string, updates: {
    whatsapp?: boolean;
    sms?: boolean;
    email?: boolean;
    push?: boolean;
  }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    let prefs = await this.prisma.communicationPreference.findFirst({ where: { companyId, userId } });
    if (prefs) {
      prefs = await this.prisma.communicationPreference.update({ where: { id: prefs.id }, data: updates });
    } else {
      prefs = await this.prisma.communicationPreference.create({
        data: { companyId, userId, ...updates },
      });
    }
    return prefs;
  }

  async sendNotification(userId: string, type: string, title: string, message: string, data?: any) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const notification = await this.prisma.notification.create({
      data: { userId, type: type as any, title, message, data },
    });

    const prefs = await this.prisma.communicationPreference.findFirst({ where: { userId } });
    if (prefs?.whatsapp) await this.sendWhatsApp(userId, message);
    if (prefs?.sms) await this.sendSMS(userId, message);
    if (prefs?.push) await this.sendPush(userId, title, message);

    return notification;
  }

  async broadcastToCompany(companyId: string, type: string, title: string, message: string, data?: any) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const users = await this.prisma.user.findMany({ where: { companyId }, select: { id: true } });
    let sent = 0;
    for (const user of users) {
      await this.sendNotification(user.id, type, title, message, data);
      sent++;
    }
    return { sent };
  }

  async sendTripNotification(tripId: string, type: string, title: string, message: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const passengers = await this.prisma.tripPassenger.findMany({ where: { tripId } });
    for (const p of passengers) {
      await this.sendNotification(p.userId, type, title, message, { tripId });
    }

    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (trip?.driverId) {
      await this.sendNotification(trip.driverId, type, title, message, { tripId });
    }
  }

  private async sendWhatsApp(userId: string, message: string) {
    this.logger.log(`WhatsApp -> ${userId}: ${message}`);
  }

  private async sendSMS(userId: string, message: string) {
    this.logger.log(`SMS -> ${userId}: ${message}`);
  }

  private async sendPush(userId: string, title: string, message: string) {
    this.logger.log(`Push -> ${userId}: ${title} - ${message}`);
  }

  private defaultPreferences() {
    return { whatsapp: true, sms: true, email: true, push: true };
  }
}

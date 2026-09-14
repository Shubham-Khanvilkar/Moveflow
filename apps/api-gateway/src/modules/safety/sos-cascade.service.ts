import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { EventsGateway } from '../../common/events.gateway';

@Injectable()
export class SOSCascadeService {
  private readonly logger = new Logger(SOSCascadeService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    @Optional() private events?: EventsGateway,
  ) {}

  async triggerSOS(companyId: string, data: {
    userId: string;
    tripId?: string;
    latitude?: number;
    longitude?: number;
    severity?: string;
    message?: string;
  }) {
    const user = await this.prisma.user.findUnique({ where: { id: data.userId } });
    if (!user) throw new Error('User not found');

    const sos = await (this.prisma as any).sOSAlert.create({
      data: {
        companyId,
        userId: data.userId,
        tripId: data.tripId,
        latitude: data.latitude,
        longitude: data.longitude,
        severity: data.severity || 'CRITICAL',
        message: data.message,
        status: 'ACTIVE',
      },
    });

    await this.audit.log({
      companyId, userId: data.userId, action: 'SOS_TRIGGERED', entity: 'SOSAlert',
      entityId: sos.id, newValue: { severity: data.severity, tripId: data.tripId },
    });

    await this.cascadeAlert(companyId, sos.id, user, data);

    this.events?.broadcastToCompany(companyId, 'sos-alert', {
      alertId: sos.id,
      userId: data.userId,
      userName: user.name,
      severity: data.severity || 'CRITICAL',
      latitude: data.latitude,
      longitude: data.longitude,
    });

    return { alertId: sos.id, status: 'ACTIVE', cascaded: true };
  }

  private async cascadeAlert(companyId: string, sosId: string, user: any, data: any) {
    const managers = await this.prisma.user.findMany({
      where: { companyId, status: 'ACTIVE', role: { in: ['COMPANY_ADMIN', 'TRANSPORT_ADMIN'] as any } } as any,
      take: 5,
    });

    for (const manager of managers) {
      await this.prisma.notification.create({
        data: {
          userId: manager.id,
          companyId,
          title: 'SOS ALERT',
          message: `Emergency SOS triggered by ${user.name}`,
          type: 'SOS_ALERT' as any,
          priority: 'CRITICAL' as any,
          metadata: JSON.stringify({ sosId, userId: user.id }),
        } as any,
      });
    }

    if (data.tripId) {
      const trip = await this.prisma.trip.findUnique({ where: { id: data.tripId } });
      if (trip && (trip as any).driverId) {
        await this.prisma.notification.create({
          data: {
            userId: (trip as any).driverId,
            companyId,
            title: 'SOS ALERT - PASSENGER EMERGENCY',
            message: 'A passenger has triggered an SOS alert. Please contact control room immediately.',
            type: 'SOS_ALERT' as any,
            priority: 'CRITICAL' as any,
          } as any,
        });
      }
    }
  }

  async acknowledgeSOS(companyId: string, sosId: string, userId: string) {
    await (this.prisma as any).sOSAlert.update({
      where: { id: sosId },
      data: { status: 'ACKNOWLEDGED', acknowledgedBy: userId, acknowledgedAt: new Date() } as any,
    });
    await this.audit.log({
      companyId, userId, action: 'SOS_ACKNOWLEDGED', entity: 'SOSAlert', entityId: sosId,
    });
    return { acknowledged: true };
  }

  async resolveSOS(companyId: string, sosId: string, userId: string, resolution: string) {
    await (this.prisma as any).sOSAlert.update({
      where: { id: sosId },
      data: { status: 'RESOLVED', resolvedBy: userId, resolvedAt: new Date(), resolution } as any,
    });
    await this.audit.log({
      companyId, userId, action: 'SOS_RESOLVED', entity: 'SOSAlert', entityId: sosId,
      newValue: { resolution },
    });
    return { resolved: true };
  }

  async getActiveSOSAlerts(companyId: string) {
    return (this.prisma as any).sOSAlert.findMany({
      where: { companyId, status: { in: ['ACTIVE', 'ACKNOWLEDGED'] } },
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}

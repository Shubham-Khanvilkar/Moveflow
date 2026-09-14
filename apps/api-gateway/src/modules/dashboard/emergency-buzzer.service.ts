import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class EmergencyBuzzerService {
  private readonly logger = new Logger(EmergencyBuzzerService.name);
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async triggerEmergency(companyId: string, userId: string, data: { triggerType: string; description?: string; latitude?: number; longitude?: number; address?: string; nearestOfficeId?: string }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const emergency = await this.prisma.emergencyBuzzer.create({
      data: {
        companyId, userId, triggerType: data.triggerType.toUpperCase(), description: data.description,
        latitude: data.latitude, longitude: data.longitude, address: data.address, nearestOfficeId: data.nearestOfficeId,
        status: 'ACTIVE', priority: 'CRITICAL',
      },
    });

    const contacts = await this.prisma.emergencySystemContact.findMany({ where: { companyId, isActive: true }, orderBy: { responseOrder: 'asc' } });
    let notificationsSent = 0;
    for (const contact of contacts) {
      await this.prisma.notification.create({
        data: { userId: 'system', type: 'SOS_ALERT', title: `EMERGENCY: ${data.triggerType}`, message: `${data.description || 'Emergency triggered'} at ${data.address || 'unknown location'}`, data: { emergencyId: emergency.id, contactPhone: contact.contactPhone } },
      });
      notificationsSent++;
    }

    await this.prisma.emergencyBuzzer.update({ where: { id: emergency.id }, data: { notificationsSent } });
    await this.audit.log({ companyId, userId, action: 'EMERGENCY_TRIGGERED', entity: 'EmergencyBuzzer', entityId: emergency.id, newValue: { triggerType: data.triggerType } });
    return { ...emergency, notificationsSent };
  }

  async acknowledgeEmergency(companyId: string, emergencyId: string, acknowledgedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const emergency = await this.prisma.emergencyBuzzer.findFirst({ where: { id: emergencyId, companyId } });
    if (!emergency) throw new NotFoundException('Emergency not found');
    const responseTimeSec = Math.round((Date.now() - emergency.createdAt.getTime()) / 1000);
    const updated = await this.prisma.emergencyBuzzer.update({ where: { id: emergencyId }, data: { status: 'ACKNOWLEDGED', acknowledgedBy, acknowledgedAt: new Date(), responseTimeSec } });
    await this.audit.log({ companyId, userId: acknowledgedBy, action: 'EMERGENCY_ACKNOWLEDGED', entity: 'EmergencyBuzzer', entityId: emergencyId });
    return updated;
  }

  async dispatchVehicles(companyId: string, emergencyId: string, vehicleIds: string[], dispatchedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const updated = await this.prisma.emergencyBuzzer.update({ where: { id: emergencyId }, data: { status: 'DISPATCHED', dispatchedVehicles: vehicleIds.join(','), dispatchedAt: new Date() } });
    await this.audit.log({ companyId, userId: dispatchedBy, action: 'EMERGENCY_VEHICLES_DISPATCHED', entity: 'EmergencyBuzzer', entityId: emergencyId, newValue: { vehicleIds } });
    return updated;
  }

  async resolveEmergency(companyId: string, emergencyId: string, resolvedBy: string, notes?: string, falseAlarm?: boolean) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const updated = await this.prisma.emergencyBuzzer.update({
      where: { id: emergencyId },
      data: { status: falseAlarm ? 'FALSE_ALARM' : 'RESOLVED', resolvedBy, resolvedAt: new Date(), resolutionNotes: notes, falseAlarm: falseAlarm ?? false, falseAlarmReason: falseAlarm ? notes : undefined },
    });
    await this.audit.log({ companyId, userId: resolvedBy, action: 'EMERGENCY_RESOLVED', entity: 'EmergencyBuzzer', entityId: emergencyId });
    return updated;
  }

  async getEmergencies(companyId: string, params?: { status?: string; triggerType?: string; page?: number; limit?: number }) {
    if (!this.prisma.isConnected()) return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    const page = params?.page || 1; const limit = Math.min(params?.limit || 20, 100); const skip = (page - 1) * limit;
    const where: any = { companyId };
    if (params?.status) where.status = params.status.toUpperCase();
    if (params?.triggerType) where.triggerType = params.triggerType.toUpperCase();
    const [data, total] = await Promise.all([this.prisma.emergencyBuzzer.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }), this.prisma.emergencyBuzzer.count({ where })]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getEmergencyById(companyId: string, emergencyId: string) {
    if (!this.prisma.isConnected()) return null;
    return this.prisma.emergencyBuzzer.findFirst({ where: { id: emergencyId, companyId } });
  }

  async createEmergencyContact(companyId: string, data: { contactName: string; contactPhone: string; contactEmail?: string; role: string; isPrimary?: boolean; responseOrder?: number }, createdBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    return this.prisma.emergencySystemContact.create({ data: { companyId, ...data } });
  }

  async getEmergencyContacts(companyId: string) {
    if (!this.prisma.isConnected()) return [];
    return this.prisma.emergencySystemContact.findMany({ where: { companyId, isActive: true }, orderBy: { responseOrder: 'asc' } });
  }

  async updateEmergencyContact(companyId: string, contactId: string, data: Record<string, any>) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    return this.prisma.emergencySystemContact.update({ where: { id: contactId }, data });
  }

  async deleteEmergencyContact(companyId: string, contactId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    return this.prisma.emergencySystemContact.update({ where: { id: contactId }, data: { isActive: false } });
  }

  async getActiveEmergencies(companyId: string) {
    if (!this.prisma.isConnected()) return [];
    return this.prisma.emergencyBuzzer.findMany({ where: { companyId, status: { in: ['ACTIVE', 'ACKNOWLEDGED', 'DISPATCHED'] } }, orderBy: { createdAt: 'desc' } });
  }
}

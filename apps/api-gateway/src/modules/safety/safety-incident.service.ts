import { Injectable, NotFoundException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class SafetyIncidentService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  // ============================================================
  // VEHICLE BREAKDOWN
  // ============================================================

  async reportBreakdown(companyId: string, data: {
    tripId?: string; vehicleId: string; driverId?: string;
    breakdownType: string; description: string;
    latitude?: number; longitude?: number;
    reportedBy: string;
  }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: data.vehicleId, companyId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const incident = await this.prisma.incident.create({
      data: {
        companyId,
        tripId: data.tripId,
        reporterId: data.reportedBy,
        type: 'VEHICLE_BREAKDOWN' as any,
        description: `[${data.breakdownType}] ${data.description}`,
        latitude: data.latitude,
        longitude: data.longitude,
        vehicleId: data.vehicleId,
        driverId: data.driverId,
        status: 'REPORTED' as any,
      },
    });

    await this.prisma.vehicle.update({ where: { id: data.vehicleId }, data: { status: 'INACTIVE' as any } });

    await this.audit.log({ companyId, userId: data.reportedBy, action: 'BREAKDOWN_REPORTED', entity: 'Incident', entityId: incident.id, newValue: { vehicleId: data.vehicleId, breakdownType: data.breakdownType } });

    return incident;
  }

  async assignReplacementVehicle(companyId: string, incidentId: string, data: {
    replacementVehicleId: string; reason?: string;
  }, assignedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const incident = await this.prisma.incident.findFirst({ where: { id: incidentId, companyId } });
    if (!incident) throw new NotFoundException('Incident not found');

    const replacement = await this.prisma.vehicle.findFirst({ where: { id: data.replacementVehicleId, companyId } });
    if (!replacement) throw new NotFoundException('Replacement vehicle not found');

    const updated = await this.prisma.incident.update({
      where: { id: incidentId },
      data: { status: 'IN_PROGRESS' as any },
    });

    await this.audit.log({ companyId, userId: assignedBy, action: 'REPLACEMENT_ASSIGNED', entity: 'Incident', entityId: incidentId, newValue: { replacementVehicleId: data.replacementVehicleId } });

    return updated;
  }

  async resolveBreakdown(companyId: string, incidentId: string, data: {
    resolution: string;
  }, resolvedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const incident = await this.prisma.incident.findFirst({ where: { id: incidentId, companyId } });
    if (!incident) throw new NotFoundException('Incident not found');

    const updated = await this.prisma.incident.update({
      where: { id: incidentId },
      data: { status: 'RESOLVED' as any },
    });

    if (incident.vehicleId) {
      await this.prisma.vehicle.update({ where: { id: incident.vehicleId }, data: { status: 'ACTIVE' as any } });
    }

    await this.audit.log({ companyId, userId: resolvedBy, action: 'BREAKDOWN_RESOLVED', entity: 'Incident', entityId: incidentId });

    return updated;
  }

  async getActiveBreakdowns(companyId: string) {
    if (!this.prisma.isConnected()) return [];
    return this.prisma.incident.findMany({
      where: { companyId, type: 'VEHICLE_BREAKDOWN' as any, status: { in: ['REPORTED', 'IN_PROGRESS'] as any[] } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============================================================
  // SOS / PANIC BUTTON
  // ============================================================

  async triggerSOS(companyId: string, userId: string, data: {
    tripId?: string; latitude?: number; longitude?: number;
    description?: string;
  }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const user = await this.prisma.user.findFirst({ where: { id: userId, companyId } });
    if (!user) throw new NotFoundException('User not found');

    const sos = await this.prisma.sOSAlert.create({
      data: {
        userId,
        tripId: data.tripId,
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        description: data.description,
        status: 'OPEN',
      },
    });

    await this.audit.log({ companyId, userId, action: 'SOS_TRIGGERED', entity: 'SOSAlert', entityId: sos.id });

    return sos;
  }

  async acknowledgeSOS(companyId: string, sosId: string, acknowledgedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const sos = await this.prisma.sOSAlert.findFirst({ where: { id: sosId } });
    if (!sos) throw new NotFoundException('SOS alert not found');

    const updated = await this.prisma.sOSAlert.update({
      where: { id: sosId },
      data: { status: 'ACKNOWLEDGED', acknowledgedById: acknowledgedBy, acknowledgedAt: new Date() },
    });

    await this.audit.log({ companyId, userId: acknowledgedBy, action: 'SOS_ACKNOWLEDGED', entity: 'SOSAlert', entityId: sosId });

    return updated;
  }

  async resolveSOS(companyId: string, sosId: string, resolvedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const updated = await this.prisma.sOSAlert.update({
      where: { id: sosId },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });

    await this.audit.log({ companyId, userId: resolvedBy, action: 'SOS_RESOLVED', entity: 'SOSAlert', entityId: sosId });

    return updated;
  }

  async getActiveSOSAlerts(companyId: string) {
    if (!this.prisma.isConnected()) return [];
    return this.prisma.sOSAlert.findMany({
      where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] as any[] } },
      include: { user: { select: { id: true, name: true, phone: true } } } as any,
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============================================================
  // INCIDENT REPORTING
  // ============================================================

  async reportIncident(companyId: string, data: {
    tripId?: string; vehicleId?: string; driverId?: string;
    incidentType: string; description: string;
    latitude?: number; longitude?: number;
    reportedBy: string;
  }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const incident = await this.prisma.incident.create({
      data: {
        companyId,
        tripId: data.tripId,
        reporterId: data.reportedBy,
        type: data.incidentType as any,
        description: data.description,
        latitude: data.latitude,
        longitude: data.longitude,
        vehicleId: data.vehicleId,
        driverId: data.driverId,
        status: 'REPORTED' as any,
      },
    });

    await this.audit.log({ companyId, userId: data.reportedBy, action: 'INCIDENT_REPORTED', entity: 'Incident', entityId: incident.id, newValue: { incidentType: data.incidentType } });

    return incident;
  }

  async getIncidents(companyId: string, filters?: { status?: string; incidentType?: string; page?: number; limit?: number }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 20, 100);
    const where: any = { companyId };
    if (filters?.status) where.status = filters.status;
    if (filters?.incidentType) where.type = filters.incidentType;

    const [incidents, total] = await Promise.all([
      this.prisma.incident.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.incident.count({ where }),
    ]);

    return { incidents, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateIncidentStatus(companyId: string, incidentId: string, status: string, updatedBy?: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const incident = await this.prisma.incident.findFirst({ where: { id: incidentId, companyId } });
    if (!incident) throw new NotFoundException('Incident not found');

    const updated = await this.prisma.incident.update({ where: { id: incidentId }, data: { status: status as any } });
    await this.audit.log({ companyId, userId: updatedBy || 'system', action: 'INCIDENT_STATUS_UPDATED', entity: 'Incident', entityId: incidentId, newValue: { status } });
    return updated;
  }
}

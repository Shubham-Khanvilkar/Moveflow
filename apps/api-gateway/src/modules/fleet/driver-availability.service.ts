import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class DriverAvailabilityService {
  private readonly logger = new Logger(DriverAvailabilityService.name);

  constructor(private prisma: PrismaService, private audit: AuditService) {}

  // Valid state transitions
  private readonly validTransitions: Record<string, string[]> = {
    OFF_DUTY: ['GO_ACTIVE'],
    GO_ACTIVE: ['AVAILABLE', 'GO_OFFLINE'],
    AVAILABLE: ['ON_TRIP', 'BREAK', 'REST', 'SLEEPY', 'GO_OFFLINE'],
    ON_TRIP: ['AVAILABLE', 'BREAK', 'GO_OFFLINE'],
    BREAK: ['AVAILABLE', 'GO_OFFLINE'],
    REST: ['AVAILABLE', 'GO_OFFLINE'],
    SLEEPY: ['GO_OFFLINE', 'REST'],
    GO_OFFLINE: ['OFF_DUTY'],
    UNAVAILABLE: ['OFF_DUTY'],
  };

  // Driver goes ACTIVE from mobile app
  async goActive(companyId: string, driverId: string, data: {
    latitude?: number; longitude?: number; accuracy?: number;
  }) {
    return this.transition(companyId, driverId, 'GO_ACTIVE', data, 'MOBILE');
  }

  // Driver goes OFFLINE
  async goOffline(companyId: string, driverId: string, reason?: string) {
    return this.transition(companyId, driverId, 'GO_OFFLINE', { reason }, 'MOBILE');
  }

  // Driver takes BREAK
  async startBreak(companyId: string, driverId: string) {
    return this.transition(companyId, driverId, 'BREAK', {}, 'MOBILE');
  }

  // Driver ends break
  async endBreak(companyId: string, driverId: string) {
    return this.transition(companyId, driverId, 'AVAILABLE', {}, 'MOBILE');
  }

  // Driver reports SLEEPY (safety event)
  async reportSleepy(companyId: string, driverId: string) {
    return this.transition(companyId, driverId, 'SLEEPY', { reason: 'Driver reported feeling sleepy' }, 'MOBILE');
  }

  // Driver goes REST
  async startRest(companyId: string, driverId: string) {
    return this.transition(companyId, driverId, 'REST', {}, 'MOBILE');
  }

  // Get current driver availability
  async getAvailability(companyId: string, driverId: string) {
    const latest = await (this.prisma as any).driverAvailabilityEvent.findFirst({
      where: { companyId, driverId },
      orderBy: { createdAt: 'desc' },
    });

    // Get today's shift assignment
    const today = new Date();
    const shiftAssignment = await (this.prisma as any).driverShiftAssignment.findFirst({
      where: { companyId, driverId, date: today },
    });

    return {
      currentStatus: latest?.status || 'OFF_DUTY',
      lastChanged: latest?.createdAt,
      triggerSource: latest?.triggerSource,
      shiftAssignment,
    };
  }

  private async transition(companyId: string, driverId: string, targetStatus: string, extra: any, source: string) {
    // Get current status
    const current = await (this.prisma as any).driverAvailabilityEvent.findFirst({
      where: { companyId, driverId },
      orderBy: { createdAt: 'desc' },
    });

    const currentStatus = current?.status || 'OFF_DUTY';

    // Validate transition
    const allowed = this.validTransitions[currentStatus];
    if (!allowed || !allowed.includes(targetStatus)) {
      throw new BadRequestException(
        `Invalid transition: ${currentStatus} → ${targetStatus}. Allowed: ${allowed?.join(', ') || 'none'}`
      );
    }

    // Create event
    const event = await (this.prisma as any).driverAvailabilityEvent.create({
      data: {
        companyId,
        driverId,
        status: targetStatus,
        previousStatus: currentStatus,
        latitude: extra.latitude,
        longitude: extra.longitude,
        accuracy: extra.accuracy,
        reason: extra.reason,
        triggerSource: source,
      },
    });

    await this.audit.log({
      companyId,
      userId: driverId,
      action: `DRIVER_AVAILABILITY_${targetStatus}`,
      entity: 'DriverAvailabilityEvent',
      entityId: event.id,
      newValue: { from: currentStatus, to: targetStatus, source },
    });

    return { status: targetStatus, previousStatus: currentStatus, event };
  }

  // ============================================================
  // GPS BATCH INGESTION from mobile app
  // ============================================================
  async ingestGPSBatch(companyId: string, driverId: string, points: Array<{
    latitude: number; longitude: number; accuracy?: number;
    speed?: number; heading?: number; batteryLevel?: number;
    signalStrength?: string; transmittedAt: string;
    isOfflineBuffered?: boolean;
  }>) {
    const created = await (this.prisma as any).driverLocationPoint.createMany({
      data: points.map(p => ({
        companyId,
        driverId,
        latitude: p.latitude,
        longitude: p.longitude,
        accuracy: p.accuracy,
        speed: p.speed,
        heading: p.heading,
        batteryLevel: p.batteryLevel,
        signalStrength: p.signalStrength,
        isOfflineBuffered: p.isOfflineBuffered || false,
        transmittedAt: new Date(p.transmittedAt),
      })),
    });

    return { pointsIngested: created.count };
  }

  // ============================================================
  // FAVOURITE AREAS
  // ============================================================
  async getFavouriteAreas(companyId: string, driverId: string) {
    return (this.prisma as any).driverAreaPreference.findMany({
      where: { companyId, driverId, isActive: true },
      orderBy: { level: 'asc' },
    });
  }

  async addFavouriteArea(companyId: string, driverId: string, data: {
    areaName: string; latitude: number; longitude: number;
    radiusMeters?: number; level?: string;
  }) {
    return (this.prisma as any).driverAreaPreference.create({
      data: {
        companyId,
        driverId,
        areaName: data.areaName,
        latitude: data.latitude,
        longitude: data.longitude,
        radiusMeters: data.radiusMeters || 5000,
        level: data.level || 'PREFERRED',
        isActive: true,
      },
    });
  }

  async removeFavouriteArea(companyId: string, driverId: string, areaId: string) {
    return (this.prisma as any).driverAreaPreference.update({
      where: { id: areaId },
      data: { isActive: false },
    });
  }

  // ============================================================
  // DEVICE REGISTRATION
  // ============================================================
  async registerDevice(companyId: string, driverId: string, data: {
    deviceType: string; deviceToken: string;
    deviceModel?: string; osVersion?: string; appVersion?: string;
  }) {
    return (this.prisma as any).driverDevice.upsert({
      where: { companyId_driverId_deviceToken: { companyId, driverId, deviceToken: data.deviceToken } },
      update: { lastSeenAt: new Date(), osVersion: data.osVersion, appVersion: data.appVersion },
      create: {
        companyId, driverId,
        deviceType: data.deviceType,
        deviceToken: data.deviceToken,
        deviceModel: data.deviceModel,
        osVersion: data.osVersion,
        appVersion: data.appVersion,
        isActive: true,
      },
    });
  }

  // ============================================================
  // SHIFT ASSIGNMENT
  // ============================================================
  async assignShift(companyId: string, driverId: string, data: {
    shiftId: string; date: string; startTime: string; endTime: string;
    isFreelance?: boolean;
  }) {
    return (this.prisma as any).driverShiftAssignment.upsert({
      where: { companyId_driverId_date: { companyId, driverId, date: new Date(data.date) } },
      update: { shiftId: data.shiftId, startTime: data.startTime, endTime: data.endTime },
      create: {
        companyId, driverId, shiftId: data.shiftId,
        date: new Date(data.date),
        startTime: data.startTime, endTime: data.endTime,
        isFreelance: data.isFreelance || false,
        status: 'ASSIGNED',
      },
    });
  }

  async checkIn(companyId: string, driverId: string) {
    const today = new Date();
    const assignment = await (this.prisma as any).driverShiftAssignment.findFirst({
      where: { companyId, driverId, date: today },
    });
    if (!assignment) throw new NotFoundException('No shift assignment for today');
    return (this.prisma as any).driverShiftAssignment.update({
      where: { id: assignment.id },
      data: { status: 'CHECKED_IN', checkedInAt: new Date() },
    });
  }

  async checkOut(companyId: string, driverId: string) {
    const today = new Date();
    const assignment = await (this.prisma as any).driverShiftAssignment.findFirst({
      where: { companyId, driverId, date: today },
    });
    if (!assignment) throw new NotFoundException('No shift assignment for today');
    return (this.prisma as any).driverShiftAssignment.update({
      where: { id: assignment.id },
      data: { status: 'CHECKED_OUT', checkedOutAt: new Date() },
    });
  }
}

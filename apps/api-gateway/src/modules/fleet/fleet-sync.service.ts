import { Injectable, Logger, BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class FleetSyncService {
  private readonly logger = new Logger(FleetSyncService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async syncFromSource(companyId: string, source: string, data: Record<string, any>[], performedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    if (!['CSV', 'API', 'MANUAL'].includes(source)) {
      throw new BadRequestException('Invalid sync source');
    }

    const syncLog = await (this.prisma as any).fleetSyncLog.create({
      data: {
        companyId,
        source,
        status: 'RUNNING',
        totalRecords: data.length,
        triggeredBy: performedBy,
        startedAt: new Date(),
      },
    });

    let synced = 0;
    let created = 0;
    let updated = 0;
    let failed = 0;
    const errors: any[] = [];

    for (const item of data) {
      try {
        const existing = await this.prisma.vehicle.findFirst({
          where: { companyId, registrationNo: item.registrationNo },
        });

        if (existing) {
          await this.prisma.vehicle.update({
            where: { id: existing.id },
            data: {
              vehicleType: item.vehicleType || existing.vehicleType,
              capacity: item.capacity || existing.capacity,
              make: item.make || existing.make,
              model: item.model || existing.model,
            },
          });
          updated++;
        } else {
          await this.prisma.vehicle.create({
            data: {
              companyId,
              registrationNo: item.registrationNo,
              vehicleType: item.vehicleType || 'SEDAN',
              capacity: item.capacity || 4,
              acType: item.acType || 'NON_AC',
              fuelType: item.fuelType || 'PETROL',
              ownershipType: item.ownershipType || 'COMPANY_OWNED',
              status: 'PENDING_VERIFICATION',
            },
          });
          created++;
        }
        synced++;
      } catch (error: any) {
        failed++;
        errors.push({ registrationNo: item.registrationNo, error: error.message });
      }
    }

    await (this.prisma as any).fleetSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'COMPLETED',
        synced,
        created,
        updated,
        failed,
        errors,
        completedAt: new Date(),
      },
    });

    await this.audit.log({
      companyId, userId: performedBy, action: 'FLEET_SYNC_COMPLETED',
      entity: 'FleetSyncLog', entityId: syncLog.id,
      newValue: { source, total: data.length, created, updated, failed },
    });

    return {
      syncId: syncLog.id,
      status: 'COMPLETED',
      total: data.length,
      created,
      updated,
      failed,
      errors,
    };
  }

  async getSyncStatus(companyId: string, syncId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const syncLog = await (this.prisma as any).fleetSyncLog.findFirst({
      where: { id: syncId, companyId },
    });
    if (!syncLog) throw new NotFoundException('Sync log not found');

    return syncLog;
  }

  async runFullSync(companyId: string, performedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const vehicles = await this.prisma.vehicle.findMany({
      where: { companyId },
      select: {
        id: true,
        registrationNo: true,
        vehicleType: true,
        status: true,
      },
    });

    const syncLog = await (this.prisma as any).fleetSyncLog.create({
      data: {
        companyId,
        source: 'FULL_SYNC',
        status: 'RUNNING',
        totalRecords: vehicles.length,
        triggeredBy: performedBy,
        startedAt: new Date(),
      },
    });

    let validated = 0;
    let issues: any[] = [];

    for (const vehicle of vehicles) {
      if (!vehicle.registrationNo) {
        issues.push({ vehicleId: vehicle.id, issue: 'MISSING_REGISTRATION' });
      }
      if (!vehicle.vehicleType) {
        issues.push({ vehicleId: vehicle.id, issue: 'MISSING_VEHICLE_TYPE' });
      }
      validated++;
    }

    await (this.prisma as any).fleetSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'COMPLETED',
        validated,
        issues,
        completedAt: new Date(),
      },
    });

    await this.audit.log({
      companyId, userId: performedBy, action: 'FLEET_FULL_SYNC_COMPLETED',
      entity: 'FleetSyncLog', entityId: syncLog.id,
      newValue: { vehicleCount: vehicles.length, issueCount: issues.length },
    });

    return {
      syncId: syncLog.id,
      status: 'COMPLETED',
      vehicleCount: vehicles.length,
      validated,
      issueCount: issues.length,
      issues,
    };
  }

  async getSyncHistory(companyId: string, params: { page?: number; limit?: number }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      (this.prisma as any).fleetSyncLog.findMany({
        where: { companyId },
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).fleetSyncLog.count({ where: { companyId } }),
    ]);

    return {
      data: logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}

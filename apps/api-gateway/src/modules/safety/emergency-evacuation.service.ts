import { Injectable, Logger, BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

export enum EvacuationStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Injectable()
export class EmergencyEvacuationService {
  private readonly logger = new Logger(EmergencyEvacuationService.name);
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async createEvacuation(companyId: string, data: {
    title: string;
    description?: string;
    scope: string;
    zoneName?: string;
    officeIds?: string[];
    effectiveFrom: string;
    effectiveTo?: string;
  }, createdBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const evacuation = await this.prisma.emergencyEvacuation.create({
      data: {
        companyId,
        title: data.title,
        description: data.description,
        scope: data.scope.toUpperCase(),
        zoneName: data.zoneName,
        officeIds: data.officeIds || [],
        effectiveFrom: new Date(data.effectiveFrom),
        effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : undefined,
        status: 'ACTIVE',
        issuedBy: createdBy,
      },
    });

    await this.audit.log({ companyId, userId: createdBy, action: 'EVACUATION_CREATED', entity: 'EmergencyEvacuation', entityId: evacuation.id, newValue: { title: data.title, scope: data.scope } });
    return evacuation;
  }

  async updateStatus(companyId: string, evacuationId: string, status: EvacuationStatus, updatedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const evacuation = await this.prisma.emergencyEvacuation.findFirst({ where: { id: evacuationId, companyId } });
    if (!evacuation) throw new NotFoundException('Evacuation not found');

    const updateData: any = { status };

    if (status === 'COMPLETED') {
      updateData.effectiveTo = new Date();
    }

    const updated = await this.prisma.emergencyEvacuation.update({ where: { id: evacuationId }, data: updateData });
    await this.audit.log({ companyId, userId: updatedBy, action: `EVACUATION_${status}`, entity: 'EmergencyEvacuation', entityId: evacuationId });
    return updated;
  }

  async recordEvacuationProgress(companyId: string, evacuationId: string, data: {
    affectedTrips?: number;
    evacuatedCount?: number;
    safeCount?: number;
  }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const evacuation = await this.prisma.emergencyEvacuation.findFirst({ where: { id: evacuationId, companyId } });
    if (!evacuation) throw new NotFoundException('Evacuation not found');

    const updated = await this.prisma.emergencyEvacuation.update({
      where: { id: evacuationId },
      data: {
        ...(data.affectedTrips !== undefined && { affectedTrips: data.affectedTrips }),
        ...(data.evacuatedCount !== undefined && { evacuatedCount: data.evacuatedCount }),
        ...(data.safeCount !== undefined && { safeCount: data.safeCount }),
      },
    });

    return updated;
  }

  async getEvacuationStatus(companyId: string, evacuationId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const evacuation = await this.prisma.emergencyEvacuation.findFirst({ where: { id: evacuationId, companyId } });
    if (!evacuation) throw new NotFoundException('Evacuation not found');

    return {
      ...evacuation,
      remainingToEvacuate: evacuation.affectedTrips - evacuation.evacuatedCount,
    };
  }

  async triggerEvacuation(companyId: string, evacuationId: string, triggeredBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const evacuation = await this.updateStatus(companyId, evacuationId, EvacuationStatus.ACTIVE, triggeredBy);
    await this.audit.log({ companyId, userId: triggeredBy, action: 'EVACUATION_TRIGGERED', entity: 'EmergencyEvacuation', entityId: evacuationId });
    return evacuation;
  }

  async getEvacuations(companyId: string, params?: { status?: string; page?: number; limit?: number }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const page = params?.page || 1;
    const limit = Math.min(params?.limit || 20, 100);
    const skip = (page - 1) * limit;
    const where: any = { companyId };
    if (params?.status) where.status = params.status.toUpperCase();

    const [evacuations, total] = await Promise.all([
      this.prisma.emergencyEvacuation.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.emergencyEvacuation.count({ where }),
    ]);

    return { data: evacuations, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
}

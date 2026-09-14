import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export interface AuditEntry {
  companyId: string;
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
  ipAddress?: string;
  actorRole?: string;
  actorDomain?: string;
  siteId?: string;
  processId?: string;
  riskLevel?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    if (!this.prisma.isConnected()) return;

    try {
      await this.prisma.auditLog.create({
        data: {
          companyId: entry.companyId,
          userId: entry.userId,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId,
          oldValue: entry.oldValue || undefined,
          newValue: entry.newValue || undefined,
        },
      });

      // Also write to AuditEvent for comprehensive audit trail
      try {
        await this.prisma.auditEvent.create({
          data: {
            eventCode: entry.action,
            action: entry.action,
            actorUserId: entry.userId,
            actorRole: entry.actorRole || 'UNKNOWN',
            actorDomain: entry.actorDomain || 'INTERNAL',
            resourceType: entry.entity,
            resourceId: entry.entityId,
            companyId: entry.companyId,
            siteId: entry.siteId,
            processId: entry.processId,
            ipAddress: entry.ipAddress,
            riskLevel: entry.riskLevel || 'LOW',
            oldValue: entry.oldValue || undefined,
            newValue: entry.newValue || undefined,
          },
        });
      } catch (eventErr: any) {
        this.logger.warn(`Failed to write audit event: ${eventErr.message}`);
      }
    } catch (err: any) {
      this.logger.error(`Failed to write audit log: ${err.message}`);
    }
  }

  async logBatch(entries: AuditEntry[]): Promise<void> {
    if (!this.prisma.isConnected() || entries.length === 0) return;

    try {
      await this.prisma.auditLog.createMany({
        data: entries.map((e) => ({
          companyId: e.companyId,
          userId: e.userId,
          action: e.action,
          entity: e.entity,
          entityId: e.entityId,
          oldValue: e.oldValue || undefined,
          newValue: e.newValue || undefined,
        })),
        skipDuplicates: true,
      });

      // Also write batch to AuditEvent
      try {
        await this.prisma.auditEvent.createMany({
          data: entries.map((e) => ({
            eventCode: e.action,
            action: e.action,
            actorUserId: e.userId,
            actorRole: e.actorRole || 'UNKNOWN',
            actorDomain: e.actorDomain || 'INTERNAL',
            resourceType: e.entity,
            resourceId: e.entityId,
            companyId: e.companyId,
            siteId: e.siteId,
            processId: e.processId,
            ipAddress: e.ipAddress,
            riskLevel: e.riskLevel || 'LOW',
            oldValue: e.oldValue || undefined,
            newValue: e.newValue || undefined,
          })),
          skipDuplicates: true,
        });
      } catch (eventErr: any) {
        this.logger.warn(`Failed to write batch audit events: ${eventErr.message}`);
      }
    } catch (err: any) {
      this.logger.error(`Failed to write batch audit logs: ${err.message}`);
    }
  }

  async query(params: {
    companyId?: string;
    userId?: string;
    action?: string;
    entity?: string;
    entityId?: string;
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
  }) {
    if (!this.prisma.isConnected()) return { data: [], total: 0 };

    const page = params.page || 1;
    const limit = Math.min(params.limit || 50, 200);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.entity) where.entity = params.entity;
    if (params.entityId) where.entityId = params.entityId;
    if (params.action) where.action = params.action;
    if (params.userId) where.userId = params.userId;
    if (params.companyId) where.companyId = params.companyId;
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = params.from;
      if (params.to) where.createdAt.lte = params.to;
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async queryEvents(params: {
    companyId?: string;
    actorUserId?: string;
    eventCode?: string;
    resourceType?: string;
    riskLevel?: string;
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
  }) {
    if (!this.prisma.isConnected()) return { data: [], total: 0 };

    const page = params.page || 1;
    const limit = Math.min(params.limit || 50, 200);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.companyId) where.companyId = params.companyId;
    if (params.actorUserId) where.actorUserId = params.actorUserId;
    if (params.eventCode) where.eventCode = params.eventCode;
    if (params.resourceType) where.resourceType = params.resourceType;
    if (params.riskLevel) where.riskLevel = params.riskLevel;
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = params.from;
      if (params.to) where.createdAt.lte = params.to;
    }

    const [data, total] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditEvent.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}

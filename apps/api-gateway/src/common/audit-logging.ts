import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { piiMasking } from './pii-masking';

export interface AuditLogEntry {
  companyId: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

@Injectable()
export class AuditLoggingService {
  private readonly logger = new Logger(AuditLoggingService.name);

  constructor(private prisma: PrismaService) {}

  async log(entry: AuditLogEntry) {
    const sanitized = this.sanitize(entry);

    this.logger.log('Audit', {
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      userId: entry.userId,
      companyId: entry.companyId,
    });

    try {
      await (this.prisma as any).auditLog?.create({
        data: {
          companyId: entry.companyId,
          userId: entry.userId,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId,
          oldValues: sanitized.oldValues,
          newValues: sanitized.newValues,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          requestId: entry.requestId,
        },
      });
    } catch (error: any) {
      this.logger.error(`Failed to write audit log: ${error.message}`);
    }
  }

  async logDataAccess(companyId: string, userId: string, entity: string, entityId: string, action: string) {
    await this.log({ companyId, userId, action, entity, entityId });
  }

  async logDataModification(companyId: string, userId: string, entity: string, entityId: string, oldValues: Record<string, any>, newValues: Record<string, any>) {
    await this.log({ companyId, userId, action: 'UPDATE', entity, entityId, oldValues, newValues });
  }

  async logAuthEvent(companyId: string, userId: string, action: string, ipAddress?: string) {
    await this.log({ companyId, userId, action, entity: 'Auth', ipAddress });
  }

  async logExport(companyId: string, userId: string, entity: string, format: string) {
    await this.log({ companyId, userId, action: `EXPORT_${format.toUpperCase()}`, entity });
  }

  async getAuditTrail(companyId: string, filters: {
    entity?: string;
    entityId?: string;
    userId?: string;
    action?: string;
    from?: Date;
    to?: Date;
    limit?: number;
  }) {
    const where: any = { companyId };
    if (filters.entity) where.entity = filters.entity;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = { contains: filters.action };
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = filters.from;
      if (filters.to) where.createdAt.lte = filters.to;
    }

    return (this.prisma as any).auditLog?.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 100,
    }) || [];
  }

  private sanitize(entry: AuditLogEntry): AuditLogEntry {
    const sanitized = { ...entry };

    if (sanitized.oldValues) {
      sanitized.oldValues = this.maskSensitiveData(sanitized.oldValues);
    }
    if (sanitized.newValues) {
      sanitized.newValues = this.maskSensitiveData(sanitized.newValues);
    }

    return sanitized;
  }

  private maskSensitiveData(data: Record<string, any>): Record<string, any> {
    const sensitiveFields = ['email', 'phone', 'aadhaar', 'pan', 'password', 'token', 'secret'];
    const masked = { ...data };

    for (const key of Object.keys(masked)) {
      const lowerKey = key.toLowerCase();
      if (typeof masked[key] === 'string') {
        if (lowerKey.includes('email')) masked[key] = piiMasking.maskEmail(masked[key]);
        else if (lowerKey.includes('phone')) masked[key] = piiMasking.maskPhone(masked[key]);
        else if (lowerKey.includes('aadhaar')) masked[key] = piiMasking.maskAadhaar(masked[key]);
        else if (lowerKey.includes('pan') && masked[key].length === 10) masked[key] = piiMasking.maskPAN(masked[key]);
        else if (sensitiveFields.some(f => lowerKey.includes(f))) masked[key] = '***';
      }
    }

    return masked;
  }
}

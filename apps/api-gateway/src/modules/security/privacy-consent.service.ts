import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class ConsentService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async recordConsent(companyId: string, userId: string, data: {
    consentType: string;
    granted: boolean;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const consent = await (this.prisma as any).userConsent.create({
      data: { companyId, userId, ...data },
    });

    await this.audit.log({
      companyId, userId, action: data.granted ? 'CONSENT_GRANTED' : 'CONSENT_REVOKED',
      entity: 'UserConsent', newValue: { type: data.consentType },
    });

    return { consentId: consent.id, type: data.consentType, granted: data.granted };
  }

  async getConsentStatus(companyId: string, userId: string) {
    const consents = await (this.prisma as any).userConsent.findMany({
      where: { companyId, userId },
      orderBy: { createdAt: 'desc' },
    });

    const latestByType = new Map<string, any>();
    for (const c of consents) {
      if (!latestByType.has(c.consentType)) latestByType.set(c.consentType, c);
    }

    return Array.from(latestByType.values()).map(c => ({
      type: c.consentType,
      granted: c.granted,
      recordedAt: c.createdAt,
    }));
  }

  async revokeAllConsents(companyId: string, userId: string) {
    const types = ['GPS_TRACKING', 'DATA_SHARING', 'MARKETING', 'ANALYTICS'];
    for (const type of types) {
      await this.recordConsent(companyId, userId, { consentType: type, granted: false });
    }
    return { revoked: types.length };
  }
}

@Injectable()
export class DataRetentionService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async getRetentionPolicies(companyId: string) {
    return [
      { entityType: 'LocationPing', retentionDays: 90, action: 'DELETE' },
      { entityType: 'Session', retentionDays: 30, action: 'DELETE' },
      { entityType: 'AuditLog', retentionDays: 365, action: 'ARCHIVE' },
      { entityType: 'Notification', retentionDays: 60, action: 'DELETE' },
      { entityType: 'Trip', retentionDays: 730, action: 'ARCHIVE' },
    ];
  }

  async enforceRetentionPolicy(companyId: string, entityType: string, retentionDays: number) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    let affected = 0;
    switch (entityType) {
      case 'LocationPing':
        const result = await this.prisma.locationPing.deleteMany({
          where: { createdAt: { lt: cutoffDate } } as any,
        });
        affected = result.count;
        break;
      case 'Session':
        const sessResult = await this.prisma.session.deleteMany({
          where: { expiresAt: { lt: cutoffDate } },
        });
        affected = sessResult.count;
        break;
      case 'Notification':
        const notifResult = await this.prisma.notification.deleteMany({
          where: { createdAt: { lt: cutoffDate } } as any,
        });
        affected = notifResult.count;
        break;
    }

    await this.audit.log({
      companyId, userId: 'system', action: 'RETENTION_ENFORCED', entity: entityType,
      newValue: { retentionDays, affected, cutoffDate },
    });

    return { entityType, retentionDays, affected, cutoffDate };
  }

  async getDataAccessRequest(companyId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return {
      userId,
      name: user?.name,
      email: user?.email,
      dataCategories: ['profile', 'trips', 'location', 'expenses', 'notifications'],
      requestedAt: new Date(),
    };
  }

  async deleteUserData(companyId: string, userId: string) {
    await this.prisma.notification.deleteMany({ where: { userId } });
    await this.prisma.locationPing.deleteMany({ where: { userId } });
    await this.prisma.session.deleteMany({ where: { userId } });
    await this.prisma.user.update({
      where: { id: userId },
      data: { name: 'Deleted User', email: `deleted-${userId}@removed.com`, phone: null, avatar: null, status: 'INACTIVE' },
    });
    await this.audit.log({
      companyId, userId: 'system', action: 'USER_DATA_DELETED', entity: 'User', entityId: userId,
    });
    return { deleted: true, userId };
  }
}

@Injectable()
export class BreakGlassService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async breakGlassAccess(companyId: string, userId: string, data: { reason: string; targetUserId?: string }) {
    await this.audit.log({
      companyId, userId, action: 'BREAK_GLASS_ACCESS', entity: 'Security',
      newValue: { reason: data.reason, targetUserId: data.targetUserId },
    });
    return {
      granted: true,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      reason: data.reason,
      auditLogged: true,
    };
  }

  async getBreakGlassLog(companyId: string) {
    return this.audit.query({ companyId, action: 'BREAK_GLASS_ACCESS' });
  }
}

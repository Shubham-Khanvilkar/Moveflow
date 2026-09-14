import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class GuardComplianceService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async checkGuardCompliance(companyId: string, guardId: string) {
    const driver = await this.prisma.driverProfile.findFirst({
      where: { userId: guardId, companyId },
      include: { user: true } as any,
    });
    if (!driver) throw new NotFoundException('Guard not found');

    const complianceDocs = await this.prisma.complianceDocument.findMany({
      where: { companyId, entity: 'GUARD' as any, entityId: guardId } as any,
    });

    const now = new Date();
    const expired = complianceDocs.filter(d => d.expiryDate && d.expiryDate < now);
    const expiringIn30Days = complianceDocs.filter(d => {
      if (!d.expiryDate) return false;
      const diff = d.expiryDate.getTime() - now.getTime();
      return diff > 0 && diff <= 30 * 24 * 60 * 60 * 1000;
    });

    const isCompliant = expired.length === 0;

    return {
      guardId,
      isCompliant,
      totalDocs: complianceDocs.length,
      expiredCount: expired.length,
      expiringCount: expiringIn30Days.length,
      expiredDocs: expired.map(d => ({ id: d.id, type: (d as any).docType, expiry: d.expiryDate })),
      expiringDocs: expiringIn30Days.map(d => ({ id: d.id, type: (d as any).docType, expiry: d.expiryDate })),
    };
  }

  async blockGuardIfNonCompliant(companyId: string, guardId: string) {
    const compliance = await this.checkGuardCompliance(companyId, guardId);
    if (!compliance.isCompliant) {
      await this.prisma.driverProfile.update({
        where: { id: guardId },
        data: { isActive: false, deactivationReason: 'Non-compliant documents' } as any,
      });
      await this.audit.log({
        companyId, userId: 'system', action: 'GUARD_BLOCKED', entity: 'DriverProfile', entityId: guardId,
        newValue: { reason: 'Non-compliant documents', expiredDocs: compliance.expiredCount },
      });
      return { blocked: true, reason: 'Non-compliant documents', expiredDocs: compliance.expiredCount };
    }
    return { blocked: false };
  }

  async getComplianceAlerts(companyId: string) {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const docs = await this.prisma.complianceDocument.findMany({
      where: {
        companyId, entity: 'GUARD' as any,
        expiryDate: { gte: now, lte: in30Days },
      } as any,
    });

    return docs.map(d => ({
      docId: d.id,
      entityId: d.entityId,
      docType: (d as any).docType,
      expiryDate: d.expiryDate,
      daysUntilExpiry: Math.ceil((d.expiryDate!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
    }));
  }
}

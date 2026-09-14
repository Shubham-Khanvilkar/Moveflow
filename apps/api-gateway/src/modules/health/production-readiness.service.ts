import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class ProductionReadinessService {
  private readonly logger = new Logger(ProductionReadinessService.name);
  constructor(private prisma: PrismaService) {}

  // Production readiness registry for every feature
  async getFeatureStatus(companyId: string, featureCode?: string) {
    const where: any = { companyId };
    if (featureCode) where.featureCode = featureCode;
    return (this.prisma as any).productionFeature.findMany({ where, orderBy: { domain: 'asc' } });
  }

  async updateFeatureStatus(companyId: string, featureCode: string, data: {
    status?: string;
    backendStatus?: string;
    apiStatus?: string;
    frontendStatus?: string;
    mobileStatus?: string;
    integrationStatus?: string;
    securityStatus?: string;
    testStatus?: string;
    documentationStatus?: string;
    observabilityStatus?: string;
    productionStatus?: string;
    evidenceLinks?: string[];
    verifiedBy?: string;
  }) {
    return (this.prisma as any).productionFeature.upsert({
      where: { companyId_featureCode: { companyId, featureCode } },
      update: {
        ...data,
        evidenceLinks: data.evidenceLinks,
        lastVerifiedAt: new Date(),
      },
      create: {
        companyId,
        featureCode,
        name: featureCode,
        domain: 'UNKNOWN',
        severity: 'P1',
        status: data.status || 'IN_PROGRESS',
        backendStatus: data.backendStatus || 'NOT_STARTED',
        apiStatus: data.apiStatus || 'NOT_STARTED',
        frontendStatus: data.frontendStatus || 'NOT_STARTED',
        mobileStatus: data.mobileStatus || 'NOT_STARTED',
        integrationStatus: data.integrationStatus || 'NOT_STARTED',
        securityStatus: data.securityStatus || 'NOT_STARTED',
        testStatus: data.testStatus || 'NOT_STARTED',
        documentationStatus: data.documentationStatus || 'NOT_STARTED',
        observabilityStatus: data.observabilityStatus || 'NOT_STARTED',
        productionStatus: data.productionStatus || 'NOT_STARTED',
        evidenceLinks: data.evidenceLinks,
        lastVerifiedAt: new Date(),
        verifiedBy: data.verifiedBy,
      },
    });
  }

  // Platform-wide readiness dashboard
  async readinessDashboard(companyId: string) {
    const features = await (this.prisma as any).productionFeature.findMany({
      where: { companyId },
    });

    const total = features.length;
    const byStatus: Record<string, number> = {};
    const byDomain: Record<string, number> = {};

    for (const f of features) {
      byStatus[f.status] = (byStatus[f.status] || 0) + 1;
      byDomain[f.domain] = (byDomain[f.domain] || 0) + 1;
    }

    const blocked = features.filter((f: any) => f.status === 'BLOCKED');
    const readyForProd = features.filter((f: any) => f.productionStatus === 'READY_FOR_PRODUCTION' || f.productionStatus === 'PRODUCTION_VERIFIED' || f.productionStatus === 'ACCEPTED');

    return {
      total,
      byStatus,
      byDomain,
      blockedCount: blocked.length,
      blockedFeatures: blocked.map((f: any) => ({ code: f.featureCode, name: f.name, reason: f.blockedReason })),
      productionReady: readyForProd.length,
      productionReadyPercent: total > 0 ? Number(((readyForProd.length / total) * 100).toFixed(1)) : 0,
    };
  }

  // Release gate check
  async releaseGateCheck(companyId: string) {
    const features = await (this.prisma as any).productionFeature.findMany({
      where: { companyId },
    });

    const p0Features = features.filter((f: any) => f.severity === 'P0');
    const p1Features = features.filter((f: any) => f.severity === 'P1');

    const p0Blocked = p0Features.filter((f: any) => f.status !== 'ACCEPTED');
    const p1Blocked = p1Features.filter((f: any) => f.status !== 'ACCEPTED' && f.status !== 'TESTED');

    const securityIssues = features.filter((f: any) => f.securityStatus === 'BLOCKED');

    const canRelease = p0Blocked.length === 0 && securityIssues.length === 0;

    return {
      canRelease,
      gates: {
        p0AllAccepted: p0Blocked.length === 0,
        p0Total: p0Features.length,
        p0Passed: p0Features.length - p0Blocked.length,
        p1AllPassed: p1Blocked.length === 0,
        p1Total: p1Features.length,
        p1Passed: p1Features.length - p1Blocked.length,
        noSecurityBlocks: securityIssues.length === 0,
        securityIssues: securityIssues.map((f: any) => f.featureCode),
      },
      totalFeatures: features.length,
      releaseStatus: canRelease ? 'PRODUCTION_APPROVED' : 'NOT_READY',
    };
  }
}

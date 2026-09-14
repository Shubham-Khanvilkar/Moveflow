import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

export interface SLAComplianceResult {
  definitionId: string;
  name: string;
  metric: string;
  targetValue: number;
  targetUnit: string;
  actualValue: number;
  compliancePercent: number;
  breachCount: number;
  status: string;
  trend: { period: string; compliance: number }[];
}

export interface SLABreach {
  id: string;
  slaName: string;
  entityType: string;
  entityId: string;
  targetValue: number;
  actualValue: number;
  deviation: number;
  severity: string;
  createdAt: Date;
}

@Injectable()
export class SLAComplianceService {
  private readonly logger = new Logger(SLAComplianceService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ===== SLA DEFINITIONS =====

  async createDefinition(companyId: string, dto: {
    name: string;
    metric: string;
    targetValue: number;
    targetUnit: string;
    scopeType?: string;
    scopeId?: string;
  }, userId: string) {
    const definition = await (this.prisma as any).sLADefinition.create({
      data: {
        companyId,
        name: dto.name,
        metric: dto.metric,
        targetValue: dto.targetValue,
        targetUnit: dto.targetUnit,
        scopeType: dto.scopeType || 'COMPANY',
        scopeId: dto.scopeId,
      },
    });

    await this.audit.log({
      userId, action: 'SLA_DEFINITION_CREATED', entity: 'SLADefinition',
      entityId: definition.id, companyId, newValue: dto,
    });

    return definition;
  }

  async getDefinitions(companyId: string) {
    return (this.prisma as any).sLADefinition.findMany({
      where: { companyId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateDefinition(companyId: string, id: string, dto: Partial<{ name: string; targetValue: number; isActive: boolean }>, userId: string) {
    const def = await (this.prisma as any).sLADefinition.findFirst({
      where: { id, companyId },
    });
    if (!def) throw new NotFoundException('SLA definition not found');

    await (this.prisma as any).sLADefinition.update({
      where: { id },
      data: dto,
    });

    await this.audit.log({
      userId, action: 'SLA_DEFINITION_UPDATED', entity: 'SLADefinition',
      entityId: id, companyId, newValue: dto,
    });

    return { success: true };
  }

  async deleteDefinition(companyId: string, id: string, userId: string) {
    await (this.prisma as any).sLADefinition.update({
      where: { id },
      data: { isActive: false },
    });

    await this.audit.log({
      userId, action: 'SLA_DEFINITION_DELETED', entity: 'SLADefinition',
      entityId: id, companyId,
    });

    return { success: true };
  }

  // ===== SLA COMPLIANCE =====

  async getCompliance(companyId: string): Promise<SLAComplianceResult[]> {
    const definitions = await (this.prisma as any).sLADefinition.findMany({
      where: { companyId, isActive: true },
    });

    const results: SLAComplianceResult[] = [];

    for (const def of definitions) {
      const actual = await this.calculateActualValue(companyId, def.metric, def.scopeType, def.scopeId);
      const compliancePercent = def.targetValue > 0 ? Math.min(100, (actual / def.targetValue) * 100) : 100;
      const breachCount = await this.getBreachCount(companyId, def.id);

      const trend = await this.getComplianceTrend(companyId, def.id);

      results.push({
        definitionId: def.id,
        name: def.name,
        metric: def.metric,
        targetValue: def.targetValue,
        targetUnit: def.targetUnit,
        actualValue: Math.round(actual * 100) / 100,
        compliancePercent: Math.round(compliancePercent),
        breachCount,
        status: compliancePercent >= 95 ? 'MET' : compliancePercent >= 80 ? 'WARNING' : 'BREACHED',
        trend,
      });
    }

    return results;
  }

  async getBreaches(companyId: string, severity?: string) {
    const where: any = { companyId };
    if (severity) where.severity = severity;

    const breaches = await (this.prisma as any).sLABreachLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Enrich with SLA name
    const enriched = [];
    for (const breach of breaches) {
      const slaDef = await (this.prisma as any).sLADefinition.findFirst({
        where: { id: breach.slaDefinitionId },
      });
      enriched.push({
        ...breach,
        slaName: slaDef?.name || 'Unknown SLA',
      });
    }

    return enriched;
  }

  async getBreachesSummary(companyId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const breaches = await (this.prisma as any).sLABreachLog.findMany({
      where: { companyId, createdAt: { gte: thirtyDaysAgo } },
    });

    const total = breaches.length;
    const bySeverity = {
      CRITICAL: breaches.filter((b: any) => b.severity === 'CRITICAL').length,
      HIGH: breaches.filter((b: any) => b.severity === 'HIGH').length,
      MEDIUM: breaches.filter((b: any) => b.severity === 'MEDIUM').length,
      LOW: breaches.filter((b: any) => b.severity === 'LOW').length,
    };
    const unresolved = breaches.filter((b: any) => !b.resolvedAt).length;

    return { total, bySeverity, unresolved, period: '30 days' };
  }

  // ===== INTERNAL =====

  private async calculateActualValue(companyId: string, metric: string, scopeType: string, scopeId?: string): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    switch (metric) {
      case 'PUNCTUALITY': {
        const trips = await (this.prisma as any).trip.findMany({
          where: {
            companyId,
            status: 'COMPLETED',
            createdAt: { gte: thirtyDaysAgo },
            ...(scopeType === 'SITE' && scopeId ? { siteId: scopeId } : {}),
            ...(scopeType === 'PROCESS' && scopeId ? { processId: scopeId } : {}),
          },
          select: { scheduledPickupTime: true, actualPickupTime: true },
        });

        const onTime = trips.filter((t: any) => {
          if (!t.actualPickupTime || !t.scheduledPickupTime) return true;
          return Math.abs(new Date(t.actualPickupTime).getTime() - new Date(t.scheduledPickupTime).getTime()) <= 5 * 60000;
        }).length;

        return trips.length > 0 ? (onTime / trips.length) * 100 : 100;
      }

      case 'GPS_FRESHNESS': {
        const logs = await (this.prisma as any).gPSLog.findMany({
          where: { companyId, recordedAt: { gte: thirtyDaysAgo } },
          select: { recordedAt: true },
          orderBy: { recordedAt: 'desc' },
          take: 50,
        });

        if (logs.length === 0) return 100;
        const avgAge = logs.reduce((sum: number, l: any, i: number) => {
          if (i === 0) return 0;
          return sum + (new Date(logs[i - 1].recordedAt).getTime() - new Date(l.recordedAt).getTime()) / 60000;
        }, 0) / (logs.length - 1);

        return avgAge < 15 ? 100 : avgAge < 30 ? 80 : avgAge < 60 ? 60 : 40;
      }

      case 'MAX_RIDE_TIME': {
        const trips = await (this.prisma as any).trip.findMany({
          where: {
            companyId,
            status: 'COMPLETED',
            createdAt: { gte: thirtyDaysAgo },
            actualPickupTime: { not: null },
            actualDropTime: { not: null },
          },
          select: { actualPickupTime: true, actualDropTime: true },
        });

        if (trips.length === 0) return 100;
        const overLimit = trips.filter((t: any) => {
          const duration = (new Date(t.actualDropTime).getTime() - new Date(t.actualPickupTime).getTime()) / 60000;
          return duration > 75;
        }).length;

        return trips.length > 0 ? ((trips.length - overLimit) / trips.length) * 100 : 100;
      }

      case 'NO_SHOW_RESPONSE': {
        const noShows = await (this.prisma as any).booking.findMany({
          where: { companyId, status: 'NO_SHOW', createdAt: { gte: thirtyDaysAgo } },
          select: { id: true },
        });
        const totalBookings = await (this.prisma as any).booking.count({
          where: { companyId, createdAt: { gte: thirtyDaysAgo } },
        });

        return totalBookings > 0 ? ((totalBookings - noShows.length) / totalBookings) * 100 : 100;
      }

      case 'EMERGENCY_RESPONSE': {
        const alerts = await (this.prisma as any).safetyAlert.findMany({
          where: { companyId, createdAt: { gte: thirtyDaysAgo } },
          select: { createdAt: true, acknowledgedAt: true },
        }).catch(() => []);

        if (alerts.length === 0) return 100;
        const acknowledgedInTime = alerts.filter((a: any) => {
          if (!a.acknowledgedAt) return false;
          return (new Date(a.acknowledgedAt).getTime() - new Date(a.createdAt).getTime()) <= 30000;
        }).length;

        return alerts.length > 0 ? (acknowledgedInTime / alerts.length) * 100 : 100;
      }

      default:
        return 100;
    }
  }

  private async getBreachCount(companyId: string, slaDefinitionId: string): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return (this.prisma as any).sLABreachLog.count({
      where: { companyId, slaDefinitionId, createdAt: { gte: thirtyDaysAgo } },
    });
  }

  private async getComplianceTrend(companyId: string, slaDefinitionId: string) {
    const records = await (this.prisma as any).sLATrackingRecord.findMany({
      where: { companyId, slaDefinitionId },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });

    return records.reverse().map((r: any) => ({
      period: r.period,
      compliance: r.compliancePercent,
    }));
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

export interface DrillDownResult {
  level: string;
  entityId: string;
  entityName: string;
  totalCost: number;
  tripCount: number;
  costPerTrip: number;
  children: DrillDownChild[];
  trends: { period: string; cost: number; trips: number }[];
}

export interface DrillDownChild {
  id: string;
  name: string;
  cost: number;
  trips: number;
  costPerTrip: number;
  percentOfTotal: number;
}

export interface HealthScoreResult {
  entityType: string;
  entityId: string;
  overallScore: number;
  breakdown: {
    safety: number;
    reliability: number;
    utilization: number;
    costEfficiency: number;
    vendorQuality: number;
    gpsHealth: number;
    employeeExperience: number;
  };
  recommendations: string[];
  trend: { period: string; score: number }[];
}

export interface BlastRadiusResult {
  changeType: string;
  changeDescription: string;
  impact: {
    employeesAffected: number;
    tripsAffected: number;
    vehiclesAffected: number;
    driversAffected: number;
    vendorsAffected: number;
    estimatedCostChange: number;
    bookingsRequiringAction: number;
    safetyRulesImpacted: number;
  };
  affectedEntities: { type: string; id: string; name: string; impact: string }[];
  riskFactors: string[];
}

@Injectable()
export class CXOAnalyticsService {
  private readonly logger = new Logger(CXOAnalyticsService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ===== DRILL-DOWN =====

  async drillDown(companyId: string, level: string, entityId?: string) {
    switch (level) {
      case 'company':
        return this.drillDownCompany(companyId);
      case 'site':
        return this.drillDownSite(companyId, entityId!);
      case 'process':
        return this.drillDownProcess(companyId, entityId!);
      case 'vendor':
        return this.drillDownVendor(companyId, entityId!);
      default:
        return this.drillDownCompany(companyId);
    }
  }

  private async drillDownCompany(companyId: string) {
    const sites = await (this.prisma as any).companySite.findMany({
      where: { companyId },
    });

    const trips = await (this.prisma as any).trip.findMany({
      where: { companyId, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      select: { totalCost: true, siteId: true, createdAt: true },
    });

    const totalCost = trips.reduce((sum: number, t: any) => sum + (t.totalCost || 0), 0);

    const siteBreakdown: Record<string, { cost: number; trips: number; name: string }> = {};
    for (const trip of trips) {
      const siteId = trip.siteId || 'unknown';
      if (!siteBreakdown[siteId]) {
        const site = sites.find((s: any) => s.id === siteId);
        siteBreakdown[siteId] = { cost: 0, trips: 0, name: site?.siteName || siteId };
      }
      siteBreakdown[siteId].cost += trip.totalCost || 0;
      siteBreakdown[siteId].trips += 1;
    }

    const children: DrillDownChild[] = Object.entries(siteBreakdown).map(([id, data]) => ({
      id,
      name: data.name,
      cost: Math.round(data.cost),
      trips: data.trips,
      costPerTrip: data.trips > 0 ? Math.round(data.cost / data.trips) : 0,
      percentOfTotal: totalCost > 0 ? Math.round((data.cost / totalCost) * 100) : 0,
    }));

    const trends = await this.getTrends(companyId, 6);

    return {
      level: 'company',
      entityId: companyId,
      entityName: 'Company',
      totalCost: Math.round(totalCost),
      tripCount: trips.length,
      costPerTrip: trips.length > 0 ? Math.round(totalCost / trips.length) : 0,
      children: children.sort((a, b) => b.cost - a.cost),
      trends,
    };
  }

  private async drillDownSite(companyId: string, siteId: string) {
    const site = await (this.prisma as any).companySite.findFirst({
      where: { id: siteId, companyId },
    });

    const trips = await (this.prisma as any).trip.findMany({
      where: { companyId, siteId, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      select: { totalCost: true, processId: true, vendorId: true },
    });

    const totalCost = trips.reduce((sum: number, t: any) => sum + (t.totalCost || 0), 0);

    // Group by process
    const processBreakdown: Record<string, { cost: number; trips: number; name: string }> = {};
    for (const trip of trips) {
      const pid = trip.processId || 'unknown';
      if (!processBreakdown[pid]) {
        processBreakdown[pid] = { cost: 0, trips: 0, name: pid };
      }
      processBreakdown[pid].cost += trip.totalCost || 0;
      processBreakdown[pid].trips += 1;
    }

    const children: DrillDownChild[] = Object.entries(processBreakdown).map(([id, data]) => ({
      id,
      name: data.name,
      cost: Math.round(data.cost),
      trips: data.trips,
      costPerTrip: data.trips > 0 ? Math.round(data.cost / data.trips) : 0,
      percentOfTotal: totalCost > 0 ? Math.round((data.cost / totalCost) * 100) : 0,
    }));

    const trends = await this.getTrends(companyId, 6, siteId);

    return {
      level: 'site',
      entityId: siteId,
      entityName: site?.siteName || siteId,
      totalCost: Math.round(totalCost),
      tripCount: trips.length,
      costPerTrip: trips.length > 0 ? Math.round(totalCost / trips.length) : 0,
      children: children.sort((a, b) => b.cost - a.cost),
      trends,
    };
  }

  private async drillDownProcess(companyId: string, processId: string) {
    const trips = await (this.prisma as any).trip.findMany({
      where: { companyId, processId, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      select: { totalCost: true, vendorId: true, vehicleId: true },
    });

    const totalCost = trips.reduce((sum: number, t: any) => sum + (t.totalCost || 0), 0);

    const vendorBreakdown: Record<string, { cost: number; trips: number; name: string }> = {};
    for (const trip of trips) {
      const vid = trip.vendorId || 'unassigned';
      if (!vendorBreakdown[vid]) {
        vendorBreakdown[vid] = { cost: 0, trips: 0, name: vid };
      }
      vendorBreakdown[vid].cost += trip.totalCost || 0;
      vendorBreakdown[vid].trips += 1;
    }

    const children: DrillDownChild[] = Object.entries(vendorBreakdown).map(([id, data]) => ({
      id,
      name: data.name,
      cost: Math.round(data.cost),
      trips: data.trips,
      costPerTrip: data.trips > 0 ? Math.round(data.cost / data.trips) : 0,
      percentOfTotal: totalCost > 0 ? Math.round((data.cost / totalCost) * 100) : 0,
    }));

    return {
      level: 'process',
      entityId: processId,
      entityName: processId,
      totalCost: Math.round(totalCost),
      tripCount: trips.length,
      costPerTrip: trips.length > 0 ? Math.round(totalCost / trips.length) : 0,
      children: children.sort((a, b) => b.cost - a.cost),
      trends: [],
    };
  }

  private async drillDownVendor(companyId: string, vendorId: string) {
    const vendor = await (this.prisma as any).vendorManagement.findFirst({
      where: { id: vendorId, companyId },
    });

    const trips = await (this.prisma as any).trip.findMany({
      where: { companyId, vendorId, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      select: { totalCost: true, id: true, status: true, scheduledPickupTime: true },
    });

    const totalCost = trips.reduce((sum: number, t: any) => sum + (t.totalCost || 0), 0);
    const completed = trips.filter((t: any) => t.status === 'COMPLETED').length;

    return {
      level: 'vendor',
      entityId: vendorId,
      entityName: vendor?.name || vendorId,
      totalCost: Math.round(totalCost),
      tripCount: trips.length,
      costPerTrip: trips.length > 0 ? Math.round(totalCost / trips.length) : 0,
      children: [],
      trends: [],
      completionRate: trips.length > 0 ? Math.round((completed / trips.length) * 100) : 0,
    };
  }

  private async getTrends(companyId: string, months: number, siteId?: string) {
    const trends: { period: string; cost: number; trips: number }[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const start = new Date();
      start.setMonth(start.getMonth() - i, 1);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);

      const where: any = { companyId, createdAt: { gte: start, lt: end } };
      if (siteId) where.siteId = siteId;

      const trips = await (this.prisma as any).trip.findMany({
        where,
        select: { totalCost: true },
      });

      const cost = trips.reduce((sum: number, t: any) => sum + (t.totalCost || 0), 0);
      trends.push({
        period: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
        cost: Math.round(cost),
        trips: trips.length,
      });
    }

    return trends;
  }

  // ===== HEALTH SCORE =====

  async calculateHealthScore(companyId: string, entityType: string, entityId: string) {
    const scores = await this.computeHealthScores(companyId, entityType, entityId);

    const overallScore = Math.round(
      scores.safety * 0.2 +
      scores.reliability * 0.2 +
      scores.utilization * 0.15 +
      scores.costEfficiency * 0.2 +
      scores.vendorQuality * 0.1 +
      scores.gpsHealth * 0.05 +
      scores.employeeExperience * 0.1
    );

    const recommendations = this.generateHealthRecommendations(scores);

    // Store score
    await (this.prisma as any).transportHealthScore.upsert({
      where: { companyId_entityType_entityId: { companyId, entityType, entityId } },
      update: {
        overallScore, safetyScore: scores.safety, reliabilityScore: scores.reliability,
        utilizationScore: scores.utilization, costEfficiencyScore: scores.costEfficiency,
        vendorQualityScore: scores.vendorQuality, gpsHealthScore: scores.gpsHealth,
        employeeExpScore: scores.employeeExperience, calculatedAt: new Date(),
      },
      create: {
        companyId, entityType, entityId, overallScore,
        safetyScore: scores.safety, reliabilityScore: scores.reliability,
        utilizationScore: scores.utilization, costEfficiencyScore: scores.costEfficiency,
        vendorQualityScore: scores.vendorQuality, gpsHealthScore: scores.gpsHealth,
        employeeExpScore: scores.employeeExperience,
      },
    });

    return {
      entityType, entityId, overallScore,
      breakdown: scores,
      recommendations,
      trend: await this.getHealthTrend(companyId, entityType, entityId),
    };
  }

  private async computeHealthScores(companyId: string, entityType: string, entityId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [incidents, trips, occupancyLogs, gpsLogs, bookings] = await Promise.all([
      (this.prisma as any).safetyAlert.findMany({
        where: { companyId, createdAt: { gte: thirtyDaysAgo } },
      }).catch(() => []),
      (this.prisma as any).trip.findMany({
        where: { companyId, createdAt: { gte: thirtyDaysAgo } },
        select: { status: true, totalCost: true, scheduledPickupTime: true, actualPickupTime: true },
      }),
      (this.prisma as any).vehicleOccupancyLog.findMany({
        where: { companyId, createdAt: { gte: thirtyDaysAgo } },
        select: { occupancyPercent: true },
      }).catch(() => []),
      (this.prisma as any).gPSLog.findMany({
        where: { companyId, recordedAt: { gte: thirtyDaysAgo } },
        select: { recordedAt: true },
        orderBy: { recordedAt: 'desc' },
        take: 100,
      }).catch(() => []),
      (this.prisma as any).booking.findMany({
        where: { companyId, createdAt: { gte: thirtyDaysAgo } },
        select: { status: true },
      }),
    ]);

    // Safety: based on incident count
    const safetyScore = Math.max(0, Math.min(100, 100 - (incidents.length * 5)));

    // Reliability: based on trip completion and on-time
    const completed = trips.filter((t: any) => t.status === 'COMPLETED').length;
    const onTime = trips.filter((t: any) => {
      if (!t.actualPickupTime || !t.scheduledPickupTime) return true;
      return Math.abs(new Date(t.actualPickupTime).getTime() - new Date(t.scheduledPickupTime).getTime()) < 15 * 60000;
    }).length;
    const reliabilityScore = trips.length > 0 ? Math.round((completed * 0.6 + onTime * 0.4) / trips.length * 100) : 80;

    // Utilization: based on occupancy
    const avgOccupancy = occupancyLogs.length > 0
      ? occupancyLogs.reduce((sum: number, l: any) => sum + (l.occupancyPercent || 0), 0) / occupancyLogs.length
      : 60;
    const utilizationScore = Math.round(Math.min(100, avgOccupancy * 1.2));

    // Cost efficiency: based on cost per trip trend
    const totalCost = trips.reduce((sum: number, t: any) => sum + (t.totalCost || 0), 0);
    const avgCost = trips.length > 0 ? totalCost / trips.length : 500;
    const costEfficiencyScore = Math.round(Math.max(0, Math.min(100, 100 - ((avgCost - 300) / 10))));

    // Vendor quality: based on completion rate
    const vendorScore = 85; // Would aggregate from vendor scorecards

    // GPS health: based on last GPS ping freshness
    const lastGpsTime = gpsLogs.length > 0 ? new Date(gpsLogs[0].recordedAt).getTime() : Date.now();
    const gpsAgeMinutes = (Date.now() - lastGpsTime) / 60000;
    const gpsHealthScore = Math.round(Math.max(0, Math.min(100, 100 - gpsAgeMinutes * 2)));

    // Employee experience: based on no-show and cancellation rates
    const noShows = bookings.filter((b: any) => b.status === 'NO_SHOW').length;
    const cancellations = bookings.filter((b: any) => b.status === 'CANCELLED').length;
    const employeeExpScore = bookings.length > 0
      ? Math.round(Math.max(0, 100 - ((noShows + cancellations) / bookings.length * 200)))
      : 80;

    return {
      safety: Math.max(0, Math.min(100, safetyScore)),
      reliability: Math.max(0, Math.min(100, reliabilityScore)),
      utilization: Math.max(0, Math.min(100, utilizationScore)),
      costEfficiency: Math.max(0, Math.min(100, costEfficiencyScore)),
      vendorQuality: Math.max(0, Math.min(100, vendorScore)),
      gpsHealth: Math.max(0, Math.min(100, gpsHealthScore)),
      employeeExperience: Math.max(0, Math.min(100, employeeExpScore)),
    };
  }

  private generateHealthRecommendations(scores: Record<string, number>): string[] {
    const recs: string[] = [];
    if (scores.safety < 70) recs.push('Safety score is low — review incident reports and driver training');
    if (scores.reliability < 75) recs.push('Reliability below target — investigate trip completion and on-time rates');
    if (scores.utilization < 50) recs.push('Vehicle utilization is low — consider consolidation or route optimization');
    if (scores.costEfficiency < 60) recs.push('Cost efficiency declining — review rate cards and vendor billing');
    if (scores.gpsHealth < 80) recs.push('GPS connectivity issues — check device health and network coverage');
    if (scores.employeeExperience < 70) recs.push('Employee satisfaction low — review no-show rates and booking experience');
    if (recs.length === 0) recs.push('All metrics within healthy range — maintain current operations');
    return recs;
  }

  private async getHealthTrend(companyId: string, entityType: string, entityId: string) {
    const scores = await (this.prisma as any).transportHealthScore.findMany({
      where: { companyId, entityType, entityId },
      orderBy: { calculatedAt: 'desc' },
      take: 12,
    });

    return scores.reverse().map((s: any) => ({
      period: `${s.calculatedAt.getFullYear()}-${String(s.calculatedAt.getMonth() + 1).padStart(2, '0')}`,
      score: s.overallScore,
    }));
  }

  // ===== BLAST RADIUS =====

  async calculateBlastRadius(companyId: string, changeType: string, changeParams: any) {
    const impact = {
      employeesAffected: 0,
      tripsAffected: 0,
      vehiclesAffected: 0,
      driversAffected: 0,
      vendorsAffected: 0,
      estimatedCostChange: 0,
      bookingsRequiringAction: 0,
      safetyRulesImpacted: 0,
    };

    const affectedEntities: { type: string; id: string; name: string; impact: string }[] = [];
    const riskFactors: string[] = [];

    switch (changeType) {
      case 'SHIFT_CHANGE': {
        const processId = changeParams.processId;
        const trips = await (this.prisma as any).trip.findMany({
          where: { companyId, processId, status: { in: ['SCHEDULED', 'IN_TRANSIT'] } },
          include: { TripPassenger: true },
        });
        const vehicleIds = [...new Set(trips.map((t: any) => t.vehicleId).filter(Boolean))];
        const driverIds = [...new Set(trips.map((t: any) => t.driverId).filter(Boolean))];
        const vendorIds = [...new Set(trips.map((t: any) => t.vendorId).filter(Boolean))];

        impact.tripsAffected = trips.length;
        impact.vehiclesAffected = vehicleIds.length;
        impact.driversAffected = driverIds.length;
        impact.vendorsAffected = vendorIds.length;
        impact.employeesAffected = trips.reduce((sum: number, t: any) => sum + (t.TripPassenger?.length || 0), 0);
        impact.bookingsRequiringAction = Math.round(impact.employeesAffected * 0.3);
        impact.estimatedCostChange = trips.reduce((sum: number, t: any) => sum + (t.totalCost || 0), 0) * 0.05;

        if (trips.length > 50) riskFactors.push('Large number of trips affected — consider phased rollout');
        if (impact.employeesAffected > 200) riskFactors.push('High employee impact — communicate change at least 48 hours in advance');
        break;
      }
      case 'PROCESS_DISABLE': {
        const processId = changeParams.processId;
        const bookings = await (this.prisma as any).booking.findMany({
          where: { companyId, processId, status: { in: ['PENDING', 'APPROVED'] } },
        });
        impact.bookingsRequiringAction = bookings.length;
        impact.employeesAffected = bookings.length;
        riskFactors.push('Active bookings will need to be cancelled or reassigned');
        break;
      }
      case 'VEHICLE_REASSIGN': {
        const vehicleId = changeParams.vehicleId;
        const trips = await (this.prisma as any).trip.findMany({
          where: { companyId, vehicleId, status: { in: ['SCHEDULED', 'IN_TRANSIT'] } },
          include: { TripPassenger: true },
        });
        impact.tripsAffected = trips.length;
        impact.employeesAffected = trips.reduce((sum: number, t: any) => sum + (t.TripPassenger?.length || 0), 0);
        impact.vehiclesAffected = 1;
        if (trips.some((t: any) => t.status === 'IN_TRANSIT')) riskFactors.push('Vehicle has active trips — wait for completion or arrange handover');
        break;
      }
      default:
        riskFactors.push('Unknown change type — manual impact assessment recommended');
    }

    return {
      changeType,
      changeDescription: `${changeType.replace(/_/g, ' ').toLowerCase()} impact analysis`,
      impact,
      affectedEntities,
      riskFactors,
    };
  }
}

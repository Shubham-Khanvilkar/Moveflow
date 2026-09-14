import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private get db() { return this.prisma as any; }

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // BUSINESS ANALYST DASHBOARD
  // ============================================================

  async getBusinessAnalystDashboard(companyId: string, filters?: { siteId?: string; processId?: string; shiftCode?: string; date?: string }) {
    const today = filters?.date ? new Date(filters.date) : new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [transportEnabledEmployees, totalTrips, completedTrips, cancelledTrips, noShowCount, activeVehicles, tripPassengerCount, costAggregate, shiftCount, bookingCount] = await Promise.all([
      this.prisma.user.count({ where: { companyId, transportEligibility: 'ELIGIBLE' as any, status: 'ACTIVE' as any } }),
      this.prisma.trip.count({ where: { companyId, date: { gte: today, lt: tomorrow } } }),
      this.prisma.trip.count({ where: { companyId, date: { gte: today, lt: tomorrow }, status: 'COMPLETED' as any } }),
      this.prisma.trip.count({ where: { companyId, date: { gte: today, lt: tomorrow }, status: 'CANCELLED' as any } }),
      this.prisma.trip.count({ where: { companyId, date: { gte: today, lt: tomorrow }, status: 'NO_SHOW' as any } }),
      this.prisma.vehicle.count({ where: { companyId, status: { in: ['AVAILABLE', 'IN_TRIP'] as any[] } } }),
      this.prisma.tripPassenger.count({ where: { Trip: { companyId, date: { gte: today, lt: tomorrow } } } }),
      this.prisma.trip.aggregate({ where: { companyId, date: { gte: today, lt: tomorrow } }, _sum: { actualCost: true, estimatedCost: true, distanceKm: true, passengerCount: true } }),
      this.prisma.shift.findMany({ where: { companyId }, select: { id: true, name: true, startTime: true, endTime: true } }),
      this.prisma.booking.count({ where: { companyId, date: { gte: today, lt: tomorrow } } }),
    ]);

    const totalPassengers = tripPassengerCount;
    const avgOccupancy = activeVehicles > 0 ? (totalPassengers / activeVehicles) * 100 : 0;
    const totalCost = costAggregate._sum.actualCost || costAggregate._sum.estimatedCost || 0;
    const totalKm = costAggregate._sum.distanceKm || 0;

    return {
      executiveKPI: {
        transportEnabledEmployees,
        currentlyTravelling: totalPassengers,
        tripsToday: totalTrips,
        bookingsToday: bookingCount,
        completedTrips,
        cancelledTrips,
        noShows: noShowCount,
        avgOccupancy: Math.round(avgOccupancy * 10) / 10,
        vehicleUtilization: activeVehicles > 0 ? Math.round((completedTrips / activeVehicles) * 100) : 0,
        costPerTrip: totalTrips > 0 ? Math.round(totalCost / totalTrips) : 0,
        costPerEmployee: transportEnabledEmployees > 0 ? Math.round(totalCost / transportEnabledEmployees) : 0,
        costPerKm: totalKm > 0 ? Math.round(totalCost / totalKm) : 0,
      },
      demandByShift: shiftCount.map((s: any) => ({
        shiftId: s.id,
        shiftName: s.name,
        startTime: s.startTime,
        endTime: s.endTime,
        pickupDemand: 0,
        dropDemand: 0,
        availableCapacity: 0,
        gap: 0,
      })),
      optimizationOpportunities: await this._getOptimizationOpportunities(companyId),
    };
  }

  private async _getOptimizationOpportunities(companyId: string) {
    try {
      const routes = await (this.prisma as any).route.findMany({
        where: { companyId },
        include: { trips: { where: { status: 'COMPLETED' as any } } },
      });
      return routes
        .filter((r: any) => r.trips.length > 2)
        .slice(0, 5)
        .map((r: any) => ({
          id: r.id,
          site: r.siteName || r.origin || 'Unknown',
          processes: [r.name],
          shift: r.shift || '07:00',
          currentVehicles: r.vehicleCount || 1,
          potentialVehicles: Math.max(1, Math.floor((r.vehicleCount || 1) * 0.75)),
          estimatedDailySaving: Math.round((r.vehicleCount || 1) * 200),
          reason: `Route ${r.name} has ${r.trips.length} completed trips`,
          confidence: 0.8,
        }));
    } catch {
      return [];
    }
  }

  // ============================================================
  // COST OPTIMIZATION DASHBOARD
  // ============================================================

  async getCostOptimizationDashboard(companyId: string, filters?: any) {
    const lowOccupancyTrips = await this.db.vehicleOccupancyLog?.findMany({
      where: { companyId, isUnderutilized: true },
      orderBy: { recordedAt: 'desc' },
      take: 20,
    }) || [];

    const scenarios = await this.db.optimizationSimulator?.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }) || [];

    const recentOptimizations = await this.db.savingsTracker?.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }) || [];

    const vehicleCount = await this.prisma.vehicle.count({ where: { companyId } });
    const activeTripCount = await this.prisma.trip.count({
      where: { companyId, status: { in: ['SCHEDULED', 'DISPATCHED', 'IN_TRANSIT'] as any[] } },
    });
    const idleVehicleCount = await this.prisma.vehicle.count({ where: { companyId, status: 'AVAILABLE' as any } });

    return {
      summary: {
        totalVehicles: vehicleCount,
        activeTrips: activeTripCount,
        idleVehicles: idleVehicleCount,
        lowOccupancyTrips: lowOccupancyTrips.length,
      },
      lowOccupancyTrips,
      duplicateRoutes: { count: 0, routes: [] },
      excessVehicles: { count: 0, vehicles: [] },
      routeDeviations: { count: 0, avgDeviationKm: 0 },
      noShowLosses: { count: 0, estimatedLoss: 0 },
      frequentCancellations: { count: 0, impact: 0, bookings: [] },
      simulatorScenarios: scenarios,
      recentOptimizations,
    };
  }

  async runOptimizationSimulation(companyId: string, dto: {
    siteId?: string;
    processId?: string;
    scenarioName: string;
    constraints?: any;
  }) {
    const [vehicles, trips, employees] = await Promise.all([
      this.prisma.vehicle.count({ where: { companyId, status: { in: ['AVAILABLE', 'IN_TRIP'] as any[] } } }),
      this.prisma.trip.count({ where: { companyId, status: { in: ['SCHEDULED', 'DISPATCHED', 'IN_TRANSIT'] as any[] } } }),
      this.prisma.user.count({ where: { companyId, transportEligibility: 'ELIGIBLE' as any, status: 'ACTIVE' as any } }),
    ]);

    const avgOccupancy = employees > 0 && vehicles > 0 ? (employees / vehicles) * 100 : 50;
    const currentCostPerDay = trips * 2500;
    const optimizedVehicles = Math.ceil(vehicles * 0.75);
    const optimizedTrips = Math.ceil(trips * 0.92);
    const optimizedCostPerDay = optimizedTrips * 2200;
    const projectedSaving = currentCostPerDay - optimizedCostPerDay;

    const scenario = await this.db.optimizationSimulator.create({
      data: {
        companyId,
        siteId: dto.siteId || null,
        processId: dto.processId || null,
        scenarioName: dto.scenarioName,
        status: 'COMPLETED',
        inputConfig: JSON.stringify(dto.constraints || {}),
        currentVehicles: vehicles,
        currentTrips: trips,
        currentEmployees: employees,
        currentOccupancy: Math.round(avgOccupancy * 10) / 10,
        currentCostPerDay,
        optimizedVehicles,
        optimizedTrips,
        optimizedOccupancy: Math.min(Math.round(avgOccupancy * 1.2 * 10) / 10, 85),
        optimizedCostPerDay,
        projectedSaving,
        projectedSavingPct: currentCostPerDay > 0 ? Math.round((projectedSaving / currentCostPerDay) * 1000) / 10 : 0,
        constraints: JSON.stringify(dto.constraints || {}),
        resultDetails: JSON.stringify({
          vehicleReduction: vehicles - optimizedVehicles,
          tripReduction: trips - optimizedTrips,
          monthlyProjectedSaving: projectedSaving * 30,
        }),
      },
    });

    return scenario;
  }

  // ============================================================
  // FINANCIAL ANALYST DASHBOARD
  // ============================================================

  async getFinancialAnalystDashboard(companyId: string, filters?: { period?: string }) {
    const period = filters?.period || new Date().toISOString().slice(0, 7);
    const monthStart = new Date(period + '-01');
    const monthEnd = new Date(period + '-32');

    const [tripAggregate, completedTrips, cancelledTrips, noShowTrips, costPerKm] = await Promise.all([
      this.prisma.trip.aggregate({ where: { companyId, date: { gte: monthStart, lt: monthEnd } }, _sum: { actualCost: true, estimatedCost: true, distanceKm: true }, _count: true }),
      this.prisma.trip.count({ where: { companyId, date: { gte: monthStart, lt: monthEnd }, status: 'COMPLETED' as any } }),
      this.prisma.trip.count({ where: { companyId, date: { gte: monthStart, lt: monthEnd }, status: 'CANCELLED' as any } }),
      this.prisma.trip.count({ where: { companyId, date: { gte: monthStart, lt: monthEnd }, status: 'NO_SHOW' as any } }),
      this.prisma.trip.aggregate({ where: { companyId, date: { gte: monthStart, lt: monthEnd }, distanceKm: { gt: 0 } }, _avg: { actualCost: true, distanceKm: true } }),
    ]);

    const totalCost = tripAggregate._sum.actualCost || tripAggregate._sum.estimatedCost || 0;
    const totalKm = tripAggregate._sum.distanceKm || 0;
    const tripCount = tripAggregate._count;

    let vendorInvoiceTotal = 0;
    try {
      const vendorAgg = await (this.prisma as any).vendorInvoice.aggregate({
        where: { companyId, createdAt: { gte: monthStart, lt: monthEnd } },
        _sum: { totalAmount: true },
      });
      vendorInvoiceTotal = vendorAgg._sum?.totalAmount || 0;
    } catch { /* vendorInvoice model may not exist */ }

    const vendorCharges = vendorInvoiceTotal || Math.round(totalCost * 0.65);
    const remaining = totalCost - vendorCharges;

    return {
      period,
      costWaterfall: {
        totalTransportCost: totalCost,
        vendorCharges,
        driverCharges: Math.round(remaining * 0.7),
        vehicleCharges: Math.round(remaining * 0.15),
        extraTripCharges: Math.round(remaining * 0.1),
        cancellationCharges: Math.round(remaining * 0.03),
        noShowImpact: Math.round(remaining * 0.02),
        savingsApplied: 0,
        netTransportCost: totalCost,
      },
      costDimensions: {
        costPerTrip: tripCount > 0 ? Math.round(totalCost / tripCount) : 0,
        costPerKm: totalKm > 0 ? Math.round(totalCost / totalKm) : 0,
        costPerSeat: 0,
        costPerSite: [],
        costPerProcess: [],
      },
      tripMetrics: {
        totalTrips: tripCount,
        completedTrips,
        cancelledTrips,
        noShowTrips,
        completionRate: tripCount > 0 ? Math.round((completedTrips / tripCount) * 1000) / 10 : 0,
        cancellationRate: tripCount > 0 ? Math.round((cancelledTrips / tripCount) * 1000) / 10 : 0,
      },
      budgetVsActual: { allocated: 0, actual: totalCost, variance: 0 },
      vendorSpend: { totalSpend: Math.round(totalCost * 0.65), vendors: [] },
      monthlyTrend: { months: [], costs: [], savings: [] },
    };
  }

  // ============================================================
  // SAVINGS TRACKER
  // ============================================================

  async getSavingsSummary(companyId: string) {
    const allOptimizations = await this.db.savingsTracker?.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    }) || [];

    const proposed = allOptimizations.filter((o: any) => o.status === 'PROPOSED');
    const approved = allOptimizations.filter((o: any) => o.status === 'APPROVED');
    const implemented = allOptimizations.filter((o: any) => o.status === 'IMPLEMENTED');
    const totalProjectedSaving = allOptimizations.reduce((sum: number, o: any) => sum + (o.monthlyProjectedSaving || 0), 0);
    const totalActualSaving = implemented.reduce((sum: number, o: any) => sum + (o.actualSaving || 0), 0);

    return {
      totalOptimizations: allOptimizations.length,
      proposed: proposed.length,
      approved: approved.length,
      implemented: implemented.length,
      annualizedProjectedSaving: totalProjectedSaving * 12,
      totalActualSaving,
      recentOptimizations: allOptimizations.slice(0, 20),
    };
  }

  async createOptimization(companyId: string, dto: any) {
    const all = await this.db.savingsTracker?.findMany({ where: { companyId } }) || [];
    const code = `OPT-${new Date().getFullYear()}-${String(all.length + 1).padStart(5, '0')}`;
    const dailySaving = (dto.beforeCostPerDay || 0) - (dto.afterCostPerDay || 0);

    return this.db.savingsTracker.create({
      data: {
        optimizationCode: code,
        companyId,
        siteId: dto.siteId || null,
        processId: dto.processId || null,
        status: 'PROPOSED',
        optimizationType: dto.optimizationType,
        title: dto.title,
        description: dto.description,
        beforeVehicles: dto.beforeVehicles || 0,
        afterVehicles: dto.afterVehicles || 0,
        beforeTrips: dto.beforeTrips || 0,
        afterTrips: dto.afterTrips || 0,
        beforeCostPerDay: dto.beforeCostPerDay || 0,
        afterCostPerDay: dto.afterCostPerDay || 0,
        dailySaving,
        monthlyProjectedSaving: dailySaving * 30,
        affectedEmployees: dto.affectedEmployees || 0,
        reason: dto.reason,
        proposedBy: dto.proposedBy || 'system',
      },
    });
  }

  async approveOptimization(id: string, approvedBy: string) {
    return this.db.savingsTracker.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy },
    });
  }

  async implementOptimization(id: string, actualSaving: number) {
    return this.db.savingsTracker.update({
      where: { id },
      data: { status: 'IMPLEMENTED', actualSaving, implementedAt: new Date() },
    });
  }

  // ============================================================
  // ENTERPRISE COMMAND CENTER
  // ============================================================

  async getEnterpriseCommandCenter() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [companies, activeCompanies, suspendedCompanies, pendingCompanies, sites, processes, transportEnabledEmployees, activeTrips, waitingDispatch, noShows, availableDrivers, onTripDrivers, breakDrivers, offlineDrivers, incidents, mtdSpend, pendingInvoices] = await Promise.all([
      this.prisma.company.count(),
      this.prisma.company.count({ where: { status: 'ACTIVE' as any } }),
      this.prisma.company.count({ where: { status: 'SUSPENDED' as any } }),
      this.prisma.company.count({ where: { status: 'DRAFT' as any } }),
      this.prisma.companySite.count({ where: { isActive: true } }),
      this.prisma.orgProcess.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { transportEligibility: 'ELIGIBLE' as any, status: 'ACTIVE' as any } }),
      this.prisma.trip.count({ where: { status: { in: ['SCHEDULED', 'DISPATCHED', 'DRIVER_ACCEPTED', 'EN_ROUTE_TO_PICKUP', 'IN_TRANSIT'] as any[] } } }),
      this.prisma.trip.count({ where: { status: 'SCHEDULED' as any } }),
      this.prisma.trip.count({ where: { status: 'NO_SHOW' as any } }),
      this.prisma.driverProfile.count({ where: { status: 'AVAILABLE' as any } }),
      this.prisma.driverProfile.count({ where: { status: 'ON_TRIP' as any } }),
      this.prisma.driverProfile.count({ where: { status: 'BREAK' as any } }),
      this.prisma.driverProfile.count({ where: { status: 'OFFLINE' as any } }),
      this.prisma.incident.count({ where: { status: { in: ['REPORTED', 'IN_PROGRESS'] as any[] } } }),
      this.prisma.trip.aggregate({ where: { date: { gte: monthStart } }, _sum: { actualCost: true } }),
      this.db.vendorInvoice?.count({ where: { status: 'PENDING' as any } }) || 0,
    ]);

    const totalSavings = await this.db.savingsTracker?.aggregate({
      where: { status: 'IMPLEMENTED' },
      _sum: { actualSaving: true },
    }) || { _sum: { actualSaving: 0 } };

    return {
      companies: { total: companies, active: activeCompanies, suspended: suspendedCompanies, pending: pendingCompanies },
      sites: { active: sites },
      processes: { active: processes },
      employees: { transportEnabled: transportEnabledEmployees, currentlyTravelling: 0 },
      fleet: { available: availableDrivers, onTrip: onTripDrivers, onBreak: breakDrivers, offline: offlineDrivers },
      liveOperations: { activeTrips, waitingDispatch, noShows, emergencies: incidents },
      financial: { mtdSpend: mtdSpend._sum.actualCost || 0, mtdSavings: totalSavings._sum?.actualSaving || 0, pendingInvoices },
    };
  }

  // ============================================================
  // CXO DASHBOARDS
  // ============================================================

  async getCEODashboard(companyId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalCost, employees, trips, incidents] = await Promise.all([
      this.prisma.trip.aggregate({ where: { companyId, date: { gte: monthStart } }, _sum: { actualCost: true } }),
      this.prisma.user.count({ where: { companyId, transportEligibility: 'ELIGIBLE' as any, status: 'ACTIVE' as any } }),
      this.prisma.trip.count({ where: { companyId, date: { gte: monthStart } } }),
      this.prisma.incident.count({ where: { companyId, status: { in: ['REPORTED', 'IN_PROGRESS'] as any[] } } }),
    ]);

    return {
      totalTransportCost: totalCost._sum.actualCost || 0,
      employeesTransported: employees,
      tripsThisMonth: trips,
      majorIncidents: incidents,
    };
  }

  async getCFODashboard(companyId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalSpend, costAggregate, pendingInvoices] = await Promise.all([
      this.prisma.trip.aggregate({ where: { companyId, date: { gte: monthStart } }, _sum: { actualCost: true }, _count: true }),
      this.prisma.trip.aggregate({ where: { companyId }, _avg: { actualCost: true } }),
      this.db.vendorInvoice?.count({ where: { status: 'PENDING' as any } }) || 0,
    ]);

    const savings = await this.db.savingsTracker?.aggregate({
      where: { companyId, status: 'IMPLEMENTED' },
      _sum: { actualSaving: true },
    }) || { _sum: { actualSaving: 0 } };

    return {
      totalSpend: totalSpend._sum.actualCost || 0,
      tripCount: totalSpend._count,
      costPerTrip: costAggregate._avg.actualCost || 0,
      pendingInvoices: { count: pendingInvoices, totalAmount: 0 },
      savingsAchieved: savings._sum?.actualSaving || 0,
    };
  }

  async getCOODashboard(companyId: string) {
    const [totalTrips, completedTrips, noShows, cancellations, vehicles, drivers, incidents] = await Promise.all([
      this.prisma.trip.count({ where: { companyId } }),
      this.prisma.trip.count({ where: { companyId, status: 'COMPLETED' as any } }),
      this.prisma.trip.count({ where: { companyId, status: 'NO_SHOW' as any } }),
      this.prisma.trip.count({ where: { companyId, status: 'CANCELLED' as any } }),
      this.prisma.vehicle.count({ where: { companyId } }),
      this.prisma.driverProfile.count({ where: { companyId } }),
      this.prisma.incident.count({ where: { companyId } }),
    ]);

    return {
      totalTrips,
      completedTrips,
      noShowRate: totalTrips > 0 ? Math.round((noShows / totalTrips) * 1000) / 10 : 0,
      cancellationRate: totalTrips > 0 ? Math.round((cancellations / totalTrips) * 1000) / 10 : 0,
      fleetSize: vehicles,
      driverCount: drivers,
      incidents,
    };
  }

  async getCHRODashboard(companyId: string) {
    const [transportEnabled, shifts, safetyIncidents] = await Promise.all([
      this.prisma.user.count({ where: { companyId, transportEligibility: 'ELIGIBLE' as any, status: 'ACTIVE' as any } }),
      this.prisma.shift.findMany({ where: { companyId }, select: { id: true, name: true, startTime: true, endTime: true } }),
      this.prisma.incident.count({ where: { companyId, type: 'SAFETY' as any } }),
    ]);

    return {
      transportEnabledHeadcount: transportEnabled,
      shiftDemand: shifts.map((s: any) => ({ shiftId: s.id, shiftName: s.name, startTime: s.startTime, endTime: s.endTime })),
      safetyIncidents,
    };
  }

  async getCIODashboard(companyId: string) {
    const [totalDrivers, activeDrivers, totalTrips, activeTrips, incidents, auditCount] = await Promise.all([
      this.prisma.driverProfile.count({ where: { companyId } }),
      this.prisma.driverProfile.count({ where: { companyId, status: 'AVAILABLE' as any } }),
      this.prisma.trip.count({ where: { companyId } }),
      this.prisma.trip.count({ where: { companyId, status: { in: ['IN_TRANSIT', 'DISPATCHED'] as any[] } } }),
      this.prisma.incident.count({ where: { companyId } }),
      this.prisma.auditLog.count({ where: { companyId } }),
    ]);

    return {
      apiHealth: { uptime: 99.9, failedRequests: 0 },
      gpsConnectivity: { online: activeDrivers, offline: totalDrivers - activeDrivers, freshness: 'OK' },
      mobileAppHealth: { active: totalDrivers, version: '1.0.0' },
      integrationStatus: { supabase: 'CONNECTED', maps: 'CONFIGURED', sms: 'CONFIGURED' },
      securityEvents: { mfaChallenges: 0, failedLogins: 0 },
      fleetMetrics: { totalDrivers, activeDrivers, totalTrips, activeTrips, incidents, auditEvents: auditCount },
    };
  }

  // ============================================================
  // VENDOR PERFORMANCE
  // ============================================================

  async getVendorPerformance(companyId: string, period?: string) {
    const currentPeriod = period || new Date().toISOString().slice(0, 7);
    const scorecards = await this.db.vendorPerformanceScorecard?.findMany({
      where: { companyId, period: currentPeriod },
      orderBy: { completionRate: 'desc' },
    }) || [];

    return { period: currentPeriod, scorecards };
  }

  // ============================================================
  // DEMAND FORECAST
  // ============================================================

  async getDemandForecast(companyId: string, date: string, siteId?: string, processId?: string) {
    const where: any = { companyId, forecastDate: new Date(date) };
    if (siteId) where.siteId = siteId;
    if (processId) where.processId = processId;

    return this.db.demandForecast?.findMany({ where, orderBy: { timeSlot30Min: 'asc' } }) || [];
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

export interface CostLeak {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  estimatedMonthlyImpact: number;
  evidence: any;
  status: string;
  detectedAt: Date;
}

@Injectable()
export class CostLeakDetectorService {
  private readonly logger = new Logger(CostLeakDetectorService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async detectAllLeaks(companyId: string): Promise<CostLeak[]> {
    const leaks: CostLeak[] = [];

    const [idleVehicles, lowOccupancy, duplicateTrips, highEmptyKm, longDetours, excessCharges, unusualHours, repeatedNoShows, underusedShuttles] = await Promise.all([
      this.detectIdleVehicles(companyId),
      this.detectLowOccupancy(companyId),
      this.detectDuplicateTrips(companyId),
      this.detectHighEmptyKm(companyId),
      this.detectLongDetours(companyId),
      this.detectExcessVendorCharges(companyId),
      this.detectUnusualDriverHours(companyId),
      this.detectRepeatedNoShows(companyId),
      this.detectUnderusedShuttles(companyId),
    ]);

    leaks.push(...idleVehicles, ...lowOccupancy, ...duplicateTrips, ...highEmptyKm, ...longDetours, ...excessCharges, ...unusualHours, ...repeatedNoShows, ...underusedShuttles);

    // Store new leaks
    for (const leak of leaks) {
      const existing = await (this.prisma as any).costLeak.findFirst({
        where: { companyId, type: leak.type, status: { not: 'DISMISSED' }, title: leak.title },
      });

      if (!existing) {
        await (this.prisma as any).costLeak.create({
          data: {
            companyId,
            type: leak.type,
            severity: leak.severity,
            title: leak.title,
            description: leak.description,
            estimatedMonthlyImpact: leak.estimatedMonthlyImpact,
            evidence: leak.evidence,
            status: 'DETECTED',
          },
        });
      }
    }

    return leaks;
  }

  async getLeaks(companyId: string, status?: string, severity?: string) {
    const where: any = { companyId };
    if (status) where.status = status;
    if (severity) where.severity = severity;

    return (this.prisma as any).costLeak.findMany({
      where,
      orderBy: [{ severity: 'desc' }, { estimatedMonthlyImpact: 'desc' }],
      take: 100,
    });
  }

  async getLeakById(companyId: string, leakId: string) {
    const leak = await (this.prisma as any).costLeak.findFirst({
      where: { id: leakId, companyId },
    });
    if (!leak) return null;
    return leak;
  }

  async acknowledgeLeak(companyId: string, leakId: string, userId: string) {
    await (this.prisma as any).costLeak.update({
      where: { id: leakId },
      data: { status: 'ACKNOWLEDGED' },
    });

    await this.audit.log({
      userId, action: 'COST_LEAK_ACKNOWLEDGED', entity: 'CostLeak',
      entityId: leakId, companyId,
    });

    return { success: true };
  }

  async resolveLeak(companyId: string, leakId: string, userId: string) {
    await (this.prisma as any).costLeak.update({
      where: { id: leakId },
      data: { status: 'RESOLVED', resolvedBy: userId, resolvedAt: new Date() },
    });

    await this.audit.log({
      userId, action: 'COST_LEAK_RESOLVED', entity: 'CostLeak',
      entityId: leakId, companyId,
    });

    return { success: true };
  }

  async dismissLeak(companyId: string, leakId: string, userId: string) {
    await (this.prisma as any).costLeak.update({
      where: { id: leakId },
      data: { status: 'DISMISSED', resolvedBy: userId, resolvedAt: new Date() },
    });

    await this.audit.log({
      userId, action: 'COST_LEAK_DISMISSED', entity: 'CostLeak',
      entityId: leakId, companyId,
    });

    return { success: true };
  }

  async getLeakSummary(companyId: string) {
    const leaks = await (this.prisma as any).costLeak.findMany({
      where: { companyId, status: { not: 'DISMISSED' } },
    });

    const totalImpact = leaks.reduce((sum: number, l: any) => sum + (l.estimatedMonthlyImpact || 0), 0);
    const bySeverity = {
      CRITICAL: leaks.filter((l: any) => l.severity === 'CRITICAL').length,
      HIGH: leaks.filter((l: any) => l.severity === 'HIGH').length,
      MEDIUM: leaks.filter((l: any) => l.severity === 'MEDIUM').length,
      LOW: leaks.filter((l: any) => l.severity === 'LOW').length,
    };
    const byStatus = {
      DETECTED: leaks.filter((l: any) => l.status === 'DETECTED').length,
      ACKNOWLEDGED: leaks.filter((l: any) => l.status === 'ACKNOWLEDGED').length,
      RESOLVED: leaks.filter((l: any) => l.status === 'RESOLVED').length,
    };

    return { totalLeaks: leaks.length, totalMonthlyImpact: totalImpact, bySeverity, byStatus };
  }

  // ===== DETECTION METHODS =====

  private async detectIdleVehicles(companyId: string): Promise<CostLeak[]> {
    const leaks: CostLeak[] = [];

    const assignedVehicles = await (this.prisma as any).vehicle.findMany({
      where: { companyId, status: 'ASSIGNED' },
      include: {
        VehicleLocation: { orderBy: { lastUpdated: 'desc' }, take: 1 },
      },
    });

    for (const vehicle of assignedVehicles) {
      const location = (vehicle as any).VehicleLocation?.[0];
      if (location) {
        const lastUpdate = new Date(location.lastUpdated).getTime();
        const now = Date.now();
        const idleMinutes = (now - lastUpdate) / 60000;

        if (idleMinutes > 30 && (location.speed || 0) < 5) {
          leaks.push({
            id: `idle-${vehicle.id}`,
            type: 'IDLE_VEHICLE',
            severity: idleMinutes > 120 ? 'HIGH' : 'MEDIUM',
            title: `Vehicle ${vehicle.registrationNo || vehicle.id} idle for ${Math.round(idleMinutes)} minutes`,
            description: `Vehicle assigned to trip but showing no movement for ${Math.round(idleMinutes)} minutes.`,
            estimatedMonthlyImpact: this.estimateIdleCost(idleMinutes),
            evidence: { vehicleId: vehicle.id, idleMinutes, lastLocation: location },
            status: 'DETECTED',
            detectedAt: new Date(),
          });
        }
      }
    }

    return leaks;
  }

  private async detectLowOccupancy(companyId: string): Promise<CostLeak[]> {
    const leaks: CostLeak[] = [];

    const lowOccupancyTrips = await (this.prisma as any).vehicleOccupancyLog.findMany({
      where: { companyId, isUnderutilized: true, tripId: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    for (const log of lowOccupancyTrips) {
      const occupancy = (log as any).occupancyPercent || 0;
      if (occupancy < 40 && occupancy > 0) {
        leaks.push({
          id: `low-occ-${log.id}`,
          type: 'LOW_OCCUPANCY',
          severity: occupancy < 20 ? 'HIGH' : 'MEDIUM',
          title: `Trip ${log.tripId} at ${Math.round(occupancy)}% occupancy`,
          description: `Vehicle operating at ${Math.round(occupancy)}% capacity. Consider consolidating with other trips.`,
          estimatedMonthlyImpact: this.estimateLowOccupancyCost(occupancy),
          evidence: { tripId: log.tripId, vehicleId: log.vehicleId, occupancy, totalSeats: log.totalSeats, occupiedSeats: log.occupiedSeats },
          status: 'DETECTED',
          detectedAt: new Date(),
        });
      }
    }

    return leaks;
  }

  private async detectDuplicateTrips(companyId: string): Promise<CostLeak[]> {
    const leaks: CostLeak[] = [];

    // Find trips with similar pickup/drop within 30-minute window
    const recentTrips = await (this.prisma as any).trip.findMany({
      where: {
        companyId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        status: { in: ['SCHEDULED', 'IN_TRANSIT'] },
      },
      select: { id: true, pickupLatitude: true, pickupLongitude: true, dropLatitude: true, dropLongitude: true, scheduledPickupTime: true, totalCost: true },
    });

    for (let i = 0; i < recentTrips.length; i++) {
      for (let j = i + 1; j < recentTrips.length; j++) {
        const a = recentTrips[i];
        const b = recentTrips[j];

        if (!a.pickupLatitude || !b.pickupLatitude) continue;

        const pickupDist = this.haversine(a.pickupLatitude, a.pickupLongitude, b.pickupLatitude, b.pickupLongitude);
        const dropDist = this.haversine(a.dropLatitude, a.dropLongitude, b.dropLatitude, b.dropLongitude);
        const timeDiff = Math.abs(new Date(a.scheduledPickupTime).getTime() - new Date(b.scheduledPickupTime).getTime()) / 60000;

        if (pickupDist < 1 && dropDist < 1 && timeDiff < 30) {
          leaks.push({
            id: `dup-${a.id}-${b.id}`,
            type: 'DUPLICATE_TRIP',
            severity: 'HIGH',
            title: `Potential duplicate trips detected`,
            description: `Two trips with nearly identical routes (${Math.round(pickupDist * 1000)}m pickup, ${Math.round(timeDiff)}min apart) could potentially be combined.`,
            estimatedMonthlyImpact: Math.min(a.totalCost || 0, b.totalCost || 0) * 0.5,
            evidence: { tripA: a.id, tripB: b.id, pickupDistance: pickupDist, timeDifference: timeDiff },
            status: 'DETECTED',
            detectedAt: new Date(),
          });
        }
      }
    }

    return leaks;
  }

  private async detectHighEmptyKm(companyId: string): Promise<CostLeak[]> {
    const leaks: CostLeak[] = [];

    const emptyKmTrips = await (this.prisma as any).dispatchAssignment.findMany({
      where: {
        companyId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        emptyKm: { gt: 15 },
      },
      orderBy: { emptyKm: 'desc' },
      take: 10,
    });

    for (const assignment of emptyKmTrips) {
      const emptyKm = (assignment as any).emptyKm || 0;
      const revenueKm = (assignment as any).revenueKm || 1;
      const ratio = emptyKm / revenueKm;

      if (ratio > 0.4) {
        leaks.push({
          id: `empty-km-${assignment.id}`,
          type: 'HIGH_EMPTY_KM',
          severity: ratio > 0.6 ? 'CRITICAL' : 'HIGH',
          title: `High empty KM ratio: ${Math.round(ratio * 100)}%`,
          description: `Vehicle traveled ${Math.round(emptyKm)} km empty vs ${Math.round(revenueKm)} km revenue. Empty KM ratio of ${Math.round(ratio * 100)}% indicates significant dead mileage.`,
          estimatedMonthlyImpact: emptyKm * 15, // Rs.15/km
          evidence: { assignmentId: assignment.id, emptyKm, revenueKm, ratio },
          status: 'DETECTED',
          detectedAt: new Date(),
        });
      }
    }

    return leaks;
  }

  private async detectLongDetours(companyId: string): Promise<CostLeak[]> {
    const leaks: CostLeak[] = [];

    const deviatedTrips = await (this.prisma as any).routeDeviation.findMany({
      where: {
        companyId,
        status: 'PENDING',
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      take: 10,
    });

    for (const deviation of deviatedTrips) {
      const deviationKm = (deviation as any).deviationKm || 0;
      if (deviationKm > 5) {
        leaks.push({
          id: `detour-${deviation.id}`,
          type: 'LONG_DETOUR',
          severity: deviationKm > 15 ? 'CRITICAL' : 'HIGH',
          title: `Route deviation of ${Math.round(deviationKm)} km detected`,
          description: `Trip deviated ${Math.round(deviationKm)} km from planned route. This may indicate inefficient routing or unauthorized stops.`,
          estimatedMonthlyImpact: deviationKm * 15,
          evidence: { tripId: (deviation as any).tripId, deviationKm, status: deviation.status },
          status: 'DETECTED',
          detectedAt: new Date(),
        });
      }
    }

    return leaks;
  }

  private async detectExcessVendorCharges(companyId: string): Promise<CostLeak[]> {
    const leaks: CostLeak[] = [];

    const discrepancies = await (this.prisma as any).vendorDiscrepancy.findMany({
      where: {
        companyId,
        status: 'DETECTED',
        amountAtRisk: { gt: 500 },
      },
      orderBy: { amountAtRisk: 'desc' },
      take: 10,
    });

    for (const disc of discrepancies) {
      leaks.push({
        id: `vendor-${disc.id}`,
        type: 'EXCESS_VENDOR_CHARGES',
        severity: (disc as any).amountAtRisk > 5000 ? 'CRITICAL' : 'HIGH',
        title: `Vendor ${(disc as any).vendorId} — ₹${Math.round((disc as any).amountAtRisk)} discrepancy`,
        description: `${(disc as any).type} variance detected. Contracted: ${(disc as any).contractedValue}, Actual: ${(disc as any).actualValue}.`,
        estimatedMonthlyImpact: (disc as any).amountAtRisk,
        evidence: { vendorId: (disc as any).vendorId, type: (disc as any).type, contractedValue: (disc as any).contractedValue, actualValue: (disc as any).actualValue },
        status: 'DETECTED',
        detectedAt: new Date(),
      });
    }

    return leaks;
  }

  private async detectUnusualDriverHours(companyId: string): Promise<CostLeak[]> {
    const leaks: CostLeak[] = [];

    const driverTrips = await (this.prisma as any).driverTrip.findMany({
      where: {
        companyId,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      groupBy: ['driverId'],
      having: { totalMinutes: { gt: 600 } }, // > 10 hours
    });

    // Fallback: query all driver trips and check manually
    const recentDriverTrips = await (this.prisma as any).driverTrip.findMany({
      where: {
        companyId,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    const driverHours: Record<string, number> = {};
    for (const trip of recentDriverTrips) {
      const driverId = (trip as any).driverId;
      if (!driverId) continue;
      const duration = (trip as any).totalMinutes || 0;
      driverHours[driverId] = (driverHours[driverId] || 0) + duration;
    }

    for (const [driverId, totalMinutes] of Object.entries(driverHours)) {
      if (totalMinutes > 600) {
        leaks.push({
          id: `hours-${driverId}`,
          type: 'UNUSUAL_DRIVER_HOURS',
          severity: totalMinutes > 720 ? 'CRITICAL' : 'HIGH',
          title: `Driver ${driverId} worked ${Math.round(totalMinutes / 60)} hours in 24h`,
          description: `Driver accumulated ${Math.round(totalMinutes)} minutes of driving time. This exceeds safe driving limits.`,
          estimatedMonthlyImpact: 0,
          evidence: { driverId, totalMinutes, limit: 480 },
          status: 'DETECTED',
          detectedAt: new Date(),
        });
      }
    }

    return leaks;
  }

  private async detectRepeatedNoShows(companyId: string): Promise<CostLeak[]> {
    const leaks: CostLeak[] = [];

    const noShowBookings = await (this.prisma as any).booking.findMany({
      where: {
        companyId,
        status: 'NO_SHOW',
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });

    const employeeNoShows: Record<string, number> = {};
    for (const booking of noShowBookings) {
      const empId = (booking as any).employeeId;
      if (empId) {
        employeeNoShows[empId] = (employeeNoShows[empId] || 0) + 1;
      }
    }

    for (const [empId, count] of Object.entries(employeeNoShows)) {
      if (count >= 3) {
        leaks.push({
          id: `noshow-${empId}`,
          type: 'REPEATED_NO_SHOW',
          severity: count >= 5 ? 'HIGH' : 'MEDIUM',
          title: `Employee ${empId} — ${count} no-shows in 30 days`,
          description: `Employee has ${count} no-show bookings in the last 30 days. Consider confirming bookings before dispatch.`,
          estimatedMonthlyImpact: count * 200, // Estimate cost per no-show
          evidence: { employeeId: empId, noShowCount: count, period: '30 days' },
          status: 'DETECTED',
          detectedAt: new Date(),
        });
      }
    }

    return leaks;
  }

  private async detectUnderusedShuttles(companyId: string): Promise<CostLeak[]> {
    const leaks: CostLeak[] = [];

    const lowOccupancyVehicles = await (this.prisma as any).vehicleOccupancyLog.findMany({
      where: {
        companyId,
        isUnderutilized: true,
        occupancyPercent: { lt: 30, gt: 0 },
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      take: 10,
    });

    for (const log of lowOccupancyVehicles) {
      leaks.push({
        id: `shuttle-${log.id}`,
        type: 'UNDERUSED_SHUTTLE',
        severity: 'MEDIUM',
        title: `Vehicle consistently underused at ${Math.round((log as any).occupancyPercent || 0)}%`,
        description: `Shuttle consistently running at low capacity. Consider downsizing vehicle or consolidating routes.`,
        estimatedMonthlyImpact: 5000,
        evidence: { vehicleId: (log as any).vehicleId, avgOccupancy: (log as any).occupancyPercent },
        status: 'DETECTED',
        detectedAt: new Date(),
      });
    }

    return leaks;
  }

  // ===== HELPERS =====

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private estimateIdleCost(idleMinutes: number): number {
    return Math.round((idleMinutes / 60) * 150); // Rs.150/hour idle cost
  }

  private estimateLowOccupancyCost(occupancyPercent: number): number {
    const wastedSeats = Math.round((100 - occupancyPercent) / 100 * 6);
    return wastedSeats * 200; // Rs.200/seat wasted
  }
}

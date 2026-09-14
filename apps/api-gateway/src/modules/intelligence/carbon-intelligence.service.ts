import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

const EMISSION_FACTORS: Record<string, number> = {
  DIESEL: 2.68,    // kg CO2 per liter
  PETROL: 2.31,
  CNG: 2.02,
  ELECTRIC: 0.05,  // grid average
  HYBRID: 1.50,
};

const FUEL_CONSUMPTION: Record<string, number> = {
  DIESEL: 8,    // km per liter
  PETROL: 12,
  CNG: 15,
  ELECTRIC: 5,  // km per kWh
  HYBRID: 16,
};

export interface CarbonMetrics {
  totalCo2Kg: number;
  totalCo2Tonnes: number;
  co2PerEmployee: number;
  co2PerTrip: number;
  co2PerKm: number;
  evUtilization: number;
  iceUtilization: number;
  sharedTripPercent: number;
  emptySeatEmissions: number;
  byFuelType: Record<string, { trips: number; co2Kg: number }>;
  trend: { period: string; co2Kg: number; trips: number }[];
}

export interface CarbonOptimization {
  type: string;
  description: string;
  currentCo2Kg: number;
  potentialCo2Kg: number;
  reductionKg: number;
  reductionPercent: number;
  affectedTrips: number;
  estimatedSaving: number;
}

@Injectable()
export class CarbonIntelligenceService {
  private readonly logger = new Logger(CarbonIntelligenceService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async getCarbonMetrics(companyId: string, period?: string): Promise<CarbonMetrics> {
    const targetPeriod = period || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const periodStart = new Date(`${targetPeriod}-01`);
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const [trips, employees, occupancyLogs] = await Promise.all([
      (this.prisma as any).trip.findMany({
        where: { companyId, createdAt: { gte: periodStart, lt: periodEnd }, status: 'COMPLETED' },
        select: { id: true, totalDistance: true, vehicleId: true, vendorId: true, totalPassengers: true, type: true },
      }),
      (this.prisma as any).user.count({ where: { companyId, transportEnabled: true } }),
      (this.prisma as any).vehicleOccupancyLog.findMany({
        where: { companyId, createdAt: { gte: periodStart, lt: periodEnd } },
        select: { occupancyPercent: true, totalSeats: true, occupiedSeats: true },
      }).catch(() => []),
    ]);

    // Get vehicle fuel types
    const vehicleIds = [...new Set(trips.map((t: any) => t.vehicleId).filter(Boolean))];
    const vehicles = await (this.prisma as any).vehicle.findMany({
      where: { id: { in: vehicleIds } },
      select: { id: true, fuelType: true },
    });
    const vehicleFuelMap: Record<string, string> = {};
    for (const v of vehicles) {
      vehicleFuelMap[v.id] = v.fuelType || 'DIESEL';
    }

    // Calculate emissions per trip
    let totalCo2Kg = 0;
    const byFuelType: Record<string, { trips: number; co2Kg: number }> = {};

    for (const trip of trips) {
      const fuelType = vehicleFuelMap[trip.vehicleId] || 'DIESEL';
      const distance = trip.totalDistance || 10; // Default 10km
      const consumption = FUEL_CONSUMPTION[fuelType] || FUEL_CONSUMPTION.DIESEL;
      const emissionFactor = EMISSION_FACTORS[fuelType] || EMISSION_FACTORS.DIESEL;

      const fuelUsed = distance / consumption;
      const co2 = fuelUsed * emissionFactor;
      totalCo2Kg += co2;

      if (!byFuelType[fuelType]) byFuelType[fuelType] = { trips: 0, co2Kg: 0 };
      byFuelType[fuelType].trips += 1;
      byFuelType[fuelType].co2Kg += co2;
    }

    // EV utilization
    const evTrips = trips.filter((t: any) => {
      const fuel = vehicleFuelMap[t.vehicleId];
      return fuel === 'ELECTRIC' || fuel === 'HYBRID';
    });
    const evUtilization = trips.length > 0 ? (evTrips.length / trips.length) * 100 : 0;
    const iceUtilization = 100 - evUtilization;

    // Shared trip percentage
    const sharedTrips = trips.filter((t: any) => (t.totalPassengers || 0) > 1);
    const sharedTripPercent = trips.length > 0 ? (sharedTrips.length / trips.length) * 100 : 0;

    // Empty seat emissions
    const avgOccupancy = occupancyLogs.length > 0
      ? occupancyLogs.reduce((sum: number, l: any) => sum + (l.occupancyPercent || 0), 0) / occupancyLogs.length
      : 50;
    const emptySeatPercent = Math.max(0, 100 - avgOccupancy);
    const emptySeatEmissions = totalCo2Kg * (emptySeatPercent / 100);

    // Per-metric calculations
    const totalKm = trips.reduce((sum: number, t: any) => sum + (t.totalDistance || 10), 0);
    const co2PerEmployee = employees > 0 ? totalCo2Kg / employees : 0;
    const co2PerTrip = trips.length > 0 ? totalCo2Kg / trips.length : 0;
    const co2PerKm = totalKm > 0 ? totalCo2Kg / totalKm : 0;

    // Trend (last 6 months)
    const trend = await this.getCarbonTrend(companyId, 6);

    return {
      totalCo2Kg: Math.round(totalCo2Kg),
      totalCo2Tonnes: Math.round(totalCo2Kg / 1000 * 100) / 100,
      co2PerEmployee: Math.round(co2PerEmployee * 100) / 100,
      co2PerTrip: Math.round(co2PerTrip * 100) / 100,
      co2PerKm: Math.round(co2PerKm * 1000) / 1000,
      evUtilization: Math.round(evUtilization),
      iceUtilization: Math.round(iceUtilization),
      sharedTripPercent: Math.round(sharedTripPercent),
      emptySeatEmissions: Math.round(emptySeatEmissions),
      byFuelType,
      trend,
    };
  }

  async getCarbonOptimizations(companyId: string): Promise<CarbonOptimization[]> {
    const optimizations: CarbonOptimization[] = [];

    // 1. Trip clubbing opportunities
    const clubbing = await this.detectClubbingOpportunities(companyId);
    optimizations.push(...clubbing);

    // 2. EV switch opportunities
    const evSwitch = await this.detectEVSwithOpportunities(companyId);
    optimizations.push(...evSwitch);

    // 3. Route optimization
    const routeOpt = await this.detectRouteOptimizations(companyId);
    optimizations.push(...routeOpt);

    // Store opportunities
    for (const opt of optimizations) {
      const existing = await (this.prisma as any).carbonReductionOpportunity.findFirst({
        where: { companyId, type: opt.type, status: { not: 'IMPLEMENTED' } },
      });

      if (!existing) {
        await (this.prisma as any).carbonReductionOpportunity.create({
          data: {
            companyId,
            type: opt.type,
            description: opt.description,
            currentCo2Kg: opt.currentCo2Kg,
            potentialCo2Kg: opt.potentialCo2Kg,
            reductionKg: opt.reductionKg,
            reductionPercent: opt.reductionPercent,
            affectedTrips: opt.affectedTrips,
            estimatedSaving: opt.estimatedSaving,
            status: 'DETECTED',
          },
        });
      }
    }

    return optimizations;
  }

  async acceptOptimization(companyId: string, opportunityId: string, userId: string) {
    await (this.prisma as any).carbonReductionOpportunity.update({
      where: { id: opportunityId },
      data: { status: 'ACCEPTED' },
    });

    await this.audit.log({
      userId, action: 'CARBON_OPTIMIZATION_ACCEPTED', entity: 'CarbonReductionOpportunity',
      entityId: opportunityId, companyId,
    });

    return { success: true };
  }

  private async detectClubbingOpportunities(companyId: string): Promise<CarbonOptimization[]> {
    const optimizations: CarbonOptimization[] = [];

    // Find trips with similar routes and times
    const recentTrips = await (this.prisma as any).trip.findMany({
      where: {
        companyId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        status: { in: ['SCHEDULED', 'COMPLETED'] },
      },
      select: { id: true, pickupLatitude: true, pickupLongitude: true, dropLatitude: true, dropLongitude: true, scheduledPickupTime: true, totalDistance: true, totalPassengers: true },
    });

    let clubbableTrips = 0;
    let potentialSaving = 0;

    for (let i = 0; i < recentTrips.length; i++) {
      for (let j = i + 1; j < recentTrips.length; j++) {
        const a = recentTrips[i];
        const b = recentTrips[j];
        if (!a.pickupLatitude || !b.pickupLatitude) continue;

        const pickupDist = this.haversine(a.pickupLatitude, a.pickupLongitude, b.pickupLatitude, b.pickupLongitude);
        const dropDist = this.haversine(a.dropLatitude, a.dropLongitude, b.dropLatitude, b.dropLongitude);
        const timeDiff = Math.abs(new Date(a.scheduledPickupTime).getTime() - new Date(b.scheduledPickupTime).getTime()) / 60000;

        if (pickupDist < 2 && dropDist < 2 && timeDiff < 30) {
          clubbableTrips += 1;
          potentialSaving += (a.totalDistance || 10) * 0.3;
        }
      }
    }

    if (clubbableTrips > 0) {
      const co2Reduction = clubbableTrips * 2.5; // ~2.5 kg CO2 saved per clubbed trip
      optimizations.push({
        type: 'CLUBBING',
        description: `${clubbableTrips} trips can be combined based on similar routes and timing`,
        currentCo2Kg: clubbableTrips * 5,
        potentialCo2Kg: clubbableTrips * 2.5,
        reductionKg: co2Reduction,
        reductionPercent: 50,
        affectedTrips: clubbableTrips,
        estimatedSaving: Math.round(potentialSaving * 15),
      });
    }

    return optimizations;
  }

  private async detectEVSwithOpportunities(companyId: string): Promise<CarbonOptimization[]> {
    const optimizations: CarbonOptimization[] = [];

    const dieselTrips = await (this.prisma as any).trip.findMany({
      where: {
        companyId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        status: 'COMPLETED',
      },
      include: { Vehicle: { select: { fuelType: true } } },
    });

    const nonEvTrips = dieselTrips.filter((t: any) => {
      const fuel = (t as any).Vehicle?.fuelType;
      return fuel && fuel !== 'ELECTRIC' && fuel !== 'HYBRID';
    });

    if (nonEvTrips.length > 5) {
      const currentCo2 = nonEvTrips.length * 5;
      const evCo2 = nonEvTrips.length * 0.5;
      optimizations.push({
        type: 'EV_SWITCH',
        description: `${nonEvTrips.length} diesel/petrol trips could switch to EV, reducing emissions by ${Math.round(currentCo2 - evCo2)} kg CO2`,
        currentCo2Kg: currentCo2,
        potentialCo2Kg: evCo2,
        reductionKg: currentCo2 - evCo2,
        reductionPercent: 90,
        affectedTrips: nonEvTrips.length,
        estimatedSaving: 0,
      });
    }

    return optimizations;
  }

  private async detectRouteOptimizations(companyId: string): Promise<CarbonOptimization[]> {
    const optimizations: CarbonOptimization[] = [];

    const deviatedTrips = await (this.prisma as any).routeDeviation.findMany({
      where: {
        companyId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        deviationKm: { gt: 3 },
      },
    });

    if (deviatedTrips.length > 3) {
      const extraKm = deviatedTrips.reduce((sum: number, d: any) => sum + ((d as any).deviationKm || 0), 0);
      const co2Reduction = extraKm * 0.25;
      optimizations.push({
        type: 'ROUTE_OPTIMIZATION',
        description: `${deviatedTrips.length} trips had significant route deviations (${Math.round(extraKm)} km extra). Better routing could save ${Math.round(co2Reduction)} kg CO2.`,
        currentCo2Kg: extraKm * 0.25,
        potentialCo2Kg: 0,
        reductionKg: co2Reduction,
        reductionPercent: 100,
        affectedTrips: deviatedTrips.length,
        estimatedSaving: Math.round(extraKm * 15),
      });
    }

    return optimizations;
  }

  private async getCarbonTrend(companyId: string, months: number) {
    const trend: { period: string; co2Kg: number; trips: number }[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const start = new Date();
      start.setMonth(start.getMonth() - i, 1);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);

      const trips = await (this.prisma as any).trip.findMany({
        where: { companyId, createdAt: { gte: start, lt: end }, status: 'COMPLETED' },
        select: { totalDistance: true },
      });

      const totalKm = trips.reduce((sum: number, t: any) => sum + (t.totalDistance || 10), 0);
      const co2Kg = totalKm * 0.25; // Average emission factor

      trend.push({
        period: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
        co2Kg: Math.round(co2Kg),
        trips: trips.length,
      });
    }

    return trend;
  }

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}

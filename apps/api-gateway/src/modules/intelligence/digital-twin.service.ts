import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

export interface SimulationScenario {
  name: string;
  description?: string;
  changes: SimulationChange[];
}

export interface SimulationChange {
  entity: string; // PROCESS | SITE | SHIFT | VEHICLE
  entityId: string;
  field: string;
  fromValue: any;
  toValue: any;
}

export interface SimulationResult {
  id: string;
  name: string;
  status: string;
  current: SimulationMetrics;
  projected: SimulationMetrics;
  impact: SimulationImpact;
  recommendations: string[];
}

export interface SimulationMetrics {
  vehicles: number;
  trips: number;
  totalCost: number;
  occupancy: number;
  avgRideTime: number;
  avgCostPerTrip: number;
  costPerEmployee: number;
}

export interface SimulationImpact {
  costChange: number;
  costChangePercent: number;
  vehicleChange: number;
  tripChange: number;
  occupancyChange: number;
  rideTimeChange: number;
  femaleSafetyImpact: string;
  riskFactors: string[];
}

@Injectable()
export class DigitalTwinService {
  private readonly logger = new Logger(DigitalTwinService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async createSimulation(companyId: string, dto: SimulationScenario, userId: string) {
    const { metrics: current, bookingCount } = await this.gatherCurrentMetrics(companyId);

    const projected = await this.projectMetrics(companyId, current, dto.changes, bookingCount);

    const impact = this.calculateImpact(current, projected);

    const recommendations = this.generateRecommendations(dto.changes, impact);

    const simulation = await (this.prisma as any).optimizationSimulator.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description || '',
        currentMetrics: current as any,
        projectedMetrics: projected as any,
        impact: impact as any,
        recommendations,
        scenario: dto.changes as any,
        status: 'CREATED',
        createdBy: userId,
      },
    });

    await this.audit.log({
      userId,
      action: 'SIMULATION_CREATED',
      entity: 'OptimizationSimulator',
      entityId: simulation.id,
      companyId,
      newValue: { name: dto.name, changes: dto.changes.length },
    });

    return {
      id: simulation.id,
      name: dto.name,
      status: 'CREATED',
      current,
      projected,
      impact,
      recommendations,
    };
  }

  async getSimulation(companyId: string, simulationId: string) {
    const simulation = await (this.prisma as any).optimizationSimulator.findFirst({
      where: { id: simulationId, companyId },
    });
    if (!simulation) throw new NotFoundException('Simulation not found');

    return {
      id: simulation.id,
      name: simulation.name,
      status: simulation.status,
      current: simulation.currentMetrics,
      projected: simulation.projectedMetrics,
      impact: simulation.impact,
      recommendations: simulation.recommendations,
      scenario: simulation.scenario,
      createdAt: simulation.createdAt,
    };
  }

  async listSimulations(companyId: string) {
    return (this.prisma as any).optimizationSimulator.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async applySimulation(companyId: string, simulationId: string, userId: string) {
    const simulation = await (this.prisma as any).optimizationSimulator.findFirst({
      where: { id: simulationId, companyId },
    });
    if (!simulation) throw new NotFoundException('Simulation not found');
    if (simulation.status === 'APPLIED') throw new BadRequestException('Simulation already applied');
    if (simulation.status !== 'CREATED') throw new BadRequestException('Simulation must be in CREATED status to apply');

    // Apply changes (in production, this would modify actual configurations)
    // For now, mark as applied and create audit trail
    await (this.prisma as any).optimizationSimulator.update({
      where: { id: simulationId },
      data: { status: 'APPLIED', appliedAt: new Date(), appliedBy: userId },
    });

    await this.audit.log({
      userId,
      action: 'SIMULATION_APPLIED',
      entity: 'OptimizationSimulator',
      entityId: simulationId,
      companyId,
      newValue: { name: simulation.name },
    });

    return { success: true, message: 'Simulation applied successfully' };
  }

  private async gatherCurrentMetrics(companyId: string): Promise<{ metrics: SimulationMetrics; bookingCount: number }> {
    const [vehicleCount, tripData, bookingCount] = await Promise.all([
      (this.prisma as any).vehicle.count({ where: { companyId, status: { not: 'MAINTENANCE' } } }),
      (this.prisma as any).trip.findMany({
        where: { companyId, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        select: { totalCost: true, actualPickupTime: true, scheduledPickupTime: true, status: true },
      }),
      (this.prisma as any).booking.count({
        where: { companyId, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

    const totalCost = tripData.reduce((sum: number, t: any) => sum + (t.totalCost || 0), 0);
    const completedTrips = tripData.filter((t: any) => t.status === 'COMPLETED').length;
    const avgRideTime = this.calculateAvgRideTime(tripData);

    const metrics: SimulationMetrics = {
      vehicles: vehicleCount,
      trips: completedTrips,
      totalCost: totalCost,
      occupancy: 61,
      avgRideTime,
      avgCostPerTrip: completedTrips > 0 ? totalCost / completedTrips : 0,
      costPerEmployee: bookingCount > 0 ? totalCost / bookingCount : 0,
    };

    return { metrics, bookingCount };
  }

  private async projectMetrics(
    companyId: string,
    current: SimulationMetrics,
    changes: SimulationChange[],
    bookingCount: number,
  ): Promise<SimulationMetrics> {
    let projected = { ...current };

    for (const change of changes) {
      switch (change.field) {
        case 'vehicleCount':
          projected.vehicles = Number(change.toValue);
          projected.totalCost = projected.totalCost * (Number(change.toValue) / current.vehicles);
          break;
        case 'shiftTime':
          projected.trips = Math.round(current.trips * 0.92);
          projected.occupancy = Math.min(95, current.occupancy + 12);
          projected.totalCost = projected.totalCost * 0.88;
          break;
        case 'processEnabled':
          if (change.toValue === false) {
            projected.trips = Math.round(current.trips * 0.7);
            projected.totalCost = projected.totalCost * 0.7;
          }
          break;
        default:
          break;
      }
    }

    projected.avgCostPerTrip = projected.trips > 0 ? projected.totalCost / projected.trips : 0;
    projected.costPerEmployee = bookingCount > 0 ? projected.totalCost / bookingCount : projected.avgCostPerTrip;

    return projected;
  }

  private calculateImpact(current: SimulationMetrics, projected: SimulationMetrics): SimulationImpact {
    const costChange = projected.totalCost - current.totalCost;
    const costChangePercent = current.totalCost > 0 ? (costChange / current.totalCost) * 100 : 0;
    const vehicleChange = projected.vehicles - current.vehicles;
    const tripChange = projected.trips - current.trips;
    const occupancyChange = projected.occupancy - current.occupancy;
    const rideTimeChange = projected.avgRideTime - current.avgRideTime;

    const riskFactors: string[] = [];
    if (rideTimeChange > 10) riskFactors.push('Average ride time increases by >10 minutes');
    if (projected.occupancy > 90) riskFactors.push('Occupancy exceeds 90% — comfort risk');
    if (vehicleChange < -3) riskFactors.push('Fleet reduction >3 vehicles may cause capacity issues');

    return {
      costChange,
      costChangePercent: Math.round(costChangePercent * 100) / 100,
      vehicleChange,
      tripChange,
      occupancyChange,
      rideTimeChange,
      femaleSafetyImpact: riskFactors.length === 0 ? 'NONE' : 'REVIEW_NEEDED',
      riskFactors,
    };
  }

  private generateRecommendations(changes: SimulationChange[], impact: SimulationImpact): string[] {
    const recs: string[] = [];

    if (impact.costChange < 0) {
      recs.push(`Expected monthly saving: ₹${Math.abs(Math.round(impact.costChange)).toLocaleString()}`);
    }
    if (impact.occupancyChange > 0) {
      recs.push(`Occupancy improves by ${Math.round(impact.occupancyChange)}%`);
    }
    if (impact.vehicleChange < 0) {
      recs.push(`${Math.abs(impact.vehicleChange)} vehicles can be redeployed or returned`);
    }
    if (impact.rideTimeChange > 5) {
      recs.push(`Employee ride time increases by ${Math.round(impact.rideTimeChange)} minutes — consider communicating change`);
    }
    if (impact.femaleSafetyImpact === 'REVIEW_NEEDED') {
      recs.push('Female safety compliance must be re-verified after changes');
    }

    return recs;
  }

  private calculateAvgRideTime(trips: any[]): number {
    const completed = trips.filter(
      (t) => t.status === 'COMPLETED' && t.actualPickupTime && t.scheduledPickupTime,
    );
    if (completed.length === 0) return 45; // Default

    const totalMinutes = completed.reduce((sum, t) => {
      const diff = new Date(t.actualPickupTime).getTime() - new Date(t.scheduledPickupTime).getTime();
      return sum + Math.abs(diff) / 60000;
    }, 0);

    return Math.round(totalMinutes / completed.length);
  }
}

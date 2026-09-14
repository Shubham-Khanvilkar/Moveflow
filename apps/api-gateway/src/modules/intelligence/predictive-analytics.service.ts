import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

export interface NoShowPrediction {
  employeeId: string;
  employeeName: string;
  riskScore: number;
  riskLevel: string;
  factors: { factor: string; weight: number; contribution: number }[];
  recommendation: string;
  confidence: number;
  historicalData: {
    totalBookings: number;
    noShows: number;
    lateCancellations: number;
    avgConfirmationTime: number;
  };
}

export interface BreakdownPrediction {
  vehicleId: string;
  registrationNo: string;
  riskScore: number;
  riskLevel: string;
  factors: { factor: string; weight: number; contribution: number }[];
  recommendation: string;
  confidence: number;
  vehicleData: {
    age: number;
    totalTrips: number;
    lastMaintenance: Date | null;
    avgDailyKm: number;
  };
}

export interface SLARiskPrediction {
  tripId: string;
  riskScore: number;
  riskLevel: string;
  factors: { factor: string; weight: number; contribution: number }[];
  recommendation: string;
  confidence: number;
  tripData: {
    status: string;
    driverId: string;
    vehicleId: string;
    scheduledPickup: Date;
    currentEta: number;
    routeDeviation: number;
  };
}

@Injectable()
export class PredictiveAnalyticsService {
  private readonly logger = new Logger(PredictiveAnalyticsService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async predictNoShow(companyId: string, employeeId: string): Promise<NoShowPrediction> {
    const employee = await (this.prisma as any).user.findFirst({
      where: { id: employeeId, companyId },
      select: { id: true, name: true, email: true },
    });
    if (!employee) return this.defaultNoShowPrediction(employeeId);

    // Get booking history
    const bookings = await (this.prisma as any).booking.findMany({
      where: { companyId, employeeId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const totalBookings = bookings.length;
    const noShows = bookings.filter((b: any) => b.status === 'NO_SHOW').length;
    const lateCancellations = bookings.filter((b: any) => {
      if (b.status !== 'CANCELLED') return false;
      const pickupTime = new Date(b.scheduledPickupTime).getTime();
      const cancelTime = new Date(b.updatedAt).getTime();
      return (pickupTime - cancelTime) < 60 * 60 * 1000; // < 1 hour before pickup
    }).length;

    const confirmationTimes = bookings
      .filter((b: any) => b.confirmedAt)
      .map((b: any) => new Date(b.confirmedAt).getTime() - new Date(b.createdAt).getTime());
    const avgConfirmationTime = confirmationTimes.length > 0
      ? confirmationTimes.reduce((a, b) => a + b, 0) / confirmationTimes.length / 60000
      : 0;

    // Calculate risk score
    const factors = [];
    let riskScore = 0;

    // Factor 1: Historical no-show rate (weight: 40%)
    const noShowRate = totalBookings > 0 ? noShows / totalBookings : 0;
    const noShowContribution = noShowRate * 100 * 0.4;
    factors.push({ factor: 'Historical No-Show Rate', weight: 40, contribution: Math.round(noShowContribution) });
    riskScore += noShowContribution;

    // Factor 2: Late cancellation rate (weight: 25%)
    const lateCancelRate = totalBookings > 0 ? lateCancellations / totalBookings : 0;
    const lateCancelContribution = lateCancelRate * 100 * 0.25;
    factors.push({ factor: 'Late Cancellation Rate', weight: 25, contribution: Math.round(lateCancelContribution) });
    riskScore += lateCancelContribution;

    // Factor 3: Confirmation delay (weight: 20%)
    const confirmDelayScore = avgConfirmationTime > 120 ? 80 : avgConfirmationTime > 60 ? 50 : 20;
    const confirmContribution = confirmDelayScore * 0.2;
    factors.push({ factor: 'Confirmation Delay', weight: 20, contribution: Math.round(confirmContribution) });
    riskScore += confirmContribution;

    // Factor 4: Booking frequency (weight: 15%)
    const recentBookings = bookings.filter((b: any) =>
      new Date(b.createdAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
    ).length;
    const freqScore = recentBookings < 2 ? 70 : recentBookings < 4 ? 40 : 15;
    const freqContribution = freqScore * 0.15;
    factors.push({ factor: 'Booking Frequency', weight: 15, contribution: Math.round(freqContribution) });
    riskScore += freqContribution;

    const riskLevel = riskScore >= 70 ? 'CRITICAL' : riskScore >= 50 ? 'HIGH' : riskScore >= 30 ? 'MEDIUM' : 'LOW';
    const recommendation = this.getNoShowRecommendation(riskLevel, noShows, totalBookings);

    const prediction = {
      employeeId,
      employeeName: employee.name || employeeId,
      riskScore: Math.round(Math.min(100, riskScore)),
      riskLevel,
      factors,
      recommendation,
      confidence: Math.min(0.95, 0.3 + (totalBookings / 20) * 0.65),
      historicalData: { totalBookings, noShows, lateCancellations, avgConfirmationTime: Math.round(avgConfirmationTime) },
    };

    // Store prediction
    await this.storePrediction(companyId, 'NO_SHOW', employeeId, 'EMPLOYEE', prediction);

    return prediction;
  }

  async predictBreakdown(companyId: string, vehicleId: string): Promise<BreakdownPrediction> {
    const vehicle = await (this.prisma as any).vehicle.findFirst({
      where: { id: vehicleId, companyId },
    });
    if (!vehicle) return this.defaultBreakdownPrediction(vehicleId);

    // Get trip history
    const trips = await (this.prisma as any).trip.findMany({
      where: { companyId, vehicleId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const totalTrips = trips.length;
    const age = vehicle.manufacturingYear
      ? new Date().getFullYear() - vehicle.manufacturingYear
      : 3;

    // Get last maintenance
    const lastMaintenance = await (this.prisma as any).maintenanceRecord.findFirst({
      where: { vehicleId, companyId },
      orderBy: { createdAt: 'desc' },
    });

    const daysSinceMaintenance = lastMaintenance
      ? Math.floor((Date.now() - new Date(lastMaintenance.createdAt).getTime()) / (24 * 60 * 60 * 1000))
      : 365;

    // Calculate daily KM
    const recentTrips = trips.filter((t) =>
      new Date(t.createdAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
    );
    const weeklyKm = recentTrips.reduce((sum, t) => sum + ((t as any).totalDistance || 0), 0);
    const avgDailyKm = weeklyKm / 7;

    const factors = [];
    let riskScore = 0;

    // Factor 1: Vehicle age (weight: 30%)
    const ageScore = age > 7 ? 80 : age > 5 ? 50 : age > 3 ? 25 : 10;
    const ageContribution = ageScore * 0.3;
    factors.push({ factor: 'Vehicle Age', weight: 30, contribution: Math.round(ageContribution) });
    riskScore += ageContribution;

    // Factor 2: Days since maintenance (weight: 30%)
    const maintScore = daysSinceMaintenance > 90 ? 80 : daysSinceMaintenance > 60 ? 50 : daysSinceMaintenance > 30 ? 25 : 10;
    const maintContribution = maintScore * 0.3;
    factors.push({ factor: 'Maintenance Interval', weight: 30, contribution: Math.round(maintContribution) });
    riskScore += maintContribution;

    // Factor 3: Daily usage intensity (weight: 20%)
    const usageScore = avgDailyKm > 200 ? 70 : avgDailyKm > 150 ? 45 : avgDailyKm > 100 ? 25 : 15;
    const usageContribution = usageScore * 0.2;
    factors.push({ factor: 'Usage Intensity', weight: 20, contribution: Math.round(usageContribution) });
    riskScore += usageContribution;

    // Factor 4: Trip completion rate (weight: 20%)
    const completedTrips = trips.filter((t) => t.status === 'COMPLETED').length;
    const completionRate = totalTrips > 0 ? completedTrips / totalTrips : 1;
    const completionScore = completionRate < 0.85 ? 70 : completionRate < 0.95 ? 35 : 10;
    const completionContribution = completionScore * 0.2;
    factors.push({ factor: 'Trip Completion Rate', weight: 20, contribution: Math.round(completionContribution) });
    riskScore += completionContribution;

    const riskLevel = riskScore >= 70 ? 'CRITICAL' : riskScore >= 50 ? 'HIGH' : riskScore >= 30 ? 'MEDIUM' : 'LOW';
    const recommendation = this.getBreakdownRecommendation(riskLevel, age, daysSinceMaintenance, avgDailyKm);

    const prediction = {
      vehicleId,
      registrationNo: vehicle.registrationNo || vehicleId,
      riskScore: Math.round(Math.min(100, riskScore)),
      riskLevel,
      factors,
      recommendation,
      confidence: Math.min(0.9, 0.4 + (totalTrips / 50) * 0.5),
      vehicleData: { age, totalTrips, lastMaintenance: lastMaintenance?.createdAt || null, avgDailyKm: Math.round(avgDailyKm) },
    };

    await this.storePrediction(companyId, 'BREAKDOWN_RISK', vehicleId, 'VEHICLE', prediction);

    return prediction;
  }

  async predictSLARisk(companyId: string, tripId: string): Promise<SLARiskPrediction> {
    const trip = await (this.prisma as any).trip.findFirst({
      where: { id: tripId, companyId },
    });
    if (!trip) return this.defaultSLARiskPrediction(tripId);

    const factors = [];
    let riskScore = 0;

    // Factor 1: Current delay (weight: 35%)
    const scheduledTime = new Date(trip.scheduledPickupTime).getTime();
    const now = Date.now();
    const delayMinutes = trip.status === 'IN_TRANSIT'
      ? Math.max(0, (now - scheduledTime) / 60000 - 30) // 30 min buffer
      : 0;
    const delayScore = delayMinutes > 30 ? 80 : delayMinutes > 15 ? 50 : delayMinutes > 5 ? 25 : 5;
    const delayContribution = delayScore * 0.35;
    factors.push({ factor: 'Current Delay', weight: 35, contribution: Math.round(delayContribution) });
    riskScore += delayContribution;

    // Factor 2: Route deviation (weight: 25%)
    const deviations = await (this.prisma as any).routeDeviation.findMany({
      where: { tripId, companyId },
    });
    const maxDeviation = deviations.reduce((max: number, d: any) => Math.max(max, (d as any).deviationKm || 0), 0);
    const deviationScore = maxDeviation > 10 ? 80 : maxDeviation > 5 ? 50 : maxDeviation > 2 ? 25 : 5;
    const deviationContribution = deviationScore * 0.25;
    factors.push({ factor: 'Route Deviation', weight: 25, contribution: Math.round(deviationContribution) });
    riskScore += deviationContribution;

    // Factor 3: Driver reliability (weight: 20%)
    const driverTrips = await (this.prisma as any).driverTrip.findMany({
      where: { driverId: trip.driverId, companyId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const onTimeRate = driverTrips.length > 0
      ? driverTrips.filter((t: any) => t.status === 'COMPLETED').length / driverTrips.length
      : 0.9;
    const driverScore = onTimeRate < 0.8 ? 70 : onTimeRate < 0.9 ? 35 : 10;
    const driverContribution = driverScore * 0.2;
    factors.push({ factor: 'Driver Reliability', weight: 20, contribution: Math.round(driverContribution) });
    riskScore += driverContribution;

    // Factor 4: Vehicle condition (weight: 20%)
    const vehiclePrediction = await this.predictBreakdown(companyId, trip.vehicleId);
    const vehicleScore = vehiclePrediction.riskScore;
    const vehicleContribution = vehicleScore * 0.2;
    factors.push({ factor: 'Vehicle Condition', weight: 20, contribution: Math.round(vehicleContribution) });
    riskScore += vehicleContribution;

    const riskLevel = riskScore >= 70 ? 'CRITICAL' : riskScore >= 50 ? 'HIGH' : riskScore >= 30 ? 'MEDIUM' : 'LOW';
    const recommendation = this.getSLARecommendation(riskLevel, delayMinutes, maxDeviation);

    const prediction = {
      tripId,
      riskScore: Math.round(Math.min(100, riskScore)),
      riskLevel,
      factors,
      recommendation,
      confidence: 0.75,
      tripData: {
        status: trip.status,
        driverId: trip.driverId,
        vehicleId: trip.vehicleId,
        scheduledPickup: trip.scheduledPickupTime,
        currentEta: Math.round(delayMinutes + 30),
        routeDeviation: maxDeviation,
      },
    };

    await this.storePrediction(companyId, 'SLA_RISK', tripId, 'TRIP', prediction);

    return prediction;
  }

  async getPredictions(companyId: string, type?: string) {
    const where: any = { companyId };
    if (type) where.type = type;

    return (this.prisma as any).predictionResult.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getPredictionSummary(companyId: string) {
    const predictions = await (this.prisma as any).predictionResult.findMany({
      where: { companyId, expiresAt: { gt: new Date() } },
    });

    const byType: Record<string, number> = {};
    const byRisk: Record<string, number> = {};
    for (const p of predictions) {
      byType[p.type] = (byType[p.type] || 0) + 1;
      byRisk[p.riskLevel] = (byRisk[p.riskLevel] || 0) + 1;
    }

    return {
      total: predictions.length,
      byType,
      byRisk,
      highRiskCount: (byRisk['HIGH'] || 0) + (byRisk['CRITICAL'] || 0),
    };
  }

  // ===== HELPERS =====

  private async storePrediction(companyId: string, type: string, entityId: string, entityType: string, prediction: any) {
    // Upsert prediction
    const existing = await (this.prisma as any).predictionResult.findFirst({
      where: { companyId, type, entityId, entityType },
    });

    if (existing) {
      await (this.prisma as any).predictionResult.update({
        where: { id: existing.id },
        data: {
          riskScore: prediction.riskScore,
          riskLevel: prediction.riskLevel,
          factors: prediction.factors,
          recommendation: prediction.recommendation,
          confidence: prediction.confidence,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    } else {
      await (this.prisma as any).predictionResult.create({
        data: {
          companyId,
          type,
          entityId,
          entityType,
          riskScore: prediction.riskScore,
          riskLevel: prediction.riskLevel,
          factors: prediction.factors,
          recommendation: prediction.recommendation,
          confidence: prediction.confidence,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  private getNoShowRecommendation(level: string, noShows: number, total: number): string {
    if (level === 'CRITICAL') return `High risk (${noShows}/${total} historical no-shows). Confirm employee 2 hours before dispatch and send reminder.`;
    if (level === 'HIGH') return `Moderate risk. Send confirmation SMS 1 hour before pickup and verify attendance.`;
    if (level === 'MEDIUM') return `Some risk detected. Standard booking confirmation is sufficient.`;
    return `Low risk. No special action needed.`;
  }

  private getBreakdownRecommendation(level: string, age: number, daysSinceMaint: number, avgDailyKm: number): string {
    if (level === 'CRITICAL') return `Immediate inspection recommended. Vehicle is ${age} years old with ${daysSinceMaint} days since last service.`;
    if (level === 'HIGH') return `Schedule maintenance within 1 week. Vehicle showing high usage patterns.`;
    if (level === 'MEDIUM') return `Monitor vehicle. Next scheduled maintenance should not be delayed.`;
    return `Vehicle in good condition. Continue regular maintenance schedule.`;
  }

  private getSLARecommendation(level: string, delayMinutes: number, deviation: number): string {
    if (level === 'CRITICAL') return `SLA breach imminent. Reassign driver or notify passengers of delay.`;
    if (level === 'HIGH') return `Risk of delay. Monitor closely and prepare backup vehicle.`;
    if (level === 'MEDIUM') return `Minor delay risk. Current ETA within acceptable range.`;
    return `On track. No SLA concerns.`;
  }

  private defaultNoShowPrediction(employeeId: string): NoShowPrediction {
    return {
      employeeId,
      employeeName: employeeId,
      riskScore: 20,
      riskLevel: 'LOW',
      factors: [{ factor: 'Insufficient Data', weight: 100, contribution: 20 }],
      recommendation: 'Insufficient historical data. Defaulting to low risk.',
      confidence: 0.3,
      historicalData: { totalBookings: 0, noShows: 0, lateCancellations: 0, avgConfirmationTime: 0 },
    };
  }

  private defaultBreakdownPrediction(vehicleId: string): BreakdownPrediction {
    return {
      vehicleId,
      registrationNo: vehicleId,
      riskScore: 20,
      riskLevel: 'LOW',
      factors: [{ factor: 'Insufficient Data', weight: 100, contribution: 20 }],
      recommendation: 'Insufficient vehicle data. Defaulting to low risk.',
      confidence: 0.3,
      vehicleData: { age: 0, totalTrips: 0, lastMaintenance: null, avgDailyKm: 0 },
    };
  }

  private defaultSLARiskPrediction(tripId: string): SLARiskPrediction {
    return {
      tripId,
      riskScore: 15,
      riskLevel: 'LOW',
      factors: [{ factor: 'Trip Not Found', weight: 100, contribution: 15 }],
      recommendation: 'Trip data not available.',
      confidence: 0.2,
      tripData: { status: 'UNKNOWN', driverId: '', vehicleId: '', scheduledPickup: new Date(), currentEta: 0, routeDeviation: 0 },
    };
  }
}

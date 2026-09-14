import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

// ============================================================
// TYPES
// ============================================================

export interface PassengerInfo {
  id: string;
  name?: string;
  gender?: string; // FEMALE_PASSENGER, MALE_PASSENGER, UNSPECIFIED
  pickupLat: number;
  pickupLng: number;
  dropLat: number;
  dropLng: number;
  pickupAddress?: string;
  dropAddress?: string;
  pickupOrder?: number;
  dropOrder?: number;
}

export interface TripRequirement {
  tripId?: string;
  bookingId?: string;
  passengers: PassengerInfo[];
  vehicleCapacity: number;
  acRequired?: boolean;
  vehicleType?: string;
}

export interface OptimizationResult {
  optimizedPickupSequence: PassengerInfo[];
  optimizedDropSequence: PassengerInfo[];
  guardRequired: boolean;
  guardReason?: string;
  guardAssignmentMode?: string;
  optimizationApplied: boolean;
  optimizationReason?: string;
  distanceDifferenceKm: number;
  timeDifferenceMinutes: number;
  originalGuardRequired: boolean;
  capacityValid: boolean;
  capacityIssues: string[];
  warnings: string[];
  auditLog: AuditEntry[];
}

interface AuditEntry {
  action: string;
  detail: string;
  timestamp: Date;
}

// ============================================================
// SAFETY OPTIMIZATION SERVICE
// ============================================================

@Injectable()
export class SafetyOptimizationService {
  private readonly logger = new Logger(SafetyOptimizationService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ============================================================
  // HAVERSINE DISTANCE (km)
  // ============================================================

  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // ============================================================
  // GET COMPANY SAFETY POLICY
  // ============================================================

  async getSafetyPolicy(companyId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const policy = await this.prisma.transportPolicy.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    if (!policy) throw new NotFoundException('No safety policy found for this company');

    return {
      femaleGuardRequired: policy.femaleGuardRequired,
      guardStartHour: policy.guardStartHour,
      guardEndHour: policy.guardEndHour,
      guardRequiredDistanceKm: policy.guardRequiredDistanceKm || 3.0,
      femaleLastDropGuardRequired: policy.femaleLastDropGuardRequired ?? true,
      femaleFirstPickupGuardRequired: policy.femaleFirstPickupGuardRequired ?? true,
      guardAssignmentMode: policy.guardAssignmentMode || 'AUTOMATIC',
      guardUnavailableBehavior: policy.guardUnavailableBehavior || 'ESCALATE',
      maxDetourKm: policy.maxDetourKm || 5.0,
      maxAdditionalTimeMinutes: policy.maxAdditionalTimeMinutes || 15,
      guardPerTripCost: policy.guardPerTripCost,
      guardPerHourCost: policy.guardPerHourCost,
      guardNightSurcharge: policy.guardNightSurcharge,
      guardMinimumCharge: policy.guardMinimumCharge,
    };
  }

  async updateSafetyPolicy(companyId: string, performedBy: string, data: Record<string, any>) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const existing = await this.prisma.transportPolicy.findFirst({ where: { companyId } });
    if (!existing) throw new NotFoundException('Transport policy not found');

    const allowed = [
      'femaleGuardRequired', 'guardStartHour', 'guardEndHour',
      'guardRequiredDistanceKm', 'femaleLastDropGuardRequired',
      'femaleFirstPickupGuardRequired', 'guardAssignmentMode',
      'guardUnavailableBehavior', 'maxDetourKm', 'maxAdditionalTimeMinutes',
      'guardPerTripCost', 'guardPerHourCost', 'guardNightSurcharge', 'guardMinimumCharge',
    ];

    const updateData: any = {};
    for (const key of allowed) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }

    const updated = await this.prisma.transportPolicy.update({
      where: { id: existing.id },
      data: updateData,
    });

    await this.audit.log({
      companyId, userId: performedBy, action: 'SAFETY_POLICY_UPDATED',
      entity: 'TransportPolicy', entityId: existing.id,
      newValue: updateData,
    });

    return updated;
  }

  // ============================================================
  // MAIN OPTIMIZATION: DROP SEQUENCE
  // ============================================================

  async optimizeDropSequence(companyId: string, requirement: TripRequirement): Promise<OptimizationResult> {
    const policy = await this.getSafetyPolicy(companyId);
    const auditLog: AuditEntry[] = [];
    const warnings: string[] = [];
    const capacityIssues: string[] = [];

    // 1. Validate capacity
    const capacityValid = requirement.passengers.length <= requirement.vehicleCapacity;
    if (!capacityValid) {
      capacityIssues.push(
        `VEHICLE_CAPACITY_EXCEEDED: ${requirement.passengers.length} passengers > ${requirement.vehicleCapacity} seats`,
      );
    }

    // 2. Check if any female passengers exist
    const femalePassengers = requirement.passengers.filter(p => p.gender === 'FEMALE_PASSENGER');
    const malePassengers = requirement.passengers.filter(p => p.gender === 'MALE_PASSENGER');

    if (femalePassengers.length === 0 || !policy.femaleGuardRequired || !policy.femaleLastDropGuardRequired) {
      // No safety concern — return original sequence
      return {
        optimizedPickupSequence: [...requirement.passengers],
        optimizedDropSequence: [...requirement.passengers],
        guardRequired: false,
        optimizationApplied: false,
        distanceDifferenceKm: 0,
        timeDifferenceMinutes: 0,
        originalGuardRequired: false,
        capacityValid,
        capacityIssues,
        warnings,
        auditLog,
      };
    }

    // 3. Sort drops by current order
    const sortedDrops = [...requirement.passengers].sort(
      (a, b) => (a.dropOrder || 0) - (b.dropOrder || 0),
    );

    // 4. Check if last drop is female
    const lastDrop = sortedDrops[sortedDrops.length - 1];
    const isLastDropFemale = lastDrop.gender === 'FEMALE_PASSENGER';

    if (!isLastDropFemale) {
      return {
        optimizedPickupSequence: [...requirement.passengers],
        optimizedDropSequence: sortedDrops,
        guardRequired: false,
        optimizationApplied: false,
        distanceDifferenceKm: 0,
        timeDifferenceMinutes: 0,
        originalGuardRequired: false,
        capacityValid,
        capacityIssues,
        warnings,
        auditLog,
      };
    }

    // 5. Last drop is female — try to find a male passenger within threshold
    let guardRequired = true;
    let optimizationApplied = false;
    let optimizationReason = 'FEMALE_IS_LAST_DROP_GUARD_REQUIRED';
    let optimizedSequence = [...sortedDrops];
    let distanceDiff = 0;

    if (malePassengers.length > 0) {
      // Find nearest male to the female last drop
      const distanceThreshold = policy.guardRequiredDistanceKm || 3.0;

      for (const male of malePassengers) {
        const distance = this.haversineDistance(
          lastDrop.dropLat, lastDrop.dropLng,
          male.dropLat, male.dropLng,
        );

        if (distance <= distanceThreshold) {
          // Check if reordering is feasible
          const detour = this.calculateDetourDistance(sortedDrops, lastDrop, male);
          const additionalTime = this.estimateAdditionalTime(detour);

          if (detour <= (policy.maxDetourKm || 5.0) &&
              additionalTime <= (policy.maxAdditionalTimeMinutes || 15)) {

            // Reorder: move male to last position
            optimizedSequence = sortedDrops.filter(p => p.id !== male.id);
            optimizedSequence.push(male);

            guardRequired = false;
            optimizationApplied = true;
            optimizationReason = 'MALE_PASSENGER_FINAL_DROP_WITHIN_POLICY_LIMIT';
            distanceDiff = detour;

            auditLog.push({
              action: 'FEMALE_LAST_DROP_OPTIMIZED',
              detail: `Male passenger ${male.id} moved to final drop. Distance from female drop: ${distance.toFixed(2)} km. Policy threshold: ${distanceThreshold} km. Detour: ${detour.toFixed(2)} km.`,
              timestamp: new Date(),
            });

            break;
          } else {
            warnings.push(
              `Male passenger ${male.id} within distance threshold (${distance.toFixed(2)} km) but detour exceeds limits (detour: ${detour.toFixed(2)} km, time: ${additionalTime.toFixed(0)} min)`,
            );
          }
        }
      }
    }

    if (guardRequired) {
      auditLog.push({
        action: 'GUARD_REQUIRED',
        detail: `Female passenger is last drop. ${malePassengers.length > 0 ? 'No eligible male passenger within policy constraints.' : 'No male passengers available.'}`,
        timestamp: new Date(),
      });
    }

    return {
      optimizedPickupSequence: [...requirement.passengers],
      optimizedDropSequence: optimizedSequence,
      guardRequired,
      guardReason: guardRequired ? 'FEMALE_LAST_DROP' : undefined,
      guardAssignmentMode: policy.guardAssignmentMode,
      optimizationApplied,
      optimizationReason,
      distanceDifferenceKm: distanceDiff,
      timeDifferenceMinutes: this.estimateAdditionalTime(distanceDiff),
      originalGuardRequired: true,
      capacityValid,
      capacityIssues,
      warnings,
      auditLog,
    };
  }

  // ============================================================
  // MAIN OPTIMIZATION: PICKUP SEQUENCE
  // ============================================================

  async optimizePickupSequence(companyId: string, requirement: TripRequirement): Promise<OptimizationResult> {
    const policy = await this.getSafetyPolicy(companyId);
    const auditLog: AuditEntry[] = [];
    const warnings: string[] = [];
    const capacityIssues: string[] = [];

    // Validate capacity
    const capacityValid = requirement.passengers.length <= requirement.vehicleCapacity;
    if (!capacityValid) {
      capacityIssues.push(
        `VEHICLE_CAPACITY_EXCEEDED: ${requirement.passengers.length} passengers > ${requirement.vehicleCapacity} seats`,
      );
    }

    const femalePassengers = requirement.passengers.filter(p => p.gender === 'FEMALE_PASSENGER');
    const malePassengers = requirement.passengers.filter(p => p.gender === 'MALE_PASSENGER');

    if (femalePassengers.length === 0 || !policy.femaleGuardRequired || !policy.femaleFirstPickupGuardRequired) {
      return {
        optimizedPickupSequence: [...requirement.passengers],
        optimizedDropSequence: [...requirement.passengers],
        guardRequired: false,
        optimizationApplied: false,
        distanceDifferenceKm: 0,
        timeDifferenceMinutes: 0,
        originalGuardRequired: false,
        capacityValid,
        capacityIssues,
        warnings,
        auditLog,
      };
    }

    // Sort pickups by current order
    const sortedPickups = [...requirement.passengers].sort(
      (a, b) => (a.pickupOrder || 0) - (b.pickupOrder || 0),
    );

    const firstPickup = sortedPickups[0];
    const isFirstPickupFemale = firstPickup.gender === 'FEMALE_PASSENGER';

    if (!isFirstPickupFemale) {
      return {
        optimizedPickupSequence: sortedPickups,
        optimizedDropSequence: [...requirement.passengers],
        guardRequired: false,
        optimizationApplied: false,
        distanceDifferenceKm: 0,
        timeDifferenceMinutes: 0,
        originalGuardRequired: false,
        capacityValid,
        capacityIssues,
        warnings,
        auditLog,
      };
    }

    // First pickup is female — try male-first
    let guardRequired = true;
    let optimizationApplied = false;
    let optimizationReason = 'FEMALE_IS_FIRST_PICKUP_GUARD_REQUIRED';
    let optimizedSequence = [...sortedPickups];
    let distanceDiff = 0;

    if (malePassengers.length > 0) {
      const distanceThreshold = policy.guardRequiredDistanceKm || 3.0;

      for (const male of malePassengers) {
        const distance = this.haversineDistance(
          firstPickup.pickupLat, firstPickup.pickupLng,
          male.pickupLat, male.pickupLng,
        );

        if (distance <= distanceThreshold) {
          const detour = this.calculatePickupDetour(sortedPickups, firstPickup, male);
          const additionalTime = this.estimateAdditionalTime(detour);

          if (detour <= (policy.maxDetourKm || 5.0) &&
              additionalTime <= (policy.maxAdditionalTimeMinutes || 15)) {

            optimizedSequence = [male, ...sortedPickups.filter(p => p.id !== male.id)];

            guardRequired = false;
            optimizationApplied = true;
            optimizationReason = 'MALE_PASSENGER_FIRST_PICKUP_WITHIN_POLICY_LIMIT';
            distanceDiff = detour;

            auditLog.push({
              action: 'FEMALE_FIRST_PICKUP_OPTIMIZED',
              detail: `Male passenger ${male.id} moved to first pickup. Distance from female pickup: ${distance.toFixed(2)} km. Policy threshold: ${distanceThreshold} km.`,
              timestamp: new Date(),
            });

            break;
          }
        }
      }
    }

    if (guardRequired) {
      auditLog.push({
        action: 'GUARD_REQUIRED',
        detail: `Female passenger is first pickup. ${malePassengers.length > 0 ? 'No eligible male passenger within policy constraints.' : 'No male passengers available.'}`,
        timestamp: new Date(),
      });
    }

    return {
      optimizedPickupSequence: optimizedSequence,
      optimizedDropSequence: [...requirement.passengers],
      guardRequired,
      guardReason: guardRequired ? 'FEMALE_LAST_PICKUP' : undefined,
      guardAssignmentMode: policy.guardAssignmentMode,
      optimizationApplied,
      optimizationReason,
      distanceDifferenceKm: distanceDiff,
      timeDifferenceMinutes: this.estimateAdditionalTime(distanceDiff),
      originalGuardRequired: true,
      capacityValid,
      capacityIssues,
      warnings,
      auditLog,
    };
  }

  // ============================================================
  // COMBINED OPTIMIZATION
  // ============================================================

  async optimizeTrip(companyId: string, requirement: TripRequirement): Promise<{
    pickup: OptimizationResult;
    drop: OptimizationResult;
    finalGuardRequired: boolean;
    guardReason?: string;
    totalDistanceDifferenceKm: number;
    capacityValid: boolean;
  }> {
    const [pickupResult, dropResult] = await Promise.all([
      this.optimizePickupSequence(companyId, requirement),
      this.optimizeDropSequence(companyId, requirement),
    ]);

    const finalGuardRequired = pickupResult.guardRequired || dropResult.guardRequired;
    const guardReason = dropResult.guardRequired ? dropResult.guardReason : pickupResult.guardReason;

    // Log optimization
    await this.logOptimization(companyId, requirement, pickupResult, dropResult);

    return {
      pickup: pickupResult,
      drop: dropResult,
      finalGuardRequired,
      guardReason,
      totalDistanceDifferenceKm: pickupResult.distanceDifferenceKm + dropResult.distanceDifferenceKm,
      capacityValid: pickupResult.capacityValid && dropResult.capacityValid,
    };
  }

  // ============================================================
  // CAPACITY VALIDATION
  // ============================================================

  async validateCapacity(companyId: string, vehicleId: string, passengerCount: number): Promise<{
    valid: boolean;
    vehicleCapacity: number;
    availableSeats: number;
    issues: string[];
  }> {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, companyId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const totalCapacity = vehicle.passengerCapacity || vehicle.capacity;
    const driverSeatIncluded = true; // Convention: capacity already excludes driver seat
    const availableSeats = totalCapacity;

    const valid = passengerCount <= availableSeats;
    const issues: string[] = [];

    if (!valid) {
      issues.push(`VEHICLE_CAPACITY_EXCEEDED: ${passengerCount} passengers > ${availableSeats} available seats`);
    }

    return {
      valid,
      vehicleCapacity: totalCapacity,
      availableSeats,
      issues,
    };
  }

  // ============================================================
  // GUARD REQUIREMENT CRUD
  // ============================================================

  async createGuardRequirement(companyId: string, performedBy: string, data: {
    tripId?: string;
    bookingId?: string;
    reason: string;
    pickupLocation?: string;
    dropLocation?: string;
    optimizationAttempted?: boolean;
    optimizationResult?: string;
    originalSequence?: any;
    optimizedSequence?: any;
    notes?: string;
  }) {
    if (!this.prisma.isConnected()) {
      throw new ServiceUnavailableException('Database unavailable');
    }

    const guard = await this.prisma.guardRequirement.create({
      data: {
        companyId,
        tripId: data.tripId,
        bookingId: data.bookingId,
        reason: data.reason,
        pickupLocation: data.pickupLocation,
        dropLocation: data.dropLocation,
        status: 'REQUIRED',
        optimizationAttempted: data.optimizationAttempted || false,
        optimizationResult: data.optimizationResult,
        originalSequence: data.originalSequence,
        optimizedSequence: data.optimizedSequence,
        notes: data.notes,
      },
    });

    await this.audit.log({
      companyId, userId: performedBy, action: 'GUARD_REQUIREMENT_CREATED',
      entity: 'GuardRequirement', entityId: guard.id,
      newValue: { reason: data.reason, tripId: data.tripId },
    });

    return guard;
  }

  async listGuardRequirements(companyId: string, params: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const skip = (page - 1) * limit;
    const where: any = { companyId };
    if (params.status) where.status = params.status;

    const [guards, total] = await Promise.all([
      this.prisma.guardRequirement.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.guardRequirement.count({ where }),
    ]);

    return {
      data: guards,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateGuardStatus(companyId: string, performedBy: string, guardId: string, status: string, data?: {
    assignedGuardId?: string;
    assignedGuardName?: string;
    notes?: string;
  }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const guard = await this.prisma.guardRequirement.findFirst({
      where: { id: guardId, companyId },
    });
    if (!guard) throw new NotFoundException('Guard requirement not found');

    const validTransitions: Record<string, string[]> = {
      REQUIRED: ['SEARCHING', 'ASSIGNED', 'CANCELLED'],
      SEARCHING: ['ASSIGNED', 'CANCELLED'],
      ASSIGNED: ['EN_ROUTE', 'CANCELLED'],
      EN_ROUTE: ['ON_TRIP', 'CANCELLED'],
      ON_TRIP: ['COMPLETED', 'CANCELLED'],
    };

    const allowed = validTransitions[guard.status] || [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Cannot transition from ${guard.status} to ${status}`);
    }

    const updateData: any = { status };
    if (data?.assignedGuardId) updateData.assignedGuardId = data.assignedGuardId;
    if (data?.assignedGuardName) updateData.assignedGuardName = data.assignedGuardName;
    if (status === 'ASSIGNED') updateData.assignedAt = new Date();
    if (status === 'COMPLETED') updateData.completedAt = new Date();
    if (data?.notes) updateData.notes = data.notes;

    const updated = await this.prisma.guardRequirement.update({
      where: { id: guardId },
      data: updateData,
    });

    await this.audit.log({
      companyId, userId: performedBy, action: `GUARD_STATUS_${status}`,
      entity: 'GuardRequirement', entityId: guardId,
      oldValue: { status: guard.status }, newValue: { status },
    });

    return updated;
  }

  // ============================================================
  // VEHICLE CAPACITY CONFIG
  // ============================================================

  async getCapacityConfig(companyId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    return this.prisma.vehicleCapacityConfig.findMany({
      where: { companyId },
      orderBy: { vehicleType: 'asc' },
    });
  }

  async upsertCapacityConfig(companyId: string, performedBy: string, data: {
    vehicleType: string;
    seatingCapacity: number;
    passengerCapacity: number;
    driverSeatIncluded?: boolean;
  }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const existing = await this.prisma.vehicleCapacityConfig.findFirst({
      where: { companyId, vehicleType: data.vehicleType },
    });

    if (existing) {
      return this.prisma.vehicleCapacityConfig.update({
        where: { id: existing.id },
        data: {
          seatingCapacity: data.seatingCapacity,
          passengerCapacity: data.passengerCapacity,
          driverSeatIncluded: data.driverSeatIncluded ?? true,
        },
      });
    }

    return this.prisma.vehicleCapacityConfig.create({
      data: {
        companyId,
        vehicleType: data.vehicleType,
        seatingCapacity: data.seatingCapacity,
        passengerCapacity: data.passengerCapacity,
        driverSeatIncluded: data.driverSeatIncluded ?? true,
      },
    });
  }

  // ============================================================
  // SAFETY ANALYTICS
  // ============================================================

  async getSafetyAnalytics(companyId: string, params?: { from?: string; to?: string }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const where: any = { companyId };
    if (params?.from || params?.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = new Date(params.from);
      if (params.to) where.createdAt.lte = new Date(params.to);
    }

    const [totalGuards, activeGuards, completedGuards, totalOptimizations, appliedOptimizations] = await Promise.all([
      this.prisma.guardRequirement.count({ where }),
      this.prisma.guardRequirement.count({ where: { ...where, status: { in: ['REQUIRED', 'SEARCHING', 'ASSIGNED', 'EN_ROUTE', 'ON_TRIP'] } } }),
      this.prisma.guardRequirement.count({ where: { ...where, status: 'COMPLETED' } }),
      this.prisma.safetyOptimizationLog.count({ where }),
      this.prisma.safetyOptimizationLog.count({ where: { ...where, optimizationApplied: true } }),
    ]);

    const guardsByReason = await this.prisma.guardRequirement.groupBy({
      by: ['reason'],
      where,
      _count: { id: true },
    });

    return {
      totalGuardRequirements: totalGuards,
      activeGuards,
      completedGuards,
      totalOptimizations,
      appliedOptimizations,
      optimizationSuccessRate: totalOptimizations > 0
        ? Math.round((appliedOptimizations / totalOptimizations) * 100)
        : 0,
      guardsByReason: guardsByReason.map(g => ({
        reason: g.reason,
        count: g._count.id,
      })),
    };
  }

  // ============================================================
  // HELPER: CALCULATE DETOUR
  // ============================================================

  private calculateDetourDistance(
    originalSequence: PassengerInfo[],
    femalePassenger: PassengerInfo,
    malePassenger: PassengerInfo,
  ): number {
    // Estimate additional distance from moving male to last position
    const femaleIdx = originalSequence.findIndex(p => p.id === femalePassenger.id);
    const maleIdx = originalSequence.findIndex(p => p.id === malePassenger.id);

    // Simple estimate: distance from female drop to male drop minus direct distance
    const directDistance = this.haversineDistance(
      femalePassenger.dropLat, femalePassenger.dropLng,
      malePassenger.dropLat, malePassenger.dropLng,
    );

    // Additional distance = detour to male's drop + back
    return directDistance * 0.6; // Heuristic: ~60% of round-trip is additional
  }

  private calculatePickupDetour(
    originalSequence: PassengerInfo[],
    femalePassenger: PassengerInfo,
    malePassenger: PassengerInfo,
  ): number {
    const directDistance = this.haversineDistance(
      femalePassenger.pickupLat, femalePassenger.pickupLng,
      malePassenger.pickupLat, malePassenger.pickupLng,
    );
    return directDistance * 0.6;
  }

  private estimateAdditionalTime(distanceKm: number): number {
    // Rough estimate: 3 min per km in urban areas
    return Math.round(distanceKm * 3);
  }

  // ============================================================
  // LOG OPTIMIZATION
  // ============================================================

  private async logOptimization(
    companyId: string,
    requirement: TripRequirement,
    pickupResult: OptimizationResult,
    dropResult: OptimizationResult,
  ) {
    if (!this.prisma.isConnected()) return;

    try {
      await this.prisma.safetyOptimizationLog.create({
        data: {
          companyId,
          tripId: requirement.tripId,
          bookingId: requirement.bookingId,
          originalPickupSequence: requirement.passengers as any,
          optimizedPickupSequence: pickupResult.optimizedDropSequence as any,
          originalDropSequence: requirement.passengers as any,
          optimizedDropSequence: dropResult.optimizedDropSequence as any,
          guardRequiredBefore: true,
          guardRequiredAfter: pickupResult.guardRequired || dropResult.guardRequired,
          optimizationApplied: pickupResult.optimizationApplied || dropResult.optimizationApplied,
          optimizationReason: dropResult.optimizationReason || pickupResult.optimizationReason,
          distanceDifferenceKm: pickupResult.distanceDifferenceKm + dropResult.distanceDifferenceKm,
          timeDifferenceMinutes: pickupResult.timeDifferenceMinutes + dropResult.timeDifferenceMinutes,
          malePassengerRepositioned: pickupResult.optimizationApplied || dropResult.optimizationApplied,
        },
      });
    } catch (err) {
      this.logger.error('Failed to log', err);
    }
  }
}

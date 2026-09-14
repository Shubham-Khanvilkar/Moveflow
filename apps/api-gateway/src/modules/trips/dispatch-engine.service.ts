import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class DispatchEngineService {
  private readonly logger = new Logger(DispatchEngineService.name);

  constructor(private prisma: PrismaService, private audit: AuditService) {}

  // ============================================================
  // AUTO DISPATCH
  // ============================================================

  async autoDispatch(companyId: string, bookingId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, companyId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (!['APPROVED', 'REQUESTED'].includes(booking.status)) {
      throw new BadRequestException('Booking is not dispatchable in current status');
    }

    // Find available drivers (status: ACTIVE, availability: AVAILABLE)
    const availableDrivers = await this.prisma.driverProfile.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
        availabilityStatus: 'AVAILABLE',
      },
      include: { User: true, Vehicle: true },
    });

    if (availableDrivers.length === 0) {
      this.logger.warn(`No available drivers for booking ${bookingId}`);
      return null;
    }

    // Score drivers: rating (30%), distance to pickup (25%), vehicle match (20%), experience (15%), preferred area (10%)
    const pickupLat = booking.pickupLatitude;
    const pickupLng = booking.pickupLongitude;

    const scored = availableDrivers
      .filter((d) => (d as any).Vehicle) // must have an assigned vehicle
      .map((driver) => {
        let score = 0;
        const vehicle = (driver as any).Vehicle;

        // Driver rating (0-5 → 0-10 weight)
        const rating = (driver as any).rating || 5;
        score += (rating / 5) * 30;

        // Distance to pickup (closer = higher score)
        if (vehicle?.latitude && vehicle?.longitude && pickupLat && pickupLng) {
          const dist = this.haversineDistance(
            pickupLat, pickupLng,
            vehicle.latitude, vehicle.longitude,
          );
          // 0 km → 25 pts, 10+ km → 0 pts
          score += Math.max(0, 25 - dist * 2.5);
        }

        // Vehicle type match
        if (vehicle?.vehicleType && booking.serviceType) {
          const typeMatch =
            (vehicle.vehicleType === 'CAB' && booking.serviceType === 'CAB') ||
            (vehicle.vehicleType === 'VAN' && booking.serviceType === 'SHUTTLE') ||
            (vehicle.vehicleType === 'BUS' && booking.serviceType === 'BUS');
          if (typeMatch) score += 20;
        }

        // Experience
        const trips = (driver as any).totalTrips || 0;
        score += Math.min(trips / 50, 1) * 15;

        return { driver, vehicle, score };
      })
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) return null;

    const best = scored[0];

    // Create trip from booking
    const tripCode = `TRIP-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // ─── Resolve shift timing for early pickup & departure mode ──
    let scheduledPickupTime = booking.pickupTime;
    let targetArrivalTime: Date | null = null;
    let originalShiftTime: string | null = null;
    let departureMode = 'FIXED';
    let waitTimeoutMinutes = 15;

    const requesterSchedule = await this.prisma.employeeSchedule.findFirst({
      where: {
        userId: booking.requesterId,
        companyId,
        status: 'ACTIVE',
        effectiveFrom: { lte: booking.date },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: booking.date } },
        ],
      },
    });

    if (requesterSchedule?.shiftTimingId) {
      const shiftTiming = await this.prisma.pickupDropTiming.findFirst({
        where: { id: requesterSchedule.shiftTimingId, companyId, isActive: true },
      });

      if (shiftTiming) {
        departureMode = shiftTiming.dropDepartureMode;
        waitTimeoutMinutes = shiftTiming.dropWaitTimeoutMinutes;

        // Apply early pickup offset
        if (shiftTiming.earlyPickupEnabled && shiftTiming.earlyPickupOffsetMinutes > 0) {
          const pickupDate = new Date(booking.pickupTime);
          pickupDate.setMinutes(pickupDate.getMinutes() - shiftTiming.earlyPickupOffsetMinutes);
          scheduledPickupTime = pickupDate;

          // Target arrival = shift pickup time - buffer
          const arrivalDate = new Date(booking.pickupTime);
          arrivalDate.setMinutes(arrivalDate.getMinutes() - shiftTiming.earlyPickupBufferMinutes);
          targetArrivalTime = arrivalDate;

          originalShiftTime = `${String(booking.pickupTime.getHours()).padStart(2, '0')}:${String(booking.pickupTime.getMinutes()).padStart(2, '0')}`;
        }
      }
    } else {
      // Apply company-level defaults
      const scheduleConfig = await this.prisma.transportScheduleConfig.findUnique({
        where: { companyId },
      });
      if (scheduleConfig) {
        departureMode = scheduleConfig.defaultDropDepartureMode;
        waitTimeoutMinutes = scheduleConfig.defaultDropWaitTimeoutMinutes;

        if (scheduleConfig.defaultEarlyPickupOffsetMinutes > 0) {
          const pickupDate = new Date(booking.pickupTime);
          pickupDate.setMinutes(pickupDate.getMinutes() - scheduleConfig.defaultEarlyPickupOffsetMinutes);
          scheduledPickupTime = pickupDate;

          const arrivalDate = new Date(booking.pickupTime);
          arrivalDate.setMinutes(arrivalDate.getMinutes() - scheduleConfig.defaultEarlyPickupBufferMinutes);
          targetArrivalTime = arrivalDate;

          originalShiftTime = `${String(booking.pickupTime.getHours()).padStart(2, '0')}:${String(booking.pickupTime.getMinutes()).padStart(2, '0')}`;
        }
      }
    }

    const trip = await this.prisma.trip.create({
      data: {
        tripCode,
        status: 'SCHEDULED',
        type: booking.type,
        date: booking.date,
        scheduledPickupTime,
        pickupLatitude: booking.pickupLatitude,
        pickupLongitude: booking.pickupLongitude,
        pickupAddress: booking.pickupAddress,
        dropLatitude: booking.dropLatitude,
        dropLongitude: booking.dropLongitude,
        dropAddress: booking.dropAddress,
        passengerCount: booking.passengerCount,
        companyId,
        vehicleId: best.vehicle.id,
        driverId: best.driver.userId,
        departureMode,
        waitTimeoutMinutes,
        targetArrivalTime,
        originalShiftTime,
      },
    });

    // Create DispatchAssignment
    await this.prisma.dispatchAssignment.create({
      data: {
        companyId,
        tripId: trip.id,
        driverId: best.driver.id,
        vehicleId: best.vehicle.id,
        assignedBy: 'AUTO_DISPATCH',
        type: 'ORIGINAL',
        status: 'ACTIVE',
      },
    });

    // Create DriverTrip link
    await this.prisma.driverTrip.create({
      data: {
        tripId: trip.id,
        driverId: best.driver.id,
      },
    });

    // Update vehicle and driver status
    await this.prisma.vehicle.update({
      where: { id: best.vehicle.id },
      data: { status: 'ASSIGNED' },
    });
    await this.prisma.driverProfile.update({
      where: { id: best.driver.id },
      data: { availabilityStatus: 'ON_TRIP' },
    });

    // Link booking to trip
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        tripId: trip.id,
        status: 'DISPATCHING',
      },
    });

    // Create trip passengers from booking passengers
    const bookingPassengers = await this.prisma.bookingPassenger.findMany({
      where: { bookingId },
    });
    for (const bp of bookingPassengers) {
      await this.prisma.tripPassenger.create({
        data: {
          tripId: trip.id,
          userId: bp.userId,
          boardingStatus: 'SCHEDULED',
        },
      });
    }

    await this.audit.log({
      companyId,
      userId: 'system',
      action: 'AUTO_DISPATCH',
      entity: 'Trip',
      entityId: trip.id,
      newValue: {
        driverId: best.driver.userId,
        vehicleId: best.vehicle.id,
        score: best.score,
        bookingId,
        tripCode,
      },
    });

    return {
      tripId: trip.id,
      tripCode,
      driverId: best.driver.userId,
      vehicleId: best.vehicle.id,
      score: best.score,
      bookingId,
    };
  }

  // ============================================================
  // MANUAL DISPATCH
  // ============================================================

  async manualDispatch(
    companyId: string,
    tripId: string,
    driverId: string,
    vehicleId: string,
    operatorId: string,
  ) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, companyId },
    });
    if (!trip) throw new NotFoundException('Trip not found');
    if (!['SCHEDULED'].includes(trip.status)) {
      throw new BadRequestException('Trip cannot be dispatched in current status');
    }

    // Validate driver
    const driverProfile = await this.prisma.driverProfile.findFirst({
      where: { id: driverId, companyId, status: 'ACTIVE', availabilityStatus: 'AVAILABLE' },
    });
    if (!driverProfile) throw new BadRequestException('Driver is not available');

    // Validate vehicle
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, companyId, status: 'AVAILABLE' },
    });
    if (!vehicle) throw new BadRequestException('Vehicle is not available');

    // Update trip
    await this.prisma.trip.update({
      where: { id: tripId },
      data: {
        driverId: driverProfile.userId,
        vehicleId: vehicle.id,
        status: 'DISPATCHED',
      },
    });

    // Create DispatchAssignment
    await this.prisma.dispatchAssignment.create({
      data: {
        companyId,
        tripId,
        driverId: driverProfile.id,
        vehicleId: vehicle.id,
        assignedBy: operatorId,
        type: 'ORIGINAL',
        status: 'ACTIVE',
      },
    });

    // Create DriverTrip link
    await this.prisma.driverTrip.create({
      data: {
        tripId,
        driverId: driverProfile.id,
      },
    });

    // Update vehicle and driver status
    await this.prisma.vehicle.update({
      where: { id: vehicle.id },
      data: { status: 'ASSIGNED' },
    });
    await this.prisma.driverProfile.update({
      where: { id: driverProfile.id },
      data: { availabilityStatus: 'ON_TRIP' },
    });

    // Link booking to trip
    const booking = await this.prisma.booking.findFirst({
      where: { tripId, companyId },
    });
    if (booking) {
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'DISPATCHING' },
      });
    }

    await this.audit.log({
      companyId,
      userId: operatorId,
      action: 'MANUAL_DISPATCH',
      entity: 'Trip',
      entityId: tripId,
      newValue: {
        driverId: driverProfile.userId,
        vehicleId: vehicle.id,
      },
    });

    return { tripId, driverId: driverProfile.userId, vehicleId: vehicle.id, dispatchedBy: operatorId };
  }

  // ============================================================
  // DISPATCH SLA METRICS
  // ============================================================

  async getDispatchSLA(companyId: string) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const todayTrips = await this.prisma.trip.findMany({
      where: { companyId, createdAt: { gte: today } },
      select: {
        id: true,
        status: true,
        createdAt: true,
        scheduledPickupTime: true,
        actualPickupTime: true,
      },
    });

    const totalTrips = todayTrips.length;

    // Calculate dispatch times (created → actualPickupTime)
    const dispatchTimes = todayTrips
      .filter((t) => t.actualPickupTime)
      .map((t) => (t.actualPickupTime!.getTime() - t.createdAt.getTime()) / 60000);

    const avgDispatchMinutes = dispatchTimes.length > 0
      ? Math.round((dispatchTimes.reduce((a, b) => a + b, 0) / dispatchTimes.length) * 10) / 10
      : 0;

    const slaTargetMinutes = 5; // 5-minute SLA
    const withinSla = dispatchTimes.filter((t) => t <= slaTargetMinutes).length;

    // Trip status breakdown
    const statusCounts: Record<string, number> = {};
    for (const t of todayTrips) {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    }

    // On-time vs late
    const onTime = todayTrips.filter((t) => {
      if (!t.actualPickupTime || !t.scheduledPickupTime) return false;
      return t.actualPickupTime <= t.scheduledPickupTime;
    }).length;

    return {
      date: today.toISOString().split('T')[0],
      totalTrips,
      dispatchedTrips: (statusCounts['DISPATCHED'] || 0) + (statusCounts['IN_TRANSIT'] || 0) + (statusCounts['COMPLETED'] || 0),
      completedTrips: statusCounts['COMPLETED'] || 0,
      cancelledTrips: statusCounts['CANCELLED'] || 0,
      avgDispatchMinutes,
      slaTargetMinutes,
      slaCompliance: totalTrips > 0 ? Math.round((withinSla / Math.max(dispatchTimes.length, 1)) * 100) : 100,
      onTimeDeparture: totalTrips > 0 ? Math.round((onTime / totalTrips) * 100) : 100,
      statusBreakdown: statusCounts,
    };
  }

  // ============================================================
  // EMPTY KM REPORT
  // ============================================================

  async getEmptyKmReport(companyId: string, params: { from?: string; to?: string }) {
    const from = params.from ? new Date(params.from) : new Date(Date.now() - 7 * 86400000);
    const to = params.to ? new Date(params.to) : new Date();

    const trips = await this.prisma.trip.findMany({
      where: {
        companyId,
        createdAt: { gte: from, lte: to },
        status: { in: ['COMPLETED', 'IN_TRANSIT'] },
      },
      select: {
        id: true,
        pickupLatitude: true,
        pickupLongitude: true,
        dropLatitude: true,
        dropLongitude: true,
        type: true,
        date: true,
      },
    });

    let totalRevenueKm = 0;
    let totalEmptyKm = 0;

    for (const trip of trips) {
      if (trip.pickupLatitude && trip.pickupLongitude && trip.dropLatitude && trip.dropLongitude) {
        const tripKm = this.haversineDistance(
          trip.pickupLatitude, trip.pickupLongitude,
          trip.dropLatitude, trip.dropLongitude,
        );
        totalRevenueKm += tripKm;
        // Empty km = 30% of revenue km (industry average without optimization)
        totalEmptyKm += tripKm * 0.3;
      }
    }

    const emptyKmRatio = totalRevenueKm > 0
      ? Math.round((totalEmptyKm / totalRevenueKm) * 100)
      : 0;

    // Generate suggestions based on data
    const suggestions: string[] = [];
    if (emptyKmRatio > 25) {
      suggestions.push('High empty km ratio detected — consolidate trips on same corridors');
    }
    if (trips.length < 10) {
      suggestions.push('Low trip volume — consider demand aggregation for better utilization');
    }
    if (totalEmptyKm > 100) {
      suggestions.push('Implement deadheading reduction — match return trips with nearby pickups');
    }
    if (suggestions.length === 0) {
      suggestions.push('Empty km ratio is within optimal range');
    }

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      totalTrips: trips.length,
      totalRevenueKm: Math.round(totalRevenueKm * 100) / 100,
      totalEmptyKm: Math.round(totalEmptyKm * 100) / 100,
      emptyKmRatio,
      suggestions,
    };
  }

  // ============================================================
  // DISPATCH SCORING FACTORS
  // ============================================================

  async dispatchFactors(companyId: string) {
    return {
      factors: [
        { name: 'driver_rating', weight: 0.30, description: 'Driver satisfaction rating (0-5 scale)' },
        { name: 'distance_to_pickup', weight: 0.25, description: 'Haversine distance from driver vehicle to pickup point' },
        { name: 'vehicle_type_match', weight: 0.20, description: 'Vehicle type matches requested service (CAB/SHUTTLE/BUS)' },
        { name: 'driver_experience', weight: 0.15, description: 'Number of completed trips (capped at 50 for max score)' },
        { name: 'availability', weight: 0.10, description: 'Driver availability status' },
      ],
      algorithm: 'WEIGHTED_SCORING',
      version: '2.0',
    };
  }

  // ============================================================
  // DISPATCH OVERRIDE AUDIT
  // ============================================================

  async dispatchOverrideAudit(companyId: string, tripId: string, operatorId: string, reason: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, companyId },
    });
    if (!trip) throw new NotFoundException('Trip not found');

    // Record override
    await this.prisma.dispatchAssignment.create({
      data: {
        companyId,
        tripId,
        driverId: trip.driverId || 'UNKNOWN',
        vehicleId: trip.vehicleId || 'UNKNOWN',
        assignedBy: operatorId,
        type: 'ORIGINAL',
        reason,
        status: 'ACTIVE',
      },
    });

    await this.audit.log({
      companyId,
      userId: operatorId,
      action: 'DISPATCH_OVERRIDE',
      entity: 'Trip',
      entityId: tripId,
      newValue: { reason, previousDriverId: trip.driverId, previousVehicleId: trip.vehicleId },
    });

    return {
      recorded: true,
      tripId,
      operatorId,
      reason,
      timestamp: new Date(),
    };
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

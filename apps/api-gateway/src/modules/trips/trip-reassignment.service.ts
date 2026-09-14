import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class TripReassignmentService {
  private readonly logger = new Logger(TripReassignmentService.name);

  constructor(private prisma: PrismaService, private audit: AuditService) {}

  // ============================================================
  // 44.22 COMPLETE TRIP REASSIGNMENT
  // ============================================================
  async reassignTrip(companyId: string, tripId: string, data: {
    newDriverId: string;
    newVehicleId: string;
    reason: string;
  }, performedByUserId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, companyId },
    });
    if (!trip) throw new NotFoundException('Trip not found');

    // Get passenger count
    const passengerCount = await this.prisma.tripPassenger.count({
      where: { tripId },
    });

    // Record previous assignment
    const history = await (this.prisma as any).tripAssignmentHistory.create({
      data: {
        companyId,
        tripId,
        action: 'REASSIGN',
        previousDriverId: trip.driverId,
        newDriverId: data.newDriverId,
        previousVehicleId: trip.vehicleId,
        newVehicleId: data.newVehicleId,
        reason: data.reason,
        performedByUserId,
        tripState: trip.status,
        affectedPassengerCount: passengerCount,
      },
    });

    // Update trip
    const updatedTrip = await this.prisma.trip.update({
      where: { id: tripId },
      data: {
        driverId: data.newDriverId,
        vehicleId: data.newVehicleId,
      },
    });

    // Record passenger movements
    const passengers = await this.prisma.tripPassenger.findMany({ where: { tripId } });
    for (const p of passengers) {
      await (this.prisma as any).passengerMovement.create({
        data: {
          companyId,
          employeeId: p.userId,
          toTripId: tripId,
          action: 'REASSIGN',
          reason: data.reason,
          performedByUserId,
          previousDriverId: trip.driverId,
          newDriverId: data.newDriverId,
          previousVehicleId: trip.vehicleId,
          newVehicleId: data.newVehicleId,
        },
      });
    }

    await this.audit.log({
      companyId,
      userId: performedByUserId,
      action: 'TRIP_REASSIGNED',
      entity: 'Trip',
      entityId: tripId,
      newValue: {
        oldDriver: trip.driverId, newDriver: data.newDriverId,
        oldVehicle: trip.vehicleId, newVehicle: data.newVehicleId,
        passengers: passengerCount,
      },
    });

    return { trip: updatedTrip, history, passengersMoved: passengerCount };
  }

  // ============================================================
  // 44.23 SINGLE PASSENGER REASSIGNMENT
  // ============================================================
  async movePassenger(companyId: string, tripId: string, data: {
    employeeId: string;
    toTripId: string;
    reason: string;
  }, performedByUserId: string) {
    const fromTrip = await this.prisma.trip.findFirst({
      where: { id: tripId, companyId },
    });
    if (!fromTrip) throw new NotFoundException('Source trip not found');

    const toTrip = await this.prisma.trip.findFirst({
      where: { id: data.toTripId, companyId },
    });
    if (!toTrip) throw new NotFoundException('Destination trip not found');

    // Validate capacity
    const toPassengerCount = await this.prisma.tripPassenger.count({
      where: { tripId: data.toTripId },
    });
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: toTrip.vehicleId! } });
    if (vehicle && toPassengerCount >= vehicle.capacity) {
      throw new BadRequestException('Destination trip is at capacity');
    }

    // Record movement
    const movement = await (this.prisma as any).passengerMovement.create({
      data: {
        companyId,
        employeeId: data.employeeId,
        fromTripId: tripId,
        toTripId: data.toTripId,
        action: 'REASSIGN',
        reason: data.reason,
        performedByUserId,
        previousVehicleId: fromTrip.vehicleId,
        newVehicleId: toTrip.vehicleId,
        previousDriverId: fromTrip.driverId,
        newDriverId: toTrip.driverId,
      },
    });

    // Remove from source trip
    await this.prisma.tripPassenger.deleteMany({
      where: { tripId, userId: data.employeeId },
    });

    // Add to destination trip
    await this.prisma.tripPassenger.create({
      data: {
        tripId: data.toTripId,
        userId: data.employeeId,
        boardingStatus: 'SCHEDULED',
      },
    });

    await this.audit.log({
      companyId,
      userId: performedByUserId,
      action: 'PASSENGER_MOVED',
      entity: 'PassengerMovement',
      entityId: movement.id,
      newValue: { employee: data.employeeId, from: tripId, to: data.toTripId },
    });

    return { movement };
  }

  // ============================================================
  // 44.24 MULTI-PASSENGER REASSIGNMENT (with preview)
  // ============================================================
  async previewBulkMove(companyId: string, tripId: string, employeeIds: string[], toTripId: string) {
    const toTrip = await this.prisma.trip.findFirst({
      where: { id: toTripId, companyId },
    });
    if (!toTrip) throw new NotFoundException('Destination trip not found');

    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: toTrip.vehicleId! } });
    const currentPassengers = await this.prisma.tripPassenger.count({
      where: { tripId: toTripId },
    });
    const newCount = currentPassengers + employeeIds.length;

    return {
      currentPassengerCount: currentPassengers,
      passengersToAdd: employeeIds.length,
      newPassengerCount: newCount,
      vehicleCapacity: vehicle?.capacity || 0,
      capacityUtilization: vehicle ? Number(((newCount / vehicle.capacity) * 100).toFixed(1)) : 0,
      withinCapacity: vehicle ? newCount <= vehicle.capacity : false,
      safetyStatus: 'REQUIRES_REVIEW', // always requires admin review for bulk moves
    };
  }

  async bulkMovePassengers(companyId: string, tripId: string, data: {
    employeeIds: string[];
    toTripId: string;
    reason: string;
  }, performedByUserId: string) {
    // Preview first
    const preview = await this.previewBulkMove(companyId, tripId, data.employeeIds, data.toTripId);
    if (!preview.withinCapacity) {
      throw new BadRequestException(`Cannot move ${data.employeeIds.length} passengers — destination trip would exceed capacity`);
    }

    const movements = [];
    for (const empId of data.employeeIds) {
      const result = await this.movePassenger(companyId, tripId, {
        employeeId: empId,
        toTripId: data.toTripId,
        reason: data.reason,
      }, performedByUserId);
      movements.push(result.movement);
    }

    return { movements, totalMoved: movements.length };
  }

  // ============================================================
  // 44.25 CAPACITY RELEASE + RE-OPTIMIZATION
  // ============================================================
  async releaseCapacity(companyId: string, tripId: string, employeeId: string, reason: string) {
    // Record no-show release movement
    const movement = await (this.prisma as any).passengerMovement.create({
      data: {
        companyId,
        employeeId,
        fromTripId: tripId,
        toTripId: tripId, // same trip, released
        action: 'NO_SHOW_RELEASE',
        reason,
        performedByUserId: 'SYSTEM',
      },
    });

    // Remove passenger from trip
    await this.prisma.tripPassenger.deleteMany({
      where: { tripId, userId: employeeId },
    });

    // Check remaining capacity
    const remainingPassengers = await this.prisma.tripPassenger.count({
      where: { tripId },
    });

    await this.audit.log({
      companyId,
      userId: 'SYSTEM',
      action: 'CAPACITY_RELEASED',
      entity: 'Trip',
      entityId: tripId,
      newValue: { employee: employeeId, remainingPassengers, reason },
    });

    return {
      released: true,
      remainingPassengers,
      tripId,
      movement,
      triggerReOptimization: remainingPassengers === 0,
    };
  }

  // ============================================================
  // 44.57 DISPATCH OPTIMIZATION LOG
  // ============================================================
  async logOptimizationRun(companyId: string, data: {
    triggerType: string;
    candidatesEvaluated: number;
    bestCandidateId?: string;
    decision: string;
    failureReason?: string;
    durationMs?: number;
    inputs: any;
    outputs: any;
  }) {
    return (this.prisma as any).dispatchOptimizationRun.create({
      data: {
        companyId,
        triggerType: data.triggerType,
        candidatesEvaluated: data.candidatesEvaluated,
        bestCandidateId: data.bestCandidateId,
        decision: data.decision,
        failureReason: data.failureReason,
        durationMs: data.durationMs,
        inputs: data.inputs,
        outputs: data.outputs,
      },
    });
  }

  // ============================================================
  // 44.50 EMPLOYEE TRANSPORT ONBOARD / OFFBOARD
  // ============================================================
  async onboardEmployee(companyId: string, employeeId: string, data: {
    reason?: string;
  }, performedByUserId: string) {
    // Preview impact
    const activeBookings = await (this.prisma as any).booking.count({
      where: { companyId, createdByUserId: employeeId, status: { in: ['REQUESTED', 'PENDING_APPROVAL', 'APPROVED'] } },
    });

    const history = await (this.prisma as any).employeeTransportStatusHistory.create({
      data: {
        companyId,
        employeeId,
        action: 'ONBOARD',
        previousStatus: 'INACTIVE',
        newStatus: 'ACTIVE',
        reason: data.reason || 'Employee onboarded to transport',
        performedByUserId,
        impactPreview: { activeBookings },
      },
    });

    await this.audit.log({
      companyId,
      userId: performedByUserId,
      action: 'EMPLOYEE_TRANSPORT_ONBOARD',
      entity: 'EmployeeTransportStatusHistory',
      entityId: history.id,
      newValue: { employee: employeeId },
    });

    return { history };
  }

  async offboardEmployee(companyId: string, employeeId: string, data: {
    reason?: string;
  }, performedByUserId: string) {
    // Preview impact
    const activeBookings = await (this.prisma as any).booking.findMany({
      where: { companyId, createdByUserId: employeeId, status: { in: ['REQUESTED', 'PENDING_APPROVAL', 'APPROVED', 'DISPATCHED'] } },
    });

    // Find trip IDs where this employee is a passenger
    const passengerTripIds = (await this.prisma.tripPassenger.findMany({
      where: { userId: employeeId },
      select: { tripId: true },
    })).map((p) => p.tripId);

    const activeTrips = passengerTripIds.length > 0
      ? await this.prisma.trip.findMany({
          where: {
            companyId,
            id: { in: passengerTripIds },
            status: { in: ['DISPATCHED', 'DRIVER_ACCEPTED', 'EN_ROUTE_TO_PICKUP', 'IN_TRANSIT'] },
          },
        })
      : [];

    const impactPreview = {
      activeBookings: activeBookings.length,
      bookingIds: activeBookings.map((b: any) => b.id),
      activeTrips: activeTrips.length,
      tripIds: activeTrips.map((t: any) => t.id),
    };

    const history = await (this.prisma as any).employeeTransportStatusHistory.create({
      data: {
        companyId,
        employeeId,
        action: 'OFFBOARD',
        previousStatus: 'ACTIVE',
        newStatus: 'INACTIVE',
        reason: data.reason || 'Employee offboarded from transport',
        performedByUserId,
        impactPreview,
      },
    });

    await this.audit.log({
      companyId,
      userId: performedByUserId,
      action: 'EMPLOYEE_TRANSPORT_OFFBOARD',
      entity: 'EmployeeTransportStatusHistory',
      entityId: history.id,
      newValue: { employee: employeeId, impact: impactPreview },
    });

    return { history, impact: impactPreview };
  }
}

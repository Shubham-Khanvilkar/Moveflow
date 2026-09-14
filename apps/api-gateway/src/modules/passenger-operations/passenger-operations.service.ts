import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

export class MovePassengerDto {
  passengerId: string;
  fromTripId: string;
  toTripId: string;
  reason: string;
}

export class MoveMultiplePassengersDto {
  passengerIds: string[];
  fromTripId: string;
  toTripId: string;
  reason: string;
}

export class AddPassengerDto {
  tripId: string;
  userId: string;
}

export class RemovePassengerDto {
  tripId: string;
  passengerId: string;
  reason: string;
}

@Injectable()
export class PassengerOperationsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /**
   * Atomically move a single passenger from one trip to another.
   * This is the core passenger container operation.
   */
  async movePassenger(companyId: string, dto: MovePassengerDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Validate source trip exists and is in correct state
      const sourceTrip = await tx.trip.findFirst({
        where: { id: dto.fromTripId, companyId },
        include: { TripPassenger: true },
      });
      if (!sourceTrip) throw new NotFoundException('Source trip not found');
      if (!['SCHEDULED', 'DISPATCHED'].includes(sourceTrip.status)) {
        throw new BadRequestException(`Cannot move passengers from trip in ${sourceTrip.status} status`);
      }

      // 2. Validate destination trip exists and is in correct state
      const destTrip = await tx.trip.findFirst({
        where: { id: dto.toTripId, companyId },
        include: { TripPassenger: true },
      });
      if (!destTrip) throw new NotFoundException('Destination trip not found');
      if (!['SCHEDULED', 'DISPATCHED'].includes(destTrip.status)) {
        throw new BadRequestException(`Cannot move passengers to trip in ${destTrip.status} status`);
      }

      // 3. Validate source and destination are compatible
      if (sourceTrip.companyId !== destTrip.companyId) {
        throw new BadRequestException('Cannot move passengers between different companies');
      }
      if (sourceTrip.id === destTrip.id) {
        throw new BadRequestException('Source and destination trips must be different');
      }

      // 4. Validate passenger exists on source trip
      const passenger = sourceTrip.TripPassenger.find(p => p.id === dto.passengerId);
      if (!passenger) {
        throw new NotFoundException('Passenger not found on source trip');
      }

      // 5. Check passenger not already on destination trip
      const existingOnDest = destTrip.TripPassenger.find(p => p.userId === passenger.userId);
      if (existingOnDest) {
        throw new ConflictException('Passenger is already on the destination trip');
      }

      // 6. Remove from source trip
      await tx.tripPassenger.delete({
        where: { id: dto.passengerId },
      });

      // 7. Add to destination trip
      const newPassenger = await tx.tripPassenger.create({
        data: {
          tripId: dto.toTripId,
          userId: passenger.userId,
          boardingStatus: 'SCHEDULED',
        },
      });

      // 8. Record the movement
      const movement = await tx.passengerMovement.create({
        data: {
          companyId,
          employeeId: passenger.userId,
          fromTripId: dto.fromTripId,
          toTripId: dto.toTripId,
          action: 'MOVED',
          reason: dto.reason,
          performedByUserId: userId,
          previousVehicleId: sourceTrip.vehicleId,
          newVehicleId: destTrip.vehicleId,
          previousDriverId: sourceTrip.driverId,
          newDriverId: destTrip.driverId,
        },
      });

      // 9. Update passenger counts
      await tx.trip.update({
        where: { id: dto.fromTripId },
        data: { /* capacity recalculation would go here */ },
      });

      // 10. Audit
      await this.audit.log({
        userId,
        action: 'PASSENGER_MOVED',
        entity: 'TripPassenger',
        entityId: dto.passengerId,
        companyId,
        newValue: {
          fromTripId: dto.fromTripId,
          toTripId: dto.toTripId,
          reason: dto.reason,
        },
      });

      return { movement, newPassenger };
    });
  }

  /**
   * Atomically move multiple passengers from one trip to another.
   */
  async moveMultiplePassengers(companyId: string, dto: MoveMultiplePassengersDto, userId: string) {
    const results = { moved: 0, failed: 0, errors: [] as any[] };

    for (const passengerId of dto.passengerIds) {
      try {
        await this.movePassenger(companyId, {
          passengerId,
          fromTripId: dto.fromTripId,
          toTripId: dto.toTripId,
          reason: dto.reason,
        }, userId);
        results.moved++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({ passengerId, error: error.message });
      }
    }

    return results;
  }

  /**
   * Add a passenger to a trip.
   */
  async addPassenger(companyId: string, dto: AddPassengerDto, userId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: dto.tripId, companyId },
      include: { TripPassenger: true },
    });
    if (!trip) throw new NotFoundException('Trip not found');
    if (!['SCHEDULED', 'DISPATCHED'].includes(trip.status)) {
      throw new BadRequestException(`Cannot add passengers to trip in ${trip.status} status`);
    }

    // Check not already on trip
    const existing = trip.TripPassenger.find(p => p.userId === dto.userId);
    if (existing) {
      throw new ConflictException('Passenger is already on this trip');
    }

    const passenger = await this.prisma.tripPassenger.create({
      data: {
        tripId: dto.tripId,
        userId: dto.userId,
        boardingStatus: 'SCHEDULED',
      },
    });

    await this.audit.log({
      userId,
      action: 'PASSENGER_ADDED',
      entity: 'TripPassenger',
      entityId: passenger.id,
      companyId,
      newValue: { tripId: dto.tripId, userId: dto.userId },
    });

    return passenger;
  }

  /**
   * Remove a passenger from a trip.
   */
  async removePassenger(companyId: string, dto: RemovePassengerDto, userId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: dto.tripId, companyId },
      include: { TripPassenger: true },
    });
    if (!trip) throw new NotFoundException('Trip not found');

    const passenger = trip.TripPassenger.find(p => p.id === dto.passengerId);
    if (!passenger) throw new NotFoundException('Passenger not found on trip');

    await this.prisma.tripPassenger.delete({
      where: { id: dto.passengerId },
    });

    await this.prisma.passengerMovement.create({
      data: {
        companyId,
        employeeId: passenger.userId,
        fromTripId: dto.tripId,
        toTripId: dto.tripId,
        action: 'REMOVED',
        reason: dto.reason,
        performedByUserId: userId,
      },
    });

    await this.audit.log({
      userId,
      action: 'PASSENGER_REMOVED',
      entity: 'TripPassenger',
      entityId: dto.passengerId,
      companyId,
      newValue: { tripId: dto.tripId, reason: dto.reason },
    });

    return { success: true };
  }

  /**
   * Get passenger movement history for a trip.
   */
  async getTripPassengerHistory(companyId: string, tripId: string) {
    return this.prisma.passengerMovement.findMany({
      where: { companyId, fromTripId: tripId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all passengers on a trip.
   */
  async getTripPassengers(companyId: string, tripId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, companyId },
      include: {
        TripPassenger: {
          include: { User: true },
        },
      },
    });
    if (!trip) throw new NotFoundException('Trip not found');
    return trip.TripPassenger;
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class DispatchBoardService {
  constructor(private prisma: PrismaService) {}

  async getDispatchBoard(companyId: string) {
    const [unassignedTrips, availableDrivers, availableVehicles, liveTrips, delayedTrips] =
      await Promise.all([
        this.prisma.trip.findMany({
          where: {
            companyId,
            status: 'SCHEDULED',
            driverId: null,
          },
          include: {
            Booking: true,
          },
          orderBy: { scheduledPickupTime: 'asc' },
        }),
        this.prisma.driverProfile.findMany({
          where: {
            companyId,
            availabilityStatus: 'AVAILABLE',
            status: 'ACTIVE',
          },
          include: {
            User: true,
            Vehicle: true,
          },
        }),
        this.prisma.vehicle.findMany({
          where: {
            companyId,
            status: 'AVAILABLE',
          },
        }),
        this.prisma.trip.findMany({
          where: {
            companyId,
            status: 'IN_TRANSIT',
          },
          include: {
            Booking: true,
            User: true,
            Vehicle: true,
          },
          orderBy: { scheduledPickupTime: 'asc' },
        }),
        this.prisma.trip.findMany({
          where: {
            companyId,
            status: 'DELAYED',
          },
          include: {
            Booking: true,
            User: true,
            Vehicle: true,
          },
          orderBy: { scheduledPickupTime: 'asc' },
        }),
      ]);

    return {
      unassignedTrips,
      availableDrivers,
      availableVehicles,
      liveTrips,
      delayedTrips,
    };
  }
}

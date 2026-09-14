import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class CarpoolingService {
  private readonly logger = new Logger(CarpoolingService.name);
  constructor(private prisma: PrismaService) {}

  async findCarpoolMatches(data: {
    companyId: string;
    employeeId: string;
    pickupLat: number;
    pickupLon: number;
    dropLat: number;
    dropLon: number;
    date: Date;
    shiftId?: string;
  }) {
    // Find employees with similar routes (within 2km of pickup and drop)
    const allBookings = await (this.prisma as any).booking.findMany({
      where: {
        companyId: data.companyId,
        date: data.date,
        status: { in: ['APPROVED', 'PENDING_APPROVAL'] },
        employeeId: { not: data.employeeId },
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const matches = [];
    for (const booking of allBookings) {
      const pickupDist = this.haversine(data.pickupLat, data.pickupLon, (booking as any).pickupLat || 0, (booking as any).pickupLon || 0);
      const dropDist = this.haversine(data.dropLat, data.dropLon, (booking as any).dropLat || 0, (booking as any).dropLon || 0);

      if (pickupDist < 2 && dropDist < 2) {
        matches.push({
          bookingId: booking.id,
          employee: booking.employee,
          pickupDistance: Math.round(pickupDist * 1000),
          dropDistance: Math.round(dropDist * 1000),
          routeSimilarity: Math.round(100 - (pickupDist + dropDist) * 50),
        });
      }
    }

    return matches.sort((a: any, b: any) => b.routeSimilarity - a.routeSimilarity).slice(0, 10);
  }

  async createCarpoolRide(data: {
    companyId: string;
    hostId: string;
    pickupLat: number;
    pickupLon: number;
    dropLat: number;
    dropLon: number;
    date: Date;
    maxPassengers: number;
    routeDescription: string;
  }) {
    await (this.prisma as any).auditLog.create({
      data: {
        companyId: data.companyId,
        userId: data.hostId,
        action: 'CARPOOL_RIDE_CREATED',
        resourceType: 'CARPOOL',
        resourceId: data.hostId,
        details: JSON.stringify({
          maxPassengers: data.maxPassengers,
          route: data.routeDescription,
          date: data.date.toISOString(),
        }),
        createdAt: new Date(),
      },
    });
    return { rideId: `carpool_${Date.now()}`, status: 'ACTIVE', ...data };
  }

  async calculateCostSharing(rideId: string, totalCost: number) {
    return { rideId, totalCost, perPerson: Math.ceil(totalCost / 4), estimatedPassengers: 4 };
  }

  async calculateCarbonSavings(distanceKm: number, passengersSaved: number) {
    const emissionPerKmPerPerson = 0.21; // kg CO2 per km per person
    const saved = distanceKm * passengersSaved * emissionPerKmPerPerson;
    return { distanceKm, passengersSaved, carbonSavedKg: Math.round(saved * 100) / 100, equivalentTrees: Math.round(saved / 21 * 100) / 100 };
  }

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}

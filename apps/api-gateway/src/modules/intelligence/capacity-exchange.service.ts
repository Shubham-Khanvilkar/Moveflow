import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

export interface CapacityOpportunityResult {
  id: string;
  vehicleId: string;
  tripId: string;
  availableSeats: number;
  departureTime: Date;
  route: { pickup: { lat: number; lng: number }; drop: { lat: number; lng: number } };
  matchedDemand: MatchedDemand[];
  totalPotentialSaving: number;
}

export interface MatchedDemand {
  employeeId: string;
  employeeName: string;
  routeMatch: number; // percentage
  deviationMinutes: number;
  estimatedSaving: number;
}

@Injectable()
export class CapacityExchangeService {
  private readonly logger = new Logger(CapacityExchangeService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async detectOpportunities(companyId: string): Promise<CapacityOpportunityResult[]> {
    const opportunities: CapacityOpportunityResult[] = [];

    // Find trips with available seats
    const availableTrips = await (this.prisma as any).trip.findMany({
      where: {
        companyId,
        status: { in: ['SCHEDULED', 'IN_TRANSIT'] },
      },
      include: {
        TripPassenger: true,
        Vehicle: { select: { id: true, capacity: true, registrationNo: true } },
      },
    });

    for (const trip of availableTrips) {
      const vehicle = (trip as any).Vehicle;
      if (!vehicle) continue;

      const capacity = (vehicle as any).capacity || 6;
      const occupied = (trip as any).TripPassenger?.length || 0;
      const availableSeats = capacity - occupied;

      if (availableSeats <= 0) continue;

      // Find unassigned bookings that could match this route
      const compatibleBookings = await this.findCompatibleBookings(
        companyId,
        trip.pickupLatitude,
        trip.pickupLongitude,
        trip.dropLatitude,
        trip.dropLongitude,
        trip.scheduledPickupTime,
      );

      if (compatibleBookings.length === 0) continue;

      const matchedDemand: MatchedDemand[] = compatibleBookings.slice(0, 5).map((b) => ({
        employeeId: b.employeeId,
        employeeName: b.employeeName,
        routeMatch: b.routeMatch,
        deviationMinutes: b.deviationMinutes,
        estimatedSaving: b.estimatedSaving,
      }));

      opportunities.push({
        id: `opp-${trip.id}`,
        vehicleId: trip.vehicleId,
        tripId: trip.id,
        availableSeats,
        departureTime: trip.scheduledPickupTime,
        route: {
          pickup: { lat: trip.pickupLatitude, lng: trip.pickupLongitude },
          drop: { lat: trip.dropLatitude, lng: trip.dropLongitude },
        },
        matchedDemand,
        totalPotentialSaving: matchedDemand.reduce((sum, m) => sum + m.estimatedSaving, 0),
      });
    }

    // Store opportunities
    for (const opp of opportunities) {
      const existing = await (this.prisma as any).capacityOpportunity.findFirst({
        where: { companyId, tripId: opp.tripId, status: { not: 'EXPIRED' } },
      });

      if (!existing) {
        await (this.prisma as any).capacityOpportunity.create({
          data: {
            companyId,
            vehicleId: opp.vehicleId,
            tripId: opp.tripId,
            availableSeats: opp.availableSeats,
            pickupLat: opp.route.pickup.lat,
            pickupLng: opp.route.pickup.lng,
            dropLat: opp.route.drop.lat,
            dropLng: opp.route.drop.lng,
            departureTime: opp.departureTime,
            matchedDemand: opp.matchedDemand as any,
            status: 'DETECTED',
            expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
          },
        });
      }
    }

    return opportunities;
  }

  async getOpportunities(companyId: string) {
    return (this.prisma as any).capacityOpportunity.findMany({
      where: { companyId, status: { not: 'EXPIRED' } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async acceptOpportunity(companyId: string, opportunityId: string, userId: string) {
    const opp = await (this.prisma as any).capacityOpportunity.findFirst({
      where: { id: opportunityId, companyId },
    });
    if (!opp) throw new NotFoundException('Opportunity not found');
    if (opp.status !== 'DETECTED' && opp.status !== 'MATCHED') {
      throw new NotFoundException('Opportunity is no longer available');
    }

    await (this.prisma as any).capacityOpportunity.update({
      where: { id: opportunityId },
      data: { status: 'ACCEPTED', acceptedBy: userId, acceptedAt: new Date() },
    });

    await this.audit.log({
      userId, action: 'CAPACITY_OPPORTUNITY_ACCEPTED', entity: 'CapacityOpportunity',
      entityId: opportunityId, companyId,
    });

    return { success: true };
  }

  async declineOpportunity(companyId: string, opportunityId: string, userId: string) {
    await (this.prisma as any).capacityOpportunity.update({
      where: { id: opportunityId },
      data: { status: 'DECLINED' },
    });

    return { success: true };
  }

  async getOpportunitySummary(companyId: string) {
    const opportunities = await (this.prisma as any).capacityOpportunity.findMany({
      where: { companyId, status: { not: 'EXPIRED' } },
    });

    const totalSeats = opportunities.reduce((sum: number, o: any) => sum + (o.availableSeats || 0), 0);
    const totalSaving = opportunities.reduce((sum: number, o: any) => {
      const demand = (o.matchedDemand as any[]) || [];
      return sum + demand.reduce((s: number, d: any) => s + (d.estimatedSaving || 0), 0);
    }, 0);

    return {
      totalOpportunities: opportunities.length,
      totalAvailableSeats: totalSeats,
      totalPotentialSaving: Math.round(totalSaving),
      byStatus: {
        DETECTED: opportunities.filter((o: any) => o.status === 'DETECTED').length,
        MATCHED: opportunities.filter((o: any) => o.status === 'MATCHED').length,
        ACCEPTED: opportunities.filter((o: any) => o.status === 'ACCEPTED').length,
      },
    };
  }

  // ===== PRIVATE HELPERS =====

  private async findCompatibleBookings(
    companyId: string,
    tripPickupLat: number,
    tripPickupLng: number,
    tripDropLat: number,
    tripDropLng: number,
    tripTime: Date,
  ): Promise<any[]> {
    // Find pending bookings within 3km of pickup and 2km of drop, within 30 minutes
    const pendingBookings = await (this.prisma as any).booking.findMany({
      where: {
        companyId,
        status: 'PENDING',
        scheduledPickupTime: {
          gte: new Date(tripTime.getTime() - 30 * 60 * 1000),
          lte: new Date(tripTime.getTime() + 30 * 60 * 1000),
        },
      },
      include: { User: { select: { id: true, name: true } } },
    });

    const compatible = [];
    for (const booking of pendingBookings) {
      if (!booking.pickupLatitude || !booking.dropLatitude) continue;

      const pickupDist = this.haversine(tripPickupLat, tripPickupLng, booking.pickupLatitude, booking.pickupLongitude);
      const dropDist = this.haversine(tripDropLat, tripDropLng, booking.dropLatitude, booking.dropLongitude);

      if (pickupDist <= 3 && dropDist <= 2) {
        const routeMatch = Math.round((1 - (pickupDist + dropDist) / 5) * 100);
        const deviationMinutes = Math.round((pickupDist + dropDist) * 5); // ~5 min per km deviation
        const estimatedSaving = Math.round((pickupDist + dropDist) * 150); // Rs.150 saving per km avoided

        compatible.push({
          employeeId: booking.employeeId,
          employeeName: (booking as any).User?.name || booking.employeeId,
          routeMatch,
          deviationMinutes,
          estimatedSaving,
        });
      }
    }

    return compatible.sort((a, b) => b.routeMatch - a.routeMatch);
  }

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}

import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class RouteMatchService {
  private readonly logger = new Logger(RouteMatchService.name);
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(a));
  }

  async findRouteMatch(companyId: string, completingTripId: string) {
    if (!this.prisma.isConnected()) return null;

    const trip = await this.prisma.trip.findUnique({ where: { id: completingTripId } });
    if (!trip || trip.status !== 'ARRIVED_AT_DROP') return null;

    const radiusKm = 5;
    const dropLat = trip.dropLatitude;
    const dropLng = trip.dropLongitude;

    const latRange = radiusKm / 111;
    const lngRange = radiusKm / (111 * Math.cos((dropLat * Math.PI) / 180));

    const pendingBookings = await this.prisma.booking.findMany({
      where: {
        companyId,
        status: { in: ['APPROVED', 'DISPATCHING'] },
        serviceType: trip.type,
        date: trip.date,
        pickupLatitude: { gte: dropLat - latRange, lte: dropLat + latRange },
        pickupLongitude: { gte: dropLng - lngRange, lte: dropLng + lngRange },
        pickupTime: { gte: new Date(), lte: new Date(Date.now() + 60 * 60 * 1000) },
      },
      include: { requester: { select: { id: true, name: true } } } as any,
    });

    const candidates = pendingBookings
      .map((booking) => {
        const pickupDistance = this.haversine(dropLat, dropLng, booking.pickupLatitude, booking.pickupLongitude);
        if (pickupDistance > radiusKm) return null;

        const timeGapMinutes = Math.round((new Date(booking.pickupTime).getTime() - Date.now()) / 60000);
        if (timeGapMinutes < 0 || timeGapMinutes > 60) return null;

        const existingCandidate = this.prisma.routeMatchCandidate.findFirst({
          where: { companyId, completingTripId, candidateBookingId: booking.id, status: { in: ['PENDING', 'OFFERED'] } },
        });

        const proximityScore = Math.max(0, 30 - pickupDistance * 6);
        const timeScore = Math.max(0, 25 - timeGapMinutes * 0.5);
        const score = proximityScore + timeScore;

        return { booking, pickupDistance, timeGapMinutes, score };
      })
      .filter(Boolean) as { booking: any; pickupDistance: number; timeGapMinutes: number; score: number }[];

    candidates.sort((a, b) => b.score - a.score);
    return candidates[0] || null;
  }

  async offerMatch(companyId: string, tripId: string, bookingId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) return null;

    const candidate = await this.prisma.routeMatchCandidate.create({
      data: {
        companyId,
        completingTripId: tripId,
        candidateBookingId: bookingId,
        driverId: trip.driverId || '',
        vehicleId: trip.vehicleId || '',
        pickupDistanceKm: 0,
        timeGapMinutes: 0,
        score: 0,
        status: 'OFFERED',
        offeredAt: new Date(),
      },
    });

    await this.audit.log({
      companyId, userId: trip.driverId || 'system', action: 'ROUTE_MATCH_OFFERED',
      entity: 'RouteMatchCandidate', entityId: candidate.id,
      newValue: { tripId, bookingId },
    });

    return candidate;
  }

  async acceptMatch(companyId: string, candidateId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const candidate = await this.prisma.routeMatchCandidate.update({
      where: { id: candidateId },
      data: { status: 'ACCEPTED', respondedAt: new Date() },
    });

    await this.prisma.booking.update({
      where: { id: candidate.candidateBookingId },
      data: { tripId: candidate.completingTripId },
    });

    await this.audit.log({
      companyId, userId: candidate.driverId, action: 'ROUTE_MATCH_ACCEPTED',
      entity: 'RouteMatchCandidate', entityId: candidateId,
    });

    return candidate;
  }

  async declineMatch(companyId: string, candidateId: string, reason?: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    return this.prisma.routeMatchCandidate.update({
      where: { id: candidateId },
      data: { status: 'DECLINED', respondedAt: new Date(), declineReason: reason },
    });
  }

  async onTripCompleted(tripId: string) {
    try {
      const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
      if (!trip) return;

      const match = await this.findRouteMatch(trip.companyId, tripId);
      if (match) {
        await this.offerMatch(trip.companyId, tripId, match.booking.id);
        this.logger.log(`Route match offered: trip ${tripId} -> booking ${match.booking.id} (score: ${match.score})`);
      }
    } catch (err: any) {
      this.logger.error(`Route match failed for trip ${tripId}: ${err.message}`);
    }
  }
}

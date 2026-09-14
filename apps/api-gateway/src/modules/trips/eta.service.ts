import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class ETAService {
  private readonly logger = new Logger(ETAService.name);
  constructor(private prisma: PrismaService) {}

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(a));
  }

  async calculateETA(tripId: string) {
    if (!this.prisma.isConnected()) return { distance: 5.0, etaMinutes: 15 };

    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip || !trip.vehicleId) return null;

    const location = await this.prisma.latestVehicleLocation.findUnique({ where: { vehicleId: trip.vehicleId } });
    if (!location) return null;

    const targetLat = trip.status === 'EN_ROUTE_TO_PICKUP' ? trip.pickupLatitude : trip.dropLatitude;
    const targetLng = trip.status === 'EN_ROUTE_TO_PICKUP' ? trip.pickupLongitude : trip.dropLongitude;

    const distance = this.haversine(location.latitude, location.longitude, targetLat, targetLng);
    const speed = location.speed && location.speed > 0 ? location.speed : 30;
    const etaMinutes = Math.round((distance / speed) * 60);

    return {
      distance: Math.round(distance * 100) / 100,
      etaMinutes: Math.max(1, etaMinutes),
      currentLat: location.latitude,
      currentLng: location.longitude,
      speed: location.speed,
      heading: location.heading,
      timestamp: location.timestamp,
    };
  }

  async pushETA(tripId: string) {
    const eta = await this.calculateETA(tripId);
    if (!eta) return;

    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) return;

    const passengers = await this.prisma.tripPassenger.findMany({ where: { tripId } });
    for (const passenger of passengers) {
      await this.prisma.notification.create({
        data: {
          userId: passenger.userId,
          type: 'VEHICLE_APPROACHING',
          title: 'Your cab is on the way',
          message: `Driver is ${eta.etaMinutes} min away. Distance: ${eta.distance} km.`,
          data: { tripId, ...eta },
        },
      });
    }

    return eta;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { GeofenceEngine, GeofenceZone } from '../../common/maps/geofence-engine';
import { RouteDeviationDetector } from '../../common/maps/route-deviation';
import { WebhookDispatcherService } from '../../modules/notifications/webhook-dispatcher.service';

export interface TrackingPoint {
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  timestamp: Date;
  tripId: string;
  driverId: string;
  vehicleId: string;
  companyId: string;
}

@Injectable()
export class EnhancedTrackingService {
  private readonly logger = new Logger(EnhancedTrackingService.name);

  constructor(
    private prisma: PrismaService,
    private geofence: GeofenceEngine,
    private deviation: RouteDeviationDetector,
    private webhooks: WebhookDispatcherService
  ) {}

  async processTrackingPoint(point: TrackingPoint) {
    await this.prisma.gPSLog.create({
      data: {
        companyId: point.companyId,
        tripId: point.tripId,
        driverId: point.driverId,
        vehicleId: point.vehicleId,
        latitude: point.lat,
        longitude: point.lng,
        speed: point.speed,
        heading: point.heading,
        recordedAt: point.timestamp,
      },
    });

    const zones = await this.getZones(point.companyId);
    if (zones.length > 0) {
      const results = this.geofence.checkPointInZones(point.lat, point.lng, zones);
      for (const result of results) {
        if (result.inside) {
          await this.webhooks.dispatch(point.companyId, 'geofence.enter', {
            tripId: point.tripId,
            zoneId: result.zone.id,
            zoneName: result.zone.name,
            location: { lat: point.lat, lng: point.lng },
            timestamp: point.timestamp,
          });
        }
      }
    }

    const trip = await this.prisma.trip.findUnique({ where: { id: point.tripId } });
    if (trip?.routeId) {
      const routePoints = await this.getRoutePoints(trip.routeId);
      if (routePoints.length > 0) {
        const result = this.deviation.checkDeviation(point.lat, point.lng, routePoints, 200);
        if (result.isDeviated) {
          await this.webhooks.dispatch(point.companyId, 'route.deviation', {
            tripId: point.tripId,
            deviationDistance: result.deviationDistance,
            direction: result.direction,
            currentLocation: { lat: point.lat, lng: point.lng },
            nearestRoutePoint: result.nearestRoutePoint,
            timestamp: point.timestamp,
          });
        }
      }
    }
  }

  private async getZones(companyId: string): Promise<GeofenceZone[]> {
    const geofences = await this.prisma.geofence.findMany({ where: { companyId } });
    return geofences.map((g: any) => {
      const coords = g.coordinates as any;
      if (coords?.type === 'circle') {
        return {
          id: g.id,
          name: g.name,
          type: 'CIRCLE' as const,
          center: coords.center,
          radius: coords.radius,
        };
      }
      return {
        id: g.id,
        name: g.name,
        type: 'POLYGON' as const,
        polygon: coords?.polygon || [],
      };
    });
  }

  private async getRoutePoints(routeId: string): Promise<Array<{ lat: number; lng: number; sequence: number }>> {
    const stops = await this.prisma.routeStop.findMany({
      where: { routeId },
      orderBy: { sequence: 'asc' },
    });
    return stops.map((s: any, i: number) => ({
      lat: s.latitude,
      lng: s.longitude,
      sequence: i,
    }));
  }

  async runGeofenceAndRouteChecks(point: TrackingPoint) {
    const zones = await this.getZones(point.companyId);
    if (zones.length > 0) {
      const results = this.geofence.checkPointInZones(point.lat, point.lng, zones);
      for (const result of results) {
        if (result.inside) {
          await this.webhooks.dispatch(point.companyId, 'geofence.enter', {
            tripId: point.tripId,
            zoneId: result.zone.id,
            zoneName: result.zone.name,
            location: { lat: point.lat, lng: point.lng },
            timestamp: point.timestamp,
          });
        }
      }
    }

    if (point.tripId) {
      const trip = await this.prisma.trip.findUnique({ where: { id: point.tripId } });
      if (trip?.routeId) {
        const routePoints = await this.getRoutePoints(trip.routeId);
        if (routePoints.length > 0) {
          const result = this.deviation.checkDeviation(point.lat, point.lng, routePoints, 200);
          if (result.isDeviated) {
            await this.webhooks.dispatch(point.companyId, 'route.deviation', {
              tripId: point.tripId,
              deviationDistance: result.deviationDistance,
              direction: result.direction,
              currentLocation: { lat: point.lat, lng: point.lng },
              nearestRoutePoint: result.nearestRoutePoint,
              timestamp: point.timestamp,
            });
          }
        }
      }
    }
  }

  async getTripTrack(tripId: string, from?: Date, to?: Date) {
    const where: any = { tripId };
    if (from || to) {
      where.recordedAt = {};
      if (from) where.recordedAt.gte = from;
      if (to) where.recordedAt.lte = to;
    }
    return this.prisma.gPSLog.findMany({
      where,
      orderBy: { recordedAt: 'asc' },
      select: { latitude: true, longitude: true, speed: true, heading: true, recordedAt: true },
    });
  }
}

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { EventsGateway } from '../../common/events.gateway';
import { EnhancedTrackingService } from '../tracking/enhanced-tracking.service';

export class UpdateLocationDto {
  vehicleId: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  battery?: number;
  signal?: number;
  driverId?: string;
  tripId?: string;
}

export class CreateGeofenceDto {
  name: string;
  type?: string;
  latitude: number;
  longitude: number;
  radius: number;
}

@Injectable()
export class GPSTrackingService {
  private readonly logger = new Logger(GPSTrackingService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private eventsGateway: EventsGateway,
    private enhancedTracking: EnhancedTrackingService,
  ) {}

  /**
   * Receive and store GPS ping from vehicle/device.
   */
  async updateLocation(companyId: string, dto: UpdateLocationDto) {
    // Store GPS log entry
    const gpsLog = await this.prisma.gPSLog.create({
      data: {
        companyId,
        vehicleId: dto.vehicleId,
        driverId: dto.driverId,
        tripId: dto.tripId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        speed: dto.speed,
        heading: dto.heading,
        accuracy: dto.accuracy,
        battery: dto.battery,
        signal: dto.signal,
      },
    });

    // Upsert current vehicle location
    const vehicleLocation = await this.prisma.vehicleLocation.upsert({
      where: { vehicleId: dto.vehicleId },
      update: {
        latitude: dto.latitude,
        longitude: dto.longitude,
        speed: dto.speed,
        heading: dto.heading,
        driverId: dto.driverId,
        tripId: dto.tripId,
        lastUpdated: new Date(),
      },
      create: {
        companyId,
        vehicleId: dto.vehicleId,
        driverId: dto.driverId,
        tripId: dto.tripId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        speed: dto.speed,
        heading: dto.heading,
      },
    });

    // Check geofences
    await this.checkGeofences(companyId, dto.vehicleId, dto.latitude, dto.longitude);

    // Run enhanced geofence and route deviation checks
    try {
      await this.enhancedTracking.runGeofenceAndRouteChecks({
        lat: dto.latitude,
        lng: dto.longitude,
        speed: dto.speed,
        heading: dto.heading,
        timestamp: new Date(),
        tripId: dto.tripId || '',
        driverId: dto.driverId || '',
        vehicleId: dto.vehicleId,
        companyId,
      });
    } catch (error) {
      this.logger.error('Enhanced tracking checks failed', error);
    }

    // Broadcast real-time location update via WebSocket
    this.eventsGateway.broadcastToCompany(companyId, 'vehicle-location', {
      vehicleId: dto.vehicleId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      speed: dto.speed,
      heading: dto.heading,
      driverId: dto.driverId,
      tripId: dto.tripId,
      lastUpdate: new Date().toISOString(),
    });

    // If tripId provided, also broadcast to trip room
    if (dto.tripId) {
      this.eventsGateway.broadcastToTrip(dto.tripId, 'driver-location', {
        tripId: dto.tripId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        speed: dto.speed,
        heading: dto.heading,
        timestamp: new Date().toISOString(),
      });
    }

    return { gpsLog, vehicleLocation };
  }

  /**
   * Get current location of all vehicles.
   */
  async getVehicleLocations(companyId: string) {
    return this.prisma.vehicleLocation.findMany({
      where: { companyId },
      orderBy: { lastUpdated: 'desc' },
    });
  }

  /**
   * Get current location of a specific vehicle.
   */
  async getVehicleLocation(companyId: string, vehicleId: string) {
    const location = await this.prisma.vehicleLocation.findFirst({
      where: { vehicleId, companyId },
    });
    if (!location) throw new NotFoundException('Vehicle location not found');
    return location;
  }

  /**
   * Get GPS history for a vehicle.
   */
  async getVehicleHistory(companyId: string, vehicleId: string, from: string, to: string) {
    return this.prisma.gPSLog.findMany({
      where: {
        companyId,
        vehicleId,
        recordedAt: {
          gte: new Date(from),
          lte: new Date(to),
        },
      },
      orderBy: { recordedAt: 'asc' },
    });
  }

  /**
   * Get GPS history for a trip.
   */
  async getTripHistory(companyId: string, tripId: string) {
    return this.prisma.gPSLog.findMany({
      where: { companyId, tripId },
      orderBy: { recordedAt: 'asc' },
    });
  }

  // ===== Geofence Management =====

  async createGeofence(companyId: string, dto: CreateGeofenceDto, userId: string) {
    const geofence = await this.prisma.geofence.create({
      data: {
        name: dto.name,
        type: (dto.type || 'CUSTOM') as any,
        latitude: dto.latitude,
        longitude: dto.longitude,
        radius: dto.radius,
        companyId,
      },
    });

    await this.audit.log({
      userId, action: 'GEOFENCE_CREATED', entity: 'Geofence',
      entityId: geofence.id, companyId,
      newValue: { name: dto.name, radius: dto.radius },
    });

    return geofence;
  }

  async getGeofences(companyId: string) {
    return this.prisma.geofence.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateGeofence(companyId: string, geofenceId: string, dto: Partial<CreateGeofenceDto>, userId: string) {
    const geofence = await this.prisma.geofence.findFirst({
      where: { id: geofenceId, companyId },
    });
    if (!geofence) throw new NotFoundException('Geofence not found');

    const updateData: any = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.latitude) updateData.latitude = dto.latitude;
    if (dto.longitude) updateData.longitude = dto.longitude;
    if (dto.radius) updateData.radius = dto.radius;

    const updated = await this.prisma.geofence.update({
      where: { id: geofenceId },
      data: updateData,
    });

    await this.audit.log({
      userId, action: 'GEOFENCE_UPDATED', entity: 'Geofence',
      entityId: geofenceId, companyId, newValue: dto,
    });

    return updated;
  }

  async deleteGeofence(companyId: string, geofenceId: string, userId: string) {
    const geofence = await this.prisma.geofence.findFirst({
      where: { id: geofenceId, companyId },
    });
    if (!geofence) throw new NotFoundException('Geofence not found');

    await this.prisma.geofence.delete({ where: { id: geofenceId } });

    await this.audit.log({
      userId, action: 'GEOFENCE_DELETED', entity: 'Geofence',
      entityId: geofenceId, companyId,
    });

    return { success: true };
  }

  async getGeofenceEvents(companyId: string, geofenceId?: string) {
    const where: any = {};
    if (geofenceId) {
      const geofence = await this.prisma.geofence.findFirst({
        where: { id: geofenceId, companyId },
      });
      if (!geofence) throw new NotFoundException('Geofence not found');
      where.geofenceId = geofenceId;
    } else {
      // Filter by company's geofences to prevent cross-company data leak
      const companyGeofenceIds = await this.prisma.geofence.findMany({
        where: { companyId },
        select: { id: true },
      });
      where.geofenceId = { in: companyGeofenceIds.map((g) => g.id) };
    }

    return this.prisma.geofenceEvent.findMany({
      where,
      include: { Geofence: true },
      orderBy: { timestamp: 'desc' },
      take: 1000,
    });
  }

  // ===== Route Deviation =====

  async getRouteDeviations(companyId: string, status?: string) {
    const where: any = { companyId };
    if (status) where.status = status;

    return this.prisma.routeDeviation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolveRouteDeviation(companyId: string, deviationId: string, userId: string, status: string = 'RESOLVED') {
    const deviation = await this.prisma.routeDeviation.findFirst({
      where: { id: deviationId, companyId },
    });
    if (!deviation) throw new NotFoundException('Route deviation not found');

    return this.prisma.routeDeviation.update({
      where: { id: deviationId },
      data: {
        status: status as any,
        reviewedBy: userId,
      },
    });
  }

  // ===== Live Tracking =====

  async getLiveMap(companyId: string) {
    const [vehicles, geofences, recentEvents] = await Promise.all([
      this.prisma.vehicleLocation.findMany({ where: { companyId } }),
      this.prisma.geofence.findMany({ where: { companyId, isActive: true } }),
      this.prisma.geofenceEvent.findMany({
        where: { Geofence: { companyId } },
        include: { Geofence: true },
        orderBy: { timestamp: 'desc' },
        take: 50,
      }),
    ]);

    return { vehicles, geofences, recentEvents };
  }

  // ===== Private Helpers =====

  private async checkGeofences(companyId: string, vehicleId: string, lat: number, lng: number) {
    const geofences = await this.prisma.geofence.findMany({
      where: { companyId, isActive: true },
    });

    for (const geofence of geofences) {
      const distance = this.calculateDistance(lat, lng, geofence.latitude, geofence.longitude);
      const isInside = distance <= geofence.radius;

      // Get last event for this vehicle+geofence
      const lastEvent = await this.prisma.geofenceEvent.findFirst({
        where: { geofenceId: geofence.id, vehicleId },
        orderBy: { timestamp: 'desc' },
      });

      const wasInside = lastEvent?.action === 'ENTER';

      if (isInside && !wasInside) {
        // Vehicle entered geofence
        await this.prisma.geofenceEvent.create({
          data: {
            geofenceId: geofence.id,
            vehicleId,
            action: 'ENTER',
            latitude: lat,
            longitude: lng,
            timestamp: new Date(),
          },
        });
      } else if (!isInside && wasInside) {
        // Vehicle exited geofence
        await this.prisma.geofenceEvent.create({
          data: {
            geofenceId: geofence.id,
            vehicleId,
            action: 'EXIT',
            latitude: lat,
            longitude: lng,
            timestamp: new Date(),
          },
        });
      }
    }
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

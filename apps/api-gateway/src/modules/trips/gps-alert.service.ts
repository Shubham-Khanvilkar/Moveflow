import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { EventsGateway } from '../../common/events.gateway';

@Injectable()
export class GPSAlertService {
  private readonly logger = new Logger(GPSAlertService.name);
  private overspeedThresholds = new Map<string, number>();

  constructor(private prisma: PrismaService, private events: EventsGateway) {}

  async processLocationPing(data: {
    companyId: string;
    vehicleId: string;
    driverId: string;
    tripId?: string;
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
    accuracy?: number;
    timestamp: Date;
  }) {
    const alerts: any[] = [];

    if (data.accuracy && data.accuracy > 100) {
      alerts.push({ type: 'LOW_ACCURACY', severity: 'INFO', message: `GPS accuracy: ${data.accuracy}m` });
    }

    if (data.speed && data.speed > 80) {
      alerts.push({ type: 'OVERSPEEDING', severity: 'WARNING', message: `Vehicle speed: ${data.speed} km/h` });
      await this.createAlert(data.companyId, data.vehicleId, 'OVERSPEEDING', `Speed ${data.speed} km/h exceeds threshold`);
    }

    if (data.tripId) {
      const trip = await this.prisma.trip.findUnique({ where: { id: data.tripId } });
      if (trip && (trip as any).dropLatitude && (trip as any).dropLongitude) {
        const distToDrop = this.haversine(data.latitude, data.longitude, (trip as any).dropLatitude, (trip as any).dropLongitude);
        if (distToDrop < 0.5) {
          alerts.push({ type: 'APPROACHING_DESTINATION', severity: 'INFO', message: `Within ${Math.round(distToDrop * 1000)}m of destination` });
        }
      }
    }

    await this.prisma.locationPing.create({
      data: {
        vehicleId: data.vehicleId,
        userId: data.driverId,
        tripId: data.tripId || null,
        latitude: data.latitude,
        longitude: data.longitude,
        speed: data.speed,
        heading: data.heading,
        accuracy: data.accuracy,
        timestamp: data.timestamp,
      },
    });

    if (data.tripId) {
      this.events.broadcastToTrip(data.tripId, 'location-update', {
        vehicleId: data.vehicleId,
        latitude: data.latitude,
        longitude: data.longitude,
        speed: data.speed,
        heading: data.heading,
        timestamp: data.timestamp,
      });
    }

    this.events.broadcastToCompany(data.companyId, 'vehicle-location', {
      vehicleId: data.vehicleId,
      latitude: data.latitude,
      longitude: data.longitude,
      speed: data.speed,
    });

    return { processed: true, alerts };
  }

  async batchProcessPings(pings: any[]) {
    const results = [];
    for (const ping of pings) {
      const result = await this.processLocationPing(ping);
      results.push(result);
    }
    return { processed: results.length, alerts: results.flatMap(r => r.alerts) };
  }

  async createAlert(companyId: string, vehicleId: string, type: string, message: string) {
    await (this.prisma as any).safetyAlert.create({
      data: { companyId, vehicleId, type, message, severity: 'MEDIUM' },
    });
  }

  async getOverspeedingAlerts(companyId: string, params: { from?: Date; to?: Date }) {
    return (this.prisma as any).safetyAlert.findMany({
      where: { companyId, type: 'OVERSPEEDING' as any, createdAt: params.from ? { gte: params.from } : undefined } as any,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getAlertStats(companyId: string) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const alerts = await (this.prisma as any).safetyAlert.findMany({
      where: { companyId, createdAt: { gte: today } },
    });
    return {
      total: alerts.length,
      byType: alerts.reduce((acc: any, a: any) => { acc[a.type] = (acc[a.type] || 0) + 1; return acc; }, {}),
      bySeverity: alerts.reduce((acc: any, a: any) => { acc[a.severity] = (acc[a.severity] || 0) + 1; return acc; }, {}),
    };
  }

  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}

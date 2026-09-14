import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class RouteCacheService {
  private readonly logger = new Logger(RouteCacheService.name);
  private cache = new Map<string, { data: any; expiresAt: number }>();
  private readonly ttlMs = 3600000;

  constructor(private prisma: PrismaService) {}

  async getRoute(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) {
    const key = this.buildKey(origin, destination);
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    return null;
  }

  async setRoute(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }, data: any) {
    const key = this.buildKey(origin, destination);
    this.cache.set(key, { data, expiresAt: Date.now() + this.ttlMs });
  }

  async computeRoute(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) {
    const cached = await this.getRoute(origin, destination);
    if (cached) return cached;

    const distanceKm = this.haversineDistance(origin.lat, origin.lng, destination.lat, destination.lng);
    const estimatedMinutes = Math.ceil(distanceKm * 2);
    const result = {
      origin, destination,
      distanceKm: Math.round(distanceKm * 100) / 100,
      estimatedMinutes,
      polyline: null,
      computedAt: new Date().toISOString(),
    };

    await this.setRoute(origin, destination, result);
    return result;
  }

  private buildKey(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) {
    return `${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}->${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}`;
  }

  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  getStats() {
    return { cacheSize: this.cache.size, ttlMs: this.ttlMs };
  }

  clear() {
    this.cache.clear();
  }
}

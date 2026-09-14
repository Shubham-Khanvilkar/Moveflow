import { Injectable, Logger } from '@nestjs/common';

export interface GeofenceZone {
  id: string;
  name: string;
  type: 'CIRCLE' | 'POLYGON';
  center?: { lat: number; lng: number };
  radius?: number; // meters
  polygon?: { lat: number; lng: number }[];
  metadata?: any;
}

export interface GeofenceEvent {
  zoneId: string;
  zoneName: string;
  action: 'ENTER' | 'EXIT' | 'DWELL';
  location: { lat: number; lng: number };
  timestamp: Date;
}

@Injectable()
export class GeofenceEngine {
  private readonly logger = new Logger(GeofenceEngine.name);

  checkPointInZones(
    lat: number,
    lng: number,
    zones: GeofenceZone[]
  ): Array<{ zone: GeofenceZone; inside: boolean }> {
    return zones.map(zone => ({
      zone,
      inside: this.isPointInZone(lat, lng, zone),
    }));
  }

  isPointInZone(lat: number, lng: number, zone: GeofenceZone): boolean {
    if (zone.type === 'CIRCLE') {
      if (!zone.center || zone.radius === undefined) return false;
      return this.isInsideCircle(lat, lng, zone.center.lat, zone.center.lng, zone.radius);
    }
    if (zone.type === 'POLYGON' && zone.polygon) {
      return this.isInsidePolygon(lat, lng, zone.polygon);
    }
    return false;
  }

  private isInsideCircle(lat: number, lng: number, cLat: number, cLng: number, radiusM: number): boolean {
    const R = 6371000;
    const dLat = this.toRad(lat - cLat);
    const dLng = this.toRad(lng - cLng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(this.toRad(cLat)) * Math.cos(this.toRad(lat)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c <= radiusM;
  }

  private isInsidePolygon(lat: number, lng: number, polygon: { lat: number; lng: number }[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lat, yi = polygon[i].lng;
      const xj = polygon[j].lat, yj = polygon[j].lng;
      if ((yi > lng) !== (yj > lng) && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}

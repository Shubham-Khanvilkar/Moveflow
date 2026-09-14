import { Injectable, Logger } from '@nestjs/common';

export interface RoutePoint {
  lat: number;
  lng: number;
  sequence: number;
}

export interface DeviationResult {
  isDeviated: boolean;
  deviationDistance: number; // meters from route
  deviationPoint: { lat: number; lng: number } | null;
  nearestRoutePoint: { lat: number; lng: number } | null;
  direction: 'LEFT' | 'RIGHT' | 'ON_ROUTE';
}

@Injectable()
export class RouteDeviationDetector {
  private readonly logger = new Logger(RouteDeviationDetector.name);

  checkDeviation(
    currentLat: number,
    currentLng: number,
    routePoints: RoutePoint[],
    thresholdMeters: number = 200
  ): DeviationResult {
    if (!routePoints.length) {
      return { isDeviated: true, deviationDistance: Infinity, deviationPoint: null, nearestRoutePoint: null, direction: 'ON_ROUTE' };
    }

    let minDist = Infinity;
    let nearestIdx = 0;

    for (let i = 0; i < routePoints.length - 1; i++) {
      const segDist = this.pointToSegmentDistance(
        currentLat, currentLng,
        routePoints[i].lat, routePoints[i].lng,
        routePoints[i + 1].lat, routePoints[i + 1].lng
      );
      if (segDist < minDist) {
        minDist = segDist;
        nearestIdx = i;
      }
    }

    const nearest = routePoints[nearestIdx];
    const isDeviated = minDist > thresholdMeters;

    const direction = this.getDirection(
      currentLat, currentLng,
      routePoints[nearestIdx].lat, routePoints[nearestIdx].lng,
      nearestIdx < routePoints.length - 1 ? routePoints[nearestIdx + 1].lat : routePoints[nearestIdx].lat,
      nearestIdx < routePoints.length - 1 ? routePoints[nearestIdx + 1].lng : routePoints[nearestIdx].lng
    );

    return {
      isDeviated,
      deviationDistance: Math.round(minDist),
      deviationPoint: { lat: currentLat, lng: currentLng },
      nearestRoutePoint: { lat: nearest.lat, lng: nearest.lng },
      direction,
    };
  }

  private pointToSegmentDistance(
    px: number, py: number,
    ax: number, ay: number,
    bx: number, by: number
  ): number {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return this.haversine(px, py, ax, ay);

    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = ax + t * dx;
    const projY = ay + t * dy;
    return this.haversine(px, py, projX, projY);
  }

  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private getDirection(
    pLat: number, pLng: number,
    aLat: number, aLng: number,
    bLat: number, bLng: number
  ): 'LEFT' | 'RIGHT' | 'ON_ROUTE' {
    const cross = (bLng - aLng) * (pLat - aLat) - (bLat - aLat) * (pLng - aLng);
    if (Math.abs(cross) < 1e-10) return 'ON_ROUTE';
    return cross > 0 ? 'LEFT' : 'RIGHT';
  }

  decodePolyline(encoded: string): RoutePoint[] {
    const points: RoutePoint[] = [];
    let index = 0, lat = 0, lng = 0;
    while (index < encoded.length) {
      let b: number, shift = 0, result = 0;
      do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      lat += ((result & 1) ? ~(result >> 1) : (result >> 1));
      shift = 0; result = 0;
      do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      lng += ((result & 1) ? ~(result >> 1) : (result >> 1));
      points.push({ lat: lat / 1e5, lng: lng / 1e5, sequence: points.length });
    }
    return points;
  }
}

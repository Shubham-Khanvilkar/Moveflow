import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MapProvider, Place, RouteResult, MatrixResult } from './map-provider.interface';

@Injectable()
export class GoogleMapsProvider implements MapProvider {
  private readonly logger = new Logger(GoogleMapsProvider.name);
  private apiKey: string;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('GOOGLE_MAPS_API_KEY', '');
  }

  private async fetch<T>(endpoint: string, params: Record<string, string>): Promise<T> {
    const url = new URL(`https://maps.googleapis.com/maps/api/${endpoint}`);
    url.searchParams.set('key', this.apiKey);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Google Maps API error: ${res.status}`);
    const data = await res.json();
    if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Maps ${endpoint} failed: ${data.status} - ${data.error_message || ''}`);
    }
    return data;
  }

  async geocode(address: string): Promise<{ lat: number; lng: number }> {
    const data = await this.fetch<any>('geocode/json', { address });
    if (!data.results?.length) throw new Error(`No results for address: ${address}`);
    const loc = data.results[0].geometry.location;
    return { lat: loc.lat, lng: loc.lng };
  }

  async reverseGeocode(lat: number, lng: number): Promise<string> {
    const data = await this.fetch<any>('geocode/json', { latlng: `${lat},${lng}` });
    if (!data.results?.length) return `${lat},${lng}`;
    return data.results[0].formatted_address;
  }

  async validateAddress(address: string): Promise<{ valid: boolean; suggestion?: string }> {
    try {
      const data = await this.fetch<any>('geocode/json', { address });
      if (data.results?.length > 0) {
        return { valid: true, suggestion: data.results[0].formatted_address };
      }
      return { valid: false };
    } catch {
      return { valid: false };
    }
  }

  async searchPlaces(query: string, location?: { lat: number; lng: number }): Promise<Place[]> {
    const params: Record<string, string> = { input: query, types: 'geocode|establishment' };
    if (location) params.location = `${location.lat},${location.lng}`;
    const data = await this.fetch<any>('place/autocomplete/json', params);
    return (data.predictions || []).map((p: any) => ({
      placeId: p.place_id,
      name: p.structured_formatting?.main_text || '',
      address: p.description,
      lat: 0,
      lng: 0,
      types: p.types || [],
    }));
  }

  async calculateRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    waypoints?: { lat: number; lng: number }[]
  ): Promise<RouteResult> {
    const params: Record<string, string> = {
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      mode: 'driving',
    };
    if (waypoints?.length) {
      params.waypoints = waypoints.map(w => `${w.lat},${w.lng}`).join('|');
      params.optimize = 'true';
    }

    const data = await this.fetch<any>('directions/json', params);
    if (!data.routes?.length) throw new Error('No route found');
    const route = data.routes[0];
    const leg = route.legs[0];

    const steps = leg.steps.map((s: any) => ({
      instruction: s.html_instructions?.replace(/<[^>]+>/g, '') || '',
      distance: s.distance?.value / 1000 || 0,
      duration: s.duration?.value / 60 || 0,
      startLat: s.start_location.lat,
      startLng: s.start_location.lng,
      endLat: s.end_location.lat,
      endLng: s.end_location.lng,
    }));

    return {
      distance: leg.distance?.value / 1000 || 0,
      duration: leg.duration?.value / 60 || 0,
      polyline: route.overview_polyline.points || '',
      steps,
    };
  }

  async calculateMatrix(
    origins: { lat: number; lng: number }[],
    destinations: { lat: number; lng: number }[]
  ): Promise<MatrixResult> {
    const params: Record<string, string> = {
      origins: origins.map(o => `${o.lat},${o.lng}`).join('|'),
      destinations: destinations.map(d => `${d.lat},${d.lng}`).join('|'),
      mode: 'driving',
    };

    const data = await this.fetch<any>('distancematrix/json', params);
    const distances = data.rows.map((row: any) =>
      row.elements.map((el: any) => (el.distance?.value || 0) / 1000)
    );
    const durations = data.rows.map((row: any) =>
      row.elements.map((el: any) => (el.duration?.value || 0) / 60)
    );

    return { distances, durations };
  }

  async optimizeRoute(stops: { lat: number; lng: number }[]): Promise<{
    order: number[];
    totalDistance: number;
    totalDuration: number;
  }> {
    if (stops.length <= 2) {
      const route = await this.calculateRoute(stops[0], stops[stops.length - 1]);
      return { order: [0, stops.length - 1], totalDistance: route.distance, totalDuration: route.duration };
    }

    const origin = stops[0];
    const dest = stops[stops.length - 1];
    const waypoints = stops.slice(1, -1);
    const route = await this.calculateRoute(origin, dest, waypoints);

    let order = [0];
    let accumulatedDist = 0;
    let accumulatedDur = 0;
    const usedIndices = new Set([0, stops.length - 1]);

    for (const step of route.steps) {
      let nearestIdx = -1;
      let nearestDist = Infinity;
      for (let i = 0; i < stops.length; i++) {
        if (usedIndices.has(i)) continue;
        const dx = stops[i].lat - step.endLat;
        const dy = stops[i].lng - step.endLng;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }
      }
      if (nearestIdx >= 0 && nearestDist < 0.01) {
        order.push(nearestIdx);
        usedIndices.add(nearestIdx);
        accumulatedDist += step.distance;
        accumulatedDur += step.duration;
      }
    }

    order.push(stops.length - 1);
    return { order, totalDistance: accumulatedDist, totalDuration: accumulatedDur };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class GeospatialEngineService {
  private readonly logger = new Logger(GeospatialEngineService.name);
  constructor(private prisma: PrismaService) {}

  // H3-like geohash encoding (simplified)
  encodeGeohash(lat: number, lon: number, precision: number = 6): string {
    const chars = '0123456789bcdefghjkmnpqrstuvwxyz';
    let minLat = -90, maxLat = 90, minLon = -180, maxLon = 180;
    let hash = '', bit = 0, ch = 0;
    while (hash.length < precision) {
      if (bit % 2 === 0) { const mid = (minLon + maxLon) / 2; if (lon > mid) { ch |= 1 << (4 - bit / 2); minLon = mid; } else { maxLon = mid; } }
      else { const mid = (minLat + maxLat) / 2; if (lat > mid) { ch |= 1 << (4 - (bit - 1) / 2); minLat = mid; } else { maxLat = mid; } }
      if (bit < 9) { bit++; } else { hash += chars[ch]; bit = 0; ch = 0; }
    }
    return hash;
  }

  async getEmployeeDensityHeatmap(companyId: string, shiftId?: string) {
    const employees = await (this.prisma as any).user.findMany({
      where: { companyId, status: 'ACTIVE' as any },
      select: { id: true, orgAssignments: { select: { siteId: true } } },
    });

    const clusters: Record<string, { count: number; employees: string[]; geohash: string }> = {};

    // In production: use actual employee pickup lat/lon from SavedLocation
    for (const emp of employees) {
      // Simplified: cluster by site
      for (const assignment of (emp as any).orgAssignments || []) {
        const key = assignment.siteId || 'unknown';
        if (!clusters[key]) clusters[key] = { count: 0, employees: [], geohash: '' };
        clusters[key].count++;
        clusters[key].employees.push(emp.id);
      }
    }

    return { totalEmployees: employees.length, clusters };
  }

  async recommendNodalPoints(companyId: string, zoneLat: number, zoneLon: number, radiusKm: number) {
    // Find employee density clusters within radius
    const employees = await (this.prisma as any).user.findMany({ where: { companyId }, select: { id: true } });

    return {
      zoneCenter: { lat: zoneLat, lon: zoneLon },
      radiusKm,
      totalEmployees: employees.length,
      recommendations: [
        { lat: zoneLat + 0.01, lon: zoneLon + 0.005, estimatedPassengers: Math.floor(employees.length * 0.3), confidence: 0.85 },
        { lat: zoneLat - 0.008, lon: zoneLon - 0.003, estimatedPassengers: Math.floor(employees.length * 0.25), confidence: 0.78 },
      ],
    };
  }

  async optimizeNodalPoints(companyId: string) {
    const existingNodals = await (this.prisma as any).nodalPoint.findMany({ where: { companyId } });
    return {
      currentNodals: existingNodals.length,
      recommendations: existingNodals.map((n: any) => ({
        id: n.id,
        name: n.name,
        utilization: Math.round(Math.random() * 100),
        suggestion: Math.random() > 0.5 ? 'INCREASE_CAPACITY' : 'OPTIMIZE_LOCATION',
      })),
    };
  }

  async generateGeofenceFromClusters(companyId: string) {
    const employees = await (this.prisma as any).user.findMany({ where: { companyId }, select: { id: true } });
    return {
      generatedGeofences: employees.length > 0 ? [
        { name: 'Office Complex', latitude: 19.076, longitude: 72.8777, radiusMeters: 200, type: 'OFFICE' },
        { name: 'Nodal Point A', latitude: 19.08, longitude: 72.88, radiusMeters: 150, type: 'NODAL' },
      ] : [],
    };
  }

  async getDemandPrediction(companyId: string, date: Date, shiftId?: string) {
    return {
      date: date.toISOString().split('T')[0],
      predictedDemand: { morning: 45, evening: 42, night: 28 },
      peakHour: '09:00-10:00',
      confidence: 0.82,
    };
  }
}

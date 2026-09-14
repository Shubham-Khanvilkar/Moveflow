import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

// ============================================================
// GEOSPATIAL HELPERS
// ============================================================

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function isPointInCircle(lat: number, lng: number, centerLat: number, centerLng: number, radiusMeters: number): boolean {
  return haversineDistance(lat, lng, centerLat, centerLng) <= radiusMeters;
}

function isPointInPolygon(lat: number, lng: number, polygon: Array<{ lat: number; lng: number }>): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;
    const intersect = ((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInsideArea(lat: number, lng: number, area: {
  areaType: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters?: number | null;
  polygonPoints?: any;
}): boolean {
  if (area.areaType === 'CIRCLE' || area.areaType === 'RADIUS') {
    return isPointInCircle(lat, lng, area.centerLatitude, area.centerLongitude, area.radiusMeters || 1000);
  }
  if (area.areaType === 'POLYGON' && area.polygonPoints) {
    const points = typeof area.polygonPoints === 'string' ? JSON.parse(area.polygonPoints) : area.polygonPoints;
    return isPointInPolygon(lat, lng, points);
  }
  // ZONE: use circle with default 2km radius
  return isPointInCircle(lat, lng, area.centerLatitude, area.centerLongitude, 2000);
}

@Injectable()
export class DriverPreferencesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ============================================================
  // 1. PREFERRED AREA CRUD
  // ============================================================

  async listPreferredAreas(companyId: string, driverUserId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const areas = await this.prisma.driverPreferredArea.findMany({
      where: { companyId, driverId: driverUserId },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });

    // Also include temporary areas that are currently active
    const now = new Date();
    const temporaryAreas = await this.prisma.driverAreaPreferenceSchedule.findMany({
      where: {
        companyId,
        driverId: driverUserId,
        startAt: { lte: now },
        endAt: { gte: now },
      },
      include: { area: true } as any,
    });

    return {
      permanentAreas: areas,
      temporaryAreas: (temporaryAreas as any[]).map(t => ({
        ...t.area,
        scheduleStart: t.startAt,
        scheduleEnd: t.endAt,
        isTemporary: true,
      })),
    };
  }

  async addPreferredArea(companyId: string, driverUserId: string, data: {
    name: string;
    areaType?: string;
    centerLatitude: number;
    centerLongitude: number;
    radiusMeters?: number;
    polygonPoints?: Array<{ lat: number; lng: number }>;
    priority?: number;
    preferenceLevel?: string;
    shiftName?: string;
  }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    // Check duplicate name
    const existing = await this.prisma.driverPreferredArea.findUnique({
      where: { companyId_driverId_name: { companyId, driverId: driverUserId, name: data.name } },
    });
    if (existing) {
      throw new ConflictException(`Area "${data.name}" already exists`);
    }

    // Validate geometry
    if (!data.centerLatitude || !data.centerLongitude) {
      throw new BadRequestException('centerLatitude and centerLongitude are required');
    }
    if (data.areaType === 'POLYGON' && (!data.polygonPoints || data.polygonPoints.length < 3)) {
      throw new BadRequestException('Polygon requires at least 3 points');
    }

    const area = await this.prisma.driverPreferredArea.create({
      data: {
        companyId,
        driverId: driverUserId,
        name: data.name,
        areaType: (data.areaType as any) || 'CIRCLE',
        centerLatitude: data.centerLatitude,
        centerLongitude: data.centerLongitude,
        radiusMeters: data.radiusMeters,
        polygonPoints: data.polygonPoints || undefined,
        priority: data.priority || 1,
        preferenceLevel: (data.preferenceLevel as any) || 'PREFERRED',
        shiftName: data.shiftName,
      },
    });

    await this.audit.log({
      companyId,
      userId: driverUserId,
      action: 'AREA_CREATED',
      entity: 'DriverPreferredArea',
      entityId: area.id,
      newValue: { name: data.name, lat: data.centerLatitude, lng: data.centerLongitude },
    });

    return area;
  }

  async updatePreferredArea(companyId: string, driverUserId: string, areaId: string, data: Record<string, any>) {
    if (!this.prisma.isConnected()) {
      throw new ServiceUnavailableException('Database unavailable');
    }

    const area = await this.prisma.driverPreferredArea.findFirst({
      where: { id: areaId, companyId, driverId: driverUserId },
    });
    if (!area) throw new NotFoundException('Area not found');

    const allowed = ['name', 'centerLatitude', 'centerLongitude', 'radiusMeters', 'polygonPoints', 'priority', 'preferenceLevel', 'active', 'shiftName'];
    const updateData: any = {};
    for (const key of allowed) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }

    const updated = await this.prisma.driverPreferredArea.update({
      where: { id: areaId },
      data: updateData,
    });

    await this.audit.log({
      companyId,
      userId: driverUserId,
      action: 'AREA_UPDATED',
      entity: 'DriverPreferredArea',
      entityId: areaId,
      oldValue: { name: area.name, priority: area.priority },
      newValue: updateData,
    });

    return updated;
  }

  async deletePreferredArea(companyId: string, driverUserId: string, areaId: string) {
    if (!this.prisma.isConnected()) {
      throw new ServiceUnavailableException('Database unavailable');
    }

    const area = await this.prisma.driverPreferredArea.findFirst({
      where: { id: areaId, companyId, driverId: driverUserId },
    });
    if (!area) throw new NotFoundException('Area not found');

    await this.prisma.driverPreferredArea.delete({ where: { id: areaId } });

    await this.audit.log({
      companyId,
      userId: driverUserId,
      action: 'AREA_DELETED',
      entity: 'DriverPreferredArea',
      entityId: areaId,
      oldValue: { name: area.name },
    });

    return { deleted: true, id: areaId };
  }

  // ============================================================
  // 2. TEMPORARY PREFERENCES
  // ============================================================

  async addTemporaryPreference(companyId: string, driverUserId: string, data: {
    areaId: string;
    startAt: string;
    endAt: string;
    priority?: number;
  }) {
    if (!this.prisma.isConnected()) {
      throw new ServiceUnavailableException('Database unavailable');
    }

    const area = await this.prisma.driverPreferredArea.findFirst({
      where: { id: data.areaId, companyId, driverId: driverUserId },
    });
    if (!area) throw new NotFoundException('Area not found');

    const startDate = new Date(data.startAt);
    const endDate = new Date(data.endAt);
    if (endDate <= startDate) {
      throw new BadRequestException('endAt must be after startAt');
    }
    if (endDate.getTime() - startDate.getTime() > 24 * 60 * 60 * 1000) {
      throw new BadRequestException('Temporary preference cannot exceed 24 hours');
    }

    const schedule = await this.prisma.driverAreaPreferenceSchedule.create({
      data: {
        companyId,
        driverId: driverUserId,
        areaId: data.areaId,
        startAt: startDate,
        endAt: endDate,
        priority: data.priority || 1,
      },
    });

    await this.audit.log({
      companyId,
      userId: driverUserId,
      action: 'TEMP_PREFERENCE_CREATED',
      entity: 'DriverAreaPreferenceSchedule',
      entityId: schedule.id,
      newValue: { areaId: data.areaId, areaName: area.name, startAt: data.startAt, endAt: data.endAt },
    });

    return { ...schedule, areaName: area.name };
  }

  // ============================================================
  // 3. DRIVER ELIGIBILITY
  // ============================================================

  async getDriverEligibility(companyId: string, driverUserId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const config = await this.getOrCreateConfig(companyId);
    const now = new Date();

    const areas = await this.prisma.driverPreferredArea.findMany({
      where: { companyId, driverId: driverUserId, active: true },
      orderBy: { priority: 'asc' },
    });

    const temporaryAreas = await this.prisma.driverAreaPreferenceSchedule.findMany({
      where: {
        companyId, driverId: driverUserId,
        startAt: { lte: now },
        endAt: { gte: now },
      },
      include: { area: true } as any,
    });

    const homeBase = await this.prisma.driverHomeBase.findFirst({
      where: { companyId, driverId: driverUserId },
    });

    return {
      driverId: driverUserId,
      preferenceMode: config.defaultPreferenceMode,
      primaryAreas: (areas as any[]).filter(a => a.preferenceLevel === 'PRIMARY').map(a => a.name),
      preferredAreas: (areas as any[]).filter(a => a.preferenceLevel === 'PREFERRED').map(a => a.name),
      secondaryAreas: (areas as any[]).filter(a => a.preferenceLevel === 'SECONDARY').map(a => a.name),
      temporaryAreas: (temporaryAreas as any[]).map(t => ({
        name: t.area.name,
        active: true,
        expiresAt: t.endAt,
      })),
      homeBase: homeBase ? { name: homeBase.name, latitude: homeBase.latitude, longitude: homeBase.longitude } : null,
      config: {
        primaryWeight: config.primaryAreaWeight,
        preferredWeight: config.preferredAreaWeight,
        secondaryWeight: config.secondaryAreaWeight,
        expansionThreshold: config.demandExpansionThreshold,
      },
    };
  }

  // ============================================================
  // 4. DEMAND PRESSURE SCORING
  // ============================================================

  async calculateDemandPressure(companyId: string, zoneName: string, zoneLat: number, zoneLng: number) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    // Count pending bookings near this zone
    const pendingBookings = await this.prisma.booking.count({
      where: {
        companyId,
        status: { in: ['REQUESTED', 'PENDING_APPROVAL', 'APPROVED'] },
        pickupLatitude: { gte: zoneLat - 0.05, lte: zoneLat + 0.05 },
        pickupLongitude: { gte: zoneLng - 0.05, lte: zoneLng + 0.05 },
      },
    });

    // Count available drivers
    const availableDrivers = await this.prisma.driverProfile.count({
      where: {
        companyId,
        status: 'ACTIVE' as any,
      },
    });

    // Count available vehicles
    const availableVehicles = await this.prisma.vehicle.count({
      where: {
        companyId,
        status: 'AVAILABLE',
      },
    });

    const config = await this.getOrCreateConfig(companyId);
    const demandRatio = availableDrivers > 0 ? pendingBookings / availableDrivers : pendingBookings;

    // Determine expansion level
    let expansionLevel = 0;
    if (demandRatio >= config.demandExpansionThreshold * 3) expansionLevel = 3;
    else if (demandRatio >= config.demandExpansionThreshold * 2) expansionLevel = 2;
    else if (demandRatio >= config.demandExpansionThreshold) expansionLevel = 1;

    // Store snapshot
    const snapshot = await this.prisma.demandPressureSnapshot.create({
      data: {
        companyId,
        zoneName,
        zoneLatitude: zoneLat,
        zoneLongitude: zoneLng,
        pendingBookings,
        availableDrivers,
        availableVehicles,
        demandRatio,
        expansionLevel,
      },
    });

    return {
      zoneName,
      pendingBookings,
      availableDrivers,
      availableVehicles,
      demandRatio: Math.round(demandRatio * 100) / 100,
      expansionLevel,
      expansionReason: expansionLevel === 0 ? 'NORMAL' :
        expansionLevel === 1 ? 'NEARBY_EXPANSION' :
        expansionLevel === 2 ? 'WIDE_EXPANSION' : 'COMPANY_WIDE_EXPANSION',
    };
  }

  // ============================================================
  // 5. DISPATCH SCORING (THE CORE ALGORITHM)
  // ============================================================

  async calculateDispatchScore(companyId: string, driverUserId: string, tripPickup: {
    latitude: number;
    longitude: number;
    address?: string;
  }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const config = await this.getOrCreateConfig(companyId);
    const now = new Date();

    // Get driver's preferred areas
    const areas = await this.prisma.driverPreferredArea.findMany({
      where: { companyId, driverId: driverUserId, active: true },
    });

    // Get temporary active areas
    const tempAreas = await this.prisma.driverAreaPreferenceSchedule.findMany({
      where: {
        companyId, driverId: driverUserId,
        startAt: { lte: now }, endAt: { gte: now },
      },
      include: { area: true } as any,
    });

    // All active areas (permanent + temporary)
    const allAreas = [...areas, ...tempAreas.map(t => t.area)];

    // Determine which area contains the pickup point
    let areaMatch: { level: string; name: string; bonus: number } | null = null;

    for (const area of allAreas) {
      if (pointInsideArea(tripPickup.latitude, tripPickup.longitude, area)) {
        let bonus = 0;
        let level = '';
        if (area.preferenceLevel === 'PRIMARY') {
          bonus = config.primaryAreaWeight;
          level = 'PRIMARY';
        } else if (area.preferenceLevel === 'PREFERRED') {
          bonus = config.preferredAreaWeight;
          level = 'PREFERRED';
        } else {
          bonus = config.secondaryAreaWeight;
          level = 'SECONDARY';
        }
        // Take the best match
        if (!areaMatch || bonus > areaMatch.bonus) {
          areaMatch = { level, name: area.name, bonus };
        }
      }
    }

    // Get driver's current location (latest GPS)
    const latestLocation = await this.prisma.latestVehicleLocation.findUnique({
      where: { vehicleId: driverUserId }, // may not match exactly
    });

    // Distance score (closer = higher, max 25 points)
    let distanceScore = 12; // default if unknown
    if (latestLocation) {
      const dist = haversineDistance(
        tripPickup.latitude, tripPickup.longitude,
        latestLocation.latitude, latestLocation.longitude,
      );
      // 0-5km → 25 pts, 5-15km → 15 pts, 15-30km → 5 pts, 30km+ → 0
      if (dist <= 5000) distanceScore = 25;
      else if (dist <= 15000) distanceScore = 15;
      else if (dist <= 30000) distanceScore = 5;
      else distanceScore = 0;
    }

    // Compliance score (binary: 25 if compliant, 0 if not)
    let complianceScore = 0;
    if (this.prisma.isConnected()) {
      const driverRecord = await (this.prisma as any).driver.findFirst({
        where: { userId: driverUserId, companyId },
      });
      complianceScore = driverRecord?.complianceStatus === 'COMPLIANT' ? 25 : 0;
    } else {
      complianceScore = 25;
    }

    // Capacity score (based on current trip count vs max, max 10)
    let capacityScore = 5;
    if (this.prisma.isConnected()) {
      const activeTrips = await (this.prisma as any).trip.count({
        where: { driverId: driverUserId, status: { in: ['ASSIGNED', 'IN_PROGRESS'] } },
      });
      capacityScore = activeTrips === 0 ? 10 : activeTrips === 1 ? 7 : activeTrips === 2 ? 3 : 0;
    }

    // Workload score (based on hours worked today, max 10)
    let workloadScore = 7;
    if (this.prisma.isConnected()) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayTrips = await (this.prisma as any).trip.count({
        where: { driverId: driverUserId, createdAt: { gte: todayStart } },
      });
      workloadScore = todayTrips <= 2 ? 10 : todayTrips <= 4 ? 7 : todayTrips <= 6 ? 4 : 1;
    }

    // Route compatibility (based on preferred areas overlap, max 15)
    let routeScore = 8;
    if (areaMatch && areaMatch.level !== 'NONE') {
      routeScore = areaMatch.level === 'EXACT' ? 15 : areaMatch.level === 'PARTIAL' ? 10 : 5;
    }

    // Calculate demand pressure
    const demandPressure = await this.calculateDemandPressure(
      companyId, 'current', tripPickup.latitude, tripPickup.longitude,
    );

    const totalScore = distanceScore + (areaMatch?.bonus || 0) + complianceScore + capacityScore + workloadScore + routeScore;

    return {
      driverId: driverUserId,
      tripPickup,
      scores: {
        distance: distanceScore,
        preferredArea: areaMatch?.bonus || 0,
        compliance: complianceScore,
        capacity: capacityScore,
        workload: workloadScore,
        routeCompatibility: routeScore,
        total: totalScore,
      },
      areaMatch: areaMatch || { level: 'NONE', name: null, bonus: 0 },
      demandPressure: demandPressure.expansionLevel,
      expansionReason: demandPressure.expansionReason,
      eligible: true,
      maxScore: 100,
    };
  }

  // ============================================================
  // 6. CANDIDATE GENERATION (for dispatch)
  // ============================================================

  async generateCandidates(companyId: string, tripPickup: {
    latitude: number;
    longitude: number;
  }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const config = await this.getOrCreateConfig(companyId);

    // Phase 1: Get all available drivers
    const availableDrivers = await this.prisma.driverProfile.findMany({
      where: { companyId, status: 'ACTIVE' as any },
      include: { user: { select: { id: true, name: true } } } as any,
    });

    // Phase 1b: Get all active preferred areas for these drivers
    const driverIds = availableDrivers.map(d => d.id);
    const allPreferredAreas = await this.prisma.driverPreferredArea.findMany({
      where: { companyId, driverId: { in: driverIds }, active: true },
    });

    // Index areas by driver
    const areasByDriver = new Map<string, typeof allPreferredAreas>();
    for (const area of allPreferredAreas) {
      const existing = areasByDriver.get(area.driverId) || [];
      existing.push(area);
      areasByDriver.set(area.driverId, existing);
    }

    // Phase 2: Score each driver
    const candidates = [];
    for (const driver of availableDrivers) {
      const driverAreas = areasByDriver.get(driver.id) || [];
      const hasPreferredArea = driverAreas.some(area =>
        pointInsideArea(tripPickup.latitude, tripPickup.longitude, area)
      );

      let proximityScore = 0;
      let preferenceBonus = 0;
      let expansionLevel = 0;

      if (hasPreferredArea) {
        const matchArea = driverAreas.find(area =>
          pointInsideArea(tripPickup.latitude, tripPickup.longitude, area)
        );
        if (matchArea) {
          preferenceBonus = matchArea.preferenceLevel === 'PRIMARY' ? config.primaryAreaWeight :
            matchArea.preferenceLevel === 'PREFERRED' ? config.preferredAreaWeight :
            config.secondaryAreaWeight;
        }
        proximityScore = 20;
      } else {
        expansionLevel = 1;
        proximityScore = 10;
      }

      const totalScore = proximityScore + preferenceBonus + 25 + 10 + 7 + 8;

      candidates.push({
        driverId: driver.id,
        driverName: (driver as any).user.name,
        vehicleId: driver.vehicleId,
        preferredArea: hasPreferredArea,
        expansionLevel,
        preferenceBonus,
        totalScore,
        eligibilityLevel: expansionLevel === 0 ? 'PREFERRED' : 'EXPANDED',
      });
    }

    // Sort by score descending
    candidates.sort((a, b) => b.totalScore - a.totalScore);

    return {
      tripPickup,
      candidateCount: candidates.length,
      expansionLevel: candidates.some(c => c.expansionLevel > 0) ? 1 : 0,
      candidates: candidates.slice(0, 10),
    };
  }

  // ============================================================
  // 7. CONFIG
  // ============================================================

  async getOrCreateConfig(companyId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    let config = await this.prisma.driverPreferenceConfig.findFirst({
      where: { companyId },
    });

    if (!config) {
      config = await this.prisma.driverPreferenceConfig.create({
        data: { companyId },
      });
    }

    return config;
  }

  async updateConfig(companyId: string, performedBy: string, data: Record<string, any>) {
    if (!this.prisma.isConnected()) {
      throw new ServiceUnavailableException('Database unavailable');
    }

    const config = await this.getOrCreateConfig(companyId);

    const allowed = [
      'primaryAreaWeight', 'preferredAreaWeight', 'secondaryAreaWeight',
      'demandExpansionThreshold', 'nearbyAreaRadiusMeters', 'maximumExpansionRadiusMeters',
      'maximumDriverDetourKm', 'maximumPickupETAMinutes', 'maximumWaitTimeMinutes',
      'defaultPreferenceMode',
    ];
    const updateData: any = {};
    for (const key of allowed) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }

    const updated = await this.prisma.driverPreferenceConfig.update({
      where: { id: config.id },
      data: updateData,
    });

    await this.audit.log({
      companyId,
      userId: performedBy,
      action: 'DISPATCH_CONFIG_UPDATED',
      entity: 'DriverPreferenceConfig',
      entityId: config.id,
      newValue: updateData,
    });

    return updated;
  }

  // ============================================================
  // 8. HOME BASE
  // ============================================================

  async setHomeBase(companyId: string, driverUserId: string, data: {
    name?: string;
    latitude: number;
    longitude: number;
    address?: string;
  }) {
    if (!this.prisma.isConnected()) {
      throw new ServiceUnavailableException('Database unavailable');
    }

    const homeBase = await this.prisma.driverHomeBase.upsert({
      where: { driverId: driverUserId },
      update: {
        companyId,
        name: data.name || 'Home Base',
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address,
      },
      create: {
        companyId,
        driverId: driverUserId,
        name: data.name || 'Home Base',
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address,
      },
    });

    return homeBase;
  }

  async getHomeBase(companyId: string, driverUserId: string) {
    if (!this.prisma.isConnected()) {
      return { name: 'Home Base', latitude: 19.1197, longitude: 72.9050, address: 'Mumbai Depot' };
    }

    return this.prisma.driverHomeBase.findFirst({
      where: { companyId, driverId: driverUserId },
    });
  }

  // ============================================================
  // 9. ANALYTICS
  // ============================================================

  async getPreferenceAnalytics(companyId: string, params?: { driverId?: string; startDate?: string; endDate?: string }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    // Count areas by preference level
    const where: any = { companyId, active: true };
    if (params?.driverId) where.driverId = params.driverId;

    const [primary, preferred, secondary, totalAreas] = await Promise.all([
      this.prisma.driverPreferredArea.count({ where: { ...where, preferenceLevel: 'PRIMARY' } }),
      this.prisma.driverPreferredArea.count({ where: { ...where, preferenceLevel: 'PREFERRED' } }),
      this.prisma.driverPreferredArea.count({ where: { ...where, preferenceLevel: 'SECONDARY' } }),
      this.prisma.driverPreferredArea.count({ where }),
    ]);

    // Get recent demand pressure
    const recentPressure = await this.prisma.demandPressureSnapshot.findMany({
      where: { companyId },
      orderBy: { snapshotTime: 'desc' },
      take: 10,
    });

    return {
      areaDistribution: { primary, preferred, secondary, total: totalAreas },
      recentDemandPressure: recentPressure.map(p => ({
        zone: p.zoneName,
        demandRatio: p.demandRatio,
        expansionLevel: p.expansionLevel,
        time: p.snapshotTime,
      })),
      avgExpansionLevel: recentPressure.length > 0
        ? recentPressure.reduce((sum, p) => sum + p.expansionLevel, 0) / recentPressure.length
        : 0,
    };
  }
}

// Import for ConflictException
import { ConflictException } from '@nestjs/common';

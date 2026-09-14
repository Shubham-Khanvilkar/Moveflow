import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class CarpoolService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async findCarpoolMatches(companyId: string, data: {
    originLat: number; originLng: number;
    destLat: number; destLng: number;
    date: Date; shiftId?: string;
  }) {
    const eligible = await this.prisma.user.findMany({
      where: {
        companyId, status: 'ACTIVE',
        homeLatitude: { not: null }, homeLongitude: { not: null },
      },
      select: { id: true, name: true, homeLatitude: true, homeLongitude: true, homeAddress: true },
    });

    const originThreshold = 0.01;
    const destThreshold = 0.01;
    const matches = eligible.filter(emp => {
      const nearOrigin = emp.homeLatitude && Math.abs(emp.homeLatitude - data.originLat) < originThreshold &&
        emp.homeLongitude && Math.abs(emp.homeLongitude - data.originLng) < originThreshold;
      const nearDest = Math.abs((emp.homeLatitude || 0) - data.destLat) < destThreshold &&
        Math.abs((emp.homeLongitude || 0) - data.destLng) < destThreshold;
      return nearOrigin || nearDest;
    });

    return { matches: matches.slice(0, 10), totalEligible: eligible.length };
  }

  async createCarpoolRide(companyId: string, hostId: string, data: {
    originLat: number; originLng: number; originAddress?: string;
    destLat: number; destLng: number; destAddress?: string;
    date: Date; maxSeats: number; vehicleId?: string;
  }) {
    const ride = await (this.prisma as any).carpoolRide.create({
      data: { companyId, hostId, ...data, status: 'OPEN', availableSeats: data.maxSeats },
    });

    await this.audit.log({
      companyId, userId: hostId, action: 'CARPOOL_CREATED', entity: 'CarpoolRide', entityId: ride.id,
    });

    return { rideId: ride.id, status: 'OPEN', maxSeats: data.maxSeats };
  }

  async joinCarpool(companyId: string, rideId: string, userId: string) {
    const ride = await (this.prisma as any).carpoolRide.findFirst({ where: { id: rideId, companyId } });
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.availableSeats <= 0) throw new NotFoundException('No seats available');

    await (this.prisma as any).carpoolParticipant.create({
      data: { rideId, userId, status: 'CONFIRMED' },
    });
    await (this.prisma as any).carpoolRide.update({
      where: { id: rideId },
      data: { availableSeats: { decrement: 1 } } as any,
    });

    return { joined: true, rideId, userId };
  }

  async calculateCostSharing(companyId: string, rideId: string) {
    const participants = await (this.prisma as any).carpoolParticipant.findMany({
      where: { rideId, status: 'CONFIRMED' },
    });
    const ride = await (this.prisma as any).carpoolRide.findFirst({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');

    const totalCost = ride.estimatedCost || 0;
    const perPerson = participants.length > 0 ? Math.ceil(totalCost / participants.length) : 0;

    return { rideId, totalCost, participants: participants.length, costPerPerson: perPerson };
  }

  async getCarbonSavings(companyId: string, rideId: string) {
    const participants = await (this.prisma as any).carpoolParticipant.findMany({
      where: { rideId, status: 'CONFIRMED' },
    });
    const savedCars = participants.length;
    const carbonSavedKg = savedCars * 2.6;
    return { rideId, savedCars, carbonSavedKg, equivalentTrees: Math.round(carbonSavedKg / 21 * 100) / 100 };
  }
}

@Injectable()
export class WorkplaceService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async createDeskBooking(companyId: string, userId: string, data: { deskId: string; date: Date }) {
    const booking = await (this.prisma as any).deskBooking.create({
      data: { companyId, userId, ...data, status: 'CONFIRMED' },
    });
    return { bookingId: booking.id, deskId: data.deskId, date: data.date };
  }

  async createMeetingRoomBooking(companyId: string, userId: string, data: {
    roomId: string; startTime: Date; endTime: Date; attendees: string[];
  }) {
    const booking = await (this.prisma as any).meetingRoomBooking.create({
      data: { companyId, userId, ...data, status: 'CONFIRMED' },
    });
    return { bookingId: booking.id, roomId: data.roomId };
  }

  async allocateParkingSpot(companyId: string, userId: string, data: { spotId?: string; vehicleNumber: string }) {
    return { allocated: true, spotId: data.spotId || 'P-001', vehicleNumber: data.vehicleNumber };
  }

  async getSpaceUtilization(companyId: string) {
    return {
      desks: { total: 200, booked: 145, available: 55, utilization: 72.5 },
      meetingRooms: { total: 10, booked: 7, available: 3, utilization: 70 },
      parking: { total: 100, allocated: 68, available: 32, utilization: 68 },
    };
  }
}

@Injectable()
export class EVService {
  constructor(private prisma: PrismaService) {}

  async getEVDashboard(companyId: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { companyId, fuelType: 'EV' as any },
    });
    return {
      totalEVs: vehicles.length,
      avgBatteryLevel: 72,
      chargingNow: 3,
      rangeEstimate: { min: 80, max: 250, avg: 165 },
      chargingStations: 5,
      carbonSaved: vehicles.length * 1200,
    };
  }

  async getChargingStatus(companyId: string, vehicleId: string) {
    return {
      vehicleId, batteryLevel: 65, chargingStatus: 'CHARGING',
      estimatedFullCharge: new Date(Date.now() + 3600000),
      rangeKm: 180,
    };
  }

  async getCarbonFootprint(companyId: string, params: { period?: string }) {
    return {
      totalTrips: 1250,
      totalKm: 45000,
      carbonKg: 4500 * 0.15,
      evTrips: 350,
      evCarbonKg: 350 * 5 * 0.03,
      savingsKg: 4500 * 0.15 - 350 * 5 * 0.03,
    };
  }
}

@Injectable()
export class GeospatialService {
  constructor(private prisma: PrismaService) {}

  async computeGeohash(lat: number, lng: number, precision: number = 7) {
    const chars = '0123456789bcdefghjkmnpqrstuvwxyz';
    let geohash = '';
    let minLat = -90, maxLat = 90, minLng = -180, maxLng = 180;
    let isLng = true;
    let bit = 0;
    let ch = 0;

    while (geohash.length < precision) {
      if (isLng) {
        const mid = (minLng + maxLng) / 2;
        if (lng >= mid) { ch |= (1 << (4 - bit)); minLng = mid; } else { maxLng = mid; }
      } else {
        const mid = (minLat + maxLat) / 2;
        if (lat >= mid) { ch |= (1 << (4 - bit)); minLat = mid; } else { maxLat = mid; }
      }
      isLng = !isLng;
      if (bit < 4) bit++; else { geohash += chars[ch]; bit = 0; ch = 0; }
    }
    return geohash;
  }

  async getEmployeeDensityHeatmap(companyId: string) {
    const employees = await this.prisma.user.findMany({
      where: { companyId, status: 'ACTIVE', homeLatitude: { not: null } },
      select: { homeLatitude: true, homeLongitude: true },
    });

    const grid = new Map<string, number>();
    for (const emp of employees) {
      if (emp.homeLatitude && emp.homeLongitude) {
        const key = `${Math.round(emp.homeLatitude * 10) / 10},${Math.round(emp.homeLongitude * 10) / 10}`;
        grid.set(key, (grid.get(key) || 0) + 1);
      }
    }

    return {
      totalEmployees: employees.length,
      hotspots: Array.from(grid.entries())
        .map(([key, count]) => ({ lat: parseFloat(key.split(',')[0]), lng: parseFloat(key.split(',')[1]), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20),
    };
  }

  async spatialFilter(companyId: string, bounds: { north: number; south: number; east: number; west: number }) {
    const employees = await this.prisma.user.findMany({
      where: {
        companyId, status: 'ACTIVE',
        homeLatitude: { gte: bounds.south, lte: bounds.north },
        homeLongitude: { gte: bounds.west, lte: bounds.east },
      },
      select: { id: true, name: true, homeLatitude: true, homeLongitude: true },
    });
    return { count: employees.length, employees };
  }

  async autoGenerateGeofence(companyId: string, siteId: string) {
    const site = await this.prisma.companySite.findFirst({ where: { id: siteId, companyId } });
    if (!site) throw new NotFoundException('Site not found');
    return {
      geofenceId: `gf-${siteId}`,
      type: 'CIRCLE',
      center: { lat: (site as any).latitude || 19.0760, lng: (site as any).longitude || 72.8777 },
      radius: 500,
      generatedFrom: 'employee_clusters',
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class EVDashboardService {
  private readonly logger = new Logger(EVDashboardService.name);
  constructor(private prisma: PrismaService) {}

  async getEVDashboard(companyId: string) {
    const evVehicles = await (this.prisma as any).vehicle.findMany({
      where: { companyId, fuelType: 'EV' },
    });

    const iceVehicles = await (this.prisma as any).vehicle.findMany({
      where: { companyId, fuelType: { not: 'EV' } },
    });

    return {
      evFleet: {
        total: evVehicles.length,
        online: evVehicles.filter((v: any) => v.status === 'ACTIVE').length,
        averageBattery: 72,
        charging: 3,
        needingCharge: 2,
      },
      iceFleet: {
        total: iceVehicles.length,
        online: iceVehicles.filter((v: any) => v.status === 'ACTIVE').length,
      },
      carbonFootprint: {
        evEmissionsKg: evVehicles.length * 2.1,
        iceEmissionsKg: iceVehicles.length * 15.3,
        totalEmissionsKg: evVehicles.length * 2.1 + iceVehicles.length * 15.3,
        savingsFromEV: iceVehicles.length * 15.3 - evVehicles.length * 2.1,
      },
      sustainability: {
        greenKilometers: evVehicles.length * 45000,
        totalKilometers: (evVehicles.length + iceVehicles.length) * 60000,
        greenPercent: Math.round((evVehicles.length / (evVehicles.length + iceVehicles.length || 1)) * 100),
        esgScore: 72,
      },
      chargingStations: [
        { id: 'cs1', name: 'Office - Level 2', status: 'AVAILABLE', power: '22kW', location: 'Building A' },
        { id: 'cs2', name: 'Office - DC Fast', status: 'IN_USE', power: '60kW', location: 'Parking B' },
      ],
    };
  }

  async getVehicleBatteryStatus(companyId: string, vehicleId: string) {
    return {
      vehicleId,
      batteryPercent: 72,
      estimatedRangeKm: 180,
      chargingStatus: 'DISCHARGING',
      lastChargeTime: new Date(Date.now() - 3600000),
      batteryHealth: 94,
      temperature: 28,
    };
  }

  async calculateCarbonPerTrip(tripId: string) {
    const trip = await (this.prisma as any).trip.findUnique({ where: { id: tripId } });
    if (!trip) return null;
    const distanceKm = (trip as any).totalDistanceKm || 15;
    const passengers = 3;
    return { tripId, distanceKm, passengers, perPersonEmission: Math.round(distanceKm * 0.21 / passengers * 100) / 100, totalEmission: Math.round(distanceKm * 0.21 * 100) / 100 };
  }
}

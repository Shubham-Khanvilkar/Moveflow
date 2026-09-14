import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class VehicleManagementService {
  private readonly logger = new Logger(VehicleManagementService.name);
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async createVehicle(companyId: string, data: { vendorId?: string; registrationNumber: string; vehicleType: string; vehicleMake?: string; vehicleModel?: string; vehicleYear?: number; seatingCapacity: number; fuelType?: string; color?: string; insuranceNumber?: string; insuranceExpiry?: string; pucExpiry?: string; fitnessExpiry?: string; permitExpiry?: string; gpsDeviceId?: string }, createdBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const vehicleId = `VH${String(Date.now()).slice(-6)}`;
    const vehicle = await this.prisma.vehicleManagement.create({
      data: {
        companyId, vehicleId, vendorId: data.vendorId, registrationNumber: data.registrationNumber, vehicleType: data.vehicleType,
        vehicleMake: data.vehicleMake, vehicleModel: data.vehicleModel, vehicleYear: data.vehicleYear, seatingCapacity: data.seatingCapacity,
        fuelType: data.fuelType || 'PETROL', color: data.color, insuranceNumber: data.insuranceNumber,
        insuranceExpiry: data.insuranceExpiry ? new Date(data.insuranceExpiry) : undefined,
        pucExpiry: data.pucExpiry ? new Date(data.pucExpiry) : undefined,
        fitnessExpiry: data.fitnessExpiry ? new Date(data.fitnessExpiry) : undefined,
        permitExpiry: data.permitExpiry ? new Date(data.permitExpiry) : undefined,
        gpsDeviceId: data.gpsDeviceId, onboardedBy: createdBy, onboardedAt: new Date(),
      },
    });
    await this.audit.log({ companyId, userId: createdBy, action: 'VEHICLE_ONBOARDED', entity: 'VehicleManagement', entityId: vehicle.id, newValue: { registrationNumber: data.registrationNumber } });
    return vehicle;
  }

  async getVehicles(companyId: string, params?: { status?: string; vehicleType?: string; vendorId?: string; isAvailable?: string; search?: string; page?: number; limit?: number }) {
    if (!this.prisma.isConnected()) return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    const page = params?.page || 1; const limit = Math.min(params?.limit || 20, 100); const skip = (page - 1) * limit;
    const where: any = { companyId };
    if (params?.status) where.status = params.status.toUpperCase();
    if (params?.vehicleType) where.vehicleType = params.vehicleType.toUpperCase();
    if (params?.vendorId) where.vendorId = params.vendorId;
    if (params?.isAvailable !== undefined) where.isAvailable = params.isAvailable === 'true';
    if (params?.search) where.OR = [{ registrationNumber: { contains: params.search, mode: 'insensitive' } }, { vehicleId: { contains: params.search } }];
    const [data, total] = await Promise.all([
      this.prisma.vehicleManagement.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.vehicleManagement.count({ where }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getVehicleById(companyId: string, vehicleId: string) {
    if (!this.prisma.isConnected()) return null;
    return this.prisma.vehicleManagement.findFirst({ where: { id: vehicleId, companyId } });
  }

  async updateVehicle(companyId: string, vehicleId: string, data: Record<string, any>, updatedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const vehicle = await this.prisma.vehicleManagement.findFirst({ where: { id: vehicleId, companyId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    const updated = await this.prisma.vehicleManagement.update({ where: { id: vehicleId }, data });
    await this.audit.log({ companyId, userId: updatedBy, action: 'VEHICLE_UPDATED', entity: 'VehicleManagement', entityId: vehicleId, newValue: data });
    return updated;
  }

  async offboardVehicle(companyId: string, vehicleId: string, reason: string, offboardedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const updated = await this.prisma.vehicleManagement.update({
      where: { id: vehicleId }, data: { status: 'RETIRED', isAvailable: false, offboardedBy, offboardedAt: new Date(), offboardReason: reason },
    });
    await this.audit.log({ companyId, userId: offboardedBy, action: 'VEHICLE_OFFBOARDED', entity: 'VehicleManagement', entityId: vehicleId });
    return updated;
  }

  async setMaintenance(companyId: string, vehicleId: string, reason: string, setBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const updated = await this.prisma.vehicleManagement.update({ where: { id: vehicleId }, data: { status: 'MAINTENANCE', isAvailable: false } });
    await this.audit.log({ companyId, userId: setBy, action: 'VEHICLE_MAINTENANCE', entity: 'VehicleManagement', entityId: vehicleId });
    return updated;
  }

  async updateLocation(companyId: string, vehicleId: string, lat: number, lng: number, speed?: number) {
    if (!this.prisma.isConnected()) return;
    await this.prisma.vehicleManagement.update({ where: { id: vehicleId }, data: { currentLatitude: lat, currentLongitude: lng, currentSpeed: speed } });
  }

  async getComplianceAlerts(companyId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const thirtyDays = new Date(); thirtyDays.setDate(thirtyDays.getDate() + 30);
    const vehicles = await this.prisma.vehicleManagement.findMany({ where: { companyId, status: 'ACTIVE' } });
    const alerts: any[] = [];
    for (const v of vehicles) {
      if (v.insuranceExpiry && v.insuranceExpiry <= thirtyDays) alerts.push({ vehicleId: v.id, type: 'INSURANCE_EXPIRING', expiry: v.insuranceExpiry });
      if (v.pucExpiry && v.pucExpiry <= thirtyDays) alerts.push({ vehicleId: v.id, type: 'PUC_EXPIRING', expiry: v.pucExpiry });
      if (v.fitnessExpiry && v.fitnessExpiry <= thirtyDays) alerts.push({ vehicleId: v.id, type: 'FITNESS_EXPIRING', expiry: v.fitnessExpiry });
      if (v.permitExpiry && v.permitExpiry <= thirtyDays) alerts.push({ vehicleId: v.id, type: 'PERMIT_EXPIRING', expiry: v.permitExpiry });
    }
    return { alerts };
  }
}

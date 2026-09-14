import { Injectable, Logger, NotFoundException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class DriverManagementService {
  private readonly logger = new Logger(DriverManagementService.name);
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  // ADMIN: manage all drivers across all vendors
  async createDriver(companyId: string, data: { vendorId?: string; firstName: string; lastName?: string; phone: string; email?: string; licenseNumber?: string; licenseExpiry?: string; aadharNumber?: string; panNumber?: string; dateOfBirth?: string; bloodGroup?: string; experience?: number; homeLatitude?: number; homeLongitude?: number; preferredZones?: string; preferredShifts?: string; skills?: string; emergencyContact?: string; emergencyPhone?: string; bankAccount?: string; ifscCode?: string; monthlySalary?: number; perTripIncentive?: number }, createdBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const driverId = `D${String(Date.now()).slice(-6)}`;
    const driver = await this.prisma.driverManagement.create({
      data: {
        companyId, driverId, vendorId: data.vendorId, firstName: data.firstName, lastName: data.lastName,
        phone: data.phone, email: data.email, licenseNumber: data.licenseNumber, licenseExpiry: data.licenseExpiry ? new Date(data.licenseExpiry) : undefined,
        aadharNumber: data.aadharNumber, panNumber: data.panNumber, dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        bloodGroup: data.bloodGroup, experience: data.experience, homeLatitude: data.homeLatitude, homeLongitude: data.homeLongitude,
        preferredZones: data.preferredZones, preferredShifts: data.preferredShifts, skills: data.skills,
        emergencyContact: data.emergencyContact, emergencyPhone: data.emergencyPhone,
        bankAccount: data.bankAccount, ifscCode: data.ifscCode, monthlySalary: data.monthlySalary, perTripIncentive: data.perTripIncentive,
        onboardedBy: createdBy, onboardedAt: new Date(),
      },
    });
    await this.audit.log({ companyId, userId: createdBy, action: 'DRIVER_ONBOARDED', entity: 'DriverManagement', entityId: driver.id, newValue: { firstName: data.firstName } });
    return driver;
  }

  async getDrivers(companyId: string, params?: { status?: string; vendorId?: string; isAvailable?: string; search?: string; skills?: string; page?: number; limit?: number }) {
    if (!this.prisma.isConnected()) return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    const page = params?.page || 1; const limit = Math.min(params?.limit || 20, 100); const skip = (page - 1) * limit;
    const where: any = { companyId };
    if (params?.status) where.status = params.status.toUpperCase();
    if (params?.vendorId) where.vendorId = params.vendorId;
    if (params?.isAvailable !== undefined) where.isAvailable = params.isAvailable === 'true';
    if (params?.skills) where.skills = { contains: params.skills };
    if (params?.search) where.OR = [{ firstName: { contains: params.search, mode: 'insensitive' } }, { phone: { contains: params.search } }, { driverId: { contains: params.search } }];
    const [data, total] = await Promise.all([
      this.prisma.driverManagement.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.driverManagement.count({ where }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getDriverById(companyId: string, driverId: string) {
    if (!this.prisma.isConnected()) return null;
    return this.prisma.driverManagement.findFirst({ where: { id: driverId, companyId } });
  }

  async updateDriver(companyId: string, driverId: string, data: Record<string, any>, updatedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const driver = await this.prisma.driverManagement.findFirst({ where: { id: driverId, companyId } });
    if (!driver) throw new NotFoundException('Driver not found');
    const updated = await this.prisma.driverManagement.update({ where: { id: driverId }, data });
    await this.audit.log({ companyId, userId: updatedBy, action: 'DRIVER_UPDATED', entity: 'DriverManagement', entityId: driverId, newValue: data });
    return updated;
  }

  async offboardDriver(companyId: string, driverId: string, reason: string, offboardedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const updated = await this.prisma.driverManagement.update({
      where: { id: driverId }, data: { status: 'INACTIVE', isAvailable: false, offboardedBy, offboardedAt: new Date(), offboardReason: reason },
    });
    await this.audit.log({ companyId, userId: offboardedBy, action: 'DRIVER_OFFBOARDED', entity: 'DriverManagement', entityId: driverId });
    return updated;
  }

  async suspendDriver(companyId: string, driverId: string, reason: string, suspendedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const updated = await this.prisma.driverManagement.update({ where: { id: driverId }, data: { status: 'SUSPENDED', isAvailable: false } });
    await this.audit.log({ companyId, userId: suspendedBy, action: 'DRIVER_SUSPENDED', entity: 'DriverManagement', entityId: driverId });
    return updated;
  }

  async updateAvailability(companyId: string, driverId: string, isAvailable: boolean) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    return this.prisma.driverManagement.update({ where: { id: driverId }, data: { isAvailable, lastActiveAt: new Date() } });
  }

  async getDriverPerformance(companyId: string, driverId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    return this.prisma.driverPerformanceMetric.findMany({ where: { companyId, driverId }, orderBy: { periodStart: 'desc' }, take: 12 });
  }

  async assignVendor(companyId: string, driverId: string, vendorId: string, assignedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const updated = await this.prisma.driverManagement.update({ where: { id: driverId }, data: { vendorId } });
    await this.audit.log({ companyId, userId: assignedBy, action: 'DRIVER_VENDOR_ASSIGNED', entity: 'DriverManagement', entityId: driverId, newValue: { vendorId } });
    return updated;
  }

  async bulkUpdateStatus(companyId: string, driverIds: string[], status: string, updatedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const result = await this.prisma.driverManagement.updateMany({ where: { id: { in: driverIds }, companyId }, data: { status: status.toUpperCase(), isAvailable: status.toUpperCase() === 'ACTIVE' } });
    await this.audit.log({ companyId, userId: updatedBy, action: 'DRIVER_BULK_STATUS_UPDATE', entity: 'DriverManagement', entityId: 'bulk', newValue: { count: result.count, status } });
    return { updated: result.count };
  }
}

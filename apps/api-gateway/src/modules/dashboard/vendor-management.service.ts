import { Injectable, Logger, NotFoundException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class VendorManagementService {
  private readonly logger = new Logger(VendorManagementService.name);
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async createVendor(companyId: string, data: { vendorName: string; contactPerson?: string; contactEmail?: string; contactPhone?: string; gstNumber?: string; panNumber?: string; address?: string; city?: string; state?: string; pincode?: string; contractStart?: string; contractEnd?: string; contractValue?: number; paymentTerms?: string; notes?: string }, createdBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const vendorId = `V${String(Date.now()).slice(-6)}`;
    const vendor = await this.prisma.vendorManagement.create({
      data: {
        companyId, vendorId, vendorName: data.vendorName, contactPerson: data.contactPerson, contactEmail: data.contactEmail,
        contactPhone: data.contactPhone, gstNumber: data.gstNumber, panNumber: data.panNumber, address: data.address,
        city: data.city, state: data.state, pincode: data.pincode, contractStart: data.contractStart ? new Date(data.contractStart) : undefined,
        contractEnd: data.contractEnd ? new Date(data.contractEnd) : undefined, contractValue: data.contractValue,
        paymentTerms: data.paymentTerms, notes: data.notes, onboardedBy: createdBy, onboardedAt: new Date(),
      },
    });
    await this.audit.log({ companyId, userId: createdBy, action: 'VENDOR_ONBOARDED', entity: 'VendorManagement', entityId: vendor.id, newValue: { vendorName: data.vendorName } });
    return vendor;
  }

  async getVendors(companyId: string, params?: { status?: string; search?: string; page?: number; limit?: number }) {
    if (!this.prisma.isConnected()) return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    const page = params?.page || 1; const limit = Math.min(params?.limit || 20, 100); const skip = (page - 1) * limit;
    const where: any = { companyId };
    if (params?.status) where.status = params.status.toUpperCase();
    if (params?.search) where.vendorName = { contains: params.search, mode: 'insensitive' };
    const [data, total] = await Promise.all([
      this.prisma.vendorManagement.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.vendorManagement.count({ where }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getVendorById(companyId: string, vendorId: string) {
    if (!this.prisma.isConnected()) return null;
    return this.prisma.vendorManagement.findFirst({ where: { id: vendorId, companyId } });
  }

  async updateVendor(companyId: string, vendorId: string, data: Record<string, any>, updatedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const vendor = await this.prisma.vendorManagement.findFirst({ where: { id: vendorId, companyId } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    const updated = await this.prisma.vendorManagement.update({ where: { id: vendorId }, data });
    await this.audit.log({ companyId, userId: updatedBy, action: 'VENDOR_UPDATED', entity: 'VendorManagement', entityId: vendorId, newValue: data });
    return updated;
  }

  async offboardVendor(companyId: string, vendorId: string, reason: string, offboardedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const vendor = await this.prisma.vendorManagement.findFirst({ where: { id: vendorId, companyId } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    const updated = await this.prisma.vendorManagement.update({
      where: { id: vendorId },
      data: { status: 'INACTIVE', offboardedBy, offboardedAt: new Date(), offboardReason: reason },
    });
    await this.audit.log({ companyId, userId: offboardedBy, action: 'VENDOR_OFFBOARDED', entity: 'VendorManagement', entityId: vendorId, newValue: { reason } });
    return updated;
  }

  async suspendVendor(companyId: string, vendorId: string, reason: string, suspendedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const updated = await this.prisma.vendorManagement.update({ where: { id: vendorId }, data: { status: 'SUSPENDED', notes: reason } });
    await this.audit.log({ companyId, userId: suspendedBy, action: 'VENDOR_SUSPENDED', entity: 'VendorManagement', entityId: vendorId });
    return updated;
  }

  async blacklistVendor(companyId: string, vendorId: string, reason: string, blacklistedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const updated = await this.prisma.vendorManagement.update({ where: { id: vendorId }, data: { status: 'BLACKLISTED', notes: reason } });
    await this.audit.log({ companyId, userId: blacklistedBy, action: 'VENDOR_BLACKLISTED', entity: 'VendorManagement', entityId: vendorId });
    return updated;
  }

  async getVendorPerformance(companyId: string, vendorId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    return this.prisma.vendorPerformanceMetric.findMany({ where: { companyId, vendorId }, orderBy: { periodStart: 'desc' }, take: 12 });
  }

  async inviteVendorUser(companyId: string, vendorId: string, data: { userId: string; role?: string }, invitedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const vendorUser = await this.prisma.vendorUser.create({
      data: { companyId, vendorId, userId: data.userId, role: data.role || 'VENDOR_ADMIN', invitedBy },
    });
    await this.audit.log({ companyId, userId: invitedBy, action: 'VENDOR_USER_INVITED', entity: 'VendorUser', entityId: vendorUser.id });
    return vendorUser;
  }

  async getVendorUsers(companyId: string, vendorId: string) {
    if (!this.prisma.isConnected()) return [];
    return this.prisma.vendorUser.findMany({ where: { companyId, vendorId, isActive: true } });
  }
}

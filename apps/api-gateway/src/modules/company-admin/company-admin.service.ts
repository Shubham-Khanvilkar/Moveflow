import * as bcrypt from "bcryptjs";
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class CompanyAdminService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ============================================================
  // COMPANY POLICY (versioned, structured)
  // ============================================================

  async getCompanyPolicy(companyId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const policy = await this.prisma.transportPolicy.findFirst({
      where: { companyId },
    });

    if (!policy) {
      return this.createCompanyPolicy(companyId, 'system', {
        name: 'Default Transport Policy',
        requireApproval: true,
        approvalLevels: 2,
        maxAdvanceBookingDays: 30,
        cancellationDeadlineMinutes: 120,
      });
    }

    return policy;
  }

  async createCompanyPolicy(companyId: string, performedBy: string, data: any) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const existing = await this.prisma.transportPolicy.findFirst({ where: { companyId } });
    if (existing) {
      throw new ConflictException('Policy already exists. Use PUT to update.');
    }

    const policy = await this.prisma.transportPolicy.create({
      data: {
        companyId,
        name: data.name || 'Default Transport Policy',
        requireApproval: data.requireApproval ?? true,
        approvalLevels: data.approvalLevels ?? 2,
        maxAdvanceBookingDays: data.maxAdvanceBookingDays ?? 30,
        minAdvanceBookingMinutes: data.minAdvanceBookingMinutes ?? 120,
        cancellationDeadlineMinutes: data.cancellationDeadlineMinutes ?? 120,
        allowLateBooking: data.allowLateBooking ?? false,
        femaleGuardRequired: data.femaleGuardRequired ?? true,
        guardStartHour: data.guardStartHour ?? 20,
        guardEndHour: data.guardEndHour ?? 6,
      },
    });

    await this.audit.log({
      companyId,
      userId: performedBy,
      action: 'POLICY_CREATED',
      entity: 'TransportPolicy',
      entityId: policy.id,
      newValue: data,
    });

    return policy;
  }

  async updateCompanyPolicy(companyId: string, performedBy: string, data: any) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const existing = await this.prisma.transportPolicy.findFirst({ where: { companyId } });
    if (!existing) {
      return this.createCompanyPolicy(companyId, performedBy, data);
    }

    const updateData: any = {};
    const allowed = [
      'name', 'requireApproval', 'approvalLevels', 'maxAdvanceBookingDays',
      'minAdvanceBookingMinutes', 'cancellationDeadlineMinutes', 'allowLateBooking',
      'femaleGuardRequired', 'guardStartHour', 'guardEndHour',
      'eligibleDepartments', 'eligibleDesignations',
    ];
    for (const key of allowed) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }

    const updated = await this.prisma.transportPolicy.update({
      where: { id: existing.id },
      data: updateData,
    });

    await this.audit.log({
      companyId,
      userId: performedBy,
      action: 'POLICY_UPDATED',
      entity: 'TransportPolicy',
      entityId: existing.id,
      newValue: updateData,
    });

    return updated;
  }

  // ============================================================
  // DEPARTMENTS
  // ============================================================

  async listDepartments(companyId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    return this.prisma.department.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  async createDepartment(companyId: string, performedBy: string, data: { name: string; buId?: string }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const dept = await this.prisma.department.create({
      data: { companyId, name: data.name, buId: data.buId },
    });

    await this.audit.log({
      companyId, userId: performedBy, action: 'DEPARTMENT_CREATED',
      entity: 'Department', entityId: dept.id, newValue: data,
    });

    return dept;
  }

  async updateDepartment(companyId: string, performedBy: string, id: string, data: { name?: string; buId?: string }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const dept = await this.prisma.department.findFirst({ where: { id, companyId } });
    if (!dept) throw new NotFoundException('Department not found');

    const updated = await this.prisma.department.update({ where: { id }, data });

    await this.audit.log({
      companyId, userId: performedBy, action: 'DEPARTMENT_UPDATED',
      entity: 'Department', entityId: id, oldValue: { name: dept.name }, newValue: data,
    });

    return updated;
  }

  async deleteDepartment(companyId: string, performedBy: string, id: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const dept = await this.prisma.department.findFirst({ where: { id, companyId } });
    if (!dept) throw new NotFoundException('Department not found');

    await this.prisma.department.delete({ where: { id } });

    await this.audit.log({
      companyId, userId: performedBy, action: 'DEPARTMENT_DELETED',
      entity: 'Department', entityId: id, oldValue: { name: dept.name },
    });

    return { deleted: true, id };
  }

  // ============================================================
  // BUSINESS UNITS
  // ============================================================

  async listBusinessUnits(companyId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    return this.prisma.businessUnit.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  async createBusinessUnit(companyId: string, performedBy: string, data: { name: string }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const bu = await this.prisma.businessUnit.create({
      data: { companyId, name: data.name },
    });

    await this.audit.log({
      companyId, userId: performedBy, action: 'BUSINESS_UNIT_CREATED',
      entity: 'BusinessUnit', entityId: bu.id, newValue: data,
    });

    return bu;
  }

  // ============================================================
  // COST CENTERS
  // ============================================================

  async listCostCenters(companyId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    return this.prisma.costCenter.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  async createCostCenter(companyId: string, performedBy: string, data: { code: string; name: string }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const cc = await this.prisma.costCenter.create({
      data: { companyId, code: data.code, name: data.name },
    });

    await this.audit.log({
      companyId, userId: performedBy, action: 'COST_CENTER_CREATED',
      entity: 'CostCenter', entityId: cc.id, newValue: data,
    });

    return cc;
  }

  // ============================================================
  // COMPANY LOCATIONS
  // ============================================================

  async listLocations(companyId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    return this.prisma.office.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  async createLocation(companyId: string, performedBy: string, data: {
    name: string;
    address?: string;
    latitude: number;
    longitude: number;
    operatingHours?: string;
    capacity?: number;
    parkingCapacity?: number;
    pickupZones?: number;
  }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const office = await this.prisma.office.create({
      data: {
        companyId,
        name: data.name,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        operatingHours: data.operatingHours,
        capacity: data.capacity,
        parkingCapacity: data.parkingCapacity,
        pickupZones: data.pickupZones || 0,
        status: 'ACTIVE',
      },
    });

    await this.audit.log({
      companyId, userId: performedBy, action: 'LOCATION_CREATED',
      entity: 'Office', entityId: office.id, newValue: { name: data.name, lat: data.latitude, lng: data.longitude },
    });

    return office;
  }

  async updateLocation(companyId: string, performedBy: string, id: string, data: any) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const office = await this.prisma.office.findFirst({ where: { id, companyId } });
    if (!office) throw new NotFoundException('Location not found');

    const updated = await this.prisma.office.update({ where: { id }, data });

    await this.audit.log({
      companyId, userId: performedBy, action: 'LOCATION_UPDATED',
      entity: 'Office', entityId: id, newValue: data,
    });

    return updated;
  }

  async deleteLocation(companyId: string, performedBy: string, id: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const office = await this.prisma.office.findFirst({ where: { id, companyId } });
    if (!office) throw new NotFoundException('Location not found');

    await this.prisma.office.delete({ where: { id } });

    await this.audit.log({
      companyId, userId: performedBy, action: 'LOCATION_DELETED',
      entity: 'Office', entityId: id, oldValue: { name: office.name },
    });

    return { deleted: true, id };
  }

  // ============================================================
  // COMPANY USERS (role management)
  // ============================================================

  async listUsers(companyId: string, params: { page?: number; limit?: number; role?: string; search?: string }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { companyId };
    if (params.search) {
      where.OR = [
        { name: { contains: params.search } },
        { email: { contains: params.search } },
      ];
    }
    if (params.role) {
      where.memberships = { some: { role: params.role, status: 'ACTIVE' } };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true, employeeId: true, name: true, email: true, phone: true,
          status: true, transportEligibility: true, designation: true,
          department: { select: { id: true, name: true } },
          memberships: { select: { role: true, status: true }, where: { companyId } },
        } as any,
        orderBy: { name: 'asc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: (users as any[]).map(u => ({
        ...u,
        role: u.memberships[0]?.role,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateUserRole(companyId: string, performedBy: string, userId: string, role: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const membership = await this.prisma.companyMembership.findFirst({
      where: { userId, companyId },
    });
    if (!membership) throw new NotFoundException('User membership not found');

    const oldRole = membership.role;

    await this.prisma.companyMembership.update({
      where: { id: membership.id },
      data: { role: role as any },
    });

    await this.audit.log({
      companyId, userId: performedBy, action: 'USER_ROLE_CHANGED',
      entity: 'CompanyMembership', entityId: membership.id,
      oldValue: { role: oldRole }, newValue: { role },
    });

    return { userId, oldRole, newRole: role };
  }

  // ============================================================
  // USER CRUD (V8)
  // ============================================================

  async createUser(companyId: string, data: any, createdBy: string) {
    const hashedPw = await bcrypt.hash(data.password || require('crypto').randomBytes(16).toString('hex'), 10);
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash: hashedPw,
        phone: data.phone || '',
        gender: data.gender || null,
        companyId,
        employeeId: data.employeeId || 'EMP_' + Date.now(),
        designation: data.designation || null,
        employmentType: data.employmentType || null,
        // V8 org fields
        siteId: data.siteId || null,
        processId: data.processId || null,
        lobId: data.lobId || null,
        shiftId: data.shiftId || null,
        teamId: data.teamId || null,
        departmentId: data.departmentId || null,
        businessUnitId: data.businessUnitId || null,
        managerId: data.managerId || null,
        teamLeaderId: data.teamLeaderId || null,
        // Transport fields
        transportEligibility: data.transportEligibility || 'INELIGIBLE',
        homeAddress: data.homeAddress || null,
        homeLatitude: data.homeLatitude || null,
        homeLongitude: data.homeLongitude || null,
        defaultPickup: data.defaultPickup || null,
        defaultDrop: data.defaultDrop || null,
        pickupLatitude: data.pickupLatitude || null,
        pickupLongitude: data.pickupLongitude || null,
        pickupAddress: data.pickupAddress || null,
        dropLatitude: data.dropLatitude || null,
        dropLongitude: data.dropLongitude || null,
        dropAddress: data.dropAddress || null,
        locationType: data.locationType || null,
        preferredNodalPoint: data.preferredNodalPoint || null,
        emergencyContactName: data.emergencyContactName || null,
        emergencyContactPhone: data.emergencyContactPhone || null,
        status: data.status || 'ACTIVE',
      },
    });
    // Create membership
    await this.prisma.companyMembership.create({
      data: { userId: user.id, companyId, role: (data.role || 'EMPLOYEE') as any, status: 'ACTIVE' },
    });
    // Create role assignment if role name exists in DB
    const role = await this.prisma.role.findFirst({ where: { name: data.role || 'EMPLOYEE' } });
    if (role) {
      await this.prisma.userRoleAssignment.create({ data: { userId: user.id, roleId: role.id } });
    }
    await this.audit.log({ companyId, userId: createdBy, action: 'USER_CREATED', entity: 'User', entityId: user.id, newValue: { email: data.email, name: data.name, role: data.role } });
    return { id: user.id, email: user.email, name: user.name, role: data.role || 'EMPLOYEE' };
  }

  async getUser(companyId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
      include: {
        memberships: { where: { companyId }, select: { role: true, status: true } },
        roleAssignments: { include: { role: { select: { name: true, description: true } } } },
        site: { select: { id: true, siteCode: true, siteName: true } },
        process: { select: { id: true, processCode: true, processName: true } },
        lob: { select: { id: true, lobCode: true, lobName: true } },
        shift: { select: { id: true, name: true, startTime: true, endTime: true } },
        manager: { select: { id: true, name: true, email: true } },
        teamLeader: { select: { id: true, name: true, email: true } },
      } as any,
    });
    if (!user) throw new NotFoundException('User not found');
    const scopes = await this.prisma.accessScope.findMany({ where: { userId, companyId, isActive: true }, include: { site: true, process: true } });
    return { ...user, role: (user as any).memberships?.[0]?.role, scopes };
  }

  async updateUser(companyId: string, userId: string, data: any, updatedBy: string) {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.phone) updateData.phone = data.phone;
    if (data.designation) updateData.designation = data.designation;
    if (data.transportEligibility) updateData.transportEligibility = data.transportEligibility;
    const user = await this.prisma.user.update({ where: { id: userId }, data: updateData });
    await this.audit.log({ companyId, userId: updatedBy, action: 'USER_UPDATED', entity: 'User', entityId: userId, newValue: data });
    return user;
  }

  async suspendUser(companyId: string, performedBy: string, userId: string, reason: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { status: 'SUSPENDED' as any } });
    await this.prisma.companyMembership.updateMany({ where: { userId, companyId }, data: { status: 'SUSPENDED' as any } });
    await this.audit.log({ companyId, userId: performedBy, action: 'USER_SUSPENDED', entity: 'User', entityId: userId, newValue: { reason } });
    return { userId, status: 'SUSPENDED', reason };
  }

  async reactivateUser(companyId: string, performedBy: string, userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { status: 'ACTIVE' } });
    await this.prisma.companyMembership.updateMany({ where: { userId, companyId }, data: { status: 'ACTIVE' } });
    await this.audit.log({ companyId, userId: performedBy, action: 'USER_REACTIVATED', entity: 'User', entityId: userId });
    return { userId, status: 'ACTIVE' };
  }

  async assignUserScope(companyId: string, performedBy: string, userId: string, data: any) {
    const scope = await this.prisma.accessScope.create({
      data: { userId, companyId, siteId: data.siteId, processId: data.processId, shiftId: data.shiftId, isActive: true, expiresAt: data.expiresAt ? new Date(data.expiresAt) : null },
    });
    await this.audit.log({ companyId, userId: performedBy, action: 'SCOPE_GRANTED', entity: 'AccessScope', entityId: scope.id, newValue: data });
    return scope;
  }

  async revokeUserScope(companyId: string, performedBy: string, userId: string, scopeId: string) {
    await this.prisma.accessScope.delete({ where: { id: scopeId } });
    await this.audit.log({ companyId, userId: performedBy, action: 'SCOPE_REVOKED', entity: 'AccessScope', entityId: scopeId });
    return { revoked: true };
  }

  async getUserEffectiveAccess(companyId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
      include: { roleAssignments: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } as any,
    });
    if (!user) throw new NotFoundException('User not found');
    const roles = (user as any).roleAssignments?.map((ra: any) => ra.role.name) || [];
    const perms = new Set<string>();
    for (const ra of (user as any).roleAssignments || []) {
      for (const rp of ra.role.permissions || []) {
        perms.add(rp.permission.module + ':' + rp.permission.action);
      }
    }
    const scopes = await this.prisma.accessScope.findMany({ where: { userId, companyId, isActive: true } });
    return { userId, roles, permissions: [...perms], scopes: scopes.map(s => ({ siteId: s.siteId, processId: s.processId, shiftId: s.shiftId })), siteCount: new Set(scopes.map(s => s.siteId).filter(Boolean)).size };
  }

  // ============================================================
  // COMPANY VENDORS (basic CRUD)
  // ============================================================

  async listVendors(companyId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    return this.prisma.vendor.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  async createVendor(companyId: string, performedBy: string, data: {
    name: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    billingModel?: string;
  }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const vendor = await this.prisma.vendor.create({
      data: {
        companyId,
        name: data.name,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        billingModel: data.billingModel,
        status: 'ACTIVE',
      },
    });

    await this.audit.log({
      companyId, userId: performedBy, action: 'VENDOR_CREATED',
      entity: 'Vendor', entityId: vendor.id, newValue: { name: data.name },
    });

    return vendor;
  }

  async updateVendor(companyId: string, performedBy: string, id: string, data: any) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const vendor = await this.prisma.vendor.findFirst({ where: { id, companyId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const updated = await this.prisma.vendor.update({ where: { id }, data });

    await this.audit.log({
      companyId, userId: performedBy, action: 'VENDOR_UPDATED',
      entity: 'Vendor', entityId: id, newValue: data,
    });

    return updated;
  }

  async deleteVendor(companyId: string, performedBy: string, id: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const vendor = await this.prisma.vendor.findFirst({ where: { id, companyId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    await this.prisma.vendor.delete({ where: { id } });

    await this.audit.log({
      companyId, userId: performedBy, action: 'VENDOR_DELETED',
      entity: 'Vendor', entityId: id, oldValue: { name: vendor.name },
    });

    return { deleted: true, id };
  }

  // ============================================================
  // SHIFTS
  // ============================================================

  async listShifts(companyId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    return this.prisma.shift.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  async createShift(companyId: string, performedBy: string, data: {
    name: string;
    startTime: string;
    endTime: string;
  }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const shift = await this.prisma.shift.create({
      data: {
        companyId,
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
      },
    });

    await this.audit.log({
      companyId, userId: performedBy, action: 'SHIFT_CREATED',
      entity: 'Shift', entityId: shift.id, newValue: data,
    });

    return shift;
  }

  // ============================================================
  // AUDIT LOGS (read-only for admin)
  // ============================================================

  async getAuditLogs(companyId: string, params: {
    page?: number;
    limit?: number;
    entity?: string;
    userId?: string;
  }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const page = params.page || 1;
    const limit = Math.min(params.limit || 50, 200);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.entity) where.entity = params.entity;
    if (params.userId) where.userId = params.userId;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}

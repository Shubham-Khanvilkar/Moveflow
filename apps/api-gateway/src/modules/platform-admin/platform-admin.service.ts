import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

import { AuditService } from '../../common/audit.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class PlatformAdminService {
  private readonly logger = new Logger(PlatformAdminService.name);

  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  // ─── COMPANY CRUD ─────────────────────────────────────────
  async listCompanies(query: { page?: number; limit?: number; search?: string; status?: string }) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const where: any = {};
    if (query.search) where.OR = [{ name: { contains: query.search, mode: "insensitive" } }, { code: { contains: query.search, mode: "insensitive" } }];
    if (query.status) where.status = query.status;
    const [companies, total] = await Promise.all([
      this.prisma.company.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" } }),
      this.prisma.company.count({ where }),
    ]);
    return { data: companies, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async createCompany(dto: any) {
    if (!dto.name || !dto.code) throw new BadRequestException("Name and code are required");
    const exists = await this.prisma.company.findUnique({ where: { code: dto.code } });
    if (exists) throw new BadRequestException("Company code already exists");
    const company = await this.prisma.company.create({
      data: {
        name: dto.name,
        legalName: dto.legalName || dto.name,
        code: dto.code,
        slug: dto.code.toLowerCase().replace(/[^a-z0-9]/g, "-"),
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        country: dto.country || "India",
        city: dto.city,
        status: dto.status || "ACTIVE",
        settings: dto.settings || {},
      },
    });

    // Auto-create 14-day trial subscription
    try {
      const starterPlan = await this.prisma.subscriptionPlan.findFirst({ where: { name: 'STARTER', isActive: true } })
        || await this.prisma.subscriptionPlan.findFirst({ where: { isActive: true }, orderBy: { monthlyPrice: 'asc' } });
      if (starterPlan) {
        const trialEnds = new Date();
        trialEnds.setDate(trialEnds.getDate() + 14);
        await (this.prisma as any).subscription.create({
          data: {
            companyId: company.id, planId: starterPlan.id, status: 'TRIAL',
            billingCycle: 'MONTHLY', currentPeriodStart: new Date(), currentPeriodEnd: trialEnds, trialEndsAt: trialEnds,
          },
        });
      }
    } catch (e: any) { this.logger.warn('Auto-trial creation failed: ' + e.message); }

    this.logger.log("Company created with trial: " + company.id);
    return { success: true, data: company };
  }

  async getCompany(id: string) {
    const company = await this.prisma.company.findUnique({ where: { id }, include: { _count: { select: { users: true } } } } as any);
    if (!company) throw new NotFoundException("Company not found");
    return { success: true, data: company };
  }

  async updateCompany(id: string, dto: any) {
    const existing = await this.prisma.company.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Company not found");
    const company = await this.prisma.company.update({ where: { id }, data: dto });
    return { success: true, data: company };
  }

  async updateCompanyStatus(id: string, status: string) {
    const existing = await this.prisma.company.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Company not found");
    const company = await this.prisma.company.update({ where: { id }, data: { status: status as any } });
    return { success: true, data: company };
  }

  // ─── USER MANAGEMENT ─────────────────────────────────────
  async listUsers(companyId: string, query: { page?: number; limit?: number; search?: string; role?: string }) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const where: any = { companyId };
    if (query.search) where.OR = [{ name: { contains: query.search, mode: "insensitive" } }, { email: { contains: query.search, mode: "insensitive" } }];
    if (query.role) {
      where.roleAssignments = { some: { role: { name: query.role } } };
    }
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" }, include: { roleAssignments: { include: { role: true } } } as any }),
      this.prisma.user.count({ where }),
    ]);
    const data = users.map(u => ({ ...u, passwordHash: undefined, roles: u.roleAssignments.map((r: any) => r.role.name) }));
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { roleAssignments: { include: { role: true } } } as any });
    if (!user) throw new NotFoundException("User not found");
    return { ...user, passwordHash: undefined, roles: user.roleAssignments.map((r: any) => ({ id: r.role.id, name: r.role.name, displayName: r.role.displayName, securityDomain: r.role.securityDomain })) };
  }

  async updateUserRole(userId: string, roleId: string, scope?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException("Role not found");
    await this.prisma.userRoleAssignment.upsert({
      where: { userId_roleId: { userId, roleId } },
      update: { scope },
      create: { userId, roleId, scope },
    });
    return { success: true, message: "Role assigned" };
  }

  // ─── PERMISSION DELTA ────────────────────────────────────
  async getRolePermissionsDelta(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: { RolePermission: { include: { permission: true } } },
    });
    if (!role) throw new NotFoundException("Role not found");

    const permissions = (role as any).RolePermission.map((rp: any) => ({
      code: rp.permission.name,
      module: rp.permission.module,
      action: rp.permission.action,
    }));

    return {
      roleId: role.id,
      roleName: role.name,
      permissions,
      totalPermissions: permissions.length,
    };
  }

  async changeUserRole(userId: string, newRoleId: string, changedBy: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roleAssignments: { include: { role: { include: { RolePermission: { include: { permission: true } } } } } } },
    });
    if (!user) throw new NotFoundException("User not found");

    const newRole = await this.prisma.role.findUnique({
      where: { id: newRoleId },
      include: { RolePermission: { include: { permission: true } } },
    });
    if (!newRole) throw new NotFoundException("Role not found");

    // Collect before permissions
    const beforePermissions = new Set<string>();
    for (const ra of (user as any).roleAssignments) {
      for (const rp of ra.role.RolePermission) {
        beforePermissions.add(rp.permission.name);
      }
    }

    // Collect after permissions
    const afterPermissions = new Set<string>();
    for (const rp of (newRole as any).RolePermission) {
      afterPermissions.add(rp.permission.name);
    }

    // Calculate delta
    const gainedPermissions = [...afterPermissions].filter(p => !beforePermissions.has(p));
    const revokedPermissions = [...beforePermissions].filter(p => !afterPermissions.has(p));

    // Update role assignment
    await this.prisma.userRoleAssignment.upsert({
      where: { userId_roleId: { userId, roleId: newRoleId } },
      update: {},
      create: { userId, roleId: newRoleId },
    });

    return {
      userId,
      previousRoleId: (user as any).roleAssignments?.[0]?.roleId,
      newRoleId,
      gainedPermissions,
      revokedPermissions,
      changedBy,
      changedAt: new Date().toISOString(),
    };
  }

  // ─── ACCESS SIMULATOR ────────────────────────────────────
  async simulateAccess(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { roleAssignments: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } as any });
    if (!user) throw new NotFoundException("User not found");
    
    const allPermissions: any[] = [];
    const roles: any[] = [];
    for (const ra of (user as any).roleAssignments) {
      roles.push({ id: ra.role.id, name: ra.role.name, displayName: ra.role.displayName, securityDomain: ra.role.securityDomain, hierarchyLevel: ra.role.hierarchyLevel, scope: ra.scope });
      for (const rp of ra.role.permissions) {
        if (!allPermissions.find(p => p.name === rp.permission.name)) {
          allPermissions.push({ name: rp.permission.name, module: rp.permission.module, action: rp.permission.action });
        }
      }
    }

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      companyId: user.companyId,
      status: user.status,
      roles,
      effectivePermissions: allPermissions,
      domain: roles[0]?.securityDomain || "UNKNOWN",
    };
  }

  // ─── ROLE CATALOGUE ──────────────────────────────────────
  async listRoles() {
    return this.prisma.role.findMany({ include: { _count: { select: { permissions: true, assignments: true } } } as any, orderBy: { securityDomain: "asc" } });
  }

  async listPermissions() {
    return this.prisma.permission.findMany({ orderBy: { module: "asc" } });
  }

  // ─── ACCESS TOGGLE ────────────────────────────────────────
  async setAccessToggle(userId: string, permissionKey: string, isGranted: boolean, grantedBy: string, reason?: string, companyId?: string) {
    return this.setPermissionOverride({
      userId,
      companyId,
      permissionKey,
      status: isGranted ? 'GRANTED' : 'REVOKED',
      performedBy: grantedBy,
      reason: reason || (isGranted ? 'Permission granted' : 'Permission revoked'),
    });
  }

  async getAccessToggles(userId: string, companyId?: string) {
    return this.prisma.userAccessOverride.findMany({ where: { userId, ...(companyId ? { companyId } : {}) } });
  }

  async getPermissionOverrideHistory(userId: string, companyId?: string) {
    return this.prisma.permissionOverrideHistory.findMany({
      where: { userId, ...(companyId ? { companyId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async setPermissionOverride(input: {
    userId: string;
    companyId?: string;
    permissionKey: string;
    status: 'GRANTED' | 'REVOKED' | 'SUSPENDED' | 'SCHEDULED' | 'EXPIRED';
    performedBy: string;
    reason: string;
    suspensionReason?: string;
    effectiveFrom?: string;
    effectiveUntil?: string;
  }) {
    if (!input.reason?.trim()) throw new BadRequestException('A reason is required for permission changes');
    if (input.userId === input.performedBy && input.status === 'GRANTED') {
      throw new ForbiddenException('Users cannot grant permissions to themselves');
    }

    const effectiveFrom = input.effectiveFrom ? new Date(input.effectiveFrom) : null;
    const effectiveUntil = input.effectiveUntil ? new Date(input.effectiveUntil) : null;
    if (effectiveFrom && Number.isNaN(effectiveFrom.getTime())) throw new BadRequestException('Invalid effectiveFrom');
    if (effectiveUntil && Number.isNaN(effectiveUntil.getTime())) throw new BadRequestException('Invalid effectiveUntil');
    if (effectiveFrom && effectiveUntil && effectiveUntil <= effectiveFrom) throw new BadRequestException('effectiveUntil must be after effectiveFrom');

    const status = input.status;
    const isGranted = status === 'GRANTED' || status === 'SCHEDULED';
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.userAccessOverride.findFirst({
        where: { userId: input.userId, companyId: input.companyId || null, permissionKey: input.permissionKey },
      });
      const override = existing
        ? await tx.userAccessOverride.update({
            where: { id: existing.id },
            data: {
              status: status as any,
              isGranted,
              reason: input.reason,
              suspensionReason: input.suspensionReason,
              grantedBy: status === 'GRANTED' || status === 'SCHEDULED' ? input.performedBy : existing.grantedBy,
              revokedBy: status === 'REVOKED' || status === 'EXPIRED' ? input.performedBy : existing.revokedBy,
              suspendedBy: status === 'SUSPENDED' ? input.performedBy : existing.suspendedBy,
              effectiveFrom,
              effectiveUntil,
            },
          })
        : await tx.userAccessOverride.create({
            data: {
              userId: input.userId,
              companyId: input.companyId,
              permissionKey: input.permissionKey,
              status: status as any,
              isGranted,
              reason: input.reason,
              suspensionReason: input.suspensionReason,
              grantedBy: status === 'GRANTED' || status === 'SCHEDULED' ? input.performedBy : undefined,
              revokedBy: status === 'REVOKED' || status === 'EXPIRED' ? input.performedBy : undefined,
              suspendedBy: status === 'SUSPENDED' ? input.performedBy : undefined,
              effectiveFrom,
              effectiveUntil,
            },
          });

      await tx.permissionOverrideHistory.create({
        data: {
          overrideId: override.id,
          userId: input.userId,
          companyId: input.companyId,
          permissionKey: input.permissionKey,
          previousStatus: existing?.status || null,
          newStatus: status as any,
          reason: input.reason,
          performedBy: input.performedBy,
          effectiveFrom,
          effectiveUntil,
        },
      });

      await this.audit.log({
        companyId: input.companyId,
        userId: input.performedBy,
        action: `PERMISSION_${status}`,
        entity: 'UserAccessOverride',
        entityId: override.id,
        oldValue: existing ? { status: existing.status, isGranted: existing.isGranted } : undefined,
        newValue: { permissionKey: input.permissionKey, status, reason: input.reason },
      });

      return override;
    });
  }

  async bulkPermissionOverrides(input: {
    userId: string;
    companyId?: string;
    performedBy: string;
    changes: Array<{ permissionKey: string; status: 'GRANTED' | 'REVOKED' | 'SUSPENDED' | 'SCHEDULED'; reason: string; effectiveFrom?: string; effectiveUntil?: string }>;
  }) {
    if (!input.changes?.length) throw new BadRequestException('At least one permission change is required');
    const results = [];
    for (const change of input.changes) {
      results.push(await this.setPermissionOverride({ ...input, ...change }));
    }
    return results;
  }

  // Dashboard KPI - real counts from database
  async getDashboardKpi() {
    const [
      employeeCount, driverCount, vehicleCount, tripCount, bookingCount,
      vendorCount, routeCount, incidentCount, auditCount, shiftCount,
      siteCount, userCount, roleCount, permissionCount,
    ] = await Promise.all([
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.driverProfile.count(),
      this.prisma.vehicle.count(),
      this.prisma.trip.count(),
      this.prisma.booking.count(),
      this.prisma.vendor.count(),
      this.prisma.route.count(),
      this.prisma.incident.count(),
      this.prisma.auditLog.count(),
      this.prisma.shift.count(),
      this.prisma.companySite.count(),
      this.prisma.user.count(),
      this.prisma.role.count(),
      this.prisma.permission.count(),
    ]);

    const tripStatuses = await this.prisma.trip.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const bookingStatuses = await this.prisma.booking.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const recentAudit = await this.prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: { action: true, createdAt: true, userId: true, entity: true, resourceType: true },
    });

    let availableDrivers = 0;
    try {
      availableDrivers = await this.prisma.driverProfile.count({
        where: { status: 'AVAILABLE' as any },
      });
    } catch(e) { this.logger.error('Failed to query available drivers', (e as Error).message); }

    let activeTrips = 0;
    try {
      activeTrips = await this.prisma.trip.count({
        where: { status: { in: ['IN_TRANSIT', 'DISPATCHED', 'DRIVER_ACCEPTED', 'EN_ROUTE_TO_PICKUP'] as any[] } },
      });
    } catch(e) { this.logger.error('Failed to query active trips', (e as Error).message); }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let todayTrips = 0;
    try {
      todayTrips = await this.prisma.trip.count({
        where: { createdAt: { gte: today } },
      });
    } catch(e) { this.logger.error('Failed to query today trips', (e as Error).message); }

    let openIncidents = 0;
    try {
      openIncidents = await this.prisma.incident.count({
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] as any[] } },
      });
    } catch(e) { this.logger.error('Failed to query open incidents', (e as Error).message); }

    return {
      employees: { total: employeeCount },
      drivers: { total: driverCount, available: availableDrivers },
      vehicles: { total: vehicleCount },
      trips: { total: tripCount, active: activeTrips, today: todayTrips },
      bookings: { total: bookingCount },
      vendors: { total: vendorCount },
      routes: { total: routeCount },
      incidents: { total: incidentCount, open: openIncidents },
      audit: { total: auditCount },
      shifts: { total: shiftCount },
      sites: { total: siteCount },
      users: { total: userCount },
      roles: { total: roleCount },
      permissions: { total: permissionCount },
      tripStatuses: tripStatuses.map(s => ({ status: s.status, count: s._count.status })),
      bookingStatuses: bookingStatuses.map(s => ({ status: s.status, count: s._count.status })),
      recentAudit,
    };
  }

  // ─── SITE MANAGEMENT ──────────────────────────────────────
  async listSites(companyId: string) {
    const where: any = {};
    if (companyId) where.companyId = companyId;
    return this.prisma.companySite.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async createSite(dto: any) {
    if (!dto.companyId || !dto.siteCode || !dto.siteName) throw new BadRequestException("companyId, siteCode, siteName are required");
    const exists = await this.prisma.companySite.findFirst({ where: { companyId: dto.companyId, siteCode: dto.siteCode } });
    if (exists) throw new BadRequestException("Site code already exists for this company");
    const site = await this.prisma.companySite.create({
      data: {
        companyId: dto.companyId,
        siteCode: dto.siteCode,
        siteName: dto.siteName,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        city: dto.city,
        state: dto.state,
        timezone: dto.timezone || 'Asia/Kolkata',
      },
    });
    this.logger.log("Site created: " + site.id);
    return { success: true, data: site };
  }

  async updateSite(id: string, dto: any) {
    const existing = await this.prisma.companySite.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Site not found");
    const site = await this.prisma.companySite.update({ where: { id }, data: dto });
    return { success: true, data: site };
  }

  async deleteSite(id: string) {
    const existing = await this.prisma.companySite.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Site not found");
    await this.prisma.companySite.delete({ where: { id } });
    return { success: true, message: "Site deleted" };
  }

  // ─── LINE OF BUSINESS (LOB) MANAGEMENT ─────────────────────
  async listLobs(companyId: string) {
    const where: any = {};
    if (companyId) where.companyId = companyId;
    return this.prisma.lineOfBusiness.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async createLob(dto: any) {
    if (!dto.companyId || !dto.lobCode || !dto.lobName) throw new BadRequestException("companyId, lobCode, lobName are required");
    const exists = await this.prisma.lineOfBusiness.findFirst({ where: { companyId: dto.companyId, lobCode: dto.lobCode } });
    if (exists) throw new BadRequestException("LOB code already exists for this company");
    const lob = await this.prisma.lineOfBusiness.create({
      data: {
        companyId: dto.companyId,
        siteId: dto.siteId,
        lobCode: dto.lobCode,
        lobName: dto.lobName,
        description: dto.description,
      },
    });
    this.logger.log("LOB created: " + lob.id);
    return { success: true, data: lob };
  }

  async updateLob(id: string, dto: any) {
    const existing = await this.prisma.lineOfBusiness.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("LOB not found");
    const lob = await this.prisma.lineOfBusiness.update({ where: { id }, data: dto });
    return { success: true, data: lob };
  }

  async deleteLob(id: string) {
    const existing = await this.prisma.lineOfBusiness.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("LOB not found");
    await this.prisma.lineOfBusiness.delete({ where: { id } });
    return { success: true, message: "LOB deleted" };
  }

  // ─── PROCESS MANAGEMENT ────────────────────────────────────
  async listProcesses(companyId: string) {
    const where: any = {};
    if (companyId) where.companyId = companyId;
    return this.prisma.orgProcess.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async createProcess(dto: any) {
    if (!dto.companyId || !dto.processCode || !dto.processName) throw new BadRequestException("companyId, processCode, processName are required");
    const exists = await this.prisma.orgProcess.findFirst({ where: { companyId: dto.companyId, processCode: dto.processCode } });
    if (exists) throw new BadRequestException("Process code already exists for this company");
    const process = await this.prisma.orgProcess.create({
      data: {
        companyId: dto.companyId,
        lobId: dto.lobId,
        processCode: dto.processCode,
        processName: dto.processName,
        description: dto.description,
      },
    });
    this.logger.log("Process created: " + process.id);
    return { success: true, data: process };
  }

  async updateProcess(id: string, dto: any) {
    const existing = await this.prisma.orgProcess.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Process not found");
    const process = await this.prisma.orgProcess.update({ where: { id }, data: dto });
    return { success: true, data: process };
  }

  async deleteProcess(id: string) {
    const existing = await this.prisma.orgProcess.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Process not found");
    await this.prisma.orgProcess.delete({ where: { id } });
    return { success: true, message: "Process deleted" };
  }

  // ─── PERMISSION DEFINITION MANAGEMENT ──────────────────────
  async listPermissionDefinitions() {
    return this.prisma.permissionDefinition.findMany({ orderBy: { module: 'asc' } });
  }

  async createPermissionDefinition(dto: any) {
    if (!dto.code || !dto.module || !dto.action) throw new BadRequestException("code, module, action are required");
    const exists = await this.prisma.permissionDefinition.findUnique({ where: { code: dto.code } });
    if (exists) throw new BadRequestException("Permission code already exists");
    const perm = await this.prisma.permissionDefinition.create({
      data: {
        code: dto.code,
        module: dto.module,
        action: dto.action,
        category: dto.category,
        description: dto.description,
        isSensitive: dto.isSensitive || false,
      },
    });
    return { success: true, data: perm };
  }

  async updatePermissionDefinition(id: string, dto: any) {
    const existing = await this.prisma.permissionDefinition.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Permission not found");
    const perm = await this.prisma.permissionDefinition.update({ where: { id }, data: dto });
    return { success: true, data: perm };
  }

  // ─── EMPLOYEE ONBOARDING/OFFBOARDING ──────────────────────
  async onboardEmployee(dto: any) {
    if (!dto.companyId || !dto.email || !dto.employeeId) throw new BadRequestException("companyId, email, employeeId are required");
    const existing = await this.prisma.user.findFirst({ where: { companyId: dto.companyId, employeeId: dto.employeeId } });
    if (existing) throw new BadRequestException("Employee ID already exists in this company");

    const passwordHash = await bcrypt.hash(dto.password || require('crypto').randomBytes(16).toString('hex'), 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        phone: dto.phone,
        employeeId: dto.employeeId,
        companyId: dto.companyId,
        passwordHash,
        status: 'ACTIVE',
        siteId: dto.siteId,
        processId: dto.processId,
        designation: dto.designation,
        managerId: dto.managerId,
        teamLeaderId: dto.teamLeaderId,
        gender: dto.gender,
        transportEligibility: dto.transportEligibility || 'ELIGIBLE',
        homeLatitude: dto.homeLatitude,
        homeLongitude: dto.homeLongitude,
        homeAddress: dto.homeAddress,
        passwordChangedAt: new Date(),
      },
    });

    if (dto.siteId || dto.processId) {
      await this.prisma.accessScope.create({
        data: {
          userId: user.id,
          companyId: dto.companyId,
          siteId: dto.siteId,
          processId: dto.processId,
          isActive: true,
        },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        companyId: dto.companyId,
        userId: dto.onboardedBy || 'system',
        action: 'EMPLOYEE_ONBOARDED',
        entity: 'User',
        entityId: user.id,
        newValue: JSON.stringify({ email: dto.email, employeeId: dto.employeeId, siteId: dto.siteId }),
      },
    });

    this.logger.log("Employee onboarded: " + user.id);
    return { success: true, data: { id: user.id, email: user.email, employeeId: user.employeeId } };
  }

  async offboardEmployee(userId: string, dto: any) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("Employee not found");

    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'INACTIVE' },
    });

    await this.prisma.accessScope.updateMany({
      where: { userId, companyId: user.companyId },
      data: { isActive: false },
    });

    // Revoke all role assignments
    await (this.prisma as any).userRoleAssignment.updateMany({
      where: { userId },
      data: { status: 'REVOKED' },
    });

    // Deactivate transport access assignments
    await this.prisma.transportAccessAssignment.updateMany({
      where: { userId, companyId: user.companyId },
      data: { isActive: false },
    });

    await this.prisma.auditLog.create({
      data: {
        companyId: user.companyId,
        userId: dto.offboardedBy || 'system',
        action: 'EMPLOYEE_OFFBOARDED',
        entity: 'User',
        entityId: userId,
        newValue: JSON.stringify({ reason: dto.reason || 'Offboarded', offboardedAt: new Date().toISOString() }),
      },
    });

    this.logger.log("Employee offboarded: " + userId);
    return { success: true, message: "Employee offboarded" };
  }

  /**
   * Bulk import employees from structured data (CSV parsed to JSON).
   * Returns success count, error list with line numbers.
   */
  async bulkImportEmployees(companyId: string, rows: any[], importedBy: string) {
    const results: { success: number; errors: { row: number; email: string; error: string }[] } = {
      success: 0,
      errors: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 for 1-indexed + header row

      try {
        // Validate required fields
        if (!row.email && !row.employeeId) {
          results.errors.push({ row: rowNum, email: row.email || '', error: 'Either email or employeeId is required' });
          continue;
        }

        const email = row.email || `${row.employeeId}@${companyId}.local`;
        const employeeId = row.employeeId || row.email;

        // Check duplicate
        const existing = await this.prisma.user.findFirst({
          where: { companyId, employeeId },
        });
        if (existing) {
          results.errors.push({ row: rowNum, email, error: 'Employee ID already exists' });
          continue;
        }

        // Check email unique
        const existingEmail = await this.prisma.user.findUnique({ where: { email } });
        if (existingEmail) {
          results.errors.push({ row: rowNum, email, error: 'Email already exists' });
          continue;
        }

        // Find site by code if provided
        let siteId = row.siteId;
        if (row.siteCode && !siteId) {
          const site = await this.prisma.companySite.findFirst({
            where: { companyId, siteCode: row.siteCode },
          });
          siteId = site?.id;
        }

        // Find process by code if provided
        let processId = row.processId;
        if (row.processCode && !processId) {
          const process = await this.prisma.orgProcess.findFirst({
            where: { companyId, processCode: row.processCode },
          });
          processId = process?.id;
        }

        const passwordHash = await bcrypt.hash(row.password || require('crypto').randomBytes(16).toString('hex'), 12);
        const user = await this.prisma.user.create({
          data: {
            email,
            name: row.name || row.employeeId,
            phone: row.phone,
            employeeId,
            companyId,
            passwordHash,
            status: 'ACTIVE',
            siteId,
            processId,
            designation: row.designation,
            gender: row.gender,
            transportEligibility: row.transportEligibility || 'ELIGIBLE',
            homeLatitude: row.homeLatitude ? parseFloat(row.homeLatitude) : null,
            homeLongitude: row.homeLongitude ? parseFloat(row.homeLongitude) : null,
            homeAddress: row.homeAddress,
            passwordChangedAt: new Date(),
          },
        });

        if (siteId || processId) {
          await this.prisma.accessScope.create({
            data: {
              userId: user.id,
              companyId,
              siteId,
              processId,
              isActive: true,
            },
          });
        }

        results.success++;
      } catch (err: any) {
        results.errors.push({ row: rowNum, email: row.email || '', error: err.message });
      }
    }

    await this.prisma.auditLog.create({
      data: {
        companyId,
        userId: importedBy,
        action: 'EMPLOYEE_BULK_IMPORT',
        entity: 'User',
        newValue: JSON.stringify({ totalRows: rows.length, success: results.success, errors: results.errors.length }),
      },
    });

    this.logger.log(`Bulk import: ${results.success} success, ${results.errors.length} errors`);
    return results;
  }

  /**
   * Get employee details with full context.
   */
  async getEmployeeDetails(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roleAssignments: { include: { role: true } } as any,
      } as any,
    });
    if (!user) throw new NotFoundException('Employee not found');

    const accessScopes = await this.prisma.accessScope.findMany({
      where: { userId, isActive: true },
      include: {
        site: { select: { id: true, siteName: true, siteCode: true } },
        process: { select: { id: true, processName: true, processCode: true } },
      },
    });

    return {
      ...user,
      passwordHash: undefined,
      roles: (user as any).roleAssignments?.map((r: any) => ({
        id: r.role.id,
        name: r.role.name,
        displayName: r.role.displayName,
      })) || [],
      scopes: accessScopes.map(s => ({
        siteId: s.siteId,
        siteName: (s as any).site?.siteName,
        processId: s.processId,
        processName: (s as any).process?.processName,
      })),
    };
  }

  // ─── OWNER MANAGEMENT (V13 §3 — Owner hierarchy) ──────────

  /** List owner-tier identities: SAAS_OWNER / MOVEINSYNC_OWNER role holders. */
  async listOwners() {
    const ownerRoleNames = ['SAAS_OWNER', 'MOVEINSYNC_OWNER'];
    const roles = await this.prisma.transportAccessRole.findMany({
      where: { roleName: { in: ownerRoleNames } },
    });
    const roleIds = roles.map(r => r.id);
    const assignments = await this.prisma.transportAccessAssignment.findMany({
      where: { roleId: { in: roleIds }, isActive: true },
    });
    const userIds = [...new Set(assignments.map(a => a.userId))];
    const users = await this.prisma.user.findMany({ where: { id: { in: userIds } } });
    const roleById = new Map(roles.map(r => [r.id, r]));
    const data = users.map(u => {
      const a = assignments.find(x => x.userId === u.id);
      const role = a ? roleById.get(a.roleId) : null;
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        status: u.status,
        lastLoginAt: u.lastLoginAt,
        role: role ? { name: role.roleName, displayName: role.displayName, hierarchyLevel: role.hierarchyLevel } : null,
      };
    });
    return { data, total: data.length };
  }

  /** Create an owner-tier identity. Governed by V13 §3.2 creation matrix. */
  async createOwner(dto: {
    email: string; name: string; phone?: string; tier: 'SAAS_OWNER' | 'MOVEINSYNC_OWNER';
    password: string; createdBy: string;
  }) {
    if (!dto.email || !dto.name || !dto.tier || !dto.password) {
      throw new BadRequestException('email, name, tier and password are required');
    }
    if (dto.tier === 'SAAS_OWNER') {
      // Only an existing SAAS_OWNER may create another SAAS_OWNER (V13 §3.2)
      const creatorRoles = await this.prisma.transportAccessAssignment.findMany({
        where: { userId: dto.createdBy, isActive: true } as any,
        include: { role: true } as any,
      });
      const isSaasOwner = (creatorRoles as any[]).some(a => a.role?.roleName === 'SAAS_OWNER');
      if (!isSaasOwner) {
        throw new BadRequestException('Only a SAAS_OWNER can create another SAAS_OWNER');
      }
    }
    if (dto.password.length < 8) throw new BadRequestException('Password must be at least 8 characters');

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('A user with this email already exists');

    const company = (dto as any).companyId
      ? await this.prisma.company.findUnique({ where: { id: (dto as any).companyId } })
      : await this.prisma.company.findFirst();
    if (!company) throw new BadRequestException('Reference company not found');

    const role = await this.prisma.transportAccessRole.findFirst({
      where: { roleName: dto.tier, companyId: company.id },
    });
    if (!role) throw new BadRequestException(`Owner role ${dto.tier} is not seeded`);


    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        phone: dto.phone,
        passwordHash,
        companyId: company.id,
        status: 'ACTIVE',
        passwordChangedAt: new Date(),
      },
    });

    await this.prisma.transportAccessAssignment.create({
      data: {
        userId: user.id,
        roleId: role.id,
        companyId: company.id,
        isActive: true,
        assignedAt: new Date(),
        assignedBy: dto.createdBy,
      } as any,
    });

    const membership = await this.prisma.companyMembership.findFirst({
      where: { userId: user.id, companyId: company.id },
    });
    if (!membership) {
      await this.prisma.companyMembership.create({
        data: { userId: user.id, companyId: company.id, role: 'NAVIRA_OWNER', status: 'ACTIVE' },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        companyId: company.id,
        userId: dto.createdBy,
        action: 'OWNER_CREATED',
        entity: 'User',
        entityId: user.id,
        newValue: JSON.stringify({ email: dto.email, tier: dto.tier }),
      },
    });


    return {
      id: user.id,
      email: user.email,
      name: user.name,
      tier: dto.tier,
      status: user.status,
      message: 'Owner created. Invitation and MFA enrollment per V13 §3.3 steps 4–10.',
    };
  }

  /** Activate / suspend an owner identity. */
  async setOwnerStatus(ownerId: string, status: 'ACTIVE' | 'SUSPENDED', changedBy: string) {
    const user = await this.prisma.user.findUnique({ where: { id: ownerId } });
    if (!user) throw new NotFoundException('Owner not found');

    const isOwner = await this.prisma.transportAccessAssignment.findFirst({
      where: { userId: ownerId, isActive: true } as any,
      include: { role: true } as any,
    });
    if (!isOwner) throw new NotFoundException('User is not an owner-tier identity');

    await this.prisma.user.update({ where: { id: ownerId }, data: { status } });

    await this.prisma.auditLog.create({
      data: {
        companyId: user.companyId,
        userId: changedBy,
        action: status === 'ACTIVE' ? 'OWNER_ACTIVATED' : 'OWNER_SUSPENDED',
        entity: 'User',
        entityId: ownerId,
        newValue: JSON.stringify({ status }),
      },
    });

    return { id: ownerId, status, message: `Owner ${status === 'ACTIVE' ? 'activated' : 'suspended'}` };
  }

  /** Owner audit history. */
  async getOwnerAudit(ownerId: string) {
    const logs = await this.prisma.auditLog.findMany({
      where: { entityId: ownerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { data: logs };
  }

  // ─── COMPLETE USER PROFILE ──────────────────────────────
  async getFullProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roleAssignments: { include: { role: true } } as any,
        accessScopes: { include: { site: { select: { id: true, siteName: true, siteCode: true } }, process: { select: { id: true, processName: true, processCode: true } } } },
        permissionOverrides: { orderBy: { createdAt: 'desc' } } as any,
        Company: { select: { id: true, name: true, code: true } },
      } as any,
    });
    if (!user) throw new NotFoundException('User not found');

    // Get permission overrides with history
    const overrides = await this.prisma.userAccessOverride.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Get permission override history
    const permissionHistory = await this.prisma.permissionOverrideHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Get access scope history
    const scopeHistory = await this.prisma.userAccessScopeHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Get recent audit logs
    const auditLogs = await this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Build role hierarchy
    const roles = (user as any).roleAssignments?.map((ra: any) => ({
      id: ra.role?.id,
      name: ra.role?.name,
      displayName: ra.role?.displayName,
      securityDomain: ra.role?.securityDomain,
      hierarchyLevel: ra.role?.hierarchyLevel,
      scope: ra.scope,
    })) || [];

    // Build scopes
    const scopes = (user as any).accessScopes?.map((s: any) => ({
      siteId: s.siteId,
      siteName: s.site?.siteName,
      siteCode: s.site?.siteCode,
      processId: s.processId,
      processName: s.process?.processName,
      processCode: s.process?.processCode,
      isActive: s.isActive,
    })) || [];

    return {
      // Identity
      identity: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        employeeId: user.employeeId,
        securityDomain: user.securityDomain,
        identityType: user.identityType,
        primaryRoleId: user.primaryRoleId,
        status: user.status,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
      // Employment
      employment: {
        designation: (user as any).designation,
        department: (user as any).departmentName,
        team: (user as any).teamName,
        managerId: (user as any).managerId,
        joiningDate: (user as any).joiningDate,
        transportEligibility: user.transportEligibility,
      },
      // Organization
      organization: {
        companyId: user.companyId,
        companyName: (user as any).Company?.name,
        companyCode: (user as any).Company?.code,
        siteId: (user as any).siteId,
        processId: (user as any).processId,
        teamId: (user as any).teamId,
      },
      // Role and Access
      roleAndAccess: {
        roles,
        scopes,
        overrides: overrides.map(o => ({
          id: o.id,
          permissionKey: o.permissionKey,
          status: o.status,
          reason: o.reason,
          effectiveFrom: o.effectiveFrom,
          effectiveUntil: o.effectiveUntil,
          grantedBy: o.grantedBy,
          revokedBy: o.revokedBy,
          suspendedBy: o.suspendedBy,
          createdAt: o.createdAt,
        })),
      },
      // Security
      security: {
        mfaEnabled: (user as any).mfaEnabled || false,
        lastPasswordChange: (user as any).passwordChangedAt,
        failedLoginAttempts: (user as any).failedLoginAttempts || 0,
        lockedUntil: (user as any).lockedUntil,
      },
      // Audit
      audit: {
        permissionHistory: permissionHistory.map(h => ({
          id: h.id,
          permissionKey: h.permissionKey,
          previousStatus: h.previousStatus,
          newStatus: h.newStatus,
          reason: h.reason,
          performedBy: h.performedBy,
          createdAt: h.createdAt,
        })),
        scopeHistory: scopeHistory.map(h => ({
          id: h.id,
          companyId: h.companyId,
          previousScope: h.previousScope,
          newScope: h.newScope,
          action: h.action,
          reason: h.reason,
          performedBy: h.performedBy,
          createdAt: h.createdAt,
        })),
        recentActivity: auditLogs.map(l => ({
          id: l.id,
          action: l.action,
          entity: l.entity,
          entityId: l.entityId,
          createdAt: l.createdAt,
        })),
      },
    };
  }

}

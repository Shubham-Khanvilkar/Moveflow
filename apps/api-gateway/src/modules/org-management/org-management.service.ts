import { Injectable, BadRequestException, NotFoundException, ConflictException, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class OrgManagementService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  // ============================================================
  // REGIONS
  // ============================================================

  async getRegions(companyId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    return this.prisma.region.findMany({ where: { companyId }, orderBy: { regionName: 'asc' } });
  }

  async createRegion(companyId: string, data: { regionCode: string; regionName: string; description?: string }, createdBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const existing = await this.prisma.region.findFirst({ where: { companyId, regionCode: data.regionCode } });
    if (existing) throw new ConflictException(`Region code ${data.regionCode} already exists`);
    const region = await this.prisma.region.create({ data: { companyId, ...data } });
    await this.audit.log({ companyId, userId: createdBy, action: 'REGION_CREATED', entity: 'Region', entityId: region.id, newValue: data });
    return region;
  }

  async updateRegion(companyId: string, regionId: string, data: { regionName?: string; description?: string; isActive?: boolean }, updatedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const existing = await this.prisma.region.findFirst({ where: { id: regionId, companyId } });
    if (!existing) throw new NotFoundException('Region not found');
    const updated = await this.prisma.region.update({ where: { id: regionId }, data });
    await this.audit.log({ companyId, userId: updatedBy, action: 'REGION_UPDATED', entity: 'Region', entityId: regionId, oldValue: { regionName: existing.regionName }, newValue: data });
    return updated;
  }

  // ============================================================
  // SITES (COMPANY SITES)
  // ============================================================

  async getSites(companyId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    return this.prisma.companySite.findMany({ where: { companyId }, orderBy: { siteName: 'asc' } });
  }

  async createSite(companyId: string, data: { siteCode: string; siteName: string; address?: string; city?: string; state?: string; latitude?: number; longitude?: number; businessUnitId?: string }, createdBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const existing = await this.prisma.companySite.findFirst({ where: { companyId, siteCode: data.siteCode } });
    if (existing) throw new ConflictException(`Site code ${data.siteCode} already exists`);
    const site = await this.prisma.companySite.create({ data: { companyId, ...data } });
    await this.audit.log({ companyId, userId: createdBy, action: 'SITE_CREATED', entity: 'CompanySite', entityId: site.id, newValue: data });
    return site;
  }

  async updateSite(companyId: string, siteId: string, data: Record<string, any>, updatedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const existing = await this.prisma.companySite.findFirst({ where: { id: siteId, companyId } });
    if (!existing) throw new NotFoundException('Site not found');
    const updated = await this.prisma.companySite.update({ where: { id: siteId }, data });
    await this.audit.log({ companyId, userId: updatedBy, action: 'SITE_UPDATED', entity: 'CompanySite', entityId: siteId, newValue: data });
    return updated;
  }

  async deleteSite(companyId: string, siteId: string, deletedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const existing = await this.prisma.companySite.findFirst({ where: { id: siteId, companyId } });
    if (!existing) throw new NotFoundException('Site not found');
    const lobCount = await this.prisma.lineOfBusiness.count({ where: { siteId } });
    if (lobCount > 0) throw new BadRequestException('Cannot delete site with associated LOBs');
    await this.prisma.companySite.delete({ where: { id: siteId } });
    await this.audit.log({ companyId, userId: deletedBy, action: 'SITE_DELETED', entity: 'CompanySite', entityId: siteId, oldValue: { siteName: existing.siteName } });
    return { deleted: true, id: siteId };
  }

  // ============================================================
  // LOBs (LINES OF BUSINESS)
  // ============================================================

  async getLOBs(companyId: string, siteId?: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const where: any = { companyId };
    if (siteId) where.siteId = siteId;
    return this.prisma.lineOfBusiness.findMany({ where, orderBy: { lobName: 'asc' } });
  }

  async createLOB(companyId: string, data: { lobCode: string; lobName: string; description?: string; siteId?: string }, createdBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const existing = await this.prisma.lineOfBusiness.findFirst({ where: { companyId, lobCode: data.lobCode } });
    if (existing) throw new ConflictException(`LOB code ${data.lobCode} already exists`);
    if (data.siteId) {
      const site = await this.prisma.companySite.findFirst({ where: { id: data.siteId, companyId } });
      if (!site) throw new NotFoundException('Site not found');
    }
    const lob = await this.prisma.lineOfBusiness.create({ data: { companyId, ...data } });
    await this.audit.log({ companyId, userId: createdBy, action: 'LOB_CREATED', entity: 'LineOfBusiness', entityId: lob.id, newValue: data });
    return lob;
  }

  async updateLOB(companyId: string, lobId: string, data: Record<string, any>, updatedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const existing = await this.prisma.lineOfBusiness.findFirst({ where: { id: lobId, companyId } });
    if (!existing) throw new NotFoundException('LOB not found');
    const updated = await this.prisma.lineOfBusiness.update({ where: { id: lobId }, data });
    await this.audit.log({ companyId, userId: updatedBy, action: 'LOB_UPDATED', entity: 'LineOfBusiness', entityId: lobId, newValue: data });
    return updated;
  }

  async deleteLOB(companyId: string, lobId: string, deletedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const existing = await this.prisma.lineOfBusiness.findFirst({ where: { id: lobId, companyId } });
    if (!existing) throw new NotFoundException('LOB not found');
    const processCount = await this.prisma.orgProcess.count({ where: { lobId } });
    if (processCount > 0) throw new BadRequestException('Cannot delete LOB with associated processes');
    await this.prisma.lineOfBusiness.delete({ where: { id: lobId } });
    await this.audit.log({ companyId, userId: deletedBy, action: 'LOB_DELETED', entity: 'LineOfBusiness', entityId: lobId, oldValue: { lobName: existing.lobName } });
    return { deleted: true, id: lobId };
  }

  // ============================================================
  // PROCESSES
  // ============================================================

  async getProcesses(companyId: string, lobId?: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const where: any = { companyId };
    if (lobId) where.lobId = lobId;
    return this.prisma.orgProcess.findMany({ where, orderBy: { processName: 'asc' } });
  }

  async createProcess(companyId: string, data: { processCode: string; processName: string; description?: string; lobId?: string }, createdBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const existing = await this.prisma.orgProcess.findFirst({ where: { companyId, processCode: data.processCode } });
    if (existing) throw new ConflictException(`Process code ${data.processCode} already exists`);
    if (data.lobId) {
      const lob = await this.prisma.lineOfBusiness.findFirst({ where: { id: data.lobId, companyId } });
      if (!lob) throw new NotFoundException('LOB not found');
    }
    const process = await this.prisma.orgProcess.create({ data: { companyId, ...data } });
    await this.audit.log({ companyId, userId: createdBy, action: 'PROCESS_CREATED', entity: 'OrgProcess', entityId: process.id, newValue: data });
    return process;
  }

  async updateProcess(companyId: string, processId: string, data: Record<string, any>, updatedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const existing = await this.prisma.orgProcess.findFirst({ where: { id: processId, companyId } });
    if (!existing) throw new NotFoundException('Process not found');
    const updated = await this.prisma.orgProcess.update({ where: { id: processId }, data });
    await this.audit.log({ companyId, userId: updatedBy, action: 'PROCESS_UPDATED', entity: 'OrgProcess', entityId: processId, newValue: data });
    return updated;
  }

  async deleteProcess(companyId: string, processId: string, deletedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const existing = await this.prisma.orgProcess.findFirst({ where: { id: processId, companyId } });
    if (!existing) throw new NotFoundException('Process not found');
    await this.prisma.orgProcess.delete({ where: { id: processId } });
    await this.audit.log({ companyId, userId: deletedBy, action: 'PROCESS_DELETED', entity: 'OrgProcess', entityId: processId, oldValue: { processName: existing.processName } });
    return { deleted: true, id: processId };
  }

  // ============================================================
  // EMPLOYEE ORG ASSIGNMENTS
  // ============================================================

  async getEmployeeOrgAssignments(companyId: string, userId: string) {
    if (!this.prisma.isConnected()) return [];
    const assignments = await this.prisma.employeeOrgAssignment.findMany({
      where: { companyId, userId },
      include: { site: true, lob: true, process: true, shift: true },
    });
    return assignments;
  }

  async assignEmployeeToOrg(companyId: string, userId: string, data: { siteId?: string; lobId?: string; processId?: string; shiftId?: string }, assignedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const user = await this.prisma.user.findFirst({ where: { id: userId, companyId } });
    if (!user) throw new NotFoundException('Employee not found');

    if (data.siteId) {
      const site = await this.prisma.companySite.findFirst({ where: { id: data.siteId, companyId } });
      if (!site) throw new NotFoundException('Site not found');
    }
    if (data.lobId) {
      const lob = await this.prisma.lineOfBusiness.findFirst({ where: { id: data.lobId, companyId } });
      if (!lob) throw new NotFoundException('LOB not found');
    }
    if (data.processId) {
      const process = await this.prisma.orgProcess.findFirst({ where: { id: data.processId, companyId } });
      if (!process) throw new NotFoundException('Process not found');
    }
    if (data.shiftId) {
      const shift = await this.prisma.shift.findFirst({ where: { id: data.shiftId, companyId } });
      if (!shift) throw new NotFoundException('Shift not found');
    }

    const assignment = await this.prisma.employeeOrgAssignment.upsert({
      where: { userId_siteId_lobId_processId_shiftId: { userId, siteId: data.siteId ?? '', lobId: data.lobId ?? '', processId: data.processId ?? '', shiftId: data.shiftId ?? '' } },
      update: data,
      create: { companyId, userId, ...data },
    });

    await this.audit.log({ companyId, userId: assignedBy, action: 'EMPLOYEE_ORG_ASSIGNED', entity: 'EmployeeOrgAssignment', entityId: assignment.id, newValue: data });
    return assignment;
  }

  async removeEmployeeOrgAssignment(companyId: string, assignmentId: string, removedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const assignment = await this.prisma.employeeOrgAssignment.findFirst({ where: { id: assignmentId, companyId } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    await this.prisma.employeeOrgAssignment.delete({ where: { id: assignmentId } });
    await this.audit.log({ companyId, userId: removedBy, action: 'EMPLOYEE_ORG_REMOVED', entity: 'EmployeeOrgAssignment', entityId: assignmentId });
    return { removed: true };
  }

  // ============================================================
  // ACCESS SCOPES
  // ============================================================

  async getUserAccessScopes(companyId: string, userId: string) {
    if (!this.prisma.isConnected()) return [];
    return this.prisma.accessScope.findMany({
      where: { companyId, userId, isActive: true },
      include: { site: true, lob: true, process: true, shift: true },
    });
  }

  async grantAccessScope(companyId: string, userId: string, data: { siteId?: string; lobId?: string; processId?: string; shiftId?: string; expiresAt?: string }, grantedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const user = await this.prisma.user.findFirst({ where: { id: userId, companyId } });
    if (!user) throw new NotFoundException('User not found');

    const scope = await this.prisma.accessScope.create({
      data: {
        companyId,
        userId,
        siteId: data.siteId || null,
        lobId: data.lobId || null,
        processId: data.processId || null,
        shiftId: data.shiftId || null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        grantedBy,
      },
    });

    await this.prisma.userAccessScopeHistory.create({
      data: { companyId, userId, action: 'GRANTED', newScope: scope as any, performedBy: grantedBy },
    });

    await this.audit.log({ companyId, userId: grantedBy, action: 'ACCESS_SCOPE_GRANTED', entity: 'AccessScope', entityId: scope.id, newValue: { targetUserId: userId, ...data } });
    return scope;
  }

  async revokeAccessScope(companyId: string, scopeId: string, revokedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const scope = await this.prisma.accessScope.findFirst({ where: { id: scopeId, companyId } });
    if (!scope) throw new NotFoundException('Access scope not found');

    await this.prisma.accessScope.update({ where: { id: scopeId }, data: { isActive: false } });

    await this.prisma.userAccessScopeHistory.create({
      data: { companyId, userId: scope.userId, action: 'REVOKED', previousScope: scope as any, performedBy: revokedBy },
    });

    await this.audit.log({ companyId, userId: revokedBy, action: 'ACCESS_SCOPE_REVOKED', entity: 'AccessScope', entityId: scopeId });
    return { revoked: true };
  }

  async getEffectiveAccess(companyId: string, userId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const scopes = await this.prisma.accessScope.findMany({
      where: { companyId, userId, isActive: true },
      include: { site: true, lob: true, process: true, shift: true },
    });

    const assignments = await this.prisma.transportAccessAssignment.findMany({
      where: { companyId, userId, isActive: true },
      include: { role: true },
    });

    const siteIds = [...new Set(scopes.filter(s => s.siteId).map(s => s.siteId))];
    const lobIds = [...new Set(scopes.filter(s => s.lobId).map(s => s.lobId))];
    const processIds = [...new Set(scopes.filter(s => s.processId).map(s => s.processId))];
    const shiftIds = [...new Set(scopes.filter(s => s.shiftId).map(s => s.shiftId))];

    const employeeWhere: any = { companyId, status: 'ACTIVE' };
    if (siteIds.length > 0 || lobIds.length > 0 || processIds.length > 0 || shiftIds.length > 0) {
      employeeWhere.AND = [];
      if (siteIds.length > 0) employeeWhere.AND.push({ orgAssignments: { some: { siteId: { in: siteIds } } } });
      if (lobIds.length > 0) employeeWhere.AND.push({ orgAssignments: { some: { lobId: { in: lobIds } } } });
      if (processIds.length > 0) employeeWhere.AND.push({ orgAssignments: { some: { processId: { in: processIds } } } });
      if (shiftIds.length > 0) employeeWhere.AND.push({ orgAssignments: { some: { shiftId: { in: shiftIds } } } });
    }

    const employeeCount = await this.prisma.user.count({ where: employeeWhere });

    return {
      roles: assignments.map(a => ({ id: a.role.id, name: a.role.roleName, displayName: a.role.displayName, hierarchyLevel: a.role.hierarchyLevel })),
      scopes: scopes.map(s => ({
        site: s.site ? { id: s.site.id, name: s.site.siteName } : null,
        lob: s.lob ? { id: s.lob.id, name: s.lob.lobName } : null,
        process: s.process ? { id: s.process.id, name: s.process.processName } : null,
        shift: s.shift ? { id: s.shift.id, name: s.shift.name } : null,
        expiresAt: s.expiresAt,
      })),
      effectiveEmployeeCount: employeeCount,
      siteCount: siteIds.length,
      lobCount: lobIds.length,
      processCount: processIds.length,
      shiftCount: shiftIds.length,
    };
  }

  // ============================================================
  // TRANSPORT ACCESS ROLES
  // ============================================================

  async getTransportAccessRoles(companyId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    return this.prisma.transportAccessRole.findMany({ where: { companyId }, orderBy: { hierarchyLevel: 'desc' } });
  }

  async createTransportAccessRole(companyId: string, data: {
    roleName: string; displayName: string; description?: string; hierarchyLevel: number;
    canManageVendors?: boolean; canManageDrivers?: boolean; canManageVehicles?: boolean;
    canManageRoutes?: boolean; canImportEmployees?: boolean; canManagePolicies?: boolean;
    canApproveBanRemoval?: boolean; canApproveExpenses?: boolean; canManageEmergency?: boolean;
    canManageShuttles?: boolean; canManageNodals?: boolean; canViewAnalytics?: boolean;
    canManageSubAdmins?: boolean; canManageAccessRoles?: boolean;
  }, createdBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const existing = await this.prisma.transportAccessRole.findFirst({ where: { companyId, roleName: data.roleName } });
    if (existing) throw new ConflictException(`Role name ${data.roleName} already exists`);
    const role = await this.prisma.transportAccessRole.create({ data: { companyId, ...data } });
    await this.audit.log({ companyId, userId: createdBy, action: 'TRANSPORT_ROLE_CREATED', entity: 'TransportAccessRole', entityId: role.id, newValue: { roleName: data.roleName } });
    return role;
  }

  async updateTransportAccessRole(companyId: string, roleId: string, data: Record<string, any>, updatedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const existing = await this.prisma.transportAccessRole.findFirst({ where: { id: roleId, companyId } });
    if (!existing) throw new NotFoundException('Transport access role not found');
    const updated = await this.prisma.transportAccessRole.update({ where: { id: roleId }, data });
    await this.audit.log({ companyId, userId: updatedBy, action: 'TRANSPORT_ROLE_UPDATED', entity: 'TransportAccessRole', entityId: roleId, newValue: data });
    return updated;
  }

  async deleteTransportAccessRole(companyId: string, roleId: string, deletedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const existing = await this.prisma.transportAccessRole.findFirst({ where: { id: roleId, companyId } });
    if (!existing) throw new NotFoundException('Transport access role not found');
    const assignmentCount = await this.prisma.transportAccessAssignment.count({ where: { roleId } });
    if (assignmentCount > 0) throw new BadRequestException('Cannot delete role with active assignments');
    await this.prisma.transportAccessRole.delete({ where: { id: roleId } });
    await this.audit.log({ companyId, userId: deletedBy, action: 'TRANSPORT_ROLE_DELETED', entity: 'TransportAccessRole', entityId: roleId, oldValue: { roleName: existing.roleName } });
    return { deleted: true, id: roleId };
  }

  // ============================================================
  // TRANSPORT ACCESS ROLE ASSIGNMENTS
  // ============================================================

  async getTransportAccessAssignments(companyId: string) {
    if (!this.prisma.isConnected()) return [];
    return this.prisma.transportAccessAssignment.findMany({
      where: { companyId, isActive: true },
      include: { role: true },
    });
  }

  async assignTransportAccessRole(companyId: string, data: {
    userId: string; roleId: string;
  }, assignedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const user = await this.prisma.user.findFirst({ where: { id: data.userId, companyId } });
    if (!user) throw new NotFoundException('User not found');
    const role = await this.prisma.transportAccessRole.findFirst({ where: { id: data.roleId, companyId } });
    if (!role) throw new NotFoundException('Role not found');

    const existing = await this.prisma.transportAccessAssignment.findFirst({
      where: { companyId, userId: data.userId, roleId: data.roleId, isActive: true },
    });
    if (existing) throw new ConflictException('User already has this role');

    const assignment = await this.prisma.transportAccessAssignment.create({
      data: { companyId, userId: data.userId, roleId: data.roleId, assignedBy },
    });

    await this.audit.log({ companyId, userId: assignedBy, action: 'TRANSPORT_ROLE_ASSIGNED', entity: 'TransportAccessAssignment', entityId: assignment.id, newValue: { targetUserId: data.userId, roleName: role.roleName } });
    return assignment;
  }

  async revokeTransportAccessRole(companyId: string, assignmentId: string, revokedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const assignment = await this.prisma.transportAccessAssignment.findFirst({ where: { id: assignmentId, companyId } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    await this.prisma.transportAccessAssignment.update({ where: { id: assignmentId }, data: { isActive: false } });
    await this.audit.log({ companyId, userId: revokedBy, action: 'TRANSPORT_ROLE_REVOKED', entity: 'TransportAccessAssignment', entityId: assignmentId });
    return { revoked: true };
  }

  // ============================================================
  // PERMISSION DEFINITIONS
  // ============================================================

  async getPermissionDefinitions(companyId: string) {
    if (!this.prisma.isConnected()) return [];
    return this.prisma.permissionDefinition.findMany({ orderBy: [{ module: 'asc' }, { action: 'asc' }] });
  }

  async createPermissionDefinition(companyId: string, data: { module: string; action: string; description?: string; category?: string }, createdBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const code = `${data.module}:${data.action}`;
    const existing = await this.prisma.permissionDefinition.findFirst({ where: { code } });
    if (existing) throw new ConflictException(`Permission ${code} already exists`);
    const perm = await this.prisma.permissionDefinition.create({ data: { code, ...data } });
    await this.audit.log({ companyId, userId: createdBy, action: 'PERMISSION_DEFINED', entity: 'PermissionDefinition', entityId: perm.id, newValue: data });
    return perm;
  }

  // ============================================================
  // ROLE-PERMISSION CONFIG
  // ============================================================

  async getRolePermissionConfigs(companyId: string, roleId?: string) {
    if (!this.prisma.isConnected()) return [];
    const where: any = { companyId };
    if (roleId) where.roleId = roleId;
    return this.prisma.rolePermissionConfig.findMany({
      where, include: { role: { select: { id: true, roleName: true } }, permission: true } as any,
    });
  }

  async setRolePermissionConfig(companyId: string, roleId: string, permissionId: string, enabled: boolean, configuredBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const role = await this.prisma.transportAccessRole.findFirst({ where: { id: roleId, companyId } });
    if (!role) throw new NotFoundException('Role not found');
    const perm = await this.prisma.permissionDefinition.findFirst({ where: { id: permissionId } });
    if (!perm) throw new NotFoundException('Permission not found');

    const config = await this.prisma.rolePermissionConfig.upsert({
      where: { companyId_roleId_permissionId: { companyId, roleId, permissionId } },
      update: { enabled },
      create: { companyId, roleId, permissionId, enabled },
    });

    await this.audit.log({ companyId, userId: configuredBy, action: 'ROLE_PERMISSION_CONFIGURED', entity: 'RolePermissionConfig', entityId: config.id, newValue: { roleName: role.roleName, permission: `${perm.module}:${perm.action}`, enabled } });
    return config;
  }

  async bulkSetRolePermissions(companyId: string, roleId: string, permissionIds: string[], enabled: boolean, configuredBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const results = [];
    for (const permissionId of permissionIds) {
      const result = await this.setRolePermissionConfig(companyId, roleId, permissionId, enabled, configuredBy);
      results.push(result);
    }
    return { configured: true, count: results.length };
  }

  // ============================================================
  // ORG HIERARCHY TREE
  // ============================================================


  // Shifts
  async getShifts(companyId: string) {
    return this.prisma.shift.findMany({ where: { companyId }, orderBy: { startTime: 'asc' } });
  }

  async createShift(companyId: string, data: { name: string; startTime: string; endTime: string; description?: string }, createdBy: string) {
    return this.prisma.shift.create({ data: { ...data, companyId } });
  }

  async updateShift(companyId: string, id: string, data: any, updatedBy: string) {
    return this.prisma.shift.update({ where: { id }, data });
  }

  async deleteShift(companyId: string, id: string, deletedBy: string) {
    return this.prisma.shift.delete({ where: { id } });
  }

  async getOrgTree(companyId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const sites = await this.prisma.companySite.findMany({
      where: { companyId, isActive: true },
      include: {
        LineOfBusiness: {
          where: { isActive: true },
          include: {
            OrgProcess: {
              where: { isActive: true },
              include: {
                AccessScope: true,
              } as any,
            },
          },
        },
      },
      orderBy: { siteName: 'asc' },
    });

    const shifts = await this.prisma.shift.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });

    return { sites, shifts };
  }

  // ============================================================
  // DEMO DATA
  // ============================================================

  private _demoRegions() {
    return [
      { id: 'reg-1', regionCode: 'WEST', regionName: 'West Region', companyId: 'company-acme-001', isActive: true },
      { id: 'reg-2', regionCode: 'SOUTH', regionName: 'South Region', companyId: 'company-acme-001', isActive: true },
    ];
  }

  private _demoSites() {
    return [
      { id: 'site-1', siteCode: 'MUM', siteName: 'Mumbai', city: 'Mumbai', companyId: 'company-acme-001', isActive: true },
      { id: 'site-2', siteCode: 'PUN', siteName: 'Pune', city: 'Pune', companyId: 'company-acme-001', isActive: true },
      { id: 'site-3', siteCode: 'BLR', siteName: 'Bengaluru', city: 'Bengaluru', companyId: 'company-acme-001', isActive: true },
    ];
  }

  private _demoLOBs() {
    return [
      { id: 'lob-1', lobCode: 'BANK', lobName: 'Banking', companyId: 'company-acme-001', siteId: 'site-1', isActive: true },
      { id: 'lob-2', lobCode: 'CSUP', lobName: 'Customer Support', companyId: 'company-acme-001', siteId: 'site-1', isActive: true },
    ];
  }

  private _demoProcesses() {
    return [
      { id: 'proc-1', processCode: 'PROC-A', processName: 'Process A', companyId: 'company-acme-001', lobId: 'lob-1', isActive: true },
      { id: 'proc-2', processCode: 'PROC-B', processName: 'Process B', companyId: 'company-acme-001', lobId: 'lob-1', isActive: true },
      { id: 'proc-3', processCode: 'PROC-C', processName: 'Process C', companyId: 'company-acme-001', lobId: 'lob-2', isActive: true },
      { id: 'proc-4', processCode: 'PROC-D', processName: 'Process D', companyId: 'company-acme-001', lobId: 'lob-2', isActive: true },
    ];
  }

  private _demoEffectiveAccess() {
    return {
      roles: [{ id: 'role-1', name: 'MANAGER', displayName: 'Manager', hierarchyLevel: 4 }],
      scopes: [{ site: { id: 'site-1', name: 'Mumbai' }, lob: { id: 'lob-1', name: 'Banking' }, process: { id: 'proc-1', name: 'Process A' }, shift: { id: 'shift-1', name: 'Morning' }, expiresAt: null }],
      effectiveEmployeeCount: 45,
      siteCount: 1,
      lobCount: 1,
      processCount: 1,
      shiftCount: 1,
    };
  }

  private _demoTransportRoles() {
    return [
      { id: 'role-1', roleName: 'NAVIRA_PLATFORM_ADMINISTRATOR', displayName: 'Super Admin', hierarchyLevel: 10, canManageVendors: true, canManageDrivers: true, canManageVehicles: true, canManageRoutes: true, canImportEmployees: true, canManagePolicies: true, canManageAccessRoles: true, canViewAnalytics: true, companyId: 'company-acme-001', isActive: true },
      { id: 'role-2', roleName: 'TRANSPORT_HEAD', displayName: 'Transport Head', hierarchyLevel: 8, canManageVendors: true, canManageDrivers: true, canManageVehicles: true, canManageRoutes: true, canViewAnalytics: true, companyId: 'company-acme-001', isActive: true },
    ];
  }

  private _demoOrgTree() {
    return {
      sites: [
        { id: 'site-1', siteCode: 'MUM', siteName: 'Mumbai', LineOfBusiness: [
          { id: 'lob-1', lobCode: 'BANK', lobName: 'Banking', OrgProcess: [
            { id: 'proc-1', processCode: 'PROC-A', processName: 'Process A' },
            { id: 'proc-2', processCode: 'PROC-B', processName: 'Process B' },
          ]},
          { id: 'lob-2', lobCode: 'CSUP', lobName: 'Customer Support', OrgProcess: [
            { id: 'proc-3', processCode: 'PROC-C', processName: 'Process C' },
            { id: 'proc-4', processCode: 'PROC-D', processName: 'Process D' },
          ]},
        ]},
      ],
      shifts: [
        { id: 'shift-1', name: 'Morning', startTime: '06:00', endTime: '15:00' },
        { id: 'shift-2', name: 'Evening', startTime: '14:00', endTime: '23:00' },
        { id: 'shift-3', name: 'Night', startTime: '22:00', endTime: '07:00' },
      ],
    };
  }
}

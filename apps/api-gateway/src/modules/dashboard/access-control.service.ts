import { Injectable, Logger, ForbiddenException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class AccessControlService {
  private readonly logger = new Logger(AccessControlService.name);
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async getRoles(companyId: string) {
    if (!this.prisma.isConnected()) return this.defaultRoles();
    const roles = await this.prisma.transportAccessRole.findMany({ where: { companyId, isActive: true }, orderBy: { hierarchyLevel: 'asc' } });
    return roles.length > 0 ? roles : this.defaultRoles();
  }

  async createRole(companyId: string, data: { roleName: string; displayName: string; description?: string; hierarchyLevel?: number; permissions: Record<string, boolean> }, createdBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const role = await this.prisma.transportAccessRole.create({
      data: {
        companyId, roleName: data.roleName.toUpperCase(), displayName: data.displayName, description: data.description,
        hierarchyLevel: data.hierarchyLevel || 5,
        canManageVendors: data.permissions.canManageVendors ?? false,
        canManageDrivers: data.permissions.canManageDrivers ?? false,
        canManageVehicles: data.permissions.canManageVehicles ?? false,
        canManageRoutes: data.permissions.canManageRoutes ?? false,
        canImportEmployees: data.permissions.canImportEmployees ?? false,
        canManagePolicies: data.permissions.canManagePolicies ?? false,
        canApproveBanRemoval: data.permissions.canApproveBanRemoval ?? false,
        canApproveExpenses: data.permissions.canApproveExpenses ?? false,
        canManageEmergency: data.permissions.canManageEmergency ?? false,
        canManageShuttles: data.permissions.canManageShuttles ?? false,
        canManageNodals: data.permissions.canManageNodals ?? false,
        canViewAnalytics: data.permissions.canViewAnalytics ?? true,
        canManageSubAdmins: data.permissions.canManageSubAdmins ?? false,
        canManageAccessRoles: data.permissions.canManageAccessRoles ?? false,
      },
    });
    await this.audit.log({ companyId, userId: createdBy, action: 'ROLE_CREATED', entity: 'TransportAccessRole', entityId: role.id, newValue: { roleName: data.roleName } });
    return role;
  }

  async assignRole(companyId: string, userId: string, roleId: string, assignedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const existing = await this.prisma.transportAccessAssignment.findFirst({ where: { companyId, userId, roleId, isActive: true } });
    if (existing) throw new ForbiddenException('Role already assigned');
    const assignment = await this.prisma.transportAccessAssignment.create({ data: { companyId, userId, roleId, assignedBy } });
    await this.audit.log({ companyId, userId: assignedBy, action: 'ROLE_ASSIGNED', entity: 'TransportAccessAssignment', entityId: assignment.id, newValue: { targetUserId: userId, roleId } });
    return assignment;
  }

  async revokeRole(companyId: string, assignmentId: string, revokedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    await this.prisma.transportAccessAssignment.update({ where: { id: assignmentId }, data: { isActive: false } });
    await this.audit.log({ companyId, userId: revokedBy, action: 'ROLE_REVOKED', entity: 'TransportAccessAssignment', entityId: assignmentId });
    return { revoked: true };
  }

  async getUserPermissions(companyId: string, userId: string) {
    if (!this.prisma.isConnected()) return this.defaultPermissions();
    const assignments = await this.prisma.transportAccessAssignment.findMany({
      where: { companyId, userId, isActive: true },
    });
    const roleIds = assignments.map(a => a.roleId);
    const roles = roleIds.length > 0
      ? await this.prisma.transportAccessRole.findMany({ where: { id: { in: roleIds }, isActive: true } })
      : [];
    if (roles.length === 0) return this.defaultPermissions();
    const merged: Record<string, boolean> = {};
    for (const role of roles) {
      if (role.canManageVendors) merged.canManageVendors = true;
      if (role.canManageDrivers) merged.canManageDrivers = true;
      if (role.canManageVehicles) merged.canManageVehicles = true;
      if (role.canManageRoutes) merged.canManageRoutes = true;
      if (role.canImportEmployees) merged.canImportEmployees = true;
      if (role.canManagePolicies) merged.canManagePolicies = true;
      if (role.canApproveBanRemoval) merged.canApproveBanRemoval = true;
      if (role.canApproveExpenses) merged.canApproveExpenses = true;
      if (role.canManageEmergency) merged.canManageEmergency = true;
      if (role.canManageShuttles) merged.canManageShuttles = true;
      if (role.canManageNodals) merged.canManageNodals = true;
      if (role.canViewAnalytics) merged.canViewAnalytics = true;
      if (role.canManageSubAdmins) merged.canManageSubAdmins = true;
      if (role.canManageAccessRoles) merged.canManageAccessRoles = true;
    }
    return merged;
  }

  async checkPermission(companyId: string, userId: string, permission: string): Promise<boolean> {
    const perms = await this.getUserPermissions(companyId, userId);
    return (perms as Record<string, boolean>)[permission] === true;
  }

  async getApprovalLevels(companyId: string, workflowType: string) {
    if (!this.prisma.isConnected()) return this.defaultApprovalLevels(workflowType);
    const levels = await this.prisma.approvalLevel.findMany({ where: { companyId, workflowType, isActive: true }, orderBy: { level: 'asc' } });
    return levels.length > 0 ? levels : this.defaultApprovalLevels(workflowType);
  }

  async createApprovalLevel(companyId: string, workflowType: string, data: { level: number; approverRole: string; approverUserIds?: string; autoApprove?: boolean; autoApproveAfterMinutes?: number }, createdBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const level = await this.prisma.approvalLevel.create({
      data: { companyId, workflowType, ...data },
    });
    await this.audit.log({ companyId, userId: createdBy, action: 'APPROVAL_LEVEL_CREATED', entity: 'ApprovalLevel', entityId: level.id });
    return level;
  }

  private defaultRoles() {
    return [
      { roleName: 'NAVIRA_PLATFORM_ADMINISTRATOR', displayName: 'Super Admin', hierarchyLevel: 0, canManageAccessRoles: true, canManageSubAdmins: true, canManageVendors: true, canManageDrivers: true, canManageVehicles: true, canManageRoutes: true, canImportEmployees: true, canManagePolicies: true, canApproveBanRemoval: true, canApproveExpenses: true, canManageEmergency: true, canManageShuttles: true, canManageNodals: true, canViewAnalytics: true },
      { roleName: 'TRANSPORT_ADMIN', displayName: 'Transport Admin', hierarchyLevel: 1, canManageVendors: true, canManageDrivers: true, canManageVehicles: true, canManageRoutes: true, canImportEmployees: true, canManagePolicies: true, canApproveBanRemoval: true, canApproveExpenses: true, canManageEmergency: true, canManageShuttles: true, canManageNodals: true, canViewAnalytics: true },
      { roleName: 'TRANSPORT_SUB_ADMIN', displayName: 'Transport Sub Admin', hierarchyLevel: 2, canManageVendors: true, canManageDrivers: true, canManageVehicles: true, canManageRoutes: true, canImportEmployees: true, canManagePolicies: false, canApproveBanRemoval: false, canApproveExpenses: false, canManageEmergency: true, canManageShuttles: true, canManageNodals: true, canViewAnalytics: true },
      { roleName: 'DIRECTOR', displayName: 'Director', hierarchyLevel: 3, canApproveBanRemoval: true, canApproveExpenses: true, canViewAnalytics: true },
      { roleName: 'MANAGER', displayName: 'Manager', hierarchyLevel: 4, canApproveBanRemoval: true, canViewAnalytics: true },
      { roleName: 'TEAM_LEADER', displayName: 'Team Leader', hierarchyLevel: 5, canViewAnalytics: false },
      { roleName: 'ASSISTANT_MANAGER', displayName: 'Assistant Manager', hierarchyLevel: 6, canViewAnalytics: false },
    ];
  }

  private defaultPermissions() {
    return { canManageVendors: false, canManageDrivers: false, canManageVehicles: false, canManageRoutes: false, canImportEmployees: false, canManagePolicies: false, canApproveBanRemoval: false, canApproveExpenses: false, canManageEmergency: false, canManageShuttles: false, canManageNodals: false, canViewAnalytics: false, canManageSubAdmins: false, canManageAccessRoles: false };
  }

  private defaultApprovalLevels(workflowType: string) {
    if (workflowType === 'BAN_REMOVAL') {
      return [
        { level: 1, approverRole: 'MANAGER', isRequired: true },
        { level: 2, approverRole: 'DIRECTOR', isRequired: false },
      ];
    }
    if (workflowType === 'EXPENSE_APPROVAL') {
      return [
        { level: 1, approverRole: 'MANAGER', isRequired: true },
        { level: 2, approverRole: 'TRANSPORT_ADMIN', isRequired: true },
      ];
    }
    return [{ level: 1, approverRole: 'TRANSPORT_ADMIN', isRequired: true }];
  }
}

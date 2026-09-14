import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

export interface AuthorizationContext {
  userId: string;
  companyId: string;
  roles: string[];
  permissions: string[];
  accessScopes: Array<{
    siteId?: string;
    lobId?: string;
    processId?: string;
    shiftId?: string;
    expiresAt?: Date | null;
  }>;
}

export interface EffectiveAccess {
  userId: string;
  companyId: string;
  roles: Array<{ id: string; name: string; displayName?: string }>;
  permissions: string[];
  effectiveScope: {
    siteIds: string[];
    lobIds: string[];
    processIds: string[];
    shiftIds: string[];
    hasCompanyWide: boolean;
  };
  explicitDenies: string[];
  dashboard: string;
  canCreateLowerAdmin: boolean;
  dataClassification: string;
}

@Injectable()
export class AuthorizationService {
  private readonly logger = new Logger(AuthorizationService.name);
  constructor(private readonly prisma: PrismaService) {}

  async can(userId: string, companyId: string, permissionCode: string,
    resourceScope?: { siteId?: string; processId?: string; shiftId?: string }
  ): Promise<{ allowed: boolean; reason: string }> {
    if (!this.prisma.isConnected()) return { allowed: false, reason: "Database not connected" };
    const ctx = await this.buildAuthContext(userId, companyId);
    if (!ctx) return { allowed: false, reason: "User not found" };
    if (ctx.permissions.includes("DENY:" + permissionCode)) return { allowed: false, reason: "Explicit deny" };
    const hasPerm = ctx.permissions.includes(permissionCode) ||
      ctx.permissions.includes(permissionCode.split(":")[0] + ":manage") || ctx.permissions.includes("*");
    if (!hasPerm) return { allowed: false, reason: "Missing permission: " + permissionCode };
    if (resourceScope && ctx.accessScopes.length > 0) {
      const hasScope = ctx.accessScopes.some(s => {
        if (s.expiresAt && s.expiresAt < new Date()) return false;
        if (resourceScope.siteId && s.siteId !== resourceScope.siteId) return false;
        if (resourceScope.processId && s.processId !== resourceScope.processId) return false;
        if (resourceScope.shiftId && s.shiftId !== resourceScope.shiftId) return false;
        return true;
      });
      if (!hasScope) return { allowed: false, reason: "Outside authorized scope" };
    }
    return { allowed: true, reason: "Authorized" };
  }

  async getEffectiveAccess(userId: string, companyId: string): Promise<EffectiveAccess | null> {
    if (!this.prisma.isConnected()) return null;
    const ctx = await this.buildAuthContext(userId, companyId);
    if (!ctx) return null;
    const siteIds = [...new Set(ctx.accessScopes.map(s => s.siteId).filter(Boolean))] as string[];
    const lobIds = [...new Set(ctx.accessScopes.map(s => s.lobId).filter(Boolean))] as string[];
    const processIds = [...new Set(ctx.accessScopes.map(s => s.processId).filter(Boolean))] as string[];
    const shiftIds = [...new Set(ctx.accessScopes.map(s => s.shiftId).filter(Boolean))] as string[];
    const dataClassification = ctx.roles.some(r => ["NAVIRA_PLATFORM_ADMINISTRATOR","NAVIRA_PLATFORM_AUDITOR"].includes(r)) ? "RESTRICTED"
      : ctx.roles.some(r => ["TRANSPORT_ADMIN","NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR"].includes(r)) ? "CONFIDENTIAL" : "INTERNAL";
    const dashboard = this.resolveDashboard(ctx.roles[0] || "EMPLOYEE");
    return {
      userId, companyId,
      roles: ctx.roles.map(r => ({ id: r, name: r })),
      permissions: ctx.permissions,
      effectiveScope: { siteIds, lobIds, processIds, shiftIds,
        hasCompanyWide: siteIds.length === 0 && ctx.roles.some(r => ["NAVIRA_PLATFORM_ADMINISTRATOR","TRANSPORT_ADMIN"].includes(r)) },
      explicitDenies: ctx.permissions.filter(p => p.startsWith("DENY:")),
      dashboard,
      canCreateLowerAdmin: ctx.permissions.includes("USER_ROLE_ASSIGN") || ctx.permissions.includes("admin:manage_subadmins"),
      dataClassification,
    };
  }

  async getVisibleEmployees(userId: string, companyId: string): Promise<any[]> {
    if (!this.prisma.isConnected()) return [];
    const ctx = await this.buildAuthContext(userId, companyId);
    if (!ctx) return [];
    const where: any = { companyId, status: "ACTIVE" };
    const isCompanyWide = ctx.roles.some(r => ["NAVIRA_PLATFORM_ADMINISTRATOR","TRANSPORT_ADMIN"].includes(r));
    if (!isCompanyWide && ctx.accessScopes.length > 0) {
      const siteIds = ctx.accessScopes.map(s => s.siteId).filter(Boolean);
      const processIds = ctx.accessScopes.map(s => s.processId).filter(Boolean);
      if (siteIds.length > 0 || processIds.length > 0) {
        where.OR = [];
        if (siteIds.length > 0) where.OR.push({ siteId: { in: siteIds } });
        if (processIds.length > 0) where.OR.push({ processId: { in: processIds } });
      }
    }
    return this.prisma.user.findMany({ where, select: { id: true, employeeId: true, email: true, name: true, phone: true, status: true, transportEligibility: true }, take: 200 });
  }

  private async buildAuthContext(userId: string, companyId: string): Promise<AuthorizationContext | null> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, status: "ACTIVE", memberships: { some: { companyId, status: "ACTIVE" } } },
      include: { roleAssignments: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } as any,
    }) as any;
    if (!user) return null;
    const roleNames: string[] = user.roleAssignments.map((ra: any) => ra.role.name);
    const permSet = new Set<string>();
    for (const ra of user.roleAssignments) {
      for (const rp of ra.role.permissions) {
        permSet.add(rp.permission.module + ":" + rp.permission.action);
        if (["read","create","update"].includes(rp.permission.action)) permSet.add(rp.permission.module + ":manage");
      }
    }
    const transportAssignments = await (this.prisma as any).transportAccessAssignment.findMany({ where: { companyId, userId, isActive: true }, include: { role: true } });
    for (const a of transportAssignments) {
      if (a.role.canManageVendors) permSet.add("vendors:manage");
      if (a.role.canManageDrivers) permSet.add("drivers:manage");
      if (a.role.canManageVehicles) permSet.add("vehicles:manage");
      if (a.role.canManageRoutes) permSet.add("routes:manage");
      if (a.role.canImportEmployees) permSet.add("employees:import");
      if (a.role.canManagePolicies) permSet.add("admin:manage_policies");
      if (a.role.canViewAnalytics) permSet.add("analytics:view");
      if (a.role.canManageSubAdmins) permSet.add("admin:manage_subadmins");
      roleNames.push(a.role.roleName);
    }
    const scopes = await this.prisma.accessScope.findMany({ where: { companyId, userId, isActive: true } });
    return { userId, companyId, roles: [...new Set(roleNames)], permissions: [...permSet],
      accessScopes: scopes.map(s => ({ siteId: s.siteId || undefined, lobId: s.lobId || undefined, processId: s.processId || undefined, shiftId: s.shiftId || undefined, expiresAt: s.expiresAt })) };
  }

  private resolveDashboard(role: string): string {
    const map: Record<string, string> = { NAVIRA_PLATFORM_ADMINISTRATOR: "platform", NAVIRA_OWNER: "platform", NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR: "finance", TRANSPORT_ADMIN: "transport", MANAGER: "management", EMPLOYEE: "employee", DRIVER: "driver", VENDOR_ADMIN: "vendor" };
    return map[role] || "employee";
  }
}

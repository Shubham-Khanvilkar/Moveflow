import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface PermissionResolution {
  key: string;
  enabled: boolean;
  source: string;
  sourceName: string;
  hierarchy: number;
  overridden: boolean;
}

export interface EffectivePermissions {
  userId: string;
  companyId: string;
  roles: string[];
  scope: {
    company: string;
    sites: { id: string; name: string; code: string }[];
    processes: { id: string; name: string; code: string }[];
    shifts: { id: string; name: string }[];
  };
  permissions: PermissionResolution[];
  overrideCount: number;
  inheritedCount: number;
}

export interface DenialExplanation {
  required: string;
  userRoles: string[];
  userScope: {
    sites: string[];
    processes: string[];
  };
  reason: string;
  suggestion: string;
  closestMatch?: string;
  closestSource?: string;
}

const HIERARCHY: Record<string, number> = {
  OVERRIDE: 0,
  PROCESS_SCOPE: 1,
  SITE_SCOPE: 2,
  COMPANY_SCOPE: 3,
  ROLE: 4,
};

@Injectable()
export class PermissionComposerService {
  private readonly logger = new Logger(PermissionComposerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve full effective permissions for a user with inheritance chain.
   */
  async compose(userId: string, companyId: string): Promise<EffectivePermissions> {
    // 1. Get all role assignments (TransportAccessAssignment + UserRoleAssignment)
    const [transportAssignments, userRoleAssignments, membership] = await Promise.all([
      this.prisma.transportAccessAssignment.findMany({
        where: { companyId, userId, isActive: true },
        include: { role: true },
      }),
      (this.prisma as any).userRoleAssignment.findMany({
        where: { userId, User: { companyId } },
        include: { role: { include: { permissions: { include: { permission: true } } } } },
      }),
      this.prisma.companyMembership.findFirst({
        where: { userId, companyId, status: 'ACTIVE' },
      }),
    ]);

    // 2. Filter expired transport assignments
    const now = new Date();
    const activeTransport = transportAssignments.filter(
      a => !a.expiresAt || a.expiresAt > now,
    );

    // 3. Collect roles
    const roles = new Set<string>();
    const roleNames: string[] = [];
    for (const a of activeTransport) {
      roles.add(a.role.roleName);
      roleNames.push(a.role.roleName);
    }
    for (const ura of userRoleAssignments) {
      const name = (ura as any).role?.name;
      if (name) {
        roles.add(name);
        roleNames.push(name);
      }
    }
    if (membership && !roles.has(membership.role)) {
      roles.add(membership.role);
      roleNames.push(membership.role);
    }

    // 4. Get access scopes
    const accessScopes = await this.prisma.accessScope.findMany({
      where: {
        userId,
        companyId,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      include: {
        site: { select: { id: true, siteName: true, siteCode: true } },
        process: { select: { id: true, processName: true, processCode: true } },
        shift: { select: { id: true, name: true } },
      },
    });

    // 5. Get overrides
    const overrides = await this.prisma.userAccessOverride.findMany({
      where: { userId, User: { companyId } },
    });
    const overrideMap = new Map<string, boolean>(overrides.map((o: any) => [o.permissionKey as string, o.isGranted as boolean]));

    // 6. Build permission chain: Role → Company Scope → Site Scope → Process Scope → Override
    const permissionMap = new Map<string, PermissionResolution>();

    // Step 1: Role defaults (hierarchy 4)
    for (const a of activeTransport) {
      const role = a.role;
      const basePerms: Array<{ key: string; sourceName: string }> = [];

      if (role.canManageVendors) basePerms.push({ key: 'vendors:manage', sourceName: role.roleName });
      if (role.canManageDrivers) basePerms.push({ key: 'drivers:manage', sourceName: role.roleName });
      if (role.canManageVehicles) basePerms.push({ key: 'vehicles:manage', sourceName: role.roleName });
      if (role.canManageRoutes) basePerms.push({ key: 'routes:manage', sourceName: role.roleName });
      if (role.canImportEmployees) basePerms.push({ key: 'employees:import', sourceName: role.roleName });
      if (role.canManagePolicies) basePerms.push({ key: 'admin:manage_policies', sourceName: role.roleName });
      if (role.canApproveBanRemoval) basePerms.push({ key: 'bans:approve_removal', sourceName: role.roleName });
      if (role.canApproveExpenses) basePerms.push({ key: 'finance:approve_expense', sourceName: role.roleName });
      if (role.canManageEmergency) basePerms.push({ key: 'safety:manage_emergency', sourceName: role.roleName });
      if (role.canManageShuttles) basePerms.push({ key: 'shuttles:manage', sourceName: role.roleName });
      if (role.canManageNodals) basePerms.push({ key: 'nodals:manage', sourceName: role.roleName });
      if (role.canViewAnalytics) basePerms.push({ key: 'analytics:view', sourceName: role.roleName });
      if (role.canManageSubAdmins) basePerms.push({ key: 'admin:manage_subadmins', sourceName: role.roleName });
      if (role.canManageAccessRoles) basePerms.push({ key: 'admin:manage_access_roles', sourceName: role.roleName });

      for (const p of basePerms) {
        if (!permissionMap.has(p.key)) {
          permissionMap.set(p.key, {
            key: p.key,
            enabled: true,
            source: 'ROLE',
            sourceName: p.sourceName,
            hierarchy: HIERARCHY.ROLE,
            overridden: false,
          });
        }
      }
    }

    // Step 2: Role permission config (hierarchy 4)
    const transportRoleIds = activeTransport.map(a => a.roleId);
    if (transportRoleIds.length > 0) {
      const rolePerms = await this.prisma.rolePermissionConfig.findMany({
        where: { roleId: { in: transportRoleIds }, enabled: true },
        include: { permission: true } as any,
      });
      for (const rp of rolePerms as any[]) {
        const key = `${rp.permission.module}:${rp.permission.action}`;
        if (!permissionMap.has(key)) {
          permissionMap.set(key, {
            key,
            enabled: true,
            source: 'ROLE',
            sourceName: rp.permission.module,
            hierarchy: HIERARCHY.ROLE,
            overridden: false,
          });
        }
      }
    }

    // Step 3: User role permissions (hierarchy 4)
    const userRoleIds = userRoleAssignments.map((ura: any) => ura.roleId);
    if (userRoleIds.length > 0) {
      const userRolePerms = await this.prisma.rolePermission.findMany({
        where: { roleId: { in: userRoleIds } },
        include: { permission: true } as any,
      });
      for (const rp of userRolePerms as any[]) {
        const key = `${rp.permission.module}:${rp.permission.action}`;
        if (!permissionMap.has(key)) {
          permissionMap.set(key, {
            key,
            enabled: true,
            source: 'ROLE',
            sourceName: rp.permission.module,
            hierarchy: HIERARCHY.ROLE,
            overridden: false,
          });
        }
      }
    }

    // Step 4: Individual overrides (hierarchy 0 — highest priority)
    for (const [key, granted] of overrideMap) {
      const existing = permissionMap.get(key);
      permissionMap.set(key, {
        key,
        enabled: granted,
        source: 'OVERRIDE',
        sourceName: 'Individual Override',
        hierarchy: HIERARCHY.OVERRIDE,
        overridden: existing !== undefined,
      });
    }

    const permissions = Array.from(permissionMap.values()).sort(
      (a, b) => a.hierarchy - b.hierarchy,
    );

    return {
      userId,
      companyId,
      roles: roleNames,
      scope: {
        company: membership?.role || 'UNKNOWN',
        sites: accessScopes
          .filter(s => s.siteId && (s as any).site)
          .map(s => ({
            id: s.siteId!,
            name: (s as any).site.siteName,
            code: (s as any).site.siteCode,
          })),
        processes: accessScopes
          .filter(s => s.processId && (s as any).process)
          .map(s => ({
            id: s.processId!,
            name: (s as any).process.processName,
            code: (s as any).process.processCode,
          })),
        shifts: accessScopes
          .filter(s => s.shiftId && (s as any).shift)
          .map(s => ({
            id: s.shiftId!,
            name: (s as any).shift.name,
          })),
      },
      permissions,
      overrideCount: overrides.length,
      inheritedCount: permissions.filter(p => p.source === 'ROLE').length,
    };
  }

  /**
   * Explain why a specific permission was denied for a user.
   */
  async explainDenial(
    userId: string,
    companyId: string,
    requiredPermission: string,
  ): Promise<DenialExplanation> {
    const effective = await this.compose(userId, companyId);

    const hasPermission = effective.permissions.some(
      p => p.key === requiredPermission && p.enabled,
    );

    if (hasPermission) {
      return {
        required: requiredPermission,
        userRoles: effective.roles,
        userScope: {
          sites: effective.scope.sites.map(s => s.code),
          processes: effective.scope.processes.map(p => p.code),
        },
        reason: 'Permission is granted',
        suggestion: 'No action needed — you have this permission',
      };
    }

    // Find the closest match (partial key match)
    const requiredModule = requiredPermission.split(':')[0];
    const closest = effective.permissions.find(
      p => p.key.startsWith(requiredModule),
    );

    const grantedRoles = effective.permissions
      .filter(p => p.key === requiredPermission && p.enabled)
      .map(p => p.sourceName);

    let reason: string;
    let suggestion: string;

    if (effective.permissions.length === 0) {
      reason = 'No permissions found for your roles';
      suggestion = 'Contact your administrator to assign a role with this permission';
    } else if (grantedRoles.length === 0) {
      reason = `Permission '${requiredPermission}' is not granted to any of your roles`;
      suggestion = `Your roles (${effective.roles.join(', ') || 'none'}) do not include this permission. Contact your administrator to request it.`;
    } else {
      reason = `Permission '${requiredPermission}' was revoked by an individual override`;
      suggestion = 'An administrator has explicitly disabled this permission for you. Contact them to re-enable it.';
    }

    return {
      required: requiredPermission,
      userRoles: effective.roles,
      userScope: {
        sites: effective.scope.sites.map(s => s.code),
        processes: effective.scope.processes.map(p => p.code),
      },
      reason,
      suggestion,
      closestMatch: closest?.key,
      closestSource: closest?.sourceName,
    };
  }

  /**
   * Simulate what permissions would look like with different scope parameters.
   * Used by admin permission simulator.
   */
  async simulate(
    userId: string,
    companyId: string,
    overrides: { permissionKey: string; isGranted: boolean }[],
  ): Promise<EffectivePermissions> {
    const base = await this.compose(userId, companyId);

    // Apply simulation overrides
    const simPermMap = new Map(
      base.permissions.map(p => [p.key, { ...p }]),
    );

    for (const o of overrides) {
      const existing = simPermMap.get(o.permissionKey);
      if (existing) {
        existing.enabled = o.isGranted;
        existing.source = 'SIMULATED_OVERRIDE';
        existing.sourceName = 'Admin Simulation';
        existing.overridden = true;
      } else {
        simPermMap.set(o.permissionKey, {
          key: o.permissionKey,
          enabled: o.isGranted,
          source: 'SIMULATED_OVERRIDE',
          sourceName: 'Admin Simulation',
          hierarchy: HIERARCHY.OVERRIDE,
          overridden: false,
        });
      }
    }

    return {
      ...base,
      permissions: Array.from(simPermMap.values()),
    };
  }
}

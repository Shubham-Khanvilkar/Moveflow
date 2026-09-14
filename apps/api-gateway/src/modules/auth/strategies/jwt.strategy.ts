import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma.service';

/**
 * Legacy-to-canonical role mapping
 * Normalizes legacy role names to canonical NAVIRA_ prefixed names
 */
const LEGACY_TO_CANONICAL: Record<string, string> = {
  'SUPER_ADMIN': 'NAVIRA_PLATFORM_ADMINISTRATOR',
  'MOVE_IN_ADMIN': 'NAVIRA_PLATFORM_ADMINISTRATOR',
  'FINANCE_TEAM': 'NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR',
  'PROJECT_MANAGER': 'NAVIRA_PLATFORM_OPERATIONS_MANAGER',
  'PROJECT_COORDINATOR': 'NAVIRA_CLIENT_IMPLEMENTATION_COORDINATOR',
  'PLATFORM_COMPLIANCE': 'NAVIRA_PLATFORM_COMPLIANCE_OFFICER',
  'SECURITY_ADMINISTRATOR': 'NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR',
  'SUPPORT_ENGINEER': 'NAVIRA_CUSTOMER_SUPPORT_ENGINEER',
  'PLATFORM_AUDITOR': 'NAVIRA_PLATFORM_AUDITOR',
  'SAAS_OWNER': 'NAVIRA_OWNER',
  'MOVEINSYNC_OWNER': 'NAVIRA_OWNER',
  'SUPERADMIN': 'NAVIRA_PLATFORM_ADMINISTRATOR',
  'FINANCE': 'NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR',
  'COMPLIANCE': 'NAVIRA_PLATFORM_COMPLIANCE_OFFICER',
  'SECURITY_ADMIN': 'NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR',
  'SUPPORT': 'NAVIRA_CUSTOMER_SUPPORT_ENGINEER',
  'AUDITOR': 'NAVIRA_PLATFORM_AUDITOR',
  'COORDINATOR': 'TRANSPORT_COORDINATOR',
  'SUB_ADMIN': 'TRANSPORT_SUB_ADMIN',
  'SENIOR_MGR': 'MANAGER',
  'ASST_MANAGER': 'MANAGER',
  'VENDOR': 'VENDOR_ADMIN',
  'ADMIN': 'TRANSPORT_ADMIN',
};

function normalizeRole(role: string): string {
  return LEGACY_TO_CANONICAL[role] || role;
}

function normalizeRoles(roles: string[]): string[] {
  const normalized = roles.map(r => normalizeRole(r));
  return [...new Set(normalized)];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const jwtSecret = configService.get<string>('SUPABASE_JWT_SECRET')
      || configService.get<string>('JWT_SECRET');

    if (!jwtSecret) {
      throw new Error('SUPABASE_JWT_SECRET or JWT_SECRET environment variable is required');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any) {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token: no subject');
    }

    const userId = payload.sub;
    const email = payload.email || payload.user_metadata?.email;

    if (!this.prisma.isConnected()) {
      throw new UnauthorizedException('Database unavailable — cannot validate user session');
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          memberships: {
            where: { status: 'ACTIVE' },
            include: { company: true },
          },
        },
      });

      if (!user || user.status !== 'ACTIVE') {
        throw new UnauthorizedException('User not found or inactive');
      }

      const membership = user.memberships[0];
      if (!membership) {
        throw new UnauthorizedException('No active company membership');
      }

      // Build roles and permissions from database
      const { roles, permissions } = await this.buildUserContext(userId, membership.companyId);

      // Vendor mapping: the vendor is the team leader of a directly-assigned
      // set of vehicles - no invites; the VendorUser link is the assignment.
      const vendorUser = await this.prisma.vendorUser.findFirst({
        where: { userId, isActive: true },
        select: { vendorId: true },
      });

      // Build access scopes from DB — scopes are per-company with expiry
      const accessScopes = await this.buildAccessScopes(userId, membership.companyId);

      // Apply UserAccessOverrides (permission ON/OFF toggles)
      const overrides = await this.prisma.userAccessOverride.findMany({
        where: { userId, User: { companyId: membership.companyId } },
      });
      const overrideMap = new Map(overrides.map(o => [o.permissionKey, o.isGranted]));
      for (const [key, granted] of overrideMap) {
        if (granted) {
          if (!permissions.includes(key)) permissions.push(key);
        } else {
          const idx = permissions.indexOf(key);
          if (idx >= 0) permissions.splice(idx, 1);
        }
      }

      return {
        sub: user.id,
        email: user.email,
        companyId: membership.companyId,
        companyCode: membership.company.code,
        role: normalizeRole(membership.role),
        name: user.name,
        roles: normalizeRoles(roles),
        permissions,
        accessScopes,
        vendorId: vendorUser?.vendorId || null,
        securityDomain: user.securityDomain || 'CUSTOMER_INTERNAL',
        identityType: user.identityType || 'CUSTOMER_USER',
        overrides: overrides.map(o => ({
          permissionKey: o.permissionKey,
          isGranted: o.isGranted,
          reason: o.reason,
        })),
      };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Unable to validate user authorization context');
    }
  }

  private async buildAccessScopes(userId: string, companyId: string) {
    const now = new Date();

    // Query AccessScope records — filter by company, active, and not expired
    const scopes = await this.prisma.accessScope.findMany({
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
        lob: { select: { id: true, lobName: true, lobCode: true } },
        process: { select: { id: true, processName: true, processCode: true } },
        shift: { select: { id: true, name: true } },
      },
    });

    return scopes.map(s => ({
      id: s.id,
      siteId: s.siteId,
      siteName: (s as any).site?.siteName,
      siteCode: (s as any).site?.siteCode,
      lobId: s.lobId,
      lobName: (s as any).lob?.lobName,
      lobCode: (s as any).lob?.lobCode,
      processId: s.processId,
      processName: (s as any).process?.processName,
      processCode: (s as any).process?.processCode,
      shiftId: s.shiftId,
      shiftName: (s as any).shift?.name,
      expiresAt: s.expiresAt,
    }));
  }

  private async buildUserContext(userId: string, companyId: string) {
    const assignments = await this.prisma.transportAccessAssignment.findMany({
      where: { companyId, userId, isActive: true },
      include: { role: true },
    });

    // Scope TransportAccessAssignment by companyId AND check expiry
    const now = new Date();
    const activeAssignments = assignments.filter(a => !a.expiresAt || a.expiresAt > now);
    const transportRoles = activeAssignments.map(a => a.role.roleName);

    // Scope UserRoleAssignment by companyId
    const userRoleAssignments = await this.prisma.userRoleAssignment.findMany({
      where: { userId, User: { companyId } } as any,
      include: { role: true } as any,
    });

    const userRoles = (userRoleAssignments as any[]).map(ura => ura.role?.name).filter(Boolean);

    const allRoles = [...transportRoles, ...userRoles];
    const uniqueRoles = [...new Set(allRoles)];

    const membership = await this.prisma.companyMembership.findFirst({
      where: { userId, companyId, status: 'ACTIVE' },
    });
    if (membership && !uniqueRoles.includes(membership.role)) {
      uniqueRoles.push(membership.role);
    }

    const roleIds = activeAssignments.map(a => a.roleId);
    const userRoleIds = userRoleAssignments.map((ura: any) => ura.roleId);

    const rolePermissions = roleIds.length > 0
      ? await this.prisma.rolePermissionConfig.findMany({
          where: { roleId: { in: roleIds }, enabled: true },
          include: { permission: true } as any,
        })
      : [];

    const permissionSet = new Set<string>();
    for (const rp of rolePermissions as any[]) {
      permissionSet.add(`${rp.permission.module}:${rp.permission.action}`);
    }

    const globalRolePerms = userRoleIds.length > 0
      ? await this.prisma.rolePermission.findMany({
          where: { roleId: { in: userRoleIds } },
          include: { permission: true } as any,
        })
      : [];
    for (const rp of globalRolePerms as any[]) {
      permissionSet.add(`${rp.permission.module}:${rp.permission.action}`);
    }

    for (const a of activeAssignments) {
      if (a.role.canManageVendors) permissionSet.add('vendors:manage');
      if (a.role.canManageDrivers) permissionSet.add('drivers:manage');
      if (a.role.canManageVehicles) permissionSet.add('vehicles:manage');
      if (a.role.canManageRoutes) permissionSet.add('routes:manage');
      if (a.role.canImportEmployees) permissionSet.add('employees:import');
      if (a.role.canManagePolicies) permissionSet.add('admin:manage_policies');
      if (a.role.canApproveBanRemoval) permissionSet.add('bans:approve_removal');
      if (a.role.canApproveExpenses) permissionSet.add('finance:approve_expense');
      if (a.role.canManageEmergency) permissionSet.add('safety:manage_emergency');
      if (a.role.canManageShuttles) permissionSet.add('shuttles:manage');
      if (a.role.canManageNodals) permissionSet.add('nodals:manage');
      if (a.role.canViewAnalytics) permissionSet.add('analytics:view');
      if (a.role.canManageSubAdmins) permissionSet.add('admin:manage_subadmins');
      if (a.role.canManageAccessRoles) permissionSet.add('admin:manage_access_roles');
    }

    return { roles: uniqueRoles, permissions: [...permissionSet] };
  }
}

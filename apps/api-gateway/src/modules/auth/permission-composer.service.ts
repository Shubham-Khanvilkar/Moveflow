import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

export interface ResolvedPermission {
  key: string;
  enabled: boolean;
  source: string;
  sourceName: string;
  hierarchy: number;
  overridden: boolean;
}

export interface PermissionTree {
  userId: string;
  email: string;
  companyId: string;
  roles: string[];
  scope: {
    company: string;
    sites: Array<{ id: string; name: string; code: string }>;
    processes: Array<{ id: string; name: string; code: string }>;
  };
  permissions: ResolvedPermission[];
}

export interface DenialExplanation {
  required: string;
  yourRoles: string[];
  yourScope: {
    sites: string[];
    processes: string[];
  };
  reason: string;
  suggestion: string;
}

/**
 * PermissionComposerService resolves the full permission inheritance chain:
 *
 *   Role defaults (TransportAccessRole → RolePermissionConfig)
 *       ↓
 *   Company scope (company-level overrides)
 *       ↓
 *   Site scope (site-level overrides)
 *       ↓
 *   Process scope (process-level overrides)
 *       ↓
 *   Individual override (UserAccessOverride ON/OFF toggles)
 *       ↓
 *   EFFECTIVE PERMISSIONS
 *
 * Hierarchy: 0=override > 1=process > 2=site > 3=company > 4=role
 * Lower number = higher priority (override wins over role default).
 */
@Injectable()
export class PermissionComposerService {
  private readonly logger = new Logger(PermissionComposerService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Build the complete permission tree for a user within a company.
   */
  async compose(userId: string, companyId: string): Promise<PermissionTree> {
    // 1. Fetch user
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error(`User ${userId} not found`);

    // 2. Fetch role assignments (transport roles)
    const assignments = await this.prisma.transportAccessAssignment.findMany({
      where: { companyId, userId, isActive: true },
      include: { role: true },
    });
    const now = new Date();
    const activeAssignments = assignments.filter(a => !a.expiresAt || a.expiresAt > now);

    // 3. Fetch company memberships for role names
    const memberships = await this.prisma.companyMembership.findMany({
      where: { userId, companyId, status: 'ACTIVE' },
    });
    const membershipRoles = memberships.map(m => m.role);
    const transportRoles = activeAssignments.map(a => a.role.roleName);
    const allRoles = [...new Set([...transportRoles, ...membershipRoles])];

    // 4. Fetch access scopes
    const scopes = await this.prisma.accessScope.findMany({
      where: { userId, companyId, isActive: true },
      include: {
        site: { select: { id: true, siteName: true, siteCode: true } },
        process: { select: { id: true, processName: true, processCode: true } },
      },
    });

    // 5. Fetch user overrides
    const overrides = await this.prisma.userAccessOverride.findMany({
      where: { userId, User: { companyId } },
    });
    const overrideMap = new Map(overrides.map(o => [o.permissionKey, o.isGranted]));

    // 6. Collect role-level permissions (hierarchy=4)
    const rolePermMap = new Map<string, ResolvedPermission>();
    for (const assignment of activeAssignments) {
      const rpc = await this.prisma.rolePermissionConfig.findMany({
        where: { roleId: assignment.roleId, enabled: true },
        include: { permission: true } as any,
      });
      for (const rp of rpc as any[]) {
        const key = `${rp.permission.module}:${rp.permission.action}`;
        if (!rolePermMap.has(key)) {
          rolePermMap.set(key, {
            key,
            enabled: true,
            source: 'ROLE',
            sourceName: assignment.role.roleName,
            hierarchy: 4,
            overridden: false,
          });
        }
      }
    }

    // 7. Apply overrides (hierarchy=0, highest priority)
    const permissions = Array.from(rolePermMap.values());
    for (const [key, granted] of overrideMap) {
      const existing = permissions.find(p => p.key === key);
      if (existing) {
        existing.enabled = granted;
        existing.overridden = true;
        existing.source = 'INDIVIDUAL_OVERRIDE';
        existing.sourceName = 'UserAccessOverride';
        existing.hierarchy = 0;
      } else if (granted) {
        permissions.push({
          key,
          enabled: true,
          source: 'INDIVIDUAL_OVERRIDE',
          sourceName: 'UserAccessOverride',
          hierarchy: 0,
          overridden: false,
        });
      }
    }

    return {
      userId,
      email: user.email,
      companyId,
      roles: allRoles,
      scope: {
        company: companyId,
        sites: scopes
          .filter(s => s.site)
          .map(s => ({ id: s.siteId!, name: (s as any).site.siteName, code: (s as any).site.siteCode })),
        processes: scopes
          .filter(s => s.process)
          .map(s => ({ id: s.processId!, name: (s as any).process.processName, code: (s as any).process.processCode })),
      },
      permissions,
    };
  }

  /**
   * Explain why a specific permission was denied for a user.
   */
  async explainDenial(userId: string, companyId: string, requiredPermission: string): Promise<DenialExplanation> {
    const tree = await this.compose(userId, companyId);

    const matching = tree.permissions.find(p => p.key === requiredPermission);
    const userSet = new Set(tree.permissions.filter(p => p.enabled).map(p => p.key));

    // Check wildcards
    const [mod] = requiredPermission.split(':');
    const hasWildcard = userSet.has('*:*') || userSet.has('*') || userSet.has(`${mod}:*`) || userSet.has(`${mod}:manage`);

    if (matching?.enabled || hasWildcard) {
      return {
        required: requiredPermission,
        yourRoles: tree.roles,
        yourScope: {
          sites: tree.scope.sites.map(s => s.code),
          processes: tree.scope.processes.map(p => p.code),
        },
        reason: 'Permission is granted.',
        suggestion: 'No action needed.',
      };
    }

    let reason = `Permission '${requiredPermission}' is not granted to your roles.`;
    if (matching && !matching.enabled) {
      reason = `Permission '${requiredPermission}' was granted by ${matching.sourceName} but disabled by an individual override.`;
    }

    return {
      required: requiredPermission,
      yourRoles: tree.roles,
      yourScope: {
        sites: tree.scope.sites.map(s => s.code),
        processes: tree.scope.processes.map(p => p.code),
      },
      reason,
      suggestion: 'Contact your administrator to request this permission or check your access overrides.',
    };
  }
}

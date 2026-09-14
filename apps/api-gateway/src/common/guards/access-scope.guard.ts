/**
 * PHASE 22B.1: AccessScopeGuard
 *
 * Gates access to tenant-scoped resources (sites, LOBs, processes, shifts).
 *
 * Rules:
 * - NAVIRA_INTERNAL users: must have explicit platform context (isPlatformAdmin or audited platform operation)
 * - CUSTOMER_INTERNAL users: scoped to their company
 * - VENDOR_EXTERNAL, DRIVER_EXTERNAL, GUARD_EXTERNAL: scoped to their vendor/company/duty
 * - Deny by default when no scopes assigned
 *
 * The guard NO LONGER accepts legacy role aliases (SUPER_ADMIN, FINANCE, SUPPORT, etc.)
 * as platform admin bypasses. Those must be migrated to canonical NAVIRA roles.
 */

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../common/prisma.service';

export const ACCESSSCOPE_KEY = 'accessScopeRequired';

export interface AccessScopeRequirement {
  requireSite?: boolean;
  requireLob?: boolean;
  requireProcess?: boolean;
  requireShift?: boolean;
}

@Injectable()
export class AccessScopeGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<AccessScopeRequirement>(
      ACCESSSCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requirement) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No authenticated user');
    }

    // Check security domain - NAVIRA internal users need platform context
    const securityDomain = user.securityDomain || 'CUSTOMER_INTERNAL';

    // NAVIRA internal users: require platform admin or audited operation
    if (securityDomain === 'NAVIRA_INTERNAL') {
      const isPlatformAdmin = user.isPlatformAdmin || false;
      const hasAuditedPlatformContext = request?.context?.isAuditedPlatformContext || false;
      if (!isPlatformAdmin && !hasAuditedPlatformContext) {
        throw new ForbiddenException('NAVIRA internal users require platform admin context or audited operation');
      }
    }

    // Customer, vendor, driver, guard users must have companyId
    if (!user.companyId && securityDomain !== 'NAVIRA_INTERNAL') {
      throw new ForbiddenException('No tenant context - companyId required');
    }

    if (!requirement) return true;

    // NAVIRA_OWNER has all access
    if (user.role === 'NAVIRA_OWNER' || (user.roles || []).includes('NAVIRA_OWNER')) {
      return true;
    }

    const tenant = request.tenant || {};
    const userScopes = tenant.accessScopes || [];

    // If JWT strategy returned empty scopes, try querying DB as fallback
    if (userScopes.length === 0 && this.prisma.isConnected()) {
      try {
        const dbScopes = await this.prisma.accessScope.findMany({
          where: {
            userId: user.sub,
            companyId: user.companyId,
            isActive: true,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
          include: {
            site: { select: { id: true, siteName: true, siteCode: true } },
            lob: { select: { id: true, lobName: true, lobCode: true } },
            process: { select: { id: true, processName: true, processCode: true } },
            shift: { select: { id: true, name: true } },
          },
        });

        if (dbScopes.length > 0) {
          // Cache on request.tenant for downstream use
          tenant.accessScopes = dbScopes;
        }
      } catch {
        throw new ForbiddenException('Unable to resolve access scopes');
      }
    }

    // Re-read after potential DB fallback
    const resolvedScopes = tenant.accessScopes || [];

    // SECURITY FIX: Deny by default when no scopes are assigned
    if (resolvedScopes.length === 0) {
      // Only allow if the requirement has no mandatory scopes
      const hasAnyRequirement = requirement.requireSite || requirement.requireLob || requirement.requireProcess || requirement.requireShift;
      if (hasAnyRequirement) {
        throw new ForbiddenException('Access denied: no access scopes assigned');
      }
    }

    const targetSiteId = request.params?.siteId || request.body?.siteId || request.query?.siteId;
    const targetLobId = request.params?.lobId || request.body?.lobId || request.query?.lobId;
    const targetProcessId = request.params?.processId || request.body?.processId || request.query?.processId;
    const targetShiftId = request.params?.shiftId || request.body?.shiftId || request.query?.shiftId;

    if (requirement.requireSite && targetSiteId) {
      const hasScope = resolvedScopes.some((s: any) => s.siteId === targetSiteId);
      if (!hasScope) throw new ForbiddenException('Access denied: not authorized for this site');
    }

    if (requirement.requireLob && targetLobId) {
      const hasScope = resolvedScopes.some((s: any) => s.lobId === targetLobId);
      if (!hasScope) throw new ForbiddenException('Access denied: not authorized for this LOB');
    }

    if (requirement.requireProcess && targetProcessId) {
      const hasScope = resolvedScopes.some((s: any) => s.processId === targetProcessId);
      if (!hasScope) throw new ForbiddenException('Access denied: not authorized for this process');
    }

    if (requirement.requireShift && targetShiftId) {
      const hasScope = resolvedScopes.some((s: any) => s.shiftId === targetShiftId);
      if (!hasScope) throw new ForbiddenException('Access denied: not authorized for this shift');
    }

    return true;
  }
}
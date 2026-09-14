import { Injectable, CanActivate, ExecutionContext, Logger, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../common/prisma.service';
import { PolicyScopeResolverService } from './policy-scope-resolver.service';

/**
 * PHASE 2.20: AccessScopeGuard
 *
 * Enforces that a user's AccessScope covers the site/process/shift
 * they're trying to access or modify.
 *
 * Without this guard, the whole PolicyScope model (Section 31)
 * and tenant/site isolation are unenforced — a bug away from
 * cross-company or cross-site data leakage.
 *
 * Usage: @UseGuards(AccessScopeGuard) on controllers/endpoints.
 */

// Scope hierarchy for comparison
const SCOPE_HIERARCHY: Record<string, number> = {
  PLATFORM: 5,
  COMPANY: 4,
  SITE: 3,
  PROCESS: 2,
  SHIFT: 1,
};

@Injectable()
export class AccessScopeGuard implements CanActivate {
  private readonly logger = new Logger(AccessScopeGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly policyResolver: PolicyScopeResolverService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No authenticated user');
    }

    // Skip for superadmin platform roles
    if (user.isPlatformAdmin) {
      return true;
    }

    const companyId = user.companyId;
    if (!companyId) {
      throw new ForbiddenException('No company context');
    }

    // Get the user's access scopes
    const accessScopes = await this.getUserAccessScopes(user.id, companyId);
    if (!accessScopes || accessScopes.length === 0) {
      this.logger.warn(`User ${user.id} has no access scopes in company ${companyId}`);
      throw new ForbiddenException('No access scopes assigned');
    }

    // Extract the target scope from the request
    const targetScope = this.extractTargetScope(request);

    // If no specific scope in request, user is accessing their own company data
    if (!targetScope.siteId && !targetScope.processId && !targetScope.shiftId) {
      return true; // Company-level access is covered by TenantGuard
    }

    // Check if any of the user's access scopes cover the target
    const hasAccess = this.checkScopeCoverage(accessScopes, targetScope);

    if (!hasAccess) {
      // Log scope-violation attempt (Section 2.22)
      await this.policyResolver.logScopeViolation(
        companyId,
        user.id,
        JSON.stringify(targetScope),
        'N/A',
        'N/A',
        `User attempted to access scope outside their assignment: ${JSON.stringify(targetScope)}`,
      );

      this.logger.warn(
        `Access denied: User ${user.id} attempted to access scope ${JSON.stringify(targetScope)} without authorization`,
      );

      throw new ForbiddenException('Access denied: scope not authorized');
    }

    return true;
  }

  /**
   * Get all active access scopes for a user.
   */
  private async getUserAccessScopes(userId: string, companyId: string): Promise<any[]> {
    try {
      return await (this.prisma as any).transportAccessAssignment.findMany({
        where: {
          companyId,
          userId,
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        include: {
          role: true,
        },
      });
    } catch (error: any) {
      this.logger.error(`Failed to fetch access scopes: ${error?.message}`);
      return [];
    }
  }

  /**
   * Extract the target scope from the request.
   * Checks body, query, and params for scope identifiers.
   */
  private extractTargetScope(request: any): {
    siteId?: string;
    processId?: string;
    shiftId?: string;
  } {
    const body = request.body || {};
    const query = request.query || {};
    const params = request.params || {};

    return {
      siteId: body.siteId || query.siteId || params.siteId || undefined,
      processId: body.processId || query.processId || params.processId || undefined,
      shiftId: body.shiftId || query.shiftId || params.shiftId || undefined,
    };
  }

  /**
   * Check if any user access scope covers the target scope.
   *
   * Rule: A user with SITE-level access can access anything within that site.
   * A user with PROCESS-level access can only access that specific process.
   * A user with SHIFT-level access can only access that specific shift.
   */
  private checkScopeCoverage(
    userScopes: any[],
    target: { siteId?: string; processId?: string; shiftId?: string },
  ): boolean {
    return userScopes.some((scope) => {
      const userScopeLevel = scope.maxScopeLevel || scope.scopeLevel || 'COMPANY';

      // If user has COMPANY-level or higher, they can access anything in the company
      if (SCOPE_HIERARCHY[userScopeLevel] >= SCOPE_HIERARCHY['COMPANY']) {
        return true;
      }

      // SITE-level: check siteId matches
      if (userScopeLevel === 'SITE') {
        if (!scope.siteId) return true; // No specific site = all sites
        if (target.siteId && scope.siteId !== target.siteId) return false;
        return true;
      }

      // PROCESS-level: check siteId + processId match
      if (userScopeLevel === 'PROCESS') {
        if (target.siteId && scope.siteId && scope.siteId !== target.siteId) return false;
        if (target.processId && scope.processId && scope.processId !== target.processId) return false;
        return true;
      }

      // SHIFT-level: check all three match
      if (userScopeLevel === 'SHIFT') {
        if (target.siteId && scope.siteId && scope.siteId !== target.siteId) return false;
        if (target.processId && scope.processId && scope.processId !== target.processId) return false;
        if (target.shiftId && scope.shiftId && scope.shiftId !== target.shiftId) return false;
        return true;
      }

      return false;
    });
  }

  /**
   * Check if a user can set policy at a given scope level (Section 2.21).
   * A user's maxScopeLevel caps which level they can write policy at.
   */
  async canSetPolicyAtLevel(
    userId: string,
    companyId: string,
    requestedLevel: string,
  ): Promise<boolean> {
    const scopes = await this.getUserAccessScopes(userId, companyId);
    if (!scopes.length) return false;

    return scopes.some((scope) => {
      const maxLevel = scope.maxScopeLevel || 'COMPANY';
      // User can set policy at their level or any more-specific level
      return SCOPE_HIERARCHY[maxLevel] >= SCOPE_HIERARCHY[requestedLevel];
    });
  }
}

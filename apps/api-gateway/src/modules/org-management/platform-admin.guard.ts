import { Injectable, CanActivate, ExecutionContext, Logger, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../common/prisma.service';

/**
 * PHASE 22B.1: PlatformAdminGuard
 *
 * Gates access to cross-tenant platform-ops endpoints.
 * Only users with a PlatformRoleAssignment with a canonical NAVIRA role can access.
 *
 * Canonical internal roles: NAVIRA_OWNER, NAVIRA_PLATFORM_ADMINISTRATOR,
 * NAVIRA_PLATFORM_OPERATIONS_MANAGER, NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR,
 * NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR, NAVIRA_PLATFORM_COMPLIANCE_OFFICER,
 * NAVIRA_PLATFORM_AUDITOR, NAVIRA_INTEGRATION_API_ADMINISTRATOR,
 * NAVIRA_CLIENT_SUCCESS_MANAGER, NAVIRA_CLIENT_IMPLEMENTATION_COORDINATOR,
 * NAVIRA_CUSTOMER_SUPPORT_ENGINEER
 *
 * This guard is deliberately separate from AccessScopeGuard
 * because internal staff have no tenant scope — they operate
 * across (or in service of) many companies.
 */

/**
 * Which canonical internal roles are allowed to access platform admin endpoints
 */
const PLATFORM_ADMIN_ROLES = [
  'NAVIRA_OWNER',
  'NAVIRA_PLATFORM_ADMINISTRATOR',
  'NAVIRA_PLATFORM_OPERATIONS_MANAGER',
  'NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR',
  'NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR',
  'NAVIRA_PLATFORM_COMPLIANCE_OFFICER',
  'NAVIRA_PLATFORM_AUDITOR',
  'NAVIRA_INTEGRATION_API_ADMINISTRATOR',
  'NAVIRA_CLIENT_SUCCESS_MANAGER',
  'NAVIRA_CLIENT_IMPLEMENTATION_COORDINATOR',
  'NAVIRA_CUSTOMER_SUPPORT_ENGINEER',
];

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  private readonly logger = new Logger(PlatformAdminGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No authenticated user');
    }

    // Check for required roles via metadata
    const requiredRoles = this.reflector.get<string[]>('platformRoles', context.getHandler());

    // If no specific roles required, any canonical internal role is fine
    const allowedRoles = requiredRoles || PLATFORM_ADMIN_ROLES;

    // Get user's platform role assignments
    const platformRole = await this.getUserPlatformRole(user.id);

    if (!platformRole) {
      this.logger.warn(`User ${user.id} has no platform role assignment`);
      throw new ForbiddenException('No platform role assigned');
    }

    // Get the security domain from the user to ensure they're a NAVIRA internal user
    const securityDomain = user.securityDomain || 'CUSTOMER_INTERNAL';
    if (securityDomain !== 'NAVIRA_INTERNAL') {
      this.logger.warn(
        `User ${user.id} has securityDomain ${securityDomain} but platform admin requires NAVIRA_INTERNAL`,
      );
      throw new ForbiddenException('Platform admin access requires NAVIRA_INTERNAL security domain');
    }

    if (!allowedRoles.includes(platformRole.role)) {
      this.logger.warn(
        `User ${user.id} has role ${platformRole.role} but needs one of: ${allowedRoles.join(', ')}`,
      );
      throw new ForbiddenException('Insufficient platform role');
    }

    // For NAVIRA_PLATFORM_OPERATIONS_MANAGER and below: check if they have access to the requested company
    if (['NAVIRA_PLATFORM_OPERATIONS_MANAGER', 'NAVIRA_CLIENT_IMPLEMENTATION_COORDINATOR', 'NAVIRA_CLIENT_SUCCESS_MANAGER'].includes(platformRole.role)) {
      const requestedCompanyId = request.params?.companyId || request.body?.companyId || request.query?.companyId;
      if (requestedCompanyId) {
        // Check company membership
        const membership = await this.prisma.companyMembership.findFirst({
          where: { userId: user.id, companyId: requestedCompanyId, status: 'ACTIVE' },
        });
        if (!membership) {
          throw new ForbiddenException('Not assigned to this company');
        }
      }
    }

    // Attach platform role to request for downstream use
    request.platformRole = platformRole.role;
    request.isPlatformAdmin = true;

    return true;
  }

  private async getUserPlatformRole(userId: string): Promise<any> {
    try {
      return await this.prisma.platformRoleAssignment.findFirst({
        where: {
          userId,
          isActive: true,
        },
        orderBy: { assignedAt: 'desc' },
      });
    } catch (error: any) {
      this.logger.error(`Failed to fetch platform role: ${error?.message}`);
      return null;
    }
  }
}

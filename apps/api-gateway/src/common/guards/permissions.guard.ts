import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, PermissionRequirement } from '../decorators/permissions.decorator';

export interface DenialExplanation {
  required: string;
  yourRoles: string[];
  yourPermissions: string[];
  reason: string;
  suggestion: string;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<PermissionRequirement[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No user context');
    }

    // Owner-tier bypass: these roles have full functional authority
    const OWNER_TIERS = ['NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR'];
    const userRoles: string[] = user.roles || (user.role ? [user.role] : []);
    if (userRoles.some((r: string) => OWNER_TIERS.includes(r))) {
      return true;
    }

    const userPermissions: string[] = user.permissions || [];
    const norm = (s: string) => s.trim().toLowerCase();
    const userSet = new Set(userPermissions.map(norm));

    for (const required of requiredPermissions) {
      const mod = norm(required.module);
      const act = norm(required.action);
      const hasPermission =
        userSet.has(`${mod}:${act}`) ||          // module:action
        userSet.has(`${mod}:manage`) ||          // manage implies all actions
        userSet.has('*:*') || userSet.has('*') || // global wildcard
        userSet.has(`${mod}:*`) ||               // module wildcard
        userSet.has(`${mod}_manage`);            // legacy "manage_" style keys

      if (!hasPermission) {
        // Build denial explanation
        const denial = this.buildDenialExplanation(
          `${mod}:${act}`,
          userRoles,
          userPermissions,
        );

        throw new ForbiddenException({
          error: 'Forbidden',
          message: `Insufficient permissions. Required: ${mod}:${act}.`,
          denial,
        });
      }
    }

    return true;
  }

  /**
   * Build a structured denial explanation for the frontend.
   * Shows exactly why access was denied and what's missing.
   */
  private buildDenialExplanation(
    requiredPermission: string,
    userRoles: string[],
    userPermissions: string[],
  ): DenialExplanation {
    const [mod, act] = requiredPermission.split(':');

    // Check if the permission exists but is disabled
    const hasModuleWildcard = userPermissions.some(p => {
      const [m] = p.split(':');
      return m === mod;
    });

    let reason: string;
    let suggestion: string;

    if (hasModuleWildcard) {
      reason = `You have some permissions in the '${mod}' module, but '${act}' is not granted.`;
      suggestion = `Contact your administrator to request the '${requiredPermission}' permission.`;
    } else {
      reason = `Permission '${requiredPermission}' is not granted to your roles (${userRoles.join(', ') || 'none'}).`;
      suggestion = `Contact your administrator to request this permission or check your role assignments.`;
    }

    return {
      required: requiredPermission,
      yourRoles: userRoles,
      yourPermissions: userPermissions.slice(0, 10), // Limit for readability
      reason,
      suggestion,
    };
  }
}

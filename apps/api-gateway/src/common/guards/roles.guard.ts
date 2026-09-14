import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { normalizeRole } from '../services/role-mapping';

export const ROLES_KEY = 'roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No user context');
    }

    const userRole = user.role;
    const userRoles: string[] = user.roles && user.roles.length > 0
      ? user.roles
      : userRole
      ? [userRole]
      : [];

    // Normalize both required and user roles so legacy decorator values work
    const normalizedRequired = requiredRoles.map(r => normalizeRole(r));
    const normalizedUser = userRoles.map(r => normalizeRole(r));

    if (normalizedUser.length > 0 && normalizedUser.some((r: string) => normalizedRequired.includes(r))) {
      return true;
    }

    throw new ForbiddenException(
      `Insufficient permissions. Required: ${requiredRoles.join(', ')}. You have: ${userRoles.length > 0 ? userRoles.join(', ') : 'none'}`,
    );
  }
}

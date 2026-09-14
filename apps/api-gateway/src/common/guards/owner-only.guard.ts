import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const OWNER_ONLY_KEY = 'ownerOnly';

@Injectable()
export class OwnerOnlyGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isOwnerOnly = this.reflector.getAllAndOverride<boolean>(OWNER_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isOwnerOnly) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No user context');
    }

    const userRole: string | undefined = user.role;
    const userRoles: string[] = user.roles && user.roles.length > 0
      ? user.roles
      : userRole
      ? [userRole]
      : [];

    if (userRoles.includes('NAVIRA_OWNER')) {
      return true;
    }

    throw new ForbiddenException(
      `Owner-only resource. Required: NAVIRA_OWNER. You have: ${userRoles.length > 0 ? userRoles.join(', ') : 'none'}`,
    );
  }
}

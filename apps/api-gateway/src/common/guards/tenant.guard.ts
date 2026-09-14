import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.companyId) {
      throw new ForbiddenException('No tenant context found');
    }

    request.tenant = {
      companyId: user.companyId,
      companyCode: user.companyCode,
      role: user.role,
      userId: user.sub,
      roles: user.roles || [],
      permissions: user.permissions || [],
      accessScopes: user.accessScopes || [],
    };

    return true;
  }
}

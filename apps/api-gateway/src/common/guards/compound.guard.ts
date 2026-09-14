import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { TenantGuard } from './tenant.guard';
import { RolesGuard } from './roles.guard';
import { PermissionsGuard } from './permissions.guard';
import { AccessScopeGuard } from './access-scope.guard';
import { PrismaService } from '../prisma.service';

/**
 * Compound guard that chains: JWT → Tenant → Roles → Permissions → AccessScope
 * Use @Auth() decorator for the simplest possible guard application.
 */
@Injectable()
export class CompoundGuard implements CanActivate {
  private jwtGuard: JwtAuthGuard;
  private tenantGuard: TenantGuard;
  private rolesGuard: RolesGuard;
  private permissionsGuard: PermissionsGuard;
  private accessScopeGuard: AccessScopeGuard;

  constructor(private reflector: Reflector, private prisma: PrismaService) {
    this.jwtGuard = new JwtAuthGuard();
    this.tenantGuard = new TenantGuard(reflector);
    this.rolesGuard = new RolesGuard(reflector);
    this.permissionsGuard = new PermissionsGuard(reflector);
    this.accessScopeGuard = new AccessScopeGuard(reflector, prisma);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. JWT Authentication
    const jwtValid = await this.jwtGuard.canActivate(context);
    if (!jwtValid) throw new UnauthorizedException('Invalid or missing token');

    // 2. Tenant context
    const tenantValid = this.tenantGuard.canActivate(context);
    if (!tenantValid) throw new ForbiddenException('No tenant context');

    // 3. Role check
    const rolesValid = this.rolesGuard.canActivate(context);
    if (!rolesValid) throw new ForbiddenException('Insufficient role');

    // 4. Permission check
    const permsValid = this.permissionsGuard.canActivate(context);
    if (!permsValid) throw new ForbiddenException('Insufficient permissions');

    // 5. Access scope check (only if required)
    const scopeRequired = this.reflector.getAllAndOverride('accessScopeRequired', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (scopeRequired) {
      const scopeValid = await this.accessScopeGuard.canActivate(context);
      if (!scopeValid) throw new ForbiddenException('Access denied: scope restriction');
    }

    return true;
  }
}

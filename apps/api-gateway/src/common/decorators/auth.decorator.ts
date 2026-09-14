import { applyDecorators, UseGuards, SetMetadata } from '@nestjs/common';
import { CompoundGuard } from '../guards/compound.guard';
import { RolesGuard, ROLES_KEY } from '../guards/roles.guard';
import { RequirePermissions, PermissionRequirement } from './permissions.decorator';
import { RequireAccessScope, AccessScopeRequirement } from './access-scope.decorator';

/**
 * All-in-one auth decorator. Applies JWT + Tenant + Roles + Permissions + AccessScope guards.
 *
 * Usage:
 *   @Auth()                                          // Any authenticated user
 *   @Auth({ roles: ['TRANSPORT_ADMIN'] })            // Role check
 *   @Auth({ permissions: [{ module: 'vehicles', action: 'manage' }] })  // Permission check
 *   @Auth({ scope: { requireSite: true } })          // Access scope check
 *   @Auth({                                          // All checks
 *     roles: ['TRANSPORT_ADMIN'],
 *     permissions: [{ module: 'vehicles', action: 'manage' }],
 *     scope: { requireSite: true }
 *   })
 */
export function Auth(options?: {
  roles?: string[];
  permissions?: PermissionRequirement[];
  scope?: AccessScopeRequirement;
}) {
  const decorators: PropertyDecorator[] = [];

  if (options?.roles?.length) {
    decorators.push(SetMetadata(ROLES_KEY, options.roles));
  }

  if (options?.permissions?.length) {
    decorators.push(RequirePermissions(...options.permissions));
  }

  if (options?.scope) {
    decorators.push(RequireAccessScope(options.scope));
  }

  return applyDecorators(UseGuards(CompoundGuard), ...decorators);
}

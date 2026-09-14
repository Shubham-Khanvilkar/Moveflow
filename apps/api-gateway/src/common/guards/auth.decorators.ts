import { SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AccessScopeGuard } from './access-scope.guard';
import { PERMISSIONS_KEY, REQUIRED_SCOPES_KEY, PermissionRequirement, PermissionAction, ScopeRequirement } from '../decorators/permissions.decorator';

export function RequirePermission(module: string, action: PermissionAction) {
  return SetMetadata(PERMISSIONS_KEY, [{ module, action }]);
}

export function RequirePermissions(...perms: PermissionRequirement[]) {
  return SetMetadata(PERMISSIONS_KEY, perms);
}

export function RequireScope(scope: ScopeRequirement) {
  return SetMetadata(REQUIRED_SCOPES_KEY, scope);
}

export function Auth(...perms: PermissionRequirement[]) {
  if (perms.length === 0) {
    return applyDecorators(UseGuards(JwtAuthGuard, AccessScopeGuard));
  }
  return applyDecorators(SetMetadata(PERMISSIONS_KEY, perms), UseGuards(JwtAuthGuard, AccessScopeGuard));
}

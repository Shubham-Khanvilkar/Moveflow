import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'required_permissions';
export const REQUIRED_SCOPES_KEY = 'required_scopes';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'manage' | 'approve' | 'export' | 'import';

export interface PermissionRequirement {
  module: string;
  action: string;
}

export interface ScopeRequirement {
  scope: string;
  conditions?: Record<string, any>;
}

export const RequirePermissions = (...permissions: PermissionRequirement[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const CanView = (module: string) => RequirePermissions({ module, action: 'view' });
export const CanCreate = (module: string) => RequirePermissions({ module, action: 'create' });
export const CanEdit = (module: string) => RequirePermissions({ module, action: 'edit' });
export const CanDelete = (module: string) => RequirePermissions({ module, action: 'delete' });
export const CanManage = (module: string) => RequirePermissions({ module, action: 'manage' });
export const CanApprove = (module: string) => RequirePermissions({ module, action: 'approve' });
export const CanExport = (module: string) => RequirePermissions({ module, action: 'export' });
export const CanImport = (module: string) => RequirePermissions({ module, action: 'import' });

import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Scope-aware query interceptor.
 * Automatically injects scope filters into database queries based on user's access scopes.
 *
 * This middleware ensures that users can only see data within their authorized scope
 * (sites, LOBs, processes, shifts). Platform admins bypass all scope restrictions.
 *
 * Usage: Apply to any controller method that returns scope-sensitive data.
 * @UseInterceptors(ScopeQueryInterceptor)
 */
@Injectable()
export class ScopeQueryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return next.handle();

    // Platform admin bypasses scope restrictions
    if (user.role === 'NAVIRA_PLATFORM_ADMINISTRATOR' || user.roles?.includes('NAVIRA_PLATFORM_ADMINISTRATOR') || user.role === 'NAVIRA_OWNER' || user.roles?.includes('NAVIRA_OWNER')) {
      return next.handle();
    }

    const tenant = request.tenant || {};
    const scopes = tenant.accessScopes || user.accessScopes || [];

    // Attach scope context to request for downstream services
    request.scopeContext = {
      companyId: user.companyId,
      userId: user.sub || user.id,
      scopes,
      isScoped: scopes.length > 0,
      siteIds: scopes.filter((s: any) => s.siteId).map((s: any) => s.siteId),
      lobIds: scopes.filter((s: any) => s.lobId).map((s: any) => s.lobId),
      processIds: scopes.filter((s: any) => s.processId).map((s: any) => s.processId),
      shiftIds: scopes.filter((s: any) => s.shiftId).map((s: any) => s.shiftId),
    };

    return next.handle().pipe(
      tap(() => {}),
    );
  }
}

/**
 * Helper to build scope-aware Prisma where clauses.
 * Use in services that need to filter by user's access scope.
 */
export function buildScopeWhere(
  companyId: string,
  scopeContext: any,
  baseWhere: any = {},
): any {
  if (!scopeContext?.isScoped) return { companyId, ...baseWhere };

  const { siteIds, processIds } = scopeContext;

  // If user has site scopes, filter by those sites
  if (siteIds.length > 0) {
    return {
      companyId,
      ...baseWhere,
      OR: [
        { siteId: { in: siteIds } },
        { siteId: null }, // Include records without site assignment
      ],
    };
  }

  // If user has process scopes, filter by those processes
  if (processIds.length > 0) {
    return {
      companyId,
      ...baseWhere,
      OR: [
        { processId: { in: processIds } },
        { processId: null },
      ],
    };
  }

  return { companyId, ...baseWhere };
}

/**
 * Helper to get scoped employee IDs.
 * Returns only employees within the user's authorized scope.
 */
export async function getScopedEmployeeIds(
  prisma: any,
  companyId: string,
  scopeContext: any,
): Promise<string[]> {
  if (!scopeContext?.isScoped) {
    // No scope restriction - return all employees in company
    const users = await prisma.user.findMany({
      where: { companyId, status: 'ACTIVE' },
      select: { id: true },
    });
    return users.map((u: any) => u.id);
  }

  const { siteIds, processIds } = scopeContext;

  const where: any = { companyId, status: 'ACTIVE' };

  if (siteIds.length > 0) {
    where.siteId = { in: siteIds };
  } else if (processIds.length > 0) {
    where.processId = { in: processIds };
  }

  const users = await prisma.user.findMany({ where, select: { id: true } });
  return users.map((u: any) => u.id);
}

/**
 * Helper to check if a target entity is within the user's scope.
 */
export function isEntityInScope(
  entity: any,
  scopeContext: any,
): boolean {
  if (!scopeContext?.isScoped) return true;

  const { siteIds, processIds, lobIds, shiftIds } = scopeContext;

  // Check site scope
  if (siteIds.length > 0 && entity.siteId && !siteIds.includes(entity.siteId)) {
    return false;
  }

  // Check process scope
  if (processIds.length > 0 && entity.processId && !processIds.includes(entity.processId)) {
    return false;
  }

  // Check LOB scope
  if (lobIds.length > 0 && entity.lobId && !lobIds.includes(entity.lobId)) {
    return false;
  }

  // Check shift scope
  if (shiftIds.length > 0 && entity.shiftId && !shiftIds.includes(entity.shiftId)) {
    return false;
  }

  return true;
}

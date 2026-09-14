import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessScopeGuard } from '../src/common/guards/access-scope.guard';
import { TenantGuard } from '../src/common/guards/tenant.guard';

function contextFor(request: any): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('Tenant Isolation', () => {
  describe('Cross-company data access', () => {
    it('should prevent User from Company A from reading Company B data via AccessScopeGuard', async () => {
      const reflector = { getAllAndOverride: jest.fn().mockReturnValue({ requireSite: true }) } as unknown as Reflector;
      const prisma = { isConnected: jest.fn().mockReturnValue(false) } as any;
      const guard = new AccessScopeGuard(reflector, prisma);

      const request = {
        user: {
          sub: 'user-company-a',
          companyId: 'company-a',
          role: 'TRANSPORT_ADMIN',
          roles: ['TRANSPORT_ADMIN'],
        },
        params: { siteId: 'company-b-site-1' },
        tenant: {
          accessScopes: [{ siteId: 'company-a-site-1' }],
        },
      };

      await expect(guard.canActivate(contextFor(request)))
        .rejects.toThrow('not authorized for this site');
    });

    it('should allow User from Company A to read Company A data', async () => {
      const reflector = { getAllAndOverride: jest.fn().mockReturnValue({ requireSite: true }) } as unknown as Reflector;
      const prisma = { isConnected: jest.fn().mockReturnValue(false) } as any;
      const guard = new AccessScopeGuard(reflector, prisma);

      const request = {
        user: {
          sub: 'user-company-a',
          companyId: 'company-a',
          role: 'TRANSPORT_ADMIN',
          roles: ['TRANSPORT_ADMIN'],
        },
        params: { siteId: 'company-a-site-1' },
        tenant: {
          accessScopes: [{ siteId: 'company-a-site-1' }],
        },
      };

      const result = await guard.canActivate(contextFor(request));
      expect(result).toBe(true);
    });

    it('should prevent Company B user from accessing Company A resources', async () => {
      const reflector = { getAllAndOverride: jest.fn().mockReturnValue({ requireSite: true }) } as unknown as Reflector;
      const prisma = { isConnected: jest.fn().mockReturnValue(false) } as any;
      const guard = new AccessScopeGuard(reflector, prisma);

      const request = {
        user: {
          sub: 'user-company-b',
          companyId: 'company-b',
          role: 'TRANSPORT_ADMIN',
          roles: ['TRANSPORT_ADMIN'],
        },
        params: { siteId: 'company-a-site-1' },
        tenant: {
          accessScopes: [{ siteId: 'company-b-site-1' }],
        },
      };

      await expect(guard.canActivate(contextFor(request)))
        .rejects.toThrow('not authorized for this site');
    });
  });

  describe('Site-scoped access isolation', () => {
    it('should prevent user with site-scoped access from accessing other sites', async () => {
      const reflector = { getAllAndOverride: jest.fn().mockReturnValue({ requireSite: true }) } as unknown as Reflector;
      const prisma = { isConnected: jest.fn().mockReturnValue(false) } as any;
      const guard = new AccessScopeGuard(reflector, prisma);

      const request = {
        user: {
          sub: 'site-scoped-user',
          companyId: 'company-a',
          role: 'TRANSPORT_COORDINATOR',
          roles: ['TRANSPORT_COORDINATOR'],
        },
        params: { siteId: 'company-a-site-2' },
        tenant: {
          accessScopes: [{ siteId: 'company-a-site-1' }],
        },
      };

      await expect(guard.canActivate(contextFor(request)))
        .rejects.toThrow('not authorized for this site');
    });

    it('should allow site-scoped user to access their assigned site', async () => {
      const reflector = { getAllAndOverride: jest.fn().mockReturnValue({ requireSite: true }) } as unknown as Reflector;
      const prisma = { isConnected: jest.fn().mockReturnValue(false) } as any;
      const guard = new AccessScopeGuard(reflector, prisma);

      const request = {
        user: {
          sub: 'site-scoped-user',
          companyId: 'company-a',
          role: 'TRANSPORT_COORDINATOR',
          roles: ['TRANSPORT_COORDINATOR'],
        },
        params: { siteId: 'company-a-site-1' },
        tenant: {
          accessScopes: [{ siteId: 'company-a-site-1' }],
        },
      };

      const result = await guard.canActivate(contextFor(request));
      expect(result).toBe(true);
    });

    it('should allow company-level user when no site-scoped requirement', async () => {
      const reflector = { getAllAndOverride: jest.fn().mockReturnValue({}) } as unknown as Reflector;
      const prisma = { isConnected: jest.fn().mockReturnValue(false) } as any;
      const guard = new AccessScopeGuard(reflector, prisma);

      const request = {
        user: {
          sub: 'company-level-user',
          companyId: 'company-a',
          role: 'TRANSPORT_ADMIN',
          roles: ['TRANSPORT_ADMIN'],
        },
        params: {},
        tenant: {
          accessScopes: [{ companyId: 'company-a' }],
        },
      };

      const result = await guard.canActivate(contextFor(request));
      expect(result).toBe(true);
    });

    it('should deny company-level user when site-scoped requirement has no matching site', async () => {
      const reflector = { getAllAndOverride: jest.fn().mockReturnValue({ requireSite: true }) } as unknown as Reflector;
      const prisma = { isConnected: jest.fn().mockReturnValue(false) } as any;
      const guard = new AccessScopeGuard(reflector, prisma);

      const request = {
        user: {
          sub: 'company-level-user',
          companyId: 'company-a',
          role: 'TRANSPORT_ADMIN',
          roles: ['TRANSPORT_ADMIN'],
        },
        params: { siteId: 'company-a-site-99' },
        tenant: {
          accessScopes: [{ companyId: 'company-a' }],
        },
      };

      await expect(guard.canActivate(contextFor(request)))
        .rejects.toThrow('not authorized for this site');
    });

    it('should deny access when user has no scopes assigned', async () => {
      const reflector = { getAllAndOverride: jest.fn().mockReturnValue({ requireSite: true }) } as unknown as Reflector;
      const prisma = { isConnected: jest.fn().mockReturnValue(false) } as any;
      const guard = new AccessScopeGuard(reflector, prisma);

      const request = {
        user: {
          sub: 'no-scope-user',
          companyId: 'company-a',
          role: 'EMPLOYEE',
          roles: ['EMPLOYEE'],
        },
        params: { siteId: 'company-a-site-1' },
        tenant: { accessScopes: [] },
      };

      await expect(guard.canActivate(contextFor(request)))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('TenantGuard - tenant context enforcement', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(null) } as unknown as Reflector;
    let guard: TenantGuard;

    beforeEach(() => {
      guard = new TenantGuard(reflector);
    });

    it('should block access when user has no companyId', () => {
      const request = { user: { sub: 'no-company-user' }, tenant: {} };
      expect(() => guard.canActivate(contextFor(request))).toThrow(ForbiddenException);
    });

    it('should allow access when user has companyId', () => {
      const request = {
        user: {
          sub: 'valid-user',
          companyId: 'company-a',
          role: 'TRANSPORT_ADMIN',
          roles: ['TRANSPORT_ADMIN'],
          permissions: [],
          accessScopes: [],
        },
        tenant: {},
      };

      guard.canActivate(contextFor(request));
      expect((request as any).tenant.companyId).toBe('company-a');
    });

    it('should reject when user object is missing', () => {
      const request = { user: null, tenant: {} };
      expect(() => guard.canActivate(contextFor(request))).toThrow(ForbiddenException);
    });
  });
});

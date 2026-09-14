import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessScopeGuard } from '../src/common/guards/access-scope.guard';
import { OwnerOnlyGuard, OWNER_ONLY_KEY } from '../src/common/guards/owner-only.guard';

function contextFor(request: any): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('Authorization Guard Integration', () => {
  describe('AccessScopeGuard — cross-tenant blocking', () => {
    const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;

    afterEach(() => jest.clearAllMocks());

    it('should block cross-tenant access (returns 403)', async () => {
      reflector.getAllAndOverride = jest.fn().mockReturnValue({ requireSite: true });
      const prisma = {
        isConnected: jest.fn().mockReturnValue(false),
      } as any;
      const guard = new AccessScopeGuard(reflector, prisma);

      const request = {
        user: {
          sub: 'user-a',
          companyId: 'company-a',
          role: 'TRANSPORT_ADMIN',
          roles: ['TRANSPORT_ADMIN'],
        },
        params: { siteId: 'site-b' },
        tenant: {
          accessScopes: [{ siteId: 'site-a1' }],
        },
      };

      await expect(guard.canActivate(contextFor(request)))
        .rejects.toThrow(ForbiddenException);
    });

    it('should allow same-tenant access', async () => {
      reflector.getAllAndOverride = jest.fn().mockReturnValue({ requireSite: true });
      const prisma = {
        isConnected: jest.fn().mockReturnValue(false),
      } as any;
      const guard = new AccessScopeGuard(reflector, prisma);

      const request = {
        user: {
          sub: 'user-a',
          companyId: 'company-a',
          role: 'TRANSPORT_ADMIN',
          roles: ['TRANSPORT_ADMIN'],
        },
        params: { siteId: 'site-a1' },
        tenant: {
          accessScopes: [{ siteId: 'site-a1' }],
        },
      };

      const result = await guard.canActivate(contextFor(request));
      expect(result).toBe(true);
    });

    it('should allow NAVIRA_OWNER cross-scope access', async () => {
      reflector.getAllAndOverride = jest.fn().mockReturnValue({ requireSite: true });
      const prisma = {} as any;
      const guard = new AccessScopeGuard(reflector, prisma);

      const request = {
        user: {
          sub: 'owner-1',
          companyId: 'company-a',
          role: 'NAVIRA_OWNER',
          roles: ['NAVIRA_OWNER'],
        },
        params: { siteId: 'site-b' },
        tenant: { accessScopes: [] },
      };

      const result = await guard.canActivate(contextFor(request));
      expect(result).toBe(true);
    });

    it('should block user with no companyId when not NAVIRA_INTERNAL', async () => {
      reflector.getAllAndOverride = jest.fn().mockReturnValue({ requireSite: true });
      const prisma = {} as any;
      const guard = new AccessScopeGuard(reflector, prisma);

      const request = {
        user: {
          sub: 'user-orphan',
          role: 'EMPLOYEE',
          roles: ['EMPLOYEE'],
          securityDomain: 'CUSTOMER_INTERNAL',
        },
        params: { siteId: 'site-1' },
        tenant: {},
      };

      await expect(guard.canActivate(contextFor(request)))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('OwnerOnlyGuard — blocks non-Owner users', () => {
    const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
    let guard: OwnerOnlyGuard;

    beforeEach(() => {
      guard = new OwnerOnlyGuard(reflector);
    });

    afterEach(() => jest.clearAllMocks());

    it('should allow NAVIRA_OWNER access', () => {
      reflector.getAllAndOverride = jest.fn().mockReturnValue(true);
      const request = {
        user: {
          role: 'NAVIRA_OWNER',
          roles: ['NAVIRA_OWNER'],
        },
      };
      expect(guard.canActivate(contextFor(request))).toBe(true);
    });

    it('should block TRANSPORT_ADMIN access', () => {
      reflector.getAllAndOverride = jest.fn().mockReturnValue(true);
      const request = {
        user: {
          role: 'TRANSPORT_ADMIN',
          roles: ['TRANSPORT_ADMIN'],
        },
      };
      expect(() => guard.canActivate(contextFor(request))).toThrow(ForbiddenException);
    });

    it('should block EMPLOYEE access', () => {
      reflector.getAllAndOverride = jest.fn().mockReturnValue(true);
      const request = {
        user: {
          role: 'EMPLOYEE',
          roles: ['EMPLOYEE'],
        },
      };
      expect(() => guard.canActivate(contextFor(request))).toThrow(ForbiddenException);
    });

    it('should block DRIVER access', () => {
      reflector.getAllAndOverride = jest.fn().mockReturnValue(true);
      const request = {
        user: {
          role: 'DRIVER',
          roles: ['DRIVER'],
        },
      };
      expect(() => guard.canActivate(contextFor(request))).toThrow(ForbiddenException);
    });

    it('should allow access when ownerOnly is not set', () => {
      reflector.getAllAndOverride = jest.fn().mockReturnValue(false);
      const request = {
        user: {
          role: 'EMPLOYEE',
          roles: ['EMPLOYEE'],
        },
      };
      expect(guard.canActivate(contextFor(request))).toBe(true);
    });

    it('should block when no user context', () => {
      reflector.getAllAndOverride = jest.fn().mockReturnValue(true);
      const request = {};
      expect(() => guard.canActivate(contextFor(request))).toThrow(ForbiddenException);
    });
  });
});

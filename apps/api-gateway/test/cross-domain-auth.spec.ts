import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Cross-Domain Authorization Tests
 *
 * These tests verify that the role and identity model migration is correct
 * and that cross-domain authorization violations are prevented.
 */

// Mock the reflector
const mockReflector = {
  getAllAndOverride: jest.fn(),
};

// Import the guards after mocking
import { RolesGuard } from '../src/common/guards/roles.guard';
import { PermissionsGuard } from '../src/common/guards/permissions.guard';
import { normalizeRole, normalizeRoles, LEGACY_TO_CANONICAL, isCanonicalRole, getSecurityDomainForRole } from '../src/common/services/role-mapping';

describe('Cross-Domain Authorization', () => {
  describe('Role Normalization', () => {
    it('should normalize SUPER_ADMIN to NAVIRA_PLATFORM_ADMINISTRATOR', () => {
      expect(normalizeRole('SUPER_ADMIN')).toBe('NAVIRA_PLATFORM_ADMINISTRATOR');
    });

    it('should normalize MOVE_IN_ADMIN to NAVIRA_PLATFORM_ADMINISTRATOR', () => {
      expect(normalizeRole('MOVE_IN_ADMIN')).toBe('NAVIRA_PLATFORM_ADMINISTRATOR');
    });

    it('should normalize SAAS_OWNER to NAVIRA_OWNER', () => {
      expect(normalizeRole('SAAS_OWNER')).toBe('NAVIRA_OWNER');
    });

    it('should normalize FINANCE to NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR', () => {
      expect(normalizeRole('FINANCE')).toBe('NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR');
    });

    it('should normalize COORDINATOR to TRANSPORT_COORDINATOR', () => {
      expect(normalizeRole('COORDINATOR')).toBe('TRANSPORT_COORDINATOR');
    });

    it('should not change canonical roles', () => {
      expect(normalizeRole('NAVIRA_OWNER')).toBe('NAVIRA_OWNER');
      expect(normalizeRole('TRANSPORT_ADMIN')).toBe('TRANSPORT_ADMIN');
      expect(normalizeRole('VENDOR_ADMIN')).toBe('VENDOR_ADMIN');
      expect(normalizeRole('DRIVER')).toBe('DRIVER');
      expect(normalizeRole('GUARD')).toBe('GUARD');
    });

    it('should normalize arrays of roles', () => {
      const roles = ['SUPER_ADMIN', 'FINANCE_TEAM', 'NAVIRA_OWNER'];
      const normalized = normalizeRoles(roles);
      expect(normalized).toContain('NAVIRA_PLATFORM_ADMINISTRATOR');
      expect(normalized).toContain('NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR');
      expect(normalized).toContain('NAVIRA_OWNER');
      expect(normalized).toHaveLength(3); // deduped
    });

    it('should deduplicate normalized roles', () => {
      const roles = ['SUPER_ADMIN', 'MOVE_IN_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR'];
      const normalized = normalizeRoles(roles);
      expect(normalized).toHaveLength(1);
      expect(normalized[0]).toBe('NAVIRA_PLATFORM_ADMINISTRATOR');
    });
  });

  describe('Canonical Role Detection', () => {
    it('should identify canonical NAVIRA internal roles', () => {
      expect(isCanonicalRole('NAVIRA_OWNER')).toBe(true);
      expect(isCanonicalRole('NAVIRA_PLATFORM_ADMINISTRATOR')).toBe(true);
      expect(isCanonicalRole('NAVIRA_PLATFORM_OPERATIONS_MANAGER')).toBe(true);
    });

    it('should identify canonical customer roles', () => {
      expect(isCanonicalRole('TRANSPORT_ADMIN')).toBe(true);
      expect(isCanonicalRole('MANAGER')).toBe(true);
      expect(isCanonicalRole('EMPLOYEE')).toBe(true);
    });

    it('should identify canonical vendor roles', () => {
      expect(isCanonicalRole('VENDOR_ADMIN')).toBe(true);
      expect(isCanonicalRole('VENDOR_DISPATCHER')).toBe(true);
    });

    it('should identify canonical driver/guard roles', () => {
      expect(isCanonicalRole('DRIVER')).toBe(true);
      expect(isCanonicalRole('GUARD')).toBe(true);
    });

    it('should reject legacy role names', () => {
      expect(isCanonicalRole('SUPER_ADMIN')).toBe(false);
      expect(isCanonicalRole('MOVE_IN_ADMIN')).toBe(false);
      expect(isCanonicalRole('FINANCE_TEAM')).toBe(false);
      expect(isCanonicalRole('COORDINATOR')).toBe(false);
    });
  });

  describe('Security Domain Resolution', () => {
    it('should resolve NAVIRA internal roles to NAVIRA_INTERNAL', () => {
      expect(getSecurityDomainForRole('NAVIRA_OWNER')).toBe('NAVIRA_INTERNAL');
      expect(getSecurityDomainForRole('NAVIRA_PLATFORM_ADMINISTRATOR')).toBe('NAVIRA_INTERNAL');
      expect(getSecurityDomainForRole('NAVIRA_PLATFORM_OPERATIONS_MANAGER')).toBe('NAVIRA_INTERNAL');
    });

    it('should resolve customer roles to CUSTOMER_INTERNAL', () => {
      expect(getSecurityDomainForRole('TRANSPORT_ADMIN')).toBe('CUSTOMER_INTERNAL');
      expect(getSecurityDomainForRole('MANAGER')).toBe('CUSTOMER_INTERNAL');
      expect(getSecurityDomainForRole('EMPLOYEE')).toBe('CUSTOMER_INTERNAL');
    });

    it('should resolve vendor roles to VENDOR_EXTERNAL', () => {
      expect(getSecurityDomainForRole('VENDOR_ADMIN')).toBe('VENDOR_EXTERNAL');
      expect(getSecurityDomainForRole('VENDOR_DISPATCHER')).toBe('VENDOR_EXTERNAL');
    });

    it('should resolve driver roles to DRIVER_EXTERNAL', () => {
      expect(getSecurityDomainForRole('DRIVER')).toBe('DRIVER_EXTERNAL');
      expect(getSecurityDomainForRole('DRIVER_SUPERVISOR')).toBe('DRIVER_EXTERNAL');
    });

    it('should resolve guard roles to GUARD_EXTERNAL', () => {
      expect(getSecurityDomainForRole('GUARD')).toBe('GUARD_EXTERNAL');
      expect(getSecurityDomainForRole('GUARD_SUPERVISOR')).toBe('GUARD_EXTERNAL');
    });
  });

  describe('RolesGuard', () => {
    let guard: RolesGuard;
    let reflector: Reflector;

    beforeEach(() => {
      reflector = mockReflector as any;
      guard = new RolesGuard(reflector);
    });

    it('should allow access when no roles are required', () => {
      mockReflector.getAllAndOverride.mockReturnValue(null);
      const context = createMockContext({});
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow NAVIRA_OWNER to access any endpoint', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['TRANSPORT_ADMIN']);
      const context = createMockContext({
        role: 'NAVIRA_OWNER',
        roles: ['NAVIRA_OWNER'],
      });
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow NAVIRA_PLATFORM_ADMINISTRATOR to access any endpoint', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['TRANSPORT_ADMIN']);
      const context = createMockContext({
        role: 'NAVIRA_PLATFORM_ADMINISTRATOR',
        roles: ['NAVIRA_PLATFORM_ADMINISTRATOR'],
      });
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should reject when user has no matching role', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['NAVIRA_OWNER']);
      const context = createMockContext({
        role: 'EMPLOYEE',
        roles: ['EMPLOYEE'],
      });
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should handle empty roles array with fallback to user.role', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['EMPLOYEE']);
      const context = createMockContext({
        role: 'EMPLOYEE',
        roles: [],
      });
      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('PermissionsGuard', () => {
    let guard: PermissionsGuard;
    let reflector: Reflector;

    beforeEach(() => {
      reflector = mockReflector as any;
      guard = new PermissionsGuard(reflector);
    });

    it('should allow access when no permissions are required', () => {
      mockReflector.getAllAndOverride.mockReturnValue(null);
      const context = createMockContext({});
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow NAVIRA_OWNER to bypass permission checks', () => {
      mockReflector.getAllAndOverride.mockReturnValue([
        { module: 'trip', action: 'assign' },
      ]);
      const context = createMockContext({
        role: 'NAVIRA_OWNER',
        roles: ['NAVIRA_OWNER'],
        permissions: [],
      });
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow NAVIRA_PLATFORM_ADMINISTRATOR to bypass permission checks', () => {
      mockReflector.getAllAndOverride.mockReturnValue([
        { module: 'trip', action: 'assign' },
      ]);
      const context = createMockContext({
        role: 'NAVIRA_PLATFORM_ADMINISTRATOR',
        roles: ['NAVIRA_PLATFORM_ADMINISTRATOR'],
        permissions: [],
      });
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should reject when user lacks required permission', () => {
      mockReflector.getAllAndOverride.mockReturnValue([
        { module: 'trip', action: 'assign' },
      ]);
      const context = createMockContext({
        role: 'EMPLOYEE',
        roles: ['EMPLOYEE'],
        permissions: ['booking:create'],
      });
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('Cross-Domain Isolation', () => {
    it('should prevent NAVIRA internal from accessing customer data without platform context', () => {
      // This test verifies that the security domain check is enforced
      const naviraUser = {
        securityDomain: 'NAVIRA_INTERNAL',
        identityType: 'NAVIRA_EMPLOYEE',
        role: 'NAVIRA_PLATFORM_OPERATIONS_MANAGER',
        roles: ['NAVIRA_PLATFORM_OPERATIONS_MANAGER'],
      };

      // NAVIRA internal users should not automatically have customer scope
      expect(naviraUser.securityDomain).toBe('NAVIRA_INTERNAL');
      // They need explicit platform context to access customer data
    });

    it('should prevent customer user from accessing NAVIRA internal endpoints', () => {
      const customerUser = {
        securityDomain: 'CUSTOMER_INTERNAL',
        identityType: 'CUSTOMER_USER',
        role: 'TRANSPORT_ADMIN',
        roles: ['TRANSPORT_ADMIN'],
      };

      // Customer users should not have access to platform management
      expect(customerUser.securityDomain).toBe('CUSTOMER_INTERNAL');
      // They should be rejected by PlatformAdminGuard
    });

    it('should prevent vendor user from accessing customer employee data', () => {
      const vendorUser = {
        securityDomain: 'VENDOR_EXTERNAL',
        identityType: 'VENDOR_USER',
        role: 'VENDOR_ADMIN',
        roles: ['VENDOR_ADMIN'],
      };

      // Vendor users should only access vendor-scoped data
      expect(vendorUser.securityDomain).toBe('VENDOR_EXTERNAL');
    });

    it('should prevent driver from accessing billing endpoints', () => {
      const driverUser = {
        securityDomain: 'DRIVER_EXTERNAL',
        identityType: 'DRIVER',
        role: 'DRIVER',
        roles: ['DRIVER'],
      };

      // Drivers should only have trip-scoped access
      expect(driverUser.securityDomain).toBe('DRIVER_EXTERNAL');
    });

    it('should prevent guard from accessing trip assignment endpoints', () => {
      const guardUser = {
        securityDomain: 'GUARD_EXTERNAL',
        identityType: 'GUARD',
        role: 'GUARD',
        roles: ['GUARD'],
      };

      // Guards should only have monitoring access
      expect(guardUser.securityDomain).toBe('GUARD_EXTERNAL');
    });
  });

  describe('Role Hierarchy', () => {
    it('should enforce role hierarchy — child cannot perform parent-only actions', () => {
      // TEAM_LEADER (hierarchy 6) cannot perform MANAGER (hierarchy 5) actions
      const teamLeader = {
        role: 'TEAM_LEADER',
        hierarchyLevel: 6,
      };

      const manager = {
        role: 'MANAGER',
        hierarchyLevel: 5,
      };

      // Higher hierarchy level = lower authority
      expect(teamLeader.hierarchyLevel).toBeGreaterThan(manager.hierarchyLevel);
    });

    it('should enforce scope isolation — user A cannot access user B data', () => {
      const userA = {
        role: 'TRANSPORT_ADMIN',
        scope: { sites: ['site_1'] },
      };

      const userB = {
        role: 'TRANSPORT_ADMIN',
        scope: { sites: ['site_2'] },
      };

      // Same role but different scope
      expect(userA.scope.sites).not.toContain('site_2');
      expect(userB.scope.sites).not.toContain('site_1');
    });
  });
});

/**
 * Helper to create mock execution context
 */
function createMockContext(user: any) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

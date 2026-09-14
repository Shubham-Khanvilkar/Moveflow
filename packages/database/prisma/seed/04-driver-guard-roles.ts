import { PrismaClient, SecurityDomain, IdentityType } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Canonical Driver and Guard Roles
 * Driver: securityDomain = DRIVER_EXTERNAL, identityType = DRIVER
 * Guard: securityDomain = GUARD_EXTERNAL, identityType = GUARD
 */

export const CANONICAL_DRIVER_GUARD_ROLES = [
  {
    code: 'DRIVER_SUPERVISOR',
    displayName: 'Driver Supervisor',
    securityDomain: SecurityDomain.DRIVER_EXTERNAL,
    identityType: IdentityType.DRIVER,
    hierarchyLevel: 1,
    parentRoleCode: null,
    purpose: 'Supervise and coordinate driver operations',
    scopeTypes: ['DRIVER'],
  },
  {
    code: 'DRIVER',
    displayName: 'Driver',
    securityDomain: SecurityDomain.DRIVER_EXTERNAL,
    identityType: IdentityType.DRIVER,
    hierarchyLevel: 2,
    parentRoleCode: 'DRIVER_SUPERVISOR',
    purpose: 'Execute assigned trips and transport passengers',
    scopeTypes: ['TRIP'],
  },
  {
    code: 'GUARD_SUPERVISOR',
    displayName: 'Guard Supervisor',
    securityDomain: SecurityDomain.GUARD_EXTERNAL,
    identityType: IdentityType.GUARD,
    hierarchyLevel: 1,
    parentRoleCode: null,
    purpose: 'Supervise and coordinate guard operations',
    scopeTypes: ['GUARD'],
  },
  {
    code: 'GUARD',
    displayName: 'Guard',
    securityDomain: SecurityDomain.GUARD_EXTERNAL,
    identityType: IdentityType.GUARD,
    hierarchyLevel: 2,
    parentRoleCode: 'GUARD_SUPERVISOR',
    purpose: 'Monitor trips, verify boarding, and ensure safety',
    scopeTypes: ['TRIP'],
  },
];

export async function seedDriverGuardRoles() {
  console.log('Seeding canonical driver and guard roles...');

  for (const role of CANONICAL_DRIVER_GUARD_ROLES) {
    await prisma.role.upsert({
      where: { name: role.code },
      update: {
        displayName: role.displayName,
        securityDomain: role.securityDomain,
        hierarchyLevel: role.hierarchyLevel,
        isActive: true,
      },
      create: {
        name: role.code,
        displayName: role.displayName,
        description: role.purpose,
        securityDomain: role.securityDomain,
        hierarchyLevel: role.hierarchyLevel,
        isActive: true,
      },
    });

    await prisma.roleHierarchy.upsert({
      where: { roleCode: role.code },
      update: {
        displayName: role.displayName,
        securityDomain: role.securityDomain,
        identityType: role.identityType,
        hierarchyLevel: role.hierarchyLevel,
        parentRoleCode: role.parentRoleCode,
        purpose: role.purpose,
      },
      create: {
        roleCode: role.code,
        displayName: role.displayName,
        securityDomain: role.securityDomain,
        identityType: role.identityType,
        hierarchyLevel: role.hierarchyLevel,
        parentRoleCode: role.parentRoleCode,
        childRoleCodes: [],
        purpose: role.purpose,
        responsibilities: [],
        deniedActions: [],
        scopeTypes: role.scopeTypes,
      },
    });
  }

  console.log(`Seeded ${CANONICAL_DRIVER_GUARD_ROLES.length} canonical driver/guard roles`);
}

import { PrismaClient, SecurityDomain, IdentityType } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Canonical Vendor Roles
 * securityDomain = VENDOR_EXTERNAL
 * identityType = VENDOR_USER
 */

export const CANONICAL_VENDOR_ROLES = [
  { code: 'VENDOR_ADMIN', displayName: 'Vendor Admin', hierarchyLevel: 1, parentRoleCode: null, purpose: 'Full administrative control over vendor operations' },
  { code: 'VENDOR_SUB_ADMIN', displayName: 'Vendor Sub-Admin', hierarchyLevel: 2, parentRoleCode: 'VENDOR_ADMIN', purpose: 'Delegated vendor operations management' },
  { code: 'VENDOR_OPERATIONS_MANAGER', displayName: 'Operations Manager', hierarchyLevel: 3, parentRoleCode: 'VENDOR_SUB_ADMIN', purpose: 'Manage daily vendor operations' },
  { code: 'VENDOR_DISPATCHER', displayName: 'Dispatcher', hierarchyLevel: 3, parentRoleCode: 'VENDOR_SUB_ADMIN', purpose: 'Assign drivers and vehicles to trips' },
  { code: 'VENDOR_FLEET_MANAGER', displayName: 'Fleet Manager', hierarchyLevel: 3, parentRoleCode: 'VENDOR_SUB_ADMIN', purpose: 'Manage vendor vehicle fleet' },
  { code: 'VENDOR_DRIVER_MANAGER', displayName: 'Driver Manager', hierarchyLevel: 3, parentRoleCode: 'VENDOR_SUB_ADMIN', purpose: 'Manage vendor drivers' },
  { code: 'VENDOR_COMPLIANCE_MANAGER', displayName: 'Compliance Manager', hierarchyLevel: 3, parentRoleCode: 'VENDOR_SUB_ADMIN', purpose: 'Ensure vendor compliance with policies' },
  { code: 'VENDOR_FINANCE', displayName: 'Finance', hierarchyLevel: 3, parentRoleCode: 'VENDOR_SUB_ADMIN', purpose: 'Manage vendor billing and invoices' },
  { code: 'VENDOR_COORDINATOR', displayName: 'Coordinator', hierarchyLevel: 3, parentRoleCode: 'VENDOR_SUB_ADMIN', purpose: 'Coordinate vendor operations' },
  { code: 'VENDOR_VIEWER', displayName: 'Viewer', hierarchyLevel: 3, parentRoleCode: 'VENDOR_SUB_ADMIN', purpose: 'View-only access to vendor data' },
];

export async function seedVendorRoles() {
  console.log('Seeding canonical vendor roles...');

  for (const role of CANONICAL_VENDOR_ROLES) {
    await prisma.role.upsert({
      where: { name: role.code },
      update: {
        displayName: role.displayName,
        securityDomain: SecurityDomain.VENDOR_EXTERNAL,
        hierarchyLevel: role.hierarchyLevel,
        isActive: true,
      },
      create: {
        name: role.code,
        displayName: role.displayName,
        description: role.purpose,
        securityDomain: SecurityDomain.VENDOR_EXTERNAL,
        hierarchyLevel: role.hierarchyLevel,
        isActive: true,
      },
    });

    await prisma.roleHierarchy.upsert({
      where: { roleCode: role.code },
      update: {
        displayName: role.displayName,
        securityDomain: SecurityDomain.VENDOR_EXTERNAL,
        identityType: IdentityType.VENDOR_USER,
        hierarchyLevel: role.hierarchyLevel,
        parentRoleCode: role.parentRoleCode,
        purpose: role.purpose,
      },
      create: {
        roleCode: role.code,
        displayName: role.displayName,
        securityDomain: SecurityDomain.VENDOR_EXTERNAL,
        identityType: IdentityType.VENDOR_USER,
        hierarchyLevel: role.hierarchyLevel,
        parentRoleCode: role.parentRoleCode,
        childRoleCodes: [],
        purpose: role.purpose,
        responsibilities: [],
        deniedActions: [],
        scopeTypes: ['VENDOR'],
      },
    });
  }

  console.log(`Seeded ${CANONICAL_VENDOR_ROLES.length} canonical vendor roles`);
}

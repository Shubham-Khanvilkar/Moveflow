import { PrismaClient, SecurityDomain, IdentityType } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Legacy-to-Canonical Role Mapping
 * Used to migrate existing data to canonical role names
 */
const LEGACY_TO_CANONICAL: Record<string, string> = {
  // Legacy NAVIRA internal roles → canonical NAVIRA_ prefix
  'SUPER_ADMIN': 'NAVIRA_PLATFORM_ADMINISTRATOR',
  'MOVE_IN_ADMIN': 'NAVIRA_PLATFORM_ADMINISTRATOR',
  'FINANCE_TEAM': 'NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR',
  'PROJECT_MANAGER': 'NAVIRA_PLATFORM_OPERATIONS_MANAGER',
  'PROJECT_COORDINATOR': 'NAVIRA_CLIENT_IMPLEMENTATION_COORDINATOR',
  'PLATFORM_COMPLIANCE': 'NAVIRA_PLATFORM_COMPLIANCE_OFFICER',
  'SECURITY_ADMINISTRATOR': 'NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR',
  'SUPPORT_ENGINEER': 'NAVIRA_CUSTOMER_SUPPORT_ENGINEER',
  'PLATFORM_AUDITOR': 'NAVIRA_PLATFORM_AUDITOR',

  // Legacy owner aliases → canonical
  'SAAS_OWNER': 'NAVIRA_OWNER',
  'MOVEINSYNC_OWNER': 'NAVIRA_OWNER',

  // Legacy PlatformRole aliases → canonical
  'SUPERADMIN': 'NAVIRA_PLATFORM_ADMINISTRATOR',
  'FINANCE': 'NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR',
  'COMPLIANCE': 'NAVIRA_PLATFORM_COMPLIANCE_OFFICER',
  'SECURITY_ADMIN': 'NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR',
  'SUPPORT': 'NAVIRA_CUSTOMER_SUPPORT_ENGINEER',
  'AUDITOR': 'NAVIRA_PLATFORM_AUDITOR',

  // Legacy customer role aliases → canonical
  'COORDINATOR': 'TRANSPORT_COORDINATOR',
  'SUB_ADMIN': 'TRANSPORT_SUB_ADMIN',
  'SENIOR_MGR': 'SENIOR_MANAGER',
  'ASST_MANAGER': 'ASSISTANT_MANAGER',
  'VENDOR': 'VENDOR_ADMIN',
  'ADMIN': 'TRANSPORT_ADMIN',
};

/**
 * Determine security domain for a role
 */
function getSecurityDomainForRole(role: string): SecurityDomain {
  const naviraRoles = [
    'NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR', 'NAVIRA_PLATFORM_OPERATIONS_MANAGER',
    'NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR', 'NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR',
    'NAVIRA_PLATFORM_COMPLIANCE_OFFICER', 'NAVIRA_PLATFORM_AUDITOR',
    'NAVIRA_INTEGRATION_API_ADMINISTRATOR', 'NAVIRA_CLIENT_SUCCESS_MANAGER',
    'NAVIRA_CLIENT_IMPLEMENTATION_COORDINATOR', 'NAVIRA_CUSTOMER_SUPPORT_ENGINEER',
  ];

  const vendorRoles = [
    'VENDOR_ADMIN', 'VENDOR_SUB_ADMIN', 'VENDOR_OPERATIONS_MANAGER',
    'VENDOR_DISPATCHER', 'VENDOR_FLEET_MANAGER', 'VENDOR_DRIVER_MANAGER',
    'VENDOR_FINANCE', 'VENDOR_COORDINATOR', 'VENDOR_VIEWER',
  ];

  const driverRoles = ['DRIVER_SUPERVISOR', 'DRIVER'];
  const guardRoles = ['GUARD_SUPERVISOR', 'GUARD'];

  if (naviraRoles.includes(role)) return SecurityDomain.NAVIRA_INTERNAL;
  if (vendorRoles.includes(role)) return SecurityDomain.VENDOR_EXTERNAL;
  if (driverRoles.includes(role)) return SecurityDomain.DRIVER_EXTERNAL;
  if (guardRoles.includes(role)) return SecurityDomain.GUARD_EXTERNAL;
  return SecurityDomain.CUSTOMER_INTERNAL;
}

/**
 * Determine identity type for a role
 */
function getIdentityTypeForRole(role: string): IdentityType {
  const naviraRoles = [
    'NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR', 'NAVIRA_PLATFORM_OPERATIONS_MANAGER',
    'NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR', 'NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR',
    'NAVIRA_PLATFORM_COMPLIANCE_OFFICER', 'NAVIRA_PLATFORM_AUDITOR',
    'NAVIRA_INTEGRATION_API_ADMINISTRATOR', 'NAVIRA_CLIENT_SUCCESS_MANAGER',
    'NAVIRA_CLIENT_IMPLEMENTATION_COORDINATOR', 'NAVIRA_CUSTOMER_SUPPORT_ENGINEER',
  ];

  const vendorRoles = [
    'VENDOR_ADMIN', 'VENDOR_SUB_ADMIN', 'VENDOR_OPERATIONS_MANAGER',
    'VENDOR_DISPATCHER', 'VENDOR_FLEET_MANAGER', 'VENDOR_DRIVER_MANAGER',
    'VENDOR_FINANCE', 'VENDOR_COORDINATOR', 'VENDOR_VIEWER',
  ];

  const driverRoles = ['DRIVER_SUPERVISOR', 'DRIVER'];
  const guardRoles = ['GUARD_SUPERVISOR', 'GUARD'];

  if (naviraRoles.includes(role)) return IdentityType.NAVIRA_EMPLOYEE;
  if (vendorRoles.includes(role)) return IdentityType.VENDOR_USER;
  if (driverRoles.includes(role)) return IdentityType.DRIVER;
  if (guardRoles.includes(role)) return IdentityType.GUARD;
  return IdentityType.CUSTOMER_USER;
}

async function migrateCompanyMemberships() {
  console.log('Migrating CompanyMembership records...');

  const memberships = await prisma.companyMembership.findMany();
  let migrated = 0;
  let skipped = 0;

  for (const membership of memberships) {
    const canonicalRole = LEGACY_TO_CANONICAL[membership.role] || membership.role;

    if (canonicalRole !== membership.role) {
      await prisma.companyMembership.update({
        where: { id: membership.id },
        data: { role: canonicalRole as any },
      });
      migrated++;
      console.log(`  Migrated membership ${membership.id}: ${membership.role} → ${canonicalRole}`);
    } else {
      skipped++;
    }
  }

  console.log(`  Migrated: ${migrated}, Skipped (already canonical): ${skipped}`);
}

async function migrateUserRoleAssignments() {
  console.log('Migrating UserRoleAssignment records...');

  const assignments = await prisma.userRoleAssignment.findMany();
  let migrated = 0;
  let skipped = 0;
  let deleted = 0;

  for (const assignment of assignments) {
    const role = await prisma.role.findUnique({ where: { id: assignment.roleId } });
    if (!role) {
      console.log(`  Deleting orphaned assignment ${assignment.id} — role not found`);
      await prisma.userRoleAssignment.delete({ where: { id: assignment.id } });
      deleted++;
      continue;
    }

    const canonicalName = LEGACY_TO_CANONICAL[role.name] || role.name;

    if (canonicalName !== role.name) {
      // Find or create the canonical role
      let canonicalRole = await prisma.role.findFirst({ where: { name: canonicalName } });
      if (!canonicalRole) {
        canonicalRole = await prisma.role.create({
          data: {
            name: canonicalName,
            displayName: canonicalName,
            securityDomain: getSecurityDomainForRole(canonicalName),
            hierarchyLevel: role.hierarchyLevel,
            isActive: true,
          },
        });
      }

      // Update assignment to point to canonical role
      const existingAssignment = await prisma.userRoleAssignment.findFirst({
        where: { userId: assignment.userId, roleId: canonicalRole.id },
      });

      if (!existingAssignment) {
        await prisma.userRoleAssignment.update({
          where: { id: assignment.id },
          data: { roleId: canonicalRole.id },
        });
        migrated++;
        console.log(`  Migrated assignment ${assignment.id}: ${role.name} → ${canonicalName}`);
      } else {
        // Duplicate exists, delete this one
        await prisma.userRoleAssignment.delete({ where: { id: assignment.id } });
        deleted++;
      }
    } else {
      skipped++;
    }
  }

  console.log(`  Migrated: ${migrated}, Skipped: ${skipped}, Deleted (duplicates): ${deleted}`);
}

async function migratePlatformRoleAssignments() {
  console.log('Migrating PlatformRoleAssignment records...');

  const assignments = await prisma.platformRoleAssignment.findMany();
  let migrated = 0;
  let skipped = 0;

  for (const assignment of assignments) {
    const canonicalRole = LEGACY_TO_CANONICAL[assignment.role] || assignment.role;

    if (canonicalRole !== assignment.role) {
      // Check if canonical assignment already exists
      const existing = await prisma.platformRoleAssignment.findFirst({
        where: { userId: assignment.userId, role: canonicalRole as any },
      });

      if (!existing) {
        await prisma.platformRoleAssignment.update({
          where: { id: assignment.id },
          data: { role: canonicalRole as any },
        });
        migrated++;
        console.log(`  Migrated platform assignment ${assignment.id}: ${assignment.role} → ${canonicalRole}`);
      } else {
        // Duplicate exists, delete this one
        await prisma.platformRoleAssignment.delete({ where: { id: assignment.id } });
        console.log(`  Deleted duplicate platform assignment ${assignment.id}`);
      }
    } else {
      skipped++;
    }
  }

  console.log(`  Migrated: ${migrated}, Skipped (already canonical): ${skipped}`);
}

async function updateUserSecurityMetadata() {
  console.log('Updating user security metadata...');

  const users = await prisma.user.findMany();
  let updated = 0;

  for (const user of users) {
    // Get user's primary role
    const membership = await prisma.companyMembership.findFirst({
      where: { userId: user.id, status: 'ACTIVE' },
    });

    const platformAssignment = await prisma.platformRoleAssignment.findFirst({
      where: { userId: user.id, isActive: true },
    });

    const userRoleAssignment = await prisma.userRoleAssignment.findFirst({
      where: { userId: user.id },
    });

    const primaryRole = platformAssignment?.role || membership?.role || userRoleAssignment?.role?.name || 'EMPLOYEE';
    const canonicalRole = LEGACY_TO_CANONICAL[primaryRole] || primaryRole;

    const securityDomain = getSecurityDomainForRole(canonicalRole);
    const identityType = getIdentityTypeForRole(canonicalRole);

    // Update user with correct security metadata
    await prisma.user.update({
      where: { id: user.id },
      data: {
        securityDomain,
        identityType,
      },
    });

    updated++;
  }

  console.log(`  Updated ${updated} users with security metadata`);
}

async function verifyMigration() {
  console.log('\nVerifying migration...');

  // 1. Check for legacy role names in CompanyMembership
  const legacyMemberships = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM "CompanyMembership"
    WHERE role IN ('MOVE_IN_ADMIN', 'SAAS_OWNER', 'MOVEINSYNC_OWNER', 'SUPER_ADMIN', 'FINANCE_TEAM',
                   'PROJECT_MANAGER', 'PROJECT_COORDINATOR', 'PLATFORM_COMPLIANCE', 'SECURITY_ADMINISTRATOR',
                   'SUPPORT_ENGINEER', 'PLATFORM_AUDITOR', 'COORDINATOR', 'SUB_ADMIN', 'SENIOR_MGR',
                   'ASST_MANAGER', 'VENDOR', 'ADMIN', 'FINANCE', 'COMPLIANCE', 'SECURITY_ADMIN', 'SUPPORT', 'AUDITOR')
  ` as any[];
  console.log(`  Legacy roles in CompanyMembership: ${legacyMemberships[0]?.count || 0}`);

  // 2. Check for users without securityDomain
  const usersWithoutDomain = await prisma.user.count({
    where: { securityDomain: null },
  });
  console.log(`  Users without securityDomain: ${usersWithoutDomain}`);

  // 3. Check for users without identityType
  const usersWithoutType = await prisma.user.count({
    where: { identityType: null },
  });
  console.log(`  Users without identityType: ${usersWithoutType}`);

  // 4. Check PlatformRoleAssignment for legacy roles
  const legacyPlatformAssignments = await prisma.platformRoleAssignment.findMany({
    where: {
      role: {
        in: ['SUPERADMIN', 'FINANCE', 'PROJECT_MANAGER', 'PROJECT_COORDINATOR',
             'COMPLIANCE', 'SECURITY_ADMIN', 'SUPPORT', 'AUDITOR'] as any[],
      },
    },
  });
  console.log(`  Legacy roles in PlatformRoleAssignment: ${legacyPlatformAssignments.length}`);

  console.log('\nMigration verification complete!');
}

async function main() {
  console.log('=== NAVIRA Role & Identity Migration ===\n');

  try {
    await migrateCompanyMemberships();
    console.log('');

    await migrateUserRoleAssignments();
    console.log('');

    await migratePlatformRoleAssignments();
    console.log('');

    await updateUserSecurityMetadata();
    console.log('');

    await verifyMigration();

    console.log('\n=== Migration Complete ===');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

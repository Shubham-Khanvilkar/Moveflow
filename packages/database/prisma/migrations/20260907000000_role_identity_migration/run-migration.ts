import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Role & Identity Data Migration ===\n');

  // 1. Update CompanyMembership records
  console.log('1. Updating CompanyMembership records...');
  const cmResult = await prisma.$executeRawUnsafe(`
    UPDATE "CompanyMembership"
    SET role = CASE
        WHEN role = 'MOVE_IN_ADMIN' THEN 'NAVIRA_PLATFORM_ADMINISTRATOR'
        WHEN role = 'SAAS_OWNER' THEN 'NAVIRA_OWNER'
        WHEN role = 'MOVEINSYNC_OWNER' THEN 'NAVIRA_OWNER'
        WHEN role = 'SUPER_ADMIN' THEN 'NAVIRA_PLATFORM_ADMINISTRATOR'
        WHEN role = 'FINANCE_TEAM' THEN 'NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR'
        WHEN role = 'PROJECT_MANAGER' THEN 'NAVIRA_PLATFORM_OPERATIONS_MANAGER'
        WHEN role = 'PROJECT_COORDINATOR' THEN 'NAVIRA_CLIENT_IMPLEMENTATION_COORDINATOR'
        WHEN role = 'PLATFORM_COMPLIANCE' THEN 'NAVIRA_PLATFORM_COMPLIANCE_OFFICER'
        WHEN role = 'SECURITY_ADMINISTRATOR' THEN 'NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR'
        WHEN role = 'SUPPORT_ENGINEER' THEN 'NAVIRA_CUSTOMER_SUPPORT_ENGINEER'
        WHEN role = 'PLATFORM_AUDITOR' THEN 'NAVIRA_PLATFORM_AUDITOR'
        WHEN role = 'COORDINATOR' THEN 'TRANSPORT_COORDINATOR'
        WHEN role = 'SUB_ADMIN' THEN 'TRANSPORT_SUB_ADMIN'
        WHEN role = 'SENIOR_MGR' THEN 'SENIOR_MANAGER'
        WHEN role = 'ASST_MANAGER' THEN 'ASSISTANT_MANAGER'
        WHEN role = 'VENDOR' THEN 'VENDOR_ADMIN'
        WHEN role = 'ADMIN' THEN 'TRANSPORT_ADMIN'
        WHEN role = 'FINANCE' THEN 'NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR'
        WHEN role = 'COMPLIANCE' THEN 'NAVIRA_PLATFORM_COMPLIANCE_OFFICER'
        WHEN role = 'SECURITY_ADMIN' THEN 'NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR'
        WHEN role = 'SUPPORT' THEN 'NAVIRA_CUSTOMER_SUPPORT_ENGINEER'
        WHEN role = 'AUDITOR' THEN 'NAVIRA_PLATFORM_AUDITOR'
        ELSE role
    END
    WHERE role IN (
        'MOVE_IN_ADMIN', 'SAAS_OWNER', 'MOVEINSYNC_OWNER', 'SUPER_ADMIN', 'FINANCE_TEAM',
        'PROJECT_MANAGER', 'PROJECT_COORDINATOR', 'PLATFORM_COMPLIANCE', 'SECURITY_ADMINISTRATOR',
        'SUPPORT_ENGINEER', 'PLATFORM_AUDITOR', 'COORDINATOR', 'SUB_ADMIN', 'SENIOR_MGR',
        'ASST_MANAGER', 'VENDOR', 'ADMIN', 'FINANCE', 'COMPLIANCE', 'SECURITY_ADMIN', 'SUPPORT', 'AUDITOR'
    )
  `);
  console.log(`  Updated ${cmResult} CompanyMembership records`);

  // 2. Update PlatformRoleAssignment records
  console.log('2. Updating PlatformRoleAssignment records...');
  const praResult = await prisma.$executeRawUnsafe(`
    UPDATE "PlatformRoleAssignment"
    SET role = CASE
        WHEN role = 'SUPERADMIN' THEN 'NAVIRA_PLATFORM_ADMINISTRATOR'
        WHEN role = 'FINANCE' THEN 'NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR'
        WHEN role = 'PROJECT_MANAGER' THEN 'NAVIRA_PLATFORM_OPERATIONS_MANAGER'
        WHEN role = 'PROJECT_COORDINATOR' THEN 'NAVIRA_CLIENT_IMPLEMENTATION_COORDINATOR'
        WHEN role = 'COMPLIANCE' THEN 'NAVIRA_PLATFORM_COMPLIANCE_OFFICER'
        WHEN role = 'SECURITY_ADMIN' THEN 'NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR'
        WHEN role = 'SUPPORT' THEN 'NAVIRA_CUSTOMER_SUPPORT_ENGINEER'
        WHEN role = 'AUDITOR' THEN 'NAVIRA_PLATFORM_AUDITOR'
        ELSE role
    END
    WHERE role IN ('SUPERADMIN', 'FINANCE', 'PROJECT_MANAGER', 'PROJECT_COORDINATOR', 'COMPLIANCE', 'SECURITY_ADMIN', 'SUPPORT', 'AUDITOR')
  `);
  console.log(`  Updated ${praResult} PlatformRoleAssignment records`);

  // 3. Update UserRole records (old enum values)
  console.log('3. Updating UserRole records...');
  const urResult = await prisma.$executeRawUnsafe(`
    UPDATE "UserRole"
    SET role = CASE
        WHEN role = 'TRANSPORT_COMPLIANCE' THEN 'SECURITY_ADMIN'
        WHEN role = 'SENIOR_MANAGER' THEN 'MANAGER'
        WHEN role = 'ASSISTANT_MANAGER' THEN 'MANAGER'
        ELSE role
    END
    WHERE role IN ('TRANSPORT_COMPLIANCE', 'SENIOR_MANAGER', 'ASSISTANT_MANAGER')
  `);
  console.log(`  Updated ${urResult} UserRole records`);

  // 4. Set security domain and identity type on Users
  console.log('4. Setting security metadata on User records...');
  await prisma.$executeRawUnsafe(`
    UPDATE "User"
    SET "securityDomain" = 'NAVIRA_INTERNAL', "identityType" = 'NAVIRA_EMPLOYEE'
    WHERE id IN (
        SELECT u.id FROM "User" u
        INNER JOIN "PlatformRoleAssignment" p ON u.id = p."userId"
        WHERE p.role LIKE 'NAVIRA_%'
        AND u."securityDomain" IS NULL
    )
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "User"
    SET "securityDomain" = 'VENDOR_EXTERNAL', "identityType" = 'VENDOR_USER'
    WHERE id IN (
        SELECT u.id FROM "User" u
        INNER JOIN "CompanyMembership" cm ON u.id = cm."userId"
        WHERE cm.status = 'ACTIVE'
        AND cm.role LIKE 'VENDOR_%'
        AND u."securityDomain" IS NULL
    )
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "User"
    SET "securityDomain" = 'DRIVER_EXTERNAL', "identityType" = 'DRIVER'
    WHERE id IN (
        SELECT u.id FROM "User" u
        INNER JOIN "CompanyMembership" cm ON u.id = cm."userId"
        WHERE cm.status = 'ACTIVE'
        AND cm.role = 'DRIVER'
        AND u."securityDomain" IS NULL
    )
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "User"
    SET "securityDomain" = 'GUARD_EXTERNAL', "identityType" = 'GUARD'
    WHERE id IN (
        SELECT u.id FROM "User" u
        INNER JOIN "CompanyMembership" cm ON u.id = cm."userId"
        WHERE cm.status = 'ACTIVE'
        AND cm.role = 'GUARD'
        AND u."securityDomain" IS NULL
    )
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "User"
    SET "securityDomain" = 'CUSTOMER_INTERNAL', "identityType" = 'CUSTOMER_USER'
    WHERE "securityDomain" IS NULL
  `);

  console.log('  Security metadata set');

  // 5. Verify
  console.log('\n=== Verification ===');

  const [cmLegacy] = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int as count FROM "CompanyMembership"
    WHERE role IN ('MOVE_IN_ADMIN', 'SAAS_OWNER', 'MOVEINSYNC_OWNER', 'SUPER_ADMIN', 'FINANCE_TEAM',
                   'PROJECT_MANAGER', 'PROJECT_COORDINATOR', 'PLATFORM_COMPLIANCE', 'SECURITY_ADMINISTRATOR',
                   'SUPPORT_ENGINEER', 'PLATFORM_AUDITOR', 'COORDINATOR', 'SUB_ADMIN', 'SENIOR_MGR',
                   'ASST_MANAGER', 'VENDOR', 'ADMIN', 'FINANCE', 'COMPLIANCE', 'SECURITY_ADMIN', 'SUPPORT', 'AUDITOR')
  `) as any[];
  console.log(`  Legacy roles in CompanyMembership: ${cmLegacy.count}`);

  const [praLegacy] = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int as count FROM "PlatformRoleAssignment"
    WHERE role IN ('SUPERADMIN', 'FINANCE', 'PROJECT_MANAGER', 'PROJECT_COORDINATOR', 'COMPLIANCE', 'SECURITY_ADMIN', 'SUPPORT', 'AUDITOR')
  `) as any[];
  console.log(`  Legacy roles in PlatformRoleAssignment: ${praLegacy.count}`);

  const [userNoDomain] = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int as count FROM "User" WHERE "securityDomain" IS NULL
  `) as any[];
  console.log(`  Users without securityDomain: ${userNoDomain.count}`);

  console.log('\n=== Migration Complete ===');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

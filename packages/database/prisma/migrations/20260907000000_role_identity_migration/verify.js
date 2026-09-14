const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:Shubham%40810@localhost:5432/moveflow?schema=public',
  });
  await client.connect();
  console.log('=== Post-Migration Verification ===\n');

  // 1. Verify no legacy values remain in any table
  console.log('1. Legacy value check...');
  const legacyCheck = await client.query(`
    SELECT 'CompanyMembership' as tbl, role::text as val, COUNT(*)::int as cnt
    FROM "CompanyMembership"
    WHERE role::text IN ('TRANSPORT_COMPLIANCE', 'SENIOR_MANAGER', 'ASSISTANT_MANAGER')
    GROUP BY role
    UNION ALL
    SELECT 'PlatformRoleAssignment', role::text, COUNT(*)
    FROM "PlatformRoleAssignment"
    WHERE role::text IN ('SUPERADMIN', 'FINANCE', 'PROJECT_MANAGER', 'PROJECT_COORDINATOR', 'COMPLIANCE', 'SECURITY_ADMIN', 'SUPPORT', 'AUDITOR')
    GROUP BY role
  `);
  if (legacyCheck.rows.length === 0) {
    console.log('  PASS: No legacy values found');
  } else {
    console.log('  FAIL:');
    legacyCheck.rows.forEach(r => console.log(`    ${r.tbl}.${r.val}: ${r.cnt}`));
  }

  // 2. Verify all users have security metadata
  console.log('\n2. User security metadata completeness...');
  const noDomain = await client.query(`SELECT COUNT(*)::int as count FROM "User" WHERE "securityDomain" IS NULL`);
  const noType = await client.query(`SELECT COUNT(*)::int as count FROM "User" WHERE "identityType" IS NULL`);
  console.log(`  Users without securityDomain: ${noDomain.rows[0].count}`);
  console.log(`  Users without identityType: ${noType.rows[0].count}`);

  // 3. Verify enum state
  console.log('\n3. Enum state...');
  const roleEnum = await client.query(`
    SELECT COUNT(*)::int as count FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'UserRole'
  `);
  const platformEnum = await client.query(`
    SELECT COUNT(*)::int as count FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'PlatformRole'
  `);
  console.log(`  UserRole enum: ${roleEnum.rows[0].count} values`);
  console.log(`  PlatformRole enum: ${platformEnum.rows[0].count} values`);

  // 4. Show User security metadata distribution
  console.log('\n4. User security metadata:');
  const users = await client.query(`
    SELECT "securityDomain", "identityType", COUNT(*)::int as count
    FROM "User"
    GROUP BY "securityDomain", "identityType"
    ORDER BY "securityDomain"
  `);
  users.rows.forEach(r => console.log(`  ${r.securityDomain || 'NULL'} / ${r.identityType || 'NULL'}: ${r.count}`));

  // 5. Verify new tables exist
  console.log('\n5. New tables...');
  const rhCheck = await client.query(`
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'RoleHierarchy')::bool as exists
  `);
  const rrCheck = await client.query(`
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'RoleResponsibility')::bool as exists
  `);
  console.log(`  RoleHierarchy: ${rhCheck.rows[0].exists ? 'EXISTS' : 'MISSING'}`);
  console.log(`  RoleResponsibility: ${rrCheck.rows[0].exists ? 'EXISTS' : 'MISSING'}`);

  console.log('\n=== All Checks Complete ===');
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); }).finally(() => client?.end());

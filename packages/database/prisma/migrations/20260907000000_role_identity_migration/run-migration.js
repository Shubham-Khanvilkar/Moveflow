const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:Shubham%40810@localhost:5432/moveflow?schema=public',
  });
  await client.connect();
  console.log('Connected to PostgreSQL\n');
  console.log('=== Role Data Migration ===\n');

  // Step 1: Add new enum values that don't exist yet (needed for migration targets)
  console.log('1. Adding new enum values to UserRole...');
  const newValues = [
    'SECURITY_ADMIN', 'AUDITOR', 'COMPLIANCE_OFFICER', 'FINANCE_ADMIN', 'FINANCE_APPROVER',
    'FINANCE_VIEWER', 'COST_ANALYST', 'REPORTING_ADMIN', 'PROCESS_HEAD', 'PROCESS_ADMIN',
    'SITE_ADMIN', 'SITE_TRANSPORT_ADMIN', 'SITE_SECURITY_ADMIN', 'FACILITY_MANAGER',
    'SITE_OPERATIONS_MANAGER', 'SHIFT_SUPERVISOR', 'TRAVEL_DESK_AGENT', 'TRANSPORT_HELPDESK_AGENT',
    'BOOKING_COORDINATOR', 'EXECUTIVE_ASSISTANT_BOOKER', 'EVACUATION_COORDINATOR',
    'COMPANY_SUB_ADMIN', 'TRANSPORT_HEAD', 'CONTROL_ROOM_OPERATOR', 'ROSTER_ADMIN',
    'ROSTER_PLANNER', 'ROUTE_ADMIN', 'FLEET_MANAGER', 'SAFETY_ADMIN', 'FEMALE_TRANSPORT_ADMIN',
    'EMERGENCY_RESPONSE_OFFICER', 'INCIDENT_MANAGER', 'VENDOR_MANAGER', 'VENDOR_COMPLIANCE_MANAGER',
    'VENDOR_SUB_ADMIN', 'VENDOR_OPERATIONS_MANAGER', 'VENDOR_FLEET_MANAGER', 'VENDOR_DRIVER_MANAGER',
    'VENDOR_FINANCE', 'VENDOR_COORDINATOR', 'VENDOR_VIEWER', 'DRIVER_SUPERVISOR', 'GUARD_SUPERVISOR',
    'MANAGER', 'SECURITY_ADMINISTRATOR',
  ];

  for (const val of newValues) {
    try {
      await client.query(`ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS '${val}'`);
    } catch (e) {
      // Value already exists, skip
    }
  }
  console.log('  Done');

  // Step 2: Migrate the remaining TRANSPORT_COMPLIANCE record
  console.log('\n2. Migrating TRANSPORT_COMPLIANCE → SECURITY_ADMIN...');
  const r3 = await client.query(`
    UPDATE "CompanyMembership"
    SET role = 'SECURITY_ADMIN'::"UserRole"
    WHERE role::text = 'TRANSPORT_COMPLIANCE'
  `);
  console.log(`  Updated ${r3.rowCount} rows`);

  // Step 3: Verify no dropped values remain
  console.log('\n3. Verification...');
  const check = await client.query(`
    SELECT role::text, COUNT(*)::int as count
    FROM "CompanyMembership"
    WHERE role::text IN ('ASSISTANT_MANAGER', 'SENIOR_MANAGER', 'TRANSPORT_COMPLIANCE')
    GROUP BY role
  `);
  if (check.rows.length === 0) {
    console.log('  No remaining references to dropped values - safe to proceed');
  } else {
    console.log('  WARNING:');
    check.rows.forEach(r => console.log(`    ${r.role}: ${r.count}`));
  }

  // Step 4: Show final distribution
  console.log('\n4. Final CompanyMembership.role distribution:');
  const dist = await client.query(`
    SELECT role::text, COUNT(*)::int as count
    FROM "CompanyMembership"
    GROUP BY role
    ORDER BY count DESC
  `);
  dist.rows.forEach(r => console.log(`  ${r.role}: ${r.count}`));

  // Step 5: Check UserRole enum size
  const enumCount = await client.query(`
    SELECT COUNT(*)::int as count FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'UserRole'
  `);
  console.log(`\nUserRole enum now has ${enumCount.rows[0].count} values`);

  // Step 6: Check User security metadata
  const users = await client.query(`
    SELECT "securityDomain", COUNT(*)::int as count
    FROM "User"
    GROUP BY "securityDomain"
    ORDER BY "securityDomain"
  `);
  console.log('\nUser security metadata:');
  users.rows.forEach(r => console.log(`  ${r.securityDomain || 'NULL'}: ${r.count}`));

  console.log('\n=== Migration Complete ===');
  console.log('Safe to run: prisma db push --accept-data-loss');
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); }).finally(() => client?.end());

const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:Shubham%40810@localhost:5432/moveflow?schema=public',
  });
  await client.connect();

  // List all current UserRole enum values
  const vals = await client.query(`
    SELECT e.enumlabel::text
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'UserRole'
    ORDER BY e.enumsortorder
  `);
  console.log('Current UserRole enum (' + vals.rows.length + '):');
  vals.rows.forEach(r => console.log('  ' + r.enumlabel));

  // Check TRANSPORT_COMPLIANCE usage
  const tc = await client.query(`
    SELECT role::text, COUNT(*)::int as count FROM "CompanyMembership"
    WHERE role::text = 'TRANSPORT_COMPLIANCE'
    GROUP BY role
  `);
  console.log('\nTRANSPORT_COMPLIANCE usage:', tc.rows);

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => client?.end());

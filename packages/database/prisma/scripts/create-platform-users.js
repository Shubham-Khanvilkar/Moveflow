/**
 * Create Platform Internal Users via Supabase Auth API
 * 
 * This script creates users in Supabase Auth with proper password hashing.
 * The SQL migration (20260915-add-platform-users.sql) handles the Prisma records.
 * 
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/create-platform-users.js
 * 
 * Prerequisites:
 *   - Run the SQL migration first to create the User, UserRoleAssignment, CompanyMembership records
 *   - This script only creates the Supabase Auth entries for password verification
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   SUPABASE_URL=https://xxx.supabase.co');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=xxx');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PLATFORM_PASSWORD = 'Navira@2026';
const ACME_PASSWORD = 'Admin@2026';

const platformUsers = [
  { email: 'owner@navira.com',          name: 'Navira Owner',           role: 'SUPER_ADMIN', companyId: 'comp_navira_001' },
  { email: 'admin@navira.com',          name: 'Move-In Admin',          role: 'SUPER_ADMIN', companyId: 'comp_navira_001' },
  { email: 'superadmin@navira.com',     name: 'Platform Super Admin',   role: 'SUPER_ADMIN', companyId: 'comp_navira_001' },
  { email: 'finance@navira.com',        name: 'Finance Team',           role: 'SUPER_ADMIN', companyId: 'comp_navira_001' },
  { email: 'pm@navira.com',             name: 'Project Manager',        role: 'SUPER_ADMIN', companyId: 'comp_navira_001' },
  { email: 'coordinator@navira.com',    name: 'Project Coordinator',    role: 'SUPER_ADMIN', companyId: 'comp_navira_001' },
  { email: 'compliance@navira.com',     name: 'Platform Compliance',    role: 'SUPER_ADMIN', companyId: 'comp_navira_001' },
  { email: 'security@navira.com',       name: 'Security Administrator', role: 'SUPER_ADMIN', companyId: 'comp_navira_001' },
  { email: 'support@navira.com',        name: 'Support Engineer',       role: 'SUPER_ADMIN', companyId: 'comp_navira_001' },
  { email: 'auditor@navira.com',        name: 'Platform Auditor',       role: 'SUPER_ADMIN', companyId: 'comp_navira_001' },
];

const missingUsers = [
  { email: 'subadmin@acme.com',         name: 'Transport Sub-Admin',    role: 'TRANSPORT_SUB_ADMIN', companyId: 'comp_acme_001', password: ACME_PASSWORD },
  { email: 'vendor.dispatcher@acme.com', name: 'Vendor Dispatcher',     role: 'VENDOR_DISPATCHER',   companyId: 'comp_acme_001', password: ACME_PASSWORD },
];

async function createUser(userData) {
  const { email, name, role, companyId, password } = userData;
  const pwd = password || PLATFORM_PASSWORD;

  try {
    // Check if user already exists
    const { data: existing } = await supabase.auth.admin.listUsers({ filter: email });
    if (existing?.users?.find(u => u.email === email)) {
      console.log(`  ⏭️  ${email} already exists in Supabase Auth, skipping`);
      return;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: pwd,
      email_confirm: true,
      app_metadata: { companyId, role },
      user_metadata: { name },
    });

    if (error) {
      console.error(`  ❌ ${email}: ${error.message}`);
    } else {
      console.log(`  ✅ ${email} created in Supabase Auth`);
    }
  } catch (e) {
    console.error(`  ❌ ${email}: ${e.message}`);
  }
}

async function main() {
  console.log('🔗 Creating Platform Internal Users in Supabase Auth...');
  for (const user of platformUsers) {
    await createUser(user);
  }

  console.log('\n🔗 Creating Missing Users in Supabase Auth...');
  for (const user of missingUsers) {
    await createUser(user);
  }

  console.log('\n✅ Supabase Auth user creation complete!');
  console.log('   Verify by logging in with any of these emails.');
}

main().catch(console.error);

import { seedPlatformRoles } from './01-platform-roles';
import { seedCustomerRoles } from './02-customer-roles';
import { seedVendorRoles } from './03-vendor-roles';
import { seedDriverGuardRoles } from './04-driver-guard-roles';
import { seedDemoUsers } from './05-demo-users';
import { seedPermissions } from './06-permissions';

/**
 * Main seed orchestrator
 * Runs all canonical seed files in order
 *
 * Usage:
 *   npx prisma db seed
 *
 * Or directly:
 *   ts-node packages/database/prisma/seed/index.ts
 */

async function main() {
  console.log('=== NAVIRA Canonical Seed ===');
  console.log('Starting seed migration...\n');

  try {
    // 1. Seed permissions first (referenced by roles)
    await seedPermissions();
    console.log('');

    // 2. Seed platform roles (NAVIRA internal)
    await seedPlatformRoles();
    console.log('');

    // 3. Seed customer roles
    await seedCustomerRoles();
    console.log('');

    // 4. Seed vendor roles
    await seedVendorRoles();
    console.log('');

    // 5. Seed driver/guard roles
    await seedDriverGuardRoles();
    console.log('');

    // 6. Seed demo users (with role assignments)
    await seedDemoUsers();
    console.log('');

    console.log('=== Seed Complete ===');
    console.log('All canonical roles, permissions, and demo users have been seeded.');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

main();

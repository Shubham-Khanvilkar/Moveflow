import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning database...');
  const tables = [
    'EmergencySystemContact', 'AuditLog', 'UserRoleAssignment', 'AccessScope',
    'ManagerRelationship', 'NoShowPolicyConfig', 'TransportPolicy', 'Route',
    'Vehicle', 'DriverProfile', 'RolePermission', 'Permission', 'Role',
    'Shift', 'OrgProcess', 'LineOfBusiness', 'CompanySite', 'Region',
    'CostCenter', 'Department', 'BusinessUnit', 'User', 'Company',
    'Session', 'ApiKey', 'CompanyMembership', 'Invitation',
    'ApprovalLevelConfig', 'RolePermissionConfig',
  ];
  for (const t of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${t}" CASCADE`);
      console.log(`  ✅ ${t}`);
    } catch (e: any) {
      console.log(`  ⏭ ${t}: ${e.message?.substring(0, 80)}`);
    }
  }
  console.log('🧹 Cleanup done');
}

main().catch(console.error).finally(() => prisma.$disconnect());

/**
 * Canonical NAVIRA role model seed (idempotent).
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const NAVIRA_ROLES = [
  { name: 'NAVIRA_OWNER', display: 'Navira Owner', level: 100 },
  { name: 'NAVIRA_PLATFORM_ADMINISTRATOR', display: 'Platform Administrator', level: 90 },
  { name: 'NAVIRA_PLATFORM_OPERATIONS_MANAGER', display: 'Platform Operations Manager', level: 80 },
  { name: 'NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR', display: 'Platform Finance Administrator', level: 80 },
  { name: 'NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR', display: 'Security & Identity Administrator', level: 80 },
  { name: 'NAVIRA_PLATFORM_COMPLIANCE_OFFICER', display: 'Platform Compliance Officer', level: 70 },
  { name: 'NAVIRA_PLATFORM_AUDITOR', display: 'Platform Auditor', level: 70 },
  { name: 'NAVIRA_INTEGRATION_API_ADMINISTRATOR', display: 'Integration & API Administrator', level: 70 },
  { name: 'NAVIRA_CLIENT_SUCCESS_MANAGER', display: 'Client Success Manager', level: 60 },
  { name: 'NAVIRA_CLIENT_IMPLEMENTATION_COORDINATOR', display: 'Client Implementation Coordinator', level: 60 },
  { name: 'NAVIRA_CUSTOMER_SUPPORT_ENGINEER', display: 'Customer Support Engineer', level: 50 },
];

const DOMAIN_FIXES = {
  VENDOR_ADMIN: 'VENDOR_EXTERNAL',
  VENDOR_DISPATCHER: 'VENDOR_EXTERNAL',
  DRIVER: 'DRIVER_EXTERNAL',
  GUARD: 'GUARD_EXTERNAL',
};

async function main() {
  for (const r of NAVIRA_ROLES) {
    await prisma.role.upsert({
      where: { name: r.name },
      update: { displayName: r.display, hierarchyLevel: r.level, securityDomain: 'NAVIRA_INTERNAL', isActive: true },
      create: { name: r.name, displayName: r.display, hierarchyLevel: r.level, securityDomain: 'NAVIRA_INTERNAL', isActive: true, description: 'Canonical NAVIRA internal role' },
    });
  }
  console.log(`Ensured ${NAVIRA_ROLES.length} NAVIRA_ canonical roles`);

  for (const [name, domain] of Object.entries(DOMAIN_FIXES)) {
    await prisma.role.updateMany({ where: { name }, data: { securityDomain: domain } });
  }
  console.log('External role security domains corrected');

  const ownerRole = await prisma.role.findUnique({ where: { name: 'NAVIRA_OWNER' } });
  const adminRole = await prisma.role.findUnique({ where: { name: 'NAVIRA_PLATFORM_ADMINISTRATOR' } });

  const owners = [
    { id: 'user_saas_owner_001', email: 'saas.owner@moveinsync.com', role: adminRole },
    { id: 'user_mis_owner_001', email: 'owner@moveinsync.com', role: ownerRole },
  ];

  for (const o of owners) {
    await prisma.user.update({
      where: { email: o.email },
      data: { securityDomain: 'NAVIRA_INTERNAL', identityType: 'NAVIRA_EMPLOYEE', primaryRoleId: o.role.id },
    });
    const ura = await prisma.userRoleAssignment.findFirst({ where: { userId: o.id, roleId: o.role.id } });
    if (!ura) await prisma.userRoleAssignment.create({ data: { userId: o.id, roleId: o.role.id, scope: 'ALL' } });
    const pra = await prisma.platformRoleAssignment.findFirst({ where: { userId: o.id, isActive: true } });
    if (!pra) {
      await prisma.platformRoleAssignment.create({ data: { userId: o.id, role: o.role.name, assignedBy: 'seed-canonical', isActive: true } });
    } else {
      await prisma.platformRoleAssignment.update({ where: { id: pra.id }, data: { role: o.role.name } });
    }
    console.log(`${o.email} -> ${o.role.name} (NAVIRA_INTERNAL)`);
  }

  const perms = await prisma.permission.findMany();
  for (const perm of perms) {
    const exists = await prisma.rolePermission.findFirst({ where: { roleId: ownerRole.id, permissionId: perm.id } });
    if (!exists) await prisma.rolePermission.create({ data: { roleId: ownerRole.id, permissionId: perm.id } });
  }
  console.log(`Attached ${perms.length} permissions to NAVIRA_OWNER`);
}

main().catch(e => { console.error('Seed failed:', e.message); process.exit(1); }).finally(() => prisma.$disconnect());

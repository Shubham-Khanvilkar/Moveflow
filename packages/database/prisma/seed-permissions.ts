/**
 * Expand the Permission catalogue to cover every module/action pair referenced
 * by @RequirePermissions in controllers, then grant them to the operational
 * admin roles (TRANSPORT_ADMIN, and the seeded owner tier) via
 * RolePermissionConfig. Idempotent.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// module -> actions referenced across @RequirePermissions usages
const CATALOGUE = {
  employee: ['view', 'create', 'edit', 'delete', 'import', 'export', 'onboard', 'offboard'],
  schedule: ['view', 'create', 'edit', 'delete', 'import', 'export', 'publish'],
  vehicle: ['view', 'create', 'edit', 'delete', 'assign', 'maintenance', 'documents'],
  billing: ['view', 'create', 'edit', 'approve', 'export', 'reconcile', 'ratecard'],
  team: ['view', 'create', 'edit', 'delete'],
  document: ['view', 'upload', 'verify', 'reject', 'download', 'delete'],
  tracking: ['view', 'manage', 'history'],
  report: ['view', 'create', 'export', 'schedule'],
  notification: ['view', 'create', 'send'],
  booking: ['view', 'create', 'edit', 'cancel', 'approve'],
  vehicle_type: ['view', 'create', 'edit', 'delete'],
  geofence: ['view', 'create', 'edit', 'delete'],
  live_status: ['view', 'manage'],
  dashboard: ['view'],
  trip: ['view', 'create', 'edit', 'cancel', 'assign'],
  driver: ['view', 'create', 'edit', 'assign', 'documents'],
  noshow: ['view', 'manage'],
  safety: ['view', 'manage'],
  audit: ['view', 'export'],
  admin: ['manage_roles', 'manage_access'],
};

const GRANT_ROLES = ['TRANSPORT_ADMIN', 'SAAS_OWNER', 'MOVEINSYNC_OWNER', 'SUPER_ADMIN'];

async function main() {
  const company = await prisma.company.findFirst({ where: { code: 'ACME001' } });
  if (!company) throw new Error('ACME001 company not found');

  // 1. Ensure every catalogue permission exists. RolePermissionConfig links to
  //    PermissionDefinition (code-keyed), while auth's permission merge reads
  //    Permission (module+action). We create BOTH for every catalogue entry.
  const defIds = [];
  for (const [mod, actions] of Object.entries(CATALOGUE)) {
    for (const action of actions) {
      const name = `${mod}:${action}`;
      const perm = await prisma.permission.findFirst({ where: { name } });
      if (!perm) {
        await prisma.permission.create({
          data: { name, module: mod.toUpperCase(), action },
        });
        defIds.push(name);
      }
      const def = await prisma.permissionDefinition.findFirst({ where: { code: name } });
      if (!def) {
        await prisma.permissionDefinition.create({
          data: { code: name, module: mod, action, description: name },
        });
      }
    }
  }
  console.log(`Permission catalogue ensured (Permission + PermissionDefinition)`);

  // 2. Ensure TransportAccessRole records exist for GRANT_ROLES
  for (const roleName of GRANT_ROLES) {
    const existing = await prisma.transportAccessRole.findFirst({
      where: { roleName, companyId: company.id },
    });
    if (!existing) {
      await prisma.transportAccessRole.create({
        data: {
          companyId: company.id,
          roleName,
          displayName: roleName.replace(/_/g, ' '),
          hierarchyLevel: roleName === 'TRANSPORT_ADMIN' ? 40 : 100,
          isActive: true,
        },
      });
    }
  }
  console.log('Owner/admin roles ensured');

  // 3. Grant all PermissionDefinition entries to each grant role via RolePermissionConfig
  const allDefs = await prisma.permissionDefinition.findMany();
  let granted = 0;
  for (const roleName of GRANT_ROLES) {
    const role = await prisma.transportAccessRole.findFirst({
      where: { roleName, companyId: company.id },
    });
    if (!role) continue;
    for (const def of allDefs) {
      const rpc = await prisma.rolePermissionConfig.findFirst({
        where: { roleId: role.id, permissionId: def.id, companyId: company.id },
      });
      if (!rpc) {
        await prisma.rolePermissionConfig.create({
          data: { roleId: role.id, permissionId: def.id, companyId: company.id, enabled: true },
        });
        granted++;
      }
    }
  }
  console.log(`Granted ${granted} role-permission links across ${GRANT_ROLES.length} roles`);

  // 4. Make sure admin@acme.com holds TRANSPORT_ADMIN with the full set
  const admin = await prisma.user.findUnique({ where: { email: 'admin@acme.com' } });
  if (admin) {
    const role = await prisma.transportAccessRole.findFirst({
      where: { roleName: 'TRANSPORT_ADMIN', companyId: company.id },
    });
    const existing = await prisma.transportAccessAssignment.findFirst({
      where: { userId: admin.id, roleId: role.id, companyId: company.id },
    });
    if (!existing) {
      await prisma.transportAccessAssignment.create({
        data: {
          userId: admin.id, roleId: role.id, companyId: company.id,
          isActive: true, assignedBy: 'seed-script',
        },
      });
      console.log('TRANSPORT_ADMIN assignment added for admin@acme.com');
    } else {
      console.log('admin@acme.com already holds TRANSPORT_ADMIN');
    }
  }
}

main()
  .catch((e) => { console.error('Seed failed:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());

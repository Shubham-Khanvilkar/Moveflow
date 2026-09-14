/**
 * Seed SAAS_OWNER and MOVEINSYNC_OWNER users per V13 spec sections 3.1–3.3.
 * Idempotent: safe to run repeatedly.
 *
 * Owners authenticate through the local bcrypt fallback (SUPABASE_URL absent).
 * Passwords below are development defaults — rotate in production.
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const OWNERS = [
  {
    id: 'user_saas_owner_001',
    email: 'saas.owner@moveinsync.com',
    name: 'SaaS Owner',
    phone: '+919900000001',
    roleName: 'SAAS_OWNER',
    roleDisplayName: 'SaaS Owner (Highest Governance)',
    hierarchyLevel: 100,
    password: 'SaaS@Owner2026',
  },
  {
    id: 'user_mis_owner_001',
    email: 'owner@moveinsync.com',
    name: 'Navira Owner',
    phone: '+919900000002',
    roleName: 'MOVEINSYNC_OWNER',
    roleDisplayName: 'Navira Business Owner',
    hierarchyLevel: 95,
    password: 'MisOwner@2026',
  },
];

async function main() {
  // Acme is the reference tenant; owners sit above all tenants
  const company = await prisma.company.findFirst({
    where: { code: 'ACME001' },
  });
  if (!company) throw new Error('Reference company ACME001 not found — run base seed first');

  // Ensure the global Role records exist
  const globalRole = await prisma.role.findFirst({ where: { name: 'SUPER_ADMIN' } });
  if (!globalRole) throw new Error('SUPER_ADMIN role not found — run base seed first');

  const allPermissions = await prisma.permission.findMany();

  for (const o of OWNERS) {
    const pw = await bcrypt.hash(o.password, 12);

    // Owner identity in the main User table
    const user = await prisma.user.upsert({
      where: { email: o.email },
      update: { passwordHash: pw, status: 'ACTIVE', name: o.name, phone: o.phone },
      create: {
        id: o.id,
        companyId: company.id,
        email: o.email,
        name: o.name,
        passwordHash: pw,
        phone: o.phone,
        status: 'ACTIVE',
        passwordChangedAt: new Date(),
      },
    });

    // TransportAccessRole for the owner tier (legacy role system used by auth)
    let ownerRole = await prisma.transportAccessRole.findFirst({
      where: { roleName: o.roleName, companyId: company.id },
    });
    if (ownerRole) {
      ownerRole = await prisma.transportAccessRole.update({
        where: { id: ownerRole.id },
        data: { displayName: o.roleDisplayName, hierarchyLevel: o.hierarchyLevel, isActive: true },
      });
    } else {
      ownerRole = await prisma.transportAccessRole.create({
        data: {
          companyId: company.id,
          roleName: o.roleName,
          displayName: o.roleDisplayName,
          hierarchyLevel: o.hierarchyLevel,
          description: `${o.roleDisplayName} — owner-tier governance per V13 section 3`,
          isActive: true,
        },
      });
    }

    // Active role assignment
    const existingAssignment = await prisma.transportAccessAssignment.findFirst({
      where: { userId: user.id, roleId: ownerRole.id, companyId: company.id },
    });
    if (existingAssignment) {
      await prisma.transportAccessAssignment.update({
        where: { id: existingAssignment.id },
        data: { isActive: true },
      });
    } else {
      await prisma.transportAccessAssignment.create({
        data: {
          userId: user.id,
          roleId: ownerRole.id,
          companyId: company.id,
          isActive: true,
          assignedAt: new Date(),
          assignedBy: 'seed-script',
        } as any,
      });
    }

    // Company membership so tenant resolution works
    const membership = await prisma.companyMembership.findFirst({
      where: { userId: user.id, companyId: company.id },
    });
    if (membership) {
      await prisma.companyMembership.update({
        where: { id: membership.id },
        data: { status: 'ACTIVE', role: 'NAVIRA_OWNER' },
      });
    } else {
      await prisma.companyMembership.create({
        data: { userId: user.id, companyId: company.id, role: 'NAVIRA_OWNER', status: 'ACTIVE' },
      });
    }

    // UserRoleAssignment in the new role system (link to SUPER_ADMIN role record)
    const ura = await prisma.userRoleAssignment.findFirst({
      where: { userId: user.id, roleId: globalRole.id },
    });
    if (!ura) {
      await prisma.userRoleAssignment.create({
        data: { userId: user.id, roleId: globalRole.id, scope: 'ALL' },
      });
    }

    // ALL_FUNCTIONAL_PERMISSIONS: attach every permission to the owner's role
    for (const perm of allPermissions) {
      const rp = await prisma.rolePermission.findFirst({
        where: { roleId: globalRole.id, permissionId: perm.id },
      });
      if (!rp) {
        await prisma.rolePermission.create({
          data: { roleId: globalRole.id, permissionId: perm.id },
        });
      }
    }

    // Audit event
    await prisma.auditLog.create({
      data: {
        companyId: company.id,
        userId: user.id,
        action: 'OWNER_IDENTITY_SEEDED',
        entity: 'User',
        entityId: user.id,
        newValue: JSON.stringify({ role: o.roleName, email: o.email, hierarchyLevel: o.hierarchyLevel }),
      },
    });

    console.log(`✅ ${o.roleName}: ${o.email} (user ${user.id})`);
  }

  console.log(`\nAttached ${allPermissions.length} permissions to SUPER_ADMIN role record (ALL_FUNCTIONAL_PERMISSIONS)`);
  console.log('\nOwner credentials (development defaults — rotate in production):');
  for (const o of OWNERS) console.log(`  ${o.roleName}: ${o.email} / ${o.password}`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

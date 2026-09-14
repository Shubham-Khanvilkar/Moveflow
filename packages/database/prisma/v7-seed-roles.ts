import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding V7 roles and users...');

  const pw = await bcrypt.hash('Admin@123', 12);
  const companyId = 'comp_acme_001';

  // ─── 1. Create 25 Role records ───────────────────────────
  const roleDefs = [
    // PLATFORM INTERNAL (9)
    { id: 'role_superadmin', name: 'SUPER_ADMIN', description: 'Platform super administrator' },
    { id: 'role_moveinadmin', name: 'MOVE_IN_ADMIN', description: 'MoveIn platform admin' },
    { id: 'role_finance_team', name: 'FINANCE_TEAM', description: 'Platform finance team' },
    { id: 'role_project_manager', name: 'PROJECT_MANAGER', description: 'Platform project manager' },
    { id: 'role_project_coord', name: 'PROJECT_COORDINATOR', description: 'Platform project coordinator' },
    { id: 'role_platform_compliance', name: 'PLATFORM_COMPLIANCE', description: 'Platform compliance officer' },
    { id: 'role_security_admin', name: 'SECURITY_ADMINISTRATOR', description: 'Platform security admin' },
    { id: 'role_support_engineer', name: 'SUPPORT_ENGINEER', description: 'Platform support engineer' },
    { id: 'role_platform_auditor', name: 'PLATFORM_AUDITOR', description: 'Platform auditor' },
    // CUSTOMER (11)
    { id: 'role_transport_admin', name: 'TRANSPORT_ADMIN', description: 'Company transport administrator' },
    { id: 'role_transport_subadmin', name: 'TRANSPORT_SUB_ADMIN', description: 'Company transport sub-admin' },
    { id: 'role_transport_coord', name: 'TRANSPORT_COORDINATOR', description: 'Company transport coordinator' },
    { id: 'role_transport_compliance', name: 'TRANSPORT_COMPLIANCE', description: 'Company transport compliance' },
    { id: 'role_director', name: 'DIRECTOR', description: 'Company director' },
    { id: 'role_senior_manager', name: 'SENIOR_MANAGER', description: 'Company senior manager' },
    { id: 'role_manager', name: 'MANAGER', description: 'Company manager' },
    { id: 'role_assistant_manager', name: 'ASSISTANT_MANAGER', description: 'Company assistant manager' },
    { id: 'role_team_leader', name: 'TEAM_LEADER', description: 'Company team leader' },
    { id: 'role_employee', name: 'EMPLOYEE', description: 'Company employee' },
    { id: 'role_trainer', name: 'TRAINER', description: 'Company trainer' },
    // PARTNER (3)
    { id: 'role_vendor_admin', name: 'VENDOR_ADMIN', description: 'Vendor administrator' },
    { id: 'role_driver', name: 'DRIVER', description: 'Transport driver' },
    { id: 'role_guard', name: 'GUARD', description: 'Transport guard' },
  ];

  for (const r of roleDefs) {
    await prisma.role.upsert({
      where: { id: r.id },
      update: {},
      create: r,
    });
  }
  console.log(`✅ ${roleDefs.length} roles created/verified`);

  // ─── 2. Create 25 User profiles ──────────────────────────
  const userDefs = [
    // PLATFORM INTERNAL
    { id: 'user_superadmin', email: 'superadmin@moveinsync.com', name: 'Vikram Malhotra', phone: '+919876543200', roleId: 'role_superadmin', membershipRole: 'SUPER_ADMIN' },
    { id: 'user_moveinadmin', email: 'admin@moveinsync.com', name: 'Priya Sharma', phone: '+919876543201', roleId: 'role_moveinadmin', membershipRole: 'MOVE_IN_ADMIN' },
    { id: 'user_finance_team', email: 'finance@moveinsync.com', name: 'Rajesh Gupta', phone: '+919876543202', roleId: 'role_finance_team', membershipRole: 'FINANCE_TEAM' },
    { id: 'user_project_mgr', email: 'pm@moveinsync.com', name: 'Amit Deshmukh', phone: '+919876543203', roleId: 'role_project_manager', membershipRole: 'PROJECT_MANAGER' },
    { id: 'user_project_coord', email: 'coord@moveinsync.com', name: 'Neha Patil', phone: '+919876543204', roleId: 'role_project_coord', membershipRole: 'PROJECT_COORDINATOR' },
    { id: 'user_platform_compliance', email: 'compliance@moveinsync.com', name: 'Suresh Nair', phone: '+919876543205', roleId: 'role_platform_compliance', membershipRole: 'PLATFORM_COMPLIANCE' },
    { id: 'user_security_admin', email: 'security@moveinsync.com', name: 'Deepak Rao', phone: '+919876543206', roleId: 'role_security_admin', membershipRole: 'SECURITY_ADMINISTRATOR' },
    { id: 'user_support_engineer', email: 'support@moveinsync.com', name: 'Kavita Joshi', phone: '+919876543207', roleId: 'role_support_engineer', membershipRole: 'SUPPORT_ENGINEER' },
    { id: 'user_platform_auditor', email: 'auditor@moveinsync.com', name: 'Sanjay Mehta', phone: '+919876543208', roleId: 'role_platform_auditor', membershipRole: 'PLATFORM_AUDITOR' },
    // CUSTOMER
    { id: 'user_transport_admin', email: 'transport.manager@acme.com', name: 'Rajesh Kumar', phone: '+919876543211', roleId: 'role_transport_admin', membershipRole: 'COMPANY_ADMIN' },
    { id: 'user_transport_subadmin', email: 'subadmin@acme.com', name: 'Sanjay Verma', phone: '+919876543212', roleId: 'role_transport_subadmin', membershipRole: 'TRANSPORT_SUB_ADMIN' },
    { id: 'user_transport_coord', email: 'coordinator@acme.com', name: 'Pooja Singh', phone: '+919876543213', roleId: 'role_transport_coord', membershipRole: 'TRANSPORT_COORDINATOR' },
    { id: 'user_transport_comp', email: 'transport.compliance@acme.com', name: 'Vikram Desai', phone: '+919876543214', roleId: 'role_transport_compliance', membershipRole: 'TRANSPORT_COMPLIANCE' },
    { id: 'user_director', email: 'director@acme.com', name: 'Arun Malhotra', phone: '+919876543215', roleId: 'role_director', membershipRole: 'DIRECTOR' },
    { id: 'user_senior_mgr', email: 'senior.manager@acme.com', name: 'Meera Iyer', phone: '+919876543216', roleId: 'role_senior_manager', membershipRole: 'SENIOR_MANAGER' },
    { id: 'user_manager_001', email: 'manager@acme.com', name: 'Rajesh Kumar', phone: '+919876543211', roleId: 'role_manager', membershipRole: 'MANAGER' },
    { id: 'user_asst_mgr', email: 'asst.manager@acme.com', name: 'Sunita Reddy', phone: '+919876543217', roleId: 'role_assistant_manager', membershipRole: 'ASSISTANT_MANAGER' },
    { id: 'user_team_lead', email: 'teamleader@acme.com', name: 'Rahul Verma', phone: '+919876543218', roleId: 'role_team_leader', membershipRole: 'TEAM_LEADER' },
    { id: 'user_emp_001', email: 'employee@acme.com', name: 'Priya Nair', phone: '+919876543219', roleId: 'role_employee', membershipRole: 'EMPLOYEE' },
    { id: 'user_trainer', email: 'trainer@acme.com', name: 'Kiran Bhat', phone: '+919876543220', roleId: 'role_trainer', membershipRole: 'TRAINER' },
    // PARTNER
    { id: 'user_vendor_admin', email: 'vendor.admin@acme.com', name: 'Ramesh Shah', phone: '+919876543221', roleId: 'role_vendor_admin', membershipRole: 'VENDOR_ADMIN' },
    { id: 'user_driver_001', email: 'driver@acme.com', name: 'Mohan Lal', phone: '+919876543222', roleId: 'role_driver', membershipRole: 'DRIVER' },
    { id: 'user_guard', email: 'guard@acme.com', name: 'Hanuman Singh', phone: '+919876543223', roleId: 'role_guard', membershipRole: 'GUARD' },
  ];

  let usersCreated = 0;
  for (const u of userDefs) {
    // Upsert user
    await prisma.user.upsert({
      where: { id: u.id },
      update: { status: 'ACTIVE' },
      create: {
        id: u.id,
        email: u.email,
        name: u.name,
        phone: u.phone,
        passwordHash: pw,
        companyId,
        status: 'ACTIVE',
        transportEligibility: 'ELIGIBLE',
        passwordChangedAt: new Date(),
      },
    });
    usersCreated++;

    // Create CompanyMembership if not exists
    const existingMembership = await prisma.companyMembership.findFirst({
      where: { userId: u.id, companyId },
    });
    if (!existingMembership) {
      await prisma.companyMembership.create({
        data: {
          userId: u.id,
          companyId,
          role: u.membershipRole as any,
          status: 'ACTIVE',
        },
      });
    }

    // Create UserRoleAssignment if not exists
    const existingAssignment = await prisma.userRoleAssignment.findUnique({
      where: { userId_roleId: { userId: u.id, roleId: u.roleId } },
    });
    if (!existingAssignment) {
      await prisma.userRoleAssignment.create({
        data: { userId: u.id, roleId: u.roleId },
      });
    }
  }
  console.log(`✅ ${usersCreated} users created/verified`);

  // ─── 3. Create AccessScopes for customer users ───────────
  const siteIds = ['site_mumbai', 'site_pune', 'site_bengaluru'];
  const customerUsers = userDefs.filter(u => u.membershipRole !== 'SUPER_ADMIN' && u.membershipRole !== 'MOVE_IN_ADMIN');
  
  for (const u of customerUsers.slice(0, 8)) {
    // Give first 8 customer users access to all 3 sites
    for (const siteId of siteIds) {
      const existing = await prisma.accessScope.findFirst({
        where: { userId: u.id, companyId, siteId, isActive: true },
      });
      if (!existing) {
        await prisma.accessScope.create({
          data: { userId: u.id, companyId, siteId, isActive: true },
        });
      }
    }
  }
  console.log('✅ Access scopes created');

  // ─── 4. Create DriverProfile records ─────────────────────
  const driverUsers = userDefs.filter(u => u.membershipRole === 'DRIVER');
  for (let i = 0; i < driverUsers.length; i++) {
    const u = driverUsers[i];
    const existing = await prisma.driverProfile.findFirst({ where: { userId: u.id } });
    if (!existing) {
      await prisma.driverProfile.create({
        data: {
          userId: u.id,
          companyId,
          driverCode: `DRV${String(i + 1).padStart(3, '0')}`,
          licenseNo: `MH${1234567890 + i}`,
          licenseCategory: 'LMV',
          availabilityStatus: 'AVAILABLE',
          verificationStatus: 'VERIFIED',
          rating: 4.0 + i * 0.3,
          totalTrips: 100 + i * 50,
          city: 'Mumbai',
          licenseExpiry: new Date('2028-12-31'),
        },
      });
    }
  }
  console.log(`✅ ${driverUsers.length} driver profiles created`);

  // ─── 5. Seed PermissionDefinition records ─────────────────
  const permModules = [
    { module: 'EMPLOYEE', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'TRIP', actions: ['view', 'create', 'cancel', 'update'] },
    { module: 'BOOKING', actions: ['view', 'create', 'approve', 'reject', 'cancel'] },
    { module: 'DISPATCH', actions: ['view', 'execute', 'override'] },
    { module: 'DRIVER', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'VEHICLE', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'ROUTE', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'FINANCE', actions: ['view', 'approve'] },
    { module: 'INVOICE', actions: ['view', 'create', 'approve'] },
    { module: 'ADMIN', actions: ['manage_roles', 'manage_access', 'manage_subadmins'] },
    { module: 'SAFETY', actions: ['view', 'sos', 'manage_emergency'] },
    { module: 'NOSHOW', actions: ['view', 'manage'] },
    { module: 'AUDIT', actions: ['view'] },
    { module: 'REPORT', actions: ['view', 'export'] },
    { module: 'ANALYTICS', actions: ['view'] },
    { module: 'COMPLIANCE', actions: ['view', 'manage'] },
    { module: 'SECURITY', actions: ['view', 'manage'] },
    { module: 'COMPANY', actions: ['view', 'create', 'manage'] },
    { module: 'PLATFORM', actions: ['manage'] },
    { module: 'EXPENSE', actions: ['view', 'create', 'approve'] },
    { module: 'TICKET', actions: ['view', 'create', 'manage'] },
  ];

  let permCount = 0;
  for (const pm of permModules) {
    for (const action of pm.actions) {
      const id = `${pm.module.toLowerCase()}_${action}`;
      const existing = await prisma.permission.findUnique({ where: { id } });
      if (!existing) {
        await prisma.permission.create({
          data: { id, name: `${pm.module}:${action}`, module: pm.module, action },
        });
        permCount++;
      }
    }
  }
  console.log(`✅ ${permCount} new permissions created`);

  // ─── 6. Create RolePermission records for ADMIN role ──────
  // Admin gets ALL permissions
  const adminPerms = await prisma.permission.findMany();
  const adminRoleId = 'role_admin';
  for (const perm of adminPerms) {
    const existing = await prisma.rolePermission.findUnique({
      where: { roleId_permissionId: { roleId: adminRoleId, permissionId: perm.id } },
    });
    if (!existing) {
      await prisma.rolePermission.create({
        data: { roleId: adminRoleId, permissionId: perm.id },
      });
    }
  }
  console.log(`✅ ${adminPerms.length} permissions assigned to ADMIN role`);

  console.log('\n🎉 V7 seed complete!');
  console.log('\n📋 ALL LOGIN CREDENTIALS (password: Admin@123):');
  console.log('─'.repeat(70));
  for (const u of userDefs) {
    console.log(`  ${u.email.padEnd(40)} ${u.membershipRole}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await (prisma as any).$disconnect();
  });

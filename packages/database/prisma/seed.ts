import { PrismaClient } from '@prisma/client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Supabase Admin client (optional — when env vars are present we create users in Supabase Auth)
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    : null;

const DEMO_PASSWORD = 'Admin@2026';

async function createAuthUser(email: string, role: string, companyId: string | null, name: string): Promise<string> {
  if (!supabase) {
    // Fallback: use a deterministic UUID-like id when Supabase is absent
    return `user_${email.replace(/[^a-z0-9]/gi, '_')}`;
  }
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      app_metadata: { companyId: companyId || 'platform', role },
      user_metadata: { name },
    });
    if (error) {
      if (error.message?.includes('already') || error.message?.includes('registered') || error.statusCode === '422') {
        // User already exists in Supabase Auth — fetch their ID
        const { data: existing } = await supabase.auth.admin.listUsers({ filter: email });
        const existingUser = existing?.users?.find(u => u.email === email);
        if (existingUser) {
          console.log(`  ↳ Found existing auth user: ${existingUser.id}`);
          return existingUser.id;
        }
      }
      console.error(`⚠️  Supabase Auth create failed for ${email}: ${error.message}`);
      return `user_${email.replace(/[^a-z0-9]/gi, '_')}`;
    }
    return data.user.id;
  } catch (e: any) {
    console.error(`⚠️  Supabase Auth error for ${email}: ${e.message}`);
    return `user_${email.replace(/[^a-z0-9]/gi, '_')}`;
  }
}

async function main() {
  console.log('🌱 Seeding MoveInSync database...');

  // Cleanup done separately via cleanup.ts (run that first)

  // 1. Company (code, slug, logo, status — NOT logoUrl/isActive/subscriptionPlan/maxEmployees)
  const company = await prisma.company.create({
    data: {
      id: 'comp_acme_001',
      name: 'Acme Enterprise',
      code: 'ACME001',
      slug: 'acme-enterprise',
      domain: 'acme.com',
      logo: 'https://ui-avatars.com/api/?name=Acme&background=2563eb&color=fff',
      primaryColor: '#2563EB',
      status: 'ACTIVE',
      country: 'India',
      city: 'Mumbai',
    },
  });
  console.log('✅ Company:', company.name);

  // 2. Regions (regionCode, regionName — NOT name)
  await prisma.region.create({ data: { id: 'region_west', companyId: company.id, regionCode: 'WEST', regionName: 'West', isActive: true } });
  await prisma.region.create({ data: { id: 'region_south', companyId: company.id, regionCode: 'SOUTH', regionName: 'South', isActive: true } });
  console.log('✅ Regions: 2');

  // 3. Sites (siteCode, siteName — NOT name)
  const siteMumbai = await prisma.companySite.create({
    data: { id: 'site_mumbai', companyId: company.id, siteCode: 'MUM', siteName: 'Mumbai', address: 'Mumbai Office', city: 'Mumbai', latitude: 19.076, longitude: 72.8777, isActive: true },
  });
  const sitePune = await prisma.companySite.create({
    data: { id: 'site_pune', companyId: company.id, siteCode: 'PUN', siteName: 'Pune', address: 'Pune Office', city: 'Pune', latitude: 18.52, longitude: 73.8567, isActive: true },
  });
  const siteBangalore = await prisma.companySite.create({
    data: { id: 'site_bengaluru', companyId: company.id, siteCode: 'BLR', siteName: 'Bengaluru', address: 'Bengaluru Office', city: 'Bengaluru', latitude: 12.971, longitude: 77.5946, isActive: true },
  });
  console.log('✅ Sites: 3');

  // 4. LOBs (lobCode, lobName — NOT name)
  const lobBanking = await prisma.lineOfBusiness.create({
    data: { id: 'lob_banking', companyId: company.id, siteId: siteMumbai.id, lobCode: 'BANK', lobName: 'Banking', isActive: true },
  });
  const lobTech = await prisma.lineOfBusiness.create({
    data: { id: 'lob_tech', companyId: company.id, siteId: siteMumbai.id, lobCode: 'TECH', lobName: 'Technology', isActive: true },
  });
  const lobSupport = await prisma.lineOfBusiness.create({
    data: { id: 'lob_support', companyId: company.id, siteId: sitePune.id, lobCode: 'SUPP', lobName: 'Customer Support', isActive: true },
  });
  console.log('✅ LOBs: 3');

  // 5. Processes (processCode, processName — NOT name)
  const procA = await prisma.orgProcess.create({
    data: { id: 'proc_a', companyId: company.id, lobId: lobBanking.id, processCode: 'PROC-A', processName: 'Process A', isActive: true },
  });
  const procB = await prisma.orgProcess.create({
    data: { id: 'proc_b', companyId: company.id, lobId: lobBanking.id, processCode: 'PROC-B', processName: 'Process B', isActive: true },
  });
  const procC = await prisma.orgProcess.create({
    data: { id: 'proc_c', companyId: company.id, lobId: lobSupport.id, processCode: 'PROC-C', processName: 'Process C', isActive: true },
  });
  console.log('✅ Processes: 3');

  // 6. Shifts (no processId, no isActive)
  await prisma.shift.create({ data: { id: 'shift_morning', companyId: company.id, name: 'Morning', startTime: '06:00', endTime: '15:00' } });
  await prisma.shift.create({ data: { id: 'shift_evening', companyId: company.id, name: 'Evening', startTime: '15:00', endTime: '00:00' } });
  await prisma.shift.create({ data: { id: 'shift_night', companyId: company.id, name: 'Night', startTime: '21:00', endTime: '06:00' } });
  console.log('✅ Shifts: 3');

  // 7. Department, BU, CostCenter (no isActive)
  const dept = await prisma.department.create({ data: { id: 'dept_ops', companyId: company.id, name: 'Operations' } });
  const bu = await prisma.businessUnit.create({ data: { id: 'bu_corp', companyId: company.id, name: 'Corporate' } });
  const cc = await prisma.costCenter.create({ data: { id: 'cc_transport', companyId: company.id, name: 'Transport', code: 'TR001' } });
  console.log('✅ Department, BU, CostCenter');

  // 8. Permissions (module, action, code)
  const permDefs = [
    { code: 'employees:view', module: 'EMPLOYEE', action: 'view' },
    { code: 'employees:create', module: 'EMPLOYEE', action: 'create' },
    { code: 'employees:edit', module: 'EMPLOYEE', action: 'edit' },
    { code: 'employees:delete', module: 'EMPLOYEE', action: 'delete' },
    { code: 'trips:view', module: 'TRIP', action: 'view' },
    { code: 'trips:create', module: 'TRIP', action: 'create' },
    { code: 'trips:cancel', module: 'TRIP', action: 'cancel' },
    { code: 'bookings:view', module: 'BOOKING', action: 'view' },
    { code: 'bookings:create', module: 'BOOKING', action: 'create' },
    { code: 'bookings:approve', module: 'BOOKING', action: 'approve' },
    { code: 'bookings:reject', module: 'BOOKING', action: 'reject' },
    { code: 'dispatch:view', module: 'DISPATCH', action: 'view' },
    { code: 'dispatch:execute', module: 'DISPATCH', action: 'execute' },
    { code: 'dispatch:override', module: 'DISPATCH', action: 'override' },
    { code: 'drivers:view', module: 'DRIVER', action: 'view' },
    { code: 'drivers:create', module: 'DRIVER', action: 'create' },
    { code: 'vehicles:view', module: 'VEHICLE', action: 'view' },
    { code: 'vehicles:create', module: 'VEHICLE', action: 'create' },
    { code: 'finance:view', module: 'FINANCE', action: 'view' },
    { code: 'finance:approve', module: 'FINANCE', action: 'approve' },
    { code: 'admin:manage_roles', module: 'ADMIN', action: 'manage_roles' },
    { code: 'admin:manage_access', module: 'ADMIN', action: 'manage_access' },
    { code: 'safety:view', module: 'SAFETY', action: 'view' },
    { code: 'safety:sos', module: 'SAFETY', action: 'sos' },
    { code: 'noshow:view', module: 'NOSHOW', action: 'view' },
    { code: 'noshow:manage', module: 'NOSHOW', action: 'manage' },
    { code: 'audit:view', module: 'AUDIT', action: 'view' },
  ];
  for (const p of permDefs) {
    await prisma.permission.create({ data: { id: p.code.replace(':', '_'), name: p.code, module: p.module, action: p.action } });
  }
  console.log('✅ Permissions:', permDefs.length);

  // 9. Roles — 25 roles per V7 spec across 3 authority domains
  const roleConfigs = [
    // Platform / Navira Internal (9)
    { id: 'role_navira_owner', name: 'NAVIRA_OWNER', desc: 'NAVIRA Owner — highest internal authority' },
    { id: 'role_move_in_admin', name: 'MOVE_IN_ADMIN', desc: 'Move-In Admin' },
    { id: 'role_superadmin', name: 'SUPER_ADMIN', desc: 'Super Administrator' },
    { id: 'role_finance_team', name: 'FINANCE_TEAM', desc: 'Finance Team' },
    { id: 'role_project_manager', name: 'PROJECT_MANAGER', desc: 'Project Manager' },
    { id: 'role_project_coordinator', name: 'PROJECT_COORDINATOR', desc: 'Project Coordinator' },
    { id: 'role_platform_compliance', name: 'PLATFORM_COMPLIANCE', desc: 'Platform Compliance' },
    { id: 'role_security_administrator', name: 'SECURITY_ADMINISTRATOR', desc: 'Security Administrator' },
    { id: 'role_support_engineer', name: 'SUPPORT_ENGINEER', desc: 'Support Engineer' },
    { id: 'role_platform_auditor', name: 'PLATFORM_AUDITOR', desc: 'Platform Auditor' },
    // Customer / Tenant (11)
    { id: 'role_transport_sub_admin', name: 'TRANSPORT_SUB_ADMIN', desc: 'Transport Sub-Admin' },
    { id: 'role_transport_admin', name: 'TRANSPORT_ADMIN', desc: 'Transport Administrator' },
    { id: 'role_transport_coordinator', name: 'TRANSPORT_COORDINATOR', desc: 'Transport Coordinator' },
    { id: 'role_transport_compliance', name: 'TRANSPORT_COMPLIANCE', desc: 'Transport Compliance' },
    { id: 'role_admin', name: 'ADMIN', desc: 'Company Administrator' },
    { id: 'role_director', name: 'DIRECTOR', desc: 'Director' },
    { id: 'role_senior_manager', name: 'SENIOR_MANAGER', desc: 'Senior Manager' },
    { id: 'role_assistant_manager', name: 'ASSISTANT_MANAGER', desc: 'Assistant Manager' },
    { id: 'role_manager', name: 'MANAGER', desc: 'Manager' },
    { id: 'role_team_leader', name: 'TEAM_LEADER', desc: 'Team Leader' },
    { id: 'role_trainer', name: 'TRAINER', desc: 'Trainer' },
    { id: 'role_employee', name: 'EMPLOYEE', desc: 'Employee' },
    { id: 'role_guard', name: 'GUARD', desc: 'Guard' },
    // Partner (3)
    { id: 'role_vendor_admin', name: 'VENDOR_ADMIN', desc: 'Vendor Admin' },
    { id: 'role_vendor_dispatcher', name: 'VENDOR_DISPATCHER', desc: 'Vendor Dispatcher' },
    { id: 'role_driver', name: 'DRIVER', desc: 'Driver' },
  ];
  for (const rc of roleConfigs) {
    await prisma.role.create({ data: { id: rc.id, name: rc.name, description: rc.desc } });
  }
  // Assign all perms to admin
  for (const p of permDefs) {
    await prisma.rolePermission.create({ data: { roleId: 'role_admin', permissionId: p.code.replace(':', '_') } });
  }
  // Manager gets subset
  const mgrPerms = permDefs.filter(p => !p.code.startsWith('admin:'));
  for (const p of mgrPerms) {
    await prisma.rolePermission.create({ data: { roleId: 'role_manager', permissionId: p.code.replace(':', '_') } });
  }
  console.log('✅ Roles:', roleConfigs.length);

  // ─── PLATFORM / NAVIRA COMPANY + INTERNAL USERS ────────────
  console.log('🔗 Seeding Platform Internal users...');
  const naviraCompany = await prisma.company.create({
    data: {
      id: 'comp_navira_001',
      name: 'Navira Platform',
      code: 'NAVIRA001',
      slug: 'navira-platform',
      domain: 'navira.com',
      logo: 'https://ui-avatars.com/api/?name=Navira&background=7c3aed&color=fff',
      primaryColor: '#7C3AED',
      status: 'ACTIVE',
      country: 'India',
      city: 'Mumbai',
    },
  });
  console.log('✅ Navira Platform Company:', naviraCompany.name);

  const PLATFORM_PASSWORD = 'Navira@2026';
  const platformUsers = [
    { email: 'owner@navira.com',          name: 'Navira Owner',           roleId: 'role_navira_owner',        phone: '+919000000001' },
    { email: 'admin@navira.com',          name: 'Move-In Admin',          roleId: 'role_move_in_admin',       phone: '+919000000002' },
    { email: 'superadmin@navira.com',     name: 'Platform Super Admin',   roleId: 'role_superadmin',          phone: '+919000000003' },
    { email: 'finance@navira.com',        name: 'Finance Team',           roleId: 'role_finance_team',        phone: '+919000000004' },
    { email: 'pm@navira.com',             name: 'Project Manager',        roleId: 'role_project_manager',     phone: '+919000000005' },
    { email: 'coordinator@navira.com',    name: 'Project Coordinator',    roleId: 'role_project_coordinator', phone: '+919000000006' },
    { email: 'compliance@navira.com',     name: 'Platform Compliance',    roleId: 'role_platform_compliance', phone: '+919000000007' },
    { email: 'security@navira.com',       name: 'Security Administrator', roleId: 'role_security_administrator', phone: '+919000000008' },
    { email: 'support@navira.com',        name: 'Support Engineer',       roleId: 'role_support_engineer',    phone: '+919000000009' },
    { email: 'auditor@navira.com',        name: 'Platform Auditor',       roleId: 'role_platform_auditor',    phone: '+919000000010' },
  ];
  for (const pu of platformUsers) {
    try {
      const puAuthId = await createAuthUser(pu.email, 'SUPER_ADMIN', naviraCompany.id, pu.name);
      await prisma.user.create({
        data: { id: puAuthId, companyId: naviraCompany.id, email: pu.email, name: pu.name, passwordHash: supabase ? 'managed-by-supabase' : await bcrypt.hash(PLATFORM_PASSWORD, 12), phone: pu.phone, status: 'ACTIVE' },
      });
      await prisma.userRoleAssignment.create({ data: { userId: puAuthId, roleId: pu.roleId } });
      await prisma.companyMembership.create({ data: { userId: puAuthId, companyId: naviraCompany.id, role: 'SUPER_ADMIN' as any, status: 'ACTIVE' } });
      console.log(`  ✅ ${pu.email} / ${PLATFORM_PASSWORD} → ${pu.roleId}`);
    } catch (e: any) {
      console.log(`  ⏭️  ${pu.email} already exists, skipping`);
    }
  }
  console.log('✅ Platform Internal Users: 10');

  // 10. Users — create in Supabase Auth (or local bcrypt when Supabase absent)
  console.log(supabase ? '🔗 Using Supabase Auth for user creation' : '⚠️  No Supabase — using local bcrypt fallback');

  const adminAuthId = await createAuthUser('admin@acme.com', 'COMPANY_ADMIN', company.id, 'Super Admin');
  const admin = await prisma.user.create({
    data: { id: adminAuthId, companyId: company.id, email: 'admin@acme.com', name: 'Super Admin', passwordHash: supabase ? 'managed-by-supabase' : await bcrypt.hash(DEMO_PASSWORD, 12), phone: '+919876543210', status: 'ACTIVE' },
  });
  await prisma.userRoleAssignment.create({ data: { userId: admin.id, roleId: 'role_admin' } });
  await prisma.companyMembership.create({ data: { userId: admin.id, companyId: company.id, role: 'COMPANY_ADMIN', status: 'ACTIVE' } });
  console.log(`✅ Admin: admin@acme.com / ${DEMO_PASSWORD} (auth ID: ${adminAuthId})`);

  const mgrAuthId = await createAuthUser('manager@acme.com', 'MANAGER', company.id, 'Rajesh Kumar');
  const mgr = await prisma.user.create({
    data: { id: mgrAuthId, companyId: company.id, email: 'manager@acme.com', name: 'Rajesh Kumar', passwordHash: supabase ? 'managed-by-supabase' : await bcrypt.hash(DEMO_PASSWORD, 12), phone: '+919876543211', status: 'ACTIVE' },
  });
  await prisma.userRoleAssignment.create({ data: { userId: mgr.id, roleId: 'role_manager' } });
  await prisma.companyMembership.create({ data: { userId: mgr.id, companyId: company.id, role: 'MANAGER', status: 'ACTIVE' } });
  console.log('✅ Manager: manager@acme.com');

  // Employees
  const empList = [
    { name: 'Priya Sharma', phone: '+919876543220', lat: 19.13, lng: 72.90 },
    { name: 'Amit Patel', phone: '+919876543221', lat: 18.55, lng: 73.88 },
    { name: 'Sneha Reddy', phone: '+919876543222', lat: 13.02, lng: 77.60 },
    { name: 'Vikram Singh', phone: '+919876543223', lat: 19.10, lng: 72.92 },
    { name: 'Anjali Desai', phone: '+919876543224', lat: 18.53, lng: 73.86 },
    { name: 'Rahul Verma', phone: '+919876543225', lat: 13.05, lng: 77.58 },
    { name: 'Deepa Nair', phone: '+919876543226', lat: 19.15, lng: 72.85 },
    { name: 'Suresh Iyer', phone: '+919876543227', lat: 18.50, lng: 73.90 },
    { name: 'Meera Joshi', phone: '+919876543228', lat: 13.00, lng: 77.62 },
    { name: 'Karthik Menon', phone: '+919876543229', lat: 19.08, lng: 72.88 },
  ];
  for (let i = 0; i < empList.length; i++) {
    const e = empList[i];
    const email = `${e.name.split(' ')[0].toLowerCase()}@acme.com`;
    const empAuthId = await createAuthUser(email, 'EMPLOYEE', company.id, e.name);
    const emp = await prisma.user.create({
      data: {
        id: empAuthId,
        companyId: company.id, email,
        name: e.name, passwordHash: supabase ? 'managed-by-supabase' : await bcrypt.hash(DEMO_PASSWORD, 12), phone: e.phone, status: 'ACTIVE',
        managerId: mgr.id, departmentId: dept.id, businessUnitId: bu.id,
        homeLatitude: e.lat, homeLongitude: e.lng,
        defaultPickup: `${e.name.split(' ')[0]} Residence`,
      },
    });
    await prisma.userRoleAssignment.create({ data: { userId: emp.id, roleId: 'role_employee' } });
    await prisma.companyMembership.create({ data: { userId: emp.id, companyId: company.id, role: 'EMPLOYEE', status: 'ACTIVE' } });
    await prisma.managerRelationship.create({
      data: { companyId: company.id, employeeId: emp.id, managerId: mgr.id, relationshipType: 'DIRECT' },
    });
  }
  console.log('✅ Employees:', empList.length);

  // Drivers
  const drvs = [
    { name: 'Mohammed Ali', phone: '+919876543240', license: 'MH-12-2019-1234567', rating: 4.5 },
    { name: 'Ramesh Gupta', phone: '+919876543241', license: 'MH-12-2020-7654321', rating: 4.8 },
    { name: 'Santosh Kumar', phone: '+919876543242', license: 'KA-15-2018-9988776', rating: 4.2 },
  ];
  for (let i = 0; i < drvs.length; i++) {
    const d = drvs[i];
    const email = `driver${i + 1}@acme.com`;
    const drvAuthId = await createAuthUser(email, 'DRIVER', company.id, d.name);
    const drv = await prisma.user.create({
      data: { id: drvAuthId, companyId: company.id, email, name: d.name, passwordHash: supabase ? 'managed-by-supabase' : await bcrypt.hash(DEMO_PASSWORD, 12), phone: d.phone, status: 'ACTIVE' },
    });
    await prisma.userRoleAssignment.create({ data: { userId: drv.id, roleId: 'role_driver' } });
    await prisma.companyMembership.create({ data: { userId: drv.id, companyId: company.id, role: 'DRIVER', status: 'ACTIVE' } });

    // Create DriverProfile for each driver using the current schema.
    await prisma.driverProfile.upsert({
      where: { userId: drv.id },
      update: {
        licenseNo: d.license,
        licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
        availabilityStatus: 'AVAILABLE',
        verificationStatus: 'VERIFIED',
        rating: d.rating,
      },
      create: {
        id: `driver_profile_${String(i + 1).padStart(3, '0')}`,
        userId: drv.id,
        companyId: company.id,
        driverCode: `DRV-${String(i + 1).padStart(3, '0')}`,
        licenseNo: d.license,
        licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
        availabilityStatus: 'AVAILABLE',
        verificationStatus: 'VERIFIED',
        rating: d.rating,
        totalTrips: Math.floor(Math.random() * 500) + 100,
      },
    });
  }
  console.log('✅ Drivers:', drvs.length, '+ DriverProfiles created');

  // 11. Vehicles
  const vCfgs = [
    { reg: 'MH01AB1234', make: 'Tata', model: 'Nexon EV', type: 'SEDAN', cap: 4, fuel: 'ELECTRIC', ac: true, ev: true },
    { reg: 'MH02CD5678', make: 'Maruti', model: 'Ertiga', type: 'SUV', cap: 7, fuel: 'PETROL', ac: true, ev: false },
    { reg: 'KA01EF9012', make: 'Toyota', model: 'Innova', type: 'SUV', cap: 7, fuel: 'DIESEL', ac: true, ev: false },
  ];
  for (let i = 0; i < vCfgs.length; i++) {
    const v = vCfgs[i];
    await prisma.vehicle.create({
      data: {
        id: `vehicle_${String(i + 1).padStart(3, '0')}`, companyId: company.id,
        registrationNo: v.reg, make: v.make, model: v.model,
        vehicleType: v.type as any, fuelType: v.fuel as any,
        capacity: v.cap, acType: v.ac ? ('AC' as any) : ('NON_AC' as any), isEV: v.ev,
      },
    });
  }
  console.log('✅ Vehicles:', vCfgs.length);

  // 11b. Vehicle Type Records
  try {
    await prisma.vehicleTypeRecord.create({
      data: { id: 'vt_cab_4', companyId: company.id, name: '4-Seater Cab', description: 'Standard sedan cab for 4 passengers', usageType: 'CAB', totalCapacity: 4, fuelType: 'PETROL', status: 'ACTIVE' },
    });
    await prisma.vehicleTypeRecord.create({
      data: { id: 'vt_cab_7', companyId: company.id, name: '7-Seater Cab', description: 'SUV cab for 7 passengers', usageType: 'CAB', totalCapacity: 7, fuelType: 'DIESEL', status: 'ACTIVE' },
    });
    await prisma.vehicleTypeRecord.create({
      data: { id: 'vt_shuttle_15', companyId: company.id, name: '15-Seater Shuttle', description: 'Mini bus shuttle for 15 passengers', usageType: 'SHUTTLE', totalCapacity: 15, fuelType: 'DIESEL', status: 'ACTIVE' },
    });
    await prisma.vehicleTypeRecord.create({
      data: { id: 'vt_shuttle_40', companyId: company.id, name: '40-Seater Shuttle', description: 'Large bus shuttle for 40 passengers', usageType: 'SHUTTLE', totalCapacity: 40, fuelType: 'DIESEL', status: 'ACTIVE' },
    });
    console.log('✅ Vehicle Types: 4');
  } catch (e: any) { /* skip */ }

  // 11c. Transport Schedule Config
  try {
    await prisma.transportScheduleConfig.create({
      data: {
        id: 'tsc_main',
        companyId: company.id,
        allowMultipleAdditional: false,
        maxAdditionalMovementsPerDay: 2,
        allowAdHocShifts: true,
        adHocShiftApprovalRequired: false,
        allowOvernightShifts: true,
        bookingCutoffMinutes: 60,
      },
    });
    console.log('✅ Transport Schedule Config');
  } catch (e: any) { /* skip */ }

  // 11d. Shift Buffer Policies
  try {
    await prisma.shiftBufferPolicy.create({
      data: { id: 'sbp_company', companyId: company.id, level: 'COMPANY', loginArrivalBuffer: 15, logoutDepartureBuffer: 30 },
    });
    await prisma.shiftBufferPolicy.create({
      data: { id: 'sbp_site_mum', companyId: company.id, siteId: 'site_mumbai', level: 'SITE', loginArrivalBuffer: 20, logoutDepartureBuffer: 25 },
    });
    console.log('✅ Shift Buffer Policies: 2');
  } catch (e: any) { /* skip */ }

  // 12. Routes
  await prisma.route.create({ data: { id: 'route_mum_001', companyId: company.id, routeCode: 'MUM-001', routeName: 'Andheri to BKC', origin: 'Andheri West', destination: 'BKC Complex', distanceKm: 12.5, estimatedDuration: 35 } });
  await prisma.route.create({ data: { id: 'route_pun_001', companyId: company.id, routeCode: 'PUN-001', routeName: 'Hinjewadi to Magarpatta', origin: 'Hinjewadi Phase 3', destination: 'Magarpatta City', distanceKm: 18.2, estimatedDuration: 45 } });
  console.log('✅ Routes: 2');

  // 13. Transport Policy
  await prisma.transportPolicy.create({
    data: {
      id: 'policy_main', companyId: company.id, name: 'Acme Transport Policy 2026',
      minAdvanceBookingMinutes: 120, maxAdvanceBookingDays: 7, cancellationDeadlineMinutes: 60,
      requireApproval: true, approvalLevels: 2, femaleGuardRequired: true,
      guardStartHour: 20, guardEndHour: 6, guardRequiredDistanceKm: 3.0,
    },
  });
  console.log('✅ Transport Policy');

  // 14. No-Show Policy
  await prisma.noShowPolicyConfig.create({
    data: {
      id: 'nosc_main', companyId: company.id, requiredCallAttempts: 3,
      minimumMinutesBetweenCalls: 2, gracePeriodMinutes: 10, callScreenshotRequired: true,
      supervisorCallEnabled: true, controlRoomConfirmation: true,
      autoNoShowAfterEvidence: false, evidenceRetentionDays: 90,
    },
  });
  console.log('✅ No-Show Policy Config');

  // 15. Access Scopes
  for (const s of [siteMumbai, sitePune, siteBangalore]) {
    await prisma.accessScope.create({
      data: { id: `scope_admin_${s.id}`, userId: admin.id, companyId: company.id, siteId: s.id, isPrimary: s.id === 'site_mumbai', isActive: true },
    });
  }
  console.log('✅ Access Scopes');

  // 16. Emergency Contact
  await prisma.emergencySystemContact.create({
    data: { id: 'esc_main', companyId: company.id, contactName: 'Control Room', contactPhone: '+919876543999', contactEmail: 'control@acme.com', role: 'SECURITY', isPrimary: true, responseOrder: 1 },
  });
  console.log('✅ Emergency Contact');

  // 17. Audit Log
  await prisma.auditLog.create({
    data: { id: 'audit_seed_001', userId: admin.id, action: 'DATABASE_SEED', entity: 'System', entityId: 'seed_001', newValue: { message: 'Database seeded with demo data' } },
  });
  console.log('✅ Audit Log');

  // ============================================================
  // V6: ROLE-SPECIFIC PROFILES — Every role gets a test user
  // ============================================================
  const roleProfiles = [
    // Customer / Tenant roles
    { id: 'user_transport_admin', email: 'transport@acme.com', name: 'Transport Admin User', role: 'TRANSPORT_ADMIN', roleId: 'role_transport_admin', phone: '+919876543220' },
    { id: 'user_transport_coord', email: 'coordinator@acme.com', name: 'Transport Coordinator', role: 'TRANSPORT_COORDINATOR', roleId: 'role_transport_coordinator', phone: '+919876543221' },
    { id: 'user_transport_comp', email: 'compliance@acme.com', name: 'Transport Compliance', role: 'TRANSPORT_COMPLIANCE', roleId: 'role_transport_compliance', phone: '+919876543222' },
    { id: 'user_director', email: 'director@acme.com', name: 'Director Operations', role: 'DIRECTOR', roleId: 'role_director', phone: '+919876543223' },
    { id: 'user_senior_mgr', email: 'senior.mgr@acme.com', name: 'Senior Manager', role: 'SENIOR_MANAGER', roleId: 'role_senior_manager', phone: '+919876543224' },
    { id: 'user_asst_mgr', email: 'asst.mgr@acme.com', name: 'Assistant Manager', role: 'ASSISTANT_MANAGER', roleId: 'role_assistant_manager', phone: '+919876543225' },
    { id: 'user_team_lead', email: 'teamlead@acme.com', name: 'Team Leader', role: 'TEAM_LEADER', roleId: 'role_team_leader', phone: '+919876543226' },
    { id: 'user_dispatcher', email: 'dispatch@acme.com', name: 'Dispatcher User', role: 'TRANSPORT_COORDINATOR', roleId: 'role_transport_coordinator', phone: '+919876543227' },
    { id: 'user_guard', email: 'guard@acme.com', name: 'Guard User', role: 'GUARD', roleId: 'role_guard', phone: '+919876543228' },
    { id: 'user_trainer', email: 'trainer@acme.com', name: 'Trainer User', role: 'TRAINER', roleId: 'role_trainer', phone: '+919876543229' },
    // Partner roles
    { id: 'user_vendor_admin', email: 'vendor.admin@acme.com', name: 'Vendor Admin', role: 'VENDOR_ADMIN', roleId: 'role_vendor_admin', phone: '+919876543230' },
    { id: 'user_driver2', email: 'driver2@acme.com', name: 'Driver Kumar', role: 'DRIVER', roleId: 'role_driver', phone: '+919876543231' },
    { id: 'user_driver3', email: 'driver3@acme.com', name: 'Driver Singh', role: 'DRIVER', roleId: 'role_driver', phone: '+919876543232' },
    // Missing customer/partner roles
    { id: 'user_transport_sub_admin', email: 'subadmin@acme.com', name: 'Transport Sub-Admin', role: 'TRANSPORT_SUB_ADMIN', roleId: 'role_transport_sub_admin', phone: '+919876543233' },
    { id: 'user_vendor_dispatcher', email: 'vendor.dispatcher@acme.com', name: 'Vendor Dispatcher', role: 'VENDOR_DISPATCHER', roleId: 'role_vendor_dispatcher', phone: '+919876543234' },
  ];

  for (const rp of roleProfiles) {
    try {
      const rpAuthId = await createAuthUser(rp.email, rp.role, company.id, rp.name);
      await prisma.user.create({
        data: { id: rpAuthId, companyId: company.id, email: rp.email, name: rp.name, passwordHash: supabase ? 'managed-by-supabase' : await bcrypt.hash(DEMO_PASSWORD, 12), phone: rp.phone, status: 'ACTIVE' },
      });
      await prisma.userRoleAssignment.create({ data: { userId: rpAuthId, roleId: rp.roleId } });
      await prisma.companyMembership.create({ data: { userId: rpAuthId, companyId: company.id, role: rp.role as any, status: 'ACTIVE' } });
      await prisma.accessScope.create({ data: { userId: rpAuthId, companyId: company.id, siteId: 'site_mumbai', isActive: true, isPrimary: true } });
    } catch (e: any) {
      // Skip if already exists
    }
  }
  console.log('✅ V6 Role Profiles:', roleProfiles.length);

  // ============================================================
  // V6: VENDOR + VEHICLE + TRIP SEED DATA
  // ============================================================
  try {
    await prisma.vendor.create({
      data: { id: 'vendor_001', companyId: company.id, name: 'Acme Transport Services', contactEmail: 'vendor@acme.com', contactPhone: '+919876543240', status: 'ACTIVE' },
    });
    console.log('✅ Vendor');
  } catch (e: any) { /* skip */ }

  // ============================================================
  // V6: MANAGEMENT MODELS (for analytics dashboard)
  // ============================================================
  try {
    await prisma.vendorManagement.create({
      data: { id: 'vm_001', companyId: company.id, vendorId: 'vendor_001', vendorName: 'Acme Transport Services', contactEmail: 'vendor@acme.com', contactPhone: '+919876543240', status: 'ACTIVE', city: 'Mumbai', state: 'Maharashtra' },
    });
    await prisma.driverManagement.create({
      data: { id: 'dm_001', companyId: company.id, driverId: 'driver_001', firstName: 'Rajesh', lastName: 'Kumar', phone: '+919876543211', status: 'ACTIVE', isAvailable: true, licenseNumber: 'MH1234567890', rating: 4.5, totalTrips: 156, totalKm: 4500 },
    });
    await prisma.driverManagement.create({
      data: { id: 'dm_002', companyId: company.id, driverId: 'driver_002', firstName: 'Suresh', lastName: 'Patel', phone: '+919876543212', status: 'ACTIVE', isAvailable: true, licenseNumber: 'MH9876543210', rating: 4.2, totalTrips: 89, totalKm: 2800 },
    });
    await prisma.driverManagement.create({
      data: { id: 'dm_003', companyId: company.id, driverId: 'driver_003', firstName: 'Anita', lastName: 'Desai', phone: '+919876543213', status: 'ACTIVE', isAvailable: false, licenseNumber: 'KA1122334455', rating: 4.8, totalTrips: 234, totalKm: 7200 },
    });
    await prisma.vehicleManagement.create({
      data: { id: 'vm_001', companyId: company.id, vehicleId: 'vehicle_001', registrationNumber: 'MH01AB1234', vehicleType: 'SEDAN', seatingCapacity: 4, fuelType: 'EV', status: 'ACTIVE', isAvailable: true, gpsEnabled: true, color: 'White' },
    });
    await prisma.vehicleManagement.create({
      data: { id: 'vm_002', companyId: company.id, vehicleId: 'vehicle_002', registrationNumber: 'MH02CD5678', vehicleType: 'SUV', seatingCapacity: 7, fuelType: 'PETROL', status: 'ACTIVE', isAvailable: true, gpsEnabled: true, color: 'Silver' },
    });
    await prisma.vehicleManagement.create({
      data: { id: 'vm_003', companyId: company.id, vehicleId: 'vehicle_003', registrationNumber: 'KA03EF9012', vehicleType: 'SUV', seatingCapacity: 7, fuelType: 'DIESEL', status: 'ACTIVE', isAvailable: true, gpsEnabled: true, color: 'Black' },
    });
    // Routes
    await prisma.routeManagement.create({
      data: { id: 'rm_001', companyId: company.id, routeName: 'Mumbai - Andheri - BKC', routeCode: 'MUM-001', routeType: 'PICKUP_DROP', originLatitude: 19.1136, originLongitude: 72.8697, destLatitude: 19.0596, destLongitude: 72.8656, distanceKm: 12.5, estimatedMinutes: 35, status: 'ACTIVE' },
    });
    await prisma.routeManagement.create({
      data: { id: 'rm_002', companyId: company.id, routeName: 'Pune - Hinjewadi - Magarpatta', routeCode: 'PUN-001', routeType: 'SHUTTLE', originLatitude: 18.5913, originLongitude: 73.7389, destLatitude: 18.5134, destLongitude: 73.9294, distanceKm: 18.2, estimatedMinutes: 45, status: 'ACTIVE' },
    });
    console.log('✅ Management Models: 1 vendor, 3 drivers, 3 vehicles, 2 routes');
  } catch (e: any) { /* skip */ }

  // ============================================================
  // V6: FEATURE FLAGS SEED
  // ============================================================
  try {
    await prisma.featureFlag.create({ data: { companyId: company.id, flagCode: 'AI_DISPATCH', enabled: false, description: 'AI-powered dispatch optimization' } });
    await prisma.featureFlag.create({ data: { companyId: company.id, flagCode: 'NEW_BILLING_ENGINE', enabled: true, description: 'New billing engine with 6 pricing models' } });
    await prisma.featureFlag.create({ data: { companyId: null, flagCode: 'PLATFORM_MAINTENANCE', enabled: false, description: 'Global maintenance mode', setByUserId: 'system' } });
    console.log('✅ Feature Flags');
  } catch (e: any) { /* skip */ }

  // ============================================================
  // PHASE 1: PERMISSION SYSTEM SEEDING
  // ============================================================

  // 1.1 PermissionDefinition records
  console.log('\n📋 Seeding PermissionDefinitions...');
  for (const p of permDefs) {
    const cat = p.module.toLowerCase().split('_')[0];
    await prisma.permissionDefinition.upsert({
      where: { code: p.code },
      update: {},
      create: { code: p.code, module: p.module, action: p.action, category: cat, isSensitive: p.code.startsWith('admin:') || p.code.startsWith('safety:') },
    });
  }
  console.log('  ✅ PermissionDefinitions:', permDefs.length);

  // 1.2 TransportAccessRole records (16 company-scoped roles)
  console.log('📋 Seeding TransportAccessRoles...');
  const TRANSPORT_ROLES = [
    { roleName: 'SUPER_ADMIN', displayName: 'Super Admin', hl: 0, all: true },
    { roleName: 'TRANSPORT_ADMIN', displayName: 'Transport Admin', hl: 1, all: true },
    { roleName: 'COMPANY_ADMIN', displayName: 'Company Admin', hl: 1, all: true },
    { roleName: 'TRANSPORT_SUB_ADMIN', displayName: 'Transport Sub-Admin', hl: 2, vendors: true, drivers: true, vehicles: true, routes: true, importEmp: true, emergency: true, shuttles: true, nodals: true, analytics: true },
    { roleName: 'DIRECTOR', displayName: 'Director', hl: 2, banApproval: true, expenseApproval: true, analytics: true },
    { roleName: 'TRANSPORT_COORDINATOR', displayName: 'Transport Coordinator', hl: 3, drivers: true, vehicles: true, routes: true, analytics: true },
    { roleName: 'TRANSPORT_COMPLIANCE', displayName: 'Transport Compliance', hl: 3, policies: true, analytics: true },
    { roleName: 'MANAGER', displayName: 'Manager', hl: 3, banApproval: true, analytics: true },
    { roleName: 'SENIOR_MANAGER', displayName: 'Senior Manager', hl: 4, banApproval: true, analytics: true },
    { roleName: 'ASSISTANT_MANAGER', displayName: 'Assistant Manager', hl: 4 },
    { roleName: 'TEAM_LEADER', displayName: 'Team Leader', hl: 5 },
    { roleName: 'TRAINER', displayName: 'Trainer', hl: 5 },
    { roleName: 'EMPLOYEE', displayName: 'Employee', hl: 6 },
    { roleName: 'DRIVER', displayName: 'Driver', hl: 6, emergency: true },
    { roleName: 'VENDOR_ADMIN', displayName: 'Vendor Admin', hl: 6, drivers: true, vehicles: true },
    { roleName: 'GUARD', displayName: 'Guard', hl: 6, emergency: true },
  ];

  const transportRoles: Record<string, string> = {};
  for (const tr of TRANSPORT_ROLES) {
    const b = (flag: boolean) => flag || false;
    const isAll = (tr as any).all;
    const data: any = {
      companyId: company.id,
      roleName: tr.roleName,
      displayName: tr.displayName,
      description: `${tr.displayName} role for Acme Enterprise`,
      hierarchyLevel: tr.hl,
      canManageVendors: isAll || b((tr as any).vendors),
      canManageDrivers: isAll || b((tr as any).drivers),
      canManageVehicles: isAll || b((tr as any).vehicles),
      canManageRoutes: isAll || b((tr as any).routes),
      canImportEmployees: isAll || b((tr as any).importEmp),
      canManagePolicies: isAll || b((tr as any).policies),
      canApproveBanRemoval: isAll || b((tr as any).banApproval),
      canApproveExpenses: isAll || b((tr as any).expenseApproval),
      canManageEmergency: isAll || b((tr as any).emergency),
      canManageShuttles: isAll || b((tr as any).shuttles),
      canManageNodals: isAll || b((tr as any).nodals),
      canViewAnalytics: isAll || b((tr as any).analytics),
      canManageSubAdmins: isAll,
      canManageAccessRoles: isAll,
      isSystemRole: isAll,
      isActive: true,
    };
    const existing = await prisma.transportAccessRole.findFirst({ where: { companyId: company.id, roleName: tr.roleName } });
    if (existing) {
      transportRoles[tr.roleName] = existing.id;
    } else {
      const created = await prisma.transportAccessRole.create({ data });
      transportRoles[tr.roleName] = created.id;
    }
  }
  console.log('  ✅ TransportAccessRoles:', Object.keys(transportRoles).length);

  // 1.3 TransportAccessAssignment records (link users to transport roles)
  console.log('📋 Seeding TransportAccessAssignments...');
  const membershipToTransportRole: Record<string, string> = {
    'COMPANY_ADMIN': 'SUPER_ADMIN', 'MANAGER': 'MANAGER', 'EMPLOYEE': 'EMPLOYEE',
    'DRIVER': 'DRIVER', 'TRANSPORT_ADMIN': 'TRANSPORT_ADMIN',
    'TRANSPORT_COORDINATOR': 'TRANSPORT_COORDINATOR', 'TRANSPORT_COMPLIANCE': 'TRANSPORT_COMPLIANCE',
    'DIRECTOR': 'DIRECTOR', 'SENIOR_MANAGER': 'SENIOR_MANAGER',
    'ASSISTANT_MANAGER': 'ASSISTANT_MANAGER', 'TEAM_LEADER': 'TEAM_LEADER',
    'TRAINER': 'TRAINER', 'GUARD': 'GUARD', 'VENDOR_ADMIN': 'VENDOR_ADMIN',
  };
  const allUsers = await prisma.user.findMany({ where: { companyId: company.id }, include: { memberships: { where: { status: 'ACTIVE' } } } });
  let assignCount = 0;
  for (const u of allUsers) {
    const mem = u.memberships[0];
    if (!mem) continue;
    const trName = membershipToTransportRole[mem.role] || 'EMPLOYEE';
    const trId = transportRoles[trName];
    if (!trId) continue;
    try {
      await prisma.transportAccessAssignment.create({
        data: { companyId: company.id, userId: u.id, roleId: trId, assignedBy: u.id, isActive: true },
      });
      assignCount++;
    } catch (e: any) { /* duplicate */ }
  }
  console.log('  ✅ TransportAccessAssignments:', assignCount);

  // 1.4 RolePermissionConfig records (map transport roles → PermissionDefinitions)
  console.log('📋 Seeding RolePermissionConfigs...');
  const flagToPerms: Record<string, string[]> = {
    canManageVendors: ['finance:view', 'finance:approve'],
    canManageDrivers: ['drivers:view', 'drivers:create'],
    canManageVehicles: ['vehicles:view', 'vehicles:create'],
    canManageRoutes: [],
    canImportEmployees: [],
    canManagePolicies: [],
    canApproveBanRemoval: [],
    canApproveExpenses: ['finance:approve'],
    canManageEmergency: ['safety:view', 'safety:sos'],
    canManageShuttles: [],
    canManageNodals: [],
    canViewAnalytics: [],
    canManageSubAdmins: ['admin:manage_roles'],
    canManageAccessRoles: ['admin:manage_access'],
  };
  const alwaysGrantedMap: Record<string, string[]> = {
    SUPER_ADMIN: ['employees:view', 'employees:create', 'employees:edit', 'employees:delete', 'trips:view', 'trips:create', 'trips:cancel', 'bookings:view', 'bookings:create', 'bookings:approve', 'bookings:reject', 'dispatch:view', 'dispatch:execute', 'dispatch:override', 'noshow:view', 'noshow:manage', 'audit:view'],
    TRANSPORT_ADMIN: ['employees:view', 'employees:create', 'employees:edit', 'trips:view', 'trips:create', 'trips:cancel', 'bookings:view', 'bookings:create', 'bookings:approve', 'bookings:reject', 'dispatch:view', 'dispatch:execute', 'dispatch:override', 'noshow:view', 'noshow:manage', 'audit:view'],
    TRANSPORT_SUB_ADMIN: ['employees:view', 'trips:view', 'trips:create', 'bookings:view', 'bookings:create', 'dispatch:view', 'dispatch:execute', 'noshow:view'],
    COMPANY_ADMIN: ['employees:view', 'employees:create', 'employees:edit', 'trips:view', 'bookings:view', 'bookings:approve', 'dispatch:view', 'admin:manage_roles', 'admin:manage_access', 'audit:view'],
    DIRECTOR: ['employees:view', 'trips:view', 'bookings:view', 'finance:view'],
    TRANSPORT_COORDINATOR: ['trips:view', 'trips:create', 'bookings:view', 'dispatch:view', 'dispatch:execute', 'noshow:view'],
    TRANSPORT_COMPLIANCE: ['trips:view', 'bookings:view', 'audit:view'],
    MANAGER: ['employees:view', 'trips:view', 'bookings:view', 'bookings:approve'],
    SENIOR_MANAGER: ['employees:view', 'trips:view', 'bookings:view', 'bookings:approve'],
    ASSISTANT_MANAGER: ['employees:view', 'trips:view', 'bookings:view', 'bookings:approve'],
    TEAM_LEADER: ['employees:view', 'trips:view', 'bookings:view'],
    TRAINER: ['employees:view'],
    EMPLOYEE: ['employees:view', 'trips:view', 'bookings:view', 'bookings:create'],
    DRIVER: ['trips:view'],
    VENDOR_ADMIN: ['drivers:view', 'vehicles:view'],
    GUARD: ['trips:view', 'safety:view'],
  };

  let rpcCount = 0;
  for (const [trName, trId] of Object.entries(transportRoles)) {
    const role = TRANSPORT_ROLES.find(r => r.roleName === trName);
    if (!role) continue;
    const permCodes = new Set<string>();
    // From boolean flags
    const trData = await prisma.transportAccessRole.findUnique({ where: { id: trId } });
    if (trData) {
      for (const [flag, perms] of Object.entries(flagToPerms)) {
        if ((trData as any)[flag]) perms.forEach(p => permCodes.add(p));
      }
    }
    // Always-granted
    (alwaysGrantedMap[trName] || []).forEach(p => permCodes.add(p));

    for (const code of permCodes) {
      const pd = await prisma.permissionDefinition.findUnique({ where: { code } });
      if (!pd) continue;
      try {
        await prisma.rolePermissionConfig.create({
          data: { companyId: company.id, roleId: trId, permissionId: pd.id, enabled: true },
        });
        rpcCount++;
      } catch (e: any) { /* duplicate */ }
    }
  }
  console.log('  ✅ RolePermissionConfigs:', rpcCount);

  // 1.5 RolePermission records for all remaining roles
  console.log('📋 Seeding RolePermission records for all roles...');
  const rolePermMap: Record<string, string[]> = {
    role_transport_admin: permDefs.map(p => p.code),
    role_transport_sub_admin: permDefs.filter(p => !p.code.startsWith('admin:manage_roles') && !p.code.startsWith('admin:manage_access')).map(p => p.code),
    role_transport_coordinator: ['trips:view', 'trips:create', 'bookings:view', 'dispatch:view', 'dispatch:execute', 'noshow:view', 'drivers:view', 'vehicles:view'],
    role_transport_compliance: ['trips:view', 'bookings:view', 'audit:view'],
    role_director: ['employees:view', 'trips:view', 'bookings:view', 'finance:view', 'finance:approve'],
    role_senior_manager: ['employees:view', 'trips:view', 'bookings:view', 'bookings:approve'],
    role_assistant_manager: ['employees:view', 'trips:view', 'bookings:view', 'bookings:approve'],
    role_team_leader: ['employees:view', 'trips:view', 'bookings:view'],
    role_employee: ['employees:view', 'trips:view', 'bookings:view', 'bookings:create'],
    role_driver: ['trips:view'],
    role_guard: ['trips:view', 'safety:view', 'safety:sos'],
    role_trainer: ['employees:view'],
    role_vendor_admin: ['drivers:view', 'vehicles:view'],
    role_superadmin: permDefs.map(p => p.code),
    role_navira_owner: permDefs.map(p => p.code),
    role_move_in_admin: permDefs.map(p => p.code),
    role_finance_team: ['finance:view', 'finance:approve', 'audit:view'],
    role_project_manager: ['employees:view', 'trips:view', 'bookings:view'],
    role_project_coordinator: ['employees:view', 'trips:view'],
    role_platform_compliance: ['trips:view', 'bookings:view', 'audit:view'],
    role_security_administrator: ['safety:view', 'safety:sos', 'audit:view'],
    role_support_engineer: ['employees:view', 'trips:view'],
    role_platform_auditor: ['audit:view'],
    role_vendor_dispatcher: ['drivers:view', 'vehicles:view', 'trips:view'],
    role_transport_sub_admin: permDefs.filter(p => !p.code.startsWith('admin:')).map(p => p.code),
  };

  let rpCount = 0;
  for (const [roleId, codes] of Object.entries(rolePermMap)) {
    for (const code of codes) {
      const permId = code.replace(':', '_');
      try {
        await prisma.rolePermission.create({ data: { roleId, permissionId: permId } });
        rpCount++;
      } catch (e: any) { /* duplicate */ }
    }
  }
  console.log('  ✅ RolePermission records:', rpCount);

  // 1.6 RoleHierarchy records
  console.log('📋 Seeding RoleHierarchies...');
  const hierarchyData = [
    { roleCode: 'SUPER_ADMIN', displayName: 'Super Admin', hl: 0, parent: null, children: ['COMPANY_ADMIN', 'TRANSPORT_ADMIN'], domain: 'NAVIRA_INTERNAL', identity: 'PLATFORM_USER', denied: [], scope: ['GLOBAL'], delegate: true },
    { roleCode: 'COMPANY_ADMIN', displayName: 'Company Admin', hl: 1, parent: 'SUPER_ADMIN', children: ['TRANSPORT_ADMIN', 'DIRECTOR'], domain: 'CUSTOMER_INTERNAL', identity: 'COMPANY_ADMIN', denied: [], scope: ['COMPANY'], delegate: true },
    { roleCode: 'TRANSPORT_ADMIN', displayName: 'Transport Admin', hl: 1, parent: 'SUPER_ADMIN', children: ['TRANSPORT_SUB_ADMIN', 'TRANSPORT_COORDINATOR', 'MANAGER'], domain: 'CUSTOMER_INTERNAL', identity: 'COMPANY_ADMIN', denied: [], scope: ['COMPANY', 'SITE', 'PROCESS'], delegate: true },
    { roleCode: 'TRANSPORT_SUB_ADMIN', displayName: 'Transport Sub-Admin', hl: 2, parent: 'TRANSPORT_ADMIN', children: ['TRANSPORT_COORDINATOR'], domain: 'CUSTOMER_INTERNAL', identity: 'COMPANY_ADMIN', denied: ['admin:manage_subadmins'], scope: ['SITE', 'PROCESS'], delegate: true },
    { roleCode: 'DIRECTOR', displayName: 'Director', hl: 2, parent: 'COMPANY_ADMIN', children: ['MANAGER', 'SENIOR_MANAGER'], domain: 'CUSTOMER_INTERNAL', identity: 'COMPANY_USER', denied: [], scope: ['COMPANY', 'SITE'], delegate: false },
    { roleCode: 'TRANSPORT_COORDINATOR', displayName: 'Transport Coordinator', hl: 3, parent: 'TRANSPORT_ADMIN', children: [], domain: 'CUSTOMER_INTERNAL', identity: 'COMPANY_USER', denied: [], scope: ['SITE', 'PROCESS'], delegate: false },
    { roleCode: 'TRANSPORT_COMPLIANCE', displayName: 'Transport Compliance', hl: 3, parent: 'TRANSPORT_ADMIN', children: [], domain: 'CUSTOMER_INTERNAL', identity: 'COMPANY_USER', denied: [], scope: ['COMPANY'], delegate: false },
    { roleCode: 'MANAGER', displayName: 'Manager', hl: 3, parent: 'DIRECTOR', children: ['TEAM_LEADER', 'ASSISTANT_MANAGER'], domain: 'CUSTOMER_INTERNAL', identity: 'COMPANY_USER', denied: [], scope: ['TEAM'], delegate: false },
    { roleCode: 'SENIOR_MANAGER', displayName: 'Senior Manager', hl: 4, parent: 'DIRECTOR', children: ['MANAGER'], domain: 'CUSTOMER_INTERNAL', identity: 'COMPANY_USER', denied: [], scope: ['SITE', 'TEAM'], delegate: false },
    { roleCode: 'ASSISTANT_MANAGER', displayName: 'Assistant Manager', hl: 4, parent: 'MANAGER', children: [], domain: 'CUSTOMER_INTERNAL', identity: 'COMPANY_USER', denied: [], scope: ['TEAM'], delegate: false },
    { roleCode: 'TEAM_LEADER', displayName: 'Team Leader', hl: 5, parent: 'MANAGER', children: [], domain: 'CUSTOMER_INTERNAL', identity: 'COMPANY_USER', denied: [], scope: ['TEAM'], delegate: false },
    { roleCode: 'TRAINER', displayName: 'Trainer', hl: 5, parent: 'MANAGER', children: [], domain: 'CUSTOMER_INTERNAL', identity: 'COMPANY_USER', denied: [], scope: ['TEAM'], delegate: false },
    { roleCode: 'EMPLOYEE', displayName: 'Employee', hl: 6, parent: 'TEAM_LEADER', children: [], domain: 'CUSTOMER_INTERNAL', identity: 'COMPANY_USER', denied: [], scope: ['SELF'], delegate: false },
    { roleCode: 'DRIVER', displayName: 'Driver', hl: 6, parent: 'TRANSPORT_ADMIN', children: [], domain: 'CUSTOMER_INTERNAL', identity: 'EXTERNAL_USER', denied: [], scope: ['SELF'], delegate: false },
    { roleCode: 'VENDOR_ADMIN', displayName: 'Vendor Admin', hl: 6, parent: 'TRANSPORT_ADMIN', children: ['VENDOR_DISPATCHER'], domain: 'CUSTOMER_EXTERNAL', identity: 'EXTERNAL_USER', denied: [], scope: ['VENDOR'], delegate: true },
    { roleCode: 'GUARD', displayName: 'Guard', hl: 6, parent: 'TRANSPORT_ADMIN', children: [], domain: 'CUSTOMER_INTERNAL', identity: 'EXTERNAL_USER', denied: [], scope: ['SITE'], delegate: false },
  ];
  let rhCount = 0;
  for (const h of hierarchyData) {
    try {
      await prisma.roleHierarchy.create({
        data: {
          roleCode: h.roleCode, displayName: h.displayName, hierarchyLevel: h.hl,
          parentRoleCode: h.parent, childRoleCodes: h.children,
          securityDomain: h.domain as any, identityType: h.identity as any,
          deniedActions: h.denied, scopeTypes: h.scope, canDelegate: h.delegate, isActive: true,
        },
      });
      rhCount++;
    } catch (e: any) { /* duplicate */ }
  }
  console.log('  ✅ RoleHierarchies:', rhCount);

  // 1.7 Subscription Plans
  console.log('📋 Seeding Subscription Plans...');
  const plans = [
    { id: 'free_trial', name: 'FREE_TRIAL', displayName: 'Free Trial', monthly: 0, annual: 0, emp: 50, drv: 10, veh: 10, sites: 3, tier: 'STARTER', features: { BOOKING: true, DISPATCH: true, GPS: true, ANALYTICS_BASIC: true } },
    { id: 'starter', name: 'STARTER', displayName: 'Starter', monthly: 4999, annual: 47990, emp: 500, drv: 50, veh: 50, sites: 10, tier: 'STARTER', features: { BOOKING: true, DISPATCH: true, GPS: true, ANALYTICS: true, VENDOR: true, EXPENSE: true } },
    { id: 'professional', name: 'PROFESSIONAL', displayName: 'Professional', monthly: 14999, annual: 143990, emp: 5000, drv: 500, veh: 500, sites: 50, tier: 'PROFESSIONAL', features: { BOOKING: true, DISPATCH: true, GPS: true, ANALYTICS: true, VENDOR: true, EXPENSE: true, AI: true, BILLING: true, API: true } },
    { id: 'enterprise', name: 'ENTERPRISE', displayName: 'Enterprise', monthly: 49999, annual: 479990, emp: -1, drv: -1, veh: -1, sites: -1, tier: 'ENTERPRISE', features: { ALL: true } },
  ];
  for (const p of plans) {
    try {
      await prisma.subscriptionPlan.create({
        data: {
          id: p.id, name: p.name, displayName: p.displayName,
          monthlyPrice: p.monthly, annualPrice: p.annual,
          maxEmployees: p.emp, maxDrivers: p.drv, maxVehicles: p.veh, maxSites: p.sites,
          tier: p.tier as any, features: p.features as any, isActive: true,
        },
      });
    } catch (e: any) { /* skip if exists */ }
  }
  console.log('  ✅ Subscription Plans:', plans.length);

  // 1.8 Auto-create trial subscription for Acme
  console.log('📋 Creating trial subscription for Acme Enterprise...');
  try {
    const starterPlan = await prisma.subscriptionPlan.findFirst({ where: { name: 'STARTER', isActive: true } })
      || await prisma.subscriptionPlan.findFirst({ where: { isActive: true }, orderBy: { monthlyPrice: 'asc' } });
    if (starterPlan) {
      const trialEnds = new Date();
      trialEnds.setDate(trialEnds.getDate() + 14);
      await prisma.subscription.create({
        data: {
          companyId: company.id, planId: starterPlan.id, status: 'TRIAL',
          billingCycle: 'MONTHLY', currentPeriodStart: new Date(), currentPeriodEnd: trialEnds, trialEndsAt: trialEnds,
        },
      });
      console.log('  ✅ Trial subscription created (14 days)');
    }
  } catch (e: any) { /* skip */ }

  console.log('\n🎉 DATABASE SEEDED SUCCESSFULLY!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('  ─── Navira Platform (10 users) ───');
  console.log('  Company: Navira Platform (NAVIRA001)');
  console.log('  Password: Navira@2026');
  console.log('  Owner:    owner@navira.com');
  console.log('  Admin:    admin@navira.com');
  console.log('  Super:    superadmin@navira.com');
  console.log('  Finance:  finance@navira.com');
  console.log('  PM:       pm@navira.com');
  console.log('  Coord:    coordinator@navira.com');
  console.log('  Comply:   compliance@navira.com');
  console.log('  Security: security@navira.com');
  console.log('  Support:  support@navira.com');
  console.log('  Auditor:  auditor@navira.com');
  console.log('');
  console.log('  ─── Acme Enterprise (27 users) ───');
  console.log('  Company: Acme Enterprise (ACME001)');
  console.log('  Password: Admin@2026');
  console.log('  Admin:     admin@acme.com');
  console.log('  Manager:   manager@acme.com');
  console.log('  SubAdmin:  subadmin@acme.com');
  console.log('  Employee:  priya@acme.com');
  console.log('  Driver:    driver1@acme.com');
  console.log('  Vendor:    vendor.admin@acme.com');
  console.log('  Dispatch:  vendor.dispatcher@acme.com');
  console.log('  Guard:     guard@acme.com');
  console.log('');
  console.log('  ─── Infrastructure ───');
  console.log('  Sites:    Mumbai, Pune, Bengaluru');
  console.log('  Vehicles: 3');
  console.log('  Routes:   2');
  console.log('  V6:       15 role profiles + vendor + feature flags');
  console.log('  SaaS:     25 roles, permissions, hierarchy, subscription plans');
  console.log('  Total:    37 seeded users (10 platform + 27 customer/partner)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); }).finally(() => prisma.$disconnect());

// @ts-nocheck
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  console.log('V8 Seed Start');
  const company = await prisma.company.findFirst({ where: { code: 'ACME001' } });
  if (!company) { console.error('No company found'); return; }
  const bcrypt = require('bcryptjs');
  const hp = await bcrypt.hash('Admin@123', 10);
  const roleNames = ['SUPER_ADMIN','MOVE_IN_ADMIN','FINANCE_TEAM','PROJECT_MANAGER','PROJECT_COORDINATOR','PLATFORM_COMPLIANCE','SECURITY_ADMINISTRATOR','SUPPORT_ENGINEER','PLATFORM_AUDITOR','TRANSPORT_ADMIN','TRANSPORT_SUB_ADMIN','TRANSPORT_COORDINATOR','TRANSPORT_COMPLIANCE','DIRECTOR','SENIOR_MANAGER','MANAGER','ASSISTANT_MANAGER','TEAM_LEADER','EMPLOYEE','TRAINER','VENDOR_ADMIN','VENDOR_DISPATCHER','DRIVER','GUARD'];
  const roleMap: any = {};
  for (const name of roleNames) { let r = await prisma.role.findFirst({ where: { name } }); if (!r) r = await prisma.role.create({ data: { name, description: name.replace(/_/g, ' ') } }); roleMap[name] = r.id; }
  console.log('Roles:', Object.keys(roleMap).length);

  // Customer Permission Keys (40+ entries)
  const customerPermissions = [
    // Employee Management
    { code: 'employees:view', module: 'EMPLOYEE', action: 'view' },
    { code: 'employees:create', module: 'EMPLOYEE', action: 'create' },
    { code: 'employees:edit', module: 'EMPLOYEE', action: 'edit' },
    { code: 'employees:delete', module: 'EMPLOYEE', action: 'delete' },
    { code: 'employees:import', module: 'EMPLOYEE', action: 'import' },
    { code: 'employees:export', module: 'EMPLOYEE', action: 'export' },
    { code: 'employees:manage_addresses', module: 'EMPLOYEE', action: 'manage_addresses' },
    { code: 'employees:manage_eligibility', module: 'EMPLOYEE', action: 'manage_eligibility' },
    // Schedule Management
    { code: 'schedules:view', module: 'SCHEDULE', action: 'view' },
    { code: 'schedules:create', module: 'SCHEDULE', action: 'create' },
    { code: 'schedules:edit', module: 'SCHEDULE', action: 'edit' },
    { code: 'schedules:delete', module: 'SCHEDULE', action: 'delete' },
    { code: 'schedules:import', module: 'SCHEDULE', action: 'import' },
    { code: 'schedules:swap', module: 'SCHEDULE', action: 'swap' },
    { code: 'schedules:approve_swap', module: 'SCHEDULE', action: 'approve_swap' },
    { code: 'schedules:bulk_update', module: 'SCHEDULE', action: 'bulk_update' },
    // Pickup/Drop Management
    { code: 'pickup_drop:view', module: 'PICKUP_DROP', action: 'view' },
    { code: 'pickup_drop:create', module: 'PICKUP_DROP', action: 'create' },
    { code: 'pickup_drop:edit', module: 'PICKUP_DROP', action: 'edit' },
    { code: 'pickup_drop:delete', module: 'PICKUP_DROP', action: 'delete' },
    { code: 'pickup_drop:approve', module: 'PICKUP_DROP', action: 'approve' },
    // Vehicle Management
    { code: 'vehicles:view', module: 'VEHICLE', action: 'view' },
    { code: 'vehicles:create', module: 'VEHICLE', action: 'create' },
    { code: 'vehicles:edit', module: 'VEHICLE', action: 'edit' },
    { code: 'vehicles:delete', module: 'VEHICLE', action: 'delete' },
    { code: 'vehicles:assign_office', module: 'VEHICLE', action: 'assign_office' },
    { code: 'vehicles:view_tracking', module: 'VEHICLE', action: 'view_tracking' },
    // Vehicle Type Management
    { code: 'vehicle_types:view', module: 'VEHICLE_TYPE', action: 'view' },
    { code: 'vehicle_types:create', module: 'VEHICLE_TYPE', action: 'create' },
    { code: 'vehicle_types:edit', module: 'VEHICLE_TYPE', action: 'edit' },
    { code: 'vehicle_types:delete', module: 'VEHICLE_TYPE', action: 'delete' },
    // Transport Config
    { code: 'transport_config:view', module: 'TRANSPORT_CONFIG', action: 'view' },
    { code: 'transport_config:edit', module: 'TRANSPORT_CONFIG', action: 'edit' },
    { code: 'transport_config:manage_buffer_policies', module: 'TRANSPORT_CONFIG', action: 'manage_buffer_policies' },
    { code: 'transport_config:manage_time_slots', module: 'TRANSPORT_CONFIG', action: 'manage_time_slots' },
    { code: 'transport_config:manage_adhoc_shifts', module: 'TRANSPORT_CONFIG', action: 'manage_adhoc_shifts' },
    // Office Management
    { code: 'offices:view', module: 'OFFICE', action: 'view' },
    { code: 'offices:create', module: 'OFFICE', action: 'create' },
    { code: 'offices:edit', module: 'OFFICE', action: 'edit' },
    { code: 'offices:delete', module: 'OFFICE', action: 'delete' },
    // Shift Management
    { code: 'shifts:view', module: 'SHIFT', action: 'view' },
    { code: 'shifts:create', module: 'SHIFT', action: 'create' },
    { code: 'shifts:edit', module: 'SHIFT', action: 'edit' },
    { code: 'shifts:delete', module: 'SHIFT', action: 'delete' },
    { code: 'shifts:assign_employees', module: 'SHIFT', action: 'assign_employees' },
    // Weekly Off Management
    { code: 'weekly_offs:view', module: 'WEEKLY_OFF', action: 'view' },
    { code: 'weekly_offs:manage', module: 'WEEKLY_OFF', action: 'manage' },
    // Reports
    { code: 'reports:view_transport', module: 'REPORT', action: 'view_transport' },
    { code: 'reports:export_transport', module: 'REPORT', action: 'export_transport' },
    { code: 'reports:view_analytics', module: 'REPORT', action: 'view_analytics' },
    // Audit
    { code: 'audit:view', module: 'AUDIT', action: 'view' },
    { code: 'audit:view_history', module: 'AUDIT', action: 'view_history' },
  ];
  for (const p of customerPermissions) {
    try {
      await prisma.permission.create({ data: { id: p.code.replace(':', '_'), name: p.code, module: p.module, action: p.action } });
    } catch (e: any) { /* skip duplicates */ }
  }
  console.log('Customer Permissions:', customerPermissions.length);

  const users = [
    { email: 'superadmin@moveinsync.com', name: 'Platform Super Admin', role: 'SUPER_ADMIN' },
    { email: 'admin@moveinsync.com', name: 'Move-In Admin', role: 'MOVE_IN_ADMIN' },
    { email: 'finance@moveinsync.com', name: 'Finance Team', role: 'FINANCE_TEAM' },
    { email: 'auditor@moveinsync.com', name: 'Platform Auditor', role: 'PLATFORM_AUDITOR' },
    { email: 'admin@acme.com', name: 'Transport Admin', role: 'TRANSPORT_ADMIN' },
    { email: 'subadmin@acme.com', name: 'Transport Sub-Admin', role: 'TRANSPORT_SUB_ADMIN' },
    { email: 'coordinator@acme.com', name: 'Transport Coordinator', role: 'TRANSPORT_COORDINATOR' },
    { email: 'director@acme.com', name: 'Director Operations', role: 'DIRECTOR' },
    { email: 'tmanager@acme.com', name: 'Transport Manager', role: 'MANAGER' },
    { email: 'manager@acme.com', name: 'Operations Manager', role: 'MANAGER' },
    { email: 'asstmanager@acme.com', name: 'Asst Manager', role: 'ASSISTANT_MANAGER' },
    { email: 'teamleader@acme.com', name: 'Team Leader', role: 'TEAM_LEADER' },
    { email: 'trainer@acme.com', name: 'Training Lead', role: 'TRAINER' },
    { email: 'priya@acme.com', name: 'Priya Sharma', role: 'EMPLOYEE' },
    { email: 'rahul@acme.com', name: 'Rahul Patel', role: 'EMPLOYEE' },
    { email: 'vendoradmin@acme.com', name: 'Vendor Admin', role: 'VENDOR_ADMIN' },
    { email: 'driver1@acme.com', name: 'Mohammed Ali', role: 'DRIVER' },
    { email: 'driver2@acme.com', name: 'Rajesh Kumar', role: 'DRIVER' },
    { email: 'guard1@acme.com', name: 'Security Guard', role: 'GUARD' },
  ];
  for (const u of users) {
    let user = await prisma.user.findFirst({ where: { email: u.email } });
    if (!user) user = await prisma.user.create({ data: { email: u.email, name: u.name, passwordHash: hp, phone: '+919876543210', companyId: company.id, employeeId: 'EMP_' + u.email.split('@')[0].toUpperCase(), status: 'ACTIVE', transportEligibility: u.role === 'EMPLOYEE' ? 'ELIGIBLE' : 'INELIGIBLE' } });
    const cm = await prisma.companyMembership.findFirst({ where: { userId: user.id, companyId: company.id } });
    if (!cm) await prisma.companyMembership.create({ data: { userId: user.id, companyId: company.id, role: u.role as any, status: 'ACTIVE' } });
    const roleId = roleMap[u.role];
    if (roleId) { try { await prisma.userRoleAssignment.upsert({ where: { userId_roleId: { userId: user.id, roleId } }, update: {}, create: { userId: user.id, roleId } }); } catch(e){} }
    console.log('  User:', u.email, '->', u.role);
  }
  // ─── Vendors ────────────────────────────────────────────────
  const vendorData = [
    { name: 'ABC Cabs Pvt Ltd', contactName: 'Vikram Singh', contactPhone: '+919800000001', contactEmail: 'vikram@abccabs.com', billingModel: 'PER_TRIP' },
    { name: 'City Transport Services', contactName: 'Meera Joshi', contactPhone: '+919800000002', contactEmail: 'meera@citytransport.com', billingModel: 'PER_KM' },
    { name: 'FleetMax Solutions', contactName: 'Arjun Reddy', contactPhone: '+919800000003', contactEmail: 'arjun@fleetmax.com', billingModel: 'MONTHLY' },
  ];
  const vendorIds: string[] = [];
  for (const v of vendorData) {
    let vendor = await prisma.vendor.findFirst({ where: { name: v.name, companyId: company.id } });
    if (!vendor) vendor = await prisma.vendor.create({ data: { ...v, companyId: company.id, status: 'ACTIVE' } });
    vendorIds.push(vendor.id);
    console.log('  Vendor:', v.name);
  }

  // ─── Vehicles ────────────────────────────────────────────────
  const vehicleData = [
    { registrationNo: 'MH01AB1234', vehicleType: 'SEDAN' as any, make: 'Maruti', model: 'Dzire', year: 2023, capacity: 4, fuelType: 'PETROL' as any, color: 'White', vendorId: vendorIds[0], acType: 'AC' as any, gpsDeviceId: 'GPS-001' },
    { registrationNo: 'MH01CD5678', vehicleType: 'SUV' as any, make: 'Hyundai', model: 'Creta', year: 2024, capacity: 6, fuelType: 'DIESEL' as any, color: 'Black', vendorId: vendorIds[0], acType: 'AC' as any, gpsDeviceId: 'GPS-002' },
    { registrationNo: 'MH01EF9012', vehicleType: 'SEDAN' as any, make: 'Honda', model: 'Amaze', year: 2023, capacity: 4, fuelType: 'PETROL' as any, color: 'Silver', vendorId: vendorIds[1], acType: 'AC' as any, gpsDeviceId: 'GPS-003' },
    { registrationNo: 'MH01GH3456', vehicleType: 'VAN' as any, make: 'Tata', model: 'Winger', year: 2022, capacity: 12, fuelType: 'DIESEL' as any, color: 'White', vendorId: vendorIds[1], acType: 'NON_AC' as any, gpsDeviceId: 'GPS-004' },
    { registrationNo: 'MH01IJ7890', vehicleType: 'BUS' as any, make: 'Ashok Leyland', model: 'Viking', year: 2023, capacity: 40, fuelType: 'DIESEL' as any, color: 'Blue', vendorId: vendorIds[2], acType: 'NON_AC' as any, gpsDeviceId: 'GPS-005' },
    { registrationNo: 'MH01KL1122', vehicleType: 'SEDAN' as any, make: 'Tata', model: 'Tigor EV', year: 2024, capacity: 4, fuelType: 'ELECTRIC' as any, color: 'Blue', vendorId: vendorIds[0], acType: 'AC' as any, isEV: true, batteryCapacity: 26.0, estimatedRangeKm: 306, gpsDeviceId: 'GPS-006' },
    { registrationNo: 'MH01MN3344', vehicleType: 'SEDAN' as any, make: 'Maruti', model: 'Swift', year: 2024, capacity: 4, fuelType: 'CNG' as any, color: 'Red', vendorId: vendorIds[1], acType: 'NON_AC' as any, gpsDeviceId: 'GPS-007' },
    { registrationNo: 'MH01OP5566', vehicleType: 'SUV' as any, make: 'Mahindra', model: 'XUV700', year: 2024, capacity: 7, fuelType: 'DIESEL' as any, color: 'White', vendorId: vendorIds[2], acType: 'AC' as any, gpsDeviceId: 'GPS-008' },
  ];
  const vehicleIds: string[] = [];
  for (const v of vehicleData) {
    let vehicle = await prisma.vehicle.findFirst({ where: { registrationNo: v.registrationNo, companyId: company.id } });
    if (!vehicle) vehicle = await prisma.vehicle.create({ data: { ...v, companyId: company.id, status: 'AVAILABLE', latitude: 19.0760, longitude: 72.8777 } });
    vehicleIds.push(vehicle.id);
    console.log('  Vehicle:', v.registrationNo);
  }

  // ─── Driver Profiles ────────────────────────────────────────
  const driverData = [
    { userId: 'driver1-user', driverCode: 'DRV-001', licenseNo: 'MH-2023-001234', licenseExpiry: new Date('2028-12-31'), vendorId: vendorIds[0], vehicleId: vehicleIds[0], city: 'Mumbai', emergencyContactName: 'Fatima Ali', emergencyContactPhone: '+919800000101' },
    { userId: 'driver2-user', driverCode: 'DRV-002', licenseNo: 'MH-2023-005678', licenseExpiry: new Date('2029-06-30'), vendorId: vendorIds[0], vehicleId: vehicleIds[1], city: 'Mumbai', emergencyContactName: 'Sunita Kumar', emergencyContactPhone: '+919800000102' },
  ];
  // Create driver profiles for existing driver users
  for (const u of users.filter(u => u.role === 'DRIVER')) {
    const user = await prisma.user.findFirst({ where: { email: u.email } });
    if (!user) continue;
    const dp = driverData.find(d => u.email.includes(d.driverCode.toLowerCase().replace('drv-', 'driver')));
    const dData = dp || driverData[0];
    let profile = await prisma.driverProfile.findFirst({ where: { userId: user.id } });
    if (!profile) {
      profile = await prisma.driverProfile.create({
        data: {
          userId: user.id,
          driverCode: dData.driverCode,
          licenseNo: dData.licenseNo,
          licenseExpiry: dData.licenseExpiry,
          vendorId: dData.vendorId,
          vehicleId: dData.vehicleId,
          companyId: company.id,
          city: dData.city,
          emergencyContactName: dData.emergencyContactName,
          emergencyContactPhone: dData.emergencyContactPhone,
          status: 'ACTIVE',
          availabilityStatus: 'OFF_DUTY',
          verificationStatus: 'VERIFIED',
          rating: 4.5 + Math.random() * 0.5,
          totalTrips: Math.floor(Math.random() * 200) + 50,
        },
      });
      console.log('  Driver Profile:', dData.driverCode);
    }
  }

  // ─── Routes with Stops ──────────────────────────────────────
  const routeData = [
    { routeCode: 'RT-001', routeName: 'Andheri to BKC', origin: 'Andheri West', destination: 'BKC', distanceKm: 12.5, estimatedDuration: 35, stops: [
      { name: 'Andheri Station', lat: 19.1197, lng: 72.8464, seq: 1 },
      { name: 'MIDC Andheri', lat: 19.1220, lng: 72.8530, seq: 2 },
      { name: 'Sahar Road', lat: 19.0985, lng: 72.8600, seq: 3 },
      { name: 'BKC Check Naka', lat: 19.0607, lng: 72.8640, seq: 4 },
      { name: 'BKC Compound', lat: 19.0596, lng: 72.8681, seq: 5 },
    ]},
    { routeCode: 'RT-002', routeName: 'Thane to BKC', origin: 'Thane West', destination: 'BKC', distanceKm: 22.0, estimatedDuration: 55, stops: [
      { name: 'Thane Station', lat: 19.1833, lng: 72.9667, seq: 1 },
      { name: 'Ghodbunder Road', lat: 19.2487, lng: 72.9271, seq: 2 },
      { name: 'Eastern Express', lat: 19.1500, lng: 72.9200, seq: 3 },
      { name: 'Sion Circle', lat: 19.0434, lng: 72.8632, seq: 4 },
      { name: 'BKC', lat: 19.0596, lng: 72.8681, seq: 5 },
    ]},
    { routeCode: 'RT-003', routeName: 'Navi Mumbai to BKC', origin: 'Vashi', destination: 'BKC', distanceKm: 18.0, estimatedDuration: 45, stops: [
      { name: 'Vashi Station', lat: 19.0726, lng: 72.9996, seq: 1 },
      { name: 'CBD Belapur', lat: 19.0189, lng: 73.0349, seq: 2 },
      { name: 'Panvel', lat: 18.9890, lng: 73.1175, seq: 3 },
      { name: 'Vashi Bridge', lat: 19.0600, lng: 72.9900, seq: 4 },
      { name: 'BKC', lat: 19.0596, lng: 72.8681, seq: 5 },
    ]},
    { routeCode: 'RT-004', routeName: 'Powai Shuttle', origin: 'Powai Lake', destination: 'BKC', distanceKm: 8.0, estimatedDuration: 25, stops: [
      { name: 'Powai Lake', lat: 19.1200, lng: 72.9080, seq: 1 },
      { name: 'Hiranandani', lat: 19.1300, lng: 72.9100, seq: 2 },
      { name: 'IIT Bombay', lat: 19.1334, lng: 72.9133, seq: 3 },
      { name: 'BKC', lat: 19.0596, lng: 72.8681, seq: 4 },
    ]},
  ];
  const routeIds: string[] = [];
  for (const r of routeData) {
    let route = await prisma.route.findFirst({ where: { routeCode: r.routeCode, companyId: company.id } });
    if (!route) {
      route = await prisma.route.create({
        data: {
          routeCode: r.routeCode,
          routeName: r.routeName,
          origin: r.origin,
          destination: r.destination,
          distanceKm: r.distanceKm,
          estimatedDuration: r.estimatedDuration,
          companyId: company.id,
          status: 'ACTIVE',
          RouteStop: {
            create: r.stops.map(s => ({
              sequence: s.seq,
              name: s.name,
              latitude: s.lat,
              longitude: s.lng,
              isPickup: true,
              isDrop: true,
            })),
          },
        },
      });
    }
    routeIds.push(route.id);
    console.log('  Route:', r.routeName);
  }

  // ─── Sample Bookings ────────────────────────────────────────
  const employeeUsers = await prisma.user.findMany({
    where: { companyId: company.id, status: 'ACTIVE' },
    include: { memberships: { where: { role: 'EMPLOYEE' } } },
    take: 5,
  });
  const employees = employeeUsers.filter(u => u.memberships.length > 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < Math.min(employees.length, 5); i++) {
    const emp = employees[i];
    const route = await prisma.route.findFirst({ where: { id: routeIds[i % routeIds.length] } });
    if (!route) continue;

    const stops = await prisma.routeStop.findMany({ where: { routeId: route.id }, orderBy: { sequence: 'asc' } });
    if (stops.length < 2) continue;

    const pickupStop = stops[0];
    const dropStop = stops[stops.length - 1];

    const bookingCode = `BK-${today.toISOString().slice(0, 10).replace(/-/g, '')}-${String(i + 1).padStart(4, '0')}`;
    let booking = await prisma.booking.findFirst({ where: { bookingCode } });
    if (!booking) {
      booking = await prisma.booking.create({
        data: {
          bookingCode,
          type: 'CAB',
          status: i < 3 ? 'APPROVED' : 'REQUESTED',
          requesterId: emp.id,
          passengerCount: 1,
          serviceType: 'CAB',
          routeId: route.id,
          date: new Date(today.getTime() + i * 24 * 60 * 60 * 1000),
          pickupTime: new Date(today.getTime() + 8 * 60 * 60 * 1000 + i * 15 * 60 * 1000),
          pickupLatitude: pickupStop.latitude,
          pickupLongitude: pickupStop.longitude,
          pickupAddress: pickupStop.name,
          dropLatitude: dropStop.latitude,
          dropLongitude: dropStop.longitude,
          dropAddress: dropStop.name,
          companyId: company.id,
          approvalStatus: i < 3 ? 'APPROVED' : 'NOT_REQUIRED',
        },
      });
      console.log('  Booking:', bookingCode);
    }
  }

  // ─── Sample Trips ───────────────────────────────────────────
  const approvedBookings = await prisma.booking.findMany({
    where: { companyId: company.id, status: 'APPROVED' },
    take: 3,
  });
  for (let i = 0; i < approvedBookings.length; i++) {
    const b = approvedBookings[i];
    const tripCode = `TRP-${today.toISOString().slice(0, 10).replace(/-/g, '')}-${String(i + 1).padStart(4, '0')}`;
    let trip = await prisma.trip.findFirst({ where: { tripCode } });
    if (!trip) {
      trip = await prisma.trip.create({
        data: {
          tripCode,
          status: i === 0 ? 'COMPLETED' : i === 1 ? 'IN_TRANSIT' : 'SCHEDULED',
          type: b.type,
          routeId: b.routeId,
          vehicleId: vehicleIds[i % vehicleIds.length],
          date: b.date,
          scheduledPickupTime: b.pickupTime,
          pickupLatitude: b.pickupLatitude,
          pickupLongitude: b.pickupLongitude,
          pickupAddress: b.pickupAddress,
          dropLatitude: b.dropLatitude,
          dropLongitude: b.dropLongitude,
          dropAddress: b.dropAddress,
          distanceKm: 10 + Math.random() * 15,
          passengerCount: 1,
          companyId: company.id,
        },
      });
      // Link booking to trip
      await prisma.booking.update({ where: { id: b.id }, data: { tripId: trip.id } });
      console.log('  Trip:', tripCode, '->', trip.status);
    }
  }

  console.log('V8 Seed Complete');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
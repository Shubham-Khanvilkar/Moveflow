import { PrismaClient, VehicleStatus, DriverAvailabilityStatus, DriverAccountStatus, VerificationStatus, FuelType, OwnershipType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Seeding expanded operational data (drivers, vehicles, routes, geofences, nodal points)...\n');

  const companyId = 'comp_acme_001';

  // ============================================================
  // 1. EXPANDED DRIVERS (10 total with varied statuses)
  // ============================================================
  console.log('👤 Creating additional drivers...');

  const additionalDrivers = [
    { id: 'user_driver_004', name: 'Vikram Singh', phone: '+919876543243', driverCode: 'DRV-004', licenseNo: 'DL-10-2021-1122334', rating: 4.6, availabilityStatus: DriverAvailabilityStatus.AVAILABLE, status: DriverAccountStatus.ACTIVE },
    { id: 'user_driver_005', name: 'Anita Deshmukh', phone: '+919876543244', driverCode: 'DRV-005', licenseNo: 'MH-02-2020-5566778', rating: 4.9, availabilityStatus: DriverAvailabilityStatus.ON_TRIP, status: DriverAccountStatus.ACTIVE },
    { id: 'user_driver_006', name: 'Suresh Patel', phone: '+919876543245', driverCode: 'DRV-006', licenseNo: 'GJ-01-2019-9988776', rating: 4.3, availabilityStatus: DriverAvailabilityStatus.OFF_DUTY, status: DriverAccountStatus.ACTIVE },
    { id: 'user_driver_007', name: 'Meena Kumari', phone: '+919876543246', driverCode: 'DRV-007', licenseNo: 'KA-05-2022-3344556', rating: 4.7, availabilityStatus: DriverAvailabilityStatus.AVAILABLE, status: DriverAccountStatus.ACTIVE },
    { id: 'user_driver_008', name: 'Rajesh Verma', phone: '+919876543247', driverCode: 'DRV-008', licenseNo: 'UP-32-2021-7788990', rating: 4.1, availabilityStatus: DriverAvailabilityStatus.AVAILABLE, status: DriverAccountStatus.ACTIVE },
    { id: 'user_driver_009', name: 'Fatima Khan', phone: '+919876543248', driverCode: 'DRV-009', licenseNo: 'MH-03-2020-1122998', rating: 4.8, availabilityStatus: DriverAvailabilityStatus.ON_TRIP, status: DriverAccountStatus.ACTIVE },
    { id: 'user_driver_010', name: 'Ganesh Rao', phone: '+919876543249', driverCode: 'DRV-010', licenseNo: 'TN-09-2019-4455667', rating: 4.4, availabilityStatus: DriverAvailabilityStatus.AVAILABLE, status: DriverAccountStatus.ACTIVE },
  ];

  for (const d of additionalDrivers) {
    await prisma.user.upsert({
      where: { id: d.id },
      update: {},
      create: {
        id: d.id,
        email: `${d.driverCode.toLowerCase()}@acme.com`,
        name: d.name,
        phone: d.phone,
        companyId,
        status: 'ACTIVE',
        securityDomain: 'CUSTOMER_INTERNAL',
        identityType: 'CUSTOMER_USER',
      },
    });

    await prisma.driverProfile.upsert({
      where: { userId: d.id },
      update: {},
      create: {
        userId: d.id,
        driverCode: d.driverCode,
        licenseNo: d.licenseNo,
        licenseExpiry: new Date('2028-12-31'),
        status: d.status,
        availabilityStatus: d.availabilityStatus,
        verificationStatus: VerificationStatus.VERIFIED,
        rating: d.rating,
        totalTrips: Math.floor(Math.random() * 200) + 50,
        city: 'Mumbai',
        companyId,
      },
    });
  }
  console.log(`✅ Additional drivers: ${additionalDrivers.length}`);

  // ============================================================
  // 2. EXPANDED VEHICLES (8 total with varied statuses)
  // ============================================================
  console.log('🚗 Creating additional vehicles...');

  const additionalVehicles = [
    { id: 'vehicle_004', registrationNo: 'MH04GH3456', make: 'Hyundai', model: 'Creta', vehicleType: 'SUV' as const, capacity: 6, fuelType: FuelType.PETROL, status: VehicleStatus.AVAILABLE, acType: 'AC' as const },
    { id: 'vehicle_005', registrationNo: 'MH05IJ7890', make: 'Tata', model: 'Tiago EV', vehicleType: 'SEDAN' as const, capacity: 4, fuelType: FuelType.ELECTRIC, status: VehicleStatus.IN_TRIP, acType: 'AC' as const },
    { id: 'vehicle_006', registrationNo: 'KA02KL1234', make: 'Force', model: 'Traveller', vehicleType: 'VAN' as const, capacity: 12, fuelType: FuelType.DIESEL, status: VehicleStatus.AVAILABLE, acType: 'NON_AC' as const },
    { id: 'vehicle_007', registrationNo: 'DL06MN5678', make: 'Tata', model: 'Winger', vehicleType: 'VAN' as const, capacity: 15, fuelType: FuelType.DIESEL, status: VehicleStatus.MAINTENANCE, acType: 'NON_AC' as const },
    { id: 'vehicle_008', registrationNo: 'GJ01OP9012', make: 'Eicher', model: 'Skyline', vehicleType: 'BUS' as const, capacity: 40, fuelType: FuelType.DIESEL, status: VehicleStatus.AVAILABLE, acType: 'AC' as const },
    { id: 'vehicle_009', registrationNo: 'TN07QR3456', make: 'Mahindra', model: 'Bolero', vehicleType: 'SUV' as const, capacity: 7, fuelType: FuelType.DIESEL, status: VehicleStatus.AVAILABLE, acType: 'NON_AC' as const },
    { id: 'vehicle_010', registrationNo: 'UP32ST7890', make: 'Maruti', model: 'Ertiga', vehicleType: 'SUV' as const, capacity: 7, fuelType: FuelType.CNG, status: VehicleStatus.IN_TRIP, acType: 'NON_AC' as const },
  ];

  for (const v of additionalVehicles) {
    await prisma.vehicle.upsert({
      where: { id: v.id },
      update: {},
      create: {
        id: v.id,
        registrationNo: v.registrationNo,
        vehicleType: v.vehicleType as any,
        make: v.make,
        model: v.model,
        capacity: v.capacity,
        fuelType: v.fuelType,
        status: v.status,
        acType: v.acType as any,
        ownershipType: OwnershipType.COMPANY_OWNED,
        companyId,
        passengerCapacity: v.capacity,
      },
    });
  }
  console.log(`✅ Additional vehicles: ${additionalVehicles.length}`);

  // ============================================================
  // 3. EXPANDED ROUTES (5 total with stops)
  // ============================================================
  console.log('🛣️ Creating additional routes...');

  const additionalRoutes = [
    { id: 'route_mum_002', routeCode: 'MUM-002', routeName: 'BKC to Powai', origin: 'BKC', destination: 'Powai', distanceKm: 8.5, estimatedDuration: 25 },
    { id: 'route_blr_001', routeCode: 'BLR-001', routeName: 'Whitefield to Electronic City', origin: 'Whitefield', destination: 'Electronic City', distanceKm: 22.0, estimatedDuration: 55 },
    { id: 'route_del_001', routeCode: 'DEL-001', routeName: 'Gurgaon to Cyber Hub', origin: 'Gurgaon', destination: 'Cyber Hub', distanceKm: 5.2, estimatedDuration: 15 },
  ];

  for (const r of additionalRoutes) {
    await prisma.route.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        routeCode: r.routeCode,
        routeName: r.routeName,
        origin: r.origin,
        destination: r.destination,
        distanceKm: r.distanceKm,
        estimatedDuration: r.estimatedDuration,
        companyId,
        status: 'ACTIVE',
      },
    });
  }
  console.log(`✅ Additional routes: ${additionalRoutes.length}`);

  // ============================================================
  // 4. DRIVER-VEHICLE ASSIGNMENTS
  // ============================================================
  console.log('🔗 Creating driver-vehicle assignments...');

  const assignments = [
    { driverId: 'user_driver_004', vehicleId: 'vehicle_004' },
    { driverId: 'user_driver_005', vehicleId: 'vehicle_005' },
    { driverId: 'user_driver_007', vehicleId: 'vehicle_006' },
    { driverId: 'user_driver_008', vehicleId: 'vehicle_009' },
    { driverId: 'user_driver_010', vehicleId: 'vehicle_008' },
  ];

  for (const a of assignments) {
    await prisma.driverProfile.update({
      where: { userId: a.driverId },
      data: { vehicleId: a.vehicleId },
    }).catch(() => {});
  }
  console.log(`✅ Driver-vehicle assignments: ${assignments.length}`);

  // ============================================================
  // 5. VENDOR CONTRACTS (3 total)
  // ============================================================
  console.log('📋 Creating additional vendor contracts...');

  const vendors = [
    { id: 'vendor_002', name: 'Mumbai Mobility Partners', contactName: 'Rakesh Sharma', contactPhone: '+919876543250', contactEmail: 'rakesh@mmp.com', billingModel: 'PER_TRIP', status: 'ACTIVE' as const },
    { id: 'vendor_003', name: 'BLR Transport Solutions', contactName: 'Priya Nair', contactPhone: '+919876543251', contactEmail: 'priya@blrts.com', billingModel: 'FIXED_MONTHLY', status: 'ACTIVE' as const },
  ];

  for (const v of vendors) {
    await prisma.vendor.upsert({
      where: { id: v.id },
      update: {},
      create: {
        ...v,
        companyId,
        contractStart: new Date('2026-01-01'),
        contractEnd: new Date('2027-12-31'),
      },
    });
  }
  console.log(`✅ Additional vendors: ${vendors.length}`);

  // ============================================================
  // 6. GEOFENCES (3 site geofences)
  // ============================================================
  console.log('📍 Creating geofences...');

  const geofences = [
    { id: 'geo_mumbai', name: 'Mumbai Office Geofence', siteId: 'site_mumbai', areaType: 'RADIUS' as const, centerLatitude: 19.076, centerLongitude: 72.8777, radiusMeters: 500 },
    { id: 'geo_pune', name: 'Pune Office Geofence', siteId: 'site_pune', areaType: 'RADIUS' as const, centerLatitude: 18.52, centerLongitude: 73.8567, radiusMeters: 500 },
    { id: 'geo_bengaluru', name: 'Bengaluru Office Geofence', siteId: 'site_bengaluru', areaType: 'RADIUS' as const, centerLatitude: 12.971, centerLongitude: 77.5946, radiusMeters: 500 },
  ];

  for (const g of geofences) {
    await prisma.geofence.upsert({
      where: { id: g.id },
      update: {},
      create: {
        ...g,
        companyId,
        isActive: true,
      },
    }).catch(() => console.log(`  ⚠️ Skipped geofence ${g.name} (model may not exist)`));
  }
  console.log(`✅ Geofences: ${geofences.length}`);

  // ============================================================
  // 7. NODAL POINTS (5 pickup/drop aggregation points)
  // ============================================================
  console.log('📍 Creating nodal points...');

  const nodalPoints = [
    { id: 'np_mum_001', name: 'Andheri Station Pickup Point', siteId: 'site_mumbai', latitude: 19.1197, longitude: 72.8464, capacity: 20, currentOccupancy: 0, billingZone: 'MUM-NORTH' },
    { id: 'np_mum_002', name: 'BKC Drop Zone', siteId: 'site_mumbai', latitude: 19.0596, longitude: 72.8656, capacity: 30, currentOccupancy: 0, billingZone: 'MUM-CENTRAL' },
    { id: 'np_pun_001', name: 'Hinjewadi Phase 3 Hub', siteId: 'site_pune', latitude: 18.5913, longitude: 73.7389, capacity: 25, currentOccupancy: 0, billingZone: 'PUN-WEST' },
    { id: 'np_blr_001', name: 'Whitefield Tech Park Point', siteId: 'site_bengaluru', latitude: 12.9698, longitude: 77.7500, capacity: 40, currentOccupancy: 0, billingZone: 'BLR-EAST' },
    { id: 'np_blr_002', name: 'Koramangala Transit Hub', siteId: 'site_bengaluru', latitude: 12.9352, longitude: 77.6245, capacity: 20, currentOccupancy: 0, billingZone: 'BLR-SOUTH' },
  ];

  for (const np of nodalPoints) {
    await prisma.nodalPoint.upsert({
      where: { id: np.id },
      update: {},
      create: {
        ...np,
        companyId,
        isActive: true,
        areaType: 'RADIUS',
        radiusMeters: 200,
      },
    }).catch(() => console.log(`  ⚠️ Skipped nodal point ${np.name} (model may not exist)`));
  }
  console.log(`✅ Nodal points: ${nodalPoints.length}`);

  // ============================================================
  // 8. FEATURE FLAGS
  // ============================================================
  console.log('🏁 Ensuring feature flags...');

  const featureFlags = [
    { key: 'AI_DISPATCH', isEnabled: false, description: 'AI-powered auto dispatch' },
    { key: 'NEW_BILLING_ENGINE', isEnabled: true, description: 'New billing engine v2' },
    { key: 'PLATFORM_MAINTENANCE', isEnabled: false, description: 'Platform maintenance mode' },
    { key: 'GPS_LIVE_TRACKING', isEnabled: true, description: 'Real-time GPS tracking' },
    { key: 'NOTIFICATION_SMS', isEnabled: false, description: 'SMS notifications' },
    { key: 'NOTIFICATION_WHATSAPP', isEnabled: false, description: 'WhatsApp notifications' },
    { key: 'ADVANCED_REPORTING', isEnabled: true, description: 'Advanced analytics and reporting' },
  ];

  for (const f of featureFlags) {
    await prisma.featureFlag.upsert({
      where: { key: f.key },
      update: { isEnabled: f.isEnabled },
      create: { ...f, companyId },
    }).catch(() => {});
  }
  console.log(`✅ Feature flags: ${featureFlags.length}`);

  console.log('\n🎉 Expanded seed data complete!');
}

main()
  .catch((e) => {
    console.error('❌ Expanded seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

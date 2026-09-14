import { PrismaClient, BookingType, BookingMode, BookingStatus, ServiceType, ApprovalStatus, TripStatus, VehicleType, AcType, NightChargeType, TollPolicy, ParkingPolicy } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Seeding operational data (bookings, trips, rate cards, GPS, compliance)...\n');

  const companyId = 'comp_acme_001';
  const adminId = 'user_admin_001';
  const managerId = 'user_manager_001';
  const routeId1 = 'route_mum_001';
  const routeId2 = 'route_pun_001';

  // Get employee IDs for bookings
  const employees = await prisma.user.findMany({
    where: { companyId, status: 'ACTIVE' },
    take: 10,
  });

  if (employees.length < 5) {
    console.error('❌ Need at least 5 employees. Run seed.ts first.');
    process.exit(1);
  }

  // ============================================================
  // 1. RATE CARDS (4 cards for different vehicle/service types)
  // ============================================================
  console.log('📊 Creating Rate Cards...');

  const rateCards = [
    {
      id: 'rc_sedan_ac',
      name: 'AC Sedan - Standard',
      code: 'SED-AC-STD',
      companyId,
      serviceType: ServiceType.CAB,
      vehicleType: VehicleType.SEDAN,
      acType: AcType.AC,
      city: 'Mumbai',
      baseFare: 150,
      perKmRate: 14,
      perHourRate: 200,
      minimumKm: 4,
      minimumFare: 200,
      waitingChargePerMin: 5,
      freeWaitingMinutes: 15,
      nightChargeType: NightChargeType.PERCENTAGE,
      nightChargeValue: 25,
      tollPolicy: TollPolicy.NOT_INCLUDED,
      parkingPolicy: ParkingPolicy.MANUALLY_ENTERED,
      effectiveFrom: new Date('2026-01-01'),
      isActive: true,
      priority: 1,
      version: 1,
    },
    {
      id: 'rc_suv_ac',
      name: 'AC SUV - Premium',
      code: 'SUV-AC-PRM',
      companyId,
      serviceType: ServiceType.CAB,
      vehicleType: VehicleType.SUV,
      acType: AcType.AC,
      city: 'Mumbai',
      baseFare: 250,
      perKmRate: 18,
      perHourRate: 280,
      minimumKm: 5,
      minimumFare: 350,
      waitingChargePerMin: 7,
      freeWaitingMinutes: 10,
      nightChargeType: NightChargeType.PERCENTAGE,
      nightChargeValue: 30,
      tollPolicy: TollPolicy.INCLUDED,
      parkingPolicy: ParkingPolicy.MANUALLY_ENTERED,
      effectiveFrom: new Date('2026-01-01'),
      isActive: true,
      priority: 2,
      version: 1,
    },
    {
      id: 'rc_shuttle_15',
      name: '15-Seater Shuttle',
      code: 'SHU-15',
      companyId,
      serviceType: ServiceType.SHUTTLE,
      vehicleType: VehicleType.VAN,
      acType: AcType.AC,
      city: 'Pune',
      baseFare: 500,
      perKmRate: 25,
      perHourRate: 350,
      minimumKm: 10,
      minimumFare: 800,
      waitingChargePerMin: 10,
      freeWaitingMinutes: 10,
      nightChargeType: NightChargeType.FIXED,
      nightChargeValue: 200,
      tollPolicy: TollPolicy.INCLUDED,
      parkingPolicy: ParkingPolicy.NOT_APPLICABLE,
      effectiveFrom: new Date('2026-01-01'),
      isActive: true,
      priority: 3,
      version: 1,
    },
    {
      id: 'rc_outstation',
      name: 'Outstation Sedan',
      code: 'OUT-SED',
      companyId,
      serviceType: ServiceType.CAB,
      vehicleType: VehicleType.SEDAN,
      acType: AcType.AC,
      city: 'Bengaluru',
      baseFare: 300,
      perKmRate: 16,
      perHourRate: 220,
      minimumKm: 50,
      minimumFare: 1200,
      waitingChargePerMin: 5,
      freeWaitingMinutes: 20,
      nightChargeType: NightChargeType.PERCENTAGE,
      nightChargeValue: 20,
      tollPolicy: TollPolicy.INCLUDED,
      parkingPolicy: ParkingPolicy.MANUALLY_ENTERED,
      effectiveFrom: new Date('2026-01-01'),
      isActive: true,
      priority: 4,
      version: 1,
    },
  ];

  for (const rc of rateCards) {
    await prisma.rateCard.upsert({
      where: { id: rc.id },
      update: rc,
      create: rc,
    });
  }
  console.log(`✅ Rate Cards: ${rateCards.length}`);

  // ============================================================
  // 2. BOOKINGS (15 bookings in various statuses)
  // ============================================================
  console.log('\n📋 Creating Bookings...');

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const bookings = [
    // Past bookings (completed)
    {
      id: 'bk_001',
      bookingCode: 'BK-2026-001',
      type: BookingType.CAB,
      bookingMode: BookingMode.OWN,
      status: BookingStatus.COMPLETED,
      requesterId: employees[0].id,
      passengerCount: 1,
      serviceType: ServiceType.CAB,
      routeId: routeId1,
      date: yesterday,
      pickupTime: new Date(yesterday.getTime() + 9 * 60 * 60 * 1000),
      pickupLatitude: 19.13,
      pickupLongitude: 72.90,
      pickupAddress: 'Priya Residence, Andheri West',
      dropLatitude: 19.0596,
      dropLongitude: 72.8656,
      dropAddress: 'BKC Complex, Mumbai',
      purpose: 'Office commute',
      companyId,
      approvalStatus: ApprovalStatus.APPROVED,
      approvedById: managerId,
      approvedAt: new Date(yesterday.getTime() - 3600000),
    },
    {
      id: 'bk_002',
      bookingCode: 'BK-2026-002',
      type: BookingType.CAB,
      bookingMode: BookingMode.OWN,
      status: BookingStatus.COMPLETED,
      requesterId: employees[1].id,
      passengerCount: 1,
      serviceType: ServiceType.CAB,
      routeId: routeId1,
      date: yesterday,
      pickupTime: new Date(yesterday.getTime() + 18 * 60 * 60 * 1000),
      pickupLatitude: 19.0596,
      pickupLongitude: 72.8656,
      pickupAddress: 'BKC Complex, Mumbai',
      dropLatitude: 18.55,
      dropLongitude: 73.88,
      dropAddress: 'Amit Residence, Pune',
      purpose: 'Return trip',
      companyId,
      approvalStatus: ApprovalStatus.APPROVED,
      approvedById: managerId,
      approvedAt: new Date(yesterday.getTime() - 7200000),
    },
    // Today's bookings
    {
      id: 'bk_003',
      bookingCode: 'BK-2026-003',
      type: BookingType.CAB,
      bookingMode: BookingMode.OWN,
      status: BookingStatus.CONFIRMED,
      requesterId: employees[2].id,
      passengerCount: 2,
      serviceType: ServiceType.CAB,
      routeId: routeId2,
      date: today,
      pickupTime: new Date(today.getTime() + 10 * 60 * 60 * 1000),
      pickupLatitude: 13.02,
      pickupLongitude: 77.60,
      pickupAddress: 'Sneha Residence, Bengaluru',
      dropLatitude: 12.971,
      dropLongitude: 77.5946,
      dropAddress: 'Tech Park, Bengaluru',
      purpose: 'Client meeting',
      companyId,
      approvalStatus: ApprovalStatus.APPROVED,
      approvedById: managerId,
      approvedAt: new Date(today.getTime() - 86400000),
    },
    {
      id: 'bk_004',
      bookingCode: 'BK-2026-004',
      type: BookingType.SHUTTLE,
      bookingMode: BookingMode.OWN,
      status: BookingStatus.REQUESTED,
      requesterId: employees[3].id,
      passengerCount: 1,
      serviceType: ServiceType.SHUTTLE,
      routeId: routeId1,
      date: today,
      pickupTime: new Date(today.getTime() + 8 * 60 * 60 * 1000),
      pickupLatitude: 19.10,
      pickupLongitude: 72.92,
      pickupAddress: 'Vikram Residence, Dadar',
      dropLatitude: 19.0596,
      dropLongitude: 72.8656,
      dropAddress: 'BKC Complex, Mumbai',
      purpose: 'Morning shift',
      companyId,
      approvalStatus: ApprovalStatus.NOT_REQUIRED,
    },
    {
      id: 'bk_005',
      bookingCode: 'BK-2026-005',
      type: BookingType.CAB,
      bookingMode: BookingMode.MANAGER,
      managerBookerId: managerId,
      status: BookingStatus.APPROVED,
      requesterId: employees[4].id,
      passengerCount: 1,
      serviceType: ServiceType.CAB,
      routeId: routeId2,
      date: today,
      pickupTime: new Date(today.getTime() + 9 * 60 * 60 * 1000),
      pickupLatitude: 18.53,
      pickupLongitude: 73.86,
      pickupAddress: 'Anjali Residence, Pune',
      dropLatitude: 18.5134,
      dropLongitude: 73.9294,
      dropAddress: 'Magarpatta City, Pune',
      purpose: 'Team meeting',
      companyId,
      approvalStatus: ApprovalStatus.APPROVED,
      approvedById: managerId,
      approvedAt: new Date(today.getTime() - 43200000),
    },
    // Future bookings
    {
      id: 'bk_006',
      bookingCode: 'BK-2026-006',
      type: BookingType.CAB,
      bookingMode: BookingMode.OWN,
      status: BookingStatus.CONFIRMED,
      requesterId: employees[5].id,
      passengerCount: 3,
      serviceType: ServiceType.CAB,
      routeId: routeId1,
      date: tomorrow,
      pickupTime: new Date(tomorrow.getTime() + 9 * 60 * 60 * 1000),
      pickupLatitude: 13.05,
      pickupLongitude: 77.58,
      pickupAddress: 'Rahul Residence, Bengaluru',
      dropLatitude: 12.971,
      dropLongitude: 77.5946,
      dropAddress: 'Office Park, Bengaluru',
      purpose: 'Project visit',
      companyId,
      approvalStatus: ApprovalStatus.APPROVED,
      approvedById: managerId,
      approvedAt: new Date(today.getTime() - 86400000),
    },
    {
      id: 'bk_007',
      bookingCode: 'BK-2026-007',
      type: BookingType.CAB,
      bookingMode: BookingMode.OWN,
      status: BookingStatus.REQUESTED,
      requesterId: employees[6].id,
      passengerCount: 1,
      serviceType: ServiceType.CAB,
      routeId: routeId2,
      date: tomorrow,
      pickupTime: new Date(tomorrow.getTime() + 10 * 60 * 60 * 1000),
      pickupLatitude: 19.15,
      pickupLongitude: 72.85,
      pickupAddress: 'Deepa Residence, Mumbai',
      dropLatitude: 18.52,
      dropLongitude: 73.8567,
      dropAddress: 'Pune Office',
      purpose: 'Inter-city cab',
      companyId,
      approvalStatus: ApprovalStatus.NOT_REQUIRED,
    },
    {
      id: 'bk_008',
      bookingCode: 'BK-2026-008',
      type: BookingType.CAB,
      bookingMode: BookingMode.OWN,
      status: BookingStatus.REQUESTED,
      requesterId: employees[7].id,
      passengerCount: 1,
      serviceType: ServiceType.CAB,
      routeId: routeId1,
      date: tomorrow,
      pickupTime: new Date(tomorrow.getTime() + 18 * 60 * 60 * 1000),
      pickupLatitude: 18.50,
      pickupLongitude: 73.90,
      pickupAddress: 'Suresh Residence, Pune',
      dropLatitude: 19.076,
      dropLongitude: 72.8777,
      dropAddress: 'Mumbai Airport',
      purpose: 'Airport transfer',
      companyId,
      approvalStatus: ApprovalStatus.NOT_REQUIRED,
    },
    // Cancelled bookings
    {
      id: 'bk_009',
      bookingCode: 'BK-2026-009',
      type: BookingType.CAB,
      bookingMode: BookingMode.OWN,
      status: BookingStatus.CANCELLED,
      requesterId: employees[8].id,
      passengerCount: 1,
      serviceType: ServiceType.CAB,
      routeId: routeId2,
      date: yesterday,
      pickupTime: new Date(yesterday.getTime() + 14 * 60 * 60 * 1000),
      pickupLatitude: 13.00,
      pickupLongitude: 77.62,
      pickupAddress: 'Meera Residence, Bengaluru',
      dropLatitude: 12.971,
      dropLongitude: 77.5946,
      dropAddress: 'Office, Bengaluru',
      purpose: 'Cancelled due to holiday',
      companyId,
      cancelledAt: new Date(yesterday.getTime() - 7200000),
      cancellationReason: 'Public holiday declared',
      approvalStatus: ApprovalStatus.APPROVED,
    },
    {
      id: 'bk_010',
      bookingCode: 'BK-2026-010',
      type: BookingType.SHUTTLE,
      bookingMode: BookingMode.MANAGER,
      managerBookerId: managerId,
      status: BookingStatus.COMPLETED,
      requesterId: employees[9].id,
      passengerCount: 12,
      serviceType: ServiceType.SHUTTLE,
      routeId: routeId1,
      date: yesterday,
      pickupTime: new Date(yesterday.getTime() + 8 * 60 * 60 * 1000),
      pickupLatitude: 19.08,
      pickupLongitude: 72.88,
      pickupAddress: 'Office Complex, Andheri',
      dropLatitude: 19.0596,
      dropLongitude: 72.8656,
      dropAddress: 'BKC Complex, Mumbai',
      purpose: 'Team shuttle',
      companyId,
      approvalStatus: ApprovalStatus.APPROVED,
      approvedById: managerId,
      approvedAt: new Date(yesterday.getTime() - 86400000),
    },
    // More future bookings for testing
    {
      id: 'bk_011',
      bookingCode: 'BK-2026-011',
      type: BookingType.CAB,
      bookingMode: BookingMode.OWN,
      status: BookingStatus.CONFIRMED,
      requesterId: employees[0].id,
      passengerCount: 1,
      serviceType: ServiceType.CAB,
      routeId: routeId1,
      date: dayAfter,
      pickupTime: new Date(dayAfter.getTime() + 9 * 60 * 60 * 1000),
      pickupLatitude: 19.13,
      pickupLongitude: 72.90,
      pickupAddress: 'Priya Residence, Andheri West',
      dropLatitude: 19.0596,
      dropLongitude: 72.8656,
      dropAddress: 'BKC Complex, Mumbai',
      purpose: 'Office commute',
      companyId,
      approvalStatus: ApprovalStatus.APPROVED,
      approvedById: managerId,
    },
    {
      id: 'bk_012',
      bookingCode: 'BK-2026-012',
      type: BookingType.CAB,
      bookingMode: BookingMode.OWN,
      status: BookingStatus.REQUESTED,
      requesterId: employees[1].id,
      passengerCount: 1,
      serviceType: ServiceType.CAB,
      routeId: routeId2,
      date: dayAfter,
      pickupTime: new Date(dayAfter.getTime() + 10 * 60 * 60 * 1000),
      pickupLatitude: 18.55,
      pickupLongitude: 73.88,
      pickupAddress: 'Amit Residence, Pune',
      dropLatitude: 18.5134,
      dropLongitude: 73.9294,
      dropAddress: 'Magarpatta City, Pune',
      purpose: 'Client visit',
      companyId,
      approvalStatus: ApprovalStatus.NOT_REQUIRED,
    },
    // Pending approval
    {
      id: 'bk_013',
      bookingCode: 'BK-2026-013',
      type: BookingType.CAB,
      bookingMode: BookingMode.OWN,
      status: BookingStatus.PENDING_APPROVAL,
      requesterId: employees[2].id,
      passengerCount: 1,
      serviceType: ServiceType.CAB,
      routeId: routeId1,
      date: tomorrow,
      pickupTime: new Date(tomorrow.getTime() + 17 * 60 * 60 * 1000),
      pickupLatitude: 13.02,
      pickupLongitude: 77.60,
      pickupAddress: 'Sneha Residence, Bengaluru',
      dropLatitude: 19.076,
      dropLongitude: 72.8777,
      dropAddress: 'Mumbai Airport',
      purpose: 'Business travel',
      companyId,
      approvalStatus: ApprovalStatus.PENDING,
    },
    // No-show booking
    {
      id: 'bk_014',
      bookingCode: 'BK-2026-014',
      type: BookingType.CAB,
      bookingMode: BookingMode.OWN,
      status: BookingStatus.NO_SHOW,
      requesterId: employees[3].id,
      passengerCount: 1,
      serviceType: ServiceType.CAB,
      routeId: routeId1,
      date: yesterday,
      pickupTime: new Date(yesterday.getTime() + 11 * 60 * 60 * 1000),
      pickupLatitude: 19.10,
      pickupLongitude: 72.92,
      pickupAddress: 'Vikram Residence, Dadar',
      dropLatitude: 19.0596,
      dropLongitude: 72.8656,
      dropAddress: 'BKC Complex, Mumbai',
      purpose: 'No-show employee',
      companyId,
      approvalStatus: ApprovalStatus.APPROVED,
      approvedById: managerId,
    },
    // Rejected booking
    {
      id: 'bk_015',
      bookingCode: 'BK-2026-015',
      type: BookingType.CAB,
      bookingMode: BookingMode.OWN,
      status: BookingStatus.REJECTED,
      requesterId: employees[4].id,
      passengerCount: 1,
      serviceType: ServiceType.CAB,
      routeId: routeId2,
      date: yesterday,
      pickupTime: new Date(yesterday.getTime() + 16 * 60 * 60 * 1000),
      pickupLatitude: 18.53,
      pickupLongitude: 73.86,
      pickupAddress: 'Anjali Residence, Pune',
      dropLatitude: 19.076,
      dropLongitude: 72.8777,
      dropAddress: 'Mumbai Office',
      purpose: 'Personal trip',
      companyId,
      approvalStatus: ApprovalStatus.REJECTED,
      rejectionReason: 'Personal trips not allowed on company transport',
    },
  ];

  for (const bk of bookings) {
    await prisma.booking.upsert({
      where: { id: bk.id },
      update: bk,
      create: bk,
    });
  }
  console.log(`✅ Bookings: ${bookings.length}`);

  // ============================================================
  // 3. TRIPS (9 trips - some completed, some in-progress, some scheduled)
  // ============================================================
  console.log('\n🚗 Creating Trips...');

  const trips = [
    // Completed trips
    {
      id: 'trip_001',
      tripCode: 'TRIP-2026-001',
      status: TripStatus.COMPLETED,
      type: BookingType.CAB,
      routeId: routeId1,
      vehicleId: 'vehicle_001',
      driverId: 'user_driver_001',
      date: yesterday,
      scheduledPickupTime: new Date(yesterday.getTime() + 9 * 60 * 60 * 1000),
      actualPickupTime: new Date(yesterday.getTime() + 9 * 60 * 60 * 1000 + 300000),
      scheduledDropTime: new Date(yesterday.getTime() + 9 * 60 * 60 * 1000 + 35 * 60 * 1000),
      actualDropTime: new Date(yesterday.getTime() + 9 * 60 * 60 * 1000 + 40 * 60 * 1000),
      pickupLatitude: 19.13,
      pickupLongitude: 72.90,
      pickupAddress: 'Priya Residence, Andheri West',
      dropLatitude: 19.0596,
      dropLongitude: 72.8656,
      dropAddress: 'BKC Complex, Mumbai',
      distanceKm: 12.5,
      plannedDuration: 35,
      actualDuration: 40,
      estimatedCost: 325,
      actualCost: 340,
      passengerCount: 1,
      boardedCount: 1,
      companyId,
    },
    {
      id: 'trip_002',
      tripCode: 'TRIP-2026-002',
      status: TripStatus.COMPLETED,
      type: BookingType.CAB,
      routeId: routeId1,
      vehicleId: 'vehicle_002',
      driverId: 'user_driver_002',
      date: yesterday,
      scheduledPickupTime: new Date(yesterday.getTime() + 18 * 60 * 60 * 1000),
      actualPickupTime: new Date(yesterday.getTime() + 18 * 60 * 60 * 1000 + 600000),
      scheduledDropTime: new Date(yesterday.getTime() + 18 * 60 * 60 * 1000 + 45 * 60 * 1000),
      actualDropTime: new Date(yesterday.getTime() + 18 * 60 * 60 * 1000 + 50 * 60 * 1000),
      pickupLatitude: 19.0596,
      pickupLongitude: 72.8656,
      pickupAddress: 'BKC Complex, Mumbai',
      dropLatitude: 18.55,
      dropLongitude: 73.88,
      dropAddress: 'Amit Residence, Pune',
      distanceKm: 120,
      plannedDuration: 180,
      actualDuration: 190,
      estimatedCost: 2400,
      actualCost: 2450,
      passengerCount: 1,
      boardedCount: 1,
      companyId,
    },
    {
      id: 'trip_003',
      tripCode: 'TRIP-2026-003',
      status: TripStatus.COMPLETED,
      type: BookingType.SHUTTLE,
      routeId: routeId1,
      vehicleId: 'vehicle_003',
      driverId: 'user_driver_003',
      date: yesterday,
      scheduledPickupTime: new Date(yesterday.getTime() + 8 * 60 * 60 * 1000),
      actualPickupTime: new Date(yesterday.getTime() + 8 * 60 * 60 * 1000 + 180000),
      scheduledDropTime: new Date(yesterday.getTime() + 8 * 60 * 60 * 1000 + 40 * 60 * 1000),
      actualDropTime: new Date(yesterday.getTime() + 8 * 60 * 60 * 1000 + 45 * 60 * 1000),
      pickupLatitude: 19.08,
      pickupLongitude: 72.88,
      pickupAddress: 'Office Complex, Andheri',
      dropLatitude: 19.0596,
      dropLongitude: 72.8656,
      dropAddress: 'BKC Complex, Mumbai',
      distanceKm: 10,
      plannedDuration: 40,
      actualDuration: 45,
      estimatedCost: 750,
      actualCost: 780,
      passengerCount: 12,
      boardedCount: 11,
      noShowCount: 1,
      companyId,
    },
    // In-progress trips (today)
    {
      id: 'trip_004',
      tripCode: 'TRIP-2026-004',
      status: TripStatus.IN_PROGRESS,
      type: BookingType.CAB,
      routeId: routeId2,
      vehicleId: 'vehicle_001',
      driverId: 'user_driver_001',
      date: today,
      scheduledPickupTime: new Date(today.getTime() + 9 * 60 * 60 * 1000),
      actualPickupTime: new Date(today.getTime() + 9 * 60 * 60 * 1000 + 300000),
      pickupLatitude: 13.02,
      pickupLongitude: 77.60,
      pickupAddress: 'Sneha Residence, Bengaluru',
      dropLatitude: 12.971,
      dropLongitude: 77.5946,
      dropAddress: 'Tech Park, Bengaluru',
      distanceKm: 8.5,
      plannedDuration: 25,
      estimatedCost: 269,
      passengerCount: 2,
      boardedCount: 2,
      isTracking: true,
      startedAt: new Date(today.getTime() + 9 * 60 * 60 * 1000 + 300000),
      companyId,
    },
    {
      id: 'trip_005',
      tripCode: 'TRIP-2026-005',
      status: TripStatus.BOARDING,
      type: BookingType.SHUTTLE,
      routeId: routeId1,
      vehicleId: 'vehicle_003',
      driverId: 'user_driver_003',
      date: today,
      scheduledPickupTime: new Date(today.getTime() + 8 * 60 * 60 * 1000),
      actualPickupTime: new Date(today.getTime() + 8 * 60 * 60 * 1000 + 120000),
      pickupLatitude: 19.08,
      pickupLongitude: 72.88,
      pickupAddress: 'Office Complex, Andheri',
      dropLatitude: 19.0596,
      dropLongitude: 72.8656,
      dropAddress: 'BKC Complex, Mumbai',
      distanceKm: 10,
      plannedDuration: 40,
      estimatedCost: 750,
      passengerCount: 15,
      boardedCount: 10,
      isTracking: true,
      startedAt: new Date(today.getTime() + 8 * 60 * 60 * 1000 + 120000),
      companyId,
    },
    {
      id: 'trip_006',
      tripCode: 'TRIP-2026-006',
      status: TripStatus.ARRIVED,
      type: BookingType.CAB,
      routeId: routeId1,
      vehicleId: 'vehicle_002',
      driverId: 'user_driver_002',
      date: today,
      scheduledPickupTime: new Date(today.getTime() + 10 * 60 * 60 * 1000),
      pickupLatitude: 18.55,
      pickupLongitude: 73.88,
      pickupAddress: 'Amit Residence, Pune',
      dropLatitude: 18.5134,
      dropLongitude: 73.9294,
      dropAddress: 'Magarpatta City, Pune',
      distanceKm: 18.2,
      plannedDuration: 45,
      estimatedCost: 577,
      passengerCount: 1,
      isTracking: true,
      companyId,
    },
    // Scheduled trips (future)
    {
      id: 'trip_007',
      tripCode: 'TRIP-2026-007',
      status: TripStatus.SCHEDULED,
      type: BookingType.CAB,
      routeId: routeId1,
      vehicleId: 'vehicle_001',
      driverId: 'user_driver_001',
      date: tomorrow,
      scheduledPickupTime: new Date(tomorrow.getTime() + 9 * 60 * 60 * 1000),
      pickupLatitude: 19.13,
      pickupLongitude: 72.90,
      pickupAddress: 'Priya Residence, Andheri West',
      dropLatitude: 19.0596,
      dropLongitude: 72.8656,
      dropAddress: 'BKC Complex, Mumbai',
      distanceKm: 12.5,
      plannedDuration: 35,
      estimatedCost: 325,
      passengerCount: 1,
      companyId,
    },
    {
      id: 'trip_008',
      tripCode: 'TRIP-2026-008',
      status: TripStatus.SCHEDULED,
      type: BookingType.CAB,
      routeId: routeId2,
      vehicleId: 'vehicle_002',
      driverId: 'user_driver_002',
      date: tomorrow,
      scheduledPickupTime: new Date(tomorrow.getTime() + 10 * 60 * 60 * 1000),
      pickupLatitude: 13.05,
      pickupLongitude: 77.58,
      pickupAddress: 'Rahul Residence, Bengaluru',
      dropLatitude: 12.971,
      dropLongitude: 77.5946,
      dropAddress: 'Office Park, Bengaluru',
      distanceKm: 8,
      plannedDuration: 25,
      estimatedCost: 278,
      passengerCount: 3,
      companyId,
    },
    {
      id: 'trip_009',
      tripCode: 'TRIP-2026-009',
      status: TripStatus.CANCELLED,
      type: BookingType.CAB,
      routeId: routeId1,
      vehicleId: 'vehicle_003',
      driverId: 'user_driver_003',
      date: yesterday,
      scheduledPickupTime: new Date(yesterday.getTime() + 11 * 60 * 60 * 1000),
      pickupLatitude: 19.10,
      pickupLongitude: 72.92,
      pickupAddress: 'Vikram Residence, Dadar',
      dropLatitude: 19.0596,
      dropLongitude: 72.8656,
      dropAddress: 'BKC Complex, Mumbai',
      distanceKm: 11,
      plannedDuration: 30,
      estimatedCost: 304,
      passengerCount: 1,
      companyId,
    },
  ];

  for (const trip of trips) {
    await prisma.trip.upsert({
      where: { id: trip.id },
      update: trip,
      create: trip,
    });
  }
  console.log(`✅ Trips: ${trips.length}`);

  // ============================================================
  // 4. GPS LOGS (for in-progress trips)
  // ============================================================
  console.log('\n📍 Creating GPS Logs...');

  // Generate GPS points for trip_004 (Bengaluru route)
  const trip4StartLat = 13.02;
  const trip4StartLng = 77.60;
  const trip4EndLat = 12.971;
  const trip4EndLng = 77.5946;
  const gpsLogs4 = [];
  for (let i = 0; i < 20; i++) {
    const progress = i / 19;
    gpsLogs4.push({
      id: `gps_trip004_${String(i + 1).padStart(3, '0')}`,
      companyId,
      vehicleId: 'vehicle_001',
      driverId: 'user_driver_001',
      tripId: 'trip_004',
      latitude: trip4StartLat + (trip4EndLat - trip4StartLat) * progress + (Math.random() - 0.5) * 0.001,
      longitude: trip4StartLng + (trip4EndLng - trip4StartLng) * progress + (Math.random() - 0.5) * 0.001,
      speed: 20 + Math.random() * 40,
      heading: 180 + Math.random() * 30,
      accuracy: 5 + Math.random() * 10,
      battery: 70 + Math.floor(Math.random() * 25),
      signal: 80 + Math.floor(Math.random() * 20),
      recordedAt: new Date(today.getTime() + 9 * 60 * 60 * 1000 + 300000 + i * 60000),
    });
  }

  // Generate GPS points for trip_005 (Mumbai shuttle)
  const trip5StartLat = 19.08;
  const trip5StartLng = 72.88;
  const trip5EndLat = 19.0596;
  const trip5EndLng = 72.8656;
  const gpsLogs5 = [];
  for (let i = 0; i < 15; i++) {
    const progress = i / 14;
    gpsLogs5.push({
      id: `gps_trip005_${String(i + 1).padStart(3, '0')}`,
      companyId,
      vehicleId: 'vehicle_003',
      driverId: 'user_driver_003',
      tripId: 'trip_005',
      latitude: trip5StartLat + (trip5EndLat - trip5StartLat) * progress + (Math.random() - 0.5) * 0.001,
      longitude: trip5StartLng + (trip5EndLng - trip5StartLng) * progress + (Math.random() - 0.5) * 0.001,
      speed: 15 + Math.random() * 30,
      heading: 200 + Math.random() * 20,
      accuracy: 5 + Math.random() * 10,
      battery: 65 + Math.floor(Math.random() * 30),
      signal: 75 + Math.floor(Math.random() * 25),
      recordedAt: new Date(today.getTime() + 8 * 60 * 60 * 1000 + 120000 + i * 60000),
    });
  }

  const allGpsLogs = [...gpsLogs4, ...gpsLogs5];
  for (const log of allGpsLogs) {
    await prisma.gPSLog.upsert({
      where: { id: log.id },
      update: log,
      create: log,
    });
  }
  console.log(`✅ GPS Logs: ${allGpsLogs.length}`);

  // ============================================================
  // 5. COMPLIANCE DOCUMENTS
  // ============================================================
  console.log('\n📄 Creating Compliance Documents...');

  const complianceDocs = [
    {
      id: 'comp_doc_001',
      companyId,
      entityType: 'VEHICLE' as const,
      entityId: 'vehicle_001',
      documentType: 'REGISTRATION_CERTIFICATE' as const,
      documentNumber: 'MH01AB1234',
      documentName: 'Vehicle Registration - MH01AB1234',
      issueDate: new Date('2025-01-15'),
      expiryDate: new Date('2027-01-14'),
      issuingAuthority: 'RTO Mumbai',
      status: 'VERIFIED' as const,
      verificationStatus: 'APPROVED' as const,
      verifiedById: adminId,
      verifiedAt: new Date('2025-02-01'),
      fileName: 'MH01AB1234_registration.pdf',
      fileUrl: '/uploads/compliance/MH01AB1234_registration.pdf',
    },
    {
      id: 'comp_doc_002',
      companyId,
      entityType: 'VEHICLE' as const,
      entityId: 'vehicle_002',
      documentType: 'REGISTRATION_CERTIFICATE' as const,
      documentNumber: 'MH02CD5678',
      documentName: 'Vehicle Registration - MH02CD5678',
      issueDate: new Date('2025-03-10'),
      expiryDate: new Date('2027-03-09'),
      issuingAuthority: 'RTO Mumbai',
      status: 'VERIFIED' as const,
      verificationStatus: 'APPROVED' as const,
      verifiedById: adminId,
      verifiedAt: new Date('2025-04-01'),
      fileName: 'MH02CD5678_registration.pdf',
      fileUrl: '/uploads/compliance/MH02CD5678_registration.pdf',
    },
    {
      id: 'comp_doc_003',
      companyId,
      entityType: 'VEHICLE' as const,
      entityId: 'vehicle_001',
      documentType: 'INSURANCE' as const,
      documentNumber: 'INS-2026-001',
      documentName: 'Vehicle Insurance - All Risks',
      issueDate: new Date('2026-01-01'),
      expiryDate: new Date('2026-12-31'),
      issuingAuthority: 'ICICI Lombard',
      status: 'VERIFIED' as const,
      verificationStatus: 'APPROVED' as const,
      verifiedById: adminId,
      verifiedAt: new Date('2026-01-05'),
      fileName: 'INS-2026-001_insurance.pdf',
      fileUrl: '/uploads/compliance/INS-2026-001_insurance.pdf',
    },
    {
      id: 'comp_doc_004',
      companyId,
      entityType: 'DRIVER' as const,
      entityId: 'user_driver_001',
      documentType: 'REGISTRATION_CERTIFICATE' as const,
      documentNumber: 'DL-2026-001',
      documentName: 'Driver License - Mohammed Ali',
      issueDate: new Date('2026-01-01'),
      expiryDate: new Date('2028-12-31'),
      issuingAuthority: 'RTO Mumbai',
      status: 'VERIFIED' as const,
      verificationStatus: 'APPROVED' as const,
      verifiedById: adminId,
      verifiedAt: new Date('2026-01-10'),
      fileName: 'DL-2026-001_driver.pdf',
      fileUrl: '/uploads/compliance/DL-2026-001_driver.pdf',
    },
  ];

  for (const doc of complianceDocs) {
    await prisma.complianceDocument.upsert({
      where: { id: doc.id },
      update: doc,
      create: doc,
    });
  }
  console.log(`✅ Compliance Documents: ${complianceDocs.length}`);

  // ============================================================
  // 6. TRIP PASSENGERS (for multi-passenger trips)
  // ============================================================
  console.log('\n👥 Creating Trip Passengers...');

  const tripPassengers = [
    { id: 'tp_001', tripId: 'trip_004', userId: employees[2].id, boardingStatus: 'PICKED_UP' as const, boardTime: new Date(today.getTime() + 9 * 60 * 60 * 1000 + 300000) },
    { id: 'tp_002', tripId: 'trip_004', userId: employees[3].id, boardingStatus: 'PICKED_UP' as const, boardTime: new Date(today.getTime() + 9 * 60 * 60 * 1000 + 360000) },
    { id: 'tp_003', tripId: 'trip_005', userId: employees[0].id, boardingStatus: 'PICKED_UP' as const, boardTime: new Date(today.getTime() + 8 * 60 * 60 * 1000 + 120000) },
    { id: 'tp_004', tripId: 'trip_005', userId: employees[1].id, boardingStatus: 'PICKED_UP' as const, boardTime: new Date(today.getTime() + 8 * 60 * 60 * 1000 + 180000) },
    { id: 'tp_005', tripId: 'trip_005', userId: employees[4].id, boardingStatus: 'SCHEDULED' as const, boardTime: null },
    { id: 'tp_006', tripId: 'trip_005', userId: employees[5].id, boardingStatus: 'NO_SHOW' as const, boardTime: null },
  ];

  for (const tp of tripPassengers) {
    await prisma.tripPassenger.upsert({
      where: { id: tp.id },
      update: tp,
      create: tp,
    });
  }
  console.log(`✅ Trip Passengers: ${tripPassengers.length}`);

  console.log('\n🎉 OPERATIONAL SEED COMPLETE!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Rate Cards:     4');
  console.log('  Bookings:      15');
  console.log('  Trips:          9');
  console.log('  GPS Logs:      35');
  console.log('  Compliance:     4');
  console.log('  Passengers:     6');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Operational seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

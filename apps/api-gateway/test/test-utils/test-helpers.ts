import * as bcrypt from 'bcryptjs';

let idCounter = 0;
function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${++idCounter}`;
}

export function createMockPrisma(overrides?: Record<string, any>) {
  const modelMethodNames = [
    'findFirst', 'findMany', 'findUnique', 'create', 'update', 'upsert', 'delete',
    'deleteMany', 'updateMany', 'count', 'aggregate', 'groupBy', 'createMany',
  ];

  const models = [
    'user', 'company', 'companyMembership', 'session', 'vehicle', 'driverProfile',
    'booking', 'bookingPassenger', 'trip', 'tripPassenger', 'tripCost', 'tripCostSnapshot',
    'rateCard', 'rateCardVersion', 'costCenter', 'vendorInvoice', 'auditLog',
    'employeeAddress', 'savedLocation', 'emergencyContact', 'notification',
    'complianceDocument', 'vehicleInspection', 'vehicleMaintenance', 'vehicleBreakdown',
    'driverWorkSession', 'driverShift', 'driverVehicleAssignment', 'driverOnboarding',
    'invitation', 'geofence', 'geofenceEvent', 'routeDeviation', 'incident',
    'sOSAlert', 'locationPing', 'vehicleLocation', 'latestVehicleLocation',
    'employeeSchedule', 'employeeWeeklyOff', 'employeeScheduleHistory', 'employeeHistory',
    'shiftBufferPolicy', 'transportPolicy', 'transportBan', 'transportAccessRole',
    'transportAccessAssignment', 'permissionDefinition', 'rolePermissionConfig',
    'rolePermission', 'role', 'userRoleAssignment', 'accessScope',
    'noShowPolicyConfig', 'noShowEvidence', 'employeeNoShowRecord', 'noShowAppeal',
    'pickupArrivalEvent', 'passengerContactAttempt', 'supervisorCallRequest',
    'replacementAssignment', 'dispatchAssignment', 'driverTrip',
    'region', 'companySite', 'lineOfBusiness', 'orgProcess', 'shift',
    'department', 'businessUnit',
    'employeeOrgAssignment', 'approvalEntry', 'recurringBooking',
    'budgetAllocation', 'subscription', 'subscriptionUsage', 'aPIKey', 'webhook',
    'webhookDelivery', 'billingPricingRule', 'platformInvoice', 'taxRuleDefinition',
    'fxRateSnapshot', 'usageMeteringRecord', 'safeReachRecord', 'marshalAssignment',
    'passengerBoarding', 'userAccessScopeHistory', 'gPSLog',
  ];

  const prisma: any = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $transaction: jest.fn().mockImplementation((fn: any) => {
      if (typeof fn === 'function') {
        return fn(prisma);
      }
      return Promise.all(fn);
    }),
    isConnected: jest.fn().mockReturnValue(true),
    ...overrides,
  };

  for (const model of models) {
    if (!prisma[model]) {
      prisma[model] = {};
      for (const method of modelMethodNames) {
        prisma[model][method] = jest.fn();
      }
    }
  }

  return prisma;
}

export function createMockAudit() {
  return {
    log: jest.fn().mockResolvedValue(undefined),
    logBatch: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue({ data: [], total: 0 }),
  };
}

export async function createTestCompanyData(prisma: any) {
  const companyId = uniqueId('comp');

  const company = await prisma.company.create({
    data: {
      id: companyId,
      name: `Test Company ${companyId}`,
      code: companyId.toUpperCase().substring(0, 10),
      slug: companyId,
      status: 'ACTIVE',
      country: 'India',
      city: 'Mumbai',
    },
  });

  const site = await prisma.companySite.create({
    data: {
      id: uniqueId('site'),
      companyId,
      siteCode: 'MUM',
      siteName: 'Mumbai',
      city: 'Mumbai',
      latitude: 19.076,
      longitude: 72.8777,
      isActive: true,
    },
  });

  const shift = await prisma.shift.create({
    data: {
      id: uniqueId('shift'),
      companyId,
      name: 'Morning',
      startTime: '06:00',
      endTime: '15:00',
    },
  });

  const passwordHash = await bcrypt.hash('Test@12345', 12);
  const admin = await prisma.user.create({
    data: {
      id: uniqueId('user'),
      companyId,
      employeeId: uniqueId('ADM'),
      email: `admin-${companyId}@test.com`,
      name: 'Test Admin',
      passwordHash,
      phone: '9999999999',
      status: 'ACTIVE',
      transportEligibility: 'ELIGIBLE',
    },
  });

  await prisma.companyMembership.create({
    data: {
      id: uniqueId('mem'),
      userId: admin.id,
      companyId,
      role: 'COMPANY_ADMIN',
    },
  });

  const employee = await prisma.user.create({
    data: {
      id: uniqueId('user'),
      companyId,
      employeeId: uniqueId('EMP'),
      email: `emp-${companyId}@test.com`,
      name: 'Test Employee',
      passwordHash,
      phone: '8888888888',
      status: 'ACTIVE',
      transportEligibility: 'ELIGIBLE',
    },
  });

  await prisma.companyMembership.create({
    data: {
      id: uniqueId('mem'),
      userId: employee.id,
      companyId,
      role: 'EMPLOYEE',
    },
  });

  const vehicle = await prisma.vehicle.create({
    data: {
      id: uniqueId('veh'),
      companyId,
      registrationNo: `MH-01-${uniqueId('REG')}`,
      vehicleType: 'SEDAN',
      capacity: 4,
      acType: 'NON_AC',
      fuelType: 'PETROL',
      ownershipType: 'COMPANY_OWNED',
      status: 'AVAILABLE',
    },
  });

  const rateCard = await prisma.rateCard.create({
    data: {
      id: uniqueId('rc'),
      companyId,
      code: uniqueId('RC'),
      name: 'Sedan Rate',
      vehicleType: 'SEDAN',
      serviceType: 'CAB',
      baseFare: 100,
      perKmRate: 12,
      minimumKm: 4,
      minimumFare: 150,
      freeWaitingMinutes: 15,
      waitingChargePerMin: 5,
      effectiveFrom: new Date(),
      priority: 1,
    },
  });

  return { companyId, company, site, shift, admin, employee, vehicle, rateCard };
}

export function resetIdCounter() {
  idCounter = 0;
}

import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const TEST_DB_URL = 'postgresql://postgres:postgres@localhost:5432/moveflow_test';

async function seedTestData(prisma: PrismaClient) {
  const company = await prisma.company.upsert({
    where: { id: 'test-company-001' },
    update: {},
    create: {
      id: 'test-company-001',
      name: 'Test Corp',
      code: 'TEST',
      slug: 'test-corp',
      domain: 'test.com',
      status: 'ACTIVE',
      country: 'India',
      city: 'Mumbai',
    },
  });

  await prisma.companySite.upsert({
    where: { id: 'test-site-001' },
    update: {},
    create: {
      id: 'test-site-001',
      companyId: company.id,
      siteCode: 'MUM',
      siteName: 'Mumbai Office',
      address: 'Mumbai',
      city: 'Mumbai',
      latitude: 19.076,
      longitude: 72.8777,
      isActive: true,
    },
  });

  await prisma.companySite.upsert({
    where: { id: 'test-site-002' },
    update: {},
    create: {
      id: 'test-site-002',
      companyId: company.id,
      siteCode: 'PUN',
      siteName: 'Pune Office',
      address: 'Pune',
      city: 'Pune',
      latitude: 18.52,
      longitude: 73.8567,
      isActive: true,
    },
  });

  await prisma.shift.upsert({
    where: { id: 'test-shift-001' },
    update: {},
    create: {
      id: 'test-shift-001',
      companyId: company.id,
      name: 'Morning',
      startTime: '06:00',
      endTime: '15:00',
    },
  });

  await prisma.shift.upsert({
    where: { id: 'test-shift-002' },
    update: {},
    create: {
      id: 'test-shift-002',
      companyId: company.id,
      name: 'Evening',
      startTime: '15:00',
      endTime: '00:00',
    },
  });

  const adminPasswordHash = await bcrypt.hash('Test@12345', 12);
  const admin = await prisma.user.upsert({
    where: { id: 'test-admin-001' },
    update: {},
    create: {
      id: 'test-admin-001',
      companyId: company.id,
      employeeId: 'ADM-001',
      email: 'admin@test.com',
      name: 'Test Admin',
      passwordHash: adminPasswordHash,
      phone: '9999999999',
      status: 'ACTIVE',
      transportEligibility: 'ELIGIBLE',
    },
  });

  await prisma.companyMembership.upsert({
    where: { id: 'test-membership-001' },
    update: {},
    create: {
      id: 'test-membership-001',
      userId: admin.id,
      companyId: company.id,
      role: 'COMPANY_ADMIN',
    },
  });

  const empPasswordHash = await bcrypt.hash('Test@12345', 12);
  const employee = await prisma.user.upsert({
    where: { id: 'test-employee-001' },
    update: {},
    create: {
      id: 'test-employee-001',
      companyId: company.id,
      employeeId: 'EMP-001',
      email: 'emp@test.com',
      name: 'Test Employee',
      passwordHash: empPasswordHash,
      phone: '8888888888',
      status: 'ACTIVE',
      transportEligibility: 'ELIGIBLE',
    },
  });

  await prisma.companyMembership.upsert({
    where: { id: 'test-membership-002' },
    update: {},
    create: {
      id: 'test-membership-002',
      userId: employee.id,
      companyId: company.id,
      role: 'EMPLOYEE',
    },
  });

  await prisma.vehicle.upsert({
    where: { id: 'test-vehicle-001' },
    update: {},
    create: {
      id: 'test-vehicle-001',
      companyId: company.id,
      registrationNo: 'MH-01-TEST',
      vehicleType: 'SEDAN',
      capacity: 4,
      acType: 'NON_AC',
      fuelType: 'PETROL',
      ownershipType: 'COMPANY_OWNED',
      status: 'AVAILABLE',
    },
  });

  await prisma.vehicle.upsert({
    where: { id: 'test-vehicle-002' },
    update: {},
    create: {
      id: 'test-vehicle-002',
      companyId: company.id,
      registrationNo: 'MH-02-TEST',
      vehicleType: 'SUV',
      capacity: 6,
      acType: 'AC',
      fuelType: 'DIESEL',
      ownershipType: 'COMPANY_OWNED',
      status: 'PENDING_VERIFICATION',
    },
  });

  await prisma.rateCard.upsert({
    where: { id: 'test-ratecard-001' },
    update: {},
    create: {
      id: 'test-ratecard-001',
      companyId: company.id,
      code: 'RC-SEDAN-001',
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

  const existingPolicy = await prisma.transportPolicy.findFirst({
    where: { companyId: company.id },
  });
  if (!existingPolicy) {
    await prisma.transportPolicy.create({
      data: {
        companyId: company.id,
        requireApproval: false,
      } as any,
    });
  }

  console.log('✅ Test data seeded');
}

export default async function globalSetup() {
  console.log('🧪 Setting up test database...');

  process.env.DATABASE_URL = TEST_DB_URL;

  try {
    execSync('npx prisma migrate deploy --schema=../../packages/database/prisma/schema.prisma', {
      env: { ...process.env, DATABASE_URL: TEST_DB_URL },
      stdio: 'pipe',
    });
  } catch {
    console.log('⚠️  Prisma migrate failed, attempting push...');
    try {
      execSync('npx prisma db push --schema=../../packages/database/prisma/schema.prisma --force-reset', {
        env: { ...process.env, DATABASE_URL: TEST_DB_URL },
        stdio: 'pipe',
      });
    } catch (e: any) {
      console.log('⚠️  DB push failed, tests may require a running database');
      console.log(e.message?.substring(0, 200));
    }
  }

  try {
    const prisma = new PrismaClient({ datasourceUrl: TEST_DB_URL });
    await prisma.$connect();
    await seedTestData(prisma);
    await prisma.$disconnect();
  } catch (e: any) {
    console.log('⚠️  Seeding failed:', e.message?.substring(0, 200));
  }

  console.log('✅ Test database ready');
}

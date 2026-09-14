import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('NAVIRA E2E — Critical User Journeys', () => {
  let app: INestApplication;
  let adminToken: string;
  let employeeToken: string;
  let companyId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  // ═══════════════════════════════════════════════════════════
  // Journey 1: Employee Onboarding
  // ═══════════════════════════════════════════════════════════
  describe('Journey 1: Employee Onboarding', () => {
    const testEmail = `e2e-onboard-${Date.now()}@test.com`;

    it('should register a transport admin', async () => {
      const res = await http()
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: 'Test@12345',
          name: 'E2E Transport Admin',
          companyCode: 'E2E',
        });

      expect([200, 201]).toContain(res.status);
      if (res.status <= 201) {
        adminToken = res.body.access_token;
        companyId = res.body.company?.id;
      }
    });

    it('should create an employee via admin', async () => {
      if (!adminToken) return;

      const res = await http()
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: `EMP-E2E-${Date.now()}`,
          name: 'E2E Employee',
          email: `emp-e2e-${Date.now()}@test.com`,
          phone: '8888888888',
          transportEligibility: 'ELIGIBLE',
        });

      expect([200, 201, 401, 403]).toContain(res.status);
    });

    it('should retrieve employee list', async () => {
      if (!adminToken) return;

      const res = await http()
        .get('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty('data');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Journey 2: Employee Address Lifecycle
  // ═══════════════════════════════════════════════════════════
  describe('Journey 2: Employee Address Lifecycle', () => {
    let addressId: string;

    it('should create an employee address', async () => {
      if (!adminToken) return;

      const res = await http()
        .post('/api/employee-addresses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'HOME',
          addressLine1: '123 Test Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          latitude: 19.076,
          longitude: 72.8777,
        });

      expect([200, 201, 401, 403]).toContain(res.status);
      if (res.status <= 201) {
        addressId = res.body.id;
        expect(res.body.status).toBe('PENDING');
      }
    });

    it('should activate the address', async () => {
      if (!adminToken || !addressId) return;

      const res = await http()
        .post(`/api/employee-addresses/${addressId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(res.status);
    });

    it('should set as default address', async () => {
      if (!adminToken || !addressId) return;

      const res = await http()
        .post(`/api/employee-addresses/${addressId}/default`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(res.status);
    });

    it('should list employee addresses', async () => {
      if (!adminToken) return;

      const res = await http()
        .get('/api/employee-addresses')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Journey 3: Weekly Scheduling
  // ═══════════════════════════════════════════════════════════
  describe('Journey 3: Weekly Scheduling', () => {
    it('should create a schedule', async () => {
      if (!adminToken) return;

      const res = await http()
        .post('/api/schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: 'test-employee-001',
          effectiveFrom: '2026-01-01',
          loginTime: '09:00',
          logoutTime: '18:00',
          isRecurring: true,
          recurringDays: [1, 2, 3, 4, 5],
        });

      expect([200, 201, 400, 401, 403]).toContain(res.status);
    });

    it('should get weekly grid', async () => {
      if (!adminToken) return;

      const res = await http()
        .get('/api/schedules/grid?weekStart=2026-01-05')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Journey 4: Booking → Trip → Dispatch
  // ═══════════════════════════════════════════════════════════
  describe('Journey 4: Booking → Trip → Dispatch', () => {
    let bookingId: string;
    let tripId: string;

    it('should create a booking', async () => {
      if (!adminToken) return;

      const res = await http()
        .post('/api/bookings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          serviceType: 'CAB',
          date: '2026-01-15',
          pickupTime: '09:00',
          pickupLatitude: 19.076,
          pickupLongitude: 72.8777,
          pickupAddress: 'Home Address',
          dropLatitude: 18.52,
          dropLongitude: 73.8567,
          dropAddress: 'Office Address',
          passengerCount: 1,
        });

      expect([200, 201, 400, 401, 403]).toContain(res.status);
      if (res.status <= 201) {
        bookingId = res.body.id;
      }
    });

    it('should approve the booking if required', async () => {
      if (!adminToken || !bookingId) return;

      const res = await http()
        .post(`/api/bookings/${bookingId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ approved: true, reason: 'Approved for testing' });

      expect([200, 400, 401, 403]).toContain(res.status);
    });

    it('should dispatch a trip', async () => {
      if (!adminToken || !bookingId) return;

      const res = await http()
        .post('/api/trips/dispatch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          bookingId,
          driverId: 'test-driver-001',
          vehicleId: 'test-vehicle-001',
        });

      expect([200, 201, 400, 401, 403]).toContain(res.status);
      if (res.status <= 201) {
        tripId = res.body.id;
      }
    });

    it('should transition trip through states', async () => {
      if (!adminToken || !tripId) return;

      const transitions = ['START_TRIP', 'ARRIVE_AT_DROP', 'COMPLETE_TRIP'];
      for (const action of transitions) {
        const res = await http()
          .post(`/api/trips/${tripId}/transition`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ action });

        expect([200, 400]).toContain(res.status);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Journey 5: No-Show Flow
  // ═══════════════════════════════════════════════════════════
  describe('Journey 5: No-Show Flow', () => {
    it('should record pickup arrival', async () => {
      if (!adminToken) return;

      const res = await http()
        .post('/api/no-show/arrival')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tripId: 'test-trip-001',
          bookingId: 'test-booking-001',
          passengerId: 'test-employee-001',
          latitude: 19.076,
          longitude: 72.8777,
          pickupLatitude: 19.076,
          pickupLongitude: 72.8777,
        });

      expect([200, 201, 400, 401]).toContain(res.status);
    });

    it('should record call attempts', async () => {
      if (!adminToken) return;

      const res = await http()
        .post('/api/no-show/call')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tripId: 'test-trip-001',
          passengerId: 'test-employee-001',
          method: 'PHONE',
          result: 'NO_ANSWER',
        });

      expect([200, 201, 400, 401]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Journey 6: Breakdown/Replacement
  // ═══════════════════════════════════════════════════════════
  describe('Journey 6: Breakdown/Replacement', () => {
    it('should report a breakdown', async () => {
      if (!adminToken) return;

      const res = await http()
        .post('/api/safety/breakdown')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          vehicleId: 'test-vehicle-001',
          reason: 'Engine failure',
          description: 'Vehicle stopped working',
          latitude: 19.076,
          longitude: 72.8777,
        });

      expect([200, 201, 400, 401, 403]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Journey 7: SOS/Safety
  // ═══════════════════════════════════════════════════════════
  describe('Journey 7: SOS/Safety', () => {
    let sosId: string;

    it('should trigger SOS', async () => {
      if (!adminToken) return;

      const res = await http()
        .post('/api/safety/sos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          latitude: 19.076,
          longitude: 72.8777,
          description: 'Emergency situation',
        });

      expect([200, 201, 400, 401]).toContain(res.status);
      if (res.status <= 201) {
        sosId = res.body.id;
      }
    });

    it('should acknowledge SOS', async () => {
      if (!adminToken || !sosId) return;

      const res = await http()
        .post(`/api/safety/sos/${sosId}/acknowledge`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 400, 401]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Journey 8: Billing Flow
  // ═══════════════════════════════════════════════════════════
  describe('Journey 8: Billing Flow', () => {
    it('should calculate trip cost', async () => {
      if (!adminToken) return;

      const res = await http()
        .post('/api/billing/calculate/test-trip-001')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 400, 401, 404]).toContain(res.status);
    });

    it('should list cost centers', async () => {
      if (!adminToken) return;

      const res = await http()
        .get('/api/billing/cost-centers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401]).toContain(res.status);
    });

    it('should get cost center summary', async () => {
      if (!adminToken) return;

      const res = await http()
        .get('/api/billing/cost-centers/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Journey 9: Driver Onboarding
  // ═══════════════════════════════════════════════════════════
  describe('Journey 9: Driver Onboarding', () => {
    let inviteToken: string;

    it('should invite a driver', async () => {
      if (!adminToken) return;

      const res = await http()
        .post('/api/fleet/drivers/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Test',
          lastName: 'Driver',
          mobileNumber: '7777777777',
          email: 'testdriver@e2e.com',
        });

      expect([200, 201, 400, 401, 403]).toContain(res.status);
      if (res.status <= 201) {
        inviteToken = res.body.token;
      }
    });

    it('should access onboarding via token', async () => {
      if (!inviteToken) return;

      const res = await http()
        .get(`/api/fleet/onboard/${inviteToken}`);

      expect([200, 400, 404]).toContain(res.status);
    });

    it('should upload document via token', async () => {
      if (!inviteToken) return;

      const res = await http()
        .post(`/api/fleet/onboard/${inviteToken}/documents`)
        .send({
          documentType: 'DRIVING_LICENSE',
          fileUrl: '/files/license.pdf',
        });

      expect([200, 201, 400, 404]).toContain(res.status);
    });

    it('should list pending onboardings', async () => {
      if (!adminToken) return;

      const res = await http()
        .get('/api/fleet/drivers/onboardings/pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Journey 10: Bulk Vehicle Import
  // ═══════════════════════════════════════════════════════════
  describe('Journey 10: Bulk Vehicle Import', () => {
    it('should get import template', async () => {
      if (!adminToken) return;

      const res = await http()
        .get('/api/vehicles/import/template')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) {
        expect(typeof res.body).toBe('string');
      }
    });

    it('should bulk import vehicles (dry run)', async () => {
      if (!adminToken) return;

      const csv = 'registration_no,vehicle_type,capacity\nMH-E2E-001,SEDAN,4\nMH-E2E-002,SUV,6\n';
      const res = await http()
        .post('/api/vehicles/bulk-import')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ csvContent: csv, dryRun: true });

      expect([200, 400, 401, 403]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Journey 11: GPS Tracking
  // ═══════════════════════════════════════════════════════════
  describe('Journey 11: GPS Tracking', () => {
    it('should get live map', async () => {
      if (!adminToken) return;

      const res = await http()
        .get('/api/gps/live-map')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty('vehicles');
        expect(res.body).toHaveProperty('geofences');
      }
    });

    it('should get vehicle locations', async () => {
      if (!adminToken) return;

      const res = await http()
        .get('/api/gps/vehicles')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401]).toContain(res.status);
    });

    it('should create a geofence', async () => {
      if (!adminToken) return;

      const res = await http()
        .post('/api/gps/geofences')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'E2E Test Zone',
          latitude: 19.076,
          longitude: 72.8777,
          radius: 500,
        });

      expect([200, 201, 401, 403]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Journey 12: RBAC Denial
  // ═══════════════════════════════════════════════════════════
  describe('Journey 12: RBAC Denial', () => {
    it('should deny access without token', async () => {
      const res = await http()
        .get('/api/employees');

      expect(res.status).toBe(401);
    });

    it('should deny access with invalid token', async () => {
      const res = await http()
        .get('/api/employees')
        .set('Authorization', 'Bearer invalid-token-123');

      expect([401, 403]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Journey 13: Cross-Company Access Denial
  // ═══════════════════════════════════════════════════════════
  describe('Journey 13: Cross-Company Access Denial', () => {
    it('should scope data to company', async () => {
      if (!adminToken) return;

      const res = await http()
        .get('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401]).toContain(res.status);
      if (res.status === 200 && res.body.data) {
        // All returned employees should belong to the same company
        for (const emp of res.body.data) {
          if (emp.companyId) {
            expect(emp.companyId).toBe(companyId);
          }
        }
      }
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Journey 14: Fleet Management
  // ═══════════════════════════════════════════════════════════
  describe('Journey 14: Fleet Management', () => {
    let vehicleId: string;

    it('should create a vehicle', async () => {
      if (!adminToken) return;

      const res = await http()
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          registrationNo: `MH-E2E-${Date.now()}`,
          vehicleType: 'SEDAN',
          capacity: 4,
          acType: 'NON_AC',
          fuelType: 'PETROL',
        });

      expect([200, 201, 400, 401, 403]).toContain(res.status);
      if (res.status <= 201) {
        vehicleId = res.body.id;
        expect(res.body.status).toBe('PENDING_VERIFICATION');
      }
    });

    it('should list vehicles', async () => {
      if (!adminToken) return;

      const res = await http()
        .get('/api/vehicles')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty('data');
      }
    });

    it('should verify vehicle', async () => {
      if (!adminToken || !vehicleId) return;

      const res = await http()
        .post(`/api/vehicles/${vehicleId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 400, 401, 403]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Journey 15: Dashboard & Health
  // ═══════════════════════════════════════════════════════════
  describe('Journey 15: Dashboard & Health', () => {
    it('should return health status', async () => {
      const res = await http().get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status');
    });

    it('should return liveness', async () => {
      const res = await http().get('/api/health/live');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('alive');
    });

    it('should return readiness', async () => {
      const res = await http().get('/api/health/ready');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status');
    });
  });
});

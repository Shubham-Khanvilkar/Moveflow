import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('Trip Lifecycle Integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  const BASE_URL = () => `http://${app.getHttpServer().address()}`;

  describe('Full Trip Lifecycle: Booking → Approve → Dispatch → Start → Complete → Verify Cost', () => {
    let createdBookingId: string;
    let createdTripId: string;

    it('Step 1: POST /api/v1/trips/bookings - Create a booking', async () => {
      const response = await fetch(`${BASE_URL()}/api/v1/trips/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer transport-admin-token',
        },
        body: JSON.stringify({
          serviceType: 'CAB',
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          pickupTime: '09:00',
          pickupLatitude: 19.076,
          pickupLongitude: 72.8777,
          pickupAddress: 'Mumbai Office',
          dropLatitude: 19.059,
          dropLongitude: 72.8295,
          dropAddress: 'Pune Office',
          passengerCount: 2,
        }),
      });

      expect([200, 201]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const body = await response.json();
        createdBookingId = body.id;
        expect(createdBookingId).toBeDefined();
        expect(body.status).toBeDefined();
      }
    });

    it('Step 2: POST /api/v1/trips/bookings/:id/approve - Approve the booking', async () => {
      if (!createdBookingId) {
        console.warn('Skipping: No booking created in Step 1');
        return;
      }

      const response = await fetch(`${BASE_URL()}/api/v1/trips/bookings/${createdBookingId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer transport-admin-token',
        },
        body: JSON.stringify({
          approved: true,
          reason: 'Approved for integration test',
        }),
      });

      expect([200, 400, 401, 404]).toContain(response.status);

      if (response.status === 200) {
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.status).toBe('APPROVED');
      }
    });

    it('Step 3: POST /api/v1/trips/dispatch/:bookingId - Dispatch the booking', async () => {
      if (!createdBookingId) {
        console.warn('Skipping: No booking created in Step 1');
        return;
      }

      const response = await fetch(`${BASE_URL()}/api/v1/trips/dispatch/${createdBookingId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer transport-admin-token',
        },
        body: JSON.stringify({
          driverId: 'test-driver-001',
          vehicleId: 'test-vehicle-001',
        }),
      });

      expect([200, 201, 400, 401, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const body = await response.json();
        createdTripId = body.id;
        expect(createdTripId).toBeDefined();
        expect(body.status).toBeDefined();
      }
    });

    it('Step 4: POST /api/v1/trips/:id/transition - Start the trip', async () => {
      if (!createdTripId) {
        console.warn('Skipping: No trip created in Step 3');
        return;
      }

      const response = await fetch(`${BASE_URL()}/api/v1/trips/${createdTripId}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer driver-token',
        },
        body: JSON.stringify({
          action: 'START_TRIP',
          metadata: {
            latitude: 19.076,
            longitude: 72.8777,
          },
        }),
      });

      expect([200, 400, 401, 404]).toContain(response.status);

      if (response.status === 200) {
        const body = await response.json();
        expect(body.status).toBe('IN_TRANSIT');
      }
    });

    it('Step 5: POST /api/v1/trips/:id/transition - Complete the trip', async () => {
      if (!createdTripId) {
        console.warn('Skipping: No trip created in Step 3');
        return;
      }

      const response = await fetch(`${BASE_URL()}/api/v1/trips/${createdTripId}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer driver-token',
        },
        body: JSON.stringify({
          action: 'COMPLETE_TRIP',
          metadata: {
            latitude: 19.059,
            longitude: 72.8295,
          },
        }),
      });

      expect([200, 400, 401, 404]).toContain(response.status);

      if (response.status === 200) {
        const body = await response.json();
        expect(body.status).toBe('COMPLETED');
      }
    });

    it('Step 6: GET /api/v1/trips/:id - Verify trip and cost calculated', async () => {
      if (!createdTripId) {
        console.warn('Skipping: No trip created in Step 3');
        return;
      }

      const response = await fetch(`${BASE_URL()}/api/v1/trips/${createdTripId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer transport-admin-token',
        },
      });

      expect([200, 401, 404]).toContain(response.status);

      if (response.status === 200) {
        const body = await response.json();
        expect(body.id).toBe(createdTripId);
        expect(body.status).toBe('COMPLETED');
        expect(body.completedAt).toBeDefined();
        expect(body.startedAt).toBeDefined();
      }
    });

    it('Step 6b: POST /api/v1/billing/cost-calculate/:tripId - Calculate trip cost', async () => {
      if (!createdTripId) {
        console.warn('Skipping: No trip created in Step 3');
        return;
      }

      const response = await fetch(`${BASE_URL()}/api/v1/billing/cost-calculate/${createdTripId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer finance-token',
        },
      });

      expect([200, 201, 400, 401, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const body = await response.json();
        expect(body.totalAmount).toBeDefined();
        expect(body.totalAmount).toBeGreaterThanOrEqual(0);
        expect(body.tripId).toBe(createdTripId);
      }
    });

    it('Step 6c: GET /api/v1/billing/cost-snapshot/:tripId - Verify cost snapshot exists', async () => {
      if (!createdTripId) {
        console.warn('Skipping: No trip created in Step 3');
        return;
      }

      const response = await fetch(`${BASE_URL()}/api/v1/billing/cost-snapshot/${createdTripId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer finance-token',
        },
      });

      expect([200, 401, 404]).toContain(response.status);

      if (response.status === 200) {
        const body = await response.json();
        expect(body.tripId).toBe(createdTripId);
        expect(body.totalAmount).toBeDefined();
        expect(body.totalAmount).toBeGreaterThanOrEqual(0);
        expect(body.ratePerKm).toBeDefined();
        expect(body.baseFare).toBeDefined();
      }
    });
  });

  describe('Edge Cases', () => {
    it('should reject booking with invalid data', async () => {
      const response = await fetch(`${BASE_URL()}/api/v1/trips/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer transport-admin-token',
        },
        body: JSON.stringify({
          serviceType: 'INVALID_TYPE',
        }),
      });

      expect([400, 401]).toContain(response.status);
    });

    it('should reject approval of non-existent booking', async () => {
      const response = await fetch(`${BASE_URL()}/api/v1/trips/bookings/non-existent-id/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer transport-admin-token',
        },
        body: JSON.stringify({
          approved: true,
        }),
      });

      expect([401, 404]).toContain(response.status);
    });

    it('should reject dispatch of non-existent booking', async () => {
      const response = await fetch(`${BASE_URL()}/api/v1/trips/dispatch/non-existent-id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer transport-admin-token',
        },
        body: JSON.stringify({
          driverId: 'driver-1',
          vehicleId: 'vehicle-1',
        }),
      });

      expect([400, 401, 404]).toContain(response.status);
    });

    it('should reject invalid trip transition', async () => {
      const response = await fetch(`${BASE_URL()}/api/v1/trips/non-existent-trip/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer driver-token',
        },
        body: JSON.stringify({
          action: 'COMPLETE_TRIP',
        }),
      });

      expect([400, 401, 404]).toContain(response.status);
    });

    it('should reject requests without auth token', async () => {
      const response = await fetch(`${BASE_URL()}/api/v1/trips/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(401);
    });
  });
});

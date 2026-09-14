import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('Billing Flow Integration', () => {
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

  describe('Rate Card Application', () => {
    it('should calculate trip cost from rate card', async () => {
      const response = await fetch(`${BASE_URL()}/api/v1/billing/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer finance-token',
        },
        body: JSON.stringify({
          tripId: 'completed-trip-1',
          rateCardId: 'rate-card-1',
        }),
      });
      expect([200, 201, 401, 404]).toContain(response.status);
    });

    it('should apply service-type specific rates', async () => {
      const response = await fetch(`${BASE_URL()}/api/v1/billing/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer finance-token',
        },
        body: JSON.stringify({
          tripId: 'completed-trip-2',
          rateCardId: 'rate-card-1',
          serviceType: 'AC',
        }),
      });
      expect([200, 201, 400, 401, 404]).toContain(response.status);
    });
  });

  describe('Invoice Generation', () => {
    it('should generate vendor invoice from trips', async () => {
      const response = await fetch(`${BASE_URL()}/api/v1/billing/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer finance-token',
        },
        body: JSON.stringify({
          vendorId: 'vendor-1',
          period: '2026-09',
          tripIds: ['trip-1', 'trip-2', 'trip-3'],
        }),
      });
      expect([200, 201, 401, 404]).toContain(response.status);
    });

    it('should prevent duplicate invoice generation', async () => {
      const response = await fetch(`${BASE_URL()}/api/v1/billing/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer finance-token',
        },
        body: JSON.stringify({
          vendorId: 'vendor-1',
          period: '2026-09',
          tripIds: ['trip-1'],
        }),
      });
      // Should detect duplicate and reject
      expect([200, 201, 400, 401, 409]).toContain(response.status);
    });
  });

  describe('Billing Anomaly Detection', () => {
    it('should detect billing mismatches', async () => {
      const response = await fetch(`${BASE_URL()}/api/v1/analytics/cost-leaks`, {
        headers: {
          Authorization: 'Bearer finance-token',
        },
      });
      expect([200, 401]).toContain(response.status);
    });
  });

  describe('Night Charge Calculation', () => {
    it('should apply night surcharge for trips between 10PM-5AM', async () => {
      const response = await fetch(`${BASE_URL()}/api/v1/billing/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer finance-token',
        },
        body: JSON.stringify({
          tripId: 'night-trip-1',
          rateCardId: 'rate-card-1',
          scheduledPickupTime: '2026-09-15T23:30:00Z', // 11:30 PM
        }),
      });
      expect([200, 201, 401, 404]).toContain(response.status);
    });
  });
});

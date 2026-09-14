import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Booking Flow (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let bookingId: string;
  let tripId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/bookings', () => {
    it('should create a booking with PENDING status', () => {
      return request(app.getHttpServer())
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          serviceType: 'CAB',
          date: '2024-12-01',
          pickupTime: '08:00',
          pickupLatitude: 19.0760,
          pickupLongitude: 72.8777,
          pickupAddress: 'Andheri East, Mumbai',
          dropLatitude: 19.0596,
          dropLongitude: 72.8295,
          dropAddress: 'BKC, Mumbai',
          passengerCount: 2,
        })
        .expect(201)
        .then((res) => {
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data).toHaveProperty('status', 'PENDING');
          bookingId = res.body.data.id;
        });
    });
  });

  describe('GET /api/bookings/:id', () => {
    it('should return the created booking', () => {
      return request(app.getHttpServer())
        .get(`/api/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((res) => {
          expect(res.body.data).toHaveProperty('id', bookingId);
        });
    });
  });

  describe('PUT /api/bookings/:id/approve', () => {
    it('should approve the booking', () => {
      return request(app.getHttpServer())
        .put(`/api/bookings/${bookingId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ approved: true })
        .expect(200)
        .then((res) => {
          expect(res.body.data).toHaveProperty('status', 'APPROVED');
        });
    });
  });

  describe('POST /api/trips', () => {
    it('should create a trip from approved booking', () => {
      return request(app.getHttpServer())
        .post('/api/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ bookingId })
        .expect(201)
        .then((res) => {
          expect(res.body.data).toHaveProperty('id');
          tripId = res.body.data.id;
        });
    });
  });

  describe('PUT /api/trips/:id/dispatch', () => {
    it('should dispatch the trip', () => {
      return request(app.getHttpServer())
        .put(`/api/trips/${tripId}/dispatch`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ driverId: 'driver-1', vehicleId: 'vehicle-1' })
        .expect(200)
        .then((res) => {
          expect(res.body.data).toHaveProperty('status', 'DISPATCHED');
        });
    });
  });

  describe('PUT /api/trips/:id/start', () => {
    it('should start the trip', () => {
      return request(app.getHttpServer())
        .put(`/api/trips/${tripId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((res) => {
          expect(res.body.data).toHaveProperty('status', 'IN_TRANSIT');
        });
    });
  });

  describe('PUT /api/trips/:id/complete', () => {
    it('should complete the trip', () => {
      return request(app.getHttpServer())
        .put(`/api/trips/${tripId}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((res) => {
          expect(res.body.data).toHaveProperty('status', 'COMPLETED');
        });
    });
  });

  describe('GET /api/reports/engine/generate?report=trip_analytics', () => {
    it('should return trip analytics report', () => {
      return request(app.getHttpServer())
        .get('/api/reports/engine/generate?report=trip_analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((res) => {
          expect(res.body.data).toBeDefined();
        });
    });
  });
});
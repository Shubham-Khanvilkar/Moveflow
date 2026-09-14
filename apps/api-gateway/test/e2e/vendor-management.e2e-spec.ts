import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Vendor Management (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let vendorId: string;

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

  describe('POST /api/vendors', () => {
    it('should create a vendor', () => {
      return request(app.getHttpServer())
        .post('/api/vendors')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Vendor',
          contactEmail: 'vendor@test.com',
          contactPhone: '+919876543210',
          address: '123 Test Street, Mumbai',
        })
        .expect(201)
        .then((res) => {
          expect(res.body.data).toHaveProperty('id');
          vendorId = res.body.data.id;
        });
    });
  });

  describe('POST /api/vendors/:id/invite', () => {
    it('should send vendor invitation', () => {
      return request(app.getHttpServer())
        .post(`/api/vendors/${vendorId}/invite`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((res) => {
          expect(res.body.data).toHaveProperty('inviteToken');
        });
    });
  });

  describe('PUT /api/vendors/:id/approve', () => {
    it('should approve the vendor', () => {
      return request(app.getHttpServer())
        .put(`/api/vendors/${vendorId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((res) => {
          expect(res.body.data).toHaveProperty('status', 'APPROVED');
        });
    });
  });

  describe('GET /api/vendors/:id/returns', () => {
    it('should list vendor returns', () => {
      return request(app.getHttpServer())
        .get(`/api/vendors/${vendorId}/returns`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });

  describe('POST /api/vendors/:id/returns', () => {
    it('should create a vendor return', () => {
      return request(app.getHttpServer())
        .post(`/api/vendors/${vendorId}/returns`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          invoiceId: 'inv-1',
          returnReason: 'Wrong items delivered',
          items: [{ itemId: 'item-1', quantity: 2 }],
        })
        .expect(201)
        .then((res) => {
          expect(res.body.data).toHaveProperty('id');
        });
    });
  });

  describe('POST /api/finance/sla/penalties', () => {
    it('should create an SLA penalty', () => {
      return request(app.getHttpServer())
        .post('/api/finance/sla/penalties')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          vendorId,
          period: '2024-01',
          slaMetric: 'ON_TIME_PICKUP',
          targetValue: 95,
          actualValue: 82,
        })
        .expect(201)
        .then((res) => {
          expect(res.body.data).toHaveProperty('id');
        });
    });
  });

  describe('GET /api/finance/sla/penalties', () => {
    it('should list SLA penalties', () => {
      return request(app.getHttpServer())
        .get('/api/finance/sla/penalties')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });

  describe('POST /api/finance/sla/penalties/:id/approve', () => {
    it('should approve an SLA penalty', () => {
      return request(app.getHttpServer())
        .post('/api/finance/sla/penalties/penalty-1/approve')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((res) => {
          expect(res.body.data).toHaveProperty('status', 'APPLIED');
        });
    });
  });

  describe('POST /api/billing/invoices/generate', () => {
    it('should generate a vendor invoice', () => {
      return request(app.getHttpServer())
        .post('/api/billing/invoices/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ vendorId, period: '2024-01' })
        .expect(200)
        .then((res) => {
          expect(res.body.data).toHaveProperty('invoiceId');
        });
    });
  });
});
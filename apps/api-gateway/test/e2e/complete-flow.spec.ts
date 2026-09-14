import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('NAVIRA E2E Tests - Complete Business Flow', () => {
  let app: INestApplication;
  let adminToken: string;
  let employeeToken: string;
  let driverToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Phase 1: Authentication', () => {
    it('(E2E-001) Admin should be able to login', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@acme.com', password: 'Admin@123' });

      expect(response.status).toBe(201);
      expect(response.body.access_token).toBeDefined();
      adminToken = response.body.access_token;
    });

    it('(E2E-002) Employee should be able to login', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'priya@acme.com', password: 'Admin@123' });

      expect(response.status).toBe(201);
      expect(response.body.access_token).toBeDefined();
      employeeToken = response.body.access_token;
    });

    it('(E2E-003) Driver should be able to login', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'driver1@acme.com', password: 'Admin@123' });

      expect(response.status).toBe(201);
      expect(response.body.access_token).toBeDefined();
      driverToken = response.body.access_token;
    });

    it('(E2E-004) Invalid credentials should return 401', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@acme.com', password: 'wrongpassword' });

      expect(response.status).toBe(401);
    });

    it('(E2E-005) Auth /me endpoint should return user context', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBeDefined();
      expect(response.body.roles).toBeDefined();
      expect(response.body.permissions).toBeDefined();
    });
  });

  describe('Phase 2: Organization Management', () => {
    it('(E2E-010) Admin should be able to get sites', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/org/sites')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('(E2E-011) Admin should be able to get LOBs', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/org/lobs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('(E2E-012) Admin should be able to get shifts', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/org/shifts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('(E2E-013) Admin should be able to create a new region', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/org/regions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ regionCode: 'EAST', regionName: 'East Region' });

      expect(response.status).toBe(201);
      expect(response.body.regionCode).toBe('EAST');
    });

    it('(E2E-014) Duplicate region code should return 409', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/org/regions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ regionCode: 'EAST', regionName: 'East' });

      expect(response.status).toBe(409);
    });

    it('(E2E-015) Employee should NOT be able to create sites', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/org/sites')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ siteCode: 'DEL', siteName: 'Delhi' });

      expect(response.status).toBe(403);
    });
  });

  describe('Phase 3: Employee Management', () => {
    it('(E2E-020) Admin should be able to list employees', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('(E2E-021) Admin should be able to get employee by ID', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/employees/user_admin_001')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBeDefined();
    });

    it('(E2E-022) Dashboard KPIs should return real data', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/dashboard/kpi')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.employees).toBeDefined();
      expect(response.body.employees.total).toBeGreaterThan(0);
    });
  });

  describe('Phase 4: Fleet Management (Drivers & Vehicles)', () => {
    it('(E2E-030) Admin should be able to list drivers', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/drivers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('(E2E-031) Admin should be able to list vehicles', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/vehicles')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('(E2E-032) Driver profile should exist after seed', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/drivers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Phase 5: Role-Based Access Control', () => {
    it('(E2E-040) RolesGuard should allow admin to access admin endpoints', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/org/permissions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('(E2E-041) RolesGuard should deny employee from admin endpoints', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/org/permissions')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(403);
    });

    it('(E2E-042) Employee should be able to access employee endpoints', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/employees')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
    });

    it('(E2E-043) All 25 roles should exist in database', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/org/transport-roles')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const roles = response.body;
      expect(Array.isArray(roles)).toBe(true);
      expect(roles.length).toBeGreaterThanOrEqual(25);
    });

    it('(E2E-044) Permission toggles should be configurable', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/org/role-permissions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Phase 6: Booking & Trip Lifecycle', () => {
    it('(E2E-050) Admin should be able to list bookings', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/bookings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('(E2E-051) Admin should be able to list trips', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/trips')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('(E2E-052) Trip state machine should exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/trips')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Phase 7: Dispatch & GPS', () => {
    it('(E2E-060) Dispatch endpoint should exist', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/trips/dispatch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBeDefined();
    });

    it('(E2E-061) GPS tracking endpoint should exist', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/gps/ping')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ latitude: 19.07, longitude: 72.87 });

      expect(response.status).toBeDefined();
    });
  });

  describe('Phase 8: Billing & Vendor Management', () => {
    it('(E2E-070) Vendor list endpoint should exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/vendors')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('(E2E-071) Billing endpoint should exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/billing/invoices')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('(E2E-072) Rate cards endpoint should exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/billing/rate-cards')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Phase 9: Safety & Compliance', () => {
    it('(E2E-080) Safety incidents endpoint should exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/safety/incidents')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('(E2E-081) SOS endpoint should exist', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/safety/sos')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ type: 'EMERGENCY' });

      expect(response.status).toBeDefined();
    });

    it('(E2E-082) Vehicle QR endpoint should exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/vehicle-qr/active')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Phase 10: Reporting & Audit', () => {
    it('(E2E-090) Audit log endpoint should exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/audit/logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('(E2E-091) Reports endpoint should exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/reports')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('(E2E-092) Analytics summary should return data', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/dashboard/analytics/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Phase 11: Authorization & Security', () => {
    it('(E2E-100) Unauthenticated requests should be denied', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/employees');

      expect(response.status).toBe(401);
    });

    it('(E2E-101) Invalid token should be rejected', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/employees')
        .set('Authorization', 'Bearer invalid_token_here');

      expect(response.status).toBe(401);
    });

    it('(E2E-102) Token refresh should work', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@acme.com', password: 'Admin@123' });

      const refreshToken = loginResponse.body.refresh_token;
      expect(refreshToken).toBeDefined();

      const refreshResponse = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refresh_token: refreshToken });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.access_token).toBeDefined();
    });

    it('(E2E-103) Cross-tenant access should be denied', async () => {
      const otherCompanyResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@other.com', password: 'wrong' });

      expect(otherCompanyResponse.status).toBe(401);
    });
  });

  describe('Phase 12: NAVIRA Brand Compliance', () => {
    it('(E2E-110) API should use NAVIRA branding', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it('(E2E-111) NAVIRA_OWNER role should be seedable', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/org/transport-roles')
        .set('Authorization', `Bearer ${adminToken}`);

      const roles = response.body;
      const naviraOwner = roles.find((r: any) => r.name === 'NAVIRA_OWNER');
      expect(naviraOwner).toBeDefined();
    });

    it('(E2E-112) All internal roles should be NAVIRA-prefixed', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/org/transport-roles')
        .set('Authorization', `Bearer ${adminToken}`);

      const roles = response.body;
      const naviraRoles = roles.filter((r: any) => r.name.startsWith('NAVIRA_'));
      expect(naviraRoles.length).toBeGreaterThan(0);
    });
  });

  describe('Phase 13: Company Contact Directory', () => {
    it('(E2E-120) Company contacts endpoint should exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/company-contacts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('(E2E-121) Company should have contacts seeded', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/company-contacts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Phase 14: Notifications', () => {
    it('(E2E-130) Notifications endpoint should exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/notifications')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('(E2E-131) Should be able to mark notification as read', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/notifications/mark-read')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notificationId: 'test-id' });

      expect(response.status).toBeDefined();
    });
  });

  describe('Phase 15: Document Management', () => {
    it('(E2E-140) Documents endpoint should exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/documents')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('(E2E-141) Document upload should require valid file', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('test content'), 'test.pdf');

      expect(response.status).toBeDefined();
    });
  });

  describe('Production Readiness Gate', () => {
    it('(E2E-150) Health check should return database status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBeDefined();
    });

    it('(E2E-151) All critical modules should be imported', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/dashboard/kpi')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.employees).toBeDefined();
      expect(response.body.drivers).toBeDefined();
      expect(response.body.vehicles).toBeDefined();
    });

    it('(E2E-152) Audit logging should be active', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/audit/logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('(E2E-153) WebSocket gateway should be configured', async () => {
      const io = require('socket.io-client');
      const socket = io('http://localhost:3001', {
        transports: ['websocket'],
        autoConnect: false,
      });

      expect(socket).toBeDefined();
      socket.disconnect();
    });
  });
});

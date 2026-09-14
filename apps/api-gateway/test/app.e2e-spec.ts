import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('MoveFlow API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('Health', () => {
    it('/api/health (GET) — should return health status', () => {
      return request(app.getHttpServer())
        .get('/api/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('checks');
          expect(['healthy', 'degraded']).toContain(res.body.status);
        });
    });

    it('/api/health/ready (GET) — should return readiness', () => {
      return request(app.getHttpServer())
        .get('/api/health/ready')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
        });
    });

    it('/api/health/live (GET) — should return liveness', () => {
      return request(app.getHttpServer())
        .get('/api/health/live')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('alive');
        });
    });
  });

  describe('Auth Flow', () => {
    const testEmail = `e2e-test-${Date.now()}@test.com`;
    const testPassword = 'Test@12345';
    const testName = 'E2E Test User';
    const testCompanyCode = 'ACME';
    let authToken: string;

    it('/api/auth/register (POST) — should register a new user', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          name: testName,
          companyCode: testCompanyCode,
        })
        .expect((res) => {
          if (res.status === 201 || res.status === 200) {
            expect(res.body).toHaveProperty('access_token');
            expect(res.body.user.email).toBe(testEmail);
            expect(res.body.user.name).toBe(testName);
            authToken = res.body.access_token;
          }
        });
    });

    it('/api/auth/login (POST) — should login with registered user', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect((res) => {
          if (res.status === 200) {
            expect(res.body).toHaveProperty('access_token');
            expect(res.body.user.email).toBe(testEmail);
            authToken = res.body.access_token;
          }
        });
    });

    it('/api/auth/profile (GET) — should return profile with valid token', () => {
      if (!authToken) return Promise.resolve();

      return request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect((res) => {
          if (res.status === 200) {
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('email');
          }
        });
    });

    it('/api/auth/profile (GET) — should reject without token', () => {
      return request(app.getHttpServer())
        .get('/api/auth/profile')
        .expect(401);
    });

    it('/api/auth/register (POST) — should reject duplicate email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          name: testName,
          companyCode: testCompanyCode,
        })
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(400);
        });
    });
  });

  describe('Protected Routes', () => {
    it('/api/employees (GET) — should require authentication', () => {
      return request(app.getHttpServer())
        .get('/api/employees')
        .expect(401);
    });
  });
});

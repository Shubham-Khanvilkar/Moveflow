import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Security Flow (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let ssoConfigId: string;

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

  describe('POST /api/security/sso', () => {
    it('should create SSO config', () => {
      return request(app.getHttpServer())
        .post('/api/security/sso')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          provider: 'SAML',
          entityId: 'https://idp.example.com',
          ssoUrl: 'https://idp.example.com/sso',
          certificate: '-----BEGIN CERTIFICATE-----\nMIID...\n-----END CERTIFICATE-----',
          attributeMapping: { email: 'email', firstName: 'givenName', lastName: 'sn' },
        })
        .expect(201)
        .then((res) => {
          expect(res.body.data).toHaveProperty('id');
          ssoConfigId = res.body.data.id;
        });
    });
  });

  describe('GET /api/security/sso', () => {
    it('should return SSO config', () => {
      return request(app.getHttpServer())
        .get('/api/security/sso')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((res) => {
          expect(res.body.data).toHaveProperty('provider', 'SAML');
        });
    });
  });

  describe('GET /api/security/audit-log', () => {
    it('should list audit log entries', () => {
      return request(app.getHttpServer())
        .get('/api/security/audit-log')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.pagination).toBeDefined();
        });
    });
  });

  describe('GET /api/security/devices', () => {
    it('should list registered devices', () => {
      return request(app.getHttpServer())
        .get('/api/security/devices')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });

  describe('POST /api/security/devices/:id/approve', () => {
    it('should approve a device', () => {
      return request(app.getHttpServer())
        .post('/api/security/devices/device-1/approve')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((res) => {
          expect(res.body.data).toHaveProperty('status', 'APPROVED');
        });
    });
  });

  describe('GET /api/metrics', () => {
    it('should return Prometheus metrics', () => {
      return request(app.getHttpServer())
        .get('/api/metrics')
        .expect(200)
        .then((res) => {
          expect(res.text).toContain('navira_');
        });
    });
  });
});
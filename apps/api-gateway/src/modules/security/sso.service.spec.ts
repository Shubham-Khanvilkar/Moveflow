import { Test, TestingModule } from '@nestjs/testing';
import { SSOService } from './sso.service';
import { PrismaService } from '../../common/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('SSOService', () => {
  let service: SSOService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      sSOConfiguration: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SSOService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SSOService>(SSOService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSSOConfig', () => {
    it('should return SSO config for company', async () => {
      const config = { id: 'sso-1', companyId: 'comp-1', provider: 'azure-ad' };
      prisma.sSOConfiguration.findFirst.mockResolvedValue(config);

      const result = await service.getSSOConfig('comp-1');
      expect(result).toEqual(config);
    });

    it('should return null if no config exists', async () => {
      prisma.sSOConfiguration.findFirst.mockResolvedValue(null);

      const result = await service.getSSOConfig('comp-1');
      expect(result).toBeNull();
    });
  });

  describe('createSSOConfig', () => {
    it('should create SSO config when none exists', async () => {
      prisma.sSOConfiguration.findFirst.mockResolvedValue(null);
      const created = { id: 'sso-1', companyId: 'comp-1', provider: 'azure-ad', clientId: 'abc' };
      prisma.sSOConfiguration.create.mockResolvedValue(created);

      const result = await service.createSSOConfig('comp-1', {
        provider: 'azure-ad',
        clientId: 'abc',
        clientSecret: 'secret',
        issuerUrl: 'https://login.microsoftonline.com',
      });

      expect(result).toEqual(created);
      expect(prisma.sSOConfiguration.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if config already exists', async () => {
      prisma.sSOConfiguration.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createSSOConfig('comp-1', {
          provider: 'azure-ad',
          clientId: 'abc',
          clientSecret: 'secret',
          issuerUrl: 'https://login.microsoftonline.com',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateSSOConfig', () => {
    it('should update existing SSO config', async () => {
      prisma.sSOConfiguration.findFirst.mockResolvedValue({ id: 'sso-1', companyId: 'comp-1' });
      prisma.sSOConfiguration.update.mockResolvedValue({ id: 'sso-1', enabled: true });

      const result = await service.updateSSOConfig('comp-1', { enabled: true });

      expect(result.enabled).toBe(true);
      expect(prisma.sSOConfiguration.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'sso-1' } }),
      );
    });

    it('should throw NotFoundException if config not found', async () => {
      prisma.sSOConfiguration.findFirst.mockResolvedValue(null);

      await expect(
        service.updateSSOConfig('comp-1', { enabled: true }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('isSSOEnforced', () => {
    it('should return true when enforceSSO is true', async () => {
      prisma.sSOConfiguration.findFirst.mockResolvedValue({ id: 'sso-1', enforceSSO: true });

      const result = await service.isSSOEnforced('comp-1');
      expect(result).toBe(true);
    });

    it('should return false when no config exists', async () => {
      prisma.sSOConfiguration.findFirst.mockResolvedValue(null);

      const result = await service.isSSOEnforced('comp-1');
      expect(result).toBe(false);
    });

    it('should return false when enforceSSO is false', async () => {
      prisma.sSOConfiguration.findFirst.mockResolvedValue({ id: 'sso-1', enforceSSO: false });

      const result = await service.isSSOEnforced('comp-1');
      expect(result).toBe(false);
    });
  });

  describe('mapIdPUser', () => {
    it('should return user matching email', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'user-1', email: 'test@example.com' });

      const result = await service.mapIdPUser('comp-1', 'test@example.com', 'Test User');
      expect(result.email).toBe('test@example.com');
    });

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.mapIdPUser('comp-1', 'missing@example.com', 'Missing'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateOAuthUrl', () => {
    it('should generate OAuth URL with correct params', async () => {
      prisma.sSOConfiguration.findFirst.mockResolvedValue({
        id: 'sso-1',
        clientId: 'my-client',
        issuerUrl: 'https://login.example.com/tenant',
      });

      const url = await service.generateOAuthUrl('comp-1', 'https://app.example.com/callback');

      expect(url).toContain('client_id=my-client');
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=openid+email+profile');
      expect(url).toContain('state=');
      expect(url).toContain('https://login.example.com/tenant/authorize');
    });

    it('should throw NotFoundException if SSO not configured', async () => {
      prisma.sSOConfiguration.findFirst.mockResolvedValue(null);

      await expect(
        service.generateOAuthUrl('comp-1', 'https://app.example.com/callback'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

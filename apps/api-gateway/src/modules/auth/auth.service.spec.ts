import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PasswordPolicyService } from './password-policy.service';

jest.mock('../../lib/supabase', () => ({
  getSupabaseClientOptional: jest.fn(),
  isSupabaseConfigured: jest.fn().mockReturnValue(true),
}));

const mockAudit = {
  log: jest.fn().mockResolvedValue(undefined),
};

const mockSupabaseAuth = {
  signInWithPassword: jest.fn(),
  admin: {
    createUser: jest.fn(),
    getUserByEmail: jest.fn(),
  },
  resetPasswordForEmail: jest.fn(),
};

const mockPrisma = {
  isConnected: jest.fn().mockReturnValue(true),
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  company: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  session: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    deleteMany: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  },
  userRoleAssignment: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  companyMembership: {
    findFirst: jest.fn(),
  },
  transportAccessAssignment: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  rolePermissionConfig: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  accessScope: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  rolePermission: {
    findMany: jest.fn().mockResolvedValue([]),
  },
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({ sub: 'user-1' }),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
      JWT_SECRET: 'test-jwt-secret',
    };
    return config[key];
  }),
};

const mockPasswordPolicy = {
  validate: jest.fn().mockReturnValue({ valid: true }),
  hashPassword: jest.fn().mockResolvedValue('hashed-password'),
  verifyPassword: jest.fn().mockResolvedValue(true),
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getSupabaseClientOptional } = require('../../lib/supabase');

(getSupabaseClientOptional as jest.Mock).mockReturnValue({
  auth: mockSupabaseAuth,
});

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Re-configure supabase mock after clearAllMocks
    (getSupabaseClientOptional as jest.Mock).mockReturnValue({
      auth: mockSupabaseAuth,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: 'SUPABASE_CLIENT', useValue: { auth: mockSupabaseAuth } },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PasswordPolicyService, useValue: mockPasswordPolicy },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should login with valid Supabase credentials', async () => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: {
          session: { access_token: 'supabase-token-123', refresh_token: 'supabase-refresh-123' },
          user: { id: 'supabase-user-1', email: 'test@acme.com' },
        },
        error: null,
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@acme.com',
        name: 'Test User',
        status: 'ACTIVE',
        memberships: [
          {
            companyId: 'company-1',
            role: 'EMPLOYEE',
            status: 'ACTIVE',
            company: { code: 'ACME', name: 'Acme Corp' },
          },
        ],
      });

      mockPrisma.session.create.mockResolvedValue({});
      mockPrisma.companyMembership.findFirst.mockResolvedValue({
        userId: 'user-1',
        companyId: 'company-1',
        role: 'EMPLOYEE',
        status: 'ACTIVE',
      });

      const result = await service.login('test@acme.com', 'password123');

      expect(result.access_token).toBe('supabase-token-123');
      expect(result.user.email).toBe('test@acme.com');
      expect(result.company.code).toBe('ACME');
      expect(result.role).toBe('EMPLOYEE');
    });

    it('should throw UnauthorizedException for Supabase auth error', async () => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' },
      });

      await expect(
        service.login('wrong@acme.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when no membership found', async () => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: {
          session: { access_token: 'supabase-token-123' },
          user: { id: 'supabase-user-1', email: 'test@acme.com' },
        },
        error: null,
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@acme.com',
        status: 'ACTIVE',
        memberships: [],
      });

      await expect(
        service.login('test@acme.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should register a new user via Supabase', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.company.findFirst.mockResolvedValue({
        id: 'company-1',
        code: 'ACME',
        name: 'Acme Corp',
        status: 'ACTIVE',
      });

      mockSupabaseAuth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'supabase-new-user' } },
        error: null,
      });

      mockPrisma.user.create.mockResolvedValue({
        id: 'user-2',
        email: 'new@acme.com',
        name: 'New User',
        memberships: [
          {
            companyId: 'company-1',
            role: 'EMPLOYEE',
            company: { code: 'ACME', name: 'Acme Corp' },
          },
        ],
      });

      const result = await service.register({
        email: 'new@acme.com',
        password: 'password123',
        name: 'New User',
        companyCode: 'ACME',
      });

      expect(result.user.email).toBe('new@acme.com');
      expect(result.company.code).toBe('ACME');
    });

    it('should throw ConflictException for duplicate email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-user', email: 'new@acme.com' });

      await expect(
        service.register({
          email: 'new@acme.com',
          password: 'password123',
          name: 'New User',
          companyCode: 'ACME',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw UnauthorizedException for non-existent company', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.company.findFirst.mockResolvedValue(null);

      await expect(
        service.register({
          email: 'new@acme.com',
          password: 'password123',
          name: 'New User',
          companyCode: 'INVALID',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should delete session and return success', async () => {
      mockPrisma.session.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.logout('token-to-delete');
      expect(result.message).toBe('Logged out successfully');
      expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
        where: { token: 'token-to-delete' },
      });
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { AccessControlService } from './access-control.service';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

describe('AccessControlService', () => {
  let service: AccessControlService;
  let prisma: any;
  let audit: any;

  const mockCompanyId = 'company-1';
  const mockUserId = 'user-1';

  beforeEach(async () => {
    prisma = {
      isConnected: jest.fn().mockReturnValue(true),
      transportAccessRole: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'role-1', roleName: 'TEST_ROLE' }),
        update: jest.fn().mockResolvedValue({ id: 'role-1' }),
        delete: jest.fn().mockResolvedValue({ id: 'role-1' }),
        count: jest.fn().mockResolvedValue(0),
      },
      transportAccessAssignment: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 'assign-1' }),
        delete: jest.fn().mockResolvedValue({ id: 'assign-1' }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    audit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessControlService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<AccessControlService>(AccessControlService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRoles', () => {
    it('should return roles from database', async () => {
      prisma.transportAccessRole.findMany.mockResolvedValue([
        { id: 'role-1', roleName: 'ADMIN', displayName: 'Admin' },
      ]);

      const result = await service.getRoles(mockCompanyId);

      expect(result).toHaveLength(1);
      expect(result[0].roleName).toBe('ADMIN');
    });

    it('should return default roles when none exist', async () => {
      prisma.transportAccessRole.findMany.mockResolvedValue([]);

      const result = await service.getRoles(mockCompanyId);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return default roles when DB is disconnected', async () => {
      prisma.isConnected.mockReturnValue(false);

      const result = await service.getRoles(mockCompanyId);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('createRole', () => {
    it('should create a role successfully', async () => {
      const result = await service.createRole(mockCompanyId, {
        roleName: 'test_role',
        displayName: 'Test Role',
        description: 'A test role',
        permissions: { DASHBOARD_VIEW: true },
      }, mockUserId);

      expect(result).toHaveProperty('id');
      expect(prisma.transportAccessRole.create).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalled();
    });

    it('should throw ServiceUnavailableException when DB is disconnected', async () => {
      prisma.isConnected.mockReturnValue(false);

      await expect(service.createRole(mockCompanyId, {
        roleName: 'test',
        displayName: 'Test',
        permissions: {},
      }, mockUserId)).rejects.toThrow('Database unavailable');
    });
  });

  describe('getUserPermissions', () => {
    it('should return permissions for a user', async () => {
      prisma.transportAccessAssignment.findMany.mockResolvedValue([
        { roleId: 'role-1' },
      ]);
      prisma.transportAccessRole.findMany.mockResolvedValue([
        { canManageVehicles: true, canViewAnalytics: true },
      ]);

      const result = await service.getUserPermissions(mockCompanyId, mockUserId);

      expect(result).toHaveProperty('canManageVehicles', true);
      expect(result).toHaveProperty('canViewAnalytics', true);
    });

    it('should return default permissions when no assignments', async () => {
      prisma.transportAccessAssignment.findMany.mockResolvedValue([]);

      const result = await service.getUserPermissions(mockCompanyId, mockUserId);

      expect(result).toHaveProperty('canManageVendors', false);
      expect(result).toHaveProperty('canManageDrivers', false);
    });
  });

  describe('assignRole', () => {
    it('should assign a role to a user', async () => {
      prisma.transportAccessAssignment.findFirst.mockResolvedValue(null);
      prisma.transportAccessAssignment.create.mockResolvedValue({
        id: 'assign-1',
        companyId: mockCompanyId,
        userId: mockUserId,
        roleId: 'role-1',
      });

      const result = await service.assignRole(mockCompanyId, mockUserId, 'role-1', mockUserId);

      expect(result).toHaveProperty('id', 'assign-1');
      expect(audit.log).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for duplicate assignment', async () => {
      prisma.transportAccessAssignment.findFirst.mockResolvedValue({
        id: 'existing-1',
        companyId: mockCompanyId,
        userId: mockUserId,
        roleId: 'role-1',
      });

      await expect(
        service.assignRole(mockCompanyId, mockUserId, 'role-1', mockUserId),
      ).rejects.toThrow();
    });
  });
});
